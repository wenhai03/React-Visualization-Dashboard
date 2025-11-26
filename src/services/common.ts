import _ from 'lodash';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

// 获取数据源列表
export function getDatasourceList(
  pluginTypes?: string[],
): Promise<{ name: string; id: number; plugin_type: string }[]> {
  return request(`${BASE_API_PREFIX}/datasource/list`, {
    method: RequestMethod.Get,
    params: {
      p: 1,
      limit: 5000, // TODO: 假设 n9e 里面需要选择的数据源不会超过 5000 个
    },
  })
    .then((res) => {
      return _.map(
        _.filter(res.data.items || res.data, (item) => {
          return pluginTypes ? _.includes(pluginTypes, item.plugin_type) : true;
        }),
        (item) => {
          return {
            ...item,
            // 兼容 common ds
            plugin_type: item.category ? _.replace(item.plugin_type, `.${item.category}`, '') : item.plugin_type,
          };
        },
      );
    })
    .catch(() => {
      return [];
    });
}

// 获取业务组有权限的数据源
export function getDatasourceBriefList(id?: number): Promise<{ name: string; id: number; plugin_type: string }[]> {
  const url = `${BASE_API_PREFIX}/datasource/brief`;
  return request(url, {
    method: RequestMethod.Get,
    headers: id ? { 'Busi-Group-Id': id.toString() } : {},
  })
    .then((res) => {
      return res.dat || [];
    })
    .catch(() => {
      return [];
    });
}

export function getBusiGroups(query = '', limit: number = 5000, extra?: any) {
  return request(`${BASE_API_PREFIX}/busi-groups`, {
    method: RequestMethod.Get,
    params: Object.assign(
      {
        limit,
      },
      query ? { query } : {},
      extra ? { ...extra } : {},
    ),
  }).then((res) => {
    return {
      dat: _.sortBy(res.dat, 'name'),
    };
  });
}

export function getPerm(busiGroup: string, perm: 'ro' | 'rw') {
  return request(`${BASE_API_PREFIX}/busi-group/${busiGroup}/perm/${perm}`, {
    method: RequestMethod.Get,
  });
}

export function getMenuPerm() {
  return request(`${BASE_API_PREFIX}/self/perms`, {
    method: RequestMethod.Get,
  });
}

export function getSystemVersion() {
  return request(`${BASE_API_PREFIX}/version`, {
    method: RequestMethod.Get,
  });
}

// 内置新增分类
export function createBuiltinCate(data: { type: 'boards' | 'alerts'; name: string; icon_base64: string }) {
  return request(`${BASE_API_PREFIX}/builtin/cate`, {
    method: RequestMethod.Post,
    data,
  });
}

// 内置修改分类
export function updateBuiltinCate(
  cate_code: string,
  data: { id: number; type: 'boards' | 'alerts'; name: string; icon_base64: string },
) {
  return request(`${BASE_API_PREFIX}/builtin/cate/${cate_code}`, {
    method: RequestMethod.Put,
    data,
  });
}

// 内置删除分类
export function deleteBuiltinCate(cate_code) {
  return request(`${BASE_API_PREFIX}/builtin/cate/${cate_code}`, {
    method: RequestMethod.Delete,
  });
}

// 获取批量导出数据明细
export function exportBatchDataDetail(
  mode:
    | 'builtin_boards'
    | 'builtin_alerts'
    | 'input_tasks'
    | 'input_tasks_toml'
    | 'logs_tasks'
    | 'logs_tasks_toml'
    | 'alert_rules'
    | 'boards',
  id: number,
  data,
) {
  return request(`${BASE_API_PREFIX}/batch_data/export/detail/${mode}/${id}`, {
    method: RequestMethod.Post,
    data,
  });
}

// 批量导入数据明细
export function importBatchDataDetail(
  mode: 'builtin_boards' | 'builtin_alerts' | 'input_tasks' | 'logs_tasks' | 'alert_rules' | 'boards',
  id: number,
  data,
) {
  return request(`${BASE_API_PREFIX}/batch_data/import/detail/${mode}/${id}`, {
    method: RequestMethod.Post,
    data,
  });
}

// 获取ES告警KQL条件
export function getAlertKql(params: { his_alert_id: string }) {
  return request(`${BASE_API_PREFIX}/alert/elasticsearch/get_kql`, {
    method: RequestMethod.Get,
    params,
  });
}

// 应用初始化引导(超管)
export function getInitBoot() {
  return request(`${BASE_API_PREFIX}/init/boot`, {
    method: RequestMethod.Get,
  });
}
