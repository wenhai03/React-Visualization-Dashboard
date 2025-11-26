import _ from 'lodash';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import type { strategyGroup, strategyStatus, TagKeysRes, TagValuesRes } from '@/store/warningInterface';
import { PAGE_SIZE } from '@/utils/constant';
import React from 'react';
import queryString from 'query-string';
import { BASE_API_PREFIX } from '@/utils/constant';

// 获得策略分组列表
export const getStrategyGroupList = function (query?: string, p = 1) {
  return request(`${BASE_API_PREFIX}/alert-rule-groups`, {
    method: RequestMethod.Get,
    params: {
      query,
      p,
      limit: PAGE_SIZE,
    },
  });
};

// 添加策略分组
export const addStrategyGroup = function (data: strategyGroup) {
  return request(`${BASE_API_PREFIX}/alert-rule-groups`, {
    method: RequestMethod.Post,
    data,
  });
};

// 获取策略分组
export const getStrategyGroup = function (id: number) {
  return request(`${BASE_API_PREFIX}/alert-rule-group/${id}`, {
    method: RequestMethod.Get,
  });
};

// 删除策略分组
export const deleteStrategyGroup = function (id: number) {
  return request(`${BASE_API_PREFIX}/alert-rule-group/${id}`, {
    method: RequestMethod.Delete,
  });
};

// 更新策略分组
export const updateStrategyGroup = function (data: Partial<strategyGroup> & { id: number }) {
  return request(`${BASE_API_PREFIX}/alert-rule-group/${data.id}`, {
    method: RequestMethod.Put,
    data,
  });
};

//// 获取策略列表
export const getStrategyGroupSubList = function (params: { id: number }) {
  return request(`${BASE_API_PREFIX}/busi-group/${params.id}/alert-rules`, {
    method: RequestMethod.Get,
  });
};

// 获取收藏分组
export const getFavoritesStrategyGroups = function () {
  return request(`${BASE_API_PREFIX}/alert-rule-groups/favorites`, {
    method: RequestMethod.Get,
  });
};

// 添加收藏分组
export const addFavoriteGroup = function (id: number) {
  return request(`${BASE_API_PREFIX}/alert-rule-group/${id}/favorites`, {
    method: RequestMethod.Post,
    data: {
      id,
    },
  });
};

// 删除收藏分组
export const deleteFavoriteGroup = function (id: number) {
  return request(`${BASE_API_PREFIX}/alert-rule-group/${id}/favorites`, {
    method: RequestMethod.Delete,
    data: {
      id,
    },
  });
};

export const getMetrics = function (params = {}) {
  return request(`${BASE_API_PREFIX}/prometheus/api/v1/label/__name__/values`, {
    method: RequestMethod.Get,
    params,
    paramsSerializer: function (params) {
      return queryString.stringify(params, { arrayFormat: 'bracket' });
    },
  });
};

export const getMetricsDesc = function (data = []) {
  return request(`${BASE_API_PREFIX}/metrics/desc`, {
    method: RequestMethod.Post,
    data,
  });
};

export const getTagKeys = function (params): Promise<TagKeysRes> {
  return request(`${BASE_API_PREFIX}/tag-keys`, {
    method: RequestMethod.Post,
    data: params,
  });
};

export const getTagValuesByKey = function (params): Promise<TagValuesRes> {
  return request(`${BASE_API_PREFIX}/tag-values`, {
    method: RequestMethod.Post,
    data: params,
  });
};

export const getWarningStrategy = function (id): Promise<any> {
  return request(`${BASE_API_PREFIX}/alert-rule/${id}`, {
    method: RequestMethod.Get,
  });
};

export const addStrategy = function (data: any[], busiId: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${busiId}/alert-rules`, {
    method: 'POST',
    data: data,
  });
};

export const importStrategy = function (data: any[], busiId: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${busiId}/alert-rules/import`, {
    method: 'POST',
    data: data,
  });
};

export const EditStrategy = function (data: any[], busiId: number, strategyId: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${busiId}/alert-rule/${strategyId}`, {
    method: RequestMethod.Put,
    data: data,
  });
};

export const deleteStrategy = function (ids: number[], strategyId: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${strategyId}/alert-rules`, {
    method: RequestMethod.Delete,
    data: { ids },
  });
};

export const batchDeleteStrategy = function (ruleId, ids: Array<number>) {
  return request(`${BASE_API_PREFIX}/alert-rule-group/${ruleId}/alert-rules`, {
    method: RequestMethod.Delete,
    data: { ids },
  });
};

