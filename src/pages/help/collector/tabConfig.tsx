import React, { Suspense } from 'react';
import { Spin } from 'antd';

// 懒加载各个组件
const OSscripts = React.lazy(() => import('./components/OSscripts'));
const UpgradeConfig = React.lazy(() => import('./components/UpgradeConfig'));
const RegionalConfig = React.lazy(() => import('./components/RegionalConfig'));
const DefaultConfig = React.lazy(() => import('./components/DefaultConfig'));
const Logstash = React.lazy(() => import('./components/Logstash'));
const ShieldLogs = React.lazy(() => import('./components/ShieldLogs'));

export const getTabConfig = (t: any, loading: boolean) => {
  return [
    {
      tabKey: 'linux',
      tabLabel: t('script.deployment.linux'),
      content: (
        <Suspense fallback={<Spin spinning={loading} />}>
          <>
            <p>{t('script.edit.linux')}</p>
            <OSscripts os='linux' description={t('script.shell_content')} mode='shell' height='calc(100vh - 298px)' />
          </>
        </Suspense>
      ),
    },
    {
      tabKey: 'windows',
      tabLabel: t('script.deployment.windows'),
      content: (
        <Suspense fallback={<Spin spinning={loading} />}>
          <>
            <p>{t('script.edit.windows')}</p>
            <OSscripts
              os='windows'
              description={t('script.powershell_content')}
              mode='powerShell'
              height='calc(100vh - 298px)'
            />
          </>
        </Suspense>
      ),
    },
    {
      tabKey: 'kubernetes',
      tabLabel: t('script.deployment.kubernetes'),
      content: (
        <Suspense fallback={<Spin spinning={loading} />}>
          <>
            <p>{t('script.edit.kubernetes')}</p>
            <OSscripts
              os='kubernetes'
              description={t('script.yaml_content')}
              mode='yaml'
              height='calc(100vh - 256px)'
            />
          </>
        </Suspense>
      ),
    },
    {
      tabKey: 'upgrade_config',
      tabLabel: t('script.upgrade_config.title'),
      content: (
        <Suspense fallback={<Spin spinning={loading} />}>
          <UpgradeConfig />
        </Suspense>
      ),
    },
    {
      tabKey: 'ms_area',
      tabLabel: t('common:regional_config'),
      content: (
        <Suspense fallback={<Spin spinning={loading} />}>
          <RegionalConfig />
        </Suspense>
      ),
    },
    {
      tabKey: 'default_config',
      tabLabel: t('script.default_config'),
      content: (
        <Suspense fallback={<Spin spinning={loading} />}>
          <DefaultConfig />
        </Suspense>
      ),
    },
    {
      tabKey: 'logstash',
      tabLabel: t('script.logstash.title'),
      content: (
        <Suspense fallback={<Spin spinning={loading} />}>
          <Logstash />
        </Suspense>
      ),
    },
    {
      tabKey: 'shieldLogRules',
      tabLabel: t('script.shield_log_rules.title'),
      content: (
        <Suspense fallback={<Spin spinning={loading} />}>
          <ShieldLogs />
        </Suspense>
      ),
    },
  ];
};
