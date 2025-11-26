import React, { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import { useAntdTable } from 'ahooks';
import { Table, Button, Input, Select, Space, Row, Col, Modal } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import TimeRangePicker, { parseRange } from '@/components/TimeRangePicker';
import _ from 'lodash';
import moment from 'moment';
import { getAgentEvent } from '@/services/agent';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import '../index.less';

type IAction = 100 | 101 | 110 | 120 | 200 | 210 | 210 | 300 | 310 | 400 | 410 | 420 | 500 | 602;

interface IEventTable {
  ident: string;
  /**
   * 100 采集器启动失败
   * 101 采集器启动成功
   * 110 采集器重启
   * 120 采集器重启Crash
   * 200 前端配置修改
   * 201 采集器配置更新
   * 220 前端配置删除
   * 300 前端升级
   * 310 采集器升级
   * 400 前端卸载
   * 410 采集器卸载
   * 420 前端采集器删除
   * 500 前端重启
   * 602 容器日志采集异常
   */
  action: IAction;
  content: string;
  create_by: string;
  create_at: number;
}

const AgentEvent: React.FC<{ host?: string; id?: string; history: any }> = ({ host, id, history }) => {
  const { t } = useTranslation('targets');
  const { curBusiId } = useContext(CommonStateContext);
  const bgid = id ? Number(id) : curBusiId;
  const isModal = Boolean(host);
  const [filter, setFilter] = useState<{ ident?: string; action?: IAction; start: string; end: string }>({
    ident: host,
    start: 'now-24h',
    end: 'now',
  });
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const actionList = {
    '100': t('event.collector_start_fail'),
    '101': t('event.collector_start_success'),
    '110': t('event.collector_restart'),
    '120': t('event.log_collector_restart_crash'),
    '200': t('event.front_end_config'),
    '210': t('event.collector_config_update'),
    '220': t('event.front_end_config_delete'),
    '300': t('event.front_end_upgrade'),
    '310': t('event.collector_upgrade'),
    '400': t('event.front_end_uninstall'),
    '410': t('event.collector_uninstall'),
    '420': t('event.front_end_collector_delete'),
    '500': t('event.front_end_restart'),
    '602': t('event.container_log_collection_exception'),
  };
  const agentEventColumns: ColumnsType<IEventTable> = [
    {
      title: t('ident'),
      width: isModal ? 110 : undefined,
      dataIndex: 'ident',
    },
    {
      title: t('event.action'),
      dataIndex: 'action',
      width: isModal ? 110 : undefined,
      render(value) {
        return actionList[value];
      },
    },
    {
      title: t('event.content'),
      dataIndex: 'content',
    },
    {
      title: t('event.create_by'),
      width: isModal ? 60 : undefined,
      dataIndex: 'create_by',
    },
    {
      title: t('event.create_at'),
      width: isModal ? 150 : undefined,
      dataIndex: 'create_at',
      render(value) {
        return moment(value * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
  ];

  const getTableData = ({ current, pageSize }): Promise<any> => {
    const range = parseRange({ start: filter.start, end: filter.end });
    const start = moment(range.start).unix();
    const end = moment(range.end).unix();
    const params = {
      p: current,
      limit: pageSize,
      bgid,
    };

    return getAgentEvent({
      ...params,
      ...filter,
      start,
      end,
    }).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };

  const { tableProps } = useAntdTable(getTableData, {
    defaultPageSize: 15,
    refreshDeps: [filter, refreshFlag, bgid],
  });

  return (
    <div className='changelog-wrapper'>
      <Row justify='space-between'>
        <Col>
          <Space>
            <Button
              disabled={Number(id) === -1}
              icon={<ReloadOutlined />}
              onClick={() => {
                setRefreshFlag(_.uniqueId('refresh_'));
              }}
            />
            {!host && (
              <Input
                disabled={Boolean(host)}
                value={host}
                className={'searchInput'}
                prefix={<SearchOutlined />}
                onPressEnter={(e: any) => setFilter({ ...filter, ident: e.target.value })}
                placeholder={t('ident_placeholder')}
              />
            )}
            <Select
              style={{ minWidth: 120 }}
              placeholder={t('event.action_placeholder')}
              allowClear
              value={filter.action}
              onChange={(val) => {
                setFilter({
                  ...filter,
                  action: val,
                });
              }}
            >
              {Object.entries(actionList).map(([key, value]) => (
                <Select.Option value={key}>{value}</Select.Option>
              ))}
            </Select>
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
        </Col>
        <Col>
          <Button
            onClick={() => {
              Modal.destroyAll();
              history.push({
                pathname: '/log/stream',
                search: `?type=graf&start=now-15m&end=now&filter=&idents=${host ?? ''}`,
              });
            }}
          >
            {t('collector_log')}
          </Button>
        </Col>
      </Row>

      <Table
        size='small'
        columns={agentEventColumns}
        scroll={{ y: isModal ? 460 : 'calc(100vh - 226px)' }}
        {...tableProps}
        pagination={{
          ...tableProps.pagination,
          pageSizeOptions: ['15', '50', '100', '500', '1000', '5000'],
          showTotal: (total) => t('common:table.total', { total }),
          showSizeChanger: true,
        }}
      />
    </div>
  );
};

export default AgentEvent;
