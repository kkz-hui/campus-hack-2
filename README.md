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
│       ├── level3.ejs    ← 第3關：弱密碼登入
│       ├── level4.ejs    ← 第4關：目錄遊走
│       ├── level5.ejs    ← 第5關：HTML 原始碼
│       └── level6.ejs    ← 第6關：Cookie 存取
├── public/
│   ├── css/
│   │   └── style.css     ← 全域樣式
│   └── js/
│       └── main.js       ← 前端共用工具
├── package.json
└── README.md
```

---

## 關卡說明

| 關卡 | 名稱 | 技術 | 滿分 |
|------|------|------|------|
| Lv1 | 詐騙辨識 | Email Analysis | 100 pt |
| Lv2 | Base64 解碼 | Source Code Review | 150 pt |
| Lv3 | 弱密碼登入 | Authentication | 100 pt |
| Lv4 | 目錄遊走 | Path Traversal | 120 pt |
| Lv5 | HTML 原始碼 | Source Code Review | 100 pt |
| Lv6 | Cookie 存取 | Cookie Manipulation | 120 pt |

---

## 安裝與啟動

```bash
# 安裝套件
npm install

# 啟動伺服器
npm start

# 開發模式（存檔自動重啟）
npm run dev
```

啟動後開啟瀏覽器：**http://localhost:3000**

---

## 部署（Render）

1. 上傳到 GitHub
2. 至 [render.com](https://render.com) 連結 repository
3. Build Command：`npm install`
4. Start Command：`npm start`
5. 部署完成後會有公開網址

> ⚠ Render 免費方案閒置 15 分鐘後會休眠，第一次開啟需等約 30 秒。

---

## 遊玩提示

本平台為真實環境模擬，善用瀏覽器開發者工具來找線索。
請勿短時間內點擊多次Enter或確認，易導致動畫出現重疊。
