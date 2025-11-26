import React, { useState, useEffect, useRef, useContext } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import moment from 'moment';
import { priorityColor } from '@/utils/constant';
import { localeCompare } from '@/utils';
import { List, Input, Button, Table, Space, Tag, Modal, message, Dropdown, Menu } from 'antd';
import {
  SafetyCertificateOutlined,
  SearchOutlined,
  StarOutlined,
  StarFilled,
  EllipsisOutlined,
  DeleteOutlined,
  EditOutlined,
  DownOutlined,
} from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import { CommonStateContext } from '@/App';
import usePagination from '@/components/usePagination';
import { RuleCateType, RuleType } from './types';
import { getRuleCates, postBuiltinCateFavorite, deleteBuiltinCateFavorite, deleteBuiltStrategy } from './services';
import { createBuiltinCate, updateBuiltinCate, deleteBuiltinCate } from '@/services/common';
import BatchImport from '@/components/Import';
import BatchTreeExport from '@/components/BatchTreeExport';
import CateModal from '@/components/CateModal';
import Import from './Import';
import Detail from './Detail';
import Add from './Add';
import './locale';
import './style.less';

export { Detail, Add };

function processRules(cate_code: string, alertRules: RuleType[]) {
  return alertRules.map((item) => ({ ...item, __cate__: cate_code }));
}

