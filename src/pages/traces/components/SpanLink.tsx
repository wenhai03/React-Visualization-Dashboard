import React, { useState, useContext, useEffect } from 'react';
import { Table, Alert, Row, Col, Select, Dropdown, Menu, Button, Space } from 'antd';
import _ from 'lodash';
import queryString from 'query-string';
import moment from 'moment';
import { asDuration } from '@/pages/traces/utils';
import { EllipsisOutlined } from '@ant-design/icons';
import { useLocation, useHistory, Link } from 'react-router-dom';
import { CommonStateContext } from '@/App';
import { getAPMLinksDetail } from '@/services/traces';
import { useTranslation } from 'react-i18next';
import SearchBar from '@/components/SearchBar';
import { buildEsQuery } from '@/components/SearchBar/es-query';
import { getAPMTransactionInfo } from '@/services/traces';
import { copyToClipBoard } from '@/utils';
import { conversionTime, roundToNearestMinute, getBufferedTimerange } from '../utils';
import { iconForNode } from '@/pages/traces/utils/getIcon';

interface Props {
  data_id: number;
  curBusiId: number;
  linkedChildren?: { trace_id: string; span_id: string }[];
  linkedParents?: { trace_id: string; span_id: string }[];
  timeRange: { start: number; end: number };
  onClose: () => void;
  setLoading: (loading) => void;
}

