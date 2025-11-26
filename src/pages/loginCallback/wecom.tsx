import React, { useEffect, useState } from 'react';
import { useLocation, useHistory } from 'react-router';
import queryString from 'query-string';
import { useTranslation } from 'react-i18next';
import { Spin } from 'antd';
import { authCallbackWecom } from '@/services/login';
import { getBusiGroups, getMenuPerm } from '@/services/common';
import { getCurBusiId } from '@/utils';

export default function Wecom() {
  const location = useLocation();
  const history = useHistory();
  const { t } = useTranslation();
  const query = queryString.parse(location.search) as { code: string; redirect?: string };
  const [err, setErr] = useState();

  useEffect(() => {
    authCallbackWecom({
      code: query.code,
    })
      .then((res) => {
        if (res.err === '') {
          if (res.dat && res.dat.access_token && res.dat.refresh_token) {
            localStorage.setItem('access_token', res.dat.access_token);
            localStorage.setItem('refresh_token', res.dat.refresh_token);
            getBusiGroups().then((res) => {
              if (res.dat?.length) {
                const localBgid = getCurBusiId();
                if (localBgid) {
                  // 有缓存，判断缓存中的是否有权限
                  const localBusiItem = res.dat?.find((item) => item.id === localBgid);
                  !localBusiItem && localStorage.setItem('Busi-Group-Id', res.dat[0].id);
                } else {
                  // 没换成，默认第一个
                  res.dat?.length && localStorage.setItem('Busi-Group-Id', res.dat[0].id);
                }
                getMenuPerm().then((menuPerm) => {
                  window.location.href =
                    query.redirect && query.redirect !== '' ? (query.redirect as string) : menuPerm.dat[0];
                });
              } else {
                history.push('/no-exist-bgid');
              }
            });
          } else {
            console.log(res.dat);
          }
        } else {
          setErr(res.err);
        }
      })
      .catch((res) => {
        setErr(res.message);
      });
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        textAlign: 'center',
      }}
    >
      {err === undefined ? (
        <h1>
          {t('common:login.loading')}
          <Spin />
        </h1>
      ) : (
        <div>
          <h1>{t('common:login.third_party_error')}</h1>
          <div style={{ fontSize: 14 }}>{err}</div>
          <div>
            <a href='/login'>{t('common:login.goBack')}</a>
          </div>
        </div>
      )}
    </div>
  );
}
