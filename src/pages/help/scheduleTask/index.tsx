import React, { useState } from 'react';
import { useAntdTable } from 'ahooks';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { Table, Button, Dropdown, Menu, message, Space, Row, Col, Input } from 'antd';
import { DownOutlined, ScheduleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import { localeCompare } from '@/utils';
import { getScheduleTask, runScheduleTask } from '@/services/help';
import './locale';

const ScheduleTask: React.FC = () => {
  const { t } = useTranslation('scheduleTask');
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const pagination = usePagination({ PAGESIZE_KEY: 'schedule-task' });
  const [filter, setFilter] = useState<{ task_name?: string }>({});
  const columns = [
    {
      title: t('task_name'),
      dataIndex: 'task_name',
      width: '200px',
    },
    {
      title: t('task_type'),
      dataIndex: 'task_type',
      width: '80px',
      render(text) {
        return text === 10000 ? t('periodic_task') : t('one_time_task');
      },
    },
    {
      title: t('period_type'),
      dataIndex: 'period_type',
      width: '80px',
      render(text) {
        return text === 10000
          ? t('year')
          : text === 20000
          ? t('month')
          : text === 30000
          ? t('day')
          : text === 40000
          ? t('week')
          : t('seconds');
      },
    },
    {
      title: t('time_str'),
      dataIndex: 'time_str',
      width: '110px',
      render: (text, { period_type }) => (period_type === 50000 ? `${text}s` : text),
    },
    {
      title: t('last_exec_at'),
      dataIndex: 'last_exec_at',
      width: '150px',
      sorter: (a, b) => localeCompare(a.update_at, b.update_at),
      render: (val) => {
        return val ? moment.unix(Number(val)).format('YYYY-MM-DD HH:mm:ss') : t('non_execution');
      },
    },
    {
      title: t('next_exec_at'),
      dataIndex: 'next_exec_at',
      width: '150px',
      sorter: (a, b) => localeCompare(a.update_at, b.update_at),
      render: (val) => {
        return val ? moment.unix(Number(val)).format('YYYY-MM-DD HH:mm:ss') : t('no');
      },
    },
    {
      title: t('endpoint'),
      dataIndex: 'endpoint',
      width: '150px',
    },
    {
      title: t('result'),
      dataIndex: 'result',
    },
    {
      title: t('common:table.operations'),
      width: 60,
      render: (record) => {
        return record.status === 2 ? (
          t('in_operation')
        ) : (
          <a
            onClick={() => {
              runScheduleTask({ task_ids: [record.task_id] }).then((res) => {
                message.success(t('run_success'));
                setRefreshFlag(_.uniqueId('refresh_'));
              });
            }}
          >
            {t('run')}
          </a>
        );
      },
    },
  ];

  const fetchData = ({ current, pageSize }) => {
    const params = {
      p: current,
      limit: pageSize,
      ...filter,
    };
    return getScheduleTask(params).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };
  const { tableProps } = useAntdTable(fetchData, {
    refreshDeps: [refreshFlag, filter],
    defaultPageSize: pagination.pageSize,
  });

  return (
    <PageLayout title={t('title')} icon={<ScheduleOutlined />}>
      <div>
        <div style={{ padding: '10px' }}>
          <Row justify='space-between'>
            <Col>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setRefreshFlag(_.uniqueId('refresh_'));
                  }}
                />
                <Input
                  className={'searchInput'}
                  prefix={<SearchOutlined />}
                  onPressEnter={(e: any) => setFilter({ ...filter, task_name: e.target.value })}
                  placeholder={t('task_name_placeholder')}
                  allowClear
                />
              </Space>
            </Col>
            <Col>
              <Dropdown
                trigger={['click']}
                overlay={
                  <Menu>
                    <Menu.Item
                      key='run'
                      disabled={Boolean(!selectedRowKeys.length)}
                      onClick={() => {
                        runScheduleTask({ task_ids: selectedRowKeys }).then((res) => {
                          message.success(t('run_success'));
                          setRefreshFlag(_.uniqueId('refresh_'));
                        });
                      }}
                    >
                      {t('common:btn.batch_run')}
                    </Menu.Item>
                  </Menu>
                }
              >
                <Button style={{ float: 'right' }}>
                  {t('common:btn.batch_operations')} <DownOutlined />
                </Button>
              </Dropdown>
            </Col>
          </Row>
          <Table
            size='small'
            rowKey='task_id'
            columns={columns}
            {...tableProps}
            pagination={{
              ...tableProps.pagination,
              ...pagination,
            }}
            scroll={{ x: 'max-content' }}
            rowSelection={{
              selectedRowKeys: selectedRowKeys,
              onChange: (selectedRowKeys: React.Key[]) => {
                setSelectedRowKeys(selectedRowKeys);
              },
            }}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default ScheduleTask;
