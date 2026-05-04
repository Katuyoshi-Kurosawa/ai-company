# 指示室リデザイン＆ルート実行修正 設計スペック

> **For agentic workers:** Use superpowers:writing-plans to create an implementation plan from this spec.

## Goal

指示室のUXを改善し、ルート選択の説明と実際の動作を一致させる。具体的には、ユーザーが選んだエージェントが実際に実行されるようにし、実行内容を事前確認できるUIを提供する。

## 背景・問題点

1. **OVERRIDE_AGENTS が未使用**: UIでルートを選ぶと `--agents ceo,planner,secretary` が `ai-company.sh` に渡されるが、スクリプト内で `OVERRIDE_AGENTS` はパースされるのに一度も使われていない。結果、`--depth medium` なら固定の6名以上が動く。
2. **要件ポイントが埋もれる**: デフォルトで折り畳まれており、ユーザーが気づきにくい。
3. **実行プレビューがない**: どのエージェントが何をするか実行前に確認できない。

## 修正スコープ

| 層 | ファイル | 変更内容 |
|---|---|---|
| Frontend | `ui/src/components/RouteSelector.tsx` | 要件ポイント常時展開、実行プレビュー追加 |
| Backend | `ai-company.sh` | カスタムエージェントモード実装（OVERRIDE_AGENTS使用） |

---

## 1. フロントエンド変更（RouteSelector.tsx）

### 1-1. 要件ポイント — 常時展開

**現在:** `showNotes` state で折り畳み、デフォルト closed。
**変更後:** 常時展開表示。折り畳みボタンを削除。入力件数バッジを追加。

```tsx
// 変更前
const [showNotes, setShowNotes] = useState(false);
// 変更後: showNotes state を削除し、常に textarea を表示

// 件数バッジ（空行を除いた行数）
const noteCount = requirementNotes.split('\n').filter(l => l.trim()).length;
```

表示要素:
- ヘッダー: `📋 要件ポイント` + 件数バッジ（`{noteCount}件` / 0件は非表示）
- 説明: `エージェントへの条件・制約を箇条書きで入力`
- textarea: 常時表示、`h-24`、プレースホルダーあり

### 1-2. 実行プレビュー — 折り畳み

各ルートカードに「実行内容を確認」トグルを追加。

**新規 state:**
```tsx
const [previewOpen, setPreviewOpen] = useState<Record<string, boolean>>({});
```

**実行プレビューの内容（各ルートカード内）:**
```tsx
<button onClick={() => setPreviewOpen(p => ({ ...p, [route.type]: !p[route.type] }))}>
  {previewOpen[route.type] ? '▲ 実行内容を閉じる' : '▶ 実行内容を確認'}
</button>

{previewOpen[route.type] && (
  <div className="mt-2 p-3 bg-black/20 rounded-lg text-xs space-y-1">
    {adjusted.agents.map((id, i) => {
      const a = getAgent(id);
      return (
        <div key={id} className="flex gap-2">
          <span className="opacity-40">({i + 1})</span>
          <span className="font-bold">{a?.name}</span>
          <span className="opacity-50">({a?.title})</span>
          <span className="opacity-40 ml-1">→ {getAgentRole(id)}</span>
        </div>
      );
    })}
    {noteCount > 0 && (
      <div className="mt-2 pt-2 border-t border-white/10 text-green-400/70">
        ✓ 要件ポイント（{noteCount}件）は全エージェントに共有されます
      </div>
    )}
  </div>
)}
```

**`getAgentRole(id)` マッピング（ui/src/lib/agentRoles.ts として新規作成）:**

```ts
export const AGENT_ROLES: Record<string, string> = {
  ceo: 'プロジェクト計画策定・意思決定',
  secretary: '最終報告書作成・取りまとめ',
  'chief-secretary': '秘書部管理・調整',
  marketing: '市場調査・マーケティング分析',
  hr: '人事・組織観点の分析',
  cs: '顧客満足度・サービス観点の分析',
  rd: '研究開発・革新的アイデア提案',
  planner: '要件定義・仕様書・企画立案',
  architect: 'アーキテクチャ設計・技術選定',
  developer: '開発計画・実装方針策定',
  'qa-reviewer': 'テスト計画・品質基準策定',
  'ui-designer': 'UI/UXデザイン・画面設計',
  'doc-writer': '資料・ドキュメント作成',
};
```

