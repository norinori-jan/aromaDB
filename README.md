# aromaDB

香料ナレッジを入力・保存するためのフルスタックアプリです。

## 主な機能

- 定規風の細かい目盛りスライダー
- 表示モード切替（表示対象を変えても全項目を保存）
- 画像アップロード（ドラッグ＆ドロップ対応）
- Gemini 連携によるラベル画像からの香料名自動入力

## Backend 起動

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
uvicorn main:app --reload --port 8000
```

`GEMINI_API_KEY` が未設定でも通常保存は利用できますが、`/api/extract-name` は利用できません。

## Frontend 起動

```bash
cd frontend
npm install
npm run dev
```

必要なら API の接続先を `.env` で変更できます。

```bash
VITE_API_BASE_URL=http://localhost:8000
```