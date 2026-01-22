# Location Tracker - Design Document

## Overview

WebSocket経由で位置情報データを受信し、デバイスごとに時系列で表示するモバイルアプリ。

## Data Schema

```typescript
z.object({
  coords: z.object({
    accuracy: z.number().min(0).nullish(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    speed: z.union([z.number().nonnegative(), z.literal(-1)]).nullish(),
  }),
  device: z.string(),
  id: z.string(),
  state: MovingStateSchema, // moving, stationary, unknown など
  timestamp: z.number().min(0),
  type: z.literal("location_update"),
});
```

## Screen List

### 1. Home Screen (タブ: ホーム)
- **目的**: WebSocket接続管理とリアルタイムデータ表示
- **主要コンテンツ**:
  - 接続ステータスインジケーター（接続中/切断/エラー）
  - WebSocket URL入力フィールド
  - 接続/切断ボタン
  - 最新の位置情報サマリー（デバイス数、最終更新時刻）

### 2. Timeline Screen (タブ: タイムライン)
- **目的**: 受信した位置情報を時系列で表示
- **主要コンテンツ**:
  - デバイスフィルター（全デバイス / 特定デバイス選択）
  - 時系列リスト（FlatList）
    - 各アイテム: タイムスタンプ、デバイス名、座標、速度、状態
  - プルトゥリフレッシュ（データクリア機能）

### 3. Device Detail Screen (モーダル/詳細)
- **目的**: 特定デバイスの詳細情報表示
- **主要コンテンツ**:
  - デバイス名
  - 最新位置情報の詳細
  - そのデバイスの履歴リスト

## Primary Content and Functionality

### Home Screen
| 要素 | 機能 |
|------|------|
| ステータスバッジ | 接続状態を色で表示（緑=接続、赤=切断、黄=接続中） |
| URL入力 | WebSocketサーバーのURLを入力 |
| 接続ボタン | WebSocket接続の開始/停止 |
| 統計カード | 接続デバイス数、受信メッセージ数、最終更新時刻 |

### Timeline Screen
| 要素 | 機能 |
|------|------|
| デバイスセレクター | ドロップダウンでデバイスフィルタリング |
| タイムラインリスト | 位置情報を時系列で表示（新しい順） |
| 状態バッジ | moving/stationary/unknown を色分け表示 |
| 座標表示 | 緯度・経度を見やすくフォーマット |

## Key User Flows

### 1. WebSocket接続フロー
1. ユーザーがHome画面を開く
2. WebSocket URLを入力（または保存済みURLを使用）
3. 「接続」ボタンをタップ
4. 接続中インジケーター表示
5. 接続成功 → ステータスが緑に変わる
6. データ受信開始 → Timelineにリアルタイム表示

### 2. タイムライン閲覧フロー
1. Timelineタブをタップ
2. 全デバイスの位置情報が時系列で表示
3. デバイスセレクターで特定デバイスをフィルタ
4. リストアイテムをタップ → 詳細情報表示

### 3. データクリアフロー
1. Timelineでプルダウン
2. 確認ダイアログ表示
3. 確認 → 全データクリア

## Color Choices

### Primary Palette
| Token | Light | Dark | 用途 |
|-------|-------|------|------|
| primary | #0066CC | #4DA6FF | アクセントカラー、接続ボタン |
| background | #F8FAFC | #0F172A | 画面背景 |
| surface | #FFFFFF | #1E293B | カード背景 |
| foreground | #0F172A | #F1F5F9 | テキスト |
| muted | #64748B | #94A3B8 | セカンダリテキスト |
| border | #E2E8F0 | #334155 | ボーダー |

### Status Colors
| 状態 | Light | Dark | 用途 |
|------|-------|------|------|
| success | #10B981 | #34D399 | 接続中、moving状態 |
| warning | #F59E0B | #FBBF24 | 接続中、unknown状態 |
| error | #EF4444 | #F87171 | 切断、エラー |
| stationary | #6366F1 | #818CF8 | stationary状態 |

## UI Components

### Location Card
```
┌─────────────────────────────────────┐
│ 🕐 14:32:45                    📱 Device-A │
├─────────────────────────────────────┤
│ 📍 35.6812° N, 139.7671° E          │
│ 🚀 Speed: 12.5 m/s  ⚡ Acc: 10m     │
│ ● moving                            │
└─────────────────────────────────────┘
```

### Connection Status Card
```
┌─────────────────────────────────────┐
│ WebSocket Status                    │
│ ● Connected                         │
│ ws://example.com/location           │
│                                     │
│ Devices: 3  Messages: 156           │
│ Last update: 14:32:45               │
└─────────────────────────────────────┘
```

## Technical Notes

- **状態管理**: React Context + useReducer（シンプルで十分）
- **永続化**: AsyncStorage（WebSocket URL保存）
- **リスト表示**: FlatList（パフォーマンス最適化）
- **WebSocket**: React Native標準のWebSocket API
