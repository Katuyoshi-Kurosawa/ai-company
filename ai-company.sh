#!/bin/bash
set -euo pipefail

# ============================================================
# AI会社シミュレーション — メインオーケストレーター
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
  agent_name=$(get_agent_field "$agent_id" ".icon + \" \" + .name + .title")

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

# ── ステップ実行 ──────────────────────────────────────────

log "============================================"
log "🏢 AI会社シミュレーション 起動"
log "📌 テーマ: $THEME"
log "📁 出力先: $PROJECT_DIR"
log "============================================"

# ── STEP 1: CEO — プロジェクト計画 ──
log ""
log "━━━ STEP 1/7: CEO（黒澤）— プロジェクト計画 ━━━"
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
"
add_exp "ceo" 20 "タスク完了"

# ── キックオフMTG ──
log ""
log "━━━ キックオフMTG ━━━"
./ai-mtg.sh kickoff "plan.json のレビュー — テーマ: $THEME" 2 chair "$PROJECT_DIR" || log "⚠️  MTGスキップ"

# ── STEP 2: 企画部長 — 要件定義 ──
log ""
log "━━━ STEP 2/7: 企画部長（山田）— 要件定義 ━━━"
run_agent "planner" "
テーマ: $THEME
CEOの計画: $(cat "$PROJECT_DIR/plan.json" 2>/dev/null || echo '未生成')

要件定義書を $PROJECT_DIR/requirements.md に出力してください。
以下を含めること:
- 背景・目的
- 機能要件（優先度付き）
- 非機能要件
- 制約事項
- 用語集
"
add_exp "planner" 20 "タスク完了"

# ── 要件レビューMTG ──
log ""
log "━━━ 要件レビューMTG ━━━"
./ai-mtg.sh req-review "要件定義書のレビュー" 3 chair "$PROJECT_DIR" || log "⚠️  MTGスキップ"

# ── STEP 3: 設計部長 — 技術設計 ──
log ""
log "━━━ STEP 3/7: 設計部長（佐藤）— 技術設計 ━━━"
run_agent "architect" "
テーマ: $THEME
計画: $(cat "$PROJECT_DIR/plan.json" 2>/dev/null || echo '未生成')
要件: $(cat "$PROJECT_DIR/requirements.md" 2>/dev/null || echo '未生成')

以下の2ファイルを出力してください:
1. $PROJECT_DIR/design.md — 技術設計書（アーキテクチャ、API設計、画面遷移）
2. $PROJECT_DIR/schema.sql — DBスキーマ（Cloudflare D1 / SQLite）
"
add_exp "architect" 20 "タスク完了"

# ── 設計レビューMTG ──
log ""
log "━━━ 設計レビューMTG ━━━"
./ai-mtg.sh design-review "技術設計書のレビュー" 3 chair "$PROJECT_DIR" || log "⚠️  MTGスキップ"

# ── STEP 4 & 5: デザイン & 開発（並列） ──
log ""
log "━━━ STEP 4+5/7: デザイン部長 & 開発部長（並列実行）━━━"

run_agent "ui-designer" "
テーマ: $THEME
要件: $(cat "$PROJECT_DIR/requirements.md" 2>/dev/null || echo '未生成')
設計: $(cat "$PROJECT_DIR/design.md" 2>/dev/null || echo '未生成')

UIモックアップを $PROJECT_DIR/mockup.html に出力してください。
HTML + Tailwind CSS で実際に表示できる形式にすること。
" &
PID_DESIGN=$!

run_agent "developer" "
テーマ: $THEME
要件: $(cat "$PROJECT_DIR/requirements.md" 2>/dev/null || echo '未生成')
設計: $(cat "$PROJECT_DIR/design.md" 2>/dev/null || echo '未生成')
スキーマ: $(cat "$PROJECT_DIR/schema.sql" 2>/dev/null || echo '未生成')

アプリケーションを $PROJECT_DIR/app/ に実装してください。
技術スタック: React + Vite + TypeScript + Tailwind CSS + Hono + D1
" &
PID_DEV=$!

wait $PID_DESIGN && add_exp "ui-designer" 20 "タスク完了"
wait $PID_DEV && add_exp "developer" 20 "タスク完了"

# ── コードレビューMTG ──
log ""
log "━━━ コードレビューMTG ━━━"
./ai-mtg.sh code-review "実装コードのレビュー" 3 chair "$PROJECT_DIR" || log "⚠️  MTGスキップ"

# ── STEP 6: QA部長 — 品質レビュー ──
log ""
log "━━━ STEP 6/7: QA部長（田中）— 品質レビュー ━━━"
run_agent "qa-reviewer" "
テーマ: $THEME
要件: $(cat "$PROJECT_DIR/requirements.md" 2>/dev/null || echo '未生成')
設計: $(cat "$PROJECT_DIR/design.md" 2>/dev/null || echo '未生成')

以下のディレクトリにあるコードとモックアップを品質レビューしてください:
- $PROJECT_DIR/app/
- $PROJECT_DIR/mockup.html

品質レポートを $PROJECT_DIR/qa-report.md に出力してください:
- バグ・問題点一覧
- セキュリティチェック結果
- パフォーマンス懸念事項
- 改善提案
"
add_exp "qa-reviewer" 20 "タスク完了"

# ── STEP 7: 資料作成部長 — 報告書 ──
log ""
log "━━━ STEP 7/7: 資料作成部長（中村）— 報告書 ━━━"
run_agent "doc-writer" "
テーマ: $THEME
計画: $(cat "$PROJECT_DIR/plan.json" 2>/dev/null || echo '未生成')
要件: $(cat "$PROJECT_DIR/requirements.md" 2>/dev/null || echo '未生成')
設計: $(cat "$PROJECT_DIR/design.md" 2>/dev/null || echo '未生成')
QAレポート: $(cat "$PROJECT_DIR/qa-report.md" 2>/dev/null || echo '未生成')

プロジェクト報告書を $PROJECT_DIR/report.md に出力してください:
- エグゼクティブサマリー
- 成果物一覧と概要
- 技術構成
- 品質状況
- 残課題・次のステップ
"
add_exp "doc-writer" 20 "タスク完了"

# ── 最終レビューMTG ──
log ""
log "━━━ 最終レビューMTG ━━━"
./ai-mtg.sh final-review "プロジェクト最終レビュー" 3 chair "$PROJECT_DIR" || log "⚠️  MTGスキップ"

# ── プロジェクト完了 ──
log ""
log "============================================"
log "🎉 AI会社シミュレーション 完了"
log "📁 成果物: $PROJECT_DIR"
log "============================================"

# 全員にプロジェクト完了EXP
for agent_id in ceo planner architect developer qa-reviewer ui-designer doc-writer; do
  add_exp "$agent_id" 100 "プロジェクト完了"
done

# Slack通知
notify_slack "🎉 AI会社プロジェクト完了\nテーマ: $THEME\n成果物: $PROJECT_DIR"

log "🏁 全工程終了"
