import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import PageLayout from '@/components/pageLayout';
import ChangeLog from './components/ChangeLog';
import { RollbackOutlined } from '@ant-design/icons';
import './locale';

const AgentEvent: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation('targets');
  const { search } = useLocation();
  const { id } = queryString.parse(search) as { id?: string };

  return (
    <PageLayout
      title={t('changelogs')}
      icon={<RollbackOutlined className='back' onClick={() => history.push('/targets')} />}
    >
      <div>
        <div style={{ padding: '10px' }}>
          <ChangeLog id={id} history={history} />
        </div>
      </div>
    </PageLayout>
  );
};

export default AgentEvent;
