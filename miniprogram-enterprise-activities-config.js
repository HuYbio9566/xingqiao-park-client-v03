// Static preview configuration for park activities; replace with backend settings when its API is available.
// mode: 'signup' (报名参与) or 'onsite' (现场参与).
// deadline: signup -> registration deadline; onsite -> activity end time (Asia/Shanghai).
// fields: registration fields; name and phone are always required.
window.enterpriseActivitySettings = {
  '中小企业数字化转型分享会': { mode: 'signup', deadline: '2026-10-26 18:00', fields: ['attendees', 'companyName'], maxAttendees: 5 },
  '科创企业投融资对接会': { mode: 'onsite', deadline: '2026-10-25 17:00', location: 'A座 2F 多功能厅' },
  '企业政策申报交流日': { mode: 'signup', deadline: '2026-10-21 18:00', fields: ['companyName', 'position', 'note'] },
  '园区企业合作交流沙龙': { mode: 'signup', deadline: '2026-10-19 18:00', fields: ['attendees', 'companyName', 'note'], maxAttendees: 3 },
  '知识产权保护专题分享': { mode: 'onsite', deadline: '2026-10-18 17:00', location: 'B座 1F 路演厅' },
  '高新人才服务交流会': { mode: 'signup', deadline: '2026-10-15 12:00', fields: ['attendees', 'position'], maxAttendees: 2 },
  '绿色办公与节能实践工作坊': { mode: 'onsite', deadline: '2026-10-14 17:00', location: 'A座 1F 共享空间' },
  '企业财税规范交流课堂': { mode: 'signup', deadline: '2026-10-10 18:00', fields: ['attendees', 'companyName'] },
  '创新项目展示与经验交流': { mode: 'onsite', deadline: '2026-10-09 17:00', location: 'B座 1F 路演厅' },
  '园区安全与应急协作交流': { mode: 'onsite', deadline: '2026-10-06 17:00', location: '园区中心广场' }
};
