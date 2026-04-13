#!/bin/bash
set -euo pipefail

# ============================================================
# AI会社シミュレーション — メインオーケストレーター（16名対応版）
# Usage: ./ai-company.sh "テーマ"
# ============================================================

THEME="${1:?テーマを指定してください。例: ./ai-company.sh \"顧客ランク別割引機能を追加したい\"}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="./output/${TIMESTAMP}"
CONFIG="./company-config.json"
AGENTS_DIR="./.claude/agents"
LOG_DIR="./logs"

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

  log "🚀 ${agent_name} 開始"

  claude -p \
    --model "$model" \
    --system-prompt "$(cat "$system_prompt_file")" \
    --max-turns "$max_turns" \
    --dangerously-skip-permissions \
    "$prompt" \
    2>&1 | tee -a "$LOG_DIR/${TIMESTAMP}_${agent_id}.log"

  log "✅ ${agent_name} 完了"
}

read_file_or_empty() {
  cat "$1" 2>/dev/null || echo '未生成'
}

# ── ステップ実行 ──────────────────────────────────────────

log "============================================"
log "🏢 AI会社シミュレーション 起動（16名体制）"
log "📌 テーマ: $THEME"
log "📁 出力先: $PROJECT_DIR"
log "============================================"

# ================================================================
# PHASE 1: CEO計画 + 並列で情報収集・市場調査
# ================================================================
log ""
log "━━━ PHASE 1: CEO計画 ＋ マーケ調査・UXリサーチ（並列）━━━"

# CEO — プロジェクト計画
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
" &
PID_CEO=$!

# マーケティング部長 — 市場調査（並列）
run_agent "marketing" "
テーマ: $THEME

テーマに関する市場調査を実施し、$PROJECT_DIR/marketing-report.md に出力してください:
- 市場トレンド・競合動向
- ターゲット顧客分析
- 差別化ポイントの提案
- 参入リスクと機会
- SNS・口コミでの関連トピック
" &
PID_MARKETING=$!

# UXリサーチ部長 — ユーザー調査（並列）
run_agent "ux-research" "
テーマ: $THEME

テーマに関するUXリサーチを実施し、$PROJECT_DIR/ux-research-report.md に出力してください:
- 想定ペルソナ（3-5人）
- カスタマージャーニーマップ
- ユーザーの課題・ペインポイント
- 競合プロダクトのUX分析
- アクセシビリティ配慮事項
" &
PID_UX=$!

wait $PID_CEO && add_exp "ceo" 20 "タスク完了"
wait $PID_MARKETING && add_exp "marketing" 20 "タスク完了"
wait $PID_UX && add_exp "ux-research" 20 "タスク完了"

# 秘書部長 — CEO計画の要約＆リマインド作成
log ""
log "━━━ 秘書部長：計画サマリー＆各部門へのリマインド作成 ━━━"
run_agent "chief-secretary" "
テーマ: $THEME
CEO計画: $(read_file_or_empty "$PROJECT_DIR/plan.json")
市場調査: $(read_file_or_empty "$PROJECT_DIR/marketing-report.md")
UXリサーチ: $(read_file_or_empty "$PROJECT_DIR/ux-research-report.md")

以下を $PROJECT_DIR/chief-secretary-report.md に出力してください:
1. CEO計画の要約（社長が一目で確認できる形式）
2. 市場調査・UXリサーチの要点まとめ
3. 各部門への指示・リマインド事項
4. 社長への報告ポイント（朗報は最初に）
5. 注意すべきリスク・ボトルネック予測
"
add_exp "chief-secretary" 20 "タスク完了"

# ── キックオフMTG ──
log ""
log "━━━ キックオフMTG ━━━"
./ai-mtg.sh kickoff "plan.json のレビュー — テーマ: $THEME" 2 chair "$PROJECT_DIR" || log "⚠️  MTGスキップ"

