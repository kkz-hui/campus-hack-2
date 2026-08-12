'use strict';
// ============================================================
// CAMPUS HACK — 後端伺服器  (Node.js + Express)
// 第1關：詐騙辨識   第2關：Base64 解碼
// ============================================================

const express      = require('express');
const session      = require('express-session');
const cookieParser = require('cookie-parser');
const path         = require('path');

const app = express();

// ── 設定 ────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: 'campus-hack-2024',
  resave: false,
  saveUninitialized: true,
  // httpOnly:false 讓玩家可在 F12 Application → Cookies 看到 session cookie
  cookie: { httpOnly: false },
}));

// ── 全域中介層：初始化玩家進度 ─────────────────────────────
app.use((req, res, next) => {
  if (!req.session.progress) {
    req.session.progress = { completed: [], scores: {}, total: 0 };
  }
  res.locals.progress = req.session.progress;
  next();
});

// ── 輔助：儲存關卡得分（只記錄第一次完成） ──────────────────
function saveScore(req, lvl, score) {
  const p = req.session.progress;
  if (!p.completed.includes(lvl)) {
    p.completed.push(lvl);
    p.scores[lvl] = score;
    p.total += score;
  }
}

// ════════════════════════════════════════════════════════════
// 首頁
// ════════════════════════════════════════════════════════════
app.get('/', (req, res) => res.render('index'));

app.post('/reset', (req, res) => {
  req.session.progress = { completed: [], scores: {}, total: 0 };
  req.session.lv1 = null;
  req.session.lv2 = null;
  req.session.lv3 = null;
  req.session.lv4 = null;
  req.session.lv5 = null;
  req.session.lv6 = null;
  req.session.lv7 = null;
  req.session.lv8 = null;
  req.session.lv9 = null;
  res.clearCookie('role');
  res.clearCookie('PHPSESSID');
  req.session.loggedIn = null;
  req.session.user = null;
  res.redirect('/');
});

// ════════════════════════════════════════════════════════════
// 第1關：詐騙辨識
//
// MAIL_POOL   — 玩家需要判斷的信件（每次隨機抽一封）
// INBOX_EXTRA — 左側 inbox 的其他背景信件（活動通知 / 廣告）
//               純裝飾，點擊後只顯示內容，不參與判斷
//
// 詐騙信特徵：寄件者網域用數字替換字母（0→o、1→l、5→s）
// 得分：滿分100，每答錯 -10，最低 10
// ════════════════════════════════════════════════════════════

