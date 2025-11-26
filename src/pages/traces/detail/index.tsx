import React from 'react';
import { Tabs, Breadcrumb, Space } from 'antd';
import { Helmet } from 'react-helmet';
import queryString from 'query-string';
import { useTranslation } from 'react-i18next';
import { useLocation, useHistory, useParams, Link } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import TrackItems from '../trackItems';
import TransactionList from '../components/TransactionList';
import ServiceIcons from '../components/ServiceIcons';
import { conversionTime } from '../utils';
import Error from '../error';
import Overview from '../overview';
import ErrorDetail from '../error/Detail';
import './index.less';
import '../locale';

interface Param {
  tab: string;
}

const Detail: React.FC = () => {
  const { search, pathname } = useLocation();
  const history = useHistory();
  const { t } = useTranslation('traces');
  const { tab = 'overview' } = useParams<Param>();
  const searchObj = queryString.parse(search) as any;
  const {
    data_id,
    bgid,
    serviceName,
    transactionName,
    transactionType,
    environment,
    start,
    end,
    filter,
    contrast_time,
    aggregation_type,
  } = searchObj;
  const baseSearch = `?data_id=${data_id}&bgid=${bgid}&serviceName=${serviceName}&transactionType=${transactionType}&environment=${environment}&start=${start}&end=${end}&filter=${encodeURIComponent(
    filter as string,
  )}${searchObj.fieldRecord ? `&fieldRecord=${encodeURIComponent(searchObj.fieldRecord as string)}` : ''}`;
  const timeRange = conversionTime(start, end);
  const duration = timeRange.end - timeRange.start;
  // 小于25小时（90000000），默认选择前一天，大于等于25小时，小于8天（691200000），默认选择上一周，大于等于8天，默认选择计算出来的日期
  let contrast_time_default =
    contrast_time === '0' ? contrast_time : duration < 90000000 ? '1' : duration >= 691200000 ? '100' : '7';

  return (
    <PageLayout
      title={
        <Breadcrumb separator='>' className='traces-detail-header-breadcrumb'>
          <Breadcrumb.Item key='bread-level-1'>
            <Link to={`/service-tracking${baseSearch}`}>{t('service_tracking.title')}</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item key='bread-level-2'>
            <Link
              to={`/service-tracking/overview${baseSearch}&contrast_time=${contrast_time_default}&aggregation_type=${
                aggregation_type || 'avg'
              }`}
            >
              <span className='breadcrumb-item-level' title={serviceName as string}>
                {serviceName}
              </span>
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item key='bread-level-3'>
            {transactionName ? (
              <Link
                to={`/service-tracking/${tab}${baseSearch}&contrast_time=${contrast_time_default}${
                  tab === 'transaction' ? `&aggregation_type=${aggregation_type || 'avg'}` : ''
                }`}
              >
                {t(tab!)}
              </Link>
            ) : (
              t(tab!)
            )}
          </Breadcrumb.Item>
          {transactionName && (
            <Breadcrumb.Item>
              <span className='breadcrumb-item-level last-level' title={transactionName as string}>
                {transactionName}
              </span>
            </Breadcrumb.Item>
          )}
        </Breadcrumb>
      }
    >
      <div id='traces-detail'>
        <Helmet title={`${t('service_tracking.title')} | 统一运维监控平台`}></Helmet>
        <div className='traces-detail-wrapper'>
          <div className='traces-detail-service-name'>
            <Space>
              {serviceName} <ServiceIcons {...(searchObj as any)} />
            </Space>
          </div>
          <Tabs
            size='large'
            onChange={(e) => {
              if (e === 'transaction' || e === 'overview') {
                history.push(
                  `/service-tracking/${e}${baseSearch}&contrast_time=${contrast_time_default}&aggregation_type=${
                    aggregation_type || 'avg'
                  }`,
                );
              } else {
                history.push(`/service-tracking/error${baseSearch}&contrast_time=${contrast_time_default}`);
              }
            }}
            activeKey={tab}
            className='traces-detail-tabs'
            destroyInactiveTabPane
          >
            <Tabs.TabPane tab={t('overview')} key='overview'>
              <Overview />
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('transaction')} key='transaction'>
              {pathname === '/service-tracking/transaction/view' ? <TrackItems {...searchObj} /> : <TransactionList />}
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('error')} key='error'>
              {pathname === '/service-tracking/error/view' ? <ErrorDetail /> : <Error />}
            </Tabs.TabPane>
          </Tabs>
        </div>
      </div>
    </PageLayout>
  );
};

export default Detail;
