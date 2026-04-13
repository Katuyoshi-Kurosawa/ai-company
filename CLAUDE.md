# AI会社シミュレーションシステム

## 概要
複数のAIエージェント（7名）に会社の役職・役割を与え、シミュレーションゲーム風UIで可視化しながら協調して成果物を生み出すシステム。

## 技術スタック
- フロントエンド: React + Vite + TypeScript + Tailwind CSS
- バックエンド: Cloudflare Workers + Hono
- データベース: Cloudflare D1（SQLite）
- ホスティング: Cloudflare Pages
- 通知: Slack Incoming Webhook

## ディレクトリ構成
```
.claude/agents/    - エージェント定義（7名＋ファシリテーター）
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
| ID | 役職 | モデル |
|----|------|--------|
| ceo | CEO | opus |
| planner | 企画部長 | sonnet |
| architect | 設計部長 | opus |
| developer | 開発部長 | opus |
| qa-reviewer | QA部長 | sonnet |
| ui-designer | デザイン部長 | sonnet |
| doc-writer | 資料作成部長 | haiku |
