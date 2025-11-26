import React, { useEffect } from 'react';
import { useLocation, useHistory } from 'react-router';
import queryString from 'query-string';
import { Spin } from 'antd';
import { getCacheLogin } from '@/services/login';
import { useTranslation } from 'react-i18next';
import './index.less';

const TransferPage: React.FC = () => {
  const { t } = useTranslation('common');
  const { search } = useLocation();
  const history = useHistory();
  const { redirect, cache_token } = queryString.parse(search) as Record<string, string>;

  useEffect(() => {
    const access_token = localStorage.getItem('access_token');
    const refresh_token = localStorage.getItem('refresh_token');
    // 是否登录
    if (!access_token || !refresh_token) {
      if (cache_token) {
        getCacheLogin({ cache_token }).then((res) => {
          const { access_token, refresh_token } = res.dat;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          history.push(redirect);
        });
      } else {
        history.push('/login');
      }
    }
  }, []);

  return (
    <div className='transfer-page'>
      {t('common:jump_loading')}
      <Spin />
    </div>
  );
};

export default TransferPage;