---

## 2. バックエンド変更（ai-company.sh）

### 2-1. カスタムエージェントモード

`OVERRIDE_AGENTS` が設定されており、かつ depth が `lightweight` でも `heavy` でもない場合、固定のmediumフローではなくOVERRIDE_AGENTSに基づいて実行する。

**追加する関数 `get_custom_prompt(agent_id)`:**

```bash
get_custom_prompt() {
  local agent_id="$1"
  local prev_outputs
  prev_outputs=$(ls "$PROJECT_DIR"/*.md "$PROJECT_DIR"/*.json 2>/dev/null | \
    xargs -I{} sh -c 'echo "=== {} ==="; head -30 "{}"' 2>/dev/null || echo "")

  local base="テーマ: $THEME

【要件・制約】
$THEME

【これまでの成果物（参考）】
${prev_outputs:-なし}

"
  case "$agent_id" in
    ceo)
      echo "${base}CEOとして全体のプロジェクト計画を $PROJECT_DIR/plan.json に JSON形式で出力してください。goals/scope/phases/risks を含めること。" ;;
    secretary|chief-secretary)
      echo "${base}秘書として、これまでの成果物を統合した最終報告書を $PROJECT_DIR/secretary-report.md に出力してください。## サマリー セクションから始めること。" ;;
    marketing)
      echo "${base}マーケティング部長として市場調査・分析レポートを $PROJECT_DIR/marketing-report.md に出力してください。" ;;
    hr)
      echo "${base}人事部長として人事・組織観点での提言を $PROJECT_DIR/hr-report.md に出力してください。" ;;
    cs)
      echo "${base}CS部長として顧客満足度・サービス観点での分析を $PROJECT_DIR/cs-report.md に出力してください。" ;;
    rd)
      echo "${base}研究開発部長として革新的なアイデアと技術的切り口を $PROJECT_DIR/rd-report.md に出力してください。" ;;
    planner)
      echo "${base}企画部長として要件定義書・仕様書を $PROJECT_DIR/requirements.md に出力してください。" ;;
    architect)
      echo "${base}設計部長としてアーキテクチャ設計書を $PROJECT_DIR/architecture.md に出力してください。" ;;
    developer)
      echo "${base}開発部長として開発計画・実装方針を $PROJECT_DIR/dev-plan.md に出力してください。" ;;
    qa-reviewer)
      echo "${base}QA部長としてテスト計画・品質基準を $PROJECT_DIR/qa-plan.md に出力してください。" ;;
    ui-designer)
      echo "${base}デザイン部長としてUI/UXデザイン方針・画面設計を $PROJECT_DIR/design.md に出力してください。" ;;
    doc-writer)
      echo "${base}資料作成部長として成果物の最終資料を $PROJECT_DIR/document.md に出力してください。" ;;
    *)
      echo "${base}担当者として役割に応じた成果物を $PROJECT_DIR/${agent_id}-report.md に出力してください。" ;;
  esac
}
```

**カスタムモードの実行フロー（medium モードの手前に追加）:**

