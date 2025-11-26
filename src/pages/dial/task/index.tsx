import React, { useState, useContext } from 'react';
import { useAntdTable } from 'ahooks';
import { CommonStateContext } from '@/App';
import _ from 'lodash';
import {
  Table,
  Space,
  Dropdown,
  Button,
  Menu,
  Row,
  Col,
  Input,
  Switch,
  message,
  Modal,
  Tag,
  Tooltip,
  Select,
} from 'antd';
import { DownOutlined, SearchOutlined } from '@ant-design/icons';
import queryString from 'query-string';
import { Link, useLocation } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import { getDialTaskList, setDialTaskStatus, deleteDialTask } from '@/services/dial';
import { useTranslation } from 'react-i18next';
import RefreshIcon from '@/components/RefreshIcon';
import { dialTabs } from '../constants';
import Add from './add';
import Edit from './edit';
import '../locale';
import '../index.less';

export { Add, Edit };

const DialTask: React.FC = () => {
  const { curBusiId, curBusiGroup } = useContext(CommonStateContext);
  const { t } = useTranslation('dial');
  const { search } = useLocation();
  const { id } = queryString.parse(search) as { id?: string };
  const bgid = id ? Number(id) : curBusiId;
  const [filter, setFilter] = useState<{
    query?: string;
    dial_tag?: string;
    category?: string;
    enabled?: 0 | 1;
    status?: 'OK' | 'FAIL';
  }>({});
  const [selectedRows, setSelectRowKeys] = useState<number[]>([]);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const pagination = usePagination({ PAGESIZE_KEY: 'dials-list' });
  const columns = [
    {
      title: t('common:table.name'),
      dataIndex: 'name',
      render: (val, record) => {
        return (
          <Space>
            <Link
              to={{
                pathname: '/dial-explorer',
                search: `taskIds=${record.id}&bgid=${record.group_id}&start=now-15m&end=now`,
              }}
            >
              {val}
            </Link>
            {record.status !== '' && (
              <Link
                to={{
                  pathname: '/dial-explorer',
                  search: `taskIds=${record.id}&status=${record.status}&bgid=${record.group_id}&start=now-15m&end=now`,
                }}
              >
                <Tag color={record.status === 'OK' ? 'success' : 'error'}>{record.status}</Tag>
              </Link>
            )}
          </Space>
        );
      },
    },
    {
      title: t('task.url'),
      dataIndex: 'url',
    },
    {
      title: t('task.type'),
      dataIndex: 'category',
      render: (val) => {
        return t(`task.${val.replace('dial:', '')}`);
      },
    },
    {
      title: t('task.dial_tags'),
      dataIndex: 'targets',
      render(val) {
        return (
          <>
            {/* 自建节点 */}
            {(Boolean(val.idents?.length) || Boolean(val.rt?.length) || Boolean(val.os?.length)) && (
              <Tooltip
                title={
                  <>
                    {Boolean(val.idents?.length) && (
                      <Row wrap={false}>
                        <Col flex='32px'>{t('task.host')}:</Col>
                        <Col flex='auto'>
                          <Row gutter={[0, 8]}>
                            {val.idents.map((item) => (
                              <Col>
                                <Tag key={item} color='blue'>
                                  {item}
                                </Tag>
                              </Col>
                            ))}
                          </Row>
                        </Col>
                      </Row>
                    )}
                    {Boolean(val.rt?.length) && (
                      <Row style={{ marginBottom: '8px' }} wrap={false}>
                        <Col flex='60px'>{t('task.rt')}:</Col>
                        <Col flex='auto'>
                          <Row wrap={false}>
                            {val.rt.map((item) => (
                              <Col>
                                <Tag key={item} color='blue'>
                                  {item}
                                </Tag>
                              </Col>
                            ))}
                          </Row>
                        </Col>
                      </Row>
                    )}
                    {Boolean(val.os?.length) && (
                      <Row wrap={false}>
                        <Col flex='60px'>{t('task.os')}:</Col>
                        <Col flex='auto'>
                          {val.os.map((item) => (
                            <Tag key={item} color='blue'>
                              {item}
                            </Tag>
                          ))}
                        </Col>
                      </Row>
                    )}
                  </>
                }
                overlayInnerStyle={{
                  maxWidth: 360,
                  width: 'max-content',
                }}
              >
                <Tag color='blue' key='dial_tags'>
                  {t('task.private_tags')}
                </Tag>
              </Tooltip>
            )}
            {/* 公共节点 */}
            {Boolean(val.dial_tags?.length) && (
              <Tooltip
                title={
                  <>
                    {val.dial_tags.map((item) => (
                      <div>{item}</div>
                    ))}
                  </>
                }
              >
                <Tag color='blue' key='dial_tags'>
                  {t('task.common_node')}
                </Tag>
              </Tooltip>
            )}
          </>
        );
      },
    },
    {
      title: t('task.status'),
      dataIndex: 'enabled',
      render: (val, record) => {
        return (
          <Switch
            disabled={curBusiGroup.perm === 'ro'}
            checkedChildren={t('task.enabled')}
            unCheckedChildren={t('task.disable')}
            style={{ width: '50px' }}
            checked={val}
            size='small'
            onChange={(checked) => handleStatus('single', checked, record.id)}
          />
        );
      },
    },
    {
      title: t('common:table.operations'),
      key: 'action',
      width: 160,
      render: (text, record) => (
        <Space size='middle'>
          <Link
            to={{
              pathname: '/dial-explorer',
              search: `taskIds=${record.id}&status=${record.status}&bgid=${record.group_id}&start=now-15m&end=now`,
            }}
          >
            {t('task.log')}
          </Link>
          <Link to={`/dial-task/edit/${record.id}`}>
            {t(curBusiGroup.perm === 'rw' ? 'common:btn.edit' : 'common:btn.detail')}
          </Link>
          {curBusiGroup.perm === 'rw' && (
            <Link to={`/dial-task/edit/${record.id}?mode=clone`}>{t('common:btn.clone')}</Link>
          )}
          {curBusiGroup.perm === 'rw' && (
            <a
              style={{ color: 'red' }}
              onClick={() =>
                Modal.confirm({
                  title: t('common:confirm.delete'),
                  okText: t('common:btn.ok'),
                  cancelText: t('common:btn.cancel'),
                  onOk: () => handleDelete('single', record.id),
                  onCancel() {},
                })
              }
            >
              {t('common:btn.delete')}
            </a>
          )}
        </Space>
      ),
    },
  ];

  // 编辑 任务状态
  const handleStatus = (type: 'single' | 'batch', enabled: boolean, id?: number) => {
    let data = {
      ids: selectedRows,
      enabled: enabled,
    };
    if (type !== 'batch') {
      data.ids = [id!];
    }
    setDialTaskStatus(data).then((res) => {
      setRefreshFlag(_.uniqueId('refresh_'));
      message.success(t('common:success.edit'));
    });
  };

  const handleDelete = (type: 'single' | 'batch', id?: number) => {
    let data = { ids: selectedRows };
    if (type !== 'batch') {
      data.ids = [id!];
    }
    deleteDialTask(data).then((res) => {
      setRefreshFlag(_.uniqueId('refresh_'));
      message.success(t('common:success.delete'));
    });
  };

  const fetchData = ({ current, pageSize }) => {
    const params = {
      p: current,
      limit: pageSize,
      bgid: bgid,
      ...filter,
    };
    return getDialTaskList(params).then((res) => {
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

  return (
    <PageLayout title={t('task.title')}>
      <div>
        <div style={{ padding: '10px' }}>
          <Row justify='space-between'>
            <Col>
              <Space>
                <RefreshIcon onClick={() => setRefreshFlag(_.uniqueId('refresh_'))} />
                <Input
                  className={'searchInput'}
                  prefix={<SearchOutlined />}
                  onPressEnter={(e: any) => setFilter({ ...filter, query: e.target.value })}
                  placeholder={t('task.search_placeholder')}
                />
                <Select
                  allowClear
                  mode='multiple'
                  optionFilterProp='children'
                  placeholder={t('task.type')}
                  style={{ minWidth: 200 }}
                  onChange={(val) => setFilter({ ...filter, category: val.join(',') })}
                >
                  {_.map(dialTabs, (item) => (
                    <Select.Option key={item} value={item}>
                      {t(`task.${item.replace('dial:', '')}`)}
                    </Select.Option>
                  ))}
                </Select>
                <Select
                  allowClear
                  optionFilterProp='children'
                  placeholder={t('task.status')}
                  style={{ minWidth: 100 }}
                  onChange={(val) => setFilter({ ...filter, enabled: val })}
                >
                  <Select.Option key={1} value={1}>
                    {t('task.enabled')}
                  </Select.Option>
                  <Select.Option key={0} value={0}>
                    {t('task.disable')}
                  </Select.Option>
                </Select>
                <Select
                  allowClear
                  optionFilterProp='children'
                  placeholder={t('explorer.dial_status')}
                  style={{ minWidth: 100 }}
                  onChange={(val) => setFilter({ ...filter, status: val })}
                >
                  <Select.Option key='OK' value='OK'>
                    OK
                  </Select.Option>
                  <Select.Option key='FAIL' value='FAIL'>
                    FAIL
                  </Select.Option>
                </Select>
              </Space>
            </Col>
            {curBusiGroup.perm === 'rw' && (
              <Col>
                <Space>
                  <Link to={'/dial-task/add'}>
                    <Button type='primary'>{t('common:btn.add')}</Button>
                  </Link>
                  <Dropdown
                    trigger={['click']}
                    disabled={!Boolean(selectedRows.length)}
                    overlay={
                      <Menu>
                        <Menu.Item key='batch_enabled' onClick={() => handleStatus('batch', true)}>
                          {t('common:btn.batch_enabled')}
                        </Menu.Item>
                        <Menu.Item key='batch_disable' onClick={() => handleStatus('batch', false)}>
                          {t('common:btn.batch_disable')}
                        </Menu.Item>
                        <Menu.Item key='batch_delete' onClick={() => handleDelete('batch')}>
                          {t('common:btn.batch_delete')}
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
            )}
          </Row>

          <Table
            size='small'
            rowKey='id'
            columns={columns}
            {...tableProps}
            rowSelection={{
              selectedRowKeys: selectedRows.map((item) => item),
              onChange: (selectedRowKeys: number[]) => {
                setSelectRowKeys(selectedRowKeys);
              },
            }}
            pagination={{
              ...tableProps.pagination,
              ...pagination,
            }}
            scroll={{ x: 'max-content' }}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default DialTask;
