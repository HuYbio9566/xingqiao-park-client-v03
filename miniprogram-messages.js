/* Local prototype only: no messages or bookings are sent to a server. */
(function () {
  var list = document.getElementById('messages');
  var profile = document.getElementById('profile');
  var screen = document.querySelector('.screen');
  var cards = Array.from(list.querySelectorAll('[data-message]'));
  var state;
  var consultantPages = {};
  var consultants = {
    4: { name: '李顾问', route: 'consultant-li-chat', source: '来自招商空间 · B 座180m²创新办公', image: 'consultant-li.png', messages: [
      '您好，我从 B 座180m²房源详情进来的，这套适合12人的团队吗？',
      '您好，您更倾向开放工位，还是需要独立办公室？可以结合布局一起评估。',
      '需要12个工位、一间会议室，最好再留一个小洽谈区。',
      '明白，您看房时可以重点核对会议室隔断和工位间距。预计什么时候入驻？',
      '计划下个月中旬，现有家具能继续使用吗？',
      '家具保留范围和交付清单需要与业主确认，建议现场逐项核对后再确定方案。',
      '好的，我周四下午比较方便，想先看一下现场。',
      '您周四下午具体几点方便？请先确认到访人数，接待时间落实后再安排出行。'
    ] },
    5: { name: '陈顾问', route: 'consultant-chen-chat', source: '来自首页招商咨询 · 企业入驻', image: 'consultant-chen.png', messages: [
      '陈顾问您好，我们准备入驻园区，想先了解需要准备哪些材料。',
      '您好，请问是已成立企业搬迁，还是新注册公司？两种情况的办理材料有所不同。',
      '是已成立企业，主要做软件研发，准备把办公地址迁过来。',
      '可以先整理营业执照、企业简介、拟入驻人数和面积需求，具体清单以入驻审核要求为准。',
      '大约20人，意向面积250到300m²，还需要提供研发项目介绍吗？',
      '可以一并准备，重点说明主要业务和研发方向，涉及商业机密的内容不必在聊天中发送。',
      '明白。租赁合同是先签，还是先审核材料？',
      '建议先确认空间与入驻条件，再核对合同条款和签署安排。您可以先整理基础资料，我们逐项沟通。'
    ] }
  };
  var conversation = [
    { self: true, text: '王经理您好，我们团队大约25人，想找300m²左右的办公空间，最好有独立会议室。' },
    { self: false, text: '您好，可以重点看看 A 座这套320m²的空间。您对工位布局和入驻时间有什么要求？' },
    { self: true, text: '希望有开放工位区，再留两间独立办公室，计划下个月入驻。' },
    { self: false, text: '明白。看房时我们可以一起核对工位、办公室和会议室的划分，再确认装修调整和交付时间。', link: { page: 'spaces', label: '查看招商空间 →' } },
    { self: true, text: '好的，这周五下午方便过去看看吗？我们两个人。' },
    { self: false, text: '您周五下午更方便几点到？接待时间还需要确认，确定后再安排到访。' },
    { self: true, text: '下午两点左右比较合适，也想一起了解停车和餐饮配套。' },
    { self: false, text: '好的，看房时可以一起了解停车和餐饮配套。周五14:00的接待时间待确认，请留意后续消息。' }
  ];
  var storageWarning = document.createElement('p');
  storageWarning.className = 'journey-warning';
  storageWarning.setAttribute('role', 'status');
  storageWarning.hidden = true;
  list.appendChild(storageWarning);
  function key() { return 'park-message-journey-v1-' + (profile.dataset.role || 'guest'); }
  function load() {
    state = { read: [], chat: [], draft: '', context: 'A 座 320m² 研发办公空间', consultants: {} };
    try {
      var saved = JSON.parse(localStorage.getItem(key()) || 'null');
      if (saved && Array.isArray(saved.read) && Array.isArray(saved.chat)) {
        state.read = saved.read.filter(function (id) { return typeof id === 'string'; });
        state.chat = saved.chat.filter(function (item) { return typeof item.text === 'string' && typeof item.self === 'boolean'; });
        state.draft = typeof saved.draft === 'string' ? saved.draft : '';
        state.context = typeof saved.context === 'string' ? saved.context : state.context;
        Object.keys(consultants).forEach(function (id) {
          var thread = saved.consultants && saved.consultants[id];
          if (thread && Array.isArray(thread.chat)) state.consultants[id] = {
            chat: thread.chat.filter(function (m) { return m && typeof m.text === 'string' && typeof m.self === 'boolean'; }),
            draft: typeof thread.draft === 'string' ? thread.draft : '', unread: thread.unread === true
          };
        });
      }
    } catch (e) { warn(); }
  }
  function warn() { storageWarning.hidden = false; storageWarning.textContent = '本地记录暂不能保存，刷新后可能丢失。您仍可继续体验。'; }
  function save() { try { localStorage.setItem(key(), JSON.stringify(state)); } catch (e) { warn(); } }
  function render() {
    cards.forEach(function (card, index) {
      var dot = card.querySelector('.message-unread');
      var unread = consultants[index] ? !!(state.consultants[index] && state.consultants[index].unread) : index < 3 && !state.read.includes(card.dataset.message);
      if (!unread && dot) dot.remove();
      if (unread && !dot) {
        dot = document.createElement('i'); dot.className = 'message-unread';
        card.querySelector('.message-avatar').appendChild(dot);
      }
    });
    if (state.chat.length) {
      cards[0].querySelector('.message-preview').textContent = state.chat[state.chat.length - 1].text;
      cards[0].querySelector('time').textContent = '最近';
    } else {
      cards[0].querySelector('.message-preview').textContent = conversation[conversation.length - 1].text;
      cards[0].querySelector('time').textContent = '刚刚';
    }
    cards[0].querySelector('.message-source').textContent = '招商顾问 · ' + state.context;
    Object.keys(consultants).forEach(function (id) {
      var config = consultants[id], thread = state.consultants[id];
      cards[id].querySelector('.message-preview').textContent = thread && thread.chat.length ? thread.chat[thread.chat.length - 1].text : config.messages[config.messages.length - 1];
      cards[id].querySelector('time').textContent = thread && thread.chat.length ? '最近' : examples[id - 4][2];
    });
    window.__syncMessageUnread();
    syncCategoryLists();
  }
  var categoryNames = ['咨询', '空间', '预约', '通知'];
  var categoryIcons = ['consultation', 'space', 'booking', 'notice'];
  var categoryRoutes = ['message-consultations', 'message-space-list', 'message-booking-list', 'message-notice-list'];
  var categoryTitles = ['咨询消息', '空间动态', '预约消息', '园区通知'];
  var detailRoutes = ['leasing-chat', 'message-space', 'message-booking', 'message-notice'];
  var detailTitles = ['招商咨询', '空间动态', '预约进度', '园区服务通知'];
  var categories = document.createElement('div'); categories.className = 'message-categories';
  categories.setAttribute('role', 'group'); categories.setAttribute('aria-label', '消息分类');
  categories.innerHTML = categoryNames.map(function (name, index) {
    cards[index].dataset.category = String(index);
    return '<button type="button" data-category="' + index + '" aria-controls="' + categoryRoutes[index] + '"><span class="category-icon"><img src="miniprogram/assets/icons/message-' + categoryIcons[index] + '.svg" alt="" aria-hidden="true"><b hidden></b></span><span>' + name + '</span></button>';
  }).join('');
  list.prepend(categories);
  categories.onclick = function (event) {
    var button = event.target.closest('[data-category]');
    if (button) window.__showMiniPage(categoryRoutes[Number(button.dataset.category)]);
  };
  // Additional local examples share the inbox read state and category routes.
  var examples = [
    [0, '李顾问', '10:10', 'B 座办公选址咨询', '已整理180m²办公空间的布局要点，可根据团队规模进一步沟通。', '建议先确认工位数量、独立会议室和预计入驻时间，再安排现场看房。'],
    [0, '陈顾问', '昨天', '入驻材料咨询', '企业入驻材料清单已整理，您可以先核对基础资料。', '示例清单包含企业基本信息、空间需求和联系人资料。正式材料要求以园区审核通知为准。'],
    [0, '园区服务专员', '10-06', '园区配套咨询', '关于停车、餐饮和会议室的咨询，已整理服务说明。', '停车、餐饮和会议室可从企业服务入口了解；实际开放范围和使用条件以园区确认结果为准。'],
    [1, '空间动态', '09:40', 'B 座 · 180m² 创新办公', '独立办公户型资料已更新，可查看空间布局与采光信息。', '适合关注独立办公布局的团队，建议结合工位和会议需求现场核实；本条为示例动态，不代表实时房源。'],
    [1, '空间动态', '昨天', 'A 座 · 公共配套导览', '公共会议区与洽谈区导览信息已补充。', '看房时可同步了解公共会议区、接待区和通行动线，使用权限与收费以正式说明为准。'],
    [1, '空间动态', '10-05', '办公空间选址提示', '选址前可先整理面积、预算及预计入驻时间。', '将核心需求提供给招商顾问，有助于筛选匹配空间。页面展示信息仅供原型体验。'],
    [2, '预约进度', '09:20', 'B 座看房 · 待沟通时间', '已收到看房意向，具体到访时间待双方沟通。', '示例状态：待沟通。请勿据此直接到访；正式接待时间、人数和联系人需经园区确认。'],
    [2, '预约进度', '昨天', '会议室参观 · 信息待补充', '参观需求还需补充预计人数及使用场景。', '示例状态：待补充。补全预计人数、希望了解的设施及参观时段后，再与服务人员确认安排。'],
    [2, '预约进度', '10-04', '园区导览 · 已结束', '本次示例导览记录已结束，可继续咨询入驻问题。', '示例状态：已结束。可整理对空间、配套和入驻流程的疑问继续咨询，本条不代表真实到访记录。'],
    [3, '园区服务', '09:00', '消防演练温馨提示', '请留意园区消防演练安排，提前了解疏散通道。', '演练期间请听从现场工作人员引导，不占用消防通道。具体演练日期与范围以正式公告为准。'],
    [3, '园区服务', '昨天', '公共会议室使用提醒', '使用结束后请带走随身物品，并保持会议室整洁。', '如发现设备异常，请联系园区服务人员。预约、取消及费用规则以正式服务说明为准。'],
    [3, '园区服务', '10-03', '停车与通行提示', '来访前请了解车辆登记与园区通行要求。', '访客车辆请按园区正式指引完成登记，停车区域、收费与门禁权限以现场公示为准。']
  ];
  function consultantAvatar(name) {
    var file = { '李顾问': 'consultant-li.png', '陈顾问': 'consultant-chen.png' }[name];
    return file ? '<img class="manager-avatar-image" src="miniprogram/assets/' + file + '" alt="">' : name[0];
  }
  examples.forEach(function (item, offset) {
    var index = cards.length;
    var card = cards[item[0]].cloneNode(true);
    card.dataset.message = 'example-message-' + offset;
    card.dataset.category = String(item[0]);
    card.querySelector('.message-unread')?.remove();
    card.querySelector('strong').textContent = item[1];
    card.querySelector('time').textContent = item[2];
    card.querySelector('.message-preview').textContent = item[4];
    var source = card.querySelector('.message-source');
    if (source) source.textContent = item[3];
    if (item[0] === 0) card.querySelector('.message-avatar').innerHTML = consultantAvatar(item[1]);
    var li = document.createElement('li'); li.appendChild(card);
    list.querySelectorAll('.message-list')[item[0] < 2 ? 0 : 1].appendChild(li);
    cards.push(card);
    var route = 'message-example-' + offset;
    if (consultants[index]) {
      detailRoutes[index] = consultants[index].route; detailTitles[index] = item[1];
      return;
    }
    detailRoutes[index] = route; detailTitles[index] = item[3];
    var detail = page(route, item[3], '<article class="journey-panel"><span class="journey-kicker">示例消息</span><h1></h1><p class="journey-meta"></p><h2>消息内容</h2><p data-example-summary></p><p data-example-body></p></article>');
    detail.querySelector('h1').textContent = item[3];
    detail.querySelector('.journey-meta').textContent = item[1] + ' · ' + item[2] + ' · 仅供原型体验';
    detail.querySelector('[data-example-summary]').textContent = item[4];
    detail.querySelector('[data-example-body]').textContent = item[5];
  });
  list.querySelector('#message-conversations-title span').textContent = '8 条消息';
  list.querySelector('#message-notices-title span').textContent = '8 条消息';
  var categoryContent = [
    '<span class="category-person" aria-hidden="true"><img class="manager-avatar-image" src="miniprogram/assets/manager-wang.png" alt=""></span><span class="category-copy"><span class="category-row"><strong>王经理</strong><time data-list-time></time></span><span class="category-context" data-list-context></span><span class="category-preview" data-list-preview></span><span class="category-unread" data-list-unread>未读</span></span>',
    '<span class="category-row"><span class="category-kind"><i data-lucide="building-2" aria-hidden="true"></i>空间更新</span><time data-list-time></time></span><span class="category-space-body"><img src="miniprogram/assets/spaces/space-card-1.png.webp" alt="A 座研发办公空间"><span class="category-copy"><strong>A 座 · 320m² 研发办公</strong><span class="category-context">星桥科创园</span><span class="category-preview" data-list-preview></span></span></span><span class="category-footer"><span class="category-unread" data-list-unread>未读</span><span class="category-link">查看空间动态 <i data-lucide="chevron-right" aria-hidden="true"></i></span></span>',
    '<span class="category-row"><span class="category-kind"><i data-lucide="calendar-check" aria-hidden="true"></i>看房预约</span><time data-list-time></time></span><strong>等待园区确认</strong><span class="category-context">A 座 · 320m² 研发办公</span><span class="category-progress"><span>申请已提交</span><i data-lucide="arrow-right" aria-hidden="true"></i><b>待确认</b></span><span class="category-preview" data-list-preview></span><span class="category-footer"><span class="category-unread" data-list-unread>未读</span><span class="category-link">查看预约进度 <i data-lucide="chevron-right" aria-hidden="true"></i></span></span>',
    '<span class="category-row"><span class="category-kind"><i data-lucide="bell" aria-hidden="true"></i>园区服务中心</span><time data-list-time></time></span><strong>中秋节园区服务安排</strong><span class="category-preview" data-list-preview></span><span class="category-footer"><span class="category-unread" data-list-unread>未读</span><span class="category-link">阅读全文 <i data-lucide="chevron-right" aria-hidden="true"></i></span></span>'
  ];
  var categoryPages = categoryRoutes.map(function (id, category) {
    var node = page(id, categoryTitles[category], '<ul class="category-message-list" aria-label="' + categoryTitles[category] + '"></ul>');
    node.className = 'hidden message-category-page';
    cards.forEach(function (card, index) {
      if (Number(card.dataset.category) !== category) return;
      var li = document.createElement('li');
      li.innerHTML = '<button type="button" class="category-entry category-entry-' + category + '" data-category-message="' + index + '">' + categoryContent[category] + '</button>';
      if (index >= 4) {
        var item = examples[index - 4];
        li.querySelector('strong').textContent = category === 0 ? item[1] : item[3];
        var person = li.querySelector('.category-person'); if (person) person.innerHTML = consultantAvatar(item[1]);
        var context = li.querySelector('.category-context'); if (context) context.textContent = consultants[index] ? consultants[index].source : item[3] + ' · 示例';
        var progress = li.querySelector('.category-progress'); if (progress) progress.textContent = item[3].split(' · ')[1];
        var image = li.querySelector('.category-space-body img');
        if (image) image.remove();
      }
      node.querySelector('ul').appendChild(li);
    });
    node.addEventListener('click', function (event) {
      var entry = event.target.closest('[data-category-message]');
      if (entry) openMessage(Number(entry.dataset.categoryMessage), id);
    });
    return node;
  });
  function syncCategoryLists() {
    categories.querySelectorAll('button').forEach(function (button, category) {
      var count = cards.filter(function (card) { return Number(card.dataset.category) === category && card.querySelector('.message-unread'); }).length;
      button.querySelector('b').hidden = !count;
      button.querySelector('b').textContent = String(count);
      button.setAttribute('aria-label', categoryTitles[category] + (count ? '，' + count + ' 条未读' : '，无未读消息'));
      categoryPages[category].querySelectorAll('[data-category-message]').forEach(function (node) {
        var index = Number(node.dataset.categoryMessage);
        var card = cards[index];
        var unread = !!card.querySelector('.message-unread');
        node.querySelector('[data-list-time]').textContent = card.querySelector('time').textContent;
        node.querySelector('[data-list-preview]').textContent = card.querySelector('.message-preview').textContent;
        node.querySelector('[data-list-unread]').hidden = !unread;
        if (index === 0) node.querySelector('[data-list-context]').textContent = '招商顾问 · ' + state.context;
        node.setAttribute('aria-label', card.querySelector('strong').textContent + (unread ? '，未读，' : '，已读，') + card.querySelector('.message-preview').textContent);
      });
    });
  }
  list.addEventListener('message-read-change', function () {
    state.read = cards.filter(function (card) { return !card.querySelector('.message-unread'); }).map(function (card) { return card.dataset.message; });
    save(); syncCategoryLists();
  });
  function openMessage(index, parent) {
    if (consultants[index]) {
      var thread = consultantThread(index); thread.unread = false;
      consultantPages[index].refresh();
    }
    if (index === 0 && !state.chat.length) {
      var start = Date.now() - conversation.length * 120000;
      state.chat = conversation.map(function (item, i) { return Object.assign({}, item, { at: start + i * 120000 }); });
      document.getElementById('leasing-chat').dispatchEvent(new Event('message-history-ready'));
    }
    if (!state.read.includes(cards[index].dataset.message)) state.read.push(cards[index].dataset.message);
    save(); render();
    window.__setMiniRoute(detailRoutes[index], detailTitles[index], parent);
    window.__showMiniPage(detailRoutes[index]);
  }
  function icons() { if (window.lucide) lucide.createIcons(); }
  function consultantThread(id) {
    if (!state.consultants[id]) {
      var start = Date.now() - 16 * 60000;
      state.consultants[id] = { draft: '', unread: false, chat: consultants[id].messages.map(function (text, i) {
        return { text: text, self: i % 2 === 0, at: start + i * 120000 };
      }) };
    }
    return state.consultants[id];
  }
  function initConsultantChats() {
    Object.keys(consultants).forEach(function (id) {
      var config = consultants[id];
      var node = page(config.route, config.name, ''); node.className = 'hidden leasing-chat';
      var base = document.getElementById('leasing-chat');
      node.appendChild(base.querySelector('.chat-agent').cloneNode(true));
      node.querySelector('strong').firstChild.textContent = config.name + ' ';
      node.querySelector('.chat-agent .manager-avatar-image').src = 'miniprogram/assets/' + config.image;
      node.querySelector('.chat-agent p').textContent = id === '4' ? '房源咨询' : '企业入驻咨询';
      var source = document.createElement('p'); source.className = 'consultant-chat-source'; source.textContent = config.source; node.appendChild(source);
      var log = document.createElement('div'); log.className = 'chat-messages'; log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite'); log.setAttribute('aria-label', '与' + config.name + '的聊天消息'); node.appendChild(log);
      var form = base.querySelector('form').cloneNode(true); node.appendChild(form);
      var input = form.querySelector('textarea'), send = form.querySelector('.chat-send'), status = form.querySelector('.chat-status');
      status.id = config.route + '-status'; input.setAttribute('aria-describedby', status.id);
      var timer, pending = false;
      function update() { send.disabled = pending || !input.value.trim(); input.style.height = 'auto'; input.style.height = Math.max(40, Math.min(input.scrollHeight, 120)) + 'px'; }
      function draw() {
        var thread = consultantThread(id); log.replaceChildren();
        thread.chat.forEach(function (message) {
          var row = document.createElement('article'); row.className = 'chat-message' + (message.self ? ' is-self' : '');
          if (!message.self) {
            var avatar = document.createElement('span'); avatar.className = 'chat-avatar'; avatar.setAttribute('aria-hidden', 'true'); avatar.innerHTML = consultantAvatar(config.name); row.appendChild(avatar);
          }
          var copy = document.createElement('div'); copy.className = 'chat-message-copy';
          var meta = document.createElement('span'); meta.className = 'chat-message-meta';
          meta.textContent = (message.self ? '我' : config.name) + ' · ' + new Date(message.at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
          var bubble = document.createElement('div'); bubble.className = 'chat-bubble'; bubble.textContent = message.text;
          copy.append(meta, bubble); row.appendChild(copy); log.appendChild(row);
        });
        input.value = thread.draft; update(); log.scrollTop = log.scrollHeight;
      }
      function submit() {
        var text = input.value.trim(); if (!text || pending) return;
        if (text.length > 500) { status.textContent = '内容不能超过500字。'; return; }
        var thread = consultantThread(id);
        thread.chat.push({ text: text, self: true, at: Date.now() }); thread.draft = ''; pending = true;
        save(); render(); draw(); status.textContent = '对方正在输入…';
        timer = setTimeout(function () {
          var reply = /看房|时间|周|预约/.test(text) ? '请提供您方便的到访时段和人数，接待安排需确认后再出行。' : id === '4' ? '您可以继续补充工位、会议室和入驻时间要求，具体布局与交付条件以现场核对结果为准。' : '我们可以逐项核对材料。请说明您目前准备到哪一步，证件号码等敏感信息不必在聊天中发送。';
          thread.chat.push({ text: reply, self: false, at: Date.now() }); thread.unread = node.classList.contains('hidden'); pending = false;
          save(); render(); draw(); status.textContent = '';
        }, 900);
      }
      form.addEventListener('submit', function (event) { event.preventDefault(); submit(); });
      input.addEventListener('input', function () { consultantThread(id).draft = input.value; save(); update(); });
      input.addEventListener('keydown', function (event) { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); submit(); } });
      node.addEventListener('click', function (event) {
        if (event.target.closest('.chat-attach')) status.textContent = '暂不支持附件，请使用文字沟通。';
        var action = event.target.closest('[data-chat-action]');
        if (action) status.textContent = action.dataset.chatAction === 'booking' ? '请在聊天中沟通意向空间与到访时间，确认安排后再出行。' : '该联系方式暂不可用，请使用文字沟通。';
      });
      new MutationObserver(function () { if (!node.classList.contains('hidden')) { consultantThread(id).unread = false; save(); render(); draw(); } }).observe(node, { attributes: true, attributeFilter: ['class'] });
      new MutationObserver(function () { clearTimeout(timer); pending = false; status.textContent = ''; if (!node.classList.contains('hidden')) draw(); }).observe(profile, { attributes: true, attributeFilter: ['data-role'] });
      consultantPages[id] = { refresh: draw };
    });
  }
  function page(id, title, content) {
    var node = document.createElement('section'); node.id = id; node.className = 'hidden message-detail-page';
    node.innerHTML = content; screen.appendChild(node); window.__setMiniRoute(id, title, 'messages'); return node;
  }
  page('message-space', '空间动态', '<article class="journey-panel"><span class="journey-kicker">空间更新</span><h1>A 座研发办公空间</h1><p class="journey-meta">星桥科创园 · 示例动态</p><img class="journey-cover" src="miniprogram/assets/spaces/space-card-1.png.webp" alt="研发办公空间示意"><h2>了解空间，安排下一步</h2><p>320m² 研发办公空间，精装修、南向。可租状态、价格与接待时间需由园区工作人员确认。</p><dl><div><dt>关注空间</dt><dd>A 座 · 320m²</dd></div><div><dt>沟通方式</dt><dd>在线咨询</dd></div></dl></article><div class="journey-actions"><button data-page="spaces">浏览招商空间</button><button class="journey-primary" data-journey-chat>咨询顾问</button></div>');
  page('message-booking', '预约进度', '<article class="journey-panel"><span class="journey-kicker">看房预约 · 示例记录</span><h1>等待园区确认</h1><p>当前展示预约提交后的待确认状态，并非您的真实预约。</p><dl><div><dt>意向空间</dt><dd>A 座 · 320m² 研发办公</dd></div><div><dt>到访时间</dt><dd>待双方协商</dd></div><div><dt>接待人员</dt><dd>待园区安排</dd></div></dl><h2>处理进度</h2><ol class="journey-timeline"><li class="done"><b>提交申请</b><p>已填写意向空间与到访需求（示例）</p></li><li class="current"><b>等待确认</b><p>接待人员确认时间后，将发送预约通知。</p></li><li><b>按约到访</b><p>收到确认后，再根据入园指引安排出行。</p></li></ol></article><div class="journey-actions"><button data-journey-chat class="journey-primary">咨询预约安排</button><button data-page="message-booking-help">了解预约流程</button></div>');
  page('message-booking-help', '预约指引', '<article class="journey-panel"><h1>预约前，准备这些信息</h1><ol class="journey-guide"><li><b>选择空间</b><p>明确面积、用途及预计入驻时间。</p></li><li><b>确认到访安排</b><p>与园区确认日期、人数、联系人和接待地点。</p></li><li><b>等待确认通知</b><p>申请不等于预约成功。收到正式确认后再安排到访。</p></li></ol><p>当前原型不提交真实申请，也不收集联系人信息。</p></article><div class="journey-actions"><button data-journey-chat class="journey-primary">咨询顾问</button></div>');
  window.__setMiniRoute('message-booking-help', '预约指引', 'message-booking');
  page('message-notice', '园区服务通知', '<article class="journey-panel"><span class="journey-kicker">园区服务</span><h1>节假日园区服务安排</h1><p class="journey-meta">园区服务中心 · 示例公告</p><p>节假日到访或办公前，请提前了解园区各项服务安排。</p><h2>门禁与通行</h2><p>请按园区通行要求办理登记。具体开放时段以正式公告为准。</p><h2>餐厅与物业</h2><p>餐厅营业及物业值班时间待正式资料配置，当前不提供未经确认的时间或联系电话。</p><h2>需要帮助？</h2><p>可从企业服务入口查看现有服务，涉及身份验证的功能按原有权限规则处理。</p></article><div class="journey-actions"><button data-page="enterprise-services" class="journey-primary">查看企业服务</button><button data-page="messages">返回消息</button></div>');
  function chat(parent) {
    window.__setMiniRoute('leasing-chat', '招商咨询', parent);
    window.__showMiniPage('leasing-chat');
  }
  list.addEventListener('click', function (event) {
    var card = event.target.closest('[data-message]'); if (!card) return;
    var index = cards.indexOf(card);
    if (index >= 0) openMessage(index, 'messages');
  });
  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-journey-chat]')) chat(event.target.closest('section').id);
    var entry = event.target.closest('[data-page="leasing-chat"]');
    if (entry) window.__setMiniRoute('leasing-chat', '招商咨询', entry.closest('section')?.id || 'home');
  }, true);
  document.getElementById('space-contact-open').onclick = function () {
    state.context = document.getElementById('space-detail-title').textContent + ' · ' + document.getElementById('space-detail-meta').textContent;
    save(); render(); chat('space-detail');
  };
  window.__messageJourney = {
    history: function () { return state.chat; },
    append: function (text, self, link) {
      state.chat.push({ text: text, self: self, link: link, at: Date.now() }); state.draft = '';
      if (!self && document.getElementById('leasing-chat').classList.contains('hidden')) state.read = state.read.filter(function (id) { return id !== cards[0].dataset.message; });
      save(); render();
    }
  };
  load(); render(); icons();
  function bindChat() {
    initConsultantChats();
    var input = document.querySelector('#leasing-chat textarea');
    input.value = state.draft; input.dispatchEvent(new Event('input'));
    input.addEventListener('input', function () { state.draft = input.value; save(); });
    var chatPage = document.getElementById('leasing-chat');
    new MutationObserver(function () {
      if (!chatPage.classList.contains('hidden')) {
        state.read.push(cards[0].dataset.message); save(); render();
        input.dispatchEvent(new Event('input'));
      }
    }).observe(chatPage, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(function () { load(); render(); input.value = state.draft; input.dispatchEvent(new Event('input')); }).observe(profile, { attributes: true, attributeFilter: ['data-role'] });
  }
  // Load the role's history before the existing chat resets on a role switch.
  new MutationObserver(function () { load(); render(); }).observe(profile, { attributes: true, attributeFilter: ['data-role'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindChat); else bindChat();
})();
