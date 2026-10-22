(function(){
  var key='v4:starbridge-demo-v1';
  var data={bookings:[],visitors:[],repairs:[],consultations:[],feedback:[]};
  var persisted;
  try{
    persisted=localStorage.getItem(key);
    var saved=JSON.parse(persisted||'null');
    if(saved)Object.keys(data).forEach(function(name){if(Array.isArray(saved[name]))data[name]=saved[name]});
  }catch(error){}
  // Property-workbench coverage records, added once by id so every list shows data (feedback, visitors, venue fees).
  (function(){
    var day=function(offset){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+offset*86400000))};
    var company='北京星桥科技',changed=false;
    // Seed a store that has never been saved; never refill lists the user (or a test) already saved.
    if(persisted)return;
    var add=function(list,record){if(!data[list].some(function(item){return item.id===record.id})){data[list].push(Object.assign({coverage:true},record));changed=true}};
    [
      {id:'FK-CV-001',owner:'employee',company:company,title:'投诉',propertyStatus:'submitted',created:day(-1)+'T09:20:00+08:00',fields:[['反馈类型','投诉'],['反馈内容','A座电梯早高峰等待时间过长'],['联系电话','138****0000']],propertyHistory:[]},
      {id:'FK-CV-002',owner:'employee',company:company,title:'建议',propertyStatus:'processing',created:day(-2)+'T10:00:00+08:00',fields:[['反馈类型','建议'],['反馈内容','建议在大堂增设直饮水机'],['联系电话','138****0000']],propertyHistory:['物业人员接单并分派']},
      {id:'FK-CV-003',owner:'employee',company:company,title:'表扬',propertyStatus:'submitted',created:day(-3)+'T15:30:00+08:00',fields:[['反馈类型','表扬'],['反馈内容','报修师傅响应及时，服务态度好'],['联系电话','138****0000']],propertyHistory:[]},
      {id:'FK-CV-004',owner:'employee',company:company,title:'投诉',propertyStatus:'completed',created:day(-8)+'T11:00:00+08:00',fields:[['反馈类型','投诉'],['反馈内容','地下车库照明不足'],['联系电话','138****0000']],propertyResult:'已增设夜间补光灯具',propertyHistory:['物业人员接单并分派','物业人员提交处理结果','王晓明：确认处理结果']},
      {id:'FK-CV-005',owner:'employee',company:company,title:'建议',propertyStatus:'awaiting_confirmation',created:day(-5)+'T14:00:00+08:00',fields:[['反馈类型','建议'],['反馈内容','建议延长食堂午餐供应时间'],['联系电话','138****0000']],propertyResult:'已协调餐厅延长至13:30',propertyHistory:['物业人员接单并分派','物业人员提交处理结果']},
      {id:'FK-CV-006',owner:'employee',company:company,title:'表扬',propertyStatus:'completed',created:day(-12)+'T09:00:00+08:00',fields:[['反馈类型','表扬'],['反馈内容','保洁阿姨工作认真细致'],['联系电话','138****0000']],propertyResult:'已转达并通报表扬',propertyHistory:['物业人员接单并分派','物业人员提交处理结果','王晓明：确认处理结果']}
    ].forEach(function(record){add('feedback',record)});
    [
      {id:'V-CV-001',owner:'employee',company:company,title:'客户来访 · 周先生',state:'待到访',created:day(0)+'T09:00:00+08:00',fields:[['访客姓名','周先生'],['到访企业','A座 · 605室'],['到访时间',day(1)+' 14:00'],['来访事由','合同洽谈']]},
      {id:'V-CV-002',owner:'employee',company:company,title:'合作交流 · 吴女士',state:'已离园',created:day(-3)+'T09:00:00+08:00',fields:[['访客姓名','吴女士'],['到访企业','A座 · 605室'],['到访时间',day(-3)+' 10:00'],['来访事由','项目交流']]}
    ].forEach(function(record){add('visitors',record)});
    [
      {id:'MR-CV-001',owner:'employee',company:company,room:'云杉会议室',meta:'C座 3F · 12人 · 中会议室',price:120,date:day(5),times:['14:00–15:00','15:00–16:00'],name:'王晓明',phone:'138****0000',purpose:'季度复盘',status:'已预约',propertyStatus:'approved'},
      {id:'MR-CV-002',owner:'employee',company:company,room:'远山路演厅',meta:'A座 1F · 24人 · 路演厅',price:180,date:day(-6),times:['10:00–11:00'],name:'王晓明',phone:'138****0000',purpose:'产品路演',status:'已预约',propertyStatus:'approved',feePaid:true,feeState:'paid'},
      {id:'MR-CV-003',owner:'admin',company:company,room:'榫卯会议室',meta:'A座 2F · 8人 · 小会议室',price:80,date:day(-9),times:['09:00–10:00'],name:'唐慧丽',phone:'138****6605',purpose:'管理层例会',status:'已预约',propertyStatus:'approved',feeState:'contacted'}
    ].forEach(function(record){add('bookings',record)});
    if(changed){try{var value=JSON.stringify(data);localStorage.setItem(key,value);persisted=value}catch(error){}}
  })();
  // 展示样例不写入本机记录，也不参与预约占用校验。
  var examples={
    bookings:[
      {id:'MR-001',sample:true,room:'榫卯会议室',meta:'A座 2F · 8人 · 小会议室',price:80,date:'2026-09-18',times:['09:00–10:00','10:00–11:00'],name:'王晓明',phone:'138****0000',purpose:'团队例会',status:'待确认'},
      {id:'MR-002',sample:true,room:'云杉会议室',meta:'C座 3F · 12人 · 中会议室',price:120,date:'2026-09-16',times:['14:00–15:00'],name:'王晓明',phone:'138****0000',purpose:'项目讨论',status:'已完成'}
    ],
    visitors:[
      {id:'V-001',sample:true,title:'客户来访 · 张先生',state:'待到访',created:'2026-09-17T09:00:00+08:00',fields:[['访客姓名','张先生'],['到访企业','A座 · 605室'],['到访时间','2026年9月18日 14:00'],['来访事由','商务洽谈']]},
      {id:'V-002',sample:true,title:'合作交流 · 李女士',state:'已离园',created:'2026-09-16T09:00:00+08:00',fields:[['访客姓名','李女士'],['到访企业','B座 · 503室'],['到访时间','2026年9月16日 10:00'],['来访事由','项目交流']]}
    ],
    repairs:[
      {id:'R-001',sample:true,title:'空调制冷异常',state:'处理中',created:'2026-09-17T09:30:00+08:00',fields:[['报修位置','A座 · 605室'],['问题类型','空调设备'],['问题描述','空调制冷效果不佳'],['处理进度','已接单，等待上门检修']]},
      {id:'R-002',sample:true,title:'会议室照明维修',state:'已完成',created:'2026-09-16T10:00:00+08:00',fields:[['报修位置','C座 · 3F会议室'],['问题类型','水电维修'],['问题描述','照明灯闪烁'],['处理进度','灯具已更换，检查正常']]}
    ]
  };
  window.MiniStore={
    data:data,
    displayText:function(record,value){
      if(!record.sample||typeof value!=='string')return value;
      return value.replace(/\s*·\s*示例$/,'').replace(/（演示）/g,'').replace(/^示例[：:]/,'').replace(/^演示用户$/,'用户');
    },
    displayState:function(record){
      return record.state==='本机已保存 · 未发送'?'已保存':this.displayText(record,record.state);
    },
    displayRecords:function(kind){return data[kind].length?data[kind]:(examples[kind]||[])},
    id:function(){return 'R-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)},
    isCurrent:function(){try{return localStorage.getItem(key)===persisted}catch(error){return false}},
    save:function(){
      try{if(!this.isCurrent())return false;var value=JSON.stringify(data);localStorage.setItem(key,value);persisted=value;return true}
      catch(error){return false}
    }
  };
})();
