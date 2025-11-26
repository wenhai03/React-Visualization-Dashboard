import React, { useContext, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import querystring from 'query-string';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Button, Space, Dropdown, Menu, Switch } from 'antd';
import { CommonStateContext } from '@/App';
import { RollbackOutlined, ShareAltOutlined } from '@ant-design/icons';
import { TimeRangePickerWithRefresh, IRawTimeRange } from '@/components/TimeRangePicker';
import BusiGroupSelect from '@/components/BusiGroupSelect';
import { AddPanelIcon } from '../config';
import { visualizations } from '../Editor/config';
import { dashboardTimeCacheKey } from './Detail';

interface IProps {
  dashboard: any;
  range: IRawTimeRange;
  setRange: (range: IRawTimeRange) => void;
  onAddPanel: (type: string) => void;
  onShareChart: () => void; // 仪表盘分享
  isPreview: boolean;
  isBuiltin: boolean;
  isAuthorized: boolean;
  gobackPath?: string;
  gobackSearch?: string;
}

export default function Title(props: IProps) {
  const { t, i18n } = useTranslation('dashboard');
  const { busiGroups, profile, curBusiId, curBusiGroup, fullScreenPanel, setFullScreenPanel, setMenuWidth } =
    useContext(CommonStateContext);
  const {
    dashboard,
    range,
    setRange,
    onAddPanel,
    isPreview,
    isBuiltin,
    isAuthorized,
    gobackPath,
    gobackSearch,
    onShareChart,
  } = props;
  const history = useHistory();
  const location = useLocation();
  const query = querystring.parse(location.search);
  const { viewMode, themeMode } = query;
  const busiGroupOption = busiGroups.map((item: any) => ({
    label: `${item.name}${item.perm === 'ro' ? '（只读）' : ''}`,
    value: item.id,
  }));
  // 监控仪表盘符合 isAuthorized 可操作，内置仪表盘，仅管理员可操作
  const isCreatePannel = isBuiltin ? profile.admin && !isPreview : isAuthorized;

  const handleGoBack = () => {
    console.log('history length=', history.length);
    if (history.length > 1) {
      history.goBack();
    } else {
      history.replace({
        pathname: gobackPath || '/dashboards',
        search: gobackSearch || '',
      });
    }
  };

  useEffect(() => {
    return () => {
      setFullScreenPanel(undefined);
      setMenuWidth(176);
    };
  }, []);

  return (
    <div className='dashboard-detail-header'>
      {dashboard.name && <Helmet title={`${dashboard.name} | 统一运维监控平台`}></Helmet>}
      <div className='dashboard-detail-header-left'>
        {isPreview && !isBuiltin ? null : <RollbackOutlined className='back' onClick={() => handleGoBack()} />}
        <div className='title'>{dashboard.name}</div>
      </div>
      <div className='dashboard-detail-header-right'>
        <Space>
          {!isPreview && <BusiGroupSelect disabled={true} value={curBusiId || ''} options={busiGroupOption as any} />}
          <div>
            {isCreatePannel && curBusiGroup.perm === 'rw' && (
              <Dropdown
                trigger={['click']}
                overlay={
                  <Menu>
                    {_.map([{ type: 'row', name: '分组' }, ...visualizations], (item) => {
                      return (
                        <Menu.Item
                          key={item.type}
                          onClick={() => {
                            onAddPanel(item.type);
                          }}
                        >
                          {i18n.language === 'en_US' ? item.type : item.name}
                        </Menu.Item>
                      );
                    })}
                  </Menu>
                }
              >
                <Button type='primary' icon={<AddPanelIcon />}>
                  {t('add_panel')}
                </Button>
              </Dropdown>
            )}
          </div>
          <Button icon={<ShareAltOutlined onClick={onShareChart} />} />
          <TimeRangePickerWithRefresh
            localKey={dashboardTimeCacheKey}
            dateFormat='YYYY-MM-DD HH:mm:ss'
            // refreshTooltip={t('refresh_tip', { num: getStepByTimeAndStep(range, step) })}
            value={range}
            onChange={setRange}
          />
          {!isPreview && (
            <Button
              onClick={() => {
                if (fullScreenPanel) {
                  setFullScreenPanel(undefined);
                } else {
                  const newQuery = _.omit(query, ['viewMode', 'themeMode']);
                  if (!viewMode) {
                    newQuery.viewMode = 'fullscreen';
                    setMenuWidth(0);
                  } else {
                    setMenuWidth(176);
                  }
                  history.replace({
                    pathname: location.pathname,
                    search: querystring.stringify(newQuery),
                  });
                  // TODO: 解决仪表盘 layout resize 问题
                  setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                  }, 500);
                }
              }}
            >
              {fullScreenPanel
                ? t('common:btn.restore')
                : viewMode === 'fullscreen'
                ? t('exit_full_screen')
                : t('full_screen')}
            </Button>
          )}
          {viewMode === 'fullscreen' && (
            <Switch
              checkedChildren='dark'
              unCheckedChildren='light'
              checked={themeMode === 'dark'}
              onChange={(checked) => {
                const newQuery = _.omit(query, ['themeMode']);
                if (checked) {
                  newQuery.themeMode = 'dark';
                }
                history.replace({
                  pathname: location.pathname,
                  search: querystring.stringify(newQuery),
                });
              }}
            />
          )}
        </Space>
      </div>
    </div>
  );
}
