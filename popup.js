document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const listDiv = document.getElementById('videoList');

  if (!tab.url || tab.url.startsWith('chrome://')) {
    listDiv.innerHTML = '<div class="empty">此頁面受保護，無法執行偵測。</div>';
    return;
  }

  // 1. 執行強力偵測腳本 (穿透所有框架)
  chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: () => {
      const results = new Set();
      // 搜尋：影片標籤、來源標籤、以及帶有影片後綴的連結
      const mediaElements = document.querySelectorAll('video, source, a[href*=".mp4"], a[href*=".webm"], a[href*=".mov"]');
      
      mediaElements.forEach(el => {
        const src = el.currentSrc || el.src || el.href;
        // 排除 blob、data-uri 等無法直接處理的網址
        if (src && !src.startsWith('blob:') && !src.startsWith('data:')) {
          if (src.match(/\.(mp4|webm|m4v|mov|m4s|ts)(?:\?|$)/i) || src.includes('video')) {
            results.add(src);
          }
        }
      });
      return Array.from(results);
    }
  }, (injectionResults) => {
    // 2. 彙整各個框架回傳的資料
    const allFoundUrls = [];
    if (injectionResults) {
      injectionResults.forEach(frame => {
        if (frame.result) allFoundUrls.push(...frame.result);
      });
    }

    // 3. 去除重複
    const finalUrls = [...new Set(allFoundUrls)];
    listDiv.innerHTML = '';

    if (finalUrls.length === 0) {
      listDiv.innerHTML = '<div class="empty">未偵測到直接影片連結<br><br><small>提示：部分嵌入式影片需點擊「播放」後才會出現網址</small></div>';
      return;
    }

    // 4. 生成清單與預覽器
    finalUrls.forEach((url, index) => {
      const item = document.createElement('div');
      item.className = 'video-item';
      
      const fileName = url.split('/').pop().split('?')[0] || `影片資源_${index + 1}`;
      const displayId = index + 1;

      item.innerHTML = `
        <div class="preview-container">
          <video src="${url}" controls preload="metadata" muted></video>
        </div>
        <div class="info">
          <span class="file-tag">資源 #${displayId}</span><br>
          ${fileName.substring(0, 50)}${fileName.length > 50 ? '...' : ''}
        </div>
        <button class="dl-btn" data-url="${url}">立即下載此影片</button>
      `;
      listDiv.appendChild(item);
    });
  });
});

// 5. 下載功能處理
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('dl-btn')) {
    const url = e.target.dataset.url;
    
    chrome.downloads.download({ 
      url: url, 
      saveAs: true 
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        alert("下載發起失敗！\n原因：網站可能禁止跨網域下載。\n建議：直接在上方預覽影片按「右鍵」點選「影片另存新檔」。");
      }
    });
  }
});