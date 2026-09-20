// ============================================================
// 卡片寫入工具
// 展示前執行這個把學生資料寫進 RFID 卡
// 執行方式：node nfc-write.js
// ============================================================

const { NFC } = require('nfc-pcsc');
const nfc = new NFC();

// ── 要寫入的學生資料 ────────────────────────────────────────
const STUDENT_DATA = {
  block0: 's1234567',        // 學號
  block1: 'WANG_XIAOMING',   // 姓名
  block2: 'c3R1ZGVudA==',   // CARD_LEVEL=student（Base64 編碼）
  block3: '20030415',        // 生日
};

// 把字串填充到 16 bytes
function padTo16(str) {
  const buf = Buffer.alloc(16, 0);
  Buffer.from(str, 'utf8').copy(buf);
  return buf;
}

console.log('\n📝 卡片寫入工具');
console.log('要寫入的資料：');
console.log('  Block 0（學號）  :', STUDENT_DATA.block0);
console.log('  Block 1（姓名）  :', STUDENT_DATA.block1);
console.log('  Block 2（權限）  :', STUDENT_DATA.block2, '← student 的 Base64');
console.log('  Block 3（生日）  :', STUDENT_DATA.block3);
console.log('\n請將卡片放到讀卡機上...\n');

nfc.on('reader', reader => {
  console.log(`✓ 讀卡機連線：${reader.name}`);

  reader.on('card', async card => {
    console.log(`📡 偵測到卡片：${card.uid}`);
    console.log('開始寫入...\n');

    try {
      // 寫入各 Block
      await reader.write(0, padTo16(STUDENT_DATA.block0), 16);
      console.log('✓ Block 0 寫入成功：', STUDENT_DATA.block0);

      await reader.write(1, padTo16(STUDENT_DATA.block1), 16);
      console.log('✓ Block 1 寫入成功：', STUDENT_DATA.block1);

      await reader.write(2, padTo16(STUDENT_DATA.block2), 16);
      console.log('✓ Block 2 寫入成功：', STUDENT_DATA.block2);

      await reader.write(3, padTo16(STUDENT_DATA.block3), 16);
      console.log('✓ Block 3 寫入成功：', STUDENT_DATA.block3);

      console.log('\n🎉 寫入完成！可將卡片交給玩家。');
      console.log('提示：admin -> Base64');
      console.log('答案：YWRtaW4=\n');

      process.exit(0);

    } catch (err) {
      console.error('寫入失敗：', err);
      console.log('請確認：');
      console.log('  1. 卡片是 MIFARE Classic 1K');
      console.log('  2. 讀卡機驅動程式已安裝');
      console.log('  3. 卡片完整放在感應區上');
    }
  });
});

nfc.on('error', err => {
  console.error('NFC 錯誤：', err);
});