const SpanLink: React.FC<Props> = (props) => {
  const { t } = useTranslation('traces');
  const history = useHistory();
  const { search } = useLocation();
  const [spanLinks, setSpanLinks] = useState<any>([]);
  const { transactionType, environment, start, end, fieldRecord } = queryString.parse(search) as Record<string, string>;
  const { ESIndex } = useContext(CommonStateContext);
  const { data_id, curBusiId, linkedChildren, linkedParents, timeRange, onClose, setLoading } = props;
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const [fieldcaps, setFieldcaps] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  // 过滤条件
  const [query, setQuery] = useState('');
  const [type, setType] = useState(linkedChildren?.length ? 'in' : 'out');

  const featchData = () => {
    const queryResult = buildEsQuery(query, []);
    const { startWithBuffer, endWithBuffer } = getBufferedTimerange(timeRange);
    const params = {
      busi_group_id: curBusiId,
      datasource_id: data_id,
      span_links: type === 'in' ? linkedChildren : linkedParents,
      start: startWithBuffer,
      end: endWithBuffer,
      kql: queryResult,
    };
    const spanIdsMap = _.keyBy(params.span_links, 'span_id');
    setTableLoading(true);
    getAPMLinksDetail(params)
      .then((res) => {
        const data =
          res.dat?.hits?.hits?.filter(({ _source: source }) => {
            if (source.processor.event === 'span') {
              const span = source;
              const hasSpanId = spanIdsMap[span.span.id] || false;
              return hasSpanId;
            }
            return true;
          }) || [];
        setSpanLinks(data.map((item) => item._source));
        setTableLoading(false);
      })
      .catch((err) => setTableLoading(false));
  };

  const jumpToDetail = (record) => {
    const { startWithBuffer, endWithBuffer } = getBufferedTimerange(timeRange);
    const requestParams = {
      busi_group_id: curBusiId,
      datasource_id: data_id,
      transaction_id: record.transaction.id,
      start: startWithBuffer,
      end: endWithBuffer,
    };
    setLoading(true);
    getAPMTransactionInfo(requestParams)
      .then((res) => {
        const source = _.get(res, ['dat', 'hits', 'hits', 0, '_source']);
        const spanStart = roundToNearestMinute({
          timestamp: source['@timestamp'],
          direction: 'down',
        });
        const spanEnd = roundToNearestMinute({
          timestamp: source['@timestamp'],
          diff: source.transaction.duration.us / 1000,
          direction: 'up',
        });
        const startValue = moment(spanStart, moment.ISO_8601).format('YYYY-MM-DD HH:mm:ss');
        const endValue = moment(spanEnd, moment.ISO_8601).format('YYYY-MM-DD HH:mm:ss');
        setLoading(false);
        onClose && onClose();
        history.push({
          pathname: '/service-tracking/transaction/view',
          search: `?data_id=${data_id}&bgid=${curBusiId}&serviceName=${
            source.service.name
          }&transactionName=${encodeURIComponent(source.transaction.name)}&traceId=${source.trace.id}&transactionId=${
            source.transaction.id
          }&all_trace=false&transactionType=&environment=ENVIRONMENT_ALL&start=${startValue}&end=${endValue}&filter=&spanId=${
            record.span?.id || 'null'
          }&flag=${Date.now()}${fieldRecord ? `&fieldRecord=${encodeURIComponent(fieldRecord)}` : ''}`,
        });
      })
      .catch((err) => setLoading(false));
  };

  useEffect(() => {
    featchData();
  }, [refreshFlag, type]);

  return (
    <div>
      <Alert
        message={t('span_link.title')}
        description={t('span_link.description')}
        type='info'
        showIcon
        style={{ marginBottom: '10px' }}
      />
      <Row gutter={8}>
        <Col flex='auto'>
          <SearchBar
            curBusiId={curBusiId}
            datasourceValue={data_id}
            indexPatterns={ESIndex.elastic_apm_index}
            timeRange={timeRange}
            size={50}
            query={query}
            timeField='@timestamp'
            onChange={(value) => setQuery(value)}
            onSubmit={() => setRefreshFlag(_.uniqueId('refresh_'))}
            fields={fieldcaps}
            refreshFieldcaps={(val) => setFieldcaps(val)}
            placeholder='搜索事务（例如 transaction.duration.us > 300000）'
          />
        </Col>
        <Col flex='100px'>
          <Select style={{ width: '100%' }} value={type} onChange={(e) => setType(e)}>
            <Select.Option value='in' key='in' disabled={!Boolean(linkedChildren?.length)}>
              {t('span_link.in')}（{linkedChildren?.length || 0}）
            </Select.Option>
            <Select.Option value='out' key='out' disabled={!Boolean(linkedParents?.length)}>
              {t('span_link.out')}（{linkedParents?.length || 0}）
            </Select.Option>
          </Select>
        </Col>
      </Row>

      <Table
        size='small'
        rowKey='id'
        bordered
        columns={[
          {
            title: t('service_name'),
            dataIndex: ['service', 'name'],
            width: 200,
            render: (val, record) => {
              const timeRange = conversionTime(start, end);
              const duration = timeRange.end - timeRange.start;
              // 小于25小时（90000000），默认选择前一天，大于等于25小时，小于8天（691200000），默认选择上一周，大于等于8天，默认选择计算出来的日期
              let contrast_time_default = duration < 90000000 ? '1' : duration >= 691200000 ? '100' : '7';
              return (
                <Link
                  to={{
                    pathname: '/service-tracking/overview',
                    search: `data_id=${data_id}&bgid=${curBusiId}&serviceName=${val}&transactionType=${transactionType}&environment=${environment}&start=${start}&end=${end}&filter=&contrast_time=${contrast_time_default}&aggregation_type=avg${
                      fieldRecord ? `&fieldRecord=${encodeURIComponent(fieldRecord)}` : ''
                    }`,
                  }}
                >
                  {val}
                </Link>
              );
            },
          },
          {
            title: t('span_link.span'),
            dataIndex: ['span', 'name'],
            render: (val, record) => (
              <a onClick={() => jumpToDetail(record)}>
                <Space>
                  <img
                    style={{ width: '24px', height: '24px' }}
                    src={iconForNode({
                      'span.subtype': record?.span?.subtype,
                      'span.type': record?.span?.type,
                    })}
                  />
                  {val || record.transaction.name}
                </Space>
              </a>
            ),
          },
          {
            title: t('span_link.span_time'),
            dataIndex: ['span', 'duration', 'us'],
            width: '100px',
            render: (val, record) => asDuration(Number(val || record.transaction.duration.us)),
          },
          {
            title: t('common:table.operations'),
            width: '60px',
            render(value, record) {
              return (
                <Dropdown
                  trigger={['click']}
                  overlay={
                    <Menu>
                      <Menu.Item
                        key='jupm_to_trace'
                        onClick={() => {
                          const { startWithBuffer, endWithBuffer } = getBufferedTimerange(timeRange);
                          const requestParams = {
                            busi_group_id: curBusiId,
                            datasource_id: data_id,
                            transaction_id: record.transaction.id,
                            start: startWithBuffer,
                            end: endWithBuffer,
                          };
                          setLoading(true);
                          getAPMTransactionInfo(requestParams)
                            .then((res) => {
                              const source = _.get(res, ['dat', 'hits', 'hits', 0, '_source']);
                              const spanStart = roundToNearestMinute({
                                timestamp: source['@timestamp'],
                                direction: 'down',
                              });
                              const spanEnd = roundToNearestMinute({
                                timestamp: source['@timestamp'],
                                diff: source.transaction.duration.us / 1000,
                                direction: 'up',
                              });
                              const startValue = moment(spanStart, moment.ISO_8601).format('YYYY-MM-DD HH:mm:ss');
                              const endValue = moment(spanEnd, moment.ISO_8601).format('YYYY-MM-DD HH:mm:ss');
                              setLoading(false);
                              onClose && onClose();
                              history.push({
                                pathname: '/service-tracking/transaction/view',
                                search: `?data_id=${data_id}&bgid=${curBusiId}&serviceName=${
                                  source.service.name
                                }&transactionName=${encodeURIComponent(source.transaction.name)}&traceId=${
                                  source.trace.id
                                }&transactionId=${
                                  source.transaction.id
                                }&all_trace=false&transactionType=&environment=ENVIRONMENT_ALL&start=${startValue}&end=${endValue}&filter=&flag=${Date.now()}${
                                  fieldRecord ? `&fieldRecord=${encodeURIComponent(fieldRecord)}` : ''
                                }`,
                              });
                            })
                            .catch((err) => setLoading(false));
                        }}
                      >
                        {t('span_link.jump_to_trace')}
                      </Menu.Item>
                      <Menu.Item key='copy_trace_id' onClick={() => copyToClipBoard(record.trace.id, (val) => val)}>
                        {t('span_link.copy_trace_id')}
                      </Menu.Item>
                      <Menu.Item key='jump_to_detail' onClick={() => jumpToDetail(record)}>
                        {t('span_link.jump_to_span_detail')}
                      </Menu.Item>
                      <Menu.Item
                        key='copy_span_id'
                        onClick={() => copyToClipBoard(record.span?.id || record.transaction.id, (val) => val)}
                      >
                        {t('span_link.copy_span_id')}
                      </Menu.Item>
                    </Menu>
                  }
                >
                  <Button type='link'>
                    <EllipsisOutlined />
                  </Button>
                </Dropdown>
              );
            },
          },
        ]}
        style={{ marginTop: '10px' }}
        scroll={{ y: 'calc(100vh - 503px)' }}
        dataSource={spanLinks}
        loading={tableLoading}
        pagination={{
          total: spanLinks.length,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => t('common:table.total', { total }),
          showSizeChanger: true,
          defaultPageSize: 10,
        }}
      />
    </div>
  );
};

export default SpanLink;
