import { Entry, dynamicPackages } from '@/utils';
import querystring from 'query-string';
import { CommonStateContext } from '@/App';
import React, { Suspense, lazy, useContext } from 'react';
import { Spin } from 'antd';
import _ from 'lodash';
import { Redirect, Route, Switch, useLocation } from 'react-router-dom';

// 路由懒加载
const Profile = lazy(() => import('@/pages/account/profile'));
const AccountSession = lazy(() => import('@/pages/account/session'));
const AccountSessionGather = lazy(() => import('@/pages/account/sessionGather'));
const AgentInstall = lazy(() => import('@/pages/targets/install'));
const AgentSetting = lazy(() => import('@/pages/targets/setting'));
const TargetPublic = lazy(() => import('@/pages/targets/public'));
const AgentEvent = lazy(() => import('@/pages/targets/event'));
const AlertRules = lazy(() => import('@/pages/alertRules'));
const AlertRuleAdd = lazy(() => import('@/pages/alertRules/Add'));
const AlertRuleEdit = lazy(() => import('@/pages/alertRules/Edit'));
const AlertNotificationTpls = lazy(() => import('@/pages/alertRules/NotificationTpls'));
const StrategyBrain = lazy(() => import('@/pages/alertRules/StrategyBrain'));
const AlertRulesBuiltin = lazy(() => import('@/pages/alertRulesBuiltin'));
const AlertRuleBuiltAdd = lazy(() => import('@/pages/alertRulesBuiltin/Add'));
const AlertRulesBuiltinDetail = lazy(() => import('@/pages/alertRulesBuiltin/Detail'));
const Chart = lazy(() => import('@/pages/chart'));
const Dashboard = lazy(() => import('@/pages/dashboard/List'));
const DashboardDetail = lazy(() => import('@/pages/dashboard/Detail'));
const DashboardShare = lazy(() => import('@/pages/dashboard/Share'));
const ShareRecord = lazy(() => import('@/pages/dashboard/record'));
const DashboardBuiltin = lazy(() => import('@/pages/dashboardBuiltin'));
const DashboardBuiltinDetail = lazy(() => import('@/pages/dashboardBuiltin/Detail'));
const Datasource = lazy(() => import('@/pages/datasource'));
const DatasourceAdd = lazy(() => import('@/pages/datasource/Form'));
const Event = lazy(() => import('@/pages/event'));
const EventDetail = lazy(() => import('@/pages/event/detail'));
const MetricExplore = lazy(() => import('@/pages/metric'));
const MetricCollectTask = lazy(() => import('@/pages/metric/collectTask'));
const CollectTaskOperations = lazy(() => import('@/pages/metric/collectTask/operations'));
const MetricOverview = lazy(() => import('@/pages/metric/overview'));
const InstantQuery = lazy(() => import('@/pages/logs/InstantQuery'));
const ErpInstantQuery = lazy(() => import('@/pages/logs/ErpInstantQuery'));
const LogStream = lazy(() => import('@/pages/logs/Stream'));
const NotificationSettings = lazy(() => import('@/pages/help/NotificationSettings'));
const NotificationTpls = lazy(() => import('@/pages/help/NotificationTpls'));
const SSOConfigs = lazy(() => import('@/pages/help/SSOConfigs'));
const Servers = lazy(() => import('@/pages/help/servers'));
const CollectorManagement = lazy(() => import('@/pages/help/collector'));
const ScheduleTask = lazy(() => import('@/pages/help/scheduleTask'));
const HistoryEvents = lazy(() => import('@/pages/historyEvents'));
const Login = lazy(() => import('@/pages/login'));
const Overview = lazy(() => import('@/pages/login/overview'));
const LoginCallback = lazy(() => import('@/pages/loginCallback'));
const LoginCallbackCAS = lazy(() => import('@/pages/loginCallback/cas'));
const LoginCallbackOAuth = lazy(() => import('@/pages/loginCallback/oauth'));
const LoginCallbackWecom = lazy(() => import('@/pages/loginCallback/wecom'));
const HomePage = lazy(() => import('@/pages/homepage'));
const OtherSetting = lazy(() => import('@/pages/help/Other'));
const ObjectExplore = lazy(() => import('@/pages/monitor/object'));
const NotFound = lazy(() => import('@/pages/notFound'));
const Page403 = lazy(() => import('@/pages/notFound/Page403'));
const NotFoundBgid = lazy(() => import('@/pages/notFound/NotFoundBgid'));
const NotExistBgid = lazy(() => import('@/pages/notFound/NotExistBgid'));
const Permissions = lazy(() => import('@/pages/permissions'));
const RecordingRule = lazy(() => import('@/pages/recordingRules'));
const RecordingRuleAdd = lazy(() => import('@/pages/recordingRules/add'));
const RecordingRuleEdit = lazy(() => import('@/pages/recordingRules/edit'));
const Targets = lazy(() => import('@/pages/targets'));
const Business = lazy(() => import('@/pages/user/business'));
const Groups = lazy(() => import('@/pages/user/groups'));
const Users = lazy(() => import('@/pages/user/users'));
const UsersLoginLimit = lazy(() => import('@/pages/user/loginLimit'));
const Shield = lazy(() => import('@/pages/warning/shield'));
const AddShield = lazy(() => import('@/pages/warning/shield/add'));
const ShieldEdit = lazy(() => import('@/pages/warning/shield/edit'));
const Subscribe = lazy(() => import('@/pages/warning/subscribe'));
const SubscribeAdd = lazy(() => import('@/pages/warning/subscribe/add'));
const SubscribeEdit = lazy(() => import('@/pages/warning/subscribe/edit'));
const OperateAudit = lazy(() => import('@/pages/help/operateAudit'));
const ErpSetting = lazy(() => import('@/pages/help/erpSetting'));
const DialTask = lazy(() => import('@/pages/dial/task'));
const DialTaskAdd = lazy(() => import('@/pages/dial/task/add'));
const DialTaskEdit = lazy(() => import('@/pages/dial/task/edit'));
const DialTaskExplorer = lazy(() => import('@/pages/dial/explorer'));
const LogTask = lazy(() => import('@/pages/logs/task'));
const AddLogTask = lazy(() => import('@/pages/logs/task/add'));
const WebTerminal = lazy(() => import('@/pages/logs/WebTerminal'));
const EditLogTask = lazy(() => import('@/pages/logs/task/edit'));
const ESTemplate = lazy(() => import('@/pages/logs/ESTemplate'));
const DefaultTemplate = lazy(() => import('@/pages/logs/ESTemplate/defaultTemplate'));
const RolloverTemplate = lazy(() => import('@/pages/logs/ESTemplate/rolloverTemplate'));
const TopTracesList = lazy(() => import('@/pages/traces'));
const ApmSetting = lazy(() => import('@/pages/traces/setting'));
const ApmSettingAdd = lazy(() => import('@/pages/traces/setting/add'));
const ApmSettingEdit = lazy(() => import('@/pages/traces/setting/edit'));
const ApmForm = lazy(() => import('@/pages/traces/form'));
const ApmFormAdd = lazy(() => import('@/pages/traces/form/add'));
const ApmFormEdit = lazy(() => import('@/pages/traces/form/edit'));
const TrackDetail = lazy(() => import('@/pages/traces/detail'));
const ServiceTracking = lazy(() => import('@/pages/traces/serviceTracking'));
const ServiceMap = lazy(() => import('@/pages/traces/serviceMap'));
const TransferPage = lazy(() => import('@/pages/transferPage'));
const CndNetworkLog = lazy(() => import('@/pages/custom/cnd/networkLog'));

