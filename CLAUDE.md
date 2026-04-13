# AI会社シミュレーションシステム

## 概要
複数のAIエージェント（16名）に会社の役職・役割を与え、コーポレートUIで可視化しながら協調して成果物を生み出すシステム。

## 技術スタック
- フロントエンド: React + Vite + TypeScript + Tailwind CSS
- バックエンド: Cloudflare Workers + Hono
- データベース: Cloudflare D1（SQLite）
- ホスティング: Cloudflare Pages
- 通知: Slack Incoming Webhook

## ディレクトリ構成
```
.claude/agents/    - エージェント定義（16名＋ファシリテーター）
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
| secretary | 一条 絢音 | CEO秘書 | opus |
| chief-secretary | 如月 凛 | 秘書部長 | opus |
| marketing | 星野 きらら | マーケティング部長 | opus |
| hr | 雪村 千紗都 | 人事部長 | sonnet |
| pr | 望月 沙織 | 広報部長 | sonnet |
| cs | 天野 美咲 | CS部長 | sonnet |
| rd | 龍崎 翔 | 研究開発部長 | opus |
| ux-research | 柏木 理沙 | UXリサーチ部長 | sonnet |
| planner | 氷室 壮馬 | 企画部長 | sonnet |
| architect | 九条 匠真 | 設計部長 | opus |
| developer | 桐生 快晴 | 開発部長 | opus |
| qa-reviewer | 鷹見 律 | QA部長 | sonnet |
| ui-designer | 朝比奈 彩羽 | デザイン部長 | sonnet |
| doc-writer | 水無瀬 奏汰 | 資料作成部長 | haiku |
