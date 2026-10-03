// ============================================================
// NFC 橋接程式
// 負責讀取 ACR1252U 的卡片資料，並透過 HTTP 提供給遊戲網頁
// 執行方式：node nfc-bridge.js
// ============================================================

const { NFC, KEY_TYPE_A } = require('nfc-pcsc');
const express  = require('express');
const cors     = require('cors');

const app = express();
const nfc = new NFC();

app.use(cors());
app.use(express.json());

// 白卡出廠預設金鑰
const DEFAULT_KEY = 'FFFFFFFFFFFF';

// 資料所在區塊（要與 nfc-write.js 一致）
// Block 3、7、11 是金鑰區，不能讀寫資料
const BLOCK_MAP = {
  studentId: 4,
  name:      5,
  cardLevel: 6,
  birthday:  8,
};

// 目前讀到的卡片資料
let currentCard = null;
let readerReady = false;
let activeReader = null;

// 每 4 個區塊為一個磁區，回傳該區塊所屬磁區的第一個區塊
function sectorFirstBlock(block) {
  return Math.floor(block / 4) * 4;
}

// ── NFC 讀卡機監聽 ──────────────────────────────────────────
nfc.on('reader', reader => {
  if (reader.name.includes('SAM')) {
    console.log(`略過 SAM 讀卡機：${reader.name}`);
    return;
  }
  console.log(`\n✓ 讀卡機連線：${reader.name}`);
  readerReady = true;
  activeReader = reader;

  // 讀的是自訂資料而非 NDEF，關掉自動處理
  reader.autoProcessing = false;

  // 卡片放上感應區
  reader.on('card', async card => {
    console.log(`\n📡 偵測到卡片：${card.uid}`);
    try {
      const values = {};
      const raw = [];
      let lastAuthedSector = -1;

      for (const [field, block] of Object.entries(BLOCK_MAP)) {
        // 進入新磁區時才需要重新驗證
        const sector = sectorFirstBlock(block);
        if (sector !== lastAuthedSector) {
          await reader.authenticate(block, KEY_TYPE_A, DEFAULT_KEY);
          lastAuthedSector = sector;
        }

        const data = await reader.read(block, 16, 16);
        const str = data.toString('utf8').replace(/\0/g, '').trim();
        values[field] = str;
        raw.push({ block, field, raw: data.toString('hex'), str });
      }

      currentCard = {
        uid:       card.uid,
        studentId: values.studentId,
        name:      values.name,
        cardLevel: values.cardLevel,
        birthday:  values.birthday,
        raw,
        readAt:    new Date().toISOString(),
      };

      console.log('卡片資料：', currentCard);

    } catch (err) {
      console.error('讀取失敗：', err.message || err);
      currentCard = { error: '讀取失敗，請重新感應', uid: card.uid };
    }
  });

  // 卡片移開
  reader.on('card.off', card => {
    console.log(`\n📡 卡片移開：${card.uid}`);
    currentCard = null;
  });

  reader.on('error', err => {
    console.error('讀卡機錯誤：', err);
  });

  reader.on('end', () => {
    console.log(`\n讀卡機已移除：${reader.name}`);
    readerReady = false;
    currentCard = null;
  });
});

nfc.on('error', err => {
  console.error('NFC 錯誤：', err);
  readerReady = false;
});

// ── API 路由 ────────────────────────────────────────────────

// 取得目前卡片資料
app.get('/card', (req, res) => {
  if (!readerReady) {
    return res.json({ status: 'no_reader', message: '讀卡機未連線' });
  }
  if (!currentCard) {
    return res.json({ status: 'no_card', message: '請將卡片放到讀卡機上' });
  }
  if (currentCard.error) {
    return res.json({ status: 'error', message: currentCard.error });
  }
  res.json({ status: 'ok', card: currentCard });
});

// 取得讀卡機狀態
app.get('/status', (req, res) => {
  res.json({ ready: readerReady });
});

// 只允許玩家改權限欄位（Block 6），其他欄位不開放
app.post('/write', async (req, res) => {
  if (!activeReader || !currentCard) {
    return res.json({ success: false, message: '請先將卡片放在讀卡機上' });
  }
  const value = String(req.body.cardLevel || '').slice(0, 16);
  if (!value) {
    return res.json({ success: false, message: '內容不可為空' });
  }
  try {
    await activeReader.authenticate(6, KEY_TYPE_A, DEFAULT_KEY);
    const buf = Buffer.alloc(16, 0);
    Buffer.from(value, 'utf8').copy(buf);
    await activeReader.write(6, buf, 16);

    currentCard.cardLevel = value;   // 立刻更新顯示
    res.json({ success: true });
  } catch (err) {
    console.error('寫入失敗：', err.message || err);
    res.json({ success: false, message: '寫入失敗，請重新感應卡片' });
  }
});

// 啟動橋接程式
const PORT = 3001;
app.listen(PORT, () => {
  console.log('\n🚀 NFC 橋接程式啟動！');
  console.log(`📡 http://localhost:${PORT}`);
  console.log('\n請將 ACR1252U 插入 USB，然後感應卡片...\n');
});