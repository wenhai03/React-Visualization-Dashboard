import React, { useState, useContext, useEffect } from 'react';
import { Select, Row, Col, Tooltip, Spin, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { buildEsQuery } from '@/components/SearchBar/es-query';
import { getWaterfall, calculationTime } from '@/pages/traces/utils';
import { getTracesSamples } from '@/services/traces';
import moment from 'moment';
import { CommonStateContext } from '@/App';
import { getLogSearch } from '@/services/logs';
import { getAPMTransactionsList, getAPMTransactionsErrorList, getAPMTransactionsLinksList } from '@/services/traces';
import { getApmConfig } from '@/services/config';
import { getFieldcaps } from '@/services/warning';
import { getFieldsForWildcard } from '@/components/SearchBar/utils';
import TraceGraph from '@/pages/traces/components/TraceGraph';
import { getTransactionsList } from '@/services/traces';
import { getLogConfig } from '@/services/config';
import '@/pages/traces/locale';

const INITIAL_DATA = {
  traceItems: {
    errorDocs: [],
    traceDocs: [],
    exceedsMax: false,
    spanLinksCountById: {},
    traceItemCount: 0,
    maxTraceItems: 0,
  },
  entryTransaction: undefined,
};

interface ITraceProps {
  all_trace?: 'true' | 'false';
  data_id?: string;
  bgid?: string;
  transactionType?: string;
  serviceName?: string;
  traceId?: string;
  timestamp?: string;
}

const TraceDetail: React.FC<ITraceProps> = (params) => {
  const { ESIndex } = useContext(CommonStateContext);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [waterfall, setWaterfall] = useState<any>([]);
  const [filterData, setFilerData] = useState<any>({});
  const [traceSamples, setTraceSamples] = useState<any>([]);
  const [page, setPage] = useState(1);
  const [activeKey, setActiveKey] = useState('timeline');
  const [logLoading, setLogLoading] = useState(false);
  const [logStream, setLogStream] = useState<any[]>([]);
  const [fieldcaps, setFieldcaps] = useState<any>();
  const [timezone, setTimezone] = useState('Browser');
  const [time, setTime] = useState(900000);
  const [transactionName, setTransactionName] = useState();
  const [traceList, setTraceList] = useState<{ name: string; transaction_type: string }[]>([]);
  const [processor, setProcessor] = useState({
    processorEvent: '',
    id: '',
    traceId: '',
    transactionId: '',
    time: 0,
    duration: 0,
  });
  const timeField = fieldcaps?.filter((item) => item.esTypes?.includes('date')).map((ele) => ele.name);
  const TIME_OPTIONS = [
    {
      label: '15分钟',
      value: 900000,
    },
    {
      label: '1小时',
      value: 3600000,
    },
    {
      label: '4小时',
      value: 14400000,
    },
    {
      label: '1天',
      value: 86400000,
    },
    {
      label: '2天',
      value: 172800000,
    },
    {
      label: '7天',
      value: 604800000,
    },
  ];

  // 更新链路树
  const refreshTraceTree = (newFormData, samplesData) => {
    setFilerData(newFormData);
    const currentTraceIndex = samplesData.findIndex((item) => item.transactionId === newFormData.transactionId);
    setPage(currentTraceIndex + 1);
    currentTraceIndex !== -1 ? getWaterfallItems(newFormData, samplesData[currentTraceIndex]) : setWaterfall([]);
  };

  const changePage = (currentPage) => {
    // 初始化链路图tab
    setActiveKey('timeline');
    setPage(currentPage);
    const newFilter = {
      ...filterData,
      traceId: traceSamples[currentPage - 1]?.traceId,
      transactionId: traceSamples[currentPage - 1]?.transaction?.id,
      all_trace: 'false',
    };
    delete newFilter.enTraceId;
    setFilerData(newFilter);
    const currentTraceIndex = traceSamples.findIndex((item) => item.transactionId === newFilter.transactionId);
    currentTraceIndex !== -1 ? getWaterfallItems(newFilter, traceSamples[currentTraceIndex]) : setWaterfall([]);
  };

  const handleTracesList = async (requestParams) => {
    let result;
    try {
      result = await getAPMTransactionsList(requestParams);
    } catch (error) {
      console.error('Error fetching trace items:', error);
    }
    return result?.dat;
  };

  const handleErrorList = async (requestParams) => {
    let result;
    try {
      result = await getAPMTransactionsErrorList(requestParams);
    } catch (error) {
      console.error('Error fetching trace items:', error);
    }
    return result?.dat;
  };

  const handleLinkList = async (requestParams) => {
    let result;
    try {
      result = await getAPMTransactionsLinksList(requestParams);
    } catch (error) {
      console.error('Error fetching trace items:', error);
    }
    return result?.dat;
  };

  // 获取链路树
  const getWaterfallItems = async (formData, preferredSample) => {
    setLoading(true);
    const { bgid, data_id, start, end, all_trace, transactionId, traceId, enTraceId } = formData;
    setProcessor(preferredSample);
    getApmConfig().then((res) => {
      const { max_trace_items } = res.dat;
      const fetchData = async () => {
        try {
          const maxTraceItems = max_trace_items;
          let defaultSize = 5000;
          let from = 0;
          let size = defaultSize;
          let after_key = '';
          let error_from = 0;
          let error_size = defaultSize;
          let error_after_key = '';
          let traceDocs: any = [];
          let errorDocs = [];
          let spanLinksCountById: Record<string, number> = {};
          let new_trace_id = '';
          const requestParams = {
            busi_group_id: bgid,
            datasource_id: data_id,
            start,
            end,
            trace_id: enTraceId || traceId,
            all_trace: all_trace,
          };

          while (true) {
            const traceRes = await handleTracesList({ ...requestParams, size, after_key });
            traceDocs = traceDocs.concat(traceRes?.data?.hits?.hits?.map((hit) => hit._source));
            new_trace_id = traceRes?.['trace.id'];
            const dataLength = traceRes?.data?.hits?.hits?.length || 0;
            after_key = dataLength ? traceRes.data.hits.hits[dataLength - 1].sort?.join(',') : '';
            // 当size < defaultSize、请求结果小于size、from + size >= maxTraceItems时不继续查询
            if (traceDocs.length < size || size < defaultSize || from + size >= maxTraceItems) {
              break;
            }

            from += size;
            size = Math.abs(max_trace_items - from) > defaultSize ? defaultSize : Math.abs(max_trace_items - from);
          }

          while (true) {
            const errorRes = await handleErrorList({ ...requestParams, size: error_size, after_key: error_after_key });
            errorDocs = errorDocs.concat(errorRes?.hits.hits.map((hit) => hit._source));
            const dataLength = errorRes?.data?.hits?.hits?.length || 0;
            error_after_key = dataLength ? errorRes.data.hits.hits[dataLength - 1].sort?.join(',') : '';
            if (errorDocs.length < error_size || error_size < defaultSize || error_from + error_size >= maxTraceItems) {
              break;
            }

            error_from += error_size;
            error_size =
              Math.abs(max_trace_items - error_from) > defaultSize
                ? defaultSize
                : Math.abs(max_trace_items - error_from);
          }

          const linkedData = await handleLinkList({ ...requestParams, size: 1000, from: 0 });
          const linkedChildren: any[] = linkedData.hits.hits.filter(({ _source: source }) => {
            const spanLinks = source.span?.links?.filter((spanLink) => {
              return spanLink.trace.id === new_trace_id;
            });
            return !_.isEmpty(spanLinks);
          });

          spanLinksCountById = linkedChildren.reduce<Record<string, number>>((acc, { _source: source }) => {
            source.span?.links?.forEach((link) => {
              // Ignores span links that don't belong to this trace
              if (link.trace.id === new_trace_id) {
                acc[link.span.id] = (acc[link.span.id] || 0) + 1;
              }
            });
            return acc;
          }, {});
          const rootLinks = linkedChildren.reduce((data, { _source: source }) => {
            return [
              ...data,
              {
                traceId: source.trace.id,
                spanId: source.span?.id || source.transaction.id,
              },
            ];
          }, []);

          const result = {
            traceDocs,
            errorDocs,
            spanLinksCountById,
            traceItemCount: max_trace_items,
            maxTraceItems,
            rootLinks,
            encryptedTraceId: new_trace_id,
          };

          const waterfallData = getWaterfall(
            preferredSample.traceId
              ? {
                  traceItems: result,
                  entryTransaction: {
                    transactionId: all_trace === 'true' ? result.traceDocs[0].transaction.id : transactionId,
                  },
                }
              : INITIAL_DATA,
          );
          setWaterfall(waterfallData);
          setFilerData(formData);
        } catch (err) {
          setLoading(false);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    });
  };

  const getTracesData = (transactionName) => {
    const { data_id, bgid, transactionType, serviceName, traceId, timestamp } = params;
    const logTime = moment(timestamp).valueOf();
    const start = logTime - time;
    const end = logTime + time;
    const queryResult = buildEsQuery(`trace.id : "${traceId}"`, []);
    const requestBody = {
      busi_group_id: Number(bgid),
      datasource_id: Number(data_id),
      service_name: serviceName,
      transaction_type: transactionType,
      transaction_name: transactionName,
      kql: queryResult,
      start,
      end,
    };

    getTracesSamples(requestBody).then((res) => {
      const samplesData = res.hits.hits.map((hit) => ({
        score: hit._score,
        timestamp: hit._source['@timestamp'],
        transactionId: hit._source.transaction.id,
        traceId: hit._source.trace.id,
        processorEvent: hit._source['processor'].event,
        time: Math.round(hit._source.timestamp.us / 1000),
        duration: hit._source.transaction.duration?.us,
        id: hit._source.transaction.id, // TODO
        transaction: hit._source.transaction,
      }));
      setTraceSamples(samplesData);
      refreshTraceTree(
        {
          ...params,
          start,
          end,
          traceId: samplesData[0]?.traceId,
          transactionId: samplesData[0]?.transactionId,
          all_trace: 'false',
        },
        samplesData,
      );
    });
  };

  // 获取事务列表
  const getTransationsList = () => {
    const { data_id, bgid, transactionType, serviceName, traceId, timestamp } = params;
    const logTime = moment(timestamp).valueOf();
    const start = logTime - time;
    const end = logTime + time;
    try {
      const queryResult = buildEsQuery(`trace.id : "${traceId}"`, []);
      const requestBody = {
        busi_group_id: Number(bgid),
        datasource_id: Number(data_id),
        service_name: serviceName,
        transaction_type: transactionType,
        kql: queryResult,
        end,
        start,
      };
      setListLoading(true);
      getTransactionsList(requestBody)
        .then((res) => {
          const data = _.get(res, 'aggregations.transaction_groups.buckets');
          const result = data.map((item) => {
            return {
              name: item.key,
              transaction_type: item.transaction_type.top[0].metrics['transaction.type'],
            };
          });
          // 初始化链路图tab
          setActiveKey('timeline');
          result[0]?.name && getTracesData(result[0]?.name);
          if (transactionName !== result[0]?.name) {
            setTransactionName(result[0]?.name);
          }
          setTraceList(result);
          setListLoading(false);
        })
        .finally(() => {
          setListLoading(false);
        });
    } catch (err) {
      setTraceList([]);
    }
  };

  // 查看完整追溯信息
  const getFullTraceInfor = () => {
    // 初始化链路图tab
    setActiveKey('timeline');
    const currentTraceIndex = traceSamples.findIndex((item) => item.transactionId === filterData.transactionId);
    setPage(currentTraceIndex + 1);
    currentTraceIndex !== -1
      ? getWaterfallItems(
          { ...filterData, all_trace: 'true', enTraceId: waterfall.encryptedTraceId },
          traceSamples[currentTraceIndex],
        )
      : setWaterfall([]);
  };

  useEffect(() => {
    getLogConfig().then((res) => {
      setTimezone(res.dat.date_zone);
    });
  }, []);

  useEffect(() => {
    if (ESIndex?.elastic_apm_index) {
      const requestParams = {
        busi_group_id: Number(params.bgid),
        datasource_id: Number(params.data_id),
        mode: 'common' as 'common' | 'host' | 'container' | 'pod' | 'graf',
        indexed: ESIndex.elastic_apm_index,
        fields: '_source,_id,_index,_score,*',
      };

      getFieldcaps(requestParams).then((res) => {
        setFieldcaps(res.dat ? getFieldsForWildcard(res.dat) : []);
      });
    }
  }, [ESIndex]);

  useEffect(() => {
    // 获取事务列表
    getTransationsList();
  }, [JSON.stringify(params), time]);

  useEffect(() => {
    if (activeKey === 'logs') {
      setLogLoading(true);
      const { data_id, bgid } = filterData;
      const timeRange = calculationTime(processor.time, processor.duration ?? processor.time + 300000);
      const queryResult = buildEsQuery(
        `trace.id:"${filterData.traceId}" OR (not trace.id:* AND "${filterData.traceId}")`,
        [],
      );
      const time_formats: { fields?: { label: string; value: string }[]; format: string } = {
        fields: timeField,
        format: 'strict_date_optional_time',
      };
      let requestbody: any = {
        datasource_id: Number(data_id),
        busi_group_id: Number(bgid),
        order: 'desc', // 排序规则
        kql: queryResult, // 过滤条件
        size: 500,
        mode: 'app',
        time_field: '@timestamp',
        ...timeRange,
        time_formats: time_formats,
      };
      getLogSearch(requestbody)
        .then((res: any) => {
          setLogLoading(false);
          setLogStream(_.reverse(res.list));
        })
        .catch((err) => setLogLoading(false));
    }
  }, [activeKey]);

  return (
    <Spin spinning={listLoading}>
      <Row gutter={8} style={{ marginBottom: '12px' }} wrap={false}>
        <Col>
          <Input.Group compact>
            <span className='ant-input-group-addon log-input-group-addon'>{t('common:transaction_name')}</span>
            <Select
              disabled={loading}
              style={{ width: '350px' }}
              value={transactionName}
              onChange={(e) => {
                setTransactionName(e);
                // 初始化链路图tab
                setActiveKey('timeline');
                getTracesData(e);
              }}
            >
              {traceList.map((item) => (
                <Select.Option key={item.name} value={item.name}>
                  <Tooltip title={item.transaction_type}>{item.name}</Tooltip>
                </Select.Option>
              ))}
            </Select>
          </Input.Group>
        </Col>
        <Col>
          <Input.Group compact>
            <span className='ant-input-group-addon log-input-group-addon'>{t('common:time_range')}</span>
            <Select disabled={loading} value={time} options={TIME_OPTIONS} onChange={(e) => setTime(e)} />
          </Input.Group>
        </Col>
      </Row>
      <TraceGraph
        loading={loading}
        page={page}
        changePage={changePage}
        getFullTraceInfor={getFullTraceInfor}
        waterfall={waterfall}
        logStream={logStream}
        activeKey={activeKey}
        fieldcaps={fieldcaps}
        setActiveKey={setActiveKey}
        total={traceSamples.length}
        filterData={filterData}
        processor={processor}
        logLoading={logLoading}
        timezone={timezone}
        timeField={timeField}
        drawerWidth='50%'
        showSpanLink={false}
      />
    </Spin>
  );
};

export default TraceDetail;
