AI会社シミュレーションの全工程を実行します。

テーマを受け取り、以下の順序で全エージェントが協調して成果物を生成します:

1. CEO → プロジェクト計画（plan.json）
2. キックオフMTG
3. 企画部長 → 要件定義（requirements.md）
4. 要件レビューMTG
5. 設計部長 → 技術設計（design.md, schema.sql）
6. 設計レビューMTG
7. デザイン部長 & 開発部長 → UIモックアップ + 実装（並列）
8. コードレビューMTG
9. QA部長 → 品質レポート（qa-report.md）
10. 資料作成部長 → 報告書（report.md）
11. 最終レビューMTG

実行コマンド:
```bash
./ai-company.sh "$ARGUMENTS"
```
