import React, { useState, useContext, useEffect, useCallback } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { buildEsQuery } from '@/components/SearchBar/es-query';
import { getWaterfall } from '../utils';
import { getTracesSamples, getAPMDurationHistogramRange, getAPMDurationPercentiles } from '@/services/traces';
import moment from 'moment';
import { CommonStateContext } from '@/App';
import { parseRange } from '@/components/TimeRangePicker';
import { useHistory } from 'react-router-dom';
import { calculationTime } from '../utils';
import { getLogSearch } from '@/services/logs';
import { getAPMTransactionsList, getAPMTransactionsErrorList, getAPMTransactionsLinksList } from '@/services/traces';
import { getApmConfig } from '@/services/config';
import OverallLatencyDistribution from '../components/OverallLatencyDistribution';
import { getFieldcaps } from '@/services/warning';
import { getFieldsForWildcard } from '@/components/SearchBar/utils';
import TraceGraph from '../components/TraceGraph';
import { getLogConfig } from '@/services/config';
import './index.less';

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

interface ITracesServicesProps {
  data_id: string;
  bgid: string;
  serviceName: string;
  transactionName: string;
  transactionType: string;
  environment: string;
  start: string;
  end: string;
  filter: string;
  fieldRecord: string;
  transactionId: string;
  spanId?: string;
  all_trace?: 'true' | 'false';
}

