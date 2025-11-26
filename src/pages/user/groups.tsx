import React, { useEffect, useState, useContext } from 'react';
import moment from 'moment';
import _ from 'lodash';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import { getBusiGroups } from '@/services/common';
import { CommonStateContext } from '@/App';
import { Button, Table, Input, message, Row, Col, Modal, Space, Tabs, Switch, Tree, Select } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  StarTwoTone,
} from '@ant-design/icons';
import UserInfoModal from './component/createModal';
import {
  getTeamInfoTree,
  getTeamInfo,
  deleteTeam,
  deleteMember,
  updateMember,
  getBusinessNotifyGroup,
  getTeamAssociatedGroup,
  getRoles,
  changeTeamInfo,
  getBusinessTeamList,
} from '@/services/manage';
import { getDatasourceBriefList, getMenuPerm } from '@/services/common';
import { useHistory } from 'react-router-dom';
import { User, UserType, ActionType, TeamInfo } from '@/store/manageInterface';
import { ColumnsType } from 'antd/lib/table';
import { useTranslation } from 'react-i18next';
import { findFirstNullChildrenWithParents, getCurBusiId } from '@/utils';
import './index.less';
import './locale';

const { confirm } = Modal;
export const PAGE_SIZE = 20;

const Resource: React.FC = () => {
  const { t } = useTranslation('user');
  const {
    setBusiGroups,
    setCurBusiGroup,
    curBusiGroup,
    setCurBusiId,
    profile,
    setDatasourceList,
    setMenuLoading,
    setMenuPerm,
  } = useContext(CommonStateContext);
  const history = useHistory();
  const [visible, setVisible] = useState<boolean>(false);
  const [action, setAction] = useState<ActionType>();
  const [teamId, setTeamId] = useState<number>();
  const [memberId, setMemberId] = useState<number>();
  const [memberList, setMemberList] = useState<User[]>([]);
  const [allMemberList, setAllMemberList] = useState<User[]>([]);
  const [teamInfo, setTeamInfo] = useState<any>();
  const [teamList, setTeamList] = useState<any>([]);
  const [memberLoading, setMemberLoading] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>('');
  const [searchMemberValue, setSearchMemberValue] = useState<string>('');
  const [associatedGroup, setAssociatedGroup] = useState([]);
  const [groupLoading, setGroupLoading] = useState<boolean>(false);
  const pagination = usePagination({ PAGESIZE_KEY: 'groups-list' });
  const [activeKey, setActiveKey] = React.useState('team');
  // 角色下拉列表
  const [roleList, setRoleList] = useState<{ id: number; name: string; note: string }[]>([]);
  // 角色列表
  const [selectedRoles, setSelecctedRoles] = useState<{ id: number; name: string; note: string }[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  // 关联角色
  const [roleInput, setRoleInput] = useState([]);
  const [roleVisible, setRoleVisible] = useState(false);
  const userColumn: ColumnsType<User> = [
    {
      title: t('common:profile.username'),
      dataIndex: 'username',
      ellipsis: true,
      render: (text, record) => (
        <Space>
          {record.position === 100 && <StarTwoTone title={t('leader')} twoToneColor='orange' />}
          {text}
        </Space>
      ),
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
  ];

  const teamMemberColumns: ColumnsType<User> = [
    ...userColumn,
    {
      title: t('common:table.operations'),
      width: '120px',
      render: (text: string, record) => (
        <Space>
          {(profile?.admin || teamInfo?.position === 100 || profile?.id === record.id) && (
            <a
              style={{
                color: 'red',
              }}
              onClick={() => {
                let params = {
                  ids: [record.id],
                };
                confirm({
                  title: memberList?.length === 1 ? t('team.last_member_tip') : t('common:confirm.delete'),
                  okText: t('common:btn.ok'),
                  cancelText: t('common:btn.cancel'),
                  onOk: () => {
                    deleteMember(teamId as number, params).then(async (_) => {
                      message.success(t('common:success.delete'));
                      // 更新业务组信息
                      if (profile?.id === record.id && !profile?.admin) {
                        const finallyBusiItem = await updataLocalBusiGroup();
                        finallyBusiItem && handleClose(memberList?.length === 1 ? true : 'updateMember');
                      } else {
                        handleClose(memberList?.length === 1 ? true : 'updateMember');
                      }
                    });
                  },
                  onCancel: () => {},
                });
              }}
            >
              {t('common:btn.delete')}
            </a>
          )}
          {(profile?.admin || teamInfo?.position === 100) && (
            <Switch
              checkedChildren={t('leader')}
              unCheckedChildren={t('member')}
              checked={record.position === 100 ? true : false}
              onChange={(checked) => {
                let params = {
                  ids: [record.id],
                  position: checked ? 100 : 200,
                };
                updateMember(teamId as number, params).then((_) => {
                  getTeamInfoDetail(teamId as number);
                  message.success(t('common:success.modify'));
                });
              }}
            />
          )}
        </Space>
      ),
    },
  ];

  const updataLocalBusiGroup = async () => {
    let params = {
      limit: 2000,
    };

    const res = await getBusinessTeamList(params);
    let finallyBusiItem;
    if (res.dat.length) {
      const localBgid = getCurBusiId();
      // 删除自己后的业务组列表和缓存中的业务组id是否相同
      const isExist = res.dat.find((ele) => ele.id === Number(localBgid));
      // 缓存中的业务组被删除，取第一个
      finallyBusiItem = res.dat[0];
      if (!isExist) {
        // 更新缓存中的业务组id
        setCurBusiId(finallyBusiItem.id);
        // 更新菜单栏
        setMenuLoading(true);
        const menus = await getMenuPerm();
        setMenuPerm(menus.dat);
        // 更新数据源
        getDatasourceBriefList(finallyBusiItem.id).then((data_source) => {
          setDatasourceList(data_source);
        });
        // 判断当前路由是否在菜单权限内，没有则跳转到第一个有权限的
        if (!menus.dat.includes('/user-groups')) {
          history.push(menus.dat[0]);
          finallyBusiItem = undefined;
        }
        setMenuLoading(false);
      }

      // 变更业务组列表
      setBusiGroups(res.dat || []);
    } else {
      history.push('/no-exist-bgid');
    }
    return finallyBusiItem;
  };

  useEffect(() => {
    getList(true);
    getRoles().then((res) => setRoleList(res));
  }, []); //teamId变化触发

  useEffect(() => {
    if (teamId) {
      getTeamInfoDetail(teamId);
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId && activeKey === 'group') {
      setGroupLoading(true);
      getTeamAssociatedGroup({ id: Number(teamId) })
        .then((res) => {
          setGroupLoading(false);
          setAssociatedGroup(res.dat);
        })
        .catch(() => setGroupLoading(false));
    } else if (teamId && activeKey === 'roles') {
      setSelecctedRoles(teamInfo.role_list);
    }
  }, [teamId, activeKey]);

  const getList = (isDeleteOrAdd = false) => {
    getTeamList('', isDeleteOrAdd);
  };

  // 获取团队列表
  const getTeamList = (search?: string, isDelete?: boolean) => {
    getTeamInfoTree({ query: search || '' }).then((res) => {
      setTeamList(res.dat || []);
      if ((!teamId || isDelete) && res.dat?.length > 0) {
        const items = findFirstNullChildrenWithParents(res.dat);
        const lastItem = items[items?.length - 1];
        setTeamId(lastItem.key);
        setExpandedKeys(items.map((ele) => ele.key));
      }
    });
  };

  // 获取团队详情
  const getTeamInfoDetail = (id: number) => {
    setMemberLoading(true);
    getTeamInfo(id).then((data: TeamInfo) => {
      setTeamInfo(data.user_group);
      setSelecctedRoles(data.user_group?.role_list || []);
      setMemberList(data.users);
      setAllMemberList(data.users);
      setMemberLoading(false);
    });
  };

  const handleSearch = (type?: string, val?: string) => {
    if (type === 'team') {
      getTeamList(val);
    } else {
      if (!val) {
        getTeamInfoDetail(teamId as number);
      } else {
        setMemberLoading(true);
        let newList = allMemberList.filter(
          (item) =>
            item.username.indexOf(val) !== -1 ||
            item.nickname.indexOf(val) !== -1 ||
            item.id.toString().indexOf(val) !== -1 ||
            item.phone.indexOf(val) !== -1 ||
            item.email.indexOf(val) !== -1,
        );
        setMemberList(newList);
        setMemberLoading(false);
      }
    }
  };

  const handleClick = (type: ActionType, id?: number, memberId?: number) => {
    if (id) {
      setTeamId(id);
    } else {
      setTeamId(undefined);
    }

    if (memberId) {
      setMemberId(memberId);
    } else {
      setMemberId(undefined);
    }

    setAction(type);
    setVisible(true);
  };

  // 弹窗关闭回调
  const handleClose = (isDeleteOrAdd: boolean | string = false) => {
    setVisible(false);
    if (searchValue) {
      handleSearch('team', searchValue);
    } else {
      // 添加、删除成员 不用获取列表
      if (isDeleteOrAdd !== 'updateMember' && isDeleteOrAdd !== 'cancel') {
        getList(isDeleteOrAdd !== 'updateName'); // 修改名字，不用选中第一个
      }
    }
    if (teamId && (isDeleteOrAdd === 'update' || isDeleteOrAdd === 'updateMember' || isDeleteOrAdd === 'updateName')) {
      getTeamInfoDetail(teamId);
    }
  };

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
  };

  const onSelect = (newExpandedKeys: number[], info) => {
    if (info.node.key > 0 && newExpandedKeys.length) {
      setTeamId(newExpandedKeys[0]);
    }
  };

  return (
    <PageLayout title={t('team.title')} icon={<TeamOutlined />}>
      <div className='user-manage-content'>
        <div style={{ display: 'flex', height: '100%' }}>
          <div className='left-tree-area'>
            <div className='sub-title'>
              {t('team.list')}
              {profile?.admin && (
                <Button
                  style={{
                    height: '30px',
                  }}
                  size='small'
                  type='link'
                  onClick={() => {
                    handleClick(ActionType.CreateTeam);
                  }}
                >
                  {t('common:btn.add')}
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', margin: '5px 0px 12px' }}>
              <Input
                prefix={<SearchOutlined />}
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                }}
                onPressEnter={(e) => {
                  // @ts-ignore
                  getTeamList(e.target.value);
                }}
                onBlur={(e) => {
                  // @ts-ignore
                  getTeamList(e.target.value);
                }}
              />
            </div>
            <Tree
              onExpand={onExpand}
              expandedKeys={expandedKeys}
              selectedKeys={[teamId] as React.Key[]}
              onSelect={onSelect}
              treeData={teamList}
              titleRender={(nodeData: { key: number; title: string; note: string }) => {
                return <span title={nodeData.note}>{nodeData.title}</span>;
              }}
            />
          </div>
          {teamList?.length > 0 ? (
            <div className='resource-table-content'>
              <Row className='team-info'>
                <Col
                  span='24'
                  style={{
                    color: '#000',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    display: 'inline',
                  }}
                >
                  {teamInfo && teamInfo.name}
                  {(profile?.admin || teamInfo?.position === 100) && (
                    <EditOutlined
                      style={{
                        marginLeft: '8px',
                        fontSize: '14px',
                      }}
                      onClick={() => handleClick(ActionType.EditTeam, teamId)}
                    ></EditOutlined>
                  )}

                  {profile?.admin && (
                    <DeleteOutlined
                      style={{
                        marginLeft: '8px',
                        fontSize: '14px',
                      }}
                      onClick={() => {
                        getBusinessNotifyGroup({ user_group_id: teamInfo.id }).then((res) => {
                          confirm({
                            title: res.dat.length
                              ? t('team.delete_number_tip', { group: res.dat.map((item) => item.name).join('、') })
                              : t('common:confirm.delete'),
                            okText: t('common:btn.ok'),
                            cancelText: t('common:btn.cancel'),
                            onOk: () => {
                              // 获取绑定了当前团队的业务组
                              deleteTeam(teamId as number).then((_) => {
                                message.success(t('common:success.delete'));
                                handleClose(true);
                                // 更新业务组信息
                                getBusiGroups().then((res) => {
                                  setBusiGroups(res.dat);
                                  const newCurBusiGroup = res.dat.find((item) => item.id === curBusiGroup.id);
                                  setCurBusiGroup(newCurBusiGroup || res.dat?.[0] || {});
                                  setCurBusiId(newCurBusiGroup?.id || res.dat?.[0].id || 0);
                                });
                              });
                            },
                            onCancel: () => {},
                          });
                        });
                      }}
                    />
                  )}
                </Col>
                <Col
                  span='24'
                  style={{
                    marginTop: '8px',
                    color: '#666',
                  }}
                >
                  {t('common:profile.moreContact')} : {!teamInfo?.contacts?.length && '-'}
                </Col>
                {teamInfo?.contacts &&
                  Object.entries(_.groupBy(teamInfo.contacts, 'key')).map(([key, items]) => (
                    <Col
                      span='24'
                      style={{
                        marginTop: '8px',
                        color: '#666',
                      }}
                      key={key}
                    >
                      <Space>
                        {`${items[0]?.label}:`}
                        {items.map((item: any, index) => (
                          <>
                            <span>{item.value}</span>
                            {items.length !== index + 1 && <span>|</span>}
                          </>
                        ))}
                      </Space>
                    </Col>
                  ))}
                <Col
                  style={{
                    marginTop: '8px',
                    color: '#666',
                  }}
                >
                  <Space>
                    <span>
                      {t('common:table.note')}：{teamInfo?.note ? teamInfo.note : '-'}
                    </span>
                    <span>
                      {t('common:table.update_by')}：{teamInfo?.update_by ? teamInfo.update_by : '-'}
                    </span>
                    <span>
                      {t('common:table.update_at')}：
                      {teamInfo?.update_at ? moment.unix(teamInfo.update_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                    </span>
                  </Space>
                </Col>
              </Row>
              <Tabs
                activeKey={activeKey}
                size='large'
                style={{ padding: '10px' }}
                type='card'
                className='business-manage-wrapper'
                onChange={(val) => {
                  setActiveKey(val);
                }}
              >
                <Tabs.TabPane tab={t('team.member')} key='team'>
                  <Row justify='space-between' align='middle'>
                    <Col span='12'>
                      <Input
                        prefix={<SearchOutlined />}
                        value={searchMemberValue}
                        className={'searchInput'}
                        onChange={(e) => setSearchMemberValue(e.target.value)}
                        placeholder={t('team.search_placeholder')}
                        onPressEnter={(e) => handleSearch('member', searchMemberValue)}
                      />
                    </Col>
                    {(profile?.admin || teamInfo?.position === 100) && (
                      <Button
                        type='primary'
                        onClick={() => {
                          handleClick(ActionType.AddUser, teamId);
                        }}
                      >
                        {t('team.add_member')}
                      </Button>
                    )}
                  </Row>
                  <Table
                    size='small'
                    rowKey='id'
                    columns={teamMemberColumns}
                    dataSource={memberList}
                    loading={memberLoading}
                    pagination={{
                      total: memberList?.length,
                      showQuickJumper: true,
                      showSizeChanger: true,
                      showTotal: (total) => {
                        return t('common:table.total', { total });
                      },
                      pageSizeOptions: ['15', '50', '100', '300'],
                      defaultPageSize: 30,
                    }}
                  />
                </Tabs.TabPane>
                <Tabs.TabPane tab={t('business.associated_group')} key='group'>
                  <Table
                    size='small'
                    rowKey='id'
                    columns={[
                      {
                        title: t('common:business_group'),
                        dataIndex: ['busi_group', 'name'],
                      },
                      {
                        title: t('business.perm_flag'),
                        dataIndex: 'perm_flag',
                      },
                    ]}
                    dataSource={associatedGroup}
                    loading={groupLoading}
                    pagination={{
                      total: associatedGroup.length,
                      ...pagination,
                    }}
                  />
                </Tabs.TabPane>
                <Tabs.TabPane tab={t('associated_role')} key='roles'>
                  {profile?.admin && (
                    <Button type='primary' style={{ float: 'right' }} onClick={() => setRoleVisible(true)}>
                      {t('common:btn.add')}
                    </Button>
                  )}
                  <Table
                    size='small'
                    rowKey='id'
                    columns={[
                      {
                        title: t('roles'),
                        dataIndex: 'name',
                      },
                      {
                        title: t('note'),
                        dataIndex: 'note',
                      },
                      {
                        title: t('common:table.operations'),
                        width: '100px',
                        dataIndex: 'operation',
                        render: (_, record) => {
                          return profile?.admin ? (
                            <Button
                              disabled={selectedRoles?.length === 1}
                              type='link'
                              danger
                              style={{ padding: 0, height: '24px', lineHeight: '24px' }}
                              onClick={() => {
                                changeTeamInfo(teamId as number, {
                                  ...teamInfo,
                                  role_ids: [
                                    ...selectedRoles.filter((ele) => ele.id !== record.id).map((role) => role.id),
                                  ],
                                }).then((_) => {
                                  getTeamInfoDetail(teamId as number);
                                  message.success(t('common:success.modify'));
                                });
                              }}
                            >
                              {t('common:btn.delete')}
                            </Button>
                          ) : (
                            '-'
                          );
                        },
                      },
                    ]}
                    dataSource={selectedRoles}
                    loading={memberLoading}
                    pagination={{
                      total: selectedRoles.length,
                      showQuickJumper: true,
                      showSizeChanger: true,
                      showTotal: (total) => {
                        return t('common:table.total', { total });
                      },
                      pageSizeOptions: ['15', '50', '100', '300'],
                      defaultPageSize: 30,
                    }}
                  />
                </Tabs.TabPane>
              </Tabs>
            </div>
          ) : (
            <div className='blank-busi-holder'>
              <p style={{ textAlign: 'left', fontWeight: 'bold' }}>
                <InfoCircleOutlined style={{ color: '#1473ff' }} /> Tips
              </p>
              <p>
                {t('team.empty')}&nbsp;
                <a onClick={() => handleClick(ActionType.CreateTeam)}>{t('team.create')}</a>
              </p>
            </div>
          )}
        </div>
        <UserInfoModal
          visible={visible}
          action={action as ActionType}
          width={700}
          userType={UserType.Team}
          onClose={handleClose}
          onSearch={(val) => {
            setSearchValue(val);
            handleSearch('team', val);
          }}
          userId={undefined}
          teamId={teamId}
          memberId={memberId}
          roleList={roleList}
        />
        <Modal
          title={t('associated_role')}
          visible={roleVisible}
          centered
          width={400}
          onCancel={() => {
            setRoleVisible(false);
            setRoleInput([]);
          }}
          footer={[
            <Button
              key='cancel'
              onClick={() => {
                setRoleVisible(false);
                setRoleInput([]);
              }}
            >
              {t('common:btn.cancel')}
            </Button>,
            <Button
              key='ok'
              type='primary'
              disabled={!roleInput?.length}
              onClick={() => {
                changeTeamInfo(teamId as number, {
                  ...teamInfo,
                  role_ids: [...selectedRoles.map((ele) => ele.id), ...roleInput],
                }).then((_) => {
                  getTeamInfoDetail(teamId as number);
                  message.success(t('common:success.modify'));
                  setRoleVisible(false);
                  setRoleInput([]);
                });
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
            value={roleInput}
            onChange={(e) => setRoleInput(e)}
            style={{ width: '100%' }}
            allowClear
          >
            {roleList
              .filter((ele) => !selectedRoles.map((role) => role.name).includes(ele.name))
              .map((item, index) => (
                <Select.Option value={item.id} key={index}>
                  <div>
                    <div>{item.name}</div>
                    <div className='roles-note'>{item.note}</div>
                  </div>
                </Select.Option>
              ))}
          </Select>
        </Modal>
      </div>
    </PageLayout>
  );
};

export default Resource;
