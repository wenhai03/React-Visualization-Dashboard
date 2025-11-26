import React, { useState } from 'react';
import { Table, Row, Col, Tabs, Collapse, Card } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import queryString from 'query-string';
import Filter from '../Filter';
import { useLocation, useHistory, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ErrorDistribution from '../components/ErrorDistribution';
import MetadataTable from '../components/MetadataTable';
import { buildEsQuery } from '@/components/SearchBar/es-query';
import { getAPMErrorTopErroneousTransactions, getAPMErrorDistribution, getAPMErrorMessage } from '@/services/traces';
import { conversionTime } from '../utils';
import './index.less';

const ErrorDetail: React.FC = () => {
  const { t } = useTranslation('traces');
  const { search } = useLocation();
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [topFiveData, setTopFiveData] = useState<any>([]);
  const [message, setMessage] = useState<any>([]);
  const [distributionLoading, setDistributionLoading] = useState(false);
  const [errorDistributionSeries, setErrorDistributionSeries] = useState<{ now: any; contrast?: any }>({ now: [] });
  const params = queryString.parse(search);

  const onRedirection = (formData) => {
    history.replace({
      pathname: '/service-tracking/error/view',
      search: `?data_id=${formData.data_id}&bgid=${formData.bgid}&serviceName=${formData.serviceName}&transactionType=${
        formData.transactionType
      }&environment=${formData.environment}&start=${formData.start}&end=${formData.end}&filter=${encodeURIComponent(
        formData.filter,
      )}&errorKey=${formData.errorKey}&contrast_time=${formData.contrast_time}${
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
      errorKey,
      contrast_time,
    } = params;
    const timeRange = conversionTime(startTime, endTime);
    const duration = timeRange.end - timeRange.start;
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
      getAPMErrorMessage(errorKey, {
        busi_group_id: Number(bgid),
        datasource_id: Number(data_id),
        service_name: serviceName,
        service_environment: environment,
        transaction_type: transactionType,
        kql: queryResult,
        start: timeRange.start,
        end: timeRange.end,
        group_key: errorKey,
      }).then((res) => {
        const data = _.get(res, 'dat.hits.hits[0]._source');
        const stackGroup: any = [];
        let count = -1;
        data?.error?.exception?.[0]?.stacktrace?.forEach((element) => {
          if (element.library_frame) {
            if (Array.isArray(stackGroup[count])) {
              stackGroup[count].push(
                `${element.classname}.${element.function}(${element.filename}:${element.line.number})`,
              );
            } else {
              count = count + 1;
              stackGroup[count] = [];
              stackGroup[count].push(
                `${element.classname}.${element.function}(${element.filename}:${element.line.number})`,
              );
            }
          } else {
            count = count + 1;
            stackGroup[count] = `${element.classname}.${element.function}(${element.filename}:${element.line.number})`;
          }
        });

        const result = {
          groupId: data.error.grouping_key,
          lastSeen: moment(data['@timestamp'], moment.ISO_8601).format('YYYY-MM-DD HH:mm:ss.SSS'),
          occurrences: res.dat.hits.total.value,
          type: data.error.exception[0].type,
          name: data.error.grouping_name,
          culprit: data.error.culprit,
          stackTrace: stackGroup,
          id: data.error.id,
          time: Math.round(data.timestamp.us / 1000),
          duration: 1000,
        };
        setMessage(result);
      });

      getAPMErrorTopErroneousTransactions({
        busi_group_id: Number(bgid),
        datasource_id: Number(data_id),
        service_name: serviceName,
        service_environment: environment,
        transaction_type: transactionType,
        kql: queryResult,
        start: timeRange.start,
        end: timeRange.end,
        contrast_time: Number(contrast_time),
        group_key: errorKey,
      }).then((res) => {
        const now = _.get(res, 'dat.now.aggregations.top_five_transactions.buckets');
        setTopFiveData(now);
      });
      setDistributionLoading(true);
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
        group_key: errorKey,
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
            time: nowResult?.[index]?.time,
            value: item.doc_count,
            type: contrast_time_text,
          }));
          setErrorDistributionSeries({ now: nowResult, contrast: contrastResult });
          setDistributionLoading(false);
        })
        .catch((err) => setDistributionLoading(false));
    } catch (err) {
      setMessage([]);
      setTopFiveData([]);
      setErrorDistributionSeries({ now: [] });
    }
  };

  return (
    <div className='apm-error-detail'>
      <Filter
        onRedirection={onRedirection}
        onRefresh={onRefresh}
        searchPlaceholder='搜索错误（例如 http.response.status_code >= 400）'
      />
      <div className='error-group-title'>
        {t('error_block')} {(params.errorKey as string)?.substring(0, 4)}
      </div>
      <div style={{ lineHeight: '26px', fontSize: '16px' }}>
        <div className='error-title'>{t('exception_msg')}</div>
        <div className='error-message'>{message.name}</div>
        <div className='error-title'>{t('reason')}</div>
        <div>{message.culprit}</div>
        <div className='error-title'>{t('occurrences')}</div>
        <div>{message.occurrences}</div>
      </div>
      <Row gutter={16}>
        <Col span={12}>
          <ErrorDistribution loading={distributionLoading} {...errorDistributionSeries} />
        </Col>
        <Col span={12}>
          <Card size='small' bodyStyle={{ paddingBottom: 0 }} style={{ height: '100%' }}>
            <Row justify='space-between'>
              <Col>{t('top_five')}</Col>
            </Row>
            <Table
              rowKey='groupId'
              size='small'
              scroll={{ y: 200 }}
              columns={[
                {
                  title: t('table.name'),
                  dataIndex: 'key',
                  render: (val) => {
                    return (
                      <Link
                        to={{
                          pathname: '/service-tracking/transaction/view',
                          search: `data_id=${params.data_id}&bgid=${params.bgid}&serviceName=${
                            params.serviceName
                          }&transactionName=${encodeURIComponent(val)}&transactionType=${
                            params.transactionType
                          }&environment=${params.environment}&start=${params.start}&end=${
                            params.end
                          }&filter=${encodeURIComponent(params.filter as string)}${
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
                  title: t('err_occurrences_num'),
                  dataIndex: 'doc_count',
                  width: 100,
                },
              ]}
              dataSource={topFiveData}
              loading={loading}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
      <Tabs>
        <Tabs.TabPane tab={t('exception_stack_trace')} key='stack'>
          <div className='error-message'>{message.name}</div>
          <Collapse ghost>
            {message.stackTrace?.map((item, stackIndex) =>
              Array.isArray(item) ? (
                <Collapse.Panel header={`${item.length} 个库帧`} key={stackIndex} className='apm-error-detail-collapse'>
                  {item.map((ele, index) => (
                    <div key={index} style={{ color: 'rgb(105, 112, 125)' }}>
                      <span className='stack-at-text'>at</span>
                      <span>{ele}</span>
                    </div>
                  ))}
                </Collapse.Panel>
              ) : (
                <div key={stackIndex} className='apm-error-detail-collapse'>
                  <span className='stack-at-text'>at</span>
                  <span>{item}</span>
                </div>
              ),
            )}
          </Collapse>
        </Tabs.TabPane>
        <Tabs.TabPane tab={t('metadata')} key='meta' className='traces-timeline-drawer'>
          <MetadataTable
            data_id={params.data_id as string}
            id={message.id}
            processorEvent='error'
            time={message.time}
            duration={message.duration}
            type='tab'
          />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default ErrorDetail;
