#!/bin/bash
set -euo pipefail

# ============================================================
# AI会社 MTG（会議）実行スクリプト
# Usage: ./ai-mtg.sh <種別> "議題" <ラウンド数> <対立解決> [出力先]
# ============================================================

MTG_TYPE="${1:?種別を指定: kickoff|req-review|design-review|ui-review|code-review|final-review|brainstorm|custom}"
AGENDA="${2:?議題を指定してください}"
ROUNDS="${3:-3}"
CONFLICT="${4:-chair}"
PROJECT_DIR="${5:-./output}"
CONFIG="./company-config.json"
AGENTS_DIR="./.claude/agents"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MTG_ID="mtg-${TIMESTAMP}"
MTG_DIR="${PROJECT_DIR}/mtg"

mkdir -p "$MTG_DIR"

log() { echo "[MTG $(date '+%H:%M:%S')] $*"; }

get_agent_field() {
  local agent_id="$1" field="$2"
  jq -r ".agents[] | select(.id == \"$agent_id\") | $field" "$CONFIG"
}

add_exp() {
  local agent_id="$1" amount="$2" reason="$3"
  local current_exp new_exp tmp
  current_exp=$(get_agent_field "$agent_id" ".exp")
  new_exp=$((current_exp + amount))
  tmp=$(mktemp)
  jq "(.agents[] | select(.id == \"$agent_id\") | .exp) = $new_exp" "$CONFIG" > "$tmp" && mv "$tmp" "$CONFIG"
  log "💫 ${agent_id}: +${amount} EXP ($reason)"
}

notify_slack() {
  local WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
  if [ -n "$WEBHOOK_URL" ]; then
    curl -s -X POST "$WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{\"text\": \"$1\"}" > /dev/null 2>&1 || true
  fi
}

# ── 参加者選出 ──────────────────────────────────────────

select_participants() {
  case "$MTG_TYPE" in
    kickoff)      echo "ceo planner architect developer qa-reviewer ui-designer doc-writer" ;;
    req-review)   echo "ceo planner architect ui-designer" ;;
    design-review) echo "architect developer ui-designer qa-reviewer" ;;
    ui-review)    echo "ui-designer developer planner" ;;
    code-review)  echo "developer qa-reviewer architect" ;;
    final-review) echo "ceo planner architect developer qa-reviewer ui-designer doc-writer" ;;
    brainstorm)   echo "ceo planner architect developer qa-reviewer ui-designer doc-writer" ;;
    custom)       echo "ceo planner architect developer qa-reviewer ui-designer doc-writer" ;;
    *)            echo "ceo planner architect" ;;
  esac
}

# ── 議長選出 ──────────────────────────────────────────

select_chair() {
  local agenda_lower
  agenda_lower=$(echo "$AGENDA" | tr '[:upper:]' '[:lower:]')

  if echo "$agenda_lower" | grep -qE "要件|機能|ユーザー"; then
    echo "planner"
  elif echo "$agenda_lower" | grep -qE "設計|db|api|アーキ"; then
    echo "architect"
  elif echo "$agenda_lower" | grep -qE "実装|コード|バグ|開発"; then
    echo "developer"
  elif echo "$agenda_lower" | grep -qE "テスト|品質|レビュー|qa"; then
    echo "qa-reviewer"
  elif echo "$agenda_lower" | grep -qE "ui|デザイン|画面|ux"; then
    echo "ui-designer"
  elif echo "$agenda_lower" | grep -qE "計画|方針|リスク|キック"; then
    echo "ceo"
  elif echo "$agenda_lower" | grep -qE "資料|報告|ドキュメント"; then
    echo "doc-writer"
  else
    echo "ceo"
  fi
}

# ── 対立解決ルール ──────────────────────────────────────────

get_conflict_rule() {
  case "$CONFLICT" in
    majority)  echo "多数決で決定する" ;;
    consensus) echo "全員合意を目指す。合意できない場合は両論併記する" ;;
    chair)     echo "議長が最終判断する" ;;
    both)      echo "両論併記する" ;;
    *)         echo "議長が最終判断する" ;;
  esac
}

# ── 関連資料の収集 ──────────────────────────────────────────

collect_context() {
  local context=""
  for f in "$PROJECT_DIR"/plan.json "$PROJECT_DIR"/requirements.md "$PROJECT_DIR"/design.md "$PROJECT_DIR"/schema.sql "$PROJECT_DIR"/mockup.html "$PROJECT_DIR"/qa-report.md; do
    if [ -f "$f" ]; then
      local fname
      fname=$(basename "$f")
      context="${context}\n--- ${fname} ---\n$(head -100 "$f")\n"
    fi
  done
  echo -e "$context"
}

