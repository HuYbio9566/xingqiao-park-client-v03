(function(){
  function emptyState(container){
    var node=document.createElement('p');node.className='muted';node.textContent='暂无符合条件的结果，请调整筛选条件。';node.hidden=true;container.appendChild(node);return node;
  }
  var buildingList=document.querySelector('.building-results');
  if(!buildingList){
    var meetingList=document.querySelector('.meeting-results');
    if(!meetingList)return;
  }
  if(buildingList){
  var buildingCards=Array.from(buildingList.querySelectorAll('.building-card'));
  var buildingEmpty=emptyState(buildingList),spaceFilters=document.querySelectorAll('#spaces select');
  function filterBuildings(){
    var building=spaceFilters[0].value,decoration=spaceFilters[1].value,areaRange=spaceFilters[2].value;
    var cards=buildingCards.map(function(card){
      var spaces=window.__buildingData[card.dataset.buildingDetail].spaces.filter(function(space){
        var areaMatch=space[1].match(/(\d+)㎡/),area=areaMatch?Number(areaMatch[1]):0;
        var inArea=areaRange==='全部面积'||
          (areaRange==='100㎡以下'&&area<100)||
          (areaRange==='100-200'&&area>=100&&area<200)||
          (areaRange==='200-300'&&area>=200&&area<300)||
          (areaRange==='300-500'&&area>=300&&area<500)||
          (areaRange==='500-1000'&&area>=500&&area<1000)||
          (areaRange==='1000㎡以上'&&area>=1000);
        return inArea&&(decoration==='全部装修'||(space[1]+' '+space[2]).includes(decoration));
      });
      card.hidden=(building!=='全部楼宇'&&card.dataset.buildingDetail!==building)||!spaces.length;
      card.style.display=card.hidden?'none':'';
      card.querySelector('.building-card-tags span').textContent=spaces.length+' 个空间';
      return {card:card,price:Math.min.apply(null,spaces.map(function(space){return Number(space[3].slice(1))})),area:Math.max.apply(null,spaces.map(function(space){return Number(space[1].match(/(\d+)㎡/)[1])}))};
    });
    cards.forEach(function(item){buildingList.insertBefore(item.card,buildingEmpty)});
    buildingEmpty.hidden=cards.some(function(item){return !item.card.hidden});
  }
  spaceFilters.forEach(function(select){select.addEventListener('change',filterBuildings)});
  filterBuildings();
  }
  var meetingList=document.querySelector('.meeting-results');
  var meetingCards=Array.from(meetingList.querySelectorAll('.meeting-list-card'));
  var meetingEmpty=emptyState(meetingList),meetingFilters=document.querySelectorAll('#meeting select');
  function filterMeetings(){
    var area=meetingFilters[0].value,count=meetingFilters[1].value,type=meetingFilters[2].value;
    meetingCards.forEach(function(card){
      var meta=card.querySelector('.meta').textContent,capacity=Number(meta.match(/(\d+)人/)[1]);
      var matches=(area.includes('全部')||meta.startsWith(area.charAt(0)))&&
        (count.includes('全部')||(count==='8人以内'?capacity<=8:count==='9–16人'?capacity>=9&&capacity<=16:capacity>=17))&&
        (type.includes('全部')||meta.includes(type));
      card.hidden=!matches;card.style.display=matches?'':'none';
    });
    meetingEmpty.hidden=meetingCards.some(function(card){return !card.hidden});
  }
  meetingFilters.forEach(function(select){select.addEventListener('change',filterMeetings)});
  filterMeetings();
})();
