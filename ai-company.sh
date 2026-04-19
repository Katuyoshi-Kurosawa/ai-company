#!/bin/bash
set -euo pipefail

# ============================================================
# AI会社シミュレーション — メインオーケストレーター v5
# 高速化: 3段階テーマ判定・動的モデル切替・UI前倒し並列
#         3フェーズ統合・楽観的並列実行・haiku軽量モード
# Usage: ./ai-company.sh "テーマ"
# ============================================================

THEME="${1:?テーマを指定してください。例: ./ai-company.sh \"顧客ランク別割引機能を追加したい\"}"

# ── 追加引数パース ─────────────────────────────────────────
OVERRIDE_DEPTH=""
OVERRIDE_AGENTS=""
OVERRIDE_MODEL=""
OVERRIDE_MAX_TURNS=""
ROUTE_TYPE=""

shift  # $1 (THEME) をスキップ
while [[ $# -gt 0 ]]; do
  case "$1" in
    --depth) OVERRIDE_DEPTH="$2"; shift 2 ;;
    --agents) OVERRIDE_AGENTS="$2"; shift 2 ;;
    --model) OVERRIDE_MODEL="$2"; shift 2 ;;
    --max-turns) OVERRIDE_MAX_TURNS="$2"; shift 2 ;;
    --route) ROUTE_TYPE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

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
# Usage: run_agent <agent_id> <prompt> [model_override] [max_turns_override]

run_agent() {
  local agent_id="$1"
  local prompt="$2"
  local model="${3:-}"
  local max_turns="${4:-}"
  [ -z "$model" ] && model="${OVERRIDE_MODEL:-$(get_agent_field "$agent_id" ".model")}"
  [ -z "$max_turns" ] && max_turns="${OVERRIDE_MAX_TURNS:-$(get_agent_field "$agent_id" ".maxTurns")}"
  local system_prompt_file="${AGENTS_DIR}/${agent_id}.md"

  if [ ! -f "$system_prompt_file" ]; then
    log "⚠️  エージェント定義が見つかりません: $system_prompt_file"
    return 1
  fi

  local agent_name
  agent_name=$(get_agent_field "$agent_id" ".icon + \" \" + .name + \" \" + .title")

  record_agent_start "$agent_id"
  log "🚀 ${agent_name} 開始（${model}, maxTurns=${max_turns}）"

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
# テーマ3段階判定: lightweight / medium / heavy
#   lightweight: 挨拶・雑談 → 秘書のみ（haiku）
#   medium: 文章作成・調査・簡単なタスク → コア4名で高速処理
#   heavy: システム開発・新規事業 → 全13名フル稼働
# ══════════════════════════════════════════════════════════════

classify_theme() {
  local theme_lower
  theme_lower=$(echo "$THEME" | tr '[:upper:]' '[:lower:]')

  # --- lightweight: 挨拶・簡単な質問 ---
  case "$theme_lower" in
    *おはよう*|*こんにちは*|*こんばんは*|*お疲れ*|*ありがとう*|*よろしく*)
      echo "lightweight"; return ;;
    *調子*どう*|*元気*|*天気*|*雑談*)
      echo "lightweight"; return ;;
    hello*|hi\ *|hey*|good\ morning*|thanks*)
      echo "lightweight"; return ;;
  esac
  if [ ${#THEME} -le 15 ] && [[ "$THEME" == *？ || "$THEME" == *\? ]]; then
    echo "lightweight"; return
  fi

  # --- heavy: 開発・システム・アプリ・新規事業 ---
  case "$theme_lower" in
    *開発*|*実装*|*アプリ*|*システム*|*機能*|*api*|*db*|*データベース*)
      echo "heavy"; return ;;
    *新規事業*|*サービス*|*プロダクト*|*プラットフォーム*|*saas*)
      echo "heavy"; return ;;
    *リファクタ*|*マイグレーション*|*インフラ*|*デプロイ*|*ci*|*cd*)
      echo "heavy"; return ;;
  esac

  # --- medium: それ以外（文章作成、調査、分析、提案など） ---
  echo "medium"
}

THEME_WEIGHT=$(classify_theme)

# depth オーバーライド
if [ -n "$OVERRIDE_DEPTH" ]; then
  log "📊 実行深度オーバーライド: $THEME_WEIGHT → $OVERRIDE_DEPTH (route: ${ROUTE_TYPE:-manual})"
  THEME_WEIGHT="$OVERRIDE_DEPTH"
fi

# ══════════════════════════════════════════════════════════════
# lightweight モード: 秘書のみ（haiku）
# ══════════════════════════════════════════════════════════════