# ── メイン実行 ──────────────────────────────────────────

PARTICIPANTS=$(select_participants)
CHAIR=$(select_chair)
CONFLICT_RULE=$(get_conflict_rule)
CONTEXT=$(collect_context)

# 参加者の名前・役職を組み立て
PARTICIPANT_INFO=""
for pid in $PARTICIPANTS; do
  local_icon=$(get_agent_field "$pid" ".icon")
  local_name=$(get_agent_field "$pid" ".name")
  local_title=$(get_agent_field "$pid" ".title")
  local_personality=$(get_agent_field "$pid" ".personality")
  PARTICIPANT_INFO="${PARTICIPANT_INFO}
- ${local_icon} ${local_name}${local_title}（ID: ${pid}）: ${local_personality}"
done

CHAIR_ICON=$(get_agent_field "$CHAIR" ".icon")
CHAIR_NAME=$(get_agent_field "$CHAIR" ".name")
CHAIR_TITLE=$(get_agent_field "$CHAIR" ".title")

log "============================================"
log "📋 MTG開始: $MTG_TYPE"
log "📌 議題: $AGENDA"
log "👤 議長: ${CHAIR_ICON} ${CHAIR_NAME}${CHAIR_TITLE}"
log "👥 参加者: $PARTICIPANTS"
log "🔄 ラウンド数: $ROUNDS"
log "⚖️  対立解決: $CONFLICT_RULE"
log "============================================"

# ファシリテーターにMTGを進行させる
MTG_OUTPUT=$(claude -p \
  --model sonnet \
  --system-prompt "$(cat "$AGENTS_DIR/mtg-facilitator.md")" \
  --max-turns 30 \
  --dangerously-skip-permissions \
  "
以下のMTGを進行してください。各参加者になりきって発言を生成し、Slackスレッド風のチャット形式で議論を行ってください。

## MTG情報
- MTG ID: $MTG_ID
- 種別: $MTG_TYPE
- 議題: $AGENDA
- 議長: ${CHAIR_ICON} ${CHAIR_NAME}${CHAIR_TITLE}
- ラウンド数: $ROUNDS
- 対立時の解決方法: $CONFLICT_RULE

## 参加者
$PARTICIPANT_INFO

## 関連資料
$CONTEXT

## 進行ルール
1. 議長が議題を説明して開始
2. 各ラウンドで全参加者が発言（Slackスレッド風フォーマット: 「アイコン 名前役職  HH:MM」）
3. 対立があれば「${CONFLICT_RULE}」で解決
4. 決定事項・アクションアイテムをまとめる

## 出力
以下の2ファイルを出力してください:

1. ${MTG_DIR}/minutes-${TIMESTAMP}.md — 議事録（上記フォーマットに従う）
2. ${MTG_DIR}/actions-${TIMESTAMP}.json — アクションアイテム（JSON形式）:
{
  \"mtg_id\": \"$MTG_ID\",
  \"type\": \"$MTG_TYPE\",
  \"agenda\": \"$AGENDA\",
  \"chair\": \"$CHAIR\",
  \"participants\": [$(echo "$PARTICIPANTS" | sed 's/ /", "/g' | sed 's/^/"/' | sed 's/$/"/')],
  \"decisions\": [\"決定1\", \"決定2\"],
  \"actions\": [
    { \"action\": \"...\", \"assignee\": \"...\", \"deadline\": \"...\" }
  ],
  \"exp_awards\": [
    { \"agent\": \"...\", \"reason\": \"提案採用\", \"exp\": 40 }
  ]
}
" 2>&1)

echo "$MTG_OUTPUT" >> "$MTG_DIR/mtg-${TIMESTAMP}-raw.log"

# 参加者全員にMTG参加EXP
for pid in $PARTICIPANTS; do
  add_exp "$pid" 15 "MTG参加"
done

log "✅ MTG完了: $MTG_ID"
log "📄 議事録: ${MTG_DIR}/minutes-${TIMESTAMP}.md"

# Slack通知
notify_slack "📋 MTG完了: $MTG_TYPE\n議題: $AGENDA\n議長: ${CHAIR_ICON} ${CHAIR_NAME}${CHAIR_TITLE}"
