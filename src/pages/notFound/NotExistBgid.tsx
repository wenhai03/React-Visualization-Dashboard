import { Result, Button, Space } from 'antd';
import React from 'react';
import { getBusiGroups, getMenuPerm } from '@/services/common';
import { Logout, logOutOAuth } from '@/services/login';
import { useHistory } from 'react-router';

const NotExistBgid: React.FC = () => {
  const history = useHistory();
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
      <Result
        status='403'
        title='403'
        subTitle='没有业务组权限，请联系管理员!'
        extra={
          <Space>
            <Button
              type='primary'
              onClick={() => {
                getBusiGroups().then((res) => {
                  if (res.dat?.length) {
                    localStorage.setItem('Busi-Group-Id', res.dat[0].id);
                    getMenuPerm().then((menuPerm) => {
                      history.push(menuPerm.dat[0]);
                    });
                  }
                });
              }}
            >
              刷新
            </Button>
            <Button
              onClick={() => {
                Logout().then(() => {
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('refresh_token');
                  localStorage.removeItem('curBusiId');
                  // 用户中心登录的，在系统进行退出登录操作时，需要同时退出用户中心的登录
                  if (localStorage.getItem('login_type') === '3') {
                    logOutOAuth().then((res) => {
                      localStorage.removeItem('login_type');
                      window.location.href = res.dat;
                    });
                  } else {
                    history.push('/login');
                  }
                });
              }}
            >
              退出登录
            </Button>
          </Space>
        }
      />
    </div>
  );
};

export default NotExistBgid;
