import React, { ReactNode, useContext, useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { useRequest } from 'ahooks';
import { Helmet } from 'react-helmet';
import md5 from 'js-md5';
import _ from 'lodash';
import { RollbackOutlined, SettingOutlined } from '@ant-design/icons';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useTranslation, Trans } from 'react-i18next';
import { Menu, Dropdown, Alert, Affix, message, Modal } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { Logout, logOutOAuth } from '@/services/login';
import { CommonStateContext } from '@/App';
import { getDatasourceBriefList } from '@/services/common';
import { getPlatformNotification } from '@/services/config';
import Encoding from '@/components/Encoding';
import RegexpTool from '@/components/RegexpTool';
import { containBusiGroups, containBusiGroupsStartWidth } from '@/utils/constant';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import './index.less';
import './locale';
import WaterMarkContent from '@/components/WaterMarkContent ';
import BusiGroupSelect from '@/components/BusiGroupSelect';

interface IPageLayoutProps {
  className?: string;
  icon?: ReactNode;
  title?: String | JSX.Element;
  secondTitle?: String | JSX.Element;
  children?: ReactNode;
  introIcon?: ReactNode;
  rightArea?: ReactNode;
  customArea?: ReactNode;
  showBack?: Boolean;
  backPath?: string;
  backSearch?: string;
  docFn?: Function;
}

interface IOptions {
  label: string;
  value: number | string;
}

// 业务组分组展示
const specialBusiGroupPathname = [
  '/targets',
  '/dial/node-management',
  '/targets/event',
  '/log/collection',
  '/dial-task',
  '/alert-his-events',
  '/alert-cur-events',
];

/* 平台通知 */
const NotifyAlert: React.FC<{ currentNotify: { maintenance_mode: 'on' | 'off' | ''; platform_notify: string } }> = ({
  currentNotify,
}) => {
  return (
    <Alert
      description={
        <div
          className='ql-editor platform-notification-alert'
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentNotify.platform_notify) }}
        />
      }
      type='warning'
      showIcon={false}
      closable={currentNotify.maintenance_mode !== 'on'}
      // 关闭的时候会将当前的告警内容缓存，下一次轮询如果内容不同则重新打开通知，否则通知一直关闭
      afterClose={() => window.localStorage.setItem('platformNotification', md5(currentNotify.platform_notify))}
    />
  );
};

