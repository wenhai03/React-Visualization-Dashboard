import React, { useEffect, useState, createContext } from 'react';
import { Router, Switch, Route } from 'react-router-dom';
// Modal 会被注入的代码所使用，请不要删除
import { ConfigProvider, Empty, Modal } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import enUS from 'antd/lib/locale/en_US';
import 'antd/dist/antd.less';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import TaskOutput from '@/pages/taskOutput';
import TaskHostOutput from '@/pages/taskOutput/host';
import { getAuthorizedDatasourceCates } from '@/components/AdvancedWrap';
import { GetProfile } from '@/services/account';
import { getBusiGroups, getDatasourceBriefList, getMenuPerm, getInitBoot } from '@/services/common';
import { getLicense } from '@/components/AdvancedWrap';
import HeaderMenu from './components/menu';
import Content from './routers';
import { cancelAllRequests } from '@/utils/request';
import { getElasticIndex } from '@/services/config';
import { history } from '@/utils/history';
import './App.less';
import './global.variable.less';

interface IProfile {
  admin?: boolean;
  nickname: string;
  role: string;
  roles: string[];
  username: string;
  email: string;
  phone: string;
  id: number;
  portrait: string;
  contacts: { string?: string };
  wecom_id: string;
  idm_id: string;
  type: 100 | 200;
  user_groups?: any;
  busi_groups?: any;
  has_password?: boolean;
}

export interface Datasource {
  id: number;
  name: string;
  plugin_type: string;
  settings?: {
    max_shard: number;
    min_interval: number;
    version: string;
    mode?: 0 | 1;
  };
}

interface BusiGroup {
  id: number;
  name: string;
  extra?: any;
  perm: 'rw' | 'ro';
  alert_notify: {
    notify_groups: string[];
    notify_channels: string[];
  };
}

interface ESIndexProps {
  elastic_app_log_index: string;
  elastic_container_log_index: string;
  elastic_journald_log_index: string;
  elastic_pod_log_index: string;
  elastic_sys_log_index: string;
  home_logs_index: string;
  elastic_dial_index: string;
  elastic_apm_index: string;
  elastic_apm_map_index: string;
  elastic_apm_error_index: string;
  elastic_apm_load_index: string;
  elastic_apm_span_index: string;
  elastic_apm_trace_index: string;
  elastic_apm_metrics_index: string;
  elastic_graf_log_index: string;
}

export interface ICommonState {
  datasourceCateOptions: {
    label: string;
    value: string;
  }[];
  groupedDatasourceList: {
    [index: string]: Datasource[];
  };
  datasourceList: Datasource[];
  setDatasourceList: (list: Datasource[]) => void;
  busiGroups: {
    name: string;
    id: number;
  }[];
  setBusiGroups: (groups: { name: string; id: number }[]) => void;
  curBusiId: number;
  setCurBusiId: (id: number) => void;
  curBusiGroup: BusiGroup;
  setCurBusiGroup: (BusiGroup) => void;
  profile: IProfile;
  setProfile: (profile: IProfile) => void;
  ESIndex: ESIndexProps;
  setESIndex: (ESIndex: ESIndexProps) => void;
  menuPerm: string[];
  setMenuPerm: (menuPerm: string[]) => void;
  menuLoading: boolean; // 菜单栏切换loading
  setMenuLoading: (menuLoading: boolean) => void;
  menuWidth: number;
  setMenuWidth: (menuWidth: number) => void;
  fullScreenPanel?: string;
  setFullScreenPanel: (fullScreenPanel?: string) => void;
  licenseRulesRemaining?: number;
  licenseExpireDays?: number;
  licenseExpired: boolean;
  initBoot: Record<string, any>;
  setInitBoot: (initBoot: Record<string, any>) => void;
}

