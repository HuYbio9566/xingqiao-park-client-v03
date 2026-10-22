(function () {
  'use strict';
  var assets = 'miniprogram/assets/enterprise/';
  var journeyKey = 'v4:park-service-journeys-v1';
  var journeyState = { activityRegistrations: [], diningOrders: [], parkingOrders: [], specialTickets: [], monitorRequests: [] };
  var journeySamples = {
    diningOrders: [{ id: 'DINING-001', owner: 'employee', company: '北京星桥科技', sample: true, title: '会议茶歇套餐', status: '已登记', detail: 'A座 2F · 2026-10-20 12:00 · 8份', note: '' }],
    parkingOrders: [{ id: 'PARKING-001', owner: 'employee', company: '北京星桥科技', sample: true, title: '访客停车登记', status: '待核对', detail: '京A12345 · 2026-10-20 · A座访客', note: '' }],
    specialTickets: [{ id: 'SPECIAL-001', owner: 'employee', company: '北京星桥科技', sample: true, title: '会议室布置协助', status: '待确认', detail: 'A座 2F · 会议桌椅与投屏检查', note: '' }],
    monitorRequests: [{ id: 'MONITOR-001', owner: 'employee', company: '北京星桥科技', sample: true, title: '访客时段录像调取申请', status: '待授权', detail: 'A座大堂 · 2026-10-20 13:30-14:00', note: '批准后按园区规则线下对接。' }]
  };
  try {
    var savedJourneys = JSON.parse(localStorage.getItem(journeyKey));
    if (savedJourneys) Object.keys(journeyState).forEach(function (name) { if (Array.isArray(savedJourneys[name])) journeyState[name] = savedJourneys[name]; });
  } catch (error) {}
  function currentRole() { return document.getElementById('profile') && document.getElementById('profile').dataset.role || 'guest'; }
  function currentCompany() { return '北京星桥科技'; }
  function canRecord(record, owner, company) {
    if (company && record.company && record.company !== company) return false;
    // Property staff handle authorized records for the whole park company.
    return owner === 'property' ? true : record.owner === owner;
  }
  function journeyRecords(name, owner, company) {
    return (journeySamples[name] || []).concat(journeyState[name] || []).filter(function (record) { return !owner || canRecord(record, owner, company); });
  }
  function persistJourneys(change) {
    var previous = JSON.stringify(journeyState); change();
    try { localStorage.setItem(journeyKey, JSON.stringify(journeyState)); } catch (error) { journeyState = JSON.parse(previous); return false; }
    window.dispatchEvent(new Event('service-journeys-change')); window.dispatchEvent(new Event('mini-records-change')); return true;
  }
  function updateJourney(name, id, change) {
    if (!journeyState[name]) return false;
    var item = journeyState[name].find(function (record) { return record.id === id; });
    if (!item || !canRecord(item, currentRole(), currentCompany())) return false;
    return persistJourneys(function () { change(item); });
  }
  function createDiningOrder(input) {
    input = input || {};
    if (!['employee', 'admin'].includes(currentRole())) return { error: '请先切换到企业员工或企业管理员身份。' };
    if (!String(input.menu || '').trim() || !Number.isInteger(Number(input.quantity)) || Number(input.quantity) < 1 || !String(input.pickup || '').trim()) return { error: '请填写套餐、数量和取餐时间。' };
    var record = {
      id: 'DINING-' + Date.now().toString(36), owner: currentRole(), company: currentCompany(), sample: false,
      title: String(input.menu).trim(), status: '待餐厅确认', detail: String(input.pickup).trim() + ' · ' + Number(input.quantity) + '份',
      menu: String(input.menu).trim(), quantity: Number(input.quantity), pickup: String(input.pickup).trim(),
      propertyAuthorized: input.propertyAuthorized === true, note: '', createdAt: new Date().toISOString(), history: ['提交餐饮订单']
    };
    return persistJourneys(function () { journeyState.diningOrders.unshift(record); }) ? { record: record } : { error: '订单保存失败，请检查浏览器存储设置后重试。' };
  }
  function registerActivity(record, values) {
    var owner = currentRole(); if (!['employee', 'admin'].includes(owner)) return { error: '请先切换到企业员工或企业管理员身份。' };
    var existing = journeyState.activityRegistrations.find(function (item) { return item.activityId === record[0] && canRecord(item, owner, currentCompany()); });
    if (existing) return { record: existing };
    var item = { id: 'ACT-' + Date.now().toString(36), activityId: record[0], activityTitle: record[0], owner: owner, company: currentCompany(), name: values.name, phone: values.phone, attendees: values.attendees, companyName: values.companyName, position: values.position, note: values.note, status: '已报名', createdAt: new Date().toISOString() };
    return persistJourneys(function () { journeyState.activityRegistrations.unshift(item); }) ? { record: item } : { error: '报名保存失败，请检查浏览器存储设置后重试。' };
  }
  window.__serviceJourneys = {
    key: journeyKey,
    getRecords: journeyRecords,
    records: journeyRecords,
    state: function () { return journeyState; },
    registerActivity: registerActivity,
    update: updateJourney,
    updateRecord: updateJourney,
    createDiningOrder: createDiningOrder,
    activityRegistrations: function (owner, company) { return journeyRecords('activityRegistrations', owner, company); },
    create: function (name, record) {
      if (!journeyState[name] || !record) return false;
      record.owner = record.owner || currentRole(); record.company = record.company || currentCompany();
      return persistJourneys(function () { journeyState[name].unshift(record); });
    }
  };
  // All records and dates are editorial demo data, not official announcements.
  var records = [
    ['中小企业数字化转型分享会', '数字化', '2026-10-28', 'event-digital.jpg', '从业务流程出发，交流企业数字化升级的实际方法。', '看清流程，再选择工具', '数字化转型可以从一个具体问题开始：订单信息反复录入、项目进度缺少统一记录，或库存数据更新不及时。分享会围绕这些常见场景，讨论如何梳理现有流程、识别重复劳动，把技术投入与实际工作目标对应起来。', '小范围验证实施效果', '企业可以先选取一个部门或一条业务链路开展试点，明确负责人、数据来源与操作规范。交流环节将讨论试点如何记录问题、收集员工反馈，再决定是否扩大范围，避免把上线工具本身当作转型完成。'],
    ['科创企业投融资对接会', '金融', '2026-10-25', 'event-finance.jpg', '梳理融资需求，促进企业与服务机构的双向沟通。', '把融资需求说清楚', '资金用途、投入周期和业务进展是对接沟通的重要基础。活动以企业需求梳理为主线，引导企业整理产品阶段、客户结构和现金流安排，形成便于交流的项目介绍，不以估值或融资金额作为唯一展示重点。', '理性评估不同方案', '股权融资、银行信贷与其他融资方式具有不同条件和成本。企业应结合经营阶段审慎评估，并在后续沟通中核实机构资质与条款。活动仅提供信息交流场景，不承诺融资结果，也不代替专业尽职调查。'],
    ['企业政策申报交流日', '政策', '2026-10-23', 'news-building.jpg', '围绕条件核对、材料准备和申报节奏开展交流。', '先核对适用条件', '政策申报需以正式文件为准，尤其关注申报主体、行业范围、时间窗口以及重复支持限制。交流日安排企业分享准备过程中的疑问，帮助形成核对清单，具体申请资格以正式文件为准。', '建立材料整理习惯', '企业可按项目统一整理资质、财务和业务证明材料，并记录文件来源与有效期。提交前再次确认官方渠道要求，保持申报内容与真实经营情况一致；遇到不明确的条款，应向发布部门或授权服务渠道核实。'],
    ['园区企业合作交流沙龙', '交流', '2026-10-21', 'event-finance.jpg', '介绍产品与能力，寻找产业链上下游的合作切入点。', '围绕具体需求介绍企业', '交流不只展示企业规模，也鼓励参与者说明当前服务能力、交付边界和希望寻找的合作伙伴。通过产品介绍与需求沟通，让企业更快判断彼此是否具备共同推进项目的基础。', '让沟通形成后续行动', '有合作意向的企业可整理需求、联系人和下一步沟通事项。项目范围、报价、交付周期及信息保密要求应由双方另行确认，园区交流本身不构成采购承诺或合作担保。'],
    ['知识产权保护专题分享', '企业', '2026-10-18', 'news-building.jpg', '从研发记录到品牌使用，建立日常知识产权管理意识。', '重视过程资料留存', '研发方案、版本记录和合作文件是企业管理知识产权的重要基础。专题分享围绕资料归档、成果归属和对外披露边界展开，提醒团队在产品研发和合作过程中明确权利与责任。', '识别常见使用风险', '图片、字体、软件和商标的使用均可能涉及授权要求。企业应检查来源与使用范围，保留授权凭证。具体纠纷、专利申请或合同问题应由具备资质的专业人员结合实际资料提供意见。'],
    ['高新人才服务交流会', '人才', '2026-10-16', 'event-digital.jpg', '交流人才需求、招聘协作和入职支持的组织方法。', '从岗位需求出发', '人才服务交流会关注企业在招聘中遇到的实际问题，包括岗位职责不清、能力要求过宽以及候选人沟通成本较高。参与企业可结合业务计划讨论岗位设计，把招聘需求与团队分工对应起来。', '完善人才支持流程', '入职指引、工作资料和协作规范能帮助新员工更快适应。人才政策相关条件仍需查询正式文件，活动介绍不代表补贴资格或申请结果。涉及个人资料时，应遵循必要、适度的收集与使用原则。'],
    ['绿色办公与节能实践工作坊', '园区', '2026-10-14', 'banner-building.jpg', '从照明、空调与办公习惯入手，讨论可执行的节能措施。', '找到可改进的日常环节', '绿色办公可以从公共照明、空调使用和闲置设备管理等环节着手。工作坊以场景讨论为主，鼓励企业整理办公区域的使用习惯，并与物业沟通设备运行和维护边界。', '持续记录与复盘', '节能措施应结合舒适度、安全要求和实际使用需求评估。企业可安排周期性检查，记录调整前后的情况，再决定是否继续实施；实际节能效果以测量数据为准。'],
    ['企业财税规范交流课堂', '企业', '2026-10-12', 'news-city.jpg', '围绕票据、费用与业务凭证，交流日常管理规范。', '保持业务与凭证一致', '财税规范依赖真实、完整的业务记录。课堂围绕合同、付款、发票和验收资料之间的对应关系展开，帮助企业识别资料缺失或流转不清的问题，形成适合自身业务的整理流程。', '明确专业咨询边界', '不同业务的处理方式需结合现行规定与企业情况确定。活动内容不构成具体税务建议，实际申报、优惠适用或争议处理应咨询专业人员，并以主管部门要求为准。'],
    ['创新项目展示与经验交流', '创新', '2026-10-09', 'event-digital.jpg', '展示产品进展，分享从需求验证到项目交付的经验。', '用具体场景介绍成果', '项目展示鼓励团队说明产品面向谁、解决什么问题，以及当前已验证的能力。除了展示功能，也可以分享用户反馈、迭代过程和尚待解决的限制，帮助交流对象形成完整认识。', '保护成果与沟通边界', '公开展示前，团队应确认素材授权、客户信息和技术保密范围。交流反馈可用于完善产品，但不代替正式验收或投资判断；后续合作需另行约定范围、交付标准与责任。'],
    ['园区安全与应急协作交流', '园区', '2026-10-06', 'event-finance.jpg', '明确联络与协作流程，提升企业对园区安全安排的了解。', '熟悉日常联络方式', '园区安全协作涉及企业联系人、物业服务和公共区域使用规则。交流围绕人员联络、异常反馈和信息通知展开，鼓励企业保持联系人信息有效，并向员工说明正式通知的获取渠道。', '遵循现场指引', '演练或突发情况应遵从园区正式安排与现场工作人员指引，不占用通道，不擅自操作公共设备。演练时间、集合地点和应急联系方式以园区正式公告为准。']
  ];
  var activitySettings = window.enterpriseActivitySettings || {};
  var fieldDefs = {
    name: { label: '报名人', type: 'text', required: true },
    phone: { label: '手机号', type: 'tel', required: true },
    attendees: { label: '参加人数', type: 'number', required: true },
    companyName: { label: '企业名称', type: 'text', required: true },
    position: { label: '职务', type: 'text', required: false },
    note: { label: '备注', type: 'textarea', required: false }
  };
  function setting(record) {
    var item = activitySettings[record[0]] || {};
    var fields = ['name', 'phone'].concat((item.fields || ['attendees']).filter(function (key) { return key !== 'name' && key !== 'phone'; }));
    return { mode: item.mode === 'onsite' ? 'onsite' : 'signup', deadline: item.deadline || record[2] + ' 18:00', location: item.location || '', fields: fields, maxAttendees: item.maxAttendees || 20 };
  }
  function modeLabel(s) { return s.mode === 'onsite' ? '现场参与' : '报名参与'; }
  function deadlineLabel(s, short) { return (s.mode === 'onsite' ? '活动截止 ' : '报名截止 ') + (short ? s.deadline.slice(5) : s.deadline); }
  function isClosed(s) { return new Date(s.deadline.replace(' ', 'T') + ':00+08:00') < new Date(); }
  var screen = document.querySelector('.screen');
  var home = document.getElementById('enterprise-services');
  home.querySelectorAll('.enterprise-gpt-event').forEach(function (card) {
    var record = records.find(function (r) { return r[0] === card.dataset.enterpriseDetail; });
    var config = setting(record), badge = card.querySelector('.enterprise-gpt-event-img i');
    card.querySelector('small').textContent = deadlineLabel(config, true);
    badge.textContent = modeLabel(config);
    badge.className = config.mode === 'onsite' ? 'is-onsite' : '';
  });
  var list = document.createElement('section');
  list.id = 'enterprise-activities'; list.className = 'hidden';
  var detail = document.createElement('section');
  detail.id = 'enterprise-activity-detail'; detail.className = 'hidden';
  screen.append(list, detail);
  window.__setMiniRoute(list.id, '园区活动', 'enterprise-services');
  window.__setMiniRoute(detail.id, '活动详情', list.id);
  var listPosition = 0;
  function element(tag, text, className) {
    var el = document.createElement(tag);
    if (text) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function photo(record) {
    var img = element('img'); img.src = assets + record[3];
    img.alt = record[0]; return img;
  }
  function registrationBlock(article, record) {
    var config = setting(record);
    var block = element('div', '', 'enterprise-activity-registration');
    block.append(element('strong', modeLabel(config)));
    if (config.mode === 'onsite') {
      block.append(element('p', '本活动为现场参与，无需提前报名，请于 ' + config.deadline + ' 前到场' + (config.location ? '（' + config.location + '）' : '') + '。', 'enterprise-activity-registration-copy'));
      return block;
    }
    block.append(element('p', '报名截止：' + config.deadline + '。提交后请留意园区通知，名额以最终确认为准。', 'enterprise-activity-registration-copy'));
    var owner = currentRole(), existing = (window.__serviceJourneys.activityRegistrations(owner, currentCompany()) || []).find(function (item) { return item.activityId === record[0]; });
    if (existing) {
      block.append(element('p', existing.status + (existing.attendees ? ' · ' + existing.attendees + '人' : '') + ' · 报名人：' + existing.name, 'enterprise-activity-registration-status'));
      return block;
    }
    var open = element('button', '立即报名', 'role-primary enterprise-activity-signup'); open.type = 'button';
    if (isClosed(config)) { open.textContent = '报名已截止'; open.disabled = true; block.append(open); return block; }
    if (!['employee', 'admin'].includes(owner)) {
      block.append(element('p', '切换到企业员工或企业管理员身份后可提交报名。', 'enterprise-activity-registration-status'));
      return block;
    }
    var form = element('form', '', 'enterprise-activity-registration-form'); form.hidden = true;
    var inputs = {};
    config.fields.forEach(function (key) {
      var def = fieldDefs[key]; if (!def) return;
      var wrapper = element('label', def.label + (def.required ? '' : '（选填）'));
      var input = element(def.type === 'textarea' ? 'textarea' : 'input');
      input.name = key; input.required = def.required;
      if (def.type !== 'textarea') input.type = def.type;
      if (key === 'name') input.value = owner === 'employee' ? '王晓明' : '唐慧丽';
      if (key === 'companyName') input.value = currentCompany();
      if (key === 'attendees') { input.value = '1'; input.min = '1'; input.max = String(config.maxAttendees); }
      if (key === 'phone') { input.setAttribute('inputmode', 'numeric'); input.maxLength = 11; input.placeholder = '11位手机号'; }
      if (key === 'note') input.maxLength = 200;
      wrapper.append(input); form.append(wrapper); inputs[key] = input;
    });
    var status = element('p', '', 'enterprise-activity-registration-status'); status.setAttribute('role', 'status');
    var submit = element('button', '提交报名', 'role-primary'); submit.type = 'submit'; form.append(submit, status);
    open.addEventListener('click', function () { form.hidden = false; open.hidden = true; inputs.phone.focus(); });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var values = {};
      var missing = Object.keys(inputs).find(function (key) { values[key] = inputs[key].value.trim(); return fieldDefs[key].required && !values[key]; });
      if (missing) { status.textContent = '请填写' + fieldDefs[missing].label + '。'; return; }
      if (!/^1\d{10}$/.test(values.phone)) { status.textContent = '请输入11位手机号。'; return; }
      values.attendees = inputs.attendees ? Number(values.attendees) : 1;
      if (!Number.isInteger(values.attendees) || values.attendees < 1 || values.attendees > config.maxAttendees) { status.textContent = '参加人数需在 1 到 ' + config.maxAttendees + ' 人之间。'; return; }
      var result = window.__serviceJourneys.registerActivity(record, values);
      if (result.error) { status.textContent = result.error; return; }
      block.replaceChildren(element('strong', modeLabel(config)), element('p', result.record.status + ' · ' + result.record.attendees + '人。', 'enterprise-activity-registration-status'), element('p', '报名成功，活动开始前请携带手机到现场签到。', 'enterprise-activity-registration-copy'));
    });
    block.append(open, form); return block;
  }
  function openDetail(record, fromList) {
    listPosition = fromList ? screen.scrollTop : 0;
    detail.replaceChildren();
    var article = element('article', '', 'enterprise-activity-article');
    article.append(element('h1', record[0]), element('p', '活动日期 ' + record[2] + ' · ' + modeLabel(setting(record)) + ' · ' + deadlineLabel(setting(record)), 'enterprise-activity-meta'), photo(record), element('p', record[4], 'enterprise-activity-lead'));
    for (var i = 5; i < record.length; i += 2) article.append(element('h2', record[i]), element('p', record[i + 1]));
    article.append(registrationBlock(article, record));
    detail.appendChild(article);
    window.__setMiniRoute(detail.id, '活动详情', fromList ? list.id : 'enterprise-services');
    window.__showMiniPage(detail.id);
  }
  records.forEach(function (record) {
    var card = element('button', '', 'enterprise-activity-card'); card.type = 'button';
    var copy = element('span', '', 'enterprise-activity-copy');
    copy.append(element('h2', record[0]), element('span', record[4], 'enterprise-activity-summary'), element('span', modeLabel(setting(record)) + ' · ' + deadlineLabel(setting(record), true), 'enterprise-activity-meta'));
    card.append(photo(record), copy);
    card.addEventListener('click', function () { openDetail(record, true); });
    list.appendChild(card);
  });
  home.addEventListener('click', function (event) {
    var all = event.target.closest('[data-enterprise-list="园区活动"]');
    var item = event.target.closest('.enterprise-gpt-event[data-enterprise-detail]');
    if (!all && !item) return;
    event.stopImmediatePropagation();
    if (all) { listPosition = 0; window.__showMiniPage(list.id); }
    else openDetail(records.find(function (r) { return r[0] === item.dataset.enterpriseDetail; }), false);
  }, true);
  // The shared router resets scroll on return; restore the list's previous reading position.
  new MutationObserver(function () {
    if (!list.classList.contains('hidden')) screen.scrollTop = listPosition;
  }).observe(list, { attributes: true, attributeFilter: ['class'] });
})();
