/* 全局日期 / 日期时间选择：与场地预约同款（绿色触发框 + 底部日历弹窗），替代浏览器原生蓝色控件。
   用法：window.__miniDatePicker.enhance(input, { mode: 'date' | 'datetime', title, min })
   原 input 保留 name / value / required，改为隐藏；读写格式不变（YYYY-MM-DD 或 YYYY-MM-DDTHH:MM）。 */
(function () {
  'use strict';
  if (window.__miniDatePicker) return;
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function icon(name) { var i = document.createElement('i'); i.dataset.lucide = name; i.setAttribute('aria-hidden', 'true'); return i; }
  function draw() { if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8, 'aria-hidden': 'true', focusable: 'false' } }); }
  // Half-hour steps across the working day; values outside the list are still kept when editing.
  var TIMES = []; for (var h = 7; h <= 22; h++) { TIMES.push(pad(h) + ':00'); if (h < 22) TIMES.push(pad(h) + ':30'); }
  var counter = 0;

  function label(mode, value) {
    if (!value) return mode === 'date' ? '请选择日期' : '请选择日期和时间';
    var parts = value.split('T'), d = parts[0].split('-');
    var text = d[0] + '年' + Number(d[1]) + '月' + Number(d[2]) + '日';
    return mode === 'date' || !parts[1] ? text : text + ' ' + parts[1].slice(0, 5);
  }

  function enhance(input, options) {
    if (!input || input.dataset.miniPicker) return input;
    options = options || {};
    var mode = options.mode || (input.type === 'date' ? 'date' : 'datetime');
    var host = (options.host || document.querySelector('.phone') || document.body);
    input.dataset.miniPicker = mode;
    var required = input.required;
    // Keep the field in the form (name/value/required) but take it out of view and focus order.
    input.type = 'text'; input.readOnly = true; input.tabIndex = -1; input.setAttribute('aria-hidden', 'true'); input.classList.add('mini-date-native');
    input.required = required;
    var id = 'mini-date-' + (++counter);
    var trigger = el('button', 'quick-date-trigger mini-date-trigger'); trigger.type = 'button'; trigger.id = id;
    trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false');
    var text = el('span'); trigger.append(text, icon('calendar-days'));
    input.after(trigger);
    var labelNode = input.closest('label');
    if (labelNode) { labelNode.addEventListener('click', function (event) { if (event.target === labelNode) { event.preventDefault(); trigger.click(); } }); }
    function sync() { text.textContent = label(mode, input.value); text.classList.toggle('is-placeholder', !input.value); }
    sync();
    // Programmatic value changes (edit forms, resets) keep the trigger text in step.
    var proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(input, 'value', { configurable: true, get: function () { return proto.get.call(input); }, set: function (v) { proto.set.call(input, v); sync(); } });
    input.addEventListener('change', sync);
    var form = input.form; if (form) form.addEventListener('reset', function () { setTimeout(sync, 0); });

    var sheet = el('div', 'booking-calendar quick-calendar mini-date-sheet hidden');
    var titleId = id + '-title';
    sheet.innerHTML = '<div class="booking-calendar-mask"></div><div class="booking-calendar-sheet" role="dialog" aria-modal="true" aria-labelledby="' + titleId + '"><div class="booking-calendar-head"><button type="button" class="calendar-close">取消</button><b id="' + titleId + '"></b><button type="button" class="calendar-done">完成</button></div><div class="calendar-month"><button type="button" class="calendar-prev" aria-label="上个月"><i data-lucide="chevron-left"></i></button><b></b><button type="button" class="calendar-next" aria-label="下个月"><i data-lucide="chevron-right"></i></button></div><div class="calendar-weekdays"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div><div class="calendar-grid"></div><div class="mini-time-block" hidden><p class="mini-time-title">选择时间</p><div class="mini-time-grid"></div></div><p class="mini-date-hint" role="status"></p></div>';
    sheet.querySelector('#' + titleId).textContent = options.title || (mode === 'date' ? '选择日期' : '选择日期和时间');
    host.appendChild(sheet); draw();
    var grid = sheet.querySelector('.calendar-grid'), timeBlock = sheet.querySelector('.mini-time-block'), timeGrid = sheet.querySelector('.mini-time-grid'), hint = sheet.querySelector('.mini-date-hint');
    timeBlock.hidden = mode === 'date';
    var month, draftDate, draftTime;
    function minDate() { var m = typeof options.min === 'function' ? options.min() : options.min; return m === undefined ? ymd(new Date()) : m; }
    function renderCalendar() {
      var year = month.getFullYear(), idx = month.getMonth(), floor = minDate();
      sheet.querySelector('.calendar-month b').textContent = year + '年' + (idx + 1) + '月';
      var first = floor ? floor.slice(0, 7) : '';
      sheet.querySelector('.calendar-prev').disabled = !!first && (year + '-' + pad(idx + 1)) <= first;
      grid.replaceChildren();
      for (var b = 0; b < new Date(year, idx, 1).getDay(); b++) grid.appendChild(document.createElement('span'));
      for (var day = 1; day <= new Date(year, idx + 1, 0).getDate(); day++) {
        var option = el('button', '', String(day)); option.type = 'button';
        option.dataset.date = year + '-' + pad(idx + 1) + '-' + pad(day);
        option.disabled = !!floor && option.dataset.date < floor;
        option.classList.toggle('active', option.dataset.date === draftDate);
        option.setAttribute('aria-label', year + '年' + (idx + 1) + '月' + day + '日'); option.setAttribute('aria-pressed', String(option.dataset.date === draftDate));
        option.onclick = function () { draftDate = this.dataset.date; hint.textContent = ''; grid.querySelectorAll('button').forEach(function (n) { var on = n.dataset.date === draftDate; n.classList.toggle('active', on); n.setAttribute('aria-pressed', String(on)); }); renderTimes(); };
        grid.appendChild(option);
      }
    }
    function renderTimes() {
      if (mode === 'date') return;
      var list = TIMES.slice(); if (draftTime && list.indexOf(draftTime) < 0) { list.push(draftTime); list.sort(); }
      var now = new Date(), todayStr = ymd(now), nowHM = pad(now.getHours()) + ':' + pad(now.getMinutes());
      timeGrid.replaceChildren();
      list.forEach(function (t) {
        var slot = el('button', 'slot mini-time-slot', t); slot.type = 'button';
        // Past times today are not selectable when the field floors at today.
        slot.disabled = !!minDate() && draftDate === todayStr && t <= nowHM;
        var on = t === draftTime; slot.classList.toggle('selected', on); slot.setAttribute('aria-pressed', String(on));
        slot.onclick = function () { draftTime = t; hint.textContent = ''; timeGrid.querySelectorAll('button').forEach(function (n) { var s = n.textContent === draftTime; n.classList.toggle('selected', s); n.setAttribute('aria-pressed', String(s)); }); };
        timeGrid.appendChild(slot);
      });
    }
    function open() {
      var parts = (input.value || '').split('T');
      draftDate = parts[0] || ''; draftTime = (parts[1] || '').slice(0, 5);
      var base = draftDate || minDate() || ymd(new Date()), p = base.split('-');
      month = new Date(Number(p[0]), Number(p[1]) - 1, 1);
      hint.textContent = ''; renderCalendar(); renderTimes();
      sheet.classList.remove('hidden'); trigger.setAttribute('aria-expanded', 'true');
      sheet.querySelector('.calendar-close').focus({ preventScroll: true });
    }
    function close() { sheet.classList.add('hidden'); trigger.setAttribute('aria-expanded', 'false'); trigger.focus({ preventScroll: true }); }
    function done() {
      if (!draftDate) { hint.textContent = '请选择日期。'; return; }
      if (mode !== 'date' && !draftTime) { hint.textContent = '请选择时间。'; return; }
      var next = mode === 'date' ? draftDate : draftDate + 'T' + draftTime;
      var changed = input.value !== next; input.value = next;
      if (changed) { input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }
      close();
    }
    trigger.onclick = open;
    sheet.querySelector('.calendar-prev').onclick = function () { month.setMonth(month.getMonth() - 1); renderCalendar(); };
    sheet.querySelector('.calendar-next').onclick = function () { month.setMonth(month.getMonth() + 1); renderCalendar(); };
    sheet.querySelector('.calendar-close').onclick = sheet.querySelector('.booking-calendar-mask').onclick = close;
    sheet.querySelector('.calendar-done').onclick = done;
    sheet.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { event.stopPropagation(); close(); }
      if (event.key === 'Tab') {
        var items = Array.from(sheet.querySelectorAll('button:not(:disabled)')).filter(function (n) { return n.getClientRects().length; });
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
      }
    });
    // Remove the sheet when its form leaves the DOM (pages re-render forms often).
    new MutationObserver(function (records, observer) { if (!trigger.isConnected) { sheet.remove(); observer.disconnect(); } }).observe(document.body, { childList: true, subtree: true });
    return input;
  }
  // Upgrade every native date / datetime-local input that appears in the mini-program screen.
  function scan(root) {
    (root || document).querySelectorAll('.phone input[type="date"], .phone input[type="datetime-local"]').forEach(function (input) {
      // The visitor page owns a combined date/time sheet; do not add a second trigger.
      if (input.closest('.quick-booking-sheet') || input.closest('.visit-date-field') || input.dataset.miniPicker) return;
      var text = input.closest('label') ? input.closest('label').firstChild : null;
      enhance(input, { mode: input.type === 'date' ? 'date' : 'datetime', title: text && text.nodeType === 3 ? text.textContent.replace(/[\s*]+$/, '') : undefined, min: input.dataset.allowPast ? '' : undefined });
    });
  }
  window.__miniDatePicker = { enhance: enhance, scan: scan };
  function start() {
    scan();
    new MutationObserver(function (records) { if (records.some(function (r) { return r.addedNodes.length; })) scan(); }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
