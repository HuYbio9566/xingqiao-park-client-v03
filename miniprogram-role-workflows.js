/* Local workflow state; server authorization, payment and delivery are separate integrations. */
(function () {
  'use strict';
  var profile = document.getElementById('profile'), screen = document.querySelector('.screen');
  var company = '北京星桥科技', key = 'park-role-workflows-v1';
  var identities = { employee: '王晓明', admin: '唐慧丽', property: '李师傅', guest: '访客用户', unauthenticated: '未登录用户' };
  // 停车费用代缴 lives in 车辆服务 (vehicleRequests); the old request type 'parking' is no longer offered.
  var types = { meeting: '场地预定申请', utilities: '水电缴费', renovation: '装修申请' };
  var meetingApplicationId = null;
  var approvalTab = 'pending';
  var renovationTab = 'all';
  var state = {
    requests: [
      { id: 'SQ1002', type: 'renovation', owner: 'employee', company: company, detail: 'A座605室 · 办公室隔断调整 · 2026-10-20至2026-10-25 · 星桥装饰施工团队', amount: 0, status: 'enterprise', history: ['王晓明提交申请'] }
    ],
    bills: [
      { id: 'ZD1001', company: company, title: '9月水电费', amount: 1860, due: '2026-10-05', status: 'unpaid', reminded: false },
      { id: 'ZD1002', company: company, title: '10月企业停车费', amount: 600, due: '2026-10-10', status: 'unpaid', reminded: false },
      { id: 'ZD1003', company: '京华创新科技', title: '9月水电费', amount: 920, due: '2026-10-05', status: 'unpaid', reminded: false }
    ],
    repairs: [{ id: 'WX1001', owner: 'employee', company: company, title: '空调制冷异常', detail: 'A座605室 · 空调无法正常制冷，请安排检修。', status: 'pending', history: ['王晓明提交报修'] }],
    visitors: [],
    releaseRequests: [],
    vehicles: [],
    vehicleRequests: [],
    monitorRequests: [],
    specialTickets: [],
    activityRegistrations: [],
    notices: []
  };
  try { var saved = JSON.parse(localStorage.getItem(key)); if (saved && ['requests', 'bills', 'repairs'].every(function (name) { return Array.isArray(saved[name]); })) { state = saved; if (!Array.isArray(state.visitors)) state.visitors = []; if (!Array.isArray(state.releaseRequests)) state.releaseRequests = []; if (!Array.isArray(state.vehicles)) state.vehicles = []; if (!Array.isArray(state.vehicleRequests)) state.vehicleRequests = []; if (!Array.isArray(state.monitorRequests)) state.monitorRequests = []; if (!Array.isArray(state.specialTickets)) state.specialTickets = []; if (!Array.isArray(state.activityRegistrations)) state.activityRegistrations = []; if (!Array.isArray(state.notices)) state.notices = []; } } catch (error) {}
  // Add preview fixtures once without replacing existing work orders or their progress.
  if (!state.repairs.some(function (r) { return r.id === 'WX-007'; })) {
    [
      ['WX-001', '照明灯具闪烁', 'A座607室 · 两盏顶灯持续闪烁，影响办公。', 'pending', ['王晓明提交报修']],
      ['WX-002', '茶水间水龙头漏水', 'A座6层茶水间 · 水龙头关闭后仍滴水，请检修密封件。', 'pending', ['王晓明提交报修']],
      ['WX-003', '会议室投影无法启动', 'A座2层会议室 · 投影仪开机无响应，已安排设备检测。', 'processing', ['王晓明提交报修', '李师傅：已接单，正在检查电源模块']],
      ['WX-004', '办公室门锁卡顿', 'A座608室 · 门锁转动困难，正在更换锁芯。', 'processing', ['王晓明提交报修', '李师傅：已接单，正在更换锁芯']],
      ['WX-005', '网络面板松动', 'A座605室 · 工位网络面板松动，已加固并测试连接。', 'confirmation', ['王晓明提交报修', '李师傅：面板已加固，网络测试正常，等待报修人确认']],
      ['WX-006', '卫生间排水堵塞', 'A座6层卫生间 · 排水缓慢，疏通后已恢复正常。', 'completed', ['王晓明提交报修', '李师傅：已完成管道疏通和排水测试', '王晓明：确认已解决']],
      ['WX-007', '窗户把手损坏', 'A座605室 · 窗户把手已更换，开合正常。', 'completed', ['王晓明提交报修', '李师傅：已更换把手并检查窗框', '王晓明：确认已解决']]
    ].forEach(function (item) {
      if (!state.repairs.some(function (r) { return r.id === item[0]; })) state.repairs.push({ id: item[0], owner: 'employee', company: company, title: item[1], detail: item[2], status: item[3], history: item[4], sample: true });
    });
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (error) {}
  }
  if (!state.requests.some(function (r) { return r.id === 'ZX-006'; })) {
    [
      ['ZX-001', 'A座609室 · 会议区玻璃隔断安装 · 2026-10-20至2026-10-23 · 星桥装饰团队', 'property', false, ''],
      ['ZX-002', 'B座302室 · 办公室照明线路调整 · 2026-10-22至2026-10-24 · 京华电气团队', 'property', false, ''],
      ['ZX-003', 'A座606室 · 墙面翻新及地毯更换 · 2026-10-25至2026-10-28 · 星桥装饰团队', 'property', true, '已受理，正在核查施工材料及消防通道'],
      ['ZX-004', 'C座401室 · 茶水间给排水改造 · 2026-10-26至2026-10-30 · 云启施工团队', 'property', true, '已受理，正在复核给排水图纸及施工时段'],
      ['ZX-005', 'B座305室 · 办公区软装调整 · 2026-10-15至2026-10-17 · 星桥装饰团队', 'approved', false, '物业审批通过 · 已核实施工范围与安全措施'],
      ['ZX-006', 'C座402室 · 消防通道隔断调整 · 2026-10-18至2026-10-20 · 云启施工团队', 'rejected', false, '物业审批驳回 · 隔断占用消防通道，请调整方案']
    ].forEach(function (item) {
      if (state.requests.some(function (r) { return r.id === item[0]; })) return;
      var history = ['王晓明提交申请', '唐慧丽：企业审批通过'];
      if (item[4]) history.push('李师傅：' + item[4]);
      state.requests.push({ id: item[0], type: 'renovation', owner: 'employee', company: company, detail: item[1], amount: 0, status: item[2], propertyReview: item[3] ? 'processing' : '', history: history, sample: true });
    });
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (error) {}
  }

  // Enterprise-approvals fixtures: meeting, utilities, renovation, vehicle (enterprise_pending/rejected).
  if (!state.requests.some(function (r) { return r.id === 'SQ-AP-001'; })) {
    var apDay = function (offset) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offset * 86400000)); };
    [
      // Pending enterprise approval: meeting and utilities
      ['SQ-AP-001', 'meeting', '客户方案评审会 · 需投屏与白板', 'enterprise', 160, apDay(3) + 'T09:00', apDay(3) + 'T11:00', ['王晓明提交申请']],
      ['SQ-AP-002', 'utilities', '10月水电费缴纳 · ZD1002', 'enterprise', 1680, '', '', ['王晓明提交申请']],
      // Passed enterprise approval (status=property/execution), covering meeting/utilities
      ['SQ-AP-004', 'meeting', '新品发布彩排 · 远山路演厅', 'property', 180, apDay(5) + 'T15:00', apDay(5) + 'T16:00', ['王晓明提交申请', '唐慧丽：企业审批通过']],
      ['SQ-AP-005', 'utilities', '9月水电费缴纳 · ZD1001', 'execution', 1860, '', '', ['王晓明提交申请', '唐慧丽：企业审批通过']],
      // Rejected: all types
      ['SQ-AP-006', 'renovation', 'A座609室 · 临时隔断拆改', 'rejected', 0, '', '', ['王晓明提交申请', '唐慧丽：企业审批驳回 · 需提供消防备案']],
      ['SQ-AP-008', 'meeting', '周末团建场地预定', 'rejected', 200, apDay(2) + 'T10:00', apDay(2) + 'T18:00', ['王晓明提交申请', '唐慧丽：企业审批驳回 · 非工作时段需物业确认']],
      ['SQ-AP-009', 'utilities', '历史水电费补缴申请', 'rejected', 500, '', '', ['王晓明提交申请', '唐慧丽：企业审批驳回 · 请先核对账单编号']]
    ].forEach(function (item) {
      if (state.requests.some(function (r) { return r.id === item[0]; })) return;
      state.requests.push({ id: item[0], type: item[1], owner: 'employee', company: company, title: item[2], detail: item[2], amount: Number(item[4]), status: item[3], meetingStart: item[5], meetingEnd: item[6], history: item[7].slice(), coverage: true });
    });
    // vehicle: enterprise_pending and rejected
    [
      ['CL-AP-001', '京C·8H2K0', '访客车辆通行', '合作方驻场三天，申请临时通行', 'enterprise_pending', 'pending'],
      ['CL-AP-002', '京B·22K9M', '车辆变更', '月租车更换车辆，原车牌京B·5L0N1', 'rejected', 'pending']
    ].forEach(function (item) {
      if (state.vehicleRequests.some(function (r) { return r.id === item[0]; })) return;
      var h = ['王晓明提交车辆事项申请']; if (item[4] === 'rejected') h.push('唐慧丽：企业审批驳回 · 原车牌未解除绑定');
      state.vehicleRequests.push({ id: item[0], owner: 'employee', company: company, type: 'vehicle-review', category: item[2], vehiclePlate: item[1], detail: item[3], amount: 0, requiresEnterpriseApproval: true, requiresPropertyReview: true, needsFinance: false, status: item[4], enterpriseStatus: item[4] === 'enterprise_pending' ? 'pending' : 'rejected', propertyStatus: item[5], history: h, coverage: true });
    });
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (error) {}
  }

  // My-services sample data: coverage for all empty views (approved/rejected applications, work-order stages, billing states).
  if (!state.specialTickets.some(function (r) { return r.id === 'ST-AP-001'; }) || !state.repairs.some(function (r) { return r.id === 'BX-AP-001'; })) {
    // Special tickets: completed stage (已完成) and additional confirmed-result stage
    if (!state.specialTickets.some(function (r) { return r.id === 'ST-AP-001'; })) {
      state.specialTickets.push({ id: 'ST-AP-001', owner: 'employee', company: company, title: '门禁卡补办', category: '门禁服务', location: 'A座605', detail: '员工门禁卡遗失，申请补办', status: 'completed', result: '已补办并现场激活', history: ['王晓明提交需求', '李师傅：已接单', '李师傅：已补办门禁卡', '王晓明：确认已解决'], coverage: true });
      state.specialTickets.push({ id: 'ST-AP-002', owner: 'employee', company: company, title: '网络端口开通', category: '网络服务', location: 'A座605 · 工位15', detail: '新工位需要开通网络端口', status: 'awaiting_confirmation', result: '已完成端口开通并测试连接', history: ['王晓明提交需求', '李师傅：已接单', '李师傅：提交处理结果'], coverage: true });
    }
    // Repairs: confirmed-result stage (待结果确认) and completed
    if (!state.repairs.some(function (r) { return r.id === 'BX-AP-001'; })) {
      state.repairs.push({ id: 'BX-AP-001', owner: 'employee', company: company, title: '办公室插座无电', detail: 'A座605室 · 靠窗排插无法供电', status: 'confirmation', history: ['王晓明提交报修', '李师傅：已更换排插'], coverage: true });
      state.repairs.push({ id: 'BX-AP-002', owner: 'employee', company: company, title: '卫生间水龙头漏水', detail: 'A座6层卫生间 · 水龙头长期滴漏', status: 'completed', history: ['王晓明提交报修', '李师傅：已更换水龙头密封圈', '王晓明：确认已解决'], coverage: true });
    }
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (error) {}
  }

  // Coverage fixtures: one record per remaining status/type so lists show data; added once by id.
  if (!state.requests.some(function (r) { return r.id === 'SQ-CV-001'; })) {
    var cvDay = function (offset) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offset * 86400000)); };
    // [id, owner, type, title, status, amount, meeting day offset, history]
    [
      ['SQ-CV-001', 'employee', 'meeting', '季度经营分析会', 'enterprise', 120, 6, ['王晓明提交申请']],
      ['SQ-CV-002', 'employee', 'utilities', '11月水电费缴纳', 'enterprise', 1720, 0, ['王晓明提交申请']],
      ['SQ-CV-003', 'employee', 'renovation', 'A座607室 · 会议室地毯更换', 'approved', 0, 0, ['王晓明提交申请', '唐慧丽：企业审批通过', '李师傅：物业审批通过 · 已核实施工安排']],
      ['SQ-CV-004', 'employee', 'meeting', '客户答谢会场地', 'rejected', 220, 4, ['王晓明提交申请', '唐慧丽：企业审批驳回 · 预算超出部门额度']],
      ['SQ-CV-005', 'employee', 'utilities', '8月水电费补缴', 'rejected', 680, 0, ['王晓明提交申请', '唐慧丽：企业审批驳回 · 账单已由财务统一缴纳']],
      ['SQ-CV-006', 'admin', 'utilities', '11月公共区域水电费', 'property', 960, 0, ['唐慧丽提交申请']],
      ['SQ-CV-007', 'admin', 'renovation', 'A座605室 · 前台背景墙更新', 'approved', 0, 0, ['唐慧丽提交申请', '李师傅：物业审批通过 · 已确认施工时段']],
      ['SQ-CV-008', 'admin', 'meeting', '董事会会议场地', 'rejected', 300, 5, ['唐慧丽提交申请', '李师傅：物业审批驳回 · 该时段已被园区活动占用']],
      ['SQ-CV-009', 'admin', 'renovation', 'A座605室 · 茶水间改造', 'rejected', 0, 0, ['唐慧丽提交申请', '李师傅：物业审批驳回 · 需补充给排水图纸']]
    ].forEach(function (item) {
      if (state.requests.some(function (r) { return r.id === item[0]; })) return;
      var record = { id: item[0], type: item[2], owner: item[1], company: company, title: item[3], detail: item[3], amount: item[5], status: item[4], history: item[7], coverage: true };
      if (item[2] === 'meeting') { record.meetingStart = cvDay(item[6]) + 'T14:00'; record.meetingEnd = cvDay(item[6]) + 'T16:00'; }
      if (item[2] === 'renovation') record.detail = item[3] + ' · ' + cvDay(8) + '至' + cvDay(10) + ' · 星桥装饰团队';
      state.requests.push(record);
    });
    // Vehicle requests: approved and rejected for both enterprise roles, pending for admin.
    [
      ['CL-CV-001', 'employee', '京A·M7Q21', '新增月租车位', '新部门员工通勤用车', 'approved', ['王晓明提交车辆事项申请', '唐慧丽：企业审批通过', '李师傅：物业审核通过']],
      ['CL-CV-002', 'employee', '京A·R3T88', '访客车辆长期通行', '供应商驻场一个月', 'rejected', ['王晓明提交车辆事项申请', '唐慧丽：企业审批驳回 · 请改为按次登记']],
      ['CL-CV-003', 'admin', '京A·H5L02', '管理层车位调整', '更换至 B2 区固定车位', 'property_pending', ['唐慧丽提交车辆事项申请']],
      ['CL-CV-004', 'admin', '京A·K8P63', '车牌变更', '公务车更换，原车牌京A·K1P63', 'approved', ['唐慧丽提交车辆事项申请', '李师傅：物业审核通过']],
      ['CL-CV-005', 'admin', '京A·W2N47', '新增临时车位', '年会期间嘉宾车辆', 'rejected', ['唐慧丽提交车辆事项申请', '李师傅：物业审核驳回 · 年会当日车位已满']]
    ].forEach(function (item) {
      if (state.vehicleRequests.some(function (r) { return r.id === item[0]; })) return;
      state.vehicleRequests.push({ id: item[0], owner: item[1], company: company, type: 'vehicle-review', category: item[3], vehiclePlate: item[2], detail: item[4], amount: 0, requiresEnterpriseApproval: item[1] === 'employee', requiresPropertyReview: true, needsFinance: false, status: item[5], enterpriseStatus: item[1] === 'employee' && item[5] === 'rejected' ? 'rejected' : 'approved', propertyStatus: item[5] === 'approved' ? 'approved' : item[5] === 'property_pending' ? 'pending' : item[1] === 'admin' ? 'rejected' : 'pending', history: item[6], coverage: true });
    });
    // Repairs awaiting confirmation and completed.
    [
      ['WX-CV-001', 'employee', '会议室门锁松动', 'A座605室 · 会议室门锁已紧固，请确认', 'confirmation', ['王晓明提交报修', '李师傅：已紧固门锁并测试']],
      ['WX-CV-002', 'admin', '前台灯带不亮', 'A座605室 · 前台灯带已更换', 'completed', ['唐慧丽提交报修', '李师傅：已更换灯带', '唐慧丽：确认已解决']]
    ].forEach(function (item) {
      if (state.repairs.some(function (r) { return r.id === item[0]; })) return;
      state.repairs.push({ id: item[0], owner: item[1], company: company, title: item[2], detail: item[3], status: item[4], history: item[5], coverage: true });
    });
    // Water/electricity bills: one more unpaid and one paid.
    [['ZD-CV-001', '11月水电费', 1720, 12, 'unpaid', ''], ['ZD-CV-002', '7月水电费', 1610, -75, 'paid', cvDay(-80)]].forEach(function (item) {
      if (state.bills.some(function (b) { return b.id === item[0]; })) return;
      state.bills.push({ id: item[0], company: company, title: item[1], amount: item[2], due: cvDay(item[3]), status: item[4], paidAt: item[5] || undefined, reminded: false, coverage: true });
    });
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (error) {}
  }
  // Approval-center fixtures: vehicle requests, added once by id (release/monitor seeds live in the rule-2 migration).
  (function () {
    var day = function (offset) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offset * 86400000)); };
    var changed = false;
    [
      ['CL-001', '京A·D3K29', '新增月租车位', '新入职员工通勤用车，申请 A座地下车库月租车位', 'property_pending'],
      ['CL-002', '京B·72Q8M', '访客车辆长期通行', '合作方项目驻场两周，申请工作日临时通行', 'property_pending'],
      ['CL-003', '沪A·8X6Q2', '车牌变更', '月租车更换车辆，原车牌京A·5L0N1', 'approved']
    ].forEach(function (item) {
      if (state.vehicleRequests.some(function (r) { return r.id === item[0]; })) return;
      var history = ['王晓明提交车辆事项申请', '唐慧丽：企业审批通过'];
      if (item[4] === 'approved') history.push('李师傅：物业审核通过');
      state.vehicleRequests.push({ id: item[0], owner: 'employee', company: company, type: 'vehicle-review', category: item[2], vehiclePlate: item[1], detail: item[3], amount: 0, requiresEnterpriseApproval: true, requiresPropertyReview: true, needsFinance: false, status: item[4], enterpriseStatus: 'approved', propertyStatus: item[4] === 'approved' ? 'approved' : 'pending', history: history, sample: true });
      changed = true;
    });
    if (changed) { try { localStorage.setItem(key, JSON.stringify(state)); } catch (error) {} }
  })();
  if (!state.bills.some(function (b) { return b.id === 'ZD-PAID-01'; })) {
    [['ZD-PAID-01', '8月水电费', 1720, '2026-09-05', '2026-09-03'], ['ZD-PAID-02', '9月企业停车费', 600, '2026-09-10', '2026-09-08']].forEach(function (item) {
      if (!state.bills.some(function (b) { return b.id === item[0]; })) state.bills.push({ id: item[0], company: company, title: item[1], amount: item[2], due: item[3], paidAt: item[4], status: 'paid', reminded: false, sample: true });
    });
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (error) {}
  }
  if (!state.bills.some(function (b) { return b.id === 'ZD-002'; })) {
    [
      ['ZD-001', company, '10月水电费', 1680, 7],
      ['ZD-002', '京华创新科技', '10月企业停车费', 800, 14]
    ].forEach(function (item) {
      if (state.bills.some(function (b) { return b.id === item[0]; })) return;
      var due = new Date(Date.now() + item[4] * 86400000);
      state.bills.push({ id: item[0], company: item[1], title: item[2], amount: item[3], due: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(due), status: 'unpaid', reminded: false, sample: true });
    });
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (error) {}
  }
  // Lease summaries synced from the back-office contract system; only rent due dates and contract end dates are kept here.
  if (!Array.isArray(state.leases)) {
    var leaseDay = function (offset) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offset * 86400000)); };
    state.leases = [
      ['HT-2025-018', company, 'A座605室', 320, 22400, 5, 210, '唐慧丽', '138****6605'],
      ['HT-2025-031', '京华创新科技', 'B座302室', 180, 11700, 12, 25, '赵敏', '139****3021'],
      ['HT-2024-047', '云启研发', 'C座401室', 260, 16900, -3, 380, '陈先生', '137****4012'],
      ['HT-2025-052', '博远数据', 'A座608室', 150, 9750, 40, 300, '刘经理', '136****6082']
    ].map(function (item) { return { id: item[0], company: item[1], space: item[2], area: item[3], amount: item[4], nextDue: leaseDay(item[5]), endDate: leaseDay(item[6]), contact: item[7], phone: item[8], status: 'unpaid', contacts: [], sample: true }; });
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (error) {}
  }
  var adminMeetingRequests = state.requests.filter(function (r) { return r.type === 'meeting' && r.owner === 'admin' && r.status === 'enterprise'; });
  if (adminMeetingRequests.length) {
    adminMeetingRequests.forEach(function (r) { r.status = 'property'; });
    try { localStorage.setItem(key, JSON.stringify(state)); }
    catch (error) { adminMeetingRequests.forEach(function (r) { r.status = 'enterprise'; }); }
  }
  var persistedState; try { persistedState = localStorage.getItem(key); } catch (error) {}
  // 2026-10-17 approval-rule migration: drop records created under the old rules (employee monitor/release
  // straight to property, admin utilities/renovation waiting for enterprise, utilities without property review)
  // and seed one set of records per stage under the new rules. Runs once per browser.
  (function () {
    // The marker lives in its own key: commit() rollback expects every state field to be an array.
    var ruleKey = key + '-approval-rule';
    try { if (['2', '3'].includes(localStorage.getItem(ruleKey))) return; } catch (error) { return; }
    var day = function (offset) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offset * 86400000)); };
    var hasEnterprisePass = function (r) { return (r.history || []).some(function (h) { return String(h).indexOf('企业审批') >= 0; }); };
    state.monitorRequests = state.monitorRequests.filter(function (r) { return !(r.owner === 'employee' && !r.enterpriseStatus && !hasEnterprisePass(r)); });
    state.releaseRequests = state.releaseRequests.filter(function (r) { return !(r.owner === 'employee' && !r.enterpriseStatus && !hasEnterprisePass(r)); });
    state.requests = state.requests.filter(function (r) {
      if (r.owner === 'admin' && ['utilities', 'renovation'].includes(r.type) && r.status === 'enterprise') return false;
      if (r.type === 'utilities' && ['execution', 'approved'].includes(r.status) && !(r.history || []).some(function (h) { return String(h).indexOf('物业审批') >= 0; })) return false;
      return true;
    });
    var monitorRows = [
      // [id, owner, scope, day, time, purpose, status, enterpriseStatus, history]
      ['JK-R2-001', 'employee', 'A座大堂及 1 号电梯厅', -1, '13:30-14:30', '访客遗失随身物品，协助查找', 'enterprise_pending', 'pending', ['王晓明提交监控调取申请']],
      ['JK-R2-002', 'employee', 'B座地下车库 B2 区', -2, '19:00-20:00', '员工车辆剐蹭，核实经过', 'property_pending', 'approved', ['王晓明提交监控调取申请', '唐慧丽：企业审批通过']],
      ['JK-R2-003', 'employee', 'A座 2F 走廊', -4, '10:00-11:00', '内部设备遗失，协助核查', 'approved_for_offline_handover', 'approved', ['王晓明提交监控调取申请', '唐慧丽：企业审批通过', '李师傅：物业审核通过，待线下授权对接']],
      ['JK-R2-004', 'employee', 'B座 1F 外围停车场', -6, '19:00-20:00', '个人财物失窃，申请查看', 'rejected', 'rejected', ['王晓明提交监控调取申请', '唐慧丽：企业审批驳回 · 请先报警并取得协查函']],
      ['JK-R2-005', 'admin', 'C座 1F 大堂', -1, '09:00-10:00', '核实快递丢失时段', 'property_pending', 'not_required', ['唐慧丽提交监控调取申请']]
    ];
    monitorRows.forEach(function (item) {
      if (state.monitorRequests.some(function (r) { return r.id === item[0]; })) return;
      state.monitorRequests.push({ id: item[0], owner: item[1], company: company, type: 'monitor-access', scope: item[2], requestedAt: day(item[3]) + ' ' + item[4], purpose: item[5], status: item[6], enterpriseStatus: item[7], propertyStatus: item[6] === 'approved_for_offline_handover' ? 'approved' : item[6] === 'property_pending' ? 'pending' : 'not_required', history: item[8].slice() });
    });
    var releaseRows = [
      // [id, owner, applicant, items, location, day, time, note, status, enterpriseStatus, inspectionStatus, history]
      ['FX-R2-001', 'employee', '王晓明', '办公显示器 2 台、主机 1 台', 'A座 1F 货梯口', 1, '15:00', '设备返厂维修', 'enterprise_pending', 'pending', 'pending', ['王晓明提交物品放行申请']],
      ['FX-R2-002', 'employee', '王晓明', '展会物料 6 箱', 'B座 1F 卸货区', 2, '09:30', '外出参展，展后带回', 'pending', 'approved', 'pending', ['王晓明提交物品放行申请', '唐慧丽：企业审批通过']],
      ['FX-R2-003', 'employee', '王晓明', '会议音响设备 2 套', 'A座 1F 货梯口', 0, '16:00', '借用归还', 'approved', 'approved', 'pending', ['王晓明提交物品放行申请', '唐慧丽：企业审批通过', '李师傅：审批通过 · 物品清单一致']],
      ['FX-R2-004', 'employee', '王晓明', '旧服务器主机 2 台', 'C座 1F 货运通道', -5, '14:00', '设备报废处理', 'rejected', 'rejected', 'pending', ['王晓明提交物品放行申请', '唐慧丽：企业审批驳回 · 缺少固定资产处置证明']],
      ['FX-R2-005', 'admin', '唐慧丽', '旧办公桌椅 8 套', 'A座 地下一层货运通道', 3, '18:00', '办公区升级，旧家具回收', 'pending', 'not_required', 'pending', ['唐慧丽提交物品放行申请']]
    ];
    releaseRows.forEach(function (item) {
      if (state.releaseRequests.some(function (r) { return r.id === item[0]; })) return;
      var record = { id: item[0], owner: item[1], company: company, applicantName: item[2], items: item[3], location: item[4], plannedAt: day(item[5]) + 'T' + item[6], plannedEndAt: day(item[5]) + 'T' + String((Number(item[6].slice(0, 2)) + 1) % 24).padStart(2, '0') + item[6].slice(2), note: item[7], status: item[8], enterpriseStatus: item[9], inspectionStatus: item[10], history: item[11].slice() };
      if (item[8] === 'approved') record.reviewNote = '物品清单一致';
      if (item[8] === 'rejected') record.reviewNote = '缺少固定资产处置证明';
      state.releaseRequests.push(record);
    });
    [
      // [id, owner, type, title, detail, status, amount, history]
      ['SQ-R2-001', 'admin', 'utilities', '10月公共区域水电费', 'ZD-001 · 10月公共区域水电费缴纳', 'property', 960, ['唐慧丽提交申请']],
      ['SQ-R2-002', 'employee', 'utilities', '9月水电费缴纳', 'ZD1001 · 9月水电费缴纳', 'property', 1860, ['王晓明提交申请', '唐慧丽：企业审批通过']],
      ['SQ-R2-003', 'employee', 'utilities', '8月水电费缴纳', 'ZD-PAID-01 · 8月水电费缴纳', 'execution', 1720, ['王晓明提交申请', '唐慧丽：企业审批通过', '李师傅：物业审批通过']],
      ['SQ-R2-004', 'admin', 'renovation', 'A座605室 · 会客区墙面翻新', 'A座605室 · ' + day(9) + ' · ' + day(12) + ' · 星桥装饰团队 · 会客区墙面翻新', 'property', 0, ['唐慧丽提交申请']]
    ].forEach(function (item) {
      if (state.requests.some(function (r) { return r.id === item[0]; })) return;
      state.requests.push({ id: item[0], owner: item[1], company: company, type: item[2], title: item[3], detail: item[4], status: item[5], amount: item[6], history: item[7].slice() });
    });
    try { localStorage.setItem(key, JSON.stringify(state)); persistedState = localStorage.getItem(key); localStorage.setItem(ruleKey, '2'); } catch (error) {}
  })();
  // Rule 3: 客户车费代缴 was merged into 车辆服务 → 停车费用代缴; remove the legacy request records once.
  (function () {
    var ruleKey = key + '-approval-rule';
    try { if (localStorage.getItem(ruleKey) === '3') return; } catch (error) { return; }
    state.requests = state.requests.filter(function (r) { return r.type !== 'parking'; });
    try { localStorage.setItem(key, JSON.stringify(state)); persistedState = localStorage.getItem(key); localStorage.setItem(ruleKey, '3'); } catch (error) {}
  })();
  function role() { return profile.dataset.role || 'guest'; }
  function isUnauthenticated() { return role() === 'unauthenticated'; }
  function enterprise() { return role() === 'employee' || role() === 'admin'; }
  function el(tag, text, className) { var node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
  function action(label, handler, primary) { var button = el('button', label, primary ? 'role-primary' : ''); button.type = 'button'; button.onclick = handler; return button; }
  var feedback = el('p', '', 'role-feedback'); feedback.setAttribute('role', 'status');
  function commit(change) {
    try { if (localStorage.getItem(key) !== persistedState) { feedback.textContent = '其他页面已更新申请数据，请刷新后重试。'; return false; } } catch (error) { feedback.textContent = '无法读取浏览器存储，请检查存储设置后重试。'; return false; }
    var previous = JSON.stringify(state); change();
    try { localStorage.setItem(key, JSON.stringify(state)); persistedState = localStorage.getItem(key); } catch (error) {
      // Keep record identities so the current page's buttons can retry after rollback.
      var snapshot = JSON.parse(previous);
      Object.keys(snapshot).forEach(function (name) { var current = state[name]; current.splice(0, current.length, ...snapshot[name].map(function (record) { var live = current.find(function (item) { return item.id === record.id; }); if (!live) return record; Object.keys(live).forEach(function (field) { delete live[field]; }); return Object.assign(live, record); })); });
      feedback.textContent = '保存失败，原数据未改变，请检查浏览器存储后重试。'; return false;
    }
    renderProfile(); window.dispatchEvent(new Event('property-workflow-change')); return true;
  }
  function safeText(value, limit) {
    return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit || 1000);
  }
  function newDomainId(prefix) { return prefix + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function domainRecords(name) { return Array.isArray(state[name]) ? state[name] : []; }
  function canReadDomain(record) {
    if (!record || record.company !== company) return false;
    if (role() === 'property' || role() === 'admin') return true;
    return role() === 'employee' && record.owner === role();
  }
  function visibleDomainRecords(name) { return domainRecords(name).filter(canReadDomain); }
  function findDomainRecord(name, id) { return domainRecords(name).find(function (record) { return record.id === id; }) || null; }
  // Approval results are delivered as an in-app notice for the applying side (records are local; nothing is sent).
  function notifyOutcome(record, title, outcome, message) {
    if (!record || record.sample) return;
    var notices = domainRecords('notices');
    if (!Array.isArray(state.notices)) { state.notices = []; notices = state.notices; }
    notices.unshift({ id: 'TZ-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'approval', owner: record.owner, company: record.company, recordId: record.id, title: title, outcome: outcome, note: safeText(message, 200), createdAt: new Date().toISOString(), read: false });
    if (notices.length > 30) notices.length = 30;
  }
  function pushHistory(record, message) {
    if (!Array.isArray(record.history)) record.history = [];
    record.history.push(safeText(message, 500));
  }
  function domainCommit(change) { return commit(change); }
  function domainNote(input, fallback) { return safeText(input || fallback, 1000); }
  function reviewDecision(decision) { return decision === true || decision === 'approved' || decision === 'approve' ? 'approved' : decision === 'rejected' || decision === 'reject' || decision === false ? 'rejected' : ''; }
  function sameOwner(record) { return !!record && record.company === company && record.owner === role() && enterprise(); }

  // These APIs keep local demo state separate from the existing release workflow.
  // They never claim payment, access-control, message delivery, or recording results.
  function createVehicleRequest(input) {
    input = input || {};
    if (!enterprise() && role() !== 'property') return null;
    var detail = domainNote(input.detail || input.description, '车辆服务申请');
    if (!detail || !safeText(input.vehiclePlate || input.plate, 32)) return null;
    var submitter = role(), byProperty = submitter === 'property', byEmployee = submitter === 'employee';
    // Admin requests skip enterprise approval; property-initiated requests skip review entirely.
    var requiresPropertyReview = !byProperty && (submitter === 'admin' || input.requiresPropertyReview === true);
    var needsFinance = input.needsFinance !== false;
    var amount = Number.isFinite(Number(input.amount)) ? Number(input.amount) : 0;
    var status = byEmployee ? 'enterprise_pending' : requiresPropertyReview ? 'property_pending' : needsFinance ? 'finance_pending' : 'approved';
    var record = {
      id: newDomainId('CL-'), owner: submitter, company: company, type: safeText(input.type || 'vehicle-service', 60),
      category: safeText(input.category || '车辆服务', 80), vehiclePlate: safeText(input.vehiclePlate || input.plate, 32),
      detail: detail, amount: amount,
      requiresEnterpriseApproval: byEmployee, requiresPropertyReview: requiresPropertyReview,
      needsFinance: needsFinance, status: status, enterpriseStatus: byEmployee ? 'pending' : 'not_required',
      propertyStatus: requiresPropertyReview ? 'pending' : 'not_required', history: [identities[submitter] + '提交车辆事项申请']
    };
    return domainCommit(function () { state.vehicleRequests.unshift(record); }) ? record : null;
  }
  function reviewVehicleRequest(id, decision, note) {
    var record = findDomainRecord('vehicleRequests', id), result = reviewDecision(decision), message = domainNote(note);
    if (!record || !result || record.company !== company) return false;
    if (role() === 'admin') {
      if (record.status !== 'enterprise_pending' || record.owner === role()) return false;
      return domainCommit(function () {
        record.enterpriseStatus = result; record.reviewedBy = identities[role()]; record.reviewNote = message;
        record.status = result === 'rejected' ? 'rejected' : record.requiresPropertyReview ? 'property_pending' : record.needsFinance ? 'finance_pending' : 'approved';
        pushHistory(record, identities[role()] + '：企业审批' + (result === 'approved' ? '通过' : '驳回') + (message ? ' · ' + message : ''));
        notifyOutcome(record, record.category || '车辆服务', result, message);
      });
    }
    if (role() !== 'property' || record.owner === 'property' || record.status !== 'property_pending' || !record.requiresPropertyReview || !['approved', 'not_required'].includes(record.enterpriseStatus)) return false;
    return domainCommit(function () {
      record.propertyStatus = result; record.propertyReviewedBy = identities[role()]; record.propertyReviewNote = message;
      record.status = result === 'rejected' ? 'rejected' : record.needsFinance ? 'finance_pending' : 'approved';
      pushHistory(record, identities[role()] + '：物业审核' + (result === 'approved' ? '通过' : '驳回') + (message ? ' · ' + message : ''));
      notifyOutcome(record, record.category || '车辆服务', result, message);
    });
  }
  function createMonitorRequest(input) {
    input = input || {};
    if (!enterprise()) return null;
    var purpose = domainNote(input.purpose || input.description);
    var scope = domainNote(input.scope || input.cameraScope);
    if (!purpose || !scope) return null;
    var record = {
      id: newDomainId('JK-'), owner: role(), company: company, type: 'monitor-access', purpose: purpose, scope: scope,
      requestedAt: safeText(input.requestedAt, 80),
      // Employees go through enterprise approval first; admins go straight to property review.
      status: role() === 'employee' ? 'enterprise_pending' : 'property_pending', enterpriseStatus: role() === 'employee' ? 'pending' : 'not_required', propertyStatus: role() === 'employee' ? 'not_required' : 'pending',
      history: [identities[role()] + '提交监控调取申请']
    };
    return domainCommit(function () { state.monitorRequests.unshift(record); }) ? record : null;
  }
  function reviewMonitorRequest(id, decision, note) {
    var record = findDomainRecord('monitorRequests', id), result = reviewDecision(decision), message = domainNote(note);
    if (!record || !result || record.company !== company) return false;
    if (role() === 'admin') {
      if (record.status !== 'enterprise_pending' || record.owner === role()) return false;
      return domainCommit(function () {
        record.enterpriseStatus = result; record.enterpriseReviewedBy = identities[role()]; record.enterpriseReviewNote = message;
        record.status = result === 'approved' ? 'property_pending' : 'rejected'; if (result === 'approved') record.propertyStatus = 'pending';
        pushHistory(record, identities[role()] + '：企业审批' + (result === 'approved' ? '通过' : '驳回') + (message ? ' · ' + message : ''));
        notifyOutcome(record, '监控调取', result, message);
      });
    }
    if (role() !== 'property' || record.status !== 'property_pending') return false;
    return domainCommit(function () {
      record.propertyStatus = result; record.reviewedBy = identities[role()]; record.reviewNote = message;
      record.status = result === 'approved' ? 'approved_for_offline_handover' : 'rejected';
      if (result === 'approved') record.handoverStatus = 'not_connected';
      pushHistory(record, identities[role()] + '：物业审核' + (result === 'approved' ? '通过，待线下授权对接' : '驳回') + (message ? ' · ' + message : ''));
      notifyOutcome(record, '监控调取', result, message);
    });
  }
  function createSpecialServiceTicket(input) {
    input = input || {};
    if (!enterprise()) return null;
    var title = domainNote(input.title, '专项服务需求'), detail = domainNote(input.detail || input.description);
    if (!detail) return null;
    var record = { id: newDomainId('WXZ-'), owner: role(), company: company, category: safeText(input.category || '专项服务', 80), title: title, detail: detail, status: 'pending', history: [identities[role()] + '提交专项服务需求'] };
    return domainCommit(function () { state.specialTickets.unshift(record); }) ? record : null;
  }
  function updateSpecialServiceTicket(id, nextStatus, note) {
    var record = findDomainRecord('specialTickets', id), message = domainNote(note);
    if (!record || record.company !== company) return false;
    if (role() === 'property' && ['pending', 'processing'].includes(record.status) && ['processing', 'awaiting_confirmation'].includes(nextStatus)) {
      if (nextStatus === 'processing' && record.status !== 'pending' || nextStatus === 'awaiting_confirmation' && record.status !== 'processing' || !message) return false;
      return domainCommit(function () { record.status = nextStatus; record.result = message; record.updatedBy = identities[role()]; pushHistory(record, identities[role()] + '：' + (nextStatus === 'processing' ? '接单分派' : '提交处理结果') + ' · ' + message); });
    }
    if (enterprise() && sameOwner(record) && record.status === 'awaiting_confirmation' && nextStatus === 'completed') {
      return domainCommit(function () { record.status = 'completed'; record.confirmation = message || '已确认服务结果'; pushHistory(record, identities[role()] + '：确认服务结果' + (message ? ' · ' + message : '')); });
    }
    return false;
  }
  function registerActivity(input) {
    input = input || {};
    if (!enterprise()) return null;
    var activityId = safeText(input.activityId || input.id, 120), title = domainNote(input.title, '园区活动');
    if (!activityId) return null;
    var existing = state.activityRegistrations.find(function (record) { return record.activityId === activityId && sameOwner(record); });
    if (existing) return existing;
    var record = { id: newDomainId('HD-'), activityId: activityId, title: title, owner: role(), company: company, attendeeName: safeText(input.attendeeName || identities[role()], 80), status: 'registered', history: [identities[role()] + '提交活动报名'] };
    return domainCommit(function () { state.activityRegistrations.unshift(record); }) ? record : null;
  }
  function activityAction(id, actionName, note) {
    var record = findDomainRecord('activityRegistrations', id), message = domainNote(note);
    if (role() !== 'property' || !record || record.company !== company) return false;
    if (actionName === 'check-in' || actionName === 'checkIn') {
      if (record.status !== 'registered') return false;
      return domainCommit(function () { record.status = 'checked_in'; record.checkInBy = identities[role()]; record.checkInAt = new Date().toISOString(); pushHistory(record, identities[role()] + '：现场签到' + (message ? ' · ' + message : '')); });
    }
    if (actionName === 'redeem' || actionName === '核销') {
      if (record.status !== 'checked_in') return false;
      return domainCommit(function () { record.status = 'redeemed'; record.redeemedBy = identities[role()]; record.redeemedAt = new Date().toISOString(); pushHistory(record, identities[role()] + '：现场核销' + (message ? ' · ' + message : '')); });
    }
    return false;
  }
  function createUtilityRequest(input) {
    input = input || {};
    if (!enterprise()) return null;
    var bill = safeText(input.billId || input.bill, 80), detail = domainNote(input.description || input.detail);
    var amount = Number(input.amount);
    if (!bill || !detail || !Number.isFinite(amount) || amount <= 0) return null;
    var record = { id: newDomainId('SQ-'), owner: role(), company: company, type: 'utilities', billId: bill, detail: bill + ' · ' + detail, amount: amount, status: firstRequestStatus('utilities'), history: [identities[role()] + '提交水电费用申请'] };
    return domainCommit(function () { state.requests.unshift(record); }) ? record : null;
  }
  function reviewUtilityRequest(id, decision, note) {
    var record = state.requests.find(function (item) { return item.id === id && item.type === 'utilities'; }), result = reviewDecision(decision), message = domainNote(note);
    if (role() !== 'admin' || !record || !result || record.company !== company || record.owner === role() || record.status !== 'enterprise') return false;
    return domainCommit(function () { record.status = result === 'approved' ? 'property' : 'rejected'; pushHistory(record, identities[role()] + '：企业审批' + (result === 'approved' ? '通过' : '驳回') + (message ? ' · ' + message : '')); });
  }
  // Release requests: employee submissions start at enterprise_pending; admins may approve, reject or ask for supplements.
  function reviewReleaseEnterprise(id, decision, note) {
    var record = findDomainRecord('releaseRequests', id), message = domainNote(note);
    var result = decision === 'supplement' ? 'supplement' : reviewDecision(decision);
    if (role() !== 'admin' || !record || !result || record.company !== company || record.owner === role() || record.status !== 'enterprise_pending') return false;
    if (result !== 'approved' && !message) return false;
    return domainCommit(function () {
      record.enterpriseStatus = result; record.enterpriseReviewedBy = identities[role()]; record.enterpriseReviewNote = message; record.reviewNote = message || record.reviewNote;
      // Supplements are answered by the applicant and come back to the enterprise stage.
      record.status = result === 'approved' ? 'pending' : result === 'supplement' ? 'supplement' : 'rejected';
      pushHistory(record, identities[role()] + '：企业审批' + ({ approved: '通过', rejected: '驳回', supplement: '要求补件' })[result] + (message ? ' · ' + message : ''));
      notifyOutcome(record, '物品放行', result, message);
    });
  }
  // Withdraw while the enterprise stage is still open; shared by monitor and release requests.
  function withdrawDomain(collection, id) {
    var record = findDomainRecord(collection, id);
    if (!sameOwner(record) || record.owner !== 'employee' || record.status !== 'enterprise_pending') return false;
    return domainCommit(function () { record.status = 'withdrawn'; record.enterpriseStatus = 'withdrawn'; pushHistory(record, identities[role()] + '撤回申请'); });
  }
  function accessibleReleaseRequests() { return domainRecords('releaseRequests').filter(function (record) { return record.company === company && (role() === 'property' || sameOwner(record)); }); }
  function page(id, title, parent) {
    var node = el('section', undefined, 'hidden role-workflow'); node.id = id; screen.appendChild(node);
    window.__setMiniRoute(id, title, parent || 'profile'); return node;
  }
  window.__setMiniRoute('my-bookings', '我的会议', 'profile');
  var requestsPage = page('role-requests', '我的申请');
  var formPage = page('role-request-form', '发起申请', 'role-requests');
  var approvalsPage = page('role-approvals', '企业审批');
  var detailPage = page('role-request-detail', '申请详情', 'role-requests');
  var billsPage = page('role-bills', '企业账单'), billNoticeClosed = false;
  var billDetailPage = page('role-bill-detail', '账单详情', 'role-bills'), billDetailId = null;
  var repairsPage = page('role-repairs', '我的报修');
  var repairForm = page('role-repair-form', '提交报修', 'role-repairs');
  var visitorsPage = page('role-visitors', '接待访客');
  var visitorForm = page('role-visitor-form', '登记来访', 'role-visitors');
  var enterpriseReservationsPage = page('role-enterprise-reservations', '企业预约');
  var membersPage = page('role-members', '成员审核');
  var meetingApplications = page('role-meeting-applications', '场地预定');
  var denied = el('div', undefined, 'role-permission-modal hidden'); denied.id = 'role-denied';
  var permissionCard = el('div', undefined, 'role-permission-card');
  permissionCard.setAttribute('role', 'alertdialog'); permissionCard.setAttribute('aria-modal', 'true');
  permissionCard.setAttribute('aria-labelledby', 'role-permission-title'); permissionCard.setAttribute('aria-describedby', 'role-permission-copy role-permission-help');
  var permissionClose = action('×', closePermission); permissionClose.className = 'role-permission-close'; permissionClose.setAttribute('aria-label', '关闭身份权限提示');
  var permissionIcon = el('span', undefined, 'role-permission-icon'); permissionIcon.setAttribute('aria-hidden', 'true'); permissionIcon.innerHTML = '<i data-lucide="lock-keyhole"></i>';
  var permissionTitle = el('h2', '当前身份无法办理此事项'); permissionTitle.id = 'role-permission-title';
  var permissionCopy = el('p', '会议预约、企业申请与接待访客仅面向已绑定企业的人员。'); permissionCopy.id = 'role-permission-copy';
  var permissionHelp = el('p', '物业人员请前往物业工作台或管理后台。', 'role-permission-help'); permissionHelp.id = 'role-permission-help';
  var permissionReturn = action('返回我的', function () { closePermission(false); window.__showMiniPage('profile'); profile.querySelector('button').focus({ preventScroll: true }); }, true);
  permissionCard.append(permissionClose, permissionIcon, permissionTitle, permissionCopy, permissionHelp, permissionReturn);
  denied.append(permissionCard); document.querySelector('.phone').append(denied);
  var permissionTrigger, permissionBackground = [];
  var defaultPermissionCopy = permissionCopy.textContent, defaultPermissionHelp = permissionHelp.textContent;
  function showPermission(copy, help) {
    if (!denied.classList.contains('hidden')) return;
    permissionCopy.textContent = typeof copy === 'string' ? copy : defaultPermissionCopy; permissionHelp.textContent = typeof help === 'string' ? help : defaultPermissionHelp;
    var active = screen.querySelector('section:not(.hidden)');
    // A denied legacy route can already have hidden its origin; never expose protected content.
    if (!active || protectedPages[active.id] && !protectedPages[active.id].includes(role())) originalShow('profile');
    permissionTrigger = document.activeElement;
    permissionBackground = Array.from(denied.parentNode.children).filter(function (node) { return node !== denied; }).map(function (node) { var previous = node.inert; node.inert = true; return [node, previous]; });
    denied.classList.remove('hidden'); permissionReturn.focus({ preventScroll: true });
  }
  function closePermission(restoreFocus) {
    if (denied.classList.contains('hidden')) return;
    denied.classList.add('hidden'); permissionBackground.forEach(function (item) { item[0].inert = item[1]; }); permissionBackground = [];
    if (restoreFocus !== false && permissionTrigger && permissionTrigger.isConnected && !permissionTrigger.closest('.hidden')) permissionTrigger.focus({ preventScroll: true });
  }
  var loginModal = el('div', undefined, 'role-login-modal hidden'); loginModal.id = 'role-login-modal';
  var loginCard = el('div', undefined, 'role-login-card');
  loginCard.setAttribute('role', 'dialog'); loginCard.setAttribute('aria-modal', 'true'); loginCard.setAttribute('aria-labelledby', 'role-login-title');
  var loginClose = action('×', function () { loginModal.classList.add('hidden'); }, false);
  loginClose.className = 'role-login-close'; loginClose.setAttribute('aria-label', '关闭登录页面');
  var loginAgreement = el('button', undefined, 'role-login-agreement'); loginAgreement.type = 'button'; loginAgreement.setAttribute('role', 'checkbox'); loginAgreement.setAttribute('aria-checked', 'false');
  loginAgreement.append(el('span', '', 'role-login-checkbox'), el('span', '我已阅读并同意《用户协议》和《隐私政策》'));
  function setLoginAgreement(checked) { loginAgreement.setAttribute('aria-checked', String(checked)); loginAgreement.querySelector('.role-login-checkbox').textContent = checked ? '✓' : ''; loginPrimary.disabled = !checked; loginOther.disabled = !checked; }
  loginAgreement.onclick = function () { setLoginAgreement(loginAgreement.getAttribute('aria-checked') !== 'true'); };
  var loginPrimary = action('微信手机号一键登录', function () { if (loginPrimary.disabled) return; loginModal.classList.add('hidden'); }, true); loginPrimary.classList.add('role-login-one-tap');
  var loginOther = action('使用其他手机号登录', function () { if (loginOther.disabled) return; loginModal.classList.add('hidden'); }, false); loginOther.classList.add('role-login-phone');
  var loginSkip = action('暂不登录', function () { loginModal.classList.add('hidden'); }, false); loginSkip.className = 'role-login-skip';
  var loginTitle = el('h2', '登录后继续使用'); loginTitle.id = 'role-login-title';
  var loginIcon = el('img', undefined, 'role-login-icon'); loginIcon.src = 'miniprogram/assets/park-login-logo.png'; loginIcon.alt = '星桥科创园';
  loginCard.append(loginClose, loginIcon, loginTitle, el('p', '使用微信手机号安全登录，解锁预约、服务、消息等功能。'), loginPrimary, loginOther, loginSkip, loginAgreement);
  setLoginAgreement(false);
  loginModal.append(loginCard); document.querySelector('.phone').append(loginModal);
  function showLogin() { loginModal.classList.remove('hidden'); loginClose.focus({ preventScroll: true }); }
  loginModal.addEventListener('click', function (event) { if (event.target === loginModal) loginModal.classList.add('hidden'); });
  document.addEventListener('keydown', function (event) { if (!loginModal.classList.contains('hidden') && event.key === 'Escape') { event.preventDefault(); loginModal.classList.add('hidden'); } }, true);
  denied.addEventListener('click', function (event) { if (event.target === denied) closePermission(); });
  document.addEventListener('keydown', function (event) {
    if (denied.classList.contains('hidden')) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closePermission(); }
    else if (event.key === 'Tab') { event.preventDefault(); (document.activeElement === permissionReturn ? permissionClose : permissionReturn).focus(); }
  }, true);
  var protectedPages = { 'role-requests': ['employee', 'admin'], 'role-request-form': ['employee', 'admin'], 'role-approvals': ['admin', 'property'], 'role-request-detail': ['employee', 'admin', 'property'], 'role-bills': ['admin', 'property'], 'role-bill-detail': ['admin', 'property'], 'role-members': ['admin'], 'role-repairs': ['employee', 'admin', 'property'], 'role-repair-form': ['employee', 'admin'], 'role-visitors': ['employee', 'admin'], 'role-visitor-form': ['employee', 'admin'], 'role-enterprise-reservations': ['admin'], meeting: ['employee', 'admin'], 'meeting-detail': ['employee', 'admin'], 'meeting-booking': ['employee', 'admin'], 'meeting-confirm': ['employee', 'admin'], 'meeting-success': ['employee', 'admin'], 'my-bookings': ['employee', 'admin'], 'booking-record-detail': ['employee', 'admin'], visitor: ['guest', 'employee', 'admin'], 'visitor-records': ['employee', 'admin'], repair: ['employee', 'admin'], 'repair-records': ['employee', 'admin'], 'property-service-chat': ['property'], 'property-service-notice': ['property'], 'property-service-notices': ['property'] };
  ['leasing-chat', 'consultant-li-chat', 'consultant-chen-chat', 'message-consultations', 'message-space-list', 'message-booking-list', 'message-notice-list', 'message-space', 'message-booking', 'message-booking-help', 'message-notice'].forEach(function (id) { protectedPages[id] = ['guest', 'employee', 'admin']; });
  document.querySelectorAll('section[id^="message-example-"]').forEach(function (node) { protectedPages[node.id] = ['guest', 'employee', 'admin']; });
  protectedPages['role-meeting-applications'] = ['employee', 'admin'];
  var legacyBookingPages = ['meeting-booking', 'meeting-confirm', 'meeting-success'];
  window.__canMiniPage = function (id) { return !legacyBookingPages.includes(id) && (!protectedPages[id] || protectedPages[id].includes(role())); };
  var originalShow = window.__showMiniPage;
  window.__showMiniPage = function (id) {
    if (isUnauthenticated()) { showLogin(); return false; }
    if (id === 'role-denied' || protectedPages[id] && !protectedPages[id].includes(role())) { showPermission(); return false; }
    closePermission(false);
    if (legacyBookingPages.includes(id)) { openMeetingEntry(); return false; }
    if (id === 'meeting' && role() === 'employee') { showMeetingList(); return true; }
    if (id === 'repair') { showRepairForm(); return true; }
    if (id === 'repair-records') { showRepairs(); return true; }
    if (id === 'visitor-records') { showVisitors(); return true; }
    originalShow(id); return true;
  };
  function open(id) { window.__showMiniPage(id); }
  function heading(node, title, copy) { node.replaceChildren(el('h1', title)); if (copy) node.append(el('p', copy)); }
  function empty(node, text) { node.append(el('div', text, 'role-panel role-empty')); }
  function panel(title, badge, description) {
    var card = el('article', undefined, 'role-panel'), row = el('div', undefined, 'role-row');
    row.append(el('strong', title), el('span', badge, 'role-status')); card.append(row);
    if (description) card.append(el('p', description)); return card;
  }
  function actions(card) { var node = el('div', undefined, 'role-actions'); card.append(node); return node; }
  // Label/value grid (same layout as 物业工作台 cards); empty values are skipped.
  function infoGrid(card, pairs) {
    var dl = el('dl', undefined, 'approval-info-grid');
    pairs.forEach(function (pair) { if (pair[1] === undefined || pair[1] === null || pair[1] === '') return; dl.append(el('dt', pair[0]), el('dd', String(pair[1]))); });
    card.append(dl); return dl;
  }
  function cardBar(card) { var bar = actions(card); bar.classList.add('approval-card-actions'); return bar; }
  // Card summary fields for the approval list (business fields only; id/company/submitter stay in detail).
  function approvalCardFields(r) {
    var rows = [['申请企业', r.company], ['提交人', identities[r.owner]]];
    if (r.type === 'renovation') {
      var parts = String(r.detail || '').split(' · ').map(function (part) { return part.trim(); });
      var form = parts.length >= 5 && /^\d{4}-\d{2}-\d{2}$/.test(parts[1]);
      return rows.concat([['装修位置', parts[0]], ['施工时间', form ? parts[1] + ' 至 ' + parts[2] : (parts[2] || '').replace('至', ' 至 ')], ['施工单位', form ? parts[3] : parts.slice(3).join(' · ')]]);
    }
    rows.push(['申请说明', r.detail]);
    if (r.type === 'meeting' && r.meetingStart) rows.push(['使用时间', r.meetingStart.replace('T', ' ') + ' 至 ' + r.meetingEnd.replace('T', ' ')]);
    if (r.amount) rows.push([r.type === 'meeting' ? '预算金额' : '金额', '¥' + r.amount.toFixed(2)]);
    return rows;
  }
  function ownRequests() { return state.requests.filter(function (r) { return r.company === company && r.owner === role(); }); }
  // Types that property reviews after (or instead of) the enterprise stage.
  var propertyReviewTypes = ['renovation', 'meeting', 'utilities'];
  // Admin submissions skip enterprise approval (no one else can approve them); the old parking type still starts at enterprise.
  function firstRequestStatus(type) { return role() === 'admin' && propertyReviewTypes.includes(type) ? 'property' : 'enterprise'; }
  function afterEnterprise(type) { return propertyReviewTypes.includes(type) ? 'property' : 'execution'; }
  // Property's decision: utilities go on to offline handling (待物业办理), the rest close as approved.
  function afterProperty(type) { return type === 'utilities' ? 'execution' : 'approved'; }
  function propertyCanSee(r) { return propertyReviewTypes.includes(r.type) && r.status !== 'enterprise' && r.status !== 'withdrawn' && (r.owner === 'admin' || r.history.some(function (h) { return h.includes('企业审批通过'); })); }
  function pendingRequests() { return state.requests.filter(function (r) { return role() === 'admin' ? r.company === company && r.status === 'enterprise' && r.owner === 'employee' : role() === 'property' && propertyCanSee(r) && r.status === 'property' && r.propertyReview !== 'processing'; }); }
  function pendingVehicleRequests() { return role() === 'admin' ? state.vehicleRequests.filter(function (r) { return r.company === company && r.status === 'enterprise_pending' && r.owner === 'employee'; }) : []; }
  // Employee monitor / release requests waiting for the enterprise stage.
  function pendingDomainRequests(collection) { return role() === 'admin' ? domainRecords(collection).filter(function (r) { return r.company === company && r.owner === 'employee' && r.status === 'enterprise_pending'; }) : []; }
  // Stage of an employee domain record in 企业审批: pending until decided; withdrawn records leave the list.
  function domainEnterpriseStage(r) {
    if (r.status === 'enterprise_pending') return 'pending';
    if (r.enterpriseStatus === 'rejected') return 'rejected';
    if (r.enterpriseStatus === 'approved' || r.enterpriseStatus === 'supplement') return 'approved';
    return null;
  }
  function meetingTime(value) { return Date.parse(value + ':00+08:00'); }
  function meetingUsed(r, item) { return window.MiniStore.data.bookings.some(function (b) { return (!item || b.id !== item.id) && b.approvalId === r.id && (b.status !== '已取消' || b.approvalConsumed); }); }
  function validMeeting(r, item) { return r && r.type === 'meeting' && r.owner === 'employee' && r.company === company && r.status === 'approved' && Number.isFinite(r.amount) && r.amount > 0 && meetingTime(r.meetingEnd) > Date.now() && meetingTime(r.meetingEnd) > meetingTime(r.meetingStart) && !meetingUsed(r, item); }
  function bookingApproval(item) { return role() === 'employee' ? state.requests.find(function (r) { return r.id === (item ? item.approvalId : meetingApplicationId) && validMeeting(r, item); }) : null; }
  function canBook(item) { return role() === 'admin' || role() === 'employee' && !!bookingApproval(item); }
  function validateBooking(date, times, price, item) {
    if (role() === 'admin') return '';
    var r = bookingApproval(item);
    if (!r) return '请先提交场地预定申请，经企业管理员和物业审批通过后再预定；每份申请仅用于一笔预约。';
    if (times.some(function (time) { var parts = time.split(/[–—-]/), start = meetingTime(date + 'T' + parts[0]), end = meetingTime(date + 'T' + parts[1]); return parts.length !== 2 || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || start < meetingTime(r.meetingStart) || end > meetingTime(r.meetingEnd); })) return '预约时段须在批准的使用时间内。';
    if (!Number.isFinite(price) || price * times.length > r.amount) return '预计费用超出批准预算，请减少时段、选择其他场地或重新申请。';
    return '';
  }
  function completeFeeRequest(collection, id, receipt) {
    if (role() !== 'property' || !['requests', 'vehicleRequests'].includes(collection)) return false;
    var record = state[collection].find(function (item) { return item.id === id; });
    if (!record || record.company !== company || (collection === 'requests' ? record.type !== 'utilities' || record.status !== 'execution' : record.type !== 'parking' || record.status !== 'finance_pending')) return false;
    var reference = domainNote(receipt && receipt.reference), amount = Number(record.amount);
    if (!receipt || receipt.verified !== true || !reference || !Number.isFinite(amount) || amount <= 0) return false;
    return domainCommit(function () {
      record.feeVerification = { amount: amount, reference: reference, by: identities.property, at: new Date().toISOString() };
      record.status = 'approved'; record.feePaid = true;
      pushHistory(record, identities.property + '：已核验实际到账 ¥' + amount.toFixed(2) + '，费用办理完成 · ' + reference);
      notifyOutcome(record, record.title || record.category || '费用申请', 'paid', '物业已核验实际到账，费用办理完成');
    });
  }
  function requestState(r) {
    if (r.type === 'utilities' && r.status === 'approved') return '已完成';
    if (r.status === 'property' && r.propertyReview === 'processing') return '物业审核中';
    if (r.type === 'meeting' && r.status === 'approved') {
      if (meetingUsed(r)) return window.MiniStore.data.bookings.some(function (b) { return b.approvalId === r.id && b.status !== '已取消'; }) ? '已预定' : '已使用 · 不可重订';
      return meetingTime(r.meetingEnd) <= Date.now() ? '已过期' : '已批准 · 待预定';
    }
    return { enterprise: '待企业审批', property: '待物业审批', execution: '待物业办理', approved: '已批准', rejected: '已驳回', withdrawn: '已撤回' }[r.status];
  }
  function meetingSummary(card, r) { if (r.room) card.append(el('p', '申请场地：' + r.room)); card.append(el('p', '预算金额：¥' + r.amount.toFixed(2)), el('p', '使用时间：' + r.meetingStart.replace('T', ' ') + ' 至 ' + r.meetingEnd.replace('T', ' ') + '（北京时间）')); }
  function chooseMeeting(r) { if (role() !== 'employee' || !validMeeting(r)) return showMeetingList(); meetingApplicationId = r.id; originalShow('meeting'); syncMeetingList(); if (r.room && window.__openMeetingBooking) window.__openMeetingBooking(r.room); }
  function openMeetingEntry() { if (role() === 'employee') showMeetingList(); else open('meeting'); }
  // Employee venue booking: the same room list as admins, with a scrolling notice and "申请场地预定" buttons.
  function showMeetingList() {
    meetingApplicationId = null; originalShow('meeting'); syncMeetingList();
  }
  function syncMeetingList() {
    var page = document.getElementById('meeting'); if (!page) return;
    var employeeView = role() === 'employee' && !meetingApplicationId;
    var notice = page.querySelector(':scope > .journey-notice');
    if (employeeView && !notice) {
      notice = el('div', undefined, 'journey-notice'); notice.setAttribute('role', 'note');
      var track = el('div', undefined, 'journey-notice-track'); track.append(el('span', '先申请，再预定。选择会议室后填写预算金额、使用时间与申请理由，经企业管理员、物业依次审批通过后即可预定。', 'journey-copy'));
      var close = el('button', '×', 'journey-notice-close'); close.type = 'button'; close.setAttribute('aria-label', '关闭提示'); close.onclick = function () { notice.remove(); };
      notice.append(track, close); page.prepend(notice);
    } else if (!employeeView && notice) notice.remove();
    page.querySelectorAll('.meeting-quick-open').forEach(function (button) {
      var room = button.getAttribute('aria-label').replace(/^(立即预订|预订|申请场地预定)/, '');
      button.closest('.meeting-card-footer').parentElement.dataset.meetingRoom = room;
      button.textContent = employeeView ? '申请场地预定' : '立即预订';
      button.setAttribute('aria-label', (employeeView ? '申请场地预定' : '立即预订') + room);
      button.classList.toggle('meeting-apply-open', employeeView);
    });
  }
  // Application sheet opened from a room card; the record is reviewed by an enterprise admin and listed under 我的.
  function openMeetingApplySheet(roomName) {
    if (role() !== 'employee') return open('role-denied');
    var phone = document.querySelector('.phone') || document.body, requester = role();
    var mask = el('div', undefined, 'journey-modal'), sheet = el('form', undefined, 'role-panel journey-form-panel journey-modal-sheet meeting-apply-sheet');
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'meeting-apply-title'); sheet.noValidate = false;
    var head = el('div', undefined, 'journey-modal-head'), title = el('h2', '申请场地预定 · ' + roomName); title.id = 'meeting-apply-title';
    function onKey(event) { if (event.key === 'Escape') hide(); }
    function hide() { mask.remove(); document.removeEventListener('keydown', onKey); }
    var closeButton = el('button', '×', 'journey-modal-close'); closeButton.type = 'button'; closeButton.setAttribute('aria-label', '关闭申请弹窗'); closeButton.onclick = hide;
    head.append(title, closeButton);
    var card = el('div', undefined, 'form-card');
    card.append(el('p', '提交后先由企业管理员审批，再由物业审批；全部通过后在「我的 → 我的预约 → 场地预定」中选择场地完成预定，不涉及线上付款。', 'journey-copy'));
    sheet.append(head, card);
    var amount = field(card, '预算金额（元）', 'number', 'amount'), date = field(card, '预约日期', 'date', 'date');
    if (window.__miniDatePicker) window.__miniDatePicker.enhance(date, {mode:'date',title:'选择预约日期',host:phone});
    var timeField = el('div', undefined, 'meeting-apply-time-field'), timeLabel = el('p', '可选时段 · 可多选，每场1小时'), slots = el('div', undefined, 'meeting-apply-slots');
    ['09:00–10:00', '10:00–11:00', '11:00–12:00', '13:30–14:30', '14:30–15:30', '15:30–16:30'].forEach(function (time) {
      var slot = el('button', time, 'meeting-apply-slot'); slot.type = 'button'; slot.setAttribute('aria-pressed', 'false');
      slot.onclick = function () { var selected = slot.classList.toggle('selected'); slot.setAttribute('aria-pressed', String(selected)); };
      slots.append(slot);
    });
    timeField.append(timeLabel, slots); card.append(timeField);
    var reason = field(card, '申请理由', 'textarea', 'description');
    amount.min = '0.01'; amount.max = '1000000'; amount.step = '0.01';
    var status = el('p', '', 'role-feedback'); status.setAttribute('role', 'status'); sheet.append(status);
    var bar = el('div', undefined, 'role-actions journey-actions journey-block-actions'), submit = el('button', '提交申请', 'role-primary'); submit.type = 'submit'; bar.append(submit); sheet.append(bar);
    sheet.onsubmit = function (event) {
      event.preventDefault(); if (role() !== requester) { hide(); return open('role-denied'); }
      if (!sheet.reportValidity()) return;
      var selected = Array.from(slots.querySelectorAll('.selected')).map(function (slot) { return slot.textContent; });
      if (![amount, date, reason].every(function (input) { return input.value.trim(); }) || !selected.length || !(Number(amount.value) > 0)) { status.textContent = '请填写有效的预算金额、预约日期、可选时段和申请理由。'; return; }
      selected.sort();
      var first = selected[0].split(/[–—-]/), last = selected[selected.length - 1].split(/[–—-]/);
      var start = date.value + 'T' + first[0], end = date.value + 'T' + last[1];
      if (meetingTime(start) <= Date.now()) { status.textContent = '预约日期和时段须晚于当前时间。'; return; }
      var record = { id: 'SQ' + Date.now().toString(36), owner: role(), company: company, type: 'meeting', room: roomName, detail: reason.value.trim(), amount: Number(amount.value), meetingStart: start.value, meetingEnd: end.value, status: 'enterprise', history: [identities[role()] + '提交场地预定申请（' + roomName + '）'] };
      if (!commit(function () { state.requests.unshift(record); })) { status.textContent = feedback.textContent || '保存失败，请重试。'; return; }
      hide(); toast('申请已提交，可在「我的 → 我的预约」中查看审批进度');
    };
    mask.addEventListener('click', function (event) { if (event.target === mask) hide(); });
    mask.append(sheet); phone.append(mask); document.addEventListener('keydown', onKey); amount.focus({ preventScroll: true });
  }
  function showMeetingApplications() {
    if (role() !== 'employee') return open('meeting');
    heading(meetingApplications, '场地预定', '先申请，再预定。请填写预算金额、使用时间与申请理由，经企业管理员、物业依次审批通过后选择场地。');
    actions(meetingApplications).append(action('申请场地预定', function () { showForm('meeting'); }, true));
    var rows = ownRequests().filter(function (r) { return r.type === 'meeting'; });
    if (!rows.length) empty(meetingApplications, '暂无场地预定申请，提交后可在这里查看审批进度。');
    rows.forEach(function (r) { var card = panel('场地预定申请', requestState(r), '申请理由：' + r.detail); meetingSummary(card, r); var bar = actions(card); bar.append(action('查看进度', function () { showDetail(r, 'role-meeting-applications'); })); if (validMeeting(r)) bar.append(action('选择场地并预定', function () { chooseMeeting(r); }, true)); else if (meetingUsed(r)) bar.append(action('查看预约', function () { open('my-bookings'); })); meetingApplications.append(card); });
    open('role-meeting-applications');
  }
  var menu = profile.querySelector('.mp-my-services'), grid = menu.querySelector('.mp-service-grid');
  var menuTitle = el('h2', '我的服务', 'role-section-title'); menu.prepend(menuTitle);
  var todos = profile.querySelector('[data-profile-todos]');
  var todoGrid = todos.querySelector('.mp-todo-grid');
  todos.classList.add('property-workbench'); todoGrid.classList.add('mp-service-grid', 'mp-four-col');
  todos.prepend(el('h2', '企业工作台', 'role-section-title'));
  function service(label, icon, handler) {
    var button = el('button', undefined, 'mp-service-item'); button.type = 'button'; button.dataset.profileEntry = label;
    var box = el('span', undefined, 'mp-icon-box'), symbol = el('i'); symbol.dataset.lucide = icon; symbol.setAttribute('aria-hidden', 'true'); box.append(symbol);
    button.append(box, el('div', label, 'mp-service-title')); button.onclick = handler; grid.append(button);
  }
  function propertyCard(label, icon, count, unit, handler, target) {
    var button = el('button', undefined, 'property-workbench-card'); button.type = 'button'; button.dataset.profileEntry = label;
    var box = el('span', undefined, 'mp-icon-box'), symbol = el('i'); symbol.dataset.lucide = icon; symbol.setAttribute('aria-hidden', 'true'); box.append(symbol);
    var head = el('span', undefined, 'property-workbench-head'), arrow = el('i'); arrow.dataset.lucide = 'chevron-right'; arrow.setAttribute('aria-hidden', 'true'); head.append(box, el('strong', label), arrow);
    var summary = el('span', undefined, 'property-workbench-summary'); summary.append(el('b', String(count), count ? 'property-count' : 'property-count property-count-empty'), el('span', unit));
    button.append(head, summary); button.onclick = handler; (target || grid).append(button);
  }
  function renderProfile() {
    grid.replaceChildren(); todoGrid.replaceChildren(); menu.hidden = false; todos.hidden = role() !== 'admin';
    menu.classList.toggle('is-locked', role() === 'guest');
    menuTitle.textContent = role() === 'property' ? '物业工作台' : '我的服务';
    menu.classList.toggle('property-workbench', role() === 'property');
    if (role() === 'guest') {
      // Unverified visitors see the same entries greyed out; tapping explains that 企业认证 is required.
      var locked = function () { showPermission('「我的申请、我的预约、我的工单、我的账单」需完成企业认证后才可使用。', '请在「我的 → 访客用户」中绑定所在企业，由企业管理员审核通过后即可使用。'); };
      [['我的申请', 'file-text'], ['我的预约', 'calendar-check'], ['我的工单', 'clipboard-list'], ['我的账单', 'receipt']].forEach(function (item) {
        service(item[0], item[1], locked); var tile = grid.lastElementChild; tile.classList.add('is-locked'); tile.setAttribute('aria-disabled', 'true'); tile.setAttribute('aria-label', item[0] + '，需企业认证后使用');
      });
    } else if ((role() === 'employee' || role() === 'admin') && window.__myServices) {
      service('我的申请', 'file-text', function () { window.__myServices.open('applications'); });
      service('我的预约', 'calendar-check', function () { window.__myServices.open('reservations'); });
      service('我的工单', 'clipboard-list', function () { window.__myServices.open('work-orders'); });
      service('我的账单', 'receipt', function () { window.__myServices.open('orders'); });
    } else if (role() === 'admin') {
      service('企业预约', 'calendar-check', showEnterpriseReservations);
      service('我的报修', 'wrench', function () { showRepairs(); });
      service('我的申请', 'file-text', function () { showRequests(); });
    } else if (role() === 'employee') {
      service('我的会议', 'calendar-check', function () { open('my-bookings'); });
      service('接待访客', 'user-plus', showVisitors);
      service('我的报修', 'wrench', function () { showRepairs(); });
      service('我的申请', 'file-text', function () { showRequests(); });
    }
    if (role() === 'admin') {
      propertyCard('审批', 'clipboard-check', pendingRequests().filter(function (r) { return !cardIsHidden('request', r.id); }).length + pendingVehicleRequests().filter(function (r) { return !cardIsHidden('vehicle', r.id); }).length + pendingDomainRequests('monitorRequests').filter(function (r) { return !cardIsHidden('monitor', r.id); }).length + pendingDomainRequests('releaseRequests').filter(function (r) { return !cardIsHidden('release', r.id); }).length, '项待审批', showApprovals, todoGrid);
      propertyCard('账单', 'receipt', enterpriseFees().filter(function (item) { return item.stage !== 'paid'; }).length, '笔待缴费', function () { showBills('unpaid'); }, todoGrid);
      propertyCard('成员审核', 'user-check', memberApplications().filter(function (item) { return item.status === 'pending'; }).length, '项待审核', renderMembers, todoGrid);
    }
    if (role() === 'property' && window.__propertyWorkbench) {
      window.__propertyWorkbench.renderProfile();
    } else if (role() === 'property') {
      todos.hidden = true;
      propertyCard('装修审批', 'clipboard-check', pendingRequests().length, '项待审批', showApprovals);
      propertyCard('报修处理', 'wrench', repairs().filter(function (r) { return r.status === 'pending' || r.status === 'processing'; }).length, '项待处理', showRepairs);
      propertyCard('企业欠费', 'receipt', new Set(state.bills.filter(overdue).map(function (b) { return b.company; })).size, '家欠费企业', function () { showBills(true); });
      propertyCard('联系咨询', 'messages-square', window.__propertyMessages ? window.__propertyMessages.pendingCount() : 0, '条待回复', function () { if (window.__propertyMessages) window.__propertyMessages.open(); else open('messages'); });
    }
    var park = document.getElementById('home-park-services');
    if (park) {
      park.querySelectorAll('[data-park-unavailable]').forEach(function (button) {
        if (['装修申请', '水电缴费'].includes(button.dataset.parkUnavailable)) {
          button.removeAttribute('aria-disabled'); button.dataset.roleApplication = button.dataset.parkUnavailable === '装修申请' ? 'renovation' : 'utilities';
        }
      });
    }
    syncServiceEntries();
    if (window.lucide) lucide.createIcons();
  }
  // One visibility rule for 首页 and 更多服务: property staff only see services they can use themselves
  // (车辆服务, 订餐服务, 反馈通道); enterprise-only submissions are hidden instead of failing after a tap.
  var propertyServices = ['journey-vehicle', 'journey-dining', 'vehicle', 'restaurant', 'feedback'];
  function serviceKey(button) { return button.dataset.journey || button.dataset.page || button.dataset.parkJourney && 'journey-' + button.dataset.parkJourney || ''; }
  var syncingEntries = false;
  function syncServiceEntries() {
    if (syncingEntries) return;
    syncingEntries = true;
    document.querySelectorAll('#home-park-services button, #park-services-all .park-services-all-grid button').forEach(function (button) {
      var key = serviceKey(button);
      if (!key || key === 'park-services-all') return;
      var hide = role() === 'property' && !propertyServices.includes(key);
      if (button.hidden !== hide) button.hidden = hide;
    });
    syncingEntries = false;
  }
  new MutationObserver(syncServiceEntries).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-journey'] });
  function showRequests() {
    if (!enterprise()) return open('role-denied');
    heading(requestsPage, '我的申请', '用于场地预定、水电缴费和装修；停车费用代缴请在车辆服务中办理。申请批准不等于已预定、已付款或已施工。');
    var toolbar = actions(requestsPage); Object.keys(types).filter(function (type) { return type !== 'meeting' || role() === 'employee'; }).forEach(function (type) { toolbar.append(action(types[type], function () { showForm(type); }, true)); });
    var records = ownRequests(); if (!records.length) empty(requestsPage, '暂无申请，选择上方事项发起申请。');
    records.forEach(function (r) { var card = panel(types[r.type], requestState(r), r.detail); if (r.type === 'meeting') meetingSummary(card, r); actions(card).append(action('查看进度', function () { showDetail(r, 'role-requests'); })); requestsPage.append(card); }); open('role-requests');
  }
  function field(form, title, type, name) {
    var label = el('label', title + ' *'), input = el(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') input.type = type || 'text'; input.required = true; input.name = name; input.maxLength = 1000; label.append(input); form.append(label); return input;
  }
  function showForm(type, options) {
    var returnTo = options && options.returnTo;
    if (!enterprise()) return open('role-denied');
    if (type === 'meeting' && role() !== 'employee') return open('role-denied');
    if (!types[type]) return open('role-denied');
    if (type === 'meeting') showMeetingApplications();
    window.__setMiniRoute('role-request-form', returnTo ? types[type] : '发起申请', returnTo || (type === 'meeting' ? 'role-meeting-applications' : 'role-requests'));
    heading(formPage, types[type], type === 'meeting' ? '企业管理员批准后方可预定，预约时间与费用须在批准范围内。每份申请仅用于一笔预约，未开始的预约取消后可在有效期内重新预定；已开始的预约取消不恢复申请资格。' : role() === 'admin' ? '管理员提交的申请无需企业审批，直接提交物业审批。' : '提交后由企业管理员审批，审批通过后继续提交物业审批。');
    // Opened from home: single submit page (notice + card + button); records live under 我的.
    formPage.classList.toggle('journey-page-split', !!returnTo); formPage.toggleAttribute('data-dirty-guard', !!returnTo);
    var formBody = returnTo ? noticeLayout(formPage, role() === 'admin' ? (type === 'renovation' ? '管理员提交的装修申请直接进入物业审批。' : '填写账单编号与申请事由，提交后直接进入物业审批。') : type === 'renovation' ? '提交后由企业管理员审批，审批通过后继续提交物业审批。' : '填写账单编号与申请事由，提交后由企业管理员审批，再由物业审批。') : formPage;
    var form = el('form', undefined, 'role-panel'), inputs = {}, requester = role();
    var titleInput = el('input'); titleInput.type = 'text'; titleInput.name = 'title'; titleInput.maxLength = 40; titleInput.placeholder = '选填，便于在列表中识别'; var titleLabel = el('label', '申请标题'); titleLabel.append(titleInput); form.append(titleLabel);
    if (type === 'meeting') { inputs.amount = field(form, '预算金额（元）', 'number', 'amount'); inputs.start = field(form, '使用开始时间（北京时间）', 'datetime-local', 'start'); inputs.end = field(form, '使用结束时间（北京时间）', 'datetime-local', 'end'); }
    if (type === 'meeting' && window.__miniDatePicker) { window.__miniDatePicker.enhance(inputs.start, {mode:'datetime',title:'使用开始时间'}); window.__miniDatePicker.enhance(inputs.end, {mode:'datetime',title:'使用结束时间'}); }
    if (type === 'utilities') { inputs.bill = field(form, '账单编号', 'text', 'bill'); inputs.amount = field(form, '申请金额（元）', 'number', 'amount'); }
    if (type === 'renovation') { inputs.location = field(form, '装修位置', 'text', 'location'); inputs.start = field(form, '计划开工日期', 'date', 'start'); inputs.end = field(form, '计划结束日期', 'date', 'end'); inputs.contractor = field(form, '施工单位及联系人', 'text', 'contractor'); }
    if (type === 'renovation' && window.__miniDatePicker) { window.__miniDatePicker.enhance(inputs.start, {mode:'date',title:'计划开工日期'}); window.__miniDatePicker.enhance(inputs.end, {mode:'date',title:'计划结束日期'}); }
    inputs.description = field(form, type === 'meeting' ? '申请理由' : type === 'renovation' ? '装修范围与施工说明' : '申请事由', 'textarea', 'description');
    if (inputs.amount) { inputs.amount.min = '0.01'; inputs.amount.max = '1000000'; inputs.amount.step = '0.01'; }
    var status = el('p', '', 'role-feedback'); status.setAttribute('role', 'status'); form.append(status);
    if (type === 'meeting') { status.id = 'meeting-application-feedback'; Object.values(inputs).forEach(function (input) { input.setAttribute('aria-describedby', status.id); }); }
    // Submit sits below the card as a full-width block; the form attribute keeps native submit/validation.
    form.id = 'role-request-form-fields';
    var submitBar = el('div', undefined, 'role-actions journey-actions journey-block-actions'), submit = el('button', '提交申请', 'role-primary'); submit.type = 'submit'; submit.setAttribute('form', form.id); submitBar.append(submit);
    form.onsubmit = function (event) {
      event.preventDefault(); if (!enterprise() || role() !== requester) return open('role-denied'); if (!form.reportValidity()) return;
      if (Object.values(inputs).some(function (input) { return !input.value.trim(); })) { status.textContent = '请填写所有必填项。'; return; }
      if (type === 'meeting' && (meetingTime(inputs.start.value) <= Date.now() || meetingTime(inputs.end.value) <= meetingTime(inputs.start.value))) { status.textContent = '使用开始时间须晚于当前时间，结束时间须晚于开始时间。'; return; }
      if (inputs.start && inputs.end.value < inputs.start.value) { status.textContent = '结束日期不能早于开工日期。'; return; }
      var detail = Object.values(inputs).filter(function (input) { return input !== inputs.amount; }).map(function (input) { return input.value.trim(); }).join(' · ');
      var record = { id: 'SQ' + Date.now().toString(36), owner: role(), company: company, type: type, title: titleInput.value.trim(), detail: detail, amount: inputs.amount ? Number(inputs.amount.value) : 0, status: firstRequestStatus(type), history: [identities[role()] + '提交申请'] };
      if (type === 'meeting') { record.detail = inputs.description.value.trim(); record.meetingStart = inputs.start.value; record.meetingEnd = inputs.end.value; }
      if (commit(function () { state.requests.unshift(record); })) { if (returnTo) finishSubmit(returnTo); else showDetail(record, type === 'meeting' ? 'role-meeting-applications' : 'role-requests'); } else status.textContent = feedback.textContent;
    }; formBody.append(form, submitBar); open('role-request-form');
  }
  function canView(r) { return role() === 'property' ? propertyCanSee(r) : enterprise() && r.company === company && (r.owner === role() || role() === 'admin'); }
  function canApprove(r) { return pendingRequests().includes(r) || role() === 'property' && canView(r) && r.status === 'property' && r.propertyReview === 'processing'; }
  function approvalHistory(r) { return r.history.filter(function (h) { return h.indexOf(identities[role()] + '：') === 0; }); }
  function approvalPassed(r) { return approvalHistory(r).some(function (h) { return h.includes('审批通过'); }); }
  function approvalInProgress(r) { return approvalPassed(r) && role() === 'admin' && ['property', 'execution'].includes(r.status); }
  function showApprovals() {
    if (!['admin', 'property'].includes(role())) return open('role-denied');
    renderApprovals();
    window.__setMiniRoute('role-approvals', role() === 'property' ? '装修审批' : '审批', 'profile'); open('role-approvals');
  }
  function renderApprovals() {
    var pending = pendingRequests();
    var processed = state.requests.filter(function (r) { return canView(r) && (role() !== 'admin' || r.owner === 'employee') && approvalHistory(r).length; });
    var all = pending.concat(processed.filter(function (r) { return !pending.includes(r); }));
    var propertyView = role() === 'property';
    if (!propertyView) return renderEnterpriseApprovals(pending, processed);
    var rows, tabs, selectedTab = renovationTab;
    all = state.requests.filter(canView);
    rows = all.filter(function (r) { return renovationTab === 'all' || (renovationTab === 'pending' ? r.status === 'property' && r.propertyReview !== 'processing' : renovationTab === 'in-progress' ? r.status === 'property' && r.propertyReview === 'processing' : ['approved', 'rejected'].includes(r.status)); });
    tabs = [['all', '全部'], ['pending', '未审批'], ['in-progress', '进行中'], ['approved', '已结束']];
    approvalsPage.replaceChildren(); approvalsPage.classList.remove('enterprise-approvals');
    var tabList = el('div', undefined, 'approval-tabs'); tabList.setAttribute('role', 'group'); tabList.setAttribute('aria-label', '审批筛选');
    tabs.forEach(function (item) { var button = el('button', item[1]); button.type = 'button'; button.setAttribute('aria-pressed', String(selectedTab === item[0])); button.classList.toggle('active', selectedTab === item[0]); button.dataset.approvalTab = item[0]; button.onclick = function () { renovationTab = item[0]; renderApprovals(); approvalsPage.querySelector('[data-approval-tab="' + item[0] + '"]').focus({ preventScroll: true }); }; tabList.append(button); });
    approvalsPage.append(tabList);
    rows.forEach(function (r) {
      var waiting = canApprove(r), card = panel(r.title || types[r.type], requestState(r)); card.classList.add('approval-card');
      infoGrid(card, approvalCardFields(r));
      var bar = cardBar(card), view = function () { showDetail(r, 'role-approvals'); };
      if (waiting) bar.append(action('详情', view), action(r.propertyReview === 'processing' ? '继续审批' : '审核申请', view, true));
      else bar.append(action('详情', view));
      approvalsPage.append(card);
    });
    if (!rows.length && !state.vehicleRequests.length) empty(approvalsPage, ({ all: '暂无审批记录', pending: '暂无待审批申请', approved: '暂无已结束的审批', 'in-progress': '暂无进行中的审批' })[selectedTab]);
  }
  // 企业审批 follows the 物业审批 layout: two status tabs, type tag + one-line title, 详情 then primary 审批通过 rightmost.
  var vehicleStatusText = { enterprise_pending: '待企业审批', property_pending: '待物业审批', finance_pending: '待物业办理', approved: '已完成', rejected: '已驳回' };
  function renderEnterpriseApprovals(pending, processed) {
    approvalsPage.replaceChildren(); approvalsPage.classList.add('enterprise-approvals');
    if (!['pending', 'approved', 'rejected'].includes(approvalTab)) approvalTab = 'pending';
    var tabList = el('div', undefined, 'approval-tabs'); tabList.setAttribute('role', 'tablist'); tabList.setAttribute('aria-label', '审批筛选');
    [['pending', '待审批'], ['approved', '已通过'], ['rejected', '已驳回']].forEach(function (item) { var button = el('button', item[1]); button.type = 'button'; button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(approvalTab === item[0])); button.classList.toggle('active', approvalTab === item[0]); button.dataset.approvalTab = item[0]; button.onclick = function () { approvalTab = item[0]; delete approvalsPage.dataset.typeFilter; renderApprovals(); approvalsPage.querySelector('[data-approval-tab="' + item[0] + '"]').focus({ preventScroll: true }); }; tabList.append(button); });
    var content = el('div', undefined, 'enterprise-approval-content'); content.setAttribute('role', 'region'); content.setAttribute('aria-label', '审批列表');
    approvalsPage.append(tabList, content);
    var allCards = [];
    pending.forEach(function (r) { allCards.push({ kind: 'request', record: r, stage: 'pending', typeKey: r.type }); });
    processed.filter(function (r) { return !pending.includes(r); }).forEach(function (r) {
      allCards.push({ kind: 'request', record: r, stage: approvalHistory(r).some(function(h){return h.includes('审批通过');}) ? 'approved' : 'rejected', typeKey: r.type });
    });
    state.vehicleRequests.filter(function (r) { return r.company === company && r.owner === 'employee'; }).forEach(function (r) {
      var stage = r.status === 'enterprise_pending' && r.owner === 'employee' ? 'pending' : r.status === 'rejected' ? 'rejected' : r.status !== 'enterprise_pending' ? 'approved' : null;
      if (stage) allCards.push({ kind: 'vehicle', record: r, stage: stage, typeKey: 'vehicle' });
    });
    [['monitorRequests', 'monitor'], ['releaseRequests', 'release']].forEach(function (pair) {
      domainRecords(pair[0]).filter(function (r) { return r.company === company && r.owner === 'employee'; }).forEach(function (r) {
        var stage = domainEnterpriseStage(r); if (stage) allCards.push({ kind: pair[1], record: r, stage: stage, typeKey: pair[1] });
      });
    });
    var stageCards = allCards.filter(function (c) { return c.stage === approvalTab && !cardIsHidden(c.kind, c.record.id); });
    // Fixed type list: every status tab shows the same chips, empty types show 0.
    var typeKeys = ['renovation', 'vehicle', 'meeting', 'utilities', 'release', 'monitor'];
    var typeNames = { meeting: '场地预定', utilities: '水电缴费', renovation: '装修申请', vehicle: '车辆服务', release: '物品放行', monitor: '监控调取' };
    var selectedType = approvalsPage.dataset.typeFilter || 'all';
    if (selectedType !== 'all' && !typeKeys.includes(selectedType)) selectedType = 'all';
    var filterBar = el('div', undefined, 'enterprise-type-filter'); filterBar.setAttribute('role', 'group'); filterBar.setAttribute('aria-label', '类型筛选');
    [['all', '全部']].concat(typeKeys.map(function(k){ return [k, typeNames[k]||k]; })).forEach(function(item) {
      var count = item[0]==='all' ? stageCards.length : stageCards.filter(function(c){return c.typeKey===item[0];}).length;
      var chip = el('button'); chip.type='button'; chip.className='enterprise-type-chip'; chip.dataset.typeFilter=item[0];
      chip.setAttribute('aria-pressed', String(selectedType===item[0])); chip.classList.toggle('active', selectedType===item[0]);
      chip.append(el('span', item[1]+' '+count)); filterBar.append(chip);
      chip.onclick = function () { approvalsPage.dataset.typeFilter = item[0]; renderApprovals(); };
    });
    approvalsPage.insertBefore(filterBar, content);
    var filtered = selectedType==='all' ? stageCards : stageCards.filter(function(c){return c.typeKey===selectedType;});
    filtered.forEach(function (c) {
      var r = c.record;
      if (c.kind === 'monitor' || c.kind === 'release') {
        var release = c.kind === 'release';
        approvalCard(content, release ? '物品放行' : '监控调取', release ? (r.items || '物品放行单') : (r.scope || '监控调取'), domainStatusText(c.kind, r),
          release ? [['申请企业', r.company], ['提交人', r.applicantName || identities[r.owner]], ['放行地点', r.location], ['计划时间', String(r.plannedAt || '').replace('T', ' ') + (r.plannedEndAt ? ' 至 ' + String(r.plannedEndAt).replace('T', ' ').slice(11) : '')]]
            : [['申请企业', r.company], ['提交人', identities[r.owner]], ['调取时段', r.requestedAt], ['调取原因', r.purpose]],
          function () { showDomainEnterpriseDetail(c.kind, r); },
          c.stage === 'pending' && function () { return release ? reviewReleaseEnterprise(r.id, 'approved') : reviewMonitorRequest(r.id, 'approved'); }, c.kind, r.id);
      } else if (c.kind === 'vehicle') {
        approvalCard(content, '车辆服务', r.category || '车辆事项', vehicleStatusText[r.status] || r.status,
          [['申请企业', r.company], ['提交人', identities[r.owner]], ['车牌号', r.vehiclePlate || '未填写'], ['申请说明', r.detail], ['金额', r.amount ? '¥' + Number(r.amount).toFixed(2) : '']],
          function () { showVehicleDetail(r); },
          c.stage === 'pending' && function () { return reviewVehicleRequest(r.id, 'approved'); }, 'vehicle', r.id);
      } else {
        approvalCard(content, approvalTypeText[r.type] || types[r.type], approvalTitle(r), requestState(r), approvalCardFields(r),
          function () { showDetail(r, 'role-approvals'); },
          c.stage === 'pending' && canApprove(r) && function () {
            return commit(function () { r.status = afterEnterprise(r.type); r.history.push(identities[role()] + '：企业审批通过'); notifyOutcome(r, types[r.type] || '申请', 'approved', ''); });
          }, 'request', r.id);
      }
    });
    if (!content.children.length) empty(content, ({ pending:'暂无待审批申请', approved:'暂无已通过申请', rejected:'暂无已驳回申请' })[approvalTab]||'暂无记录');
  }
  var approvalTypeText = { meeting: '场地预定', utilities: '水电缴费', renovation: '装修申请' };
  // Card title: own title, else the most specific segment of the detail (装修内容 / 费用事由).
  function approvalTitle(r) {
    if (r.title) return r.title;
    var parts = String(r.detail || '').split(' · ').map(function (part) { return part.trim(); }).filter(Boolean);
    if (r.type === 'renovation' && parts[1] && !/^\d{4}-\d{2}-\d{2}$/.test(parts[1])) return parts[1];
    return parts.length > 1 ? parts[parts.length - 1] : types[r.type];
  }
  function approvalCard(list, typeText, title, status, fields, onView, onApprove, hideKind, hideId) {
    var card = panel(title, status); card.classList.add('approval-card', 'is-clickable');
    card.querySelector('.role-row').prepend(el('span', typeText, 'card-type-chip'));
    infoGrid(card, fields);
    var note = el('p', '', 'role-feedback'); note.setAttribute('role', 'status'); card.append(note);
    var bar = cardBar(card); if (hideKind) bar.append(cardDelete(hideKind, hideId, title, note, renderApprovals)); bar.append(action('详情', onView));
    if (onApprove) bar.append(action('审批通过', function () {
      var run = function () { if (onApprove()) renderApprovals(); else note.textContent = '身份或申请状态已变化，请刷新后重试。'; };
      if (window.__miniConfirm) window.__miniConfirm({ title: '确认审批通过？', message: '确认审批通过「' + title + '」？通过后申请将进入下一环节。', confirmText: '审批通过', onConfirm: run }); else run();
    }, true));
    card.tabIndex = 0; card.setAttribute('role', 'button');
    card.addEventListener('click', function (event) { if (event.target.closest('button, a, input, textarea, select')) return; onView(); });
    card.addEventListener('keydown', function (event) { if (event.target === card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onView(); } });
    list.append(card);
  }
  function domainStatusText(kind, r) {
    if (kind === 'release') return ({ enterprise_pending: '待企业审批', pending: '待物业审批', supplement: '待补件', rejected: '已驳回', withdrawn: '已撤回' })[r.status] || (r.status === 'approved' ? (r.inspectionStatus === 'passed' ? '已批准 · 查验通过' : r.inspectionStatus === 'failed' ? '已批准 · 查验不通过' : '已批准 · 待查验') : r.status);
    return ({ enterprise_pending: '待企业审批', property_pending: '待物业审批', approved_for_offline_handover: '已批准 · 待线下对接', completed: '已完成', rejected: '已驳回', withdrawn: '已撤回' })[r.status] || r.status;
  }
  // Monitor / release detail for enterprise admins: same review block as vehicle requests; release adds 要求补件.
  function showDomainEnterpriseDetail(kind, r) {
    if (role() !== 'admin' || r.company !== company) return open('role-denied');
    var release = kind === 'release', title = release ? '物品放行' : '监控调取';
    detailPage.replaceChildren(); detailPage.classList.add('request-detail-view');
    var pendingNow = r.status === 'enterprise_pending' && r.owner === 'employee';
    var banner = el('div', undefined, 'request-detail-banner is-reviewer' + (pendingNow ? '' : ' is-closed')), head = el('div', undefined, 'request-detail-banner-head');
    head.append(el('strong', title), el('em', domainStatusText(kind, r), 'request-detail-status')); banner.append(head, el('span', [r.id, r.company, r.applicantName || identities[r.owner]].join(' · '))); detailPage.append(banner);
    var info = el('dl', undefined, 'request-detail-fields');
    var rows = release
      ? [['放行物品', r.items], ['放行地点', r.location], ['计划时间', String(r.plannedAt || '').replace('T', ' ') + (r.plannedEndAt ? ' 至 ' + String(r.plannedEndAt).replace('T', ' ').slice(11) : '')], ['申请说明', r.note], ['审批意见', r.enterpriseReviewNote]]
      : [['调取范围', r.scope], ['调取时段', r.requestedAt], ['调取原因', r.purpose], ['审批意见', r.enterpriseReviewNote]];
    rows.concat([['审批进度', (r.history || []).map(function (line) { return String(line).replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z · /, ''); }).join(' → ')]]).forEach(function (pair) { if (pair[1]) info.append(el('dt', pair[0]), el('dd', String(pair[1]))); });
    detailPage.append(info);
    if (pendingNow) {
      var card = el('div', undefined, 'request-detail-actions'), reason = el('textarea'); reason.placeholder = release ? '驳回或要求补件时必填' : '驳回时必填原因'; reason.setAttribute('aria-label', '审批意见'); reason.maxLength = 500;
      feedback.textContent = ''; card.append(feedback, reason);
      var decide = function (decision) {
        if (decision !== 'approved' && !reason.value.trim()) { feedback.textContent = decision === 'supplement' ? '请填写需要补充的材料。' : '请填写驳回原因。'; reason.focus(); return; }
        var ok = release ? reviewReleaseEnterprise(r.id, decision, reason.value) : reviewMonitorRequest(r.id, decision, reason.value);
        if (ok) showDomainEnterpriseDetail(kind, r); else feedback.textContent = '身份或申请状态已变化，请重新进入审批。';
      };
      var bar = actions(card); bar.append(action('驳回申请', function () { decide('rejected'); }));
      if (release) bar.append(action('要求补件', function () { decide('supplement'); }));
      bar.append(action('审批通过', function () { decide('approved'); }, true));
      detailPage.append(card);
    }
    window.__setMiniRoute('role-request-detail', title + '详情', 'role-approvals'); open('role-request-detail');
  }
  // Vehicle request detail for enterprise admins; rejection needs a reason, so it lives here instead of on the card.
  function showVehicleDetail(r) {
    if (role() !== 'admin' || r.company !== company) return open('role-denied');
    detailPage.replaceChildren(); detailPage.classList.add('request-detail-view');
    var pendingNow = r.status === 'enterprise_pending' && r.owner === 'employee';
    var banner = el('div', undefined, 'request-detail-banner is-reviewer' + (pendingNow ? '' : ' is-closed')), head = el('div', undefined, 'request-detail-banner-head');
    head.append(el('strong', r.category || '车辆事项'), el('em', vehicleStatusText[r.status] || r.status, 'request-detail-status')); banner.append(head, el('span', [r.id, r.company, identities[r.owner]].join(' · '))); detailPage.append(banner);
    var info = el('dl', undefined, 'request-detail-fields');
    [['车牌号', r.vehiclePlate], ['申请说明', r.detail], ['金额', r.amount ? '¥' + Number(r.amount).toFixed(2) : ''], ['审批进度', Array.isArray(r.history) ? r.history.join(' → ') : '']].forEach(function (pair) { if (pair[1]) info.append(el('dt', pair[0]), el('dd', String(pair[1]))); });
    detailPage.append(info);
    if (pendingNow) {
      var card = el('div', undefined, 'request-detail-actions'), reason = el('textarea'); reason.placeholder = '驳回时必填原因'; reason.setAttribute('aria-label', '审批意见'); reason.maxLength = 500;
      feedback.textContent = ''; card.append(feedback, reason);
      actions(card).append(action('驳回申请', function () { if (!reason.value.trim()) { feedback.textContent = '请填写驳回原因。'; reason.focus(); return; } if (reviewVehicleRequest(r.id, 'rejected', reason.value)) showVehicleDetail(r); else feedback.textContent = '身份或申请状态已变化，请重新进入审批。'; }), action('审批通过', function () { if (reviewVehicleRequest(r.id, 'approved', reason.value)) showVehicleDetail(r); else feedback.textContent = '身份或申请状态已变化，请重新进入审批。'; }, true));
      detailPage.append(card);
    }
    window.__setMiniRoute('role-request-detail', (r.category || '车辆事项') + '详情', 'role-approvals'); open('role-request-detail');
  }
  function requestFields(r) {
    var fields = [];
    if (r.title) fields.push(['申请标题', r.title]);
    fields.push(['申请类型', types[r.type]], ['申请编号', r.id], ['申请企业', r.company], ['提交人', identities[r.owner]]);
    if (r.type === 'renovation') {
      var parts = String(r.detail || '').split(' · ').map(function (part) { return part.trim(); });
      var form = parts.length >= 5 && /^\d{4}-\d{2}-\d{2}$/.test(parts[1]);
      fields.push(['装修位置', parts[0]], ['施工时间', form ? parts[1] + ' 至 ' + parts[2] : (parts[2] || '').replace('至', ' 至 ')], ['施工单位及联系人', form ? parts[3] : parts.slice(3).join(' · ')], ['装修范围与施工说明', form ? parts.slice(4).join(' · ') : parts[1]]);
    } else fields.push(['申请说明', r.detail]);
    if (r.type === 'meeting' && r.meetingStart) fields.push(['使用时间', r.meetingStart.replace('T', ' ') + ' 至 ' + r.meetingEnd.replace('T', ' ') + '（北京时间）']);
    if (r.amount) fields.push([r.type === 'meeting' ? '预算金额' : '金额', '¥' + r.amount.toFixed(2)]);
    return fields;
  }
  function showDetail(r, parent) {
    if (!canView(r)) return open('role-denied');
    if (r.type === 'meeting' && role() === 'employee' && parent === 'role-meeting-applications') showMeetingApplications();
    // Same layout as 我的服务 detail: status banner, label/value card, then actions.
    detailPage.replaceChildren(); detailPage.classList.add('request-detail-view');
    var next = { enterprise: '下一步：企业管理员审核', property: r.type === 'meeting' ? '下一步：物业审核场地使用时间与安排' : r.type === 'utilities' ? '下一步：物业核对账单编号与金额' : '下一步：物业审核装修范围与施工安排', execution: '下一步：物业核验实际到账后确认费用办理完成，不会自动扣款', approved: r.type === 'meeting' ? '批准不占用场地，请在批准时间和预算内选择场地并预定。' : r.type === 'utilities' ? (r.feeVerification ? '物业已核验实际到账，费用办理完成。' : '费用办理已完成。') : '按批准范围施工，开工前与物业确认现场管理要求', rejected: '请按驳回原因调整，重新发起申请', withdrawn: '申请已撤回，不再进入审批' };
    var closed = ['approved', 'rejected', 'withdrawn'].includes(r.status) && !(r.type === 'meeting' && validMeeting(r));
    // Reviewers (property / admin) see type + applicant first; status moves to a tag. Employees keep status-first.
    var reviewer = role() === 'property' || role() === 'admin';
    var banner = el('div', undefined, 'request-detail-banner' + (closed ? ' is-closed' : '') + (reviewer ? ' is-reviewer' : ''));
    if (reviewer) { var head = el('div', undefined, 'request-detail-banner-head'); head.append(el('strong', types[r.type]), el('em', requestState(r), 'request-detail-status')); banner.append(head, el('span', [r.id, r.company, identities[r.owner]].join(' · '))); }
    else banner.append(el('strong', requestState(r)), el('span', types[r.type]));
    detailPage.append(banner);
    var info = el('dl', undefined, 'request-detail-fields');
    var shown = reviewer ? requestFields(r).filter(function (pair) { return ['申请类型', '申请编号', '申请企业', '提交人'].indexOf(pair[0]) < 0; }) : requestFields(r);
    shown.concat([['审批进度', r.history.join(' → ')], ['下一步', (next[r.status] || '').replace(/^下一步：/, '')]]).forEach(function (pair) { if (pair[1] === undefined || pair[1] === '') return; info.append(el('dt', pair[0]), el('dd', String(pair[1]))); });
    detailPage.append(info);
    var card = el('div', undefined, 'request-detail-actions'); detailPage.append(card);
    if (r.type === 'meeting' && validMeeting(r) && role() === 'employee') actions(card).append(action('选择场地并预定', function () { chooseMeeting(r); }, true));
    feedback.textContent = ''; card.append(feedback);
    if (role() === 'property' && canApprove(r) && r.propertyReview !== 'processing') actions(card).append(action('受理审核', function () {
      if (role() !== 'property' || !canApprove(r) || r.propertyReview === 'processing') return;
      if (commit(function () { r.propertyReview = 'processing'; r.history.push(identities[role()] + '：已受理，正在审核申请信息'); })) showDetail(r, parent);
    }, true));
    if (canApprove(r)) {
      var reason = el('textarea'); reason.placeholder = '驳回时必填原因'; reason.setAttribute('aria-label', '审批意见'); reason.maxLength = 500; card.append(reason);
      var bar = actions(card);
      function decide(approved) {
        if (!canApprove(r)) { feedback.textContent = '身份或申请状态已变化，请重新进入待审批列表。'; return; }
        if (!approved && !reason.value.trim()) { feedback.textContent = '请填写驳回原因。'; reason.focus(); return; }
        var actor = role(), stage = actor === 'admin' ? '企业' : '物业';
        if (commit(function () { r.status = approved ? actor === 'admin' ? afterEnterprise(r.type) : afterProperty(r.type) : 'rejected'; r.history.push(identities[actor] + '：' + stage + '审批' + (approved ? '通过' : '驳回') + (reason.value.trim() ? ' · ' + reason.value.trim() : '')); notifyOutcome(r, r.title || types[r.type] || '申请', approved ? 'approved' : 'rejected', reason.value.trim()); })) showDetail(r, parent);
      }
      bar.append(action('驳回申请', function () { decide(false); }), action('审批通过', function () { decide(true); }, true));
    }
    if (enterprise() && r.owner === role() && r.status === 'enterprise') actions(card).append(action('撤回申请', function () { if (r.owner !== role() || r.status !== 'enterprise') return; if (commit(function () { r.status = 'withdrawn'; r.history.push(identities[role()] + '撤回申请'); })) showDetail(r, parent); }));
    if (r.status === 'rejected' && r.owner === role()) actions(card).append(action('重新申请', function () { showForm(r.type); }));
    if (!card.children.length) card.remove();
    window.__setMiniRoute('role-request-detail', types[r.type] + '详情', parent); open('role-request-detail');
  }
  function overdue(b) { return b.status === 'unpaid' && b.due < new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  // Bill detail: status banner, property contact, full bill fields, payment guidance / reminder action.
  function showBillDetail(id) {
    var b = state.bills.find(function (item) { return item.id === id; });
    if (!b || !['admin', 'property'].includes(role()) || (role() === 'admin' && b.company !== company)) return open('role-denied');
    billDetailId = id; var propertyView = role() === 'property';
    billDetailPage.replaceChildren(); billDetailPage.classList.add('request-detail-view');
    var late = overdue(b), label = b.status === 'paid' ? '已缴费' : late ? '已逾期' : '待缴费';
    var banner = el('div', undefined, 'request-detail-banner is-reviewer' + (b.status === 'paid' ? ' is-closed' : '')), head = el('div', undefined, 'request-detail-banner-head');
    head.append(el('strong', b.title || '企业账单'), el('em', label, 'request-detail-status')); banner.append(head, el('span', b.id + ' · ' + b.company)); billDetailPage.append(banner);
    var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    var days = b.due ? Math.round((Date.parse(today + 'T00:00:00+08:00') - Date.parse(b.due + 'T00:00:00+08:00')) / 86400000) : 0;
    var info = el('dl', undefined, 'request-detail-fields');
    [['账单名称', b.title], ['账单编号', b.id], ['账单企业', b.company], ['应缴金额', '¥' + b.amount.toFixed(2)], ['到期日', b.due], ['缴费状态', late ? '已逾期 ' + days + ' 天' : label], ['缴费日期', b.paidAt], ['缴费提醒', b.reminded ? '物业已记录缴费提醒' : '暂无'], ['缴费方式', '请联系物业并提供账单编号与金额线下办理；当前未接通在线支付，请勿重复付款，结清状态由后台回写。']]
      .forEach(function (pair) { if (!pair[1]) return; info.append(el('dt', pair[0]), el('dd', String(pair[1]))); });
    billDetailPage.append(info);
    if (!propertyView && window.__myServices && window.__myServices.contactCard) billDetailPage.append(window.__myServices.contactCard('企业账单 · ' + (b.title || b.id), 'role-bill-detail'));
    var note = el('p', '', 'role-feedback'); note.setAttribute('role', 'status'); billDetailPage.append(note);
    if (propertyView && b.status !== 'paid' && !b.reminded) {
      var box = el('div', undefined, 'request-detail-actions'), bar = actions(box);
      bar.append(action('提醒企业缴费', function () { if (role() !== 'property') return; if (commit(function () { b.reminded = true; })) showBillDetail(id); else note.textContent = feedback.textContent; }, true));
      billDetailPage.append(box);
    }
    window.__setMiniRoute('role-bill-detail', '账单详情', 'role-bills'); open('role-bill-detail');
    if (window.lucide) window.lucide.createIcons();
  }
  var enterpriseBillTab = 'unpaid', enterpriseBillType = 'all';
  // Card 删除 hides an approval / fee card for this enterprise on this device; source records stay intact.
  var cardHidden = cardHidden || null;
  // renderProfile can run before this line during start-up, so read storage lazily.
  function hiddenCards() { if (!cardHidden) { try { cardHidden = JSON.parse(localStorage.getItem('enterprise-card-hidden-v1') || '[]'); } catch (error) { cardHidden = []; } } return cardHidden; }
  function cardIsHidden(kind, id) { return hiddenCards().includes(kind + ':' + id); }
  function cardDelete(kind, id, title, note, after) {
    return action('删除', function () {
      var run = function () { var next = hiddenCards().concat([kind + ':' + id]); try { localStorage.setItem('enterprise-card-hidden-v1', JSON.stringify(next)); cardHidden = next; } catch (error) { note.textContent = '删除失败，请检查浏览器存储设置。'; return; } after(); renderProfile(); };
      if (window.__miniConfirm) window.__miniConfirm({ title: '确定删除这条记录吗？', message: '删除「' + title + '」后，记录将从列表中移除且无法恢复，请谨慎操作。', confirmText: '删除', danger: true, onConfirm: run });
      else if (window.confirm('确定删除这条记录吗？删除后无法恢复。')) run();
    });
  }
  // 企业账单与物业「收费」同一套分类：租赁费用 / 场地费用 / 水电缴费 / 停车缴费 / 订餐费用（只读本企业记录）。
  var feeTypes = [['lease', '租赁费用'], ['venue', '场地费用'], ['utilities', '水电缴费'], ['parking', '停车缴费'], ['dining', '订餐费用']];
  function shanghaiToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  function feeMoney(value) { return '¥' + Number(value || 0).toFixed(2); }
  function enterpriseFees() {
    var today = shanghaiToday(), rows = [];
    state.bills.filter(function (b) { return b.company === company; }).forEach(function (b) {
      var type = b.category === 'parking' || /停车/.test(b.title || '') ? 'parking' : 'utilities';
      rows.push({ type: type, id: b.id, title: b.title || '企业账单', stage: b.status === 'paid' ? 'paid' : overdue(b) ? 'overdue' : 'unpaid', status: b.status === 'paid' ? '已缴费' : overdue(b) ? '已逾期' : '待缴费', pairs: [['账单企业', b.company], ['金额', feeMoney(b.amount)], ['到期日', b.due], ['账单编号', b.id]], bill: b });
    });
    (state.leases || []).filter(function (l) { return l.company === company; }).forEach(function (l) {
      var late = l.status !== 'paid' && l.nextDue < today;
      rows.push({ type: 'lease', id: l.id, title: l.space + ' 租金', stage: l.status === 'paid' ? 'paid' : late ? 'overdue' : 'unpaid', status: l.status === 'paid' ? '已缴费' : late ? '已逾期' : '待缴费', pairs: [['账单企业', company], ['租赁空间', l.space], ['本期租金', feeMoney(l.amount)], ['缴费日', l.nextDue], ['合同编号', l.id]], extra: [['合同到期', l.endDate]] });
    });
    var bookings = window.MiniStore && window.MiniStore.data && window.MiniStore.data.bookings || [];
    bookings.filter(function (b) { return (!b.company || b.company === company) && b.status !== '已取消' && !['pending', 'rejected'].includes(b.propertyStatus); }).forEach(function (b) {
      var fee = Number(b.price || 0) * (b.times || []).length;
      rows.push({ type: 'venue', id: b.id, title: b.room || '场地预定', stage: b.feePaid ? 'paid' : 'unpaid', status: b.feePaid ? '已缴费' : '待缴费', pairs: [['账单企业', company], ['预约日期', (b.date || '') + ' ' + (b.times || []).join('、')], ['应缴金额', feeMoney(fee)], ['预约编号', b.id]] });
    });
    var journeys = window.__parkServiceJourneys && window.__parkServiceJourneys.data && window.__parkServiceJourneys.data();
    ((journeys && journeys.diningOrders) || []).filter(function (d) { return d.company === company; }).forEach(function (d) {
      var paid = d.feeStatus === 'paid' || d.feeState === 'paid';
      rows.push({ type: 'dining', id: d.id, title: d.title || d.menu || '订餐订单', stage: paid ? 'paid' : 'unpaid', status: paid ? '已缴费' : '待缴费', pairs: [['账单企业', company], ['取餐时间', d.pickup], ['数量', d.quantity ? d.quantity + '份' : ''], ['金额', d.amount ? feeMoney(d.amount) : ''], ['订单编号', d.id]] });
    });
    return rows.filter(function (item) { return !cardIsHidden('fee-' + item.type, item.id); });
  }
  // Non-bill fee detail: same banner + field list as 账单详情; payment stays offline.
  function showFeeDetail(item) {
    if (role() !== 'admin') return open('role-denied');
    billDetailPage.replaceChildren(); billDetailPage.classList.add('request-detail-view');
    var banner = el('div', undefined, 'request-detail-banner is-reviewer' + (item.stage === 'paid' ? ' is-closed' : '')), head = el('div', undefined, 'request-detail-banner-head');
    var typeName = feeTypes.find(function (t) { return t[0] === item.type; })[1];
    head.append(el('strong', item.title), el('em', item.status, 'request-detail-status')); banner.append(head, el('span', typeName + ' · ' + company)); billDetailPage.append(banner);
    var info = el('dl', undefined, 'request-detail-fields');
    [['费用类型', typeName]].concat(item.pairs, item.extra || [], [['缴费方式', '请联系物业并提供编号与金额线下办理；当前未接通在线支付，请勿重复付款，结清状态由后台回写。']]).forEach(function (pair) { if (!pair[1]) return; info.append(el('dt', pair[0]), el('dd', String(pair[1]))); });
    billDetailPage.append(info);
    if (window.__myServices && window.__myServices.contactCard) billDetailPage.append(window.__myServices.contactCard(typeName + ' · ' + item.title, 'role-bill-detail'));
    window.__setMiniRoute('role-bill-detail', typeName + '详情', 'role-bills'); open('role-bill-detail');
  }
  function showBills(onlyOverdue) {
    if (!['admin', 'property'].includes(role())) return open('role-denied');
    // Enterprise view: 待缴费 / 已逾期 / 已缴费. Legacy callers passing true (欠费入口) land on 待缴费.
    if (role() === 'admin') { if (['unpaid', 'overdue', 'paid'].includes(onlyOverdue)) enterpriseBillTab = onlyOverdue; else if (typeof onlyOverdue === 'boolean') enterpriseBillTab = onlyOverdue ? 'overdue' : 'unpaid'; }
    var propertyView = role() === 'property', billTab = typeof onlyOverdue === 'string' ? onlyOverdue : onlyOverdue ? 'overdue' : 'all';
    billsPage.classList.toggle('bill-ledger', propertyView);
    billsPage.classList.toggle('bill-enterprise', !propertyView);
    if (propertyView) {
      billsPage.replaceChildren();
      var tabs = el('div', undefined, 'bill-tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', '企业费用筛选');
      [['all', '全部'], ['pending', '待缴费'], ['overdue', '已逾期']].forEach(function (item) {
        var button = action(item[1], function () { showBills(item[0]); billsPage.querySelector('[data-bill-tab="' + item[0] + '"]').focus({ preventScroll: true }); });
        button.dataset.billTab = item[0]; button.setAttribute('aria-pressed', String(billTab === item[0])); tabs.append(button);
      });
      billsPage.append(tabs);
    } else {
      billsPage.replaceChildren();
      // Dismissal lasts for this page session so filter re-renders keep it closed.
      if (!billNoticeClosed) {
        var notice = el('div', undefined, 'bill-notice'); notice.setAttribute('role', 'note');
        var track = el('div', undefined, 'bill-notice-track'); track.append(el('span', '欠费与待缴费账单分开展示，支付结果以财务回单和后台账单为准。'));
        var close = el('button', undefined, 'bill-notice-close'), x = el('i'); close.type = 'button'; close.setAttribute('aria-label', '关闭提示'); x.dataset.lucide = 'x'; x.setAttribute('aria-hidden', 'true'); close.append(x);
        close.onclick = function () { billNoticeClosed = true; notice.remove(); };
        notice.append(track, close); billsPage.append(notice);
      }
      var filter = el('div', undefined, 'bill-enterprise-tabs'); filter.setAttribute('role', 'group'); filter.setAttribute('aria-label', '账单筛选'); filter.classList.add('is-three');
      [['unpaid', '待缴费'], ['overdue', '已逾期'], ['paid', '已缴费']].forEach(function (item) { var button = action(item[1], function () { enterpriseBillType = 'all'; showBills(item[0]); }); button.dataset.billTab = item[0]; button.setAttribute('aria-pressed', String(enterpriseBillTab === item[0])); filter.append(button); }); billsPage.append(filter);
    }
    if (!propertyView) return renderEnterpriseFees();
    var rows = state.bills.filter(function (b) { return b.status === 'unpaid' && (billTab === 'all' || (billTab === 'pending' ? !overdue(b) : overdue(b))); });
    // Enterprise view: notice, tabs and list are three sibling blocks so each can be selected on its own.
    var billList = billsPage;
    if (!propertyView) { billList = el('div', undefined, 'bill-enterprise-content'); billList.setAttribute('role', 'region'); billList.setAttribute('aria-label', '账单列表'); billsPage.append(billList); }
    if (!rows.length) empty(billList, propertyView ? '暂无符合条件的待缴账单。' : ({ unpaid:'暂无待缴费账单。', overdue:'暂无已逾期账单。', paid:'暂无已缴费账单。' })[enterpriseBillTab] || '暂无账单。');
    rows.forEach(function (b) {
      var card = panel(b.title, b.status === 'paid' ? '已缴费' : overdue(b) ? '已逾期' : '待缴费'); card.classList.add('approval-card', 'is-clickable'); card.dataset.billId = b.id;
      infoGrid(card, [['账单企业', b.company], ['金额', '¥' + b.amount.toFixed(2)], ['到期日', b.due], ['账单编号', b.id]]);
      var status = el('p', b.reminded ? '已记录缴费提醒' : '', 'role-feedback'); status.setAttribute('role', 'status'); card.append(status);
      var bar = cardBar(card);
      if (propertyView) bar.append(action('提醒企业缴费', function () { if (commit(function () { b.reminded = true; })) { status.textContent = '提醒已保存，后台送达尚未接通。'; } else status.textContent = feedback.textContent; }));
      else if (b.status !== 'paid') bar.append(action('缴费办理指引', function () { status.textContent = '请联系物业并提供账单 ' + b.id + '，金额 ¥' + b.amount.toFixed(2) + '。当前未接通在线支付，请勿重复付款；结清状态由后台回写。'; }));
      bar.append(action('详情', function () { showBillDetail(b.id); }, true));
      // Whole card opens the detail; inner buttons keep their own action.
      card.tabIndex = 0; card.setAttribute('role', 'button');
      card.addEventListener('click', function (event) { if (event.target.closest('button, a, input, textarea, select')) return; showBillDetail(b.id); });
      card.addEventListener('keydown', function (event) { if (event.target === card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); showBillDetail(b.id); } });
      billList.append(card);
    }); window.__setMiniRoute('role-bills', role() === 'property' ? '企业费用台账' : '账单', 'profile'); open('role-bills');
    if (window.lucide) window.lucide.createIcons();
  }
  function renderEnterpriseFees() {
    var stageRows = enterpriseFees().filter(function (item) { return item.stage === enterpriseBillTab; });
    var chips = el('div', undefined, 'enterprise-type-filter'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', '费用类型筛选');
    [['all', '全部']].concat(feeTypes).forEach(function (pair) {
      var count = stageRows.filter(function (item) { return pair[0] === 'all' || item.type === pair[0]; }).length;
      var chip = el('button', undefined, 'enterprise-type-chip'); chip.type = 'button'; chip.dataset.typeFilter = pair[0];
      chip.append(el('span', pair[1] + ' ' + count)); chip.classList.toggle('active', enterpriseBillType === pair[0]); chip.setAttribute('aria-pressed', String(enterpriseBillType === pair[0]));
      chip.onclick = function () { enterpriseBillType = pair[0]; showBills(enterpriseBillTab); };
      chips.append(chip);
    });
    billsPage.append(chips);
    var list = el('div', undefined, 'bill-enterprise-content'); list.setAttribute('role', 'region'); list.setAttribute('aria-label', '账单列表'); billsPage.append(list);
    var rows = stageRows.filter(function (item) { return enterpriseBillType === 'all' || item.type === enterpriseBillType; });
    if (!rows.length) empty(list, ({ unpaid: '暂无待缴费账单。', overdue: '暂无已逾期账单。', paid: '暂无已缴费账单。' })[enterpriseBillTab]);
    rows.forEach(function (item) {
      var card = panel(item.title, item.status); card.classList.add('approval-card', 'is-clickable'); card.dataset.billId = item.id; card.dataset.feeType = item.type;
      card.querySelector('.role-row').prepend(el('span', feeTypes.find(function (t) { return t[0] === item.type; })[1], 'card-type-chip'));
      infoGrid(card, item.pairs);
      var status = el('p', item.bill && item.bill.reminded ? '已记录缴费提醒' : '', 'role-feedback'); status.setAttribute('role', 'status'); card.append(status);
      var view = function () { if (item.bill) showBillDetail(item.id); else showFeeDetail(item); };
      var bar = cardBar(card);
      bar.append(cardDelete('fee-' + item.type, item.id, item.title, status, function () { showBills(enterpriseBillTab); }), action('详情', view));
      if (item.stage !== 'paid') bar.append(action('缴费办理指引', function () { status.textContent = '请联系物业并提供编号 ' + item.id + '。当前未接通在线支付，请勿重复付款；结清状态由后台回写。'; }, true));
      card.tabIndex = 0; card.setAttribute('role', 'button');
      card.addEventListener('click', function (event) { if (event.target.closest('button, a, input, textarea, select')) return; view(); });
      card.addEventListener('keydown', function (event) { if (event.target === card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); view(); } });
      list.append(card);
    });
    window.__setMiniRoute('role-bills', '账单', 'profile'); open('role-bills');
    if (window.lucide) window.lucide.createIcons();
  }
  function repairs() { return state.repairs.filter(function (r) { return role() === 'property' || r.owner === role() && r.company === company; }); }
  var repairLabels = { pending: '待接单', processing: '处理中', confirmation: '待报修人确认', completed: '已完成' };
  var repairFilter = 'all';
  function showRepairs() {
    if (!enterprise() && role() !== 'property') return open('role-denied');
    var managing = role() === 'property', content = repairsPage;
    repairsPage.classList.toggle('property-repair-page', managing);
    if (managing) {
      repairsPage.replaceChildren();
      var filters = [{ id: 'all', title: '全部' }, { id: 'pending', title: '未处理' }, { id: 'processing', title: '进行中' }, { id: 'completed', title: '已处理' }];
      var tabs = el('div', undefined, 'repair-status-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', '报修处理状态');
      content = el('div', undefined, 'repair-status-content'); content.id = 'repair-status-panel'; content.setAttribute('role', 'tabpanel'); content.setAttribute('aria-labelledby', 'repair-filter-' + repairFilter);
      filters.forEach(function (filter) {
        var button = action(filter.title, function () { repairFilter = filter.id; showRepairs(); repairsPage.querySelector('#repair-filter-' + filter.id).focus(); });
        button.id = 'repair-filter-' + filter.id; button.dataset.repairFilter = filter.id; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', content.id); button.setAttribute('aria-selected', String(repairFilter === filter.id)); button.tabIndex = repairFilter === filter.id ? 0 : -1;
        button.onkeydown = function (event) {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault(); var index = filters.findIndex(function (item) { return item.id === repairFilter; });
          index = event.key === 'Home' ? 0 : event.key === 'End' ? filters.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : filters.length - 1)) % filters.length;
          repairsPage.querySelector('#repair-filter-' + filters[index].id).click();
        };
        tabs.append(button);
      });
      repairsPage.append(tabs, content);
    } else heading(repairsPage, '我的报修', '查看维修进度，维修后确认问题是否解决。');
    if (enterprise()) actions(repairsPage).append(action('提交报修', showRepairForm, true));
    var rows = repairs().filter(function (r) {
      if (!managing || repairFilter === 'all') return true;
      if (repairFilter === 'processing') return r.status === 'processing' || r.status === 'confirmation';
      return r.status === repairFilter;
    });
    if (!rows.length) empty(content, '暂无该状态的报修记录。');
    rows.forEach(function (r) {
      var card = panel(r.title, repairLabels[r.status], r.company + ' · ' + r.detail); card.append(el('p', r.history.join(' → ')));
      card.dataset.repairId = r.id; card.dataset.repairStatus = r.status;
      var bar = actions(card), status = el('p', '', 'role-feedback'); status.setAttribute('role', 'status'); card.append(status);
      function change(from, to, text, actor) {
        var permitted = actor === 'property' ? role() === 'property' : enterprise() && r.owner === role() && r.company === company;
        if (!permitted || !repairs().includes(r) || r.status !== from) { status.textContent = '身份或工单状态已变化，请重新进入列表。'; return; }
        if (commit(function () { r.status = to; r.history.push(identities[role()] + '：' + text); })) showRepairs(); else status.textContent = feedback.textContent;
      }
      if (role() === 'property' && r.status === 'pending') bar.append(action('接单处理', function () { change('pending', 'processing', '已接单', 'property'); }, true));
      if (role() === 'property' && r.status === 'processing') {
        var result = el('textarea'); result.setAttribute('aria-label', '维修结果'); result.placeholder = '填写维修措施和处理结果'; result.maxLength = 1000; card.append(result);
        bar.append(action('提交维修结果', function () { if (!result.value.trim()) { status.textContent = '请填写维修结果。'; return; } change('processing', 'confirmation', result.value.trim(), 'property'); }, true));
      }
      if (enterprise() && r.owner === role() && r.status === 'confirmation') bar.append(action('确认已修好', function () { change('confirmation', 'completed', '确认已解决', 'requester'); }, true), action('仍需维修', function () { change('confirmation', 'processing', '问题未解决，请继续维修', 'requester'); }));
      content.append(card);
    }); window.__setMiniRoute('role-repairs', role() === 'property' ? '报修处理' : '我的报修', 'profile'); open('role-repairs');
  }
  function noticeLayout(node, copy) {
    var notice = el('div', undefined, 'journey-notice'); notice.setAttribute('role', 'note');
    var track = el('div', undefined, 'journey-notice-track'); track.append(el('span', copy, 'journey-copy'));
    var close = el('button', '×', 'journey-notice-close'); close.type = 'button'; close.setAttribute('aria-label', '关闭提示'); close.onclick = function () { notice.remove(); };
    notice.append(track, close);
    var body = el('div', undefined, 'journey-page-body');
    node.classList.add('journey-page-split'); node.replaceChildren(notice, body); return body;
  }
  var toastTimer;
  function toast(text) {
    var phone = document.querySelector('.phone') || document.body, node = phone.querySelector('.journey-toast');
    if (!node) { node = el('div', undefined, 'journey-toast'); node.setAttribute('role', 'status'); phone.append(node); }
    node.textContent = text; node.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { node.hidden = true; }, 2200);
  }
  window.__miniToast = toast;
  function finishSubmit(target) { window.__showMiniPage(target); toast('提交成功，可在「我的」中查看记录'); }
  function dirty(section) {
    return Array.from(section.querySelectorAll('input, textarea')).some(function (input) { return !['checkbox', 'radio', 'hidden', 'submit', 'button'].includes(input.type) && input.value.trim(); });
  }
  function confirmDiscard(onDiscard) {
    var phone = document.querySelector('.phone') || document.body, mask = el('div', undefined, 'journey-confirm'), box = el('div', undefined, 'journey-confirm-box');
    box.setAttribute('role', 'alertdialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'journey-confirm-title');
    var title = el('h2', '确认取消提交？'); title.id = 'journey-confirm-title';
    var bar = el('div', undefined, 'journey-confirm-actions');
    var keep = el('button', '继续填写'); keep.type = 'button'; keep.onclick = function () { mask.remove(); };
    var leave = el('button', '取消提交', 'journey-confirm-danger'); leave.type = 'button'; leave.onclick = function () { mask.remove(); onDiscard(); };
    bar.append(keep, leave); box.append(title, el('p', '已填写的内容将不会保存。'), bar); mask.append(box); phone.append(mask); keep.focus();
  }
  // Back on a guarded form: confirm only when something has been typed.
  var discardConfirmed = false;
  window.addEventListener('click', function (event) {
    var back = event.target.closest('.nav-back'); if (discardConfirmed || !back) return;
    var current = screen.querySelector('section:not(.hidden)');
    if (!current || !current.hasAttribute('data-dirty-guard') || !dirty(current)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    confirmDiscard(function () { discardConfirmed = true; try { back.click(); } finally { discardConfirmed = false; } });
  }, true);
  function showRepairForm() {
    if (!enterprise()) return open('role-denied');
    // Same layout as 车辆服务: dismissible scrolling notice, then body; title stays in the navbar only.
    var notice = el('div', undefined, 'journey-notice'); notice.setAttribute('role', 'note');
    var track = el('div', undefined, 'journey-notice-track'); track.append(el('span', '填写准确位置和问题描述，便于物业安排处理。', 'journey-copy'));
    var noticeClose = el('button', '×', 'journey-notice-close'); noticeClose.type = 'button'; noticeClose.setAttribute('aria-label', '关闭提示'); noticeClose.onclick = function () { notice.remove(); };
    notice.append(track, noticeClose);
    var body = el('div', undefined, 'journey-page-body');
    repairForm.classList.add('journey-page-split'); repairForm.replaceChildren(notice, body);
    // Back returns to wherever the form was opened from (home entry, repair list, etc.).
    var opener = screen.querySelector('section:not(.hidden)');
    window.__setMiniRoute('role-repair-form', '提交报修', opener && opener.id !== 'role-repair-form' ? opener.id : 'role-repairs');
    var repairReturn = opener && ['home', 'park-services-all'].includes(opener.id) ? opener.id : null; repairForm.setAttribute('data-dirty-guard', '');
    var form = el('form', undefined, 'role-panel'), requester = role(), location = field(form, '报修位置', 'text', 'location'), title = field(form, '问题标题', 'text', 'title'), description = field(form, '问题描述', 'textarea', 'description');
    form.id = 'role-repair-form-fields';
    var status = el('p', '', 'role-feedback'); status.setAttribute('role', 'status'); form.append(status);
    // Submit sits below the card as a full-width block; the form attribute keeps native submit/validation.
    var submitBar = el('div', undefined, 'role-actions journey-actions journey-block-actions'), submit = el('button', '提交报修', 'role-primary'); submit.type = 'submit'; submit.setAttribute('form', form.id); submitBar.append(submit);
    form.onsubmit = function (event) { event.preventDefault(); if (!enterprise() || role() !== requester) return open('role-denied'); if (!form.reportValidity()) return; if (![location, title, description].every(function (input) { return input.value.trim(); })) { status.textContent = '请填写完整报修信息。'; return; } if (commit(function () { state.repairs.unshift({ id: 'WX' + Date.now().toString(36), owner: role(), company: company, title: title.value.trim(), detail: location.value.trim() + ' · ' + description.value.trim(), status: 'pending', history: [identities[role()] + '提交报修'] }); })) { if (repairReturn) finishSubmit(repairReturn); else showRepairs(); } else status.textContent = feedback.textContent; };
    body.append(form, submitBar); open('role-repair-form');
  }
  function showVisitors() {
    if (!enterprise()) return open('role-denied');
    heading(visitorsPage, '访客记录', '登记或查看客户来访安排；通行权限以园区确认结果为准。');
    actions(visitorsPage).append(action('登记来访', showVisitorForm, true));
    var rows = state.visitors.filter(function (v) { return v.owner === role() && v.company === company; });
    if (!rows.length) empty(visitorsPage, '暂无您的访客记录。');
    rows.forEach(function (v) { var card = panel(v.name, v.cancelled ? '已取消' : '已登记 · 待园区确认', v.detail); if (!v.cancelled) actions(card).append(action('取消来访', function () { if (!enterprise() || v.owner !== role()) return; if (commit(function () { v.cancelled = true; })) showVisitors(); })); visitorsPage.append(card); }); open('role-visitors');
  }
  function showEnterpriseReservations() {
    if (role() !== 'admin') return open('role-denied');
    heading(enterpriseReservationsPage, '企业预约', '按企业查看场地预定与访客接待安排；此页面只读，不复制预约或访客记录。');
    enterpriseReservationsPage.append(el('h2', '场地预定'));
    var bookings = window.MiniStore && window.MiniStore.displayRecords ? window.MiniStore.displayRecords('bookings').filter(function (item) { return item.sample || item.company === company; }) : [];
    if (!bookings.length) empty(enterpriseReservationsPage, '暂无本企业场地预定。');
    bookings.forEach(function (item) {
      var card = panel(item.room || '场地预定', item.status || '状态未标记', (item.date || '时间待定') + ' · ' + (item.times || []).join('、'));
      card.append(el('p', '预约编号：' + item.id + ' · 申请人：' + (item.name || identities[item.owner] || '未填写') + ' · 联系电话：' + (item.phone || '未填写')));
      enterpriseReservationsPage.append(card);
    });
    enterpriseReservationsPage.append(el('h2', '访客接待安排'));
    var visitors = state.visitors.filter(function (item) { return item.company === company; });
    if (!visitors.length) empty(enterpriseReservationsPage, '暂无本企业访客登记。');
    visitors.forEach(function (item) {
      var card = panel(item.name || '访客登记', item.cancelled ? '已取消' : '已登记 · 待园区确认', item.detail || '来访安排待补充');
      card.append(el('p', '登记编号：' + item.id + ' · 接待人：' + (identities[item.owner] || item.owner || '未填写') + ' · 联系电话：' + (item.phone || '未填写')));
      enterpriseReservationsPage.append(card);
    });
    window.__setMiniRoute(enterpriseReservationsPage.id, '企业预约', 'profile'); open(enterpriseReservationsPage.id);
  }
  function showVisitorForm() {
    // Title is already in the nav bar; card first, then a full-width save button below it (same as 报修).
    if (!enterprise()) return open('role-denied');
    // Back returns to wherever the form was opened from (home entry, visitor list, etc.), same as 提交报修.
    var opener = screen.querySelector('section:not(.hidden)'), visitorReturn = opener && opener.id !== 'role-visitor-form' ? opener.id : 'role-visitors';
    window.__setMiniRoute('role-visitor-form', '登记来访', visitorReturn); visitorForm.replaceChildren();
    var form = el('form', undefined, 'role-panel'), requester = role(), name = field(form, '访客姓名', 'text', 'name'), phone = field(form, '访客手机', 'tel', 'phone'), location = field(form, '接待地点', 'text', 'location'), start = field(form, '到访时间', 'datetime-local', 'start'), end = field(form, '离园时间', 'datetime-local', 'end'), purpose = field(form, '来访事由', 'textarea', 'purpose');
    if (window.__miniDatePicker) { window.__miniDatePicker.enhance(start, {mode:'datetime',title:'到访时间'}); window.__miniDatePicker.enhance(end, {mode:'datetime',title:'离园时间'}); }
    phone.pattern = '1[3-9][0-9]{9}'; phone.maxLength = 11;
    var status = el('p', '', 'role-feedback'); status.setAttribute('role', 'status'); form.append(status); form.id = 'role-visitor-form-fields'; var submitBar = el('div', undefined, 'role-actions journey-actions journey-block-actions'), submit = el('button', '保存来访安排', 'role-primary'); submit.type = 'submit'; submit.setAttribute('form', form.id); submitBar.append(submit);
    form.onsubmit = function (event) { event.preventDefault(); if (!enterprise() || role() !== requester) return open('role-denied'); if (!form.reportValidity()) return; if (![name, phone, location, start, end, purpose].every(function (i) { return i.value.trim(); })) { status.textContent = '请填写完整来访信息。'; return; } if (end.value <= start.value) { status.textContent = '离园时间须晚于到访时间。'; return; } if (commit(function () { state.visitors.unshift({ id: 'VK' + Date.now().toString(36), owner: role(), company: company, name: name.value.trim(), detail: location.value.trim() + ' · ' + start.value.replace('T', ' ') + ' 至 ' + end.value.replace('T', ' ') + ' · ' + purpose.value.trim(), phone: phone.value.trim(), cancelled: false }); })) { if (['home', 'park-services-all'].includes(visitorReturn)) { toast('来访安排已保存，可在「我的 → 我的预约」中查看'); open(visitorReturn); } else showVisitors(); } else status.textContent = feedback.textContent; };
    visitorForm.append(form, submitBar); open('role-visitor-form');
  }
  // Capture old direct-navigation handlers too; hiding a tile is not a route guard.
  document.addEventListener('click', function (event) {
    if (isUnauthenticated() && event.target.closest('.phone button, .phone a, .phone [data-page], .phone [data-enterprise-detail], .phone [data-enterprise-list]') && !event.target.closest('#role-login-modal')) {
      event.preventDefault(); event.stopImmediatePropagation(); showLogin(); return;
    }
    var entry = event.target.closest('[data-page],[data-room-detail],.meeting-quick-open,[data-role-application]');
    if (!entry) return;
    var target = entry.dataset.page || (entry.hasAttribute('data-room-detail') || entry.classList.contains('meeting-quick-open') ? 'meeting-detail' : '');
    if (protectedPages[target] && !protectedPages[target].includes(role())) { event.preventDefault(); event.stopImmediatePropagation(); open('role-denied'); return; }
    if (legacyBookingPages.includes(target) || target === 'meeting' && role() === 'employee') { event.preventDefault(); event.stopImmediatePropagation(); openMeetingEntry(); return; }
    // Employees without an approved application apply for the room in a sheet instead of booking.
    if (entry.classList.contains('meeting-quick-open') && role() === 'employee' && !canBook()) { event.preventDefault(); event.stopImmediatePropagation(); var roomName = entry.closest('[data-meeting-room]'); openMeetingApplySheet(roomName ? roomName.dataset.meetingRoom : ''); return; }
    if (entry.classList.contains('meeting-quick-open') && !canBook()) { event.preventDefault(); event.stopImmediatePropagation(); openMeetingEntry(); return; }
    if (entry.dataset.roleApplication) { event.preventDefault(); event.stopImmediatePropagation(); showForm(entry.dataset.roleApplication); return; }
    if (target === 'visitor-records' || target === 'visitor' && enterprise()) { event.preventDefault(); event.stopImmediatePropagation(); target === 'visitor' ? showVisitorForm() : showVisitors(); return; }
    if (target === 'repair' || target === 'repair-records') { event.preventDefault(); event.stopImmediatePropagation(); target === 'repair' ? showRepairForm() : showRepairs(); }
  }, true);
  document.addEventListener('submit', function (event) {
    if (event.target.id === 'quick-booking-form' && !enterprise()) { event.preventDefault(); event.stopImmediatePropagation(); open('role-denied'); }
  }, true);
  function syncRole() {
    closePermission(false);
    loginModal.classList.add('hidden');
    if (isUnauthenticated()) showLogin();
    meetingApplicationId = null; syncMeetingList();
    renderProfile(); var active = screen.querySelector('section:not(.hidden)');
    if (active && (active.id.startsWith('property-service-') || active.id.startsWith('property-workbench-')) && role() !== 'property') open('messages');
    else if (active && (active.id.startsWith('role-') || protectedPages[active.id])) open('profile');
    var modal = document.querySelector('.quick-booking'); if (modal) modal.classList.add('hidden');
    window.dispatchEvent(new Event('mini-records-change'));
  }
  new MutationObserver(syncRole).observe(profile, { attributes: true, attributeFilter: ['data-role'] });
  if (isUnauthenticated()) syncRole();
  window.addEventListener('property-message-change', renderProfile);
  window.__showLogin = function () { closePermission(false); showLogin(); };
  // Staff binding applications: guests submit on 「我的 → 访客用户」; the enterprise admin approves them here.
  var memberKey = 'profile-company-binding-v1';
  function memberApplications() {
    var rows = [];
    try { var one = JSON.parse(localStorage.getItem(memberKey) || 'null'); if (one && one.owner === 'guest') rows.push(one); } catch (error) {}
    return rows.filter(function (r) { return r.company === company; });
  }
  function saveMembers(rows) { try { localStorage.setItem(memberKey, JSON.stringify(rows[0] || null)); } catch (error) { return false; } return true; }
  function renderMembers() {
    if (role() !== 'admin') return open('role-denied');
    var rows = memberApplications();
    heading(membersPage, '成员审核', '审核员工提交的企业绑定申请；通过后员工即可使用企业员工服务。');
    if (!rows.length) return empty(membersPage, '暂无待审核的成员申请。');
    rows.forEach(function (r) {
      var card = panel(r.name + ' · ' + r.company, r.status === 'pending' ? '待审核' : r.status === 'approved' ? '已通过' : '已驳回', r.employeeId + (r.department ? ' · ' + r.department : ''));
      infoGrid(card, [['姓名', r.name], ['手机号', r.phone], ['员工工号', r.employeeId], ['所属部门', r.department], ['提交时间', r.submittedAt ? String(r.submittedAt).replace('T', ' ').slice(0, 16) : '']]);
      if (r.status === 'pending') {
        var note = el('p', '', 'role-feedback'); note.setAttribute('role', 'status'); card.append(note);
        var bar = actions(card);
        bar.append(action('驳回', function () {
          var reason = window.prompt ? window.prompt('填写驳回原因', '工号与企业登记信息不一致') : '';
          if (reason === null) return;
          if (!String(reason).trim()) { note.textContent = '请填写驳回原因。'; return; }
          Object.assign(r, { status: 'rejected', reviewNote: String(reason).trim(), reviewedBy: identities[role()], reviewedAt: new Date().toISOString() });
          if (!saveMembers([r])) { note.textContent = '保存失败，请检查浏览器存储设置。'; return; }
          renderMembers(); renderProfile();
        }), action('通过', function () {
          Object.assign(r, { status: 'approved', reviewedBy: identities[role()], reviewedAt: new Date().toISOString() });
          if (!saveMembers([r])) { note.textContent = '保存失败，请检查浏览器存储设置。'; return; }
          renderMembers(); renderProfile();
        }, true));
      }
      membersPage.append(card);
    });
    open('role-members');
  }
  window.__roleWorkflows = { refresh: renderProfile, openMembers: renderMembers, isCurrent: function () { try { return localStorage.getItem(key) === persistedState; } catch (error) { return false; } }, canBook: canBook, bookingApproval: bookingApproval, validateBooking: validateBooking, openMeetingEntry: openMeetingEntry, canManageBooking: function (item) { return enterprise() && (item.sample === true || item.owner === role() && item.company === company); }, openRequests: showRequests, openApprovals: showApprovals, openBills: showBills, openRepairs: showRepairs,
    completeFeeRequest: completeFeeRequest,
    propertyData: function () { return state; }, propertyCommit: function (change) { return role() === 'property' && commit(change); }, releaseCommit: function (change) { return enterprise() && commit(change); }, enterpriseCommit: function (change) { return enterprise() && commit(change); }, propertyIdentity: function () { return identities.property; },
    myRecords: function () { return { requests: ownRequests(), repairs: repairs(), visitors: state.visitors.filter(function (v) { return v.owner === role() && v.company === company; }), vehicleRequests: visibleDomainRecords('vehicleRequests'), monitorRequests: visibleDomainRecords('monitorRequests'), specialTickets: visibleDomainRecords('specialTickets'), activityRegistrations: visibleDomainRecords('activityRegistrations'), releaseRequests: accessibleReleaseRequests() }; },
    // Card-level actions for "我的服务": same ownership and status checks as the native pages.
    // Card-level approve for reviewers; same permission and state transition as the detail page.
    // Property-side repair steps for the single-order detail page; same checks as the native list.
    repairAction: function (id, step, text) {
      if (role() !== 'property') return false;
      var r = state.repairs.find(function (item) { return item.id === id; });
      if (!r) return false;
      if (step === 'accept' && r.status === 'pending') return commit(function () { r.status = 'processing'; r.history.push(identities[role()] + '：已接单'); });
      var note = String(text || '').trim().slice(0, 1000);
      if (step === 'result' && r.status === 'processing' && note) return commit(function () { r.status = 'confirmation'; r.history.push(identities[role()] + '：' + note); });
      return false;
    },
    approveDomain: function (kind, id) {
      if (role() !== 'property') return false;
      if (kind === 'vehicle') return reviewVehicleRequest(id, 'approved');
      if (kind === 'monitor') return reviewMonitorRequest(id, 'approved');
      if (kind === 'release') {
        var item = state.releaseRequests.find(function (r) { return r.id === id; });
        if (!item || item.status !== 'pending') return false;
        return commit(function () { item.status = 'approved'; item.reviewedBy = identities.property; item.reviewedAt = new Date().toISOString(); item.history = (item.history || []).concat([identities.property + '：审批通过']); notifyOutcome(item, '物品放行', 'approved', ''); });
      }
      return false;
    },
    approveRequest: function (id) {
      var r = state.requests.find(function (item) { return item.id === id; });
      if (!r || !canApprove(r)) return false;
      var actor = role(), stage = actor === 'admin' ? '企业' : '物业';
      return commit(function () { r.status = actor === 'admin' ? afterEnterprise(r.type) : afterProperty(r.type); r.history.push(identities[actor] + '：' + stage + '审批通过'); notifyOutcome(r, r.title || types[r.type] || '申请', 'approved', ''); });
    },
    showPermission: function (copy, help) { showPermission(copy, help); },
    // 我的预约 → 场地预定 shows meeting requests too; these let it start the booking for an approved one.
    chooseMeeting: function (id) { var r = state.requests.find(function (item) { return item.id === id; }); if (r) chooseMeeting(r); },
    canChooseMeeting: function (id) { var r = state.requests.find(function (item) { return item.id === id; }); return !!r && role() === 'employee' && validMeeting(r); },
    approveVenueBooking: function (id, decision, note) {
      if (role() !== 'property' || !window.MiniStore.isCurrent()) return false;
      var bookings = window.MiniStore && window.MiniStore.data && window.MiniStore.data.bookings || [];
      var booking = bookings.find(function (item) { return item.id === id && item.company === company && item.status !== '已取消' && item.propertyStatus === 'pending'; });
      if (!booking) return false;
      var result = reviewDecision(decision);
      if (!result) return false;
      var previous = JSON.stringify(booking);
      booking.propertyStatus = result;
      booking.propertyReviewedBy = identities.property;
      booking.propertyReviewedAt = new Date().toISOString();
      if (note) booking.propertyReviewNote = safeText(note, 500);
      if (Array.isArray(booking.history)) booking.history.push(identities.property + '：物业审批' + (result === 'approved' ? '通过' : '驳回') + (note ? ' · ' + safeText(note, 500) : ''));
      if (window.MiniStore.save()) { window.dispatchEvent(new Event('mini-records-change')); window.dispatchEvent(new Event('property-workflow-change')); return true; }
      Object.keys(booking).forEach(function (field) { delete booking[field]; }); Object.assign(booking, JSON.parse(previous));
      return false;
    },
    myRecordAction: function (kind, id, actionName) {
      if (!enterprise()) return false;
      if (kind === 'request') {
        var r = state.requests.find(function (item) { return item.id === id; });
        if (!r || r.owner !== role() || r.company !== company) return false;
        if (actionName === 'withdraw' && r.status === 'enterprise') return commit(function () { r.status = 'withdrawn'; r.history.push(identities[role()] + '撤回申请'); });
        if (actionName === 'remove' && ['withdrawn', 'rejected'].includes(r.status)) return commit(function () { state.requests.splice(state.requests.indexOf(r), 1); });
        return false;
      }
      if (kind === 'repair') {
        var p = state.repairs.find(function (item) { return item.id === id; });
        if (!p || p.owner !== role() || p.company !== company) return false;
        if (actionName === 'confirm' && p.status === 'confirmation') return commit(function () { p.status = 'completed'; p.history.push(identities[role()] + '：确认已解决'); });
        if (actionName === 'reopen' && p.status === 'confirmation') return commit(function () { p.status = 'processing'; p.history.push(identities[role()] + '：问题未解决，请继续维修'); });
        if (actionName === 'remove' && p.status === 'completed') return commit(function () { state.repairs.splice(state.repairs.indexOf(p), 1); });
        return false;
      }
      if (kind === 'special') {
        var s = findDomainRecord('specialTickets', id);
        if (!sameOwner(s)) return false;
        if (actionName === 'confirm') return updateSpecialServiceTicket(id, 'completed', '');
        if (actionName === 'remove' && s.status === 'completed') return commit(function () { state.specialTickets.splice(state.specialTickets.indexOf(s), 1); });
        return false;
      }
      return false;
    },
    openRequestForm: showForm, noticeLayout: noticeLayout, openRequestDetail: showDetail, requestState: requestState, openVisitors: showVisitors, openEnterpriseReservations: showEnterpriseReservations,
    role: role, company: function () { return company; },
    createVehicleRequest: createVehicleRequest, submitVehicleRequest: createVehicleRequest, reviewVehicleRequest: reviewVehicleRequest,
    vehicleRequests: function () { return visibleDomainRecords('vehicleRequests'); },
    createMonitorRequest: createMonitorRequest, submitMonitorRequest: createMonitorRequest, reviewMonitorRequest: reviewMonitorRequest,
    reviewReleaseEnterprise: reviewReleaseEnterprise, withdrawDomain: withdrawDomain, firstRequestStatus: firstRequestStatus,
    monitorRequests: function () { return visibleDomainRecords('monitorRequests'); },
    createSpecialServiceTicket: createSpecialServiceTicket, createSpecialTicket: createSpecialServiceTicket, updateSpecialServiceTicket: updateSpecialServiceTicket,
    specialTickets: function () { return visibleDomainRecords('specialTickets'); },
    registerActivity: registerActivity, createActivityRegistration: registerActivity, checkInActivity: function (id, note) { return activityAction(id, 'check-in', note); }, redeemActivity: function (id, note) { return activityAction(id, 'redeem', note); },
    activityRegistrations: function () { return visibleDomainRecords('activityRegistrations'); },
    createUtilityRequest: createUtilityRequest, submitUtilityRequest: createUtilityRequest, reviewUtilityRequest: reviewUtilityRequest,
    utilityRequests: function () { return state.requests.filter(function (record) { return record.type === 'utilities' && canReadDomain(record); }); },
    // Only the applicant sees the result; the reviewer already has it in the approval list.
    notices: function () { return domainRecords('notices').filter(function (n) { return n.owner === role() && n.company === company; }); },
    markNoticesRead: function () { return domainCommit(function () { domainRecords('notices').forEach(function (n) { if (n.owner === role()) n.read = true; }); }); },
    releaseRequests: accessibleReleaseRequests, getReleaseRequest: function (id) { var record = findDomainRecord('releaseRequests', id); return accessibleReleaseRequests().includes(record) ? record : null; }
  };
  var messageBacklog = false;
  new MutationObserver(function () {
    if (messageBacklog) return;
    var active = screen.querySelector('section:not(.hidden)');
    if (!active || !window.__canMiniPage(active.id)) { messageBacklog = true; open('role-denied'); messageBacklog = false; }
  }).observe(screen, { subtree: true, attributes: true, attributeFilter: ['class'] });
  renderProfile();
  window.dispatchEvent(new Event('mini-records-change'));
})();
