(function () {
  var home = document.getElementById('enterprise-services');
  var source = home.querySelector('.enterprise-gpt-news');
  var page = document.createElement('section');
  page.id = 'enterprise-news'; page.className = 'hidden';
  var list = source.cloneNode(true);
  page.appendChild(list);
  document.querySelector('.screen').appendChild(page);
  window.__setMiniRoute(page.id, '精选资讯', 'enterprise-services');
  var detail = document.createElement('section');
  detail.id = 'enterprise-news-detail'; detail.className = 'hidden';
  document.querySelector('.screen').appendChild(detail);
  function node(tag, text, className) {
    var el = document.createElement(tag);
    if (text) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function openArticle(item, parent) {
    var title = item.dataset.enterpriseDetail;
    var content = window.enterpriseNewsContent[title];
    var article = node('article', '', 'enterprise-activity-article');
    var image = item.querySelector('img').cloneNode(true);
    image.alt = title;
    article.append(node('h1', title), node('p', item.querySelector('small').textContent, 'enterprise-activity-meta'), image, node('p', content.lead, 'enterprise-activity-lead'));
    content.sections.forEach(function (section) {
      article.appendChild(node('h2', section[0]));
      section.slice(1).forEach(function (paragraph) { article.appendChild(node('p', paragraph)); });
    });
    detail.replaceChildren(article);
    window.__setMiniRoute(detail.id, '资讯详情', parent);
    window.__showMiniPage(detail.id);
  }
  list.addEventListener('click', function (event) {
    var item = event.target.closest('[data-enterprise-detail]');
    if (!item) return;
    openArticle(item, page.id);
  });
  home.addEventListener('click', function (event) {
    var item = event.target.closest('.enterprise-gpt-news [data-enterprise-detail]');
    if (item) {
      event.stopImmediatePropagation();
      openArticle(item, 'enterprise-services');
      return;
    }
    if (!event.target.closest('[data-enterprise-list="精选资讯"]')) return;
    event.stopImmediatePropagation();
    window.__showMiniPage(page.id);
  }, true);
})();
