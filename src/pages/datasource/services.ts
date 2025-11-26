import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import _ from 'lodash';
import { BASE_API_PREFIX } from '@/utils/constant';

interface IItem {
  id: number;
  plugin_type_name: string;
  category: string;
  plugin_type: string;
  name: string;
  status: 'enabled';
}

const apiPrefix = `${BASE_API_PREFIX}/datasource`;

export const getDataSourcePluginList = (): Promise<IItem[]> => {
  return request(`${apiPrefix}/plugin/list`, {
    method: RequestMethod.Get,
  }).then((res) => res.data);
};

export const getDataSourceList = () => {
  return request(`${apiPrefix}/list`, {
    method: RequestMethod.Get,
  }).then((res) => res.data);
};

export const getDataSourceDetailById = (id: string | number) => {
  return request(`${apiPrefix}/desc`, {
    method: RequestMethod.Get,
    params: { id: Number(id) },
  }).then((res) => res.data);
};

export const submitRequest = (body) => {
  let url = `${apiPrefix}/upsert`;
  return request(url, {
    method: RequestMethod.Post,
    data: body,
  }).then((res) => res.data);
};

export const updateDataSourceStatus = (body: { id: number; status: 'enabled' | 'disabled' }) => {
  return request(`${apiPrefix}/status/update`, {
    method: RequestMethod.Post,
    data: body,
  }).then((res) => res.data);
};

export const deleteDataSourceById = (id: string | number) => {
  return request(apiPrefix, {
    method: RequestMethod.Delete,
    data: [id],
  }).then((res) => res.data);
};

export const getServerClusters = () => {
  return request(`${BASE_API_PREFIX}/server-clusters`, {
    method: RequestMethod.Get,
  }).then((res) => res.dat);
};

// 设置默认数据源
export const updateDefaultDataSource = (data: { id: number }) => {
  return request(`${BASE_API_PREFIX}/datasource/default`, {
    method: RequestMethod.Post,
    data,
  });
};
