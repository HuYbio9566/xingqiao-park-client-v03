(function () {
  'use strict';
  var spaces = document.getElementById('spaces');
  if (!spaces || !window.__showMiniPage || !window.__setMiniRoute) return;
  var screen = document.querySelector('.screen');
  var list = spaces.querySelector('.space-finder-list');
  var count = spaces.querySelector('.space-finder-head b');
  var box = spaces.querySelector('.space-finder-search');
  var field = box.querySelector('input');
  var selects = Array.from(spaces.querySelectorAll('.space-finder-filters select'));
  var HISTORY_KEY = 'v4:park-space-search-history-v1', MAX_HISTORY = 10;
  var HOT = ['研发办公', '精装修', 'A座', '可分割', '南向', '中央空调'];
  var keyword = '';

  function norm(text) { return String(text || '').toLowerCase().replace(/m²|m2|平方米|平米|平/g, '㎡').replace(/\s+/g, ' ').trim(); }
  function words(text) { return String(text || '').trim().split(/\s+/).filter(Boolean); }
  function esc(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function cards() { return Array.from(list.querySelectorAll('.space-finder-card')); }

  // Derive searchable/filterable fields once from each card's existing content and data attributes.
  function info(card) {
    if (card._space) return card._space;
    var button = card.querySelector('[data-space-detail]'), data = button ? button.dataset : {};
    var title = card.querySelector('h3'), unit = data.spaceDetail || '', meta = data.spaceMeta || '';
    var tags = Array.from(card.querySelectorAll('.space-finder-tags-inline span')).map(function (tag) { return tag.textContent; });
    var building = unit ? unit.charAt(0) + '座' : '';
    var text = [title.textContent, unit, building, data.spaceType || '', meta, tags.join(' ')].join(' ');
    var area = Number((meta.match(/(\d+)\s*㎡/) || title.textContent.match(/(\d+)\s*m²/) || [0, 0])[1]);
    card._space = { title: title, raw: title.textContent, building: building, area: area, finish: /精装修/.test(text) ? '精装修' : '毛坯', text: norm(text) };
    return card._space;
  }
  function chosen(select) {
    return Array.from(select.selectedOptions).filter(function (option) { return option.index > 0; }).map(function (option) { return option.text; });
  }
  function inArea(area, label) {
    var range = label.match(/(\d+)\s*-\s*(\d+)/);
    if (range) return area >= Number(range[1]) && area < Number(range[2]);
    var limit = label.match(/(\d+)/);
    if (!limit) return true;
    return /以下/.test(label) ? area < Number(limit[1]) : area >= Number(limit[1]);
  }
  function highlight(space, terms) {
    space.title.textContent = '';
    if (!terms.length) { space.title.textContent = space.raw; return; }
    space.raw.split(new RegExp('(' + terms.map(esc).join('|') + ')', 'ig')).forEach(function (part, index) {
      if (!part) return;
      if (index % 2) { var mark = document.createElement('mark'); mark.textContent = part; space.title.appendChild(mark); }
      else space.title.appendChild(document.createTextNode(part));
    });
  }

  var empty = document.createElement('div');
  empty.className = 'space-search-empty'; empty.hidden = true; empty.setAttribute('role', 'status');
  empty.innerHTML = '<i data-lucide="search-x" aria-hidden="true"></i><p></p><button type="button">清除条件</button>';
  list.after(empty);

  // Search terms, building, finish and area all apply together (AND).
  function apply() {
    var terms = words(keyword), matchTerms = terms.map(norm);
    var buildings = chosen(selects[0]), finishes = chosen(selects[1]), areas = chosen(selects[2]), shown = 0;
    cards().forEach(function (card) {
      var space = info(card);
      var ok = matchTerms.every(function (term) { return space.text.indexOf(term) > -1; }) &&
        (!buildings.length || buildings.indexOf(space.building) > -1) &&
        (!finishes.length || finishes.indexOf(space.finish) > -1) &&
        (!areas.length || areas.some(function (label) { return inArea(space.area, label); }));
      card.hidden = !ok; if (ok) shown++;
      highlight(space, terms);
    });
    if (count) count.textContent = String(shown);
    empty.hidden = shown > 0;
    empty.querySelector('p').textContent = keyword ? '没有找到与“' + keyword + '”相关的空间' : '没有符合筛选条件的空间';
    field.value = keyword;
    box.classList.toggle('has-keyword', !!keyword);
  }
  function resetAll() {
    keyword = '';
    selects.forEach(function (select) {
      Array.from(select.options).forEach(function (option) { option.selected = option.index === 0; });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    apply();
  }
  empty.querySelector('button').onclick = resetAll;
  selects.forEach(function (select) { select.addEventListener('change', apply); });

  // The list search box becomes an entry to the dedicated search page.
  field.readOnly = true;
  field.setAttribute('aria-haspopup', 'true');
  var listClear = document.createElement('button');
  listClear.type = 'button'; listClear.className = 'space-search-clear'; listClear.setAttribute('aria-label', '清除搜索');
  listClear.innerHTML = '<i data-lucide="x" aria-hidden="true"></i>';
  box.appendChild(listClear);
  listClear.addEventListener('click', function (event) { event.preventDefault(); event.stopPropagation(); keyword = ''; apply(); });
  box.addEventListener('click', function (event) { if (!event.target.closest('.space-search-clear')) { event.preventDefault(); openSearch(); } });
  field.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openSearch(); } });

  var page = document.createElement('section');
  page.id = 'space-search'; page.className = 'hidden';
  page.innerHTML = '<div class="space-search-bar"><label class="space-search-field"><i data-lucide="search" aria-hidden="true"></i>' +
    '<input type="search" enterkeyhint="search" placeholder="搜索楼宇 / 面积 / 空间类型" aria-label="搜索招商空间">' +
    '<button type="button" class="space-search-field-clear" aria-label="清空输入" hidden><i data-lucide="x" aria-hidden="true"></i></button></label>' +
    '<button type="button" class="space-search-cancel">取消</button></div>' +
    '<div class="space-search-block" data-block="history"><div class="space-search-head"><h3>搜索历史</h3>' +
    '<button type="button" class="space-search-clear-history" aria-label="清空搜索历史"><i data-lucide="trash-2" aria-hidden="true"></i></button></div>' +
    '<div class="space-search-chips" data-chips="history"></div></div>' +
    '<div class="space-search-block"><div class="space-search-head"><h3>热门搜索</h3></div><div class="space-search-chips" data-chips="hot"></div></div>';
  screen.appendChild(page);
  window.__setMiniRoute('space-search', '搜索空间', 'spaces');
  var input = page.querySelector('input'), inputClear = page.querySelector('.space-search-field-clear');
  var historyBlock = page.querySelector('[data-block="history"]'), historyChips = page.querySelector('[data-chips="history"]');

  function loadHistory() {
    try {
      var saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(function (item) { return typeof item === 'string'; }).slice(0, MAX_HISTORY) : [];
    } catch (error) { return []; }
  }
  function saveHistory(items) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch (error) {} }
  function chip(text, rank) {
    var button = document.createElement('button'); button.type = 'button';
    if (rank) { var badge = document.createElement('b'); badge.textContent = rank; button.appendChild(badge); }
    var label = document.createElement('span'); label.textContent = text; button.appendChild(label);
    button.onclick = function () { submit(text); };
    return button;
  }
  function renderHistory() {
    var items = loadHistory();
    historyChips.replaceChildren.apply(historyChips, items.map(function (item) { return chip(item); }));
    historyBlock.hidden = !items.length;
  }
  page.querySelector('[data-chips="hot"]').append.apply(page.querySelector('[data-chips="hot"]'), HOT.map(function (item, index) { return chip(item, index + 1); }));
  page.querySelector('.space-search-clear-history').onclick = function () { saveHistory([]); renderHistory(); input.focus({ preventScroll: true }); };

  function syncInputClear() { inputClear.hidden = !input.value; }
  function openSearch() {
    input.value = keyword; syncInputClear(); renderHistory();
    window.__showMiniPage('space-search');
    setTimeout(function () { if (!page.classList.contains('hidden')) input.focus({ preventScroll: true }); }, 0);
  }
  function submit(text) {
    var term = String(text || '').trim();
    if (!term) return;
    saveHistory([term].concat(loadHistory().filter(function (item) { return item !== term; })).slice(0, MAX_HISTORY));
    keyword = term; input.blur();
    window.__showMiniPage('spaces');
    apply();
  }
  input.addEventListener('input', syncInputClear);
  input.addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); submit(input.value); } });
  inputClear.onclick = function (event) { event.preventDefault(); input.value = ''; syncInputClear(); input.focus({ preventScroll: true }); };
  page.querySelector('.space-search-cancel').onclick = function () { input.blur(); window.__showMiniPage('spaces'); };

  // Re-apply when the list is shown, covering filter values set without a change event (e.g. home shortcuts).
  new MutationObserver(function () { if (!spaces.classList.contains('hidden')) apply(); }).observe(spaces, { attributes: true, attributeFilter: ['class'] });
  window.__spaceSearch = { apply: apply, reset: resetAll };
  apply();
  if (window.lucide) lucide.createIcons();
})();