# ================================================================
# PHASE 2: 要件定義 + R&Dアイデア出し（並列）
# ================================================================
log ""
log "━━━ PHASE 2: 企画部長 要件定義 ＋ R&D アイデア出し（並列）━━━"

run_agent "planner" "
テーマ: $THEME
CEOの計画: $(read_file_or_empty "$PROJECT_DIR/plan.json")
市場調査: $(read_file_or_empty "$PROJECT_DIR/marketing-report.md")
UXリサーチ: $(read_file_or_empty "$PROJECT_DIR/ux-research-report.md")

要件定義書を $PROJECT_DIR/requirements.md に出力してください。
以下を含めること:
- 背景・目的（市場調査・UXリサーチの知見を反映）
- 機能要件（優先度付き）
- 非機能要件
- ペルソナ・ユースケース
- 制約事項
- 用語集
" &
PID_PLANNER=$!

# R&D部長 — 破壊的アイデア提案（並列）
run_agent "rd" "
テーマ: $THEME
CEOの計画: $(read_file_or_empty "$PROJECT_DIR/plan.json")
市場調査: $(read_file_or_empty "$PROJECT_DIR/marketing-report.md")

テーマに対する破壊的アイデアを $PROJECT_DIR/rd-report.md に出力してください:
- 従来のアプローチを10倍良くする方法（最低5案）
- 競合が思いつかない差別化アイデア
- 技術トレンドを活用した革新的機能
- ムーンショット提案（大胆な構想1つ）
- 実現可能性と優先度のマトリクス
" &
PID_RD=$!

wait $PID_PLANNER && add_exp "planner" 20 "タスク完了"
wait $PID_RD && add_exp "rd" 20 "タスク完了"

# ── 要件レビューMTG ──
log ""
log "━━━ 要件レビューMTG ━━━"
./ai-mtg.sh req-review "要件定義書のレビュー（R&Dアイデアも含む）" 3 chair "$PROJECT_DIR" || log "⚠️  MTGスキップ"

# ================================================================
# PHASE 3: 設計（設計部長 + 秘書部長が加速支援）
# ================================================================
log ""
log "━━━ PHASE 3: 設計部長 技術設計 ━━━"
run_agent "architect" "
テーマ: $THEME
計画: $(read_file_or_empty "$PROJECT_DIR/plan.json")
要件: $(read_file_or_empty "$PROJECT_DIR/requirements.md")
R&Dアイデア: $(read_file_or_empty "$PROJECT_DIR/rd-report.md")

以下の2ファイルを出力してください:
1. $PROJECT_DIR/design.md — 技術設計書（アーキテクチャ、API設計、画面遷移）
  ※R&Dアイデアのうち実現可能なものを設計に取り込むこと
2. $PROJECT_DIR/schema.sql — DBスキーマ（Cloudflare D1 / SQLite）
"
add_exp "architect" 20 "タスク完了"

# ── 設計レビューMTG ──
log ""
log "━━━ 設計レビューMTG ━━━"
./ai-mtg.sh design-review "技術設計書のレビュー" 3 chair "$PROJECT_DIR" || log "⚠️  MTGスキップ"

# ================================================================
# PHASE 4: デザイン & 開発 & CS準備（3並列）
# ================================================================
log ""
log "━━━ PHASE 4: デザイン＋開発＋CS準備（3並列）━━━"

run_agent "ui-designer" "
テーマ: $THEME
要件: $(read_file_or_empty "$PROJECT_DIR/requirements.md")
設計: $(read_file_or_empty "$PROJECT_DIR/design.md")
UXリサーチ: $(read_file_or_empty "$PROJECT_DIR/ux-research-report.md")

UIモックアップを $PROJECT_DIR/mockup.html に出力してください。
HTML + Tailwind CSS で実際に表示できる形式にすること。
UXリサーチの知見（ペルソナ、アクセシビリティ）を反映すること。
" &
PID_DESIGN=$!