if [ "$THEME_WEIGHT" = "lightweight" ]; then
  log "============================================"
  log "🏢 AI会社シミュレーション v5 起動（軽量モード）"
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
" "haiku" "3"
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
# medium モード: コア4名（CEO + 企画 + 資料作成 + 秘書）で高速処理
#   設計・開発・QA・デザイン等のシステム系エージェントをスキップ
# ══════════════════════════════════════════════════════════════

if [ "$THEME_WEIGHT" = "medium" ]; then
  log "============================================"
  log "🏢 AI会社シミュレーション v5 起動（中量モード）"
  log "📌 テーマ: $THEME"
  log "📁 出力先: $PROJECT_DIR"
  log "============================================"

  # --- PHASE 1: CEO計画 + マーケ調査 + R&Dアイデア（3並列）---
  PHASE1_START=$(date +%s)
  log ""
  log "━━━ 中量PHASE 1: 計画＋調査（3並列）━━━"

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

※このテーマはシステム開発ではなく、文章作成・調査・分析系のタスクです。
※ファイル先頭に ## サマリー セクションを付けること。
" "sonnet" "5" &
  PID_CEO=$!

  run_agent "marketing" "
テーマ: $THEME

テーマに関する市場調査・背景調査を $PROJECT_DIR/marketing-report.md に出力してください。
※冒頭に必ず ## サマリー セクション（5行以内の要約）を付けること。
- 関連するトレンド・動向
- ターゲット分析
- 参考事例・ベストプラクティス
" "sonnet" "6" &
  PID_MARKETING=$!

  run_agent "rd" "
テーマ: $THEME

テーマに対する革新的なアイデアや切り口を $PROJECT_DIR/rd-report.md に出力してください。
※冒頭に必ず ## サマリー セクション（上位3案の要約）を付けること。
- 従来のアプローチを超える方法（最低5案）
- 差別化できる切り口
- 実現可能性と優先度
" "sonnet" "6" &
  PID_RD=$!

  wait $PID_CEO && add_exp "ceo" 20 "タスク完了"
  wait $PID_MARKETING && add_exp "marketing" 20 "タスク完了"
  wait $PID_RD && add_exp "rd" 20 "タスク完了"
  record_phase "MEDIUM_PHASE1" "$PHASE1_START"

  # --- PHASE 2: 企画（要件定義）+ 資料作成（成果物）+ 秘書（報告）3並列 ---
  PHASE2_START=$(date +%s)
  log ""
  log "━━━ 中量PHASE 2: 企画＋成果物作成＋報告（3並列）━━━"

  run_agent "planner" "
テーマ: $THEME
CEOの計画: $(extract_summary "$PROJECT_DIR/plan.json")
市場調査: $(extract_summary "$PROJECT_DIR/marketing-report.md")
R&Dアイデア: $(extract_summary "$PROJECT_DIR/rd-report.md")

要件定義書を $PROJECT_DIR/requirements.md に出力してください。
※冒頭に必ず ## サマリー セクション（10行以内の要約）を付けること。

本文に含める内容:
- 背景・目的
- 成果物の要件（品質基準・フォーマット等）
- ターゲット・ペルソナ
- 制約事項
" "sonnet" "8" &
  PID_PLANNER=$!

  run_agent "doc-writer" "
テーマ: $THEME
CEOの計画: $(extract_summary "$PROJECT_DIR/plan.json")
市場調査: $(extract_summary "$PROJECT_DIR/marketing-report.md")
R&Dアイデア: $(extract_summary "$PROJECT_DIR/rd-report.md")

テーマの最終成果物を $PROJECT_DIR/deliverable.md に出力してください。
また、プロジェクト報告書を $PROJECT_DIR/report.md に出力してください。

※成果物はそのまま使える完成度で仕上げること。
※報告書にはエグゼクティブサマリー・成果物概要・残課題を含めること。
" "sonnet" "10" &
  PID_DOC=$!

  wait $PID_PLANNER && add_exp "planner" 20 "タスク完了"
  wait $PID_DOC && add_exp "doc-writer" 25 "成果物＋報告書完了"

  # 秘書報告（成果物完成後）
  run_agent "secretary" "
テーマ: $THEME
計画サマリー: $(extract_summary "$PROJECT_DIR/plan.json")
報告書サマリー: $(extract_summary "$PROJECT_DIR/report.md")

