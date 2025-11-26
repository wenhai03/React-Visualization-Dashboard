import React, { useState } from 'react';
import { Table, Row, Col } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import queryString from 'query-string';
import { useLocation, useHistory, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ErrorDistribution from '../components/ErrorDistribution';
import ErrorRate from '../components/ErrorRate';
import Filter from '../Filter';
import { buildEsQuery } from '@/components/SearchBar/es-query';
import { getAPMErrorRate, getAPMErrorList, getAPMErrorDistribution } from '@/services/traces';
import { conversionTime } from '../utils';

const Error: React.FC = () => {
  const { t } = useTranslation('traces');
  const { search } = useLocation();
  const history = useHistory();
  const [countLoading, setCountLoading] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<any>([]);
  const [errorDistributionSeries, setErrorDistributionSeries] = useState<{ now: any; contrast?: any }>({ now: [] });
  const [errorRateSeries, setErrorRateSeries] = useState<{ now: any; contrast?: any }>({ now: [] });
  const params = queryString.parse(search);
  const columns = [
    {
      title: '组 ID',
      dataIndex: 'groupId',
      render: (val, record) => {
        return (
          <Link
            to={{
              pathname: '/service-tracking/error/view',
              search: `data_id=${params.data_id}&bgid=${params.bgid}&serviceName=${
                params.serviceName
              }&transactionName=${encodeURIComponent(val)}&transactionType=${params.transactionType}&environment=${
                params.environment
              }&start=${params.start}&end=${params.end}&filter=${encodeURIComponent(
                params.filter as string,
              )}&errorKey=${record.groupId}&contrast_time=${params.contrast_time}${
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
      title: t('spanType'),
      dataIndex: 'type',
    },
    {
      title: t('error_cause'),
      dataIndex: 'name',
      render: (val: number, record) => (
        <>
          <div style={{ fontWeight: 'bold' }}>{val}</div>
          <div>{record.culprit}</div>
        </>
      ),
    },
    {
      title: t('lastSeen'),
      dataIndex: 'lastSeen',
      render: (val: number) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: t('occurrences'),
      dataIndex: 'occurrences',
    },
  ];

  const onRedirection = (formData) => {
    history.replace({
      pathname: '/service-tracking/error',
      search: `?data_id=${formData.data_id}&bgid=${formData.bgid}&serviceName=${formData.serviceName}&transactionType=${
        formData.transactionType
      }&environment=${formData.environment}&start=${formData.start}&end=${formData.end}&filter=${encodeURIComponent(
        formData.filter,
      )}&contrast_time=${formData.contrast_time}${
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
      contrast_time,
    } = params;
    const timeRange = conversionTime(startTime, endTime);
    const duration = timeRange.end - timeRange.start;
    // 小于25小时（90000000），默认选择前一天，大于等于25小时，小于8天（691200000），默认选择上一周，大于等于8天，默认选择计算出来的日期
    let contrast_time_text =
      duration < 90000000
        ? t('the_day_before')
        : duration >= 691200000
        ? `${moment(moment(timeRange.start).valueOf() - duration).format('YYYY-MM-DD HH:mm:ss')}-${moment(
            timeRange.start,
          ).format('YYYY-MM-DD HH:mm:ss')}`
        : t('the_previous_week');
    const fieldRecord = params.fieldRecord;
    const historyRecord = fieldRecord ? JSON.parse(fieldRecord) : [];
    try {
      const queryResult = buildEsQuery(filter, historyRecord);
      setLoading(true);
      getAPMErrorList({
        busi_group_id: Number(bgid),
        datasource_id: Number(data_id),
        service_name: serviceName,
        service_environment: environment,
        transaction_type: transactionType,
        kql: queryResult,
        start: timeRange.start,
        end: timeRange.end,
        sort_direction: 'desc',
      })
        .then((res) => {
          const data = _.get(res, 'dat.aggregations.error_groups.buckets');
          const result = data?.map((item) => ({
            groupId: item.key,
            lastSeen: moment(item.sample.hits.hits[0]['_source']['@timestamp'], moment.ISO_8601).format(
              'YYYY-MM-DD HH:mm:ss.SSS',
            ),
            occurrences: item.doc_count,
            type: item.sample.hits.hits[0]['_source'].error.exception[0].type,
            name: item.sample.hits.hits[0]['_source'].error.exception[0].message,
            culprit: item.sample.hits.hits[0]['_source'].error.culprit,
          }));
          setList(result);
          setLoading(false);
        })
        .catch((err) => setLoading(false));
      setCountLoading(true);
      getAPMErrorDistribution({
        busi_group_id: Number(bgid),
        datasource_id: Number(data_id),
        service_name: serviceName,
        service_environment: environment,
        transaction_type: transactionType,
        kql: queryResult,
        start: timeRange.start,
        end: timeRange.end,
        contrast_time: Number(contrast_time),
      })
        .then((res) => {
          const now = _.get(res, 'dat.now.aggregations.distribution.buckets');
          const contrast = _.get(res, 'dat.contrast.aggregations.distribution.buckets');
          const nowResult = now?.map((item) => ({
            time: moment(item.key).format('YYYY-MM-DD HH:mm:ss'),
            value: item.doc_count,
            type: t('occurrences'),
          }));
          const contrastResult = contrast?.map((item, index) => ({
            // TODO x轴坐标按照当前的时间来算，所以要加上对比时间
            time: nowResult?.[index]?.time,
            value: item.doc_count,
            type: contrast_time_text,
          }));
          setErrorDistributionSeries({ now: nowResult, contrast: contrastResult });
          setCountLoading(false);
        })
        .catch((err) => setCountLoading(false));
      onRefreshErrorRate(timeRange, queryResult);
    } catch (err) {
      setList([]);
      setErrorDistributionSeries({ now: [] });
      setErrorRateSeries({ now: [] });
    }
  };

  const onRefreshErrorRate = ({ start, end }, queryResult) => {
    const { data_id, bgid, filter, environment, transactionType, serviceName, contrast_time } = params;
    const duration = end - start;
    let contrast_time_text =
      duration < 90000000
        ? t('the_day_before')
        : duration >= 691200000
        ? `${moment(moment(start).valueOf() - duration).format('YYYY-MM-DD HH:mm:ss')}-${moment(start).format(
            'YYYY-MM-DD HH:mm:ss',
          )}`
        : t('the_previous_week');
    setRateLoading(true);
    getAPMErrorRate({
      busi_group_id: Number(bgid),
      datasource_id: Number(data_id),
      service_name: serviceName,
      service_environment: environment,
      transaction_type: transactionType,
      kql: queryResult,
      start,
      end,
      contrast_time: Number(contrast_time),
    })
      .then((res) => {
        const now = _.get(res, 'dat.now.aggregations.timeseries.buckets');
        const contrast = _.get(res, 'dat.contrast.aggregations.timeseries.buckets');
        const nowResult = now?.map((item) => {
          const failure = item.outcomes.buckets?.find((ele) => ele.key === 'failure')?.doc_count || 0;
          return {
            time: moment(item.key).format('YYYY-MM-DD HH:mm:ss'),
            value: item.outcomes.buckets?.length ? (failure / item.doc_count) * 100 : null,
            type: t('failed_rate'),
          };
        });
        const contrastResult = contrast?.map((item, index) => {
          const failure = item.outcomes.buckets?.find((ele) => ele.key === 'failure')?.doc_count || 0;
          return {
            time: nowResult?.[index]?.time,
            value: item.outcomes.buckets?.length ? (failure / item.doc_count) * 100 : null,
            type: contrast_time_text,
          };
        });
        setErrorRateSeries({ now: nowResult, contrast: contrastResult });
        setRateLoading(false);
      })
      .catch((err) => setRateLoading(false));
  };

  return (
    <>
      <Filter
        onRedirection={onRedirection}
        onRefresh={onRefresh}
        searchPlaceholder='搜索错误（例如 http.response.status_code >= 400）'
      />
      <Row gutter={16}>
        <Col span={12}>
          <ErrorDistribution loading={countLoading} {...errorDistributionSeries} />
        </Col>
        <Col span={12}>
          <ErrorRate onRefresh={onRedirection} loading={rateLoading} {...errorRateSeries} />
        </Col>
      </Row>
      <Table
        rowKey='groupId'
        size='small'
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={{
          total: list?.length,
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

export default Error;
