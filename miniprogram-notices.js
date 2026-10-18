/* Approval-result notices written by the local workflow state; shown under 消息 → 园区通知. */
(function () {
  'use strict';
  var workflows = window.__roleWorkflows;
  var page = document.getElementById('messages');
  if (!workflows || !page || window.__approvalNotices) return;
  var groupTitle = page.querySelector('#message-notices-title');
  var list = groupTitle && groupTitle.nextElementSibling;
  if (!list) return;
  var profile = document.getElementById('profile');
  var seen = '';
  function outcomeText(outcome) { return ({ approved: '已通过', rejected: '已驳回', supplement: '需补充材料', paid: '已办理完成' })[outcome] || '有新结果'; }
  function timeText(iso) { var d = new Date(iso); return isNaN(d) ? '' : String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function render() {
    if (profile.dataset.role !== 'employee' && profile.dataset.role !== 'admin') return;
    var rows = workflows.notices ? workflows.notices() : [];
    var signature = JSON.stringify(rows.map(function (n) { return [n.id, n.read]; }));
    if (signature === seen) return;
    seen = signature;
    list.querySelectorAll('[data-approval-notice]').forEach(function (node) { node.remove(); });
    rows.forEach(function (n) {
      var item = document.createElement('li');
      item.dataset.approvalNotice = 'true';
      item.innerHTML = '<span class="message-avatar message-avatar-notice" aria-hidden="true"><i data-lucide="clipboard-check"></i></span>' +
        '<span class="message-copy"><span class="message-row-head"><strong>审批结果</strong><time>' + timeText(n.createdAt) + '</time></span>' +
        '<span class="message-preview">' + n.title + ' · ' + outcomeText(n.outcome) + (n.note ? ' · ' + n.note : '') + '</span></span>';
      if (!n.read) item.querySelector('.message-avatar').insertAdjacentHTML('beforeend', '<i class="message-unread"></i>');
      item.addEventListener('click', function () {
        item.querySelector('.message-unread') && item.querySelector('.message-unread').remove();
        if (n.recordId) {
          var found = (workflows.propertyData().requests || []).find(function (r) { return r.id === n.recordId; });
          if (found && workflows.openRequestDetail) { window.__myServices ? window.__myServices.open('applications') : workflows.openRequests(); return; }
        }
      });
      list.append(item);
    });
    if (window.lucide) window.lucide.createIcons();
  }
  window.addEventListener('mini-records-change', function () { seen = ''; render(); });
  window.addEventListener('property-workflow-change', function () { seen = ''; render(); });
  var observer = new MutationObserver(function () { render(); });
  observer.observe(profile, { attributes: true, attributeFilter: ['data-role'] });
  render();
  window.__approvalNotices = { render: render };
})();