const initBootConfig = {
  ds_prometheus: {
    run: true,
    steps: [
      {
        content: <div>创建 prometheus 数据源：点击进入创建（1/2）</div>,
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
        hideFooter: true,
        placement: 'bottom',
        spotlightClicks: true,
        target: '.init-prometheus',
      },
      {
        content: <div>创建 prometheus 数据源：填写并提交（2/2）</div>,
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
        hideFooter: true,
        placement: 'bottom',
        spotlightClicks: true,
        target: '.init-boot',
        spotlightPadding: -10,
      },
    ],
  },
  ds_elasticsearch: {
    run: true,
    stepIndex: 0,
    steps: [
      {
        content: <div>创建 elasticsearch 数据源：点击进入创建（1/5）</div>,
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
        hideFooter: true,
        placement: 'bottom',
        spotlightClicks: true,
        target: '.init-elasticsearch',
      },
      {
        content: <div>创建 elasticsearch 数据源：填写并提交（2/5）</div>,
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
        hideFooter: true,
        placement: 'bottom',
        spotlightClicks: true,
        target: '.init-boot',
        spotlightPadding: -10,
      },
      {
        content: <div>将新创建的数据源与业务组绑定,填写并保存（3/5）</div>,
        disableBeacon: true,
        spotlightClicks: true,
        disableOverlayClose: true,
        hideBackButton: true,
        placement: 'bottom',
        locale: { next: '下一步' },
        data: {
          next: '/help/other?tab=permission&isInit=true',
        },
        target: '.init-boot',
      },
      {
        content: <div>同步日志采集配置（4/5）</div>,
        disableBeacon: true,
        spotlightClicks: true,
        disableOverlayClose: true,
        placement: 'bottom',
        locale: { back: '上一步', next: '下一步' },
        target: '.collect-config-sync',
        data: {
          pre: '/busi-groups?initType=elasticsearch',
        },
      },
      {
        content: (
          <div>
            同步 ES 索引模板<span>（5/5）</span>
          </div>
        ),
        disableBeacon: true,
        spotlightClicks: true,
        disableOverlayClose: true,
        placement: 'bottom',
        locale: { back: '上一步', next: '下一步', last: '关闭' },
        target: '.es-index-tpl',
      },
    ],
  },
  ms_area: {
    run: true,
    steps: [
      {
        content: <div>区域配置：填写并提交（1/1）</div>,
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
        hideFooter: true,
        placement: 'bottom',
        spotlightClicks: true,
        target: '.init-boot',
      },
    ],
  },
};

const loginArr = ['/transfer', '/login', '/login/workwx', '/login/account', '/login/idm'];

// 可以匿名访问的路由 TODO: job-task output 应该也可以匿名访问
const anonymousRoutes = [
  ...loginArr,
  '/callback',
  '/chart',
  '/dashboards/share/',
  '/no-exist-bgid',
  '/c/cnd/network/log',
];
// 判断是否是匿名访问的路由
const anonymous = _.some(anonymousRoutes, (route) => location.pathname.startsWith(route));
// 初始化数据 context
export const CommonStateContext = createContext({} as ICommonState);

