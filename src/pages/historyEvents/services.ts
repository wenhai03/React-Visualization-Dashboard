import _ from 'lodash';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

export function getEvents(params) {
  return request(`${BASE_API_PREFIX}/alert-his-events/list`, {
    method: RequestMethod.Get,
    params,
  });
}
