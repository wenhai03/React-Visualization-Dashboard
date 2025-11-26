import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import _ from 'lodash';
import { mappingsToFields, flattenHit, proxyToRecord } from '@/pages/logs/utils';
import { BASE_API_PREFIX } from '@/utils/constant';

export function getFields(datasourceValue: number, index?: string, type?: string, groupId?: number) {
  const url = index ? `/${index}/_mapping` : '/_mapping';
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}${url}?pretty=true`, {
    method: RequestMethod.Get,
    silence: true,
  }).then((res) => {
    return {
      allFields: mappingsToFields(res),
      fields: type ? mappingsToFields(res, type) : [],
    };
  });
}

// 获取指定标签的数组,包含：
// 应用日志：service_name、 service_environment
// 主机日志：ident
// POD日志：pod_name
// 容器日志： container_name、container_id
export const getLabelValues = function (data) {
  return request(`${BASE_API_PREFIX}/logs/label-values`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => res.dat);
};

// ES 过滤字段列表查询（目前用于应用日志的服务、环境列表查询）
export const getTermsList = function (data) {
  return request(`${BASE_API_PREFIX}/es/terms_list`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => res.dat);
};

// 通用日志查询
export function getLogSearch(data) {
  return request(`${BASE_API_PREFIX}/logs/search`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => {
    const dat = _.get(res, 'dat.hits');
    const list = dat.hits?.map((item) => ({
      ...item,
      fields: proxyToRecord(flattenHit(item)),
    }));
    const count_by_date = _.get(res, 'dat.aggregations.count_by_date.buckets');
    const total = _.get(res, 'dat.aggregations.total_count.value');
    return {
      total: total,
      count_by_date,
      list,
    };
  });
}

// ERP 日志查询
export function getErpLogSearch(data) {
  return request(`${BASE_API_PREFIX}/c/cnd/erp/log`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => {
    const dat = _.get(res, 'dat.hits');
    const list = dat.hits?.map((item) => ({
      ...item,
      fields: proxyToRecord(flattenHit(item)),
    }));
    const count_by_date = _.get(res, 'dat.aggregations.count_by_date.buckets');
    const total = _.get(res, 'dat.aggregations.total_count.value');
    return {
      total: total,
      count_by_date,
      list,
    };
  });
}

// 日志详情
export function getLogDetailSearch(data) {
  return request(`${BASE_API_PREFIX}/logs/search`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => {
    const dat = _.get(res, 'dat.hits.hits[0]');
    return dat;
  });
}

// 日志流高亮
export function getLogsHighlights(data) {
  return request(`${BASE_API_PREFIX}/logs/entries/highlights`, {
    method: RequestMethod.Post,
    data,
  });
}

// 日志流高亮汇总（时间模块）
export function getLogsSummaryHighlights(data) {
  return request(`${BASE_API_PREFIX}/logs/entries/summary_highlights`, {
    method: RequestMethod.Post,
    data,
  });
}

// 日志查询 获取自定义展示列
export function getLogsCustomConfig(params) {
  return request(`${BASE_API_PREFIX}/custom_config`, {
    method: RequestMethod.Get,
    params,
  });
}

// 日志查询 新增自定义展示列
export function createLogsCustomConfig(data) {
  return request(`${BASE_API_PREFIX}/custom_config`, {
    method: RequestMethod.Post,
    data,
  });
}

// 日志查询 修改自定义展示列
export function updateLogsCustomConfig(data) {
  return request(`${BASE_API_PREFIX}/custom_config`, {
    method: RequestMethod.Put,
    data,
  });
}

// 通用日志分页下载
export function logsDownLoad(data) {
  return request(`${BASE_API_PREFIX}/logs/download_page`, {
    method: RequestMethod.Post,
    data,
  });
}

// 查询业务组集群
export function getGroupCluster(params: { busi_group_id: number }) {
  return request(`${BASE_API_PREFIX}/target/group/cluster`, {
    method: RequestMethod.Get,
    params,
  });
}
