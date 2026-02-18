# Danbooru Prompt Tag Manager

ローカルWebアプリです。要件である以下を実装しています。

- タグは**初回に一括保存**（IndexedDB）
- タグを**系統（カテゴリ）ごとに整理表示**
- タグを**クリックでプロンプト欄に追加**
- 追加済みタグを**ドラッグ＆ドロップで順番差し替え**

## 起動（推奨）

Danbooru取得ボタンを使うには、同梱のプロキシサーバーで起動してください。

```bash
python3 server.py
```

`http://localhost:4173` を開いてください。

## データ取り込み

- **同梱シードを一括保存**: `tags.seed.json` を保存
- **Danbooru APIから一括取得**: サーバー経由で `tags.json` を count順ページ取得して保存
  - ページ数はUIから指定（1〜30）
  - 1ページあたり200件

> `python3 -m http.server` で起動した場合は `/api/danbooru-tags` が存在しないため、Danbooru取り込みは失敗します。
