import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs } from 'antd';
import { useLocation, useHistory } from 'react-router-dom';
import queryString from 'query-string';
import PageLayout from '@/components/pageLayout';
import Container from './Container';
import ESIndex from './ESIndex';
import Permission from './Permission';
import ApmConfig from './ApmConfig';
import LogConfig from './LogConfig';
import './locale';

export default function NotificationSettings() {
  const { t } = useTranslation('other');
  const { search } = useLocation();
  const query = queryString.parse(search);
  const history = useHistory();
  const [activeKey, setActiveKey] = React.useState((query.tab as string) || 'container');
  const panes = [
    {
      key: 'container',
      tab: t('container.title'),
      content: <Container />,
    },
    {
      key: 'es_index',
      tab: t('es_index.title'),
      content: <ESIndex />,
    },
    {
      key: 'permission',
      tab: t('permission.title'),
      content: <Permission />,
    },
    {
      key: 'apm',
      tab: t('apm.title'),
      content: <ApmConfig />,
    },
    {
      key: 'log',
      tab: t('log.title'),
      content: <LogConfig />,
    },
  ];

  return (
    <PageLayout title={t('title')}>
      <div>
        <div
          style={{
            padding: '0 10px 10px 10px',
          }}
        >
          <Tabs
            activeKey={activeKey}
            onChange={(val) => {
              setActiveKey(val);
              history.push({
                pathname: location.pathname,
                search: `?tab=${val}`,
              });
            }}
          >
            {panes.map((pane) => {
              return (
                <Tabs.TabPane tab={pane.tab} key={pane.key}>
                  {pane.content}
                </Tabs.TabPane>
              );
            })}
          </Tabs>
        </div>
      </div>
    </PageLayout>
  );
}
