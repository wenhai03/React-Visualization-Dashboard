import _ from 'lodash';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';
import type { baseItem, tracesListItem, tracesSamplesItem } from '@/store/tracesInterface';

// 获取链路追踪列表-状态
export function getTracesSamples(data: tracesSamplesItem) {
  return request(`${BASE_API_PREFIX}/apm/service/transactions/traces/samples`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => res.dat);
}

// 获取链路追踪列表-状态
export function getTransactionStats(data: tracesListItem) {
  return request(`${BASE_API_PREFIX}/apm/services/transaction_stats`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => res.dat);
}

// 获取链路追踪列表-错误和指标
export function getErrorMetricDoc(data: tracesListItem) {
  return request(`${BASE_API_PREFIX}/apm/services/error_metric_documents`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => res.dat);
}

// 获取环境列表 environments
export function getServiceEnvironments(params: baseItem) {
  return request(`${BASE_API_PREFIX}/apm/service/environments`, {
    method: RequestMethod.Get,
    params,
  }).then((res) => res.dat);
}

// 获取事务类型列表 transaction_types
export function getServiceTransactionTypes(params: baseItem) {
  return request(`${BASE_API_PREFIX}/apm/service/transaction_types`, {
    method: RequestMethod.Get,
    params,
  }).then((res) => res.dat);
}

// 获取服务名列表 service_names
export function getServiceName(params: baseItem) {
  return request(`${BASE_API_PREFIX}/apm/service/service_names`, {
    method: RequestMethod.Get,
    params,
  }).then((res) => res.dat);
}

// 获取事务名称列表 transaction.name
export function getTransactionName(params) {
  return request(`${BASE_API_PREFIX}/apm/service/transaction_names`, {
    method: RequestMethod.Get,
    params,
  }).then((res) => res.dat);
}

// 获取服务追踪内的事务列表
export function getTransactionsList(data: tracesListItem) {
  return request(`${BASE_API_PREFIX}/apm/service/transactions/main_statistics`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => res.dat);
}

// 获取链路追溯的事务列表
export function getServicetransactionsList(data: tracesListItem) {
  return request(`${BASE_API_PREFIX}/apm/service/traces`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => res.dat);
}

// 获取 APM 配置列表
export function getApmAgentConfig(params) {
  return request(`${BASE_API_PREFIX}/apm/agent-config`, {
    method: RequestMethod.Get,
    params,
  });
}

// 查询单项配置详情
export function getApmAgentConfigDetail(params) {
  return request(`${BASE_API_PREFIX}/apm/agent-config/search`, {
    method: RequestMethod.Get,
    params,
  });
}

// 查询服务列表
export function getServiceNameList(params) {
  return request(`${BASE_API_PREFIX}/apm/service`, {
    method: RequestMethod.Get,
    params,
  });
}

// 保存 APM　配置
export function updateApmAgentConfig(data) {
  return request(`${BASE_API_PREFIX}/apm/agent-config`, {
    method: RequestMethod.Put,
    data,
  });
}

// 删除 APM 配置
export function deleteApmAgentConfig(data) {
  return request(`${BASE_API_PREFIX}/apm/agent-config`, {
    method: RequestMethod.Delete,
    data,
  });
}

// 获取 APM 表单配置
export function getApmFormConfig(params) {
  return request(`${BASE_API_PREFIX}/apm/form-config`, {
    method: RequestMethod.Get,
    params,
  });
}

// 创建 APM 表单配置
export function createApmFormConfig(data) {
  return request(`${BASE_API_PREFIX}/apm/form-config`, {
    method: RequestMethod.Post,
    data,
  });
}

// 更新 APM 表单配置
export function updateApmFormConfig(data) {
  return request(`${BASE_API_PREFIX}/apm/form-config`, {
    method: RequestMethod.Put,
    data,
  });
}

// 删除 APM 表单配置
export function deleteApmFormConfig(data) {
  return request(`${BASE_API_PREFIX}/apm/form-config`, {
    method: RequestMethod.Delete,
    data,
  });
}

// APM 配置管理数据导出
export function exportApmFormConfig() {
  return request(`${BASE_API_PREFIX}/apm/form-config/all`, {
    method: RequestMethod.Get,
  });
}

// APM 延迟分布
export function getAPMLatency(data) {
  return request(`${BASE_API_PREFIX}/apm/service/transactions/latency`, {
    method: RequestMethod.Post,
    data,
  });
}

// APM 失败事务率
export function getAPMErrorRate(data) {
  return request(`${BASE_API_PREFIX}/apm/service/transactions/error_rate`, {
    method: RequestMethod.Post,
    data,
  });
}

