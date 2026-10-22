/* Small adapter between V3 local workflows and the shared local business API. */
(function () {
  'use strict';

  var defaultBase = 'http://127.0.0.1:9528/api';
  // Same-origin when the page itself is served by the business API; local preview keeps the dev port.
  if (location.protocol.startsWith('http') && location.port !== '4184' && location.port !== '4174') defaultBase = location.origin + '/api';
  var base = String(window.PARK_ADMIN_API_URL || defaultBase).replace(/\/$/, '');
  var miniKey = String(window.PARK_ADMIN_MINI_KEY || 'local-mini-key');
  var syncing = false;
  var feeCache = { loaded: false, items: [], total: 0 };
  var serviceCache = { loaded: false, items: [] };

  function context() {
    var role = window.__roleWorkflows && window.__roleWorkflows.role ? window.__roleWorkflows.role() : (document.getElementById('profile') || {}).dataset?.role || 'guest';
    if (role === 'property') return { role: 'park-admin', adminId: 'U-002' };
    return { role: 'company-admin', adminId: 'U-003' };
  }

  function request(path, options) {
    var actor = context();
    return fetch(base + path, Object.assign({ headers: {
      'content-type': 'application/json',
      'x-mini-key': miniKey,
      'x-admin-role': actor.role,
      'x-admin-id': actor.adminId
    } }, options || {})).then(function (response) {
      return response.json().then(function (payload) {
        if (!response.ok) { var failure = new Error(payload.message || '业务 API 请求失败'); failure.status = response.status; throw failure; }
        return payload;
      });
    });
  }

  function applicationPayload(record) {
    var applicant = record.owner === 'admin' ? '唐慧丽' : '王晓明';
    return {
      sourceId: record.id,
      source: 'miniprogram-v4',
      type: record.type === 'meeting' ? '场地预定' : record.type,
      companyId: 'C-001',
      applicant: applicant,
      applicantRole: record.owner === 'admin' ? 'company-admin' : 'employee',
      location: record.room || 'A 区 · 待选场地',
      details: [record.detail, record.meetingStart, record.meetingEnd].filter(Boolean).join(' · '),
      assigneeRole: 'park-admin'
    };
  }

  function localStatus(serverStatus) {
    return { pending: 'enterprise', approved: 'approved', rejected: 'rejected' }[serverStatus] || 'enterprise';
  }

  // Repairs and vehicle matters are created in the mini program, then processed in the back office.
  function servicePayload(kind, record) {
    var applicant = record.owner === 'admin' ? '唐慧丽' : '王晓明';
    if (kind === 'repair') {
      var parts = String(record.detail || '').split(' · ');
      return { category: 'repair', sourceId: record.id, companyId: 'C-001', applicant: applicant, title: record.title || '物业报修', location: parts[0] || '待补充', note: parts.slice(1).join(' · ') || record.detail || '' };
    }
    return { category: 'vehicle', sourceId: record.id, companyId: 'C-001', applicant: applicant, title: (record.category || '车辆服务') + ' · ' + (record.vehiclePlate || '未填写车牌'), location: '园区车场', amount: Number(record.amount || 0), note: record.detail || '' };
  }

  function syncServices(role) {
    var workflows = window.__roleWorkflows, state = workflows && workflows.propertyData ? workflows.propertyData() : null;
    if (!state) return Promise.resolve(false);
    return request('/services').then(function (payload) {
      var items = payload.items || [], chain = Promise.resolve();
      if (['employee', 'admin'].includes(role)) {
        // Vehicle matters reach the back office only after the enterprise approval step.
        var vehicleReady = (state.vehicleRequests || []).filter(function (record) { return record.status !== 'enterprise_pending' && record.status !== 'rejected'; });
        [['repair', (state.repairs || []).filter(function (record) { return record.owner === role; })], ['vehicle', vehicleReady]].forEach(function (group) {
          group[1].filter(function (record) { return !record.sample; }).forEach(function (record) {
            if (items.some(function (item) { return item.sourceId === record.id; })) return;
            chain = chain.then(function () {
              return request('/services', { method: 'POST', body: JSON.stringify(servicePayload(group[0], record)) }).then(function (created) { if (created.item) items.push(created.item); });
            });
          });
        });
        // Dining orders and utility requests are created locally; the back office needs them to follow up.
        var journeys = window.__serviceJourneys && window.__serviceJourneys.state ? window.__serviceJourneys.state() : null;
        var dining = journeys && Array.isArray(journeys.diningOrders) ? journeys.diningOrders : [];
        var journeyApi = window.__serviceJourneys;
        function markOrder(id, change) { if (journeyApi && journeyApi.update) journeyApi.update('diningOrders', id, change); }
        dining.filter(function (record) { return record && !record.sample && record.owner === role && record.status !== '库存不足'; }).forEach(function (record) {
          var server = items.find(function (item) { return item.sourceId === record.id; });
          // A cancel made in 我的订单 releases the reserved portions in the back office.
          if (server && record.status === '已取消' && server.status === 'pending') {
            chain = chain.then(function () {
              return request('/services/' + encodeURIComponent(server.id) + '/cancel', { method: 'POST', body: JSON.stringify({ operator: record.owner === 'admin' ? '唐慧丽' : '王晓明' }) }).then(function (updated) { if (updated.item) items[items.indexOf(server)] = updated.item; }).catch(function () {});
            });
            return;
          }
          if (server || record.status === '已取消') return;
          chain = chain.then(function () {
            return request('/services', { method: 'POST', body: JSON.stringify({
              category: 'dining', sourceId: record.id, companyId: 'C-001', applicant: '王晓明',
              title: record.title || record.menu || '订餐订单', menuId: record.menuId || '', quantity: Number(record.quantity || 1),
              location: record.locker ? '园区餐厅 · ' + record.locker : '园区餐厅',
              scheduledAt: record.pickup || '',
              amount: Number(record.amount || 0),
              note: [record.detail, record.remark].filter(Boolean).join(' · ')
            }) }).then(function (created) { if (created.item) items.push(created.item); }).catch(function (failure) {
              // Sold out between viewing the menu and syncing: keep the order visible but mark it, and tell the user.
              if (failure.status !== 409) throw failure;
              markOrder(record.id, function (item) { item.status = '库存不足'; item.note = failure.message + '，订单未生效，请重新选择菜品。'; item.history = (item.history || []).concat(['系统：' + failure.message]); });
              if (window.__miniToast) window.__miniToast(failure.message + '，订单未生效');
            });
          });
        });
        var utilities = (state.requests || []).filter(function (record) { return record && record.type === 'utilities' && !record.sample; });
        utilities.forEach(function (record) {
          if (items.some(function (item) { return item.sourceId === record.id; })) return;
          chain = chain.then(function () {
            return request('/services', { method: 'POST', body: JSON.stringify({
              category: 'utilities', sourceId: record.id, companyId: 'C-001', applicant: '王晓明',
              title: record.detail || '水电缴费申请',
              location: record.location || '企业账单',
              amount: Number(record.amount || 0),
              note: record.detail || ''
            }) }).then(function (created) { if (created.item) items.push(created.item); });
          });
        });
        // Venue requests live in the application list; mirror them into the venue workbench.
        (state.requests || []).filter(function (record) { return record.type === 'meeting' && !record.sample; }).forEach(function (record) {
          if (items.some(function (item) { return item.sourceId === record.id; })) return;
          chain = chain.then(function () {
            return request('/services', { method: 'POST', body: JSON.stringify({
              category: 'venue', sourceId: record.id, companyId: 'C-001',
              applicant: record.owner === 'admin' ? '唐慧丽' : '王晓明',
              title: (record.room || '场地预定') + ' · ' + (record.detail || '场地申请'),
              location: record.room || record.detail || '待补充',
              scheduledAt: [record.meetingStart, record.meetingEnd].filter(Boolean).join(' 至 ').replace(/T/g, ' '),
              amount: Number(record.amount || 0),
              note: record.detail || ''
            }) }).then(function (created) { if (created.item) items.push(created.item); });
          });
        });
      }
      return chain.then(function () {
        serviceCache = { loaded: true, items: items };
        if (workflows.syncServiceStatus) workflows.syncServiceStatus(items);
        window.dispatchEvent(new CustomEvent('service-api-change', { detail: serviceCache }));
        return true;
      });
    }).catch(function () { return false; });
  }

  function syncLocalState(serverItems) {
    var workflows = window.__roleWorkflows, state = workflows && workflows.propertyData ? workflows.propertyData() : null;
    if (!state || !Array.isArray(state.requests)) return;
    state.requests.filter(function (record) { return record.type === 'meeting'; }).forEach(function (record) {
      var server = serverItems.find(function (item) { return item.id === record.id || item.sourceId === record.id; });
      if (!server) return;
      var nextStatus = localStatus(server.status);
      var nextHistory = null;
      if (Array.isArray(server.approvals) && server.approvals.length > (record.history || []).length) {
        nextHistory = server.approvals.map(function (approval) {
          return approval.operator + '：' + ({ submitted: '提交申请', approved: '审批通过', rejected: '审批驳回' }[approval.action] || approval.action);
        });
      }
      if (record.status !== nextStatus || nextHistory) {
        if (workflows.syncApplication) workflows.syncApplication(record.id, nextStatus, nextHistory || record.history);
      }
    });
  }

  function sync() {
    var workflows = window.__roleWorkflows;
    if (syncing || !workflows || !workflows.propertyData) return Promise.resolve(false);
    syncing = true;
    var role = workflows.role();
    var applicationJob = Promise.resolve(true);
    if (['employee', 'admin'].includes(role)) {
      var records = workflows.propertyData().requests.filter(function (record) { return record.type === 'meeting' && !record.sample; });
      applicationJob = request('/applications').then(function (payload) {
        var items = payload.items || [];
        var chain = Promise.resolve();
        records.forEach(function (record) {
          if (items.some(function (item) { return item.id === record.id || item.sourceId === record.id; })) return;
          chain = chain.then(function () { return request('/applications', { method: 'POST', body: JSON.stringify(applicationPayload(record)) }).then(function (created) { if (created.item) items.push(created.item); }); });
        });
        return chain.then(function () { syncLocalState(items); return true; });
      });
    }
    var feeJob = ['employee', 'admin', 'property'].includes(role) ? syncFees() : Promise.resolve(false);
    var serviceJob = ['employee', 'admin', 'property'].includes(role) ? syncServices(role) : Promise.resolve(false);
    return Promise.all([applicationJob, feeJob, serviceJob]).then(function (results) { return results.some(Boolean); }).catch(function () {
      // The mini program remains usable in offline mode; the next change retries the sync.
      return false;
    }).finally(function () { syncing = false; });
  }

  function listFees(query) {
    var params = new URLSearchParams(query || {});
    return request('/fees' + (params.toString() ? '?' + params.toString() : ''));
  }

  function getFee(id) { return request('/fees/' + encodeURIComponent(id)); }

  function syncFees() {
    return listFees().then(function (payload) {
      feeCache = { loaded: true, items: payload.items || [], total: payload.total || 0 };
      window.dispatchEvent(new CustomEvent('fee-api-change', { detail: feeCache }));
      return true;
    }).catch(function () {
      return false;
    });
  }

  window.__parkAdminApi = {
    sync: sync,
    listApplications: function () { return request('/applications'); },
    listFees: listFees,
    getFee: getFee,
    syncFees: syncFees,
    syncServices: function () { return syncServices(window.__parkAdminApi.role()); },
    services: function () { return { loaded: serviceCache.loaded, items: serviceCache.items.slice() }; },
    fees: function () { return { loaded: feeCache.loaded, items: feeCache.items.slice(), total: feeCache.total }; },
    role: function () { return (window.__roleWorkflows && window.__roleWorkflows.role ? window.__roleWorkflows.role() : 'guest'); }
  };
  window.addEventListener('property-workflow-change', sync);
  window.addEventListener('mini-records-change', sync);
  // Back-office actions have no push channel yet: refresh when the page returns to view and every 30s while visible.
  document.addEventListener('visibilitychange', function () { if (!document.hidden) sync(); });
  setInterval(function () { if (!document.hidden) sync(); }, 30000);
  sync();
})();
