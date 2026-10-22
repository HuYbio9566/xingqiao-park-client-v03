/* Employee record categories reuse existing workflows and local demo journey state. */
(function () {
  'use strict';
  var workflows = window.__roleWorkflows, store = window.MiniStore;
  if (!workflows || !store) return;
  var profile = document.getElementById('profile'), screen = document.querySelector('.screen');
  var company = '北京星桥科技';
  var groups = {
    applications: { title: '我的申请', copy: '场地预定、装修、车辆、放行、监控调取等需企业或物业审批的申请进度', filters: [['pending', '待审批'], ['approved', '已通过'], ['rejected', '已驳回']], types: [['meeting', '场地预定'], ['renovation', '装修申请'], ['vehicle', '车辆服务'], ['release', '物品放行'], ['monitor', '监控调取'], ['utilities', '水电缴费']] },
    reservations: { title: '我的预约', copy: '访客来访、活动报名，不含需审批的场地预定', filters: [['upcoming', '未开始'], ['expired', '已过期']], types: [['visitors', '访客预约'], ['activities', '园区活动']] },
    'work-orders': { title: '我的工单', copy: '物业报修、专项服务、意见反馈及结果确认', filters: [['pending', '待处理'], ['confirm', '待确认'], ['done', '已完成']], types: [['repairs', '物业报修'], ['special', '专项服务'], ['feedback', '意见反馈']] },
    orders: { title: '我的账单', copy: '产生费用的订餐、车辆、场地及水电账单与凭证', filters: [['pending', '待缴费'], ['overdue', '已逾期'], ['paid', '已缴费']], types: [['dining', '订餐服务'], ['parking', '车辆服务'], ['venue', '场地预定'], ['utilities', '水电缴费']] }
  };
  var pages = {}, filters = {}, subFilters = {}, context = null, feedbackOwner = null;
  // Two-level pages open on their first status tab; the rest keep the leading 全部 tab.
  var defaultFilters = { orders: 'pending', reservations: 'upcoming', 'work-orders': 'pending', applications: 'pending' };
  function resetFilter(kind) { filters[kind] = defaultFilters[kind] || 'all'; subFilters[kind] = 'all'; }
  function role() { return profile.dataset.role || 'guest'; }
  function employee() { return role() === 'employee' || role() === 'admin'; }
  function canKind(kind) { return employee() || kind === 'orders' && role() === 'property'; }
  function journeyApi() { return window.__serviceJourneys || null; }
  function journeyRecords(name) {
    var api = journeyApi(), rows = api && api.getRecords ? api.getRecords(name, role(), company) : [];
    if (workflows.myRecords) rows = rows.concat((workflows.myRecords()[name] || []).filter(function (item) { return !rows.some(function (row) { return row.id === item.id; }); }));
    return rows.filter(function (record) { return record.owner === role() && (!record.company || record.company === company); });
  }
  function ownReleases() { var data = workflows.propertyData ? workflows.propertyData() : {}; return (data.releaseRequests || []).filter(function (record) { return record.owner === role() && (!record.company || record.company === company); }); }
  function visitorRecords() {
    var records = workflows.myRecords().visitors.slice();
    store.data.visitors.filter(function (record) {
      return record.owner === role() && (!record.company || record.company === company);
    }).forEach(function (record) { if (!records.some(function (item) { return item.id === record.id; })) records.push(record); });
    return records;
  }
  function node(tag, text, className) {
    var item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  }
  function button(text, handler, primary) {
    var item = node('button', text, primary ? 'role-primary' : '');
    item.type = 'button'; item.onclick = handler; return item;
  }
  function page(id, title) {
    var item = node('section', undefined, 'hidden my-services-page'); item.id = id;
    screen.appendChild(item); window.__setMiniRoute(id, title, 'profile'); return item;
  }
  Object.keys(groups).forEach(function (kind) { pages[kind] = page('my-' + kind, groups[kind].title); resetFilter(kind); });
  var detail = page('my-service-detail', '记录详情');
  function active() { return screen.querySelector('section:not(.hidden)'); }
  function ownFeedback() { return store.data.feedback.filter(function (record) { return record.owner === role() && (!record.company || record.company === '北京星桥科技'); }); }
  function feedbackStatus(record) { return ({ submitted: '待分派', processing: '处理中', awaiting_confirmation: '待反馈确认', completed: '已完成' }[record.propertyStatus] || '待分派'); }
  function feedbackCommit(record, change) {
    if (!ownFeedback().includes(record)) return false;
    var before = JSON.stringify(store.data.feedback);
    change(record);
    if (store.save()) { window.dispatchEvent(new Event('mini-records-change')); return true; }
    try { store.data.feedback.splice(0, store.data.feedback.length, ...JSON.parse(before)); } catch (error) {}
    return false;
  }
  function bookingRecords() { return store.data.bookings.filter(function (record) { return record.owner === role() && record.company === '北京星桥科技'; }); }
  function guard(handler, kind) { return function () { if (canKind(kind || context)) handler(); else window.__showMiniPage('role-denied'); }; }
  // Card 删除 hides the record from 我的服务 lists on this device; source records are untouched.
  var hiddenKey = 'v4:my-services-hidden-v1', hiddenRows = [];
  try { hiddenRows = JSON.parse(localStorage.getItem(hiddenKey) || '[]'); } catch (error) {}
  function isHidden(type, record) { return !!record && hiddenRows.includes(type + ':' + record.id); }
  function deleteButton(type, title, done) {
    return button('删除', guard(function () {
      var run = function () { var next = hiddenRows.concat([type + ':' + done.id]); try { localStorage.setItem(hiddenKey, JSON.stringify(next)); hiddenRows = next; } catch (error) { return; } done.after(); };
      if (window.__miniConfirm) window.__miniConfirm({ title: '确定删除这条记录吗？', message: '删除「' + title + '」后，记录将从列表中移除且无法恢复，请谨慎操作。', confirmText: '删除', danger: true, onConfirm: run });
      else if (window.confirm('确定删除这条记录吗？删除后无法恢复。')) run();
    }));
  }
  // Card buttons: 删除 → 详情 (plain) → other actions → main action (solid, rightmost).
  function cardOrder(actionsList, remove, view) {
    if (actionsList.length) actionsList[actionsList.length - 1].classList.add('is-solid');
    return (remove ? [remove] : []).concat([view], actionsList);
  }
  // Detail header, same as 工作台 detail: title + status tag on top, type · number below; fields drop what the header shows.
  var headerFields = ['场地', '访客', '活动', '预约编号', '记录编号', '报名编号', '申请标题', '申请类型', '申请编号', '放行编号', '工单编号', '反馈编号', '订单编号', '报修事项', '物品', '反馈事项', '服务事项', '调取事项', '订单'];
  function detailBanner(open, title, status, typeText, id) {
    var banner = node('div', undefined, 'my-order-banner is-headed' + (open ? '' : ' is-closed')), head = node('div', undefined, 'request-detail-banner-head');
    head.append(node('strong', title), node('em', status, 'request-detail-status'));
    banner.append(head, node('span', [typeText, id].filter(Boolean).join(' · ')));
    return banner;
  }
  function bodyFields(fields) { return fields.filter(function (pair) { return headerFields.indexOf(pair[0]) < 0; }); }
  function empty(container, text) { container.appendChild(node('p', text, 'my-services-empty')); }
  function bookingState(record) {
    if (['已取消', '预约失败', '无权限查看'].includes(record.status)) return record.status;
    if (record.propertyStatus === 'pending') return '待物业审批';
    if (record.propertyStatus === 'rejected') return '已驳回';
    var times = record.times.map(function (time) { return time.split(/[–—-]/).map(function (part) { return Date.parse(record.date + 'T' + part.trim() + ':00+08:00'); }); });
    if (times.some(function (slot) { return Date.now() >= slot[0] && Date.now() < slot[1]; })) return '进行中';
    return times.every(function (slot) { return Date.now() >= slot[1]; }) ? '已完成' : '未开始';
  }
  // Demo-only reservations: shown when the user has none of that type; changes stay in memory and are never saved.
  function shanghaiDate(offset) { return new Date(Date.now() + 8 * 3600000 + offset * 86400000).toISOString().slice(0, 10); }
  var demo = {
    booking: [
      { id: 'MR-101', sample: true, room: '榫卯会议室', meta: 'A座 2F · 8人 · 小会议室', price: 80, date: shanghaiDate(3), times: ['09:00–10:00', '10:00–11:00'], name: '王晓明', phone: '138****0000', purpose: '团队周例会' },
      { id: 'MR-102', sample: true, room: '远山路演厅', meta: 'A座 1F · 24人 · 路演厅', price: 180, date: shanghaiDate(7), times: ['15:00–16:00'], name: '王晓明', phone: '138****0000', purpose: '新品发布彩排', status: '已取消' },
      { id: 'MR-103', sample: true, room: '云杉会议室', meta: 'C座 3F · 12人 · 中会议室', price: 120, date: shanghaiDate(-5), times: ['14:00–15:00'], name: '王晓明', phone: '138****0000', purpose: '客户方案评审' }
    ],
    visitor: [
      { id: 'V-201', sample: true, name: '张先生', phone: '139****1234', detail: 'A座605 · ' + shanghaiDate(1) + ' 14:00 至 ' + shanghaiDate(1) + ' 16:00 · 商务洽谈', cancelled: false },
      { id: 'V-202', sample: true, name: '李女士', phone: '137****5678', detail: 'A座605 · ' + shanghaiDate(-2) + ' 10:00 至 ' + shanghaiDate(-2) + ' 11:30 · 项目交流', cancelled: false, arrived: true },
      { id: 'V-203', sample: true, name: '陈经理', phone: '136****9012', detail: 'A座605 · ' + shanghaiDate(4) + ' 09:30 至 ' + shanghaiDate(4) + ' 10:30 · 合同签署', cancelled: true }
    ],
    activity: [
      { id: 'ACT-301', sample: true, activityTitle: '中小企业数字化转型分享会', activityDate: shanghaiDate(5) + ' 14:00', place: 'A座 1F 路演厅', name: '王晓明', phone: '138****0000', attendees: 2, note: '希望交流流程梳理经验', status: '已报名' },
      { id: 'ACT-302', sample: true, activityTitle: '科创企业投融资对接会', activityDate: shanghaiDate(9) + ' 09:30', place: 'C座 2F 多功能厅', name: '王晓明', phone: '138****0000', attendees: 1, note: '', status: '已取消' },
      { id: 'ACT-303', sample: true, activityTitle: '园区秋季健康讲座', activityDate: shanghaiDate(-3) + ' 15:00', place: 'B座 1F 活动室', name: '王晓明', phone: '138****0000', attendees: 3, note: '', status: '已参加' }
    ]
  };
  var kinds = { booking: ['场地预定', '预约', '预约详情'], visitor: ['访客来访', '来访', '来访详情'], activity: ['活动报名', '报名', '报名详情'] };
  var adminReservations = {};
  function reservationRows(type) {
    var own = type === 'booking' ? bookingRecords() : type === 'activity' ? journeyRecords('activityRegistrations') : visitorRecords();
    if (own.length) return own;
    if (role() !== 'admin') return demo[type];
    if (!adminReservations[type]) adminReservations[type] = demo[type].map(function (record) { return Object.assign({}, record, { owner: 'admin', company: company }, record.name === '王晓明' ? { name: '唐慧丽' } : {}); });
    return adminReservations[type];
  }
  // Visitors and activities go straight to property review (no enterprise step); its result is the card status.
  function reviewState(record) { return record.reviewStatus === 'approved' ? '已通过' : record.reviewStatus === 'rejected' ? '已驳回' : ''; }
  function activityState(record) {
    var status = String(record.status || '').replace(/\s*·\s*本地演示$/, '');
    if (/已取消/.test(status)) return '已取消';
    if (/签到|核销|已参加/.test(status)) return '已参加';
    return reviewState(record) || (record.sample ? status || '已报名' : '待物业审批');
  }
  function visitorState(record) {
    if (record.cancelled) return '已取消';
    if (record.sample) return record.arrived ? '已到访' : '待到访';
    return reviewState(record) || '待物业审批';
  }
  function reservationState(type, record) { return type === 'booking' ? bookingState(record) : type === 'activity' ? activityState(record) : visitorState(record); }
  function reservationOpen(type, record) {
    var state = reservationState(type, record);
    return type === 'booking' ? ['未开始', '进行中'].includes(state) : !/已取消|已到访|已离园|已完成|已参加|已驳回/.test(state);
  }
  function bookingStarted(record) { return record.times.some(function (time) { return Date.parse(record.date + 'T' + time.slice(0, 5) + ':00+08:00') <= Date.now(); }); }
  function reservationTitle(type, record) {
    if (type === 'activity') return record.activityTitle || record.activity || '园区活动';
    return type === 'booking' ? record.room : record.name || store.displayText(record, record.title) || '访客来访';
  }
  // Card body = optional one-line summary + label/value grid (same layout as renovation cards).
  function reservationInfo(type, record) {
    if (type === 'activity') return { summary: record.note, pairs: [['活动时间', record.activityDate], ['活动地点', record.place], ['报名人', record.name || '未填写'], ['参加人数', (record.attendees || 1) + '人'], ['报名编号', record.id]] };
    // meta is '位置 · 人数 · 类型'.
    if (type === 'booking') { var meta = String(record.meta || '').split(' · '); return { summary: record.purpose, pairs: [['预约时间', record.date + ' ' + record.times.join('、')], ['场地位置', meta[0]], ['容纳人数', meta[1]], ['场地类型', meta[2]], ['预约编号', record.id]] }; }
    if (record.fields) return { pairs: record.fields.map(function (field) { return [field[0], store.displayText(record, field[1])]; }) };
    var parts = (record.detail || '').split(' · ');
    return { summary: parts.slice(2).join('，'), pairs: [['到访地点', parts[0]], ['来访时间', parts[1]], ['访客手机', record.phone], ['记录编号', record.id]] };
  }
  function infoBody(body, info) {
    if (info.summary) body.appendChild(node('p', info.summary));
    var grid = node('dl', undefined, 'my-order-grid');
    info.pairs.forEach(function (pair) { if (pair[1] === undefined || pair[1] === null || pair[1] === '') return; grid.append(node('dt', pair[0]), node('dd', String(pair[1]))); });
    if (grid.children.length) body.appendChild(grid);
  }
  // Real visitors live in the role workflow state unless they came from the home visitor form (MiniStore).
  function reservationList(type, record) {
    if (record.sample) return demo[type];
    if (type === 'activity') return journeyApi().state().activityRegistrations;
    if (type === 'visitor' && !store.data.visitors.includes(record)) return workflows.propertyData().visitors;
    return store.data[type === 'booking' ? 'bookings' : 'visitors'];
  }
  function saveReservation(type, record, change) {
    if (!employee()) return false;
    if (record.sample) { change(record); return true; }
    if (type === 'activity') return !!journeyApi() && journeyApi().update('activityRegistrations', record.id, change);
    if (type === 'visitor' && !store.data.visitors.includes(record)) return workflows.enterpriseCommit(function () { change(record); });
    if (type === 'booking' && !workflows.canManageBooking(record)) return false;
    if (!store.isCurrent()) return false;
    var list = reservationList(type, record), before = Object.assign({}, record), listBefore = list.slice();
    change(record);
    if (store.save()) return true;
    Object.keys(record).forEach(function (key) { delete record[key]; }); Object.assign(record, before); list.splice.apply(list, [0, list.length].concat(listBefore));
    return false;
  }
  function reservationButtons(type, record, note, onDetail, owner) {
    owner = owner || (type === 'booking' ? 'applications' : 'reservations');
    var noun = kinds[type][1], failed = '保存失败，请刷新页面后重试。', items = [];
    function after(ok, next) { if (!ok) { note.textContent = failed; return; } next(); }
    if (reservationOpen(type, record)) {
      items.push(button('取消' + noun, guard(function () {
        if (!window.confirm('确认取消这条' + kinds[type][0] + '？取消后不可恢复。')) return;
        after(saveReservation(type, record, function (item) {
          if (type === 'booking') { item.approvalConsumed = !!item.approvalConsumed || bookingStarted(item); item.status = '已取消'; } else if (type === 'activity') item.status = '已取消'; else item.cancelled = true;
        }), function () { if (onDetail) showReservation(type, record, false, owner); else render(owner); });
      })));
      items.push(button('修改', guard(function () { showReservation(type, record, true, owner); })));
    } else if (onDetail) {
      var removeReservation = button('删除记录', guard(function () {
        if (!window.confirm('确认删除这条记录？删除后无法恢复。')) return;
        after(saveReservation(type, record, function (item) { var list = reservationList(type, item), index = list.indexOf(item); if (index >= 0) list.splice(index, 1); }), function () { open(owner); });
      })); removeReservation.dataset.detailDelete = 'true'; items.push(removeReservation);
    }
    if (!onDetail) return cardOrder(items, deleteButton(type, reservationTitle(type, record), { id: record.id, after: function () { render(owner); } }), button('详情', guard(function () { showReservation(type, record, false, owner); })));
    return items;
  }
  function orderCard(container, type, record, kind) {
    var owner = kind || 'reservations';
    var item = node('article', undefined, 'my-order-card'); item.dataset.reservationId = record.id;
    var head = node('div', undefined, 'my-order-head');
    var billCard = owner === 'orders';
    head.append(node('span', kinds[type][0], 'my-order-type'), node('span', billCard ? billStatusText(type, record) : reservationState(type, record), 'my-order-status' + ((billCard ? billState(type, record) !== 'paid' : reservationOpen(type, record)) ? '' : ' is-closed')));
    var body = node('div', undefined, 'my-order-body'); body.appendChild(node('strong', reservationTitle(type, record)));
    infoBody(body, reservationInfo(type, record));
    body.onclick = guard(function () { showReservation(type, record, false, owner); });
    var note = node('p', '', 'my-order-note'); note.setAttribute('role', 'status');
    var bar = node('div', undefined, 'my-order-actions'); reservationButtons(type, record, note, false, owner).forEach(function (control) { bar.appendChild(control); });
    item.append(head, body, note, bar); container.appendChild(item);
  }
  function editableFields(type, record) {
    if (type === 'activity') return [['报名人', 'name'], ['联系电话', 'phone'], ['参加人数', 'attendees'], ['备注', 'note']];
    if (type === 'booking') return [['联系人', 'name'], ['联系电话', 'phone'], ['备注', 'purpose']];
    if (record.fields) return record.fields.map(function (field, index) { return [field[0], index]; });
    return [['访客姓名', 'name'], ['访客手机', 'phone'], ['来访安排', 'detail']];
  }
  function fieldValue(record, key) { return typeof key === 'number' ? record.fields[key][1] : record[key] || ''; }
  // Property contact card shown on every 我的服务 detail page: phone call + in-app chat with property staff.
  var propertyContact = { name: '李师傅', tag: '物业管家', hours: '值班时间 09:00-18:00', phone: '400-820-6618', tel: '4008206618' };
  function contactCard(subject, returnTo) {
    var card = node('div', undefined, 'my-contact-card');
    var avatar = node('span', '李', 'my-contact-avatar'); avatar.setAttribute('aria-hidden', 'true');
    // Layout: avatar | name + 物业 tag / 值班时间, then two full-width buttons below.
    var info = node('div', undefined, 'my-contact-info'), nameRow = node('div', undefined, 'my-contact-name');
    nameRow.append(node('strong', propertyContact.name), node('em', propertyContact.tag, 'my-contact-tag'));
    info.append(nameRow, node('span', propertyContact.hours));
    var person = node('div', undefined, 'my-contact-person'); person.append(avatar, info);
    var actionsBox = node('div', undefined, 'my-contact-actions');
    var call = node('a', undefined, 'my-contact-btn'); call.href = 'tel:' + propertyContact.tel; call.setAttribute('aria-label', '拨打物业电话 ' + propertyContact.phone);
    var callIcon = node('i'); callIcon.dataset.lucide = 'phone'; callIcon.setAttribute('aria-hidden', 'true');     call.append(callIcon, node('span', '电话联系'));
    var chat = button('', guard(function () {
      if (window.__messageJourney && window.__messageJourney.setContext) window.__messageJourney.setContext(subject);
      window.__setMiniRoute('leasing-chat', '在线咨询', returnTo || detail.id); window.__showMiniPage('leasing-chat');
    })); chat.className = 'my-contact-btn'; chat.setAttribute('aria-label', '在线联系物业');
    var chatIcon = node('i'); chatIcon.dataset.lucide = 'message-circle'; chatIcon.setAttribute('aria-hidden', 'true'); chat.append(chatIcon, node('span', '在线联系'));
    actionsBox.append(call, chat); card.append(person, actionsBox);
    return card;
  }
  function showReservation(type, record, editing, owner) {
    owner = owner || (type === 'booking' ? 'applications' : 'reservations');
    if (!employee()) return window.__showMiniPage('role-denied');
    if (!reservationRows(type).includes(record)) return window.__showMiniPage('role-denied');
    var title = kinds[type][2], wrap = node('div', undefined, 'my-order-detail');
    var banner = detailBanner(reservationOpen(type, record), reservationTitle(type, record), reservationState(type, record), kinds[type][0], record.id);
    var info = node('dl', undefined, 'my-services-fields');
    // Same split facts as the card, plus contact details and the free-text note last.
    var base = reservationInfo(type, record), fields = base.pairs.slice();
    if (type === 'booking') fields.push(['费用', '¥' + (record.price || 0) * record.times.length + '（' + record.times.length + '小时）'], ['联系人', store.displayText(record, record.name)], ['联系电话', record.phone], ['备注', record.purpose || '无']);
    else if (base.summary) fields.push(['来访事由', base.summary]);
    // Booked from an approved 场地使用申请: its approval trail is shown here, since the request card is folded away.
    if (type === 'booking' && record.approvalId) { var approval = recordRows('request', workflows.myRecords()).find(function (r) { return r.id === record.approvalId; }); if (approval) fields = fields.concat([['场地使用申请', approval.id], ['批准预算', '¥' + Number(approval.amount || 0).toFixed(2)], ['审批进度', (approval.history || []).join(' → ') || '暂无进度']]); }
    if (type === 'activity') fields = base.pairs.concat([['联系电话', record.phone], ['备注', record.note || '无']]);
    // Visitor and activity records keep the property review result and reason.
    if (type === 'visitor' || type === 'activity') { if (record.reviewNote) fields.push(['审批意见', record.reviewNote]); if (record.reviewedAt) fields.push(['审批时间', String(record.reviewedAt).replace('T', ' ').slice(0, 16)]); }
    bodyFields(fields).forEach(function (pair) { info.append(node('dt', pair[0]), node('dd', pair[1] === undefined || pair[1] === '' ? '未填写' : String(pair[1]))); });
    var note = node('p', '', 'my-order-note'); note.setAttribute('role', 'status');
    wrap.append(banner, info, contactCard(kinds[type][0] + ' · ' + reservationTitle(type, record)), note);
    if (editing && reservationOpen(type, record)) {
      var form = node('form', undefined, 'my-order-form'); form.noValidate = true;
      var inputs = editableFields(type, record).map(function (spec) {
        var label = node('label', spec[0]), input = node('input'); input.value = fieldValue(record, spec[1]); input.maxLength = 80; input.required = spec[1] !== 'note'; label.appendChild(input); form.appendChild(label); return [spec, input];
      });
      var bar = node('div', undefined, 'my-order-actions'), save = button('保存修改', null); save.type = 'submit'; save.classList.add('is-primary');
      bar.append(button('放弃修改', guard(function () { showReservation(type, record, false, owner); })), save); form.appendChild(bar);
      form.onsubmit = guard(function (event) {
        if (event) event.preventDefault();
        var invalid = inputs.find(function (pair) { return pair[0][1] !== 'note' && !pair[1].value.trim(); });
        if (invalid) { note.textContent = '请填写' + invalid[0][0] + '。'; invalid[1].focus(); return; }
        var count = inputs.find(function (pair) { return pair[0][1] === 'attendees'; });
        if (count && !/^[1-9]\d?$/.test(count[1].value.trim())) { note.textContent = '参加人数请填写 1-99 的整数。'; count[1].focus(); return; }
        var phone = inputs.find(function (pair) { return /电话|手机/.test(pair[0][0]) && pair[1].value.trim() !== fieldValue(record, pair[0][1]); });
        if (phone && !/^1\d{10}$/.test(phone[1].value.trim())) { note.textContent = '请输入11位手机号。'; phone[1].focus(); return; }
        var ok = saveReservation(type, record, function (item) { inputs.forEach(function (pair) { var key = pair[0][1], value = pair[1].value.trim(); if (typeof key === 'number') item.fields[key][1] = value; else item[key] = key === 'attendees' ? Number(value) : value; }); });
        if (ok) showReservation(type, record, false, owner); else note.textContent = '保存失败，请刷新页面后重试。';
      });
      wrap.appendChild(form);
    } else {
      var actionsBar = node('div', undefined, 'my-order-actions'); reservationButtons(type, record, note, true).forEach(function (control) { actionsBar.appendChild(control); });
      wrap.appendChild(actionsBar);
    }
    detail.replaceChildren(wrap); if (window.lucide) window.lucide.createIcons();
    window.__setMiniRoute(detail.id, editing ? '修改' + kinds[type][1] : title, pages[owner].id); context = owner; window.__showMiniPage(detail.id);
    var first = detail.querySelector('input'); if (first) first.focus({ preventScroll: true });
  }
  // ---- 我的申请 / 我的工单 / 我的账单: order-style cards, same contract as 我的预约 ----
  var recordKinds = {
    request: { label: '申请', detail: '申请详情' }, vehicle: { label: '车辆服务', detail: '车辆申请详情' }, release: { label: '物品放行', detail: '放行详情' }, monitor: { label: '监控调取', detail: '调取详情' },
    repair: { label: '物业报修', detail: '报修详情' }, feedback: { label: '意见反馈', detail: '反馈详情' }, special: { label: '专项服务', detail: '服务详情' },
    dining: { label: '订餐服务', detail: '账单详情' }, parking: { label: '车辆服务', detail: '账单详情' }, venue: { label: '场地预定', detail: '账单详情' }, utilities: { label: '水电缴费', detail: '账单详情' }, request: { label: '申请', detail: '账单详情' }
  };
  var requestTypes = { meeting: '场地预定', utilities: '水电缴费', renovation: '装修申请' };
  var sampleRecords = {
    request: [
      { id: 'SQ-2026-0101', sample: true, type: 'meeting', title: '客户方案评审会', status: 'enterprise', amount: 160, detail: '客户方案评审会，需投屏与白板', meetingStart: shanghaiDate(4) + 'T09:00', meetingEnd: shanghaiDate(4) + 'T11:00', history: ['王晓明提交申请'] },
      { id: 'SQ-2026-0103', sample: true, type: 'utilities', title: '10月水电费缴纳', status: 'withdrawn', amount: 1680, detail: '10月水电费缴费申请', history: ['王晓明提交申请', '王晓明撤回申请'] },
      { id: 'ZX-2026-0104', sample: true, type: 'renovation', title: '会议区玻璃隔断安装', owner: 'employee', company: company, status: 'property', amount: 0, detail: 'A座609室 · 会议区玻璃隔断安装 · ' + shanghaiDate(6) + '至' + shanghaiDate(9) + ' · 星桥装饰团队', history: ['王晓明提交申请', '唐慧丽：企业审批通过'] },
      { id: 'SQ-2026-0105', sample: true, type: 'meeting', title: '客户答谢宴场地申请', status: 'enterprise', amount: 200, detail: '客户答谢宴场地申请，需提前布置', meetingStart: shanghaiDate(6) + 'T18:00', meetingEnd: shanghaiDate(6) + 'T21:00', history: ['王晓明提交申请'] },
      { id: 'SQ-2026-0106', sample: true, type: 'utilities', title: '9月水电费缴纳', status: 'property', amount: 1540, detail: '9月水电费缴费申请', history: ['王晓明提交申请', '唐慧丽：企业审批通过'] },
      { id: 'ZX-2026-0107', sample: true, type: 'renovation', title: '入口走廊软装更新', owner: 'employee', company: company, status: 'approved', amount: 0, detail: 'A座606室 · 入口走廊软装更新 · ' + shanghaiDate(-10) + '至' + shanghaiDate(-8) + ' · 星桥装饰团队', history: ['王晓明提交申请', '唐慧丽：企业审批通过', '李师傅：物业审批通过 · 已核实施工安排'] },
      { id: 'SQ-2026-0108', sample: true, type: 'meeting', title: '年终总结会场地', status: 'approved', amount: 160, detail: '年终总结会，需投影与音响设备', meetingStart: shanghaiDate(-15) + 'T14:00', meetingEnd: shanghaiDate(-15) + 'T16:00', history: ['王晓明提交申请', '唐慧丽：企业审批通过', '李师傅：物业审批通过'] },
      { id: 'SQ-2026-0109', sample: true, type: 'utilities', title: '8月水电费缴纳', status: 'approved', amount: 1480, detail: '8月水电费缴费申请', history: ['王晓明提交申请', '唐慧丽：企业审批通过', '李师傅：物业确认办理完成'] },
      { id: 'SQ-2026-0110', sample: true, type: 'meeting', title: '内部分享会场地申请', status: 'rejected', amount: 80, detail: '内部技术分享会场地申请', meetingStart: shanghaiDate(-5) + 'T14:00', meetingEnd: shanghaiDate(-5) + 'T16:00', history: ['王晓明提交申请', '唐慧丽：企业审批驳回 · 该时段会议室已被预定'] },
      { id: 'ZX-2026-0111', sample: true, type: 'renovation', title: 'B座接待区地毯更换', owner: 'employee', company: company, status: 'rejected', amount: 0, detail: 'B座305室 · 接待区地毯更换 · 星桥装饰团队', history: ['王晓明提交申请', '唐慧丽：企业审批驳回 · 超出年度装修预算'] },
      { id: 'SQ-2026-0112', sample: true, type: 'utilities', title: '特殊费用申请', status: 'rejected', amount: 300, detail: '临时用电申请', history: ['王晓明提交申请', '唐慧丽：企业审批驳回 · 请走固定账单流程'] }
    ],
    release: [
      { id: 'FX-2026-0201', sample: true, status: 'enterprise_pending', enterpriseStatus: 'pending', items: '办公显示器 2 台', location: 'A座 1F 货梯口', plannedAt: shanghaiDate(2) + ' 15:00', note: '设备返厂维修', history: ['王晓明提交物品放行申请'] },
      { id: 'FX-2026-0202', sample: true, status: 'approved', items: '展会样品 3 箱', location: 'A座 1F 大堂', plannedAt: shanghaiDate(-3) + ' 09:00', note: '外出参展', inspectionStatus: 'passed', history: ['王晓明提交物品放行申请', '唐慧丽：企业审批通过', '李师傅：审批通过'] },
      { id: 'FX-2026-0203', sample: true, status: 'rejected', items: '旧服务器 1 台', location: 'C座 1F', plannedAt: shanghaiDate(-5) + ' 14:00', note: '设备报废', history: ['王晓明提交物品放行申请', '唐慧丽：企业审批通过', '李师傅：审批驳回 · 缺少处置证明'] },
      { id: 'FX-2026-0204', sample: true, status: 'supplement', items: '会议音响 2 套', location: 'B座 1F', plannedAt: shanghaiDate(2) + ' 10:00', note: '展会借用', history: ['王晓明提交物品放行申请', '唐慧丽：企业审批通过', '李师傅：要求补件 · 请提供借用审批单'] }
    ],
    monitor: [
      { id: 'JK-2026-0301', sample: true, status: 'enterprise_pending', enterpriseStatus: 'pending', scope: 'A座大堂', requestedAt: shanghaiDate(-1) + ' 13:30-14:00', purpose: '访客时段录像调取', history: ['王晓明提交监控调取申请'] },
      { id: 'JK-2026-0302', sample: true, status: 'approved_for_offline_handover', propertyStatus: 'approved', scope: 'A座 2F 走廊', requestedAt: shanghaiDate(-4) + ' 10:00-11:00', purpose: '设备遗失核查', history: ['王晓明提交监控调取申请', '唐慧丽：企业审批通过', '李师傅：物业审核通过，待线下授权'] },
      { id: 'JK-2026-0303', sample: true, status: 'rejected', propertyStatus: 'rejected', scope: 'B座停车场', requestedAt: shanghaiDate(-6) + ' 19:00-20:00', purpose: '财物失窃核查', history: ['王晓明提交监控调取申请', '唐慧丽：企业审批通过', '李师傅：审核驳回 · 需警方协查函'] },
      { id: 'JK-2026-0304', sample: true, status: 'completed', propertyStatus: 'approved', scope: 'A座大堂 · 正门', requestedAt: shanghaiDate(-12) + ' 09:00-10:00', purpose: '外来人员身份核查', history: ['王晓明提交监控调取申请', '唐慧丽：企业审批通过', '李师傅：物业审核通过', '李师傅：已提供录像片段'] }
    ],
    repair: [
      { id: 'BX-2026-0401', sample: true, status: 'confirmation', title: '会议室投影无信号', detail: 'A座605 · 投影仪 HDMI 无信号', history: ['王晓明提交报修', '李师傅：已接单', '李师傅：已更换 HDMI 线并测试正常'] },
      { id: 'BX-2026-0404', sample: true, status: 'confirmation', title: '办公区域插座故障', detail: 'A座605 · 靠窗插座失电', history: ['王晓明提交报修', '李师傅：已完成排查及更换'] },
      { id: 'BX-2026-0402', sample: true, status: 'processing', title: '空调制冷异常', detail: 'A座605 · 空调制冷效果不佳', history: ['王晓明提交报修', '李师傅：已接单，等待上门检修'] },
      { id: 'BX-2026-0403', sample: true, status: 'completed', title: '卫生间排水堵塞', detail: 'A座6层卫生间 · 排水缓慢', history: ['王晓明提交报修', '李师傅：已完成管道疏通', '王晓明：确认已解决'] }
    ],
    feedback: [
      { id: 'FK-2026-0501', sample: true, title: '服务建议', propertyStatus: 'processing', created: shanghaiDate(-2) + 'T10:00:00+08:00', fields: [['反馈类型', '服务建议'], ['反馈内容', '建议午间增加电梯运行班次'], ['联系电话', '138****0000']], propertyHistory: ['物业已受理'] },
      { id: 'FK-2026-0502', sample: true, title: '环境投诉', propertyStatus: 'completed', created: shanghaiDate(-7) + 'T09:00:00+08:00', fields: [['反馈类型', '投诉'], ['反馈内容', '地下车库照明不足'], ['联系电话', '138****0000']], propertyHistory: ['物业已受理', '已增设夜间补光灯'] },
      { id: 'FK-2026-0503', sample: true, title: '表扬物业团队', propertyStatus: 'completed', created: shanghaiDate(-10) + 'T11:00:00+08:00', fields: [['反馈类型', '表扬'], ['反馈内容', '报修师傅响应及时，服务态度好'], ['联系电话', '138****0000']], propertyHistory: ['物业已记录，感谢您的反馈'] },
      { id: 'FK-2026-0504', sample: true, title: '停车场投诉', propertyStatus: 'awaiting_confirmation', created: shanghaiDate(-4) + 'T14:00:00+08:00', fields: [['反馈类型', '投诉'], ['反馈内容', '地下车库路面破损，有安全隐患'], ['联系电话', '138****0000']], propertyResult: '已修补路面并划定临时警示区域', propertyHistory: ['物业已受理', '物业已提交处理结果'] }
    ],
    special: [
      { id: 'ZX-2026-0601', sample: true, status: 'awaiting_confirmation', title: '会议室布置协助', detail: 'A座 2F · 会议桌椅与投屏检查', result: '已完成桌椅摆放与投屏调试', history: ['王晓明提交需求', '李师傅：已接单', '李师傅：提交处理结果'] },
      { id: 'ZX-2026-0602', sample: true, status: 'completed', title: '门禁卡补办', detail: 'A座605 · 员工门禁卡遗失', result: '已补办并激活', history: ['王晓明提交需求', '李师傅：已接单', '李师傅：完成补办', '王晓明：确认'] },
      { id: 'ZX-2026-0603', sample: true, status: 'submitted', title: '停车场导视牌维修', detail: 'B座地下一层 · 导视牌损坏', history: ['王晓明提交需求'] },
      { id: 'ZX-2026-0604', sample: true, status: 'accepted', title: '会议室音响布置', category: '会务服务', detail: 'A座 2F · 会议室音响与投影调试', history: ['王晓明提交需求', '李师傅：已接单'] },
      { id: 'ZX-2026-0605', sample: true, status: 'processing', title: '网络端口开通', category: '网络服务', location: 'A座605 · 工位12', detail: '新员工工位需开通网口', history: ['王晓明提交需求', '李师傅：已接单', '李师傅：开始处理'] }
    ],
    dining: [
      { id: 'DC-2026-0701', sample: true, title: '会议茶歇套餐', status: '待餐厅确认', detail: 'A座 2F · ' + shanghaiDate(1) + ' 15:00 · 8份' },
      { id: 'DC-2026-0702', sample: true, title: '商务午餐', status: '已完成', detail: '园区餐厅 · ' + shanghaiDate(-3) + ' 12:00 · 4份' },
      { id: 'DC-2026-0703', sample: true, title: '工作日套餐', status: '已逾期', paymentStatus: 'overdue', amount: 48, detail: '园区餐厅 · ' + shanghaiDate(-14) + ' 12:00 · 2份' }
    ],
    parking: [
      { id: 'TC-2026-0801', sample: true, title: '访客停车登记', status: '待核对', detail: '京A12345 · ' + shanghaiDate(1) + ' · A座访客' },
      { id: 'TC-2026-0802', sample: true, title: '月租停车费', status: '已缴费', feePaid: true, amount: 600, detail: '月租车位 A-108 · 10月' }
    ],
    vehicle: [],
    venue: [
      { id: 'MR-S-101', sample: true, room: '榫卯会议室', meta: 'A座 2F · 已缴费', price: 80, date: shanghaiDate(-10), times: ['10:00–11:00'], name: '王晓明', phone: '138****0000', purpose: '产品讨论', status: '已完成', propertyStatus: 'approved', feePaid: true },
      { id: 'MR-S-102', sample: true, room: '远山路演厅', meta: 'A座 1F · 已逾期', price: 180, date: shanghaiDate(-20), times: ['14:00–15:00'], name: '王晓明', phone: '138****0000', purpose: '客户路演', status: '已完成', propertyStatus: 'approved', feePaid: false, paymentStatus: 'overdue' },
      { id: 'MR-S-103', sample: true, room: '云杉会议室', meta: 'C座 3F · 待缴费', price: 120, date: shanghaiDate(4), times: ['09:00–10:00','10:00–11:00'], name: '王晓明', phone: '138****0000', purpose: '季度规划', status: '已预约', propertyStatus: 'approved', feePaid: false }
    ],
    utilities: [
      { id: 'SD-2026-0901', sample: true, title: '10月水电费', status: 'unpaid', detail: 'ZD1001 · 10月水电费缴纳', amount: 1680 },
      { id: 'SD-2026-0902', sample: true, title: '9月水电费', status: 'paid', feePaid: true, detail: 'ZD1001 · 9月水电费', amount: 1540 }
    ]
  };
  // Real records first; fall back to samples only when the user has none of that kind.
  var adminSamples = {};
  function recordRows(type, records) {
    var own;
    // 车辆事项 keeps its own demo rows in the role workflow store, so no local sample fallback.
    if (type === 'vehicle') return (records.vehicleRequests || []).filter(function (record) { return record.type !== 'parking'; });
    if (type === 'request') own = records.requests;
    else if (type === 'release') own = ownReleases();
    else if (type === 'monitor') own = journeyRecords('monitorRequests');
    else if (type === 'vehicle') own = (records.vehicleRequests || []).filter(function (record) { return record.owner === role(); });
    else if (type === 'repair') own = records.repairs;
    else if (type === 'feedback') own = ownFeedback();
    else if (type === 'special') own = journeyRecords('specialTickets');
    else if (type === 'venue') own = store.data.bookings.filter(function (record) { return record.owner === role() && (!record.company || record.company === company) && Number(record.price) > 0 && record.status !== '已取消' && record.propertyStatus !== 'rejected'; });
    else if (type === 'utilities') {
      // Water/electricity bills: from workflow bills and utility requests submitted by this user.
      try { var wf = workflows.propertyData ? workflows.propertyData() : {}; var ownBills = (wf.bills || []).filter(function (b) { return b.company === company && !b.sample && b.category !== 'parking' && !/停车/.test(b.title || ''); }); own = ownBills; } catch (e) { own = []; }
    }
    else { own = journeyRecords(type === 'dining' ? 'diningOrders' : 'parkingOrders'); if (role() === 'property') own = own.filter(function (record) { return record.owner === 'property'; }); }
    own = own.filter(function (record) { return !record.sample; });
    if (own.length) return own;
    if (role() !== 'admin') return sampleRecords[type];
    // Keep empty-state previews personal too; never reuse employee identity or mutable records.
    if (!adminSamples[type]) adminSamples[type] = sampleRecords[type].map(function (record) {
      var sample = Object.assign({}, record, { owner: 'admin', company: company });
      if (sample.history) sample.history = sample.history.filter(function (entry) { return !entry.includes('企业审批通过'); }).map(function (entry) { return entry.replace(/王晓明/g, '唐慧丽'); });
      if (type === 'request' && sample.status === 'enterprise') sample.status = 'property';
      return sample;
    });
    return adminSamples[type];
  }
  function repairStatus(record) { return { pending: '待接单', processing: '处理中', confirmation: '待结果确认', completed: '已完成' }[record.status] || record.status; }
  function releaseStatus(record) {
    if (record.status === 'approved') return record.inspectionStatus === 'passed' ? '已批准 · 查验通过' : record.inspectionStatus === 'failed' ? '已批准 · 查验不通过' : '已批准 · 待查验';
    return { enterprise_pending: '待企业审批', pending: '待物业审批', supplement: '待补件', rejected: '已驳回', withdrawn: '已撤回' }[record.status] || record.status || '状态未标记';
  }
  function domainStatus(record) {
    return { submitted: '待受理', accepted: '已受理', pending: '待物业审批', enterprise_pending: '待企业审批', withdrawn: '已撤回', property_pending: '待物业审批', approved_for_offline_handover: '已批准 · 待线下对接', handoff: '已批准 · 待线下对接', processing: '处理中', awaiting_confirmation: '待确认结果', result: '待确认结果', completed: '已完成', closed: '已完成', approved: '已批准', rejected: '已驳回' }[record.status] || journeyStatus(record);
  }
  function vehicleStatus(record) {
    return { enterprise_pending: '待企业审批', property_pending: '待物业审批', finance_pending: '待物业办理', approved: '已完成', rejected: '已驳回' }[record.status] || domainStatus(record);
  }
  var vehicleStatusText = { enterprise_pending: '待企业审批', property_pending: '待物业审核', finance_pending: '待财务办理', approved: '已批准', rejected: '已驳回' };
  function recordState(type, record) {
    if (type === 'request') return record.sample ? { enterprise: '待企业审批', property: '待物业审批', execution: '待物业办理', approved: '已批准', rejected: '已驳回', withdrawn: '已撤回' }[record.status] : workflows.requestState(record) || '状态未标记';
    if (type === 'vehicle') return vehicleStatus(record);
    if (type === 'release') return releaseStatus(record);
    if (type === 'repair') return repairStatus(record);
    if (type === 'feedback') return feedbackStatus(record);
    if (type === 'monitor' || type === 'special') return domainStatus(record);
    if (type === 'venue') return record.feePaid ? '已缴费' : '待缴费';
    return journeyStatus(record);
  }
  function recordOpen(type, record) { return !/已完成|已撤回|已驳回|已取消|已过期|已使用|查验通过|已核销/.test(recordState(type, record)); }
  function recordTitle(type, record) {
    if (type === 'request') return requestTitle(record);
    if (type === 'vehicle') return record.category || '车辆事项';
    if (type === 'release') return record.items || '物品放行单';
    if (type === 'feedback') return record.title || '意见反馈';
    if (type === 'venue') return record.room || '场地预定费';
    if (type === 'vehicle') return record.category || '车辆事项';
    return record.title || recordKinds[type].label;
  }
  // User title first; otherwise the most specific part of what the user wrote, never the type label.
  function renovationParts(record) {
    var parts = String(record.detail || '').split(' · ').map(function (part) { return part.trim(); });
    if (parts.length >= 5 && /^\d{4}-\d{2}-\d{2}$/.test(parts[1])) return { location: parts[0], time: parts[1] + ' 至 ' + parts[2], contractor: parts[3], description: parts.slice(4).join(' · ') };
    return { location: parts[0], description: parts[1], time: (parts[2] || '').replace('至', ' 至 '), contractor: parts.slice(3).join(' · ') };
  }
  function requestTitle(record) {
    if (record.title) return record.title;
    var parts = String(record.detail || '').split(' · ').map(function (part) { return part.trim(); }).filter(Boolean);
    var pick = record.type === 'renovation' ? renovationParts(record).description : parts[parts.length - 1];
    return pick || requestTypes[record.type] || '申请';
  }
  // Card body: short facts as label/value rows; only long free text (备注、描述、理由) sits under the title.
  // `detail` strings are joined with ' · '; split them back into the fields they came from.
  function detailParts(record) { return String(record.detail || '').split(' · ').map(function (part) { return part.trim(); }).filter(Boolean); }
  function splitDetail(record, labels) {
    var parts = detailParts(record), pairs = [], summary = '';
    if (parts.length < 2) return { pairs: pairs, summary: parts[0] || '' };
    labels.forEach(function (label, index) {
      var value = index === labels.length - 1 ? parts.slice(index).join('，') : parts[index];
      if (!value) return;
      if (label) pairs.push([label, value]); else summary = value;
    });
    return { pairs: pairs, summary: summary };
  }
  function cardInfo(record, title, info, idLabel) {
    var summary = info.summary && info.summary !== title ? info.summary : '';
    return { summary: summary, pairs: info.pairs.concat(idLabel ? [[idLabel, record.id]] : []) };
  }
  function recordInfo(type, record) {
    var title = recordTitle(type, record);
    if (type === 'request') {
      if (record.type === 'renovation') {
        var reno = renovationParts(record);
        return cardInfo(record, title, { summary: reno.description, pairs: [['装修位置', reno.location], ['施工时间', reno.time], ['施工单位', reno.contractor]] }, '申请编号');
      }
      var base = record.type === 'utilities' ? splitDetail(record, ['账单编号', null]) : { pairs: [], summary: record.detail };
      if (record.type === 'meeting' && record.meetingStart) base.pairs.push(['使用时间', record.meetingStart.replace('T', ' ') + ' 至 ' + record.meetingEnd.replace('T', ' ')]);
      if (record.amount) base.pairs.push([record.type === 'meeting' ? '预算金额' : '金额', '¥' + Number(record.amount).toFixed(2)]);
      return cardInfo(record, title, base, '申请编号');
    }
    if (type === 'release') return cardInfo(record, title, { summary: record.note, pairs: [['放行地点', record.location], ['计划时间', String(record.plannedAt || '').replace('T', ' ') + (record.plannedEndAt ? ' 至 ' + String(record.plannedEndAt).replace('T', ' ').slice(11) : '')]] }, '放行编号');
    if (type === 'feedback') { var content = (record.fields || []).find(function (field) { return field[0] === '反馈内容'; }); return cardInfo(record, title, { summary: content ? content[1] : '', pairs: [] }, '反馈编号'); }
    if (type === 'repair') return cardInfo(record, title, splitDetail(record, ['报修位置', null]), '工单编号');
    if (type === 'special') return cardInfo(record, title, record.location ? { summary: record.detail, pairs: [['服务地点', record.location]] } : splitDetail(record, ['服务地点', null]), '工单编号');
    if (type === 'monitor') {
      if (record.scope || record.purpose) return cardInfo(record, title, { summary: record.purpose || record.reason, pairs: [['调取范围', record.scope || record.area], ['调取时段', record.requestedAt || record.time]] }, '申请编号');
      return cardInfo(record, title, record.area ? { summary: record.reason, pairs: [['调取范围', record.area], ['调取时段', record.time]] } : splitDetail(record, ['调取范围', '调取时段']), '申请编号');
    }
    if (type === 'vehicle') return cardInfo(record, title, { summary: record.detail, pairs: [['车牌号', record.vehiclePlate], ['事项类型', record.category || '车辆服务'], ['金额', Number(record.amount) > 0 ? '¥' + Number(record.amount).toFixed(2) : '']] }, '申请编号');
    if (type === 'dining') {
      if (record.pickup) return cardInfo(record, title, { summary: record.remark, pairs: [['取餐时间', record.pickup], ['取餐柜', record.locker], ['数量', record.quantity ? record.quantity + '份' : ''], ['金额', record.amount ? '¥' + Number(record.amount).toFixed(2) : '']] }, '订单编号');
      return cardInfo(record, title, splitDetail(record, ['用餐地点', '用餐时间', '数量']), '订单编号');
    }
    if (type === 'parking') return cardInfo(record, title, splitDetail(record, ['车牌号', '停车日期', '到访地点']), '订单编号');
    if (type === 'venue') return cardInfo(record, title, { summary: '', pairs: [['使用日期', record.date], ['时段', (record.times || []).join('、')], ['金额', '¥' + (Number(record.price) * (record.times || []).length).toFixed(2)]] }, '账单编号');
    return cardInfo(record, title, { summary: record.detail || journeyCopy(record), pairs: [] }, '订单编号');
  }

  // Detail fields reuse the card's split facts (no ' · ' joins), then long text, results and progress.
  var longTextLabels = { request: '申请说明', release: '申请说明', repair: '问题描述', feedback: '反馈内容', special: '需求说明', monitor: '调取原因', vehicle: '申请说明', dining: '备注', parking: '备注' };
  function recordFields(type, record) {
    var history = function (list) { return list && list.length ? list.join(' → ') : '暂无进度'; };
    var info = recordInfo(type, record), fields = info.pairs.slice();
    var longLabel = type === 'request' && record.type === 'renovation' ? '装修范围与施工说明' : type === 'request' && record.type === 'meeting' ? '申请理由' : longTextLabels[type];
    if (info.summary) fields.push([longLabel || '说明', info.summary]);
    if (type === 'request') {
      var people = { employee: '企业员工', admin: '企业管理员' };
      return [['申请类型', requestTypes[record.type] || '申请']].concat(fields, [['申请企业', record.company || company], ['提交人', people[record.owner] || '企业员工'], ['审批进度', history(record.history)]]);
    }
    if (type === 'vehicle') {
      var vehiclePeople = { employee: '企业员工', admin: '企业管理员' };
      return [['申请类型', record.category || '车辆服务']].concat(fields, [['申请企业', record.company || company], ['提交人', vehiclePeople[record.owner] || '企业员工'], ['审批进度', history(record.history)]]);
    }
    if (type === 'feedback') {
      var extra = (record.fields || []).filter(function (field) { return field[0] !== '反馈内容'; });
      var list = [['提交时间', record.created ? new Date(record.created).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '未记录']].concat(extra, fields);
      if (record.propertyResult) list.push(['物业处理结果', record.propertyResult]);
      return list.concat([['处理进度', history(record.propertyHistory)]]);
    }
    if (type === 'special') return fields.concat([['处理结果', record.result || '暂无'], ['处理进度', history(record.history)]]);
    if (type === 'vehicle') {
      var submitters = { employee: '企业员工', admin: '企业管理员', property: '物业人员' };
      return [['事项类型', record.category || '车辆事项']].concat(fields, [['申请企业', record.company || company], ['提交人', submitters[record.owner] || '企业员工'], ['审批进度', history(record.history)]]);
    }
    if (type === 'release' || type === 'monitor') return fields.concat([['审批进度', history(record.history)]]);
    if (type === 'repair') return fields.concat([['处理进度', history(record.history)]]);
    return fields;
  }

  // Mutations reuse the owning module's guarded writers; samples change only in memory.
  function recordAction(type, record, name) {
    if (!canKind(type === 'dining' || type === 'parking' ? 'orders' : 'other')) return false;
    var list = sampleRecords[type];
    if (record.sample) {
      if (name === 'remove') { list.splice(list.findIndex(function (item) { return item.id === record.id; }), 1); return true; }
      if (type === 'request' && name === 'withdraw') { record.status = 'withdrawn'; return true; }
      if (type === 'repair') { record.status = name === 'confirm' ? 'completed' : 'processing'; return true; }
      if (type === 'special' && name === 'confirm') { record.status = 'completed'; return true; }
      if (type === 'dining' && name === 'cancel') { record.status = '已取消'; return true; }
      return false;
    }
    if (type === 'request' || type === 'repair' || type === 'special') return !!workflows.myRecordAction && workflows.myRecordAction(type, record.id, name);
    if ((type === 'release' || type === 'monitor') && name === 'withdraw') return !!workflows.withdrawDomain && workflows.withdrawDomain(type === 'release' ? 'releaseRequests' : 'monitorRequests', record.id);
    if (type === 'feedback' && name === 'remove') return feedbackCommit(record, function () { store.data.feedback.splice(store.data.feedback.indexOf(record), 1); });
    if (type === 'dining' && name === 'cancel' && journeyApi()) return journeyApi().update('diningOrders', record.id, function (item) { item.status = '已取消'; });
    return false;
  }
  function recordButtons(type, record, note, onDetail, refresh) {
    var items = [], state = recordState(type, record);
    function run(name, ask) {
      return guard(function () {
        if (ask && !window.confirm(ask)) return;
        if (!recordAction(type, record, name)) { note.textContent = '操作未生效，请刷新页面后重试。'; return; }
        if (name === 'remove') return open(context || refresh);
        if (onDetail) showMyRecord(refresh, type, record); else render(refresh);
      });
    }
    if (type === 'request' && record.type === 'meeting' && workflows.canChooseMeeting && workflows.canChooseMeeting(record.id)) items.push(button('选择场地并预定', guard(function () { workflows.chooseMeeting(record.id); })));
    if (type === 'request' && record.status === 'enterprise' && !record.sample) items.push(button('撤回申请', run('withdraw', '确认撤回这条申请？撤回后需重新提交。')));
    // Monitor / release can be withdrawn while the enterprise stage is still open.
    if ((type === 'release' || type === 'monitor') && !record.sample && record.owner === 'employee' && record.status === 'enterprise_pending') items.push(button('撤回申请', run('withdraw', '确认撤回这条申请？撤回后需重新提交。')));
    if (type === 'repair' && record.status === 'confirmation' && !record.sample) items.push(button('仍需维修', run('reopen', '确认问题未解决，退回物业继续维修？')), button('确认已修好', run('confirm')));
    if (type === 'special' && /待确认结果/.test(state) && !record.sample) items.push(button('确认结果', run('confirm')));
    if (type === 'dining' && state === '待餐厅确认' && !record.sample) items.push(button('取消订单', run('cancel', '确认取消这笔订单？')));
    var removable = !record.sample && (type === 'request' ? ['withdrawn', 'rejected'].includes(record.status) : type === 'repair' ? record.status === 'completed' : type === 'feedback' ? feedbackStatus(record) === '已完成' : type === 'special' ? /已完成/.test(state) : false);
    if (onDetail && removable) { var removeRecord = button('删除记录', run('remove', '确认删除这条记录？删除后无法恢复。')); removeRecord.dataset.detailDelete = 'true'; items.push(removeRecord); }
    // Sample previews are read-only: deleting or withdrawing them would only change memory and come back on reload.
    if (!onDetail) return cardOrder(items, record.sample ? null : deleteButton(type, recordTitle(type, record), { id: record.id, after: function () { render(refresh); } }), button('详情', guard(function () { showMyRecord(refresh, type, record); })));
    return items;
  }
  function billStatusText(type, record) { return { paid: '已缴费', overdue: '已逾期', pending: '待缴费', closed: '已关闭' }[billState(type, record)]; }
  function myCard(container, kind, type, record) {
    var item = node('article', undefined, 'my-order-card'); item.dataset.recordId = record.id;
    var head = node('div', undefined, 'my-order-head');
    var billCard = kind === 'orders' && (type === 'request' || type === 'vehicle' || ['unpaid', 'overdue', 'paid'].includes(record.status)), statusText = billCard ? billStatusText(type, record) : recordState(type, record);
    head.append(node('span', type === 'request' ? (kind === 'orders' && record.type === 'parking' ? '车辆服务' : requestTypes[record.type] || '申请') : type === 'vehicle' ? '车辆服务' : kind === 'orders' && /停车/.test(record.title || '') ? '车辆服务' : recordKinds[type].label, 'my-order-type'), node('span', statusText, 'my-order-status' + ((billCard ? billState(type, record) !== 'paid' : recordOpen(type, record)) ? '' : ' is-closed')));
    var body = node('div', undefined, 'my-order-body'); body.appendChild(node('strong', recordTitle(type, record)));
    infoBody(body, recordInfo(type, record));
    body.onclick = guard(function () { showMyRecord(kind, type, record); });
    var note = node('p', '', 'my-order-note'); note.setAttribute('role', 'status');
    var bar = node('div', undefined, 'my-order-actions'); recordButtons(type, record, note, false, kind).forEach(function (control) { bar.appendChild(control); });
    item.append(head, body, note, bar); container.appendChild(item);
  }
  function showMyRecord(kind, type, record) {
    if (!canKind(kind)) return window.__showMiniPage('role-denied');
    if (!recordRows(type, workflows.myRecords()).includes(record)) return window.__showMiniPage('role-denied');
    var wrap = node('div', undefined, 'my-order-detail');
    var banner = detailBanner(recordOpen(type, record), recordTitle(type, record), recordState(type, record), type === 'request' ? requestTypes[record.type] || '申请' : recordKinds[type].label, record.id);
    var info = node('dl', undefined, 'my-services-fields');
    // A bill keeps its approval trail (审批进度) and adds the payment state.
    var detailFields = recordFields(type, record); if (kind === 'orders' && (type === 'request' || type === 'vehicle')) detailFields = [['缴费状态', billStatusText(type, record)]].concat(detailFields);
    bodyFields(detailFields).forEach(function (pair) { info.append(node('dt', pair[0]), node('dd', pair[1] === undefined || pair[1] === '' ? '未填写' : String(pair[1]))); });
    var note = node('p', '', 'my-order-note'); note.setAttribute('role', 'status');
    var bar = node('div', undefined, 'my-order-actions'); recordButtons(type, record, note, true, kind).forEach(function (control) { bar.appendChild(control); });
    wrap.append(banner, info, contactCard((type === 'request' ? requestTypes[record.type] || '申请' : recordKinds[type].label) + ' · ' + recordTitle(type, record)), note); if (bar.children.length) wrap.appendChild(bar);
    detail.replaceChildren(wrap); if (window.lucide) window.lucide.createIcons();
    var title = type === 'request' ? (requestTypes[record.type] || '申请') + '详情' : recordKinds[type].detail;
    window.__setMiniRoute(detail.id, title, pages[kind].id); context = kind; window.__showMiniPage(detail.id);
  }
  function listRecords(container, kind, filter, records, groupsForKind) {
    var shown = 0;
    groupsForKind.forEach(function (group) {
      if (filter !== 'all' && filter !== group[0]) return;
      group[1].forEach(function (type) {
        var rows = recordRows(type, records).filter(function (record) { return (!group[2] || group[2].includes(record.type)) && !isHidden(type, record); });
        rows.forEach(function (record) { myCard(container, kind, type, record); shown++; });
      });
    });
    if (!shown) empty(container, '暂无相关记录。');
  }
  // 我的申请: level 1 = approval status, level 2 = service type (names match the homepage).
  // Withdrawn counts as closed with rejections, matching the property 审批 centre; a booked or cancelled venue counts as passed.
  // 申请阶段: 'execution'/'approved' 算已通过(审批完毕,有费用的流转到账单); '待'开头算待审批.
  function appStageForRecord(type, record) {
    if (type === 'request') {
      if (['rejected', 'withdrawn'].includes(record.status)) return 'rejected';
      if (['execution', 'approved'].includes(record.status)) return 'approved';
      return 'pending';
    }
    if (type === 'booking') {
      if (record.propertyStatus === 'rejected') return 'rejected';
      if (record.propertyStatus === 'pending') return 'pending';
      return 'approved';
    }
    var state = recordState(type, record);
    if (/已驳回|已撤回/.test(state)) return 'rejected';
    return /^待/.test(state) ? 'pending' : 'approved';
  }
  // Approved + priced records leave 我的申请 and become bills; a cancelled booking owes nothing and stays in 我的申请.
  function billable(type, record) {
    // Vehicle bills are decided by their own status: 待物业办理 already means every approval is done.
    if (type === 'vehicle') return record.type === 'parking' && Number(record.amount) > 0 && ['finance_pending', 'approved'].includes(record.status);
    if (appStageForRecord(type, record) !== 'approved') return false;
    if (type === 'request') return record.type === 'utilities' && Number(record.amount) > 0;
    if (type === 'booking') return Number(record.price) > 0 && record.status !== '已取消';
    return false;
  }
  function applications(container, filter, records) {
    var sub = subFilters.applications, shown = 0;
    var rows = function (type, match) { return recordRows(type, records).filter(function (r) { return !isHidden(type, r) && (!match || match(r)); }); };
    var groups = [
      ['meeting', [['request', meetingRequests(records)], ['booking', reservationRows('booking').filter(function (r) { return !isHidden('booking', r); })]]],
      ['renovation', [['request', rows('request', function (r) { return r.type === 'renovation'; })]]],
      ['vehicle', [['vehicle', rows('vehicle')]]],
      ['release', [['release', rows('release')]]],
      ['monitor', [['monitor', rows('monitor')]]],
      ['utilities', [['request', rows('request', function (r) { return r.type === 'utilities'; })]]]
    ];
    groups.forEach(function (group) {
      if (sub !== 'all' && sub !== group[0]) return;
      group[1].forEach(function (pair) {
        var type = pair[0];
        pair[1].forEach(function (record) {
          if (appStageForRecord(type, record) !== filter) return;
          // 已通过审批且有金额的记录流转到账单，不再保留在申请里；待审批的仍显示在申请。
          if (billable(type, record)) return;
          if (type === 'booking') orderCard(container, 'booking', record, 'applications'); else myCard(container, 'applications', type, record);
          shown++;
        });
      });
    });
    if (!shown) empty(container, '暂无相关申请记录。');
  }
  // 我的工单: level 1 = 待处理 / 待确认 / 已完成, level 2 = work order type (same stages as the property 工单 centre).
  function workStage(type, record) {
    var state = recordState(type, record) + ' ' + (record.status || '');
    if (/已完成|已关闭|已确认|completed|closed|confirmed/.test(state)) return 'done';
    if (/待结果确认|待确认结果|待反馈确认|awaiting_confirmation|confirmation|result/.test(state)) return 'confirm';
    return 'pending';
  }
  function workOrders(container, filter, records) {
    var shown = 0;
    [['repairs', 'repair'], ['special', 'special'], ['feedback', 'feedback']].forEach(function (pair) {
      if (subFilters['work-orders'] !== 'all' && subFilters['work-orders'] !== pair[0]) return;
      recordRows(pair[1], records).filter(function (record) { return !isHidden(pair[1], record) && workStage(pair[1], record) === filter; })
        .forEach(function (record) { myCard(container, 'work-orders', pair[1], record); shown++; });
    });
    if (!shown) empty(container, '暂无相关工单。');
  }
  // 我的账单: level 1 = payment status, level 2 = fee type; cancelled bills only appear under 全部.
  function billState(type, record) {
    // Approved requests with fee and confirmed bookings use their payment state.
    if (type === 'request') return record.status === 'approved' || record.feePaid ? 'paid' : 'pending';
    if (type === 'vehicle') return record.status === 'approved' ? 'paid' : 'pending';
    if (type === 'booking') { if (record.status === '已取消') return 'closed'; return record.feePaid ? 'paid' : 'pending'; }
    if (['unpaid', 'overdue', 'paid'].includes(record.status) && record.due !== undefined) return record.status === 'paid' ? 'paid' : record.status === 'overdue' || Date.parse(record.due + 'T23:59:59+08:00') < Date.now() ? 'overdue' : 'pending';
    var state = recordState(type, record);
    if (/已取消|已驳回|已撤回/.test(state)) return 'closed';
    if (/已缴费|已完成|已支付|已取餐|已核销/.test(state) || record.feePaid || record.status === 'paid') return 'paid';
    if (record.paymentStatus === 'overdue' || /已逾期/.test(state) || record.status === 'overdue') return 'overdue';
    return 'pending';
  }
  // A record is a bill only when it has an amount to pay; registrations and orders still being confirmed are not.
  function isBill(type, record) {
    if (type === 'parking') return Number(record.amount) > 0;
    if (type === 'dining') return Number(record.amount) > 0 && !/待餐厅确认|已取消/.test(recordState(type, record));
    return true;
  }
  function orders(container, filter) {
    var records = workflows.myRecords(), shown = 0;
    // Only payable items are bills: priced dining orders, approved fee requests, priced bookings and,
    // for the enterprise admin only, company-level bills (water/electricity, company parking) so staff never pay them twice.
    ['dining', 'parking', 'utilities'].forEach(function (type) {
      if (subFilters.orders !== 'all' && subFilters.orders !== type) return;
      if (type === 'utilities' && role() !== 'admin') return;
      recordRows(type, records).filter(function (record) {
        return isBill(type, record) && !isHidden(type, record) && billState(type, record) === filter;
      }).forEach(function (record) { myCard(container, 'orders', type, record); shown++; });
    });
    // Company parking bills (企业停车费) are 车辆服务 bills, visible to the enterprise admin.
    var wfData = workflows.propertyData ? workflows.propertyData() : {};
    if (role() === 'admin') (wfData.bills || []).filter(function (b) { return b.company === company && !b.sample && (b.category === 'parking' || /停车/.test(b.title || '')); }).forEach(function (b) {
      if (subFilters.orders !== 'all' && subFilters.orders !== 'parking') return;
      if (isHidden('utilities', b) || billState('utilities', b) !== filter) return;
      myCard(container, 'orders', 'utilities', b); shown++;
    });
    // 已通过审批且有金额的水电缴费申请流转到账单，保留审批流程信息（停车费用代缴走车辆服务）。
    recordRows('request', records).filter(function (r) { return r.type === 'utilities' && billable('request', r); }).forEach(function (r) {
      if (subFilters.orders !== 'all' && subFilters.orders !== 'utilities') return;
      if (isHidden('request', r) || billState('request', r) !== filter) return;
      myCard(container, 'orders', 'request', r); shown++;
    });
    // Approved priced vehicle requests (停车费用代缴) are 车辆服务 bills; property-initiated ones arrive here directly.
    recordRows('vehicle', records).filter(function (r) { return billable('vehicle', r); }).forEach(function (r) {
      if (subFilters.orders !== 'all' && subFilters.orders !== 'parking') return;
      if (isHidden('vehicle', r) || billState('vehicle', r) !== filter) return;
      myCard(container, 'orders', 'vehicle', r); shown++;
    });
    // 已通过物业审批且有价格的场地预定也流转到账单。
    reservationRows('booking').filter(function (r) { return billable('booking', r); }).forEach(function (r) {
      if (subFilters.orders !== 'all' && subFilters.orders !== 'venue') return;
      if (isHidden('booking', r) || billState('booking', r) !== filter) return;
      orderCard(container, 'booking', r, 'orders');
      shown++;
    });
    if (!shown) empty(container, '暂无相关账单。');
  }
  function resState(type, record) {
    // Level-1 status: upcoming (not yet started/expired) vs expired (past/cancelled).
    var state = reservationState(type, record);
    if (/已取消|已结束|已过期|已参加|已到访|arrived/.test(state) || record.cancelled || record.arrived) return 'expired';
    var dateStr = record.activityDate ? String(record.activityDate).slice(0, 10) : '';
    if (type === 'activity' && dateStr) return Date.parse(dateStr + 'T23:59:59+08:00') < Date.now() ? 'expired' : 'upcoming';
    if (type === 'visitor') {
      // The visit date may sit in detail, a 到访时间 field, or the visit time fields; the first date found decides.
      var sources = [record.detail, record.visitDate, record.visitTime, record.time].concat((record.fields || []).filter(function (pair) { return /到访时间|来访时间|日期/.test(pair[0]); }).map(function (pair) { return pair[1]; }));
      var visitDate = sources.map(function (value) { return String(value || '').match(/(\d{4}-\d{2}-\d{2})/); }).find(Boolean);
      return visitDate && Date.parse(visitDate[1] + 'T23:59:59+08:00') < Date.now() ? 'expired' : 'upcoming';
    }
    return 'upcoming';
  }
  function reservations(container, filter, records) {
    var shown = 0;
    [['visitors', 'visitor'], ['activities', 'activity']].forEach(function (pair) {
      var key = pair[0], type = pair[1];
      if (subFilters.reservations !== 'all' && subFilters.reservations !== key) return;
      var rows = reservationRows(type).filter(function (r) { return !isHidden(type, r) && resState(type, r) === filter; });
      rows.forEach(function (r) { orderCard(container, type, r); shown++; });
    });
    if (!shown) empty(container, '暂无相关预约记录。');
  }
  function bookedApproval(id) { return store.data.bookings.some(function (b) { return b.approvalId === id && b.status !== '已取消'; }); }
  function meetingRequests(records) { return recordRows('request', records).filter(function (record) { return record.type === 'meeting' && !bookedApproval(record.id) && !isHidden('request', record); }); }
  function journeyStatus(record) { return String(record.status || record.state || '已提交').replace(/\s*·\s*(本地演示|示例)$/, ''); }
  function journeyCopy(record) { return record.detail || record.note || record.activityTitle || record.title || '暂无详情'; }
  function render(kind) {
    var group = groups[kind], container = pages[kind], filter = filters[kind];
    container.classList.add('my-services-list'); container.replaceChildren();
    var tabs = node('div', undefined, 'my-services-filters'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', group.title + '分类');
    (group.types ? group.filters : [['all', '全部']].concat(group.filters)).forEach(function (item) {
      var tab = button(item[1], guard(function () { filters[kind] = item[0]; render(kind); pages[kind].querySelector('[data-my-filter="' + item[0] + '"]').focus({ preventScroll: true }); }));
      tab.dataset.myFilter = item[0]; tab.setAttribute('aria-pressed', String(filter === item[0])); tabs.appendChild(tab);
    });
    // Two sibling blocks: the tab bar and the record list, so each can be targeted on its own.
    var content = node('div', undefined, 'my-services-content'); content.setAttribute('role', 'region'); content.setAttribute('aria-label', group.title + '列表');
    container.append(tabs);
    if (group.types) {
      // Second-level type chips sit below the status tabs.
      var chips = node('div', undefined, 'my-bill-types'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', group.title + '类型');
      [['all', '全部']].concat(group.types).forEach(function (item) {
        var chip = button(item[1], guard(function () { subFilters[kind] = item[0]; render(kind); pages[kind].querySelector('[data-bill-type="' + item[0] + '"]').focus({ preventScroll: true }); }));
        chip.dataset.billType = item[0]; chip.setAttribute('aria-pressed', String(subFilters[kind] === item[0])); chips.appendChild(chip);
      });
      container.appendChild(chips);
    }
    container.appendChild(content);
    var records = workflows.myRecords();
    if (kind === 'applications') applications(content, filter, records);
    else if (kind === 'reservations') reservations(content, filter, records);
    else if (kind === 'work-orders') workOrders(content, filter, records);
    else orders(content, filter);
  }
  function open(kind) {
    if (!canKind(kind)) return window.__showMiniPage('role-denied');
    if (!groups[kind]) return;
    context = kind; window.__showMiniPage(pages[kind].id);
  }
  var originalShow = window.__showMiniPage, originalCan = window.__canMiniPage;
  function isMyPage(id) { return id === detail.id || Object.keys(pages).some(function (kind) { return pages[kind].id === id; }); }
  function kindOf(id) { return id === detail.id ? context : Object.keys(pages).find(function (key) { return pages[key].id === id; }); }
  window.__canMiniPage = function (id) { return (!isMyPage(id) || canKind(kindOf(id))) && originalCan(id); };
  window.__showMiniPage = function (id) {
    if (isMyPage(id) && !canKind(kindOf(id))) return originalShow('role-denied');
    var kind = Object.keys(pages).find(function (key) { return pages[key].id === id; });
    if (kind) { render(kind); context = kind; }
    return originalShow(id);
  };
  // Native back handlers close over the old router; intercept only our category return points.
  document.addEventListener('click', function (event) {
    var current = active(); if (!current) return;
    if (event.target.closest('[data-page="feedback"]')) feedbackOwner = null;
    if (event.target.closest('#feedback .primary-button') && feedbackOwner && profile.dataset.role !== feedbackOwner) {
      event.preventDefault(); event.stopImmediatePropagation(); window.__showMiniPage('role-denied'); return;
    }
    if (!event.target.closest('.nav-back') || !context) return;
    var returns = {
      applications: ['role-request-detail', 'role-request-form', 'role-meeting-applications', 'meeting', 'my-bookings'],
      reservations: ['role-visitors', 'enterprise-activities'],
      'work-orders': ['role-repairs', 'feedback', 'my-service-detail'],
      orders: ['restaurant', 'vehicle']
    };
    if (current.id === detail.id || returns[context].includes(current.id)) {
      event.preventDefault(); event.stopImmediatePropagation(); open(context);
    } else if (isMyPage(current.id)) context = null;
  }, true);
  window.addEventListener('park-feedback-saved', function () {
    if (context === 'work-orders' && feedbackOwner === role() && employee()) showMyRecord('work-orders', 'feedback', ownFeedback()[0]);
  });
  function refresh() { var current = active(); if (employee() || role() === 'property') { var kind = Object.keys(pages).find(function (key) { return current && pages[key].id === current.id; }); if (kind) render(kind); } }
  window.addEventListener('mini-records-change', refresh);
  new MutationObserver(function () {
    var current = active();
    if (current && ['home', 'profile', 'spaces', 'messages', 'enterprise-services'].includes(current.id)) context = null;
  }).observe(screen, { subtree: true, attributes: true, attributeFilter: ['class'] });
  new MutationObserver(function () {
    // Clear rendered records on every role switch so one role never sees another's data.
    context = null;
    Object.keys(pages).forEach(function (kind) { pages[kind].replaceChildren(); resetFilter(kind); }); detail.replaceChildren();
    if (active() && isMyPage(active().id)) originalShow('profile');
    if (employee()) workflows.refresh();
  }).observe(profile, { attributes: true, attributeFilter: ['data-role'] });
  // Feedback is still written on the native form; returning lands on the saved record's detail.
  function openFeedback() { if (!employee()) return window.__showMiniPage('role-denied'); context = 'work-orders'; feedbackOwner = role(); window.__showMiniPage('feedback'); }
  window.__myServices = { open: open, refresh: refresh, openFeedback: openFeedback, contactCard: contactCard };
  workflows.refresh();
})();