オーナー（ユーザー）への最終報告を $PROJECT_DIR/secretary-report.md に出力してください:
1. プロジェクト完了のお知らせ
2. 成果物のハイライト
3. 社員の活躍ピックアップ
4. 次のアクション提言
" "sonnet" "8"
  add_exp "secretary" 20 "タスク完了"
  record_phase "MEDIUM_PHASE2" "$PHASE2_START"

  # 中量モード参加者にEXP付与
  MEDIUM_AGENTS="ceo secretary marketing rd planner doc-writer"
  for agent_id in $MEDIUM_AGENTS; do
    add_exp "$agent_id" 50 "プロジェクト完了（中量）"
  done

  PROJECT_END=$(date +%s)
  TOTAL_DURATION=$((PROJECT_END - PROJECT_START))
  tmp=$(mktemp)
  jq ".total_duration_sec = $TOTAL_DURATION | .project_end = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" | .mode = \"medium\"" "$METRICS_FILE" > "$tmp" && mv "$tmp" "$METRICS_FILE"

  log ""
  log "============================================"
  log "🎉 AI会社シミュレーション v5 完了（中量モード）"
  log "📁 成果物: $PROJECT_DIR"
  log "⏱️  総所要時間: ${TOTAL_DURATION}秒"
  log "📊 計測データ: $METRICS_FILE"
  log "============================================"

  notify_slack "🎉 中量モード完了\nテーマ: $THEME\n所要時間: ${TOTAL_DURATION}秒\n成果物: $PROJECT_DIR"
  log "🏁 全工程終了"
  exit 0
fi

# ══════════════════════════════════════════════════════════════
# heavy モード: 全13名フル稼働（3フェーズ構成）
# ══════════════════════════════════════════════════════════════

log "============================================"
log "🏢 AI会社シミュレーション v5 起動（重量モード）"
log "   3フェーズ構成・楽観的並列・動的モデル切替"
log "📌 テーマ: $THEME"
log "📁 出力先: $PROJECT_DIR"
log "============================================"

# ================================================================
# PHASE 1: 調査・計画（CEO + マーケ + CS + 企画 4並列）
#          → 秘書部長レビューをPhase2と楽観的並列実行
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
" "" "5" &
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
" "" "8" &
PID_MARKETING=$!

run_agent "cs" "
テーマ: $THEME

テーマに関するカスタマーサクセス想定シナリオを $PROJECT_DIR/cs-scenarios.md に出力してください。
※冒頭に必ず ## サマリー セクション（5行以内の要約）を付けること。

- 想定されるユーザーの質問・困りごと（10件以上）
- 初期FAQドラフト
- オンボーディングの流れ（概要）
- 解約リスクが高いユーザーパターン
" "" "6" &
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
" "" "8" &
PID_PLANNER_P1=$!

wait $PID_CEO && add_exp "ceo" 20 "タスク完了"
wait $PID_MARKETING && add_exp "marketing" 20 "タスク完了"
wait $PID_CS && add_exp "cs" 20 "タスク完了"
wait $PID_PLANNER_P1 && add_exp "planner" 15 "ペルソナ調査完了"
record_phase "PHASE1" "$PHASE1_START"

# ================================================================
# PHASE 2: 要件＋R&D＋設計（3並列）＋ キックオフレビュー（楽観的並列）
#   提案2: レビューを次フェーズと並列実行（楽観的並列実行）
#   提案3: コンテキスト注入をextract_summaryに統一
# ================================================================
PHASE2_START=$(date +%s)
log ""
log "━━━ PHASE 2: 要件＋R&D＋設計＋レビュー（楽観的並列）━━━"

# キックオフレビュー（Phase2作業と並列実行）
run_agent "chief-secretary" "
テーマ: $THEME
CEO計画: $(extract_summary "$PROJECT_DIR/plan.json")
市場調査サマリー: $(extract_summary "$PROJECT_DIR/marketing-report.md")
CS想定サマリー: $(extract_summary "$PROJECT_DIR/cs-scenarios.md")
ペルソナ調査サマリー: $(extract_summary "$PROJECT_DIR/persona-research.md")

あなたはPM（プロジェクトマネージャー）です。以下を $PROJECT_DIR/chief-secretary-report.md に出力してください:
1. CEO計画の要約（30秒で全体把握できる形式）
2. 市場調査・CS想定・ペルソナ調査の要点統合
3. 各部門への指示・期待事項
4. リスク・ボトルネック予測
5. キックオフレビュー判定: GO / 要修正
" "" "5" &
PID_REVIEW1=$!

