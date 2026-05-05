# 指示室リデザイン＆ルート実行修正 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 要件ポイントを常時展開表示、各ルートカードに実行プレビュー（折り畳み）を追加し、ai-company.sh で OVERRIDE_AGENTS を実際に使うカスタムモードを実装することで、ルート説明と実際の動作を一致させる。

**Architecture:** フロントエンドは `RouteSelector.tsx` を修正してUI改善、新規 `agentRoles.ts` でエージェント役割を管理。バックエンドは `ai-company.sh` に `get_custom_prompt` 関数とカスタムモードブロックを追加。lightweight/heavy 以外で `OVERRIDE_AGENTS` が設定されていれば指定エージェントのみ順次実行する。`relay.js` と `CommandCenter.tsx` は前セッションの修正（環境変数渡し）で完了済みのため変更不要。

**Tech Stack:** React + TypeScript + Tailwind CSS（フロントエンド）、bash（ai-company.sh）

---

### Task 1: agentRoles.ts 新規作成

**Files:**
- Create: `ui/src/lib/agentRoles.ts`

- [ ] **Step 1: ファイルを作成**

```bash
# 確認: ファイルがまだ存在しないこと
ls ui/src/lib/agentRoles.ts 2>/dev/null || echo "OK: not exists"
```

Expected: `OK: not exists`

- [ ] **Step 2: agentRoles.ts を書く**

`ui/src/lib/agentRoles.ts` を新規作成:

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

- [ ] **Step 3: TypeScript 型チェック**

```bash
cd ui && npx tsc --noEmit 2>&1 | head -20
```

Expected: エラーなし（出力なし）

- [ ] **Step 4: コミット**

```bash
git add ui/src/lib/agentRoles.ts
git commit -m "feat: add agentRoles mapping for execution preview"
```

---

### Task 2: RouteSelector.tsx 修正

**Files:**
- Modify: `ui/src/components/RouteSelector.tsx`

変更点は3箇所:
1. import 追加 + state 変更（showNotes削除、previewOpen追加、noteCount追加）
2. 要件ポイントセクションを常時展開に変更
3. 各ルートカードに実行プレビュー追加

- [ ] **Step 1: import と state を更新**

`ui/src/components/RouteSelector.tsx` の先頭部分を編集。

変更前:
```tsx
import { useState } from 'react';
import type { Agent } from '../types';
import type { RouteOption, RoutePreset } from '../lib/routeRecommender';
import { formatTime, loadPresets, savePreset, deletePreset } from '../lib/routeRecommender';
import { PixelCharacter } from './PixelCharacter';
```

変更後:
```tsx
import { useState } from 'react';
import type { Agent } from '../types';
import type { RouteOption, RoutePreset } from '../lib/routeRecommender';
import { formatTime, loadPresets, savePreset, deletePreset } from '../lib/routeRecommender';
import { PixelCharacter } from './PixelCharacter';
import { AGENT_ROLES } from '../lib/agentRoles';
```

- [ ] **Step 2: state 宣言を更新**

変更前（RouteSelector 関数内 state 宣言部分）:
```tsx
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<Record<string, { agents: string[]; depth: number }>>({});
  const [requirementNotes, setRequirementNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
```

変更後:
```tsx
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<Record<string, { agents: string[]; depth: number }>>({});
  const [requirementNotes, setRequirementNotes] = useState('');
  const [previewOpen, setPreviewOpen] = useState<Record<string, boolean>>({});

  const noteCount = requirementNotes.split('\n').filter(l => l.trim()).length;
```

- [ ] **Step 3: 要件ポイントセクションを常時展開に変更**