// ── 玩家需要判斷的信件池 ────────────────────────────────────
const MAIL_POOL = [
  // ① 詐騙：帳號驗證（sch00l-portal → school-portal，0換o）
  {
    id: 'm1', isPhish: true,
    from: 'admin@sch00l-p0rtal.xyz',          // 0 換 o，兩個地方都換
    fromSuspicious: true,
    subject: '【重要】請立即驗證您的校務帳號',
    time: '2024-03-15 08:42',
    body: [
      '親愛的同學，您好：',
      '本校資訊中心偵測到您的帳號有異常登入行為，為確保帳戶安全，請於 24小時內 完成帳號驗證，否則帳號將被暫停。',
      '請點擊以下連結完成驗證，逾時帳號將自動停用。',
    ],
    link: 'http://campus-verify.sch00l-p0rtal.xyz/auth?token=urgent&ref=mail',
    hint: '仔細看寄件者網域',
  },

  // ② 詐騙：獎學金通知（campu5-edu → campus-edu，5換s）
  {
    id: 'm2', isPhish: true,
    from: 'scholarship@campu5-edu.net',        // 5 換 s
    fromSuspicious: true,
    subject: '恭喜您獲得本學期獎學金，請盡速填寫帳戶資訊',
    time: '2024-03-12 14:20',
    body: [
      '親愛的同學：',
      '您已通過本學期清寒獎學金審核，核定金額新台幣 12,000 元。',
      '請於 3 日內點擊下方連結填寫銀行帳戶資訊以利撥款，逾期視同自動放棄。',
    ],
    link: 'http://scholarship-claim.campu5-edu.net/verify?id=8841',
    hint: '學校不會透過郵件索取學生銀行資訊',
  },

  // ③ 詐騙：密碼到期（campus-he1pdesk → campus-helpdesk，1換l）
  {
    id: 'm3', isPhish: true,
    from: 'it-support@campus-he1pdesk.org',   // 1 換 l
    fromSuspicious: true,
    subject: '您的帳號密碼將於今日到期，請立即更新',
    time: '2024-03-14 16:05',
    body: [
      '[System Notice]',
      '您的校務系統密碼即將於 24 小時內到期失效，為避免帳號被鎖定，請立即點擊下方連結重設密碼。',
      '若未於期限內完成操作，您的帳號將被自動停用，需聯繫系統管理員才能解鎖。',
    ],
    link: 'http://campus-he1pdesk.org/reset?uid=auto&expire=24h',
    hint: '仔細看寄件者網域',
  },

  // ④ 詐騙：圖書館帳號異常（1ibrary → library，1換l）
  {
    id: 'm4', isPhish: true,
    from: 'service@1ibrary-campus.com',        // 1 換 l
    fromSuspicious: true,
    subject: '【圖書館系統】您的帳號有異常存取，請立即確認',
    time: '2024-03-13 11:33',
    body: [
      '敬愛的讀者您好：',
      '系統偵測到您的圖書館帳號於昨晚有異常大量借閱紀錄，疑似遭他人盜用。',
      '為保障您的帳號安全，請立即點擊下方連結核實您的身分，否則帳號將在 12 小時後暫停。',
    ],
    link: 'http://1ibrary-campus.com/verify?account=check&urgent=1',
    hint: '仔細看寄件者網域',
  },

  // ⑤ 正常：教務處選課通知
  {
    id: 'm5', isPhish: false,
    from: 'course@campus.edu.tw',
    fromSuspicious: false,
    subject: '113學年度第2學期選課系統開放通知',
    time: '2024-03-10 09:00',
    body: [
      '各位同學好：',
      '113學年度第2學期選課系統將於 3/18（一）上午 9:00 正式開放。',
      '請依各學系公告之選課流程，於選課期間內完成選課作業，如有問題請洽教務處課務組。',
    ],
    link: null,
    hint: '似乎沒有可疑的地方...',
  },

  // ⑥ 正常：圖書館還書提醒
  {
    id: 'm6', isPhish: false,
    from: 'library@campus.edu.tw',
    fromSuspicious: false,
    subject: '圖書館借閱到期提醒',
    time: '2024-03-13 07:30',
    body: [
      '親愛的讀者您好：',
      '您所借閱的書籍「資料結構與演算法」（索書號：QA76.9.A43）即將於 2024-03-20 到期。',
      '請於到期日前至圖書館歸還，或登入圖書館系統辦理線上續借（每本最多可續借 2 次）。',
    ],
    link: null,
    hint: '似乎沒有可疑的地方...',
  },

  // ⑦ 正常：學生會活動通知
  {
    id: 'm7', isPhish: false,
    from: 'stu-union@campus.edu.tw',
    fromSuspicious: false,
    subject: '【學生會】113學年度春季運動會報名開始',
    time: '2024-03-11 12:00',
    body: [
      '親愛的同學：',
      '113學年度春季運動會將於 4/20（六）在本校操場舉行，即日起開放報名。',
      '參賽項目包括：100公尺短跑、4×100接力、籃球三對三、桌球、羽球。',
      '報名截止日期：4/5（五）17:00，請至學生會辦公室或掃描公告QRCode填寫報名表。',
    ],
    link: null,
    hint: '似乎沒有可疑的地方...',
  },
];

// ── inbox 左側其他背景信件（活動通知 + 廣告，不參與判斷）──
// 這些信件固定顯示在收件匣，讓畫面更真實
const INBOX_EXTRA = [
  {
    id: 'x1',
    from: 'dorm@campus.edu.tw',
    subject: '宿舍冷氣維修公告（3/16-3/17）',
    time: '03/15',
    tagColor: '#4af626',
    body: [
      '各位同學您好：',
      '宿舍管理處將於 3/16（六）至 3/17（日）進行年度冷氣保養維修，施工期間三樓至六樓冷氣將暫停使用，造成不便敬請見諒。',
      '如有任何問題請洽宿舍管理員。',
    ],
  },
  {
    id: 'x2',
    from: 'career@campus.edu.tw',
    subject: '【就業博覽會】4/10 廠商報名截止提醒',
    time: '03/14',
    tagColor: '#4af626',
    body: [
      '各位同學：',
      '113 年度校園就業博覽會將於 4/20 在本校活動中心舉行，目前已有 52 家企業確認參展。',
      '現場設有履歷健診、職涯諮詢、現場面試等服務，歡迎踴躍參加。',
    ],
  },
  {
    id: 'x3',
    from: 'noreply@shopee-deals.com',
    subject: '🔥 限時24H！AirPods Pro 直降$3000，手滑才不後悔',
    time: '03/15',
    tag: '廣告',
    tagColor: '#ffaa00',
    body: [
      '【X皮購物 × 限時閃購】',
      'WaterPods Pro 2代 原價$8,490，今日限定 $5,490！',
      '數量有限，售完為止。點擊領取專屬折扣碼：SaVe3000',
    ],
  },
  {
    id: 'x4',
    from: 'newsletter@udemy-mail.com',
    subject: 'Python 課程限時免費！今天就開始學習',
    time: '03/14',
    tag: '廣告',
    tagColor: '#ffaa00',
    body: [
      'Hi there,',
      '本週精選課程「Python for Beginners: Zero to Hero」限時 NT$0！',
      '超過 120,000 名學員好評，課程包含 40 小時影片、作業練習與結業證書。',
    ],
  },
  {
    id: 'x5',
    from: 'health@campus.edu.tw',
    subject: '【衛生保健組】流感疫苗接種通知',
    time: '03/12',
    tagColor: '#4af626',
    body: [
      '各位同學您好：',
      '本校衛生保健組將於 3/25（一）至 3/27（三）在學生活動中心辦理公費流感疫苗接種。',
      '接種對象：全體在校學生，免費施打，請攜帶學生證前往。',
    ],
  },
  {
    id: 'x6',
    from: 'promotions@pizza-discount.net',
    subject: '你的披薩等你來取！買一送一優惠今日截止',
    time: '03/11',
    tag: '廣告',
    tagColor: '#ffaa00',
    body: [
      '🍕 PIZZA HI — 學生獨家優惠',
      '憑學生證至門市消費，任選兩款個人披薩，第二件半價！',
      '活動期間：即日起至 3/31，詳情請見門市公告。',
    ],
  },
];