const PageLayout: React.FC<IPageLayoutProps> = ({
  className,
  icon,
  title,
  secondTitle,
  rightArea,
  introIcon,
  children,
  customArea,
  showBack,
  backPath,
  backSearch,
  docFn,
}) => {
  const { t, i18n } = useTranslation('pageLayout');
  const history = useHistory();
  const { pathname, search } = useLocation();
  const {
    profile,
    busiGroups,
    menuLoading,
    setCurBusiId,
    curBusiId,
    setDatasourceList,
    setCurBusiGroup,
    initBoot,
    setInitBoot,
  } = useContext(CommonStateContext);
  const query = queryString.parse(search);
  const { id, bgid } = query as { id: string; bgid: string; isInit: string };
  // 触发下拉手动切换业务组
  const [currentGroupId, setCurrentGroupId] = useState(id ? id : curBusiId);
  const prePlatformNotification = window.localStorage.getItem('platformNotification');
  const [currentNotify, setCurrentNotify] = useState<{ maintenance_mode: 'on' | 'off' | ''; platform_notify: string }>({
    maintenance_mode: '',
    platform_notify: '',
  });
  const [joyrideData, setJoyrideData] = useState<any>({}); // 控制 Joyride 的渲染
  const [allOption, setAllOption] = useState<{ label: string; options: IOptions[] }[] | IOptions[]>();
  const lastString = pathname.match(/[^\/]*$/)?.[0] ?? '';
  const startWithPathname = pathname.replace(lastString, '');
  const initType = joyrideData?.ds_prometheus
    ? 'ds_prometheus'
    : joyrideData?.ds_elasticsearch
    ? 'ds_elasticsearch'
    : joyrideData?.ms_area
    ? 'ms_area'
    : undefined;
  // 当前路由是否需要业务组
  const isRequiredBgid =
    Object.keys(containBusiGroups).includes(pathname) ||
    Object.keys(containBusiGroupsStartWidth).includes(startWithPathname);

  const menu = (
    <Menu>
      <Menu.Item
        onClick={() => {
          history.push('/account/profile/info');
        }}
      >
        {t('profile')}
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          history.push('/account/session');
        }}
      >
        {t('common:active_session')}
      </Menu.Item>
      <Menu.Item
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
        {t('logout')}
      </Menu.Item>
    </Menu>
  );

  const resetDataSource = (id) => {
    const newCurBusiGroup = busiGroups.filter((item) => item.id === id)?.[0];
    setCurBusiGroup(newCurBusiGroup);
    getDatasourceBriefList().then((res) => {
      setDatasourceList(res);
    });
  };

  useEffect(() => {
    if (bgid && Number(bgid) !== curBusiId && busiGroups.length) {
      const matchGroup = busiGroups.filter((item) => item.id === Number(bgid));
      if (matchGroup.length) {
        resetDataSource(Number(bgid));
        setCurBusiId(Number(bgid));
        setCurrentGroupId(Number(bgid));
        message.success('当前业务组已进行变更');
      } else {
        history.push('/no-found-bgid');
      }
    }
  }, [bgid]);

  // 手动下拉更新业务组
  const changeBusiGroup = (value) => {
    // 标识是通过下拉变更业务组
    if (Number(value) > 0) {
      // 更新全局缓存中的业务组
      setCurBusiId(value);
      // 更新数据源
      resetDataSource(value);
      if (specialBusiGroupPathname.includes(pathname) && !bgid) {
        history.push(pathname);
      } else {
        const newQuery: any = { ...query };
        newQuery.bgid = value;
        const newSearch = Object.entries(newQuery).map(([key, value]) => {
          return `${key}=${value}`;
        });
        history.push({
          pathname: pathname,
          search: `?${newSearch.join('&')}`,
        });
      }
    } else if (specialBusiGroupPathname.includes(pathname)) {
      history.push(`${pathname}?id=${value}`);
    }
    // 下拉选中
    setCurrentGroupId(value);
  };

  // 平台通知轮询
  const { run } = useRequest(getPlatformNotification, {
    pollingInterval: 60000,
    manual: true,
    onSuccess: (data) => {
      const current = data.dat.platform_notify === '' ? data.dat.platform_notify : md5(data.dat.platform_notify);
      if (prePlatformNotification !== current) {
        setCurrentNotify(data.dat);
      }
    },
  });

  useEffect(() => {
    run();
  }, []);

  // 监听目标元素的渲染
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const target = document.querySelector('.init-boot');
      if (target) {
        setJoyrideData(initBoot);
        observer.disconnect(); // 找到目标后停止监听
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [initBoot]);

  useEffect(() => {
    const busiGroupOption = busiGroups.map((item: any) => ({
      label: `${item.name}${item.perm === 'ro' ? '（只读）' : ''}`,
      value: item.id,
    }));
    const pathWithAll = ['/targets/event', '/alert-his-events', '/alert-cur-events'];
    if (pathname === '/targets') {
      // 机器列表
      setAllOption([
        {
          label: t('common:default_filter'),
          options: [
            ...(profile.admin ? [{ label: t('common:ungrouped_targets'), value: '0' }] : []),
            { label: t('common:all_targets'), value: '-1' },
          ],
        },
        {
          label: t('common:business_group'),
          options: busiGroupOption,
        },
      ]);
    } else if (pathname === '/dial/node-management') {
      // 网络拨测-节点管理
      setAllOption([
        {
          label: t('common:default_filter'),
          options: [{ label: t('common:public_host'), value: 'public' }],
        },
        {
          label: t('common:business_group'),
          options: busiGroupOption,
        },
      ]);
    } else if (pathWithAll.includes(pathname)) {
      setAllOption([
        {
          label: t('common:default_filter'),
          options: [{ label: t('common:all'), value: '-1' }],
        },
        {
          label: t('common:business_group'),
          options: busiGroupOption,
        },
      ]);
    } else if (pathname === '/log/collection' || pathname === '/dial-task') {
      setAllOption(
        profile.admin
          ? [
              {
                label: t('common:default_filter'),
                options: [{ label: t('common:all'), value: '0' }],
              },
              {
                label: t('common:business_group'),
                options: busiGroupOption,
              },
            ]
          : busiGroupOption,
      );
    } else {
      setAllOption(busiGroupOption);
    }
  }, [pathname, busiGroups]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const newInitBoot = _.cloneDeep(initBoot);
    const { action, index, status, type, step } = data;
    // 检测引导流程完成
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      if (initBoot?.ms_area) {
        delete newInitBoot.ds_elasticsearch;
        setJoyrideData(newInitBoot);
        setInitBoot(newInitBoot);
        history.push('/help/collector-management?tab=ms_area');
      }
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setJoyrideData({ ...initBoot, [initType!]: { ...initBoot[initType!], stepIndex: nextStepIndex } });
      setInitBoot({ ...initBoot, [initType!]: { ...initBoot[initType!], stepIndex: nextStepIndex } });
      if (action === ACTIONS.PREV) {
        step?.data?.pre && history.push(step?.data?.pre);
      } else {
        step?.data?.next && history.push(step?.data?.next);
      }
    }
  };

  return (
    <>
      <WaterMarkContent />
      <div className={className ? 'page-wrapper ' + className : 'page-wrapper'}>
        {title && <Helmet title={`${title} | 统一运维监控平台`}></Helmet>}
        {customArea ? (
          <Affix offsetTop={0.1} className={'page-top-header'}>
            {customArea}
            {currentNotify.platform_notify !== '' && md5(currentNotify.platform_notify) !== prePlatformNotification && (
              <div className='quill' style={{ paddingBottom: '10px' }}>
                <NotifyAlert currentNotify={currentNotify} />
              </div>
            )}
          </Affix>
        ) : (
          <Affix offsetTop={0.1} className={'page-top-header'}>
            <>
              <div className={'page-header-content'}>
                <div className={'page-header-title'}>
                  {showBack && (
                    <RollbackOutlined
                      onClick={() => {
                        if (backPath) {
                          history.push({
                            pathname: backPath,
                            search: backSearch,
                          });
                        } else {
                          history.goBack();
                        }
                      }}
                      style={{
                        marginRight: '5px',
                      }}
                    />
                  )}
                  {icon ? icon : showBack ? <></> : <SettingOutlined />}
                  {title}
                  {secondTitle && secondTitle}
                </div>
                <div className={'page-header-right-area'}>
                  {isRequiredBgid && (
                    <BusiGroupSelect
                      disabled={
                        containBusiGroups[pathname] === 'ro' || containBusiGroupsStartWidth[startWithPathname] === 'ro'
                      }
                      value={currentGroupId || ''}
                      onChange={(value) => changeBusiGroup(value)}
                      options={allOption as any}
                    />
                  )}
                  {rightArea}
                  {introIcon}
                  {/* 整合版本关闭文档链接 */}
                  {/* {import.meta.env.VITE_IS_COMMON_DS !== 'true' && (
                  <div style={{ marginRight: 32, position: 'relative', cursor: 'pointer' }}>
                    <span onClick={() => showDrawer()}>{t('docs')}</span>
                  </div>
                )} */}
                  <a href='/docs' target='_blank' style={{ marginRight: 20, color: '#333752' }}>
                    {t('docs')}
                  </a>
                  <span
                    className='language'
                    onClick={() => {
                      let language = i18n.language == 'en_US' ? 'zh_CN' : 'en_US';
                      i18n.changeLanguage(language);
                      localStorage.setItem('language', language);
                    }}
                  >
                    {i18n.language == 'zh_CN' ? 'EN' : '中'}
                  </span>
                  <Dropdown
                    overlay={
                      <Menu>
                        {/* 加密工具 */}
                        <Menu.Item
                          key='encrypt'
                          onClick={() => {
                            Modal.info({
                              width: 500,
                              icon: null,
                              okText: t('common:btn.close'),
                              okType: 'default',
                              content: <Encoding type='encrypt' />,
                              onOk() {},
                            });
                          }}
                        >
                          {t('common:tool.encrypt')}
                        </Menu.Item>
                        {/* {profile.admin && (
                          // 解密工具
                          <Menu.Item
                            key='decrypt'
                            onClick={() => {
                              Modal.info({
                                width: 500,
                                icon: null,
                                okText: t('common:btn.close'),
                                okType: 'default',
                                content: <Encoding type='decrypt' />,
                                onOk() {},
                              });
                            }}
                          >
                            {t('common:tool.decrypt')}
                          </Menu.Item>
                        )} */}
                        {/* 正则小工具 */}
                        <Menu.Item
                          key='regexp'
                          onClick={() => {
                            Modal.info({
                              width: 600,
                              icon: null,
                              okText: t('common:btn.close'),
                              okType: 'default',
                              content: <RegexpTool />,
                              onOk() {},
                            });
                          }}
                        >
                          {t('common:tool.regular_gadget')}
                        </Menu.Item>
                      </Menu>
                    }
                  >
                    <SettingOutlined style={{ cursor: 'pointer', marginRight: '20px' }} />
                  </Dropdown>
                  <Dropdown overlay={menu} trigger={['click']}>
                    <span className='avator'>
                      <img src={profile.portrait || '/image/avatar1.png'} alt='' />
                      <span className='display-name'>{profile.nickname || profile.username}</span>
                      <DownOutlined />
                    </span>
                  </Dropdown>
                </div>
              </div>
              {currentNotify.platform_notify !== '' &&
                md5(currentNotify.platform_notify) !== prePlatformNotification && (
                  <NotifyAlert currentNotify={currentNotify} />
                )}
            </>
          </Affix>
        )}
        {isRequiredBgid && !curBusiId ? (
          <div>
            <div className='blank-busi-holder'>
              <p style={{ textAlign: 'left', fontWeight: 'bold' }}>
                <InfoCircleOutlined style={{ color: '#1473ff' }} /> {t('common:task.tip.title')}
              </p>
              <Trans ns='pageLayout' i18nKey='pageLayout:busigroup_empty_tip'>
                <Link to='/busi-groups'>创建业务组</Link>
              </Trans>
            </div>
          </div>
        ) : (
          <>
            {!menuLoading && children && children}
            {initType && children && (
              <Joyride
                continuous
                run={joyrideData[initType]?.run}
                hideCloseButton
                steps={joyrideData[initType]?.steps}
                stepIndex={joyrideData[initType]?.stepIndex}
                callback={initType === 'ds_elasticsearch' ? handleJoyrideCallback : undefined}
                styles={{
                  options: {
                    zIndex: 2,
                  },
                  tooltipTitle: {
                    textAlign: 'left',
                  },
                  tooltipContainer: {
                    backgroundColor: '#fff',
                    color: '#000000d9',
                    borderRadius: '2px',
                  },
                  tooltipContent: {
                    fontSize: '14px',
                    color: '#000000d9',
                    padding: 0,
                    textAlign: 'left',
                  },
                }}
              />
            )}
          </>
        )}
      </div>
    </>
  );
};

export default PageLayout;
