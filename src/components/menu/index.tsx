import { Menu, Popover, Button, Tag } from 'antd';
import { CommonStateContext } from '@/App';
import { getSystemVersion } from '@/services/common';
import Icon, { MenuUnfoldOutlined, MenuFoldOutlined, DropboxCircleFilled } from '@ant-design/icons';
// import { FloatFcMenu } from '@fc-components/menu'
import classNames from 'classnames';
import _ from 'lodash';
import querystring from 'query-string';
import React, { FC, useContext, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import IconFont from '../IconFont';
import menuIcon from './configs';
import './locale';
import './menu.less';

const getMenuList = (t) => {
  const menuList = [
    {
      key: 'dashboard',
      icon: <IconFont type='icon-Menu_Dashboard' />,
      label: t('仪表盘'),
      children: [
        {
          key: '/dashboards',
          label: t('监控仪表盘'),
        },
        {
          key: '/dashboards-built-in',
          label: t('内置仪表盘'),
        },
        {
          key: '/share-chart-record',
          label: t('分享记录'),
        },
      ],
    },
    {
      key: 'alarm',
      icon: <IconFont type='icon-Menu_AlarmManagement' />,
      label: t('告警管理'),
      children: [
        {
          key: '/alert-rules',
          label: t('告警规则'),
        },
        {
          key: '/alert-rules-built-in',
          label: t('内置规则'),
        },
        {
          key: '/alert-mutes',
          label: t('屏蔽规则'),
        },
        {
          key: '/alert-subscribes',
          label: t('订阅规则'),
        },
        {
          key: '/alert-cur-events',
          label: t('活跃告警'),
        },
        {
          key: '/alert-his-events',
          label: t('历史告警'),
        },
        {
          key: '/alert-template',
          label: t('通知模板'),
        },
      ],
    },
    {
      key: 'metric',
      icon: <IconFont type='icon-IndexManagement1' />,
      label: t('时序指标'),
      children: [
        {
          key: '/metric/explorer',
          label: t('指标查询'),
        },
        {
          key: '/object/explorer',
          label: t('快捷视图'),
        },
        {
          key: '/metric/input-task',
          label: t('指标采集'),
        },
        {
          key: '/recording-rules',
          label: t('记录规则'),
        },
      ],
    },
    {
      key: 'log',
      icon: <IconFont type='icon-Menu_LogAnalysis' />,
      label: t('日志分析'),
      children: [
        {
          key: '/log/explorer',
          label: t('日志查询'),
        },
        {
          key: '/log/stream',
          label: t('日志流'),
        },
        {
          key: '/log/collection',
          label: t('日志采集'),
        },
        {
          key: '/log/es-template',
          label: t('ES 模板'),
        },
        // {
        //   key: '/log/logstash',
        //   label: t('Logstash 管理'),
        // },
      ],
    },
    // {
    //   key: 'trace',
    //   icon: <IconFont type='icon-Menu_LinkAnalysis' />,
    //   label: t('链路追踪'),
    //   children: [
    //     {
    //       key: '/trace/explorer',
    //       label: t('即时查询'),
    //     },
    //     {
    //       key: '/trace/dependencies',
    //       label: t('拓扑分析'),
    //     },
    //   ],
    // },
    {
      key: 'traces',
      icon: <IconFont type='icon-Menu_LinkAnalysis' />,
      label: t('链路追踪'),
      children: [
        {
          key: '/service-tracking',
          label: t('服务跟踪'),
        },
        {
          key: '/traces',
          label: t('链路追溯'),
        },
        {
          key: '/service-map',
          label: t('服务地图'),
        },
        {
          key: '/traces-setting',
          label: t('APM配置'),
        },
        {
          key: '/traces-form',
          label: t('APM配置项管理'),
        },
      ],
    },
    {
      key: 'dial',
      icon: <DropboxCircleFilled />,
      label: t('网络拨测'),
      children: [
        {
          key: '/dial-explorer',
          label: t('拨测查询'),
        },
        {
          key: '/dial-task',
          label: t('拨测任务'),
        },
        // {
        //   key: '/dial/node-management',
        //   label: t('节点管理'),
        // },
      ],
    },
    {
      key: 'targets',
      icon: <IconFont type='icon-Menu_Infrastructure' />,
      activeIcon: <Icon component={menuIcon.Infrastructure as any} />,
      label: t('基础设施'),
      children: [
        {
          key: '/targets',
          label: t('监控机器'),
        },
        {
          key: '/targets-install',
          label: t('新增部署'),
        },
        {
          key: '/targets-public',
          label: t('公共节点'),
        },
      ],
    },
    // {
    //   key: 'job',
    //   icon: <IconFont type='icon-Menu_AlarmSelfhealing' />,
    //   label: t('告警自愈'),
    //   children: [
    //     {
    //       key: '/job-tpls',
    //       label: t('自愈脚本'),
    //     },
    //     {
    //       key: '/job-tasks',
    //       label: t('执行历史'),
    //     },
    //     {
    //       key: '/ibex-settings',
    //       label: t('自愈配置'),
    //     },
    //   ],
    // },
    {
      key: 'c',
      icon: <IconFont type='icon-Menu_LogAnalysis' />,
      label: t('定制模块'),
      children: [
        {
          key: '/c/cnd/erp/log',
          label: t('ERP日志查询'),
        },
        {
          key: '/c/cnd/erp/config',
          label: t('ERP查询设置'),
        },
      ],
    },
    {
      key: 'manage',
      icon: <IconFont type='icon-Menu_PersonnelOrganization' />,
      label: t('人员组织'),
      children: [
        {
          key: '/users',
          label: t('用户管理'),
        },
        {
          key: '/user-groups',
          label: t('团队管理'),
        },
        {
          key: '/busi-groups',
          label: t('业务组管理'),
        },
        {
          key: '/permissions',
          label: t('角色管理'),
        },
      ],
    },
    {
      key: 'help',
      icon: <IconFont type='icon-Menu_SystemInformation' />,
      label: t('系统配置'),
      children: [
        {
          key: '/help/source',
          label: t('数据源'),
        },
        {
          key: '/help/notification-settings',
          label: t('通知设置'),
        },
        {
          key: '/help/notification-tpls',
          label: t('通知模板'),
        },
        {
          key: '/help/sso',
          label: t('单点登录'),
        },
        {
          key: '/help/operational-audit',
          label: t('操作审计'),
        },
        {
          key: '/help/servers',
          label: t('告警引擎'),
        },
        {
          key: '/help/collector-management',
          label: t('采集器管理'),
        },
        {
          key: '/help/schedule-task',
          label: t('定时任务'),
        },
        // {
        //   key: '/help/migrate',
        //   label: t('仪表盘迁移'),
        // },
        {
          key: '/help/other',
          label: t('其他设置'),
        },
      ],
    },
  ];
  if (import.meta.env['VITE_IS_COLLECT']) {
    const targets = _.find(menuList, (item) => item.key === 'targets');
    if (targets) {
      targets.children?.push({
        key: '/collects',
        label: t('采集配置'),
      });
    }
  }
  return menuList;
};

const SideMenu: FC = () => {
  const { t, i18n } = useTranslation('menu');
  const { profile, setMenuWidth, menuPerm } = useContext(CommonStateContext);
  const [backendVersion, setBackendVersion] = useState<{ version: string; build: string }>();
  const [selectedKeys, setSelectedKeys] = useState<string[]>();
  const menuList = getMenuList(t);
  const [menus, setMenus] = useState(menuList);
  const history = useHistory();
  const location = useLocation();
  const { pathname, search } = location;
  const [collapsed, setCollapsed] = useState(false);
  const switchCollapsed = () => {
    setCollapsed(!collapsed);
    setMenuWidth(collapsed ? 176 : 48);
  };

  const handleClick = (key) => {
    if ((key as string).startsWith('/')) {
      if (pathname === key) {
        history.push({
          pathname: key,
          search: search,
        });
      } else {
        history.push(key as string);
      }
    }
  };

  const hideSideMenu = () => {
    if (
      location.pathname.startsWith('/transfer') ||
      location.pathname.startsWith('/login') ||
      location.pathname.startsWith('/chart/') ||
      location.pathname.startsWith('/dashboards/share/') ||
      location.pathname.startsWith('/c/cnd/network/log') ||
      location.pathname === '/callback' ||
      location.pathname.indexOf('/polaris/screen') === 0 ||
      location.pathname.startsWith('/callback') ||
      location.pathname === '/no-exist-bgid' ||
      location.pathname.startsWith('/log/voctor/vrl')
    ) {
      return true;
    }
    // 大盘全屏模式下也需要隐藏左侧菜单
    if (location.pathname.indexOf('/dashboard') === 0) {
      const query = querystring.parse(location.search);
      if (query?.viewMode === 'fullscreen') {
        return true;
      }
      return false;
    }
    return false;
  };

  useEffect(() => {
    let keys: string[] = [];
    for (const item of menuList) {
      if (item && item.key.startsWith('/') && pathname.includes(item.key)) {
        keys = [item?.key];
        break;
      } else if (item?.children && item.children.length > 0) {
        for (const i of item.children) {
          if (i && (pathname === i.key || pathname.startsWith(i.key + '/'))) {
            keys = [item?.key, i.key!];
            break;
          }
        }
      }
    }

    setSelectedKeys(keys);
  }, [pathname]);

  useEffect(() => {
    if (!_.isEmpty(profile)) {
      getSystemVersion().then((res) => {
        setBackendVersion(res.dat);
      });
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.roles?.length > 0) {
      // 过滤掉没有权限的菜单
      const newMenus: any = _.filter(
        _.map(menuList, (menu) => {
          return {
            ...menu,
            children: _.filter(menu.children, (item) => item && menuPerm.includes(item.key)),
          };
        }),
        (item) => {
          return item.children && item.children.length > 0;
        },
      );
      setMenus(newMenus);
    }
  }, [profile?.roles, i18n.language, menuPerm]);

  const formatMenuTitle = (item, child) => {
    if (selectedKeys?.includes(item.key) && !collapsed) {
      return <div>{item.label}</div>;
    } else {
      return (
        <div className='menu-popover'>
          <Popover
            trigger='hover'
            content={
              <>
                {collapsed && <div className='menu-collapsed-popover-title'>{item.label}</div>}
                {child}
              </>
            }
            placement='rightTop'
          >
            <div>{item.label}</div>
          </Popover>
        </div>
      );
    }
  };

  return hideSideMenu() ? null : (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '0px 0 0px 0px',
      }}
      className={classNames({
        'menu-container': true,
        'menu-container-en': i18n.language === 'en_US',
      })}
    >
      <div
        className={classNames({
          home: true,
          collapse: collapsed,
        })}
      >
        <div className='name' onClick={() => (menuPerm.includes('/home') ? history.push('/home') : {})} key='overview'>
          <img src='/logo.png' />
          <span>监控平台</span>
        </div>
      </div>
      <Menu
        openKeys={collapsed ? [] : selectedKeys}
        selectedKeys={selectedKeys}
        inlineCollapsed={collapsed}
        mode='inline'
      >
        {menus.map((item) => {
          const child = item.children.map((i) => {
            return (
              <Menu.Item
                onClick={() => handleClick(i.key)}
                key={i.key}
                className={selectedKeys?.includes(i.key) ? 'menu-selected' : undefined}
              >
                {i.label}
                {i.key === '/service-map' && (
                  <Tag
                    color='#faad14'
                    style={{ fontSize: '9px', padding: '0 2px', marginLeft: '2px', lineHeight: '16px', height: '16px' }}
                  >
                    Alpha
                  </Tag>
                )}
              </Menu.Item>
            );
          });
          return (
            <Menu.SubMenu icon={item.icon} key={item.key} title={formatMenuTitle(item, child)}>
              {child}
            </Menu.SubMenu>
          );
        })}
      </Menu>
      <Button className='menu-collapsed' type='primary' onClick={switchCollapsed}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        {!collapsed && (
          <div className='system-version' title={backendVersion?.build}>
            {backendVersion?.version}
          </div>
        )}
      </Button>
    </div>
  );
};

export default SideMenu;
