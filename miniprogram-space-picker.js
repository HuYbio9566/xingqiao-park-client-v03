(function () {
  'use strict';
  var spaces = document.getElementById('spaces'), phone = document.querySelector('.phone');
  var selects = Array.from(spaces.querySelectorAll('.space-finder-filters select,.space-finder-head select'));
  var sheet = document.createElement('div'); sheet.className = 'space-picker hidden';
  sheet.innerHTML = '<div class="space-picker-mask"></div><div class="space-picker-panel" role="dialog" aria-modal="true" aria-labelledby="space-picker-title"><header><h2 id="space-picker-title"></h2><button type="button" class="space-picker-cancel">取消</button></header><div class="space-picker-options" role="group" aria-labelledby="space-picker-title"></div><button type="button" class="space-picker-confirm" hidden>确定</button></div>';
  phone.appendChild(sheet);
  var panel = sheet.querySelector('.space-picker-panel'), options = sheet.querySelector('.space-picker-options');
  var cancel = sheet.querySelector('.space-picker-cancel'), confirm = sheet.querySelector('.space-picker-confirm'), active, draft = [], background = [];
  var titles = ['选择楼宇', '装修状态', '面积区间', '空间排序'];
  // Filters show "全部" as the first choice and the sheet title as their default trigger text.
  function optionLabel(control, option) { return control.filter && option.index === 0 ? '全部' : option.text; }
  var controls = selects.map(function (select, index) {
    var label = select.parentElement, trigger = document.createElement('button');
    trigger.type = 'button'; trigger.className = 'space-picker-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<span></span><i data-lucide="chevron-down" aria-hidden="true"></i>';
    if (index === 0) { select.multiple = true; if (!select.selectedOptions.length) select.options[0].selected = true; }
    // Keep the existing select as the value source for current navigation and change handlers.
    label.before(trigger); label.hidden = true; select.tabIndex = -1;
    function sync() {
      var selected = Array.from(select.selectedOptions), isDefault = selected.every(function (option) { return option.index === 0; });
      var text = index < 3 && isDefault ? titles[index] : selected.map(function (option) { return option.text; }).join('、');
      trigger.querySelector('span').textContent = selected.length > 2 ? '已选' + selected.length + '栋' : text;
      trigger.setAttribute('aria-label', titles[index] + '：' + text);
      trigger.classList.toggle('is-filtered', selected.some(function (option) { return option.index > 0; }));
    }
    select.addEventListener('change', sync); sync();
    var control = { select: select, trigger: trigger, title: titles[index], filter: index < 3 };
    trigger.onclick = function () { open(control); };
    return control;
  });
  function open(control) {
    close(false); active = control;
    sheet.querySelector('h2').textContent = control.title;
    confirm.hidden = !control.select.multiple;
    draft = Array.from(control.select.selectedOptions).map(function (option) { return option.index; });
    options.replaceChildren();
    Array.from(control.select.options).forEach(function (option, index) {
      var button = document.createElement('button'); button.type = 'button'; button.className = 'space-picker-option';
      button.setAttribute('aria-pressed', String(draft.includes(index))); button.disabled = option.disabled;
      var text = document.createElement('span'); text.textContent = optionLabel(control, option);
      button.appendChild(text); var icon = document.createElement('i'); icon.dataset.lucide = 'check'; icon.setAttribute('aria-hidden', 'true'); button.appendChild(icon);
      button.onclick = function () {
        if (!control.select.multiple) { control.select.selectedIndex = index; control.select.dispatchEvent(new Event('change', { bubbles: true })); close(); return; }
        if (index === 0) draft = [0];
        else {
          draft = draft.filter(function (value) { return value !== 0; });
          if (draft.includes(index)) draft = draft.filter(function (value) { return value !== index; });
          else draft.push(index);
          if (!draft.length) draft = [0];
        }
        Array.from(options.children).forEach(function (item, i) { item.setAttribute('aria-pressed', String(draft.includes(i))); });
        confirm.textContent = draft.includes(0) ? '确定' : '确定（' + draft.length + '）';
      };
      options.appendChild(button);
    });
    confirm.textContent = draft.includes(0) ? '确定' : '确定（' + draft.length + '）';
    background = Array.from(phone.children).filter(function (node) { return node !== sheet; }).map(function (node) { var previous = node.inert; node.inert = true; return [node, previous]; });
    sheet.classList.remove('hidden'); control.trigger.setAttribute('aria-expanded', 'true');
    if (window.lucide) lucide.createIcons();
    (options.querySelector('[aria-pressed="true"]:not(:disabled)') || cancel).focus({ preventScroll: true });
  }
  function close(restoreFocus) {
    if (!active) return;
    var trigger = active.trigger; active = null;
    sheet.classList.add('hidden'); trigger.setAttribute('aria-expanded', 'false');
    background.forEach(function (item) { item[0].inert = item[1]; }); background = [];
    if (restoreFocus !== false && !spaces.classList.contains('hidden')) trigger.focus({ preventScroll: true });
  }
  cancel.onclick = function () { close(); };
  confirm.onclick = function () {
    if (!active || !active.select.multiple) return;
    Array.from(active.select.options).forEach(function (option, index) { option.selected = draft.includes(index); });
    active.select.dispatchEvent(new Event('change', { bubbles: true })); close();
  };
  sheet.querySelector('.space-picker-mask').onclick = function () { close(); };
  document.addEventListener('keydown', function (event) {
    if (!active) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
    else if (event.key === 'Tab') {
      var buttons = Array.from(panel.querySelectorAll('button:not(:disabled)')).filter(function (button) { return !button.hidden; });
      var index = buttons.indexOf(document.activeElement);
      event.preventDefault(); buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    }
  }, true);
  new MutationObserver(function () { if (spaces.classList.contains('hidden')) close(false); }).observe(spaces, { attributes: true, attributeFilter: ['class'] });
  if (window.lucide) lucide.createIcons();
})();