function App() {
  const { t, i18n } = useTranslation();
  const [initialized, setItialized] = useState(false);
  const [commonState, setCommonState] = useState<ICommonState>({
    datasourceCateOptions: getAuthorizedDatasourceCates(),
    groupedDatasourceList: {},
    datasourceList: [],
    setDatasourceList: (datasourceList) => {
      setCommonState((state) => ({
        ...state,
        datasourceList,
        groupedDatasourceList: _.groupBy(datasourceList, 'plugin_type'),
      }));
    },
    busiGroups: [],
    setBusiGroups: (busiGroups) => {
      setCommonState((state) => ({ ...state, busiGroups }));
    },
    curBusiId: window.localStorage.getItem('Busi-Group-Id') ? Number(window.localStorage.getItem('Busi-Group-Id')) : 0,
    setCurBusiId: (id: number) => {
      window.localStorage.setItem('Busi-Group-Id', String(id));
      setCommonState((state) => ({ ...state, curBusiId: id }));
    },
    curBusiGroup: {} as BusiGroup,
    setCurBusiGroup: (curBusiGroup) => {
      setCommonState((state) => ({ ...state, curBusiGroup }));
    },
    profile: {} as IProfile,
    setProfile: (profile: IProfile) => {
      setCommonState((state) => ({ ...state, profile }));
    },
    ESIndex: {} as ESIndexProps,
    setESIndex: (ESIndex: ESIndexProps) => setCommonState((state) => ({ ...state, ESIndex })),
    menuWidth: 176,
    menuPerm: [],
    setMenuPerm: (menuPerm: string[]) => {
      setCommonState((state) => ({ ...state, menuPerm }));
    },
    menuLoading: false,
    setMenuLoading: (menuLoading: boolean) => {
      setCommonState((state) => ({ ...state, menuLoading }));
    },
    setMenuWidth: (menuWidth: number) => setCommonState((state) => ({ ...state, menuWidth })),
    fullScreenPanel: undefined,
    setFullScreenPanel: (fullScreenPanel?: string) => {
      setCommonState((state) => ({ ...state, fullScreenPanel }));
    },
    licenseExpired: false,
    initBoot: {},
    setInitBoot: (initBoot: Record<string, any>) => setCommonState((state) => ({ ...state, initBoot })),
  });
  const have_logged = localStorage.getItem('access_token') && localStorage.getItem('refresh_token');

  useEffect(() => {
    cancelAllRequests();
    const unlisten = history.listen((location, action) => {
      cancelAllRequests();
    });
    return () => unlisten();
  }, []);

  useEffect(() => {
    try {
      (async () => {
        // 非匿名访问，需要初始化一些公共数据
        if (!anonymous || (have_logged && loginArr.includes(location.pathname))) {
          const { dat: busiGroups } = await getBusiGroups();
          if (busiGroups?.length) {
            const { dat: profile } = await GetProfile();
            const { dat: ESIndex } = await getElasticIndex();
            const { licenseRulesRemaining, licenseExpireDays } = await getLicense(t);
            const prevBusiGroupExist = busiGroups.filter((item) => item.id === commonState.curBusiId);
            const defaultBusiId = prevBusiGroupExist.length ? commonState.curBusiId : busiGroups?.[0]?.id || 0;
            window.localStorage.setItem('Busi-Group-Id', String(defaultBusiId));
            const curBusiGroup = prevBusiGroupExist.length ? prevBusiGroupExist[0] : busiGroups?.[0] || {};
            const datasourceList = defaultBusiId ? await getDatasourceBriefList() : [];
            const { dat: menuPerm } = await getMenuPerm();
            let initBoot: Record<string, any> = {};
            // 引导初始化配置
            if (profile?.admin) {
              const data = (await getInitBoot())?.dat || [];
              data.forEach((element) => {
                initBoot[element] = initBootConfig[element];
              });
            }
            setItialized(true);
            setCommonState((state) => {
              return {
                ...state,
                profile,
                ESIndex,
                busiGroups,
                groupedDatasourceList: _.groupBy(datasourceList, 'plugin_type'),
                datasourceList: datasourceList,
                curBusiId: defaultBusiId,
                menuPerm,
                curBusiGroup,
                licenseRulesRemaining,
                licenseExpireDays,
                licenseExpired: licenseExpireDays !== undefined && licenseExpireDays <= 0,
                initBoot,
              };
            });
            //需要操作引导，进行重定向
            if (!_.isEmpty(initBoot)) {
              if (initBoot.ds_prometheus || initBoot.ds_elasticsearch) {
                if (location.pathname !== '/help/source') {
                  window.location.href = '/help/source';
                }
              } else if (initBoot.ms_area) {
                if (`${location.pathname}${location.search}` !== '/help/collector-management?tab=ms_area') {
                  window.location.href = '/help/collector-management?tab=ms_area';
                }
              }
            }
            // 当前业务组没有数据源时，提示他需要设置数据源（针对所有页面，需要限制只出现在有用到数据源的页面）
            // 暂时注释掉。目前时序指标、日志分析、链路追踪没有数据源时都会有气泡框提示。
            // if (_.isEmpty(datasourceList) && !_.startsWith(location.pathname, '/busi-groups')) {
            //   Modal.warning({
            //     title: t('common:datasource.empty_modal.title'),
            //     okText: _.includes(profile.roles, 'Admin')
            //       ? t('common:datasource.empty_modal.btn1')
            //       : t('common:datasource.empty_modal.btn2'),
            //     onOk: () => {
            //       if (_.includes(profile.roles, 'Admin')) {
            //         history.pushState(null, '', '/busi-groups');
            //         window.location.reload();
            //       }
            //     },
            //   });
            // }
          } else {
            window.location.href = '/no-exist-bgid';
          }
        } else if (location.pathname.startsWith('/chart') || location.pathname.startsWith('/dashboards/share/')) {
          // 水印需要个人信息
          const { dat: profile } = await GetProfile();
          setCommonState((state) => {
            return {
              ...state,
              profile,
            };
          });
        }
        setItialized(true);
      })();
    } catch (error) {
      console.error(error);
    }
  }, []);

  // 初始化中不渲染任何内容
  if (!initialized) {
    return null;
  }

  return (
    <div className='App'>
      <CommonStateContext.Provider value={commonState}>
        <ConfigProvider locale={i18n.language == 'en_US' ? enUS : zhCN}>
          <Router history={history}>
            <Switch>
              <Route exact path='/job-task/:busiId/output/:taskId/:outputType' component={TaskOutput} />
              <Route exact path='/job-task/:busiId/output/:taskId/:host/:outputType' component={TaskHostOutput} />
              <>
                <HeaderMenu />
                <Content />
              </>
            </Switch>
          </Router>
        </ConfigProvider>
      </CommonStateContext.Provider>
    </div>
  );
}

export default App;