export const prometheusQuery = function (data, datasourceValue, groupId): Promise<any> {
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/api/v1/query`, {
    method: RequestMethod.Get,
    params: data,
  });
};

/**
 * 批量更新规则
 */
export const updateAlertRules = function (
  data: {
    ids: React.Key[];
    fields: any;
    action?: string;
  },
  busiId: number,
) {
  return request(`${BASE_API_PREFIX}/busi-group/${busiId}/alert-rules/fields`, {
    method: RequestMethod.Put,
    data: data,
  });
};

/**
 * 获取未恢复告警列表
 */
export function getBusiGroupsCurAlerts(ids: number[]) {
  return request(`${BASE_API_PREFIX}/busi-groups/alertings`, {
    method: RequestMethod.Get,
    params: { ids: ids.join(',') },
  });
}

export const getAlertEvents = function (data) {
  return request(`${BASE_API_PREFIX}/alert-events`, {
    method: RequestMethod.Get,
    params: data,
  });
};
/**
 * 获取全量告警历史页面
 */
export const getHistoryEvents = function (data) {
  return request(`${BASE_API_PREFIX}/history-alert-events`, {
    method: RequestMethod.Get,
    params: data,
  });
};
// 获取告警详情
export function getAlertEventsById(eventId) {
  let url = `${BASE_API_PREFIX}/alert-cur-event`;
  return request(`${url}/${eventId}`, {
    method: RequestMethod.Get,
  });
}

export function getHistoryEventsById(eventId) {
  let url = `${BASE_API_PREFIX}/alert-his-event`;
  return request(`${url}/${eventId}`, {
    method: RequestMethod.Get,
  });
}
/**
 * 批量删除(忽略)告警历史
 */
export const deleteAlertEvents = function (ids: Array<number | string>) {
  return request(`${BASE_API_PREFIX}/alert-cur-events`, {
    method: RequestMethod.Delete,
    data: {
      ids,
    },
  });
};

/**
 * 批量更新告警策略状态
 */
export const updateAlertEventsStatus = function (ids: Array<number>, status: strategyStatus) {
  return request(`${BASE_API_PREFIX}/alert-rules/status`, {
    method: RequestMethod.Put,
    data: {
      ids,
      status,
    },
  });
};
/**
 * 批量更新告警通知接收组+接收人
 */
export const updateAlertEventsNotifyGroups = function (
  ids: Array<number>,
  notify_groups: string,
  notify_users: string,
) {
  return request(`${BASE_API_PREFIX}/alert-rules/notify-groups`, {
    method: RequestMethod.Put,
    data: {
      ids,
      notify_groups,
      notify_users,
    },
  });
};
/**
 * 批量更新告警通知接收人
 */
export const updateAlertEventsNotifyUsers = function (ids: Array<number>, notify_users: string) {
  return request(`${BASE_API_PREFIX}/alert-rules/notify-users`, {
    method: RequestMethod.Put,
    data: {
      ids,
      notify_users,
    },
  });
};
/**
 * 批量更新告警通知媒介
 */
export const updateAlertEventsNotifyChannels = function (ids: Array<number>, notify_channels: string) {
  return request(`${BASE_API_PREFIX}/alert-rules/notify-channels`, {
    method: RequestMethod.Put,
    data: {
      ids,
      notify_channels,
    },
  });
};
/**
 * 批量更新告警附加标签
 */
export const updateAlertEventsAppendTags = function (ids: Array<number>, append_tags: string) {
  return request(`${BASE_API_PREFIX}/alert-rules/append-tags`, {
    method: RequestMethod.Put,
    data: {
      ids,
      append_tags,
    },
  });
};

export const getBuiltinAlerts = function () {
  return request(`${BASE_API_PREFIX}/builtin/alerts`, {
    method: RequestMethod.Get,
  });
};

export const createBuiltinAlerts = function (name: string, cluster: string, id: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/alert-rules/builtin`, {
    method: RequestMethod.Post,
    data: { name, cluster },
  });
};

export const getAggrAlerts = function () {
  return request(`${BASE_API_PREFIX}/alert-aggr-views`, {
    method: RequestMethod.Get,
  });
};

export const AddAggrAlerts = function (data) {
  return request(`${BASE_API_PREFIX}/alert-aggr-views`, {
    method: RequestMethod.Post,
    data,
  });
};

export const updateAggrAlerts = function (data) {
  return request(`${BASE_API_PREFIX}/alert-aggr-views`, {
    method: RequestMethod.Put,
    data,
  });
};

