import React, { useState, useEffect, useRef } from 'react';
import { message, Space, Form, Input, Button } from 'antd';
import { useLocation, useHistory, useParams } from 'react-router-dom';
import { UserOutlined, LockOutlined, PictureOutlined } from '@ant-design/icons';
import {
  getSsoConfig,
  getRedirectURL,
  getRedirectURLCAS,
  getRedirectURLOAuth,
  getSsoConfigInit,
} from '@/services/login';
import { useTranslation } from 'react-i18next';
import { ifShowCaptcha, getCaptcha, authLogin } from '@/services/login';
import { getBusiGroups, getMenuPerm } from '@/services/common';
import { getCurBusiId } from '@/utils';
import './login.less';

export interface DisplayName {
  oidc: string;
  cas: string;
  oauth: string;
  weCom: string;
}

export default function Login() {
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();
  const { type } = useParams<{ type: string }>();
  const newHostname = window.location.hostname;
  const redirect = location.search && new URLSearchParams(location.search).get('redirect');
  const [displayName, setDis] = useState<DisplayName>();
  const [form] = Form.useForm();
  const verifyimgRef = useRef<HTMLImageElement>(null);
  const captchaidRef = useRef<string>();
  const [showcaptcha, setShowcaptcha] = useState(false);

  useEffect(() => {
    getSsoConfig().then((res) => {
      if (res.dat) {
        setDis({
          oidc: res.dat.oidcDisplayName,
          cas: res.dat.casDisplayName,
          oauth: res.dat.oauthDisplayName, // 用户中心
          weCom: res.dat.weComDisplayName, // 企微
        });
        if (res.dat.weComDisplayName === '') {
          history.push('/login/account');
        }
      }
    });
  }, []);

  const jumpToIdm = () => {
    getRedirectURLOAuth({ redirect: redirect }).then((res) => {
      if (res.dat) {
        window.location.href = res.dat;
      } else {
        message.warning('没有配置 OAuth 登录地址！');
        history.push('/login');
      }
    });
  };

  useEffect(() => {
    if (type === 'idm') {
      jumpToIdm();
    } else if (type === 'account') {
      ifShowCaptcha().then((res) => {
        setShowcaptcha(res?.dat?.show);
        if (res?.dat?.show) {
          getCaptcha().then((res) => {
            if (res.dat && verifyimgRef.current) {
              verifyimgRef.current.src = res.dat.imgdata;
              captchaidRef.current = res.dat.captchaid;
            } else {
              message.warning('获取验证码失败');
            }
          });
        }
      });
    } else {
      // 获取企业微信信息
      getSsoConfigInit().then((res) => {
        const info = res.dat.filter((item) => item.name === 'Wecom');
        if (info.length) {
          const wwInfo = JSON.parse(info[0].content);
          new (window as any).WwLogin({
            id: 'ww_qrcode',
            appid: wwInfo.CorpId,
            agentid: wwInfo.AgentId,
            // 本地测试
            // redirect_uri: encodeURI(
            //   `http://n9e.test.cndinsight.com/redir?to=http://10.200.0.18:8765/callback/wecom${
            //     redirect ? '?redirect=' + redirect : ''
            //   }`,
            // ),
            redirect_uri: encodeURI(`${wwInfo.Host}${redirect ? '?redirect=' + redirect : ''}`),
            lang: 'zh',
          });
        }
      });
    }
  }, [type]);

  const handleSubmit = async () => {
    form.validateFields().then(() => {
      login();
    });
  };

  const refreshCaptcha = () => {
    getCaptcha().then((res) => {
      if (res.dat && verifyimgRef.current) {
        verifyimgRef.current.src = res.dat.imgdata;
        captchaidRef.current = res.dat.captchaid;
      } else {
        message.warning('获取验证码失败');
      }
    });
  };

  const login = async () => {
    let { username, password, verifyvalue } = form.getFieldsValue();
    authLogin(username, password, captchaidRef.current!, verifyvalue)
      .then((res) => {
        const { dat, err } = res;
        const { access_token, refresh_token } = dat;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        if (!err) {
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
                window.location.href = redirect && redirect !== '' ? (redirect as string) : menuPerm.dat[0];
              });
            } else {
              history.push('/no-exist-bgid');
            }
          });
        }
      })
      .catch(() => {
        if (showcaptcha) {
          refreshCaptcha();
        }
      });
  };

  return type === 'idm' ? null : (
    <div className='login-warp'>
      <img
        src={'/image/login-left-top-corner.png'}
        className='left-top-bg'
        style={{ filter: 'hue-rotate(320deg) brightness(100%) saturate(520%)' }}
      ></img>
      <img
        src={'/image/login-right-bottom-corner.png'}
        className='right-bottom-bg'
        style={{ filter: 'hue-rotate(320deg) brightness(100%) saturate(520%)' }}
      ></img>
      <div className='login-panel'>
        <div className='login-main  integration'>
          {type !== 'account' ? (
            <>
              <div className='welcome-tip'>欢迎使用统一运维监控平台</div>
              <div id='ww_qrcode' className='ww_qrcode' />
            </>
          ) : (
            <>
              <div className='login-title'>
                <img src='/favicon.png' />
                监控平台
              </div>
              <Form form={form} layout='vertical' requiredMark={true}>
                <Form.Item
                  label='账户'
                  name='username'
                  rules={[
                    {
                      required: true,
                      message: t('请输入用户名'),
                    },
                  ]}
                >
                  <Input placeholder={t('请输入用户名')} prefix={<UserOutlined className='site-form-item-icon' />} />
                </Form.Item>
                <Form.Item
                  label='密码'
                  name='password'
                  rules={[
                    {
                      required: true,
                      message: t('请输入密码'),
                    },
                  ]}
                >
                  <Input
                    type='password'
                    placeholder={t('请输入密码')}
                    onPressEnter={handleSubmit}
                    prefix={<LockOutlined className='site-form-item-icon' />}
                  />
                </Form.Item>
                <div className='verifyimg-div'>
                  <Form.Item
                    label='验证码'
                    name='verifyvalue'
                    rules={[
                      {
                        required: showcaptcha,
                        message: t('请输入验证码'),
                      },
                    ]}
                    hidden={!showcaptcha}
                  >
                    <Input
                      placeholder={t('请输入验证码')}
                      onPressEnter={handleSubmit}
                      prefix={<PictureOutlined className='site-form-item-icon' />}
                    />
                  </Form.Item>

                  <img
                    ref={verifyimgRef}
                    style={{
                      display: showcaptcha ? 'inline-block' : 'none',
                      marginBottom: 16,
                    }}
                    onClick={refreshCaptcha}
                    alt='点击获取验证码'
                  />
                </div>

                <Form.Item>
                  <Button type='primary' onClick={handleSubmit}>
                    {t('登录')}
                  </Button>
                </Form.Item>
              </Form>
            </>
          )}

          <div className='login-other'>
            {(displayName?.cas || displayName?.oauth || displayName?.oidc || displayName?.weCom) && (
              <>
                <strong>其他登录方式：</strong>
                <Space split='|'>
                  {displayName.oidc !== '' && (
                    <a
                      onClick={() => {
                        getRedirectURL().then((res) => {
                          if (res.dat) {
                            window.location.href = res.dat;
                          } else {
                            message.warning('没有配置 OIDC 登录地址！');
                          }
                        });
                      }}
                    >
                      {displayName.oidc}
                    </a>
                  )}
                  {displayName.cas !== '' && (
                    <a
                      onClick={() => {
                        getRedirectURLCAS().then((res) => {
                          if (res.dat) {
                            window.location.href = res.dat.redirect;
                            localStorage.setItem('CAS_state', res.dat.state);
                          } else {
                            message.warning('没有配置 CAS 登录地址！');
                          }
                        });
                      }}
                    >
                      {displayName.cas}
                    </a>
                  )}
                  {displayName.oauth !== '' && <a onClick={jumpToIdm}>{displayName.oauth}</a>}
                  {displayName?.weCom !== '' && (
                    <a
                      onClick={() =>
                        history.push(
                          `/login/${type === 'account' ? 'workwx' : 'account'}${
                            redirect ? '?redirect=' + redirect : ''
                          }`,
                        )
                      }
                    >
                      {type === 'account' ? '企微登录' : '账号密码登录'}
                    </a>
                  )}
                </Space>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
