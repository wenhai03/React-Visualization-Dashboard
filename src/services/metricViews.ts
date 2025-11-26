import _ from 'lodash';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { IRawTimeRange, timeRangeUnix } from '@/components/TimeRangePicker';
import { BASE_API_PREFIX } from '@/utils/constant';

export const getLabelValues = function (
  datasourceValue: number,
  label: string,
  range: IRawTimeRange,
  groupId: number,
  match?: string,
) {
  const params = {
    ...timeRangeUnix(range),
  };
  if (match) {
    params['match[]'] = match;
  }
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/api/v1/label/${label}/values`, {
    method: RequestMethod.Get,
    params,
  }).then((res) => {
    return res?.data;
  });
};

export const getLabels = function (datasourceValue: number, match: string, range: IRawTimeRange, groupId: number) {
  const params = {
    ...timeRangeUnix(range),
  };
  if (match) {
    params['match[]'] = match;
  }
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/api/v1/labels`, {
    method: RequestMethod.Get,
    params,
  }).then((res) => {
    return res?.data;
  });
};

export const getMetricValues = function (
  datasourceValue: number,
  match: string,
  range: IRawTimeRange,
  groupId: number,
) {
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/api/v1/label/__name__/values`, {
    method: RequestMethod.Get,
    params: {
      ...timeRangeUnix(range),
      'match[]': match,
    },
  }).then((res) => {
    return res?.data;
  });
};

function getQuery(params: {
  isAggr: boolean;
  aggrFunc: string;
  calcArr: string[];
  metric: string;
  match: string;
  offset: string;
  aggrGroups: string[];
}) {
  const { isAggr, aggrFunc, calcArr, metric, match, offset, aggrGroups } = params;
  return `${isAggr ? aggrFunc + '(' : ''}${calcArr[0] ? calcArr[0] + '(' : ''}${metric}${match}${
    calcArr[1] ? `[${calcArr[1]}]` : ''
  }${offset ? ` offset ${offset}` : ''}${calcArr[0] ? ')' : ''}${isAggr ? `) by (${_.join(aggrGroups, ', ')})` : ''}`;
}

const getSerieName = (metric: Object) => {
  let name = metric['__name__'] || '';
  _.forEach(_.omit(metric, '__name__'), (value, key) => {
    name += ` ${key}: ${value}`;
  });
  return _.trim(name);
};

export const getExprs = (params) => {
  const { metric, match, calcFunc, comparison, aggrFunc, aggrGroups } = params;
  const calcArr = _.split(calcFunc, '_');
  const isAggr = aggrGroups.length > 0;
  const exprs = [
    getQuery({
      isAggr,
      aggrFunc,
      calcArr,
      metric,
      match,
      offset: '',
      aggrGroups,
    }),
    ..._.map(comparison, (item) => {
      return getQuery({
        isAggr,
        aggrFunc,
        calcArr,
        metric,
        match,
        offset: item,
        aggrGroups,
      });
    }),
  ];
  return exprs;
};

export const getQueryRange = function (
  datasourceValue: number,
  params: {
    metric: string;
    match: string;
    range: IRawTimeRange;
    step?: number;
    calcFunc: string;
    comparison: string[];
    aggrFunc: string;
    aggrGroups: string[];
  },
  curBusiId: number,
) {
  const { metric, match, range, step, calcFunc, comparison, aggrFunc, aggrGroups } = params;
  let { start, end } = timeRangeUnix(range);
  let _step = step;
  if (!step) _step = Math.max(Math.floor((end - start) / 240), 1);
  const exprs = getExprs({
    metric,
    match,
    calcFunc,
    comparison,
    aggrFunc,
    aggrGroups,
  });
  const requests = _.map(exprs, (expr) => {
    return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/api/v1/query_range`, {
      method: RequestMethod.Get,
      params: {
        start: start - (start % _step!),
        end: end - (end % _step!),
        step: _step,
        query: expr,
      },
    });
  });
  return Promise.all(requests).then((res: any) => {
    const series: any[] = [];
    _.forEach(['current', ...comparison], (item, idx) => {
      const dat = res[idx]?.data ? res[idx]?.data : res[idx]; // 处理环比的情况返回结构不一致
      const data = dat.result || [];
      _.forEach(data, (subItem) => {
        series.push({
          metric: subItem.metric,
          color: subItem.color,
          offset: item,
          name: `${getSerieName(subItem.metric)}${item !== 'current' ? ` offset ${item}` : ''}`,
          id: _.uniqueId('series_'),
          data: subItem.values,
        });
      });
    });
    return series;
  });
};

export const getList = function () {
  return request(`${BASE_API_PREFIX}/metric-views`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res?.dat;
  });
};

export const addMetricView = function (data) {
  return request(`${BASE_API_PREFIX}/metric-views`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => {
    return res?.dat;
  });
};

export const updateMetricView = function (data) {
  return request(`${BASE_API_PREFIX}/metric-views`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => {
    return res?.dat;
  });
};

export const deleteMetricView = function (data) {
  return request(`${BASE_API_PREFIX}/metric-views`, {
    method: RequestMethod.Delete,
    data,
  }).then((res) => {
    return res?.dat;
  });
};

export const setTmpChartData = function (data: { configs: string }[]) {
  return request(`${BASE_API_PREFIX}/share-charts`, {
    method: RequestMethod.Post,
    data,
  });
};

// 查询图表分享
export const getShareChartData = function (ids: string) {
  return request(`${BASE_API_PREFIX}/share-charts?ids=${ids}`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat[0];
  });
};

// 生成分享图表链接id
export const createShareChartID = function (
  data: {
    configs: string;
    expiration: number;
    user_ids: number[];
    group_id: number;
    note: string;
    share_type: 1 | 2;
  }[],
) {
  return request(`${BASE_API_PREFIX}/share-charts`, {
    method: RequestMethod.Post,
    data,
  });
};

export const getMetricsDesc = function (data) {
  return request(`${BASE_API_PREFIX}/metrics/desc`, {
    method: RequestMethod.Post,
    data,
    silence: true,
  }).then((res) => {
    return res?.dat;
  });
};

export const getQueryRangeSingleMetric = function (params: {
  metric: string;
  match: string;
  range: IRawTimeRange;
  calcFunc: string;
}) {
  const { metric, match, range, calcFunc } = params;
  let { start, end } = timeRangeUnix(range);
  const step = Math.max(Math.floor((end - start) / 240), 1);
  const query = `${calcFunc}(${metric}${match}) by (ident)`;
  return request(`${BASE_API_PREFIX}/prometheus/api/v1/query_range`, {
    method: RequestMethod.Get,
    params: {
      start,
      end,
      step,
      query,
    },
  });
};
