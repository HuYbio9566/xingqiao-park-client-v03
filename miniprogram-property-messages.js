/* Property-side local workspace; no network delivery or automatic replies. */
(function () {
  // Same format as miniprogram-messages.js; used if that script has not set window.__messageTime yet.
  function messageTime(at) {
    if (window.__messageTime) return window.__messageTime(at);
    if (!at) return '';
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var date = new Date(at), today = new Date(); today.setHours(0, 0, 0, 0);
    if (date >= today) return pad(date.getHours()) + ':' + pad(date.getMinutes());
    if (date >= today - 86400000) return '昨天';
    return pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }
  var list = document.getElementById('messages');
  var profile = document.getElementById('profile');
  var screen = document.querySelector('.screen');
  if (!list || !profile || !screen || window.__propertyMessages) return;
  var key = 'park-property-messages-v1-property';
  var contacts = [
    { id: 'enterprise-repair', name: '星桥科技 · 刘女士', kind: '企业联系', context: 'A 座 605 室 · 空调报修', at: '09:35', text: '办公室空调制冷不正常，下午有客户来访，请问可以安排人员检查吗？' },
    { id: 'enterprise-meeting', name: '云启研发 · 陈先生', kind: '企业联系', context: '公共会议室 · 设备协助', at: '09:20', text: '下午的会议需要使用投屏设备，能否提前协助检查连接？' },
    { id: 'visitor-access', name: '张先生', kind: '访客联系', context: 'A 座来访 · 车辆通行', at: '09:10', text: '我来拜访 A 座的企业，已提交访客登记，车辆到门口后需要出示什么信息？' }
  ];
  var notices = [
    { id: 'equipment', at: function () { var n = new Date(); return Math.min(new Date(n.getFullYear(), n.getMonth(), n.getDate(), 8, 30).getTime(), Date.now() - 20 * 60000); }, title: '会议室设备巡检提醒', text: '交班前请核对公共会议室投屏设备与照明情况。发现异常时记录位置和故障现象，交由值班人员跟进。' },
    { id: 'handover', at: function () { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1, 18).getTime(); }, title: '访客通行交班提醒', text: '交班时请核对待到访登记与企业接待联系人。车辆通行问题需核实登记信息，不在消息中收集身份证照片。' }
  ];
  var state = { threads: {}, readNotices: [] };
  var active = null, mounted = false, storageFailed = false;
  var leasingRole = null;
  var clientRoles = [{ id: 'guest', name: '未认证访客', identity: '未认证访客' }, { id: 'employee', name: '王晓明', identity: '企业员工' }, { id: 'admin', name: '唐慧丽', identity: '企业管理员' }];
  function leasingData(role) {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem('park-message-journey-v1-' + role) || '{}') || {}; } catch (e) {}
    var data = Object.assign({ read: [], chat: [], draft: '', context: 'A 座 320m² 研发办公空间', consultants: {} }, saved);
    data.chat = Array.isArray(data.chat) ? data.chat.filter(function (m) { return m && typeof m.text === 'string' && typeof m.self === 'boolean'; }) : [];
    data.read = Array.isArray(data.read) ? data.read : [];
    data.propertyDraft = typeof data.propertyDraft === 'string' ? data.propertyDraft : '';
    return data;
  }
  function leasingHistory(data, role) { return data.chat.length ? data.chat : window.__messageJourney.sampleHistory(role); }
  // Enterprise admin uses a portrait; other client roles keep the text badge.
  function leasingAvatar(id) { return id === 'admin' ? '<img class="manager-avatar-image" src="miniprogram/assets/admin-tang.png" alt="">' : (id === 'guest' ? '访' : '企'); }
  function leasingList() {
    return '<ul class="message-list property-leasing-list">' + clientRoles.map(function (client) {
      var data = leasingData(client.id), history = leasingHistory(data, client.id), last = history[history.length - 1];
      return '<li><button type="button" class="message-card" data-property-leasing="' + client.id + '" data-at="' + (last.at || 0) + '"><span class="message-avatar message-avatar-person" aria-hidden="true">' + leasingAvatar(client.id) + '</span><span class="message-copy"><span class="message-row-head"><strong>' + client.name + ' · ' + client.identity + '</strong><time>' + messageTime(last.at) + '</time></span><span class="message-preview">' + escape(data.propertyDraft ? '草稿：' + data.propertyDraft : last.text) + '</span></span>' + (last.self && history.length > (data.propertyReadCount || 0) ? '<i class="message-unread" aria-hidden="true"></i>' : '') + '</button></li>';
    }).join('') + '</ul>';
  }
  var originals = document.createDocumentFragment();
  var inbox = document.createElement('div'); inbox.className = 'property-message-workspace';
  var smartEntry = list.querySelector('.message-smart-entry');
  var noticeList = document.createElement('section'); noticeList.id = 'property-service-notices'; noticeList.className = 'hidden message-category-page';
  noticeList.innerHTML = '<ul class="category-message-list" aria-label="物业通知列表"></ul>';
  window.__setMiniRoute(noticeList.id, '通知', 'messages');
  var chat = document.createElement('section'); chat.id = 'property-service-chat'; chat.className = 'hidden leasing-chat property-service-chat';
  chat.innerHTML = '<header class="chat-agent"><span class="chat-avatar" aria-hidden="true">企</span><div class="chat-agent-copy"><strong></strong><p></p></div></header><p class="property-local-note">物业回复 · 本地工作记录，未连接消息后台</p><div class="chat-messages" role="log" aria-live="polite" aria-label="企业与访客联系记录" tabindex="0"></div><form class="chat-composer"><div class="property-image-preview" hidden><img alt="待发送图片"><span></span><button type="button" aria-label="移除图片">移除</button></div><div class="chat-input-row"><button class="chat-attach" type="button" aria-label="上传图片" title="上传图片"><i data-lucide="plus" aria-hidden="true"></i></button><input class="chat-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="选择回复图片" hidden><textarea rows="2" maxlength="500" aria-label="物业回复内容" aria-describedby="property-reply-status" placeholder="填写处理安排或需要核实的信息"></textarea><button type="submit" class="chat-send" disabled>保存回复</button></div><p id="property-reply-status" class="chat-status" role="status"></p></form>';
  var detail = document.createElement('section'); detail.id = 'property-service-notice'; detail.className = 'hidden message-detail-page message-notice-detail property-service-notice';
  detail.innerHTML = '<article class="journey-panel"><span class="journey-kicker">园区服务</span><h1 tabindex="-1"></h1><p class="journey-meta">园区服务中心</p><p data-notice-text></p></article>';
  screen.append(chat, detail);
  window.__setMiniRoute(chat.id, '联系回复', 'messages');
  window.__setMiniRoute(detail.id, '园区服务通知', 'messages');
  var input = chat.querySelector('textarea'), send = chat.querySelector('.chat-send'), status = chat.querySelector('[role="status"]');
  var fileInput = chat.querySelector('.chat-image-input'), attach = chat.querySelector('.chat-attach'), preview = chat.querySelector('.property-image-preview');
  var selectedImage = null, readingImage = false, imageVersion = 0;
  if (window.lucide) window.lucide.createIcons();
  function updateSend() { send.disabled = readingImage || (!input.value.trim() && !selectedImage); }
  function clearImage() {
    imageVersion++; selectedImage = null; readingImage = false; fileInput.value = ''; attach.disabled = false;
    preview.hidden = true; preview.querySelector('img').removeAttribute('src'); preview.querySelector('span').textContent = ''; updateSend();
  }
  function imageMarkup(message) {
    return /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(message.image || '') ? '<img class="chat-message-image" src="' + message.image + '" alt="回复图片">' : '';
  }
  attach.addEventListener('click', function () { if (property() && (leasingRole || active)) fileInput.click(); });
  preview.querySelector('button').addEventListener('click', function () { clearImage(); status.textContent = '图片已移除。'; attach.focus(); });
  fileInput.addEventListener('change', function () {
    var file = fileInput.files[0];
    if (!file || !property() || (!leasingRole && !active) || chat.classList.contains('hidden')) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { status.textContent = '请选择 PNG、JPG、WebP 或 GIF 图片。'; fileInput.value = ''; return; }
    if (file.size > 2 * 1024 * 1024) { status.textContent = '图片不能超过 2MB，请压缩后重试。'; fileInput.value = ''; return; }
    var version = ++imageVersion, reader = new FileReader();
    readingImage = true; attach.disabled = true; updateSend(); status.textContent = '正在读取图片…';
    reader.onload = function () {
      // Ignore a late file read after leaving the conversation or changing roles.
      if (version !== imageVersion) return;
      readingImage = false; attach.disabled = false; selectedImage = { src: reader.result, name: file.name };
      preview.querySelector('img').src = selectedImage.src; preview.querySelector('span').textContent = file.name; preview.hidden = false;
      fileInput.value = ''; updateSend(); status.textContent = '图片已添加，可填写文字后回复，也可直接发送图片。';
    };
    reader.onerror = function () { if (version !== imageVersion) return; readingImage = false; attach.disabled = false; fileInput.value = ''; updateSend(); status.textContent = '图片读取失败，请重新选择。'; };
    reader.readAsDataURL(file);
  });
  function property() { return profile.dataset.role === 'property'; }
  function escape(text) { return String(text).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function thread(id) {
    if (!state.threads[id]) state.threads[id] = { read: false, draft: '', replies: [] };
    return state.threads[id];
  }
  function load() {
    state = { threads: {}, readNotices: [] }; storageFailed = false;
    try {
      var saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (!saved || typeof saved !== 'object') return;
      state.readNotices = Array.isArray(saved.readNotices) ? saved.readNotices.filter(function (id) { return notices.some(function (n) { return n.id === id; }); }) : [];
      contacts.forEach(function (c) {
        var t = saved.threads && saved.threads[c.id];
        if (!t || typeof t !== 'object') return;
        state.threads[c.id] = { read: t.read === true, draft: typeof t.draft === 'string' ? t.draft.slice(0, 500) : '', replies: Array.isArray(t.replies) ? t.replies.filter(function (m) { return m && typeof m.text === 'string' && Number.isFinite(m.at); }).map(function (m) { return { text: m.text.slice(0, 500), at: m.at, image: imageMarkup(m) ? m.image : undefined }; }) : [] };
      });
    } catch (error) { storageFailed = true; }
  }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(state)); storageFailed = false; return true; }
    catch (error) { storageFailed = true; return false; }
  }
  function syncBadge() { if (window.__syncMessageUnread) window.__syncMessageUnread(); }
  function renderInbox() {
    var unreadNotices = notices.filter(function (n) { return !state.readNotices.includes(n.id); }).length;
    inbox.innerHTML = '<div class="message-categories" role="group" aria-label="通知入口"><button type="button" class="message-card" data-property-notices data-at="' + notices[0].at() + '" aria-controls="property-service-notices"><span class="category-icon" aria-hidden="true"><img src="miniprogram/assets/icons/message-notice.svg?v=20261009-white" alt=""><b' + (unreadNotices ? '' : ' hidden') + '>' + unreadNotices + '</b></span><span class="message-copy"><span class="message-row-head"><strong>通知</strong><time>' + messageTime(notices[0].at()) + '</time></span><span class="message-preview">' + escape(notices[0].title) + '</span></span>' + (unreadNotices ? '<i class="message-unread" aria-hidden="true"></i>' : '') + '</button></div><h2 class="message-group-title">对话 <span>3 个会话</span></h2>' + leasingList() + (storageFailed ? '<p class="journey-warning" role="status">本地存储不可用，刷新后记录可能丢失。</p>' : '');
    // Move the original smart entry with its listeners and role-isolated records.
    if (smartEntry) { inbox.querySelector('.message-categories').after(smartEntry); }
    noticeList.querySelector('ul').innerHTML = notices.map(function (n) {
      return '<li><button type="button" class="category-entry" data-property-notice="' + n.id + '"><span class="category-kind">物业通知</span><strong>' + escape(n.title) + '</strong><span class="category-preview">' + escape(n.text) + '</span>' + (!state.readNotices.includes(n.id) ? '<i class="category-unread" aria-label="未读"></i>' : '') + '</button></li>';
    }).join('');
    if (mounted) syncBadge();
    window.dispatchEvent(new Event('property-message-change'));
  }
  function renderChat() {
    if (leasingRole) {
      var data = leasingData(leasingRole), client = clientRoles.find(function (c) { return c.id === leasingRole; });
      chat.querySelector('strong').textContent = client.name;
      chat.querySelector('.chat-agent-copy p').textContent = client.identity + ' · ' + data.context;
      chat.querySelector('.chat-avatar').innerHTML = leasingAvatar(leasingRole);
      chat.querySelector('.property-local-note').textContent = '会话仅保存在本设备，对方暂不会收到';
      chat.querySelector('.chat-messages').innerHTML = leasingHistory(data, leasingRole).map(function (m) {
        // Counterpart (client) rows carry an avatar like the customer-side chat; own replies do not.
        var when = m.at ? ' · ' + new Date(m.at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
        return '<article class="chat-message' + (!m.self ? ' is-self' : '') + '">' + (m.self ? '<span class="chat-avatar" aria-hidden="true">' + leasingAvatar(leasingRole) + '</span>' : '') + '<div class="chat-message-copy"><span class="chat-message-meta">' + escape((m.self ? client.name + ' · ' + client.identity : '我 · 物业人员') + when) + '</span><p class="chat-bubble">' + (m.text === '[图片]' && m.image ? '' : escape(m.text)) + imageMarkup(m) + '</p></div></article>';
      }).join('');
      input.value = data.propertyDraft || ''; updateSend(); send.textContent = '回复';
      var leasingLog = chat.querySelector('.chat-messages'); leasingLog.scrollTop = leasingLog.scrollHeight;
      status.textContent = '当前身份：物业人员。回复仅在本机对应身份的对话中显示，未连接消息后台。'; return;
    }
    chat.querySelector('.property-local-note').textContent = '物业回复 · 本地工作记录，未连接消息后台'; send.textContent = '保存回复';
    var c = contacts.find(function (item) { return item.id === active; }), t = thread(active);
    chat.querySelector('strong').textContent = c.name;
    chat.querySelector('.chat-agent-copy p').textContent = c.kind + ' · ' + c.context;
    chat.querySelector('.chat-avatar').textContent = c.kind === '访客联系' ? '访' : '企';
    var log = chat.querySelector('.chat-messages');
    log.innerHTML = '<article class="chat-message"><div class="chat-message-copy"><span class="chat-message-meta">' + escape(c.name) + ' · ' + c.at + '</span><p class="chat-bubble">' + escape(c.text) + '</p></div></article>' + t.replies.map(function (m) {
      return '<article class="chat-message is-self"><div class="chat-message-copy"><span class="chat-message-meta">物业服务 · ' + new Date(m.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) + '</span><p class="chat-bubble">' + (m.text === '[图片]' && m.image ? '' : escape(m.text)) + imageMarkup(m) + '</p><span class="property-send-state">已保存本地 · 待送达</span></div></article>';
    }).join('');
    input.value = t.draft; updateSend();
    status.textContent = storageFailed ? '本地存储不可用，刷新后记录可能丢失。' : '填写后保存到本机，不代表对方已收到。';
    log.scrollTop = log.scrollHeight;
  }
  function open(id) {
    if (!property()) return false;
    syncRole();
    if (!id) { window.__showMiniPage('messages'); return true; }
    if (!contacts.some(function (c) { return c.id === id; })) return false;
    clearImage(); leasingRole = null; active = id; thread(id).read = true; save(); renderInbox(); renderChat();
    window.__showMiniPage(chat.id); input.focus(); return true;
  }
  // Retain original nodes and their listeners rather than cloning the customer's inbox.
  function syncRole() {
    if (property() && !mounted) {
      load();
      while (list.firstChild) originals.appendChild(list.firstChild);
      mounted = true; list.appendChild(inbox); screen.appendChild(noticeList); list.classList.add('property-messages-page'); renderInbox();
    } else if (!property() && mounted) {
      var inside = !chat.classList.contains('hidden') || !detail.classList.contains('hidden') || !noticeList.classList.contains('hidden');
      clearImage(); mounted = false; active = null; leasingRole = null; input.value = ''; send.disabled = true;
      chat.querySelector('.chat-messages').replaceChildren();
      chat.querySelector('strong').textContent = ''; chat.querySelector('.chat-agent-copy p').textContent = '';
      detail.querySelector('h1').textContent = ''; detail.querySelector('[data-notice-text]').textContent = '';
      if (smartEntry) originals.appendChild(smartEntry);
      inbox.remove(); noticeList.remove(); list.appendChild(originals); list.classList.remove('property-messages-page');
      var cats = list.querySelector(':scope > .message-categories'); if (smartEntry && cats) cats.after(smartEntry);
      syncBadge();
      if (inside) window.__showMiniPage('messages');
    }
  }
  inbox.addEventListener('click', function (event) {
    event.stopPropagation();
    if (!property()) return;
    var leasing = event.target.closest('[data-property-leasing]');
    if (leasing) { clearImage(); leasingRole = leasing.dataset.propertyLeasing; active = null; var data = leasingData(leasingRole); data.propertyReadCount = leasingHistory(data, leasingRole).length; try { localStorage.setItem('park-message-journey-v1-' + leasingRole, JSON.stringify(data)); } catch (e) { storageFailed = true; } renderInbox(); renderChat(); window.__showMiniPage(chat.id); input.focus(); return; }
    if (event.target.closest('[data-property-notices]')) { window.__showMiniPage(noticeList.id); return; }
    var contact = event.target.closest('[data-property-contact]');
    if (contact) { open(contact.dataset.propertyContact); return; }
  });
  noticeList.addEventListener('click', function (event) {
    if (!property()) return;
    var notification = event.target.closest('[data-property-notice]');
    if (!notification) return;
    var n = notices.find(function (item) { return item.id === notification.dataset.propertyNotice; });
    if (!state.readNotices.includes(n.id)) state.readNotices.push(n.id);
    save(); renderInbox(); detail.querySelector('h1').textContent = n.title; detail.querySelector('[data-notice-text]').textContent = n.text;
    window.__setMiniRoute(detail.id, '园区服务通知', noticeList.id);
    window.__showMiniPage(detail.id); detail.querySelector('h1').focus();
  });
  input.addEventListener('input', function () {
    if (property() && leasingRole) { var data = leasingData(leasingRole); data.propertyDraft = input.value; try { localStorage.setItem('park-message-journey-v1-' + leasingRole, JSON.stringify(data)); } catch (e) { status.textContent = '草稿无法保存。'; } updateSend(); renderInbox(); return; }
    if (!property() || !active) return;
    thread(active).draft = input.value.slice(0, 500); save(); updateSend(); renderInbox();
    status.textContent = storageFailed ? '草稿无法保存到本机，刷新后可能丢失。' : '草稿已保存到本机；回复尚未送达对方。';
  });
  chat.querySelector('form').addEventListener('submit', function (event) {
    event.preventDefault();
    if (readingImage) return;
    if (property() && leasingRole && (input.value.trim() || selectedImage)) {
      var data = leasingData(leasingRole); data.chat = leasingHistory(data, leasingRole).slice();
      var identity = window.__roleWorkflows && window.__roleWorkflows.propertyIdentity();
      data.chat.push({ text: input.value.trim().slice(0, 500) || '[图片]', image: selectedImage ? selectedImage.src : undefined, self: false, senderRole: 'property', senderName: typeof identity === 'string' ? identity : '物业人员', at: Date.now() }); data.propertyDraft = ''; data.propertyReadCount = data.chat.length;
      data.read = data.read.filter(function (id) { return id !== '招商空间咨询'; });
      try { localStorage.setItem('park-message-journey-v1-' + leasingRole, JSON.stringify(data)); } catch (e) { status.textContent = '回复保存失败，请重试。'; return; }
      clearImage(); renderChat(); renderInbox(); window.dispatchEvent(new Event('leasing-message-change')); return;
    }
    if (!property() || !active || (!input.value.trim() && !selectedImage)) return;
    var t = thread(active), draft = input.value; t.replies.push({ text: draft.trim().slice(0, 500) || '[图片]', image: selectedImage ? selectedImage.src : undefined, at: Date.now() }); t.draft = '';
    if (!save()) { t.replies.pop(); t.draft = draft; status.textContent = '回复保存失败，内容已保留，请重试；尚未送达对方。'; return; }
    clearImage(); renderInbox(); renderChat();
    status.textContent = '回复已保存本地，待送达；对方尚未收到。';
    input.focus();
  });
  new MutationObserver(syncRole).observe(profile, { attributes: true, attributeFilter: ['data-role'] });
  new MutationObserver(function () { if (chat.classList.contains('hidden')) clearImage(); }).observe(chat, { attributes: true, attributeFilter: ['class'] });
  // Existing navigation also calls a closed-over show(); observe sections to guard those paths.
  new MutationObserver(function () {
    if (!property() && (!chat.classList.contains('hidden') || !detail.classList.contains('hidden') || !noticeList.classList.contains('hidden'))) window.__showMiniPage('messages');
  }).observe(screen, { subtree: true, attributes: true, attributeFilter: ['class'] });
  window.__propertyMessages = { open: open, clearUnread: function () {
    if (!property()) return;
    clientRoles.forEach(function (client) { var data = leasingData(client.id); data.propertyReadCount = leasingHistory(data, client.id).length; try { localStorage.setItem('park-message-journey-v1-' + client.id, JSON.stringify(data)); } catch (e) { storageFailed = true; } });
    contacts.forEach(function (c) { thread(c.id).read = true; });
    state.readNotices = notices.map(function (n) { return n.id; }); save(); renderInbox();
  }, pendingCount: function () { return contacts.length; } };
  window.addEventListener('leasing-message-change', function () { if (mounted) { renderInbox(); if (leasingRole && !chat.classList.contains('hidden')) renderChat(); } });
  window.addEventListener('storage', function (event) { if (event.key && event.key.indexOf('park-message-journey-v1-') === 0 && mounted) { renderInbox(); if (leasingRole) renderChat(); } });
  syncRole();
})();