export default function AlertRulesBuiltin() {
  const { t } = useTranslation('alertRulesBuiltin');
  const history = useHistory();
  const { cate } = useParams<{ cate: string }>();
  const { profile, curBusiId, curBusiGroup, groupedDatasourceList } = useContext(CommonStateContext);
  const pagination = usePagination({ PAGESIZE_KEY: 'alert-rules-builtin-pagesize' });
  // 原始数据
  const [data, setData] = useState<RuleCateType[]>([]);
  // 过滤数据
  const [filterCate, setFilterCate] = useState<RuleCateType[]>([]);
  const [visibleCate, setVisibleCate] = useState(false);
  const [editCateInfo, setEditCateInfo] = useState<any>();
  const [active, setActive] = useState<RuleCateType>();
  const [cateSearch, setCateSearch] = useState<string>('');
  const [ruleSearch, setRuleSearch] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const selectedRows = useRef<RuleType[]>([]);
  const curRules = active ? processRules(active.code, active.alert_rules ?? []) : [];
  const filteredRules = _.filter(curRules, (item) => {
    if (!item) return false;
    let isMatch = true;
    const search = _.trim(ruleSearch);
    if (search) {
      isMatch =
        _.includes(item.name.toLowerCase(), search.toLowerCase()) ||
        _.some(item.append_tags, (tag) => _.includes(tag.toLowerCase(), search.toLowerCase()));
    }
    return isMatch;
  });

  const fetchData = () => {
    getRuleCates().then((res) => {
      setData(res);
      let initCate;
      if (cate) {
        const cate_code = _.find(res, { code: cate }) as RuleCateType;
        if (cate_code) {
          initCate = cate_code;
        }
      } else {
        initCate = res[0];
      }
      setActive(initCate);
    });
  };

  const onSubmitCate = (values) => {
    if (values.id) {
      updateBuiltinCate(editCateInfo!.code, { ...values, type: 'alerts' }).then((res) => {
        fetchData();
        setVisibleCate(false);
        setEditCateInfo(undefined);
        message.success(t('common:success.modify'));
      });
    } else {
      createBuiltinCate({ ...values, type: 'alerts' }).then((res) => {
        fetchData();
        setVisibleCate(false);
        setEditCateInfo(undefined);
        message.success(t('common:success.create'));
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSelectedRowKeys([]);
    selectedRows.current = [];
  }, [active]);

  useEffect(() => {
    const filteredCates = _.orderBy(
      _.filter(data, (item) => {
        return _.upperCase(item.name).indexOf(_.upperCase(cateSearch)) > -1;
      }),
      ['favorite', 'name'],
      ['desc', 'asc'],
    );
    setFilterCate(filteredCates);
  }, [cateSearch, data]);

  return (
    <PageLayout title={t('title')} icon={<SafetyCertificateOutlined />}>
      <div className='user-manage-content builtin-container'>
        <div style={{ display: 'flex', height: '100%' }}>
          <div className='left-tree-area'>
            <div className='sub-title'>
              {t('cate')}
              {profile.admin && (
                <Button type='link' onClick={() => setVisibleCate(true)}>
                  {t('common:btn.add')}
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', margin: '5px 0px 12px' }}>
              <Input
                prefix={<SearchOutlined />}
                value={cateSearch}
                onChange={(e) => {
                  setCateSearch(e.target.value);
                }}
                placeholder={t('common:search_placeholder')}
                allowClear
              />
            </div>

            <List
              style={{
                marginBottom: '12px',
                flex: 1,
                overflow: 'auto',
              }}
              dataSource={filterCate}
              size='small'
              renderItem={(item: any, idx) => (
                <List.Item
                  key={item.name}
                  className={classNames('cate-list-item', {
                    'is-active': active?.code === item.code,
                    'is-last-favorite': item.favorite && !filterCate[idx + 1]?.favorite,
                  })}
                  onClick={() => {
                    setActive(item);
                    history.replace({
                      pathname: `/alert-rules-built-in/${item.code}`,
                    });
                  }}
                  extra={
                    profile.admin ? (
                      <span
                        className='cate-list-item-extra'
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Dropdown
                          overlay={
                            <Menu>
                              <Menu.Item key='start'>
                                {
                                  <div
                                    onClick={() => {
                                      if (item.favorite) {
                                        deleteBuiltinCateFavorite(item.code).then(() => {
                                          fetchData();
                                        });
                                      } else {
                                        postBuiltinCateFavorite(item.code).then(() => {
                                          fetchData();
                                        });
                                      }
                                    }}
                                  >
                                    {item.favorite ? <StarFilled style={{ color: 'orange' }} /> : <StarOutlined />}
                                  </div>
                                }
                              </Menu.Item>
                              <Menu.Item key='edit'>
                                <EditOutlined
                                  onClick={() => {
                                    setEditCateInfo(item);
                                    setVisibleCate(true);
                                  }}
                                />
                              </Menu.Item>
                              <Menu.Item key='delete'>
                                <DeleteOutlined
                                  onClick={() => {
                                    deleteBuiltinCate(item.code).then((res) => {
                                      fetchData();
                                      message.success(t('common:success.delete'));
                                    });
                                  }}
                                />
                              </Menu.Item>
                            </Menu>
                          }
                        >
                          <EllipsisOutlined />
                        </Dropdown>
                      </span>
                    ) : (
                      <span
                        className='cate-list-item-extra'
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.favorite) {
                            deleteBuiltinCateFavorite(item.code).then(() => {
                              fetchData();
                            });
                          } else {
                            postBuiltinCateFavorite(item.code).then(() => {
                              fetchData();
                            });
                          }
                        }}
                      >
                        {item.favorite ? <StarFilled style={{ color: 'orange' }} /> : <StarOutlined />}
                      </span>
                    )
                  }
                >
                  <Space>
                    <img src={item.icon_base64} style={{ width: 24, height: 24 }} />
                    {item.name}
                  </Space>
                </List.Item>
              )}
            />
          </div>
          <div className='resource-table-content'>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <Input
                  prefix={<SearchOutlined />}
                  value={ruleSearch}
                  onChange={(e) => {
                    setRuleSearch(e.target.value);
                  }}
                  placeholder={t('common:search_placeholder')}
                  style={{ width: 300 }}
                  allowClear
                />
              </Space>
              <Space>
                {profile.admin && active && (
                  <Button
                    type='primary'
                    onClick={() => {
                      history.push({
                        pathname: `/alert-rules-built-in/add/${active?.code}`,
                      });
                    }}
                    className='strategy-table-search-right-create'
                  >
                    {t('common:btn.add')}
                  </Button>
                )}
                <Dropdown
                  trigger={['click']}
                  overlay={
                    <Menu>
                      {profile.admin && (
                        <Menu.Item
                          key='batch_import'
                          onClick={() => {
                            BatchImport({
                              bgid: curBusiId,
                              type: 'builtin_alerts',
                              refreshList: fetchData,
                            });
                          }}
                        >
                          {t('common:btn.batch_import')}
                        </Menu.Item>
                      )}
                      <Menu.Item
                        key='batch_export'
                        onClick={() => {
                          const newData = data.map((item) => ({
                            ...item,
                            alert_rules: item.alert_rules?.map((ele) => ({ ...ele, disabled: 0 })),
                          }));
                          BatchTreeExport({
                            type: 'builtin_alerts',
                            filename: t('title'),
                            bgid: curBusiId,
                            treeData: [{ name: t('title'), code: 'builtin_alerts', alert_rules: newData }],
                            fieldNames: { title: 'name', key: 'code', children: 'alert_rules' },
                          });
                        }}
                      >
                        {t('common:btn.batch_export')}
                      </Menu.Item>
                      {curBusiGroup.perm === 'rw' && (
                        <Menu.Item
                          key='batch_clone'
                          disabled={Boolean(!selectedRowKeys.length)}
                          onClick={() => {
                            Import({
                              data: JSON.stringify(selectedRows.current, null, 4),
                              curBusiId,
                              curBusiGroup,
                              groupedDatasourceList,
                            });
                          }}
                        >
                          {t('common:btn.batch_clone')}
                        </Menu.Item>
                      )}
                      {profile.admin && (
                        <Menu.Item
                          key='batch_delete'
                          disabled={Boolean(!selectedRowKeys.length)}
                          onClick={() => {
                            deleteBuiltStrategy({ codes: selectedRows.current.map((item) => item.code) }).then(
                              (res) => {
                                message.success(t('common:success.delete'));
                                fetchData();
                              },
                            );
                          }}
                        >
                          {t('common:btn.batch_delete')}
                        </Menu.Item>
                      )}
                    </Menu>
                  }
                >
                  <Button>
                    {t('common:btn.batch_operations')} <DownOutlined />
                  </Button>
                </Dropdown>
              </Space>
            </div>
            <Table
              size='small'
              rowKey={(record) => `${record.__cate__}-${record.name}`}
              dataSource={filteredRules}
              rowSelection={{
                selectedRowKeys,
                onChange: (selectedRowKeys: string[], rows: RuleType[]) => {
                  setSelectedRowKeys(selectedRowKeys);
                  selectedRows.current = rows;
                },
              }}
              columns={[
                {
                  title: t('name'),
                  dataIndex: 'name',
                  key: 'name',
                  render: (val, record) => (
                    <a
                      onClick={() => {
                        curBusiId
                          ? history.push(
                              `/alert-rules-built-in/${active?.code || record.__cate__}/detail/${record.code}`,
                            )
                          : message.warning(t('required_group_info'));
                      }}
                    >
                      {val}
                    </a>
                  ),
                },
                {
                  title: t('severity'),
                  dataIndex: 'severities',
                  width: 140,
                  render: (data) => {
                    return _.map(data, (severity, index) => {
                      return (
                        <Tag key={index} color={priorityColor[severity - 1]}>
                          S{severity}
                        </Tag>
                      );
                    });
                  },
                },
                {
                  title: t('task_type'),
                  dataIndex: 'prod',
                  width: 90,
                  sorter: (a, b) => localeCompare(a.prod, b.prod),
                },
                {
                  title: t('common:relation_input'),
                  dataIndex: 'relation_input',
                  key: 'relation_input',
                  render: (val) => {
                    return (
                      <Space size='middle'>
                        {val?.map((tag, idx) => (
                          <Tag key={idx} color='blue'>
                            {tag.replace('metrics:', '')}
                          </Tag>
                        ))}
                      </Space>
                    );
                  },
                },
                {
                  title: t('append_tags'),
                  dataIndex: 'append_tags',
                  key: 'append_tags',
                  render: (val) => {
                    return (
                      <Space size='middle'>
                        {_.map(val, (tag, idx) => {
                          return (
                            <Tag
                              key={idx}
                              color='blue'
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                const queryItem = _.compact(_.split(ruleSearch, ' '));
                                if (queryItem.includes(tag)) return;
                                setRuleSearch((searchVal) => {
                                  if (searchVal) {
                                    return searchVal + ' ' + tag;
                                  }
                                  return tag;
                                });
                              }}
                            >
                              {tag}
                            </Tag>
                          );
                        })}
                      </Space>
                    );
                  },
                },
                {
                  title: t('common:table.update_by'),
                  dataIndex: 'update_by',
                  width: 150,
                },
                {
                  title: t('common:table.update_at'),
                  dataIndex: 'update_at',
                  width: 150,
                  render: (val) => {
                    return moment.unix(Number(val)).format('YYYY-MM-DD HH:mm:ss');
                  },
                },
                {
                  title: t('common:table.operations'),
                  width: 80,
                  render: (record) => {
                    return (
                      <Space>
                        {curBusiGroup.perm === 'rw' && (
                          <a
                            onClick={() => {
                              Import({
                                data: JSON.stringify(record, null, 4),
                                curBusiId,
                                curBusiGroup,
                                groupedDatasourceList,
                              });
                            }}
                          >
                            {t('common:btn.clone')}
                          </a>
                        )}
                        {profile.admin && (
                          <a
                            style={{ color: 'red' }}
                            onClick={() => {
                              Modal.confirm({
                                title: t('common:confirm.delete'),
                                okText: t('common:btn.ok'),
                                cancelText: t('common:btn.cancel'),
                                onOk: () => {
                                  const newData = filteredRules.filter((item) => item.name !== record.name);
                                  deleteBuiltStrategy({ codes: [record.code] }).then((res) => {
                                    message.success(t('common:success.delete'));
                                    fetchData();
                                    setActive({
                                      ...active!,
                                      alert_rules: newData,
                                    });
                                  });
                                },

                                onCancel() {},
                              });
                            }}
                          >
                            {t('common:btn.delete')}
                          </a>
                        )}
                      </Space>
                    );
                  },
                },
              ]}
              pagination={pagination}
            />
          </div>
        </div>
      </div>
      <CateModal
        visible={visibleCate}
        initialValue={editCateInfo}
        onOk={onSubmitCate}
        onCancel={() => {
          setVisibleCate(false);
          setEditCateInfo(undefined);
        }}
      />
    </PageLayout>
  );
}
