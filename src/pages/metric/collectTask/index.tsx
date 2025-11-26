import React, { useState, useContext, useEffect } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { Table, Space, Button, Row, Col, message, Modal, Input, Dropdown, Menu, Switch, Form } from 'antd';
import { SearchOutlined, DownOutlined, ReloadOutlined, MonitorOutlined } from '@ant-design/icons';
import { CommonStateContext } from '@/App';
import { useHistory } from 'react-router-dom';
import { Link } from 'react-router-dom';
import usePagination from '@/components/usePagination';
import PageLayout from '@/components/pageLayout';
import { getMetricsInputTasks, batchUpdateMetricsTask } from '@/services/metric';
import Export from '@/components/Export';
import Import from '@/components/Import';
import { exportBatchDataDetail } from '@/services/common';
import { useTranslation } from 'react-i18next';
import '../locale';

const CollectTask: React.FC = () => {
  const { t } = useTranslation('metric');
  const history = useHistory();
  const [form] = Form.useForm();
  const { curBusiId, curBusiGroup } = useContext(CommonStateContext);
  const [query, setQuery] = useState('');
  const pagination = usePagination({ PAGESIZE_KEY: 'metric-task' });
  const [list, setList] = useState([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const [visible, setVisible] = useState(false);
  const columns = [
    {
      title: t('overview.metric_name'),
      dataIndex: 'name',
      render: (val) => val.replace('metrics:', ''),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t('input_task.task_type'),
      dataIndex: 'mode',
      render: (val) => (val === 1 ? t('input_task.global_task') : t('input_task.locale_task')),
    },
    {
      title: t('input_task.status'),
      dataIndex: 'sync_type',
      render: (val) => t(`input_task.status_${val}`),
    },
    {
      title: t('common:table.update_at'),
      dataIndex: 'update_at',
      width: 200,
      render: (text: string) => {
        return <div className='table-text'>{moment.unix(Number(text)).format('YYYY-MM-DD HH:mm:ss')}</div>;
      },
      sorter: (a, b) => a.update_at - b.update_at,
    },
    {
      title: t('common:table.update_by'),
      dataIndex: 'update_by',
      width: 150,
    },
    {
      title: t('common:table.operations'),
      key: 'action',
      width: 80,
      render: (text, record) => (
        <Space size='middle'>
          <Link to={`/metric/input-task/operations?name=${record.name.replace('metrics:', '')}`}>
            {t(curBusiGroup.perm === 'rw' ? 'common:btn.edit' : 'common:btn.detail')}
          </Link>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    if (curBusiId) {
      const query = {
        bgid: curBusiId,
        limit: 2000,
        p: 1,
      };
      getMetricsInputTasks(query).then((res) => {
        setList(res.dat.list);
      });
    }
    setSelectedRows([]);
  }, [curBusiId, refreshFlag]);

  return (
    <PageLayout title={t('input_task.title')} icon={<MonitorOutlined />}>
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
                  placeholder={t('input_task.metric_name_placeholder')}
                  onPressEnter={(e) => {
                    setQuery((e.target as HTMLInputElement).value);
                  }}
                />
              </Space>
            </Col>
            <Col>
              <Space>
                <Button onClick={() => history.push('/metric/input-task/overview')}>{t('overview.title')}</Button>
                {curBusiGroup.perm === 'rw' && (
                  <Button type='primary' onClick={() => history.push('/metric/input-task/operations')}>
                    {t('common:btn.add')}
                  </Button>
                )}
                <Dropdown
                  trigger={['click']}
                  overlay={
                    <Menu>
                      {curBusiGroup.perm === 'rw' && (
                        <Menu.Item
                          key='batch_import'
                          onClick={() => {
                            Import({
                              bgid: curBusiId,
                              type: 'input_tasks',
                              refreshList: () => setRefreshFlag(_.uniqueId('refresh_')),
                            });
                          }}
                        >
                          {t('common:btn.batch_import')}
                        </Menu.Item>
                      )}
                      <Menu.Item
                        key='batch_export'
                        disabled={Boolean(!selectedRows.length)}
                        onClick={() => {
                          exportBatchDataDetail('input_tasks', curBusiId, selectedRows).then((res) => {
                            Export({
                              filename: t('input_tasks'),
                              data: JSON.stringify(res.dat, null, 4),
                              allowCopyToml: {
                                type: 'input_tasks_toml',
                                bgid: curBusiId,
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
            rowKey='name'
            columns={columns}
            dataSource={list.filter((item: any) => item.name.toString().toLowerCase().includes(query.toLowerCase()))}
            pagination={pagination}
            rowSelection={{
              selectedRowKeys: selectedRows.map((item) => item.name),
              onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
                setSelectedRows(selectedRows);
              },
            }}
          />
        </div>
      </div>
      <Modal
        title={t('input_task.batch_status')}
        visible={visible}
        onOk={() => {
          form.validateFields().then((values) => {
            batchUpdateMetricsTask({
              busi_group_id: curBusiId,
              names: selectedRows.map((item) => item.name),
              fields: {
                disabled: values.disabled ? 0 : 1,
              },
            }).then(() => {
              setRefreshFlag(_.uniqueId('refresh_'));
              message.success(t('common:success.edit'));
              setVisible(false);
              form.resetFields();
            });
          });
        }}
        onCancel={() => {
          form.resetFields();
          setVisible(false);
        }}
      >
        <Form form={form} initialValues={{ disabled: true }}>
          <Form.Item label={t('input_task.enable_task')} name='disabled' valuePropName='checked'>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </PageLayout>
  );
};

export default CollectTask;
