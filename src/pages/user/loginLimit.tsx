import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import PageLayout from '@/components/pageLayout';
import { Table, Button, Select, Space, Row, Col, Modal, message, Form, DatePicker } from 'antd';
import { ReloadOutlined, RollbackOutlined } from '@ant-design/icons';
import { getUserLoginLimit, deleteUserLoginLimit, addUserLoginLimit } from '@/services/manage';
import { getUserInfoList } from '@/services/manage';
import moment from 'moment';
import { useAntdTable } from 'ahooks';
import './locale';

const LoginLimit: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation('user');
  const [form] = Form.useForm();
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const [selectedRows, setSelectRowKeys] = useState<string[]>([]);
  const [userList, setUserList] = useState<any>([]);
  const [visible, setVisible] = useState(false);

  const getTableData = ({ current, pageSize, sorter }): Promise<any> => {
    return getUserLoginLimit().then((res) => {
      return {
        total: res.dat?.length || 0,
        list: res.dat || [],
      };
    });
  };
  const { tableProps } = useAntdTable(getTableData, {
    defaultPageSize: 15,
    refreshDeps: [refreshFlag],
  });

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        addUserLoginLimit({ ...values, last_time: values.last_time.unix() }).then((res) => {
          message.success(t('common:success.add'));
          setVisible(false);
          setRefreshFlag(_.uniqueId('refresh_'));
        });
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  useEffect(() => {
    getUserInfoList({
      limit: -1,
      status: 100,
    }).then((res) => {
      setUserList(res.dat.list);
    });
  }, []);

  return (
    <PageLayout
      title={t('login_limit_detail')}
      icon={<RollbackOutlined className='back' onClick={() => history.push('/users')} />}
    >
      <div>
        <div style={{ padding: '10px' }}>
          <Row justify='space-between'>
            <Col>
              <Button icon={<ReloadOutlined />} onClick={() => setRefreshFlag(_.uniqueId('refresh_'))} />
            </Col>
            <Col>
              <Space>
                <Button
                  onClick={() => {
                    setVisible(true);
                  }}
                  type='primary'
                >
                  {t('common:btn.add')}
                </Button>
                <Button
                  disabled={Boolean(!selectedRows.length)}
                  onClick={() => {
                    deleteUserLoginLimit({ ip: selectedRows }).then((res) => {
                      message.success(t('common:success.relieve'));
                      setRefreshFlag(_.uniqueId('refresh_'));
                    });
                  }}
                >
                  {t('common:btn.batch_relieve')}
                </Button>
              </Space>
            </Col>
          </Row>

          <Table
            size='small'
            rowKey='ip'
            columns={[
              {
                title: 'IP',
                dataIndex: 'ip',
                sorter: (a, b) => a.ip - b.ip,
              },
              {
                title: t('last_time'),
                dataIndex: 'last_time',
                sorter: (a, b) => a.last_time - b.last_time,
                render: (val: number) => moment.unix(val).format('YYYY-MM-DD HH:mm:ss'),
              },
              {
                title: t('common:table.operations'),
                width: 100,
                render: (_text, record, idx) => {
                  return (
                    <Space>
                      <Button
                        type='link'
                        size='small'
                        onClick={() => {
                          deleteUserLoginLimit({ ip: [record.ip] }).then((res) => {
                            message.success(t('common:success.relieve'));
                            setRefreshFlag(_.uniqueId('refresh_'));
                          });
                        }}
                      >
                        {t('unrestrict')}
                      </Button>
                    </Space>
                  );
                },
              },
            ]}
            rowSelection={{
              selectedRowKeys: selectedRows,
              onChange: (selectedRowKeys: string[]) => {
                setSelectRowKeys(selectedRowKeys);
              },
            }}
            {...tableProps}
            pagination={{
              ...tableProps.pagination,
              pageSizeOptions: ['20', '50', '100'],
              showTotal: (total) => t('common:table.total', { total }),
              showSizeChanger: true,
            }}
          />
        </div>
        <Modal
          forceRender
          title={t('create_ip_login_limit')}
          visible={visible}
          width={500}
          onOk={handleOk}
          onCancel={() => {
            form.resetFields();
            setVisible(false);
          }}
        >
          <Form
            form={form}
            labelCol={{
              span: 4,
            }}
            wrapperCol={{
              span: 19,
            }}
          >
            <Form.Item label='IP' name='ip' rules={[{ required: true }]}>
              <Select
                mode='tags'
                allowClear
                tokenSeparators={[' ']}
                open={false}
                placeholder={t('ip_limit_placeholder')}
              />
            </Form.Item>
            <Form.Item label={t('limit_time')} name='last_time' rules={[{ required: true }]}>
              <DatePicker
                style={{ width: '100%' }}
                showTime
                placeholder={t('limit_time_placeholder')}
                getPopupContainer={() => document.body}
                disabledDate={(current) => current && current.isBefore(moment(), 'second')}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PageLayout>
  );
};

export default LoginLimit;
