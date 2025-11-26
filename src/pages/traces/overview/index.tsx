import React, { useState } from 'react';
import { Table, Row, Col, Card } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import queryString from 'query-string';
import { useLocation, useHistory, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Filter from '../Filter';
import Latency from '../components/Latency';
import ErrorRate from '../components/ErrorRate';
import Throughput from '../components/Throughput';
import { buildEsQuery } from '@/components/SearchBar/es-query';
import { getAPMLatency, getAPMErrorRate, getAPMErrorList, getAPMThroughput } from '@/services/traces';
import { conversionTime } from '../utils';

const Overview: React.FC = () => {
  const { t } = useTranslation('traces');
  const { search } = useLocation();
  const history = useHistory();
  const [errListLoading, setErrListLoading] = useState(false);
  const [errorRateLoading, setErrorRateLoading] = useState(false);
  const [latencyLoading, setLatencyLoading] = useState(false);
  const [throughputLoading, setThroughputLoading] = useState(false);
  const [throughputSeries, setThroughputeries] = useState<{ now: any; contrast?: any }>({ now: [] });
  const [errorRateSeries, setErrorRateSeries] = useState<{ now: any; contrast?: any }>({ now: [] });
  const [errorlist, setErrorList] = useState<any>([]);
  const [latencySeries, setLatencySeries] = useState<{ now: any; contrast?: any }>({ now: [] });
  const params = queryString.parse(search);
  const columns = [
    {
      title: t('spanType'),
      dataIndex: 'type',
      ellipsis: true,
      render: (val, record) => {
        return (
          <Link
            to={{
              pathname: '/service-tracking/error',
              search: `data_id=${params.data_id}&bgid=${params.bgid}&serviceName=${
                params.serviceName
              }&transactionType=${params.transactionType}&environment=${params.environment}&start=${params.start}&end=${
                params.end
              }&filter=error.exception.type:"${record.type}"&contrast_time=${params.contrast_time}${
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
      title: t('name'),
      dataIndex: 'name',
      ellipsis: true,
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
      title: t('lastSeen'),
      dataIndex: 'lastSeen',
      width: 100,
      render: (val: number) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: t('occurrences'),
      width: 70,
      dataIndex: 'occurrences',
    },
  ];

  const onRedirection = (formData) => {
    history.replace({
      pathname: '/service-tracking/overview',
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
      contrast_time,
      aggregation_type = 'avg',
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
      const requestParams = {
        busi_group_id: Number(bgid),
        datasource_id: Number(data_id),
        service_name: serviceName,
        service_environment: environment,
        transaction_type: transactionType,
        kql: queryResult,
        ...timeRange,
      };
      onRefreshErrorList(requestParams);
      onRefreshErrorRate({ ...requestParams, contrast_time: Number(contrast_time) }, contrast_time_text);
      onRefreshThroughput({ ...requestParams, contrast_time: Number(contrast_time) }, contrast_time_text);
      onRefreshLatency(
        { ...requestParams, contrast_time: Number(contrast_time), aggregation_type: aggregation_type },
        contrast_time_text,
        aggregation_type,
      );
    } catch (err) {
      setErrorList([]);
      setErrorRateSeries({ now: [] });
      setThroughputeries({ now: [] });
      setLatencySeries({ now: [] });
    }
  };

  const onRefreshErrorList = (requestParams) => {
    setErrListLoading(true);
    getAPMErrorList({
      ...requestParams,
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
        setErrorList(result);
        setErrListLoading(false);
      })
      .catch((err) => setErrListLoading(false));
  };

  const onRefreshErrorRate = (requestParams, contrast_time_text) => {
    setErrorRateLoading(true);
    getAPMErrorRate(requestParams)
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
        setErrorRateLoading(false);
      })
      .catch((err) => setErrorRateLoading(false));
  };

  const onRefreshLatency = (requestParams, contrast_time_text, aggregation_type) => {
    setLatencyLoading(true);
    getAPMLatency(requestParams)
      .then((res) => {
        setLatencyLoading(false);
        const now = _.get(res, 'dat.now.aggregations.latencyTimeseries.buckets');
        const contrast = _.get(res, 'dat.contrast.aggregations.latencyTimeseries.buckets');

        const nowResult = now?.map((item) => {
          const value =
            (aggregation_type === 'avg'
              ? item.latency.value
              : aggregation_type === '95th'
              ? item.latency.values?.['95.0']
              : item.latency.values?.['99.0']) / 1000;
          return {
            time: moment(item.key).format('YYYY-MM-DD HH:mm:ss'),
            value: Math.round(value) || 0,
            type: t(aggregation_type),
          };
        });

        const contrastResult = contrast?.map((item, index) => {
          const value =
            (aggregation_type === 'avg'
              ? item.latency.value
              : aggregation_type === '95th'
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
        setLatencyLoading(false);
      });
  };

  const onRefreshThroughput = (requestParams, contrast_time_text) => {
    setThroughputLoading(true);
    getAPMThroughput(requestParams)
      .then((res) => {
        const now = _.get(res, 'dat.now.aggregations.timeseries.buckets');
        const contrast = _.get(res, 'dat.contrast.aggregations.timeseries.buckets');
        const nowResult = now?.map((item) => ({
          time: moment(item.key).format('YYYY-MM-DD HH:mm:ss'),
          value: item?.throughput?.value || 0,
          type: t('throughput'),
        }));
        const contrastResult = contrast?.map((item, index) => ({
          time: nowResult?.[index]?.time,
          value: item?.throughput?.value || 0,
          type: contrast_time_text,
        }));
        setThroughputeries({ now: nowResult, contrast: contrastResult });
        setThroughputLoading(false);
      })
      .catch((err) => setThroughputLoading(false));
  };

  return (
    <>
      <Filter
        onRedirection={onRedirection}
        onRefresh={onRefresh}
        searchPlaceholder='搜索事务、错误和指标（例如 transaction.duration.us > 300000 AND http.response.status_code >= 400）'
      />
      <Row gutter={[16, 16]}>
        <Col span={12}>
          {/* 延迟 */}
          <Latency loading={latencyLoading} onRefresh={onRedirection} {...latencySeries} height={227} />
        </Col>
        <Col span={12}>
          {/* 吞吐量 */}
          <Throughput loading={throughputLoading} onRefresh={onRedirection} {...throughputSeries} />
        </Col>
        <Col span={8}>
          <ErrorRate onRefresh={onRedirection} loading={errorRateLoading} {...errorRateSeries} />
        </Col>
        <Col span={16}>
          <Card size='small' bodyStyle={{ paddingBottom: 0 }} style={{ height: '100%' }}>
            <Row justify='space-between'>
              <Col>{t('error')}</Col>
              <Col>
                <Link
                  to={{
                    pathname: '/service-tracking/error',
                    search: `data_id=${params.data_id}&bgid=${params.bgid}&serviceName=${
                      params.serviceName
                    }&transactionType=${params.transactionType}&environment=${params.environment}&start=${
                      params.start
                    }&end=${params.end}&filter=${encodeURIComponent(params.filter as string)}&contrast_time=${
                      params.contrast_time
                    }${params.fieldRecord ? `&fieldRecord=${encodeURIComponent(params.fieldRecord as string)}` : ''}`,
                  }}
                >
                  {t('view_error')}
                </Link>
              </Col>
            </Row>
            <Table
              className='traces-overview-table'
              rowKey='groupId'
              size='small'
              columns={columns}
              dataSource={errorlist}
              loading={errListLoading}
              pagination={{
                total: errorlist?.length,
                defaultPageSize: 3,
              }}
              style={{ height: 165 }}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default Overview;