// GET /level/1 — 顯示收件匣
app.get('/level/1', (req, res) => {
  // 每次進入隨機抽一封，存 session 避免重整換信
  if (!req.session.lv1) {
    req.session.lv1 = {
      mail:    MAIL_POOL[Math.floor(Math.random() * MAIL_POOL.length)],
      wrong:   0,
      judged:  false,
    };
  }
  const s = req.session.lv1;
  res.render('levels/level1', {
    mail:        s.mail,
    wrong:       s.wrong,
    judged:      s.judged,
    score:       Math.max(10, 100 - s.wrong * 10),
    inboxExtra:  INBOX_EXTRA,       // 左側背景信件
    selectedExtra: req.session.lv1SelectedExtra || null,  // 玩家點選的背景信件
  });
});

// POST /level/1/select-extra — 玩家點選左側背景信件
app.post('/level/1/select-extra', (req, res) => {
  const { id } = req.body;
  const mail = INBOX_EXTRA.find(m => m.id === id);
  if (mail) req.session.lv1SelectedExtra = mail;
  res.json({ ok: true });
});

// POST /level/1/judge — 玩家送出判斷
app.post('/level/1/judge', (req, res) => {
  const { answer } = req.body;   // 'phish' or 'normal'
  if (!req.session.lv1) return res.json({ error: true });
  const s = req.session.lv1;

  const correct = (answer === 'phish'  &&  s.mail.isPhish) ||
                  (answer === 'normal' && !s.mail.isPhish);

  if (correct) {
    s.judged = true;
    res.json({ correct: true });
  } else {
    s.wrong += 1;
    const score = Math.max(10, 100 - s.wrong * 10);
    res.json({ correct: false, hint: s.mail.hint, wrong: s.wrong, score });
  }
});

// POST /level/1/complete — 確認記錄得分、進入下一關
app.post('/level/1/complete', (req, res) => {
  if (!req.session.lv1 || !req.session.lv1.judged) {
    return res.json({ error: '尚未完成判斷' });
  }
  const score = Math.max(10, 100 - req.session.lv1.wrong * 10);
  saveScore(req, 1, score);
  req.session.lv1 = null;   // 重置，讓下次進來換新信
  res.json({ score, redirect: '/level/2' });
});

// ════════════════════════════════════════════════════════════
// 第2關：Base64 解碼
//
// 玩家流程：
//  1. 進入「假校務系統登入頁」
//  2. 用 F12 → Elements，在 HTML 原始碼的 comment 裡找到
//     <!-- system-token: czEyMzQ1Njc= -->
//  3. 去外部工具（base64decode.org）解碼
//  4. 解碼結果 s1234567 → 輸入下方表單
//
// 得分：滿分150，使用提示 -70，每答錯 -15，最低 0
// ════════════════════════════════════════════════════════════

// GET /level/2 — 假校務系統登入頁（原始碼藏 Base64）
app.get('/level/2', (req, res) => {
  if (!req.session.progress.completed.includes(1)) {
    return res.redirect('/level/1');
  }
  if (!req.session.lv2) {
    req.session.lv2 = { wrong: 0, hintUsed: false };
  }
  const s = req.session.lv2;
  res.render('levels/level2', {
    wrong:    s.wrong,
    hintUsed: s.hintUsed,
    score:    Math.max(0, 150 - s.wrong * 15 - (s.hintUsed ? 70 : 0)),
  });
});

// POST /level/2/hint — 玩家要求提示
app.post('/level/2/hint', (req, res) => {
  if (!req.session.lv2) req.session.lv2 = { wrong: 0, hintUsed: false };
  req.session.lv2.hintUsed = true;
  const s = req.session.lv2;
  res.json({ score: Math.max(0, 150 - s.wrong * 15 - 70) });
});