run_agent "developer" "
テーマ: $THEME
要件: $(read_file_or_empty "$PROJECT_DIR/requirements.md")
設計: $(read_file_or_empty "$PROJECT_DIR/design.md")
スキーマ: $(read_file_or_empty "$PROJECT_DIR/schema.sql")

アプリケーションを $PROJECT_DIR/app/ に実装してください。
技術スタック: React + Vite + TypeScript + Tailwind CSS + Hono + D1
" &
PID_DEV=$!

# CS部長 — サポート体制準備（並列）
run_agent "cs" "
テーマ: $THEME
要件: $(read_file_or_empty "$PROJECT_DIR/requirements.md")
UXリサーチ: $(read_file_or_empty "$PROJECT_DIR/ux-research-report.md")

カスタマーサクセス計画を $PROJECT_DIR/cs-report.md に出力してください:
- オンボーディングフロー設計
- FAQドラフト（想定質問10件以上）
- サポートチャネル設計
- チャーン防止施策
- 顧客満足度KPI設定
" &
PID_CS=$!

wait $PID_DESIGN && add_exp "ui-designer" 20 "タスク完了"
wait $PID_DEV && add_exp "developer" 20 "タスク完了"
wait $PID_CS && add_exp "cs" 20 "タスク完了"

# ── コードレビューMTG ──
log ""
log "━━━ コードレビューMTG ━━━"
./ai-mtg.sh code-review "実装コードのレビュー" 3 chair "$PROJECT_DIR" || log "⚠️  MTGスキップ"

# ================================================================
# PHASE 5: QAレビュー + 人事評価（並列）
# ================================================================
log ""
log "━━━ PHASE 5: QAレビュー ＋ 人事評価（並列）━━━"

run_agent "qa-reviewer" "
テーマ: $THEME
要件: $(read_file_or_empty "$PROJECT_DIR/requirements.md")
設計: $(read_file_or_empty "$PROJECT_DIR/design.md")

以下のディレクトリにあるコードとモックアップを品質レビューしてください:
- $PROJECT_DIR/app/
- $PROJECT_DIR/mockup.html

品質レポートを $PROJECT_DIR/qa-report.md に出力してください:
- バグ・問題点一覧
- セキュリティチェック結果
- パフォーマンス懸念事項
- 改善提案
" &
PID_QA=$!

# 人事部長 — プロジェクト中の社員評価（並列）
run_agent "hr" "
テーマ: $THEME
プロジェクト出力先: $PROJECT_DIR

プロジェクト参加メンバーの評価と育成提案を $PROJECT_DIR/hr-report.md に出力してください:
- 各メンバーの貢献度評価
- スキルアップが必要な分野の特定
- チーム全体の強み・弱み分析
- 次プロジェクトに向けた教育計画
- 外部から採用すべきスキルセットの提案
" &
PID_HR=$!

wait $PID_QA && add_exp "qa-reviewer" 20 "タスク完了"
wait $PID_HR && add_exp "hr" 20 "タスク完了"

# ================================================================
# PHASE 6: 報告書作成 + 広報通知（並列）
# ================================================================
log ""
log "━━━ PHASE 6: 報告書作成 ＋ 広報（並列）━━━"

run_agent "doc-writer" "
テーマ: $THEME
計画: $(read_file_or_empty "$PROJECT_DIR/plan.json")
要件: $(read_file_or_empty "$PROJECT_DIR/requirements.md")
設計: $(read_file_or_empty "$PROJECT_DIR/design.md")
QAレポート: $(read_file_or_empty "$PROJECT_DIR/qa-report.md")
市場調査: $(read_file_or_empty "$PROJECT_DIR/marketing-report.md")
CS計画: $(read_file_or_empty "$PROJECT_DIR/cs-report.md")

プロジェクト報告書を $PROJECT_DIR/report.md に出力してください:
- エグゼクティブサマリー
- 成果物一覧と概要
- 技術構成
- 市場調査結果の反映状況
- 品質状況
- CS準備状況
- 残課題・次のステップ
" &
PID_DOC=$!

