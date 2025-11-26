import React, { useState } from 'react';
import { Table, Progress, Tooltip } from 'antd';
import _ from 'lodash';
import { useHistory, useLocation, Link } from 'react-router-dom';
import queryString from 'query-string';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { buildEsQuery } from '@/components/SearchBar/es-query';
import { handleTracesList, conversionTime } from './utils';
import { getServicetransactionsList } from '@/services/traces';
import Filter from './Filter';
import './locale';

// TODO 支持查询链路ID
interface ITracesProps {
  transactionName: string;
  serviceName: string;
  averageResponseTime: number;
  transactionsPerMinute: number;
  impact: number;
}

const Traces: React.FC = () => {
  const { t } = useTranslation('traces');
  const history = useHistory();
  const { search } = useLocation();
  const [traceList, setTraceList] = useState<ITracesProps[]>([]);
  const [loading, setLoading] = useState(false);
  const params = queryString.parse(search) as Record<string, string>;
  const columns = [
    {
      title: t('table.name'),
      dataIndex: 'transactionName',
      render: (val, record) => {
        return (
          <Link
            to={{
              pathname: '/service-tracking/transaction/view',
              search: `data_id=${record.data_id}&bgid=${record.bgid}&serviceName=${
                record.serviceName
              }&transactionName=${encodeURIComponent(val)}&transactionType=${record.transactionType}&environment=${
                record.environment
              }&start=${record.start}&end=${record.end}&filter=${encodeURIComponent(record.filter)}${
                params.fieldRecord ? `&fieldRecord=${encodeURIComponent(params.fieldRecord)}` : ''
              }`,
            }}
          >
            {val}
          </Link>
        );
      },
    },
    {
      title: t('table.service'),
      dataIndex: 'serviceName',
    },
    {
      title: t('table.type'),
      dataIndex: 'transactionType',
    },
    {
      title: t('table.delay'),
      dataIndex: 'averageResponseTime',
      sorter: (a, b) => a.averageResponseTime - b.averageResponseTime,
      render: (val: number) => `${Math.round(val / 1000)} ms`,
    },
    {
      title: t('table.track_num'),
      dataIndex: 'transactionsPerMinute',
      sorter: (a, b) => a.transactionsPerMinute - b.transactionsPerMinute,
      render: (val: number) => `${Math.round(val * 10) / 10} tpm`,
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
      pathname: '/traces',
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
      getServicetransactionsList(requestBody)
        .then((res) => {
          const data = _.get(res, 'aggregations.sample.transaction_groups.buckets') || [];
          const result = handleTracesList(data, startTime, endTime, data_id, filter, environment, bgid);
          setTraceList(result);
          setLoading(false);
        })
        .finally(() => {
          setLoading(false);
        });
    } catch (err) {
      setTraceList([]);
    }
  };

  return (
    <PageLayout title={t('title')}>
      <div>
        <div style={{ padding: '10px', minWidth: '1200px' }}>
          <Filter
            onRedirection={onRedirection}
            onRefresh={onRefresh}
            searchPlaceholder='搜索事务（例如 transaction.duration.us > 300000）'
          />
          <Table
            rowKey='id'
            size='small'
            columns={columns}
            dataSource={traceList}
            loading={loading}
            pagination={{
              total: traceList.length,
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

export default Traces;
