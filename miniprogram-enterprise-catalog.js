(function () {
  var home = document.getElementById('enterprise-services');
  var catalog = document.createElement('section');
  catalog.id = 'enterprise-catalog';
  catalog.className = 'hidden';
  catalog.setAttribute('aria-label', '全部服务');
  document.querySelector('.screen').appendChild(catalog);
  window.__setMiniRoute('enterprise-catalog', '全部服务', 'enterprise-services');

  function render() {
    catalog.replaceChildren();
    var groups = (window.enterpriseServiceCatalog || []).filter(function (group) {
      return group.enabled !== false && group.services.some(function (service) { return service.enabled !== false; });
    });
    var tabs = document.createElement('div');
    tabs.className = 'enterprise-catalog-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '服务分类');
    var grid = document.createElement('div');
    grid.className = 'enterprise-category-grid';
    grid.id = 'enterprise-catalog-panel';
    grid.setAttribute('role', 'tabpanel');
    catalog.append(tabs, grid);

    function select(index) {
      Array.from(tabs.children).forEach(function (tab, position) {
        tab.setAttribute('aria-selected', position === index ? 'true' : 'false');
        tab.tabIndex = position === index ? 0 : -1;
      });
      grid.setAttribute('aria-labelledby', tabs.children[index].id);
      grid.replaceChildren();
      var services = (index === 0 ? groups : [groups[index - 1]]).flatMap(function (group) {
        return group.services.filter(function (service) { return service.enabled !== false; });
      });
      services.forEach(function (service) {
        var button = document.createElement(service.url ? 'a' : 'button');
        if (service.url) {
          button.href = service.url;
          button.target = '_blank';
          button.rel = 'noopener noreferrer';
        } else {
          button.type = 'button';
        }
        if (service.logo) {
          var logo = document.createElement('img');
          logo.src = service.logo;
          logo.alt = service.name;
          button.className = 'enterprise-catalog-logo';
          button.setAttribute('aria-label', service.name);
          button.appendChild(logo);
        } else {
          var icon = document.createElement('span');
          icon.className = 'enterprise-gpt-icon ' + (service.tone || '');
          var glyph = document.createElement('i');
          glyph.setAttribute('data-lucide', service.icon);
          icon.appendChild(glyph);
          var label = document.createElement('b');
          label.textContent = service.name;
          var subtitle = document.createElement('small');
          subtitle.textContent = service.subtitle || '';
          button.append(icon, label, subtitle);
        }
        if (service.page) button.dataset.page = service.page;
        else if (!service.url) button.addEventListener('click', function () {
          var source = Array.from(home.querySelectorAll('[data-enterprise-detail]')).find(function (item) {
            return item.dataset.enterpriseDetail === service.name;
          });
          if (source) {
            source.click();
          } else {
            var detail = document.getElementById('enterprise-detail');
            var heading = document.createElement('h2');
            heading.textContent = service.name;
            var description = document.createElement('p');
            description.textContent = service.description || '服务内容待官方配置。';
            detail.replaceChildren(heading, description);
            window.__showMiniPage('enterprise-detail');
          }
          window.__setMiniRoute('enterprise-detail', '服务详情', 'enterprise-catalog');
        });
        grid.appendChild(button);
      });
      if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8, 'aria-hidden': 'true', focusable: 'false' } });
    }

    ['全部'].concat(groups.map(function (group) { return group.name; })).forEach(function (name, index) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.id = 'enterprise-catalog-tab-' + index;
      tab.textContent = name;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', grid.id);
      tab.addEventListener('click', function () { select(index); });
      tab.addEventListener('keydown', function (event) {
        var next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.children.length;
        else if (event.key === 'ArrowLeft') next = (index + tabs.children.length - 1) % tabs.children.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.children.length - 1;
        else return;
        event.preventDefault();
        select(next);
        tabs.children[next].focus();
      });
      tabs.appendChild(tab);
    });
    // A single category needs no tab bar.
    tabs.hidden = groups.length < 2;
    select(0);
  }

  // Capture only service-directory entrances; activity and news lists keep their original behavior.
  home.addEventListener('click', function (event) {
    var entrance = event.target.closest('[data-enterprise-list="政策服务"]');
    if (!entrance) return;
    event.stopImmediatePropagation();
    render();
    window.__showMiniPage('enterprise-catalog');
  }, true);
})();
