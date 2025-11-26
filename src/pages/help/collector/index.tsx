import React, { useState } from 'react';
import { Button, Tabs } from 'antd';
import queryString from 'query-string';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import { BASE_API_PREFIX } from '@/utils/constant';
import './locale';
import './index.less';
import { getTabConfig } from './tabConfig'; // 导入配置

const { TabPane } = Tabs;

export default function CollectorManagement() {
  const location = useLocation();
  const history = useHistory();
  const { t } = useTranslation('collector');
  const query = queryString.parse(location.search);
  const token = localStorage.getItem('access_token');
  const activeKey = (query.tab as string) || 'linux';

  const [loading, setLoading] = useState(true);

  const handleTabChange = (key: string) => {
    history.push({
      pathname: location.pathname,
      search: `?tab=${key}`,
    });
  };

  const exportConfigButton = (
    <Button>
      <a href={`${BASE_API_PREFIX}/download/config?token=${token}`} download='默认配置.zip'>
        {t('common:btn.export')}
      </a>
    </Button>
  );

  const tabConfig = getTabConfig(t, loading);

  return (
    <PageLayout title={t('title')}>
      <div>
        <Tabs
          style={{ padding: '0 10px 10px 10px' }}
          activeKey={activeKey}
          size='large'
          onChange={handleTabChange}
          tabBarExtraContent={{ right: exportConfigButton }}
        >
          {tabConfig.map((tab) => (
            <TabPane tab={tab.tabLabel} key={tab.tabKey}>
              {tab.content}
            </TabPane>
          ))}
        </Tabs>
      </div>
    </PageLayout>
  );
}
