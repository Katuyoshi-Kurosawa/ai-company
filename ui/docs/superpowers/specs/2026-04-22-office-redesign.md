# オフィス画面リデザイン設計書

## 概要
3Dアイソメトリックマップを廃止し、モダンUI風2Dフロアマップ + 右サイドパネルに置き換える。
画面いっぱいに表示し、ズーム不要、アバターは正面向き大サイズで配置。

## コンポーネント構成

```
App.tsx (view === 'office' 時)
  └─ OfficeView (新規 - レイアウト管理)
       ├─ PhaseBar (既存流用 - 実行中のみ上部に表示)
       ├─ FloorMap (新規 - 2Dフロアマップ、flex-1で残り幅を占有)
       │    └─ RoomSection × 6 (新規 - 部屋カード)
       │         └─ AgentSlot × N (新規 - アバター + ステータス表示)
       │              └─ PixelCharacter (既存流用 - 正面向き lg)
       ├─ QuestLog (既存流用 - 実行中のみフロアマップ上にオーバーレイ)
       └─ AgentSidePanel (新規 - 右固定パネル 360px)
```

## レイアウト

### 全体
- `display: flex` で `FloorMap(flex-1)` + `AgentSidePanel(w-[360px])`
- PhaseBar は実行中のみ上部に絶対配置
- QuestLog は実行中のみ FloorMap 右下にオーバーレイ

### FloorMap
- CSSグリッドで部屋を配置
- 6部屋: 社長室(1人) / 役員室(2人) / 会議室A(最大6人) / 会議室B(最大6人) / オフィス(10人) / 休憩室(0-13人)
- 各部屋は角丸カード、部屋名ラベル + 在室人数バッジ
- モダンUI: ダークテーマベース、部屋境界は subtle border、背景グラデーション
- 画面いっぱい（height: calc(100vh - ヘッダー - ナビ)）

### 部屋グリッド配置
```
row1: [社長室 col-span-1] [役員室 col-span-2]
row2: [会議室A col-span-1] [会議室B col-span-1] (空きがあれば余白)
row3: [オフィス col-span-3] (最大エリア)
row4: [休憩室 col-span-2]
```
- `grid-template-columns: repeat(3, 1fr)` ベース
- 部屋の高さはコンテンツに応じて auto（アバター数で変動）

### AgentSlot（各アバター）
- PixelCharacter コンポーネント `size="lg"` 正面向き
- 下に表示する情報（名前は非表示）:
  - 役職（テキスト、12px、muted color）
  - レベル（`Lv.4`、バッジ風）
  - ステータスバッジ（🟢作業中 / 🟡待機 / 🔵会議中 / ⚪オフライン）
  - 経験値ゲージ（プログレスバー、XP/次レベル）
- ホバー: scale(1.05) + 背景ハイライト
- クリック: AgentSidePanel の表示内容を切り替え + 選択リング表示
- サイズ: 約 100×140px 程度（4-5人/行が収まる範囲）

### AgentSidePanel（右パネル）
- 幅 360px、高さ 100%、右端固定
- 初期表示: CEO（黒澤蓮司）の情報
- AgentDetailModal の5タブをインライン表示:
  - ステータス / ビジュアル / 基本設定 / バッジ / 相性
- ヘッダー: アバター(md) + 名前 + 役職 + Lv + EXPバー
- タブ切替でコンテンツ変更
- エージェントクリックで slide-in アニメーション（内容のみ遷移）
- スクロール可能（overflow-y: auto）

## 既存コンポーネントの扱い

### 流用（修正なし or 軽微修正）
- `PixelCharacter.tsx` - そのまま使用（size="lg"）
- `ExecutionPanel.tsx` - そのまま使用
- `MissionTimeline.tsx` - PhaseBar として流用

### 新規作成
- `OfficeView.tsx` - メインレイアウト管理
- `FloorMap.tsx` - 2Dフロアマップ
- `RoomSection.tsx` - 部屋カード
- `AgentSlot.tsx` - アバター+ステータス表示ユニット
- `AgentSidePanel.tsx` - 右サイドパネル（AgentDetailModal のタブ内容を移植）

### 削除
- `Character3DOverlay.tsx` の import と使用箇所
- OfficeFloor.tsx 内の以下機能:
  - アイソメトリックSVGマップ（buildRooms, walls, furniture 等）
  - ズーム制御（wheelイベント、+/-ボタン、viewBox計算）
  - ミニマップ（RoomMinimap）
  - バブルパネル（AgentBubblePanel, createPortal）
  - SE/BGMボタン
  - BottomDock（下部エージェントバー）
  - NamePlate（部屋ラベル/サイン）
  - 自動チャット/スピーチシステム

### App.tsx の変更
- `view === 'office'` 時に `<OfficeView>` をレンダリング
- `<AgentDetailModal>` は他画面（組織図、指示室等）のフッタークリック用に残す
- オフィス画面では AgentSidePanel が代替するため、モーダルは非表示

## ステータスバッジのロジック
- `作業中`: relay.running && agentId が現在のログに含まれる
- `会議中`: agent.room が 'meeting-a' or 'meeting-b' && relay.running
- `待機`: relay.running && 上記以外
- `オフライン`: !relay.running（全員表示、バッジは灰色）

## スタイル
- ダークテーマ（既存 THEMES からの値を使用）
- 部屋カード: `bg-white/5 border border-white/10 rounded-xl`
- 選択状態: `ring-2 ring-indigo-400`
- ステータスバッジ色: green(作業中) / amber(待機) / blue(会議中) / gray(オフライン)
- 経験値ゲージ: indigo グラデーション、高さ 4px

## 非機能要件
- Three.js / Pixi.js の依存を削除（バンドルサイズ大幅削減）
- SVGアニメーションは PixelCharacter 内に限定（パフォーマンス維持）
- レスポンシブ: 最低 1280px 幅を想定（それ以下は非対応でOK）
