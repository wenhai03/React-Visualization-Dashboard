import React, { useEffect, useState } from 'react';
import { useLocation, useHistory } from 'react-router';
import queryString from 'query-string';
import { authCallbackOAuth } from '@/services/login';
import { getBusiGroups, getMenuPerm } from '@/services/common';
import { getCurBusiId } from '@/utils';

export default function index() {
  const location = useLocation();
  const history = useHistory();
  const query = queryString.parse(location.search) as { code: string; redirect?: string };
  const [err, setErr] = useState();

  useEffect(() => {
    authCallbackOAuth({
      code: query.code,
    })
      .then((res) => {
        if (res.err === '') {
          if (res.dat && res.dat.access_token && res.dat.refresh_token) {
            localStorage.setItem('access_token', res.dat.access_token);
            localStorage.setItem('refresh_token', res.dat.refresh_token);
            localStorage.setItem('login_type', res.dat.login_type);
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
  if (err === undefined) return null;
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
      <div>
        <h1>第三方登录验证失败</h1>
        <div style={{ fontSize: 14 }}>{err}</div>
        <div>
          <a href='/login'>返回登录页</a>
        </div>
      </div>
    </div>
  );
}