const Packages = dynamicPackages();
let lazyRoutes = Packages.reduce((result: any, module: Entry) => {
  return (result = result.concat(module.routes));
}, []);

function RouteWithSubRoutes(route) {
  return (
    <Route
      path={route.path}
      render={(props) => (
        // pass the sub-routes down to keep nesting
        <route.component {...props} routes={route.routes} />
      )}
    />
  );
}

export default function Content() {
  const location = useLocation();
  const { menuPerm } = useContext(CommonStateContext);
  // 仪表盘在全屏和暗黑主题下需要定义个 dark 样式名
  let themeClassName = '';
  if (location.pathname.indexOf('/dashboard') === 0) {
    const query = querystring.parse(location.search);
    if (query?.viewMode === 'fullscreen' && query?.themeMode === 'dark') {
      themeClassName = 'theme-dark';
    }
  }

  // 判断登录状态
  const have_logged = localStorage.getItem('access_token') && localStorage.getItem('refresh_token');
  if (
    have_logged &&
    !menuPerm?.length &&
    !(
      location.pathname.startsWith('/chart') ||
      location.pathname.startsWith('/dashboards/share/') ||
      location.pathname.startsWith('/c/cnd/network/log') ||
      location.pathname === '/no-exist-bgid'
    )
  )
    return null;
  return (
    <div className={`content ${themeClassName}`}>
      <Suspense fallback={<Spin style={{ position: 'absolute', left: '50%', bottom: '50%' }} />}>
        <Switch>
          <Route path='/overview' component={Overview} />
          {have_logged ? (
            <Route path='/login/:type' exact>
              <Redirect to={menuPerm[0]} />
            </Route>
          ) : (
            <Route path='/login/:type' component={Login} exact />
          )}
          {have_logged ? (
            <Route path='/login' exact>
              <Redirect to={menuPerm[0]} />
            </Route>
          ) : (
            <Route path='/login' component={Login} exact />
          )}
          <Route path='/callback' component={LoginCallback} exact />
          <Route path='/callback/cas' component={LoginCallbackCAS} exact />
          <Route path='/callback/oauth' component={LoginCallbackOAuth} exact />
          <Route path='/callback/wecom' component={LoginCallbackWecom} exact />
          <Route path='/metric/explorer' component={MetricExplore} exact />
          <Route path='/metric/input-task' component={MetricCollectTask} exact />
          <Route path='/metric/input-task/operations' component={CollectTaskOperations} exact />
          <Route path='/metric/input-task/overview' component={MetricOverview} exact />
          <Route path='/log/explorer' component={InstantQuery} exact />
          <Route path='/log/stream' component={LogStream} exact />
          <Route path='/c/cnd/erp/log' component={ErpInstantQuery} exact />
          <Route path='/object/explorer' component={ObjectExplore} exact />
          <Route path='/busi-groups' component={Business} />
          <Route path='/users/login-limit' component={UsersLoginLimit} />
          <Route path='/users/session-gather' component={AccountSessionGather} />
          <Route path='/users' component={Users} />
          <Route path='/user-groups' component={Groups} />
          <Route path='/account/profile/:tab' component={Profile} />
          <Route path='/account/session' component={AccountSession} />

          <Route path='/dashboard/:id' exact component={DashboardDetail} />
          <Route path='/dashboards/:id' exact component={DashboardDetail} />
          <Route path='/share-chart-record' component={ShareRecord} />
          <Route path='/dashboards/share/:id' component={DashboardShare} />
          <Route path='/dashboards' component={Dashboard} />
          <Route path='/dashboards-built-in/:cate' exact component={DashboardBuiltin} />
          <Route path='/dashboards-built-in' exact component={DashboardBuiltin} />
          <Route path='/dashboards-built-in/:cate/detail/:code' exact component={DashboardBuiltinDetail} />
          <Route path='/chart/:ids' component={Chart} />

          <Route exact path='/alert-rules/add' component={AlertRuleAdd} />
          <Route exact path='/alert-rules/edit/:id' component={AlertRuleEdit} />
          <Route exact path='/alert-rules' component={AlertRules} />
          <Route exact path='/alert-rules-built-in/:cate' component={AlertRulesBuiltin} />
          <Route exact path='/alert-rules-built-in' component={AlertRulesBuiltin} />
          <Route exact path='/alert-rules-built-in/add/:cate' component={AlertRuleBuiltAdd} />
          <Route exact path='/alert-rules-built-in/:cate/detail/:code' component={AlertRulesBuiltinDetail} />
          <Route exact path='/alert-rules/brain/:id' component={StrategyBrain} />
          <Route exact path='/alert-mutes' component={Shield} />
          <Route exact path='/alert-mutes/add/:from?' component={AddShield} />
          <Route exact path='/alert-mutes/edit/:id' component={ShieldEdit} />
          <Route exact path='/alert-subscribes' component={Subscribe} />
          <Route exact path='/alert-subscribes/add' component={SubscribeAdd} />
          <Route exact path='/alert-subscribes/edit/:id' component={SubscribeEdit} />
          <Route exact path='/alert-template' component={AlertNotificationTpls} />

          <Route exact path='/recording-rules/add' component={RecordingRuleAdd} />
          <Route exact path='/recording-rules/:id?' component={RecordingRule} />
          <Route exact path='/recording-rules/edit/:id' component={RecordingRuleEdit} />

          <Route exact path='/alert-cur-events' component={Event} />
          <Route exact path='/alert-his-events' component={HistoryEvents} />
          <Route exact path='/alert-cur-events/:eventId' component={EventDetail} />
          <Route exact path='/alert-his-events/:eventId' component={EventDetail} />

          <Route exact path='/targets' component={Targets} />
          <Route exact path='/targets-install' component={AgentInstall} />
          <Route exact path='/targets-public' component={TargetPublic} />
          <Route exact path='/targets/setting' component={AgentSetting} />
          <Route exact path='/targets/event' component={AgentEvent} />

          {/* <Route exact path='/job-tpls' component={TaskTpl} />
        <Route exact path='/job-tpls/add' component={TaskTplAdd} />
        <Route exact path='/job-tpls/add/task' component={TaskAdd} />
        <Route exact path='/job-tpls/detail/:id' component={TaskTplDetail} />
        <Route exact path='/job-tpls/modify/:id' component={TaskTplModify} />
        <Route exact path='/job-tpls/clone/:id' component={TaskTplClone} />
        <Route exact path='/job-tasks' component={Task} />
        <Route exact path='/job-tasks/add' component={TaskAdd} />
        <Route exact path='/job-tasks/:id/result' component={TaskResult} />
        <Route exact path='/job-tasks/:id/detail' component={TaskDetail} />
        <Route exact path='/ibex-settings' component={IBEX} /> */}

          <Route exact path='/help/servers' component={Servers} />
          <Route exact path='/help/source' component={Datasource} />
          <Route exact path='/help/source/:action/:type' component={DatasourceAdd} />
          <Route exact path='/help/source/:action/:type/:id' component={DatasourceAdd} />
          <Route exact path='/help/sso' component={SSOConfigs} />
          <Route exact path='/help/notification-tpls' component={NotificationTpls} />
          <Route exact path='/help/notification-settings' component={NotificationSettings} />
          {/*<Route exact path='/help/migrate' component={MigrateDashboards} /> */}
          <Route exact path='/help/operational-audit' component={OperateAudit} />
          <Route exact path='/c/cnd/erp/config' component={ErpSetting} />
          <Route exact path='/c/cnd/network/log' component={CndNetworkLog} />
          <Route exact path='/help/other' component={OtherSetting} />
          <Route exact path='/help/collector-management' component={CollectorManagement} />
          <Route exact path='/help/schedule-task' component={ScheduleTask} />
          <Route exact path='/traces' component={TopTracesList} />
          {/* 事务/概览 */}
          <Route exact path='/service-tracking/overview' component={TrackDetail} />
          {/* 事务/错误列表 */}
          <Route exact path='/service-tracking/:tab' component={TrackDetail} />
          {/* 事务/错误明细 */}
          <Route exact path='/service-tracking/:tab/view' component={TrackDetail} />
          <Route exact path='/service-tracking' component={ServiceTracking} />
          <Route exact path='/traces-setting' component={ApmSetting} />
          <Route exact path='/traces-setting/add' component={ApmSettingAdd} />
          <Route exact path='/traces-setting/edit' component={ApmSettingEdit} />
          <Route exact path='/traces-form' component={ApmForm} />
          <Route exact path='/traces-form/add' component={ApmFormAdd} />
          <Route exact path='/traces-form/edit/:id' component={ApmFormEdit} />
          <Route exact path='/service-map' component={ServiceMap} />
          <Route exact path='/transfer' component={TransferPage} />

          <Route exact path='/permissions' component={Permissions} />
          <Route exact path='/dial-task' component={DialTask} />
          <Route exact path='/dial-explorer' component={DialTaskExplorer} />
          <Route exact path='/dial-task/add' component={DialTaskAdd} />
          <Route exact path='/dial-task/edit/:id' component={DialTaskEdit} />
          {/* <Route exact path='/dial/node-management' component={NodeManagement} /> */}
          <Route exact path='/log/collection' component={LogTask} />
          <Route exact path='/log/collection/add' component={AddLogTask} />
          <Route exact path='/log/voctor/vrl' component={WebTerminal} />
          <Route exact path='/log/collection/edit/:id' component={EditLogTask} />
          <Route exact path='/log/es-template' component={ESTemplate} />
          <Route exact path='/log/es-template/rollover/:id' component={RolloverTemplate} />
          <Route exact path='/log/es-template/default/:id' component={DefaultTemplate} />
          {/* <Route exact path='/log/logstash' component={()=><LogstashManagement/>} /> */}
          {/* 首页概览 */}
          <Route exact path='/home' component={HomePage} />

          {lazyRoutes.map((route, i) => (
            <RouteWithSubRoutes key={i} {...route} />
          ))}
          <Route path='/' exact>
            <Redirect to={menuPerm[0]} />
          </Route>
          <Route path='/403' component={Page403} />
          <Route path='/404' component={NotFound} />
          {/* 找不到指定业务组 */}
          <Route path='/no-found-bgid' component={NotFoundBgid} />
          {/* 项目没有配置业务组，需要联系管理员 */}
          <Route path='/no-exist-bgid' component={NotExistBgid} />
          <Route path='*' component={NotFound} />
        </Switch>
      </Suspense>
    </div>
  );
}
