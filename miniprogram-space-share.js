(function () {
  'use strict';
  var phone = document.querySelector('.phone');
  var detail = document.getElementById('space-detail');
  var trigger = document.querySelector('.nav-share');
  if (!phone || !detail || !trigger) return;
  var sheet = document.createElement('div');
  sheet.className = 'space-share hidden';
  sheet.innerHTML = '<div class="space-share-mask"></div><div class="space-share-panel" role="dialog" aria-modal="true" aria-labelledby="space-share-title" aria-describedby="space-share-note"><header><h2 id="space-share-title">分享招商空间</h2><button type="button" class="space-share-close" aria-label="关闭分享"><i data-lucide="x" aria-hidden="true"></i></button></header><article class="space-share-card"><img class="space-share-cover" alt=""><div class="space-share-copy"><span>星桥科创园 · 招商空间</span><h3></h3><p></p><strong></strong></div><footer>微信小程序分享卡片预览</footer></article><p id="space-share-note">当前为浏览器预览；微信小程序内使用官方分享面板选择好友发送。</p><button type="button" class="space-share-wechat"><span class="space-share-wechat-icon" aria-hidden="true"></span><span>微信好友</span></button><p class="space-share-status" role="status" hidden></p><button type="button" class="space-share-cancel">取消</button></div>';
  phone.appendChild(sheet);
  var panel = sheet.querySelector('.space-share-panel');
  var status = sheet.querySelector('.space-share-status');
  var closeButton = sheet.querySelector('.space-share-close');
  var background = [], opened = false;
  var wechat = detail.querySelector('.manager-wechat');
  if (wechat) sheet.querySelector('.space-share-wechat-icon').appendChild(wechat.cloneNode(true));
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  function close(restoreFocus) {
    if (!opened) return;
    opened = false;
    sheet.classList.add('hidden');
    trigger.setAttribute('aria-expanded', 'false');
    background.forEach(function (item) { item[0].inert = item[1]; });
    background = [];
    if (restoreFocus !== false && !detail.classList.contains('hidden')) trigger.focus({ preventScroll: true });
  }
  trigger.addEventListener('click', function () {
    if (opened || detail.classList.contains('hidden')) return;
    var title = detail.querySelector('.space-detail-price-title').textContent.trim();
    sheet.querySelector('h3').textContent = title || document.getElementById('space-detail-title').textContent;
    sheet.querySelector('.space-share-copy p').textContent = document.getElementById('space-detail-meta').textContent;
    sheet.querySelector('.space-share-copy strong').textContent = '¥' + document.getElementById('space-detail-price').textContent + '/天/m²起';
    var cover = detail.querySelector('#space-detail-track img');
    sheet.querySelector('.space-share-cover').src = cover.src;
    status.hidden = true; status.textContent = '';
    background = Array.from(phone.children).filter(function (node) { return node !== sheet; }).map(function (node) {
      var previous = node.inert; node.inert = true; return [node, previous];
    });
    opened = true;
    sheet.classList.remove('hidden');
    trigger.setAttribute('aria-expanded', 'true');
    closeButton.focus({ preventScroll: true });
  });
  closeButton.onclick = function () { close(); };
  sheet.querySelector('.space-share-cancel').onclick = function () { close(); };
  sheet.querySelector('.space-share-mask').onclick = function () { close(); };
  sheet.querySelector('.space-share-wechat').onclick = function () {
    // H5 cannot invoke a Mini Program's open-type="share" capability.
    status.textContent = '浏览器无法直接发送微信小程序卡片。请在微信小程序中打开该房源，点击“分享至微信”，选择好友后发送。';
    status.hidden = false;
  };
  document.addEventListener('keydown', function (event) {
    if (!opened) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
    else if (event.key === 'Tab') {
      var buttons = Array.from(panel.querySelectorAll('button'));
      var index = buttons.indexOf(document.activeElement);
      event.preventDefault();
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    }
  }, true);
  new MutationObserver(function () {
    if (detail.classList.contains('hidden')) close(false);
  }).observe(detail, { attributes: true, attributeFilter: ['class'] });
  if (window.lucide) lucide.createIcons();
})();
