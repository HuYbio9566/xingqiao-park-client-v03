/* V4-only module switches and published mini-program content adapters. */
(function (window) {
  'use strict';

  var MODULE_IDS = [
    'home-banner', 'home-entries', 'home-services', 'home-notices', 'home-activities', 'home-ad', 'home-social', 'home-featured',
    'spaces-list', 'spaces-consult', 'enterprise-services', 'enterprise-banner', 'enterprise-policies', 'enterprise-activities', 'enterprise-news',
    'messages-notices', 'messages-chat', 'messages-assistant', 'profile-info', 'profile-services', 'profile-system'
  ];
  var DEFAULT_MODULES = MODULE_IDS.reduce(function (result, id) { result[id] = true; return result; }, {});
  var NEWS_FALLBACK_COVERS = [
    'miniprogram/assets/home-event-salon.png',
    'miniprogram/assets/home-event-exchange.png'
  ];
  // 小程序身份 -> 后台「个人资料配置」的身份选项。
  var PROFILE_IDENTITIES = {
    unauthenticated: '未登录用户', guest: '未认证访客',
    employee: '企业员工', admin: '企业管理员', property: '物业人员'
  };

  function normalizeConfig(payload) {
    var modules = Object.assign({}, DEFAULT_MODULES);
    var supplied = payload && payload.item && payload.item.modules;
    if (supplied && typeof supplied === 'object') MODULE_IDS.forEach(function (id) { if (typeof supplied[id] === 'boolean') modules[id] = supplied[id]; });
    return { version: payload && payload.item && payload.item.version ? String(payload.item.version) : 'v4-default', modules: modules };
  }

  function safeUrl(value, options) {
    var text = String(value == null ? '' : value).trim();
    if (!text || /[\u0000-\u0020\\]/.test(text)) return '';
    try {
      var url = new URL(text, 'https://v4.invalid/mini/versions/v4/');
      var pathname = decodeURIComponent(url.pathname);
      if (!/^https?:$/.test(url.protocol) || /\/versions\/v[23](?:\/|$)|miniprogram-view-v[23]\.html/i.test(pathname)) return '';
      if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^https?:/i.test(text)) return '';
      return text;
    } catch (error) { return ''; }
  }

  function published(items) {
    return (Array.isArray(items) ? items : []).filter(function (item) {
      return item && ['online', 'enabled'].indexOf(item.status) !== -1;
    }).slice().sort(function (a, b) { return (Number(a.sort) || 0) - (Number(b.sort) || 0); });
  }

  function safePhone(value) {
    var text = String(value == null ? '' : value).trim();
    return /^\+?[0-9][0-9 -]{5,24}$/.test(text) ? text.replace(/[ -]/g, '') : '';
  }

  function resolveNewsCover(item, index) {
    var cover = safeUrl(item && item.cover, { image: true });
    return cover || NEWS_FALLBACK_COVERS[index % NEWS_FALLBACK_COVERS.length];
  }

  window.__v4ModuleControl = {
    moduleIds: MODULE_IDS.slice(),
    defaultModules: Object.assign({}, DEFAULT_MODULES),
    normalizeConfig: normalizeConfig,
    safeUrl: safeUrl,
    resolveNewsCover: resolveNewsCover,
    safePhone: safePhone,
    published: published
  };

  if (typeof document === 'undefined') return;

  var api = window.__parkContent;
  var base = api && api.base ? api.base : (location.origin + '/api');
  var miniKey = String(window.PARK_ADMIN_MINI_KEY || 'local-mini-key');
  var config = normalizeConfig();
  var statusNode;
  var socialData = [];
  var consultData = null;
  var contentSignature = '';
  var pendingConfig;
  var adOriginal;
  var socialOriginal;
  var newsItems = [];
  var newsOriginal;
  var newsSignature = '';
  var profileRows = [];

  function mark(node, id) {
    if (node) {
      var tokens = (node.getAttribute('data-v4-module') || '').split(' ').filter(Boolean);
      if (tokens.indexOf(id) < 0) node.setAttribute('data-v4-module', tokens.concat(id).join(' '));
    }
    return node;
  }

  function roots(id) {
    var found = [];
    function add(node) { if (node && found.indexOf(node) < 0) found.push(node); }
    var home = document.getElementById('home');
    var spaces = document.getElementById('spaces');
    var enterprise = document.getElementById('enterprise-services');
    var messages = document.getElementById('messages');
    var profile = document.getElementById('profile');
    if (id === 'home-banner') add(home && home.querySelector('.home-new-hero'));
    // 金刚区: the four main entries (visitor, venue, park intro, smart assistant) below the banner.
    if (id === 'home-entries') add(home && home.querySelector('.home-new-quick'));
    // 服务入口: the park service grid.
    if (id === 'home-services') add(document.getElementById('home-park-services'));
    if (id === 'home-notices' || id === 'home-activities') {
      Array.prototype.forEach.call(document.querySelectorAll('#home .home-new-card'), function (node) {
        var heading = node.querySelector('.home-new-head h2');
        if (!heading) return;
        if (id === 'home-notices' && /园区公告/.test(heading.textContent)) add(node);
        if (id === 'home-activities' && /活动资讯/.test(heading.textContent)) add(node);
      });
    }
    if (id === 'home-ad') add(home && home.querySelector('.home-new-find'));
    if (id === 'home-social') add(document.getElementById('home-social-media'));
    if (id === 'home-featured') add(document.getElementById('home-featured-spaces'));
    if (id === 'spaces-list') {
      add(spaces && spaces.querySelector('.space-finder'));
      add(spaces && (spaces.querySelector('.space-finder-results') || spaces.querySelector('.space-finder-list')));
    }
    if (id === 'spaces-consult') {
      // 共用的留言弹窗（contact-modal / wechat-modal）不随客服弹窗开关隐藏，否则预约看房点击无反应。
      Array.prototype.forEach.call(document.querySelectorAll('.space-finder-consult, #space-contact-open, #home-consult-open, #space-detail .manager-inline, #space-call, [data-profile-entry="空间咨询"], #park-intro [data-page="leasing-chat"]'), add);
    }
    // The live service directory is a separate page, not the five-tab enterprise page.
    if (id === 'enterprise-services') {
      add(document.getElementById('enterprise-catalog'));
      Array.prototype.forEach.call(document.querySelectorAll('[data-page="enterprise-catalog"], #enterprise-services .enterprise-gpt-service-card, #enterprise-services [data-enterprise-list="政策服务"]'), add);
    }
    if (id === 'enterprise-banner') add(enterprise && enterprise.querySelector('.enterprise-gpt-hero'));
    if (id === 'enterprise-policies') add(enterprise && enterprise.querySelector('.enterprise-gpt-logo-card'));
    if (id === 'enterprise-activities') add(enterprise && enterprise.querySelector('.enterprise-gpt-events'));
    if (id === 'enterprise-news') add(enterprise && enterprise.querySelector('.enterprise-gpt-news'));
    if (/^enterprise-(policies|activities|news)$/.test(id) && enterprise) {
      var labels = { 'enterprise-policies': '政策服务', 'enterprise-activities': '园区活动', 'enterprise-news': '精选资讯' };
      enterprise.querySelectorAll('.enterprise-gpt-section-head').forEach(function (head) {
        var title = head.querySelector('h2');
        if (title && title.textContent.trim() === labels[id]) add(head);
      });
    }
    if (id === 'messages-notices') add(messages && messages.querySelector('.message-categories'));
    if (id === 'messages-assistant') add(messages && messages.querySelector('.message-smart-entry'));
    if (id === 'messages-chat') {
      add(messages && messages.querySelector('#message-conversations-title'));
      if (messages) messages.querySelectorAll('[data-property-leasing], [data-property-chat]').forEach(add);
    }
    if (id === 'messages-notices' && messages) {
      messages.querySelectorAll('.property-message-workspace .message-categories, .property-message-workspace .message-group-title').forEach(add);
    }
    // Keep the identity card and authorization controls available at all times.
    if (id === 'profile-info') {
      add(profile && profile.querySelector('.mp-profile-copy'));
      add(profile && profile.querySelector('[data-profile-entry="个人信息"]'));
    }
    if (id === 'profile-services') {
      add(profile && profile.querySelector('.mp-my-services'));
      add(profile && profile.querySelector('[data-profile-todos]'));
    }
    // 系统资料: privacy & authorization, customer service and about-us card.
    if (id === 'profile-system') add(profile && profile.querySelector('.mp-other'));
    return found;
  }

  function applyModules() {
    MODULE_IDS.forEach(function (id) {
      roots(id).forEach(function (node, index) {
        mark(node, id);
        if (index === 0) node.setAttribute('data-v4-module-root', id);
      });
    });
    document.querySelectorAll('[data-v4-module]').forEach(function (node) {
      var disabled = node.getAttribute('data-v4-module').split(' ').some(function (id) { return config.modules[id] === false; });
      if (disabled && !node.hasAttribute('data-v4-disabled')) node.setAttribute('data-v4-disabled', '');
      if (!disabled && node.hasAttribute('data-v4-disabled')) node.removeAttribute('data-v4-disabled');
    });
    applyPropertyWorkbench();
  }

  // 后台「个人资料配置」的物业工作台开关：按当前身份对应的那一行决定是否展示物业工作台卡片。
  function profileRow(role) {
    var identity = PROFILE_IDENTITIES[role];
    if (!identity) return null;
    return profileRows.filter(function (item) { return item && item.identity === identity; })[0] || null;
  }

  function applyPropertyWorkbench() {
    var profile = document.getElementById('profile');
    if (!profile) return;
    var card = profile.querySelector('.mp-my-services');
    if (!card) return;
    var row = profileRow(profile.dataset.role || 'guest');
    // 开关缺失时保持原有按角色展示的行为，只有后台明确关闭才隐藏。
    var off = profile.dataset.role === 'property' && !!row && row.propertyWorkbench === false;
    if (off) card.setAttribute('data-v4-property-workbench', 'off');
    else card.removeAttribute('data-v4-property-workbench');
  }

  function showStatus(message) {
    if (!statusNode) {
      statusNode = document.createElement('p');
      statusNode.id = 'v4-module-status';
      statusNode.className = 'v4-module-status';
      statusNode.setAttribute('role', 'status');
      var phone = document.querySelector('.phone');
      if (phone) phone.appendChild(statusNode);
    }
    if (statusNode.textContent !== message) statusNode.textContent = message;
    statusNode.hidden = !message || !new URLSearchParams(location.search).has('debug');
    document.querySelector('[data-v4-root]').dataset.v4ConfigState = message ? 'error' : 'ready';
  }

  function renderAd(items) {
    var item = published(items)[0];
    var button = document.querySelector('#home .home-new-find button');
    if (!button) return;
    var image = button.querySelector('img');
    if (!adOriginal) adOriginal = { src: image && image.getAttribute('src'), alt: image && image.alt, label: button.getAttribute('aria-label') };
    delete button.dataset.v4AdLink;
    if (image) { image.src = adOriginal.src; image.alt = adOriginal.alt; }
    button.setAttribute('aria-label', adOriginal.label);
    if (!item) return;
    var source = safeUrl(item.image, { image: true });
    if (image && source) { image.src = source; image.alt = String(item.title || '帮我选址广告'); }
    if (item.title) button.setAttribute('aria-label', String(item.title));
    var link = safeUrl(item.link);
    if (link) button.dataset.v4AdLink = link;
  }

  function renderHomeNews(items) {
    var signature = JSON.stringify(items || []);
    if (signature === newsSignature) return;
    newsSignature = signature;
    var list = document.querySelector('#home .home-new-events');
    if (!list) return;
    if (!newsOriginal) newsOriginal = Array.prototype.slice.call(list.childNodes);
    newsItems = published(items);
    if (!newsItems.length) { list.replaceChildren.apply(list, newsOriginal); return; }
    var cards = newsItems.slice(0, 3).map(function (item, index) {
      var card = document.createElement('button'); card.type = 'button'; card.className = 'home-new-event';
      card.dataset.v4News = String(index);
      var image = document.createElement('img');
      image.src = resolveNewsCover(item, index);
      image.alt = String(item.title || '资讯');
      card.appendChild(image);
      var title = document.createElement('strong'); title.className = 'home-new-event-title'; title.textContent = String(item.title || '园区资讯');
      var date = document.createElement('time'); date.textContent = String(item.publishDate || '').slice(0, 10); card.append(title, date);
      return card;
    });
    list.replaceChildren.apply(list, cards);
  }

  function openHomeNews(index) {
    var item = newsItems[index];
    if (!item) return;
    var article = document.getElementById('v4-news-article');
    if (!article) { article = document.createElement('section'); article.id = 'v4-news-article'; article.className = 'hidden v4-news-article'; document.querySelector('.screen').appendChild(article); }
    var title = document.createElement('h1'); title.textContent = String(item.title || '园区资讯');
    var meta = document.createElement('p'); meta.className = 'muted'; meta.textContent = [item.publishDate, item.source].filter(Boolean).join(' · ');
    var body = document.createElement('div'); body.className = 'v4-news-body'; body.textContent = String(item.content || item.summary || '暂无正文');
    article.replaceChildren(title, meta, body);
    if (window.__setMiniRoute) window.__setMiniRoute(article.id, '资讯详情', 'home');
    if (window.__showMiniPage) window.__showMiniPage(article.id);
  }

  // 系统资料 card: rows follow the enabled entries of 个人中心 → 系统资料.
  var SYSTEM_ICONS = { '隐私与授权': 'shield-check', '用户协议': 'file-text', '关于我们': 'info', '联系客服': 'headset', '账号注销': 'user-x' };
  var SYSTEM_ORDER = ['隐私与授权', '用户协议', '关于我们', '联系客服', '账号注销'];
  var systemOriginal;
  function renderProfileSystem(items) {
    var grid = document.querySelector('#profile .mp-other .mp-service-grid');
    if (!grid) return;
    if (!systemOriginal) systemOriginal = Array.prototype.slice.call(grid.childNodes);
    var rows = published(items).filter(function (item) { return SYSTEM_ICONS[item.section]; })
      .sort(function (a, b) { return SYSTEM_ORDER.indexOf(a.section) - SYSTEM_ORDER.indexOf(b.section); });
    if (!rows.length) { grid.replaceChildren.apply(grid, systemOriginal); return; }
    grid.replaceChildren.apply(grid, rows.map(function (item) {
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'mp-service-item';
      button.dataset.profileEntry = item.section; button.dataset.permission = 'public';
      var iconBox = document.createElement('span'); iconBox.className = 'mp-icon-box';
      var icon = document.createElement('i'); icon.dataset.lucide = SYSTEM_ICONS[item.section]; icon.setAttribute('aria-hidden', 'true');
      iconBox.appendChild(icon);
      var text = document.createElement('div'); text.className = 'mp-service-text';
      var title = document.createElement('div'); title.className = 'mp-service-title'; title.textContent = item.section;
      var desc = document.createElement('div'); desc.className = 'mp-service-desc'; desc.textContent = String(item.subtitle || item.title || '');
      text.append(title, desc);
      var arrow = document.createElement('span'); arrow.className = 'mp-arrow';
      var chevron = document.createElement('i'); chevron.dataset.lucide = 'chevron-right'; chevron.setAttribute('aria-hidden', 'true');
      arrow.appendChild(chevron);
      button.append(iconBox, text, arrow);
      return button;
    }));
    if (window.lucide) window.lucide.createIcons();
  }

  function renderSocial(items) {
    socialData = published(items).filter(function (item) { return item.name && (safeUrl(item.link) || safeUrl(item.qrImage)); });
    var grid = document.querySelector('#home-social-media .social-media-grid');
    if (!grid) return;
    if (!socialOriginal) socialOriginal = Array.prototype.slice.call(grid.childNodes);
    if (!socialData.length) { grid.replaceChildren.apply(grid, socialOriginal); return; }
    var buttons = socialData.map(function (item) {
      var button = document.createElement('button'); button.type = 'button';
      var icon = safeUrl(item.icon, { image: true });
      if (icon) {
        var iconBox = document.createElement('span'); iconBox.className = 'service-icon social-icon';
        var iconImage = document.createElement('img'); iconImage.src = icon; iconImage.alt = '';
        iconBox.appendChild(iconImage); button.appendChild(iconBox);
      }
      var copy = document.createElement('span'); copy.className = 'social-card-copy';
      var title = document.createElement('b'); title.textContent = String(item.name);
      var description = document.createElement('small'); description.textContent = String(item.description || '扫码或打开链接');
      copy.append(title, description); button.appendChild(copy);
      var arrow = document.createElement('span'); arrow.className = 'social-card-arrow'; arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '\u203A'; button.appendChild(arrow);
      var background = safeUrl(item.background, { image: true });
      if (background) button.style.backgroundImage = 'url("' + background.replace(/"/g, '%22') + '")';
      button.dataset.v4SocialName = String(item.name);
      button.dataset.v4SocialLink = safeUrl(item.link);
      button.dataset.v4SocialQr = safeUrl(item.qrImage, { image: true });
      return button;
    });
    grid.replaceChildren.apply(grid, buttons);
  }

  function renderConsult(items) {
    consultData = published(items)[0] || null;
    var modal = document.getElementById('contact-modal');
    if (!modal) return;
    var sheet = modal.querySelector('.contact-sheet');
    if (!sheet) return;
    if (!consultData) { var old = sheet.querySelector('.v4-consult-info'); if (old) old.remove(); return; }
    var info = sheet.querySelector('.v4-consult-info') || document.createElement('div');
    info.className = 'v4-consult-info';
    info.replaceChildren();
    if (consultData.title) info.appendChild(document.createElement('strong')).textContent = String(consultData.title);
    if (consultData.description) info.appendChild(document.createElement('p')).textContent = String(consultData.description);
    var phone = safePhone(consultData.phone);
    if (phone) { var call = document.createElement('a'); call.href = 'tel:' + phone; call.textContent = '电话：' + String(consultData.phone); info.appendChild(call); }
    if (consultData.wechat) info.appendChild(document.createElement('span')).textContent = '微信：' + String(consultData.wechat);
    var qr = safeUrl(consultData.qrImage, { image: true });
    if (qr) { var image = document.createElement('img'); image.src = qr; image.alt = '客服二维码'; info.appendChild(image); }
    var intro = sheet.querySelector('.contact-intro');
    if (intro) intro.after(info); else sheet.prepend(info);
  }

  function openSocial(button) {
    var dialog = document.getElementById('social-account-dialog');
    if (!dialog || !button) return false;
    var link = button.dataset.v4SocialLink;
    var qr = button.dataset.v4SocialQr;
    if (!link && !qr) return false;
    var name = button.dataset.v4SocialName || '园区账号';
    var title = dialog.querySelector('#social-account-title');
    var qrBox = dialog.querySelector('.social-account-qr');
    if (title) title.textContent = name;
    if (qrBox) {
      qrBox.replaceChildren();
      if (qr) { var image = document.createElement('img'); image.src = qr; image.alt = name + '二维码'; image.className = 'v4-social-qr'; qrBox.appendChild(image); }
    }
    dialog.querySelectorAll('a').forEach(function (anchor) {
      anchor.hidden = !link;
      if (link) { anchor.href = link; anchor.textContent = anchor.classList.contains('social-account-url') ? link : '打开链接'; }
    });
    var phone = document.querySelector('.phone');
    var rect = phone.getBoundingClientRect();
    dialog.style.left = (rect.left + phone.clientLeft) + 'px'; dialog.style.top = (rect.top + phone.clientTop) + 'px';
    dialog.style.width = phone.clientWidth + 'px'; dialog.style.height = phone.clientHeight + 'px';
    dialog.addEventListener('close', function restore() { button.focus({ preventScroll: true }); dialog.removeEventListener('close', restore); });
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    return true;
  }

  function loadConfig() {
    if (pendingConfig) return pendingConfig;
    pendingConfig = fetch(base.replace(/\/$/, '') + '/public/v4/config', { headers: { 'x-mini-key': miniKey } })
      .then(function (response) { if (!response.ok) throw new Error('v4 config ' + response.status); return response.json(); })
      .then(function (payload) {
        if (!payload || !payload.item || !payload.item.modules || typeof payload.item.modules !== 'object' || Array.isArray(payload.item.modules)) throw new Error('invalid v4 config');
        config = normalizeConfig(payload); applyModules(); showStatus(''); return config;
      })
      .catch(function () { applyModules(); showStatus(config.version === 'v4-default' ? '模块配置暂不可用，保留默认展示。' : '模块配置更新失败，保留上次配置。'); return config; })
      .finally(function () { pendingConfig = null; });
    return pendingConfig;
  }

  function applyContent(items) {
    items = items || {};
    renderHomeNews(items.news);
    profileRows = published(items['profile-data']);
    var signature = JSON.stringify([items['v4-ads'], items['v4-social'], items['v4-consult'], items['profile-system-config']]);
    if (signature === contentSignature) { applyModules(); return; }
    contentSignature = signature;
    renderAd(items['v4-ads']);
    renderSocial(items['v4-social']);
    renderConsult(items['v4-consult']);
    renderProfileSystem(items['profile-system-config']);
    applyModules();
  }

  applyModules();
  document.addEventListener('click', function (event) {
    applyModules();
    if (event.target.closest('[data-v4-disabled]')) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    var social = event.target.closest('[data-v4-social-name]');
    if (social && openSocial(social)) { event.preventDefault(); event.stopImmediatePropagation(); }
    var ad = event.target.closest('[data-v4-ad-link]');
    if (ad) { event.preventDefault(); event.stopImmediatePropagation(); window.open(ad.dataset.v4AdLink, '_blank', 'noopener,noreferrer'); }
    var news = event.target.closest('[data-v4-news]');
    if (news) { event.preventDefault(); event.stopImmediatePropagation(); openHomeNews(Number(news.dataset.v4News)); }
    var contact = event.target.closest('#space-call, #modal-call, #profile [data-profile-entry="联系客服"]');
    if (contact && consultData) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (contact.id && safePhone(consultData.phone)) location.href = 'tel:' + safePhone(consultData.phone);
      else document.getElementById('contact-modal').classList.remove('hidden');
    }
  }, true);
  var observer = new MutationObserver(function () { applyModules(); });
  observer.observe(document.querySelector('.phone') || document.body, { childList: true, subtree: true });
  var profileNode = document.getElementById('profile');
  // 身份切换不改变节点结构，需单独监听 data-role 才能重算物业工作台开关。
  if (profileNode) new MutationObserver(function () { applyPropertyWorkbench(); }).observe(profileNode, { attributes: true, attributeFilter: ['data-role'] });
  loadConfig();
  if (api && api.get) applyContent(api.get());
  window.addEventListener('park-content-change', function (event) { applyContent(event.detail || {}); loadConfig(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) loadConfig(); });
  Object.assign(window.__v4ModuleControl, { reload: loadConfig, apply: applyModules, get: function () { return normalizeConfig({ item: config }); } });
})(window);
