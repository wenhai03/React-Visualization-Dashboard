import React, { useState, useRef, useContext, useEffect, useCallback } from 'react';
import {
  FileSyncOutlined,
  EyeOutlined,
  CaretRightOutlined,
  LoadingOutlined,
  PauseOutlined,
  UpOutlined,
  DownOutlined,
  DeleteOutlined,
  ClearOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import {
  Card,
  Row,
  Col,
  Button,
  Spin,
  Switch,
  Empty,
  Space,
  Popover,
  Radio,
  List,
  Checkbox,
  Input,
  Typography,
  Select,
} from 'antd';
import _ from 'lodash';
import { useHistory } from 'react-router-dom';
import { CommonStateContext } from '@/App';
import { useRequest, useInfiniteScroll } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { getLogSearch, getLogsHighlights, getLogsSummaryHighlights } from '@/services/logs';
import PageLayout from '@/components/pageLayout';
import { LogMinimap } from '../components/LogMinimap';
import { parseRange } from '@/components/TimeRangePicker';
import { buildEsQuery } from '@/components/SearchBar/es-query';
import LogStream from '@/components/LogStream';
import { getLogConfig } from '@/services/config';
import Filter from '../Filter';
import {
  convertDateRangeBucketToSummaryBucket,
  getDefaultColumnsConfigs,
  setDefaultColumnsConfigs,
  getIndex,
  getMoment,
  getFieldsToShow,
} from '../utils';
import '@/pages/explorer/index.less';
import './index.less';
import '../locale';

// TODO 向上滚动
// TODO 上下文中查看

// 处理内容高亮
export const highlightFieldValue = (
  value: string, // 表单元格内容
  highlightTerms: string[], // 高亮关键字
  isActiveHighlight: boolean, // 是否高亮选中
) => {
  const result = highlightTerms.reduce<React.ReactNode[]>(
    (fragments, highlightTerm, index) => {
      const lastFragment = fragments[fragments.length - 1];

      if (typeof lastFragment !== 'string') {
        return fragments;
      }

      const highlightTermPosition = lastFragment.indexOf(highlightTerm);

      if (highlightTermPosition > -1) {
        return [
          ...fragments.slice(0, fragments.length - 1),
          lastFragment.slice(0, highlightTermPosition),
          <Typography.Text
            mark
            key={`highlight-${highlightTerm}-${index}`}
            className={isActiveHighlight ? 'active-highlight-mark' : 'highlight-mark'}
          >
            {highlightTerm}
          </Typography.Text>,
          lastFragment.slice(highlightTermPosition + highlightTerm.length),
        ];
      } else {
        return fragments;
      }
    },
    [value],
  );
  return result;
};

const Stream = () => {
  const { t } = useTranslation('logs');
  const history = useHistory();
  // 当前可视区域的元素列表
  const [visiblePointTime, setVisiblePointTime] = useState<
    { time: number; id: string; isHighlight: 'true' | 'false' }[]
  >([]);
  // 全局loading
  const [loading, setLoading] = useState(false);
  // 日志列表loading
  const [listLoading, setListLoading] = useState(false);
  // 搜索关键字loading
  const [hightLightLoading, setHightLightLoading] = useState(false);
  // 时间流数据
  const [buckets, setBuckets] = useState<any>([]);
  // 日志数据
  const [logStream, setLogStream] = useState<any[]>([]);
  // 点击的时间流游标
  const [timeTarget, setTimeTarget] = useState<number>();
  // 过滤条件，不从url取值,因为url记录的时间可能是相对时间
  const [filterData, setFilterData] = useState<any>();
  // 实时流式传输按钮的状态
  const [streaming, setStreaming] = useState(false);
  // 设置自定义展示列
  const [columnsConfigs, setColumnsConfigs] = useState<Record<string, { name: string; visible: boolean }[]>>(
    getDefaultColumnsConfigs(),
  );
  // 字段列表
  const [fieldcaps, setFieldcaps] = useState<any>();
  // 高亮关键字
  const [highlight, setHighlight] = useState('');
  // 时间流高亮部分
  const [summaryHighlightBuckets, setSummaryHighlightBuckets] = useState([]);
  // 日志列表高亮部分
  const [highlightEntries, setHighlightEntries] = useState<{ _id: string }[]>([]);
  // 当前关键字高亮的日志id
  const [timezone, setTimezone] = useState('Browser');
  const [activeId, setActiveId] = useState<string>();
  const { ESIndex } = useContext(CommonStateContext);
  const scale = localStorage.getItem('log-stream-scale') as 'small' | 'medium' | 'large';
  const wrap = localStorage.getItem('log-stream-wrap') as 'wrap' | 'no-warp';
  const scrollRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<any>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const [customStyle, setCustomStyle] = useState<{ scale: 'small' | 'medium' | 'large'; wrap: 'wrap' | 'no-warp' }>({
    scale: scale || 'medium',
    wrap: wrap,
  });
  const fieldsToShow = getFieldsToShow(
    (fieldcaps || []).map((ele) => ele.name),
    fieldcaps,
    false,
  );
  const fields = (fieldcaps || []).filter((ele) => fieldsToShow.includes(ele.name));

  // 数据请求,同时返回日志列表、时间流，按需取值
  const intervalRequest = (params: any, order: 'asc' | 'desc', size: number) => {
    const {
      start,
      end,
      type,
      data_id,
      bgid,
      index,
      filter,
      idents,
      pod_names,
      cluster_names,
      container_names,
      container_ids,
      service_names: serviceName,
      service_environments: environment,
      ip,
      time_field,
      time_formats,
    } = params;
    const fieldRecord = params.fieldRecord;
    const historyRecord = fieldRecord ? JSON.parse(fieldRecord) : [];
    try {
      const queryResult = buildEsQuery(filter, historyRecord);
      let body: any = {
        datasource_id: Number(data_id),
        busi_group_id: Number(bgid),
        start,
        end,
        is_highlight: true,
        size: size,
        order: order, // 排序规则
        kql: queryResult, // 过滤条件
        mode: ['index', 'view'].includes(type) ? 'common' : type,
        aggs: [
          {
            type: 'date_range',
            name: 'count_by_date',
          },
        ],
        time_field: time_field ?? '@timestamp',
        time_formats,
      };
      if (type === 'app') {
        // 应用日志
        body.service_names = serviceName ? serviceName.split(',') : [];
        body.service_environments = environment ? environment.split(',') : [];
      } else if (type === 'host' || type === 'graf') {
        // 主机日志
        body.idents = idents === '' ? [] : idents.split(',');
      } else if (type === 'pod') {
        // POD日志
        body.type = 'kubernates';
        body.pod_names = pod_names === '' ? [] : pod_names.split(',');
        body.cluster_names = cluster_names === '' ? [] : cluster_names.split(',');
      } else if (type === 'k8s-event') {
        // k8s-event 日志
        body.cluster_names = cluster_names === '' ? [] : cluster_names.split(',');
      } else if (type === 'container') {
        // 容器日志
        body.type = 'docker';
        body.container_names = container_names === '' ? [] : container_names.split(',');
        body.container_ids = container_ids === '' ? [] : container_ids.split(',');
      }
      body.indexed = getIndex(type, ESIndex, type === 'syslog' ? ip : index);
      return getLogSearch(body);
    } catch (err) {
      return new Promise((resolve) => {
        setLoading(false);
        resolve({ count_by_date: [], list: [] });
      });
    }
  };

  // 处理加载更多数据
  const handleMore = (data) => {
    const latestLogTime = data.list[data.list.length - 1].sort[0];
    const timeDiff = filterData.end - filterData.start;
    const end = latestLogTime >= buckets[buckets.length - 1].end ? latestLogTime : filterData.end;
    const start = end - timeDiff;
    // 最新滚动加载的数据时间大于时间流时更新时间流
    if (latestLogTime >= buckets[buckets.length - 1].end) {
      intervalRequest({ ...filterData, start, end }, 'desc', 0).then((res: any) => {
        const timeResult = res?.count_by_date?.map((item) => convertDateRangeBucketToSummaryBucket(item));
        setBuckets(timeResult);
      });
    }

    // 滚动时，已设置高亮，触发高亮数据更新。
    const totalLogs = [...logStream, ...data.list].slice(-5000);
    setLogStream(totalLogs);
    if (highlight && highlight !== '') {
      Promise.all([
        contentHightLightRequest(highlight, totalLogs, {
          ...filterData,
          start: totalLogs[0].sort[0],
          end: totalLogs[totalLogs.length - 1].sort[0],
        }),
        timeHightLightRequest(highlight, { ...filterData, start, end }),
      ]).then(([contentHightLight, timeHightLight]) => {
        const logsWithhightlight = handleHightLightResult(contentHightLight, totalLogs);
        setLogStream(logsWithhightlight);
        setSummaryHighlightBuckets(timeHightLight.dat);
      });
    }
  };

  // 向下滚动加载新数据
  const { loadMore, noMore, loadingMore, reload } = useInfiniteScroll(
    async (d) => {
      if (!logStream.length) {
        return { list: [], hasMore: false };
      }

      const lastStreamTime = getMoment(logStream[logStream.length - 1].fields['@timestamp'], timezone).valueOf() + 1;
      const start = lastStreamTime;
      const remainBuckets = buckets.filter((bucket) => bucket.start > lastStreamTime);
      let lastInterval;
      if (remainBuckets.length) {
        lastInterval = findLastInterval(remainBuckets);
      }
      const end = lastInterval?.end || start + 900000;
      const result: any = await intervalRequest({ ...filterData, start, end }, 'asc', 200);

      // 判断是否还有更多数据
      const hasMore = result?.list?.length > 0;
      return { list: result?.list, hasMore };
    },
    {
      target: scrollRef,
      manual: true,
      isNoMore: (d) => {
        // 只要没有数据，或者 hasMore 为 false，则 noMore 为 true
        return d ? !d.list?.length || !d.hasMore : false;
      },
      onSuccess: (data) => {
        // 数据加载成功后处理
        if (data?.list?.length) {
          handleMore(data);
        }
      },
    },
  );

  function findLastInterval(buckets) {
    let sum = 0;
    let lastInterval: any = { start: buckets[0].start, end: buckets[0].end };
    for (const item of buckets) {
      if (sum + item.entriesCount > 200) {
        // 如果当前累加后超过 200，则停止
        break;
      }
      sum += item.entriesCount;
      lastInterval = { start: item.start, end: item.end };
    }

    return lastInterval;
  }

  // 定制
  const handleCustomStyle = (value) => {
    localStorage.setItem('log-stream-scale', value.scale);
    localStorage.setItem('log-stream-wrap', value.wrap);
    setCustomStyle(value);
  };

  function findClosestMultipleOfTwo(logs) {
    if (!logs || logs.length === 0) {
      return null;
    }

    const centerIndex = Math.floor(logs.length / 2);
    if (logs[centerIndex].isHighlight === 'true') return logs[centerIndex];

    let closestMultipleOfTwo = null;

    // 从中心位置向上和向下搜索
    for (let i = 0; i <= centerIndex; i++) {
      const upperIndex = centerIndex + i;
      const lowerIndex = centerIndex - i;

      if (upperIndex < logs.length && logs[upperIndex].isHighlight === 'true') {
        closestMultipleOfTwo = logs[upperIndex];
        break;
      }

      if (lowerIndex >= 0 && logs[lowerIndex].isHighlight === 'true') {
        closestMultipleOfTwo = logs[lowerIndex];
        break;
      }
    }

    return closestMultipleOfTwo;
  }

  const handleResult = (res, newFormData) => {
    let result = _.reverse(res.list);
    if (highlight && highlight !== '') {
      Promise.all([
        contentHightLightRequest(highlight, result, newFormData),
        timeHightLightRequest(highlight, newFormData),
      ]).then(([contentHightLight, timeHightLight]) => {
        const logsWithhightlight = handleHightLightResult(contentHightLight, result);
        setLogStream(logsWithhightlight);
        setSummaryHighlightBuckets(timeHightLight.dat);
        setLoading(false);
        handleScroll();
        const visibleActivePoint = findClosestMultipleOfTwo(visiblePointTime);
        if (visibleActivePoint) {
          // 在可视区域内找到最接近中心区域的高亮元素
          setActiveId(visibleActivePoint.id);
        } else {
          // 可视区域内不存在高亮数据,查找可视区域以下数据,进行跳转
          const activeData = logsWithhightlight.find(
            (item) => item.sort[0] > (visiblePointTime[visiblePointTime.length - 1]?.time || NaN) && item.highlights,
          );
          if (activeData) {
            toAnchor(activeData._id);
            setActiveId(activeData._id);
          }
        }
      });
    } else {
      setLogStream(result);
      setLoading(false);
      handleScroll();
    }
    const data = res?.count_by_date?.map((item) => convertDateRangeBucketToSummaryBucket(item)) || [];
    setBuckets(data);
  };

  const onRefresh = (params) => {
    const { start: timeStart, end: timeEnd } = parseRange({ start: params.start, end: params.end });
    const newFormData = {
      ...params,
      start: getMoment(timeStart, timezone).valueOf(),
      end: getMoment(timeEnd, timezone).valueOf() - 3000,
    };
    setFilterData(newFormData);
    setLoading(true);
    intervalRequest(newFormData, 'desc', 200).then((res) => {
      handleResult(res, newFormData);
      if (newFormData?.type === 'index' || newFormData?.type === 'view') {
        const localeConfig = getDefaultColumnsConfigs();
        const hasLocalFiled = fieldcaps?.find((item) => item.name === localeConfig[newFormData.type][0].name);
        if (!hasLocalFiled) {
          const data = {
            ...localeConfig,
            [newFormData?.type]: [{ name: '消息', visible: true }],
          };
          setDefaultColumnsConfigs(data);
          setColumnsConfigs(data);
        }
      }
    });
  };

  // 重定向
  const onRedirection = (formData) => {
    let searchParams = [
      `data_id=${formData.data_id}`,
      `bgid=${formData.bgid}`,
      `type=${formData.type}`,
      `filter=${encodeURIComponent(formData.filter)}`,
      ...(formData.fieldRecord ? [`fieldRecord=${encodeURIComponent(formData.fieldRecord)}`] : []),
    ];
    if (!((formData.type === 'view' || formData.type === 'index') && formData.time_field === '')) {
      searchParams = [...searchParams, `start=${formData.start}`, `end=${formData.end}`];
    }
    switch (formData.type) {
      case 'app': {
        // 应用日志
        searchParams = [
          ...searchParams,
          `service_names=${formData.service_names}`,
          `service_environments=${formData.service_environments}`,
        ];
        break;
      }
      case 'host': {
        // 主机日志
        searchParams = [...searchParams, `idents=${formData.idents}`];
        break;
      }
      case 'graf': {
        // 主机日志
        searchParams = [...searchParams, `idents=${formData.idents}`];
        break;
      }
      case 'pod': {
        // POD日志
        searchParams = [...searchParams, `pod_names=${formData.pod_names}`, `cluster_names=${formData.cluster_names}`];
        break;
      }
      case 'k8s-event': {
        // k8s-event 日志
        searchParams = [...searchParams, `cluster_names=${formData.cluster_names}`];
        break;
      }
      case 'container': {
        // 容器日志
        searchParams = [
          ...searchParams,
          `container_names=${formData.container_names}`,
          `container_ids=${formData.container_ids}`,
        ];
        break;
      }
      case 'syslog': {
        // syslog日志
        searchParams = [...searchParams, `ip=${formData.ip}`];
        break;
      }
      default: {
        // 自选索引、自选视图
        searchParams = [...searchParams, `index=${formData.index}`, `time_field=${formData.time_field}`];
      }
    }
    history.push({
      pathname: '/log/stream',
      search: `?${searchParams.join('&')}`,
    });
  };

  const { run, cancel } = useRequest(
    () => {
      // TODO 优化，start 时间不加1，覆盖掉列表中最新一秒的数据
      const start = getMoment(logStream[logStream.length - 1].fields['@timestamp'], timezone).valueOf() + 1;
      const end = start + 900000;
      return intervalRequest({ ...filterData, start, end }, 'asc', 200);
    },
    {
      pollingInterval: 5000,
      manual: true,
      onSuccess: (data: any) => {
        const totalLog = [...logStream, ...data.list].slice(-5000);
        setLogStream(totalLog);
        if (highlight && highlight !== '') {
          const newFilterValue = {
            ...filterData,
            start: totalLog[0].sort[0],
            end: totalLog[totalLog.length - 1].sort[0],
          };
          contentHightLightRequest(highlight, totalLog, newFilterValue).then((res) => {
            const logsWithhightlight = handleHightLightResult(res, totalLog);
            setLogStream(logsWithhightlight);
            scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
          });
        } else {
          scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
        }
      },
    },
  );

  // 单独请求最新时间流
  const { run: timeRun, cancel: timeCancel } = useRequest(
    () => {
      const timeDiff = filterData.end - filterData.start;
      const end = getMoment(new Date(), timezone).valueOf();
      const start = end - timeDiff;

      return intervalRequest({ ...filterData, start, end }, 'desc', 0);
    },
    {
      pollingInterval: 5000,
      manual: true,
      onSuccess: (data: any) => {
        const timeDiff = filterData.end - filterData.start;
        const end = getMoment(new Date(), timezone).valueOf();
        const start = end - timeDiff;
        const timeResult = data?.count_by_date?.map((item) => convertDateRangeBucketToSummaryBucket(item));
        if (highlight && highlight !== '') {
          timeHightLightRequest(highlight, { ...filterData, start, end }).then((res) => {
            setSummaryHighlightBuckets(res.dat);
            setBuckets(timeResult);
            timeResult[timeResult.length - 1].topEntryKeys[0] &&
              jumpToTargetPosition(timeResult[timeResult.length - 1].topEntryKeys[0]);
          });
        } else {
          setBuckets(timeResult);
          timeResult[timeResult.length - 1].topEntryKeys[0] &&
            jumpToTargetPosition(timeResult[timeResult.length - 1].topEntryKeys[0]);
        }
      },
    },
  );

  // 即时传输
  const onRealTimeTransmission = (streaming) => {
    if (streaming) {
      run();
      timeRun();
    } else {
      cancel();
      timeCancel();
    }
  };

  // 时间流条状
  const jumpToTargetPosition = (value) => {
    const start = filterData.start;
    const end = value.time;
    setTimeTarget(value.time);
    setListLoading(true);
    intervalRequest({ ...filterData, start, end }, 'desc', 200)
      .then((data: any) => {
        const result = _.reverse(data.list);
        if (highlight && highlight !== '') {
          contentHightLightRequest(highlight, result, {
            ...filterData,
            start: result[0].sort[0],
            end: result[result.length - 1].sort[0],
          }).then((res) => {
            const logsWithhightlight = handleHightLightResult(res, result);
            setLogStream(logsWithhightlight);
            setListLoading(false);
            toAnchor(result[result.length - 1]._id, 'end');
            handleScroll();
          });
        } else {
          setLogStream(result);
          toAnchor(result[result.length - 1]._id, 'end');
          handleScroll();
          setListLoading(false);
        }
        reload();
      })
      .catch((err) => {
        setListLoading(false);
      });
  };

  // 更新内容高亮
  const contentHightLightRequest: (val: string, totalLogs: any, filterValue: any) => Promise<any> = (
    val,
    totalLogs,
    filterValue,
  ) => {
    const {
      start,
      end,
      type,
      data_id,
      bgid,
      index,
      filter,
      ip,
      idents,
      pod_names,
      time_field,
      cluster_names,
      container_names,
      container_ids,
      service_names: serviceName,
      service_environments: environment,
      time_formats,
    } = filterValue;
    const fieldRecord = filterValue.fieldRecord;
    const historyRecord = fieldRecord ? JSON.parse(fieldRecord) : [];
    try {
      const queryResult = buildEsQuery(filter, historyRecord);
      const columnsField = columnsConfigs[type].filter((item) => item.visible).map((item) => item.name);
      const body: any = {
        datasource_id: Number(data_id),
        busi_group_id: Number(bgid),
        mode: ['index', 'view'].includes(type) ? 'common' : type,
        indexed: getIndex(type, ESIndex, type === 'syslog' ? ip : index),
        start: start,
        end: end,
        kql: queryResult,
        highlight_term: val,
        message_field: !['index', 'view'].includes(type)
          ? ['@timestamp', ...columnsField]
          : time_field === ''
          ? columnsField
          : [time_field, ...columnsField],
        time_field: time_field ?? '@timestamp',
        center: {
          time: totalLogs[Math.floor(totalLogs.length / 2)].sort[0],
          tiebreaker: totalLogs[Math.floor(totalLogs.length / 2)].sort[1],
        },
        size: totalLogs?.length || 200,
        time_formats,
      };
      if (type === 'app') {
        // 应用日志
        body.service_names = serviceName ? serviceName.split(',') : [];
        body.service_environments = environment ? environment.split(',') : [];
      } else if (type === 'host' || type === 'graf') {
        // 主机日志
        body.idents = idents === '' ? [] : idents.split(',');
      } else if (type === 'pod') {
        // POD日志
        body.type = 'kubernates';
        body.pod_names = pod_names === '' ? [] : pod_names.split(',');
        body.cluster_names = cluster_names === '' ? [] : cluster_names.split(',');
      } else if (type === 'k8s-event') {
        // k8s-event 日志
        body.cluster_names = cluster_names === '' ? [] : cluster_names.split(',');
      } else if (type === 'container') {
        // 容器日志
        body.type = 'docker';
        body.container_names = container_names === '' ? [] : container_names.split(',');
        body.container_ids = container_ids === '' ? [] : container_ids.split(',');
      }
      return getLogsHighlights(body);
    } catch (err) {
      return new Promise((resolve) => {
        resolve({ dat: { entries: [] } });
      });
    }
  };

  // 更新时间流高亮
  const timeHightLightRequest = (val, filterValue) => {
    const {
      start,
      end,
      type,
      data_id,
      bgid,
      index,
      filter,
      ip,
      idents,
      time_field,
      pod_names,
      cluster_names,
      container_names,
      container_ids,
      service_names: serviceName,
      service_environments: environment,
      time_formats,
    } = filterValue;
    const fieldRecord = filterValue.fieldRecord;
    const historyRecord = fieldRecord ? JSON.parse(fieldRecord) : [];
    try {
      const queryResult = buildEsQuery(filter, historyRecord);
      const columnsField = columnsConfigs[type].filter((item) => item.visible).map((item) => item.name);
      const body: any = {
        datasource_id: Number(data_id),
        busi_group_id: Number(bgid),
        mode: ['index', 'view'].includes(type) ? 'common' : type,
        indexed: getIndex(type, ESIndex, type === 'syslog' ? ip : index),
        start,
        end,
        kql: queryResult,
        highlight_term: val,
        message_field: !['index', 'view'].includes(type)
          ? ['@timestamp', ...columnsField]
          : time_field === ''
          ? columnsField
          : [time_field, ...columnsField],
        time_field: time_field ?? '@timestamp',
        time_formats,
      };
      if (type === 'app') {
        // 应用日志
        body.service_names = serviceName ? serviceName.split(',') : [];
        body.service_environments = environment ? environment.split(',') : [];
      } else if (type === 'host' || type === 'graf') {
        // 主机日志
        body.idents = idents === '' ? [] : idents.split(',');
      } else if (type === 'pod') {
        // POD日志
        body.type = 'kubernates';
        body.pod_names = pod_names === '' ? [] : pod_names.split(',');
        body.cluster_names = cluster_names === '' ? [] : cluster_names.split(',');
      } else if (type === 'k8s-event') {
        // k8s-event 日志
        body.cluster_names = cluster_names === '' ? [] : cluster_names.split(',');
      } else if (type === 'container') {
        // 容器日志
        body.type = 'docker';
        body.container_names = container_names === '' ? [] : container_names.split(',');
        body.container_ids = container_ids === '' ? [] : container_ids.split(',');
      }
      return getLogsSummaryHighlights(body);
    } catch (err) {
      return new Promise((resolve) => {
        resolve({ dat: [] });
      });
    }
  };

  const handleHightLightResult = (contentHightLight, totalLogs) => {
    const logEntryHighlightsById = contentHightLight.dat.entries.reduce((singleHighlightLogEntriesById, entry) => {
      const highlightsForId = singleHighlightLogEntriesById[entry.id] || [];
      return {
        ...singleHighlightLogEntriesById,
        [entry.id]: [...highlightsForId, entry],
      };
    }, {});
    const result = totalLogs.map((logEntry) => ({
      ...logEntry,
      highlights: logEntryHighlightsById[logEntry._id]?.[0]?.highlights || undefined,
    }));
    const highlightIds = result.filter((item) => item.highlights);
    setHighlightEntries(highlightIds);
    return result;
  };

  const debounceFetcher = useCallback(
    _.debounce((val, logData, filterValue, visiblePointTime) => {
      setHightLightLoading(true);
      Promise.all([contentHightLightRequest(val, logData, filterValue), timeHightLightRequest(val, filterValue)]).then(
        ([contentHightLight, timeHightLight]) => {
          const logsWithhightlight = handleHightLightResult(contentHightLight, logData);
          setLogStream(logsWithhightlight);
          setSummaryHighlightBuckets(timeHightLight.dat);
          const visibleActivePoint = findClosestMultipleOfTwo(visiblePointTime);
          if (visibleActivePoint) {
            // 在可视区域内找到最接近中心区域的高亮元素
            setActiveId(visibleActivePoint.id);
          } else {
            // 可视区域内不存在高亮数据,查找可视区域以下数据,进行跳转
            const activeData = logsWithhightlight.find(
              (item) => item.sort[0] > visiblePointTime[visiblePointTime.length - 1]?.time && item.highlights,
            );
            if (activeData) {
              toAnchor(activeData._id);
              setActiveId(activeData._id);
            }
          }
          setHightLightLoading(false);
        },
      );
    }, 1000),
    [],
  );

  // 高亮显示
  const changeHeightLight = (val) => {
    setHighlight(val);
    if (val && val !== '' && logStream.length) {
      debounceFetcher(
        val,
        logStream,
        {
          ...filterData,
          start: buckets[0].start,
          end: buckets[buckets.length - 1].end,
        },
        visiblePointTime,
      );
    } else {
      const result = logStream.map((item) => _.omit(item, 'highlights'));
      setLogStream(result);
      setSummaryHighlightBuckets([]);
      setActiveId(undefined);
    }
  };

  // 关键字高亮锚点定位
  const toAnchor = (anchorName: string, position?: ScrollLogicalPosition) => {
    if (anchorName) {
      const anchorElement = document.getElementById(anchorName);
      if (anchorElement) {
        anchorElement.scrollIntoView({ behavior: 'smooth', block: position || 'center' });
      }
    }
  };

  // 获取当前页面的日志流可视区域
  const handleScroll = _.throttle(() => {
    const container = scrollRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const elements = Array.from(container.children);

    const visibleElements = elements
      .filter((element) => {
        const elementRect = element.getBoundingClientRect();
        return (
          elementRect.top >= containerRect.top &&
          elementRect.bottom <= containerRect.bottom &&
          element.id &&
          element.id !== ''
        );
      })
      .map((item: any) => ({ id: item.id, time: Number(item.dataset.time), isHighlight: item.dataset.isHighlight }));
    setVisiblePointTime(visibleElements);
  }, 300);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [scrollRef.current]);

  useEffect(() => {
    getLogConfig().then((res) => {
      setTimezone(res.dat.date_zone);
    });
  }, []);

  return (
    <PageLayout title={t('stream.title')} icon={<FileSyncOutlined />}>
      <div className='prometheus-page'>
        <Card bodyStyle={{ padding: 16 }} className='panel logs-wrapper log-stream-wrapper'>
          <div ref={filterRef}>
            <Filter
              onRedirection={onRedirection}
              onRefresh={onRefresh}
              pathType='log-stream'
              fieldcaps={fieldcaps}
              refreshFieldcaps={(val) => setFieldcaps(val)}
            />
          </div>
          <Row justify='space-between' align='middle' className='log-stream-filter'>
            <Col>
              <Space size='large'>
                {/* 文本自定义样式 */}
                <Popover
                  content={
                    <>
                      <div>
                        <span className='log-stream-popover-lable'>{t('row_height')}</span>
                        <Switch
                          checked={customStyle.wrap === 'wrap'}
                          onChange={(checked) =>
                            handleCustomStyle({ ...customStyle, wrap: checked ? 'wrap' : 'no-wrap' })
                          }
                        />
                      </div>
                      <div>
                        <span className='log-stream-popover-lable'>{t('stream.font_size')}</span>
                        <Radio.Group
                          onChange={(e) => handleCustomStyle({ ...customStyle, scale: e.target.value })}
                          value={customStyle.scale}
                          defaultValue='medium'
                        >
                          <Radio value='large'>{t('stream.large')}</Radio>
                          <Radio value='medium'>{t('stream.medium')}</Radio>
                          <Radio value='small'>{t('stream.small')}</Radio>
                        </Radio.Group>
                      </div>
                      <div>
                        <span className='log-stream-popover-lable'>{t('stream.display_column')}</span>
                        {filterData?.type === 'index' || filterData?.type === 'view' ? (
                          <Select
                            showSearch
                            style={{ width: '200px' }}
                            options={[{ name: '消息' }, ...(fields || [])]
                              ?.filter((ele) => !ele.name.startsWith('_'))
                              .map((item) => ({ label: item.name, value: item.name }))}
                            value={columnsConfigs[filterData.type][0].name}
                            onChange={(e) => {
                              setDefaultColumnsConfigs({
                                ...columnsConfigs,
                                [filterData.type]: [{ name: e, visible: true }],
                              });
                              setColumnsConfigs({ ...columnsConfigs, [filterData.type]: [{ name: e, visible: true }] });
                            }}
                          />
                        ) : (
                          <List
                            size='small'
                            bordered
                            dataSource={columnsConfigs[filterData?.type]}
                            renderItem={(item, idx) => (
                              <List.Item key={idx}>
                                <Space>
                                  <Checkbox
                                    checked={item.visible}
                                    onChange={(e) => {
                                      const newList = _.cloneDeep(columnsConfigs[filterData?.type]);
                                      const index = newList.findIndex((i) => i.name === item.name);
                                      newList[index].visible = e.target.checked;
                                      setDefaultColumnsConfigs({ ...columnsConfigs, [filterData?.type]: newList });
                                      setColumnsConfigs({ ...columnsConfigs, [filterData?.type]: newList });
                                    }}
                                  >
                                    {t(`stream.${item.name}`)}
                                  </Checkbox>
                                </Space>
                              </List.Item>
                            )}
                          />
                        )}
                      </div>
                    </>
                  }
                  trigger='click'
                  placement='bottomLeft'
                  className='log-stream-popover'
                >
                  <EyeOutlined /> {t('stream.custom')}
                </Popover>
                <Popover
                  content={
                    <Space>
                      <Input
                        placeholder={t('stream.required_highlight')}
                        value={highlight}
                        onChange={(e) => changeHeightLight(e.target.value)}
                      />
                      <Spin indicator={<LoadingOutlined spin />} spinning={hightLightLoading} />
                      <div>
                        <Button
                          size='small'
                          type='text'
                          disabled={!activeId} // 没有高亮或高亮范围不在可视区域,都不支持上下跳转
                          icon={<UpOutlined />}
                          onClick={() => {
                            const index = highlightEntries.findIndex((item) => item._id === activeId);
                            if (highlightEntries[index - 1]?._id) {
                              setActiveId(highlightEntries[index - 1]._id);
                              toAnchor(highlightEntries[index - 1]._id);
                            }
                          }}
                        />
                        <Button
                          size='small'
                          type='text'
                          disabled={!activeId}
                          icon={<DownOutlined />}
                          onClick={() => {
                            const index = highlightEntries.findIndex((item) => item._id === activeId);
                            if (highlightEntries[index + 1]?._id) {
                              setActiveId(highlightEntries[index + 1]._id);
                              toAnchor(highlightEntries[index + 1]._id);
                            }
                          }}
                        />
                        <Button
                          size='small'
                          type='text'
                          icon={<DeleteOutlined />}
                          onClick={() => changeHeightLight('')}
                        />
                      </div>
                    </Space>
                  }
                  trigger='click'
                  placement='bottomLeft'
                  className='log-stream-popover'
                >
                  <ClearOutlined /> {t('stream.highlight')}{' '}
                  {highlight && highlight !== '' && <CheckCircleFilled style={{ color: '#f04e98' }} />}
                </Popover>
              </Space>
            </Col>
            <Col>
              <Button
                disabled={!filterData}
                onClick={() => {
                  setStreaming(!streaming);
                  onRealTimeTransmission(!streaming);
                }}
                type={streaming ? 'default' : 'primary'}
                icon={streaming ? <PauseOutlined /> : <CaretRightOutlined />}
              >
                {streaming ? t('stream.stop_streaming') : t('stream.real_time_streaming')}
              </Button>
            </Col>
          </Row>
          <Spin spinning={loading}>
            {!_.isEmpty(logStream) || !_.isEmpty(buckets) ? (
              <Row wrap={false}>
                <Col flex='auto'>
                  <LogStream
                    logStream={logStream}
                    loading={listLoading}
                    activeId={activeId}
                    type={filterData?.type}
                    time_field={filterData?.time_field || '@timestamp'}
                    scrollRef={scrollRef}
                    customStyle={customStyle}
                    wrapperStyle={{ height: `calc(100vh - ${170 + filterRef?.current?.clientHeight ?? 0}px)` }}
                    columnsConfigs={columnsConfigs}
                    fieldcaps={fieldcaps}
                    timezone={timezone}
                    timeField={filterData?.time_formats?.fields}
                    footer={
                      logStream &&
                      logStream.length > 20 && (
                        <div style={{ display: 'flex', justifyContent: 'center', fontSize: 14, color: 'gray' }}>
                          {noMore && <div>没有更多数据了。</div>}
                          {loadingMore && <Spin indicator={<LoadingOutlined />} tip='Loading more...' />}
                          {!noMore && !loadingMore && (
                            <div style={{ textAlign: 'center', margin: '20px 0' }}>
                              <Button onClick={loadMore} loading={loadingMore}>
                                点击加载更多
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    }
                  />
                </Col>
                <Col
                  ref={minimapRef}
                  flex='100px'
                  style={{
                    margin: '32px 0 0 20px',
                    height: `calc(100vh - ${170 + filterRef.current?.clientHeight ?? 0}px)`,
                  }}
                >
                  <LogMinimap
                    start={buckets[0]?.start}
                    end={buckets[buckets.length - 1]?.end}
                    height={minimapRef.current?.getBoundingClientRect()?.height || 543}
                    width={100}
                    highlightedInterval={{
                      start: logStream.length
                        ? visiblePointTime[0]?.time
                        : timeTarget || buckets[buckets.length - 1]?.end,
                      end: logStream.length
                        ? visiblePointTime[visiblePointTime.length - 1]?.time
                        : timeTarget || buckets[buckets.length - 1]?.end,
                    }}
                    timezone={timezone}
                    jumpToTarget={jumpToTargetPosition}
                    summaryBuckets={buckets}
                    summaryHighlightBuckets={summaryHighlightBuckets.length > 0 ? summaryHighlightBuckets : []}
                    target={timeTarget || buckets[buckets.length - 1]?.end}
                  />
                </Col>
              </Row>
            ) : (
              <div className='empty-wrapper'>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            )}
          </Spin>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Stream;
