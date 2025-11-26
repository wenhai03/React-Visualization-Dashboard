import React, { useContext } from 'react';
import { Select } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { CommonStateContext } from '@/App';
import { getMenuPerm } from '@/services/common';
import '@/pages/logs/locale';

interface IProps {
  name?: string;
  disabled?: boolean;
  value: string | number;
  onChange?: (val: string | number) => void;
  options: any;
}

export default function BusiGroupSelect(props: IProps) {
  const { t } = useTranslation('pageLayout');
  const { setMenuPerm, setMenuLoading, setCurBusiId } = useContext(CommonStateContext);
  const { pathname } = useLocation();
  const history = useHistory();
  const { name = t('common:business_group'), value, disabled = false, options, onChange } = props;

  return (
    <>
      <span className='busi-group-name' onClick={() => history.push('/busi-groups')} title={t('common:jump_in')}>
        <ApartmentOutlined />
        {name}:
      </span>
      <Select
        disabled={disabled}
        size='small'
        value={value}
        showSearch
        optionFilterProp='label'
        style={{ width: 200, margin: '0 20px 0 10px' }}
        onChange={(value) => {
          if (typeof value === 'number' && value > 0) {
            // 切换业务组，更新菜单栏
            window.localStorage.setItem('Busi-Group-Id', String(value));
            setMenuLoading(true);
            getMenuPerm().then((res) => {
              // 判断当前路由是否在菜单权限内，没有则跳转到第一个有权限的
              // 机器列表-变更日志 '/targets/event'  指标采集任务-生效总览'/metric/input-task/overview',这两个是二级路由，不在菜单权限中，需要特殊处理
              if (
                (pathname === '/targets/event' && !res.dat.includes('/agents/event')) ||
                (pathname === '/metric/input-task/overview' && !res.dat.includes('/metric/input-task')) ||
                (pathname !== '/targets/event' &&
                  pathname !== '/metric/input-task/overview' &&
                  !res.dat.includes(pathname))
              ) {
                window.location.href = res.dat[0];
              } else {
                onChange && onChange(value);
              }
              setMenuPerm(res.dat);
              setCurBusiId(value as number);
              setMenuLoading(false);
            });
          } else {
            onChange && onChange(value);
          }
        }}
        options={options}
      />
    </>
  );
}
