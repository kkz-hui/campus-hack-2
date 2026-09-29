// ============================================================
// 卡片寫入工具（遊戲關卡道具卡）
// 展示前執行這個把假學生資料寫進 MIFARE Classic 1K 白卡
// 執行方式：node nfc-write.js
// ============================================================

const { NFC, KEY_TYPE_A } = require('nfc-pcsc');
const nfc = new NFC();

// 白卡出廠預設金鑰
const DEFAULT_KEY = 'FFFFFFFFFFFF';

// ── 要寫入的假學生資料 ──────────────────────────────────────
// 注意：Block 3、7、11 是金鑰區，絕對不能寫
const STUDENT_DATA = [
  { block: 4, label: '學號', value: 's1234567' },
  { block: 5, label: '姓名', value: 'WANG_XIAOMING' },
  { block: 6, label: '權限', value: 'c3R1ZGVudA==' }, // CARD_LEVEL=student 的 Base64
  { block: 8, label: '生日', value: '20030415' },
];

// 字串填充到 16 bytes
function padTo16(str) {
  const buf = Buffer.alloc(16, 0);
  Buffer.from(str, 'utf8').copy(buf);
  return buf;
}

// 每 4 個區塊為一個磁區，回傳該區塊所屬磁區的第一個區塊
function sectorFirstBlock(block) {
  return Math.floor(block / 4) * 4;
}

console.log('\n📝 卡片寫入工具');
console.log('要寫入的資料：');
STUDENT_DATA.forEach(d => {
  console.log(`  Block ${d.block}（${d.label}）:`, d.value);
});
console.log('\n請將卡片放到讀卡機上...\n');

nfc.on('reader', reader => {
  console.log(`✓ 讀卡機連線：${reader.name}`);

  // 寫的是自訂資料而非 NDEF，關掉自動處理
  reader.autoProcessing = false;

  reader.on('card', async card => {
    console.log(`📡 偵測到卡片：${card.uid}`);
    console.log('開始寫入...\n');

    try {
      let lastAuthedSector = -1;

      for (const d of STUDENT_DATA) {
        // 進入新磁區時才需要重新驗證
        const sector = sectorFirstBlock(d.block);
        if (sector !== lastAuthedSector) {
          await reader.authenticate(d.block, KEY_TYPE_A, DEFAULT_KEY);
          lastAuthedSector = sector;
        }

        // 寫入
        await reader.write(d.block, padTo16(d.value), 16);

        // 讀回驗證
        const readBack = await reader.read(d.block, 16, 16);
        const text = readBack.toString('utf8').replace(/\0/g, '');
        if (text !== d.value) {
          throw new Error(`Block ${d.block} 讀回內容不符：${text}`);
        }

        console.log(`✓ Block ${d.block}（${d.label}）寫入並驗證成功：${d.value}`);
      }

      console.log('\n🎉 寫入完成！可將卡片交給玩家。');
      console.log('提示：admin -> Base64');
      console.log('答案：YWRtaW4=\n');

      setTimeout(() => process.exit(0), 300);

    } catch (err) {
      console.error('\n寫入失敗：', err.message || err);
      console.log('請確認：');
      console.log('  1. 卡片是 MIFARE Classic 1K 白卡（金鑰為預設值）');
      console.log('  2. 讀卡機驅動程式已安裝');
      console.log('  3. 卡片完整放在感應區上，寫入過程中不要移動');
    }
  });

  reader.on('error', err => {
    console.error('讀卡機錯誤：', err);
  });

  reader.on('end', () => {
    console.log(`讀卡機已移除：${reader.name}`);
  });
});

nfc.on('error', err => {
  console.error('NFC 錯誤：', err);
});