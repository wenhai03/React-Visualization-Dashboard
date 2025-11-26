import React, { useState } from 'react';
import { Table, Tooltip, Progress } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import queryString from 'query-string';
import { useLocation, useHistory, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Filter from '../../Filter';
import Latency from '../Latency';
import { buildEsQuery } from '@/components/SearchBar/es-query';
import { getTransactionsList, getAPMLatency } from '@/services/traces';
import { calculateThroughputWithRange } from '@/pages/homepage/utils';
import { conversionTime } from '../../utils';

const TransactionList: React.FC = () => {
  const { t } = useTranslation('traces');
  const { search } = useLocation();
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [list, setList] = useState<any>([]);
  const [latencySeries, setLatencySeries] = useState<{ now: any; contrast?: any }>({ now: [] });
  const params = queryString.parse(search);
  const columns = [
    {
      title: t('table.name'),
      dataIndex: 'name',
      render: (val) => {
        return (
          <Link
            to={{
              pathname: '/service-tracking/transaction/view',
              search: `data_id=${params.data_id}&bgid=${params.bgid}&serviceName=${
                params.serviceName
              }&transactionName=${encodeURIComponent(val)}&transactionType=${params.transactionType}&environment=${
                params.environment
              }&start=${params.start}&end=${params.end}&filter=${encodeURIComponent(params.filter as string)}${
                params.fieldRecord ? `&fieldRecord=${encodeURIComponent(params.fieldRecord as string)}` : ''
              }`,
            }}
          >
            {val}
          </Link>
        );
      },
    },
    {
      title: t('table.type'),
      dataIndex: 'transactionType',
    },
    {
      title: `${t('table.delay')}(${t(`table.${params.aggregation_type}`)})`,
      dataIndex: 'latency',
      sorter: (a, b) => {
        const aValue =
          (params.aggregation_type === 'avg'
            ? a.latency.value
            : params.aggregation_type === '95th'
            ? a.latency.values?.['95.0']
            : a.latency.values?.['99.0']) / 1000;
        const bValue =
          (params.aggregation_type === 'avg'
            ? b.latency.value
            : params.aggregation_type === '95th'
            ? b.latency.values?.['95.0']
            : b.latency.values?.['99.0']) / 1000;
        return aValue - bValue;
      },
      render: (val: any) => {
        const value =
          (params.aggregation_type === 'avg'
            ? val.value
            : params.aggregation_type === '95th'
            ? val.values?.['95.0']
            : val.values?.['99.0']) / 1000;
        return `${value > 10 ? Math.round(value) : value.toFixed(1)} ms`;
      },
    },
    {
      title: t('table.throughput'),
      dataIndex: 'throughput',
      sorter: (a, b) => a.throughput - b.throughput,
      render: (val: number) => `${val > 0.1 ? (val > 10 ? Math.round(val) : val.toFixed(1)) : '<0.1'} tpm`,
    },
    {
      title: t('table.failed_transaction_rate'),
      dataIndex: 'errorRate',
      sorter: (a, b) => a.errorRate - b.errorRate,
      render: (val: number) => `${val} %`,
    },
    {
      title: t('table.impact'),
      dataIndex: 'impact',
      sorter: (a, b) => a.impact - b.impact,
      render: (val: number) => (
        <Tooltip title={`${Math.round(val * 10) / 10}%`}>
          <Progress percent={val} showInfo={false} strokeColor='#1890ff' />
        </Tooltip>
      ),
    },
  ];

  const onRedirection = (formData) => {
    history.replace({
      pathname: '/service-tracking/transaction',
      search: `?data_id=${formData.data_id}&bgid=${formData.bgid}&serviceName=${formData.serviceName}&transactionType=${
        formData.transactionType
      }&environment=${formData.environment}&start=${formData.start}&end=${formData.end}&filter=${encodeURIComponent(
        formData.filter,
      )}&contrast_time=${formData.contrast_time}&aggregation_type=${formData.aggregation_type}${
        formData.fieldRecord ? `&fieldRecord=${encodeURIComponent(formData.fieldRecord)}` : ''
      }`,
    });
  };

  const onRefresh = (params) => {
    const {
      data_id,
      bgid,
      start: startTime,
      end: endTime,
      filter,
      environment,
      transactionType,
      serviceName,
      aggregation_type,
      contrast_time,
    } = params;
    const timeRange = conversionTime(startTime, endTime);
    const fieldRecord = params.fieldRecord;
    const historyRecord = fieldRecord ? JSON.parse(fieldRecord) : [];
    try {
      const queryResult = buildEsQuery(filter, historyRecord);
      const requestBody = {
        busi_group_id: Number(bgid),
        datasource_id: Number(data_id),
        service_name: serviceName,
        service_environment: environment,
        transaction_type: transactionType,
        kql: queryResult,
        latency_type: aggregation_type,
        ...timeRange,
      };
      setLoading(true);
      getTransactionsList(requestBody)
        .then((res) => {
          const data = _.get(res, 'aggregations.transaction_groups.buckets');
          const totalDuration = _.get(res, 'aggregations.total_duration.value');
          const result = data.map((item) => {
            const failureNum = item?.['event.outcome']?.buckets?.find((ele) => ele.key === 'failure')?.doc_count || 0;
            const successNum = item?.['event.outcome']?.buckets?.find((ele) => ele.key === 'success')?.doc_count || 0;
            const transactionGroupTotalDuration = item.transaction_group_total_duration.value || 0;
            return {
              name: item.key,
              latency: item.latency,
              throughput: calculateThroughputWithRange({
                start: timeRange.start,
                end: timeRange.end,
                value: item.doc_count,
              }),
              errorRate: failureNum ? ((failureNum / (failureNum + successNum)) * 100).toFixed(1) : 0,
              impact: totalDuration ? (transactionGroupTotalDuration * 100) / totalDuration : 0,
              transactionType: item.transaction_type.top[0].metrics['transaction.type'],
            };
          });
          setList(result);
          setLoading(false);
        })
        .finally(() => {
          setLoading(false);
        });
      onRefreshLatency({
        busi_group_id: Number(bgid),
        datasource_id: Number(data_id),
        service_name: serviceName,
        service_environment: environment,
        transaction_type: transactionType,
        kql: queryResult,
        contrast_time: Number(contrast_time),
        aggregation_type: aggregation_type || 'avg',
        ...timeRange,
      });
    } catch (err) {
      setList([]);
      setLatencySeries({ now: [] });
    }
  };

  const onRefreshLatency = (requestParams) => {
    const duration = requestParams.end - requestParams.start;
    // 小于25小时（90000000），默认选择前一天，大于等于25小时，小于8天（691200000），默认选择上一周，大于等于8天，默认选择计算出来的日期
    let contrast_time_text =
      duration < 90000000
        ? t('the_day_before')
        : duration >= 691200000
        ? `${moment(moment(requestParams.start).valueOf() - duration).format('YYYY-MM-DD HH:mm:ss')}-${moment(
            requestParams.start || requestParams.start,
          ).format('YYYY-MM-DD HH:mm:ss')}`
        : t('the_previous_week');
    setChartLoading(true);
    getAPMLatency(requestParams)
      .then((res) => {
        setChartLoading(false);
        const now = _.get(res, 'dat.now.aggregations.latencyTimeseries.buckets');
        const contrast = _.get(res, 'dat.contrast.aggregations.latencyTimeseries.buckets');
        const nowResult = now?.map((item) => {
          const value =
            (requestParams.aggregation_type === 'avg'
              ? item.latency.value
              : requestParams.aggregation_type === '95th'
              ? item.latency.values?.['95.0']
              : item.latency.values?.['99.0']) / 1000;
          return {
            time: moment(item.key).format('YYYY-MM-DD HH:mm:ss'),
            value: Math.round(value) || 0,
            type: t(requestParams.aggregation_type),
          };
        });

        const contrastResult = contrast?.map((item, index) => {
          const value =
            (requestParams.aggregation_type === 'avg'
              ? item.latency.value
              : requestParams.aggregation_type === '95th'
              ? item.latency.values?.['95.0']
              : item.latency.values?.['99.0']) / 1000;
          return {
            time: nowResult?.[index]?.time,
            value: Math.round(value) || 0,
            type: contrast_time_text,
          };
        });
        setLatencySeries({ now: nowResult, contrast: contrastResult });
      })
      .catch((err) => {
        setChartLoading(false);
      });
  };

  return (
    <>
      <Filter
        onRedirection={onRedirection}
        onRefresh={onRefresh}
        searchPlaceholder='搜索事务（例如 transaction.duration.us > 300000）'
      />
      <Latency
        loading={chartLoading}
        onRefresh={onRedirection}
        now={latencySeries.now}
        contrast={latencySeries.contrast}
      />
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={{
          total: list.length,
          showQuickJumper: true,
          showSizeChanger: true,
          showTotal: (total) => {
            return t('common:table.total', { total });
          },
          pageSizeOptions: ['15', '50', '100', '300'],
          defaultPageSize: 30,
        }}
      />
    </>
  );
};

export default TransactionList;
