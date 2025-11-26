import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

// 修改个人信息
export const getUserInfoList = function (params = {}) {
  return request(`${BASE_API_PREFIX}/users`, {
    method: RequestMethod.Get,
    params,
  });
};
export const getTeamInfoList = function (params?: { query: string; limit?: number }) {
  const data = params ? (params.limit ? params : { ...params, limit: 200 }) : { limit: 200 };
  return request(`${BASE_API_PREFIX}/user-groups`, {
    method: RequestMethod.Get,
    params: data,
  });
};
// 团队列表树形结构
export const getTeamInfoTree = function (params) {
  return request(`${BASE_API_PREFIX}/user-groups/tree`, {
    method: RequestMethod.Get,
    params,
  });
};
export const getBusinessTeamList = function (params = {}) {
  return request(`${BASE_API_PREFIX}/busi-groups`, {
    method: RequestMethod.Get,
    params,
  });
};
export const getBusinessTeamTree = function (params = {}) {
  return request(`${BASE_API_PREFIX}/busi-groups/tree`, {
    method: RequestMethod.Get,
    params,
  });
};
export const getBusinessTeamInfo = function (id: string | number) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}`, {
    method: RequestMethod.Get,
  }).then((res) => res && res.dat);
};
export const createBusinessTeam = function (data: object) {
  return request(`${BASE_API_PREFIX}/busi-groups`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => res && res.dat);
};
export const changeBusinessTeam = function (id: number, data: object) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => res && res.dat);
};

export const deleteBusinessTeamMember = function (id: number, data: object) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/members`, {
    method: RequestMethod.Delete,
    data,
  }).then((res) => res && res.dat);
};

export const deleteBusinessTeam = function (id: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}`, {
    method: RequestMethod.Delete,
  }).then((res) => res && res.dat);
};

export const addBusinessMember = function (id: number, data: object) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/members`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => res && res.dat);
};

export const createUser = function (data: object) {
  return request(`${BASE_API_PREFIX}/users`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => res && res.dat);
};

export const updateAccountStateBatch = function (data: object) {
  return request(`${BASE_API_PREFIX}/users/status`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => res && res.dat);
};

export const createTeam = function (data: object) {
  return request(`${BASE_API_PREFIX}/user-groups`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => res && res.dat);
};
export const getUserInfo = function (id: number) {
  return request(`${BASE_API_PREFIX}/user/${id}/profile`, {
    method: RequestMethod.Get,
  }).then((res) => res && res.dat);
};
export const getTeamInfo = function (id: number) {
  return request(`${BASE_API_PREFIX}/user-group/${id}`, {
    method: RequestMethod.Get,
  }).then((res) => res && res.dat);
};
export const changeUserInfo = function (id: number, data: object) {
  return request(`${BASE_API_PREFIX}/user/${id}/profile`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => res && res.dat);
};
export const changeStatus = function (id: string, data: object) {
  return request(`${BASE_API_PREFIX}/user/${id}/status`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => res && res.dat);
};
export const changeTeamInfo = function (id: number, data: object) {
  return request(`${BASE_API_PREFIX}/user-group/${id}`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => res && res.dat);
};
export const changeUserPassword = function (id: number, data: object) {
  return request(`${BASE_API_PREFIX}/user/${id}/password`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => res && res.dat);
};
export const disabledUser = function (id: string, data: object) {
  return request(`${BASE_API_PREFIX}/user/${id}/password`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => res && res.dat);
};
export const deleteUser = function (id: number) {
  return request(`${BASE_API_PREFIX}/user/${id}`, {
    method: RequestMethod.Delete,
  }).then((res) => res && res.dat);
};

export const batchDeleteUser = function (data: { ids: number[] }) {
  return request(`${BASE_API_PREFIX}/users`, {
    method: RequestMethod.Delete,
    data,
  }).then((res) => res && res.dat);
};

export const deleteTeam = function (id: number) {
  return request(`${BASE_API_PREFIX}/user-group/${id}`, {
    method: RequestMethod.Delete,
  }).then((res) => res && res.dat);
};
export const updateMember = function (id: number, data: object) {
  return request(`${BASE_API_PREFIX}/user-group/${id}/members`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => res && res.dat);
};
export const deleteMember = function (id: number, data: object) {
  return request(`${BASE_API_PREFIX}/user-group/${id}/members`, {
    method: RequestMethod.Delete,
    data,
  }).then((res) => res && res.dat);
};
export const addTeamUser = function (id: number, data: object) {
  return request(`${BASE_API_PREFIX}/user-group/${id}/members`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => res && res.dat);
};
export const getNotifiesList = function () {
  return request(`${BASE_API_PREFIX}/notify-channels`, {
    method: RequestMethod.Get,
  }).then((res) => res && res.dat);
};

export const getContactsList = function () {
  return request(`${BASE_API_PREFIX}/contact-channels`, {
    method: RequestMethod.Get,
  }).then((res) => res && res.dat);
};

export const getNotifyChannels = function () {
  return request(`${BASE_API_PREFIX}/contact-keys`, {
    method: RequestMethod.Get,
  }).then((res) => res && res.dat);
};

