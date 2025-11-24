chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getUrl') {
    console.log('Content script received getUrl request');
    sendResponse({ url: window.location.href });
  } else {
    console.log('Content script received unknown request:', request);
  }
  return true;
});

(function() {
  const indicator = document.createElement('div');
  indicator.textContent = 'LCNC Lens Active';
  indicator.style.position = 'fixed';
  indicator.style.bottom = '10px';
  indicator.style.right = '10px';
  indicator.style.background = '#007bff';
  indicator.style.color = '#fff';
  indicator.style.padding = '4px 10px';
  indicator.style.borderRadius = '4px';
  indicator.style.zIndex = '99999';
  indicator.style.fontSize = '12px';
  indicator.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  indicator.style.opacity = '0.85';
  document.body.appendChild(indicator);
  setTimeout(() => indicator.remove(), 5000);
})();