# 広報部長 — プロジェクト完了通知作成（並列）
run_agent "pr" "
テーマ: $THEME
計画: $(read_file_or_empty "$PROJECT_DIR/plan.json")
QAレポート: $(read_file_or_empty "$PROJECT_DIR/qa-report.md")
人事評価: $(read_file_or_empty "$PROJECT_DIR/hr-report.md")

オーナーへのプロジェクト完了報告を $PROJECT_DIR/pr-report.md に出力してください:
- プロジェクトハイライト（朗報を最初に）
- 社員の活躍・貢献ピックアップ
- 成果物サマリー
- 注意事項・リスク
- 次の推奨アクション
フォーマットは見やすく、一目で全体像がわかる構成にすること。
" &
PID_PR=$!

wait $PID_DOC && add_exp "doc-writer" 20 "タスク完了"
wait $PID_PR && add_exp "pr" 20 "タスク完了"

# ================================================================
# PHASE 7: 秘書部長 最終サマリー + CEO最終確認
# ================================================================
log ""
log "━━━ PHASE 7: 秘書部長 最終サマリー → CEO秘書 報告 ━━━"

# 秘書部長 — 全成果物を統合して社長向けサマリー
run_agent "chief-secretary" "
テーマ: $THEME
全成果物のディレクトリ: $PROJECT_DIR
報告書: $(read_file_or_empty "$PROJECT_DIR/report.md")
広報レポート: $(read_file_or_empty "$PROJECT_DIR/pr-report.md")
QAレポート: $(read_file_or_empty "$PROJECT_DIR/qa-report.md")
人事評価: $(read_file_or_empty "$PROJECT_DIR/hr-report.md")

社長向け最終サマリーを $PROJECT_DIR/chief-secretary-report.md に追記してください:
1. プロジェクト完了報告（社長が30秒で全体を把握できる要約）
2. 各部門の成果と課題のダッシュボード
3. 社長に確認いただきたい事項リスト
4. 次のアクション推奨
5. 社員の頑張りポイント（社長に褒めていただきたい点）

社長、お忙しいところ恐れ入りますが、以下ご確認をお願いいたします。
"
add_exp "chief-secretary" 30 "最終サマリー作成"

# CEO秘書 — オーナーへの最終報告
run_agent "secretary" "
テーマ: $THEME
秘書部長サマリー: $(read_file_or_empty "$PROJECT_DIR/chief-secretary-report.md")
広報レポート: $(read_file_or_empty "$PROJECT_DIR/pr-report.md")

オーナー（ユーザー）への最終報告を $PROJECT_DIR/secretary-report.md に出力してください:
1. プロジェクト完了のお知らせ
2. 社長（黒澤 蓮司）の判断・指示のサマリー
3. 特に注目すべき成果
4. オーナーにご判断いただきたい事項
5. 次のプロジェクトへの提言
"
add_exp "secretary" 20 "タスク完了"

# ── 最終レビューMTG ──
log ""
log "━━━ 最終レビューMTG ━━━"
./ai-mtg.sh final-review "プロジェクト最終レビュー" 3 chair "$PROJECT_DIR" || log "⚠️  MTGスキップ"

# ── プロジェクト完了 ──
log ""
log "============================================"
log "🎉 AI会社シミュレーション 完了（16名体制）"
log "📁 成果物: $PROJECT_DIR"
log "============================================"

# 全員にプロジェクト完了EXP
ALL_AGENTS="ceo secretary chief-secretary marketing hr pr cs rd ux-research planner architect developer qa-reviewer ui-designer doc-writer"
for agent_id in $ALL_AGENTS; do
  add_exp "$agent_id" 100 "プロジェクト完了"
done

# Slack通知
notify_slack "🎉 AI会社プロジェクト完了（16名体制）\nテーマ: $THEME\n成果物: $PROJECT_DIR"

log "🏁 全工程終了"
