# TTS（音声読み上げ）設計書

## Goal
全ての報告書（MTG議事録・エスカレーション・成果物ファイル・実行ログ）を Web Speech API で読み上げる。
MTG議事録では発言者エージェントごとに声が変わる。設定画面で各エージェントの声パラメータを調整できる。

## Architecture

```
ui/src/
  hooks/useTTS.ts          ← SpeechSynthesis ラッパー + キュー管理（集中型）
  config/agentVoices.ts    ← 13エージェント × 声パラメータ定義
  components/
    TTSButton.tsx           ← 再生/停止の共通UIボタン（アイコン付き）
    TTSBar.tsx              ← 再生中に画面下部に出現するステータスバー
```

## エージェント声プロファイル（agentVoices.ts）

| エージェントID | 名前 | 性別 | pitch | rate | 個性 |
|---|---|---|---|---|---|
| ceo | 黒澤 蓮司 | male | 0.85 | 0.90 | 落ち着いた重厚 |
| secretary | 一条 絢音 | female | 1.10 | 1.00 | 明るく丁寧 |
| chief-secretary | 如月 凛 | female | 1.05 | 0.95 | クールで的確 |
| marketing | 星野 きらら | female | 1.20 | 1.10 | 元気・ハキハキ |
| hr | 雪村 千紗都 | female | 1.00 | 0.90 | 温かく穏やか |
| cs | 天野 美咲 | female | 1.15 | 1.05 | 親切・サービス志向 |
| rd | 龍崎 翔 | male | 1.10 | 1.15 | 早口・熱量高い |
| planner | 氷室 壮馬 | male | 0.95 | 0.95 | 冷静・論理的 |
| architect | 九条 匠真 | male | 0.90 | 0.85 | 重厚・慎重 |
| developer | 桐生 快晴 | male | 1.00 | 1.05 | 中立・実務的 |
| qa-reviewer | 鷹見 律 | male | 0.95 | 0.90 | 厳格・粘り強い |
| ui-designer | 朝比奈 彩羽 | female | 1.15 | 1.05 | クリエイティブ・明るい |
| doc-writer | 水無瀬 奏汰 | male | 0.90 | 0.88 | 丁寧・正確 |
| narrator | ナレーター | female | 1.00 | 0.95 | 中立・聞き取りやすい |

## クロスプラットフォーム音声マッピング

```
女性音声の探索順:
  macOS:   "Kyoko", "O-ren", "Hattori"
  Windows: "Microsoft Haruka Desktop", "Microsoft Haruka"
  fallback: lang="ja-JP" の最初の female voice

男性音声の探索順:
  macOS:   "Otoya", "Hattori"
  Windows: "Microsoft Ichiro Desktop", "Microsoft Ichiro"
  fallback: lang="ja-JP" の最初の male voice
```

## useTTS フック API

```typescript
interface TTSUtterance {
  text: string;
  agentId?: string; // 未指定 = narrator
}

interface TTSState {
  available: boolean;    // SpeechSynthesis が使えるか
  playing: boolean;
  paused: boolean;
  currentAgentId: string | null;
  queueLength: number;
}

// 返り値
{
  state: TTSState;
  speak(utterances: TTSUtterance[]): void;   // キューをリセットして再生
  append(utterances: TTSUtterance[]): void;  // キューに追加（ログストリーム用）
  pause(): void;
  resume(): void;
  stop(): void;
  skip(): void;   // 現在の発話をスキップして次へ
}
```

## テキスト前処理

**Markdown → プレーンテキスト:**
- `#`, `**`, `*`, `_`, `` ` ``, `>`, `---`, `|` などを除去
- URLは「リンク」に置換
- コードブロックは「コードブロック」と読み上げてスキップ

**MTG議事録パース:**
- パターン: `[emoji] [名前][役職]  [時刻]` の行の次の段落がその人の発言
- 発言者 emoji/名前 → agentId にマッピング
- `### Round N:` はセクション区切りとして agentId=narrator で「ラウンドN」と読み上げ

**実行ログ:**
- ANSI エスケープコード除去（`\x1b[...m` パターン）
- 空行はスキップ
- 各行を narrator voice で即座に append

**エスカレーション:**
- 件名・緊急度・担当者を narrator で読み上げ

## コンポーネント統合

| 画面 | ボタン配置 | 動作 |
|---|---|---|
| MtgScreen（議事録詳細） | 議事録ヘッダー右上 | 全発言を順番にエージェント声で再生 |
| EscalationScreen | 相談カード右上 | 件名・内容を narrator で再生 |
| MarkdownViewer | 右上フローティング | 全文を narrator で再生 |
| ExecutionPanel | ログヘッダーのトグルボタン | 新着ログ行をリアルタイム append |

## TTSBar（再生中ステータスバー）

画面最下部に固定表示（再生中のみ）:
```
[エージェントアバター] [名前] 「テキスト冒頭...」  [残りN件] [⏮スキップ] [⏸一時停止] [⏹停止]
```

## 設定画面（CompanyManager の TTS セクション）

- グローバル：音量スライダー、有効/無効トグル
- 音声プレビュー：「テスト再生」ボタン
- エージェント一覧：各エージェントの pitch / rate スライダー（デフォルト値に戻すボタン付き）
- システム音声選択：利用可能な日本語音声を女性/男性に分けてドロップダウン表示

## エラーハンドリング

- `speechSynthesis` 未対応ブラウザ: TTSButton を非表示（`available: false`）
- 音声が見つからない場合: デフォルト音声で続行（エラーにしない）
- 読み上げ中にページ離脱: `stop()` を呼んで自動停止（`useEffect` cleanup）
