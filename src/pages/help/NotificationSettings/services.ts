import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { WebhookType, ScriptType, ChannelType } from './types';
import { BASE_API_PREFIX } from '@/utils/constant';

export const getWebhooks = function (): Promise<WebhookType[]> {
  return request(`${BASE_API_PREFIX}/webhooks`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat;
  });
};

export const putWebhooks = function (data: WebhookType[]) {
  return request(`${BASE_API_PREFIX}/webhooks`, {
    method: RequestMethod.Put,
    data,
  });
};

export const getNotifyScript = function (): Promise<ScriptType> {
  return request(`${BASE_API_PREFIX}/notify-script`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat;
  });
};

export const putNotifyScript = function (data: ScriptType) {
  return request(`${BASE_API_PREFIX}/notify-script`, {
    method: RequestMethod.Put,
    data,
  });
};

export const getNotifyChannels = function (): Promise<ChannelType[]> {
  return request(`${BASE_API_PREFIX}/notify-channel`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat;
  });
};

export const putNotifyChannels = function (data: ChannelType[]) {
  return request(`${BASE_API_PREFIX}/notify-channel`, {
    method: RequestMethod.Put,
    data,
  });
};

export const getNotifyContacts = function (): Promise<ChannelType[]> {
  return request(`${BASE_API_PREFIX}/notify-contact`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat;
  });
};

export const putNotifyContacts = function (data: ChannelType[]) {
  return request(`${BASE_API_PREFIX}/notify-contact`, {
    method: RequestMethod.Put,
    data,
  });
};

export const getNotifyConfig = function (ckey: string): Promise<string> {
  let url = `${BASE_API_PREFIX}/notify-config`;
  return request(url, {
    method: RequestMethod.Get,
    params: { ckey },
  }).then((res) => {
    return res.dat;
  });
};

export const putNotifyConfig = function (data: { ckey: string; cvalue: string }) {
  let url = `${BASE_API_PREFIX}/notify-config`;
  return request(url, {
    method: RequestMethod.Put,
    data,
  });
};
