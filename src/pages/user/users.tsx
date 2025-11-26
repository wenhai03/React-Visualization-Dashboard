import React, { useState, useContext, useEffect } from 'react';
import moment from 'moment';
import _ from 'lodash';
import {
  Button,
  Input,
  message,
  Row,
  Col,
  Modal,
  Table,
  Select,
  Space,
  Alert,
  Tabs,
  Steps,
  Form,
  Tag,
  Dropdown,
  Menu,
} from 'antd';
import { SearchOutlined, UserOutlined, ReloadOutlined, DownOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import UserInfoModal from './component/createModal';
import {
  getUserInfoList,
  deleteUser,
  updateAccountStateBatch,
  importUserBatch,
  addTeamUsersBatch,
  deleteTeamUsersBatch,
  batchDeleteUser,
} from '@/services/manage';
import { User, UserType, ActionType } from '@/store/manageInterface';
import { CommonStateContext } from '@/App';
import { getTeamInfoList } from '@/services/manage';
import './index.less';
import './locale';

const { confirm } = Modal;
const { Step } = Steps;

interface IFilter {
  type?: number;
  status?: number;
}

const ImportUserContainer: React.FC<{ teamList: any; refresh: () => void }> = ({ refresh, teamList }) => {
  const { t } = useTranslation('user');
  const [form] = Form.useForm();
  const [importUsers, setImportUsers] = useState<{ success: []; fail: [] }>();
  const successColumns =
    form.getFieldValue('type') === 'wecom_id'
      ? [
          {
            title: t('common:profile.wecom'),
            dataIndex: 'wecom_id',
            key: 'wecom_id',
          },
        ]
      : [
          {
            title: t('common:profile.idm'),
            dataIndex: 'idm_id',
            key: 'idm_id',
          },
        ];

  const failColumns = [
    ...successColumns,
    {
      title: t('errmsg'),
      dataIndex: 'err',
      key: 'err',
    },
  ];

  const handleUpload = () => {
    form
      .validateFields()
      .then((values) => {
        const { type, account } = values;
        const accountArr = account.split('\n').map((item) => ({ [type]: item }));
        importUserBatch({ ...values, account: accountArr }).then((res) => {
          setImportUsers(res.dat);
          refresh();
        });
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  return (
    <Form form={form} initialValues={{ type: 'wecom_id' }}>
      <Steps direction='vertical' size='small'>
        <Step
          title={t('import_type')}
          description={
            <Row gutter={8} style={{ width: '690px' }}>
              <Col span={12}>
                <Form.Item name='type' rules={[{ required: true }]}>
                  <Select
                    options={[
                      { label: t('wecom_id'), value: 'wecom_id' },
                      { label: t('idm_id'), value: 'idm_id' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
          }
          status='process'
        />
        <Step
          title={t('account_attr')}
          description={
            <Row gutter={8} style={{ width: '690px' }}>
              <Col span={5}>
                <Form.Item
                  label={t('account_status')}
                  name='status'
                  rules={[{ required: true, message: t('account_status_required') }]}
                >
                  <Select>
                    <Select.Option value={100}>{t('enable')}</Select.Option>
                    <Select.Option value={200}>{t('disbale')}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={19}>
                <Form.Item
                  label={t('business.team_name')}
                  name='team_ids'
                  rules={[{ required: true, message: t('team_required') }]}
                >
                  <Select mode='multiple' showSearch optionFilterProp='children' allowClear>
                    {teamList.map((item: any) => (
                      <Select.Option value={item.id} key={item.id} showSearch>
                        {item.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          }
          status='process'
        />
        <Step
          title={t('account')}
          description={
            <Space align='end'>
              <Form.Item name='account' rules={[{ required: true, message: t('account_required') }]}>
                <Input.TextArea style={{ width: '250px', height: '150px' }} />
              </Form.Item>
              <Form.Item>
                <Button size='small' onClick={handleUpload} type='primary'>
                  {t('common:btn.import')}
                </Button>
              </Form.Item>
            </Space>
          }
          status='process'
        />
        <Step
          title={t('step3')}
          description={
            importUsers && (
              <>
                <Alert
                  message={t('import_info', {
                    success: importUsers.success?.length ?? 0,
                    fail: importUsers.fail?.length ?? 0,
                  })}
                  type='info'
                  showIcon
                  style={{ marginBottom: '10px' }}
                ></Alert>
                <Tabs type='card' size='small'>
                  <Tabs.TabPane tab={t('import_success')} key='success'>
                    <Table
                      size='small'
                      dataSource={importUsers.success}
                      columns={successColumns}
                      scroll={{ y: 180 }}
                      pagination={false}
                    />
                  </Tabs.TabPane>
                  <Tabs.TabPane tab={t('import_fail')} key='error'>
                    <Table
                      size='small'
                      dataSource={importUsers.fail}
                      columns={failColumns}
                      scroll={{ y: 180 }}
                      pagination={false}
                    />
                  </Tabs.TabPane>
                </Tabs>
              </>
            )
          }
          status='process'
        />
      </Steps>
    </Form>
  );
};

const Resource: React.FC = () => {
  const { t } = useTranslation('user');
  const [visible, setVisible] = useState<boolean>(false);
  const [statusVisible, setstatusVisible] = useState<boolean>(false);
  const [status, setStatus] = useState(100);
  const [action, setAction] = useState<ActionType>();
  const [userId, setUserId] = useState<number>();
  const [memberId, setMemberId] = useState<number>();
  const [filter, setFilter] = useState<IFilter>({});
  const [searchName, setSearchName] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const { profile } = useContext(CommonStateContext);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const [teamVisible, setTeamVisible] = useState(false);
  const [teamInput, setTeamInput] = useState([]);
  const [current, setCurrent] = useState(1);
  const [type, setType] = useState<'add' | 'delete'>('add');
  const [teamList, setTeamList] = useState([]);
  const [userList, setUserList] = useState([]);
  // 登录限制用户数
  const [limitCount, setLimitCount] = useState(0);
  const userColumn: ColumnsType<User> = [
    {
      title: t('common:profile.username'),
      dataIndex: 'username',
      ellipsis: true,
    },
    {
      title: t('common:profile.nickname'),
      dataIndex: 'nickname',
      ellipsis: true,
      render: (text: string, record) => record.nickname || '-',
    },
    {
      title: t('common:profile.email'),
      dataIndex: 'email',
      render: (text: string, record) => record.email || '-',
    },
    {
      title: t('common:profile.phone'),
      dataIndex: 'phone',
      render: (text: string, record) => record.phone || '-',
    },
    {
      title: t('account_type'),
      dataIndex: 'type',
      render: (val) => (val === 100 ? t('builtIn') : t('non_buildIn')),
    },
    // {
    //   title: '用户中心账号',
    //   dataIndex: 'idm_id',
    //   render: (val) => val || '-',
    // },
    {
      title: t('account_status'),
      dataIndex: 'status',
      render: (val) => {
        return val === 100 ? <Tag color='green'>{t('normal')}</Tag> : <Tag color='red'>{t('unauthorized')}</Tag>;
      },
    },
  ];
  const userColumns: ColumnsType<User> = [
    ...userColumn,
    {
      title: t('common:table.create_at'),
      dataIndex: 'create_at',
      render: (text) => {
        return moment.unix(text).format('YYYY-MM-DD HH:mm:ss');
      },
      sorter: (a, b) => a.create_at - b.create_at,
    },
    {
      title: t('common:table.operations'),
      width: '240px',
      render: (text: string, record) => (
        <>
          <Button className='oper-name' type='link' onClick={() => handleClick(ActionType.EditUser, record.id)}>
            {t('common:btn.modify')}
          </Button>
          <Button className='oper-name' type='link' onClick={() => handleClick(ActionType.Reset, record.id)}>
            {t('common:password.reset')}
          </Button>
          <Button
            type='link'
            danger
            className='oper-name'
            disabled={profile.id === Number(record.id)}
            onClick={() => {
              confirm({
                title: t('common:confirm.delete'),
                okText: t('common:btn.ok'),
                cancelText: t('common:btn.cancel'),
                onOk: () => {
                  deleteUser(record.id).then((_) => {
                    message.success(t('common:success.delete'));
                    handleClose();
                  });
                },
                onCancel: () => {},
              });
            }}
          >
            {t('common:btn.delete')}
          </Button>
        </>
      ),
    },
  ];

  if (!profile.roles?.includes('Admin')) {
    userColumns.pop(); //普通用户不展示操作列
  }

  const handleClick = (type: ActionType, id?: number, memberId?: number) => {
    if (id) {
      setUserId(id);
    } else {
      setUserId(undefined);
    }

    if (memberId) {
      setMemberId(memberId);
    } else {
      setMemberId(undefined);
    }

    setAction(type);
    setVisible(true);
  };

  // 批量授权
  const handleOk = () => {
    updateAccountStateBatch({ status, ids: selectedRowKeys }).then((_) => {
      message.success(t('common:success.modify'));
      setstatusVisible(false);
      setStatus(100);
    });
    setRefreshFlag(_.uniqueId('refresh_flag'));
  };

  // 弹窗关闭回调
  const handleClose = (status?: any) => {
    setVisible(false);
    if (status !== 'cancel') {
      setRefreshFlag(_.uniqueId('refresh_flag'));
    }
  };

  useEffect(() => {
    const params = {
      limit: -1,
      ...filter,
    };
    getUserInfoList(params).then((res) => {
      setCurrent(1);
      setLimitCount(res.dat.login_limit_count ?? 0);
      setUserList(res.dat?.list ?? []);
    });
  }, [filter, refreshFlag]);

  useEffect(() => {
    getTeamInfoList({ query: '', limit: 2000 }).then((data) => {
      setTeamList(data.dat || []);
    });
  }, []);

  return (
    <PageLayout title={t('user.title')} icon={<UserOutlined />}>
      <div className='user-manage-content'>
        <div className='user-content'>
          <Row className='event-table-search'>
            <Space className='event-table-search-left'>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setRefreshFlag(_.uniqueId('refresh_'));
                }}
              />
              <Input
                className={'searchInput'}
                prefix={<SearchOutlined />}
                onPressEnter={(val: any) => setSearchName(val.target.value)}
                placeholder={t('user.search_placeholder')}
              />
              <Select
                placeholder={t('account_status')}
                value={filter.status}
                onChange={(val) => setFilter({ ...filter, status: val })}
                style={{ width: '150px' }}
                allowClear
              >
                <Select.Option value={100}>{t('normal')}</Select.Option>
                <Select.Option value={200}>{t('unauthorized')}</Select.Option>
              </Select>
              <Select
                placeholder={t('account_type')}
                value={filter.type}
                onChange={(val) => setFilter({ ...filter, type: val })}
                style={{ width: '150px' }}
                allowClear
              >
                <Select.Option value={100}>{t('builtIn')}</Select.Option>
                <Select.Option value={200}>{t('non_buildIn')}</Select.Option>
              </Select>
            </Space>
            <div className='event-table-search-right'>
              {profile.roles?.includes('Admin') && (
                <Space className='user-manage-operate'>
                  {profile.admin && (
                    <Link to={{ pathname: '/users/session-gather' }}>
                      <Button>{t('common:active_session')}</Button>
                    </Link>
                  )}
                  <Link to={{ pathname: '/users/login-limit' }}>
                    <Button>
                      {t('login_limit_detail')}（{limitCount}）
                    </Button>
                  </Link>
                  <Button
                    onClick={() =>
                      Modal.info({
                        width: 800,
                        title: t('step_title'),
                        content: (
                          <ImportUserContainer
                            teamList={teamList}
                            refresh={() => setRefreshFlag(_.uniqueId('refresh_flag'))}
                          />
                        ),
                        icon: null,
                        okText: t('common:btn.close'),
                        okType: 'default',
                        onOk() {},
                      })
                    }
                  >
                    {t('import_user')}
                  </Button>
                  <Dropdown
                    trigger={['click']}
                    overlay={
                      <Menu>
                        <Menu.Item
                          key='batch_accredit'
                          disabled={!selectedRowKeys.length}
                          onClick={() => setstatusVisible(true)}
                        >
                          {t('accredit_batch')}
                        </Menu.Item>
                        <Menu.Item
                          key='batch_del_user'
                          disabled={!selectedRowKeys.length}
                          onClick={() => {
                            Modal.confirm({
                              title: t('common:confirm.delete'),
                              okText: t('common:btn.ok'),
                              cancelText: t('common:btn.cancel'),
                              onOk: async () => {
                                batchDeleteUser({ ids: selectedRowKeys }).then(() => {
                                  message.success(t('common:success.delete'));
                                  setRefreshFlag(_.uniqueId('refresh_flag'));
                                });
                              },
                            });
                          }}
                        >
                          {t('common:btn.batch_delete')}
                        </Menu.Item>
                        <Menu.Item
                          key='batch_add'
                          disabled={!selectedRowKeys.length}
                          onClick={() => {
                            setTeamVisible(true);
                            setType('add');
                          }}
                        >
                          {t('batch_associated_team')}
                        </Menu.Item>
                        <Menu.Item
                          key='batch_delete'
                          disabled={!selectedRowKeys.length}
                          onClick={() => {
                            setTeamVisible(true);
                            setType('delete');
                          }}
                        >
                          {t('batch_unteam')}
                        </Menu.Item>
                      </Menu>
                    }
                  >
                    <Button>
                      {t('common:btn.batch_operations')} <DownOutlined />
                    </Button>
                  </Dropdown>
                  <Button type='primary' onClick={() => handleClick(ActionType.CreateUser)}>
                    {t('common:btn.add')}
                  </Button>
                </Space>
              )}
            </div>
          </Row>
          <Table
            size='small'
            rowKey='id'
            columns={userColumns}
            dataSource={userList.filter((item: any) => {
              return (
                item.username.includes(searchName) ||
                item.nickname.includes(searchName) ||
                item.first_letter.includes(searchName) ||
                item.py.includes(searchName)
              );
            })}
            pagination={{
              current: current,
              total: userList.filter((item: any) => {
                return (
                  item.username.includes(searchName) ||
                  item.nickname.includes(searchName) ||
                  item.first_letter.includes(searchName) ||
                  item.py.includes(searchName)
                );
              }).length,
              showSizeChanger: true,
              showTotal: (total) => {
                return t('common:table.total', { total });
              },
              pageSizeOptions: ['10', '20', '50', '100'],
              defaultPageSize: 10,
              onChange: (page) => setCurrent(page),
            }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys: number[]) => setSelectedRowKeys(keys),
            }}
            scroll={{ y: 'calc(100vh - 230px)' }}
          />
        </div>
        <UserInfoModal
          visible={visible}
          action={action as ActionType}
          width={800}
          userType={UserType.User}
          onClose={handleClose}
          userId={userId}
          teamId={undefined}
          memberId={memberId}
        />
        <Modal
          title={t('accredit_batch')}
          visible={statusVisible}
          centered
          width={400}
          onOk={handleOk}
          onCancel={() => {
            setstatusVisible(false);
            setStatus(100);
          }}
          destroyOnClose={true}
        >
          <Select
            placeholder={t('account_status')}
            value={status}
            onChange={(e) => setStatus(e)}
            style={{ width: '200px' }}
          >
            <Select.Option value={100}>{t('normal')}</Select.Option>
            <Select.Option value={200}>{t('unauthorized')}</Select.Option>
          </Select>
        </Modal>
        <Modal
          title={type === 'add' ? t('batch_associated_team') : t('batch_unteam')}
          visible={teamVisible}
          centered
          width={400}
          onCancel={() => {
            setTeamVisible(false);
            setTeamInput([]);
          }}
          footer={[
            <Button
              key='cancel'
              onClick={() => {
                setTeamVisible(false);
                setTeamInput([]);
              }}
            >
              {t('common:btn.cancel')}
            </Button>,
            <Button
              key='ok'
              type='primary'
              disabled={!selectedRowKeys?.length}
              onClick={() => {
                if (type === 'add') {
                  // 批量添加
                  addTeamUsersBatch({
                    team_ids: teamInput,
                    user_ids: selectedRowKeys,
                  }).then((res) => {
                    message.success(t('batch_add_success'));
                    setTeamVisible(false);
                  });
                } else {
                  // 批量删除
                  deleteTeamUsersBatch({
                    team_ids: teamInput,
                    user_ids: selectedRowKeys,
                  }).then((res) => {
                    message.success(t('batch_delete_success'));
                    setTeamVisible(false);
                  });
                }
              }}
            >
              {t('common:btn.save')}
            </Button>,
          ]}
          destroyOnClose={true}
        >
          <Select
            className='select-roles'
            mode='multiple'
            value={teamInput}
            onChange={(e) => setTeamInput(e)}
            style={{ width: '100%' }}
            allowClear
          >
            {teamList?.map((item: { name: string; id: number }, index) => (
              <Select.Option value={item.id} key={index}>
                {item.name}
              </Select.Option>
            ))}
          </Select>
        </Modal>
      </div>
    </PageLayout>
  );
};

export default Resource;