run_agent "planner" "
テーマ: $THEME
CEOの計画: $(extract_summary "$PROJECT_DIR/plan.json")
市場調査: $(extract_summary "$PROJECT_DIR/marketing-report.md")
CS想定: $(extract_summary "$PROJECT_DIR/cs-scenarios.md")
ペルソナ調査: $(extract_summary "$PROJECT_DIR/persona-research.md")

ペルソナ調査を統合し、要件定義書を $PROJECT_DIR/requirements.md に出力してください。
※冒頭に必ず ## サマリー セクション（10行以内の要約）を付けること。

本文に含める内容:
- 背景・目的（市場調査・ペルソナ調査の知見を反映）
- 機能要件（優先度付き）
- 非機能要件
- ペルソナ・カスタマージャーニーマップ
- ユースケース
- 制約事項
" "" "8" &
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
" "" "8" &
PID_RD=$!

# 動的モデル切替: テーマの複雑さに応じてarchitectのモデルを選択
# 「設計」「アーキ」「マイクロサービス」等のキーワードがあればopus、それ以外はsonnet
ARCHITECT_MODEL="sonnet"
case "$(echo "$THEME" | tr '[:upper:]' '[:lower:]')" in
  *設計*|*アーキ*|*マイクロサービス*|*分散*|*セキュリティ*|*migration*|*リファクタ*)
    ARCHITECT_MODEL="opus" ;;
esac
log "🔧 architect モデル: ${ARCHITECT_MODEL}（テーマ判定）"

run_agent "architect" "
テーマ: $THEME
CEOの計画: $(extract_summary "$PROJECT_DIR/plan.json")
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
" "$ARCHITECT_MODEL" "10" &
PID_ARCH=$!

# UI前倒し: 要件サマリーが出た時点でPhase2からデザイン着手（楽観的並列）
run_agent "ui-designer" "
テーマ: $THEME
CEOの計画: $(extract_summary "$PROJECT_DIR/plan.json")
市場調査: $(extract_summary "$PROJECT_DIR/marketing-report.md")
ペルソナ調査: $(extract_summary "$PROJECT_DIR/persona-research.md")

UIモックアップを $PROJECT_DIR/mockup.html に出力してください。
HTML + Tailwind CSS で実際に表示できる形式にすること。
アクセシビリティに配慮すること。
※要件定義書・設計書は並行作成中です。テーマとペルソナ調査から最適なUIを設計してください。
" "" "8" &
PID_DESIGN=$!

wait $PID_REVIEW1 && add_exp "chief-secretary" 20 "キックオフレビュー完了"
wait $PID_PLANNER && add_exp "planner" 20 "タスク完了"
wait $PID_RD && add_exp "rd" 20 "タスク完了"
wait $PID_ARCH && add_exp "architect" 30 "設計完了"
wait $PID_DESIGN && add_exp "ui-designer" 20 "モックアップ完了"
record_phase "PHASE2" "$PHASE2_START"

# ================================================================
# PHASE 3: 実装＋QA＋評価＋報告書＋最終報告（全統合・最大並列）
#   要件設計レビューも楽観的並列実行。
# ================================================================
PHASE3_START=$(date +%s)
log ""
log "━━━ PHASE 3: 実装＋QA＋評価＋報告（最大並列）━━━"

# 要件・設計レビュー（楽観的並列 — 実装と同時進行）
run_async_review "要件・設計レビュー" "
要件サマリー: $(extract_summary "$PROJECT_DIR/requirements.md")
設計サマリー: $(extract_summary "$PROJECT_DIR/design.md")
R&Dサマリー: $(extract_summary "$PROJECT_DIR/rd-report.md")
スキーマ: $(extract_summary "$PROJECT_DIR/schema.sql")
" &
PID_REVIEW2=$!

# 提案3: 開発部長もextract_summaryを活用（要件・設計はサマリーで十分、スキーマのみfull）
run_agent "developer" "
テーマ: $THEME
要件: $(extract_summary "$PROJECT_DIR/requirements.md")
設計: $(extract_summary "$PROJECT_DIR/design.md")
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
" "" "6" &
PID_CS_FINAL=$!

# 提案4: 人事評価を実装と並列実行（Phase4から前倒し）
run_agent "hr" "
テーマ: $THEME
プロジェクト出力先: $PROJECT_DIR

プロジェクト参加メンバーの評価と育成提案を $PROJECT_DIR/hr-report.md に出力してください。
※冒頭に ## サマリー セクション必須。

- 各メンバーの貢献度評価
- スキルアップが必要な分野の特定
- チーム全体の強み・弱み分析
- 次プロジェクトに向けた教育計画
" "" "6" &
PID_HR=$!

