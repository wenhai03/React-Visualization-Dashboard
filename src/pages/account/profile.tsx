import React, { useContext } from 'react';
import { Tabs } from 'antd';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { CommonStateContext } from '@/App';
import ChangePassword from './changePassword';
import Info from './info';
import './profile.less';
import './locale';

const { TabPane } = Tabs;
interface Param {
  tab: string;
}
export default function Profile() {
  const { t } = useTranslation('account');
  const { tab } = useParams<Param>();
  const history = useHistory();
  const { profile } = useContext(CommonStateContext);

  const handleChange = (tab) => {
    history.push('/account/profile/' + tab);
  };

  return (
    <PageLayout title={t('title')}>
      <Tabs activeKey={tab} className='profile' onChange={handleChange}>
        <TabPane tab={t('common:profile.title')} key='info'>
          <Info />
        </TabPane>
        {profile.type === 100 && (
          <TabPane tab={t('account_password')} key='pwd'>
            <ChangePassword />
          </TabPane>
        )}
      </Tabs>
    </PageLayout>
  );
}
