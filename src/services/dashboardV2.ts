import _ from 'lodash';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

// 仪表盘列表
export const getDashboards = function (id: number | string) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/boards`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat;
  });
};

interface Dashboard {
  name: string;
  ident?: string;
  tags: string;
  configs?: string;
  mode?: 0 | 1;
}
// 创建仪表盘
export const createDashboard = function (id: number, data: Dashboard) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/boards`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => {
    return res.dat;
  });
};

// 克隆仪表盘
export const cloneDashboard = function (busiId: number, id: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${busiId}/board/${id}/clone`, {
    method: RequestMethod.Post,
  });
};

// 删除仪表盘
export const removeDashboards = function (ids: number[]) {
  return request(`${BASE_API_PREFIX}/boards`, {
    method: RequestMethod.Delete,
    data: {
      ids,
    },
  });
};

// 导出仪表盘
// 仪表盘迁移页面需要
export const exportDashboard = function (busiId: number | string, ids: number[]) {
  return request(`${BASE_API_PREFIX}/busi-group/${busiId}/dashboards/export`, {
    method: RequestMethod.Post,
    data: { ids },
  }).then((res) => {
    return res.dat;
  });
};

// 获取仪表盘详情
export const getDashboard = function (id: string | number) {
  return request(`${BASE_API_PREFIX}/board/${id}`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat;
  });
};

// 更新仪表盘 - 只能更新 name 和 tags
export const updateDashboard = function (id: string | number, data: { name: string; ident?: string; tags: string }) {
  return request(`${BASE_API_PREFIX}/board/${id}`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => res.dat);
};

// 更新仪表盘 - 只能更新 configs
export const updateDashboardConfigs = function (id: string | number, data: { configs: string }) {
  return request(`${BASE_API_PREFIX}/board/${id}/configs`, {
    method: RequestMethod.Put,
    data,
  });
};

// 更新仪表盘 - 只能更新 public
export const updateDashboardPublic = function (id: string | number, data: { public: number }) {
  return request(`${BASE_API_PREFIX}/board/${id}/public`, {
    method: RequestMethod.Put,
    data,
  });
};

// boards v2 api
export const migrateDashboard = function (id: number, data: { name: string; tags: string; configs: string }) {
  return request(`${BASE_API_PREFIX}/dashboard/${id}/migrate`, {
    method: RequestMethod.Put,
    data,
  });
};

// 以下是非仪表盘相关的接口

export const getBuiltinDashboard = function (cate_code, code) {
  return request(`${BASE_API_PREFIX}/builtin/boards/${cate_code}/${code}`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat;
  });
};

export const getDashboardPure = function (id: string) {
  return request(`${BASE_API_PREFIX}/board/${id}/pure`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat;
  });
};

const signals = {};

export const fetchHistoryRangeBatch = (data, signalKey, board_id, group_id, isShare) => {
  const controller = new AbortController();
  const { signal } = controller;
  if (signalKey && signals[signalKey] && signals[signalKey].abort) {
    signals[signalKey].abort();
  }
  signals[signalKey] = controller;
  return request(`${BASE_API_PREFIX}/query-range-batch`, {
    method: RequestMethod.Post,
    data,
    signal,
    silence: true,
    headers: !isShare
      ? {
          board_id: board_id,
        }
      : undefined,
  }).finally(() => {
    delete signals[signalKey];
  });
};

export const fetchHistoryInstantBatch = (data, signalKey, board_id, group_id, isShare) => {
  const controller = new AbortController();
  const { signal } = controller;
  if (signalKey && signals[signalKey] && signals[signalKey].abort) {
    signals[signalKey].abort();
  }
  signals[signalKey] = controller;
  return request(`${BASE_API_PREFIX}/query-instant-batch`, {
    method: RequestMethod.Post,
    data,
    signal,
    silence: true,
    headers: !isShare
      ? {
          board_id: board_id,
        }
      : undefined,
  }).finally(() => {
    delete signals[signalKey];
  });
};

export const getLabelNames = function (data, datasourceValue: number, groupId: number, chart_share_id?: string) {
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/api/v1/labels`, {
    method: RequestMethod.Get,
    params: { ...data },
    silence: true,
    headers: chart_share_id
      ? {
          'Chart-Share-Id': chart_share_id,
        }
      : {},
  });
};

export const getLabelValues = function (
  label,
  data,
  datasourceValue: number,
  groupId: number,
  chart_share_id?: string,
) {
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/api/v1/label/${label}/values`, {
    method: RequestMethod.Get,
    params: { ...data },
    silence: true,
    headers: chart_share_id
      ? {
          'Chart-Share-Id': chart_share_id,
        }
      : {},
  });
};

export const getMetricSeries = function (data, datasourceValue: number, groupId: number, chart_share_id?: string) {
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/api/v1/series`, {
    method: RequestMethod.Get,
    params: { ...data },
    silence: true,
    headers: chart_share_id
      ? {
          'Chart-Share-Id': chart_share_id,
        }
      : {},
  });
};

export const getMetric = function (data = {}, datasourceValue: number, groupId: number, chart_share_id?: string) {
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/api/v1/label/__name__/values`, {
    method: RequestMethod.Get,
    params: { ...data },
    silence: true,
    headers: chart_share_id
      ? {
          'Chart-Share-Id': chart_share_id,
        }
      : {},
  });
};

export const getQueryResult = function (data, datasourceValue: number, groupId: number, chart_share_id?: string) {
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/api/v1/query`, {
    method: RequestMethod.Get,
    params: { ...data },
    silence: true,
    headers: chart_share_id
      ? {
          'Chart-Share-Id': chart_share_id,
        }
      : {},
  });
};

export function getESVariableResult(
  datasourceValue: number,
  index,
  requestBody,
  groupId: number,
  chart_share_id?: string,
) {
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/${index}/_search`, {
    method: RequestMethod.Post,
    data: JSON.stringify(requestBody),
    headers: chart_share_id
      ? {
          'Content-Type': 'application/json',
          'Chart-Share-Id': chart_share_id,
        }
      : {
          'Content-Type': 'application/json',
        },
    silence: true,
  }).then((res) => {
    const dat = _.map(_.get(res, 'aggregations.A.buckets'), 'key');
    return dat;
  });
}

// 查询图表分享列表
export const getShareChardRecord = function (params) {
  return request(`${BASE_API_PREFIX}/share-charts/list`, {
    method: RequestMethod.Get,
    params,
  });
};

// 修改图表分享
export const setShareChardRecord = function (data) {
  return request(`${BASE_API_PREFIX}/share-charts`, {
    method: RequestMethod.Put,
    data,
  });
};

// 删除图表分享
export const deleteShareChardRecord = function (data) {
  return request(`${BASE_API_PREFIX}/share-charts`, {
    method: RequestMethod.Delete,
    data,
  });
};
