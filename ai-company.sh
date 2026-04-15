#!/bin/bash
set -euo pipefail

# ============================================================
# AI会社シミュレーション — メインオーケストレーター v3
# 高速化: テーマ判定・4フェーズ統合・MTG廃止・モデル最適化
# Usage: ./ai-company.sh "テーマ"
# ============================================================

THEME="${1:?テーマを指定してください。例: ./ai-company.sh \"顧客ランク別割引機能を追加したい\"}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="./output/${TIMESTAMP}"
CONFIG="./company-config.json"
AGENTS_DIR="./.claude/agents"
LOG_DIR="./logs"
METRICS_FILE="$PROJECT_DIR/metrics.json"
PROJECT_START=$(date +%s)

mkdir -p "$PROJECT_DIR" "$PROJECT_DIR/mtg" "$PROJECT_DIR/escalation" "$LOG_DIR"

# ── ユーティリティ ──────────────────────────────────────────

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_DIR/${TIMESTAMP}.log"; }

notify_slack() {
  local WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
  if [ -n "$WEBHOOK_URL" ]; then
    curl -s -X POST "$WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{\"text\": \"$1\"}" > /dev/null 2>&1 || true
  fi
}

get_agent_field() {
  local agent_id="$1" field="$2"
  jq -r ".agents[] | select(.id == \"$agent_id\") | $field" "$CONFIG"
}

add_exp() {
  local agent_id="$1" amount="$2" reason="$3"
  local current_exp
  current_exp=$(get_agent_field "$agent_id" ".exp")
  local new_exp=$((current_exp + amount))
  local tmp
  tmp=$(mktemp)
  jq "(.agents[] | select(.id == \"$agent_id\") | .exp) = $new_exp" "$CONFIG" > "$tmp" && mv "$tmp" "$CONFIG"
  log "💫 ${agent_id}: +${amount} EXP ($reason) → 合計 ${new_exp}"
}

read_file_or_empty() {
  cat "$1" 2>/dev/null || echo '未生成'
}

# ── 計測ダッシュボード ────────────────────────────────────────

echo '{"project_start":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","theme":"'"$THEME"'","agents":[],"phases":[]}' > "$METRICS_FILE"

record_agent_start() {
  local agent_id="$1"
  eval "AGENT_START_${agent_id//-/_}=$(date +%s)"
}

record_agent_end() {
  local agent_id="$1"
  local var_name="AGENT_START_${agent_id//-/_}"
  local start_time="${!var_name:-$(date +%s)}"
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  local model
  model=$(get_agent_field "$agent_id" ".model")
  local tmp
  tmp=$(mktemp)
  jq ".agents += [{\"id\":\"$agent_id\",\"model\":\"$model\",\"duration_sec\":$duration,\"start\":$start_time,\"end\":$end_time}]" "$METRICS_FILE" > "$tmp" && mv "$tmp" "$METRICS_FILE"
  log "⏱️  ${agent_id}: ${duration}秒（${model}）"
}

record_phase() {
  local phase_name="$1" phase_start="$2"
  local phase_end=$(date +%s)
  local duration=$((phase_end - phase_start))
  local tmp
  tmp=$(mktemp)
  jq ".phases += [{\"name\":\"$phase_name\",\"duration_sec\":$duration}]" "$METRICS_FILE" > "$tmp" && mv "$tmp" "$METRICS_FILE"
  log "📊 ${phase_name}: ${duration}秒"
}

# ── コンテキスト管理 ──────────────────────────────────────────

extract_summary() {
  local file="$1"
  if [ ! -f "$file" ]; then echo '未生成'; return; fi
  local summary
  summary=$(awk '/^## サマリー/,/^## [^サ]/' "$file" | head -50)
  if [ -z "$summary" ]; then
    head -100 "$file"
  else
    echo "$summary"
  fi
}

read_full() {
  head -300 "$1" 2>/dev/null || echo '未生成'
}

# ── 計測付き run_agent ───────────────────────────────────────

