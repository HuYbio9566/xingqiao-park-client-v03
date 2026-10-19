/* Local park-service journeys. This is a frontend demo state, not a backend integration. */
(function () {
  'use strict';

  var screen = document.querySelector('.screen');
  var profile = document.getElementById('profile');
  if (!screen || !profile || !window.__showMiniPage || !window.__setMiniRoute) return;

  var KEY = 'park-service-journeys-v1';
  var COMPANY = '北京星桥科技';
  var pages = {}, renderers = {}, parents = {}, activityTitle = '';
  var workflows = window.__roleWorkflows;
  var store = window.MiniStore;
  var state = defaults();
  var persisted = null;
  var originalShow = window.__showMiniPage;
  var originalCan = window.__canMiniPage || function () { return true; };

  function defaults() {
    return {
      vehicles: [{ id: 'CAR-001', owner: 'employee', company: COMPANY, plate: '沪A·8X6Q2', type: '月租车', status: '已绑定' }],
      vehicleRequests: [],
      diningOrders: [],
      parkingOrders: [],
      activityRegistrations: [],
      specialTickets: [],
      monitorRequests: [],
      sitePreparations: []
    };
  }

  function load() {
    try {
      persisted = localStorage.getItem(KEY);
      var saved = JSON.parse(persisted || 'null');
      if (!saved) return;
      Object.keys(state).forEach(function (name) {
        if (Array.isArray(saved[name])) state[name] = saved[name];
      });
    } catch (error) {
      persisted = null;
    }
  }
  load();
  // Property-workbench coverage records for 订餐费用 and 活动报名, added once by id.
  (function () {
    var day = function (offset) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offset * 86400000)); };
    var changed = false;
    // Seed only a fresh store; saved journeys keep exactly what the user has.
    if (persisted) return;
    function add(list, record) { if (!state[list].some(function (item) { return item.id === record.id; })) { state[list].push(Object.assign({ company: COMPANY, coverage: true }, record)); changed = true; } }
    add('diningOrders', { id: 'DINING-CV-001', owner: 'employee', kind: 'catering', title: '企业定制 · 部门午餐 · 12人', menu: '企业定制', quantity: 12, pickup: day(2) + ' 12:00', amount: 336, contact: '王晓明', phone: '138****0000', status: '待物业联系', detail: day(2) + ' 12:00 · 12人', feeState: 'pending', history: ['提交企业定制预订'] });
    add('diningOrders', { id: 'DINING-CV-002', owner: 'employee', kind: 'catering', title: '企业定制 · 客户接待 · 6人', menu: '企业定制', quantity: 6, pickup: day(-4) + ' 18:00', amount: 288, contact: '王晓明', phone: '138****0000', status: '已完成', detail: day(-4) + ' 18:00 · 6人', feeState: 'paid', feeStatus: 'paid', history: ['提交企业定制预订', '物业已收费'] });
    add('diningOrders', { id: 'DINING-CV-003', owner: 'admin', kind: 'catering', title: '企业定制 · 管理层会议茶歇 · 8人', menu: '企业定制', quantity: 8, pickup: day(-10) + ' 15:00', amount: 176, contact: '唐慧丽', phone: '138****6605', status: '已完成', detail: day(-10) + ' 15:00 · 8人', feeState: 'contacted', history: ['提交企业定制预订', '物业已联系缴费'] });
    add('activityRegistrations', { id: 'HD-CV-001', owner: 'employee', activity: '中小企业数字化转型分享会', name: '王晓明', phone: '138****0000', count: 2, status: 'registered', history: ['企业员工提交活动报名'] });
    add('activityRegistrations', { id: 'HD-CV-002', owner: 'employee', activity: '园区秋季健康讲座', name: '王晓明', phone: '138****0000', count: 1, status: 'checked-in', history: ['企业员工提交活动报名', '物业人员现场签到'] });
    add('activityRegistrations', { id: 'HD-CV-003', owner: 'admin', activity: '科创企业投融资对接会', name: '唐慧丽', phone: '138****6605', count: 1, status: 'verified', history: ['企业管理员提交活动报名', '物业人员现场签到', '物业人员完成现场核销'] });
    if (changed) { try { localStorage.setItem(KEY, JSON.stringify(state)); persisted = localStorage.getItem(KEY); } catch (error) {} }
  })();

  function role() { return profile.dataset.role || 'guest'; }
  function employee() { return role() === 'employee'; }
  function admin() { return role() === 'admin'; }
  function property() { return role() === 'property'; }
  function enterprise() { return employee() || admin(); }
  function el(tag, text, className) {
    var node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }
  function button(text, handler, primary) {
    var node = el('button', text, primary ? 'role-primary' : '');
    node.type = 'button'; node.addEventListener('click', handler); return node;
  }
  function heading(node, title, copy) {
    // Page title already lives in the navbar; show the copy as a dismissible scrolling notice bar.
    var notice = el('div', undefined, 'journey-notice'); notice.setAttribute('role', 'note');
    var track = el('div', undefined, 'journey-notice-track'); track.appendChild(el('span', copy, 'journey-copy'));
    var close = button('×', function () { notice.remove(); }); close.className = 'journey-notice-close'; close.setAttribute('aria-label', '关闭提示');
    notice.append(track, close); node.replaceChildren(notice);
  }
  function actions(node) { var bar = el('div', undefined, 'role-actions journey-actions'); node.appendChild(bar); return bar; }
  // Full-width action bar placed after a form card (outside the card).
  function blockActions(node) { var bar = actions(node); bar.classList.add('journey-block-actions'); return bar; }
  function status(node) { var item = el('p', undefined, 'role-feedback journey-feedback'); item.setAttribute('role', 'status'); node.appendChild(item); return item; }
  function panel(node, title, badge, copy) {
    var card = el('article', undefined, 'role-panel journey-card');
    var row = el('div', undefined, 'role-row'); row.append(el('strong', title), el('span', badge || '', 'role-status')); card.appendChild(row);
    if (copy) card.appendChild(el('p', copy)); node.appendChild(card); return card;
  }
  function fields(node, pairs) {
    var list = el('dl', undefined, 'journey-fields');
    pairs.forEach(function (pair) { list.append(el('dt', pair[0]), el('dd', pair[1] === undefined || pair[1] === '' ? '未填写' : pair[1])); });
    node.appendChild(list);
  }
  function field(form, label, name, type, required) {
    var wrapper = el('label', label + (required ? ' *' : ''), 'journey-field');
    var input = el(type === 'textarea' ? 'textarea' : 'input'); input.name = name; input.required = !!required; input.maxLength = type === 'textarea' ? 2000 : 200;
    if (type !== 'textarea') input.type = type || 'text'; wrapper.appendChild(input); form.appendChild(wrapper); return input;
  }
  function selectField(form, label, name, options) {
    var wrapper = el('label', label, 'journey-field'), select = el('select'); select.name = name;
    options.forEach(function (option) { var item = el('option', option[1]); item.value = option[0]; select.appendChild(item); });
    // Mobile picker: hidden select stays the value source; a trigger opens a bottom sheet
    // reusing the existing .space-picker visual system.
    select.hidden = true; select.tabIndex = -1;
    var trigger = el('button', undefined, 'journey-select-trigger'), value = el('span');
    trigger.type = 'button'; trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false');
    trigger.append(value); trigger.insertAdjacentHTML('beforeend', CHEVRON);
    function sync() { value.textContent = select.options[select.selectedIndex].text; trigger.setAttribute('aria-label', label + '：' + value.textContent); }
    select.addEventListener('change', sync); sync();
    trigger.addEventListener('click', function (event) { event.preventDefault(); openPicker(label, select, trigger); });
    wrapper.append(select, trigger); form.appendChild(wrapper); return select;
  }
  var CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  function openPicker(title, select, trigger) {
    var phone = document.querySelector('.phone') || document.body;
    var sheet = el('div', undefined, 'space-picker journey-picker'), mask = el('div', undefined, 'space-picker-mask');
    var panel = el('div', undefined, 'space-picker-panel'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', title);
    var head = el('header'), cancel = button('取消', function () { close(); }); cancel.className = 'space-picker-cancel';
    head.append(el('h2', title), cancel);
    var list = el('div', undefined, 'space-picker-options'); list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', title);
    Array.from(select.options).forEach(function (option, index) {
      var item = button('', function () {
        select.selectedIndex = index; select.dispatchEvent(new Event('change', { bubbles: true })); close();
      });
      item.className = 'space-picker-option'; item.setAttribute('role', 'option');
      item.setAttribute('aria-pressed', String(index === select.selectedIndex)); item.setAttribute('aria-selected', String(index === select.selectedIndex));
      item.append(el('span', option.text)); item.insertAdjacentHTML('beforeend', CHECK); list.appendChild(item);
    });
    function onKey(event) { if (event.key === 'Escape') { event.stopPropagation(); close(); } }
    function close() { sheet.remove(); document.removeEventListener('keydown', onKey, true); trigger.setAttribute('aria-expanded', 'false'); trigger.focus({ preventScroll: true }); }
    mask.addEventListener('click', close);
    panel.append(head, list); sheet.append(mask, panel); phone.appendChild(sheet);
    trigger.setAttribute('aria-expanded', 'true'); document.addEventListener('keydown', onKey, true);
    var current = list.querySelector('[aria-selected="true"]'); if (current) current.focus({ preventScroll: true });
  }
  function timeField(form, title, name, isEnd) {
    var wrapper = el('label', title + ' *', 'journey-field'), input = el('input');
    input.type = 'hidden'; input.name = name;
    var trigger = button('', function () { openTimeWheel(title, input, trigger, isEnd); });
    trigger.className = 'journey-select-trigger'; trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false');
    var value = el('span'); trigger.append(value); trigger.insertAdjacentHTML('beforeend', CHEVRON);
    function sync() { value.textContent = input.value || '请选择' + title; trigger.setAttribute('aria-label', title + '：' + value.textContent); }
    input.addEventListener('change', sync); sync();
    wrapper.append(input, trigger); form.appendChild(wrapper); return input;
  }
  function openTimeWheel(title, input, trigger, isEnd) {
    var phone = document.querySelector('.phone') || document.body;
    var sheet = el('div', undefined, 'space-picker journey-time-picker'), mask = el('div', undefined, 'space-picker-mask');
    var panel = el('div', undefined, 'space-picker-panel'), head = el('header');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', title);
    var cancel = button('取消', close), done = button('完成', function () {
      input.value = pad(hours.value()) + ':' + pad(minutes.value());
      input.dispatchEvent(new Event('change', { bubbles: true })); close();
    });
    cancel.className = 'space-picker-cancel'; done.className = 'journey-time-done';
    head.append(cancel, el('h2', title), done);
    var wheels = el('div', undefined, 'journey-time-wheels');
    var initial = (input.value || (isEnd ? '10:00' : '09:00')).split(':');
    var hours = column('小时', isEnd ? 24 : 23, Number(initial[0]));
    wheels.append(hours.node, el('span', '时', 'journey-time-unit'));
    var minutes = column('分钟', 59, Number(initial[1]));
    wheels.append(minutes.node, el('span', '分', 'journey-time-unit'));
    function pad(n) { return String(n).padStart(2, '0'); }
    function column(label, max, initialValue) {
      var node = el('div', undefined, 'journey-time-wheel'), rows = [];
      node.tabIndex = 0; node.setAttribute('role', 'spinbutton'); node.setAttribute('aria-label', label); node.setAttribute('aria-valuemin', '0'); node.setAttribute('aria-valuemax', String(max));
      for (var n = 0; n <= max; n++) {
        var row = el('div', pad(n), 'journey-time-tick'); row.setAttribute('aria-hidden', 'true'); node.appendChild(row); rows.push(row);
      }
      var locked = false;
      function value() { return Math.max(0, Math.min(max, Math.round(node.scrollTop / 44))); }
      function sync() {
        var selected = value();
        node.setAttribute('aria-valuenow', String(selected)); node.setAttribute('aria-valuetext', pad(selected) + (label === '小时' ? '时' : '分'));
        rows.forEach(function (row, index) { row.classList.toggle('is-selected', index === selected); });
        if (hours && minutes && node === hours.node) syncEnd();
      }
      function set(next) { node.scrollTop = Math.max(0, Math.min(locked ? 0 : max, next)) * 44; sync(); }
      node.addEventListener('scroll', sync, { passive: true });
      node.addEventListener('click', function (event) { var index = rows.indexOf(event.target); if (index >= 0) set(index); });
      node.addEventListener('keydown', function (event) {
        var next = { ArrowUp: value() - 1, ArrowDown: value() + 1, Home: 0, End: max, PageUp: value() - 5, PageDown: value() + 5 }[event.key];
        if (next !== undefined) { event.preventDefault(); set(next); }
      });
      return { node: node, value: value, set: set, init: function () { set(initialValue); }, lock: function (on) {
        locked = on; node.classList.toggle('is-locked', on); node.setAttribute('aria-disabled', String(on)); node.setAttribute('aria-valuemax', on ? '0' : String(max)); if (on) set(0);
      } };
    }
    function syncEnd() { minutes.lock(hours.value() === 24); }
    function onKey(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key === 'Tab') {
        var targets = [cancel, hours.node, minutes.node, done], index = targets.indexOf(document.activeElement);
        event.preventDefault(); targets[(index + (event.shiftKey ? 3 : 1)) % 4].focus({ preventScroll: true });
      }
    }
    function close() { sheet.remove(); document.removeEventListener('keydown', onKey, true); trigger.setAttribute('aria-expanded', 'false'); trigger.focus({ preventScroll: true }); }
    mask.addEventListener('click', close);
    panel.append(head, wheels); sheet.append(mask, panel); phone.appendChild(sheet);
    hours.init(); minutes.init(); syncEnd();
    trigger.setAttribute('aria-expanded', 'true'); document.addEventListener('keydown', onKey, true); hours.node.focus({ preventScroll: true });
  }
  function formPanel(node, title, copy) {
    var card = el('article', undefined, 'role-panel journey-form-panel'); card.append(el('h2', title), el('p', copy, 'journey-copy')); node.appendChild(card); return card;
  }
  function parentForEntry() {
    var active = screen.querySelector('section:not(.hidden)');
    if (!active) return 'home';
    if (active.id === 'park-services-all' || active.id === 'profile' || active.id.indexOf('my-') === 0 || active.id.indexOf('property-workbench-') === 0) return active.id;
    return active.id === 'enterprise-activity-detail' ? active.id : 'home';
  }
  function scoped(list, includeProperty) {
    return (list || []).filter(function (item) {
      if (property() && includeProperty !== false) return true;
      if (!enterprise()) return false;
      return item.company === COMPANY && (admin() || item.owner === 'employee' || item.owner === role());
    });
  }
  function own(list) { return (list || []).filter(function (item) { return enterprise() && item.company === COMPANY && item.owner === role(); }); }
  function nextId(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }
  function stamp() { return new Date().toISOString(); }
  function displayStatus(value) {
    return ({ submitted: '待受理', accepted: '已受理', processing: '处理中', result: '待结果确认', confirmed: '已确认', closed: '已关闭', pending: '待物业审批', enterprise: '待企业审批', enterprise_pending: '待企业审批', property: '待物业审批', property_pending: '待物业审批', withdrawn: '已撤回', approved: '已批准', approved_for_offline_handover: '已批准 · 待线下对接', rejected: '已驳回', handoff: '待线下对接', finance_pending: '待物业办理', awaiting_confirmation: '待结果确认', completed: '已完成', registered: '已报名', '已报名 · 本地演示': '已报名', '已签到 · 本地演示': '已签到', '已核销 · 本地演示': '已核销', '已签到': '已签到', '已核销': '已核销', '待餐厅确认': '待餐厅确认', '已取消': '已取消' }[value] || value || '状态未标记');
  }
  function externalApi() { return window.__serviceJourneys || null; }
  function externalRows(name, includeSamples) {
    var api = externalApi();
    if (!api || !api.getRecords) return [];
    var owner = property() ? 'property' : admin() ? null : role();
    var rows = api.getRecords(name, owner, COMPANY) || [];
    return includeSamples === false ? rows.filter(function (item) { return !item.sample; }) : rows;
  }
  function workflowRows(name) {
    if (!workflows || !workflows.myRecords) return [];
    var rows = workflows.myRecords()[name] || [];
    return Array.isArray(rows) ? rows : [];
  }
  function uniqueRows(rows) {
    var seen = {};
    return (rows || []).filter(function (item) { if (!item || seen[item.id]) return false; seen[item.id] = true; return true; });
  }
  function updateExternal(name, id, change) {
    var api = externalApi();
    if (!api || !api.update) return false;
    var mutation = typeof change === 'function' ? change : function (item) { Object.keys(change || {}).forEach(function (key) { item[key] = change[key]; }); };
    return !!api.update(name, id, mutation);
  }
  function save(change, note) {
    var before = JSON.stringify(state);
    try {
      var current = localStorage.getItem(KEY);
      if (persisted !== null && current !== persisted) { if (note) note.textContent = '其他页面已更新服务记录，请重新进入后重试。'; return false; }
      change();
      localStorage.setItem(KEY, JSON.stringify(state));
      persisted = localStorage.getItem(KEY);
      window.dispatchEvent(new Event('park-service-journeys-change'));
      window.dispatchEvent(new Event('mini-records-change'));
      return true;
    } catch (error) {
      try { state = JSON.parse(before); } catch (restoreError) {}
      if (note) note.textContent = '浏览器存储不可用，未保存本次操作；表单内容仍保留，请稍后重试。';
      return false;
    }
  }
  function sync() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!saved) return;
      Object.keys(state).forEach(function (name) { if (Array.isArray(saved[name])) state[name] = saved[name]; });
      persisted = localStorage.getItem(KEY);
    } catch (error) {}
  }
  function route(id, title, parent) { parents[id] = parent || parentForEntry(); window.__setMiniRoute(id, title, parents[id]); }
  function page(id, title, parent) {
    var node = el('section', undefined, 'hidden journey-page'); node.id = id; screen.appendChild(node); route(id, title, parent); pages[id] = node; return node;
  }

  var vehiclePage = page('journey-vehicle', '车辆服务');
  var vehicleDetailPage = page('journey-vehicle-detail', '车辆详情', vehiclePage.id);
  var releasePage = page('journey-release', '物品放行');
  var renovationPage = page('journey-renovation', '装修申请');
  var utilitiesPage = page('journey-utilities', '水电缴费');
  var specialPage = page('journey-special', '专项服务');
  var monitorPage = page('journey-monitor', '监控调取');
  var diningPage = page('journey-dining', '订餐服务');
  var activityPage = page('journey-activity-registration', '活动报名');
  // Keep the existing restaurant page as the native catalog entry; only parking
  // needs an alias because it has no standalone legacy page.
  var pagesByAlias = {
    vehicle: 'journey-vehicle', parking: 'journey-vehicle', release: 'journey-release',
    renovation: 'journey-renovation', utilities: 'journey-utilities', special: 'journey-special',
    monitor: 'journey-monitor', dining: 'journey-dining', restaurant: 'journey-dining', activity: 'journey-activity-registration'
  };

  function requestCard(node, item, title, extra) {
    var card = panel(node, title, displayStatus(item.status), item.detail || item.description || '');
    var pairs = [['记录编号', item.id], ['企业', item.company], ['提交人', item.owner === 'employee' ? '企业员工' : item.owner === 'admin' ? '企业管理员' : '物业人员']].concat(extra || []);
    fields(card, property() ? pairs.filter(function (pair) { return pair[1] !== undefined && pair[1] !== '' && pair[1] !== '未填写'; }) : pairs);
    if (item.history && item.history.length) card.appendChild(el('p', item.history.join(' → '), 'journey-history'));
    return card;
  }
  function openExisting(id, fallback) {
    if (window[id]) return window[id]();
    if (id === 'release' && window.__propertyWorkbench) return window.__propertyWorkbench.openReleaseForm();
    if (fallback) fallback();
  }

  var vehicleTab = 'mine';
  var vehicleDetailId = null;
  var vehicleEditing = false;

  // Owners manage their own vehicles; admins manage the company's vehicles; property staff manage every bound vehicle.
  function canManageVehicle(item) { return !!item && (property() || enterprise() && item.company === COMPANY && (item.owner === role() || admin())); }
  function vehicleRecord(id) {
    return scoped(state.vehicles).find(function (item) { return item.id === id; }) || null;
  }

  function vehicleHasDue(item) {
    return !!item && (item.paymentStatus === 'pending' || Number(item.parkingDue) > 0);
  }

  function openVehicleDetail(item) {
    if (!item || !vehicleRecord(item.id)) return;
    vehicleDetailId = item.id;
    vehicleEditing = false;
    route(vehicleDetailPage.id, '车辆详情', vehiclePage.id);
    renderers[vehicleDetailPage.id]();
    originalShow(vehicleDetailPage.id);
  }

  function renderVehiclePayment(node, item) {
    if (!vehicleHasDue(item)) return;
    var card = el('article', undefined, 'role-panel journey-vehicle-payment');
    card.append(el('div', undefined, 'role-row'));
    var row = card.querySelector('.role-row');
    row.append(el('strong', '待缴费车辆'), el('span', '待缴费', 'role-status journey-status-warning'));
    card.append(el('p', item.plate + ' · ' + (Number(item.parkingDue) > 0 ? '停车费用 ¥' + Number(item.parkingDue).toFixed(2) : '请按停车管理规则办理缴费'), 'journey-copy'));
    var note = status(card), bar = actions(card);
    bar.appendChild(button('前往缴费', function () { note.textContent = '请使用上方停车缴费二维码办理缴费。'; }, true));
    node.appendChild(card);
  }

  function renderVehicleDetail() {
    vehicleDetailPage.replaceChildren();
    var body = el('div', undefined, 'journey-page-body'); vehicleDetailPage.appendChild(body);
    var item = vehicleRecord(vehicleDetailId);
    if (!item) {
      body.appendChild(el('p', '车辆记录不存在或已删除。', 'journey-empty'));
      body.appendChild(button('返回车辆服务', function () { window.__showMiniPage(vehiclePage.id); }, true));
      return;
    }
    var back = button('‹ 返回车辆服务', function () { window.__showMiniPage(vehiclePage.id); });
    back.className = 'journey-detail-back'; body.appendChild(back);
    if (vehicleEditing && canManageVehicle(item)) {
      var form = formPanel(body, '编辑车辆', '修改后将保留当前绑定状态和缴费信息。');
      var plate = field(form, '车牌号', 'plate', 'text', true); plate.value = item.plate || '';
      var type = selectField(form, '车辆类型', 'type', [['月租车', '月租车'], ['临时车辆', '临时车辆']]); type.value = item.type || '月租车'; type.dispatchEvent(new Event('change'));
      var note = status(form), bar = actions(form);
      bar.append(button('取消编辑', function () { vehicleEditing = false; renderVehicleDetail(); }), button('保存修改', function () {
        var nextPlate = plate.value.trim();
        if (!nextPlate) { note.textContent = '请填写车牌号。'; return; }
        if (save(function () { item.plate = nextPlate; item.type = type.value; item.updatedAt = stamp(); }, note)) { vehicleEditing = false; renderVehicleDetail(); }
      }, true));
      return;
    }
    var card = panel(body, item.plate, item.status || '已绑定', item.type || '车辆信息');
    fields(card, [['车辆编号', item.id], ['企业', item.company], ['车辆类型', item.type], ['绑定状态', item.status || '已绑定']]);
    if (item.effectiveUntil) fields(card, [['有效期至', item.effectiveUntil]]);
    renderVehiclePayment(body, item);
    var note = status(card), bar = actions(card);
    if (canManageVehicle(item)) bar.append(button('编辑车辆', function () { vehicleEditing = true; renderVehicleDetail(); }), button('删除车辆', function () {
      var remove = function () {
        if (save(function () { var index = state.vehicles.indexOf(item); if (index >= 0) state.vehicles.splice(index, 1); }, note)) { vehicleDetailId = null; window.__showMiniPage(vehiclePage.id); }
      };
      if (window.__miniConfirm) window.__miniConfirm({ title: '确定删除这辆车吗？', message: '删除后将解除本账号的车辆绑定，且无法恢复，请谨慎操作。', confirmText: '删除', danger: true, onConfirm: remove });
      else if (window.confirm('确定删除「' + item.plate + '」吗？删除后无法恢复。')) remove();
    }, true));
  }
  // Bottom-sheet dialog for editing a bound vehicle; re-submit triggers re-review.
  function openEditVehicle(item) {
    var phone = document.querySelector('.phone') || document.body;
    var mask = el('div', undefined, 'journey-modal');
    var sheet = el('div', undefined, 'role-panel journey-form-panel journey-modal-sheet journey-vehicle-sheet');
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'journey-edit-title');
    var head = el('div', undefined, 'journey-modal-head'), title = el('h2', '编辑车辆信息'); title.id = 'journey-edit-title';
    function onKey(event) { if (event.key === 'Escape') close(); }
    function close(restoreFocus) {
      mask.remove(); document.removeEventListener('keydown', onKey);
    }
    var closeButton = button('×', function () { close(); }); closeButton.className = 'journey-modal-close'; closeButton.setAttribute('aria-label', '关闭编辑车辆弹窗');
    head.append(title, closeButton);
    sheet.append(head, el('p', '修改车牌号或车辆类型后，绑定状态将重置为「待园区确认」，需重新完成园区审核流程。', 'journey-copy'));
    var plate = field(sheet, '车牌号', 'plate', 'text', true); plate.value = item.plate || '';
    var type = selectField(sheet, '车辆类型', 'type', [['月租车', '月租车'], ['临时车辆', '临时车辆']]); type.value = item.type || '月租车'; type.dispatchEvent(new Event('change'));
    var message = status(sheet);
    actions(sheet).appendChild(button('保存修改', function () {
      var nextPlate = plate.value.trim();
      if (!nextPlate) { message.textContent = '请填写车牌号。'; return; }
      if (save(function () { item.plate = nextPlate; item.type = type.value; item.status = '待园区确认'; item.updatedAt = stamp(); }, message)) { close(false); renderVehicle(); }
    }, true));
    mask.addEventListener('click', function (event) { if (event.target === mask) close(); });
    mask.appendChild(sheet); phone.appendChild(mask); document.addEventListener('keydown', onKey); plate.focus({ preventScroll: true });
  }
  // Bottom-sheet dialog for binding a vehicle; mounted inside the phone frame.
  function openBindVehicle() {
    var phone = document.querySelector('.phone') || document.body;
    var mask = el('div', undefined, 'journey-modal');
    var sheet = el('div', undefined, 'role-panel journey-form-panel journey-modal-sheet journey-vehicle-sheet');
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'journey-bind-title');
    var head = el('div', undefined, 'journey-modal-head'), title = el('h2', '绑定车辆'); title.id = 'journey-bind-title';
    function onKey(event) { if (event.key === 'Escape') close(); }
    function close(restoreFocus) {
      mask.remove(); document.removeEventListener('keydown', onKey);
      var trigger = vehiclePage.querySelector('[data-vehicle-bind]'); if (restoreFocus !== false && trigger) trigger.focus({ preventScroll: true });
    }
    var closeButton = button('×', function () { close(); }); closeButton.className = 'journey-modal-close'; closeButton.setAttribute('aria-label', '关闭绑定车辆弹窗');
    head.append(title, closeButton);
    sheet.append(head, el('p', '提交后由园区审核，审核通过后车牌即可在园区车场自动识别。', 'journey-copy'));
    var plate = field(sheet, '车牌号', 'plate', 'text', true), type = selectField(sheet, '车辆类型', 'type', [['月租车', '月租车'], ['临时车辆', '临时车辆']]), message = status(sheet);
    actions(sheet).appendChild(button('保存车辆', function () {
      if (!plate.value.trim()) { message.textContent = '请填写车牌号。'; return; }
      if (save(function () { state.vehicles.unshift({ id: nextId('CAR'), owner: role(), company: COMPANY, plate: plate.value.trim(), type: type.value, status: '待园区确认', paymentStatus: 'paid', parkingDue: 0 }); }, message)) { close(false); renderVehicle(); }
    }, true));
    mask.addEventListener('click', function (event) { if (event.target === mask) close(); });
    mask.appendChild(sheet); phone.appendChild(mask); document.addEventListener('keydown', onKey); plate.focus({ preventScroll: true });
  }
  // Demo parking payment QR, generated offline by the vendored qrcode-generator.
  function parkingPayCard(node) {
    var card = el('article', undefined, 'role-panel journey-form-panel journey-pay-card');
    card.append(el('h2', '停车缴费'), el('p', '使用微信扫码缴纳停车费，也可保存二维码后在微信中识别，或点击“前往缴费”前往停车管理小程序。', 'journey-copy'));
    var box = el('div', undefined, 'journey-pay-qr'), src = '';
    if (window.qrcode) {
      var qr = window.qrcode(0, 'M'); qr.addData('https://example.com/parking-pay?park=xingqiao&demo=1'); qr.make(); src = qr.createDataURL(6, 2);
      var img = el('img'); img.src = src; img.alt = '停车缴费二维码'; box.appendChild(img);
    } else box.appendChild(el('p', '二维码组件未加载，请刷新后重试。', 'journey-empty'));
    card.append(box, el('p', '打开微信扫一扫，快速缴纳停车费', 'journey-pay-note'));
    var note = status(card), bar = actions(card); bar.classList.add('journey-pay-actions');
    // Primary pay action sits on the right.
    var payButton = button('前往缴费', function () { note.textContent = '正在前往停车缴费小程序…'; }, true);
    bar.append(button('保存二维码', function () {
      if (!src) { note.textContent = '二维码未生成，请刷新后重试。'; return; }
      var link = el('a'); link.href = src; link.download = '星桥科创园-停车缴费二维码.gif'; document.body.appendChild(link); link.click(); link.remove();
      note.textContent = '二维码已保存，可在微信中识别缴费。';
    }), payButton);
    node.appendChild(card);
  }
  function renderVehicle() {
    heading(vehiclePage, '车辆服务', '车辆绑定、停车缴费和车辆事项办理集中在这里，绑定车辆后可在园区车场自动识别车牌。');
    // Section headings become a white tab bar; only the selected panel is shown.
    var tabBar = el('div', undefined, 'journey-tabs'); tabBar.setAttribute('role', 'tablist'); tabBar.setAttribute('aria-label', '车辆服务分类');
    var mine = el('div', undefined, 'journey-tab-panel'), matters = el('div', undefined, 'journey-tab-panel');
    [['mine', '我的车辆', mine], ['matters', '停车与车辆事项', matters]].forEach(function (item) {
      var tab = button(item[1], function () { vehicleTab = item[0]; renderVehicle(); vehiclePage.querySelector('[data-vehicle-tab="' + item[0] + '"]').focus({ preventScroll: true }); });
      tab.setAttribute('role', 'tab'); tab.dataset.vehicleTab = item[0]; tab.setAttribute('aria-selected', String(vehicleTab === item[0]));
      item[2].setAttribute('role', 'tabpanel'); item[2].hidden = vehicleTab !== item[0]; tabBar.appendChild(tab);
    });
    // Notice, tab bar and content are three sibling blocks so each can be selected on its own.
    var body = el('div', undefined, 'journey-page-body'); body.append(mine, matters);
    vehiclePage.classList.add('journey-page-split'); vehiclePage.append(tabBar, body);
    // Bound vehicles first; stable sort keeps the original order within each group.
    var list = scoped(state.vehicles).map(function (item, index) { return { item: item, index: index }; })
      .sort(function (a, b) { return (a.item.status === '已绑定' ? 0 : 1) - (b.item.status === '已绑定' ? 0 : 1) || a.index - b.index; })
      .map(function (entry) { return entry.item; });
    // Parking payment card leads the "我的车辆" tab.
    if (enterprise() || property()) parkingPayCard(mine);
    if (!list.length) mine.appendChild(el('p', '当前身份暂无车辆记录。', 'journey-empty'));
    list.forEach(function (item) {
      var card = panel(mine, item.plate, vehicleHasDue(item) ? '待缴费' : item.status, item.type);
      fields(card, [['车辆编号', item.id], ['企业', item.company]]);
      if (!canManageVehicle(item)) return;
      var cardNote = status(card), bar = actions(card); bar.classList.add('journey-vehicle-card-actions');
      // 删除车辆: confirm dialog then remove
      bar.appendChild(button('删除车辆', (function (v) { return function () {
        var remove = function () {
          if (save(function () { var idx = state.vehicles.indexOf(v); if (idx >= 0) state.vehicles.splice(idx, 1); }, cardNote)) renderVehicle();
        };
        if (window.__miniConfirm) window.__miniConfirm({ title: '确认删除车辆？', message: '删除「' + v.plate + '」后将解除绑定，且无法恢复，请谨慎操作。', confirmText: '确认删除', danger: true, onConfirm: remove });
        else if (window.confirm('确定删除「' + v.plate + '」吗？删除后无法恢复。')) remove();
      }; })(item)));
      // 编辑车辆: bottom sheet with re-review notice
      bar.appendChild(button('编辑车辆', (function (v) { return function () { openEditVehicle(v); }; })(item)));
    });
    list.filter(vehicleHasDue).forEach(function (item) { renderVehiclePayment(mine, item); });
    if (enterprise() || property()) {
      var bindButton = button('绑定车辆', function () { openBindVehicle(); }, true); bindButton.dataset.vehicleBind = 'true';
      var bindBar = actions(mine); bindBar.classList.add('journey-block-actions'); bindBar.appendChild(bindButton);
    }
    // Employees, admins and property staff share one submission page; the submitter decides the approval path.
    if (enterprise() || property()) {
      var flowCopy = employee() ? '停车费用代缴先由企业管理员审批，再由物业审批；通过后进入「我的账单」联系付款。'
        : admin() ? '企业管理员提交无需企业审批，物业审批通过后进入「我的账单」联系付款。'
        : '物业人员发起的车辆事项无需审批，提交后直接进入「我的账单」办理付款。';
      var request = formPanel(matters, '发起车辆事项', flowCopy);
      var category = selectField(request, '事项类型', 'category', [['停车费用代缴', '停车费用代缴'], ['车辆通行 / 现场查验', '车辆通行 / 现场查验']]);
      var requestPlate = field(request, '车牌号', 'vehiclePlate', 'text', true), amount = field(request, '金额（元）', 'amount', 'number');
      var detail = field(request, '申请说明', 'detail', 'textarea', true);
      amount.min = '0'; amount.step = '0.01'; amount.placeholder = '停车费用代缴请填写金额';
      var requestNote = status(request), propertyCheckbox = null;
      // Only employees choose whether property review is needed; admin always goes to property, property needs none.
      if (employee()) {
        var propertyReview = el('label', undefined, 'journey-check journey-check-row journey-check-outside');
        propertyCheckbox = el('input'); propertyCheckbox.type = 'checkbox'; propertyCheckbox.name = 'requiresPropertyReview'; propertyReview.append(propertyCheckbox, el('span', '需要物业审核'));
        matters.appendChild(propertyReview);
      }
      var submitBar = actions(matters); submitBar.classList.add('journey-block-actions');
      submitBar.appendChild(button('提交车辆事项', function () {
        var fee = category.value === '停车费用代缴', money = Number(amount.value);
        if (!requestPlate.value.trim() || !detail.value.trim()) { requestNote.textContent = '请填写车牌号和申请说明。'; return; }
        if (fee && !(money > 0)) { requestNote.textContent = '停车费用代缴请填写大于 0 的金额。'; amount.focus(); return; }
        var api = workflows && workflows.createVehicleRequest;
        var created = api && api({ category: category.value, type: fee ? 'parking' : 'vehicle-review', vehiclePlate: requestPlate.value.trim(), detail: detail.value.trim(), amount: fee ? money : 0, requiresPropertyReview: propertyCheckbox ? propertyCheckbox.checked : true, needsFinance: fee });
        if (!created) { requestNote.textContent = '保存失败，请重新打开车辆服务后重试。'; return; }
        renderVehicle(); toastSubmitted();
      }, true));
    }
    // Review queues live in 物业工作台 → 审批; submitted records live in 我的申请 / 我的账单.
    // Parking orders are listed under 我的 > 我的账单, not on the vehicle service page.
    if (!matters.childElementCount) matters.appendChild(el('p', '暂无停车与车辆事项。', 'journey-empty'));
  }

  function renderRelease() {
    heading(releasePage, '物品放行', '物业审批使用同一张申请单完成审批和查验；补件不会生成第二个 ID。' + (property() ? '物业人员请在物业审批中处理。' : ''));
    var records = workflows && workflows.propertyData ? workflows.propertyData().releaseRequests || [] : [];
    if (property()) {
      actions(releasePage).appendChild(button('打开物业审批', function () { if (window.__propertyWorkbench) window.__propertyWorkbench.open('approvals'); }, true));
    } else if (enterprise()) {
      actions(releasePage).appendChild(button('申请物品放行', function () { if (window.__propertyWorkbench) window.__propertyWorkbench.openReleaseForm(); }, true));
    } else {
      releasePage.appendChild(el('p', '登录并绑定企业身份后，可提交物品放行申请。', 'journey-empty'));
    }
    var rows = property() ? records : records.filter(function (item) { return item.owner === role() && item.company === COMPANY; });
    if (!rows.length) releasePage.appendChild(el('p', '暂无物品放行记录。', 'journey-empty'));
    rows.forEach(function (item) {
      var plannedTime = item.plannedAt ? String(item.plannedAt).replace('T', ' ') : '';
      if (item.plannedEndAt) plannedTime += ' 至 ' + String(item.plannedEndAt).replace('T', ' ');
      var card = requestCard(releasePage, item, '放行单 · ' + item.id, [['物品', item.items], ['计划时间', plannedTime], ['查验', item.inspectionNote || '待现场查验']]);
      actions(card).appendChild(button('查看放行单', function () { if (window.__propertyWorkbench) window.__propertyWorkbench.openReleaseDetail(item.id, property() ? 'property-workbench-approvals' : 'my-release-requests'); }));
    });
  }

  function renderWorkflowRequest(node, type, title, copy, actionText, propertyText) {
    heading(node, title, copy);
    var records = workflows && workflows.propertyData ? workflows.propertyData().requests || [] : [];
    records = records.filter(function (item) { return item.type === type && (property() || item.company === COMPANY && (admin() || item.owner === role())); });
    if (enterprise()) actions(node).appendChild(button(actionText, function () { if (workflows && workflows.openRequestForm) workflows.openRequestForm(type); }, true));
    if (property()) actions(node).appendChild(button(propertyText, function () {
      if (!workflows) return;
      // Renovation goes to 物业审批; utility bills to 费用管理.
      if (window.__propertyWorkbench) window.__propertyWorkbench.open(type === 'utilities' ? 'bills' : 'approvals');
      else if (workflows.openApprovals) workflows.openApprovals();
    }, true));
    if (!records.length) node.appendChild(el('p', '暂无' + title + '记录。', 'journey-empty'));
    records.forEach(function (item) {
      var card = requestCard(node, item, title + ' · ' + item.id, [['状态说明', workflows && workflows.requestState ? workflows.requestState(item) : item.status]]);
      actions(card).appendChild(button('查看申请进度', function () { if (workflows && workflows.openRequestDetail) workflows.openRequestDetail(item, property() ? 'role-approvals' : 'role-requests'); }));
    });
  }
  function renderRenovation() { renderWorkflowRequest(renovationPage, 'renovation', '装修申请', '企业内部审批通过后进入物业审批，审批通过不等于已经施工。', '发起装修申请', '打开物业审批'); }
  function renderUtilities() { renderWorkflowRequest(utilitiesPage, 'utilities', '水电缴费', '提交后由企业管理员审批，再由物业核对；审批通过不等于已经缴费。', '发起费用申请', '打开费用管理'); }

  function toastSubmitted() { if (window.__miniToast) window.__miniToast('提交成功，可在「我的」中查看记录'); }
  function renderSpecial() {
    heading(specialPage, '专项服务', '场地准备、设备协助等需要履约的服务需求进入专项服务，结果由申请人确认。');
    if (enterprise()) {
      var form = formPanel(specialPage, '提交专项服务需求', '不要把报修、投诉或建议重复提交为专项服务。');
      var title = field(form, '需求标题', 'title', 'text', true), category = selectField(form, '服务类型', 'category', [['场地准备', '场地准备'], ['设备协助', '设备协助'], ['接待协调', '接待协调']]), location = field(form, '位置 / 场景', 'location', 'text', true), detail = field(form, '需求说明', 'detail', 'textarea', true), note = status(form);
      blockActions(specialPage).appendChild(button('提交服务需求', function () {
        if (![title, location, detail].every(function (input) { return input.value.trim(); })) { note.textContent = '请完整填写需求标题、位置和说明。'; return; }
        var api = workflows && workflows.createSpecialServiceTicket;
        if (api) {
          var created = api({ title: title.value.trim(), category: category.value, detail: location.value.trim() + ' · ' + detail.value.trim() });
          if (!created) { note.textContent = '保存失败，请重新打开专项服务后重试。'; return; }
          renderSpecial(); toastSubmitted(); return;
        }
        if (save(function () { state.specialTickets.unshift({ id: nextId('ST'), owner: role(), company: COMPANY, title: title.value.trim(), category: category.value, location: location.value.trim(), detail: detail.value.trim(), status: 'submitted', history: [(admin() ? '企业管理员' : '企业员工') + '提交专项服务需求'] }); }, note)) { renderSpecial(); toastSubmitted(); }
      }, true));
    }
    // Enterprise users only submit here; their tickets are listed under 我的 > 我的工单. Property staff still handle tickets on this page.
    if (!property()) return;
    var rows = uniqueRows(workflowRows('specialTickets').concat(scoped(state.specialTickets)));
    if (!rows.length) specialPage.appendChild(el('p', '暂无专项服务工单。', 'journey-empty'));
    rows.forEach(function (item) {
      var card = requestCard(specialPage, item, item.title, [['服务类型', item.category], ['位置', item.location]]), bar = actions(card), note = status(card);
      if (property() && item.status === 'pending' && workflows && workflows.updateSpecialServiceTicket) bar.append(button('接单并分派', function () { if (workflows.updateSpecialServiceTicket(item.id, 'processing', '物业人员已接单并开始处理')) renderSpecial(); else note.textContent = '身份或工单状态已变化，请重新进入专项服务。'; }, true));
      if (property() && item.status === 'submitted') bar.append(button('接单', function () { if (save(function () { item.status = 'accepted'; item.history.push('物业人员已接单'); }, note)) renderSpecial(); }, true));
      if (property() && item.status === 'accepted') bar.append(button('开始处理', function () { if (save(function () { item.status = 'processing'; item.history.push('物业人员开始处理'); }, note)) renderSpecial(); }, true));
      if (property() && item.status === 'processing') {
        var result = field(card, '处理结果', 'result', 'textarea', true);
        if (workflows && workflows.updateSpecialServiceTicket) bar.append(button('提交处理结果', function () { if (!result.value.trim()) { note.textContent = '请填写处理结果。'; return; } if (workflows.updateSpecialServiceTicket(item.id, 'awaiting_confirmation', result.value.trim())) renderSpecial(); else note.textContent = '身份或工单状态已变化，请重新进入专项服务。'; }, true));
        else bar.append(button('提交处理结果', function () { if (!result.value.trim()) { note.textContent = '请填写处理结果。'; return; } if (save(function () { item.status = 'result'; item.result = result.value.trim(); item.history.push('物业人员提交处理结果'); }, note)) renderSpecial(); }, true));
      }
      if (employee() && item.owner === 'employee' && item.status === 'awaiting_confirmation' && workflows && workflows.updateSpecialServiceTicket) bar.append(button('确认结果', function () { if (workflows.updateSpecialServiceTicket(item.id, 'completed', '企业员工确认服务结果')) renderSpecial(); else note.textContent = '身份或工单状态已变化，请重新进入专项服务。'; }, true));
      if (employee() && item.owner === 'employee' && item.status === 'result') bar.append(button('确认结果', function () { if (save(function () { item.status = 'closed'; item.history.push('企业员工确认服务结果'); }, note)) renderSpecial(); }, true));
    });
  }

  function renderMonitor() {
    heading(monitorPage, '监控调取', employee() ? '提交后由企业管理员审批，再由物业审核；批准后按园区规则线下对接调取。' : '提交后由物业审核；批准后按园区规则线下对接调取。');
    if (enterprise()) {
      var form = formPanel(monitorPage, '提交监控调取申请', '请填写时间、区域和用途，最终是否可提供以园区规则和线下核验为准。');
      var start = field(form, '开始时间', 'startTime', 'text', true);
      var end = field(form, '结束时间', 'endTime', 'text', true);
      var area = field(form, '区域', 'area', 'text', true), reason = field(form, '申请用途', 'reason', 'textarea', true), note = status(form);
      // Same 日期 / 时 / 分 wheel as 访客预约; monitoring looks back, so past times are allowed.
      if (window.__visitWheel && window.__visitWheel.range) {
        window.__visitWheel.range(start, end, { status: note, allowPast: true, startHint: '请选择监控开始时间' });
        if (window.lucide) window.lucide.createIcons();
      }
      blockActions(monitorPage).appendChild(button('提交申请', function () {
        if (![start, end, area, reason].every(function (input) { return input.value.trim(); })) { note.textContent = '请完整填写开始时间、结束时间、区域和用途。'; return; }
        if (end.value <= start.value) { note.textContent = '结束时间须晚于开始时间。'; return; }
        var now = new Date(), nowValue = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + 'T' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        if (end.value > nowValue) { note.textContent = '监控时间不能晚于当前时间。'; return; }
        var requestedAt = start.value.replace('T', ' ') + '–' + (end.value.slice(0, 10) === start.value.slice(0, 10) ? end.value.slice(11) : end.value.replace('T', ' '));
        var api = workflows && workflows.createMonitorRequest;
        if (api) {
          var created = api({ requestedAt: requestedAt, scope: area.value.trim(), purpose: reason.value.trim() });
          if (!created) { note.textContent = '保存失败，请重新打开监控调取后重试。'; return; }
          renderMonitor(); toastSubmitted(); return;
        }
        if (save(function () { state.monitorRequests.unshift({ id: nextId('JK'), owner: role(), company: COMPANY, time: requestedAt, area: area.value.trim(), reason: reason.value.trim(), status: 'pending', history: [(admin() ? '企业管理员' : '企业员工') + '提交监控调取申请'] }); }, note)) { renderMonitor(); toastSubmitted(); }
      }, true));
    }
    // Enterprise users only submit here; their requests are listed under 我的 > 我的申请. Property staff still review requests on this page.
    if (!property()) return;
    var rows = uniqueRows(workflowRows('monitorRequests').concat(scoped(state.monitorRequests)));
    if (!rows.length) monitorPage.appendChild(el('p', '暂无监控调取申请。', 'journey-empty'));
    rows.forEach(function (item) {
      var card = requestCard(monitorPage, item, '监控调取申请 · ' + item.id, [['发生时间', item.time || item.requestedAt], ['区域', item.area || item.scope], ['用途', item.reason || item.purpose]]), bar = actions(card), note = status(card);
      if (property() && item.status === 'property_pending' && workflows && workflows.reviewMonitorRequest) bar.append(button('批准线下对接', function () { if (workflows.reviewMonitorRequest(item.id, 'approved')) renderMonitor(); else note.textContent = '身份或申请状态已变化，请重新进入监控调取。'; }, true), button('驳回', function () { if (workflows.reviewMonitorRequest(item.id, 'rejected', '物业审核未通过')) renderMonitor(); else note.textContent = '身份或申请状态已变化，请重新进入监控调取。'; }));
      if (property() && item.status === 'pending') bar.append(button('批准线下对接', function () { if (save(function () { item.status = 'handoff'; item.history.push('物业人员审核通过，转线下对接'); }, note)) renderMonitor(); }, true), button('驳回', function () { if (save(function () { item.status = 'rejected'; item.history.push('物业人员驳回申请'); }, note)) renderMonitor(); }));
      if (item.status === 'approved_for_offline_handover' || item.status === 'handoff') card.appendChild(el('p', '已批准，待按园区规则线下核验。', 'journey-warning'));
    });
  }

  // Today's menu: maintained by property staff in the back office each morning at 9:00 (static sample until the API exists).
  var DINING_MENU = [
    { id: 'm1', name: '红烧鸡腿饭', desc: '鸡腿 · 时蔬 · 米饭', price: 22, image: 'dish-01.jpg' },
    { id: 'm2', name: '番茄牛腩饭', desc: '慢炖牛腩 · 番茄汤汁', price: 26, image: 'dish-02.jpg' },
    { id: 'm3', name: '清炒时蔬套餐', desc: '两素一汤 · 米饭', price: 16, image: 'dish-03.jpg' },
    { id: 'm4', name: '鲜虾云吞面', desc: '手工云吞 · 细面', price: 20, image: 'dish-04.jpg' },
    { id: 'm5', name: '轻食鸡胸沙拉', desc: '鸡胸 · 藜麦 · 油醋汁', price: 24, image: 'dish-05.jpg' }
  ];
  var PICKUP_LOCKERS = ['1号柜', '2号柜', '3号柜'];
  // Enterprise / reception catering form fields; final field list to be provided by the park.
  var CATERING_FIELDS = [
    ['用餐日期', 'date', 'date', true], ['用餐时段', 'mealTime', 'time', true], ['用餐人数', 'headcount', 'number', true],
    ['联系人', 'contact', 'text', true], ['联系电话', 'phone', 'tel', true], ['需求说明', 'note', 'textarea', false]
  ];
  var diningTab = 'personal';
  function nextLocker() {
    var used = uniqueRows(externalRows('diningOrders').concat(state.diningOrders || [])).filter(function (item) { return item.locker; }).length;
    return PICKUP_LOCKERS[used % PICKUP_LOCKERS.length];
  }
  function saveDining(record, note) {
    var api = externalApi();
    if (api && api.create) { if (api.create('diningOrders', record)) return true; if (note) note.textContent = '保存失败，请检查浏览器存储设置后重试。'; return false; }
    return save(function () { state.diningOrders.unshift(record); }, note);
  }
  function toastDining(text) { if (window.__miniToast) window.__miniToast(text); }
  function openDishOrder(dish) {
    var phone = document.querySelector('.phone') || document.body;
    var mask = el('div', undefined, 'journey-modal'), sheet = el('div', undefined, 'role-panel journey-form-panel journey-modal-sheet');
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'journey-dish-title');
    var head = el('div', undefined, 'journey-modal-head'), title = el('h2', dish.name); title.id = 'journey-dish-title';
    function onKey(event) { if (event.key === 'Escape') close(); }
    function close() { mask.remove(); document.removeEventListener('keydown', onKey); }
    var closeButton = button('×', close); closeButton.className = 'journey-modal-close'; closeButton.setAttribute('aria-label', '关闭订餐弹窗');
    head.append(title, closeButton);
    sheet.append(head, el('p', '¥' + dish.price + ' / 份 · 提交后系统分配取餐柜，暂不支持线上支付。', 'journey-copy'));
    var quantity = field(sheet, '数量', 'quantity', 'number', true); quantity.min = '1'; quantity.max = '20'; quantity.value = '1';
    var pickup = timeField(sheet, '取餐时间', 'pickup', false); pickup.value = '12:00'; pickup.dispatchEvent(new Event('change'));
    var remark = field(sheet, '备注', 'remark', 'text', false); remark.placeholder = '口味、忌口等（选填）';
    var note = status(sheet);
    var bar = actions(sheet); bar.classList.add('journey-block-actions');
    bar.appendChild(button('确认下单', function () {
      var count = Number(quantity.value);
      if (!Number.isInteger(count) || count < 1 || count > 20 || !pickup.value) { note.textContent = '请填写 1-20 份的数量和取餐时间。'; return; }
      var locker = nextLocker();
      var record = { id: nextId('DINING'), owner: role(), company: COMPANY, kind: 'personal', title: dish.name + ' × ' + count, menu: dish.name, quantity: count, pickup: pickup.value, remark: remark.value.trim(), amount: dish.price * count, locker: locker, status: '待取餐', detail: '今日 ' + pickup.value + ' · ' + locker + ' · ¥' + dish.price * count, note: '暂不支持线上支付；取餐柜无锁，请按编号取餐。', createdAt: stamp(), propertyAuthorized: false, history: ['提交个人订餐，分配' + locker] };
      if (!saveDining(record, note)) return;
      close(); toastDining('下单成功，请到' + locker + '取餐'); renderDining();
    }, true));
    mask.addEventListener('click', function (event) { if (event.target === mask) close(); });
    mask.appendChild(sheet); phone.appendChild(mask); document.addEventListener('keydown', onKey); quantity.focus({ preventScroll: true });
  }
  function renderDining() {
    heading(diningPage, '订餐服务', '今日菜单每日 9:00 更新；暂不支持线上支付，取餐柜无锁，请按柜号取餐。');
    var tabBar = el('div', undefined, 'journey-tabs'); tabBar.setAttribute('role', 'tablist'); tabBar.setAttribute('aria-label', '订餐方式');
    var personal = el('div', undefined, 'journey-tab-panel'), catering = el('div', undefined, 'journey-tab-panel');
    [['personal', '个人订餐', personal], ['catering', '企业定制', catering]].forEach(function (item) {
      var tab = button(item[1], function () { diningTab = item[0]; renderDining(); var next = diningPage.querySelector('[data-dining-tab="' + item[0] + '"]'); if (next) next.focus({ preventScroll: true }); });
      tab.setAttribute('role', 'tab'); tab.dataset.diningTab = item[0]; tab.setAttribute('aria-selected', String(diningTab === item[0]));
      item[2].setAttribute('role', 'tabpanel'); item[2].hidden = diningTab !== item[0]; tabBar.appendChild(tab);
    });
    diningPage.append(tabBar, personal, catering);
    // Enterprise users and property staff can order personal meals; enterprise catering stays enterprise-only.
    var canPersonal = enterprise() || property();
    if (!canPersonal) { personal.appendChild(el('p', '登录并绑定企业身份后可使用订餐服务。', 'journey-empty')); catering.appendChild(el('p', '登录并绑定企业身份后可提交企业定制。', 'journey-empty')); return; }
    // Personal ordering: today's menu as a takeaway-style list.
    var menuHead = el('div', undefined, 'journey-menu-head'); menuHead.append(el('h2', '今日菜单'), el('span', '每日 9:00 更新'));
    var list = el('ul', undefined, 'journey-menu'); list.setAttribute('aria-label', '今日菜单');
    DINING_MENU.forEach(function (dish) {
      var row = el('li', undefined, 'journey-dish'), art = el('img', undefined, 'journey-dish-art'); art.src = 'miniprogram/assets/dining/' + dish.image; art.alt = dish.name; art.width = 72; art.height = 72; art.loading = 'lazy'; art.decoding = 'async';
      var info = el('div', undefined, 'journey-dish-info'); info.append(el('strong', dish.name), el('span', dish.desc), el('b', '¥' + dish.price));
      var pick = button('选择', function () { openDishOrder(dish); }, true); pick.className = 'journey-dish-pick'; pick.setAttribute('aria-label', '选择' + dish.name);
      row.append(art, info, pick); list.appendChild(row);
    });
    personal.append(menuHead, list, el('p', '取餐柜：' + PICKUP_LOCKERS.join(' / ') + '，下单后系统自动分配柜号。', 'journey-menu-tip'));
    // Property staff have no 我的账单 page, so show their own personal orders here (with locker numbers).
    if (property()) {
      var mine = uniqueRows(externalRows('diningOrders', false).concat(state.diningOrders || [])).filter(function (item) { return item.kind === 'personal' && item.owner === 'property'; });
      if (mine.length) { personal.appendChild(el('h2', '我的今日订单')); mine.forEach(function (item) { panel(personal, item.title, item.locker, item.detail); }); }
    }
    if (!enterprise()) { catering.appendChild(el('p', '企业定制由企业员工或企业管理员提交，物业人员可在物业审批的订餐服务中跟进协调。', 'journey-empty')); if (window.lucide) window.lucide.createIcons(); return; }
    // Enterprise catering: booking form; property staff follow up offline.
    var form = formPanel(catering, '企业定制预订', '用于接待用餐、会议餐等批量需求，提交后由物业线下联系确认。');
    var inputs = CATERING_FIELDS.map(function (item) { var input = item[1] === 'mealTime' ? timeField(form, item[0], item[1], false) : field(form, item[0], item[1], item[2], item[3]); if (item[1] === 'headcount') { input.min = '1'; input.max = '500'; } return [item, input]; });
    var cateringNote = status(form);
    blockActions(catering).appendChild(button('提交预订', function () {
      var missing = inputs.some(function (pair) { return pair[0][3] && !pair[1].value.trim(); });
      var values = {}; inputs.forEach(function (pair) { values[pair[0][1]] = pair[1].value.trim(); });
      if (missing || Number(values.headcount) < 1) { cateringNote.textContent = '请完整填写用餐日期、人数、时段、联系人和联系电话。'; return; }
      var record = { id: nextId('CATER'), owner: role(), company: COMPANY, kind: 'catering', title: '企业定制 · ' + values.date + ' · ' + values.headcount + '人', menu: '企业定制', quantity: Number(values.headcount), pickup: values.date + ' ' + values.mealTime, contact: values.contact, phone: values.phone, remark: values.note, status: '待物业联系', detail: values.date + ' ' + values.mealTime + ' · ' + values.headcount + '人 · 联系人 ' + values.contact, note: '物业将线下联系确认菜单、费用与送餐安排。', createdAt: stamp(), propertyAuthorized: true, history: ['提交企业定制预订'] };
      if (!saveDining(record, cateringNote)) return;
      toastDining('提交成功，物业将线下联系您'); renderDining();
    }, true));
    if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8, 'aria-hidden': 'true', focusable: 'false' } });
  }

  function renderActivity() {
    heading(activityPage, '活动报名', activityTitle ? activityTitle + ' · 报名信息只保存于当前浏览器。' : '活动报名记录与现场签到 / 核销共用同一报名记录。');
    var canonical = externalApi() ? externalRows('activityRegistrations') : [];
    var existing = canonical.concat(state.activityRegistrations).find(function (item) { return (item.activity === activityTitle || item.activityTitle === activityTitle || item.title === activityTitle || item.activityId === activityTitle) && item.owner === role() && item.company === COMPANY; });
    if (employee() && !existing) {
      var form = formPanel(activityPage, '填写报名信息', '活动时间、地点和参与条件以园区正式通知为准。');
      var name = field(form, '联系人', 'name', 'text', true), phone = field(form, '联系电话', 'phone', 'tel', true), count = field(form, '人数', 'count', 'number', true); count.min = '1'; count.value = '1'; var note = status(form);
      blockActions(activityPage).appendChild(button('提交报名', function () {
        if (![name, phone, count].every(function (input) { return input.value.trim(); }) || Number(count.value) < 1) { note.textContent = '请填写联系人、电话和有效人数。'; return; }
        var api = externalApi() && externalApi().registerActivity;
        if (api) {
          var result = api([activityTitle || '未指定活动'], { name: name.value.trim(), phone: phone.value.trim(), attendees: Number(count.value), note: '' });
          if (!result || result.error) { note.textContent = result && result.error || '报名保存失败，请重新打开活动报名后重试。'; return; }
          renderActivity(); return;
        }
        if (save(function () { state.activityRegistrations.unshift({ id: nextId('HD'), owner: 'employee', company: COMPANY, activity: activityTitle || '未指定活动', name: name.value.trim(), phone: phone.value.trim(), count: Number(count.value), status: 'registered', history: ['企业员工提交活动报名'] }); }, note)) renderActivity();
      }, true));
    }
    if (!employee() && !property()) activityPage.appendChild(el('p', '请切换到企业员工身份后填写活动报名。', 'journey-empty'));
    var rows = uniqueRows(canonical.concat(property() ? state.activityRegistrations : state.activityRegistrations.filter(function (item) { return item.company === COMPANY && (item.owner === role() || admin()); })));
    if (!rows.length) activityPage.appendChild(el('p', '暂无活动报名记录。', 'journey-empty'));
    rows.forEach(function (item) {
      var card = requestCard(activityPage, item, item.activity || item.activityTitle || '园区活动', [['联系人', item.name || item.attendeeName], ['人数', item.count || item.attendees], ['电话', item.phone]]), bar = actions(card), note = status(card);
      if (property() && (item.status === 'registered' || String(item.status || '').indexOf('已报名') === 0)) bar.append(button('现场签到', function () { if (item.activityId ? updateExternal('activityRegistrations', item.id, { status: '已签到' }) : save(function () { item.status = 'checked-in'; item.history = (item.history || []).concat(['物业人员现场签到']); }, note)) renderActivity(); else note.textContent = '身份或报名状态已变化，请重新进入活动报名。'; }, true));
      if (property() && (item.status === 'checked-in' || item.status === 'checked_in' || String(item.status || '').indexOf('已签到') === 0)) bar.append(button('完成核销', function () { if (item.activityId ? updateExternal('activityRegistrations', item.id, { status: '已核销' }) : save(function () { item.status = 'verified'; item.history = (item.history || []).concat(['物业人员完成现场核销']); }, note)) renderActivity(); else note.textContent = '身份或报名状态已变化，请重新进入活动报名。'; }, true));
    });
  }

  // After each render, keep the notice (and tab bar) as siblings and move all other content into one body container.
  function splitPage(node) {
    var body = node.querySelector(':scope > .journey-page-body');
    if (!body) body = el('div', undefined, 'journey-page-body');
    Array.from(node.children).forEach(function (child) {
      if (child !== body && !child.classList.contains('journey-notice') && !child.classList.contains('journey-tabs')) body.appendChild(child);
    });
    node.appendChild(body); node.classList.add('journey-page-split');
  }
  function withSplit(render, node) { return function () { render(); splitPage(node); }; }
  // Reassign the bindings so in-page re-renders (submit, cancel, tab switch) also keep the split layout.
  renderVehicle = withSplit(renderVehicle, vehiclePage); renderRelease = withSplit(renderRelease, releasePage);
  renderVehicleDetail = withSplit(renderVehicleDetail, vehicleDetailPage);
  renderRenovation = withSplit(renderRenovation, renovationPage); renderUtilities = withSplit(renderUtilities, utilitiesPage);
  renderSpecial = withSplit(renderSpecial, specialPage); renderMonitor = withSplit(renderMonitor, monitorPage);
  renderDining = withSplit(renderDining, diningPage); renderActivity = withSplit(renderActivity, activityPage);
  renderers[vehiclePage.id] = renderVehicle;
  renderers[vehicleDetailPage.id] = renderVehicleDetail;
  renderers[releasePage.id] = renderRelease;
  renderers[renovationPage.id] = renderRenovation;
  renderers[utilitiesPage.id] = renderUtilities;
  renderers[specialPage.id] = renderSpecial;
  renderers[monitorPage.id] = renderMonitor;
  renderers[diningPage.id] = renderDining;
  renderers[activityPage.id] = renderActivity;

  function canJourney(id) { return !!pages[id] && role() !== 'unauthenticated'; }
  function openJourney(id, parent) {
    if (!canJourney(id)) { originalShow('role-denied'); return false; }
    route(id, ({ 'journey-vehicle': '车辆服务', 'journey-release': '物品放行', 'journey-renovation': '装修申请', 'journey-utilities': '水电缴费', 'journey-special': '专项服务', 'journey-monitor': '监控调取', 'journey-dining': '订餐服务', 'journey-activity-registration': '活动报名' })[id], parent || parentForEntry());
    renderers[id](); return originalShow(id);
  }
  window.__canMiniPage = function (id) { return pages[id] ? canJourney(id) : originalCan(id); };
  window.__showMiniPage = function (id) {
    if (pagesByAlias[id]) return openJourney(pagesByAlias[id], parentForEntry());
    if (pages[id]) return openJourney(id, parents[id] || parentForEntry());
    return originalShow(id);
  };

  var ENTERPRISE_ONLY = ['journey-release', 'journey-renovation', 'journey-utilities', 'journey-special', 'journey-monitor'];
  // Guests cannot use any park service that needs an enterprise identity (or a property account);
  // the identity dialog opens over the current page instead of navigating first.
  var GUEST_BLOCKED = ENTERPRISE_ONLY.concat(['journey-dining', 'journey-vehicle']);
  function mapJourneyButton(button, journey) {
    button.removeAttribute('data-page'); button.removeAttribute('data-park-unavailable'); button.removeAttribute('aria-disabled'); button.dataset.journey = journey;
  }
  // Home / all-services entries open the submit form directly; records live under 我的.
  function openHomeForm(id, parent) {
    if (!enterprise() || ['home', 'park-services-all'].indexOf(parent) < 0) return false;
    if (id === 'journey-release' && window.__propertyWorkbench && window.__propertyWorkbench.openReleaseFromHome) { window.__propertyWorkbench.openReleaseFromHome(parent); return true; }
    var type = { 'journey-renovation': 'renovation', 'journey-utilities': 'utilities' }[id];
    if (type && workflows && workflows.openRequestForm) { workflows.openRequestForm(type, { returnTo: parent }); return true; }
    return false;
  }
  function normaliseEntryButtons() {
    var names = { '车辆服务': 'journey-vehicle', '物品放行': 'journey-release', '装修申请': 'journey-renovation', '水电缴费': 'journey-utilities', '专项服务': 'journey-special', '物业服务': 'journey-special', '监控调取': 'journey-monitor', '订餐服务': 'journey-dining' };
    document.querySelectorAll('#home-park-services button, #park-services-all button').forEach(function (button) {
      var name = button.textContent.trim(), journey = names[name]; if (journey) mapJourneyButton(button, journey);
    });
  }
  normaliseEntryButtons();
  new MutationObserver(normaliseEntryButtons).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('click', function (event) {
    var entry = event.target.closest('[data-journey]');
    // Enterprise-only services: non-enterprise users get the same identity dialog as 物业报修 (role-denied).
    if (entry && GUEST_BLOCKED.indexOf(entry.dataset.journey) >= 0 && !enterprise() && !property()) { event.preventDefault(); event.stopImmediatePropagation(); window.__showMiniPage('role-denied'); return; }
    if (entry) { event.preventDefault(); event.stopImmediatePropagation(); var from = parentForEntry(); if (!openHomeForm(entry.dataset.journey, from)) openJourney(entry.dataset.journey, from); return; }
    var activityAction = event.target.closest('[data-journey-activity-action]');
    if (activityAction) { event.preventDefault(); event.stopImmediatePropagation(); activityTitle = activityAction.dataset.activityTitle || ''; openJourney(activityPage.id, 'enterprise-activity-detail'); }
  }, true);

  function decorateActivityDetail() {
    // 活动详情模块自带唯一报名表单，避免重复增加报名入口。
  }
  function stageOf(value) {
    if (['completed', 'confirmed', 'closed', 'verified'].includes(value)) return 'done';
    if (['confirmation', 'awaiting_confirmation', 'result'].includes(value)) return 'confirm';
    return 'pending';
  }
  function stageOf(value) {
    if (['completed', 'confirmed', 'closed', 'verified'].includes(value)) return 'done';
    if (['confirmation', 'awaiting_confirmation', 'result'].includes(value)) return 'confirm';
    return 'pending';
  }
  // The workbench calls these hooks while it builds a centre; cards are tagged so its tabs and filter can show/hide them.
  var typeNames = { special: '专项服务', activity: '活动报名', dining: '订餐费用' };
  function tag(card, type, stage) {
    card.dataset.cardType = type; card.dataset.cardStage = stage; card.classList.add('center-card');
    var row = card.querySelector('.role-row'); if (row && !row.querySelector('.card-type-chip')) row.prepend(el('span', typeNames[type] || type, 'card-type-chip'));
    return card;
  }
  function reopen() { renderPropertyExtensions(); }
  // 工单 → 专项服务 + 活动报名.
  function renderWorkorderExtras(content) {
    if (!property() || !content) return;
    // Cards only carry 删除 / 详情 / 去处理; the step itself (and any result text) is done on the detail page.
    function entry(card, bar, label, spec) {
      var go = function () { if (window.__propertyWorkbench && window.__propertyWorkbench.openActionDetail) window.__propertyWorkbench.openActionDetail(content.closest('section') || content, spec); };
      var view = button('详情', go); view.dataset.cardAction = 'detail'; bar.append(view);
      if (label) bar.append(button(label, go, true));
      card.classList.add('is-clickable'); card.addEventListener('click', function (event) { if (!event.target.closest('button, a, input, textarea, select, label')) go(); });
    }
    function specialRows() { return uniqueRows(workflowRows('specialTickets').concat(state.specialTickets, externalRows('specialTickets'))); }
    specialRows().filter(function (item) { return (!item.company || item.company === COMPANY) && !hiddenJourney('specialTickets', item); }).forEach(function (item) {
      var card = tag(requestCard(content, item, item.title, [['服务类型', item.category], ['位置', item.location]]), 'special', stageOf(item.status)), bar = actions(card), ticketId = item.id;
      var open = ['pending', 'submitted', 'accepted', 'processing'].includes(item.status);
      entry(card, bar, open ? '去处理' : '', { type: 'special', routeTitle: '专项服务详情', refresh: function () {
        var t = specialRows().find(function (r) { return r.id === ticketId; }); if (!t) return null;
        var domain = workflows && workflows.updateSpecialServiceTicket && workflowRows('specialTickets').includes(t);
        var step = t.status === 'pending' && domain ? { label: '接单并分派', run: function () { return workflows.updateSpecialServiceTicket(t.id, 'processing', '物业人员已接单并开始处理'); } }
          : t.status === 'submitted' ? { label: '接单', run: function () { return save(function () { t.status = 'accepted'; t.history.push('物业人员已接单'); }); } }
          : t.status === 'accepted' ? { label: '开始处理', run: function () { return save(function () { t.status = 'processing'; t.history.push('物业人员开始处理'); }); } }
          : t.status === 'processing' ? { label: '提交结果', input: '填写处理措施与结果', inputLabel: '处理结果', run: function (text) {
              return domain ? workflows.updateSpecialServiceTicket(t.id, 'awaiting_confirmation', text) : save(function () { t.status = 'result'; t.result = text; t.history.push('物业人员提交处理结果：' + text); });
            } } : null;
        return { title: t.title || '专项服务', status: displayStatus(t.status), meta: [t.id, t.company].filter(Boolean).join(' · '),
          fields: [['服务类型', t.category], ['位置', t.location], ['需求说明', t.detail], ['处理结果', t.result], ['处理进度', (t.history || []).join(' → ')]], step: step };
      } });
      manageJourney(card, bar, item, 'specialTickets', ['title', 'location', 'detail']);
    });
  }
  // 审批 → 活动报名: registrations need a property decision, not on-site check-in.
  function activityStage(item) { return item.reviewStatus === 'approved' ? 'approved' : item.reviewStatus === 'rejected' ? 'rejected' : 'pending'; }
  function renderApprovalExtras(content) {
    if (!property() || !content) return;
    var section = content.closest('section') || content;
    function rows() { return uniqueRows(externalRows('activityRegistrations').concat(state.activityRegistrations)); }
    rows().filter(function (item) { return item.company === COMPANY && !hiddenJourney('activityRegistrations', item); }).forEach(function (item) {
      var label = { pending: '待物业审批', approved: '已通过', rejected: '已驳回' }[activityStage(item)];
      var card = tag(requestCard(content, item, item.activity || item.activityTitle || '园区活动', [['报名人', item.name || item.attendeeName], ['联系电话', item.phone]]), 'activity', activityStage(item)), bar = actions(card), regId = item.id;
      card.querySelector('.role-status').textContent = label;
      var go = function () { if (window.__propertyWorkbench && window.__propertyWorkbench.openActionDetail) window.__propertyWorkbench.openActionDetail(section, { type: 'activity', routeTitle: '活动报名详情', refresh: function () {
        var r = rows().find(function (row) { return row.id === regId; }); if (!r) return null;
        var stage = activityStage(r);
        return { title: r.activity || r.activityTitle || '园区活动', status: { pending: '待物业审批', approved: '已通过', rejected: '已驳回' }[stage], meta: [r.id, r.company].filter(Boolean).join(' · '),
          fields: [['报名人', r.name || r.attendeeName], ['联系电话', r.phone], ['参加人数', r.count || r.attendees], ['备注', r.note], ['审批意见', r.reviewNote], ['审批进度', (r.history || []).join(' → ')]],
          review: stage === 'pending' ? function (decision, note) {
            var change = function (target) { target.reviewStatus = decision; target.reviewNote = note; target.reviewedAt = new Date().toISOString(); target.history = (target.history || []).concat(['物业人员：审批' + (decision === 'approved' ? '通过' : '驳回') + (note ? ' · ' + note : '')]); };
            return r.activityId ? updateExternal('activityRegistrations', r.id, change) : save(function () { change(r); });
          } : null };
      } }); };
      var view = button('详情', go); view.dataset.cardAction = 'detail'; bar.append(view);
      if (activityStage(item) === 'pending') bar.append(button('审批', go, true));
      card.classList.add('is-clickable'); card.addEventListener('click', function (event) { if (!event.target.closest('button, a, input, textarea, select, label')) go(); });
      manageJourney(card, bar, item, 'activityRegistrations', []);
    });
  }
  // 收费 → 订餐费用.
  function renderFeeDining(content) {
    if (!property() || !content) return;
    uniqueRows(externalRows('diningOrders').concat(state.diningOrders)).filter(function (item) { return item.company === COMPANY && !hiddenJourney('diningOrders', item); }).forEach(function (item) {
      var paid = item.feeStatus === 'paid' || item.feeState === 'paid';
      var label = paid ? '已收费' : item.feeState === 'contacted' ? '已联系' : '待收费';
      var card = panel(content, item.title || item.menu || '订餐订单', label, item.detail || '');
      var pairs = [['订单编号', item.id], ['企业', item.company], ['取餐时间', item.pickup], ['数量', item.quantity ? item.quantity + '份' : ''], ['金额', item.amount ? '¥' + Number(item.amount).toFixed(2) : ''], ['联系人', item.contact ? item.contact + (item.phone ? ' ' + item.phone : '') : '']].filter(function (pair) { return pair[1]; });
      fields(card, pairs);
      tag(card, 'dining', paid ? 'paid' : 'pending'); card.dataset.diningId = item.id;
      var bar = actions(card), go = function () { if (window.__propertyWorkbench && window.__propertyWorkbench.openFeeDetail) window.__propertyWorkbench.openFeeDetail('dining', item.id); };
      var detail = button('详情', go); detail.dataset.cardAction = 'detail';
      bar.append(detail, button('修改状态', go, true));
      manageJourney(card, bar, item, 'diningOrders', []);
    });
  }
  // Fee detail for dining orders reads and writes through the shared journey store.
  function diningRecord(id) { return uniqueRows(externalRows('diningOrders').concat(state.diningOrders)).find(function (item) { return item.id === id; }); }
  function updateDining(id, change) {
    var external = externalRows('diningOrders').some(function (item) { return item.id === id; });
    if (external) return updateExternal('diningOrders', id, change);
    var item = state.diningOrders.find(function (row) { return row.id === id; });
    return !!item && save(function () { change(item); });
  }
  // Kept so older listeners stay harmless; the workbench now pulls cards through the hooks above.
  // Data changed elsewhere: re-open the visible centre once (batched) so its cards reflect the new state.
  var refreshQueued = false;
  function renderPropertyExtensions() {
    if (!property() || refreshQueued) return;
    refreshQueued = true;
    Promise.resolve().then(function () { refreshQueued = false; var current = screen.querySelector('section:not(.hidden)'); if (current && /^property-workbench-(approvals|workorders|fees)$/.test(current.id)) window.__showMiniPage(current.id); });
  }
  // 园区管理 records a site preparation against a booking without creating an approval.
  function recordSitePreparation(booking) {
    if (!property() || !booking || state.sitePreparations.some(function (row) { return row.sourceId === booking.id; })) return false;
    return save(function () { state.sitePreparations.push({ id: nextId('SC'), sourceId: booking.id, type: 'booking', status: 'accepted', company: booking.company, detail: '已记录场地准备安排', history: ['物业人员记录场地准备'] }); });
  }
  function hiddenJourney(kind, item) {
    try { return JSON.parse(localStorage.getItem('property-workorder-hidden-v1') || '[]').includes(kind + ':' + item.id); } catch (error) { return false; }
  }
  function hideJourney(kind, item) {
    try { var list = JSON.parse(localStorage.getItem('property-workorder-hidden-v1') || '[]'); list.push(kind + ':' + item.id); localStorage.setItem('property-workorder-hidden-v1', JSON.stringify(list)); return true; } catch (error) { return false; }
  }
  // Same edit/delete controls as native work-order cards; delete hides the item in the center only.
  function manageJourney(card, bar, item, kind) {
    if (!property()) return;
    var remove = button('删除', function () {
      var name = item.title || item.activityTitle || item.menu || item.id;
      var doRemove = function () { if (hideJourney(kind, item)) reopen(); };
      if (window.__miniConfirm) window.__miniConfirm({ title: '确定删除这条记录吗？', message: '删除「' + name + '」后，记录及相关处理信息将从列表中移除且无法恢复，请谨慎操作。', confirmText: '删除', danger: true, onConfirm: doRemove });
      else if (window.confirm('确定删除「' + name + '」吗？删除后无法恢复。')) doRemove();
    });
    remove.dataset.cardAction = 'delete'; bar.append(remove);
    // The workbench adds 详情 and orders the bar: 删除 → 详情 → others → primary.
  }
  var observer = new MutationObserver(function () { decorateActivityDetail(); });
  observer.observe(screen, { childList: true, subtree: true });
  window.addEventListener('park-service-journeys-change', function () { sync(); renderPropertyExtensions(); });
  window.addEventListener('service-journeys-change', function () { sync(); renderPropertyExtensions(); });
  new MutationObserver(function () {
    var active = screen.querySelector('section:not(.hidden)');
    if (active && active.classList.contains('journey-page') && !canJourney(active.id)) originalShow('profile');
  }).observe(profile, { attributes: true, attributeFilter: ['data-role'] });

  // Stylesheet is linked once in miniprogram-view-v3.html; only inject it when the page has not linked it (avoids a stale duplicate).
  if (!document.querySelector('link[href*="miniprogram-service-journeys.css"]')) {
    var style = document.createElement('link'); style.rel = 'stylesheet'; style.href = 'miniprogram-service-journeys.css?v=20261017-vehicle-detail'; style.dataset.parkServiceJourneysStyle = 'true'; document.head.appendChild(style);
  }
  window.__miniTimeField = timeField;
  window.__parkServiceJourneys = { key: KEY, data: function () { return state; }, open: function (id) { return openJourney(pagesByAlias[id] || id); }, refreshProperty: renderPropertyExtensions, recordSitePreparation: recordSitePreparation, renderWorkorderExtras: renderWorkorderExtras, renderApprovalExtras: renderApprovalExtras, renderFeeDining: renderFeeDining, diningRecord: diningRecord, updateDining: updateDining };
  decorateActivityDetail();
})();
