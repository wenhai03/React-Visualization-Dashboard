import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingOutlined } from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import BlankBusinessPlaceholder from '@/components/BlankBusinessPlaceholder';
import { CommonStateContext } from '@/App';
import List from './List';
import Add from './Add';
import Edit from './Edit';
import './locale';
import './style.less';

export { Add, Edit };

export default function AlertRules() {
  const { curBusiId } = useContext(CommonStateContext);
  const { t } = useTranslation('alertRules');

  return (
    <PageLayout title={t('title')} icon={<SettingOutlined />}>
      <div>{curBusiId ? <List bgid={curBusiId} /> : <BlankBusinessPlaceholder text='告警规则' />}</div>
    </PageLayout>
  );
}
