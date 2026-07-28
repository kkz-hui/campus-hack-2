# CAMPUS HACK 🏫

> 模擬資安訓練平台 — Node.js + Express 版本
> 風格參考：OverTheWire / The Wargame 駭客訓練基地

---

## 專案結構

```
campus-hack/
├── server/
│   └── index.js          ← 後端主程式（所有路由與遊戲邏輯）
├── views/
│   ├── partials/
│   │   ├── header.ejs    ← 頁面頂部（導覽列）
│   │   └── footer.ejs    ← 頁面底部
│   ├── index.ejs         ← 首頁
│   └── levels/
│       ├── level1.ejs    ← 第1關：詐騙辨識
│       ├── level2.ejs    ← 第2關：Base64 解碼
│       └── level2-success.ejs
├── public/
│   ├── css/
│   │   └── style.css     ← 全域樣式
│   └── js/
│       └── main.js       ← 前端共用工具
├── package.json
└── README.md
```

---

## 安裝與啟動

### 第一次設定

```bash
# 1. 進入專案資料夾
cd campus-hack

# 2. 安裝所有套件
npm install

# 3. 啟動伺服器（正式模式）
npm start

# 或開發模式（存檔自動重啟）
npm run dev
```

啟動成功後終端機會顯示：
```
🚀  Campus Hack 伺服器啟動！
📡  http://localhost:3000
```

### 開啟遊戲

用瀏覽器開啟：**http://localhost:3000**

---

## 各關卡說明

### 第1關：詐騙辨識（/level/1）

**玩家需要做什麼：**
1. 查看收件匣中隨機抽出的一封信
2. 按 **F12 → Elements**，在 HTML 原始碼的注解裡找到攔截到的可疑資料和學生附件
3. 判斷這封信是否為釣魚郵件
4. 正確判斷後記錄得分，進入第2關

**得分規則：**
- 滿分 100 pt
- 每答錯一次 -10 pt
- 最低 10 pt

**技術重點：**
- 學生資料藏在 HTML comment 中（`<!-- ... -->`）
- 玩家用真實的 F12 → Elements 就能找到

---

### 第2關：Base64 解碼（/level/2）

**玩家需要做什麼：**
1. 進入假校務系統登入頁
2. 按 **F12 → Elements**，在 HTML 原始碼找到 `<!-- system-token: czEyMzQ1Njc= -->`
3. 把 `czEyMzQ1Njc=` 貼到 [base64decode.org](https://base64decode.org) 解碼
4. 得到 `s1234567`，輸入答案欄位

**得分規則：**
- 滿分 150 pt
- 每答錯一次 -15 pt
- 使用提示 -70 pt
- 最低 0 pt

---

## 部署到線上（Render 免費方案）

### 步驟一：上傳到 GitHub

```bash
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/你的帳號/campus-hack.git
git push -u origin main
```

### 步驟二：在 Render 部署

1. 去 [render.com](https://render.com) 註冊免費帳號
2. 點 **New → Web Service**
3. 連結你的 GitHub repository
4. 設定：
   - **Build Command：** `npm install`
   - **Start Command：** `npm start`
   - **Environment：** Node
5. 點 **Create Web Service**
6. 幾分鐘後就會有一個 `https://你的名稱.onrender.com` 的網址

> ⚠ Render 免費方案在閒置 15 分鐘後會休眠，第一次開啟需等約 30 秒。

---

## 新增關卡的方法

### 1. 在 `server/index.js` 新增路由

```js
// GET 路由：顯示關卡頁面
app.get('/level/3', (req, res) => {
  if (!req.session.progress.completed.includes(2)) {
    return res.redirect('/level/2');
  }
  res.render('levels/level3', { /* 傳入資料 */ });
});

// POST 路由：驗證玩家答案
app.post('/level/3/verify', (req, res) => {
  // 驗證邏輯...
  saveScore(req, 3, score);
  res.json({ correct: true, score, redirect: '/level/4' });
});
```

### 2. 建立 `views/levels/level3.ejs`

```html
<%- include('../partials/header', { pageTitle: 'Lv3' }) %>
<!-- 關卡內容 -->
<%- include('../partials/footer') %>
```

### 3. 在 `views/index.ejs` 的 `LEVELS` 陣列加入新關卡

```js
{ id:3, name:'弱密碼登入', tech:'Authentication', max:100 },
```

### 4. 更新 `views/partials/header.ejs` 的總關卡數

把 `完成 X/2 關` 改成 `完成 X/3 關`。

---

## 開發常用指令

```bash
# 安裝套件後啟動（開發模式，存檔自動重啟）
npm run dev

# 清除瀏覽器 Session（重置遊戲進度）
# 在遊戲頁面點右上角「reset」按鈕
# 或直接清除瀏覽器 Cookie

# 查看伺服器 log
# 在終端機直接看輸出即可
```

---

## 常見問題

**Q：按下開始後瀏覽器顯示「無法連線」**
A：確認終端機顯示 `🚀 Campus Hack 伺服器啟動！`，且網址是 `http://localhost:3000`（不是 https）。

**Q：`npm install` 失敗**
A：確認 Node.js 版本 >= 16。執行 `node -v` 確認。

**Q：存檔後畫面沒有更新**
A：開發模式用 `npm run dev`，需要先 `npm install` 安裝 nodemon。

**Q：想重置所有進度**
A：點遊戲右上角的 `reset` 按鈕，或在瀏覽器清除 `localhost` 的 Cookie。
