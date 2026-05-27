# Toddler Picture Book Storyboard Builder

這是一個**純手動**的幼兒繪本 storyboard 建構工具。此版本不需要外部金鑰或自動生成服務，保留空白故事板建立、逐頁內容編輯、圖片與音訊上傳，以及 ZIP 打包匯出功能。

## 功能

| 功能 | 說明 |
|---|---|
| 空白 Storyboard 建立 | 設定標題、主題、語言與頁數後，建立空白分頁結構。 |
| 逐頁故事編輯 | 每頁可填寫故事文本或配音稿。 |
| 插圖素材管理 | 每頁可上傳插圖，並保留插圖備註或提示詞欄位。 |
| 配音素材管理 | 每頁可上傳既有音訊檔。 |
| 動畫備註 | 每頁可填寫鏡頭、動作、節奏等分鏡備註。 |
| ZIP 打包匯出 | 匯出可瀏覽的 `index.html`、`images/`、`audio/` 與 `storyboard/` 資料。 |

## 本機執行

**Prerequisites:** Node.js

```bash
npm install
npm run dev
```

## 建置

```bash
npm run build
```

## 匯出內容結構

匯出的 ZIP 會包含下列主要內容：

| 路徑 | 內容 |
|---|---|
| `index.html` | 可離線瀏覽的繪本頁面。 |
| `images/` | 使用者上傳的每頁插圖素材。 |
| `audio/` | 使用者上傳的每頁音訊素材。 |
| `storyboard/storyboard.json` | 結構化 storyboard 資料。 |
| `storyboard/storyboard.md` | 便於閱讀與後續編輯的 Markdown storyboard。 |