変更前（`{/* 要件ポイント入力（任意） */}` ブロック全体）:
```tsx
      {/* 要件ポイント入力（任意） */}
      <div className="rounded-xl p-3" style={{ background: `${theme.surface}`, border: `1px solid ${theme.border}` }}>
        <button onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-2 w-full text-left cursor-pointer">
          <span className="text-sm">📝</span>
          <span className="text-xs font-bold flex-1">要件ポイント（任意）</span>
          <span className="text-[10px]" style={{ color: theme.muted }}>
            {requirementNotes ? `${requirementNotes.split('\n').filter(l => l.trim()).length}件入力済み` : 'より良い成果のためにヒントを追加'}
          </span>
          <span className={`text-xs transition-transform ${showNotes ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {showNotes && (
          <div className="mt-2 space-y-2">
            <textarea
              value={requirementNotes}
              onChange={e => setRequirementNotes(e.target.value)}
              placeholder={"重視するポイントや条件を箇条書きで入力\n例:\n・犬2匹連れ（ペット同伴可の場所限定）\n・予算は1人5000円以内\n・午前中に回りたい"}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs h-24 resize-none focus:ring-1 focus:ring-indigo-500/50 focus:outline-none placeholder:text-white/20"
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] flex-1" style={{ color: theme.muted }}>
                入力するとエージェントへの指示に追加されます
              </span>
              {requirementNotes && (
                <button onClick={() => setRequirementNotes('')}
                  className="text-[10px] px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded cursor-pointer transition-colors"
                  style={{ color: theme.muted }}>
                  クリア
                </button>
              )}
            </div>
          </div>
        )}
      </div>
```

変更後:
```tsx
      {/* 要件ポイント入力（常時展開） */}
      <div className="rounded-xl p-3" style={{ background: `${theme.surface}`, border: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">📋</span>
          <span className="text-xs font-bold flex-1">要件ポイント（任意）</span>
          {noteCount > 0 && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
              {noteCount}件
            </span>
          )}
          <span className="text-[10px]" style={{ color: theme.muted }}>
            エージェントへの条件・制約を追加
          </span>
        </div>
        <textarea
          value={requirementNotes}
          onChange={e => setRequirementNotes(e.target.value)}
          placeholder={"重視するポイントや条件を箇条書きで入力\n例:\n・予算は10万円以内\n・モバイル対応必須\n・既存DBは変更しない"}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs h-24 resize-none focus:ring-1 focus:ring-indigo-500/50 focus:outline-none placeholder:text-white/20"
        />
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] flex-1" style={{ color: theme.muted }}>
            入力するとエージェントへの指示に追加されます
          </span>
          {requirementNotes && (
            <button onClick={() => setRequirementNotes('')}
              className="text-[10px] px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded cursor-pointer transition-colors"
              style={{ color: theme.muted }}>
              クリア
            </button>
          )}
        </div>
      </div>
