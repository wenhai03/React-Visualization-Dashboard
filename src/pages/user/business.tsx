import React, { useContext, useEffect, useState } from 'react';
import PageLayout from '@/components/pageLayout';
import { Button, Table, Input, message, Row, Tree, Col, Modal, Tag, Tabs, Spin, Space, Typography, Result } from 'antd';
import { useAntdTable } from 'ahooks';
import moment from 'moment';
import _ from 'lodash';
import { EditOutlined, DeleteOutlined, SearchOutlined, InboxOutlined, InfoCircleOutlined } from '@ant-design/icons';
import UserInfoModal from './component/createModal';
import SourceCard from './component/SourceCard';
import DefaultAlertNotify from './component/DefaultAlertNotify';
import ApplicationServiceForm from './component/ApplicationServiceForm';
import {
  getBusinessTeamList,
  deleteBusinessTeamMember,
  getBusinessTeamTree,
  getBusinessTeamInfo,
  deleteBusinessTeam,
  getBusinessFilter,
  addBusinessFilter,
  updateBusinessFilter,
  deleteBusinessFilter,
  getBusinessServiceName,
  getBusinessServiceNameIndex,
  getBusinessAPI,
  deleteAPIConfig,
} from '@/services/manage';
import { ActionType } from '@/store/manageInterface';
import { getDataCategory } from '@/services/warning';
import { getDatasourceBriefList, getDatasourceList, getMenuPerm } from '@/services/common';
import { CommonStateContext } from '@/App';
import { ColumnsType } from 'antd/lib/table';
import { useTranslation } from 'react-i18next';
import { getMonObjectList, moveTargetBusi } from '@/services/targets';
import { findFirstNullChildrenWithParents, getCurBusiId } from '@/utils';
import { useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import '@/components/BlankBusinessPlaceholder/index.less';
import './index.less';
import './locale';

const { confirm } = Modal;
export const PAGE_SIZE = 200;

const Resource: React.FC = () => {
  const {
    curBusiId,
    busiGroups,
    setBusiGroups,
    setCurBusiId,
    setDatasourceList,
    setCurBusiGroup,
    curBusiGroup,
    profile,
    setMenuLoading,
    setMenuPerm,
    initBoot,
  } = useContext(CommonStateContext);
  const { t } = useTranslation('user');
  const history = useHistory();
  const [visible, setVisible] = useState<boolean>(false);
  const [action, setAction] = useState<ActionType>();
  const [teamId, setTeamId] = useState<number>(curBusiId);
  const [memberList, setMemberList] = useState<{ user_group: any }[]>([]);
  const { search } = useLocation();
  const { initType } = queryString.parse(search);
  const [teamInfo, setTeamInfo] =
    useState<{
      name: string;
      id: number;
      update_by: string;
      update_at: number;
      alert_notify: { notify_channels: string[]; notify_groups: string[] };
      user_groups: any;
      perm: 'rw' | 'ro';
      extra: {api?: boolean}
    }>();
  const [teamList, setTeamList] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<{ prometheus: any[]; elasticsearch: any[]; dataView: any[] }>({
    prometheus: [],
    elasticsearch: [],
    dataView: [],
  });
  const [systemCmd, setSystemCmd] = useState([]);
  // 获取所有数据源
  const [groupedDatasourceList, setGroupedDatasourceList] = useState<{
    [index: string]: { id: number; name: string; plugin_type: string }[];
  }>({});
  // 获取ES索引配置了的数据源
  const [esDataSourceList, setEsDataSourceList] = useState<{ id: number; name: string; plugin_type: string }[]>([]);
  const [activeKey, setActiveKey] = React.useState('team');
  const [loading, setLoading] = useState<boolean>(false);
  const [tabLoading, setTabloading] = useState<boolean>(false);
  const [searchMemberValue, setSearchMemberValue] = useState<string>('');
  const [searchHostValue, setSearchHostValue] = useState<string>('');
  const [searchAPIValue, setSearchAPIValue] = useState<string>('');
  const [hostQueryContent, setHostQueryContent] = useState<string>('');
  const [refreshFlag, setRefreshFlag] = useState(_.uniqueId('refreshFlag_'));
  const [indexOptions, setIndexOptions] = useState<any>({});
  const [serviceNameList, setServiceNameList] = useState();
  const [serviceNameIndex, setServiceNameIndex] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [isShowDetail, setIsShowDetail] = useState<boolean>();
  const [apiList, setAPIList] = useState<any[]>([]);
  const [apiId, setAPIId] = useState<number>();

  const defaultData = {
    prometheus: [{ data_id: '', virtual_id: 0, cmd_type: 1, cmd: [''] }],
    elasticsearch: [{ data_id: '', virtual_id: 0, cmd_type: 2, cmd: [] }],
    dataView: [{ data_id: '', virtual_id: 0, cmd_type: 3, cmd: [] }],
  };
  const teamMemberColumns: ColumnsType<any> = [
    {
      title: t('team.name'),
      dataIndex: ['user_group', 'name'],
      ellipsis: true,
    },
    {
      title: t('common:table.note'),
      dataIndex: ['user_group', 'note'],
      ellipsis: true,
      render: (text: string, record) => record['user_group'].note || '-',
    },
    {
      title: t('roles'),
      dataIndex: ['user_group', 'role_list'],
      render: (val: any) => (
        <div>
          {val?.map((ele) => (
            <Tag key={ele.name} color='blue' style={{ margin: '2px' }}>
              {ele.name}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: t('business.perm_flag'),
      dataIndex: 'perm_flag',
      width: '80px',
    },
    ...(teamInfo?.perm === 'rw'
      ? [
          {
            title: t('common:table.operations'),
            width: '100px',
            render: (text: string, record) => (
              <a
                style={{
                  color: memberList.length > 1 ? 'red' : '#00000040',
                }}
                onClick={() => {
                  if (memberList.length <= 1) return;

                  let params = [
                    {
                      user_group_id: record['user_group'].id,
                      busi_group_id: Number(teamId),
                    },
                  ];
                  confirm({
                    title: teamInfo?.alert_notify.notify_groups?.includes(record['user_group'].id.toString())
                      ? t('business.team_delete_confirm_tip')
                      : t('business.untie_tip'),
                    okText: t('common:btn.ok'),
                    cancelText: t('common:btn.cancel'),
                    onOk: () => {
                      deleteBusinessTeamMember(teamId, params).then((_) => {
                        message.success(t('business.success_untie'));
                        handleClose('deleteMember');
                      });
                    },
                    onCancel: () => {},
                  });
                }}
              >
                {t('business.untie')}
              </a>
            ),
          },
        ]
      : []),
  ];

  const hostColumns: ColumnsType<any> = [
    {
      title: t('common:table.ident'),
      dataIndex: 'ident',
      width: '300px',
      ellipsis: true,
    },
    {
      title: t('tags'),
      dataIndex: 'tags',
      render: (tagArr) =>
        tagArr.map((item) => (
          <Tag
            color='blue'
            key={item}
            onClick={(e) => {
              if (!searchHostValue.includes(item)) {
                const val = hostQueryContent ? `${hostQueryContent.trim()} ${item}` : item;
                setHostQueryContent(val);
                setSearchHostValue(val);
              }
            }}
          >
            {item}
          </Tag>
        )),
    },
    ...(teamInfo?.perm === 'rw'
      ? [
          {
            title: t('common:table.operations'),
            width: '100px',
            render: (text: string, record) => (
              <Button
                type='link'
                size='small'
                danger
                onClick={() => {
                  confirm({
                    title: t('common:confirm.delete'),
                    okText: t('common:btn.ok'),
                    cancelText: t('common:btn.cancel'),
                    onOk() {
                      moveTargetBusi({ idents: [record.ident] }).then(() => {
                        message.success(t('common:success.delete'));
                        handleClose('deleteHost');
                      });
                    },
                  });
                }}
              >
                {t('common:btn.delete')}
              </Button>
            ),
          },
        ]
      : []),
  ];

  const apiColumns: ColumnsType<any> = [
    {
      title: t('common:profile.account'),
      dataIndex: 'user',
      width: 130,
    },
    {
      title: t('business.api_part_password'),
      dataIndex: 'password',
      width: 90,
    },
    {
      title: t('business.api_expire_at'),
      dataIndex: 'expire_at',
      width: 160,
      render: (text) => {
        if (text === -1) {
          return <Tag color='blue'>{t('business.api_expire_at_forever')}</Tag>;
        }
        return (
          <Space size={3}>
            {moment.unix(text).format('YYYY-MM-DD')}
            {((Date.now() / 1000) | 0) > text ? <Tag color='red'>{t('business.expired')}</Tag> : ''}
          </Space>
        );
      },
      sorter: (a, b) => a.expire_at - b.expire_at,
    },
    {
      title: t('business.api_status'),
      dataIndex: 'status',
      width: 60,
      render: (val) => {
        return val === 1 ? <Tag color='green'>{t('normal')}</Tag> : <Tag color='red'>{t('unauthorized')}</Tag>;
      },
    },
    {
      title: t('common:table.create_at'),
      dataIndex: 'create_at',
      width: 150,
      render: (text) => {
        return moment.unix(text).format('YYYY-MM-DD HH:mm:ss');
      },
      sorter: (a, b) => a.update_at - b.update_at,
    },
    {
      title: t('common:table.update_at'),
      dataIndex: 'update_at',
      width: 150,
      render: (text) => {
        return moment.unix(text).format('YYYY-MM-DD HH:mm:ss');
      },
      sorter: (a, b) => a.update_at - b.update_at,
    },
    {
      title: t('common:table.update_by'),
      dataIndex: 'update_by',
      width: 100,
    },
    {
      title: t('common:table.note'),
      dataIndex: 'note',
      ellipsis: true,
    },
    ...(teamInfo?.perm === 'rw'
      ? [
          {
            title: t('common:table.operations'),
            width: '100px',
            render: (text: string, record) => (
              <>
                <Button className='oper-name' type='link' onClick={() => handleClick(ActionType.EditAPI, record['id'])}>
                  {t('common:btn.modify')}
                </Button>
                <Button
                  type='link'
                  danger
                  className='oper-name'
                  onClick={() => {
                    confirm({
                      title: t('common:confirm.delete'),
                      okText: t('common:btn.ok'),
                      cancelText: t('common:btn.cancel'),
                      onOk: () => {
                        deleteAPIConfig(teamId, { ids: [record['id']] }).then((_) => {
                          message.success(t('common:success.delete'));
                          getBusinessAPI(teamId).then((res) => {
                            setAPIList(res);
                          });
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
        ]
      : []),
  ];

  useEffect(() => {
    // 切换业务组，清空搜索条件
    setSearchMemberValue('');
    setSearchHostValue('');
    setHostQueryContent('');
    setSearchAPIValue('');
  }, [teamId, isShowDetail]);

  useEffect(() => {
    getTeamList();
    profile?.admin &&
      getDatasourceList().then((res) => {
        const grouped = _.groupBy(res, 'plugin_type');
        setGroupedDatasourceList(grouped);
      });
  }, [initType]);

  useEffect(() => {
    // 时序指标、ES 索引 只有管理员身份才能操作
    if (teamId && (activeKey === 'prometheus' || activeKey === 'elasticsearch')) {
      getFilterList(activeKey === 'prometheus' ? '1' : '2');
    }

    if (activeKey === 'elasticsearch') {
      getBusinessServiceNameIndex(teamId).then((res) => {
        setServiceNameIndex(res.dat);
      });
    }

    if (teamId && activeKey === 'dataView') {
      getFilterList('3');
      getDatasourceBriefList(teamId).then((res) => {
        const grouped = _.groupBy(res, 'plugin_type');
        setEsDataSourceList(grouped?.elasticsearch || []);
      });
    }

    if (activeKey === 'applicationService') {
      getBusinessServiceName(teamId).then((res) => {
        setServiceNameList(res.dat);
      });
    }

    if (teamId && activeKey === 'api') {
      getBusinessAPI(teamId).then((res) => {
        setAPIList(res);
      });
    }
  }, [teamId, activeKey]);

  const getList = async (action) => {
    const finallyBusiItem = await updataLocalBusiGroup(action);
    finallyBusiItem && getTeamList(undefined, finallyBusiItem);
  };

  // 业务组删除、编辑、解绑团队，需要更新缓存中的业务组id，数据源，当前业务组明细
  const updataLocalBusiGroup = async (action) => {
    if (action === 'delete' || action === 'deleteMember' || action === 'update') {
      let params = {
        limit: 2000,
      };
      const res = await getBusinessTeamList(params);
      let finallyBusiItem;
      if (res.dat.length) {
        const localBgid = getCurBusiId();
        // 删除后的业务组列表和缓存中的业务组id是否相同
        const isExist = res.dat.find((ele) => ele.id === Number(localBgid));
        // 获取第一个is_show_detail 为true（有查看业务组配置权限）的业务组
        const firstIsPerm = res.dat.find((ele) => ele.is_show_detail);
        // 取第一个is_show_detail为true的业务组取第一个
        finallyBusiItem = firstIsPerm || res.dat[0];
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
          if (!menus.dat.includes('/busi-groups')) {
            history.push(menus.dat[0]);
            finallyBusiItem = undefined;
          }
          setMenuLoading(false);
        }
        // 重新获取业务组详情
        if (action === 'update') {
          getTeamInfoDetail(teamId);
        } else if (finallyBusiItem) {
          // 更新tree选中的业务组
          setTeamId(finallyBusiItem.id);
          finallyBusiItem.is_show_detail && getTeamInfoDetail(finallyBusiItem.id);
          setIsShowDetail(finallyBusiItem.is_show_detail);
        }
        // 变更业务组列表
        setBusiGroups(res.dat || []);
      } else {
        history.push('/no-exist-bgid');
      }
      return finallyBusiItem;
    }
  };

  // 获取业务组列表
  const getTeamList = (search?: string, item?: { id: number; is_show_detail: boolean }) => {
    let params = {
      query: search,
      limit: PAGE_SIZE,
    };
    getBusinessTeamTree(params).then((res) => {
      setTeamList(res.dat || []);
      if (!search && !item) {
        // 初始化
        const items = findFirstNullChildrenWithParents(res.dat);
        const lastItem = items[items?.length - 1];
        setTeamId(lastItem.key);
        setIsShowDetail(lastItem.is_show_detail);
        setExpandedKeys(items.map((ele) => ele.key));
        lastItem.is_show_detail && getTeamInfoDetail(lastItem.key);
      }
    });
  };

  // 获取业务组详情
  const getTeamInfoDetail = (id: number) => {
    setLoading(true);
    getBusinessTeamInfo(id).then((data) => {
      setTeamInfo(data);
      setMemberList(data.user_groups);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (teamInfo) {
      // 更新业务组信息
      const curBusiGroupIndex = busiGroups.findIndex((item) => item.id === teamInfo.id);
      if (curBusiGroupIndex !== -1) {
        busiGroups[curBusiGroupIndex] = teamInfo;
        setBusiGroups(busiGroups);
        teamInfo.id === curBusiGroup.id && setCurBusiGroup(teamInfo);
      }
    }
  }, [JSON.stringify(teamInfo)]);

  const handleClick = (type: ActionType, apiId?: number) => {
    setAction(type);
    setVisible(true);
    setAPIId(apiId);
  };

  // 弹窗关闭回调
  const handleClose = (action) => {
    setVisible(false);
    if (['create', 'delete', 'update', 'deleteMember'].includes(action)) {
      getList(action);
    }
    if (teamId && ['addMember'].includes(action)) {
      getTeamInfoDetail(teamId);
    }

    if (teamId && ['addHost', 'deleteHost'].includes(action)) {
      setRefreshFlag(_.uniqueId('refreshFlag_'));
    }

    if (teamId && ['addAPI', 'editAPI'].includes(action)) {
      getBusinessAPI(teamId).then((res) => {
        setAPIList(res);
      });
    }
  };

  //   获取业务组绑定的视图、标签和索引列表
  const getFilterList = (key: string) => {
    setTabloading(true);
    getBusinessFilter(teamId, { cmd_type: key }).then((res) => {
      // 时序指标
      if (activeKey === 'prometheus') {
        const list = res.list.length
          ? res.list.map((item, index) => ({ ...item, virtual_id: index + 1 }))
          : defaultData[activeKey];
        setSystemCmd(res.system_cmd);
        setSourceData({ ...sourceData, [activeKey]: list });
      } else {
        const list = res.length
          ? res.map((item, index) => ({ ...item, virtual_id: index + 1 }))
          : defaultData[activeKey];
        setSourceData({ ...sourceData, [activeKey]: list });
      }
      setTabloading(false);
    });
  };

  const getHostTableData = ({ current, pageSize }): Promise<any> => {
    const params = {
      query: hostQueryContent,
      bgid: teamId,
      p: current,
      limit: pageSize,
    };
    if (isShowDetail === true) {
      return getMonObjectList(params).then((res) => {
        return {
          total: res.dat.total,
          list: res.dat.list,
        };
      });
    }
    return Promise.resolve();
  };

  const { tableProps } = useAntdTable(getHostTableData, {
    defaultPageSize: 50,
    refreshDeps: [hostQueryContent, teamId, refreshFlag, isShowDetail],
  });

  const handleSubmit = (data) => {
    const params = { ...data };
    delete params.virtual_id;
    if (data.id) {
      // 修改
      updateBusinessFilter(teamId, params.id, params).then(() => {
        const result = sourceData[activeKey].map((item) => {
          if (item.virtual_id === data.virtual_id) {
            return { ...data, virtual_id: data.virtual_id };
          }
          return item;
        });
        setSourceData({ ...sourceData, [activeKey]: result });
        message.success(t('common:success.modify'));
      });
    } else {
      // 新增
      addBusinessFilter(teamId, params).then((res) => {
        const result = sourceData[activeKey].map((item) => {
          if (item.virtual_id === data.virtual_id) {
            return { ...res, virtual_id: data.virtual_id };
          }
          return item;
        });
        setSourceData({ ...sourceData, [activeKey]: result });
        message.success(t('common:success.create'));
      });
    }
  };

  const handleChange = (optionType, type, virtual_id, id) => {
    if (optionType === 'create') {
      let data = { ...defaultData[activeKey][0], virtual_id: sourceData[activeKey].slice(-1)[0].virtual_id + 1 };
      setSourceData({ ...sourceData, [activeKey]: [...sourceData[activeKey], data] });
    }
    if (optionType === 'delete') {
      const filterData = sourceData[activeKey].filter((item) => item.virtual_id !== virtual_id);
      const result = filterData.length ? filterData : defaultData[activeKey];
      if (id) {
        deleteBusinessFilter(teamId, id).then((res) => {
          setSourceData({ ...sourceData, [activeKey]: result });
          message.success(t('common:success.delete'));
        });
      } else {
        setSourceData({ ...sourceData, [activeKey]: result });
      }
    }
  };

  // 获取 ES 索引列表
  const getIndexList = () => {
    const requests = {};
    groupedDatasourceList.elasticsearch?.forEach((item) => {
      requests[item.id] = getDataCategory({
        busi_group_id: teamId,
        datasource_id: item.id,
        index: '*',
        admin: true,
      }).catch(() => Promise.resolve({}));
    });

    Promise.all(Object.values(requests))
      .then((res: any) => {
        let data = {};
        res.forEach((item, index) => {
          let IndexValue: any = [];
          if (!_.isEmpty(item)) {
            ['aliases', 'data_streams', 'indices'].forEach((key) => {
              IndexValue = [
                ...IndexValue,
                ...item[key].filter((indexItem) => !indexItem.data_stream).map((element) => ({ value: element.name })),
              ];
            });
          }

          data[Object.keys(requests)[index]] = IndexValue;
        });
        setIndexOptions(data);
      })
      .catch((err) => {});
  };

  useEffect(() => {
    if (
      activeKey === 'elasticsearch' &&
      groupedDatasourceList.elasticsearch?.length > 0 &&
      _.isEmpty(indexOptions) &&
      profile?.admin
    ) {
      getIndexList();
    }
  }, [activeKey, groupedDatasourceList]);

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
  };

  const onSelect = (newExpandedKeys: number[], info) => {
    if (info.node.key > 0 && newExpandedKeys.length) {
      setTeamId(newExpandedKeys[0]);
      setIsShowDetail(info.node.is_show_detail);
      newExpandedKeys[0] && info.node.is_show_detail && getTeamInfoDetail(newExpandedKeys[0]);
    }
  };

  useEffect(() => {
    if (initType === 'elasticsearch' && initBoot?.ds_elasticsearch) {
      setActiveKey('elasticsearch');
    }
  }, [initType, initBoot]);

  return (
    <PageLayout title={t('business.title')} icon={<InboxOutlined />}>
      <div className='user-manage-content'>
        <div style={{ display: 'flex', height: '100%' }}>
          <div className='left-tree-area'>
            <div className='sub-title'>
              {t('business.list')}
              {profile?.admin && (
                <Button
                  style={{
                    height: '30px',
                  }}
                  size='small'
                  type='link'
                  onClick={() => {
                    handleClick(ActionType.CreateBusiness);
                  }}
                >
                  {t('common:btn.add')}
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', margin: '5px 0px 12px' }}>
              <Input
                prefix={<SearchOutlined />}
                placeholder={t('business.search_placeholder')}
                onPressEnter={(e: any) => {
                  getTeamList(e.target.value);
                }}
                onBlur={(e: any) => {
                  getTeamList(e.target.value);
                }}
              />
            </div>
            <Tree
              onExpand={onExpand}
              expandedKeys={expandedKeys}
              selectedKeys={[teamId]}
              onSelect={onSelect}
              treeData={teamList}
            />
          </div>
          {!isShowDetail ? (
            isShowDetail === false && (
              <Result style={{ margin: 'auto' }} status='warning' title='没有查看该业务组的权限' />
            )
          ) : teamList.length ? (
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
                  {teamInfo?.perm === 'rw' && (
                    <EditOutlined
                      style={{
                        marginLeft: '8px',
                        fontSize: '14px',
                      }}
                      onClick={() => handleClick(ActionType.EditBusiness)}
                    ></EditOutlined>
                  )}
                  {profile?.admin && (
                    <DeleteOutlined
                      style={{
                        marginLeft: '8px',
                        fontSize: '14px',
                      }}
                      onClick={() => {
                        confirm({
                          title: t('business.delete_group_confirm_tip'),
                          okText: t('common:btn.ok'),
                          cancelText: t('common:btn.cancel'),
                          onOk: () => {
                            deleteBusinessTeam(teamId).then((_) => {
                              message.success(t('common:success.delete'));
                              handleClose('delete');
                              setTeamId(teamList[0].id !== teamId ? teamList[0].id : teamList[1]?.id);
                            });
                          },
                          onCancel: () => {},
                        });
                      }}
                    />
                  )}
                </Col>
                <Col
                  style={{
                    marginTop: '8px',
                    color: '#666',
                  }}
                >
                  <Space>
                    <span>
                      {t('common:table.note')}：{t('business.note_content')}
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
                <Tabs.TabPane tab={t('business.team_name')} key='team'>
                  <Spin spinning={tabLoading}>
                    <Typography.Paragraph>授权的团队列表及团队对当前业务组的功能权限。</Typography.Paragraph>
                    <Row justify='space-between'>
                      <Col>
                        <Input
                          prefix={<SearchOutlined />}
                          value={searchMemberValue}
                          className='searchInput'
                          onChange={(e) => setSearchMemberValue(e.target.value)}
                          placeholder={t('business.team_search_placeholder')}
                        />
                      </Col>
                      <Col>
                        {teamInfo?.perm === 'rw' && (
                          <Button
                            type='primary'
                            onClick={() => {
                              handleClick(ActionType.AddBusinessMember);
                            }}
                          >
                            {t('business.binding_team')}
                          </Button>
                        )}
                      </Col>
                    </Row>
                    <Table
                      size='small'
                      rowKey='id'
                      columns={teamMemberColumns}
                      dataSource={
                        memberList?.length > 0
                          ? memberList.filter(
                              (item) => item.user_group && item.user_group.name.indexOf(searchMemberValue) !== -1,
                            )
                          : []
                      }
                      pagination={{
                        total:
                          memberList?.length > 0
                            ? memberList.filter(
                                (item) => item.user_group && item.user_group.name.indexOf(searchMemberValue) !== -1,
                              ).length
                            : 0,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: (total) => t('common:table.total', { total }),
                        showSizeChanger: true,
                      }}
                      scroll={{ y: 'calc(100vh - 392px)' }}
                      loading={loading}
                    />
                  </Spin>
                </Tabs.TabPane>
                <Tabs.TabPane tab={t('business.hosts')} key='hosts'>
                  <Spin spinning={tabLoading}>
                    <Typography.Paragraph>当前业务组绑定的主机列表。</Typography.Paragraph>
                    <Row justify='space-between'>
                      <Col>
                        <Input
                          className='searchInput'
                          prefix={<SearchOutlined />}
                          placeholder={t('business.host_placeholder')}
                          value={searchHostValue}
                          onChange={(e) => setSearchHostValue(e.target.value)}
                          onPressEnter={() => {
                            setHostQueryContent(searchHostValue);
                          }}
                          onBlur={() => {
                            setHostQueryContent(searchHostValue);
                          }}
                        />
                      </Col>
                      <Col>
                        {teamInfo?.perm === 'rw' && (
                          <Button
                            type='primary'
                            onClick={() => {
                              handleClick(ActionType.AddHost);
                            }}
                          >
                            {t('business.add_host')}
                          </Button>
                        )}
                      </Col>
                    </Row>
                    <Table
                      size='small'
                      rowKey='id'
                      {...tableProps}
                      columns={hostColumns}
                      loading={loading}
                      pagination={{
                        ...tableProps.pagination,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: (total) => t('common:table.total', { total }),
                        showSizeChanger: true,
                      }}
                      scroll={{ y: 'calc(100vh - 392px)' }}
                    />
                  </Spin>
                </Tabs.TabPane>
                <Tabs.TabPane tab={t('business.data_view')} key='dataView'>
                  <Spin className='business-manage-box' spinning={tabLoading}>
                    <Typography.Paragraph>
                      日志的视图列表，每个视图是一系列ES索引的集合，类似Kibana的数据视图。
                    </Typography.Paragraph>
                    <div className='business-manage-box'>
                      {sourceData.dataView.map((item) => (
                        <SourceCard
                          key={item.virtual_id}
                          data={item}
                          teamId={teamId}
                          type='dataView'
                          datasourceList={esDataSourceList}
                          onSubmit={handleSubmit}
                          onChange={handleChange}
                          disabled={teamInfo?.perm === 'ro'}
                        />
                      ))}
                    </div>
                  </Spin>
                </Tabs.TabPane>
                <Tabs.TabPane tab={t('business.application_service')} key='applicationService'>
                  <Spin className='business-manage-box' spinning={tabLoading}>
                    <Typography.Paragraph>
                      按应用粒度授予当前业务组可访问的监控数据。仅管理员可配置。
                    </Typography.Paragraph>
                    {profile?.admin && (
                      <Typography.Text type='danger'>
                        注：应用服务配置更新后，时序指标会自动更新，但ES索引需要手工同步才能生效。
                      </Typography.Text>
                    )}
                    <div className='business-manage-box'>
                      <ApplicationServiceForm
                        initialValue={serviceNameList}
                        teamId={teamId}
                        disabled={!profile?.admin}
                      />
                    </div>
                  </Spin>
                </Tabs.TabPane>
                {profile?.admin && (
                  <Tabs.TabPane tab={t('business.metrics')} key='prometheus'>
                    <Typography.Paragraph>当前业务组可访问的指标数据权限。仅管理员可配置。</Typography.Paragraph>
                    <Spin spinning={tabLoading}>
                      <div className='business-manage-box'>
                        {sourceData.prometheus.map((item) => (
                          <SourceCard
                            key={item.virtual_id}
                            data={item}
                            teamId={teamId}
                            type='prometheus'
                            datasourceList={groupedDatasourceList.prometheus || []}
                            onSubmit={handleSubmit}
                            onChange={handleChange}
                            disabled={teamInfo?.perm === 'ro'}
                            systemCmd={systemCmd}
                          />
                        ))}
                      </div>
                    </Spin>
                  </Tabs.TabPane>
                )}
                {profile?.admin && (
                  <Tabs.TabPane tab={t('business.esSearch')} key='elasticsearch'>
                    <Spin spinning={tabLoading}>
                      <Typography.Paragraph>业务组可访问的ES数据权限。仅管理员可配置。</Typography.Paragraph>
                      <div className='business-manage-box init-boot'>
                        {sourceData.elasticsearch.map((item) => (
                          <SourceCard
                            key={item.virtual_id}
                            data={item}
                            teamId={teamId}
                            type='elasticsearch'
                            datasourceList={groupedDatasourceList.elasticsearch || []}
                            indexOptions={indexOptions}
                            serviceNameIndex={serviceNameIndex}
                            onSubmit={handleSubmit}
                            onChange={handleChange}
                            disabled={teamInfo?.perm === 'ro'}
                          />
                        ))}
                      </div>
                    </Spin>
                  </Tabs.TabPane>
                )}
                <Tabs.TabPane tab={t('business.default_alert_notify')} key='default_alert_notify'>
                  <Spin spinning={tabLoading}>
                    <Typography.Paragraph>{t('business.default_alert_notify_tip')}</Typography.Paragraph>
                    <div className='business-manage-box'>
                      <DefaultAlertNotify
                        initialValue={teamInfo?.alert_notify}
                        teamId={teamId}
                        user_groups={teamInfo?.user_groups}
                        onOk={() => getTeamInfoDetail(teamId)}
                        disabled={teamInfo?.perm === 'ro'}
                      />
                    </div>
                  </Spin>
                </Tabs.TabPane>

                {teamInfo?.extra?.api && (
                  <Tabs.TabPane tab={t('business.api')} key='api'>
                  <Spin spinning={tabLoading}>
                    <Typography.Paragraph>请求API相关配置。使用 Basic authentication 认证机制</Typography.Paragraph>
                    <Row justify='space-between'>
                      <Col>
                        <Input
                          prefix={<SearchOutlined />}
                          value={searchAPIValue}
                          className='searchInput'
                          onChange={(e) => setSearchAPIValue(e.target.value)}
                          placeholder={t('common:profile.username')}
                        />
                      </Col>
                      <Col>
                        {teamInfo?.perm === 'rw' && (
                          <Button
                            type='primary'
                            onClick={() => {
                              handleClick(ActionType.AddAPI);
                            }}
                          >
                            {t('business.api_create')}
                          </Button>
                        )}
                      </Col>
                    </Row>
                    <Table
                      size='small'
                      rowKey='id'
                      columns={apiColumns}
                      dataSource={
                        apiList?.length > 0 ? apiList.filter((item) => item.user.indexOf(searchAPIValue) !== -1) : []
                      }
                      pagination={{
                        total:
                          apiList?.length > 0
                            ? apiList.filter((item) => item.user.indexOf(searchAPIValue) !== -1).length
                            : 0,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: (total) => t('common:table.total', { total }),
                        showSizeChanger: true,
                      }}
                      scroll={{ y: 'calc(100vh - 392px)' }}
                      loading={loading}
                    />
                  </Spin>
                </Tabs.TabPane>
                )}

                
              </Tabs>
            </div>
          ) : (
            <div className='blank-busi-holder'>
              <p style={{ textAlign: 'left', fontWeight: 'bold' }}>
                <InfoCircleOutlined style={{ color: '#1473ff' }} /> Tips
              </p>
              <p>
                {t('business.empty')}&nbsp;
                <a onClick={() => handleClick(ActionType.CreateBusiness)}>{t('business.create')}</a>
              </p>
            </div>
          )}
        </div>
      </div>
      <UserInfoModal
        visible={visible}
        action={action as ActionType}
        userType={'business'}
        onClose={handleClose}
        teamId={teamId}
        apiId={apiId}
        onSearch={(val) => {
          setTeamId(val);
        }}
      />
    </PageLayout>
  );
};

export default Resource;
