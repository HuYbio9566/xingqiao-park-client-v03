(function(){
  'use strict';
  function initVisitor(){
    var page=document.getElementById('visitor');
    page.innerHTML=`
      <ol class="visit-steps" aria-label="预约步骤"><li>1 <span>填写信息</span></li><li>2 <span>接待验证</span></li><li>3 <span>访问凭证</span></li></ol>
      <form id="visit-info" novalidate>
        <fieldset><legend>01 / 访客信息</legend>
          <label for="visit-name">姓名 *</label><input id="visit-name" name="name" required maxlength="40" autocomplete="off" placeholder="请输入访客姓名">
          <label for="visit-phone">手机号码 *</label><input id="visit-phone" name="phone" type="tel" required maxlength="11" inputmode="tel" placeholder="请输入11位手机号码">
        </fieldset>
        <fieldset><legend>02 / 企业接待信息</legend>
          <label for="visit-company">到访企业 *</label><input id="visit-company" name="company" required maxlength="100" placeholder="企业全称及楼栋 / 房间">
          <label for="visit-host">接待人员姓名 *</label><input id="visit-host" name="host" required maxlength="40" placeholder="请输入企业接待人员姓名">
          <label for="visit-email">接待人员企业邮箱 *</label><input id="visit-email" name="email" type="email" required maxlength="120" placeholder="name@company.com"><small>验证码应由接待人员在企业邮箱查收后提供给您；验证码将发送至该邮箱。</small>
        </fieldset>
        <fieldset><legend>03 / 来访安排</legend>
          <label for="visit-start-trigger">预计到访时间 *</label><div class="visit-date-field"><input id="visit-start" name="start" type="hidden"><button id="visit-start-trigger" class="visit-date-trigger" type="button" aria-label="预计到访时间，必填" aria-haspopup="dialog" aria-expanded="false" aria-describedby="visit-status"><span>请选择到访日期和时间</span><i data-lucide="calendar-days" aria-hidden="true"></i></button></div>
          <label for="visit-end-trigger">预计离园时间 *</label><div class="visit-date-field"><input id="visit-end" name="end" type="hidden"><button id="visit-end-trigger" class="visit-date-trigger" type="button" aria-label="预计离园时间，必填" aria-haspopup="dialog" aria-expanded="false" aria-describedby="visit-status"><span>请选择离园日期和时间</span><i data-lucide="calendar-days" aria-hidden="true"></i></button></div><small>访问码仅在所选时间段内有效，通行规则以园区审批为准。</small>
          <label for="visit-reason">访问原因 *</label><textarea id="visit-reason" name="reason" required maxlength="500" rows="3" placeholder="例如：商务洽谈、项目交流，请简要说明"></textarea>
        </fieldset>
        <label class="visit-consent"><input id="visit-consent" type="checkbox" required><span>我同意园区按访客管理规定使用以上信息，用于本次到访登记与安全核验。</span></label>
        <button class="visit-primary" type="submit">下一步 · 接待人员验证</button>
      </form>
      <form id="visit-verify" hidden novalidate>
        <div class="visit-card"><span class="visit-eyebrow">接待人员确认</span><h3>请向接待人员获取验证码</h3><p>请联系 <b id="visit-host-copy"></b>，获取其企业邮箱中的验证码。</p><p id="visit-email-copy" class="visit-email"></p><p>验证码已发送至该邮箱，5 分钟内有效。</p>
          <details class="visit-mail"><summary>查看验证邮件</summary><p>您的访客正在申请到访。本次验证码：</p><strong id="visit-demo-code"></strong><p>有效期5分钟；重新生成后旧码作废。</p></details>
          <label for="visit-code">6位验证码</label><input id="visit-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="请输入接待人员提供的验证码" required>
          <button id="visit-resend" class="visit-link" type="button">重新获取验证码</button>
        </div>
        <button class="visit-primary" type="submit">验证并生成访问码</button><button id="visit-back" class="visit-secondary" type="button">上一步 · 修改预约信息</button>
      </form>
      <div id="visit-result" hidden>
        <article id="visit-ticket" class="visit-ticket"><span class="visit-eyebrow">TEMPORARY VISITOR PASS</span><h3>临时访问凭证</h3><p id="visit-validity" role="status"></p><div id="visit-qr" role="img" aria-label="临时访问二维码"></div><p class="visit-watermark">临时访客 · 到访时出示</p><dl><dt>凭证编号</dt><dd id="visit-pass-id"></dd><dt>预约到访</dt><dd id="visit-pass-start"></dd><dt>预计离园</dt><dd id="visit-pass-end"></dd></dl><p>请在预约时间内到访，到达后向前台出示本凭证。</p></article>
        <div class="visit-actions"><button id="visit-download" class="visit-primary" type="button">保存二维码</button><button id="visit-print" class="visit-secondary" type="button">打印凭证</button></div>
        <p class="visit-help">可保存为图片或打印，到访时出示给前台核验。</p><button id="visit-new" class="visit-link" type="button">重新预约</button>
      </div>
      <p id="visit-status" class="visit-status" role="status" tabindex="-1"></p>`;
    window.__setMiniRoute('visitor','访客预约','home');
    var info=page.querySelector('#visit-info'),verify=page.querySelector('#visit-verify'),result=page.querySelector('#visit-result');
    var status=page.querySelector('#visit-status'),code=page.querySelector('#visit-code'),resend=page.querySelector('#visit-resend');
    // Page navigation hides every section; the dialog must not be a route section.
    var dateSheet=document.createElement('div');dateSheet.className='visit-date-sheet hidden';dateSheet.innerHTML='<div class="visit-date-mask"></div><div class="visit-date-panel" role="dialog" aria-modal="true" aria-labelledby="visit-date-title" aria-describedby="visit-date-help"><div class="visit-date-grabber" aria-hidden="true"></div><header><button type="button" class="visit-date-cancel">取消</button><h2 id="visit-date-title">选择时间</h2><button type="button" class="visit-date-done">确定</button></header><div class="visit-wheel-year"><button type="button" class="visit-year-prev" aria-label="上一年">‹</button><b></b><button type="button" class="visit-year-next" aria-label="下一年">›</button></div><div class="visit-wheel-labels" aria-hidden="true"><span>日期</span><span>时</span><span>分</span></div><div class="visit-date-wheels"></div><p class="visit-date-summary" role="status"></p><p id="visit-date-help" class="visit-date-help visually-hidden">上下滑动或点选，方向键可调整。</p><p class="visit-date-hint" role="status"></p></div>';
    document.querySelector('.phone').appendChild(dateSheet);
    var datePanel=dateSheet.querySelector('.visit-date-panel'),wheels=dateSheet.querySelector('.visit-date-wheels'),dateSheetTarget=null,dateSheetPrevious=null,dragStart=null,closeTimer=null;
    var pickedDay='',pickedHour=0,pickedMinute=0,wheelYear=0,lower='',columns={},external=null;
    function pad(n){return String(n).padStart(2,'0')}
    function localValue(date){return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())+'T'+pad(date.getHours())+':'+pad(date.getMinutes())}
    function dayLabel(value){var parts=value.split('-'),date=new Date(Number(parts[0]),Number(parts[1])-1,Number(parts[2]));return Number(parts[1])+'月'+Number(parts[2])+'日 周'+'日一二三四五六'[date.getDay()]}
    function formatDateValue(value){return value.slice(0,4)+'年'+dayLabel(value.slice(0,10))+' '+value.slice(11,16)}
    function syncTrigger(name){var input=field(name),trigger=page.querySelector('#visit-'+name+'-trigger'),title=name==='start'?'预计到访时间':'预计离园时间';trigger.querySelector('span').textContent=input.value?formatDateValue(input.value):'请选择'+(name==='start'?'到访':'离园')+'日期和时间';trigger.setAttribute('aria-label',title+'，必填'+(input.value?'，'+formatDateValue(input.value):''))}
    function minimumValue(){var floor=Math.floor(Date.now()/60000)*60000+60000;if(external){var extra=external.min&&external.min();if(extra)floor=Math.max(floor,new Date(extra).getTime()+60000);return localValue(new Date(floor))}if(dateSheetTarget===field('end'))floor=Math.max(floor,new Date(field('start').value).getTime()+60000);return localValue(new Date(floor))}
    function numbers(min,max){var list=[];for(var n=min;n<=max;n++)list.push(n);return list}
    function summary(){dateSheet.querySelector('.visit-date-summary').textContent='已选：'+formatDateValue(pickedDay+'T'+pad(pickedHour)+':'+pad(pickedMinute))}
    // Fixed-height scroll-snap rows keep touch, mouse and keyboard on the same draft value.
    function column(name,label,values,selected,describe,change){
      var node=document.createElement('div'),rows=[],index=Math.max(0,values.indexOf(selected));node.className='visit-date-wheel';node.tabIndex=0;node.setAttribute('role','spinbutton');node.setAttribute('aria-label',label);node.setAttribute('aria-describedby','visit-date-help');
      node.setAttribute('aria-valuemin',String(name==='date'?0:values[0]));node.setAttribute('aria-valuemax',String(name==='date'?values.length-1:values[values.length-1]));
      values.forEach(function(value,i){var row=document.createElement('div');row.className='visit-wheel-tick';row.textContent=describe(value);row.setAttribute('aria-hidden','true');row.onclick=function(){set(i)};node.appendChild(row);rows.push(row)});
      function sync(){var next=Math.max(0,Math.min(values.length-1,Math.round(node.scrollTop/44))),changed=next!==index;index=next;node.setAttribute('aria-valuenow',String(name==='date'?index:values[index]));node.setAttribute('aria-valuetext',describe(values[index]));rows.forEach(function(row,i){row.classList.toggle('is-selected',i===index)});if(changed)change(values[index])}
      function set(next){node.scrollTop=Math.max(0,Math.min(values.length-1,next))*44;sync()}
      node.addEventListener('scroll',function(){if(node.isConnected&&!dateSheet.classList.contains('is-closing'))sync()},{passive:true});
      node.addEventListener('keydown',function(event){var next={ArrowUp:index-1,ArrowDown:index+1,PageUp:index-7,PageDown:index+7,Home:0,End:values.length-1}[event.key];if(next!==undefined){event.preventDefault();set(next)}});
      var previous=columns[name];if(previous)previous.replaceWith(node);else wheels.appendChild(node);columns[name]=node;node.scrollTop=index*44;sync();
    }
    function renderMinutes(){var min=pickedDay===lower.slice(0,10)&&pickedHour===Number(lower.slice(11,13))?Number(lower.slice(14,16)):0;pickedMinute=Math.max(min,pickedMinute);column('minute','分钟',numbers(min,59),pickedMinute,function(n){return pad(n)+' 分'},function(n){pickedMinute=n;summary()});summary()}
    function renderHours(){var min=pickedDay===lower.slice(0,10)?Number(lower.slice(11,13)):0;pickedHour=Math.max(min,pickedHour);column('hour','小时',numbers(min,23),pickedHour,function(n){return pad(n)+' 时'},function(n){pickedHour=n;renderMinutes()});renderMinutes()}
    function renderDates(){
      var days=[],date=new Date(wheelYear,0,1);while(date.getFullYear()===wheelYear){var value=localValue(date).slice(0,10);if(value>=lower.slice(0,10))days.push(value);date.setDate(date.getDate()+1)}
      if(!days.includes(pickedDay))pickedDay=days[0];
      dateSheet.querySelector('.visit-wheel-year b').textContent=wheelYear+'年';dateSheet.querySelector('.visit-year-prev').disabled=wheelYear<=Number(lower.slice(0,4));dateSheet.querySelector('.visit-year-next').disabled=wheelYear>=9999;
      column('date','日期',days,pickedDay,dayLabel,function(value){pickedDay=value;renderHours()});renderHours();
    }
    function closeDateSheet(returnFocus){if(closeTimer)window.clearTimeout(closeTimer);dateSheet.classList.add('is-closing');if(dateSheetPrevious)dateSheetPrevious.setAttribute('aria-expanded','false');if(returnFocus&&dateSheetPrevious)dateSheetPrevious.focus({preventScroll:true});closeTimer=window.setTimeout(function(){dateSheet.classList.add('hidden');dateSheet.classList.remove('is-closing');dateSheetTarget=null;external=null;closeTimer=null},180)}
    function openDateSheet(target,trigger){
      external=null;
      if(target===field('end')&&!field('start').value){tell('请先选择到访日期和时间。',page.querySelector('#visit-start-trigger'));return}
      if(closeTimer)window.clearTimeout(closeTimer);closeTimer=null;if(dateSheetPrevious)dateSheetPrevious.setAttribute('aria-expanded','false');dateSheetTarget=target;dateSheetPrevious=trigger;lower=minimumValue();var value=target.value&&target.value>=lower?target.value:lower;
      showSheet(value,trigger.id==='visit-start-trigger'?'预计到访时间':'预计离园时间',target===field('end')?'离园须晚于到访时间':'请选择未来时间',trigger);
    }
    function showSheet(value,title,hint,trigger){
      pickedDay=value.slice(0,10);pickedHour=Number(value.slice(11,13));pickedMinute=Number(value.slice(14,16));wheelYear=Number(value.slice(0,4));
      dateSheet.querySelector('#visit-date-title').textContent=title;dateSheet.querySelector('.visit-date-hint').textContent=hint;dateSheet.classList.remove('hidden','is-closing');wheels.replaceChildren();columns={};renderDates();trigger.setAttribute('aria-expanded','true');dateSheet.querySelector('.visit-date-cancel').focus({preventScroll:true});
    }
    // Same three-column wheel for other forms (e.g. 企业员工「登记来访」). The caller owns its input and validation.
    function openWheel(options){
      if(closeTimer)window.clearTimeout(closeTimer);closeTimer=null;if(dateSheetPrevious)dateSheetPrevious.setAttribute('aria-expanded','false');
      external=options;dateSheetTarget=options.input;dateSheetPrevious=options.trigger;lower=minimumValue();var current=options.input.value;
      showSheet(current&&current>=lower?current:lower,options.title,options.hint||'请选择未来时间',options.trigger);
    }
    function finishDateSheet(){
      if(!dateSheetTarget||dateSheet.classList.contains('is-closing'))return;['date','hour','minute'].forEach(function(name){columns[name].dispatchEvent(new Event('scroll'))});var next=pickedDay+'T'+pad(pickedHour)+':'+pad(pickedMinute);
      if(next<minimumValue()){dateSheet.querySelector('.visit-date-hint').textContent=external?(external.lateHint||'所选时间已过，请重选'):dateSheetTarget===field('end')?'离园须晚于到访时间，请重选':'所选时间已过，请重选';return}
      if(external){var input=external.input,done=external.onDone;input.value=next;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));closeDateSheet(true);if(done)done(next);return}
      var name=dateSheetTarget.name;dateSheetTarget.value=next;dateSheetTarget.dispatchEvent(new Event('change',{bubbles:true}));syncTrigger(name);dateSheetPrevious.removeAttribute('aria-invalid');
      if(name==='start'&&field('end').value&&field('end').value<=next){field('end').value='';syncTrigger('end');page.querySelector('#visit-end-trigger').setAttribute('aria-invalid','true');tell('到访时间已更新，原离园时间已失效，请重新选择离园时间。')}else tell('');
      closeDateSheet(true);
    }
    window.__visitWheel={open:openWheel,isOpen:function(){return !dateSheet.classList.contains('hidden')&&!dateSheet.classList.contains('is-closing')}};
    page.querySelectorAll('.visit-date-trigger').forEach(function(trigger){trigger.onclick=function(){openDateSheet(page.querySelector('#'+trigger.id.replace('-trigger','')),trigger)}});
    dateSheet.querySelector('.visit-date-done').onclick=finishDateSheet;dateSheet.querySelector('.visit-date-cancel').onclick=function(){closeDateSheet(true)};dateSheet.querySelector('.visit-date-mask').onclick=function(){closeDateSheet(true)};
    dateSheet.querySelector('.visit-year-prev').onclick=function(){wheelYear--;renderDates()};dateSheet.querySelector('.visit-year-next').onclick=function(){wheelYear++;renderDates()};
    datePanel.addEventListener('pointerdown',function(event){if(!event.target.closest('header,.visit-date-grabber')||event.target.closest('button'))return;dragStart={y:event.clientY};datePanel.setPointerCapture(event.pointerId)});
    datePanel.addEventListener('pointermove',function(event){if(!dragStart)return;var offset=Math.max(0,event.clientY-dragStart.y);datePanel.style.setProperty('--visit-sheet-drag',offset+'px')});
    function finishSheetDrag(event){if(!dragStart)return;var offset=Math.max(0,event.clientY-dragStart.y);dragStart=null;datePanel.style.removeProperty('--visit-sheet-drag');if(offset>90)closeDateSheet(true)}
    datePanel.addEventListener('pointerup',finishSheetDrag);datePanel.addEventListener('pointercancel',finishSheetDrag);datePanel.addEventListener('lostpointercapture',function(){if(dragStart){dragStart=null;datePanel.style.removeProperty('--visit-sheet-drag')}});
    document.addEventListener('keydown',function(event){if(dateSheet.classList.contains('hidden')||dateSheet.classList.contains('is-closing'))return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDateSheet(true)}if(event.key==='Tab'){var targets=[dateSheet.querySelector('.visit-date-cancel'),dateSheet.querySelector('.visit-year-prev'),dateSheet.querySelector('.visit-year-next'),columns.date,columns.hour,columns.minute,dateSheet.querySelector('.visit-date-done')].filter(function(node){return !node.disabled}),index=targets.indexOf(document.activeElement);event.preventDefault();targets[(index+(event.shiftKey?targets.length-1:1))%targets.length].focus({preventScroll:true})}});
    var draft=null,challenge=null,pass=null,step=1,downloadSvg='',exportUrl=null;
    function field(name){return info.elements.namedItem(name)}
    function tell(text,input){status.textContent=text;if(input){if(input===field('start')||input===field('end'))input=page.querySelector('#visit-'+input.name+'-trigger');input.focus()}}
    function go(next){
      step=next;[info,verify,result].forEach(function(panel,i){panel.hidden=i!==next-1});
      page.querySelectorAll('.visit-steps li').forEach(function(item,i){if(i===next-1)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');item.classList.toggle('is-done',i<next-1)});
      tell('');
      if(!page.classList.contains('hidden')){
        document.querySelector('.screen').scrollTop=0;
        (next===1?field('name'):next===2?code:page.querySelector('#visit-download')).focus();
      }
    }
    function validate(){
      var labels={name:'访客姓名',phone:'有效的11位手机号码',company:'到访企业',host:'接待人员姓名',email:'有效的接待人员企业邮箱',start:'预计到访时间',end:'预计离园时间',reason:'访问原因'};
      for(var key in labels){
        var input=field(key);input.value=input.value.trim();
        if(!input.value||!input.checkValidity()||(key==='phone'&&!/^1[3-9]\d{9}$/.test(input.value))||(key==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value))){tell('请填写'+labels[key]+'。',input);return false}
      }
      if(!Number.isFinite(new Date(field('start').value).getTime())||new Date(field('start').value)<=new Date()){tell('请选择未来的到访时间。',field('start'));return false}
      if(!Number.isFinite(new Date(field('end').value).getTime())||new Date(field('end').value)<=new Date(field('start').value)){tell('离园时间必须晚于到访时间。',field('end'));return false}
      if(!page.querySelector('#visit-consent').checked){tell('请先同意信息使用说明。',page.querySelector('#visit-consent'));return false}
      return true;
    }
    function issueCode(){
      var random=new Uint32Array(1);window.crypto.getRandomValues(random);
      var next=String(100000+random[0]%900000);
      if(challenge&&next===challenge.code)next=String(100000+(Number(next)-100000+1)%900000);
      challenge={code:next,expires:Date.now()+300000,resendAt:Date.now()+30000};
      code.value='';page.querySelector('#visit-demo-code').textContent=next;tick();
    }
    info.addEventListener('submit',function(event){
      event.preventDefault();if(!validate())return;
      draft={};['name','phone','company','host','email','start','end','reason'].forEach(function(key){draft[key]=field(key).value});
      page.querySelector('#visit-host-copy').textContent=draft.host;
      page.querySelector('#visit-email-copy').textContent=draft.email;
      issueCode();go(2);tell('验证码已发送至接待人员邮箱。');
    });
    resend.onclick=function(){if(!challenge||Date.now()<challenge.resendAt)return;issueCode();tell('已重新发送验证码，旧验证码已作废。',code)};
    page.querySelector('#visit-back').onclick=function(){challenge=null;draft=null;page.querySelector('#visit-demo-code').textContent='';code.value='';go(1)};
    function displayTime(value){return value.replace('T',' ')}
    function makeQr(payload){
      var qr=window.qrcode(0,'M');qr.addData(payload,'Byte');qr.make();
      var size=qr.getModuleCount(),path='';
      for(var r=0;r<size;r++)for(var c=0;c<size;c++)if(qr.isDark(r,c))path+='M'+(c+4)+' '+(r+4)+'h1v1h-1z';
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+(size+8)+' '+(size+8)+'" width="240" height="240" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="'+path+'" fill="black"/></svg>';
    }
    verify.addEventListener('submit',function(event){
      event.preventDefault();if(step!==2||!draft||!challenge)return;
      if(Date.now()>=challenge.expires){tell('验证码已过期，请重新获取验证码。',resend);return}
      if(!/^\d{6}$/.test(code.value)||code.value!==challenge.code){tell('验证码不正确，请向接待人员确认。',code);return}
      if(new Date(draft.start)<=new Date()){challenge=null;go(1);tell('到访时间已过，请重新选择时间并验证。',field('start'));return}
      var store=window.MiniStore,random=new Uint32Array(2);window.crypto.getRandomValues(random);
      var candidate={id:'V-'+Array.from(random).map(function(n){return n.toString(16).padStart(8,'0')}).join(''),start:draft.start,end:draft.end};
      var qrSvg;
      try{qrSvg=makeQr(JSON.stringify({type:'VISITOR_PASS',id:candidate.id,from:new Date(candidate.start).toISOString(),until:new Date(candidate.end).toISOString()}))}
      catch(error){tell('二维码生成失败，请刷新后重试；尚未保存记录。');return}
      var record={id:candidate.id,title:'访客预约 · 临时凭证',created:new Date().toISOString(),state:'凭证已生成',fields:[['到访时间',displayTime(candidate.start)],['离园时间',displayTime(candidate.end)],['用途','到访登记']]};
      store.data.visitors.unshift(record);
      if(!store.save()){store.data.visitors.shift();tell('本机记录保存失败，请检查存储权限后重试；未生成访问凭证。');return}
      pass=candidate;challenge=null;code.value='';page.querySelector('#visit-demo-code').textContent='';
      page.querySelector('#visit-qr').innerHTML=qrSvg;
      page.querySelector('#visit-pass-id').textContent=pass.id;
      page.querySelector('#visit-pass-start').textContent=displayTime(pass.start);
      page.querySelector('#visit-pass-end').textContent=displayTime(pass.end);
      // 导出内容仅使用生成的编号和已验证的时间，不包含姓名、电话、邮箱。
      downloadSvg='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="480" viewBox="0 0 400 480"><rect width="400" height="480" rx="16" fill="white"/><g font-family="sans-serif" text-anchor="middle" fill="#18392a"><text x="200" y="36" font-size="20">临时访问凭证</text><text x="200" y="64" font-size="14">到访时出示给前台</text>'+qrSvg.replace('<svg ','<svg x="60" y="82" ').replace('width="240" height="240"','width="280" height="280"')+'<text x="200" y="386" font-size="12">'+pass.id+'</text><text x="200" y="415" font-size="14">到访 '+displayTime(pass.start)+'</text><text x="200" y="442" font-size="14">离园 '+displayTime(pass.end)+'</text><text x="200" y="467" font-size="12">仅在所示时间段内有效</text></g></svg>';
      window.dispatchEvent(new Event('mini-records-change'));go(3);tick();
    });
    function exportAllowed(){if(!pass||Date.now()>=new Date(pass.end).getTime()){tick();tell('凭证已失效，请重新预约。');return false}return true}
    page.querySelector('#visit-download').onclick=function(){
      if(!exportAllowed())return;
      try{
        if(exportUrl)URL.revokeObjectURL(exportUrl);
        exportUrl=URL.createObjectURL(new Blob([downloadSvg],{type:'image/svg+xml;charset=utf-8'}));
        var link=document.createElement('a');link.href=exportUrl;link.download=pass.id+'.svg';document.body.appendChild(link);link.click();link.remove();
        tell('已请求保存 SVG 图片，请在浏览器下载中查看。');
      }catch(error){tell('当前环境不支持下载，请使用打印凭证另存为 PDF。')}
    };
    function clearPrint(){document.body.classList.remove('visitor-print');var sheet=document.getElementById('visitor-print-sheet');if(sheet)sheet.remove()}
    page.querySelector('#visit-print').onclick=function(){
      if(!exportAllowed())return;clearPrint();
      var sheet=page.querySelector('#visit-ticket').cloneNode(true);sheet.id='visitor-print-sheet';sheet.querySelectorAll('[id]').forEach(function(node){node.removeAttribute('id')});document.body.appendChild(sheet);document.body.classList.add('visitor-print');
      try{window.print();tell('已请求打开打印预览，可选择打印机或另存为 PDF。')}catch(error){clearPrint();tell('当前环境不支持打印，请保存二维码图片。')}
    };
    window.addEventListener('afterprint',clearPrint);
    function tick(){
      if(challenge){var left=Math.max(0,Math.ceil((challenge.resendAt-Date.now())/1000));resend.disabled=left>0;resend.textContent=left?'重新获取验证码（'+left+'s）':'重新获取验证码'}
      if(pass){var now=Date.now(),expired=now>=new Date(pass.end).getTime();page.querySelector('#visit-validity').textContent=expired?'已过期 · 请重新预约':now<new Date(pass.start).getTime()?'待到访 · 尚未到预约时间':'预约时间内 · 有效';page.querySelector('#visit-qr').hidden=expired;page.querySelector('#visit-download').disabled=expired;page.querySelector('#visit-print').disabled=expired}
    }
    function reset(){
      challenge=null;draft=null;pass=null;downloadSvg='';info.reset();field('start').value='';field('end').value='';verify.reset();['start','end'].forEach(function(name){syncTrigger(name);page.querySelector('#visit-'+name+'-trigger').removeAttribute('aria-invalid')});closeDateSheet(false);
      page.querySelector('#visit-qr').replaceChildren();['visit-demo-code','visit-host-copy','visit-email-copy','visit-pass-id','visit-pass-start','visit-pass-end','visit-validity'].forEach(function(id){page.querySelector('#'+id).textContent=''});
      page.querySelector('.visit-mail').open=false;clearPrint();if(exportUrl){URL.revokeObjectURL(exportUrl);exportUrl=null}
      var visible=!page.classList.contains('hidden');go(1);if(!visible)field('name').blur();
    }
    page.querySelector('#visit-new').onclick=reset;
    new MutationObserver(reset).observe(document.getElementById('profile'),{attributes:true,attributeFilter:['data-role']});
    var park=document.querySelector('#home .home-new-park b');if(park)new MutationObserver(reset).observe(park,{childList:true,characterData:true,subtree:true});
    window.addEventListener('mini-records-change',function(){if(pass&&!window.MiniStore.data.visitors.some(function(record){return record.id===pass.id}))reset()});
    new MutationObserver(function(){if(!page.classList.contains('hidden'))tick();else if(!dateSheet.classList.contains('hidden'))closeDateSheet(false)}).observe(page,{attributes:true,attributeFilter:['class']});
    setInterval(tick,1000);go(1);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initVisitor,{once:true});else initVisitor();
})();