// POST /level/2/verify — 驗證玩家輸入的解碼結果
app.post('/level/2/verify', (req, res) => {
  if (!req.session.lv2) req.session.lv2 = { wrong: 0, hintUsed: false };
  const s = req.session.lv2;
  const val = (req.body.answer || '').trim();

  if (val === 's1234567') {
    const score = Math.max(0, 150 - s.wrong * 15 - (s.hintUsed ? 70 : 0));
    saveScore(req, 2, score);
    req.session.lv2 = null;
    return res.json({ correct: true, score, redirect: '/level/2/success' });
  }

  s.wrong += 1;
  const score = Math.max(0, 150 - s.wrong * 15 - (s.hintUsed ? 70 : 0));

  let errMsg = '解碼結果不正確，請再試試看。';
  if (val.includes('=') && val.length > 5) {
    errMsg = '這看起來還是 Base64 格式，請先解碼再貼入。';
  }
  res.json({ correct: false, wrong: s.wrong, score, errMsg });
});

// GET /level/2/success — 解碼成功頁
app.get('/level/2/success', (req, res) => {
  if (!req.session.progress.completed.includes(2)) {
    return res.redirect('/level/2');
  }
  const score = req.session.progress.scores[2] || 0;
  res.render('levels/level2-success', { score });
});


// ════════════════════════════════════════════════════════════
// 第3關：弱密碼登入
//
// 玩家流程：
//  1. 進入假校務系統登入頁
//  2. 帳號來自第2關解出的學號（s1234567）
//  3. 密碼來自第1關 F12 原始碼找到的學生附件（王小明生日 20030415）
//  4. 第一次失敗不給提示，需點按鈕才顯示（扣分）
//
// 得分：滿分100，每答錯 -10，使用提示 -30，最低 0
// ════════════════════════════════════════════════════════════

// GET /level/3 — 登入頁
// GET /level/3 — 登入頁
app.get('/level/3', (req, res) => {
  if (!req.session.progress.completed.includes(2)) {
    return res.redirect('/level/2');
  }
  if (!req.session.lv3) {
    req.session.lv3 = { wrong: 0, hintUsed: false };
  }
  const s = req.session.lv3;
  res.render('levels/level3', {
    wrong:    s.wrong,
    hintUsed: s.hintUsed,
    error:    null,
    score:    Math.max(0, 100 - s.wrong * 10 - (s.hintUsed ? 30 : 0)),
  });
});

app.post('/level/3/login', (req, res) => {
  const { username, password } = req.body;
  if (!req.session.lv3) req.session.lv3 = { wrong: 0, hintUsed: false };
  const s = req.session.lv3;

  if (username === 's1234567' && password === '20030415') {
    req.session.loggedIn = true;
    req.session.user = { id: 's1234567', name: '王小明', role: 'student' };
    const score = Math.max(0, 100 - s.wrong * 10 - (s.hintUsed ? 30 : 0));
    saveScore(req, 3, score);
    return res.json({ success: true, score });
  }

  s.wrong += 1;
  const score = Math.max(0, 100 - s.wrong * 10 - (s.hintUsed ? 30 : 0));
  res.json({ success: false, wrong: s.wrong, score });
});

// POST /level/3/hint — 玩家要求提示（扣分）
app.post('/level/3/hint', (req, res) => {
  if (!req.session.lv3) req.session.lv3 = { wrong: 0, hintUsed: false };
  req.session.lv3.hintUsed = true;
  res.json({ ok: true });
});

// GET /level/3/success — 登入成功頁
app.get('/level/3/success', (req, res) => {
  if (!req.session.loggedIn) return res.redirect('/level/3');
  const score = req.session.progress.scores[3] || 0;
  res.render('levels/level3-success', { score });
});

// ════════════════════════════════════════════════════════════
// 第4關：目錄遊走（Path Traversal）
//
// 玩家流程：
//  1. 進入校內資源下載頁（/level/4）
//  2. 點擊 access.log 會顯示「權限不足」
//  3. 在網址列改成 /download?file=../logs/access.log
//  4. 後端回傳 log 內容，頁面顯示動畫
//
// 得分：滿分120，每次錯誤嘗試 -15，使用提示 -50，最低 0
// ════════════════════════════════════════════════════════════

const FAKE_FILES = {
  'syllabus.pdf':        '2024學年度課程大綱（PDF）',
  'campus-map.png':      '校園地圖（PNG 圖片）',
  'student-handbook.pdf':'學生手冊（PDF）',
  'scholarship.pdf':     '獎學金申請辦法（PDF）',
  'notice.txt':          '系統公告：維護時間為每週日 02:00-04:00。',
};

