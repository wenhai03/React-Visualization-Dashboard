import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import _ from 'lodash';
import { BASE_API_PREFIX } from '@/utils/constant';
import { mappingsToFields, flattenHits } from './utils';

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

export function getLogsQuery(datasourceValue: number, requestBody, groupId: number) {
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/_msearch`, {
    method: RequestMethod.Post,
    data: requestBody,
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((res) => {
    const dat = _.get(res, 'responses[0].hits');
    const { docs } = flattenHits(dat.hits);
    return {
      total: dat.total.value,
      list: docs,
    };
  });
}

export function getDsQuery(datasourceValue: number, requestBody, groupId: number) {
  return request(`${BASE_API_PREFIX}/proxy/${datasourceValue}/_msearch`, {
    method: RequestMethod.Post,
    data: requestBody,
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((res) => {
    const dat = _.get(res, 'responses[0].aggregations.A.buckets');
    return dat;
  });
}
