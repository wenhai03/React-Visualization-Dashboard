import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { SettingOutlined } from '@ant-design/icons';
import BlankBusinessPlaceholder from '@/components/BlankBusinessPlaceholder';
import { CommonStateContext } from '@/App';
import PageTable from './PageTable';
import Edit from './edit';
import Add from './add';
import './locale';

export { Edit, Add };

const Strategy: React.FC = () => {
  const { curBusiId } = useContext(CommonStateContext);
  const { t } = useTranslation('recordingRules');

  return (
    <PageLayout title={t('title')} icon={<SettingOutlined />}>
      <div className='strategy-content'>
        {curBusiId ? <PageTable bgid={curBusiId}></PageTable> : <BlankBusinessPlaceholder text={t('title')} />}
      </div>
    </PageLayout>
  );
};

export default Strategy;
