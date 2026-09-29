(function(){
  var key='starbridge-demo-v1';
  var data={bookings:[],visitors:[],repairs:[],consultations:[],feedback:[]};
  try{
    var saved=JSON.parse(localStorage.getItem(key)||'null');
    if(saved)Object.keys(data).forEach(function(name){if(Array.isArray(saved[name]))data[name]=saved[name]});
  }catch(error){}
  // 展示样例不写入本机记录，也不参与预约占用校验。
  var examples={
    bookings:[
      {id:'SAMPLE-MR-001',sample:true,room:'榫卯会议室',meta:'A座 2F · 8人 · 小会议室',price:80,date:'2026-09-18',times:['09:00–10:00','10:00–11:00'],name:'演示用户',phone:'138****0000',purpose:'团队例会',status:'待确认 · 示例'},
      {id:'SAMPLE-MR-002',sample:true,room:'云杉会议室',meta:'C座 3F · 12人 · 中会议室',price:120,date:'2026-09-16',times:['14:00–15:00'],name:'演示用户',phone:'138****0000',purpose:'项目讨论',status:'已完成 · 示例'}
    ],
    visitors:[
      {id:'SAMPLE-V-001',sample:true,title:'客户来访 · 张先生',state:'待到访 · 示例',created:'2026-09-17T09:00:00+08:00',fields:[['访客姓名','张先生（演示）'],['到访企业','A座 · 605室'],['到访时间','2026年9月18日 14:00'],['来访事由','商务洽谈']]},
      {id:'SAMPLE-V-002',sample:true,title:'合作交流 · 李女士',state:'已离园 · 示例',created:'2026-09-16T09:00:00+08:00',fields:[['访客姓名','李女士（演示）'],['到访企业','B座 · 503室'],['到访时间','2026年9月16日 10:00'],['来访事由','项目交流']]}
    ],
    repairs:[
      {id:'SAMPLE-R-001',sample:true,title:'空调制冷异常',state:'处理中 · 示例',created:'2026-09-17T09:30:00+08:00',fields:[['报修位置','A座 · 605室'],['问题类型','空调设备'],['问题描述','空调制冷效果不佳'],['处理进度','示例：已接单，等待上门检修']]},
      {id:'SAMPLE-R-002',sample:true,title:'会议室照明维修',state:'已完成 · 示例',created:'2026-09-16T10:00:00+08:00',fields:[['报修位置','C座 · 3F会议室'],['问题类型','水电维修'],['问题描述','照明灯闪烁'],['处理进度','示例：灯具已更换，检查正常']]}
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
    id:function(){return 'DEMO-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)},
    save:function(){
      try{localStorage.setItem(key,JSON.stringify(data));return true}
      catch(error){return false}
    }
  };
})();
