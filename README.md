# CyberHunter

> *情境式資安弱點探索與攻防平台*

模擬資安訓練平台 — Node.js + Express  
風格參考：OverTheWire / The Wargame 駭客訓練基地

---

## 專案結構

```
campus-hack-2/
├── server/
│   └── index.js         
├── views/
│   ├── partials/
│   │   ├── header.ejs    
│   │   └── footer.ejs    
│   ├── index.ejs         
│   ├── complete.ejs     
│   └── levels/
│       ├── level1.ejs   
│       ├── level2.ejs   
│       ├── level3.ejs   
│       ├── level4.ejs   
│       ├── level5.ejs    
│       ├── level6.ejs  
│       ├── level7.ejs   
│       ├── level8.ejs   
│       ├── level9.ejs   
│       └── level10.ejs  
├── public/
│   ├── css/
│   │   └── style.css   
│   └── js/
│       └── main.js       
├── flag.txt              
├── nfc-bridge.js        
├── nfc-write.js          
├── package.json
└── README.md
```

## 關卡說明

| 關卡 | 名稱 | 技術 | 滿分 |
|------|------|------|------|
| Lv1  | 詐騙辨識 | Email Phishing Detection | 100 pt |
| Lv2  | Base64 解碼 | Source Code Review | 150 pt |
| Lv3  | 弱密碼登入 | Weak Password Authentication | 100 pt |
| Lv4  | 目錄遊走 | Path Traversal | 120 pt |
| Lv5  | HTML 原始碼 | HTML Source Code Analysis | 100 pt |
| Lv6  | Cookie 存取 | Cookie Manipulation | 120 pt |
| Lv7  | 偽造學生證 | RFID Card Forgery | 120 pt |
| Lv8  | Session 劫持 | Session Hijacking | 120 pt |
| Lv9  | 隱寫術 | Steganography | 100 pt |
| Lv10 | 指令注入 | Command Injection | 150 pt |

**總滿分：1,180 pt**

---

## 部署（Render）

1. 上傳到 GitHub
2. 至 [render.com](https://render.com) 連結 repository
3. Build Command：`npm install`
4. Start Command：`npm start`
5. 部署完成後會有公開網址

> ⚠ Render 免費方案閒置 15 分鐘後會休眠，第一次開啟需等約 30 秒。  
> ⚠ 第7關的實體 RFID 功能僅支援本地執行，部署版本無法使用。

---

## 遊玩提示

- 本平台為真實環境模擬，善用瀏覽器開發者工具（**F12**）來找線索
- **F12 → Elements**：查看 HTML 原始碼，找隱藏注解
- **F12 → Application → Cookies**：查看與修改 Cookie
- **F12 → Application → Local Storage**：查看與修改 localStorage
- **F6**：快速選取瀏覽器網址列，直接修改路徑
- 請勿短時間內重複點擊確認，容易造成動畫重疊
