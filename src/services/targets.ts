import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

// 获取监控对象列表
export function getMonObjectList(params) {
  return request(`${BASE_API_PREFIX}/targets`, {
    method: RequestMethod.Get,
    params,
  });
}

// 获取监控对象列表
export function getMonObjectDetail(params) {
  return request(`${BASE_API_PREFIX}/target`, {
    method: RequestMethod.Get,
    params,
  });
}

export function bindTags(data) {
  return bindOrUnbindTags(true, data);
}

export function unbindTags(data) {
  return bindOrUnbindTags(false, data);
}

// 获取监控对象标签列表
export function getTargetTags(params) {
  return request(`${BASE_API_PREFIX}/targets/tags`, {
    method: RequestMethod.Get,
    params,
  });
}

// 绑定/解绑标签
export function bindOrUnbindTags(isBind, data) {
  return request(`${BASE_API_PREFIX}/targets/tags`, {
    method: isBind ? RequestMethod.Post : RequestMethod.Delete,
    data,
  });
}

// 修改/移出业务组
export function moveTargetBusi(data) {
  return request(`${BASE_API_PREFIX}/targets/bgid`, {
    method: RequestMethod.Put,
    data: Object.assign({ bgid: 0 }, data),
  });
}

// 修改对象备注
export function updateTargetNote(data) {
  return request(`${BASE_API_PREFIX}/targets/note`, {
    method: RequestMethod.Put,
    data,
  });
}

// 修改对象区域
export function updateTargetArea(data) {
  return request(`${BASE_API_PREFIX}/agents/area`, {
    method: RequestMethod.Post,
    data,
  });
}

// 删除对象
export function deleteTargets(data) {
  return request(`${BASE_API_PREFIX}/targets`, {
    method: RequestMethod.Delete,
    data,
  });
}

// 重启对象
export function restartTargets(data) {
  return request(`${BASE_API_PREFIX}/agents/restart`, {
    method: RequestMethod.Post,
    data,
  });
}

export function getTargetList(data: any, id?: number) {
  return request(`${BASE_API_PREFIX}/target/list`, {
    method: RequestMethod.Post,
    params: { bgid: id },
    data,
  });
}

// 获取同业务组同集群机器列表
export function getClusterList(params: { idents: string }) {
  return request(`${BASE_API_PREFIX}/target/cluster`, {
    method: RequestMethod.Get,
    params,
  });
}

// 修改节点管理 extra 字段
export function updateTargetsExtra(data: {
  idents: string;
  extra: { dial_tags: string; logstash: boolean; public: string };
}) {
  return request(`${BASE_API_PREFIX}/targets/extra`, {
    method: RequestMethod.Put,
    data,
  });
}

// 获取采集器标签列表
export function getExtraList(params) {
  return request(`${BASE_API_PREFIX}/targets/extra/list`, {
    method: RequestMethod.Get,
    params,
  });
}