// APM 错误组（列表）
export function getAPMErrorList(data) {
  return request(`${BASE_API_PREFIX}/apm/service/error/main_statistics`, {
    method: RequestMethod.Post,
    data,
  });
}

// APM 错误分布（错误发生次数、错误详情内的发生次数）
export function getAPMErrorDistribution(data) {
  return request(`${BASE_API_PREFIX}/apm/service/error/distribution`, {
    method: RequestMethod.Post,
    data,
  });
}

// APM 错误信息
export function getAPMErrorMessage(key, data) {
  return request(`${BASE_API_PREFIX}/apm/service/error/${key}`, {
    method: RequestMethod.Post,
    data,
  });
}

// APM 错误排名前五
export function getAPMErrorTopErroneousTransactions(data) {
  return request(`${BASE_API_PREFIX}/apm/service/error/top_erroneous_transactions`, {
    method: RequestMethod.Post,
    data,
  });
}

// APM 获取元数据
export function getAPMErroMmetadata(key, params) {
  return request(`${BASE_API_PREFIX}/apm/event_metadata/${key}`, {
    method: RequestMethod.Get,
    params,
  });
}

// apm-服务-事务-跨度链接明细查询
export function getAPMLinksDetail(data) {
  return request(`${BASE_API_PREFIX}/apm/service/transactions/trace/links/details`, {
    method: RequestMethod.Post,
    data,
  });
}

// apm-服务-事务-事务查询
export function getAPMTransactionInfo(params) {
  return request(`${BASE_API_PREFIX}/apm/service/transactions`, {
    method: RequestMethod.Get,
    params,
  });
}

// APM 服务-延迟-查询时间直方间隔时间(链路图)
// export function getAPMDurationHistogramRangeSteps(data) {
//   return request(`${BASE_API_PREFIX}/apm/service/latency/get_duration_histogram_range_steps`, {
//     method: RequestMethod.Post,
//     data,
//   });
// }

// APM 服务-延迟-查询时间百分比(链路图)
export function getAPMDurationPercentiles(data) {
  return request(`${BASE_API_PREFIX}/apm/service/latency/get_duration_percentiles`, {
    method: RequestMethod.Post,
    data,
  });
}

// // APM 服务-延迟-查询时间范围(链路图)
// export function getAPMDurationRange(data) {
//   return request(`${BASE_API_PREFIX}/apm/service/latency/get_duration_ranges`, {
//     method: RequestMethod.Post,
//     data,
//   });
// }
// APM 服务-延迟分布(链路图)
export function getAPMDurationHistogramRange(data) {
  return request(`${BASE_API_PREFIX}/apm/service/latency/overall_distribution/transactions`, {
    method: RequestMethod.Post,
    data,
  });
}

// APM 吞吐量
export function getAPMThroughput(data) {
  return request(`${BASE_API_PREFIX}/apm/service/throughput`, {
    method: RequestMethod.Post,
    data,
  });
}

// APM 获取服务元数据图标
export function getAPMMetadataIcons(params) {
  return request(`${BASE_API_PREFIX}/apm/service/metadata/icons`, {
    method: RequestMethod.Get,
    params,
  });
}

// APM 获取服务元数据详情
export function getAPMMetadataDetails(params) {
  return request(`${BASE_API_PREFIX}/apm/service/metadata/details`, {
    method: RequestMethod.Get,
    params,
  });
}

// 拓扑图
export function getServiceMap(data, signal) {
  return request(`${BASE_API_PREFIX}/apm/service_map`, {
    method: RequestMethod.Post,
    data,
    signal,
  });
}

// 拓扑图节点信息
export function getServiceMapNode(data) {
  return request(`${BASE_API_PREFIX}/apm/service_map/node`, {
    method: RequestMethod.Post,
    data,
  });
}

// 拓扑图span信息
export function getServiceMapSpan(data) {
  return request(`${BASE_API_PREFIX}/apm/service_map/dependency`, {
    method: RequestMethod.Post,
    data,
  });
}

// 链路查询
export function getAPMTransactionsList(params) {
  return request(`${BASE_API_PREFIX}/apm/service/transactions/trace`, {
    method: RequestMethod.Get,
    params,
  });
}

// 链路错误查询
export function getAPMTransactionsErrorList(params) {
  return request(`${BASE_API_PREFIX}/apm/service/transactions/trace/errors`, {
    method: RequestMethod.Get,
    params,
  });
}

// 链路关联查询
export function getAPMTransactionsLinksList(params) {
  return request(`${BASE_API_PREFIX}/apm/service/transactions/trace/links`, {
    method: RequestMethod.Get,
    params,
  });
}
