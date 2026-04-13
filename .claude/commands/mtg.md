MTG（会議）を開催します。

エージェントがSlackスレッド風のチャット形式で議論を行い、議事録とアクションアイテムを自動生成します。

引数: <種別> "議題" [ラウンド数] [対立解決]

種別:
- kickoff: キックオフMTG（全員参加）
- req-review: 要件レビュー
- design-review: 設計レビュー
- ui-review: UI/UXレビュー
- code-review: コードレビュー
- final-review: 最終レビュー
- brainstorm: ブレインストーミング
- custom: カスタム

対立解決: majority（多数決）/ consensus（全員合意）/ chair（議長判断）/ both（両論併記）

実行コマンド:
```bash
./ai-mtg.sh $ARGUMENTS
```