```bash
# ── カスタムエージェントモード ──────────────────────────────────
# OVERRIDE_AGENTSが設定されており、且つlightweight/heavy以外の場合
if [ -n "$OVERRIDE_AGENTS" ] && \
   [ "$THEME_WEIGHT" != "lightweight" ] && \
   [ "$THEME_WEIGHT" != "heavy" ]; then

  log "============================================"
  log "🏢 AI会社シミュレーション v5 起動（カスタムモード）"
  log "📌 テーマ: $THEME"
  log "👥 エージェント: $OVERRIDE_AGENTS"
  log "📁 出力先: $PROJECT_DIR"
  log "============================================"

  IFS=',' read -ra AGENT_LIST <<< "$OVERRIDE_AGENTS"

  # エージェントを順次実行（前のエージェントの出力を次が参照できる）
  for agent_id in "${AGENT_LIST[@]}"; do
    agent_id=$(echo "$agent_id" | tr -d ' ')  # スペース除去
    log ""
    log "━━━ 実行: $agent_id ━━━"
    MODEL=$(get_agent_field "$agent_id" ".model" 2>/dev/null || echo "sonnet")
    PROMPT=$(get_custom_prompt "$agent_id")
    run_agent "$agent_id" "$PROMPT" "$MODEL" "15" "300"
    add_exp "$agent_id" 15 "カスタムモード実行"
  done

  # secretary が OVERRIDE_AGENTS に含まれていない場合も最終報告書を作成
  if ! echo "$OVERRIDE_AGENTS" | grep -q "secretary"; then
    log ""
    log "━━━ 最終報告書作成（secretary） ━━━"
    FINAL_PROMPT=$(get_custom_prompt "secretary")
    run_agent "secretary" "$FINAL_PROMPT" "sonnet" "10" "240"
    add_exp "secretary" 10 "最終報告書作成"
  fi

  PROJECT_END=$(date +%s)
  TOTAL_DURATION=$((PROJECT_END - PROJECT_START))
  tmp=$(mktemp)
  jq ".total_duration_sec = $TOTAL_DURATION | .project_end = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" | .mode = \"custom\"" \
    "$METRICS_FILE" > "$tmp" && mv "$tmp" "$METRICS_FILE"

  log ""
  log "============================================"
  log "🎉 カスタムモード完了"
  log "👥 実行エージェント: $OVERRIDE_AGENTS"
  log "⏱️  所要時間: ${TOTAL_DURATION}秒"
  log "============================================"

  generate_review
  notify_slack "✅ カスタムモード完了\nテーマ: $THEME\nエージェント: $OVERRIDE_AGENTS\n所要時間: ${TOTAL_DURATION}秒"
  exit 0
fi
```

---

## 3. データフロー（修正後）

```
ユーザー入力
  ↓
[テーマ] + [要件ポイント]
  ↓ (CommandCenter.tsx)
theme_with_notes = "${THEME}\n\n【要件ポイント】\n${requirementNotes}"
  ↓ (relay.js)
AI_COMPANY_THEME=theme_with_notes  ← 環境変数で安全に渡す（修正済み）
--agents "ceo,planner,secretary"   ← ルート選択のエージェントリスト
--depth "medium"
--route "team"
  ↓ (ai-company.sh)
OVERRIDE_AGENTS = "ceo,planner,secretary"
THEME_WEIGHT = "medium" → カスタムモードが起動
  ↓
① run_agent "ceo"      → plan.json
② run_agent "planner"  → requirements.md（plan.jsonを参照）
③ run_agent "secretary"→ secretary-report.md（全出力を統合）
```

---

## 4. エラーハンドリング

- `get_agent_field` が失敗してもデフォルト model `sonnet` にフォールバック
- エージェントIDが不正な場合は `*` ケースでフォールバックプロンプト
- secretary が含まれない場合も必ず最終報告書を生成

---

## 5. テスト方針

| テスト | 方法 |
|--------|------|
| 要件ポイントUIが常時展開 | Playwrightで textarea が最初から表示されること確認 |
| 実行プレビューの折り畳み | クリックで展開・閉じることを確認 |
| OVERRIDE_AGENTSが機能する | `AI_COMPANY_THEME=test --agents secretary,planner --depth medium` を実行し secretary と planner のみが動くことをログで確認 |
| 要件ポイントがエージェントに届く | 実行ログの THEME 変数に `【要件ポイント】` が含まれることを確認 |
| 全社（heavy）は従来通り | OVERRIDE_AGENTS が設定されていても heavy は無視してフルフロー |

---

## 6. 変更ファイル一覧

| ファイル | 変更種別 |
|---------|---------|
| `ui/src/components/RouteSelector.tsx` | 修正（要件ポイント展開、プレビュー追加） |
| `ui/src/lib/agentRoles.ts` | 新規作成（エージェント役割マッピング） |
| `ai-company.sh` | 修正（カスタムモード追加） |

変更なし: `CommandCenter.tsx`, `relay.js`（前セッションの修正で完了）