run_agent() {
  local agent_id="$1"
  local prompt="$2"
  local model
  model=$(get_agent_field "$agent_id" ".model")
  local max_turns
  max_turns=$(get_agent_field "$agent_id" ".maxTurns")
  local system_prompt_file="${AGENTS_DIR}/${agent_id}.md"

  if [ ! -f "$system_prompt_file" ]; then
    log "⚠️  エージェント定義が見つかりません: $system_prompt_file"
    return 1
  fi

  local agent_name
  agent_name=$(get_agent_field "$agent_id" ".icon + \" \" + .name + \" \" + .title")

  record_agent_start "$agent_id"
  log "🚀 ${agent_name} 開始（${model}）"

  env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT claude -p \
    --model "$model" \
    --system-prompt "$(cat "$system_prompt_file")" \
    --max-turns "$max_turns" \
    --dangerously-skip-permissions \
    "$prompt" \
    2>&1 | tee -a "$LOG_DIR/${TIMESTAMP}_${agent_id}.log"

  record_agent_end "$agent_id"
  log "✅ ${agent_name} 完了"
}

# ── 非同期レビュー ────────────────────────────────────────────

run_async_review() {
  local review_name="$1"
  local context="$2"
  log "📝 非同期レビュー: ${review_name}"
  run_agent "chief-secretary" "
あなたはPM（プロジェクトマネージャー）として、以下の成果物の非同期レビューを実施してください。

## レビュー対象
${review_name}

## 成果物
${context}

以下を $PROJECT_DIR/review-${review_name}.md に出力してください:
1. 成果物の品質評価（A/B/C/D）
2. 問題点・懸念事項（あれば）
3. 各部門へのフィードバック
4. 承認判定（GO / 要修正）
5. 要修正の場合、具体的な修正指示

※重大な問題がなければGO判定とし、次フェーズに進めてください。
"
}

# ══════════════════════════════════════════════════════════════
# 改善1: テーマ軽重判定 — 挨拶・簡単な質問は秘書だけで即応答
# ══════════════════════════════════════════════════════════════

