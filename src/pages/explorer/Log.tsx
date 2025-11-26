import React from 'react';
import { LineChartOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import Explorer from './Explorer';
import './index.less';

const MetricExplorerPage = () => {
  const { t } = useTranslation('explorer');

  return (
    <PageLayout title={t('title')} icon={<LineChartOutlined />}>
      <div className='prometheus-page'>
        <Explorer type='logging' defaultCate='elasticsearch' />
      </div>
    </PageLayout>
  );
};

export default MetricExplorerPage;
