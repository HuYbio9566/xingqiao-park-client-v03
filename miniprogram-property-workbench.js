/* Local property records only; payment, delivery and gate systems remain separate. */
(function () {
  'use strict';
  var profile = document.getElementById('profile'), screen = document.querySelector('.screen');
  var workflows = window.__roleWorkflows, store = window.MiniStore;
  if (!profile || !screen || !workflows || !store || window.__propertyWorkbench) return;
  var pages = {}, epoch = 0, nativeContext = null, detailId = null, detailParent = null, editId = null, formReturn = null;
  var company = '北京星桥科技';
  // Four centres grouped by what property staff actually do: approve, work on site, collect fees, reply.
  var centers = { approvals: '审批', workorders: '工单', fees: '收费', feedback: '反馈' };
  var ids = { approvals: 'property-workbench-approvals', workorders: 'property-workbench-workorders', fees: 'property-workbench-fees', feedback: 'property-workbench-feedback', todo: 'property-workbench-todo', mine: 'my-release-requests', form: 'my-release-form', detail: 'property-workbench-release-detail' };
  // Pages from the older layouts stay routable and forward to their new centre.
  var retired = { 'property-workbench-repairs': 'workorders', 'property-workbench-special': 'workorders', 'property-workbench-park': 'workorders', 'property-workbench-bills': 'fees', 'property-workbench-services': 'workorders' };
  function role() { return profile.dataset.role || 'guest'; }
  function property() { return role() === 'property'; }
  function enterprise() { return role() === 'employee' || role() === 'admin'; }
  function records(name) { return workflows.propertyData()[name] || []; }
  function local(name) { return store.data[name] || []; }
  function feedbackCategory(item) {
    var value = item && item.title;
    return ['投诉', '建议', '表扬'].includes(value) ? value : '建议';
  }
  function feedbackState(item) {
    return ({ submitted: '待分派', processing: '处理中', awaiting_confirmation: '待反馈确认', completed: '已完成' }[item.propertyStatus] || '待分派');
  }
  function feedbackCommit(item, change) {
    if (!item || !local('feedback').includes(item) || !property()) return false;
    var before = JSON.stringify(local('feedback'));
    change(item);
    if (store.save()) { window.dispatchEvent(new Event('mini-records-change')); return true; }
    try { store.data.feedback.splice(0, store.data.feedback.length, ...JSON.parse(before)); } catch (error) {}
    return false;
  }
  function own(item) { return enterprise() && item.owner === role() && item.company === company; }
  function releases() { return records('releaseRequests'); }
  // Records that never reached property (still at, withdrawn from, or rejected by the enterprise stage) stay out of property lists.
  function reachedProperty(item) { return !['enterprise_pending', 'withdrawn'].includes(item.status) && item.enterpriseStatus !== 'rejected' && !(item.status === 'supplement' && item.enterpriseStatus === 'supplement'); }
  function propertyReleases() { return releases().filter(reachedProperty); }
  function findRelease(id) { return releases().find(function (item) { return item.id === id; }); }
  function myReleases() { return releases().filter(own); }
  function actorName() { var value = workflows.propertyIdentity(); return typeof value === 'string' ? value : value.name; }
  function active() { return screen.querySelector('section:not(.hidden)'); }
  function el(tag, text, className) { var node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
  function button(text, handler, primary) { var node = el('button', text, primary ? 'role-primary' : ''); node.type = 'button'; node.onclick = handler; return node; }
  function actions(node) { var bar = el('div', undefined, 'role-actions'); node.append(bar); return bar; }
  function heading(node, title, copy) { node.replaceChildren(el('h1', title), el('p', copy)); }
  function empty(node, copy) { node.append(el('p', copy, 'role-empty')); }
  function panel(title, status, copy) { var card = el('article', undefined, 'role-panel'), row = el('div', undefined, 'role-row'); row.append(el('strong', title), el('span', status || '', 'role-status')); card.append(row); if (copy) card.append(el('p', copy)); return card; }
  function feedback(node) { var item = el('p', '', 'role-feedback'); item.setAttribute('role', 'status'); node.append(item); return item; }
  function receiptConfirmation(node, note) {
    var label = el('label', undefined, 'fee-receipt-confirm'), input = el('input'); input.type = 'checkbox'; input.name = 'receiptVerified';
    note.id = (node.closest('section') || node).id + '-receipt-feedback'; input.setAttribute('aria-describedby', note.id); input.setAttribute('aria-required', 'true');
    label.append(input, el('span', '我已核验实际到账，且到账金额与应收金额一致')); node.append(label); return input;
  }
  function receiptFields(item) {
    var receipt = item.feeVerification;
    return receipt ? [['核验到账金额', money(receipt.amount)], ['到账核验人', receipt.by], ['到账核验时间', new Date(receipt.at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) + '（北京时间）'], ['到账凭据 / 核验说明', receipt.reference]] : [];
  }
  function fields(node, pairs) { var dl = el('dl'); pairs.forEach(function (pair) { dl.append(el('dt', pair[0]), el('dd', pair[1] === undefined ? '未填写' : String(pair[1]))); }); node.append(dl); }
  function field(form, label, name, type, required) { var wrapper = el('label', label), input = el(type === 'textarea' ? 'textarea' : 'input'); input.name = name; if (type !== 'textarea') input.type = type || 'text'; input.required = !!required; input.maxLength = type === 'textarea' ? 2000 : 100; wrapper.append(input); form.append(wrapper); return input; }
  function page(id, title, parent) { var node = el('section', undefined, 'hidden role-workflow property-workbench-page'); node.id = id; screen.append(node); pages[id] = node; window.__setMiniRoute(id, title, parent || 'profile'); return node; }
  Object.keys(centers).forEach(function (key) { page(ids[key], centers[key]); });
  page(ids.todo, '今日待办');
  Object.keys(retired).forEach(function (id) { page(id, centers[retired[id]]); });
  page(ids.mine, '我的物品放行'); page(ids.form, '物品放行申请', ids.mine); page(ids.detail, '放行单详情', ids.approvals);
  var domainDetail = page('property-workbench-domain-detail', '审批详情', ids.approvals), domainView = null;
  var repairDetail = page('property-workbench-repair-detail', '工单详情', ids.workorders), repairView = null;
  var cardDetail = page('property-workbench-card-detail', '详情', ids.workorders), cardView = null;
  var feeDetail = page('property-workbench-fee-detail', '收费详情', ids.fees), feeView = null;

  // In-page confirmation sheet; resolves through onConfirm so it works inside the mini-program frame.
  var confirmBox = null;
  function miniConfirm(options) {
    var phone = document.querySelector('.phone') || screen;
    if (!confirmBox) {
      confirmBox = el('div', undefined, 'role-permission-modal mini-confirm hidden'); confirmBox.setAttribute('role', 'alertdialog'); confirmBox.setAttribute('aria-modal', 'true');
      confirmBox.innerHTML = '<div class="role-permission-card mini-confirm-card"><span class="role-permission-icon mini-confirm-icon" aria-hidden="true"><i data-lucide="trash-2"></i></span><h2 id="mini-confirm-title"></h2><p id="mini-confirm-copy"></p><div class="mini-confirm-actions"><button type="button" class="mini-confirm-cancel">取消</button><button type="button" class="mini-confirm-ok"></button></div></div>';
      confirmBox.setAttribute('aria-labelledby', 'mini-confirm-title'); confirmBox.setAttribute('aria-describedby', 'mini-confirm-copy');
      phone.appendChild(confirmBox);
    }
    var previous = document.activeElement, ok = confirmBox.querySelector('.mini-confirm-ok'), cancel = confirmBox.querySelector('.mini-confirm-cancel');
    confirmBox.querySelector('#mini-confirm-title').textContent = options.title;
    confirmBox.querySelector('#mini-confirm-copy').textContent = options.message;
    ok.textContent = options.confirmText || '确定';
    confirmBox.classList.toggle('is-danger', !!options.danger);
    function close() { confirmBox.classList.add('hidden'); document.removeEventListener('keydown', onKey, true); if (previous && previous.focus) previous.focus({ preventScroll: true }); }
    function onKey(event) { if (event.key === 'Escape') { event.preventDefault(); close(); } }
    ok.onclick = function () { close(); options.onConfirm(); };
    cancel.onclick = close;
    confirmBox.onclick = function (event) { if (event.target === confirmBox) close(); };
    document.addEventListener('keydown', onKey, true);
    confirmBox.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
    cancel.focus({ preventScroll: true });
  }
  window.__miniConfirm = miniConfirm;
  function allowed(id) {
    if (id === ids.mine || id === ids.form) return enterprise();
    if (id === ids.detail) { var item = findRelease(detailId); return !!item && (property() || own(item)); }
    return property();
  }
  function deny() { window.__showMiniPage('role-denied'); return false; }
  // Capture the rendered role, route generation and record snapshot, not only a live reference.
  function guard(node, record, collection) {
    var owner = role(), stamp = epoch, signature = record && JSON.stringify(record);
    return function () { return role() === owner && epoch === stamp && node.isConnected && !node.classList.contains('hidden') && allowed(node.id) && (!record || collection().includes(record) && JSON.stringify(record) === signature); };
  }
  function guardedButton(node, text, handler, primary) { var valid = guard(node); return button(text, function () { if (valid()) handler(); else deny(); }, primary); }
  function save(valid, recordValid, change, note, applicant) {
    if (!valid() || !recordValid()) { note.textContent = '身份、页面或记录状态已变化，请重新打开后操作。'; return false; }
    var commit = applicant ? workflows.releaseCommit : workflows.propertyCommit;
    if (!commit) { note.textContent = '物品放行申请保存接口尚未开通，已保留输入。'; return false; }
    if (!commit(change)) { note.textContent = '保存失败，可能是存储不可用或其他页面已更新；输入已保留，请核对后重试。'; return false; }
    return true;
  }
  function appendHistory(item, text) { item.history = (item.history || []).concat([new Date().toISOString() + ' · ' + text]); }
  function launchNative(center, handler, id, title) {
    if (!property()) return deny();
    nativeContext = center; handler();
    if (active() && active().id === id) window.__setMiniRoute(id, title, ids[center]);
  }
  function releaseStatus(item) {
    if (item.status === 'approved') return item.inspectionStatus === 'passed' ? '已批准 · 查验通过' : item.inspectionStatus === 'failed' ? '已批准 · 查验不通过' : '已批准 · 待查验';
    return { enterprise_pending: '待企业审批', pending: '待物业审批', supplement: '待补件', rejected: '已驳回', withdrawn: '已撤回' }[item.status] || item.status || '状态未标记';
  }
  // Label/value grid shared by approval cards (same look as 我的服务 cards).
  function infoGrid(card, pairs) {
    var dl = el('dl', undefined, 'approval-info-grid');
    pairs.forEach(function (pair) { if (pair[1] === undefined || pair[1] === null || pair[1] === '') return; dl.append(el('dt', pair[0]), el('dd', String(pair[1]))); });
    card.append(dl);
  }
  // Seeded records: 位置 · 内容 · 起止 · 团队；form records: 位置 · 开工 · 结束 · 施工单位 · 说明.
  function renovationParts(r) {
    var parts = String(r.detail || '').split(' · ').map(function (part) { return part.trim(); });
    if (parts.length >= 5 && /^\d{4}-\d{2}-\d{2}$/.test(parts[1])) return { location: parts[0], time: parts[1] + ' 至 ' + parts[2], contractor: parts[3], description: parts.slice(4).join(' · ') };
    return { location: parts[0], description: parts[1], time: (parts[2] || '').replace('至', ' 至 '), contractor: parts.slice(3).join(' · ') };
  }
  function releaseCard(node, item) {
    var card = panel(item.items || item.detail || '物品放行单', releaseStatus(item)); card.dataset.releaseId = item.id;
    infoGrid(card, [['申请企业', item.company], ['申请人', item.applicantName], ['放行地点', item.location], ['计划时间', plannedTimeText(item)], ['放行编号', item.id]]);
    node.append(card); return card;
  }
  function plannedTimeText(item) {
    if (!item || !item.plannedAt) return '';
    var text = String(item.plannedAt).replace('T', ' ');
    return item.plannedEndAt ? text + ' 至 ' + String(item.plannedEndAt).replace('T', ' ') : text;
  }
  // Property sees renovation only after the enterprise stage, same rule as the native approval list.
  // Property sees renovation only after the enterprise stage, same rule as the native approval list.
  // Admin submissions skip the enterprise stage, so they are visible as soon as they are submitted.
  function propertyRequests(type) { return records('requests').filter(function (r) { return r.type === type && !['enterprise', 'withdrawn'].includes(r.status) && (r.owner === 'admin' || (r.history || []).some(function (h) { return h.indexOf('企业审批通过') >= 0; })); }); }
  function renovationRequests() { return propertyRequests('renovation'); }
  // 审批 stage: 待审批 while property still has to decide; 已通过 / 已驳回 afterwards.
  function approvalStage(status) { return ['rejected', 'withdrawn'].includes(status) ? 'rejected' : ['property', 'pending', 'property_pending'].includes(status) ? 'pending' : 'approved'; }
  function renderApprovalItems(content) {
    var node = pages[ids.approvals];
    var renovation = content;
    var rows = renovationRequests().filter(function (r) { return !hiddenWorkorder('requests', r); });
    rows.forEach(function (r) {
      var reno = renovationParts(r), card = tagCard(panel(r.title || reno.description || '装修申请', workflows.requestState(r)), 'renovation', approvalStage(r.status)); renovation.append(card);
      infoGrid(card, [['申请企业', r.company], ['装修位置', reno.location], ['施工时间', reno.time], ['施工单位', reno.contractor]]);
      var waiting = r.status === 'property', bar = actions(card), note = feedback(card);
      bar.classList.add('approval-card-actions');
      var openRenovation = function () { launchNative('approvals', function () { workflows.openRequestDetail(r, ids.approvals); }, 'role-request-detail', '装修申请'); };
      bar.append(guardedButton(node, '详情', openRenovation)); clickableCard(node, card, openRenovation);
      if (waiting && workflows.approveRequest) bar.append(guardedButton(node, '审批通过', function () {
        miniConfirm({ title: '确认审批通过？', message: '确认审批通过「' + (r.title || reno.description || '装修申请') + '」？通过后申请将进入下一环节。', confirmText: '审批通过', onConfirm: function () {
          if (workflows.approveRequest(r.id)) open('approvals');
          else note.textContent = '身份或申请状态已变化，请刷新后重试。';
        } });
      }, true));
      manageCard(node, bar, r, 'requests', ['title'], r.title || reno.description || '装修申请');
    });
    // Shared card actions: 详情 + 删除 on the left, primary 审批通过 rightmost.
    function cardActions(card, title, pending, onView, onApprove) {
      var bar = actions(card), note = feedback(card); bar.classList.add('approval-card-actions');
      bar.append(guardedButton(node, '详情', onView)); clickableCard(node, card, onView);
      if (pending && onApprove) bar.append(guardedButton(node, '审批通过', function () {
        miniConfirm({ title: '确认审批通过？', message: '确认审批通过「' + title + '」？通过后申请将进入下一环节。', confirmText: '审批通过', onConfirm: function () {
          if (onApprove()) open('approvals');
          else note.textContent = '身份或申请状态已变化，请刷新后重试。';
        } });
      }, true));
    }
    records('requests').filter(function (r) { return r.type === 'meeting' && r.company === company && !['enterprise', 'withdrawn'].includes(r.status) && (r.owner === 'admin' || (r.history || []).some(function (h) { return h.includes('企业审批通过'); })) && !hiddenWorkorder('requests', r); }).forEach(function (r) {
      var card = tagCard(panel(r.room || r.title || '场地预定申请', workflows.requestState(r)), 'meeting', approvalStage(r.status)); content.append(card);
      infoGrid(card, [['申请企业', r.company], ['使用时间', String(r.meetingStart || '').replace('T', ' ') + ' 至 ' + String(r.meetingEnd || '').replace('T', ' ')], ['申请理由', r.detail], ['申请编号', r.id]]);
      cardActions(card, r.room || '场地预定申请', r.status === 'property', function () { launchNative('approvals', function () { workflows.openRequestDetail(r, ids.approvals); }, 'role-request-detail', '场地申请详情'); }, function () { return workflows.approveRequest(r.id); });
    });
    // 水电缴费: property checks the bill number and amount; approved ones move on to 收费 (待物业办理).
    propertyRequests('utilities').filter(function (r) { return r.company === company && !hiddenWorkorder('requests', r); }).forEach(function (r) {
      var title = r.title || '水电缴费', card = tagCard(panel(title, workflows.requestState(r)), 'utilities', approvalStage(r.status)); content.append(card);
      infoGrid(card, [['申请企业', r.company], ['申请说明', r.detail], ['金额', money(r.amount)], ['申请编号', r.id]]);
      cardActions(card, title, r.status === 'property', function () { launchNative('approvals', function () { workflows.openRequestDetail(r, ids.approvals); }, 'role-request-detail', '水电缴费详情'); }, function () { return workflows.approveRequest(r.id); });
      manageCard(node, card.querySelector('.approval-card-actions'), r, 'requests', ['title'], title);
    });
    local('bookings').filter(function (item) { return item.company === company && item.status !== '已取消' && !item.approvalId && item.propertyStatus && !hiddenWorkorder('bookings', item); }).forEach(function (item) {
      var title = item.room || '场地预定', pending = item.propertyStatus === 'pending';
      var card = tagCard(panel(title, pending ? '待物业审批' : item.propertyStatus === 'approved' ? '已通过' : '已驳回'), 'meeting', approvalStage(item.propertyStatus)); content.append(card);
      infoGrid(card, [['预约企业', item.company], ['预约日期', item.date], ['时段', (item.times || []).join('、')], ['联系人', item.name], ['预约编号', item.id]]);
      cardActions(card, title, pending, function () { openVenueDetail(item); }, function () { return workflows.approveVenueBooking(item.id, 'approved'); });
    });
    var release = content;
    var releaseRows = propertyReleases().filter(function (item) { return !hiddenWorkorder('releaseRequests', item); });
    releaseRows.forEach(function (item) {
      var card = tagCard(releaseCard(release, item), 'release', approvalStage(item.status));
      cardActions(card, item.items || '物品放行单', item.status === 'pending', function () { openReleaseDetail(item.id, ids.approvals); }, workflows.approveDomain && function () { return workflows.approveDomain('release', item.id); });
      manageCard(node, card.querySelector('.approval-card-actions'), item, 'releaseRequests', ['items', 'location', 'plannedAt', 'plannedEndAt'], item.items || '物品放行单');
    });
    var vehicle = content, monitor = content;
    var domain = records('vehicleRequests').filter(function (r) { return r.company === company && r.type !== 'parking' && (r.requiresPropertyReview || r.status === 'property_pending'); }).map(function (r) { return ['vehicle', r]; })
      .concat(records('monitorRequests').filter(function (r) { return r.company === company && reachedProperty(r); }).map(function (r) { return ['monitor', r]; })).filter(function (pair) { return !hiddenWorkorder(pair[0] === 'vehicle' ? 'vehicleRequests' : 'monitorRequests', pair[1]); });
    domain.forEach(function (pair) {
      var kind = pair[0], r = pair[1], pending = r.status === 'property_pending';
      var label = { property_pending: '待物业审批', approved: '已批准', finance_pending: '待物业办理', approved_for_offline_handover: '已批准 · 待线下对接', rejected: '已驳回' }[r.status] || r.status;
      var title = kind === 'vehicle' ? (r.category || '车辆事项') : '监控调取';
      var card = tagCard(panel(title, label), kind, approvalStage(r.status)); (kind === 'vehicle' ? vehicle : monitor).append(card);
      infoGrid(card, kind === 'vehicle'
        ? [['申请企业', r.company], ['车牌号', r.vehiclePlate], ['申请说明', r.detail], ['申请编号', r.id]]
        : [['申请企业', r.company], ['调取范围', r.scope], ['调取时段', r.requestedAt], ['调取原因', r.purpose], ['申请编号', r.id]]);
      cardActions(card, title, pending, function () { openDomainDetail(kind, r); }, workflows.approveDomain && function () { return workflows.approveDomain(kind, r.id); });
      manageCard(node, card.querySelector('.approval-card-actions'), r, kind === 'vehicle' ? 'vehicleRequests' : 'monitorRequests', kind === 'vehicle' ? ['vehiclePlate', 'detail'] : ['scope', 'requestedAt', 'purpose'], title);
    });
  }
  function openVenueDetail(item) {
    var node = domainDetail; domainView = { kind: 'venue', id: item.id };
    node.replaceChildren(); node.classList.add('request-detail-view');
    var banner = el('div', undefined, 'request-detail-banner'); banner.append(el('strong', item.room), el('span', item.propertyStatus === 'pending' ? '待物业审批' : item.propertyStatus === 'approved' ? '已通过' : '已驳回')); node.append(banner);
    fields(node, [['预约企业', item.company], ['预约日期', item.date], ['预约时段', (item.times || []).join('、')], ['联系人', item.name], ['联系电话', item.phone], ['备注', item.purpose || '无'], ['审批意见', item.propertyReviewNote || '无']]);
    if (item.propertyStatus === 'pending' && item.status !== '已取消') {
      var reason = el('textarea'); reason.placeholder = '驳回时必填原因'; reason.setAttribute('aria-label', '审批意见'); node.append(reason);
      var note = feedback(node), bar = actions(node);
      function decide(decision) { if (!property()) return deny(); if (decision === 'rejected' && !reason.value.trim()) { note.textContent = '请填写驳回原因。'; return; } if (workflows.approveVenueBooking(item.id, decision, reason.value.trim())) openVenueDetail(item); else note.textContent = '记录已变化，请返回后重试。'; }
      bar.append(button('驳回申请', function () { decide('rejected'); }), button('审批通过', function () { decide('approved'); }, true));
    }
    window.__setMiniRoute(node.id, '场地预定详情', ids.approvals); window.__showMiniPage(node.id);
  }
  // Read-only detail for vehicle / monitor requests, same layout as the request detail page.
  function openDomainDetail(kind, r) {
    if (!property()) return deny();
    domainView = { kind: kind, id: r.id }; openDomainDetailContent(kind, r);
    window.__setMiniRoute(domainDetail.id, (kind === 'vehicle' ? (r.category || '车辆事项') : '监控调取') + '详情', ids.approvals); window.__showMiniPage(domainDetail.id);
  }
  function openDomainDetailContent(kind, r) {
    var node = domainDetail; node.replaceChildren(); node.classList.add('request-detail-view');
    var closed = r.status !== 'property_pending', title = kind === 'vehicle' ? (r.category || '车辆事项') : '监控调取';
    var banner = el('div', undefined, 'request-detail-banner is-reviewer' + (closed ? ' is-closed' : '')), head = el('div', undefined, 'request-detail-banner-head');
    head.append(el('strong', title), el('em', closed ? '已处理' : '待物业审批', 'request-detail-status')); banner.append(head, el('span', [r.id, r.company, '王晓明'].join(' · '))); node.append(banner);
    var dl = el('dl', undefined, 'request-detail-fields');
    (kind === 'vehicle' ? [['车牌号', r.vehiclePlate], ['申请说明', r.detail]] : [['调取范围', r.scope], ['调取时段', r.requestedAt], ['调取原因', r.purpose]]).concat([['审批进度', (r.history || []).join(' → ')]]).forEach(function (pair) { if (!pair[1]) return; dl.append(el('dt', pair[0]), el('dd', String(pair[1]))); });
    node.append(dl);
    if (closed) return;
    // Same review block as the renovation detail: reason box, then 驳回申请 / 审批通过.
    var box = el('div', undefined, 'request-detail-actions'), note = feedback(box);
    var reason = el('textarea'); reason.placeholder = '驳回时必填原因'; reason.setAttribute('aria-label', '审批意见'); reason.maxLength = 500; box.append(reason);
    var review = kind === 'vehicle' ? workflows.reviewVehicleRequest : workflows.reviewMonitorRequest;
    function decide(decision) {
      if (!property()) return deny();
      if (decision === 'rejected' && !reason.value.trim()) { note.textContent = '请填写驳回原因。'; reason.focus(); return; }
      var current = records(kind === 'vehicle' ? 'vehicleRequests' : 'monitorRequests').find(function (item) { return item.id === r.id; });
      if (!review || !current || !review(current.id, decision, reason.value.trim())) { note.textContent = '身份或申请状态已变化，请返回审批列表刷新。'; return; }
      openDomainDetailContent(kind, current);
    }
    var bar = actions(box); bar.append(button('驳回申请', function () { decide('rejected'); }), button('审批通过', function () { decide('approved'); }, true));
    node.append(box);
  }
  // Shared center layout: white tab bar + independent content block.
  function openRepairDetail(id) {
    if (!property()) return deny();
    repairView = id; renderRepairDetail(id);
    window.__setMiniRoute(repairDetail.id, '报修详情', ids.workorders); window.__showMiniPage(repairDetail.id);
  }
  function renderRepairDetail(id) {
    var item = records('repairs').find(function (r) { return r.id === id; }), node = repairDetail;
    node.replaceChildren(); node.classList.add('request-detail-view');
    if (!item) { empty(node, '该工单已不存在，请返回工单中心。'); return; }
    var labels = { pending: '待接单', processing: '处理中', confirmation: '待报修人确认', completed: '已完成' };
    var closed = ['confirmation', 'completed'].includes(item.status);
    var banner = el('div', undefined, 'request-detail-banner is-reviewer' + (closed ? ' is-closed' : '')), head = el('div', undefined, 'request-detail-banner-head');
    head.append(el('strong', item.title || '物业报修'), el('em', labels[item.status] || item.status, 'request-detail-status'));
    banner.append(head, el('span', [item.id, item.company, '王晓明'].join(' · '))); node.append(banner);
    var parts = String(item.detail || '').split(' · ');
    var dl = el('dl', undefined, 'request-detail-fields');
    [['报修位置', parts.length > 1 ? parts[0] : ''], ['问题描述', parts.length > 1 ? parts.slice(1).join(' · ') : item.detail], ['处理进度', (item.history || []).join(' → ')], ['下一步', { pending: '接单后安排维修人员上门', processing: '完成维修后填写处理结果', confirmation: '等待报修人确认是否已修好', completed: '工单已完成' }[item.status]]]
      .forEach(function (pair) { if (!pair[1]) return; dl.append(el('dt', pair[0]), el('dd', String(pair[1]))); });
    node.append(dl);
    var note = feedback(node), box = el('div', undefined, 'request-detail-actions');
    if (item.status === 'pending') {
      var bar = actions(box); bar.classList.add('approval-card-actions');
      bar.append(guardedButton(node, '接单处理', function () { if (workflows.repairAction && workflows.repairAction(item.id, 'accept')) renderRepairDetail(item.id); else note.textContent = '工单状态已变化，请返回工单中心刷新。'; }, true));
    } else if (item.status === 'processing') {
      var result = el('textarea'); result.placeholder = '填写维修措施和处理结果'; result.setAttribute('aria-label', '维修结果'); result.maxLength = 1000; box.append(result);
      var bar2 = actions(box); bar2.classList.add('approval-card-actions');
      bar2.append(guardedButton(node, '提交维修结果', function () {
        if (!result.value.trim()) { note.textContent = '请填写维修结果。'; result.focus(); return; }
        if (workflows.repairAction && workflows.repairAction(item.id, 'result', result.value)) renderRepairDetail(item.id); else note.textContent = '工单状态已变化，请返回工单中心刷新。';
      }, true));
    }
    if (box.children.length) node.append(box);
  }
  function unpaid(item) { return item.status === 'unpaid' || item.status === 'overdue'; }
  function overdue(item) { return unpaid(item) && item.due && Date.parse(item.due + 'T23:59:59+08:00') < Date.now(); }
  function billLabel(item) { return overdue(item) ? '已逾期' : ({ unpaid: '待缴费', overdue: '已逾期', paid: '已缴费', cancelled: '已取消', refunded: '已退款', pending: '待确认' }[item.status] || item.status || '状态未标记'); }
  function billType(item) {
    if (item.category === 'utilities') return 'utilities';
    return /停车/.test(item.title || '') ? 'parking' : /水|电/.test(item.title || '') ? 'utilities' : 'other';
  }
  function shanghaiDay(offset) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + (offset || 0) * 86400000)); }
  function daysUntil(day) { return Math.round((Date.parse(day + 'T00:00:00+08:00') - Date.parse(shanghaiDay() + 'T00:00:00+08:00')) / 86400000); }
  function money(value) { return Number.isFinite(Number(value)) ? '¥' + Number(value).toFixed(2) : '未标记'; }
  // Rent due within 15 days (or overdue), or contract ending within 30 days, needs a call.
  function leaseAlert(item) {
    if (item.status === 'paid') return '';
    var due = daysUntil(item.nextDue), end = daysUntil(item.endDate);
    if (due < 0) return '租金已逾期 ' + (-due) + ' 天';
    if (due <= 15) return '租金 ' + due + ' 天后到期';
    if (end <= 30) return '合同 ' + end + ' 天后到期';
    return '';
  }
  function bookingFee(item) { return Number(item.price || 0) * (item.times || []).length; }
  function centerSection(content, name) { var box = el('div', undefined, 'property-approval-section'); if (name) box.dataset.centerSection = name; content.append(box); return box; }
  // Whole card opens its detail; clicks on controls inside the card keep their own action.
  function clickableCard(node, card, onOpen) {
    var valid = guard(node);
    card.classList.add('is-clickable'); card.tabIndex = 0; card.setAttribute('role', 'button');
    card.addEventListener('click', function (event) { if (event.target.closest('button, a, input, textarea, select, label, form')) return; if (valid()) onOpen(); else deny(); });
    card.addEventListener('keydown', function (event) { if (event.target !== card || (event.key !== 'Enter' && event.key !== ' ')) return; event.preventDefault(); if (valid()) onOpen(); else deny(); });
  }
  function cardBar(card) { var bar = actions(card); bar.classList.add('approval-card-actions'); return bar; }
  var hiddenWorkorders = [];
  try { hiddenWorkorders = JSON.parse(localStorage.getItem('v4:property-workorder-hidden-v1') || '[]'); } catch (error) {}
  function hiddenKey(kind, item) { return kind + ':' + item.id; }
  function hiddenWorkorder(kind, item) { return !!item && hiddenWorkorders.includes(hiddenKey(kind, item)); }
  function hideWorkorder(kind, item) {
    var next = hiddenWorkorders.concat([hiddenKey(kind, item)]);
    try { localStorage.setItem('v4:property-workorder-hidden-v1', JSON.stringify(next)); hiddenWorkorders = next; return true; } catch (error) { return false; }
  }
  // Property can edit common text fields or remove a work order from this center; source records stay intact.
  // Card buttons: secondary actions (详情 / 删除) on the left, the primary action rightmost. No inline edit.
  function orderBar(bar) {
    var buttons = Array.from(bar.querySelectorAll(':scope > button'));
    function rank(b) { return b.dataset.cardAction === 'delete' ? 0 : b.dataset.cardAction === 'detail' ? 1 : b.classList.contains('role-primary') ? 3 : 2; }
    buttons.sort(function (a, b) { return rank(a) - rank(b); }).forEach(function (b) { bar.append(b); });
  }
  // Every card opens a detail page: its own page when one exists, otherwise a generic read-only view of the card.
  function openCardDetail(node, card) {
    if (!property()) return deny();
    var parent = node.id, title = (card.querySelector('.role-row strong') || {}).textContent || '详情';
    var type = card.dataset.cardType;
    cardView = { parent: parent, title: title, type: type, status: (card.querySelector('.role-status') || {}).textContent || '', fields: Array.from(card.querySelectorAll('dl dt')).map(function (dt) { return [dt.textContent, dt.nextElementSibling ? dt.nextElementSibling.textContent : '']; }), copy: Array.from(card.querySelectorAll(':scope > p:not(.role-feedback)')).map(function (p) { return p.textContent; }).filter(Boolean) };
    window.__setMiniRoute(cardDetail.id, typeLabel(type) + '详情', parent); window.__showMiniPage(cardDetail.id);
  }
  // Action detail: the card keeps 删除 / 详情 / one entry button; the actual step (and any result text) happens here.
  var actionDetail = page('property-workbench-action-detail', '详情', ids.workorders), actionView = null;
  function openActionDetail(node, spec) {
    if (!property()) return deny();
    actionView = Object.assign({ parent: node.id }, spec);
    renderActionDetail();
    window.__setMiniRoute(actionDetail.id, spec.routeTitle || (typeLabel(spec.type) + '详情'), node.id); window.__showMiniPage(actionDetail.id);
  }
  function renderActionDetail() {
    var node = actionDetail; node.replaceChildren(); node.classList.add('request-detail-view');
    var view = actionView && actionView.refresh ? actionView.refresh() : null;
    if (!view) { empty(node, '记录已变化，请返回列表。'); return; }
    var banner = el('div', undefined, 'request-detail-banner is-reviewer' + (view.step || view.review ? '' : ' is-closed')), head = el('div', undefined, 'request-detail-banner-head');
    head.append(el('strong', view.title), el('em', view.status, 'request-detail-status')); banner.append(head, el('span', view.meta || typeLabel(actionView.type))); node.append(banner);
    var dl = el('dl', undefined, 'request-detail-fields');
    (view.fields || []).forEach(function (pair) { if (pair[1] !== undefined && pair[1] !== null && pair[1] !== '') dl.append(el('dt', pair[0]), el('dd', String(pair[1]))); });
    node.append(dl);
    if (view.review) {
      // Same review block as 装修申请: reason (required to reject), then 驳回申请 / 审批通过.
      var rbox = el('div', undefined, 'request-detail-actions'), rnote = feedback(rbox), reason = el('textarea');
      reason.placeholder = '驳回时必填原因'; reason.setAttribute('aria-label', '审批意见'); reason.maxLength = 500; rbox.append(reason);
      var rvalid = guard(node), rbar = actions(rbox);
      var decide = function (decision) {
        if (!rvalid()) return deny();
        if (decision === 'rejected' && !reason.value.trim()) { rnote.textContent = '请填写驳回原因。'; reason.focus(); return; }
        if (view.review(decision, reason.value.trim())) renderActionDetail(); else rnote.textContent = '记录已变化或保存失败，请返回列表后重试。';
      };
      rbar.append(button('驳回申请', function () { decide('rejected'); }), button('审批通过', function () { decide('approved'); }, true));
      node.append(rbox); return;
    }
    if (!view.step) return;
    var box = el('div', undefined, 'request-detail-actions'), note = feedback(box), input = null;
    if (view.step.input) { input = el('textarea'); input.placeholder = view.step.input; input.setAttribute('aria-label', view.step.inputLabel || view.step.input); input.maxLength = 1000; box.append(input); }
    var receipt = view.step.receipt ? receiptConfirmation(box, note) : null;
    if (receipt && input) { input.setAttribute('aria-required', 'true'); input.setAttribute('aria-describedby', note.id); }
    var valid = guard(node), bar = actions(box);
    bar.append(button(view.step.label, function () {
      if (!valid()) return deny();
      var text = input ? input.value.trim() : '';
      if (input && !text) { input.setAttribute('aria-invalid', 'true'); note.textContent = '请填写' + (view.step.inputLabel || '处理结果') + '。'; input.focus(); return; }
      if (input) input.removeAttribute('aria-invalid');
      if (receipt && !receipt.checked) { receipt.setAttribute('aria-invalid', 'true'); note.textContent = '请先核验实际到账，并勾选到账金额与应收金额一致。'; receipt.focus(); return; }
      if (view.step.run(text, receipt && receipt.checked)) { renderActionDetail(); } else note.textContent = '记录已变化、金额无效或保存失败，请返回列表后重试。';
    }, true));
    node.append(box);
  }
  // Card entry that opens the action detail; label names the next step (去处理 / 现场签到 …).
  function actionEntry(node, bar, card, label, spec) {
    var go = function () { openActionDetail(node, spec); };
    var view = guardedButton(node, '详情', go); view.dataset.cardAction = 'detail'; bar.append(view);
    if (label) bar.append(guardedButton(node, label, go, true));
    clickableCard(node, card, go);
  }
  function renderCardDetail() {
    var node = cardDetail; node.replaceChildren(); node.classList.add('request-detail-view');
    if (!cardView) { empty(node, '记录已变化，请返回列表。'); return; }
    var banner = el('div', undefined, 'request-detail-banner is-reviewer'), head = el('div', undefined, 'request-detail-banner-head');
    head.append(el('strong', cardView.title), el('em', cardView.status, 'request-detail-status')); banner.append(head, el('span', typeLabel(cardView.type))); node.append(banner);
    var dl = el('dl', undefined, 'request-detail-fields');
    cardView.copy.forEach(function (line) { dl.append(el('dt', '说明'), el('dd', line)); });
    cardView.fields.forEach(function (pair) { if (pair[1]) dl.append(el('dt', pair[0]), el('dd', pair[1])); });
    node.append(dl);
  }
  // Make sure each card has a 详情 entry and is tappable; existing 详情 buttons keep their own target.
  function ensureDetail(node, card) {
    var bar = card.querySelector(':scope > .approval-card-actions, :scope > .journey-actions, :scope > form > .approval-card-actions');
    var own = bar && Array.from(bar.querySelectorAll('button')).find(function (b) { return b.textContent === '详情'; });
    if (own) own.dataset.cardAction = 'detail';
    if (!own) {
      if (!bar) { bar = actions(card); bar.classList.add('approval-card-actions'); }
      var detail = guardedButton(node, '详情', function () { openCardDetail(node, card); }); detail.dataset.cardAction = 'detail'; bar.append(detail);
    }
    if (!card.classList.contains('is-clickable')) clickableCard(node, card, function () { (own || bar.querySelector('[data-card-action="detail"]')).click(); });
    bar.querySelectorAll('button').forEach(function (b) { if (b.textContent === '删除') b.dataset.cardAction = 'delete'; });
    orderBar(bar);
  }
  function manageCard(node, bar, item, kind, keys, title) {
    if (!bar || !item || !property()) return;
    var card = bar.closest('.role-panel, .journey-card'), note = card.querySelector('.role-feedback') || feedback(card);
    var remove = guardedButton(node, '删除', function () {
      miniConfirm({ title: '确定删除这条记录吗？', message: '删除「' + title + '」后，记录及相关处理信息将从列表中移除且无法恢复，请谨慎操作。', confirmText: '删除', danger: true, onConfirm: function () {
        if (hideWorkorder(kind, item)) window.__showMiniPage(node.id); else note.textContent = '删除失败，请检查浏览器存储设置。';
      } });
    });
    remove.dataset.cardAction = 'delete'; bar.append(remove);
    orderBar(bar);
  }
  // Status buckets shared by 工单中心: 待处理 → 待确认 → 已完成.
  function stageOf(value) {
    if (['completed', 'confirmed', 'closed', 'verified'].includes(value)) return 'done';
    if (['confirmation', 'awaiting_confirmation', 'result'].includes(value)) return 'confirm';
    return 'pending';
  }
  // ---- Four action-based centres: status tabs on top, type filter in the corner ----
  var centerState = {
    approvals: { tab: 'pending', type: 'all' },
    workorders: { tab: 'pending', type: 'all' },
    fees: { tab: 'pending', type: 'all' },
    feedback: { tab: 'pending', type: 'all' }
  };
  var approvalTabs = [['pending', '待审批'], ['approved', '已通过'], ['rejected', '已驳回']];
  var workTabs = [['pending', '待处理'], ['confirm', '待确认'], ['done', '已完成']];
  var feeTabs = [['pending', '待缴费'], ['overdue', '已逾期'], ['paid', '已缴费']];
  var feedbackTabs = [['pending', '未处理'], ['done', '已处理']];
  var typeLabels = {
    meeting: '场地预定', renovation: '装修申请', release: '物品放行', vehicle: '车辆服务', monitor: '监控调取',
    repairs: '物业报修', special: '专项服务', 'release-check': '放行查验', visitor: '访客预约', activity: '活动报名',
    lease: '租赁费用', venue: '场地费用', utilities: '水电缴费', parking: '停车缴费', dining: '订餐费用',
    complaint: '投诉', suggestion: '建议', praise: '表扬'
  };
  function typeLabel(key) { return typeLabels[key] || key; }
  // A card carries its type and stage; the two controls only show or hide what is already built.
  // Mixed lists need a visible type label in front of each title.
  function typeChip(card, type) {
    var row = card.querySelector('.role-row'); if (!row || row.querySelector('.card-type-chip')) return;
    row.prepend(el('span', typeLabel(type), 'card-type-chip'));
  }
  function tagCard(card, type, stage) { card.dataset.cardType = type; card.dataset.cardStage = stage; card.classList.add('center-card'); typeChip(card, type); return card; }
  function centerShell(node, key, tabs, types) {
    var state = centerState[key];
    if (!types.some(function (pair) { return pair[0] === state.type; })) state.type = 'all';
    if (!tabs.some(function (pair) { return pair[0] === state.tab; })) state.tab = tabs[0][0];
    node.replaceChildren(); node.classList.add('property-center'); node.dataset.centerKey = key;
    var bar = el('div', undefined, 'approval-tabs'); bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', '处理状态');
    tabs.forEach(function (pair) {
      var tab = button(pair[1], function () { state.tab = pair[0]; node.dataset.centerTab = pair[0]; syncTabs(); applyFilter(node); });
      tab.dataset.centerTab = pair[0]; bar.append(tab);
    });
    function syncTabs() { bar.querySelectorAll('button').forEach(function (b) { var on = b.dataset.centerTab === state.tab; b.setAttribute('aria-selected', String(on)); b.classList.toggle('active', on); }); }
    // Type filter: a horizontal row of chips under the status tabs (全部 + each type, with counts).
    var filterBar = el('div', undefined, 'center-filter-bar'); filterBar.setAttribute('role', 'group'); filterBar.setAttribute('aria-label', '类型筛选');
    [['all', '全部']].concat(types).forEach(function (pair) {
      var chip = button('', function () { state.type = pair[0]; applyFilter(node); chip.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
      chip.className = 'center-filter-chip'; chip.dataset.filterType = pair[0];
      chip.append(el('span', pair[1]), el('b', '', 'center-filter-count'));
      filterBar.append(chip);
    });
    var content = el('div', undefined, 'property-approval-content'); content.setAttribute('role', 'region');
    node.append(bar, filterBar, content);
    syncTabs();
    return content;
  }
  // Show one card per record: the status tab picks the stage, the type filter narrows the kind.
  function applyFilter(node) {
    var key = node.dataset.centerKey, state = centerState[key];
    var cards = Array.from(node.querySelectorAll('[data-card-type]'));
    cards.forEach(function (card) { if (!card.dataset.detailReady) { card.dataset.detailReady = 'true'; ensureDetail(node, card); } });
    var shown = 0;
    cards.forEach(function (card) {
      var ok = (state.tab === 'all' || card.dataset.cardStage === state.tab) && (state.type === 'all' || card.dataset.cardType === state.type);
      card.hidden = !ok; if (ok) shown += 1;
    });
    var note = node.querySelector('.center-empty');
    if (!note) { note = el('p', '暂无符合条件的记录。', 'role-empty center-empty'); node.querySelector('.property-approval-content').appendChild(note); }
    note.hidden = shown > 0;
    // Chip counts follow the current status tab.
    node.querySelectorAll('.center-filter-chip').forEach(function (chip) {
      var type = chip.dataset.filterType;
      var count = cards.filter(function (card) { return (state.tab === 'all' || card.dataset.cardStage === state.tab) && (type === 'all' || card.dataset.cardType === type); }).length;
      var on = type === state.type;
      chip.querySelector('.center-filter-count').textContent = String(count);
      chip.classList.toggle('active', on); chip.setAttribute('aria-pressed', String(on));
    });
  }
  function sortAlerts(box) {
    // Overdue and soon-due items float to the top of the list.
    var urgent = Array.from(box.querySelectorAll('.center-card.fee-alert'));
    urgent.slice().reverse().forEach(function (card) { box.prepend(card); });
  }
  // 访客预约 needs a property decision (issue the visitor pass), not an on-site check.
  function visitorStage(item) { return item.reviewStatus === 'approved' ? 'approved' : item.reviewStatus === 'rejected' ? 'rejected' : 'pending'; }
  function visitorStatusText(item) { return { pending: '待物业审批', approved: '已通过', rejected: '已驳回' }[visitorStage(item)]; }
  function reviewVisitorRecord(list, item, commitFn, decision, note) {
    if (!property() || !list().includes(item) || visitorStage(item) !== 'pending') return false;
    return commitFn(function () {
      item.reviewStatus = decision; item.reviewNote = note; item.reviewedBy = actorName(); item.reviewedAt = new Date().toISOString();
      item.history = (item.history || []).concat([actorName() + '：物业审批' + (decision === 'approved' ? '通过' : '驳回') + (note ? ' · ' + note : '')]);
    });
  }
  function storeCommit(change) {
    var before = JSON.stringify(local('visitors')); change();
    if (store.save()) { window.dispatchEvent(new Event('mini-records-change')); return true; }
    try { store.data.visitors.splice(0, store.data.visitors.length, ...JSON.parse(before)); } catch (error) {}
    return false;
  }
  function renderVisitorApprovals(node, content) {
    var sources = [
      ['visitors', function () { return records('visitors'); }, workflows.propertyCommit],
      ['localVisitors', function () { return local('visitors'); }, storeCommit]
    ];
    sources.forEach(function (source) {
      source[1]().filter(function (item) { return (!item.company || item.company === company) && !item.cancelled && !hiddenWorkorder(source[0], item); }).forEach(function (item) {
        var title = item.name || store.displayText(item, item.title) || '访客登记';
        var fieldsOf = function (v) { return v.fields ? v.fields.map(function (pair) { return [pair[0], store.displayText(v, pair[1])]; }) : [['接待企业', v.company], ['来访安排', v.detail], ['联系电话', v.phone]]; };
        var card = tagCard(panel(title, visitorStatusText(item)), 'visitor', visitorStage(item)); card.dataset.visitorId = item.id; content.append(card);
        infoGrid(card, fieldsOf(item).concat([['登记编号', item.id]]));
        var bar = cardBar(card), id = item.id;
        actionEntry(node, bar, card, visitorStage(item) === 'pending' ? '审批' : '', { type: 'visitor', routeTitle: '访客预约详情', refresh: function () {
          var v = source[1]().find(function (row) { return row.id === id; }); if (!v) return null;
          return { title: v.name || store.displayText(v, v.title) || '访客登记', status: visitorStatusText(v), meta: [v.id, v.company].filter(Boolean).join(' · '),
            fields: fieldsOf(v).concat([['审批意见', v.reviewNote], ['审批人', v.reviewedBy], ['审批进度', (v.history || []).join(' → ')]]),
            review: visitorStage(v) === 'pending' ? function (decision, note) { return reviewVisitorRecord(source[1], v, source[2], decision, note); } : null };
        } });
        manageCard(node, bar, item, source[0], [], title);
      });
    });
  }
  function renderApprovals() {
    var node = pages[ids.approvals];
    var content = centerShell(node, 'approvals', approvalTabs, [['meeting', '场地预定'], ['renovation', '装修申请'], ['release', '物品放行'], ['vehicle', '车辆服务'], ['monitor', '监控调取'], ['utilities', '水电缴费'], ['visitor', '访客预约'], ['activity', '活动报名']]);
    renderApprovalItems(content);
    renderVisitorApprovals(node, content);
    // 活动报名 approval cards come from miniprogram-service-journeys.js.
    if (window.__parkServiceJourneys && window.__parkServiceJourneys.renderApprovalExtras) window.__parkServiceJourneys.renderApprovalExtras(content, node);
    applyFilter(node);
  }
  function renderWorkorders() {
    var node = pages[ids.workorders];
    var content = centerShell(node, 'workorders', workTabs, [['repairs', '物业报修'], ['special', '专项服务'], ['release-check', '放行查验']]);
    // 物业报修: accept → process → tenant confirms.
    var repairLabels = { pending: '待接单', processing: '处理中', confirmation: '待报修人确认', completed: '已完成' };
    records('repairs').filter(function (item) { return !hiddenWorkorder('repairs', item); }).forEach(function (item) {
      var card = tagCard(panel(item.title, repairLabels[item.status] || item.status), 'repairs', stageOf(item.status)); card.dataset.repairId = item.id; content.append(card);
      infoGrid(card, [['报修企业', item.company], ['问题描述', item.detail], ['处理进度', (item.history || []).join(' → ')], ['工单编号', item.id]]);
      var activeRepair = ['pending', 'processing'].includes(item.status);
      var bar = cardBar(card); bar.append(guardedButton(node, '详情', function () { openRepairDetail(item.id); }));
      if (activeRepair) bar.append(guardedButton(node, '处理工单', function () { openRepairDetail(item.id); }, true));
      clickableCard(node, card, function () { openRepairDetail(item.id); });
      manageCard(node, bar, item, 'repairs', ['title', 'detail'], item.title || '物业报修');
    });
    // 专项服务 cards come from miniprogram-service-journeys.js (it tags and appends them).
    // 放行查验: an approved release still needs the on-site check.
    releases().filter(function (item) { return item.status === 'approved' && !item.inspectedAt && !hiddenWorkorder('releaseRequests', item); }).forEach(function (item) {
      var card = tagCard(releaseCard(content, item), 'release-check', 'pending'); card.dataset.releaseId = item.id; content.append(card);
      var checkBar = cardBar(card); checkBar.append(guardedButton(node, '详情', function () { openReleaseDetail(item.id, ids.workorders); }), guardedButton(node, '现场查验', function () { openReleaseDetail(item.id, ids.workorders); }, true));
      clickableCard(node, card, function () { openReleaseDetail(item.id, ids.workorders); });
      manageCard(node, card.querySelector('.approval-card-actions'), item, 'releaseRequests', [], item.items || '物品放行单');
    });
    // 专项服务 cards come from miniprogram-service-journeys.js.
    if (window.__parkServiceJourneys && window.__parkServiceJourneys.renderWorkorderExtras) window.__parkServiceJourneys.renderWorkorderExtras(content, node);
    applyFilter(node);
  }
  // ---- 收费: cards show the key facts and one entry; status, contact notes and reconciliation live in the detail page ----
  var feeStates = {
    lease: [['pending', '待缴费'], ['contacted', '已联系'], ['promised', '已承诺缴费'], ['paid', '已缴费']],
    venue: [['pending', '待收费'], ['contacted', '已联系'], ['paid', '已收费']],
    utilities: [['pending', '待缴费'], ['contacted', '已联系'], ['paid', '已缴费']],
    parking: [['pending', '待缴费'], ['contacted', '已联系'], ['paid', '已缴费']],
    dining: [['pending', '待收费'], ['contacted', '已联系'], ['paid', '已收费']]
  };
  function feeRecord(kind, id) {
    if (kind === 'dining') return window.__parkServiceJourneys && window.__parkServiceJourneys.diningRecord ? window.__parkServiceJourneys.diningRecord(id) : null;
    var list = kind === 'lease' ? records('leases') : kind === 'venue' ? local('bookings') : kind === 'parking-request' ? records('vehicleRequests') : records('bills');
    return list.find(function (item) { return item.id === id; });
  }
  function feeState(kind, item) {
    if (kind === 'venue') return item.feePaid ? 'paid' : item.feeState || 'pending';
    if (kind === 'dining') return item.feeStatus === 'paid' ? 'paid' : item.feeState || 'pending';
    if (kind === 'lease' || kind === 'utilities' || kind === 'parking') return item.status === 'paid' ? 'paid' : item.feeState || (item.reminded ? 'contacted' : 'pending');
    return 'pending';
  }
  function feeLabel(kind, item) { var key = feeState(kind, item), pair = (feeStates[kind] || []).find(function (row) { return row[0] === key; }); return pair ? pair[1] : key; }
  function feeNotes(item) { return (item.feeNotes || []).concat((item.contacts || []).map(function (c) { return { at: c.at, by: c.by, state: '已联系', note: c.note }; }), (item.reconciliations || []).map(function (r) { return { at: r.at, by: r.by, state: '核对', note: r.result }; })).sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }); }
  function openFeeDetail(kind, id) {
    if (!property()) return deny();
    feeView = { kind: kind, id: id };
    window.__setMiniRoute(feeDetail.id, typeLabel(kind) + '详情', ids.fees); window.__showMiniPage(feeDetail.id);
  }
  function renderFeeDetail() {
    var node = feeDetail; node.replaceChildren(); node.classList.add('request-detail-view');
    var item = feeView && feeRecord(feeView.kind, feeView.id);
    if (!item) { empty(node, '该记录已不存在，请返回收费列表。'); return; }
    var kind = feeView.kind, title, rows, amount;
    if (kind === 'lease') { title = item.company + ' · ' + item.space; amount = item.amount; rows = [['本期租金', money(item.amount)], ['缴费日', item.nextDue], ['合同到期', item.endDate], ['租赁面积', item.area + 'm²'], ['企业联系人', item.contact + ' ' + item.phone], ['合同编号', item.id]]; }
    else if (kind === 'venue') { title = item.room || '场地预定'; amount = bookingFee(item); rows = [['预约企业', item.company], ['日期', item.date], ['时段', (item.times || []).join('、')], ['应收金额', money(bookingFee(item))], ['计费方式', '¥' + (item.price || 0) + ' × ' + (item.times || []).length + ' 时段'], ['联系人', item.name + (item.phone ? ' ' + item.phone : '')], ['预约编号', item.id]]; }
    else if (kind === 'dining') { title = item.title || item.menu || '订餐订单'; amount = item.amount; rows = [['订单企业', item.company], ['取餐时间', item.pickup], ['数量', item.quantity ? item.quantity + '份' : ''], ['金额', item.amount ? money(item.amount) : ''], ['联系人', item.contact ? item.contact + (item.phone ? ' ' + item.phone : '') : ''], ['订单编号', item.id]]; }
    else { title = item.title || '账单'; amount = item.amount; rows = [['账单企业', item.company], ['金额', money(item.amount)], ['到期日', item.due], ['账单编号', item.id]]; }
    var alert = kind === 'lease' ? leaseAlert(item) : (['utilities', 'parking'].includes(kind) && overdue(item) ? '已逾期' : '');
    var banner = el('div', undefined, 'request-detail-banner is-reviewer' + (feeState(kind, item) === 'paid' ? ' is-closed' : '')), head = el('div', undefined, 'request-detail-banner-head');
    head.append(el('strong', title), el('em', feeLabel(kind, item), 'request-detail-status')); banner.append(head, el('span', typeLabel(kind) + (alert ? ' · ' + alert : ''))); node.append(banner);
    var dl = el('dl', undefined, 'request-detail-fields'); rows.concat(receiptFields(item)).forEach(function (pair) { if (pair[1]) dl.append(el('dt', pair[0]), el('dd', String(pair[1]))); }); node.append(dl);
    // Processing record: every status change and note, newest first.
    var history = feeNotes(item);
    var log = el('section', undefined, 'fee-log'); log.append(el('h2', '处理记录'));
    if (!history.length) log.append(el('p', '暂无处理记录。', 'fee-log-empty'));
    history.forEach(function (row) { var line = el('div', undefined, 'fee-log-row'); line.append(el('span', String(row.at).slice(5, 16).replace('T', ' '), 'fee-log-time'), el('b', row.state), el('p', (row.note || '') + (row.by ? ' · ' + row.by : ''))); log.append(line); });
    node.append(log);
    // Status change with a reason/remark.
    var form = el('form', undefined, 'fee-status-form'), note = feedback(node), valid = kind === 'dining' ? guard(node) : guard(node, item, function () { return kind === 'venue' ? local('bookings') : kind === 'lease' ? records('leases') : records('bills'); });
    form.append(el('h2', '修改状态'));
    var group = el('div', undefined, 'fee-status-options'); group.setAttribute('role', 'radiogroup'); group.setAttribute('aria-label', '缴费状态');
    var chosen = feeState(kind, item);
    (feeStates[kind] || []).forEach(function (pair) {
      var option = button(pair[1], function () { chosen = pair[0]; receipt.checked = false; receipt.parentElement.hidden = chosen !== 'paid'; remark.setAttribute('aria-required', String(chosen === 'paid')); group.querySelectorAll('button').forEach(function (b) { var on = b.dataset.state === chosen; b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on)); }); });
      option.dataset.state = pair[0]; option.setAttribute('role', 'radio'); option.classList.toggle('active', pair[0] === chosen); option.setAttribute('aria-checked', String(pair[0] === chosen)); group.append(option);
    });
    form.append(group);
    var remark = field(form, '备注 / 原因', 'feeRemark', 'textarea', false); remark.placeholder = '如：已电话通知，企业承诺本周五前缴纳；或回单编号、未缴原因';
    var receipt = receiptConfirmation(form, note); receipt.parentElement.hidden = chosen !== 'paid'; remark.setAttribute('aria-describedby', note.id); remark.setAttribute('aria-required', String(chosen === 'paid'));
    form.append(el('p', '标记已缴费 / 已收费前，须核验实际到账并填写到账凭据或核验说明；未到账、部分到账或金额不符时不可确认。此操作不会发起付款或自动扣款。', 'role-feedback'));
    var submit = button('保存', null, true); submit.type = 'submit';
    var bar = el('div', undefined, 'role-actions request-detail-actions-bar'); bar.append(submit); form.append(bar);
    form.onsubmit = function (event) {
      event.preventDefault();
      if (!valid()) { note.textContent = '记录已变化，请返回列表后重新打开。'; return; }
      var text = remark.value.trim();
      receipt.removeAttribute('aria-invalid'); remark.removeAttribute('aria-invalid');
      if (chosen === 'paid' && (!receipt.checked || !text)) { receipt.setAttribute('aria-invalid', String(!receipt.checked)); remark.setAttribute('aria-invalid', String(!text)); note.textContent = '请核验实际到账、勾选金额一致，并在备注中填写到账凭据或核验说明。'; if (!text) remark.focus(); else receipt.focus(); return; }
      if (chosen === 'paid' && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) { note.textContent = '应收金额无效，不能确认到账。'; return; }
      if (chosen === feeState(kind, item) && !text) { note.textContent = '请修改状态或填写备注后再保存。'; remark.focus(); return; }
      var label = (feeStates[kind].find(function (pair) { return pair[0] === chosen; }) || [chosen, chosen])[1];
      var verification = chosen === 'paid' ? { amount: Number(amount), reference: text.slice(0, 500), by: actorName(), at: new Date().toISOString() } : null;
      var change = function () {
        if (verification) item.feeVerification = verification;
        item.feeNotes = (item.feeNotes || []).concat([{ at: new Date().toISOString(), by: actorName(), state: label, note: text.slice(0, 500) }]);
        if (kind === 'venue') { item.feePaid = chosen === 'paid'; item.feeState = chosen; if (item.feePaid) { item.feePaidBy = actorName(); item.feePaidAt = new Date().toISOString(); } }
        else { item.feeState = chosen; item.status = chosen === 'paid' ? 'paid' : (kind === 'lease' ? 'unpaid' : (item.status === 'paid' ? 'unpaid' : item.status)); if (chosen === 'contacted') { item.reminded = true; item.remindedBy = actorName(); item.remindedAt = new Date().toISOString(); } }
      };
      var ok;
      if (kind === 'dining') {
        ok = window.__parkServiceJourneys && window.__parkServiceJourneys.updateDining(item.id, function (row) { if (verification) row.feeVerification = verification; row.feeNotes = (row.feeNotes || []).concat([{ at: new Date().toISOString(), by: actorName(), state: label, note: text.slice(0, 500) }]); row.feeState = chosen; if (chosen === 'paid') { row.feeStatus = 'paid'; row.feePaidBy = actorName(); row.feePaidAt = new Date().toISOString(); } else row.feeStatus = ''; });
        if (!ok) note.textContent = '保存失败，请刷新后重试。';
      }
      else if (kind === 'venue') { var before = JSON.stringify(item); change(); ok = store.save(); if (!ok) { Object.keys(item).forEach(function (key) { delete item[key]; }); Object.assign(item, JSON.parse(before)); note.textContent = '保存失败，原状态未改变，请重试。'; } }
      else ok = save(valid, function () { return true; }, change, note);
      if (ok) { if (window.__miniToast) window.__miniToast('已保存'); renderFeeDetail(); }
    };
    node.append(form);
  }
  function feeRequests() {
    return records('requests').filter(function (r) { return r.company === company && r.type === 'utilities' && ['execution', 'approved'].includes(r.status) && !hiddenWorkorder('requests', r); });
  }
  // Card keeps 详情 / 去处理; receipt verification happens in the detail page.
  function completeFeeButton(node, bar, collection, record) {
    var card = bar.closest('.role-panel');
    actionEntry(node, bar, card, record.status === 'approved' ? null : '去处理', { type: card.dataset.cardType, routeTitle: '费用办理详情', refresh: function () {
      var r = records(collection).find(function (item) { return item.id === record.id; }); if (!r) return null;
      var done = collection === 'requests' ? r.status === 'approved' : r.status === 'approved';
      return { title: r.title || r.category || (r.type === 'utilities' ? '水电缴费' : '停车费用代缴'), status: done ? '已完成' : '待物业办理', meta: [r.id, r.company].join(' · '),
        fields: [['申请企业', r.company], ['申请说明', r.detail], ['车牌号', r.vehiclePlate], ['金额', money(r.amount)], ['办理说明', '只有物业核验实际到账、且金额与应收金额一致后，才能确认费用办理完成。未到账、部分到账或金额不符时不可确认；此操作不会发起付款或自动扣款。'], ['办理记录', (r.history || []).join(' → ')]].concat(receiptFields(r)),
        step: done ? null : { label: '确认到账并完成办理', input: '请填写到账流水、收款凭据编号或核验说明', inputLabel: '到账凭据或核验说明', receipt: true, run: function (reference, verified) { return workflows.completeFeeRequest(collection, r.id, { reference: reference, verified: verified }); } } };
    } });
  }
  function renderFees() {
    var node = pages[ids.fees];
    var content = centerShell(node, 'fees', feeTabs, [['lease', '租赁费用'], ['venue', '场地费用'], ['utilities', '水电缴费'], ['parking', '停车缴费'], ['dining', '订餐费用']]);
    function inCompany(item) { return !item.company || item.company === company; }
    // Each fee card: key facts, then 删除 / 详情 / 修改状态. Everything else happens in the detail page.
    function feeCard(kind, item, title, stage, status, pairs, alert) {
      var type = kind === 'parking-request' ? 'parking' : kind;
      var card = tagCard(panel(title, status), type, stage); content.append(card);
      if (alert) card.classList.add('fee-alert');
      infoGrid(card, pairs);
      var bar = cardBar(card), go = function () { openFeeDetail(kind, item.id); };
      bar.append(guardedButton(node, '详情', go), guardedButton(node, '修改状态', go, true));
      clickableCard(node, card, go);
      manageCard(node, bar, item, kind === 'lease' ? 'leases' : kind === 'venue' ? 'bookings' : 'bills', [], title);
      return card;
    }
    // 租赁费用: the contract lives in the back office; this list only flags who to call.
    records('leases').filter(function (item) { return !hiddenWorkorder('leases', item); }).sort(function (a, b) { return (leaseAlert(b) ? 1 : 0) - (leaseAlert(a) ? 1 : 0) || String(a.nextDue).localeCompare(String(b.nextDue)); }).forEach(function (item) {
      var alert = leaseAlert(item), stage = item.status === 'paid' ? 'paid' : (daysUntil(item.nextDue) < 0 ? 'overdue' : 'pending');
      var card = feeCard('lease', item, item.company + ' · ' + item.space, stage, item.status === 'paid' ? '已缴费' : alert || feeLabel('lease', item), [['本期租金', money(item.amount)], ['缴费日', item.nextDue], ['企业联系人', item.contact + ' ' + item.phone]], alert);
      card.dataset.leaseId = item.id;
    });
    // 场地费用: bookings priced per slot.
    local('bookings').filter(function (item) { return inCompany(item) && item.status !== '已取消' && !['pending', 'rejected'].includes(item.propertyStatus) && !hiddenWorkorder('bookings', item); }).forEach(function (item) {
      var card = feeCard('venue', item, item.room || '场地预定', item.feePaid ? 'paid' : 'pending', feeLabel('venue', item), [['预约企业', item.company], ['日期', item.date + ' ' + (item.times || []).join('、')], ['应收金额', money(bookingFee(item))]]);
      card.dataset.bookingId = item.id;
    });
    // 水电缴费 / 停车缴费 bills.
    records('bills').filter(function (item) { return !hiddenWorkorder('bills', item); }).forEach(function (item) {
      var kind = billType(item) === 'parking' ? 'parking' : 'utilities', stage = item.status === 'paid' ? 'paid' : (overdue(item) ? 'overdue' : 'pending');
      var card = feeCard(kind, item, item.title || '账单', stage, item.status === 'paid' ? '已缴费' : overdue(item) ? '已逾期' : feeLabel(kind, item), [['账单企业', item.company], ['金额', money(item.amount)], ['到期日', item.due]], stage !== 'paid');
      card.dataset.billId = item.id;
    });
    feeRequests().forEach(function (r) {
      var card = tagCard(panel(r.title || '水电缴费', workflows.requestState(r)), r.type, r.status === 'approved' ? 'paid' : 'pending');
      card.dataset.feeRequestId = r.id; content.append(card);
      infoGrid(card, [['申请企业', r.company], ['申请说明', r.detail], ['金额', money(r.amount)], ['申请编号', r.id], ['办理记录', (r.history || []).join(' → ')]]);
      completeFeeButton(node, cardBar(card), 'requests', r);
    });
    // Vehicle parking requests share the property offline handling stage.

    records('vehicleRequests').filter(function (r) { return r.company === company && r.type === 'parking' && !hiddenWorkorder('vehicleRequests', r); }).forEach(function (r) {
      var label = { enterprise_pending: '待企业审批', property_pending: '待物业审批', finance_pending: '待物业办理', approved: '已完成', rejected: '已驳回' }[r.status] || r.status;
      var stage = r.status === 'approved' ? 'paid' : (r.status === 'rejected' ? 'overdue' : 'pending');
      var card = tagCard(panel(r.category || '停车费用代缴', label), 'parking', stage); card.dataset.vehicleRequestId = r.id; content.append(card);
      infoGrid(card, [['申请企业', r.company], ['车牌号', r.vehiclePlate], ['金额', r.amount ? money(r.amount) : '']]);
      var bar = cardBar(card);
      if (['finance_pending', 'approved'].includes(r.status)) completeFeeButton(node, bar, 'vehicleRequests', r);
      manageCard(node, bar, r, 'vehicleRequests', [], r.category || '停车费用代缴');
    });
    // 订餐费用 cards come from miniprogram-service-journeys.js.
    if (window.__parkServiceJourneys && window.__parkServiceJourneys.renderFeeDining) window.__parkServiceJourneys.renderFeeDining(content, node);
    sortAlerts(content);
    applyFilter(node);
  }
  function renderFeedback() {
    var node = pages[ids.feedback];
    var content = centerShell(node, 'feedback', feedbackTabs, [['complaint', '投诉'], ['suggestion', '建议'], ['praise', '表扬']]);
    local('feedback').filter(function (item) { return item.owner === 'employee' && (!item.company || item.company === company) && !hiddenWorkorder('feedback', item); }).forEach(function (item) {
      var kind = feedbackCategory(item), type = kind === '投诉' ? 'complaint' : kind === '表扬' ? 'praise' : 'suggestion';
      var handled = ['awaiting_confirmation', 'completed'].includes(item.propertyStatus);
      var card = tagCard(panel(kind, feedbackState(item)), type, handled ? 'done' : 'pending'); card.dataset.feedbackId = item.id; content.append(card);
      infoGrid(card, (item.fields || []).concat([['处理结果', item.propertyResult], ['处理进度', (item.propertyHistory || []).join(' → ')], ['反馈编号', item.id]]));
      var bar = cardBar(card), feedbackId = item.id;
      actionEntry(node, bar, card, handled ? '' : '去处理', { type: type, routeTitle: '反馈详情', refresh: function () {
        var f = local('feedback').find(function (r) { return r.id === feedbackId; }); if (!f) return null;
        var fresh = !f.propertyStatus || f.propertyStatus === 'submitted';
        var step = fresh ? { label: '接单并分派', run: function () { return feedbackCommit(f, function (record) { record.propertyStatus = 'processing'; record.propertyHistory = (record.propertyHistory || []).concat(['物业人员接单并分派']); }); } }
          : f.propertyStatus === 'processing' ? { label: '提交处理结果', input: '填写处理措施与结果', inputLabel: '处理结果', run: function (text) { return feedbackCommit(f, function (record) { record.propertyStatus = 'awaiting_confirmation'; record.propertyResult = text; record.propertyHistory = (record.propertyHistory || []).concat(['物业人员提交处理结果：' + text]); }); } } : null;
        return { title: feedbackCategory(f), status: feedbackState(f), meta: f.id, fields: (f.fields || []).concat([['处理结果', f.propertyResult], ['处理进度', (f.propertyHistory || []).join(' → ')]]), step: step };
      } });
      manageCard(node, bar, item, 'feedback', [], kind);
    });
    applyFilter(node);
  }
  // ---- 今日待办: one cross-centre list of everything that needs attention, most urgent first ----
  function todoEntries() {
    var list = [];
    records('leases').forEach(function (item) {
      var alert = leaseAlert(item); if (!alert) return;
      var due = daysUntil(item.nextDue);
      list.push({ urgency: due < 0 ? -1000 + due : due, type: '租赁费用', title: item.company + ' · ' + item.space, status: alert, action: '联系企业缴纳租金', go: function () { open('fees'); } });
    });
    records('bills').filter(unpaid).forEach(function (item) {
      var due = item.due ? daysUntil(item.due) : 30;
      list.push({ urgency: due, type: billType(item) === 'parking' ? '停车缴费' : '水电缴费', title: item.title + ' · ' + item.company, status: billLabel(item), action: '联系企业缴费', go: function () { open('fees'); } });
    });
    local('bookings').forEach(function (item) {
      if (item.status === '已取消' || ['pending', 'rejected'].includes(item.propertyStatus) || item.feePaid) return;
      list.push({ urgency: 3, type: '场地费用', title: (item.room || '场地预定') + ' · ' + item.company, status: '待收费', action: '安排场地并收费', go: function () { open('fees'); } });
    });
    local('bookings').filter(function (item) { return item.status !== '已取消' && item.propertyStatus === 'pending'; }).forEach(function (item) { list.push({ urgency: 2, type: '场地预定', title: item.room, status: '待物业审批', action: '审批场地预定', go: function () { open('approvals'); } }); });
    records('repairs').filter(function (item) { return ['pending', 'processing'].includes(item.status); }).forEach(function (item) {
      list.push({ urgency: item.status === 'pending' ? 1 : 2, type: '物业报修', title: item.title, status: item.status === 'pending' ? '待接单' : '处理中', action: '处理报修', go: function () { open('workorders'); } });
    });
    records('requests').filter(function (item) { return ['renovation', 'meeting', 'utilities'].includes(item.type) && item.status === 'property'; }).forEach(function (item) {
      var reno = item.type === 'renovation' ? renovationParts(item) : null;
      list.push({ urgency: 2, type: { meeting: '场地预定', renovation: '装修申请', utilities: '水电缴费' }[item.type], title: item.room || item.title || (reno ? [reno.location, reno.description].filter(Boolean).join(' · ') : '') || String(item.detail || '').split(' · ')[0] || '申请', status: '待物业审批', action: '审核申请', go: function () { open('approvals'); } });
    });
    propertyReleases().filter(function (item) { return item.status === 'pending'; }).forEach(function (item) {
      list.push({ urgency: 2, type: '物品放行', title: item.items || '物品放行单', status: '待物业审批', action: '审批放行', go: function () { open('approvals'); } });
    });
    records('vehicleRequests').filter(function (item) { return item.status === 'property_pending'; }).forEach(function (item) {
      list.push({ urgency: 2, type: '车辆服务', title: item.category || '车辆事项', status: '待物业审批', action: '审核车辆事项', go: function () { open('approvals'); } });
    });
    feeRequests().filter(function (item) { return item.status === 'execution'; }).concat(records('vehicleRequests').filter(function (item) { return item.company === company && item.type === 'parking' && item.status === 'finance_pending' && !hiddenWorkorder('vehicleRequests', item); })).forEach(function (item) {
      list.push({ urgency: 2, type: '费用申请', title: item.title || item.category || '费用申请', status: '待物业办理', action: '核实费用并线下办理', go: function () { open('fees'); } });
    });
    records('monitorRequests').filter(function (item) { return item.status === 'property_pending'; }).forEach(function (item) {
      list.push({ urgency: 2, type: '监控调取', title: '监控调取 · ' + item.scope, status: '待物业审批', action: '审核监控调取', go: function () { open('approvals'); } });
    });
    local('feedback').filter(function (item) { return item.owner === 'employee' && !['awaiting_confirmation', 'completed'].includes(item.propertyStatus); }).forEach(function (item) {
      list.push({ urgency: 2, type: feedbackCategory(item), title: '反馈：' + feedbackCategory(item), status: feedbackState(item), action: '处理反馈', go: function () { open('feedback'); } });
    });
    return list.sort(function (a, b) { return a.urgency - b.urgency; });
  }
  function renderTodo() {
    var node = pages[ids.todo];
    node.replaceChildren(); node.classList.add('property-center');
    var content = el('div', undefined, 'property-approval-content'); node.append(content);
    var entries = todoEntries();
    if (!entries.length) { empty(content, '今天没有待办事项。'); return; }
    // Group the list so the most urgent work is read first instead of one flat feed.
    var groups = [['urgent', '已逾期 · 优先处理'], ['soon', '临近到期 · 3 天内'], ['approve', '待审批'], ['work', '待处理与跟进']];
    function groupOf(entry) {
      if (entry.urgency < 0) return 'urgent';
      if (/待.*审批/.test(entry.status)) return 'approve';
      // 临近到期 only covers money still owed (rent / bills), not site work waiting to be handled.
      if (entry.urgency <= 3 && /逾期|到期/.test(entry.status)) return 'soon';
      return 'work';
    }
    groups.forEach(function (group) {
      var items = entries.filter(function (entry) { return groupOf(entry) === group[0]; });
      if (!items.length) return;
      var head = el('h2', group[1] + '（' + items.length + '）', 'todo-group-title'); head.dataset.todoGroup = group[0]; content.append(head);
      items.forEach(renderEntry);
    });
    function renderEntry(entry) {
      var card = el('article', undefined, 'role-panel center-card'); card.dataset.todoType = entry.type;
      var row = el('div', undefined, 'role-row');
      row.append(el('span', entry.type, 'todo-type'), el('strong', entry.title), el('em', entry.status, 'role-status'));
      card.append(row, el('p', entry.action));
      if (entry.urgency < 0) card.classList.add('fee-alert'); else if (entry.urgency <= 3) card.classList.add('todo-soon');
      var bar = actions(card); bar.classList.add('approval-card-actions');
      bar.append(guardedButton(node, '去处理', entry.go, true));
      content.append(card);
    }
  }

  function renderMine() {
    var node = pages[ids.mine]; heading(node, '我的物品放行', '仅展示本人在本企业提交的放行申请。补件仍使用原 ID，审批通过后交现场查验。');
    actions(node).append(guardedButton(node, '申请物品放行', function () { openReleaseForm(); }, true));
    var rows = myReleases(); if (!rows.length) empty(node, '暂无您的物品放行申请。');
    rows.forEach(function (item) { var card = releaseCard(node, item); actions(card).append(guardedButton(node, '查看放行单', function () { openReleaseDetail(item.id, ids.mine); })); });
  }
  function renderReleaseForm() {
    var node = pages[ids.form], existing = editId && findRelease(editId);
    if (editId && (!existing || !own(existing) || existing.status !== 'supplement')) { heading(node, '物品放行申请', '该记录已变化或不属于当前身份，请返回列表。'); return; }
    var body = node; node.classList.toggle('journey-page-split', !!formReturn); node.toggleAttribute('data-dirty-guard', !!formReturn);
    if (formReturn && workflows.noticeLayout) body = workflows.noticeLayout(node, role() === 'employee' ? '请填写物品、放行地点和计划时间（北京时间），提交后由企业管理员审批，再由物业审批。' : '请填写物品、放行地点和计划时间（北京时间），提交后由物业审批。');
    else heading(node, existing ? '补充物品放行材料' : '申请物品放行', '计划时间为北京时间，请与门岗核对放行时段。' + (existing ? '补充后仍使用原放行编号。' : ''));
    var form = el('form', undefined, formReturn ? 'property-release-form role-panel' : 'property-release-form');
    var applicant = field(form, '申请人', 'applicantName', 'text', true), items = field(form, '物品与数量', 'items', 'textarea', true);
    var location = field(form, '放行地点', 'location', 'text', true);
    var start = field(form, '开始时间（北京时间） *', 'plannedAt', 'text', true), end = field(form, '结束时间（北京时间） *', 'plannedEndAt', 'text', true);
    var comment = field(form, '说明 / 补件材料说明', 'note', 'textarea', !!existing);
    if (existing) {
      applicant.value = existing.applicantName || ''; items.value = existing.items || ''; location.value = existing.location || ''; comment.value = existing.note || '';
      start.value = existing.plannedAt || '';
      // Older records may lack an end time; default to one hour after the start.
      var fallbackEnd = '';
      if (start.value && !existing.plannedEndAt) { var t = new Date(start.value); if (Number.isFinite(t.getTime())) { t.setHours(t.getHours() + 1); fallbackEnd = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0') + 'T' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); } }
      end.value = existing.plannedEndAt || fallbackEnd;
    }
    // Submit sits below the card as a full-width block; the form attribute keeps native submit/validation.
    form.id = 'property-release-form-fields';
    var message = feedback(form), valid = guard(node, existing, releases), submit = button('提交申请', null, true); submit.type = 'submit'; submit.setAttribute('form', form.id);
    var submitBar = el('div', undefined, 'role-actions journey-actions journey-block-actions'); submitBar.append(submit); body.append(form, submitBar);
    // Same 日期 / 时 / 分 wheel as 访客预约.
    if (window.__visitWheel && window.__visitWheel.range) {
      window.__visitWheel.range(start, end, { status: message, startHint: '请选择未来时间' });
      if (window.lucide) window.lucide.createIcons();
    }
    form.onsubmit = function (event) { event.preventDefault();
      if (!valid()) { message.textContent = '身份、页面或记录状态已变化，请重新打开后操作。'; return; }
      var startValue = start.value, endValue = end.value;
      if (![applicant, items, location].every(function (input) { return input.value.trim(); }) || !startValue || !endValue || existing && !comment.value.trim()) { message.textContent = '请填写申请人、物品、地点、开始/结束时间及必要的补件说明。'; return; }
      if (endValue <= startValue) { message.textContent = '结束时间须晚于开始时间。'; return; }
      if (!form.reportValidity() || !Number.isFinite(Date.parse(startValue + ':00+08:00'))) return;
      var nextId = existing ? existing.id : 'FX-' + (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
      if (save(valid, function () { return enterprise() && (!existing || own(existing) && existing.status === 'supplement'); }, function () {
        var item = existing || { id: nextId, owner: role(), company: company, createdAt: new Date().toISOString(), inspectionStatus: 'pending', history: [] };
        Object.assign(item, { applicantName: applicant.value.trim(), items: items.value.trim(), location: location.value.trim(), plannedAt: startValue, plannedEndAt: endValue, note: comment.value.trim() });
        // Employees start at the enterprise stage; a supplement goes back to whoever asked for it.
        var backToEnterprise = existing ? existing.enterpriseStatus === 'supplement' : role() === 'employee';
        item.status = backToEnterprise ? 'enterprise_pending' : 'pending';
        if (!existing) item.enterpriseStatus = role() === 'employee' ? 'pending' : 'not_required'; else if (backToEnterprise) item.enterpriseStatus = 'pending';
        appendHistory(item, applicant.value.trim() + (existing ? '补充材料，重新提交' + (backToEnterprise ? '企业审批' : '物业审批') : '提交物品放行申请'));
        if (!existing) releases().unshift(item);
      }, message, true)) { if (formReturn) { var target = formReturn; formReturn = null; window.__showMiniPage(target); if (window.__miniToast) window.__miniToast('提交成功，可在「我的」中查看记录'); } else openReleaseDetail(nextId, ids.mine); }
    };
  }
  function renderReleaseDetail() {
    var node = pages[ids.detail], item = findRelease(detailId);
    if (!item || !(property() && reachedProperty(item) || own(item))) return deny();
    // Same layout as 报修详情: white page, status banner, info card, then the next step.
    node.replaceChildren(); node.classList.add('request-detail-view');
    var closed = ['rejected', 'withdrawn'].includes(item.status) || ['passed', 'failed'].includes(item.inspectionStatus);
    var banner = el('div', undefined, 'request-detail-banner is-reviewer' + (closed ? ' is-closed' : '')), head = el('div', undefined, 'request-detail-banner-head');
    head.append(el('strong', item.items || '物品放行单'), el('em', releaseStatus(item), 'request-detail-status'));
    banner.append(head, el('span', [item.id, item.company, item.applicantName].filter(Boolean).join(' · '))); node.append(banner);
    var dl = el('dl', undefined, 'request-detail-fields');
    [['放行物品', item.items], ['放行地点', item.location], ['计划时间', plannedTimeText(item)], ['申请说明', item.note || '无'], ['审批说明', item.reviewNote], ['本地查验结果', item.inspectionNote], ['查验人', item.inspectedBy], ['查验时间', item.inspectedAt ? String(item.inspectedAt).replace('T', ' ').slice(0, 16) : ''], ['处理进度', (item.history || []).map(function (line) { return String(line).replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z · /, ''); }).join(' → ')]]
      .forEach(function (pair) { if (!pair[1]) return; dl.append(el('dt', pair[0]), el('dd', String(pair[1]))); });
    node.append(dl);
    var note = feedback(node), box = el('div', undefined, 'request-detail-actions');
    function textarea(label, name, placeholder) { var input = el('textarea'); input.name = name; input.placeholder = placeholder; input.setAttribute('aria-label', label); input.maxLength = 2000; box.append(input); return input; }
    if (own(item) && item.status === 'supplement') actions(box).append(guardedButton(node, '补充材料', function () { openReleaseForm(item); }, true));
    if (property()) {
      var valid = guard(node, item, releases);
      if (detailParent === ids.approvals && item.status === 'pending') {
        var review = textarea('审批说明', 'reviewNote', '审批说明（补件或驳回必填）'), bar = actions(box);
        [['rejected', '驳回申请'], ['supplement', '要求补件'], ['approved', '审批通过']].forEach(function (pair) { bar.append(button(pair[1], function () {
          if (!valid()) { note.textContent = '身份、页面或申请状态已变化，请重新打开后操作。'; return; }
          if (pair[0] !== 'approved' && !review.value.trim()) { note.textContent = '请填写补件要求或驳回原因。'; review.focus(); return; }
          if (save(valid, function () { return property() && item.status === 'pending'; }, function () {
            item.status = pair[0]; item.reviewNote = review.value.trim(); item.reviewedBy = actorName(); item.reviewedAt = new Date().toISOString();
            appendHistory(item, actorName() + '：' + pair[1] + (item.reviewNote ? ' · ' + item.reviewNote : ''));
          }, note)) openReleaseDetail(item.id, detailParent);
        }, pair[0] === 'approved')); });
      }
      if (detailParent === ids.workorders && item.status === 'approved' && !item.inspectedAt && !['passed', 'failed'].includes(item.inspectionStatus)) {
        var result = textarea('现场查验结果', 'inspectionNote', '现场查验结果（核对人员、物品与数量）'), controls = actions(box);
        [['failed', '查验不通过'], ['passed', '查验通过']].forEach(function (pair) { controls.append(button(pair[1], function () {
          if (!valid()) { note.textContent = '身份、页面或放行状态已变化，请重新打开后操作。'; return; }
          if (!result.value.trim()) { note.textContent = '请填写现场查验结果，不能直接确认放行。'; result.focus(); return; }
          if (save(valid, function () { return property() && item.status === 'approved' && !item.inspectedAt && !['passed', 'failed'].includes(item.inspectionStatus); }, function () {
            item.inspectionStatus = pair[0]; item.inspectionNote = result.value.trim(); item.inspectedAt = new Date().toISOString(); item.inspectedBy = actorName();
            appendHistory(item, actorName() + '：' + pair[1] + ' · ' + item.inspectionNote);
          }, note)) openReleaseDetail(item.id, ids.workorders);
        }, pair[0] === 'passed')); });
      }
    }
    if (box.children.length) node.append(box);
  }
  function openMyReleases() { return open('mine'); }
  function openReleaseForm(existing) {
    if (!enterprise()) return deny();
    if (existing && (!releases().includes(existing) || !own(existing) || existing.status !== 'supplement')) return deny();
    editId = existing ? existing.id : null; formReturn = null; window.__setMiniRoute(ids.form, '物品放行申请', ids.mine); return open('form');
  }
  // Home entry: a single submit page that returns to the opener; records stay under 我的.
  function openReleaseFromHome(parent) {
    if (!enterprise()) return deny();
    editId = null; formReturn = parent || 'home'; window.__setMiniRoute(ids.form, '物品放行', formReturn); return open('form');
  }
  function openReleaseDetail(id, parent) {
    var item = findRelease(id); if (!item || !(property() || own(item))) return deny();
    detailId = id; detailParent = property() ? (parent === ids.workorders ? ids.workorders : ids.approvals) : ids.mine;
    window.__setMiniRoute(ids.detail, '放行单详情', detailParent); return open('detail');
  }
  // Property staff also see 我的服务; entries are not available for this identity and explain why on tap.
  function ownServicesCard() {
    var card = profile.querySelector('[data-property-own-services]');
    if (!card) {
      card = el('article', undefined, 'mp-card mp-section-card mp-my-services property-own-services'); card.dataset.propertyOwnServices = 'true';
      card.append(el('h2', '我的服务', 'role-section-title'), el('div', undefined, 'mp-service-grid mp-four-col'));
      var workbench = profile.querySelector('.mp-my-services.property-workbench'); (workbench || profile.querySelector('.mp-my-services')).after(card);
    }
    return card;
  }
  function renderOwnServices() {
    var card = profile.querySelector('[data-property-own-services]');
    if (!property()) { if (card) card.hidden = true; return; }
    card = ownServicesCard(); card.hidden = false;
    var grid = card.querySelector('.mp-service-grid'); grid.replaceChildren();
    // 我的账单 is available (property staff order meals); the other three explain why they are unavailable.
    [['我的申请', 'file-text'], ['我的预约', 'calendar-check'], ['我的工单', 'clipboard-list'], ['我的账单', 'receipt', 'orders']].forEach(function (item) {
      var available = !!item[2] && window.__myServices;
      var entry = button('', function () {
        if (available) return window.__myServices.open(item[2]);
        if (window.__roleWorkflows && window.__roleWorkflows.showPermission) window.__roleWorkflows.showPermission('「' + item[0] + '」面向企业员工和企业管理员', '物业人员的审批、报修、费用、园区、专项服务和反馈请在上方「物业工作台」处理。'); else deny();
      });
      entry.className = 'mp-service-item' + (available ? '' : ' is-unavailable'); entry.dataset.profileEntry = item[0]; if (!available) entry.setAttribute('aria-disabled', 'true');
      var box = el('span', undefined, 'mp-icon-box'), icon = el('i'); icon.dataset.lucide = item[1]; icon.setAttribute('aria-hidden', 'true'); box.append(icon);
      entry.append(box, el('div', item[0], 'mp-service-title')); grid.append(entry);
    });
    if (window.lucide) window.lucide.createIcons();
  }
  function renderProfile() {
    renderOwnServices();
    if (!property()) return;
    var menu = profile.querySelector('.mp-my-services'), grid = menu.querySelector('.mp-service-grid'), todos = profile.querySelector('[data-profile-todos]');
    menu.hidden = false; menu.classList.add('property-workbench'); menu.querySelector('.role-section-title').textContent = '物业工作台'; todos.hidden = true;
    todos.querySelector('.mp-todo-grid').replaceChildren(); grid.replaceChildren();
    var journeyData = window.__parkServiceJourneys && window.__parkServiceJourneys.data ? window.__parkServiceJourneys.data() : {};
    var external = window.__serviceJourneys && window.__serviceJourneys.getRecords ? window.__serviceJourneys.getRecords('specialTickets', 'property', company) || [] : [];
    var seenSpecial = {}, specialRows = records('specialTickets').concat(journeyData.specialTickets || [], external).filter(function (item) { if (!item || seenSpecial[item.id]) return false; seenSpecial[item.id] = true; return true; });
    var pendingSpecial = specialRows.filter(function (item) { return (!item.company || item.company === company) && stageOf(item.status) === 'pending'; }).length;
    var pendingApprovals = local('bookings').filter(function (item) { return item.status !== '已取消' && item.propertyStatus === 'pending'; }).length + records('requests').filter(function (item) { return ['renovation', 'meeting', 'utilities'].includes(item.type) && item.status === 'property'; }).length + releases().filter(function (item) { return item.status === 'pending'; }).length + records('vehicleRequests').filter(function (item) { return item.type !== 'parking' && item.status === 'property_pending'; }).length + records('monitorRequests').filter(function (item) { return item.status === 'property_pending'; }).length + records('visitors').concat(local('visitors')).filter(function (item) { return (!item.company || item.company === company) && !item.cancelled && visitorStage(item) === 'pending'; }).length;
    var pendingWorkorders = records('repairs').filter(function (item) { return ['pending', 'processing'].includes(item.status); }).length + pendingSpecial + releases().filter(function (item) { return item.status === 'approved' && !item.inspectedAt; }).length + records('visitors').filter(function (item) { return (!item.company || item.company === company) && !item.cancelled && !['checked', 'passed'].includes(item.inspectionStatus); }).length + local('visitors').filter(function (item) { return (!item.company || item.company === company) && item.cancelled !== true && !hiddenWorkorder('localVisitors', item); }).length;
    var pendingFees = feeRequests().filter(function (r) { return r.status === 'execution'; }).length + records('vehicleRequests').filter(function (r) { return r.company === company && r.type === 'parking' && r.status === 'finance_pending' && !hiddenWorkorder('vehicleRequests', r); }).length + records('bills').filter(unpaid).length + records('leases').filter(function (item) { return !!leaseAlert(item); }).length + local('bookings').filter(function (item) { return (!item.company || item.company === company) && item.status !== '已取消' && !['pending', 'rejected'].includes(item.propertyStatus) && !item.feePaid; }).length;
    var pendingFeedback = local('feedback').filter(function (item) { return item.owner === 'employee' && (!item.company || item.company === company) && !['awaiting_confirmation', 'completed'].includes(item.propertyStatus); }).length;
    var counts = [pendingApprovals, pendingWorkorders, pendingFees, pendingFeedback];
    // 今日待办 banner: one tap to the cross-centre list, with the overdue count called out.
    var overdueCount = todoEntries().filter(function (entry) { return entry.urgency < 0; }).length;
    var total = counts.reduce(function (sum, value) { return sum + value; }, 0);
    var todo = button('', function () { if (property()) open('todo'); else deny(); });
    todo.className = 'property-todo-bar'; todo.dataset.profileEntry = '今日待办';
    var copy = el('span', undefined, 'property-todo-copy');
    copy.append(el('strong', '今日待办 ' + total + ' 项'));
    if (overdueCount) copy.append(el('span', overdueCount + ' 项逾期', 'property-todo-note'));
    var todoArrow = el('i'); todoArrow.dataset.lucide = 'chevron-right'; todoArrow.setAttribute('aria-hidden', 'true');
    todo.append(copy, todoArrow);
    Object.keys(centers).forEach(function (key, index) {
      var node = button('', function () { if (property()) open(key); else deny(); }); node.className = 'property-workbench-card'; node.dataset.profileEntry = centers[key];
      var head = el('span', undefined, 'property-workbench-head'), box = el('span', undefined, 'mp-icon-box'), symbol = el('i'); symbol.dataset.lucide = ['clipboard-check', 'wrench', 'receipt', 'message-square'][index]; symbol.setAttribute('aria-hidden', 'true'); box.append(symbol); head.append(box, el('strong', centers[key]));
      var summary = el('span', undefined, 'property-workbench-summary'); summary.append(el('b', String(counts[index]), counts[index] ? 'property-count' : 'property-count property-count-empty'), el('span', ['项待审批', '项待处理', '项待缴费', '条未处理'][index]));
      var arrow = el('i'); arrow.dataset.lucide = 'chevron-right'; arrow.setAttribute('aria-hidden', 'true'); head.append(arrow); node.append(head, summary); grid.append(node);
    });
    grid.append(todo);
    if (window.lucide) window.lucide.createIcons();
  }
  var renderers = {};
  renderers[repairDetail.id] = function () { if (repairView) renderRepairDetail(repairView); };
  renderers[actionDetail.id] = renderActionDetail;
  renderers[domainDetail.id] = function () { if (!domainView || domainView.kind === 'venue') return; var list = records(domainView.kind === 'vehicle' ? 'vehicleRequests' : 'monitorRequests'), r = list.find(function (item) { return item.id === domainView.id; }); if (r) openDomainDetailContent(domainView.kind, r); };
  renderers[ids.approvals] = renderApprovals; renderers[ids.workorders] = renderWorkorders; renderers[ids.fees] = renderFees; renderers[ids.feedback] = renderFeedback; renderers[ids.todo] = renderTodo; renderers[cardDetail.id] = renderCardDetail; renderers[feeDetail.id] = renderFeeDetail;
  renderers[ids.mine] = renderMine; renderers[ids.form] = renderReleaseForm; renderers[ids.detail] = renderReleaseDetail;
  Object.keys(retired).forEach(function (id) { renderers[id] = function () { window.__showMiniPage(ids[retired[id]]); }; });
  // Old centre keys (bills, repairs, park, special, services) still work as aliases.
  var keyAliases = { bills: 'fees', repairs: 'workorders', park: 'workorders', special: 'workorders', services: 'workorders' };
  function open(center) { var id = ids[keyAliases[center] || center] || center; if (!pages[id]) return false; return window.__showMiniPage(id); }
  var originalShow = window.__showMiniPage, originalCan = window.__canMiniPage;
  window.__canMiniPage = function (id) { return pages[id] ? allowed(id) : originalCan(id); };
  window.__showMiniPage = function (id) {
    if (pages[id] && !allowed(id)) { originalShow('role-denied'); return false; }
    epoch += 1;
    if (pages[id]) { nativeContext = null; renderers[id](); if (property()) window.dispatchEvent(new Event('property-workbench-open')); }
    return originalShow(id);
  };
  document.addEventListener('click', function (event) {
    var releaseEntry = event.target.closest('[data-park-unavailable="物品放行"]');
    if (releaseEntry) { event.preventDefault(); event.stopImmediatePropagation(); if (enterprise()) openReleaseForm(); else if (property()) open('approvals'); else deny(); return; }
    if (!event.target.closest('.nav-back')) return;
    var current = active(); if (!current) return;
    var parent = current.id === ids.detail ? detailParent : current.id === ids.form ? formReturn || ids.mine : current.id === domainDetail.id ? ids.approvals : current.id === repairDetail.id ? ids.workorders : current.id === cardDetail.id ? (cardView && cardView.parent) || ids.workorders : current.id === feeDetail.id ? ids.fees : pages[current.id] ? 'profile' : null;
    if (nativeContext === 'approvals' && current.id === 'role-request-detail') parent = ids.approvals;
        if (parent) { event.preventDefault(); event.stopImmediatePropagation(); window.__showMiniPage(parent); }
  }, true);
  // Native navigation also has closure-bound show(); observe it to reject stale or unauthorized pages.
  new MutationObserver(function () {
    var stale = false;
    Object.keys(pages).forEach(function (id) { if (!pages[id].classList.contains('hidden') && !allowed(id)) { pages[id].classList.add('hidden'); stale = true; } });
    if (stale) originalShow('role-denied');
    var current = active(); if (current && ['home', 'profile', 'messages', 'spaces', 'enterprise-services'].includes(current.id)) nativeContext = null;
  }).observe(screen, { subtree: true, attributes: true, attributeFilter: ['class'] });
  new MutationObserver(function () {
    epoch += 1; detailId = null; editId = null; formReturn = null; nativeContext = null;
    Object.keys(pages).forEach(function (id) { pages[id].replaceChildren(); if (!pages[id].classList.contains('hidden')) { pages[id].classList.add('hidden'); originalShow('profile'); } });
    if (property()) renderProfile(); else renderOwnServices();
  }).observe(profile, { attributes: true, attributeFilter: ['data-role'] });
  window.addEventListener('property-workflow-change', renderProfile);
  window.__propertyWorkbench = { renderProfile: renderProfile, open: open, todo: todoEntries, openFeeDetail: openFeeDetail, myReleases: myReleases, openMyReleases: openMyReleases, openReleaseForm: openReleaseForm, openReleaseFromHome: openReleaseFromHome, openReleaseDetail: openReleaseDetail, openActionDetail: openActionDetail };
  renderProfile();
})();