is_lightweight_theme() {
  local theme_lower
  theme_lower=$(echo "$THEME" | tr '[:upper:]' '[:lower:]')
  # 挨拶・簡単な質問パターン
  case "$theme_lower" in
    *おはよう*|*こんにちは*|*こんばんは*|*お疲れ*|*ありがとう*|*よろしく*)
      return 0 ;;
    *調子*どう*|*元気*|*天気*|*雑談*)
      return 0 ;;
    hello*|hi\ *|hey*|good\ morning*|thanks*)
      return 0 ;;
  esac
  # 10文字以下で「？」「?」で終わる簡単な質問
  if [ ${#THEME} -le 15 ] && [[ "$THEME" == *？ || "$THEME" == *\? ]]; then
    return 0
  fi
  return 1
}

if is_lightweight_theme; then
  log "============================================"
  log "🏢 AI会社シミュレーション v3 起動（軽量モード）"
  log "📌 テーマ: $THEME"
  log "============================================"
  log ""
  log "━━━ 軽量モード: CEO秘書が応答 ━━━"

  run_agent "secretary" "
テーマ: $THEME

オーナー（ユーザー）から上記のメッセージがありました。
これはプロジェクト指示ではなく、挨拶や簡単なやりとりです。

秘書として適切に応答し、$PROJECT_DIR/secretary-report.md に出力してください。
- 社長や社員の近況を交えた温かい返答
- 必要に応じて本日の予定や進行中の案件を簡潔に報告
- 何かプロジェクト指示があればお気軽にどうぞ、と添える
"
  add_exp "secretary" 10 "軽量応答"

  PROJECT_END=$(date +%s)
  TOTAL_DURATION=$((PROJECT_END - PROJECT_START))
  tmp=$(mktemp)
  jq ".total_duration_sec = $TOTAL_DURATION | .project_end = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" | .mode = \"lightweight\"" "$METRICS_FILE" > "$tmp" && mv "$tmp" "$METRICS_FILE"

  log ""
  log "============================================"
  log "🎉 軽量モード完了"
  log "⏱️  所要時間: ${TOTAL_DURATION}秒"
  log "============================================"

  notify_slack "💬 軽量応答完了\nテーマ: $THEME\n所要時間: ${TOTAL_DURATION}秒"
  exit 0
fi

# ══════════════════════════════════════════════════════════════
# 通常モード: 4フェーズ構成（v2の6フェーズから統合）
# ══════════════════════════════════════════════════════════════

log "============================================"
log "🏢 AI会社シミュレーション v3 起動"
log "   4フェーズ構成・MTG廃止・モデル最適化"
log "📌 テーマ: $THEME"
log "📁 出力先: $PROJECT_DIR"
log "============================================"

# ================================================================
# PHASE 1: 調査・計画（CEO + マーケ + CS + 企画 4並列）
#          → 秘書部長レビュー
# ================================================================
PHASE1_START=$(date +%s)
log ""
log "━━━ PHASE 1: 調査・計画（4並列）━━━"

run_agent "ceo" "
テーマ: $THEME

以下のJSON形式でプロジェクト計画を $PROJECT_DIR/plan.json に出力してください:
{
  \"theme\": \"テーマ\",
  \"goals\": [\"目標1\", \"目標2\"],
  \"scope\": \"スコープの説明\",
  \"phases\": [
    { \"phase\": 1, \"name\": \"...\", \"assignee\": \"...\", \"deliverable\": \"...\" }
  ],
  \"risks\": [\"リスク1\"],
  \"success_criteria\": [\"基準1\"]
}

※ファイル先頭に ## サマリー セクションを付けること（後続フェーズの参照用）
" &
PID_CEO=$!

run_agent "marketing" "
テーマ: $THEME

テーマに関する市場調査を実施し、$PROJECT_DIR/marketing-report.md に出力してください。
※冒頭に必ず ## サマリー セクション（5行以内の要約）を付けること。

本文に含める内容:
- 市場トレンド・競合動向
- ターゲット顧客分析
- 差別化ポイントの提案
- 参入リスクと機会
" &
PID_MARKETING=$!

run_agent "cs" "
テーマ: $THEME

テーマに関するカスタマーサクセス想定シナリオを $PROJECT_DIR/cs-scenarios.md に出力してください。
※冒頭に必ず ## サマリー セクション（5行以内の要約）を付けること。

- 想定されるユーザーの質問・困りごと（10件以上）
- 初期FAQドラフト
- オンボーディングの流れ（概要）
- 解約リスクが高いユーザーパターン
" &
PID_CS=$!

run_agent "planner" "
テーマ: $THEME

テーマに関するペルソナ・ユーザー調査を $PROJECT_DIR/persona-research.md に出力してください。
※冒頭に必ず ## サマリー セクション（5行以内の要約）を付けること。

本文に含める内容:
- 想定ペルソナ（3-5人）の詳細プロフィール
- カスタマージャーニーマップ（認知→検討→導入→定着）
- ユーザーの課題・ペインポイント分析
- 競合プロダクトのUX比較
- アクセシビリティ配慮事項
" &
PID_PLANNER_P1=$!

wait $PID_CEO && add_exp "ceo" 20 "タスク完了"
wait $PID_MARKETING && add_exp "marketing" 20 "タスク完了"
wait $PID_CS && add_exp "cs" 20 "タスク完了"
wait $PID_PLANNER_P1 && add_exp "planner" 15 "ペルソナ調査完了"

# 秘書部長 — PM: キックオフレビュー（非同期、MTG不要）
log ""
log "━━━ 秘書部長（PM）: キックオフレビュー ━━━"
run_agent "chief-secretary" "
テーマ: $THEME
CEO計画: $(read_full "$PROJECT_DIR/plan.json")
市場調査サマリー: $(extract_summary "$PROJECT_DIR/marketing-report.md")
CS想定サマリー: $(extract_summary "$PROJECT_DIR/cs-scenarios.md")
ペルソナ調査サマリー: $(extract_summary "$PROJECT_DIR/persona-research.md")

あなたはPM（プロジェクトマネージャー）です。以下を $PROJECT_DIR/chief-secretary-report.md に出力してください:
1. CEO計画の要約（30秒で全体把握できる形式）
2. 市場調査・CS想定・ペルソナ調査の要点統合
3. 各部門への指示・期待事項
4. リスク・ボトルネック予測
5. キックオフレビュー判定: GO / 要修正
"
add_exp "chief-secretary" 20 "タスク完了"
record_phase "PHASE1" "$PHASE1_START"

# ================================================================
# PHASE 2: 要件定義 + R&D + 設計（3並列 → 非同期レビュー）
#          旧PHASE2+3を統合。概要設計と詳細設計を1回で完了。
# ================================================================
PHASE2_START=$(date +%s)
log ""
log "━━━ PHASE 2: 要件＋R&D＋設計（3並列）━━━"

run_agent "planner" "
テーマ: $THEME
CEOの計画: $(extract_summary "$PROJECT_DIR/plan.json")
市場調査: $(extract_summary "$PROJECT_DIR/marketing-report.md")
CS想定: $(extract_summary "$PROJECT_DIR/cs-scenarios.md")
ペルソナ調査: $(read_full "$PROJECT_DIR/persona-research.md")

ペルソナ調査を統合し、要件定義書を $PROJECT_DIR/requirements.md に出力してください。
※冒頭に必ず ## サマリー セクション（10行以内の要約）を付けること。

本文に含める内容:
- 背景・目的（市場調査・ペルソナ調査の知見を反映）
- 機能要件（優先度付き）
- 非機能要件
- ペルソナ・カスタマージャーニーマップ
- ユースケース
- 制約事項
" &
PID_PLANNER=$!

run_agent "rd" "
テーマ: $THEME
CEOの計画: $(extract_summary "$PROJECT_DIR/plan.json")
市場調査: $(extract_summary "$PROJECT_DIR/marketing-report.md")

テーマに対する破壊的アイデアを $PROJECT_DIR/rd-report.md に出力してください。
※冒頭に必ず ## サマリー セクション（実現可能性が高い上位3案の要約）を付けること。

- 従来のアプローチを10倍良くする方法（最低5案）
- 競合が思いつかない差別化アイデア
- 技術トレンドを活用した革新的機能
- 実現可能性と優先度のマトリクス
" &
PID_RD=$!

# 設計部長 — 概要+詳細を1回で完了（旧PHASE2+3統合）
run_agent "architect" "
テーマ: $THEME
CEOの計画: $(read_full "$PROJECT_DIR/plan.json")
市場調査: $(extract_summary "$PROJECT_DIR/marketing-report.md")

技術設計書を作成してください。概要設計と詳細設計を1つにまとめます。

出力ファイル:
1. $PROJECT_DIR/design.md — 技術設計書（概要+詳細）
   ※冒頭に ## サマリー セクション必須
   - アーキテクチャ方針（技術スタック選定理由）
   - 主要コンポーネント構成図
   - API仕様（エンドポイント一覧）
   - 画面遷移図
   - セキュリティ方針
   - データモデル詳細
2. $PROJECT_DIR/schema.sql — DBスキーマ（Cloudflare D1 / SQLite）
" &
PID_ARCH=$!

wait $PID_PLANNER && add_exp "planner" 20 "タスク完了"
wait $PID_RD && add_exp "rd" 20 "タスク完了"
wait $PID_ARCH && add_exp "architect" 30 "設計完了"

# 非同期レビュー（MTG廃止、秘書部長PMが一括レビュー）
log ""
log "━━━ 非同期レビュー: 要件＋設計（秘書部長PM） ━━━"
run_async_review "要件・設計レビュー" "
要件サマリー: $(extract_summary "$PROJECT_DIR/requirements.md")
設計サマリー: $(extract_summary "$PROJECT_DIR/design.md")
R&Dサマリー: $(extract_summary "$PROJECT_DIR/rd-report.md")
スキーマ: $(read_full "$PROJECT_DIR/schema.sql")
"
record_phase "PHASE2" "$PHASE2_START"

# ================================================================
# PHASE 3: 実装（デザイン + 開発 + CS最終化 3並列）
#          旧PHASE4を吸収。開発事前準備を廃止し直接実装。
# ================================================================
PHASE3_START=$(date +%s)
log ""
log "━━━ PHASE 3: 実装（デザイン＋開発＋CS 3並列）━━━"

run_agent "ui-designer" "
テーマ: $THEME
要件サマリー: $(extract_summary "$PROJECT_DIR/requirements.md")
設計サマリー: $(extract_summary "$PROJECT_DIR/design.md")

UIモックアップを $PROJECT_DIR/mockup.html に出力してください。
HTML + Tailwind CSS で実際に表示できる形式にすること。
アクセシビリティに配慮すること。
" &
PID_DESIGN=$!

run_agent "developer" "
テーマ: $THEME
要件: $(read_full "$PROJECT_DIR/requirements.md")
設計: $(read_full "$PROJECT_DIR/design.md")
スキーマ: $(read_full "$PROJECT_DIR/schema.sql")

アプリケーションを $PROJECT_DIR/app/ に実装してください。
技術スタック: React + Vite + TypeScript + Tailwind CSS + Hono + D1
" &
PID_DEV=$!

run_agent "cs" "
テーマ: $THEME
要件サマリー: $(extract_summary "$PROJECT_DIR/requirements.md")
設計サマリー: $(extract_summary "$PROJECT_DIR/design.md")
初期シナリオ: $(extract_summary "$PROJECT_DIR/cs-scenarios.md")

カスタマーサクセス最終計画を $PROJECT_DIR/cs-report.md に出力してください。
※冒頭に ## サマリー セクション必須。

- オンボーディングフロー詳細
- FAQ最終版（15件以上）
- サポートチャネル設計
- チャーン防止施策
- 顧客満足度KPI設定
" &
PID_CS_FINAL=$!

wait $PID_DESIGN && add_exp "ui-designer" 20 "タスク完了"
wait $PID_DEV && add_exp "developer" 20 "タスク完了"
wait $PID_CS_FINAL && add_exp "cs" 20 "タスク完了"
record_phase "PHASE3" "$PHASE3_START"

# ================================================================
# PHASE 4: QA + 人事 + 報告書 + 最終報告（4並列 → 秘書報告）
#          旧PHASE5+6を統合。報告書ドラフト→最終化の2段階を1回に。
# ================================================================
PHASE4_START=$(date +%s)
log ""
log "━━━ PHASE 4: QA＋評価＋報告書（3並列→最終報告）━━━"

run_agent "qa-reviewer" "
テーマ: $THEME
要件: $(extract_summary "$PROJECT_DIR/requirements.md")
設計: $(extract_summary "$PROJECT_DIR/design.md")

以下のディレクトリにあるコードとモックアップを品質・セキュリティレビューしてください:
- $PROJECT_DIR/app/
- $PROJECT_DIR/mockup.html

品質レポートを $PROJECT_DIR/qa-report.md に出力してください。
※冒頭に ## サマリー セクション必須（重大度別の問題件数サマリー）。

- バグ・問題点一覧（重大度: Critical/High/Medium/Low）
- セキュリティチェック結果（OWASP Top 10準拠）
- パフォーマンス懸念事項
- アクセシビリティチェック
- 改善提案（優先度付き）
" &
PID_QA=$!

run_agent "hr" "
テーマ: $THEME
プロジェクト出力先: $PROJECT_DIR

プロジェクト参加メンバーの評価と育成提案を $PROJECT_DIR/hr-report.md に出力してください。
※冒頭に ## サマリー セクション必須。

- 各メンバーの貢献度評価
- スキルアップが必要な分野の特定
- チーム全体の強み・弱み分析
- 次プロジェクトに向けた教育計画
" &
PID_HR=$!

# 報告書を1回で最終版まで作成（ドラフト→最終化の2段階を廃止）
run_agent "doc-writer" "
テーマ: $THEME
計画サマリー: $(extract_summary "$PROJECT_DIR/plan.json")
要件サマリー: $(extract_summary "$PROJECT_DIR/requirements.md")
設計サマリー: $(extract_summary "$PROJECT_DIR/design.md")
市場調査サマリー: $(extract_summary "$PROJECT_DIR/marketing-report.md")
CS計画サマリー: $(extract_summary "$PROJECT_DIR/cs-report.md")

プロジェクト最終報告書を $PROJECT_DIR/report.md に出力してください。
※QAレポートは並行実行中のため未完了ですが、他の情報で報告書を完成させてください。

- エグゼクティブサマリー
- 成果物一覧と概要
- 技術構成
- 市場調査結果の反映状況
- CS準備状況
- 残課題・次のステップ
" &
PID_DOC=$!

wait $PID_QA && add_exp "qa-reviewer" 20 "タスク完了"
wait $PID_HR && add_exp "hr" 20 "タスク完了"
wait $PID_DOC && add_exp "doc-writer" 20 "報告書完了"

# 秘書部長（PM）— 最終サマリー + CEO秘書報告を並列
log ""
log "━━━ 最終報告（秘書部長 + CEO秘書 並列）━━━"

run_agent "chief-secretary" "
テーマ: $THEME
QAレポートサマリー: $(extract_summary "$PROJECT_DIR/qa-report.md")
人事評価サマリー: $(extract_summary "$PROJECT_DIR/hr-report.md")
計画サマリー: $(extract_summary "$PROJECT_DIR/plan.json")
報告書サマリー: $(extract_summary "$PROJECT_DIR/report.md")

社長向け最終サマリーを $PROJECT_DIR/chief-secretary-report.md に追記してください:
1. プロジェクト完了報告（社長が30秒で全体を把握できる要約）
2. 各部門の成果と課題のダッシュボード
3. 社長に確認いただきたい事項リスト
4. 次のアクション推奨
5. 社員の頑張りポイント（社長に褒めていただきたい点）
" &
PID_CS_REPORT=$!

run_agent "secretary" "
テーマ: $THEME
計画サマリー: $(extract_summary "$PROJECT_DIR/plan.json")
報告書サマリー: $(extract_summary "$PROJECT_DIR/report.md")
QAサマリー: $(extract_summary "$PROJECT_DIR/qa-report.md")

オーナー（ユーザー）への最終報告を $PROJECT_DIR/secretary-report.md に出力してください:
1. プロジェクト完了のお知らせ
2. 社長（黒澤 蓮司）の判断・指示のサマリー
3. プロジェクトハイライト（朗報を最初に）
4. 社員の活躍・貢献ピックアップ
5. オーナーにご判断いただきたい事項
6. 注意事項・リスク
7. 次のプロジェクトへの提言
" &
PID_SEC=$!

wait $PID_CS_REPORT && add_exp "chief-secretary" 30 "最終サマリー作成"
wait $PID_SEC && add_exp "secretary" 20 "タスク完了"
record_phase "PHASE4" "$PHASE4_START"

# ── プロジェクト完了 ──
PROJECT_END=$(date +%s)
TOTAL_DURATION=$((PROJECT_END - PROJECT_START))

tmp=$(mktemp)
jq ".total_duration_sec = $TOTAL_DURATION | .project_end = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" "$METRICS_FILE" > "$tmp" && mv "$tmp" "$METRICS_FILE"

log ""
log "============================================"
log "🎉 AI会社シミュレーション v3 完了"
log "📁 成果物: $PROJECT_DIR"
log "⏱️  総所要時間: ${TOTAL_DURATION}秒"
log "📊 計測データ: $METRICS_FILE"
log "============================================"

# 全員にプロジェクト完了EXP
ALL_AGENTS="ceo secretary chief-secretary marketing hr cs rd planner architect developer qa-reviewer ui-designer doc-writer"
for agent_id in $ALL_AGENTS; do
  add_exp "$agent_id" 100 "プロジェクト完了"
done

notify_slack "🎉 AI会社プロジェクト完了 v3\nテーマ: $THEME\n所要時間: ${TOTAL_DURATION}秒\n成果物: $PROJECT_DIR"

log "🏁 全工程終了"
