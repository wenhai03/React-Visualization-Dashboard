import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { SearchOutlined } from '@ant-design/icons';
import { Table, Button, Row, Col, Input } from 'antd';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import { getCndInternetLog } from '@/services/custom';
import { flattenHit, proxyToRecord } from '@/pages/logs/utils';
import '../../locale';

const NetworkLog: React.FC = () => {
  const [query, setQuery] = useState('');
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const { t } = useTranslation('custom');
  const [loading, setLoading] = useState(false);
  const [networkLog, setNetworkLog] = useState<{ name: string; value: string }[]>([]);
  const [sangForLog, setSangForLog] = useState<{ name: string; value: string }[]>([]);
  const [logDevice360, set360DeviceLog] = useState<{ name: string; value: string }[]>([]);

  const cn_names = {
    // 安全事件日志
    secevent: {
      'log_type': '安全事件日志',
      'log_time': '日志时间',
      'threat_level': '确定性等级',
      'suspect_level': '威胁等级',
      'ip': '资产IP',
      'asset_id': '资产id',
      'src_ip': '源IP/控制者IP/攻击者IP',
      'dst_ip': '目标IP',
      'event_evidence': '事件举证',
      'event_content': '事件描述',
      'solution': '处置建议/漏洞修补方案',
      'eventKey': '用于查找日志',
      'branchId': '分支id',
      'principle': '原理',
      'tag': '标签',
      'classify1_id': ' 资产一级分类',
      'classify_id': '资产分类',
      'recordDate': '事件产生的日期(非时间戳)',
      'detectEngine': '检测 引擎的名字',
      'ruleId': '规则id(用来找到对应举证信息格式)',
      'firstTime': '安全事件产生的时间戳',
      'msg_type': '事件大类',
      'msg_sub_type': '事件小类',
      'sub_attack_type': '攻击子类',
      'module_name': '事件大类名称',
      'sub_attack_name': '事件小类名称',
      'sub_attack_type_name': '攻击子类名称 ',
      'stage': '攻击阶段',
      'hostRisk': '风险主机(ip+branchName)',
      'dealStatus': '处理状态',
      'hostName': '用户名/主机名',
      'eventType': '是否为热点事件',
      'branch_name': '分支名称',
      'emergency': '紧急程度',
      'count': '攻击次数',
      'role': '攻击角色',
      'brief': '告警简短描述',
      'attack_state': '攻击结果',
    },
    
    // 安全告警日志
    alarm: {
      'log_type': '安全告警日志',
      'attack_classify_id': '攻击者资产分类',
      'attack_classify1_id_name': '攻击者资产分类',
      'attack_state': '攻击结果',
      'dev_id': '设备id',
      'dev_name': '设备名称',
      'module_type_name': '事件大类',
      'attack_type_name': '事件小类',
      'sub_attack_type_name': '攻击子类',
      'status_code': '响应状态码',
      'event_desc': '事件描述',
      'updated_at': '记录更新时间',
      'brief': '告警描述',
      'suffer_branch_id': '受害者资产组ID',
      'suffer_country': '受害者国家',
      'alert_id': '告警id',
      'reliability': '威胁等级',
      'relation': '关系',
      'is_white': '是否白名单',
      'last_time': '最后发生该告警时间',
      'x_forwarded_for': '代理IPs',
      'module_type': '模块大类',
      'attack_type': '事件类型小类',
      'sub_attack_type': '事件类型子类',
      'suggest': '处置建议',
      'suffer_ip': '受害者IP',
      'tags': '标签',
      'damage': '危害',
      'multi_deal_status': '处置状态最终状态',
      'event_evidence': '告警举证信息',
      'suffer_classify_id': '受害者资产设备全类型Id',
      'suffer_classify1_id_name': '受害者资产设备类型',
      'mining_stage': '挖矿阶段',
      'attack_direction': '访问方向',
      'log_ids': '安全日志在ES的索引ID',
      'hash_id': 'hash 归并字段',
      'engine': '安全事件引擎',
      'first_time': '首次发生该告警时间',
      'attack_port': '攻击者端口',
      'emergency': '紧急程度:',
      'attack_province': '攻击省份',
      'suffer_branch_name': '受害者资产名称',
      'is_read': '是否已读',
      'invasion_stage': '攻击阶段',
      'attack_ip': '攻击者ip',
      'suffer_port': '受害者端口',
      'principle': '原理',
      'ioc': 'IOC列表',
      'attack_branch_id': '攻击者资产组id',
      'suffer_classify1_id': '受害者资产设备类型Id',
      'suffer_asset_id': '受害者资产id',
      'count': '告警发生次数',
      'attack_classify1_id': '攻击者资产设备类型Id',
      'analyze_suggest': '排查建议',
      'attack_asset_id': '攻击者资产id',
      'asset_direction': '资产方向',
      'created_at': '记录创建时间',
      'attack_country': '攻击国家',
      'misreport': '告警消减',
      'suffer_province': '受害者省份',
      'url': '统一资源定位符',
      'record_date': '记录日期',
      'net_action': '动作',
      'attack_branch_name': '攻击者资产组名称',
      'hole_ids': '命中hole_id列表',
      'linkage_status': '联动状态'
    }
  };

  const log_360_cn_names = {
    // 主机查杀日志
    '360exthost_360sdmgr_virus_log': {
      'id': '主键',
      'm2': '44位m2',
      'plat_id': '平台类型',
      'is_xc': '是否是信创标识',
      'virus_id': '病毒ID(客户端生成)',
      'file_path': '原始路径',
      'virus_name': '病毒名',
      'virus_type': '病毒类型',
      'md5': '病毒 md5',
      'handle_result': '处理结果',
      'handle_result_detail': '处理结果详情',
      'found_time': '发现时间',
      'handle_time': '处理时间',
      'scan_id': '扫描ID(代表一次扫描)',
      'scan_mode': '扫描模式',
      'handle_mode': '处理模式:',
      'trigger_type': '触发类型：',
      'hit_layer': '大于0表查杀命中的样本在压缩包中层数',
      'ltime': '数据进入队列时间',
      'mtime': '修改时间',
      'ctime': '创建时间',
      'inactivity': '不活跃用户',
      'file_create_time': '文件生成时间',
      'file_modify_time': '文件更新时间',
      'content_type': '类型',
      'computername': '计算机名称',
      'asset_username': '使用人',
      'clientip': '客户端ip',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'log_type': '主机查杀日志',
    },

    // 实时防御日志
    'active_defense_log': {
      'id': '主键',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'm2': '44位m2',
      'clientip': '客户端ip',
      'computername': '计算机名',
      'asset_username': '使用人',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'intercept_time': '拦截时间',
      'hips_type': '截类型',
      'src_process': '来源进程',
      'src_process_md5': '来源进程的md5',
      'dst_process': '目标进程',
      'risk_opt': '风险操作',
      'hips_result_type': '拦截结果',
      'hips_desc': '拦截描述',
      'risk_file': '风险文件路径',
      'risk_ip': '风险ip',
      'risk_url': '风险url',
      'record_tm': '添加信任或阻止的时间',
      'lan_type': '局域网拦截类型',
      'attack_ip': '局域网攻击源IP',
      'attack_mac': '局域网攻击源MAC',
      'attack_machine': '局域网攻击源机器名',
      'attack_process': '局域网攻击程序',
      'ctime': '添加时间',
      'log_type': '实时防御日志',
    },

    // 隔离区操作日志
    'isolation_log': {
      'id': '主键',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'm2': '44位m2',
      'clientip': '客户端ip',
      'computername': '计算机名',
      'asset_username': '使用人',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'group_id': '分组id',
      'sysiplist': '内网IP',
      'check_time': '隔离时间',
      'file_path': '文件路径',
      'file_size': '文件大小',
      'file_md5': '隔离文件md5',
      'status': '隔离状态：',
      'virus_name': '病毒名称',
      'virus_type': '病毒类型',
      'ctime': '数据创建时间',
      'mtime': '数据修改时间',
      'log_type': '隔离区操作日志',
    },

    // 系统漏洞日志
    '360leakfix_system_log': {
      'id': '主键',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'm2': '44位m2',
      'clientip': '客户端ip',
      'computername': '计算机名',
      'asset_username': '使用人',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'kbid': 'KBID',
      'name_md5': '漏洞上报中name&kbid的MD5',
      'name': '补丁名称',
      'severitylevel': '漏洞等级',
      'severitylevel_detail': '',
      'summary': '漏洞描述',
      'type': '类型',
      'updateid': '更新唯一ID（GUID）',
      'publishdate': '发布时间',
      'mtime': '数据更新时间',
      'ctime': '数据创建时间',
      'ignoredate': '忽略日期',
      'status': '操作状态 ',
      'status_code': '状态编码',
      'repair_suggestions': '修复建议',
      'ltime': '消息入队列时间',
      'deleted': '删除标识',
      'installdate': '安装日期',
      'inactivity': '不活跃用户',
      'vendors': '',
      'log_type': '系统漏洞日志',
    },

    // 外设控制日志
    'device_log': {
      'id': '主键',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'm2': '44位m2',
      'computername': '计算机名',
      'asset_username': '使用人',
      'clientip': '客户端ip',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'ip': 'ip',
      'mac': '网卡',
      'sn': '设备编号',
      'pid': '客户端上传：产品ID',
      'vid': '客户端上传数据',
      'tag_id': '分类ID',
      'name': '设备名称',
      'handle_type': '分类形式，0:未处理，1:手动，2：自动',
      'kind': '设备类型，鼠标，键盘，PC',
      'guid': '类GUID',
      'company': '制造商',
      'product': '产品',
      'path': '设备路径',
      'rule': '命中策略规则（客户端上报）',
      'setting_rule': '命中策略规则（从rule字段转换而来）',
      'result': '处理结果。1已拦截，2已接入，3已拔出',
      'data_log_type': '日志类型。1接入日志，2违规日志',
      'event_time': '事件时间',
      'mtime': '最近修改时间',
      'ctime': '记录创建时间',
      'log_type': '外设控制日志',
    },

    // 违规外联审计日志
    '360exthost_netcontrol_illegal_net_log': {
      'id': '主键',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'm2': '44位m2',
      'clientip': '客户端ip',
      'computername': '计算机名称',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'event_id': '事件ID',
      'public_ip': '外联ip',
      'illegal_type': '违规信息',
      'mac_address': 'mac地址',
      'local_ip': '本机地址',
      'sysiplist': '内网IP',
      'deal_type': '下发命令的处理类型 nothing 不处理，isolate 隔离',
      'server_ip': '数据服务器地址',
      'ltime': '消息入队列时间',
      'mtime': '数据更新时间',
      'ctime': '数据创建时间',
      'inactivity': '不活跃用户',
      'asset_departmentname': '资产所属部门',
      'asset_username': '资产使用人',
      'group_name': '组名',
      'center_id': '节点id 代表本级',
      'report_status': '0 未上报 1 已上报',
      'reported_to': '上报到的节点，用于父节点变更时对比',
      'reported_data_ide': '上报的日志唯一标识',
      'duration': '持续时间',
      'duration_num': '持续出现的次数',
      'log_type': '违规外联审计日志',
    },

    // 远程协助日志
    'desktop_ctrl_record': {
      'id': '主键',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'm2': '44位m2',
      'clientip': '客户端ip',
      'computername': '计算机名',
      'asset_username': '使用人',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'operator': '操作账号',
      'remote_status': '状态 0进行中 1成功 2失败',
      'remote_date': '远程日期',
      'remote_guid': '远程guid',
      'fail_reason': '失败原因',
      'end_time': '结束时间',
      'mtime': '数据更新时间',
      'ctime': '数据创建时间',
      'log_type': '远程协助日志',
    },

    // 移动存储控制日志
    'removable_disk_audit_log': {
      'id': '主键',
      'clientip': '客户端ip',
      'computername': '计算机名',
      'asset_username': '使用人',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'pid': '设备ID',
      'vid': '厂商ID',
      'sn': '序列号',
      'op_time': '操作时间',
      'event_id': '操作行为ID',
      'detail': '详细描述',
      'report_m2': '上报的m2',
      'mtime': '修改时间',
      'ctime': '创建时间',
      'log_type': '移动存储控制日志',
    },

    // 流量日志net_flow_log
    'net_flow_log': {
      'id': '主键',
      'm2': '44位m2',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'clientip': '客户端ip',
      'computername': '计算机名',
      'asset_username': '使用人',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'report_time': '上报时间',
      'total_flow': '总流量（单位：B）',
      'upstream': '上行总流量（单位：B）',
      'downstream': '下行总流量（单位：B）',
      'top_list': 'topn进程列表',
      'mtime': '修改时间',
      'ctime': '创建时间',
      'log_type': '流量日志',
    },

    // 进程防护日志360exthost_processxp_failed_red_list
    '360exthost_processxp_failed_red_list': {
      'id': '主键',
      'm2': '44位m2',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'clientip': '客户端ip',
      'computername': '计算机名',
      'asset_username': '使用人',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'path': '启动失败的进程，逗号分隔',
      'ltime': '消息入队列时间',
      'mtime': '数据修改时间',
      'ctime': '数据创建时间',
      'proc_type': '进程类型 ',
      'ip': 'ip',
      'result': '处理结果',
      'reason': '原因',
      'event_type': '事件类型',
      'control': '控制方式',
      'parent_process_path': '启动进程',
      'log_type': '进程防护日志',
    },

    // 威胁自查日志threatensearch_log
    'threatensearch_log': {
      'id': '主键',
      'm2': '44位m2',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'clientip': '客户端ip',
      'computername': '计算机名',
      'asset_username': '使用人',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'md5': 'md5',
      'file_path': '路径',
      'vender': '厂商',
      'version': '版本',
      'find_time': '发现时间',
      'file_modify_time': '文件创建时间',
      'file_create_time': '文件修改时间',
      'mtime': '修改时间',
      'ctime': '创建时间',
      'log_type': '威胁自查日志',
    },

    // 数据操作审计日志file_audit
    'file_audit': {
      'id': '主键',
      'm2': '44位m2',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'computername': '计算机名',
      'asset_username': '使用人',
      'clientip': '客户端ip',
      'client_group_id': '终端分组id',
      'client_group_name': '终端所属分组',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'send_time': '发生时间',
      'cmp_loginuser': '登录账号',
      'file_audit_type': '文件位置',
      'filename': '文件名',
      'filetype': '文件类型',
      'filememory': '文件大小',
      'file_md5': '文件md5',
      'fileoperate': '文件操作',
      'processname': '执行进程名',
      'processname_path': '执行进程名所在路径',
      'fileincpname': '文件所在计算机名',
      'fileinipaddr': '文件所在计算机IP',
      'sourefile_storage_path': '源储存位置',
      'filepath': '源文件路径',
      'file_storage_path': '目标储存位置',
      'filepath_target': '目标文件路径',
      'devicename': '设备名称',
      'isbak': '是否备份',
      'bakfilename': '备份文件名',
      'ctime': '创建时间',
      'log_type': '数据操作审计日志',
    },

    // 数据打印审计日志print_audit
    'print_audit': {
      'id': '主键',
      'm2': '44位m2',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'clientip': '客户端ip',
      'computername': '计算机名',
      'asset_username': '使用人',
      'client_group_id': '客户端分组id',
      'client_group_name': '客户端分组名称',
      'mac': '客户端mac地址',
      'ctime': '创建时间',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'send_time': '发生时间',
      'plant_id': '平台类型',
      'cmp_loginuser': '登录账号',
      'print_audit_process': '打印进程名',
      'print_audit_filename': '文件名称',
      'print_audit_md5': '文件MD5',
      'print_audit_filepath': '文件路径',
      'print_audit_filesize': '文件大小（KB）',
      'print_copy_num': '打印份数',
      'print_page_num': '打印页数',
      'print_paper_type': '纸张类型',
      'print_audit_isstop': '是否阻止打印',
      'print_result': '打印结果',
      'printer_name': '打印机名称',
      'printer_ip': '打印机IP',
      'printer_type': '打印机类型',
      'printer_number': '打印机序列号',
      'log_type': '数据打印审计日志',
    },

    // 网络行为审计日志netconnect_audit
    'netconnect_audit': {
      'id': '主键',
      'm2': '44位m2',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'clientip': '客户端ip',
      'client_group_id': '分组id',
      'client_group_name': '分组名称',
      'computername': '计算机名',
      'asset_username': '使用人',
      'plant_id': '平台类型',
      'mac': 'mac地址',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'send_time': '开始时间',
      'send_time_end': '结束时间',
      'cmp_loginuser': '登录账号',
      'process_name': '进程名',
      'process_name_path': '进程路径',
      'protocol': '协议',
      'source_ip': '源IP地址',
      'source_port': '源端口',
      'object_ip': '目标IP',
      'object_port': '目标端口',
      'send_byte': '发送（字节）',
      'incept_byte': '接收（字节）',
      'count_byte': '总数（字节）',
      'log_type': '网络行为审计日志',
    },

    // 开关机审计opendown_audit
    'opendown_audit': {
      'id': '主键',
      'm2': '44位m2',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'computername': '计算机名',
      'asset_username': '使用人',
      'clientip': '客户端ip',
      'client_group_id': '客户端分组id',
      'client_group_name': '客户端分组名称',
      'mac': '客户端mac地址',
      'plant_id': '平台类型',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'send_time': '发生时间',
      'ctime': '创建时间',
      'cmp_loginuser': '登录账号',
      'cmp_action': '操作类型',
      'log_type': '开关机审计',
    },

    // 账户使用审计日志systemuser_audit
    'systemuser_audit': {
      'id': '主键',
      'm2': '44位m2',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'clientip': '客户端ip',
      'client_group_id': '客户端分组id',
      'client_group_name': '客户端分组名称',
      'computername': '计算机名',
      'asset_username': '使用人',
      'mac': '客户端mac地址',
      'plant_id': '平台类型',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'send_time': '发生时间',
      'ctime': '创建时间',
      'cmp_loginuser': '登录账号',
      'audit_account_opt': '操作类型',
      'audit_account_remark': '描述',
      'log_type': '账户使用审计日志',
    },

    // 外设使用审计日志device_audit
    'device_audit': {
      'id': '主键',
      'm2': '44位m2',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'clientip': '客户端ip',
      'computername': '计算机名',
      'asset_username': '使用人',
      'client_group_id': '客户端分组id',
      'client_group_name': '客户端分组名称',
      'mac': '客户端mac地址',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'send_time': '发生时间',
      'cmp_loginuser': '登录账号',
      'operation_type': '操作类型',
      'device_type': '设备类型',
      'typename': '设备名称',
      'devicemodel': '设备型号',
      'vid_value': 'VID',
      'pid_value': 'PID',
      'manufacturer': '制造商',
      'device_id': '设备编号',
      'log_type': '外设使用审计日志',
    },

    // 终端升级日志360exthost_client_update_log
    '360exthost_client_update_log': {
      'id': '主键',
      'm2': '44位m2',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'clientip': '客户端ip',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'computername': '计算机名',
      'asset_username': '使用人',
      'group_id': '分组id',
      'group_name': '组名',
      'sysiplist': 'ip',
      'update_type': '升级类型 1代表主程序 2病毒库 4补丁库',
      'version': '版本',
      'old_version': '旧版本',
      'update_result': '升级结果',
      'update_detail': '升级详情',
      'update_time': '升级时间',
      'ltime': '消息入队列时间',
      'mtime': '记录修改时间',
      'ctime': '记录创建时间',
      'log_type': '终端升级日志',
    },

    // 数据外发审计日志gtmaphenixdb.dlp_outfile_audit_log
    'gtmaphenixdb.dlp_outfile_audit_log': {
      'id': '主键',
      'm2': '44位m2',
      'clientip': '客户端ip',
      'computername': '计算机名',
      'asset_username': '使用人',
      'username': '用户名',
      'client_name': '终端名称',
      'group_id': '组id',
      'platform_type': '平台类型',
      'download_string': '下载文件详情',
      'regular_name': '匹配规则组合',
      'download_flag': '查看文件标识',
      'opartion_details': '详情',
      'secret_name': '密级',
      'opartion_detailsshow': '点开详情',
      'download_file': '下载文件路径',
      'file_path': '文件路径',
      'ip': 'ip地址',
      'platform_id': '平台id',
      'deal_type': '处理方式',
      'audit_filename': '文件名称',
      'send_time': '检出时间',
      'scan_time': '检出查询时间',
      'group_name': '组名称',
      'operate_result': '操作结果',
      'cmp_loginuser': '登录账号',
      'create_time': '创建时间',
      'log_type': '数据外发审计日志',
    },

    // 敏感信息审计日志gtmaphenixdb.dlp_scan_audit_log
    'gtmaphenixdb.dlp_scan_audit_log': {
      'id': '主键',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'file_type': '文件类型',
      'scan_detail_show': '详情-详情',
      'client_name': '终端名称',
      'group_id': '组id',
      'ip': 'ip地址',
      'task_name': '任务名称',
      'scan_detail': '详情',
      'scan_time': '检出时间',
      'group_name': '组名称',
      'file_name': '文件名称',
      'file_path': '文件路径',
      'create_time': '创建时间',
      'platform_type': '平台类型',
      'taskid': '任务id',
      'log_type': '敏感信息审计日志',
    },

    // 入网审批记录gtmaphenixdb.access_visitor_approval_log
    'gtmaphenixdb.access_visitor_approval_log': {
      'id': '主键',
      'approve_status': '审核状态： 待审批0、通过1、拒绝2',
      'interviewee_name': '受访人姓名',
      'interviewee_phone_number': '受访人电话',
      'visitor_phone_number': '访客电话号',
      'visitor_name': '用户名',
      'name': '访客姓名',
      'start_time': '开始时间',
      'end_time': '结束时间',
      'approve_time': '审核时间',
      'authentication': '审批用户',
      'log_type': '入网审批记录',
    },

    // 访客审批日志gtmaphenixdb.access_radius_approve_log
    'gtmaphenixdb.access_radius_approve_log': {
      'ra_id': '主键',
      'action_user': '操作人',
      'action_time': '操作时间',
      'switch_ssid': '交换设备端口/SSID',
      'account_group_name': '接入用户组名',
      'account_group': '接入用户组',
      'account_id': '接入用户',
      'switch_ip': '交换设备IP',
      'action_status': '操作结果 1禁止 2放行',
      'action_content': '操作内容 1处理审批 2变更入网状态',
      'apply_mac': 'MAC地址',
      'log_type': '访客审批日志',
    },

    // DHCP 准入日志gtmaphenixdb.access_dhcp_audit
    'gtmaphenixdb.access_dhcp_audit': {
      'id': '主键',
      'host_name': '计算机名',
      'ip_address': '数字型ip',
      'alarm_time': '审计时间',
      'operate_type': '操作类型',
      'subnet_address': '子网地址',
      'server_name': '服务器名称',
      'subnet_mask': '子网掩码',
      'server_id': '服务器ID',
      'mac_address': '终端mac地址',
      'internet_type': '网络类型',
      'log_type': 'DHCP 准入日志',
    },

    // 无客户端入网日志gtmaphenixdb.access_visitor_access_log
    'gtmaphenixdb.access_visitor_access_log': {
      'reason': '原因',
      'access_device_port': '接入设备端口',
      'access_ip': '入网ip',
      'access_mac': '入网mac',
      'access_result': '入网结果',
      'user_name': '用户名',
      'access_device_ip': '接入设备ip',
      'phone': '手机号',
      'manage_module': '准入管理模块',
      'name': '姓名',
      'role_name': '角色',
      'access_time': '入网时间',
      'log_type': '无客户端入网日志',
    },

    // 报警审计日志gtmaphenixdb.access_alarm_8021_log
    'gtmaphenixdb.access_alarm_8021_log': {
      'fail_status': '失败原因',
      'switch_ip': '交换设备IP',
      'alarm_time': '报警时间',
      'log_id': '主键（自增1）',
      'mac': 'MAC地址',
      'switch_port': '交换设备端口/SSID',
      'username': '用户名',
      'log_type': '报警审计日志',
    },

    // 入网审计日志gtmaphenixdb.access_audit_8021_log
    'gtmaphenixdb.access_audit_8021_log': {
      'switch_ip': '交换设备IP',
      'audit_time': '审计时间',
      'log_id': '主键（自增1）',
      'mac': 'MAC地址',
      'switch_port': '交换设备端口/SSID',
      'success_status': '成功原因',
      'username': '用户名',
      'log_type': '入网审计日志',
    },

    // NAC准入报警日志gtmaphenixdb.access_nac_alarm_log
    'gtmaphenixdb.access_nac_alarm_log': {
      'gnac_name': '网关设备名称',
      'mac_visit': '数据包目的mac地址',
      'alarm_time': '报警时间',
      'dispose_mode': '处理方式',
      'log_id': '主键（自增1）',
      'illegal_flag': '违规类型',
      'ipaddr': '源IP地址',
      'ip_visit': '访问IP',
      'macaddr': '数据包源MAC地址',
      'log_type': 'NAC准入报警日志',
    },

    // 智能隔离日志offline_protection_log
    'offline_protection_log': {
      'id': '主键',
      'm2': '44位m2',
      'plat_id': '平台类型',
      'is_xc': '是否是信创标识',
      'clientip': '客户端ip',
      'computername': '计算机名',
      'asset_username': '使用人',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'offline_time': '终端脱网时间',
      'mtime': '数据更新时间',
      'ctime': '数据创建时间',
      'log_type': '智能隔离日志',
    },

    // 系统修复日志360exthost_systemrepair
    '360exthost_systemrepair': {
      'id': '主键',
      'm2': '44位m2',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'clientip': '客户端ip',
      'computername': '计算机名',
      'asset_username': '使用人',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'item_name': '项目名称',
      'item_description': '项目描述',
      'item_type': '项目类别',
      'suggest': '操作建议',
      'system_repair_status': '当前状态修复叫 remove 信任叫 ignore 移除信任叫noignore',
      'ltime': '记录入队列时间',
      'mtime': '记录修改时间',
      'ctime': '记录创建时间',
      'client_item_id': '客户端ItemId',
      'log_type': '系统修复日志',
    },

    // win7安全防护(热补丁)日志360edr_hotpatch_log
    '360edr_hotpatch_log': {
      'id': '主键',
      'is_xc': '是否是信创标识',
      'plat_id': '平台类型',
      'm2': '44位m2',
      'clientip': '客户端ip',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'patchid': '补丁编号',
      'archtype': '系统架构类型',
      'status': '处理结果',
      'summary': '补丁描述',
      'mtime': '更新时间',
      'ctime': '记录创建时间',
      'ltime': '服务端消费打点日志的时间',
      'deleted': '/',
      'inactivity': '不活跃用户',
      'fileversion': '目标文件版本',
      'relatefileversion': '相关文件版本',
      'computername': '计算机名称',
      'asset_username': '使用人',
      'log_type': 'win7安全防护(热补丁)日志',
    },

    // 漏洞免疫日志360edr_hotpatch_intercept_log
    '360edr_hotpatch_intercept_log': {
      'id': '主键',
      'm2': '终端唯一值',
      'process_id': '进程 id',
      'process_name': '进程名称',
      'process_path': '进程路径',
      'patchod': '热补丁 id',
      'cveid': 'cveid',
      'handle_result': '操作类型',
      'mtime': '更新时间',
      'ctime': '创建时间',
      'computername': '主机名',
      'clientip': '客户端通讯ip',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'log_type': '漏洞免疫日志',
    },

    // 违规网络控制审计360exthost_device_violation_log
    '360exthost_device_violation_log': {
      'id': '主键',
      'm2': 'm2',
      'event_type': '违规类型',
      'deal_type': '下发命令的处理类型',
      'mac': 'mac 地址',
      'local_ip': '本机 ip',
      'os_type': '系统类型',
      'group_id': '分组 id',
      'plat_id': '平台 id',
      'description': '备注',
      'ltime': '服务端消费打点日志的时间',
      'ctime': '创建时间',
      'computername': '主机名',
      'clientip': '客户端通讯ip',
      'username': '用户名',
      'sysmaclist': 'mac地址列表',
      'log_type': '违规网络控制审计',
    },
  }

  const decodeUnicode = (str) => {
    return str.replace(/\\u([\dA-F]{4})/gi, 
      (match, grp) => String.fromCharCode(parseInt(grp, 16)));
  };

  useEffect(() => {
    if (query) {
      setLoading(true);
      getCndInternetLog({ query: query as string })
        .then((res) => {
          setLoading(false);
          const dat = _.get(res, 'dat.network.hits.hits');
          if (dat?.length) {
            const data = { ...dat[0], fields: proxyToRecord(flattenHit(dat[0])) };
            let tableData: { name: string; value: string }[] = [];
            Object.entries(data.fields).forEach(([key, value]: [string, string]) => {
              if (key !== 'host') {
                tableData.push({
                  name: key,
                  value: key === '@timestamp' ? moment(value!).format('YYYY-MM-DD HH:mm:ss') : value,
                });
              }
            });
            tableData.sort((a, b) => a.name.localeCompare(b.name));
            setNetworkLog(tableData);
          } else {
            setNetworkLog([]);
          }

          const sangFor = _.get(res, 'dat.sang_for.hits.hits');
          if (sangFor?.length) {
            const data = { ...sangFor[0], fields: proxyToRecord(flattenHit(sangFor[0])) };
            const logType = data.fields['log_type'] || 'alarm';
            let tableData: { name: string; value: string, cn_name: string }[] = [];
            // 选择对应映射表
            const currentCnNameMap = cn_names[logType] || cn_names.alarm;
            
            Object.entries(data.fields).forEach(([key, value]: [string, string]) => {
              if (key !== 'host') {
                tableData.push({
                  name: key,
                  value: key === '@timestamp' ? moment(value!).format('YYYY-MM-DD HH:mm:ss') : value,
                  cn_name: currentCnNameMap[key] || key,
                });
              }
            });
            tableData.sort((a, b) => a.name.localeCompare(b.name));
            setSangForLog(tableData);
          } else {
            setSangForLog([]);
          }

          const log360 = _.get(res, 'dat.log_360.hits.hits');
          if (log360?.length) {
            const data = { ...log360[0], fields: proxyToRecord(flattenHit(log360[0])) };
            const logType = data.fields['log_type'] || 'alarm';
            let tableData: { name: string; value: string, cn_name: string }[] = [];
            // 选择对应映射表
            const currentCnNameMap = log_360_cn_names[logType] || {};
            
            Object.entries(data.fields).forEach(([key, value]: [string, string]) => {
              if (key !== 'host') {
                tableData.push({
                  name: key,
                  value: key === '@timestamp' ? moment(value!).format('YYYY-MM-DD HH:mm:ss') : value,
                  cn_name: currentCnNameMap[key] || key,
                });
              }
            });
            tableData.sort((a, b) => a.name.localeCompare(b.name));
            set360DeviceLog(tableData);
          } else {
            set360DeviceLog([]);
          }
        })
        .catch((err) => setLoading(false));
    }
  }, [refreshFlag]);

  return (
    <div>
      <div style={{ padding: '10px' }}>
        <Row gutter={8}>
          <Col flex='auto'>
            <Input
              value={query}
              style={{ width: '100%' }}
              prefix={<SearchOutlined />}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              allowClear
              placeholder={t('cnd.network_log.input_placeholder')}
              onPressEnter={(e) => {
                setRefreshFlag(_.uniqueId('refreshFlag_'));
              }}
            />
          </Col>
          <Col flex='55px'>
            <Button
              type='primary'
              disabled={query === ''}
              onClick={() => {
                setRefreshFlag(_.uniqueId('refreshFlag_'));
              }}
            >
              {t('common:btn.execute')}
            </Button>
          </Col>
        </Row>
        <Table
          size='small'
          columns={[
            {
              title: 'Field',
              dataIndex: 'name',
              width: '200px',
            },
            {
              title: 'Value',
              dataIndex: 'value',
              render: (text) => {
                if (Array.isArray(text)) {
                  text = _.escape(JSON.stringify(text));
                } 

                const decodedText = typeof text === 'string' 
                ? decodeUnicode(text) 
                : text;

                return (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(decodedText),
                    }}
                  />
                );
              },
            },
          ]}
          loading={loading}
          dataSource={networkLog}
          scroll={{ y: 'calc(100vh - 135px)' }}
          pagination={false}
          title={() => <div style={{ 
              textAlign: 'left',
              color: 'black',
              fontWeight: 'bold',
              fontSize: '12px'
            }}>
              {t('cnd.network_log.network_log')}
            </div>
          }
        />

        <Table
          size='small'
          columns={[
            {
              title: 'Field',
              dataIndex: 'cn_name',
              width: '200px',
            },
            {
              title: 'Value',
              dataIndex: 'value',
              render: (text) => {
                if (Array.isArray(text)) {
                  text = _.escape(JSON.stringify(text));
                } 

                const decodedText = typeof text === 'string' 
                ? decodeUnicode(text) 
                : text;

                return (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(decodedText),
                    }}
                  />
                );
              },
            },
          ]}
          loading={loading}
          dataSource={sangForLog}
          scroll={{ y: 'calc(100vh - 135px)' }}
          pagination={false}
          title={() => <div style={{ 
              textAlign: 'left',
              color: 'black',
              fontWeight: 'bold',
              fontSize: '12px'
            }}>
              {t('cnd.network_log.sang_for_log')}
            </div>
          }
        />

        <Table
          size='small'
          columns={[
            {
              title: 'Field',
              dataIndex: 'cn_name',
              width: '200px',
            },
            {
              title: 'Value',
              dataIndex: 'value',
              render: (text) => {
                if (Array.isArray(text)) {
                  text = _.escape(JSON.stringify(text));
                } 

                const decodedText = typeof text === 'string' 
                ? decodeUnicode(text) 
                : text;

                return (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(decodedText),
                    }}
                  />
                );
              },
            },
          ]}
          loading={loading}
          dataSource={logDevice360}
          scroll={{ y: 'calc(100vh - 135px)' }}
          pagination={false}
          title={() => <div style={{ 
              textAlign: 'left',
              color: 'black',
              fontWeight: 'bold',
              fontSize: '12px'
            }}>
              {t('cnd.network_log.log_360')}
            </div>
          }
        />

      </div>
    </div>
  );
};

export default NetworkLog;
