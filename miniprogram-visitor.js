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
          <label for="visit-email">接待人员企业邮箱 *</label><input id="visit-email" name="email" type="email" required maxlength="120" placeholder="name@company.com"><small>请填写接待人员的企业邮箱。</small>
        </fieldset>
        <fieldset><legend>03 / 来访安排</legend>
          <label for="visit-start">预计到访时间 *</label><input id="visit-start" name="start" type="datetime-local" required>
          <label for="visit-end">预计离园时间 *</label><input id="visit-end" name="end" type="datetime-local" required><small>请填写预计离园时间。</small>
          <label for="visit-reason">访问原因 *</label><textarea id="visit-reason" name="reason" required maxlength="500" rows="3" placeholder="例如：商务洽谈、项目交流，请简要说明"></textarea>
        </fieldset>
        <label class="visit-consent"><input id="visit-consent" type="checkbox" required><span>我同意将本次填写的信息用于来访预约。</span></label>
        <button class="visit-primary" type="submit">下一步 · 接待人员验证</button>
      </form>
      <form id="visit-verify" hidden novalidate>
        <div class="visit-card"><span class="visit-eyebrow">接待人员确认</span><h3>请向接待人员获取验证码</h3><p>请联系 <b id="visit-host-copy"></b>，获取其企业邮箱中的验证码。</p><p id="visit-email-copy" class="visit-email"></p><p></p>
          <details class="visit-mail"><summary>查看验证码</summary><p>您的访客正在申请到访。本次验证码：</p><strong id="visit-demo-code"></strong><p>有效期5分钟；重新生成后旧码作废。</p></details>
          <label for="visit-code">6位验证码</label><input id="visit-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="请输入接待人员提供的验证码" required>
          <button id="visit-resend" class="visit-link" type="button">重新获取验证码</button>
        </div>
        <button class="visit-primary" type="submit">验证并生成访问码</button><button id="visit-back" class="visit-secondary" type="button">上一步 · 修改预约信息</button>
      </form>
      <div id="visit-result" hidden>
        <article id="visit-ticket" class="visit-ticket"><span class="visit-eyebrow">TEMPORARY VISITOR PASS</span><h3>临时访问凭证</h3><p id="visit-validity" role="status"></p><div id="visit-qr" role="img" aria-label="访问二维码"></div><p class="visit-watermark">通行以园区确认为准</p><dl><dt>凭证编号</dt><dd id="visit-pass-id"></dd><dt>预约到访</dt><dd id="visit-pass-start"></dd><dt>预计离园</dt><dd id="visit-pass-end"></dd></dl><p>请在预约时间内到访。</p></article>
        <div class="visit-actions"><button id="visit-download" class="visit-primary" type="button">保存二维码</button><button id="visit-print" class="visit-secondary" type="button">打印凭证</button></div>
        <p class="visit-help">二维码可保存为 SVG 图片；打印前请检查打印预览。</p><button id="visit-new" class="visit-link" type="button">重新预约</button>
      </div>
      <p id="visit-status" class="visit-status" role="status" tabindex="-1"></p>`;
    window.__setMiniRoute('visitor','访客预约','home');
    var info=page.querySelector('#visit-info'),verify=page.querySelector('#visit-verify'),result=page.querySelector('#visit-result');
    var status=page.querySelector('#visit-status'),code=page.querySelector('#visit-code'),resend=page.querySelector('#visit-resend');
    var draft=null,challenge=null,pass=null,step=1,downloadSvg='',exportUrl=null;
    function field(name){return info.elements.namedItem(name)}
    function tell(text,input){status.textContent=text;if(input)input.focus()}
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
      if(!page.querySelector('#visit-consent').checked){tell('请先同意预约信息使用说明。',page.querySelector('#visit-consent'));return false}
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
      issueCode();go(2);tell('验证码已生成。');
    });
    resend.onclick=function(){if(!challenge||Date.now()<challenge.resendAt)return;issueCode();tell('已重新获取验证码，旧验证码已作废。',code)};
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
      if(!/^\d{6}$/.test(code.value)||code.value!==challenge.code){tell('验证码不正确，请向接待人员确认；可查看上方验证码。',code);return}
      if(new Date(draft.start)<=new Date()){challenge=null;go(1);tell('到访时间已过，请重新选择时间并验证。',field('start'));return}
      var store=window.MiniStore,random=new Uint32Array(2);window.crypto.getRandomValues(random);
      var candidate={id:'DEMO-V-'+Array.from(random).map(function(n){return n.toString(16).padStart(8,'0')}).join(''),start:draft.start,end:draft.end};
      var qrSvg;
      try{qrSvg=makeQr(JSON.stringify({type:'DEMO_ONLY_NOT_FOR_ENTRY',id:candidate.id,from:new Date(candidate.start).toISOString(),until:new Date(candidate.end).toISOString()}))}
      catch(error){tell('二维码生成失败，请刷新后重试；尚未保存记录。');return}
      var record={id:candidate.id,title:'访客预约 · 访问凭证',created:new Date().toISOString(),state:'访问凭证已生成',fields:[['到访时间',displayTime(candidate.start)],['离园时间',displayTime(candidate.end)],['用途','通行以园区确认为准']]};
      store.data.visitors.unshift(record);
      if(!store.save()){store.data.visitors.shift();tell('本机记录保存失败，请检查存储权限后重试；未生成访问凭证。');return}
      pass=candidate;challenge=null;code.value='';page.querySelector('#visit-demo-code').textContent='';
      page.querySelector('#visit-qr').innerHTML=qrSvg;
      page.querySelector('#visit-pass-id').textContent=pass.id;
      page.querySelector('#visit-pass-start').textContent=displayTime(pass.start);
      page.querySelector('#visit-pass-end').textContent=displayTime(pass.end);
      // 导出内容仅使用生成的编号和已验证的时间，不包含姓名、电话、邮箱。
      downloadSvg='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="480" viewBox="0 0 400 480"><rect width="400" height="480" rx="16" fill="white"/><g font-family="sans-serif" text-anchor="middle" fill="#18392a"><text x="200" y="36" font-size="20">临时访问凭证</text><text x="200" y="64" font-size="14">通行以园区确认为准</text>'+qrSvg.replace('<svg ','<svg x="60" y="82" ').replace('width="240" height="240"','width="280" height="280"')+'<text x="200" y="386" font-size="12">'+pass.id+'</text><text x="200" y="415" font-size="14">到访 '+displayTime(pass.start)+'</text><text x="200" y="442" font-size="14">离园 '+displayTime(pass.end)+'</text><text x="200" y="467" font-size="12">请在所示时间段内到访</text></g></svg>';
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
      if(pass){var now=Date.now(),expired=now>=new Date(pass.end).getTime();page.querySelector('#visit-validity').textContent=expired?'已过期 · 请重新预约':now<new Date(pass.start).getTime()?'待到访 · 尚未到预约时间':'预约时间内';page.querySelector('#visit-qr').hidden=expired;page.querySelector('#visit-download').disabled=expired;page.querySelector('#visit-print').disabled=expired}
    }
    function reset(){
      challenge=null;draft=null;pass=null;downloadSvg='';info.reset();verify.reset();
      page.querySelector('#visit-qr').replaceChildren();['visit-demo-code','visit-host-copy','visit-email-copy','visit-pass-id','visit-pass-start','visit-pass-end','visit-validity'].forEach(function(id){page.querySelector('#'+id).textContent=''});
      page.querySelector('.visit-mail').open=false;clearPrint();if(exportUrl){URL.revokeObjectURL(exportUrl);exportUrl=null}
      var visible=!page.classList.contains('hidden');go(1);if(!visible)field('name').blur();
    }
    page.querySelector('#visit-new').onclick=reset;
    new MutationObserver(reset).observe(document.getElementById('profile'),{attributes:true,attributeFilter:['data-role']});
    var park=document.querySelector('#home .home-new-park b');if(park)new MutationObserver(reset).observe(park,{childList:true,characterData:true,subtree:true});
    window.addEventListener('mini-records-change',function(){if(pass&&!window.MiniStore.data.visitors.some(function(record){return record.id===pass.id}))reset()});
    new MutationObserver(function(){if(!page.classList.contains('hidden'))tick()}).observe(page,{attributes:true,attributeFilter:['class']});
    setInterval(tick,1000);go(1);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initVisitor,{once:true});else initVisitor();
})();
