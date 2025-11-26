import React, { useState, useEffect } from 'react';
import { Table, Space, Select, Tooltip } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { getOperationLog, getRoutesInfo } from '@/services/help';
import { getUserInfoList } from '@/services/manage';
import { useAntdTable } from 'ahooks';
import usePagination from '@/components/usePagination';
import TimeRangePicker, { parseRange } from '@/components/TimeRangePicker';
import './locale';

export default function OperateAudit() {
  const { t } = useTranslation('operateAudit');
  const pagination = usePagination({ PAGESIZE_KEY: 'operate-audit' });
  const [filter, setFilter] = useState<{ user_ids?: string; route_ids?: string; start: string; end: string }>({
    start: 'now-15m',
    end: 'now',
  });
  const [userList, setUserList] = useState([]);
  const [routerList, setRouterList] = useState([]);

  const column = [
    {
      title: t('username'),
      dataIndex: 'username',
      width: 160,
    },
    {
      title: t('method'),
      dataIndex: 'method',
      width: 70,
    },
    {
      title: t('request_url'),
      dataIndex: 'request_url',
      width: 200,
    },
    {
      title: t('note'),
      dataIndex: 'note',
      width: 200,
    },
    {
      title: t('request_at'),
      dataIndex: 'request_at',
      width: 150,
      render: (val) => moment(val * 1000).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: t('cost'),
      dataIndex: 'cost',
      width: 90,
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      width: 150,
    },
    {
      title: t('content'),
      dataIndex: 'content',
      ellipsis: {
        showTitle: false,
      },
      render: (val) => {
        return (
          <Tooltip
            placement='topLeft'
            overlayClassName='metrics-tooltip-content'
            title={val}
            overlayInnerStyle={{
              maxWidth: 600,
              maxHeight: 400,
              width: 'max-content',
              height: 'max-content',
              overflow: 'auto',
            }}
          >
            {val}
          </Tooltip>
        );
      },
    },
  ];

  const fetchData = ({ current, pageSize }) => {
    const range = parseRange({ start: filter.start, end: filter.end });
    const start = moment(range.start).unix();
    const end = moment(range.end).unix();
    const params = {
      p: current,
      limit: pageSize,
      ...filter,
      start,
      end,
    };
    return getOperationLog(params).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };
  const { tableProps } = useAntdTable(fetchData, {
    refreshDeps: [filter],
    defaultPageSize: pagination.pageSize,
  });

  useEffect(() => {
    Promise.all([getUserInfoList({ limit: -1 }), getRoutesInfo()]).then(([users, routers]) => {
      setUserList(users.dat.list);
      setRouterList(routers.dat);
    });
  }, []);

  return (
    <PageLayout title={t('title')}>
      <div>
        <div style={{ padding: 20 }}>
          <div>
            <Space>
              <Select
                allowClear
                mode='multiple'
                optionFilterProp='label'
                style={{ minWidth: '300px' }}
                onChange={(e) => setFilter({ ...filter, user_ids: e.join(',') })}
                placeholder={t('filter_user')}
                options={userList.map((item: { nickname: string; id: number }) => ({
                  label: item.nickname,
                  value: item.id,
                }))}
              />
              <Select
                allowClear
                mode='multiple'
                style={{ minWidth: '300px' }}
                optionFilterProp='label'
                onChange={(e) => setFilter({ ...filter, route_ids: e.join(',') })}
                placeholder={t('filter_router')}
                options={routerList.map((item: { note: string; id: number }) => ({
                  label: item.note,
                  value: item.id,
                }))}
              />
              <TimeRangePicker
                dateFormat='YYYY-MM-DD HH:mm:ss'
                value={{ start: filter.start, end: filter.end }}
                onChange={(val: any) => {
                  setFilter({
                    ...filter,
                    ...val,
                  });
                }}
              />
            </Space>
            <Table
              size='small'
              rowKey='id'
              columns={column}
              {...tableProps}
              pagination={{
                ...tableProps.pagination,
                ...pagination,
              }}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
