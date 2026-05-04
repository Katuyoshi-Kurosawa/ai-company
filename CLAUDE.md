# AI会社シミュレーションシステム

## 概要
複数のAIエージェント（13名）に会社の役職・役割を与え、コーポレートUIで可視化しながら協調して成果物を生み出すシステム。

## 技術スタック
- フロントエンド: React + Vite + TypeScript + Tailwind CSS
- バックエンド: Cloudflare Workers + Hono
- データベース: Cloudflare D1（SQLite）
- ホスティング: Cloudflare Pages
- 通知: Slack Incoming Webhook

## ディレクトリ構成
```
.claude/agents/    - エージェント定義（13名＋ファシリテーター）
.claude/commands/  - カスタムコマンド
output/            - 成果物出力先
output/mtg/        - MTG議事録
output/escalation/ - 相談ログ
logs/              - 実行ログ
ui/                - 管理画面（React + Vite）
```

## 実行方法
- シェルスクリプト: `./ai-company.sh "テーマ"`
- MTG単独: `./ai-mtg.sh <種別> "議題" <ラウンド数> <対立解決>`
- 相談処理: `./ai-escalation.sh`

## エージェント一覧
| ID | 名前 | 役職 | モデル |
|----|------|------|--------|
| ceo | 黒澤 蓮司 | CEO | opus |
| secretary | 一条 絢音 | CEO秘書 | sonnet |
| chief-secretary | 如月 凛 | 秘書部長 | sonnet |
| marketing | 星野 きらら | マーケティング部長 | sonnet |
| hr | 雪村 千紗都 | 人事部長 | sonnet |
| cs | 天野 美咲 | CS部長 | sonnet |
| rd | 龍崎 翔 | 研究開発部長 | opus |
| planner | 氷室 壮馬 | 企画部長 | sonnet |
| architect | 九条 匠真 | 設計部長 | opus |
| developer | 桐生 快晴 | 開発部長 | opus |
| qa-reviewer | 鷹見 律 | QA部長 | opus |
| ui-designer | 朝比奈 彩羽 | デザイン部長 | sonnet |
| doc-writer | 水無瀬 奏汰 | 資料作成部長 | sonnet |

## フル設計実装パイプライン

「フル設計実装して」「議論から実装まで」「不具合ゼロで作って」等のキーワードで以下を順に実行する。
`~/.claude/AGENTS.md` に詳細戦略あり。

### フロー
1. **設計議論** — `superpowers:brainstorming` で6エージェント（PM、UX、シニアFE、QAなど）×8ラウンド議論。仕様の矛盾・曖昧さを事前検出
2. **スペック確定** — 議論結果を `docs/superpowers/specs/` に保存、ユーザー承認を得る
3. **実装プラン作成** — `superpowers:writing-plans` でコンポーネント分解順（型定義→ロジック→UI→統合→検証）のタスク分解
4. **サブエージェント駆動開発** — `superpowers:subagent-driven-development` で各タスクを新鮮なサブエージェントに委任
5. **ビルド＋デプロイ＋push** — `cd ui && npm run build` 後、Cloudflare Pages へデプロイし `git push`

### このプロジェクトのレイヤー順序
```
型定義(ui/src/types) → ロジック/フック(ui/src/hooks, lib)
  → UIコンポーネント(ui/src/components) → ページ統合(ui/src/App.tsx)
    → シェルスクリプト連携(relay.js, ai-company.sh 等)
      → ビルド検証 → デプロイ
```

### デプロイ手順
```bash
cd ui && npm run build       # ビルド確認
git add <変更ファイル>
git commit -m "feat: ..."
git push                     # Cloudflare Pages が自動デプロイ
```
