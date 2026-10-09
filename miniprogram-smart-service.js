(function () {
  function init() {
    var topics = [
      { question: '如何寻找合适的办公空间？', match: /房源|空间|面积|办公|工位|选址|平米|㎡|m²/i, answer: '先确认团队人数、面积预算和预计入驻时间，再按楼宇、面积和装修状态筛选房源。进入空间详情可查看租赁信息、配套条件与室内图片，具体可租状态和交付条件请与顾问核对。', route: 'spaces', action: '查看招商空间' },
      { question: '预约看房需要哪些信息？', match: /看房|预约|到访|参观/, answer: '请先选择意向房源，准备到访日期、时段、人数及关注的问题。可在房源详情通过在线咨询与顾问沟通，接待安排确认后再出行。提交意向不代表预约已确认。', route: 'spaces', action: '选择意向房源' },
      { question: '企业入驻需要准备什么？', match: /入驻|材料|注册|合同|签约|搬迁/, answer: '可先整理企业简介、主营业务、团队人数、面积需求和预计入驻时间。与顾问确认意向空间和准入条件后，再按正式清单提交资料、核对合同与交付安排。请勿在问答中填写证件号码等敏感信息。' },
      { question: '租金和物业费如何计算？', match: /租金|租赁费|物业费|费用|预算|价格|多少钱/, answer: '请先核对房源标注的计价单位和计租面积，再分别计算租金与物业费。押金、停车、能耗等是否另计需进一步确认，最终金额和支付周期以双方确认的合同为准。', route: 'spaces', action: '查看房源价格' },
      { question: '园区有哪些配套服务？', match: /配套|服务|停车|餐饮|餐厅|会议室|车辆/, answer: '可通过企业服务了解餐饮、会议室、车辆等园区服务。各项服务的开放时间、申请要求与可用情况以对应页面及园区通知为准。', route: 'enterprise-services', action: '查看企业服务' },
      { question: '如何了解入驻优惠政策？', match: /优惠|政策|补贴|税收/, answer: '优惠政策通常涉及企业类型、行业方向及申报条件。请先整理企业主营业务和入驻计划，再向招商顾问确认适用范围、有效期与申请材料；具体资格和额度以正式政策及审核结果为准。' }
    ];
    var page = document.createElement('section'); page.id = 'smart-service'; page.className = 'hidden'; page.setAttribute('aria-label', '智能客服问答');
    page.innerHTML = '<div class="qa-content"><header class="qa-intro"><span class="qa-mark" aria-hidden="true"><i data-lucide="bot"></i></span><h1>您好，有什么可以帮您？</h1><p>我是园区智能助手，为您解答空间选址、入驻流程与园区服务问题。</p></header><div class="qa-topics"><h2>常见问题</h2></div><div class="qa-history" role="log" aria-live="polite" aria-relevant="additions" aria-label="智能问答记录"></div></div><form class="qa-form"><div class="qa-input-row"><textarea rows="1" maxlength="500" aria-label="向智能客服提问" aria-describedby="qa-status" placeholder="请输入您想了解的问题…"></textarea><button type="submit" class="qa-submit" disabled>提问</button></div><p class="qa-status" id="qa-status" role="status">回答供参考，具体信息以正式通知及合同为准。</p></form>';
    document.querySelector('.screen').appendChild(page);
    window.__setMiniRoute('smart-service', '智能客服', 'home');
    var profile = document.getElementById('profile'), history = page.querySelector('.qa-history'), content = page.querySelector('.qa-content');
    var input = page.querySelector('textarea'), submit = page.querySelector('.qa-submit'), status = page.querySelector('.qa-status');
    var records = [], draft = '';
    function key() { return 'park-smart-qa-v1-' + (profile.dataset.role || 'guest'); }
    function save() {
      try { localStorage.setItem(key(), JSON.stringify({ records: records, draft: input.value })); }
      catch (error) { status.textContent = '问答记录暂不能保存，刷新后可能丢失。'; }
    }
    function update() { submit.disabled = !input.value.trim(); input.style.height = 'auto'; input.style.height = Math.max(44, Math.min(input.scrollHeight, 120)) + 'px'; }
    function append(record) {
      var article = document.createElement('article'), question = document.createElement('p'), answer = document.createElement('div');
      question.className = 'qa-question'; question.textContent = record.question; answer.className = 'qa-answer';
      var label = document.createElement('strong'), text = document.createElement('p'); label.textContent = '智能解答'; text.textContent = record.answer;
      answer.append(label, text);
      var topic = topics.find(function (item) { return item.route && item.question === record.topic; });
      if (topic) { var button = document.createElement('button'); button.type = 'button'; button.dataset.page = topic.route; button.textContent = topic.action + ' →'; answer.appendChild(button); }
      article.append(question, answer); history.appendChild(article);
    }
    function ask(question) {
      question = question.trim(); if (!question) return;
      if (question.length > 500) { status.textContent = '问题不能超过500字。'; return; }
      var topic = topics.find(function (item) { return item.question === question; }) || [topics[5], topics[3], topics[1], topics[4], topics[2], topics[0]].find(function (item) { return item.match.test(question); });
      var record = { question: question, topic: topic ? topic.question : '', answer: topic ? topic.answer : '暂时没有找到与这个问题匹配的信息。您可以补充关键词，或选择上方常见问题继续了解；涉及具体房源和办理进度，请从房源详情联系招商顾问确认。' };
      records.push(record); append(record); input.value = ''; update();
      status.textContent = '回答供参考，具体信息以正式通知及合同为准。'; save(); content.scrollTop = content.scrollHeight;
    }
    topics.forEach(function (topic) { var button = document.createElement('button'); button.type = 'button'; button.innerHTML = '<span></span><i data-lucide="chevron-right"></i>'; button.querySelector('span').textContent = topic.question; button.onclick = function () { ask(topic.question); }; page.querySelector('.qa-topics').appendChild(button); });
    page.querySelector('form').addEventListener('submit', function (event) { event.preventDefault(); ask(input.value); });
    input.addEventListener('input', function () { update(); save(); });
    input.addEventListener('keydown', function (event) { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); ask(input.value); } });
    function load() {
      records = []; draft = ''; status.textContent = '回答供参考，具体信息以正式通知及合同为准。';
      try { var saved = JSON.parse(localStorage.getItem(key()) || 'null'); if (saved) { records = Array.isArray(saved.records) ? saved.records.filter(function (item) { return item && typeof item.question === 'string' && typeof item.answer === 'string'; }) : []; draft = typeof saved.draft === 'string' ? saved.draft : ''; } }
      catch (error) { status.textContent = '暂时无法读取历史问答，您可以继续提问。'; }
      history.replaceChildren(); records.forEach(append); input.value = draft; update();
    }
    new MutationObserver(load).observe(profile, { attributes: true, attributeFilter: ['data-role'] });
    new MutationObserver(function () { if (!page.classList.contains('hidden')) { update(); content.scrollTop = records.length ? content.scrollHeight : 0; } }).observe(page, { attributes: true, attributeFilter: ['class'] });
    load();
    if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8, 'aria-hidden': 'true', focusable: 'false' } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
