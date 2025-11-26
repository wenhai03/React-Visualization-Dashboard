const zh_CN = {
  title: 'ERP查询设置',
  team: '团队',
  num_date: '日志查询天数',
  num_data_tooltip: '查询指定天数内数据',
  java_log: '服务日志',
  nginx_log: 'nginx日志',
  host_ip: '服务器',
  host_port: '端口',
  req_host: '主机',
  search_range: '团队权限设置',
  day_tip: '天数设置重复，请到已有天数内勾选相应团队',
  host_ip_tip: '范围使用 - 分割，填写示例 127.0.0.1， 127.0.0.2-10',
  host_port_tip: '范围使用 - 分割，填写示例 8000， 8001-8100',
  user_tags: '用户标签设置',
  users: '用户',
  tag: '过滤标签',
  tag_tip: `用户在查询日志时，会自动将标签作为过滤条件；如：
若标签内容为"股份"，查询结果只会返回包含"【股份】"的日志，
即每个过滤标签都会自动用【】包起来作为条件。
允许定义多个过滤标签，输入时用回车分开。
多个过滤标签之间是"或"的关系。`,
};
export default zh_CN;
