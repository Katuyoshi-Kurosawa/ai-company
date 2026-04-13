#!/bin/bash
set -euo pipefail

# ============================================================
# AI会社 エスカレーション（上長相談）処理スクリプト
# Usage: ./ai-escalation.sh <from> <to> <type> "subject" "context" [options_json] [recommendation]
# ============================================================

FROM="${1:?相談元エージェントIDを指定}"
TO="${2:?相談先エージェントIDを指定}"
CONSULT_TYPE="${3:?相談種別: judgment|approval|alert}"
SUBJECT="${4:?相談件名を指定}"
CONTEXT="${5:?相談内容を指定}"
OPTIONS_JSON="${6:-[]}"
RECOMMENDATION="${7:-}"
CONFIG="./company-config.json"
AGENTS_DIR="./.claude/agents"
PROJECT_DIR="${ESCALATION_PROJECT_DIR:-./output}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONSULT_ID="c-${TIMESTAMP}"

mkdir -p "$PROJECT_DIR/escalation"

log() { echo "[ESC $(date '+%H:%M:%S')] $*"; }

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

# ── 緊急度判定 ──────────────────────────────────────────

get_urgency() {
  case "$CONSULT_TYPE" in
    alert)    echo "high" ;;
    judgment) echo "medium" ;;
    approval) echo "low" ;;
    *)        echo "medium" ;;
  esac
}

URGENCY=$(get_urgency)

# ── エスカレーション設定取得 ──────────────────────────────

RESPONSE_MODE=$(jq -r '.settings.escalation.responseMode' "$CONFIG")
AUTO_APPROVE=$(jq -r '.settings.escalation.autoApproveLow' "$CONFIG")
REBUTTAL=$(jq -r '.settings.escalation.rebuttalAllow' "$CONFIG")
SLACK_NOTIFY=$(jq -r '.settings.escalation.slackNotify' "$CONFIG")

FROM_ICON=$(get_agent_field "$FROM" ".icon")
FROM_NAME=$(get_agent_field "$FROM" ".name")
FROM_TITLE=$(get_agent_field "$FROM" ".title")
TO_ICON=$(get_agent_field "$TO" ".icon")
TO_NAME=$(get_agent_field "$TO" ".name")
TO_TITLE=$(get_agent_field "$TO" ".title")

log "============================================"
log "📨 相談発生: $CONSULT_ID"
log "📌 件名: $SUBJECT"
log "👤 相談元: ${FROM_ICON} ${FROM_NAME}${FROM_TITLE}"
log "👤 相談先: ${TO_ICON} ${TO_NAME}${TO_TITLE}"
log "📋 種別: $CONSULT_TYPE（緊急度: $URGENCY）"
log "============================================"

# ── 低緊急度の自動承認 ──────────────────────────────────

if [ "$URGENCY" = "low" ] && [ "$AUTO_APPROVE" = "true" ]; then
  log "✅ 低緊急度のため自動承認"

  RESULT_JSON="{
    \"consultation_id\": \"$CONSULT_ID\",
    \"judge\": \"$TO\",
    \"decision\": \"approved\",
    \"decision_reason\": \"低緊急度のため自動承認\",
    \"modifications\": []
  }"

  add_exp "$FROM" 30 "承認獲得（自動）"

else
  # ── 上長エージェントに判断させる ──────────────────────

  RESULT_JSON=$(claude -p \
    --model "$(get_agent_field "$TO" ".model")" \
    --system-prompt "$(cat "$AGENTS_DIR/$TO.md")" \
    --max-turns 10 \
    --dangerously-skip-permissions \
    "
あなたは上長として、部下からの相談に対して判断を下してください。

## 相談内容
- 相談ID: $CONSULT_ID
- 相談種別: $CONSULT_TYPE
- 緊急度: $URGENCY
- 相談者: ${FROM_ICON} ${FROM_NAME}${FROM_TITLE}
- 件名: $SUBJECT
- 内容: $CONTEXT
- 選択肢: $OPTIONS_JSON
- 相談者の推奨: $RECOMMENDATION

## あなたの判断
以下のJSON形式のみを出力してください（他のテキストは不要）:
{
  \"consultation_id\": \"$CONSULT_ID\",
  \"judge\": \"$TO\",
  \"decision\": \"approved または approved_with_modification または rejected または escalate\",
  \"decision_reason\": \"判断理由\",
  \"modifications\": [\"修正指示1\", \"修正指示2\"]
}
" 2>&1)

  # 判断結果からdecisionを抽出
  DECISION=$(echo "$RESULT_JSON" | grep -o '"decision"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"decision"[[:space:]]*:[[:space:]]*"//' | sed 's/"//')

  case "$DECISION" in
    approved*)
      log "✅ 承認: $SUBJECT"
      add_exp "$FROM" 30 "承認獲得"
      ;;
    rejected)
      log "❌ 却下: $SUBJECT"
      if [ "$REBUTTAL" != "none" ]; then
        log "💬 反論可能（設定: $REBUTTAL）"
      fi
      ;;
    escalate)
      log "⬆️  エスカレーション: さらに上の上長へ転送"
      PARENT_ID=$(get_agent_field "$TO" ".parentId")
      if [ "$PARENT_ID" != "null" ] && [ -n "$PARENT_ID" ]; then
        log "➡️  $TO → $PARENT_ID へエスカレーション"
        ESCALATION_PROJECT_DIR="$PROJECT_DIR" "$0" "$FROM" "$PARENT_ID" "$CONSULT_TYPE" "$SUBJECT" "$CONTEXT" "$OPTIONS_JSON" "$RECOMMENDATION"
      else
        log "⚠️  CEO到達。最終判断。"
      fi
      ;;
    *)
      log "⚠️  判断結果を解析できませんでした"
      ;;
  esac
fi

# ── 相談ログ保存 ──────────────────────────────────────────

CONSULT_LOG="$PROJECT_DIR/escalation/consultations.json"
if [ ! -f "$CONSULT_LOG" ]; then
  echo '{"consultations":[]}' > "$CONSULT_LOG"
fi

NEW_ENTRY=$(cat <<ENTRY_EOF
{
  "id": "$CONSULT_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "type": "$CONSULT_TYPE",
  "urgency": "$URGENCY",
  "from": "$FROM",
  "to": "$TO",
  "subject": "$SUBJECT",
  "status": "${DECISION:-auto_approved}"
}
ENTRY_EOF
)

tmp=$(mktemp)
jq ".consultations += [$NEW_ENTRY]" "$CONSULT_LOG" > "$tmp" && mv "$tmp" "$CONSULT_LOG"

# ── Slack通知 ──────────────────────────────────────────

if [ "$SLACK_NOTIFY" = "all" ] || { [ "$SLACK_NOTIFY" = "alert" ] && [ "$URGENCY" = "high" ]; }; then
  notify_slack "📨 相談: ${FROM_ICON}${FROM_NAME} → ${TO_ICON}${TO_NAME}\n件名: $SUBJECT\n結果: ${DECISION:-auto_approved}"
fi

log "📝 ログ保存完了: $CONSULT_LOG"