export const getRoles = function () {
  return request(`${BASE_API_PREFIX}/roles`, {
    method: RequestMethod.Get,
  }).then((res) => res && res.dat);
};

// 业务组ES视图（无权限）
export const getBusinessIndexView = function (id: string, params) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/index_view`, {
    method: RequestMethod.Get,
    params,
  }).then((res) => res && res.dat);
};

// 业务组绑定视图、标签、索引
export const getBusinessFilter = function (id: number, params) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/filter`, {
    method: RequestMethod.Get,
    params,
  }).then((res) => res && res.dat);
};

export const addBusinessFilter = function (id: string | number, data: { cmd_type: number; data_id: number; cmd: any }) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/filter`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => res && res.dat);
};

export const updateBusinessFilter = function (id: number, fid: number, data: { data_id: number; cmd: any }) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/filter/${fid}`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => res && res.dat);
};

export const deleteBusinessFilter = function (id: number, fid: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/filter/${fid}`, {
    method: RequestMethod.Delete,
  }).then((res) => res && res.dat);
};

// 修改业务组默认告警通知规则
export const updateBusinessAlertNotify = function (
  id: number,
  data: { notify_channels: string[]; notify_groups: string[] },
) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/alert_notify`, {
    method: RequestMethod.Put,
    data,
  });
};

// 业务组API 配置
export const getBusinessAPI = function (bgid: number) {
  return request(`${BASE_API_PREFIX}/api/${bgid}`, {
    method: RequestMethod.Get,
  }).then((res) => res && res.dat);
};

export const apiConfigFirst = function (bgid: number, apiId: number) {
  return request(`${BASE_API_PREFIX}/api/${bgid}/${apiId}`, {
    method: RequestMethod.Get,
  }).then((res) => res && res.dat);
};

export const addAPIConfig = function (bgid: string | number, data: any) {
  return request(`${BASE_API_PREFIX}/api/${bgid}`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => res && res.dat);
};

export const updateAPIConfig = function (bgid: number, data: any) {
  return request(`${BASE_API_PREFIX}/api/${bgid}`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => res && res.dat);
};

export const deleteAPIConfig = function (bgid: number, data: {ids: number[]}) {
  return request(`${BASE_API_PREFIX}/api/${bgid}`, {
    method: RequestMethod.Delete,
    data,
  }).then((res) => res && res.dat);
};

// 业务组绑定的团队列表
export const getBusinessTeam = function (id: string | number) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/members`, {
    method: RequestMethod.Get,
  });
};

// 查询存在接收团队的业务组
export const getBusinessNotifyGroup = function (params: { user_group_id: number }) {
  return request(`${BASE_API_PREFIX}/busi-groups/notify_group`, {
    method: RequestMethod.Get,
    params,
  });
};

// 团队关联业务组
export const getTeamAssociatedGroup = function (params: { id: number }) {
  return request(`${BASE_API_PREFIX}/user-group/busi-groups`, {
    method: RequestMethod.Get,
    params,
  });
};

// 团队分组（当前业务组团队和非当前业务组团队）
export const getAllTeamGroup = function (id) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/all-members`, {
    method: RequestMethod.Get,
  });
};

// 查询业务组应用服务
export const getBusinessServiceName = function (id) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/service_name`, {
    method: RequestMethod.Get,
  });
};

// 保存业务组应用服务
export const updateBusinessServiceName = function (id, data) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/service_name`, {
    method: RequestMethod.Put,
    data,
  });
};

// 查询业务组应用服务转索引
export const getBusinessServiceNameIndex = function (id) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/service_name/index`, {
    method: RequestMethod.Get,
  });
};

//  批量导入用户
export const importUserBatch = function (data) {
  return request(`${BASE_API_PREFIX}/user/batch`, {
    method: RequestMethod.Post,
    data,
  });
};

// 查询用户登录限制列表
export const getUserLoginLimit = function () {
  return request(`${BASE_API_PREFIX}/ip/login/limit`, {
    method: RequestMethod.Get,
  });
};

// 解除用户登录限制
export const deleteUserLoginLimit = function (data: { ip: string[] }) {
  return request(`${BASE_API_PREFIX}/ip/login/limit`, {
    method: RequestMethod.Delete,
    data,
  });
};

// 增加用户登录限制
export const addUserLoginLimit = function (data: { ip: string[]; last_time: number }) {
  return request(`${BASE_API_PREFIX}/ip/login/limit`, {
    method: RequestMethod.Post,
    data,
  });
};

// 批量添加团队成员
export const addTeamUsersBatch = function (data: { team_ids: number[]; user_ids: number[] }) {
  return request(`${BASE_API_PREFIX}/user-groups/members`, {
    method: RequestMethod.Put,
    data,
  });
};

// 批量删除团队成员
export const deleteTeamUsersBatch = function (data: { team_ids: number[]; user_ids: number[] }) {
  return request(`${BASE_API_PREFIX}/user-groups/members`, {
    method: RequestMethod.Delete,
    data,
  });
};