const ACCESS_LOG = `[2024-03-14 23:58:01] GET /download?file=syllabus.pdf         200 OK
[2024-03-14 23:59:12] GET /download?file=../etc/passwd       403 FORBIDDEN
[2024-03-15 00:12:33] POST /admin/login  admin               200 SUCCESS  from 10.0.0.2
[2024-03-15 00:13:01] GET /admin/panel                       200 OK       session=e8f2a3b4c
[2024-03-15 00:14:22] SET permission=superuser               uid=admin
[2024-03-15 02:31:55] GET /admin/config                      200 OK
--------------------------------------------------------------`;
app.get('/level/4', (req, res) => {
  if (!req.session.progress.completed.includes(3)) {
    return res.redirect('/level/3');
  }
  if (!req.session.lv4) {
    req.session.lv4 = { wrong: 0, hintUsed: false };
  }
  const s = req.session.lv4;
  res.render('levels/level4', {
    wrong:    s.wrong,
    hintUsed: s.hintUsed,
    score:    Math.max(0, 120 - s.wrong * 15 - (s.hintUsed ? 50 : 0)),
  });
});

// GET /download — 真實的下載路由（存在路徑跳脫漏洞）
app.get('/download', (req, res) => {
  if (!req.session.progress.completed.includes(3)) {
    return res.redirect('/level/3');
  }
  if (!req.session.lv4) {
    req.session.lv4 = { wrong: 0, hintUsed: false };
  }
  const s   = req.session.lv4;
  const file = (req.query.file || '').trim();

  // 成功：路徑跳脫到 log 檔
if (file.includes('../') && (file.includes('access.log') || file.includes('logs'))) {
  const score = Math.max(0, 120 - s.wrong * 15 - (s.hintUsed ? 50 : 0));
  saveScore(req, 4, score);
  // 改用 HTML 回傳，讓玩家可以點按鈕回到遊戲
  res.set('Content-Type', 'text/html; charset=utf-8' );
  return res.send(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>access.log</title>
  <style>
    body { background:#0c0c0c; color:#ccc; font-family:'Courier New',monospace; padding:32px; line-height:1.8; }
    pre  { font-family:inherit; white-space:pre-wrap; }
    .amber { color:#ffaa00; }
    .green { color:#4af626; }
    .red   { color:#ff3355; }
    .btn {
      display:inline-block; margin-top:24px; padding:10px 24px;
      background:#4af626; color:#000; font-family:inherit;
      font-size:14px; font-weight:700; text-decoration:none;
      border-radius:3px; letter-spacing:1px;
    }
    .btn:hover { background:#2ea614; }
    hr { border:none; border-top:1px solid #2a2a2a; margin:16px 0; }
  </style>
</head>
<body>
  <pre class="amber">$ cat ../logs/access.log</pre>
  <hr>
  <pre>${ACCESS_LOG}</pre>
  <hr>
  <pre class="green">✓ 得分已記錄：${score} pt</pre>
  <a class="btn" href="/level/5">[ 進入第5關 ] →</a>
  &nbsp;
  <a class="btn" style="background:transparent;border:1px solid #4af626;color:#4af626"
     href="/level/4">← 返回第4關</a>
</body>
</html>`);
}

  // 嘗試跳脫但路徑不對
if (file.includes('../')) {
  s.wrong += 1;
  const score = Math.max(0, 120 - s.wrong * 15 - (s.hintUsed ? 50 : 0));
  res.set('Content-Type', 'text/html; charset=utf-8');
  return res.send(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8"><title>404 Not Found</title>
  <style>
    body { background:#0c0c0c; color:#ccc; font-family:'Courier New',monospace; padding:32px; line-height:1.8; }
    .red   { color:#ff3355; }
    .amber { color:#ffaa00; }
    .btn {
      display:inline-block; margin-top:20px; padding:9px 20px;
      border:1px solid #4af626; color:#4af626; font-family:inherit;
      font-size:13px; text-decoration:none; border-radius:3px;
    }
    .btn:hover { background:#4af626; color:#000; }
  </style>
</head>
<body>
  <div class="red">Error 404: not found ${file}</div>
  <div class="amber">嘗試次數：${s.wrong}（每次 -15 pt）</div>
  <div class="amber">目前預計得分：${score} pt</div>
  <a class="btn" href="/level/4">← 返回第4關繼續嘗試</a>
</body>
</html>`);
}

  // 點擊 access.log 直接下載：權限不足
if (file === 'access.log') {
  res.set('Content-Type', 'text/html; charset=utf-8');
  return res.status(403).send(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8"><title>403 Forbidden</title>
  <style>
    body { background:#0c0c0c; color:#ccc; font-family:'Courier New',monospace; padding:32px; line-height:1.8; }
    .red   { color:#ff3355; }
    .dim   { color:#555; }
    .btn {
      display:inline-block; margin-top:20px; padding:9px 20px;
      border:1px solid #4af626; color:#4af626; font-family:inherit;
      font-size:13px; text-decoration:none; border-radius:3px;
    }
    .btn:hover { background:#4af626; color:#000; }
  </style>
</head>
<body>
  <div class="red">Error 403: Permission Denied</div>
  <div>權限不足。</div>
  <a class="btn" href="/level/4">← 返回第4關</a>
</body>
</html>`);
}

  // 一般檔案（不扣分）
  if (FAKE_FILES[file]) {
    return res.json({ success: false, info: `正在下載：${FAKE_FILES[file]}`, score: null });
  }

  return res.json({ success: false, error: `Error 404：not found ${file}`, wrong: s.wrong, score: Math.max(0, 120 - s.wrong * 15 - (s.hintUsed ? 50 : 0)) });
});

app.post('/level/4/hint', (req, res) => {
  if (!req.session.lv4) req.session.lv4 = { wrong: 0, hintUsed: false };
  req.session.lv4.hintUsed = true;
  const s = req.session.lv4;
  res.json({ score: Math.max(0, 120 - s.wrong * 15 - 50) });
});

// ════════════════════════════════════════════════════════════
// 第5關：HTML 原始碼找 Flag
//
// 玩家流程：
//  1. 進入下載區的某個頁面
//  2. 用 F12 → Elements 在 HTML comment 找到 FLAG_PART1: CAMPUS
//  3. 同時找到 role=user 的線索
//  4. 輸入 FLAG 值過關
//
// 得分：滿分100，每答錯 -15，使用提示 -40，最低 0
// ════════════════════════════════════════════════════════════

app.get('/level/5', (req, res) => {
  if (!req.session.progress.completed.includes(4)) {
    return res.redirect('/level/4');
  }
  if (!req.session.lv5) {
    req.session.lv5 = { wrong: 0, hintUsed: false };
  }
  const s = req.session.lv5;
  res.render('levels/level5', {
    wrong:    s.wrong,
    hintUsed: s.hintUsed,
    score:    Math.max(0, 100 - s.wrong * 15 - (s.hintUsed ? 40 : 0)),
  });
});

app.post('/level/5/verify', (req, res) => {
  if (!req.session.lv5) req.session.lv5 = { wrong: 0, hintUsed: false };
  const s = req.session.lv5;

  const flag   = (req.body.flag   || '').trim();
  const cookie = (req.body.cookie || '').trim();

  const flagOk   = flag.toUpperCase()   === 'FLAG_PART1: CAMPUS';
  const cookieOk = cookie.toLowerCase() === 'role=user';

  if (flagOk && cookieOk) {
    const score = Math.max(0, 100 - s.wrong * 15 - (s.hintUsed ? 40 : 0));
    saveScore(req, 5, score);
    return res.json({ correct: true, score });
  }

  s.wrong += 1;
  const score = Math.max(0, 100 - s.wrong * 15 - (s.hintUsed ? 40 : 0));

  // 給不同的錯誤提示
  let msg = '兩個欄位都不正確，再找找看。';
  if (flagOk  && !cookieOk) msg = 'FLAG 正確！但 cookie 的值不對。';
  if (!flagOk && cookieOk)  msg = 'Cookie 正確！但 FLAG 的值不對。';

  res.json({ correct: false, wrong: s.wrong, score, msg });
});

app.post('/level/5/hint', (req, res) => {
  if (!req.session.lv5) req.session.lv5 = { wrong: 0, hintUsed: false };
  req.session.lv5.hintUsed = true;
  const s = req.session.lv5;
  res.json({ score: Math.max(0, 100 - s.wrong * 15 - 40) });
});

// ════════════════════════════════════════════════════════════
// 第6關：Cookie 存取
//
// 玩家流程：
//  1. 進入頁面，後端設定真實 cookie: role=user
//  2. 用 F12 → Application → Cookies 找到 role=user
//  3. 直接在 F12 裡把值改成 role=admin
//  4. 按「驗證權限」按鈕，後端讀取 cookie 判斷
//
// 得分：滿分120，每答錯 -20，使用提示 -50，最低 0
// ════════════════════════════════════════════════════════════

app.get('/level/6', (req, res) => {
  if (!req.session.progress.completed.includes(5)) {
    return res.redirect('/level/5');
  }
  if (!req.session.lv6) {
    req.session.lv6 = { wrong: 0, hintUsed: false };
  }

  // 設定真實 cookie，讓玩家可以在 F12 看到
  if (!req.cookies.role) {
    res.cookie('role', 'user', {
      httpOnly: false,  // 讓 JS 和 F12 都能看到
      sameSite: 'lax',
    });
  }

  const s = req.session.lv6;
  const currentRole = req.cookies.role || 'user';
  res.render('levels/level6', {
    wrong:       s.wrong,
    hintUsed:    s.hintUsed,
    currentRole,
    score:       Math.max(0, 120 - s.wrong * 20 - (s.hintUsed ? 50 : 0)),
  });
});

app.post('/level/6/check', (req, res) => {
  if (!req.session.lv6) req.session.lv6 = { wrong: 0, hintUsed: false };
  const s = req.session.lv6;
  const currentRole = req.cookies.role || 'user';

  if (currentRole === 'admin') {
    const score = Math.max(0, 120 - s.wrong * 20 - (s.hintUsed ? 50 : 0));
    saveScore(req, 6, score);
    res.clearCookie('role');
    return res.json({
      success: true,
      score,
      flag: 'FLAG_PART2: HACK',
    });
  }

  s.wrong += 1;
  const score = Math.max(0, 120 - s.wrong * 20 - (s.hintUsed ? 50 : 0));
  res.json({
    success: false,
    currentRole,
    wrong: s.wrong,
    score,
  });
});

app.post('/level/6/hint', (req, res) => {
  if (!req.session.lv6) req.session.lv6 = { wrong: 0, hintUsed: false };
  req.session.lv6.hintUsed = true;
  const s = req.session.lv6;
  res.json({ score: Math.max(0, 120 - s.wrong * 20 - 50) });
});

// ════════════════════════════════════════════════════════════
// 第7關：偽造學生證
//
// 玩家流程：
//  1. 進入頁面，JS 自動在 localStorage 寫入 CARD_LEVEL=student
//  2. 用 F12 → Application → Local Storage 找到 CARD_LEVEL
//  3. 直接改成 CARD_LEVEL=admin
//  4. 按「驗證卡片」，前端讀取 localStorage 送給後端驗證
//
// 得分：滿分120，每答錯 -20，使用提示 -50，最低 0
// ════════════════════════════════════════════════════════════

app.get('/level/7', (req, res) => {
  if (!req.session.progress.completed.includes(6)) {
    return res.redirect('/level/6');
  }
  if (!req.session.lv7) {
    req.session.lv7 = { wrong: 0, hintUsed: false };
  }
  const s = req.session.lv7;
  res.render('levels/level7', {
    wrong:    s.wrong,
    hintUsed: s.hintUsed,
    score:    Math.max(0, 120 - s.wrong * 20 - (s.hintUsed ? 50 : 0)),
  });
});

app.post('/level/7/check', (req, res) => {
  if (!req.session.lv7) req.session.lv7 = { wrong: 0, hintUsed: false };
  const s = req.session.lv7;
  const cardLevel = (req.body.cardLevel || '').trim().toLowerCase();

  if (cardLevel === 'admin') {
    const score = Math.max(0, 120 - s.wrong * 20 - (s.hintUsed ? 50 : 0));
    saveScore(req, 7, score);
    return res.json({ success: true, score });
  }

  s.wrong += 1;
  const score = Math.max(0, 120 - s.wrong * 20 - (s.hintUsed ? 50 : 0));
  res.json({ success: false, cardLevel, wrong: s.wrong, score });
});

app.post('/level/7/hint', (req, res) => {
  if (!req.session.lv7) req.session.lv7 = { wrong: 0, hintUsed: false };
  req.session.lv7.hintUsed = true;
  const s = req.session.lv7;
  res.json({ score: Math.max(0, 120 - s.wrong * 20 - 50) });
});

// ════════════════════════════════════════════════════════════
// 第8關：Session 劫持
//
// 玩家流程：
//  1. 進入教師工作站，看到 Session 已過期
//  2. 頁面上的便利貼夾雜著 PHPSESSID=abc123
//  3. 用 F12 → Application → Cookies 找到 PHPSESSID
//  4. 把值改成 abc123
//  5. 按「重新連線」驗證
//
// 得分：滿分120，每答錯 -20，使用提示 -40，最低 0
// ════════════════════════════════════════════════════════════

app.get('/level/8', (req, res) => {
  if (!req.session.progress.completed.includes(7)) {
    return res.redirect('/level/7');
  }
  if (!req.session.lv8) {
    req.session.lv8 = { wrong: 0, hintUsed: false };
  }

  // 設定真實的 PHPSESSID cookie，初始值為 expired_session
  if (!req.cookies.PHPSESSID) {
    res.cookie('PHPSESSID', 'expired_session', {
      httpOnly: false, // 讓 F12 可以看到並修改
      sameSite: 'lax',
    });
  }

  const s = req.session.lv8;
  res.render('levels/level8', {
    wrong:    s.wrong,
    hintUsed: s.hintUsed,
    score:    Math.max(0, 120 - s.wrong * 20 - (s.hintUsed ? 40 : 0)),
  });
});

app.post('/level/8/connect', (req, res) => {
  if (!req.session.lv8) req.session.lv8 = { wrong: 0, hintUsed: false };
  const s = req.session.lv8;
  const phpsessid = req.cookies.PHPSESSID || '';

  if (phpsessid === 'abc123') {
    const score = Math.max(0, 120 - s.wrong * 20 - (s.hintUsed ? 40 : 0));
    saveScore(req, 8, score);
    res.clearCookie('PHPSESSID');
    return res.json({ success: true, score });
  }

  s.wrong += 1;
  const score = Math.max(0, 120 - s.wrong * 20 - (s.hintUsed ? 40 : 0));
  res.json({ success: false, phpsessid, wrong: s.wrong, score });
});

app.post('/level/8/hint', (req, res) => {
  if (!req.session.lv8) req.session.lv8 = { wrong: 0, hintUsed: false };
  req.session.lv8.hintUsed = true;
  const s = req.session.lv8;
  res.json({ score: Math.max(0, 120 - s.wrong * 20 - 40) });
});

// ════════════════════════════════════════════════════════════
// 第9關：隱寫術（Steganography）
//
// 玩家流程：
//  1. 進入頁面看到校慶照片
//  2. 先點下載圖片按鈕
//  3. 在頁面的模擬終端機輸入 steghide 指令
//  4. 解出 FLAG_PART3: SYSTEM
//
// 得分：滿分100，未先下載直接分析 -20，使用提示 -40，最低 0
// ════════════════════════════════════════════════════════════

app.get('/level/9', (req, res) => {
  if (!req.session.progress.completed.includes(8)) {
    return res.redirect('/level/8');
  }
  if (!req.session.lv9) {
    req.session.lv9 = { wrong: 0, hintUsed: false, downloaded: false };
  }
  const s = req.session.lv9;
  res.render('levels/level9', {
    wrong:      s.wrong,
    hintUsed:   s.hintUsed,
    downloaded: s.downloaded,
    score:      Math.max(0, 100 - s.wrong * 15 - (s.hintUsed ? 40 : 0)),
  });
});

app.post('/level/9/download', (req, res) => {
  if (!req.session.lv9) req.session.lv9 = { wrong: 0, hintUsed: false, downloaded: false };
  req.session.lv9.downloaded = true;
  res.json({ ok: true });
});

app.post('/level/9/analyze', (req, res) => {
  if (!req.session.lv9) req.session.lv9 = { wrong: 0, hintUsed: false, downloaded: false };
  const s = req.session.lv9;
  const cmd = (req.body.cmd || '').trim();

  // 未先下載就分析
  if (!s.downloaded) {
    return res.json({
      success: false,
      error: 'Error: 找不到 school_festival.jpg，請先下載圖片。',
      score: Math.max(0, 100 - s.wrong * 15 - (s.hintUsed ? 40 : 0)),
    });
  }

  // 正確的 steghide 指令
  if (
    cmd.includes('steghide') &&
    cmd.includes('extract') &&
    cmd.includes('school_festival.jpg')
  ) {
    const score = Math.max(0, 100 - s.wrong * 15 - (s.hintUsed ? 40 : 0));
    saveScore(req, 9, score);
    return res.json({ success: true, score });
  }

  // 有 steghide 但格式不對
  if (cmd.includes('steghide')) {
    s.wrong += 1;
    const score = Math.max(0, 100 - s.wrong * 15 - (s.hintUsed ? 40 : 0));
    return res.json({
      success: false,
      error: 'steghide: 指令格式錯誤\n用法：steghide extract -sf school_festival.jpg',
      wrong: s.wrong,
      score,
    });
  }

  // 其他指令
  if (cmd === 'ls' || cmd === 'ls -la') {
    return res.json({
      success: false,
      output: 'school_festival.jpg   Documents   Downloads   Desktop',
      score: Math.max(0, 100 - s.wrong * 15 - (s.hintUsed ? 40 : 0)),
    });
  }

  if (cmd === '') {
    return res.json({ success: false, output: '', score: Math.max(0, 100 - s.wrong * 15 - (s.hintUsed ? 40 : 0)) });
  }

  s.wrong += 1;
  const score = Math.max(0, 100 - s.wrong * 15 - (s.hintUsed ? 40 : 0));
  res.json({
    success: false,
    error: 'bash: ' + cmd.split(' ')[0] + ': command not found',
    wrong: s.wrong,
    score,
  });
});

app.post('/level/9/hint', (req, res) => {
  if (!req.session.lv9) req.session.lv9 = { wrong: 0, hintUsed: false, downloaded: false };
  req.session.lv9.hintUsed = true;
  const s = req.session.lv9;
  res.json({ score: Math.max(0, 100 - s.wrong * 15 - 40) });
});


// ── 啟動 ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n🚀  Campus Hack 伺服器啟動！');
  console.log(`📡  http://localhost:${PORT}\n`);
});
