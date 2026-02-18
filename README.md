# Danbooru Prompt Tag Manager (MVP)

ローカル向けの簡易Webアプリです。

## できること

- Danbooru由来タグを**初回に一括保存**（`localStorage`）
- タグを**系統（カテゴリ）ごとに整理表示**
- タグをクリックして**プロンプト欄へ追加**
- プロンプト欄のタグを**ドラッグ＆ドロップで並び替え**

## 起動

静的ファイルだけで動作します。例:

```bash
python3 -m http.server 4173
```

ブラウザで `http://localhost:4173` を開いてください。
