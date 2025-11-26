import React, { useState, useContext, useEffect } from 'react';
import { useAntdTable } from 'ahooks';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import _ from 'lodash';
import { Link, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { exportBatchDataDetail } from '@/services/common';
import {
  Table,
  Space,
  Button,
  Row,
  Col,
  Input,
  message,
  Modal,
  Select,
  Tooltip,
  Dropdown,
  Menu,
  Typography,
  Tag,
} from 'antd';
import { SearchOutlined, DownOutlined, SyncOutlined, ReloadOutlined, ScheduleOutlined } from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import Export from '@/components/Export';
import Import from '@/components/Import';
import { getLogTaskList, deleteLogTask } from '@/services/logstash';
import Add from './add';
import Edit from './edit';
import '../locale';
import './index.less';

export { Add, Edit };

const Task: React.FC = () => {
  const { curBusiId, profile, curBusiGroup } = useContext(CommonStateContext);
  const perm = profile.admin ? 'rw' : curBusiGroup.perm;
  const { t } = useTranslation('logs');
  const { search } = useLocation();
  const { id } = queryString.parse(search);
  const bgid = id ? Number(id) : curBusiId;
  const [filter, setFilter] = useState<{ query?: string; status?: string; processor?: string }>({});
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const pagination = usePagination({ PAGESIZE_KEY: 'logtasks-list' });
  const columns = [
    {
      title: t('task.name'),
      dataIndex: 'name',
      render(text, record) {
        return (
          <Space>
            {record.note === '' ? (
              <Typography.Text delete={record.deleted}>{text}</Typography.Text>
            ) : (
              <Tooltip title={record.note}>
                <Typography.Text delete={record.deleted}>{text}</Typography.Text>
              </Tooltip>
            )}
            {record.deleted ? (
              <Tooltip title={t('task.delete_ing_tip')}>
                <SyncOutlined spin style={{ color: '#cf1322' }} />
              </Tooltip>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: `${t('common:table.ident')}(topic)`,
      dataIndex: 'topic',
      render(text, record) {
        return <Typography.Text delete={record.deleted}>{text}</Typography.Text>;
      },
      sorter: (a, b) => a.topic.localeCompare(b.topic),
    },
    {
      title: t('common:group_obj'),
      dataIndex: 'group_obj',
      render(groupObj) {
        return groupObj ? groupObj.name : '-';
      },
    },
    {
      title: t('task.status'),
      dataIndex: 'status',
      width: 80,
      render: (val) => {
        return val > 0 ? (
          <Tag color='green'>{t('management.enable')}</Tag>
        ) : val === -1 ? (
          <Tag color='orange'>{t('management.reviewed')}</Tag>
        ) : (
          <Tag color='red'>{t('management.disable')}</Tag>
        );
      },
    },
    {
      title: t('task.conduit_type'),
      dataIndex: 'template_code',
      width: 80,
      render: (val) => (val === '' ? t('task.custom') : t('task.ref_template')),
    },
    {
      title: t('common:table.update_by'),
      dataIndex: 'update_by',
      width: 200,
    },
    {
      title: t('common:table.update_at'),
      width: 160,
      dataIndex: 'update_at',
      render: (text: number) => moment.unix(text).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => a.update_at - b.update_at,
    },
    {
      title: t('common:table.operations'),
      key: 'action',
      width: 100,
      render: (text, record) => (
        <Space size='middle'>
          <Link to={`/log/collection/edit/${record.id}`}>
            {t(perm === 'rw' && !record.deleted ? 'common:btn.edit' : 'common:btn.detail')}
          </Link>
          {perm === 'rw' && (
            <Button
              disabled={record.deleted}
              type='link'
              danger
              style={{ padding: 0 }}
              onClick={() =>
                Modal.confirm({
                  title: t('common:confirm.delete'),
                  okText: t('common:btn.ok'),
                  cancelText: t('common:btn.cancel'),
                  onOk: () => {
                    deleteLogTask(record.id).then(() => {
                      setRefreshFlag(_.uniqueId('refresh_'));
                      message.success(t('common:success.delete'));
                    });
                  },
                  onCancel() {},
                })
              }
            >
              {t('common:btn.delete')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const fetchData = ({ current, pageSize }) => {
    const params = {
      p: current,
      limit: pageSize,
      bgid,
      ...filter,
    };
    return getLogTaskList(params).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };
  const { tableProps } = useAntdTable(fetchData, {
    refreshDeps: [filter, refreshFlag, bgid],
    defaultPageSize: pagination.pageSize,
  });

  useEffect(() => {
    setSelectedRows([]);
  }, [bgid]);

  return (
    <PageLayout title={t('task.title')} icon={<ScheduleOutlined />}>
      <div>
        <div style={{ padding: '10px' }}>
          <Row justify='space-between'>
            <Col>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setRefreshFlag(_.uniqueId('refreshFlag_'));
                  }}
                />
                <Input
                  className={'searchInput'}
                  prefix={<SearchOutlined />}
                  onPressEnter={(e: any) => setFilter({ ...filter, query: e.target.value })}
                  placeholder={t('common:table.ident')}
                />
                <Select
                  style={{ width: '160px' }}
                  onChange={(e) => setFilter({ ...filter, status: e })}
                  placeholder={t('task.status')}
                  allowClear
                >
                  <Select.Option value={-1}>{t('management.reviewed')}</Select.Option>
                  <Select.Option value={1}>{t('management.enable')}</Select.Option>
                  <Select.Option value={0}>{t('management.disable')}</Select.Option>
                </Select>
                <Select
                  style={{ width: '160px' }}
                  onChange={(e) => setFilter({ ...filter, processor: e })}
                  placeholder={t('task.processor')}
                  allowClear
                >
                  <Select.Option value={1}>Logstash</Select.Option>
                  <Select.Option value={2}>Vector</Select.Option>
                </Select>
              </Space>
            </Col>
            <Col>
              <Space>
                {perm === 'rw' && (
                  <Link to='/log/collection/add'>
                    <Button type='primary'>{t('common:btn.add')}</Button>
                  </Link>
                )}
                <Dropdown
                  trigger={['click']}
                  overlay={
                    <Menu>
                      {perm === 'rw' && (
                        <Menu.Item
                          key='batch_import'
                          disabled={Boolean(bgid === 0)}
                          onClick={() => {
                            Import({
                              bgid: bgid,
                              type: 'logs_tasks',
                              refreshList: () => setRefreshFlag(_.uniqueId('refresh_')),
                            });
                          }}
                        >
                          {t('common:btn.batch_import')}
                        </Menu.Item>
                      )}
                      <Menu.Item
                        key='batch_export'
                        disabled={Boolean(bgid === 0 || !selectedRows.length)}
                        onClick={() => {
                          exportBatchDataDetail('logs_tasks', bgid, selectedRows).then((res) => {
                            Export({
                              filename: t('task.title'),
                              data: JSON.stringify(res.dat, null, 4),
                              allowCopyToml: {
                                type: 'logs_tasks_toml',
                                bgid,
                                data: selectedRows,
                              },
                            });
                          });
                        }}
                      >
                        {t('common:btn.batch_export')}
                      </Menu.Item>
                    </Menu>
                  }
                >
                  <Button>
                    {t('common:btn.batch_operations')} <DownOutlined />
                  </Button>
                </Dropdown>
              </Space>
            </Col>
          </Row>

          <Table
            size='small'
            rowKey='id'
            columns={columns}
            {...tableProps}
            pagination={{
              ...tableProps.pagination,
              ...pagination,
            }}
            scroll={{ x: 'max-content' }}
            rowSelection={{
              selectedRowKeys: selectedRows.map((item) => item.id),
              onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
                setSelectedRows(selectedRows);
              },
            }}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default Task;
