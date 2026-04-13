上長への相談・エスカレーションを実行します。

エージェントが作業中に判断に迷った場合や、承認が必要な場合に使用します。

引数: <from> <to> <type> "subject" "context"

type:
- judgment: 判断相談（選択肢が複数あり決められない）
- approval: 承認依頼（成果物完成、上長確認が必要）
- alert: アラート（リスク・問題を発見）

実行コマンド:
```bash
./ai-escalation.sh $ARGUMENTS
```