export const deleteAggrAlerts = function (ids: number[]) {
  return request(`${BASE_API_PREFIX}/alert-aggr-views`, {
    method: RequestMethod.Delete,
    data: { ids },
  });
};

export const getAlertCards = function (params) {
  return request(`${BASE_API_PREFIX}/alert-cur-events/card`, {
    method: RequestMethod.Get,
    params,
  });
};

export const getCardDetail = function (ids) {
  return request(`${BASE_API_PREFIX}/alert-cur-events/card/details`, {
    method: RequestMethod.Post,
    data: { ids },
  });
};

export const getBrainParams = function () {
  return request('/api/fc-brain/params', {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.data;
  });
};

export function getDsQuery(datasourceValue: number, requestBody, board_id, group_id, chart_share_id?: string) {
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/_msearch`, {
    method: RequestMethod.Post,
    data: requestBody,
    headers: chart_share_id
      ? {
          'Content-Type': 'application/json',
          'Chart-Share-Id': chart_share_id,
        }
      : {
          'Content-Type': 'application/json',
          board_id: board_id,
        },
    silence: true,
  }).then((res) => {
    const dat = _.get(res, 'responses');
    return dat;
  });
}

// 旧版获取索引的接口，先保留
// export function getIndices(datasourceValue: number) {
//   return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/_cat/indices`, {
//     method: RequestMethod.Get,
//     params: {
//       format: 'json',
//     },
//   }).then((res) => {
//     return _.sortBy(_.compact(_.map(res, 'index')));
//   });
// }

// 获取全部 ES 索引
export function getIndices(datasourceValue: number, groupId: number) {
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/*`, {
    method: RequestMethod.Get,
    params: {
      expand_wildcards: 'open',
      features: 'aliases',
    },
  }).then((res) => {
    const IndicesObj = res;
    delete res.success;
    return Object.keys(IndicesObj);
  });
}

// 查询所有索引/数据流(有进行分类)
export function getDataCategory(params) {
  return request(`${BASE_API_PREFIX}/es/resolve/index`, {
    method: RequestMethod.Get,
    silence: true,
    params,
  }).then((res) => res.dat);
}

// 日志、链路过滤条件字段列表
export function getFieldcaps(params: {
  busi_group_id: number;
  datasource_id: number;
  mode: 'host' | 'container' | 'pod' | 'graf' | 'common';
  indexed?: string;
  fields: string;
}) {
  return request(`${BASE_API_PREFIX}/es/field_caps`, {
    method: RequestMethod.Get,
    params,
  });
}

export const getAlertEventList = function (params) {
  return request(`${BASE_API_PREFIX}/alert-his-events/list`, {
    method: RequestMethod.Get,
    params,
  }).then((res) => res?.dat?.list || []);
};

// 获取自定义模板
export function getAlertNotifyTpls(params) {
  return request(`${BASE_API_PREFIX}/notify-tpls/custom`, {
    method: RequestMethod.Get,
    params,
  });
}

// 新增自定义模板
export function createNotifyTpls(data) {
  return request(`${BASE_API_PREFIX}/notify-tpl`, {
    method: RequestMethod.Post,
    data,
  });
}

// 修改自定义模板
export function updateNotifyTpls(data) {
  return request(`${BASE_API_PREFIX}/notify-tpl/content`, {
    method: RequestMethod.Put,
    data,
  });
}

// 告警ES告警测试
export function searchAlertTest(data) {
  return request(`${BASE_API_PREFIX}/alert/elasticsearch/test`, {
    method: RequestMethod.Post,
    data,
  });
}
// 告警ES告警日志查询
export function searchAlertLog(data) {
  return request(`${BASE_API_PREFIX}/alert/elasticsearch/get_log`, {
    method: RequestMethod.Post,
    data,
  });
}

// 查询训练结果信息
export function getAlertForecast(params) {
  return request(`${BASE_API_PREFIX}/alert-forecast`, {
    method: RequestMethod.Get,
    params,
  });
}

// 查询训练指标
export function getAlertForecastMetric(params) {
  return request(`${BASE_API_PREFIX}/alert-forecast/metric`, {
    method: RequestMethod.Get,
    params,
  });
}

//  查询是否开启智能阈值告警
export function getWhetherEnableForecast() {
  return request(`${BASE_API_PREFIX}/alert-forecast/enable`, {
    method: RequestMethod.Get,
  });
}