# 提案4: 報告書ドラフトも並列実行（QA結果はあとで追記）
run_agent "doc-writer" "
テーマ: $THEME
計画サマリー: $(extract_summary "$PROJECT_DIR/plan.json")
要件サマリー: $(extract_summary "$PROJECT_DIR/requirements.md")
設計サマリー: $(extract_summary "$PROJECT_DIR/design.md")
市場調査サマリー: $(extract_summary "$PROJECT_DIR/marketing-report.md")

プロジェクト最終報告書を $PROJECT_DIR/report.md に出力してください。
※QA・CSレポートは並行実行中のため、他の情報で報告書を完成させてください。

- エグゼクティブサマリー
- 成果物一覧と概要
- 技術構成
- 市場調査結果の反映状況
- 残課題・次のステップ
" "" "10" &
PID_DOC=$!

wait $PID_REVIEW2 && add_exp "chief-secretary" 15 "要件設計レビュー完了"
wait $PID_DEV && add_exp "developer" 20 "タスク完了"
wait $PID_CS_FINAL && add_exp "cs" 20 "タスク完了"
wait $PID_HR && add_exp "hr" 20 "タスク完了"
wait $PID_DOC && add_exp "doc-writer" 20 "報告書完了"

# QAは実装完了後に実行（コードが必要なため）
log ""
log "━━━ QA＋最終報告（QA→最終報告）━━━"

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
" "" "8" &
PID_QA=$!

# 秘書部長最終サマリー + CEO秘書報告を並列（QAと同時開始）
run_agent "chief-secretary" "
テーマ: $THEME
人事評価サマリー: $(extract_summary "$PROJECT_DIR/hr-report.md")
計画サマリー: $(extract_summary "$PROJECT_DIR/plan.json")
報告書サマリー: $(extract_summary "$PROJECT_DIR/report.md")

社長向け最終サマリーを $PROJECT_DIR/chief-secretary-report.md に追記してください:
1. プロジェクト完了報告（社長が30秒で全体を把握できる要約）
2. 各部門の成果と課題のダッシュボード
3. 社長に確認いただきたい事項リスト
4. 次のアクション推奨
5. 社員の頑張りポイント（社長に褒めていただきたい点）
※QAレポートは並行実行中のため、完了後に補完してください。
" "" "8" &
PID_CS_REPORT=$!

run_agent "secretary" "
テーマ: $THEME
計画サマリー: $(extract_summary "$PROJECT_DIR/plan.json")
報告書サマリー: $(extract_summary "$PROJECT_DIR/report.md")

オーナー（ユーザー）への最終報告を $PROJECT_DIR/secretary-report.md に出力してください:
1. プロジェクト完了のお知らせ
2. 社長（黒澤 蓮司）の判断・指示のサマリー
3. プロジェクトハイライト（朗報を最初に）
4. 社員の活躍・貢献ピックアップ
5. オーナーにご判断いただきたい事項
6. 注意事項・リスク
7. 次のプロジェクトへの提言
" "" "8" &
PID_SEC=$!

wait $PID_QA && add_exp "qa-reviewer" 20 "タスク完了"
wait $PID_CS_REPORT && add_exp "chief-secretary" 30 "最終サマリー作成"
wait $PID_SEC && add_exp "secretary" 20 "タスク完了"
record_phase "PHASE3" "$PHASE3_START"

# ── プロジェクト完了 ──
PROJECT_END=$(date +%s)
TOTAL_DURATION=$((PROJECT_END - PROJECT_START))

tmp=$(mktemp)
jq ".total_duration_sec = $TOTAL_DURATION | .project_end = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" "$METRICS_FILE" > "$tmp" && mv "$tmp" "$METRICS_FILE"

log ""
log "============================================"
log "🎉 AI会社シミュレーション v5 完了（重量モード）"
log "📁 成果物: $PROJECT_DIR"
log "⏱️  総所要時間: ${TOTAL_DURATION}秒"
log "📊 計測データ: $METRICS_FILE"
log "============================================"

# 全員にプロジェクト完了EXP
ALL_AGENTS="ceo secretary chief-secretary marketing hr cs rd planner architect developer qa-reviewer ui-designer doc-writer"
for agent_id in $ALL_AGENTS; do
  add_exp "$agent_id" 100 "プロジェクト完了"
done

notify_slack "🎉 AI会社プロジェクト完了 v5（重量モード）\nテーマ: $THEME\n所要時間: ${TOTAL_DURATION}秒\n成果物: $PROJECT_DIR"

log "🏁 全工程終了"
exit 0