const TracesServices: React.FC<ITracesServicesProps> = (params) => {
  const { t } = useTranslation('traces');
  const history = useHistory();
  const { ESIndex } = useContext(CommonStateContext);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [latencyData, setLatencyData] = useState<{ all?: any; failure?: any }>();
  const [ninetyFivePercent, setNinetyFivePercent] = useState();
  const [waterfall, setWaterfall] = useState<any>([]);
  const [filterData, setFilerData] = useState<any>({});
  const [selectRowData, setSelectRowData] = useState();
  const [traceSamples, setTraceSamples] = useState<any>([]);
  const [page, setPage] = useState(1);
  const [activeKey, setActiveKey] = useState('timeline');
  const [logLoading, setLogLoading] = useState(false);
  const [logStream, setLogStream] = useState<any[]>([]);
  const [fieldcaps, setFieldcaps] = useState<any>();
  const [timezone, setTimezone] = useState('Browser');
  const [processor, setProcessor] = useState({
    processorEvent: '',
    id: '',
    traceId: '',
    transactionId: '',
    time: 0,
    duration: 0,
  });
  const timeField = fieldcaps?.filter((item) => item.esTypes?.includes('date')).map((ele) => ele.name);

  const refreshTraceTree = (newFormData, samplesData) => {
    setFilerData(newFormData);
    const currentTraceIndex = samplesData.findIndex((item) => item.transactionId === newFormData.transactionId);
    setPage(currentTraceIndex + 1);
    currentTraceIndex !== -1 ? getWaterfallItems(newFormData, samplesData[currentTraceIndex]) : setWaterfall([]);
  };

  const changePage = (currentPage) => {
    history.replace({
      pathname: '/service-tracking/transaction/view',
      search: `?data_id=${params.data_id}&bgid=${params.bgid}&serviceName=${
        params.serviceName
      }&transactionName=${encodeURIComponent(params.transactionName)}&traceId=${
        traceSamples[currentPage - 1]?.traceId
      }&transactionId=${traceSamples[currentPage - 1]?.transactionId}&all_trace=false&transactionType=${
        params.transactionType
      }&environment=${params.environment}&start=${params.start}&end=${params.end}&filter=${encodeURIComponent(
        params.filter,
      )}${params.fieldRecord ? `&fieldRecord=${encodeURIComponent(params.fieldRecord)}` : ''}`,
    });
    setPage(currentPage);

    const newFilter = {
      ...filterData,
      traceId: traceSamples[currentPage - 1]?.traceId,
      transactionId: traceSamples[currentPage - 1]?.transactionId,
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
          let trace_id = '';
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
            trace_id = traceRes?.['trace.id'];
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
              return spanLink.trace.id === traceId;
            });
            return !_.isEmpty(spanLinks);
          });

          spanLinksCountById = linkedChildren.reduce<Record<string, number>>((acc, { _source: source }) => {
            source.span?.links?.forEach((link) => {
              // Ignores span links that don't belong to this trace
              if (link.trace.id === traceId) {
                acc[link.span.id] = (acc[link.span.id] || 0) + 1;
              }
            });
            return acc;
          }, {});
          const rootLinks = linkedChildren.reduce((data, { _source: source }) => {
            return [
              ...data,
              {
                trace_id: source.trace.id,
                span_id: source.span?.id || source.transaction.id,
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
            encryptedTraceId: trace_id,
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

          // 如果路由带有spanId，标识抽屉是打开的。需要在查询后匹配获取选中的数据用于弹窗内容渲染
          if (params.spanId) {
            let selectedData;
            if (params.spanId === 'null') {
              selectedData = waterfallData.items.find(
                (ele) => ele.docType === 'transaction' && ele.doc.transaction.id === transactionId,
              );
            } else {
              selectedData = waterfallData.items.find(
                (ele) => ele.docType === 'span' && ele.doc.span?.id === params.spanId,
              );
            }
            setSelectRowData(selectedData);
          }

          // 链路树获取成功后再重定向
          if (all_trace === 'true' && params.all_trace === 'false') {
            setFilerData(formData);
            history.replace({
              pathname: '/service-tracking/transaction/view',
              search: `?data_id=${params.data_id}&bgid=${params.bgid}&serviceName=${
                params.serviceName
              }&transactionName=${encodeURIComponent(params.transactionName)}&traceId=${traceId}&transactionId=${
                params.transactionId
              }&all_trace=true&transactionType=${params.transactionType}&enTraceId=${enTraceId}&environment=${
                params.environment
              }&start=${params.start}&end=${params.end}&filter=${encodeURIComponent(params.filter)}${
                params.fieldRecord ? `&fieldRecord=${encodeURIComponent(params.fieldRecord)}` : ''
              }`,
            });
          }
        } catch (err) {
          setLoading(false);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    });
  };

  const onRefreshLatency = () => {
    const { data_id, bgid, filter, environment, transactionType, serviceName, transactionName } = params;
    const { start: timeStart, end: timeEnd } = parseRange({ start: params.start, end: params.end });
    const start = moment(timeStart).valueOf();
    const end = moment(timeEnd).valueOf();
    const fieldRecord = params.fieldRecord;
    const historyRecord = fieldRecord ? JSON.parse(fieldRecord) : [];
    try {
      const queryResult = buildEsQuery(filter, historyRecord);
      const paramsData = {
        busi_group_id: Number(bgid),
        datasource_id: Number(data_id),
        service_name: serviceName,
        service_environment: environment,
        transaction_type: transactionType,
        transaction_name: transactionName,
        kql: queryResult,
        start,
        end,
      };
      setChartLoading(true);
      // 获取成功和失败的数据
      getAPMDurationHistogramRange(paramsData)
        .then((res) => {
          const all = res.dat.all;
          const failure = res.dat.failure;
          const result = {
            all: {
              ...all,
              overallHistogram: all.overallHistogram.map((item) => ({ ...item, type: t('all_transactions') })),
              percentileThresholdValue: all.percentiles.aggregations?.duration_percentiles?.values?.[`95.0`],
            },
            failure: {
              ...failure,
              overallHistogram: failure.overallHistogram?.map((item) => ({ ...item, type: t('failed_transaction') })),
              percentileThresholdValue: failure.percentiles?.aggregations?.duration_percentiles?.values?.[`95.0`],
            },
          };
          setLatencyData(result);
          setChartLoading(false);
        })
        .catch((Err) => setChartLoading(false));
      getAPMDurationPercentiles(paramsData).then((res) => {
        const percent_values = _.get(res, 'dat.aggregations.duration_percentiles.values');
        setNinetyFivePercent(percent_values?.['95.0']);
      });
    } catch (err) {
      setLatencyData(undefined);
    }
  };

  const getTracesData = (durationRange?: { start: number; end: number }) => {
    const { start: timeStart, end: timeEnd } = parseRange({ start: params.start, end: params.end });
    const newFormData: any = {
      ...params,
      data_id: Number(params.data_id),
      bgid: Number(params.bgid),
      start: moment(timeStart).valueOf(),
      end: moment(timeEnd).valueOf(),
    };
    const {
      data_id,
      bgid,
      start,
      end,
      filter,
      environment,
      serviceName,
      transactionType,
      transactionName,
      traceId,
      transactionId,
      all_trace,
    } = newFormData;
    const fieldRecord = params.fieldRecord;
    const historyRecord = fieldRecord ? JSON.parse(fieldRecord) : [];
    const queryResult = buildEsQuery(filter, historyRecord);
    const requestBody = {
      busi_group_id: bgid,
      datasource_id: data_id,
      service_name: serviceName,
      service_environment: environment,
      transaction_type: transactionType,
      transaction_name: transactionName,
      kql: queryResult,
      start,
      end,
      range_from: durationRange?.start,
      range_to: durationRange?.end,
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
      if (!traceId || !transactionId || !all_trace) {
        history.replace({
          pathname: '/service-tracking/transaction/view',
          search: `?data_id=${data_id}&bgid=${bgid}&serviceName=${serviceName}&transactionName=${encodeURIComponent(
            transactionName,
          )}&traceId=${samplesData[page - 1]?.traceId}&transactionId=${
            samplesData[page - 1]?.transactionId
          }&all_trace=false&transactionType=${transactionType}&environment=${environment}&start=${params.start}&end=${
            params.end
          }&filter=${encodeURIComponent(filter)}${
            params.fieldRecord ? `&fieldRecord=${encodeURIComponent(params.fieldRecord)}` : ''
          }`,
        });
        newFormData.traceId = samplesData[page - 1]?.traceId;
        newFormData.transactionId = samplesData[page - 1]?.transactionId;
        newFormData.all_trace = 'false';
      }
      refreshTraceTree(newFormData, samplesData);
    });
  };

  useEffect(() => {
    getLogConfig().then((res) => {
      setTimezone(res.dat.date_zone);
    });
  }, []);

  useEffect(() => {
    if (params && ESIndex?.elastic_apm_index) {
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
  }, [ESIndex, JSON.stringify(params)]);

  useEffect(() => {
    if (ESIndex?.elastic_apm_index) {
      getTracesData();
      onRefreshLatency();
    }
  }, [ESIndex]);

  const handleRefresh = useCallback((e) => {
    getTracesData(e);
  }, []);

  // 查看完整追溯信息
  const getFullTraceInfor = () => {
    const currentTraceIndex = traceSamples.findIndex((item) => item.transactionId === params.transactionId);
    setPage(currentTraceIndex + 1);
    currentTraceIndex !== -1
      ? getWaterfallItems(
          { ...filterData, all_trace: 'true', enTraceId: waterfall.encryptedTraceId },
          traceSamples[currentTraceIndex],
        )
      : setWaterfall([]);
  };

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
    <>
      <div style={{ margin: '14px 0', fontWeight: 'bold' }}>
        {t('current_transaction')}: {params.transactionName}
      </div>
      <OverallLatencyDistribution
        loading={chartLoading}
        {...latencyData}
        onRefresh={handleRefresh}
        currentTransation={waterfall.entryWaterfallTransaction}
        ninetyFivePercent={ninetyFivePercent}
      />
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
        selectRowData={selectRowData}
        filterData={filterData}
        processor={processor}
        logLoading={logLoading}
        timezone={timezone}
        timeField={timeField}
        shouldUpdateUrl={true}
      />
    </>
  );
};

export default TracesServices;
