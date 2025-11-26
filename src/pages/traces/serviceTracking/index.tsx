import React, { useState } from 'react';
import { Table, Tooltip, Tag, Space } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { useHistory, useLocation, Link } from 'react-router-dom';
import queryString from 'query-string';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { buildEsQuery } from '@/components/SearchBar/es-query';
import { conversionTime } from '../utils';
import { calculateThroughputWithRange } from '@/pages/homepage/utils';
import { getTransactionStats, getErrorMetricDoc } from '@/services/traces';
import { getAlertKql } from '@/services/common';
import { getAgentIcon } from '@/pages/traces/utils/getIcon';
import Filter from '../Filter';
import '../locale';
import './index.less';

interface ITracesProps {
  transactionName: string;
  serviceName: string;
  averageResponseTime: number;
  transactionsPerMinute: number;
  impact: number;
}

const ServiceTracking: React.FC = () => {
  const { t } = useTranslation('traces');
  const history = useHistory();
  const { search } = useLocation();
  const params = queryString.parse(search) as Record<string, string>;
  const [serviceList, setServiceList] = useState<ITracesProps[]>([]);
  const [loading, setLoading] = useState(false);
  const columns = [
    {
      title: t('service_name'),
      dataIndex: 'serviceName',
      render: (val, record) => {
        const timeRange = conversionTime(params.start, params.end);
        const duration = timeRange.end - timeRange.start;
        // 小于25小时（90000000），默认选择前一天，大于等于25小时，小于8天（691200000），默认选择上一周，大于等于8天，默认选择计算出来的日期
        let contrast_time_default = duration < 90000000 ? '1' : duration >= 691200000 ? '100' : '7';
        return (
          <Link
            to={{
              pathname: '/service-tracking/overview',
              search: `data_id=${params.data_id}&bgid=${params.bgid}&serviceName=${val}&transactionType=${
                params.transactionType
              }&environment=${params.environment}&start=${params.start}&end=${params.end}&filter=${encodeURIComponent(
                params.filter,
              )}&contrast_time=${contrast_time_default}&aggregation_type=avg${
                params.fieldRecord ? `&fieldRecord=${encodeURIComponent(params.fieldRecord)}` : ''
              }`,
            }}
          >
            <Space className='service-tracking-agent-icon'>
              {getAgentIcon(record.agentName)}
              {val}
            </Space>
          </Link>
        );
      },
    },
    {
      title: t('service_environment'),
      dataIndex: ['environments'],
      render: (val: string[]) =>
        val?.length > 1 ? (
          <Tooltip
            placement='right'
            title={val.map((item) => (
              <div>{item}</div>
            ))}
          >
            <Tag color='blue' style={{ cursor: 'pointer' }}>
              {val.length} 个环境
            </Tag>
          </Tooltip>
        ) : val?.length ? (
          <Tag>{val?.[0]}</Tag>
        ) : (
          '-'
        ),
    },
    {
      title: t('table.type'),
      dataIndex: 'transactionType',
      render: (val: string[]) =>
        val?.length > 1 ? (
          <Tooltip
            placement='right'
            title={val.map((item) => (
              <div>{item}</div>
            ))}
          >
            <Tag color='blue' style={{ cursor: 'pointer' }}>
              {val.length} 个类型
            </Tag>
          </Tooltip>
        ) : val?.length ? (
          <Tag>{val?.[0]}</Tag>
        ) : (
          '-'
        ),
    },
    {
      title: t('table.delay'),
      dataIndex: 'latency',
      sorter: (a, b) => a.latency - b.latency,
      render: (val: number) => `${val} ms`,
    },
    {
      title: t('table.throughput'),
      dataIndex: 'throughput',
      sorter: (a, b) => {
        if (typeof a.throughput === 'string') return -1;
        if (typeof b.throughput === 'string') return 1;
        return a.throughput - b.throughput;
      },
      render: (val: number | string) =>
        typeof val === 'number' ? (val > 0.1 ? `${val.toFixed(1)} tpm` : '<0.1 tpm') : val,
    },
    {
      title: t('table.failed_transaction_rate'),
      dataIndex: 'transactionErrorRate',
      sorter: (a, b) => {
        if (typeof a.transactionErrorRate === 'string') return -1;
        if (typeof b.transactionErrorRate === 'string') return 1;
        return a.transactionErrorRate - b.transactionErrorRate;
      },
      render: (val: number | string) => (typeof val === 'number' ? `${(val * 100).toFixed(1)} %` : val),
    },
  ];

  const onRedirection = (formData) => {
    history.replace({
      pathname: '/service-tracking',
      search: `?data_id=${formData.data_id}&bgid=${formData.bgid}&environment=${formData.environment}&transactionType=${
        formData.transactionType ?? ''
      }&start=${formData.start}&end=${formData.end}&filter=${encodeURIComponent(formData.filter)}${
        formData.fieldRecord ? `&fieldRecord=${encodeURIComponent(formData.fieldRecord)}` : ''
      }`,
    });
  };

  const onRefresh = (params) => {
    const { data_id, bgid, start: startTime, end: endTime, filter, environment, transactionType } = params;
    const timeRange = conversionTime(startTime, endTime);
    const fieldRecord = params.fieldRecord;
    const historyRecord = fieldRecord ? JSON.parse(fieldRecord) : [];
    try {
      const queryResult = buildEsQuery(filter, historyRecord);
      const requestBody = {
        busi_group_id: Number(bgid),
        datasource_id: Number(data_id),
        service_environment: environment,
        transaction_type: transactionType,
        kql: queryResult,
        ...timeRange,
      };
      setLoading(true);
      Promise.all([getTransactionStats(requestBody), getErrorMetricDoc(requestBody)])
        .then(([transactionStats, service]) => {
          const newTransactionStats = {};
          const transactionStatsData = _.get(transactionStats, 'aggregations.sample.services.buckets') || [];
          const serviceData = _.get(service, 'aggregations.sample.services.buckets') || [];
          transactionStatsData.forEach((element) => {
            // 事务类型
            const transactionType = element.transactionType.buckets;
            // 失败总数
            const failureNum = transactionType?.reduce((preValue, currentValue) => {
              const num = currentValue.outcomes?.buckets?.find((ele) => ele.key === 'failure')?.doc_count || 0;
              return preValue + num;
            }, 0);
            // 成功总数
            const successNum = transactionType?.reduce((preValue, currentValue) => {
              const num = currentValue.outcomes?.buckets?.find((ele) => ele.key === 'success')?.doc_count || 0;
              return preValue + num;
            }, 0);
            // 平均值
            const avg_duration_value = transactionType?.reduce((preValue, currentValue) => {
              const num = (currentValue?.avg_duration?.value || 0) / 1000;
              return preValue + num;
            }, 0);
            // 延迟
            const latency =
              avg_duration_value === 0
                ? 0
                : avg_duration_value > 10
                ? Math.round(avg_duration_value / transactionType.length)
                : (avg_duration_value / transactionType.length).toFixed(1);
            // 吞吐量
            const throughput = transactionType?.reduce((preValue, currentValue) => {
              const num = currentValue?.doc_count
                ? calculateThroughputWithRange({
                    start: timeRange.start,
                    end: timeRange.end,
                    value: currentValue.doc_count,
                  })
                : 0;
              return preValue + num;
            }, 0);
            // 环境
            const environments = transactionType?.reduce((preValue, currentValue) => {
              const list = currentValue?.environments?.buckets?.map((ele) => ele.key) || [];
              return [...preValue, ...list];
            }, []);

            // 事务指标获取 图标 agent.name 。优先取 request、page-load 否则取第一个
            const topTransactionTypeBucket =
              transactionType.find(({ key }) => key === 'request' || key === 'page-load') ?? transactionType[0];

            newTransactionStats[element.key] = {
              ...element,
              agentName: topTransactionTypeBucket.sample.top[0].metrics['agent.name'],
              latency,
              throughput,
              transactionErrorRate: failureNum ? failureNum / (failureNum + successNum) : 0,
              transactionType: transactionType?.map((ele) => ele.key),
              environments: [...new Set(environments)],
            };
          });
          let result = [];
          if (serviceData.length) {
            result = serviceData.map((item) =>
              newTransactionStats[item.key]
                ? {
                    data_id,
                    bgid,
                    agentName: item.latest.top[0].metrics['agent.name'],
                    environments: item.environments?.buckets?.map((ele) => ele.key) || [],
                    latency: newTransactionStats[item.key].latency,
                    serviceName: item.key,
                    throughput: newTransactionStats[item.key].transactionType.length
                      ? newTransactionStats[item.key].throughput
                      : t('service_tracking.not_available'),
                    transactionErrorRate: newTransactionStats[item.key].transactionType.length
                      ? newTransactionStats[item.key].transactionErrorRate
                      : t('service_tracking.not_available'),
                    transactionType: newTransactionStats[item.key]?.transactionType,
                  }
                : {
                    data_id,
                    bgid,
                    agentName: item.latest.top[0].metrics['agent.name'],
                    environments: item.environments?.buckets?.map((ele) => ele.key) || [],
                    latency: 0,
                    serviceName: item.key,
                    throughput: t('service_tracking.not_available'),
                    transactionErrorRate: t('service_tracking.not_available'),
                    transactionType: '',
                  },
            );
          } else {
            result = transactionStatsData.map((item) => {
              return {
                data_id,
                bgid,
                agentName: newTransactionStats[item.key].agentName,
                environments: newTransactionStats[item.key]?.environments,
                latency: newTransactionStats[item.key].latency,
                serviceName: item.key,
                throughput: newTransactionStats[item.key].transactionType.length
                  ? newTransactionStats[item.key].throughput
                  : t('service_tracking.not_available'),
                transactionErrorRate: newTransactionStats[item.key].transactionType.length
                  ? newTransactionStats[item.key].transactionErrorRate
                  : t('service_tracking.not_available'),
                transactionType: newTransactionStats[item.key]?.transactionType,
              };
            });
          }
          result = result.sort(function (a: any, b: any) {
            return a.serviceName.localeCompare(b.serviceName);
          });
          setServiceList(result);
          setLoading(false);
        })
        .finally(() => {
          setLoading(false);
        });
    } catch (err) {
      setServiceList([]);
    }
  };

  if (params.id) {
    getAlertKql({ his_alert_id: params.id }).then((res) => {
      const { service_environment, transaction_type, start, end, kql, datasource_id, busi_group_id } = res.dat;
      history.replace({
        pathname: '/service-tracking',
        search: `?data_id=${datasource_id}&bgid=${busi_group_id}&environment=${service_environment}&transactionType=${transaction_type}&start=${moment(
          start,
        ).format('YYYY-MM-DD HH:mm:ss')}&end=${moment(end).format('YYYY-MM-DD HH:mm:ss')}&filter=${encodeURIComponent(
          kql,
        )}`,
      });
    });
    return null;
  }

  return (
    <PageLayout title={t('service_tracking.title')}>
      <div>
        <div style={{ padding: '10px', minWidth: '1200px' }}>
          <Filter
            onRedirection={onRedirection}
            onRefresh={onRefresh}
            searchPlaceholder='搜索事务、错误和指标（例如 transaction.duration.us > 300000 AND http.response.status_code >= 400）'
          />
          <Table
            rowKey='id'
            size='small'
            columns={columns}
            dataSource={serviceList}
            loading={loading}
            pagination={{
              total: serviceList.length,
              showQuickJumper: true,
              showSizeChanger: true,
              showTotal: (total) => {
                return t('common:table.total', { total });
              },
              pageSizeOptions: ['15', '50', '100', '300'],
              defaultPageSize: 30,
            }}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default ServiceTracking;
