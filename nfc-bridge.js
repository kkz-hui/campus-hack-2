// ============================================================
// NFC 橋接程式
// 負責讀取 ACR1252U 的卡片資料，並透過 HTTP 提供給遊戲網頁
// 執行方式：node nfc-bridge.js
// ============================================================

const { NFC } = require('nfc-pcsc');
const express  = require('express');
const cors     = require('cors');

const app = express();
const nfc = new NFC();

app.use(cors());
app.use(express.json());

// 目前讀到的卡片資料
let currentCard = null;
let readerReady = false;

// ── NFC 讀卡機監聽 ──────────────────────────────────────────
nfc.on('reader', reader => {
  console.log(`\n✓ 讀卡機連線：${reader.name}`);
  readerReady = true;

  // 卡片放上感應區
  reader.on('card', async card => {
    console.log(`\n📡 偵測到卡片：${card.uid}`);
    try {
      // 讀取 Block 0~7（MIFARE Classic 1K 的前兩個 Sector）
      // 每個 Block 16 bytes
      const blocks = [];

      for (let block = 0; block <= 7; block++) {
        try {
          const data = await reader.read(block, 16, 16);
          // 把 buffer 轉成可讀字串（去掉尾部空白）
          const str = data.toString('utf8').replace(/\0/g, '').trim();
          blocks.push({ block, raw: data.toString('hex'), str });
        } catch (e) {
          // Sector trailer（認證 block）跳過
          blocks.push({ block, raw: '', str: '[sector trailer]' });
        }
      }

      // 解析卡片資料
      currentCard = {
        uid:       card.uid,
        studentId: blocks[0]?.str || '',
        name:      blocks[1]?.str || '',
        cardLevel: blocks[2]?.str || '',
        birthday:  blocks[3]?.str || '',
        raw:       blocks,
        readAt:    new Date().toISOString(),
      };

      console.log('卡片資料：', currentCard);

    } catch (err) {
      console.error('讀取失敗：', err);
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

// 啟動橋接程式
const PORT = 3001;
app.listen(PORT, () => {
  console.log('\n🚀 NFC 橋接程式啟動！');
  console.log(`📡 http://localhost:${PORT}`);
  console.log('\n請將 ACR1252U 插入 USB，然後感應卡片...\n');
});
