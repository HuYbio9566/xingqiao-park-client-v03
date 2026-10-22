/* Renders back-office published content into the existing V3 page structure. Falls back to the static markup when the API is unreachable. */
(function () {
  'use strict';
  var api = window.__parkAdminApi;
  var base = (function () {
    var fallback = 'http://127.0.0.1:9528/api';
    if (location.protocol.startsWith('http') && location.port !== '4184' && location.port !== '4174') fallback = location.origin + '/api';
    return String(window.PARK_ADMIN_API_URL || fallback).replace(/\/$/, '');
  })();
  var miniKey = String(window.PARK_ADMIN_MINI_KEY || 'local-mini-key');
  var defaultSpaceImages = ['miniprogram/assets/spaces/space-card-1.png', 'miniprogram/assets/spaces/space-card-2.png', 'miniprogram/assets/spaces/office-3.png', 'miniprogram/assets/spaces/high-end-office.svg', 'miniprogram/assets/spaces/light-rd.svg', 'miniprogram/assets/spaces/startup-office.svg'];
  var cache = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function image(value, index) {
    if (value && !/^https?:/.test(value) && !String(value).startsWith('miniprogram/') && !/^\/media\/[0-9a-f-]+\.(png|jpe?g|gif|webp)$/i.test(String(value))) return defaultSpaceImages[index % defaultSpaceImages.length];
    return value || defaultSpaceImages[index % defaultSpaceImages.length];
  }
  function unit(space) { return String(space.name || '').split(' ')[0] || space.id; }
  function meta(space) { return [space.floor, space.area ? space.area + '㎡' : '', space.decoration].filter(Boolean).join(' · '); }
  function money(value) { return Number(value || 0).toString(); }
  // 后台 description 是富文本：去掉图片/链接标记，折叠换行，截断后作为列表摘要（仅展示层处理，不改后台数据）。
  function summary(value, limit) {
    var text = String(value == null ? '' : value)
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_`~]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    var max = limit || 56;
    return text.length > max ? text.slice(0, max) + '…' : text;
  }

  function renderFeatured(spaces) {
    var body = document.querySelector('#home-featured-spaces .home-new-body');
    if (!body) return;
    var featured = spaces.filter(function (item) { return item.featured; }).slice(0, 2);
    if (!featured.length) featured = spaces.slice(0, 2);
    if (!featured.length) return;
    body.innerHTML = featured.map(function (space, index) {
      return '<div class="home-new-space" role="button" tabindex="0" data-space-detail="' + esc(unit(space)) + '" data-space-meta="' + esc(meta(space)) + '" data-space-price="' + esc(money(space.rentPrice)) + '" data-space-type="' + esc(space.usage || '研发办公') + '">' +
        '<div class="home-new-space-photo"><img src="' + esc(image(space.cover, index)) + '" alt="' + esc(space.name) + '"></div>' +
        '<div class="home-new-space-info"><h3>' + esc(space.area + 'm²' + (space.usage || '')) + '</h3><div class="home-new-tags">' + [space.decoration, space.orientation].filter(Boolean).map(function (tag) { return '<span>' + esc(tag) + '</span>'; }).join('') + '</div>' +
        '<div class="home-new-price"><span><span class="home-new-price-label">租金</span><b>¥' + esc(money(space.rentPrice)) + '<small>/天/m²</small></b></span><span><span class="home-new-price-label">物业费</span><b>¥' + esc(money(space.propertyFee)) + '<small>/天/m²</small></b></span></div></div></div>';
    }).join('');
  }

  function renderSpaceList(spaces) {
    var list = document.querySelector('#spaces .space-finder-list');
    if (!list || !spaces.length) return;
    list.innerHTML = spaces.map(function (space, index) {
      var tags = [space.orientation, space.usage, space.decoration].filter(Boolean);
      var brief = summary(space.description);
      var attrs = 'data-space-detail="' + esc(unit(space)) + '" data-space-type="' + esc(space.usage || '研发办公') + '" data-space-meta="' + esc(meta(space)) + '" data-space-price="' + esc(money(space.rentPrice)) + '" data-space-tags="' + esc(tags.join(',')) + '"';
      return '<article class="space-finder-card" data-space-id="' + esc(space.id) + '"><div class="space-finder-photo"><img src="' + esc(image(space.cover, index)) + '" alt="' + esc(space.name) + '"></div>' +
        '<div class="space-finder-copy"><h3>' + esc(space.area + 'm²' + (space.usage || '') + (space.building ? ' · ' + space.building : '')) + '</h3>' +
        '<div class="space-finder-tags-inline">' + tags.map(function (tag) { return '<span>' + esc(tag) + '</span>'; }).join('') + '</div>' +
        (brief ? '<p>' + esc(brief) + '</p>' : '') +
        '<div class="space-finder-price"><span><span class="space-finder-price-label">租赁费</span><b>¥' + esc(money(space.rentPrice)) + '<small>/天/m²起</small></b></span><span><span class="space-finder-price-label">物业费</span><b>¥' + esc(money(space.propertyFee)) + '<small>/天/m²</small></b></span></div>' +
        '<div class="space-finder-actions"><button type="button" ' + attrs + '>查看详情</button><button type="button" class="primary" ' + attrs + '>预约看房</button></div></div></article>';
    }).join('');
    var count = document.querySelector('#spaces .space-finder-head b');
    if (count) count.textContent = String(spaces.length);
  }

  function renderVenues(venues) {
    var list = document.querySelector('#meeting .meeting-results');
    if (!list || !venues.length) return;
    var images = ['miniprogram/assets/meeting-01.jpg', 'miniprogram/assets/meeting-02.jpg', 'miniprogram/assets/meeting-03.jpg'];
    list.innerHTML = venues.map(function (venue, index) {
      return '<button class="meeting-list-card" data-room-detail="' + esc(venue.name) + '" data-venue-id="' + esc(venue.id) + '"><img src="' + esc(venue.cover || images[index % images.length]) + '" alt="' + esc(venue.name) + '"><span class="meeting-list-copy"><span class="meeting-name">' + esc(venue.name) + ' <i class="ri-arrow-right-s-line"></i></span><span class="meta">' + esc([venue.location, venue.capacity ? venue.capacity + '人' : '', venue.venueType].filter(Boolean).join(' · ')) + '</span><span class="meeting-features">' + esc(String(venue.equipment || '').replace(/、/g, ' · ')) + '</span><span class="meeting-price">¥' + esc(money(venue.hourPrice)) + ' <span>/小时起</span></span></span></button>';
    }).join('');
  }

  function renderNotices(notices) {
    if (!notices.length) return;
    var sorted = notices.slice().sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.publishDate).localeCompare(String(a.publishDate)); });
    var page = document.querySelector('#notices .card');
    if (page) page.innerHTML = sorted.map(function (notice) {
      var d = String(notice.publishDate || '');
      return '<div class="list-row"><time class="notice-date" datetime="' + esc(d) + '"><b>' + esc(d.slice(5)) + '</b><small>' + esc(d.slice(0, 4)) + '</small></time><div class="list-body"><b>' + esc(notice.title) + '</b><span>' + esc(notice.summary || '') + '</span></div><i class="ri-arrow-right-s-line"></i></div>';
    }).join('');
    // Home notice links keep the layout of the first two entries.
    var homeLinks = document.querySelectorAll('#home a[href="#notice-detail"]');
    sorted.slice(0, homeLinks.length).forEach(function (notice, index) {
      var link = homeLinks[index], d = String(notice.publishDate || '');
      var head = link.querySelector('h3'), para = link.querySelector('p'), time = link.querySelectorAll('time span, time > *');
      if (head) head.textContent = notice.title;
      if (para) para.textContent = notice.summary || '';
      if (time.length >= 2) { time[0].textContent = d.slice(5); time[1].textContent = d.slice(0, 4); }
    });
  }

  function renderMenus(menus) {
    var page = document.getElementById('restaurant');
    if (!page || !menus.length) return;
    page.querySelectorAll('.menu-card').forEach(function (card) { card.remove(); });
    var anchor = page.querySelector('.field-title');
    var html = menus.filter(function (menu) { return menu.mealType !== '企业定制'; }).map(function (menu) {
      return '<div class="menu-card card" data-menu-id="' + esc(menu.id) + '"><img src="' + esc(menu.image || 'miniprogram/assets/campus-hero.jpg') + '" alt="' + esc(menu.name) + '"><div class="list-body"><b>' + esc(menu.name) + '</b><span>' + esc(menu.mealType + ' · ' + (menu.detail || '')) + '</span><div class="price">¥' + esc(money(menu.price)) + '</div></div><button class="chip active">预订</button></div>';
    }).join('');
    if (anchor) anchor.insertAdjacentHTML('afterend', html);
  }

  function apply(items) {
    try { renderFeatured(items.spaces || []); } catch (error) {}
    try { renderSpaceList(items.spaces || []); } catch (error) {}
    try { renderVenues(items.venues || []); } catch (error) {}
    try { renderNotices(items.notices || []); } catch (error) {}
    try { renderMenus(items['dining-menus'] || []); } catch (error) {}
    window.dispatchEvent(new CustomEvent('park-content-change', { detail: items }));
  }

  function load() {
    return fetch(base + '/public/content', { headers: { 'x-mini-key': miniKey } })
      .then(function (response) { if (!response.ok) throw new Error('content ' + response.status); return response.json(); })
      .then(function (payload) { cache = payload.items || {}; apply(cache); return cache; })
      .catch(function () { return null; });
  }

  window.__parkContent = { base: base, load: load, get: function () { return cache; }, qrcodes: function (scene) { return ((cache && cache['payment-qrcodes']) || []).filter(function (item) { return !scene || item.scene === scene || item.scene === '通用收款'; }); } };
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
  load();
})();

/* QR-code payment sheet shared by bill pages: shows the back-office QR code and reports the payment for property confirmation. */
(function () {
  'use strict';
  var base = (function () {
    var fallback = 'http://127.0.0.1:9528/api';
    if (location.protocol.startsWith('http') && location.port !== '4184' && location.port !== '4174') fallback = location.origin + '/api';
    return String(window.PARK_ADMIN_API_URL || fallback).replace(/\/$/, '');
  })();
  var miniKey = String(window.PARK_ADMIN_MINI_KEY || 'local-mini-key');
  var identities = { employee: '王晓明', admin: '唐慧丽', property: '李师傅' };
  function el(tag, text, className) { var node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; }
  function qrSrc(qr) {
    if (qr.qrImage && /\.(png|jpe?g|gif|svg|webp)$/i.test(qr.qrImage) && !/^uploads\//.test(qr.qrImage)) return qr.qrImage;
    if (!window.qrcode) return '';
    var code = window.qrcode(0, 'M'); code.addData('xingqiao-pay://' + qr.id + '?payee=' + encodeURIComponent(qr.payee || '')); code.make(); return code.createDataURL(6, 2);
  }

  // options: { scene, amount, feeId, title }
  function open(options) {
    var phone = document.querySelector('.phone') || document.body;
    var role = (document.getElementById('profile') || {}).dataset ? document.getElementById('profile').dataset.role : 'employee';
    var codes = window.__parkContent ? window.__parkContent.qrcodes(options.scene) : [];
    var qr = codes.find(function (item) { return item.scene === options.scene; }) || codes[0];
    var mask = el('div', undefined, 'journey-confirm park-pay-mask'); mask.setAttribute('role', 'dialog'); mask.setAttribute('aria-modal', 'true'); mask.setAttribute('aria-label', '扫码支付');
    var box = el('div', undefined, 'journey-confirm-box park-pay-box');
    box.append(el('h2', '扫码支付'), el('p', (options.title || options.scene) + ' · 应付 ¥' + Number(options.amount || 0).toFixed(2)));
    if (!qr) {
      box.append(el('p', '后台暂未配置该业务的收款码，请联系物业人员获取付款方式。', 'park-pay-empty'));
    } else {
      var src = qrSrc(qr);
      if (src) { var img = el('img'); img.src = src; img.alt = qr.name + '收款二维码'; img.className = 'park-pay-qr'; box.append(img); }
      box.append(el('p', '收款方：' + (qr.payee || '星桥物业服务中心'), 'park-pay-payee'));
      if (qr.note) box.append(el('p', qr.note, 'park-pay-note'));
    }
    var label = el('label', '付款后填写支付单号（微信账单可查看）', 'park-pay-label');
    var input = el('input'); input.type = 'text'; input.maxLength = 60; input.placeholder = '例如 4200001234202610181234567890'; label.append(input);
    var status = el('p', '', 'role-feedback'); status.setAttribute('role', 'status');
    var bar = el('div', undefined, 'journey-confirm-actions');
    var cancel = el('button', '稍后支付'); cancel.type = 'button'; cancel.onclick = function () { mask.remove(); };
    var submit = el('button', '我已付款', 'journey-confirm-danger'); submit.type = 'button';
    submit.onclick = function () {
      var tradeNo = input.value.trim();
      if (!tradeNo) { status.textContent = '请填写支付单号，物业会据此核对到账。'; input.focus(); return; }
      submit.disabled = true; status.textContent = '正在提交…';
      fetch(base + '/payments/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-mini-key': miniKey },
        body: JSON.stringify({ scene: options.scene, amount: Number(options.amount || 0), channel: (qr && qr.channel) || '聚合码', qrcodeId: qr ? qr.id : '', tradeNo: tradeNo, feeId: options.feeId || '', payer: identities[role] || '小程序用户', companyId: 'C-001', staff: qr ? qr.contactStaff : '' })
      }).then(function (response) { return response.json().then(function (payload) { if (!response.ok) throw new Error(payload.message || '提交失败'); return payload; }); })
        .then(function () {
          status.textContent = '已提交，物业核对到账后状态会自动更新。';
          if (window.__miniToast) window.__miniToast('付款信息已提交，等待物业确认');
          setTimeout(function () { mask.remove(); }, 900);
        })
        .catch(function (error) { submit.disabled = false; status.textContent = error.message + '，请稍后重试或联系物业。'; });
    };
    bar.append(cancel, submit); box.append(label, status, bar); mask.append(box); phone.append(mask);
    input.focus({ preventScroll: true });
  }
  window.__parkPay = { open: open };
})();

/* Enterprise services (企业服务): activities, policies, news and partner links come from the back office. */
(function () {
  'use strict';
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function shortDate(value) {
    var text = String(value || '').replace('T', ' ');
    return text ? text.slice(0, 10).replace(/-/g, '.') : '';
  }
  function safeLink(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text || /[\u0000-\u0020\\]/.test(text) || /^(?:javascript|data|vbscript):/i.test(text)) return '';
    try { return /^https?:$/.test(new URL(text, location.href).protocol) ? text : ''; } catch (error) { return ''; }
  }

  function apply(store) {
    var page = document.getElementById('enterprise-services');
    if (!page) return;
    var details = window.__enterpriseDetails;

    // 服务轮播图: rotate published slides inside the existing hero; clicks reuse the detail page.
    var slides = (store['enterprise-banners'] || []).filter(function (item) { return item.status === 'online' && item.image; });
    var hero = page.querySelector('.enterprise-gpt-hero');
    if (hero && slides.length) {
      var copy = hero.querySelector('.enterprise-gpt-hero-copy');
      var dots = hero.querySelector('.enterprise-gpt-dots');
      var show = function (index) {
        var item = slides[index];
        hero.dataset.enterpriseDetail = item.title;
        hero.dataset.slide = String(index);
        var img = hero.querySelector('img');
        img.src = item.image; img.alt = item.title;
        if (copy) copy.innerHTML = '<strong>' + esc(item.title) + '</strong>' + (item.subtitle ? '<b>' + esc(item.subtitle) + '</b>' : '') + '<em>了解详情 <i data-lucide="arrow-right"></i></em>';
        if (dots) dots.innerHTML = slides.length > 1 ? slides.map(function (_, i) { return '<i' + (i === index ? ' class="active"' : '') + '></i>'; }).join('') : '';
        if (window.lucide) lucide.createIcons({ attrs: { 'stroke-width': 1.8, 'aria-hidden': 'true', focusable: 'false' } });
      };
      if (details) slides.forEach(function (item) { if (item.title !== '一起益企') details[item.title] = [item.subtitle, item.content].filter(Boolean).join(' · '); });
      clearInterval(hero.__slideTimer);
      show(0);
      if (slides.length > 1) hero.__slideTimer = setInterval(function () { show((Number(hero.dataset.slide) + 1) % slides.length); }, 4000);
    }

    // Enterprise activities remain separate from the home news feed.
    var activities = (store.activities || []).filter(function (item) { return item.status === 'online'; });
    if (activities.length) {
      var eventGroups = page.querySelectorAll('.enterprise-gpt-events');
      var events = eventGroups[eventGroups.length - 1];
      if (events) {
        events.innerHTML = activities.map(function (item) {
          var when = shortDate(item.startAt);
          return '<button type="button" class="enterprise-gpt-event" data-enterprise-detail="' + esc(item.title) + '"><span class="enterprise-gpt-event-img"><img src="' + esc(item.cover || 'miniprogram/assets/enterprise/event-digital.jpg') + '" alt="' + esc(item.title) + '"><i>报名中</i></span><small>' + esc(when + '  ' + (item.location || '')) + '</small><b>' + esc(item.title) + '</b><em>' + esc((item.content || '').slice(0, 40)) + '</em></button>';
        }).join('');
      }
    }

    // 精选资讯
    var news = (store.news || []).filter(function (item) { return item.status === 'online'; });
    if (news.length) {
      var groups = Array.prototype.filter.call(page.querySelectorAll('.enterprise-gpt-news'), function (node) { return !node.classList.contains('enterprise-policy-list'); });
      var list = groups[groups.length - 1];
      if (list) {
        list.innerHTML = news.map(function (item, index) {
          return '<button type="button" data-enterprise-detail="' + esc(item.title) + '"><span><img src="' + esc(item.cover || (index % 2 ? 'miniprogram/assets/enterprise/news-city.jpg' : 'miniprogram/assets/enterprise/news-building.jpg')) + '" alt="' + esc(item.category || '资讯') + '"></span><span><b><i data-news-type="' + esc((item.category || '资讯').slice(0, 2)) + '">' + esc((item.category || '资讯').slice(0, 2)) + '</i>' + esc(item.title) + '</b><small>' + esc([shortDate(item.publishDate), item.source].filter(Boolean).join('  ')) + '</small></span><i data-lucide="chevron-right"></i></button>';
        }).join('');
      }
    }

    // 政策服务: keep the 查看全部 button working by inserting the list right after its heading.
    var policies = (store.policies || []).filter(function (item) { return item.status === 'online'; });
    if (policies.length) {
      var heads = page.querySelectorAll('.enterprise-gpt-section-head');
      var policyHead = Array.prototype.find.call(heads, function (head) { return /政策服务/.test(head.textContent); });
      if (policyHead) {
        var card = page.querySelector('.enterprise-gpt-logo-card');
        if (!card) { card = document.createElement('div'); card.className = 'enterprise-gpt-logo-card'; policyHead.insertAdjacentElement('afterend', card); }
        card.innerHTML = policies.map(function (item, index) {
          var name = item.name || item.title || '政策服务';
          return '<a href="' + esc(safeLink(item.link) || '#') + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(name) + '"><img src="' + esc(item.logo || item.cover || (index % 2 ? 'miniprogram/assets/enterprise/news-city.jpg' : 'miniprogram/assets/enterprise/news-building.jpg')) + '" alt="' + esc(name) + '"></a>';
        }).join('');
      }
    }

    // News and activities keep their detail fallback; policy cards navigate to their external links.
    if (details) {
      news.forEach(function (item) {
        details[item.title] = [shortDate(item.publishDate), item.source, item.content].filter(Boolean).join(' · ');
      });
      activities.forEach(function (item) {
        details[item.title] = [shortDate(item.startAt), item.location, item.content].filter(Boolean).join(' · ');
      });
    }
    window.dispatchEvent(new CustomEvent('park-enterprise-change', { detail: store }));
  }

  function run(store) { try { apply(store); } catch (error) {} }
  window.addEventListener('park-content-change', function (event) { run(event.detail || {}); });
  if (window.__parkContent && window.__parkContent.get()) run(window.__parkContent.get());
  else setTimeout(function () { if (window.__parkContent && window.__parkContent.get()) run(window.__parkContent.get()); }, 800);
})();

/* Consultation form (帮我选址 / 空间咨询 / 看房) creates a lead in the back office. */
(function () {
  'use strict';
  var base = (function () {
    var fallback = 'http://127.0.0.1:9528/api';
    if (location.protocol.startsWith('http') && location.port !== '4184' && location.port !== '4174') fallback = location.origin + '/api';
    return String(window.PARK_ADMIN_API_URL || fallback).replace(/\/$/, '');
  })();
  var miniKey = String(window.PARK_ADMIN_MINI_KEY || 'local-mini-key');
  var source = '空间咨询';
  var submit = document.getElementById('contact-submit');
  if (!submit) return;

  function entryPoint() {
    var active = document.querySelector('.screen > section:not(.hidden)');
    if (active && active.id === 'spaces') return '帮我选址';
    return '空间咨询';
  }

  function post(payload) {
    return fetch(base + '/leads/consult', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-mini-key': miniKey },
      body: JSON.stringify(payload)
    }).then(function (response) { return response.json().then(function (body) { if (!response.ok) throw new Error(body.message || '提交失败'); return body; }); });
  }

  submit.addEventListener('click', function (event) {
    var name = document.getElementById('contact-name');
    var phone = document.getElementById('contact-phone');
    var email = document.getElementById('contact-email');
    var note = document.getElementById('contact-note');
    if (!name || !phone) return;
    source = entryPoint();
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!name.value.trim() || !/^1[3-9]\d{9}$/.test(phone.value.replace(/\s|-/g, ''))) {
      if (window.__miniToast) window.__miniToast('请填写姓名和正确的手机号');
      else alert('请填写姓名和正确的手机号');
      return;
    }
    submit.disabled = true;
    post({
      contact: name.value.trim(),
      phone: phone.value.trim(),
      companyName: '',
      source: source,
      demandArea: '',
      intentSpace: '',
      note: [note && note.value.trim(), email && email.value.trim()].filter(Boolean).join(' · ')
    }).then(function () {
      if (window.__miniToast) window.__miniToast('已提交，招商顾问会尽快联系你');
      document.getElementById('contact-modal').classList.add('hidden');
      name.value = ''; phone.value = ''; if (email) email.value = ''; if (note) note.value = '';
      window.dispatchEvent(new CustomEvent('park-lead-created', { detail: { source: source } }));
    }).catch(function (error) {
      if (window.__miniToast) window.__miniToast(error.message + '，请稍后重试或直接致电');
      else alert(error.message);
    }).finally(function () { submit.disabled = false; });
  }, true);
})();

/* Home banner, service entries, park introduction, agreements and knowledge base. */
(function () {
  'use strict';
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  // Banner: swap sources in place so the existing slider (swipe, dots, video autoplay pause) keeps working.
  function renderHero(banners) {
    var hero = document.querySelector('#home.home-new .home-new-hero');
    if (!hero || !banners.length) return;
    var image = banners.find(function (item) { return item.mediaType !== '视频' && item.mediaUrl; });
    var video = banners.find(function (item) { return item.mediaType === '视频' && item.mediaUrl; });
    var img = hero.querySelector('.home-new-hero-slide img, img');
    if (img && image) { img.src = image.mediaUrl; img.alt = image.title; }
    var player = hero.querySelector('video');
    if (player && video && player.getAttribute('src') !== video.mediaUrl && /\.(mp4|webm|mov)$/i.test(video.mediaUrl)) {
      player.setAttribute('aria-label', video.title);
    }
  }

  // Entries: the back office decides which buttons are shown and their order; buttons keep their own handlers.
  function renderEntries(entries) {
    var groups = [
      ['首页主入口', document.querySelector('#home .home-new-quick')],
      ['园区服务宫格', document.getElementById('home-park-services')],
      ['更多服务', document.querySelector('#park-services-all .park-services-all-grid')]
    ];
    groups.forEach(function (group) {
      var area = group[0], panel = group[1];
      if (!panel) return;
      // A configured zone is authoritative: anything not published in the back office is hidden.
      var configured = entries.filter(function (item) { return item.area === area; });
      if (!configured.length) return;
      var order = {};
      configured.forEach(function (item) { order[item.name] = Number(item.sort || 0); });
      var buttons = Array.prototype.filter.call(panel.children, function (node) { return node.tagName === 'BUTTON'; });
      buttons.forEach(function (button) {
        var label = (button.querySelector('b') || button).textContent.trim();
        if (label === '更多服务') return;
        if (!(label in order)) button.hidden = true;
        else { button.hidden = false; button.style.order = String(order[label]); }
      });
      if (getComputedStyle(panel).display.indexOf('grid') === -1 && getComputedStyle(panel).display.indexOf('flex') === -1) return;
      var more = buttons.find(function (button) { return (button.querySelector('b') || button).textContent.trim() === '更多服务'; });
      if (more) more.style.order = '999';
    });
  }

  function renderParkProfile(sections) {
    var page = document.getElementById('park-intro');
    if (!page || !sections.length) return;
    var bySection = {};
    sections.forEach(function (item) { bySection[item.section] = item; });
    var overview = page.querySelector('#park-overview');
    if (overview && bySection['园区概况']) {
      var copy = overview.querySelectorAll('p');
      if (copy[0]) copy[0].textContent = bySection['园区概况'].content;
    }
    var spaces = page.querySelector('#park-spaces');
    if (spaces && bySection['产业方向']) {
      var paras = spaces.querySelectorAll('figcaption p');
      if (paras[0]) paras[0].textContent = bySection['产业方向'].content;
    }
    var serviceGrid = page.querySelector('#park-services .park-service-grid');
    if (serviceGrid && bySection['配套设施']) {
      var items = serviceGrid.querySelectorAll('div');
      if (items[0]) items[0].querySelector('p').textContent = bySection['配套设施'].content;
    }
    var visit = page.querySelector('#park-visit');
    if (visit && bySection['交通位置']) {
      var ps = visit.querySelectorAll('p');
      if (ps[0]) ps[0].textContent = bySection['交通位置'].content;
    }
    var footer = page.querySelector('.park-disclaimer');
    if (footer && bySection['联系方式']) footer.textContent = bySection['联系方式'].content;
  }

  function renderAgreements(agreements) {
    if (!agreements.length) return;
    var user = agreements.find(function (item) { return item.name === '用户协议'; });
    var privacy = agreements.find(function (item) { return item.name === '隐私政策'; });
    var visit = agreements.find(function (item) { return item.name === '访客入园免责协议'; });
    document.querySelectorAll('#role-login-modal, .role-login-modal').forEach(function (node) {
      if (user) node.dataset.agreement = user.content;
      if (privacy) node.dataset.privacy = privacy.content;
    });
    window.__parkAgreements = { user: user, privacy: privacy, visitor: visit };
    // The agreement text is shown in a simple sheet so users can read what they accept.
    if (!document.getElementById('park-agreement-open')) return;
  }

  function apply(store) {
    try { renderHero(store.banners || []); } catch (e) {}
    try { renderEntries(store['home-entries'] || []); } catch (e) {}
    try { renderParkProfile(store['park-profile'] || []); } catch (e) {}
    try { renderAgreements(store.agreements || []); } catch (e) {}
  }
  window.addEventListener('park-content-change', function (event) { apply(event.detail || {}); });
  if (window.__parkContent && window.__parkContent.get()) apply(window.__parkContent.get());
  else setTimeout(function () { if (window.__parkContent && window.__parkContent.get()) apply(window.__parkContent.get()); }, 900);
})();

/* Agreement viewer: 用户协议 / 隐私政策 / 访客免责协议 text comes from the back office. */
(function () {
  'use strict';
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function sheet(name, agreement) {
    var phone = document.querySelector('.phone') || document.body;
    var mask = document.createElement('div'); mask.className = 'journey-confirm park-agreement-mask';
    mask.setAttribute('role', 'dialog'); mask.setAttribute('aria-modal', 'true'); mask.setAttribute('aria-label', name);
    var body = agreement && agreement.content ? esc(agreement.content).replace(/\n/g, '<br>') : '该协议正文尚未发布，请联系园区工作人员获取。';
    mask.innerHTML = '<div class="journey-confirm-box park-agreement-box">' +
      '<h2>' + esc(name) + '</h2>' +
      (agreement && agreement.version ? '<p class="park-agreement-meta">版本 ' + esc(agreement.version) + (agreement.effectiveDate ? ' · 生效 ' + esc(agreement.effectiveDate) : '') + '</p>' : '') +
      '<div class="park-agreement-body">' + body + '</div>' +
      '<div class="journey-confirm-actions"><button type="button" class="journey-confirm-danger">我知道了</button></div></div>';
    phone.appendChild(mask);
    mask.querySelector('.journey-confirm-danger').onclick = function () { mask.remove(); };
    mask.onclick = function (event) { if (event.target === mask) mask.remove(); };
  }

  // Replace the single combined label with links that keep the checkbox behaviour.
  function decorateLogin() {
    var button = document.querySelector('.role-login-agreement');
    if (!button || button.dataset.agreementReady) return;
    var label = button.querySelectorAll('span')[1];
    if (!label) return;
    button.dataset.agreementReady = '1';
    label.textContent = '我已阅读并同意';
    ['用户协议', '隐私政策'].forEach(function (name, index) {
      var link = document.createElement('a'); link.href = '#agreement'; link.textContent = '《' + name + '》'; link.className = 'park-agreement-link';
      link.addEventListener('click', function (event) { event.preventDefault(); event.stopPropagation(); var store = window.__parkAgreements || {}; sheet(name, name === '用户协议' ? store.user : store.privacy); });
      label.appendChild(document.createTextNode(index ? '和' : ''));
      label.appendChild(link);
    });
  }

  // Visitor page disclaimer (if present) opens the visitor agreement.
  function decorateVisitor() {
    var nodes = document.querySelectorAll('.role-visitor-agreement, [data-visitor-agreement]');
    nodes.forEach(function (node) {
      if (node.dataset.agreementReady) return;
      node.dataset.agreementReady = '1';
      var link = document.createElement('a'); link.href = '#agreement'; link.textContent = '《访客入园免责协议》'; link.className = 'park-agreement-link';
      link.onclick = function (event) { event.preventDefault(); event.stopPropagation(); sheet('访客入园免责协议', (window.__parkAgreements || {}).visitor); };
      node.appendChild(link);
    });
  }

  function refresh() { try { decorateLogin(); decorateVisitor(); } catch (e) {} }
  ['park-content-change', 'mini-records-change', 'property-workflow-change'].forEach(function (name) { window.addEventListener(name, refresh); });
  document.addEventListener('click', function () { setTimeout(refresh, 0); }, true);
  setInterval(refresh, 2000);
})();

/* Leasing + consultant chats: messages create back-office conversations; staff replies sync back. */
(function () {
  'use strict';
  var base = (function () {
    var fallback = 'http://127.0.0.1:9528/api';
    if (location.protocol.startsWith('http') && location.port !== '4184' && location.port !== '4174') fallback = location.origin + '/api';
    return String(window.PARK_ADMIN_API_URL || fallback).replace(/\/$/, '');
  })();
  var miniKey = String(window.PARK_ADMIN_MINI_KEY || 'local-mini-key');
  var visitorId = (function () {
    try {
      var id = localStorage.getItem('v4:park-visitor-id');
      if (!id) { id = 'V-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); localStorage.setItem('v4:park-visitor-id', id); }
      return id;
    } catch (e) { return 'V-local'; }
  })();
  var threads = {}; // channel -> conversation id

  function caller() {
    var profile = document.getElementById('profile');
    var role = profile ? profile.dataset.role : 'guest';
    var name = (profile && (profile.querySelector('.mp-name') || {}).textContent) || '小程序用户';
    return { role: role, name: name || '小程序用户' };
  }
  function request(path, options) {
    return fetch(base + path, Object.assign({ headers: { 'content-type': 'application/json', 'x-mini-key': miniKey } }, options || {}))
      .then(function (response) { return response.json().then(function (body) { if (!response.ok) throw new Error(body.message || '网络错误'); return body; }); });
  }
  function serverTime(value) { return Date.parse(String(value).replace(' ', 'T') + ':00+08:00') || Date.now(); }
  function seenKey(id) { return 'v4:park-chat-seen-' + id; }
  function readSeen(id) { try { return JSON.parse(localStorage.getItem(seenKey(id)) || '{}'); } catch (e) { return {}; } }
  function writeSeen(id, seen) { try { localStorage.setItem(seenKey(id), JSON.stringify(seen)); } catch (e) {} }

  function send(channel, title, text) {
    var who = caller();
    return request('/conversations', {
      method: 'POST',
      body: JSON.stringify({ visitorId: visitorId, channel: channel, visitorName: who.name, companyId: who.role === 'admin' || who.role === 'employee' ? 'C-001' : '', title: title, text: text })
    }).then(function (payload) {
      threads[channel] = payload.item.id;
      // The visitor's own message is already shown locally; mark it seen so it is not echoed back.
      var seen = readSeen(payload.item.id);
      (payload.item.messages || []).forEach(function (message) { if (!message.fromStaff) seen[message.id] = true; });
      writeSeen(payload.item.id, seen);
      setTimeout(syncAll, 600);
      return payload.item;
    });
  }

  function deliver(channel, message) {
    if (channel === 'leasing') {
      var journey = window.__messageJourney;
      if (!journey) return false;
      journey.append(message.text, false, null, serverTime(message.at), message.senderName);
      var page = document.getElementById('leasing-chat');
      if (page) page.dispatchEvent(new Event('message-history-ready'));
      return true;
    }
    var id = channel.replace('consultant-', '');
    if (window.__consultantChats) { window.__consultantChats.receive(id, message.text, message.senderName, serverTime(message.at)); return true; }
    return false;
  }

  function syncAll() {
    return request('/conversations?visitorId=' + encodeURIComponent(visitorId)).then(function (payload) {
      (payload.items || []).forEach(function (thread) {
        threads[thread.channel] = thread.id;
        var seen = readSeen(thread.id), changed = false;
        (thread.messages || []).forEach(function (message) {
          if (!message.fromStaff || seen[message.id]) return;
          if (deliver(thread.channel, message)) { seen[message.id] = true; changed = true; }
        });
        if (changed) {
          writeSeen(thread.id, seen);
          request('/conversations/' + encodeURIComponent(thread.id) + '/read?visitorId=' + encodeURIComponent(visitorId), { method: 'POST', body: '{}' }).catch(function () {});
        }
      });
    }).catch(function () {});
  }

  // The leasing chat keeps its existing UI; this only mirrors the submitted text to the server.
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.closest || !form.closest('#leasing-chat')) return;
    var input = form.querySelector('textarea');
    var text = input && input.value.trim();
    if (text) send('leasing', '招商咨询', text).catch(function () {});
  }, true);

  // Poll while any chat page is open, and once on load so unread replies show in the inbox.
  setInterval(function () {
    var open = document.querySelector('.leasing-chat:not(.hidden), #leasing-chat:not(.hidden)');
    if (open) syncAll();
  }, 8000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) syncAll(); });
  setTimeout(syncAll, 1500);
  window.__parkChat = { send: send, sync: syncAll, visitorId: visitorId, id: function (channel) { return threads[channel || 'leasing'] || ''; } };
})();
