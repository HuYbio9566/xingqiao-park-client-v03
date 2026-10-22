/* 「我的」底部信息页：隐私与授权、联系客服、关于我们。内容为园区常规说明，非法律文本终稿。 */
(function () {
  'use strict';
  var profile = document.getElementById('profile'), screen = document.querySelector('.screen');
  if (!profile || !screen || !window.__showMiniPage || !window.__setMiniRoute) return;
  var store = window.MiniStore;
  var hotline = { text: '400-820-6618', tel: '4008206618' };
  function el(tag, text, className) { var n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
  function icon(name) { var i = el('i'); i.dataset.lucide = name; i.setAttribute('aria-hidden', 'true'); return i; }
  function page(id, title) {
    var node = document.getElementById(id);
    if (!node) { node = el('section', undefined, 'hidden profile-info-page'); node.id = id; screen.appendChild(node); }
    node.classList.add('profile-info-page'); window.__setMiniRoute(id, title, 'profile'); return node;
  }
  function group(title, rows) {
    var box = el('div', undefined, 'profile-info-group');
    if (title) box.append(el('h2', title, 'profile-info-group-title'));
    var list = el('div', undefined, 'profile-info-list'); rows.forEach(function (row) { list.append(row); }); box.append(list); return box;
  }
  // One row: label left, value / control right; optional note below.
  function row(label, value, options) {
    options = options || {};
    var item = el(options.href || options.onClick ? (options.href ? 'a' : 'button') : 'div', undefined, 'profile-info-row');
    if (options.href) item.href = options.href;
    if (options.onClick) { item.type = 'button'; item.onclick = options.onClick; }
    var main = el('div', undefined, 'profile-info-main'); main.append(el('span', label, 'profile-info-label'));
    if (options.note) main.append(el('small', options.note, 'profile-info-note'));
    item.append(main);
    if (options.control) item.append(options.control);
    else if (value !== undefined) item.append(el('span', value, 'profile-info-value'));
    if (options.href || options.onClick) item.append(icon('chevron-right'));
    return item;
  }
  function toggle(label, key, on) {
    var input = el('input'); input.type = 'checkbox'; input.className = 'profile-info-switch'; input.setAttribute('role', 'switch'); input.setAttribute('aria-label', label);
    var saved = null; try { saved = localStorage.getItem('v4:profile-pref-' + key); } catch (error) {}
    input.checked = saved === null ? on : saved === '1';
    input.onchange = function () { try { localStorage.setItem('v4:profile-pref-' + key, input.checked ? '1' : '0'); } catch (error) {} };
    return input;
  }
  function paragraph(text) { return el('p', text, 'profile-info-text'); }
  function show(id) { window.__showMiniPage(id); if (window.lucide) window.lucide.createIcons(); screen.scrollTop = 0; }

  // 后台「系统资料配置」的内容字段：有值时作为详情页正文，为空时沿用页面内置兜底文案。
  function systemRow(section) {
    var items = (window.__parkContent && window.__parkContent.get && window.__parkContent.get()['profile-system-config']) || [];
    return items.filter(function (item) { return item && item.section === section && ['online', 'enabled'].indexOf(item.status) !== -1; })[0] || null;
  }
  function systemText(section) {
    var row = systemRow(section);
    var text = row && row.content == null ? '' : String((row && row.content) || '').trim();
    return text;
  }
  // 后台内容按空行或换行切分成段落，渲染成与内置文档一致的正文块。
  function systemBlock(section) {
    var text = systemText(section);
    if (!text) return null;
    var row = systemRow(section);
    var box = el('div', undefined, 'profile-info-list profile-info-article');
    var block = el('div', undefined, 'profile-info-article-block');
    if (row && row.title) block.append(el('h3', String(row.title)));
    text.split(/\n{2,}|\n/).map(function (line) { return line.trim(); }).filter(Boolean)
      .forEach(function (line) { block.append(paragraph(line)); });
    box.append(block);
    return box;
  }
  // Binding is a local application preview, not an authentication grant.
  var bindingKey = 'v4:profile-company-binding-v1', bindingPage = page('profile-company-binding', '绑定企业');
  bindingPage.classList.add('company-binding-page');
  function bindingRecord() {
    try { var value = JSON.parse(localStorage.getItem(bindingKey) || 'null'); return value && value.owner === 'guest' && ['pending', 'approved', 'rejected'].includes(value.status) ? value : null; } catch (error) { return null; }
  }
  function bindingAllowed() { return profile.dataset.role === 'guest'; }
  function bindingButton(text, action, secondary) {
    var button = el('button', text, secondary ? 'company-binding-secondary' : 'company-binding-primary');
    button.type = 'button'; button.onclick = action; return button;
  }
  function openBinding(edit) {
    if (!bindingAllowed()) return;
    var saved = bindingRecord(); bindingPage.replaceChildren(); bindingPage.toggleAttribute('data-dirty-guard', !saved || !!edit);
    var intro = el('div', undefined, 'company-binding-intro');
    var symbol = el('span', undefined, 'company-binding-icon'); symbol.append(icon(saved && !edit ? 'clock-3' : 'building-2'));
    var reviewed = saved && !edit && saved.status !== 'pending';
    var headline = !saved || edit ? '绑定您的企业' : saved.status === 'approved' ? '绑定申请已通过' : saved.status === 'rejected' ? '绑定申请未通过' : '绑定申请待审核';
    var lead = !saved || edit ? '填写您所在企业及本人信息，由企业管理员核实员工身份。' : saved.status === 'approved' ? '企业管理员已核实您的员工身份，重新登录后即可使用企业员工服务。' : saved.status === 'rejected' ? '请根据驳回原因修改信息后重新提交。' : '企业管理员核实身份后，您即可使用企业员工服务。审核前仍以访客身份使用。';
    intro.append(symbol, el('h2', headline), el('p', lead));
    bindingPage.append(intro);
    if (saved && !edit) {
      var card = el('div', undefined, 'company-binding-card');
      card.append(el('h3', '申请信息'));
      var facts = el('dl');
      [['企业名称', saved.company], ['姓名', saved.name], ['手机号', saved.phone], ['员工工号', saved.employeeId], ['所属部门', saved.department || '未填写'], ['审核状态', { pending: '待企业管理员审核', approved: '已通过', rejected: '已驳回' }[saved.status]], ['驳回原因', saved.reviewNote]].forEach(function (pair) { if (pair[1]) facts.append(el('dt', pair[0]), el('dd', pair[1])); });
      card.append(facts); bindingPage.append(card);
      var actions = el('div', undefined, 'company-binding-actions');
      if (saved.status !== 'approved') actions.append(bindingButton(saved.status === 'rejected' ? '修改后重新提交' : '修改申请信息', function () { if (bindingAllowed()) openBinding(true); }, true));
      actions.append(bindingButton('返回我的', function () { show('profile'); }));
      bindingPage.append(actions);
    } else {
      var form = el('form', undefined, 'company-binding-form'), card = el('div', undefined, 'company-binding-card');
      card.append(el('h3', '企业与员工信息'));
      var inputs = {};
      [['企业名称', 'company', 'text', '请输入企业完整名称', true, 100], ['姓名', 'name', 'text', '请输入本人真实姓名', true, 40], ['手机号', 'phone', 'tel', '请输入11位手机号', true, 11], ['员工工号', 'employeeId', 'text', '请输入员工工号', true, 40], ['所属部门', 'department', 'text', '请输入所属部门（选填）', false, 60]].forEach(function (item) {
        var label = el('label', undefined, 'company-binding-field'), caption = el('span', item[0]);
        if (item[4]) caption.append(el('b', ' *', 'company-binding-required'));
        var input = el('input'); input.name = item[1]; input.type = item[2]; input.placeholder = item[3]; input.required = item[4]; input.maxLength = item[5]; input.value = saved && saved[item[1]] || '';
        if (item[1] === 'phone') { input.pattern = '1[3-9][0-9]{9}'; input.inputMode = 'tel'; input.autocomplete = 'tel'; }
        if (item[1] === 'name') input.autocomplete = 'name';
        if (item[1] === 'company') input.autocomplete = 'organization';
        inputs[item[1]] = input; label.append(caption, input); card.append(label);
      });
      card.append(el('p', '企业名称和工号请与企业登记信息保持一致。如不清楚工号，请联系所在企业管理员。', 'company-binding-help'));
      form.append(card);
      var consent = el('label', undefined, 'company-binding-consent'), check = el('input'); check.type = 'checkbox'; check.required = true; check.name = 'consent';
      consent.append(check, el('span', '我同意将以上信息用于企业身份核验，并确认填写信息真实、准确。'));
      var feedback = el('p', '', 'company-binding-feedback'); feedback.setAttribute('role', 'status');
      var submit = el('button', saved ? '保存并重新提交' : '提交绑定申请', 'company-binding-primary'); submit.type = 'submit';
      form.append(consent, feedback, submit);
      if (saved) form.append(bindingButton('取消修改', function () { if (bindingAllowed()) openBinding(); }, true));
      form.onsubmit = function (event) {
        event.preventDefault();
        if (!bindingAllowed()) return;
        if (!form.reportValidity()) return;
        var values = {};
        Object.keys(inputs).forEach(function (key) { values[key] = inputs[key].value.trim(); });
        if (!values.company || !values.name || !values.employeeId) { feedback.textContent = '请填写完整的企业名称、姓名和工号，不能只输入空格。'; return; }
        if (!/^1[3-9]\d{9}$/.test(values.phone) || !check.checked) { feedback.textContent = '请填写有效手机号，并确认身份核验授权。'; return; }
        var record = Object.assign(values, { owner: 'guest', status: 'pending', submittedAt: new Date().toISOString(), reviewNote: '' });
        try { localStorage.setItem(bindingKey, JSON.stringify(record)); } catch (error) { feedback.textContent = '申请保存失败，请检查浏览器存储设置后重试。'; return; }
        openBinding();
      };
      bindingPage.append(form);
    }
    bindingPage.append(el('p', saved && !edit && saved.status === 'approved' ? '身份已通过审核；如需变更企业或身份信息，请联系企业管理员。' : '提交后由企业管理员核实您的员工身份；审核通过前仍以访客身份使用。', 'company-binding-help company-binding-disclaimer'));
    show(bindingPage.id);
  }
  var identityPage = page('profile-identity', '身份信息');
  identityPage.classList.add('profile-identity-page');
  // Static role fixtures only; these are not authenticated account records.
  var identitySamples = {
    employee: { title: '企业身份', role: '企业员工', phone: '138****0000', number: 'XQ-001', department: '业务部', position: '企业员工' },
    admin: { title: '企业身份', role: '企业管理员', phone: '138****6605', number: 'XQ-002', department: '行政部', position: '企业管理员' },
    property: { title: '工作身份', role: '物业人员', phone: '138****0018', number: 'WY-001', department: '物业服务部', position: '物业服务专员' }
  };
  // 企业身份: two tabs. 我的信息 is the default; 成员管理 is enterprise-admin only
  // (moved out of 企业工作台 on 2026-10-18).
  var identityTab = 'info';
  function memberCount() {
    var workflows = window.__roleWorkflows;
    if (!workflows || !workflows.memberApplications) return 0;
    return workflows.memberApplications().filter(function (r) { return r.status === 'pending'; }).length;
  }
  function ownsIdentity() { return !!identitySamples[profile.dataset.role] && identityPage.dataset.owner === profile.dataset.role; }
  function identityTabs() {
    var pending = memberCount();
    var bar = el('div', undefined, 'identity-tabs');
    bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', '企业身份');
    [['info', '我的信息'], ['members', '成员管理']].forEach(function (pair) {
      if (pair[0] === 'members' && profile.dataset.role !== 'admin') return;
      var tab = el('button', pair[1], 'identity-tab'); tab.type = 'button';
      tab.dataset.identityTab = pair[0];
      tab.setAttribute('role', 'tab'); tab.id = 'identity-tab-' + pair[0];
      tab.setAttribute('aria-controls', 'identity-panel-' + pair[0]);
      tab.setAttribute('aria-selected', String(identityTab === pair[0]));
      tab.onclick = function () { if (identityTab === pair[0]) return; identityTab = pair[0]; openIdentity(true); };
      // Roving focus: Left/Right move between tabs and activate them, as in a standard tablist.
      tab.onkeydown = function (event) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        var order = [...bar.querySelectorAll('[role="tab"]')], next = order[(order.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : order.length - 1)) % order.length];
        identityTab = next.dataset.identityTab; openIdentity(true);
        var focusTarget = identityPage.querySelector('[data-identity-tab="' + identityTab + '"]'); if (focusTarget) focusTarget.focus({ preventScroll: true });
      };
      if (pair[0] === 'members' && pending) { tab.append(el('b', String(pending), 'identity-tab-badge')); }
      bar.append(tab);
    });
    return bar;
  }
  function identityPanel(name) {
    var panel = el('div', undefined, 'identity-panel'); panel.id = 'identity-panel-' + name;
    panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'identity-tab-' + name);
    return panel;
  }
  // keepTab: true when switching tabs in place; entering from 「我的」 always starts on 我的信息.
  function openIdentity(keepTab) {
    var current = profile.dataset.role, info = identitySamples[current];
    if (!info) return;
    if (!keepTab || current !== 'admin') identityTab = 'info';
    identityPage.replaceChildren(); identityPage.dataset.owner = current;
    window.__setMiniRoute(identityPage.id, info.title, 'profile');
    if (current === 'admin') identityPage.append(identityTabs());
    if (identityTab === 'members') {
      // The tab already names the section; no extra heading or description.
      var members = identityPanel('members'); members.classList.add('identity-members');
      var list = el('div', undefined, 'identity-members-list'); members.append(list);
      identityPage.append(members);
      if (window.__roleWorkflows && window.__roleWorkflows.openMembers) window.__roleWorkflows.openMembers(list, function () { openIdentity(true); });
      show(identityPage.id); return;
    }
    var infoPanel = identityPanel('info');
    identityPage.append(infoPanel);
    infoPanel.append(group('基本信息', [
      row('姓名', profile.querySelector('.mp-name').textContent), row('手机号', info.phone), row('当前身份', info.role)
    ]), group(current === 'property' ? '工作信息' : '企业绑定信息', [
      row(current === 'property' ? '所属单位' : '企业名称', profile.querySelector('.mp-company').textContent),
      row('工号', info.number), row('所属部门', info.department), row('岗位', info.position),
      row(current === 'property' ? '工作园区' : '所属园区', '星桥科创园'),
      row(current === 'property' ? '在岗状态' : '绑定状态', current === 'property' ? '在岗' : '已绑定')
    ]));
    var note = el('div', undefined, 'profile-identity-notice');
    note.append(paragraph('身份信息不可在此编辑。如需修改，请联系管理人员在物业后台管理系统中更新。'), paragraph('为保护您的隐私，手机号已脱敏显示。'));
    infoPanel.append(note); show(identityPage.id);
  }
  var beforeBindingCan = window.__canMiniPage;
  window.__canMiniPage = function (id) {
    return (id !== bindingPage.id || bindingAllowed()) &&
      (id !== identityPage.id || (!!identitySamples[profile.dataset.role] && identityPage.dataset.owner === profile.dataset.role)) &&
      (!beforeBindingCan || beforeBindingCan(id));
  };
  new MutationObserver(function () {
    if (!bindingAllowed() && !bindingPage.classList.contains('hidden')) show('profile');
    if (identityPage.dataset.owner && identityPage.dataset.owner !== profile.dataset.role) {
      if (!identityPage.classList.contains('hidden')) show('profile');
      identityPage.replaceChildren(); delete identityPage.dataset.owner;
    }
  }).observe(profile, { attributes: true, attributeFilter: ['data-role'] });
  profile.addEventListener('click', function (event) {
    if (!event.target.closest('[data-profile-identity]') || (!bindingAllowed() && !identitySamples[profile.dataset.role])) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (bindingAllowed()) openBinding(); else { identityTab = 'info'; openIdentity(true); }
  }, true);

  // ---- 隐私与授权 ----
  function openPrivacy() {
    var node = page('profile-privacy', '隐私与授权'); node.replaceChildren();
    var remote = systemBlock('隐私与授权'); if (remote) node.append(remote);
    node.append(group('系统权限', [
      row('位置信息', '使用时询问', { note: '用于园区导航、到访签到，不会在后台持续获取' }),
      row('相机', '使用时询问', { note: '用于扫码通行、报修拍照上传' }),
      row('相册', '使用时询问', { note: '用于上传报修、装修等申请附件' }),
      row('通知', '已开启', { note: '审批结果、访客到访、账单到期等提醒' })
    ]));
    node.append(group('个性化设置', [
      row('消息推送', undefined, { note: '关闭后仍可在「消息」中查看', control: toggle('消息推送', 'push', true) }),
      row('个性化推荐', undefined, { note: '根据浏览记录推荐空间与活动', control: toggle('个性化推荐', 'recommend', false) })
    ]));
    var result = el('p', '', 'profile-info-feedback'); result.setAttribute('role', 'status');
    var clear = row('清除本机记录', undefined, { note: '删除本设备保存的预约、访客、报修、咨询与反馈记录', onClick: function () {
      var run = function () {
        if (!store) return;
        var previous = {}; ['bookings', 'visitors', 'repairs', 'consultations', 'feedback'].forEach(function (k) { previous[k] = store.data[k]; store.data[k] = []; });
        if (!store.save()) { Object.keys(previous).forEach(function (k) { store.data[k] = previous[k]; }); result.textContent = '清除失败，原记录已保留。'; return; }
        window.dispatchEvent(new Event('mini-records-change')); result.textContent = '本机记录已清除。';
      };
      if (window.__miniConfirm) window.__miniConfirm({ title: '确定清除本机记录吗？', message: '将删除本设备保存的预约、访客、报修、咨询和反馈记录，清除后无法恢复。', confirmText: '清除', danger: true, onConfirm: run });
      else if (window.confirm('确定清除本机记录吗？清除后无法恢复。')) run();
    } });
    node.append(group('个人信息', [
      row('个人信息收集清单', undefined, { onClick: function () { openDoc('profile-privacy-list', '个人信息收集清单', privacyList); } }),
      row('第三方信息共享清单', undefined, { onClick: function () { openDoc('profile-privacy-share', '第三方信息共享清单', shareList); } }),
      row('隐私政策', undefined, { onClick: function () { openDoc('profile-privacy-policy', '隐私政策', privacyPolicy); } }),
      row('用户服务协议', undefined, { onClick: function () { openDoc('profile-user-agreement', '用户服务协议', userAgreement); } }),
      clear
    ]));
    node.append(result);
    window.__setMiniRoute(node.id, '隐私与授权', 'profile'); show(node.id);
  }
  var privacyList = [
    ['基本身份信息', '姓名、手机号、所属企业及岗位，用于账号登录、企业身份认证与服务联络。'],
    ['访客信息', '访客姓名、手机号、到访时间与车牌号，用于访客登记与园区通行，到访结束 30 天后删除。'],
    ['服务记录', '场地预定、报修、装修、物品放行等申请内容及附件，用于业务办理与结果追溯。'],
    ['设备信息', '设备型号、系统版本与网络类型，用于保障服务稳定与安全风控。']
  ];
  var shareList = [
    ['微信支付', '财付通支付科技有限公司', '订单号、支付金额', '用于停车费、订餐等在线支付（开通后）'],
    ['地图定位', '腾讯位置服务', '位置信息', '用于园区导航与到访签到'],
    ['短信通知', '短信服务提供商', '手机号', '用于验证码、访客邀约与审批结果通知']
  ];
  var privacyPolicy = [
    ['更新日期', '2026年10月1日　生效日期：2026年10月1日'],
    ['一、我们如何收集和使用您的个人信息', '我们仅在为您提供园区服务所必需的范围内收集信息，包括账号注册、企业认证、访客登记、场地预定、物业报修及费用缴纳等功能。'],
    ['二、我们如何共享、转让、公开披露', '除法律法规规定或获得您单独同意外，我们不会向第三方共享您的个人信息。具体共享情况见《第三方信息共享清单》。'],
    ['三、我们如何存储和保护', '您的信息存储于中华人民共和国境内的服务器，我们采取加密传输、访问控制等措施保护数据安全，并在实现目的所需的最短期限内保存。'],
    ['四、您的权利', '您可以在「我的 → 隐私与授权」中查阅、更正、删除个人信息或撤回授权，也可通过客服热线 400-820-6618 提出申请，我们将在 15 个工作日内答复。'],
    ['五、联系我们', '星桥科创园运营管理中心　邮箱：privacy@xingqiaopark.cn']
  ];
  var userAgreement = [
    ['一、服务说明', '本平台为星桥科创园入驻企业、员工及访客提供空间招商、企业服务、物业服务等线上办理入口。'],
    ['二、账号使用', '您应使用真实信息注册并妥善保管账号，企业管理员对本企业员工账号的绑定与解绑负责。'],
    ['三、用户行为规范', '不得利用本平台发布违法信息、冒用他人身份或干扰平台正常运行。'],
    ['四、费用说明', '平台展示的费用以园区财务确认为准；在线支付功能开通前，请按线下指引办理。'],
    ['五、协议变更', '协议内容更新时，我们会通过平台公告或消息提醒您。']
  ];
  function openDoc(id, title, rows, parent) {
    var node = page(id, title); node.replaceChildren(); node.classList.add('profile-info-doc');
    var box = el('div', undefined, 'profile-info-list profile-info-article');
    rows.forEach(function (item) {
      var block = el('div', undefined, 'profile-info-article-block');
      block.append(el('h3', item[0]));
      if (item.length > 2) block.append(paragraph('提供方：' + item[1]), paragraph('共享信息：' + item[2]), paragraph('使用目的：' + item[3]));
      // 后台内容可能含换行，按行拆成多段，内置文案只有一行时行为不变。
      else String(item[1]).split(/\n{2,}|\n/).map(function (line) { return line.trim(); }).filter(Boolean)
        .forEach(function (line) { block.append(paragraph(line)); });
      box.append(block);
    });
    node.append(box);
    window.__setMiniRoute(id, title, parent || 'profile-privacy'); show(id);
  }

  // ---- 联系客服 ----
  function openService() {
    var node = page('profile-service', '联系客服'); node.replaceChildren();
    var hero = el('div', undefined, 'profile-info-hero');
    var badge = el('span', undefined, 'profile-info-hero-icon'); badge.append(icon('headset'));
    var copy = el('div'); copy.append(el('strong', '星桥园区服务中心'), el('span', '工作日 09:00-18:00 · 节假日 10:00-16:00'));
    hero.append(badge, copy); node.append(hero);
    var remote = systemBlock('联系客服'); if (remote) node.append(remote);
    node.append(group('联系方式', [
      row('客服热线', hotline.text, { href: 'tel:' + hotline.tel }),
      row('在线客服', '平均 3 分钟内回复', { onClick: function () {
        if (window.__messageJourney && window.__messageJourney.setContext) window.__messageJourney.setContext('联系客服');
        window.__setMiniRoute('leasing-chat', '在线客服', 'profile-service'); window.__showMiniPage('leasing-chat');
      } }),
      row('24 小时物业值班', '022-5868-6618', { href: 'tel:02258686618', note: '水电、门禁、电梯等紧急故障' }),
      row('客服邮箱', 'service@xingqiaopark.cn', { href: 'mailto:service@xingqiaopark.cn' })
    ]));
    node.append(group('服务中心', [
      row('服务地址', 'A座 1F 大堂东侧'),
      row('园区地址', '天津市滨海高新区华苑产业区海泰发展六道6号'),
      row('现场服务', '工作日 08:30-17:30')
    ]));
    node.append(group('常见问题', [
      ['如何绑定企业身份？', '未认证访客可在「我的 → 访客用户」进入绑定企业页面，填写企业名称、姓名、手机号与工号。企业管理员审核通过后才可使用员工服务。'],
      ['访客如何进入园区？', '员工在「访客预约」登记后，访客凭短信二维码在闸机扫码通行。'],
      ['报修多久有人处理？', '工作时间内 30 分钟响应，紧急故障请拨打 24 小时物业值班电话。'],
      ['账单如何缴纳？', '在线支付开通前，请凭账单编号与金额到 A座 1F 服务中心或通过对公转账办理。']
    ].map(function (qa) { return faq(qa[0], qa[1]); })));
    window.__setMiniRoute(node.id, '联系客服', 'profile'); show(node.id);
  }
  function faq(q, a) {
    var item = el('details', undefined, 'profile-info-faq'), summary = el('summary', undefined, 'profile-info-row');
    var main = el('div', undefined, 'profile-info-main'); main.append(el('span', q, 'profile-info-label')); summary.append(main, icon('chevron-down'));
    item.append(summary, el('p', a, 'profile-info-faq-answer')); return item;
  }

  // ---- 关于我们 ----
  function openAbout() {
    var node = page('profile-about', '关于我们'); node.replaceChildren();
    var hero = el('div', undefined, 'profile-info-brand');
    var logo = el('img'); logo.src = 'miniprogram/assets/branding/xingqiao-mini-program-logo-v4-square.png'; logo.alt = '';
    hero.append(logo, el('strong', '星桥科创园'), el('span', '版本 4.0.0'));
    node.append(hero);
    var remote = systemBlock('关于我们');
    if (remote) node.append(remote);
    else {
      var intro = el('div', undefined, 'profile-info-list profile-info-article');
      var block = el('div', undefined, 'profile-info-article-block');
      block.append(el('h3', '园区简介'), paragraph('星桥科创园位于天津滨海高新区，总建筑面积约 18 万平方米，由五栋科创楼宇组成，提供灵活办公、研发办公与产业配套空间。园区聚焦新一代信息技术、智能制造与生物医药，现已入驻企业 260 余家。'));
      intro.append(block); node.append(intro);
    }
    node.append(group('园区信息', [
      row('运营单位', '天津星桥科创园运营管理有限公司'),
      row('园区地址', '天津市滨海高新区华苑产业区海泰发展六道6号'),
      row('招商热线', '022-5868-8888', { href: 'tel:02258688888' }),
      row('官方网站', 'www.xingqiaopark.cn')
    ]));
    node.append(group('', [
      row('用户服务协议', undefined, { onClick: function () { openDoc('profile-user-agreement', '用户服务协议', userAgreement, 'profile-about'); } }),
      row('隐私政策', undefined, { onClick: function () { openDoc('profile-privacy-policy', '隐私政策', privacyPolicy, 'profile-about'); } }),
      row('版本更新', '已是最新版本')
    ]));
    node.append(el('p', 'Copyright © 2026 星桥科创园 版权所有', 'profile-info-copyright'));
    window.__setMiniRoute(node.id, '关于我们', 'profile'); show(node.id);
  }

  // 后台有内容就用后台正文，否则保留内置兜底文案。
  function remoteDoc(section, fallback) {
    var text = systemText(section);
    if (!text) return fallback;
    var row = systemRow(section);
    return [[String((row && row.title) || section), text]];
  }
  function openAgreement() { openDoc('profile-user-agreement', '用户协议', remoteDoc('用户协议', userAgreement), 'profile'); }
  function openCancel() {
    var fallback = [['申请注销账号', '注销后账号及相关数据将被清除且无法恢复。如需办理，请联系园区服务中心 ' + hotline.text + '。']];
    openDoc('profile-account-cancel', '账号注销', remoteDoc('账号注销', fallback), 'profile');
  }
  var handlers = { '隐私与授权': openPrivacy, '用户协议': openAgreement, '联系客服': openService, '关于我们': openAbout, '账号注销': openCancel };
  // Capture phase so these pages replace older notice / privacy handlers on the same rows.
  profile.addEventListener('click', function (event) {
    var button = event.target.closest('[data-profile-entry]'); if (!button) return;
    var handler = handlers[button.dataset.profileEntry]; if (!handler) return;
    event.preventDefault(); event.stopImmediatePropagation(); handler();
  }, true);
  window.__profileInfo = { openPrivacy: openPrivacy, openService: openService, openAbout: openAbout };
})();
