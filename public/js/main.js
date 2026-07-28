// ============================================================
// CAMPUS HACK — 前端共用工具
// ============================================================

// 讓所有外部連結在新分頁開啟
document.querySelectorAll('a[href^="http"]').forEach(a => {
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener noreferrer');
});

// 鍵盤快捷鍵提示（按 ? 顯示）
document.addEventListener('keydown', e => {
  if (e.key === '?' && !e.target.matches('input, textarea')) {
    alert(
      'CAMPUS HACK — 快捷鍵\n\n' +
      'F12  →  開發者工具（找線索用）\n' +
      'Ctrl+U  →  檢視頁面原始碼\n' +
      'Ctrl+Shift+I  →  開發者工具（Mac: Cmd+Option+I）\n\n' +
      '提示：每一關的關鍵資訊都藏在真實的 HTML 原始碼、Cookie 或 HTTP 回應裡。'
    );
  }
});
