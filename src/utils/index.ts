import { message } from 'antd';
import React, { ReactNode, Component } from 'react';
import { useLocation } from 'react-router-dom';
import { IStore } from '@/store/common';

export { getDefaultDatasourceValue, setDefaultDatasourceValue } from './datasource';

export const isPromise = (obj) => {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
};

export const download = function (stringList: Array<string> | string, name: string = 'download.txt') {
  const element = document.createElement('a');
  const file = new Blob([Array.isArray(stringList) ? stringList.join('\r\n') : stringList], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = name;
  document.body.appendChild(element);
  element.click();
};

/**
 * 将文本添加到剪贴板
 */
export const copyToClipBoard = (text: string, t, spliter?: string): boolean => {
  const fakeElem = document.createElement('textarea');
  fakeElem.style.border = '0';
  fakeElem.style.padding = '0';
  fakeElem.style.margin = '0';
  fakeElem.style.position = 'absolute';
  fakeElem.style.left = '-9999px';
  const yPosition = window.pageYOffset || document.documentElement.scrollTop;
  fakeElem.style.top = `${yPosition}px`;
  fakeElem.setAttribute('readonly', '');
  fakeElem.value = text;

  document.body.appendChild(fakeElem);
  fakeElem.select();
  let succeeded;
  try {
    succeeded = document.execCommand('copy');
    if (spliter && text.includes(spliter)) {
      message.success(`${t('复制')}${text.split('\n').length}${t('条数据到剪贴板')}`);
    } else {
      message.success(t('复制到剪贴板'));
    }
  } catch (err) {
    message.error(t('复制失败'));
    succeeded = false;
  }
  if (succeeded) {
    document.body.removeChild(fakeElem);
  }
  return succeeded;
};

export const copy2ClipBoard = (text: string, silent = false): boolean => {
  const fakeElem = document.createElement('textarea');
  fakeElem.style.border = '0';
  fakeElem.style.padding = '0';
  fakeElem.style.margin = '0';
  fakeElem.style.position = 'absolute';
  fakeElem.style.left = '-9999px';
  const yPosition = window.pageYOffset || document.documentElement.scrollTop;
  fakeElem.style.top = `${yPosition}px`;
  fakeElem.setAttribute('readonly', '');
  fakeElem.value = text;

  document.body.appendChild(fakeElem);
  fakeElem.select();
  let succeeded;
  try {
    succeeded = document.execCommand('copy');
    !silent && message.success('复制到剪贴板');
  } catch (err) {
    message.error('复制失败');
    succeeded = false;
  }
  if (succeeded) {
    document.body.removeChild(fakeElem);
  }
  return succeeded;
};

export function formatTrim(s: string) {
  out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
    switch (s[i]) {
      case '.':
        i0 = i1 = i;
        break;

      case '0':
        if (i0 === 0) i0 = i;
        i1 = i;
        break;

      default:
        if (i0 > 0) {
          if (!+s[i]) break out;
          i0 = 0;
        }
        break;
    }
  }
  return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
}

interface Route {
  path: string;
  component: JSX.Element | Component;
}

export interface Entry {
  menu?: {
    weight?: number;
    content: ReactNode;
  };
  routes: Route[];
  module?: IStore<any>;
}

export const dynamicPackages = (): Entry[] => {
  const Packages = import.meta.globEager('../Packages/*/entry.tsx');
  return Object.values(Packages).map((obj) => obj.default);
};

export const generateID = (): string => {
  return `_${Math.random().toString(36).substr(2, 9)}`;
};

// https://github.com/n9e/fe-v5/issues/72 修改 withByte 默认为 false
export const sizeFormatter = (
  val,
  fixedCount = 2,
  { withUnit = true, withByte = false, trimZero = false, convertNum = 1024 } = {
    withUnit: true,
    withByte: false,
    trimZero: false,
    convertNum: 1024 | 1000,
  },
) => {
  const size = val ? Number(val) : 0;
  let result;
  let unit = '';

  if (size < 0) {
    result = 0;
  } else if (size < convertNum) {
    result = size.toFixed(fixedCount);
  } else if (size < convertNum * convertNum) {
    result = (size / convertNum).toFixed(fixedCount);
    unit = 'K';
  } else if (size < convertNum * convertNum * convertNum) {
    result = (size / convertNum / convertNum).toFixed(fixedCount);
    unit = 'M';
  } else if (size < convertNum * convertNum * convertNum * convertNum) {
    result = (size / convertNum / convertNum / convertNum).toFixed(fixedCount);
    unit = 'G';
  } else if (size < convertNum * convertNum * convertNum * convertNum * convertNum) {
    result = (size / convertNum / convertNum / convertNum / convertNum).toFixed(fixedCount);
    unit = 'T';
  }

  trimZero && (result = parseFloat(result));
  withUnit && (result = `${result}${unit}`);
  withByte && (result = `${result}B`);
  return result;
};

export function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export function warning(message: string) {
  // Support uglify
  if (process.env.NODE_ENV !== 'production' && console !== undefined) {
    console.error(`Warning: ${message}`);
  }
}

export function localeCompare(a: string | number, b: string | number) {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return 0;
}

// 获取缓存中的业务组id
export const getCurBusiId = () => window.localStorage.getItem('Busi-Group-Id');

// 获取第一个可选菜单
export function findFirstNullChildrenWithParents(data, parent: any[] = []) {
  for (const item of data) {
    const current = [...parent, item];

    if (item.children === null) {
      return current; // 返回当前对象和所有父级对象
    }

    // 如果有children, 递归查找
    if (Array.isArray(item.children)) {
      const result = findFirstNullChildrenWithParents(item.children, current);
      if (result) {
        return result;
      }
    }
  }
  return null;
}

export const isTagValid = (tag) => {
  // 子网掩码
  const contentRegExp =
    /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/;
  // 网段
  const contentSegmentRegExp =
    /^(((?:(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\/([1-9]|[1-2]\d|3[0-2]))|((?=(\b|\D))(((\d{1,2})|(1\d{1,2})|(2[0-4]\d)|(25[0-5]))\.){3}((\d{1,2})|(1\d{1,2})|(2[0-4]\d)|(25[0-5]))(?=(\b|\D))-(?=(\b|\D))(((\d{1,2})|(1\d{1,2})|(2[0-4]\d)|(25[0-5]))\.){3}((\d{1,2})|(1\d{1,2})|(2[0-4]\d)|(25[0-5]))(?=(\b|\D))))$/;
  return contentRegExp.test(tag.toString()) || contentSegmentRegExp.test(tag.toString());
};

export const getDefaultStepByStartAndEnd = (start: number, end: number) => {
  return Math.max(Math.floor((end - start) / 240), 1);
};