```

- [ ] **Step 4: 実行プレビューをルートカードに追加**

ルートカード内の「Expert info」ブロックの直後（`</div>` で Description+agents div が閉じる直前）に追加する。

変更前（Expert info ブロック末尾〜Description div の閉じタグ）:
```tsx
                {/* Expert info */}
                {route.type === 'expert' && route.expertInfo && (
                  <div className="mt-2 space-y-0.5">
                    {route.expertInfo.experts.map(e => {
                      const a = getAgent(e.agentId);
                      return (
                        <div key={e.agentId} className="text-[11px] flex items-center gap-1" style={{ color: theme.muted }}>
                          <span>🏆</span>
                          <span>{a?.name}: {e.topSkills.join(', ')}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
```

変更後:
```tsx
                {/* Expert info */}
                {route.type === 'expert' && route.expertInfo && (
                  <div className="mt-2 space-y-0.5">
                    {route.expertInfo.experts.map(e => {
                      const a = getAgent(e.agentId);
                      return (
                        <div key={e.agentId} className="text-[11px] flex items-center gap-1" style={{ color: theme.muted }}>
                          <span>🏆</span>
                          <span>{a?.name}: {e.topSkills.join(', ')}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 実行プレビュー（折り畳み） */}
                <div className="mt-2">
                  <button
                    onClick={() => setPreviewOpen(p => ({ ...p, [route.type]: !p[route.type] }))}
                    className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 rounded cursor-pointer transition-colors flex items-center gap-1"
                    style={{ color: theme.muted }}>
                    <span>{previewOpen[route.type] ? '▲' : '▶'}</span>
                    <span>{previewOpen[route.type] ? '実行内容を閉じる' : '実行内容を確認'}</span>
                  </button>
                  {previewOpen[route.type] && (
                    <div className="mt-2 p-3 bg-black/20 rounded-lg text-xs space-y-1.5">
                      {adjusted.agents.map((id, i) => {
                        const a = getAgent(id);
                        return (
                          <div key={id} className="flex items-start gap-2">
                            <span className="opacity-40 min-w-[20px]">({i + 1})</span>
                            <span className="font-bold shrink-0">{a?.name}</span>
                            <span className="opacity-50 shrink-0">({a?.title})</span>
                            <span className="opacity-40 ml-1">→ {AGENT_ROLES[id] ?? '担当業務'}</span>
                          </div>
                        );
                      })}
                      {noteCount > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-green-400/70">
                          ✓ 要件ポイント（{noteCount}件）は全エージェントに共有されます
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
```

- [ ] **Step 5: TypeScript ビルド確認**

```bash
cd ui && npx tsc --noEmit 2>&1 | head -30
```

Expected: エラーなし

- [ ] **Step 6: 開発サーバーで目視確認（省略可）**

```bash
cd ui && npm run dev &
# ブラウザで http://localhost:5174 → 指示室 → テーマ入力
# 確認項目:
# - 要件ポイントが最初から展開表示されている
# - 「▶ 実行内容を確認」ボタンが各カードに表示される
# - クリックでエージェントリストが展開・折り畳みできる
# - 要件ポイント入力後に件数バッジが表示される
```

- [ ] **Step 7: コミット**

```bash
git add ui/src/components/RouteSelector.tsx
git commit -m "feat: always-visible requirement notes + collapsible execution preview in RouteSelector"
```

---

### Task 3: ai-company.sh カスタムエージェントモード追加

**Files:**
- Modify: `ai-company.sh`

2箇所を追加:
1. `get_custom_prompt` 関数（`run_async_review` 関数の直後）
2. カスタムモード実行ブロック（lightweight モードの `fi` の直後）

- [ ] **Step 1: get_custom_prompt 関数を追加**

`ai-company.sh` の `run_async_review` 関数末尾の `}` の後（`# ══ テーマ3段階判定` コメントの直前）に挿入。

変更前:
```bash
}

# ══════════════════════════════════════════════════════════════
# テーマ3段階判定: lightweight / medium / heavy
```

変更後:
```bash
}

# ── カスタムプロンプト生成 ─────────────────────────────────────
# 引数: エージェントID
# 返値: そのエージェント向けのプロンプト文字列（THEME・PROJECT_DIRを参照）
get_custom_prompt() {
  local agent_id="$1"
  # これまでの成果物を最大5ファイル・各20行を要約として含める
  local prev=""
  for f in "$PROJECT_DIR"/*.md "$PROJECT_DIR"/*.json; do
    [ -f "$f" ] || continue
    prev="${prev}=== $(basename "$f") ===\n$(head -20 "$f")\n\n"
  done
  [ -z "$prev" ] && prev="（まだ成果物なし）"

  local base
  base="テーマ: $THEME

これまでの成果物（参考）:
${prev}"

  case "$agent_id" in
    ceo)
      printf '%s\n\nCEOとしてプロジェクト計画を %s/plan.json にJSON形式で出力してください。goals/scope/phases/risks/success_criteria を含めること。' "$base" "$PROJECT_DIR" ;;
    secretary|chief-secretary)
      printf '%s\n\n秘書として上記の成果物を統合した最終報告書を %s/secretary-report.md に出力してください。## サマリー セクションから始め、各エージェントの成果を簡潔にまとめること。' "$base" "$PROJECT_DIR" ;;
    marketing)
      printf '%s\n\nマーケティング部長として市場調査・分析を %s/marketing-report.md に出力してください。## サマリー セクションから始めること。' "$base" "$PROJECT_DIR" ;;
    hr)
      printf '%s\n\n人事部長として人事・組織観点での提言を %s/hr-report.md に出力してください。' "$base" "$PROJECT_DIR" ;;
    cs)
      printf '%s\n\nCS部長として顧客満足度・サービス観点の分析を %s/cs-report.md に出力してください。' "$base" "$PROJECT_DIR" ;;
    rd)
      printf '%s\n\n研究開発部長として革新的なアイデアと技術的切り口を %s/rd-report.md に出力してください。' "$base" "$PROJECT_DIR" ;;
    planner)
      printf '%s\n\n企画部長として要件定義書・仕様書を %s/requirements.md に出力してください。' "$base" "$PROJECT_DIR" ;;
    architect)
      printf '%s\n\n設計部長としてアーキテクチャ設計書を %s/architecture.md に出力してください。' "$base" "$PROJECT_DIR" ;;
    developer)
      printf '%s\n\n開発部長として開発計画・実装方針を %s/dev-plan.md に出力してください。' "$base" "$PROJECT_DIR" ;;
    qa-reviewer)
      printf '%s\n\nQA部長としてテスト計画・品質基準を %s/qa-plan.md に出力してください。' "$base" "$PROJECT_DIR" ;;
    ui-designer)
      printf '%s\n\nデザイン部長としてUI/UXデザイン方針・画面設計を %s/design.md に出力してください。' "$base" "$PROJECT_DIR" ;;
    doc-writer)
      printf '%s\n\n資料作成部長として最終資料を %s/document.md に出力してください。' "$base" "$PROJECT_DIR" ;;
    *)
      printf '%s\n\n担当者として役割に応じた成果物を %s/%s-report.md に出力してください。' "$base" "$PROJECT_DIR" "$agent_id" ;;
  esac
}

# ══════════════════════════════════════════════════════════════
# テーマ3段階判定: lightweight / medium / heavy
```

- [ ] **Step 2: カスタムモード実行ブロックを追加**

lightweight モードの終わりの `fi` と medium モードのコメントの間に挿入。

変更前:
```bash
  notify_slack "💬 軽量応答完了\nテーマ: $THEME\n所要時間: ${TOTAL_DURATION}秒"
  exit 0
fi

# ══════════════════════════════════════════════════════════════
# medium モード: コア4名（CEO + 企画 + 資料作成 + 秘書）で高速処理
```

変更後:
```bash
  notify_slack "💬 軽量応答完了\nテーマ: $THEME\n所要時間: ${TOTAL_DURATION}秒"
  exit 0
fi

# ══════════════════════════════════════════════════════════════
# カスタムエージェントモード: OVERRIDE_AGENTSで指定したエージェントのみ実行
#   発動条件: OVERRIDE_AGENTS が設定されており、かつ depth が heavy でない
#   （lightweight は上の fi で exit 済み、heavy はこの後の heavy ブロックに委ねる）
# ══════════════════════════════════════════════════════════════

if [ -n "$OVERRIDE_AGENTS" ] && [ "$THEME_WEIGHT" != "heavy" ]; then
  log "============================================"
  log "🏢 AI会社シミュレーション v5 起動（カスタムモード）"
  log "📌 テーマ: $THEME"
  log "👥 エージェント: $OVERRIDE_AGENTS"
  log "📁 出力先: $PROJECT_DIR"
  log "============================================"

  IFS=',' read -ra AGENT_LIST <<< "$OVERRIDE_AGENTS"
  CUSTOM_HAS_SECRETARY=false

  for agent_id in "${AGENT_LIST[@]}"; do
    agent_id="${agent_id// /}"  # スペース・空白除去
    [ -z "$agent_id" ] && continue
    log ""
    log "━━━ カスタム実行: $agent_id ━━━"
    AGENT_MODEL=$(get_agent_field "$agent_id" ".model" 2>/dev/null || echo "sonnet")
    AGENT_PROMPT=$(get_custom_prompt "$agent_id")
    run_agent "$agent_id" "$AGENT_PROMPT" "$AGENT_MODEL" "15" "300"
    add_exp "$agent_id" 15 "カスタムモード実行"
    if [[ "$agent_id" == "secretary" || "$agent_id" == "chief-secretary" ]]; then
      CUSTOM_HAS_SECRETARY=true
    fi
  done

  # secretary がリストに含まれていない場合も最終報告書を作成
  if [ "$CUSTOM_HAS_SECRETARY" = false ]; then
    log ""
    log "━━━ 最終報告書作成（secretary） ━━━"
    FINAL_PROMPT=$(get_custom_prompt "secretary")
    run_agent "secretary" "$FINAL_PROMPT" "sonnet" "10" "240"
    add_exp "secretary" 10 "最終報告書作成"
  fi

  PROJECT_END=$(date +%s)
  TOTAL_DURATION=$((PROJECT_END - PROJECT_START))
  tmp=$(mktemp)
  jq ".total_duration_sec = $TOTAL_DURATION | .project_end = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" | .mode = \"custom\" | .custom_agents = \"$OVERRIDE_AGENTS\"" \
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

# ══════════════════════════════════════════════════════════════
# medium モード: コア4名（CEO + 企画 + 資料作成 + 秘書）で高速処理
```

- [ ] **Step 3: シェルスクリプト構文チェック**

```bash
bash -n ai-company.sh && echo "Syntax OK"
```

Expected: `Syntax OK`

- [ ] **Step 4: カスタムモードの動作確認（ドライラン）**

```bash
# secretaryとplannerのみで実行（実際には claude コマンドが走る）
# まずは引数パースだけ確認（set -x でトレース）
bash -c '
  export AI_COMPANY_THEME="テスト指示"
  source ./ai-company.sh --agents "secretary,planner" --depth "medium" --route "team" 2>&1 | head -20
' 2>&1 | grep -E "カスタム|OVERRIDE|エージェント" | head -10
```

Expected: `カスタム` を含むログ行が表示される（ `OVERRIDE_AGENTS=secretary,planner` が設定されていること）

注意: このステップは claude コマンドが実際に実行されるため、実際の確認は次のステップ（UIから実行）で行う。

- [ ] **Step 5: コミット**

```bash
git add ai-company.sh
git commit -m "feat: implement custom agent mode in ai-company.sh using OVERRIDE_AGENTS"
```

---

### Task 4: ビルド・検証・デプロイ

**Files:**
- Build: `ui/dist/`

- [ ] **Step 1: フロントエンドをビルド**

```bash
cd ui && npm run build 2>&1 | tail -15
```

Expected:
```
✓ built in Xms
```
エラーなし。

- [ ] **Step 2: Playwright で UI 動作確認**

relay.js が起動していること（`node relay.js` が別ターミナルで動いていること）を確認してから:

```bash
# スクリーンショット確認
# ブラウザで http://localhost:5174 → 指示室 → テーマ入力
```

確認項目:
1. 要件ポイントが折り畳まれずに最初から表示されている
2. 各ルートカードに「▶ 実行内容を確認」ボタンがある
3. ボタンをクリックするとエージェントリスト（名前・役割）が展開される
4. 再クリックで折り畳まれる
5. 要件ポイントに文字を入力すると件数バッジが表示される
6. 「即答」を実行するとログに `━━━ カスタム実行: secretary ━━━` が1件だけ表示される（複数エージェントが動かない）

- [ ] **Step 3: git add + push**

```bash
git add ui/src/lib/agentRoles.ts ui/src/components/RouteSelector.tsx ai-company.sh
git push
```

Expected: Cloudflare Pages が自動デプロイを開始する。

---

## スペック対照（自己レビュー）

| スペック要件 | 対応タスク |
|-------------|-----------|
| 要件ポイントを常時展開 | Task 2 Step 3 |
| 要件ポイントに件数バッジ | Task 2 Step 3（noteCount） |
| 実行プレビュー（折り畳み） | Task 2 Step 4 |
| エージェント役割マッピング | Task 1 |
| OVERRIDE_AGENTS を実際に使う | Task 3 Step 2 |
| secretary 未含の場合も最終報告書 | Task 3 Step 2（CUSTOM_HAS_SECRETARY） |
| heavy は従来フローを維持 | Task 3 Step 2（`[ "$THEME_WEIGHT" != "heavy" ]`） |
| 要件ポイントがエージェントに届く | relay.js 修正済み（前セッション）で AI_COMPANY_THEME に含まれる |
