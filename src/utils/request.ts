/** Request 网络请求工具 更详细的 api 文档: https://github.com/umijs/umi-request */
import { extend } from 'umi-request';
import { notification } from 'antd';
import _ from 'lodash';
import queryString from 'query-string';
import { UpdateAccessToken, getCacheLogin } from '@/services/login';
import { BASE_API_PREFIX } from '@/utils/constant';
import { getCurBusiId } from '@/utils';

// 创建存储 AbortController 的全局 Map
const abortControllers = new Map<symbol, AbortController>();

const SILENT_ABORT_FLAG = Symbol('SILENT_ERROR');

/** 拦截所有未完成的请求 */
export const cancelAllRequests = () => {
  abortControllers.forEach((controller) => {
    const silentError = new Error('Silent intercept request');
    silentError.name = 'AbortError';
    silentError[SILENT_ABORT_FLAG] = true;

    controller?.abort(silentError);
  });
  abortControllers.clear();
};

/** 异常处理程序，所有的error都被这里处理，页面无法感知具体error */
const errorHandler = (error: Error): Response | {} => {
  // 静默处理 AbortError 和主动取消的请求
  if (error.name === 'AbortError' || error[SILENT_ABORT_FLAG]) {
    return new Promise(() => {}); // 阻断后续逻辑
  }
  if (error.name !== 'AbortError' && error.message !== 'setting getter-only property "data"') {
    // @ts-ignore
    if (!error.silence) {
      notification.error({ message: error.message });
    }
    // 暂时认定只有开启 silence 的时候才需要传递 error 详情以便更加精确的处理错误
    // @ts-ignore
    if (error.silence) {
      throw error;
    } else {
      throw new Error(error.message);
    }
  }
  throw error;
};

/** 处理后端返回的错误信息 */
const processError = (res: any): string => {
  if (res?.error) {
    return _.isString(res?.error) ? res.error : JSON.stringify(res?.error);
  }
  if (res?.err) {
    return _.isString(res?.err) ? res.err : JSON.stringify(res?.err);
  }
  if (res?.errors) {
    return _.isString(res?.errors) ? res.errors : JSON.stringify(res?.errors);
  }
  if (res?.message) {
    return _.isString(res?.message) ? res.message : JSON.stringify(res?.message);
  }
  return JSON.stringify(res);
};

/** 配置request请求时的默认参数 */
const request = extend({
  errorHandler,
  credentials: 'include',
});

request.interceptors.request.use((url, options) => {
  // 为每个请求创建 AbortController
  const controller = new AbortController();
  const requestKey = Symbol();
  abortControllers.set(requestKey, controller);

  let headers = {
    'Busi-Group-Id': getCurBusiId() ?? '',
    ...options.headers,
  };
  headers['Authorization'] = `Bearer ${localStorage.getItem('access_token') || ''}`;
  headers['X-Language'] = localStorage.getItem('language') === 'en_US' ? 'en' : 'zh';
  return {
    url,
    options: {
      ...options,
      headers,
      signal: controller.signal,
      // 添加自定义属性保存唯一标识
      __requestKey: requestKey,
    },
  };
});

/**
 * 响应拦截
 */
request.interceptors.response.use(
  async (response, options) => {
    const { status } = response;
    const { redirect, cache_token } = queryString.parse(location.search) as Record<string, string>;
    const requestKey = (options as any).__requestKey;
    try {
      if (status === 200) {
        return response
          .clone()
          .json()
          .then((data) => {
            const { url } = response;
            // TODO: 糟糕的逻辑，后端返回的数据结构不统一，需要兼容
            // /n9e/datasource/ 返回的数据结构是 { error: '', data: [] }
            // proxy/prometheus 返回的数据结构是 { status: 'success', data: {} }
            // proxy/elasticsearch 返回的数据结构是 { ...data }
            // proxy/jeager 返回的数据结构是 { data: [], errors: [] }
            if (
              _.some(
                [
                  '/api/v1',
                  '/api/v2',
                  `${BASE_API_PREFIX}/datasource`,
                  `${BASE_API_PREFIX}/proxy`,
                  `${BASE_API_PREFIX}/dial-task/log`,
                ],
                (item) => {
                  return url.includes(item);
                },
              )
            ) {
              if (!data.error) {
                return { ...data, success: true };
              } else {
                throw {
                  name: processError(data),
                  message: processError(data),
                  silence: options.silence,
                  data,
                  response,
                };
              }
            } else {
              if (location.pathname === '/transfer') {
                location.href = redirect;
              }
              // n9e 和 n9e-plus 大部分接口返回的数据结构是 { err: '', dat: {} }
              if (data.err === '' || data.status === 'success' || data.error === '') {
                return { ...data, success: true };
              } else {
                throw {
                  name: processError(data),
                  message: processError(data),
                  silence: options.silence,
                  data,
                  response,
                };
              }
            }
          });
      } else if (status === 401) {
        const isRedirect =
          location.pathname != '/' &&
          location.pathname != '/transfer' &&
          location.pathname != '/login' &&
          location.pathname != '/login/workwx' &&
          location.pathname != '/login/account' &&
          location.pathname != '/login/idm';
        if (location.pathname === '/transfer') {
          if (cache_token) {
            getCacheLogin({ cache_token }).then((res) => {
              const { access_token, refresh_token } = res.dat;
              localStorage.setItem('access_token', access_token);
              localStorage.setItem('refresh_token', refresh_token);
              location.href = redirect;
            });
          }
        } else {
          if (response.url.indexOf(`${BASE_API_PREFIX}/auth/refresh`) > 0) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            location.href = `/login${isRedirect ? '?redirect=' + location.pathname + location.search : ''}`;
          } else {
            if (localStorage.getItem('refresh_token')) {
              UpdateAccessToken().then((res) => {
                console.log('401 err', res);
                if (res.err) {
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('refresh_token');
                  location.href = `/login${isRedirect ? '?redirect=' + location.pathname + location.search : ''}`;
                } else {
                  const { access_token, refresh_token } = res.dat;
                  localStorage.setItem('access_token', access_token);
                  localStorage.setItem('refresh_token', refresh_token);
                  location.href = `${location.pathname}${location.search}`;
                }
              });
            } else {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              location.href = `/login${isRedirect ? '?redirect=' + location.pathname + location.search : ''}`;
            }
          }
        }
      } else {
        return response
          .clone()
          .text()
          .then((data) => {
            let errObj = {};
            try {
              const parsed = JSON.parse(data);
              const errMessage = processError(parsed);
              errObj = {
                name: errMessage,
                message: errMessage,
                data: parsed,
              };
            } catch (error) {
              errObj = {
                name: data,
                message: data,
              };
            }
            throw {
              ...errObj,
              silence: options.silence,
            };
          });
      }
    } catch (error) {
      // 拦截错误直接吞掉，不抛出、不返回数据
      if (error instanceof Error && error[SILENT_ABORT_FLAG]) {
        return new Promise(() => {}); // 阻断后续逻辑
      }
      throw error;
    } finally {
      if (requestKey) abortControllers.delete(requestKey);
    }
  },
  {
    global: false,
  },
);

export default request;
