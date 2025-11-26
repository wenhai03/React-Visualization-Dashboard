import React, { useState, useEffect, useRef, useContext } from 'react';
import _ from 'lodash';
import { useHistory, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import moment from 'moment';
import { List, Input, Button, Table, Space, Tag, message, Dropdown, Menu } from 'antd';
import {
  SafetyCertificateOutlined,
  SearchOutlined,
  StarFilled,
  StarOutlined,
  EllipsisOutlined,
  DeleteOutlined,
  EditOutlined,
  DownOutlined,
} from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import Export from '@/components/Export';
import usePagination from '@/components/usePagination';
import { CommonStateContext } from '@/App';
import { BoardCateType, BoardType } from './types';
import {
  getDashboardCates,
  getDashboardDetail,
  postBuiltinCateFavorite,
  deleteBuiltinCateFavorite,
  updateDashboardInfo,
  updateDashboardDetail,
  createDashboardInfo,
  deleteDashboardInfo,
} from './services';
import BatchImport from '@/components/Import';
import BatchTreeExport from '@/components/BatchTreeExport';
import { createBuiltinCate, updateBuiltinCate, deleteBuiltinCate } from '@/services/common';
import DashboardInfo from './components/DashboardInfo';
import ImportModal from './components/ImportModal';
import CateModal from '@/components/CateModal';
import Import from './Import';
import ImportGrafana from '@/components/ImportGrafana';
import Detail from './Detail';
import './locale';
import './style.less';
export { Detail };

export default function DashboardBuiltin() {
  const { t } = useTranslation('dashboardBuiltin');
  const history = useHistory();
  const { cate } = useParams<{ cate: string }>();
  const { profile, curBusiId, curBusiGroup } = useContext(CommonStateContext);
  // 原始数据
  const [data, setData] = useState<BoardCateType[]>([]);
  // 过滤数据
  const [filterCate, setFilterCate] = useState<BoardCateType[]>([]);
  const [active, setActive] = useState<BoardCateType>();
  const [cateSearch, setCateSearch] = useState<string>('');
  const [boardSearch, setBoardSearch] = useState<string>('');
  const [visibleInfo, setVisibleInfo] = useState(false);
  const [visibleImport, setVisibleImport] = useState(false);
  const [visibleCate, setVisibleCate] = useState(false);
  const [editCateInfo, setEditCateInfo] = useState<any>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [singleSelect, setSingleSelect] = useState<BoardType & { configs: string }>();
  const pagination = usePagination({ PAGESIZE_KEY: 'dashboard-builtin-pagesize' });
  const selectedRows = useRef<BoardType[]>([]);
  const datasource = active ? active.boards : [];
  const filteredDatasource = _.filter(datasource, (item) => {
    const search = _.trim(boardSearch);
    if (search) {
      return (
        _.includes(item.name.toLowerCase(), search.toLowerCase()) ||
        item.tags.toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  const fetchData = () => {
    getDashboardCates().then((res) => {
      setData(res);
      if (cate) {
        const cate_code = _.find(res, { code: cate }) as BoardCateType;
        if (cate_code) {
          setActive(cate_code);
        }
      } else {
        res.length && setActive(res[0]);
      }
    });
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

  const handleInfoSubmit = (values) => {
    if (singleSelect) {
      // 修改
      let data = {
        cate_code: singleSelect!.cate_code,
        tags: _.join(values.tags, ' '),
        name: values.name,
        id: singleSelect.id,
      } as BoardType;
      updateDashboardInfo(singleSelect!.cate_code!, singleSelect!.code!, data).then((res) => {
        message.success(t('common:success.modify'));
        setVisibleInfo(false);
        setSingleSelect(undefined);
        fetchData();
      });
    } else {
      // 新增
      let data = {
        tags: _.join(values.tags, ' '),
        name: values.name,
        configs: { var: [], panels: [], version: '3.0.0' },
      } as BoardType;
      createDashboardInfo(active!.code, data).then((res) => {
        message.success(t('common:success.create'));
        setVisibleInfo(false);
        setSingleSelect(undefined);
        fetchData();
      });
    }
  };

  // 导入仪表盘
  const handleImportSubmit = (values) => {
    const dashboard = JSON.parse(values.import);
    const configs = JSON.stringify(dashboard.configs);
    updateDashboardDetail(singleSelect?.cate_code!, singleSelect?.code!, {
      ...singleSelect,
      configs: configs,
    } as BoardType & { configs: string }).then((res) => {
      message.success(t('common:success.import'));
      setVisibleImport(false);
      setSingleSelect(undefined);
      fetchData();
    });
  };

  const onSubmitCate = (values) => {
    if (values.id) {
      updateBuiltinCate(editCateInfo!.code, { ...values, type: 'boards' }).then((res) => {
        fetchData();
        setVisibleCate(false);
        setEditCateInfo(undefined);
        message.success(t('common:success.modify'));
      });
    } else {
      createBuiltinCate({ ...values, type: 'boards' }).then((res) => {
        fetchData();
        setVisibleCate(false);
        setEditCateInfo(undefined);
        message.success(t('common:success.create'));
      });
    }
  };

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
                      pathname: `/dashboards-built-in/${item.code}`,
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
              <Input
                prefix={<SearchOutlined />}
                value={boardSearch}
                onChange={(e) => {
                  setBoardSearch(e.target.value);
                }}
                style={{ width: 300 }}
                allowClear
              />
              <Space>
                {profile.admin && (
                  <Button type='primary' onClick={() => setVisibleInfo(true)}>
                    {t('common:btn.add')}
                  </Button>
                )}
                <Dropdown
                  trigger={['click']}
                  overlay={
                    <Menu>
                      {profile.admin && (
                        <>
                          <Menu.Item
                            key='import_grafana'
                            onClick={() => {
                              ImportGrafana({
                                id: curBusiId,
                                cateInfo: active,
                                type: 'dashboard-builtin',
                                refreshList: fetchData,
                              });
                            }}
                          >
                            {t('common:btn.batch_import_grafana')}
                          </Menu.Item>
                          <Menu.Item
                            key='batch_import'
                            onClick={() => {
                              BatchImport({
                                bgid: curBusiId,
                                type: 'builtin_boards',
                                refreshList: fetchData,
                              });
                            }}
                          >
                            {t('common:btn.batch_import')}
                          </Menu.Item>
                        </>
                      )}
                      <Menu.Item
                        key='batch_export'
                        onClick={() => {
                          BatchTreeExport({
                            type: 'builtin_boards',
                            filename: t('title'),
                            bgid: curBusiId,
                            treeData: [
                              {
                                name: t('title'),
                                code: 'builtin_boards',
                                boards: data,
                              },
                            ],
                            fieldNames: { title: 'name', key: 'code', children: 'boards' },
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
                            const requests = _.map(selectedRows.current, (item: any) => {
                              return getDashboardDetail(item.cate_code, item.code);
                            });
                            Promise.all(requests).then((res) => {
                              Import({
                                data: JSON.stringify(res, null, 4),
                                curBusiId,
                                curBusiGroup,
                              });
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
                            deleteDashboardInfo({
                              codes: selectedRows.current.map((item) => item.code as string),
                            }).then((res) => {
                              message.success(t('common:success.delete'));
                              fetchData();
                            });
                          }}
                        >
                          {t('common:btn.batch_delete')}
                        </Menu.Item>
                      )}
                    </Menu>
                  }
                >
                  <Button>
                    {t('common:btn.more')} <DownOutlined />
                  </Button>
                </Dropdown>
              </Space>
            </div>
            <Table
              size='small'
              rowKey='name'
              pagination={pagination}
              dataSource={filteredDatasource}
              rowSelection={{
                selectedRowKeys,
                onChange: (selectedRowKeys: string[], rows: BoardType[]) => {
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
                          ? history.push(`/dashboards-built-in/${record.cate_code}/detail/${record.code}`)
                          : message.warning(t('required_group_info'));
                      }}
                    >
                      {val}
                    </a>
                  ),
                },
                {
                  title: t('tags'),
                  dataIndex: 'tags',
                  key: 'tags',
                  render: (val) => {
                    const tags = _.compact(_.split(val, ' '));
                    return (
                      <Space size='middle'>
                        {_.map(tags, (tag, idx) => {
                          return (
                            <Tag
                              key={idx}
                              color='blue'
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                const queryItem = _.compact(_.split(boardSearch, ' '));
                                if (queryItem.includes(tag)) return;
                                setBoardSearch((searchVal) => {
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
                  width: 50,
                  render: (record) => {
                    return (
                      <Dropdown
                        trigger={['click']}
                        overlay={
                          <Menu>
                            {profile.admin && (
                              <Menu.Item
                                onClick={() => {
                                  setSingleSelect(record);
                                  setVisibleInfo(true);
                                }}
                                key='modify'
                              >
                                {t('common:btn.modify')}
                              </Menu.Item>
                            )}
                            {curBusiGroup.perm === 'rw' && (
                              <Menu.Item
                                onClick={() => {
                                  getDashboardDetail(record.cate_code, record.code).then((res) => {
                                    Import({
                                      data: JSON.stringify(res, null, 4),
                                      curBusiId,
                                      curBusiGroup,
                                    });
                                  });
                                }}
                                key='clone'
                              >
                                {t('common:btn.clone')}
                              </Menu.Item>
                            )}
                            <Menu.Item
                              onClick={() => {
                                getDashboardDetail(record.cate_code, record.code).then((res) => {
                                  Export({
                                    filename: 'Download',
                                    data: JSON.stringify(res, null, 4),
                                  });
                                });
                              }}
                              key='export'
                            >
                              {t('common:btn.export')}
                            </Menu.Item>
                            {profile.admin && (
                              <>
                                <Menu.Item
                                  key='import'
                                  onClick={() => {
                                    setSingleSelect(record);
                                    setVisibleImport(true);
                                  }}
                                >
                                  {t('common:btn.import')}
                                </Menu.Item>
                                <Menu.Item
                                  key='delete'
                                  onClick={() => {
                                    deleteDashboardInfo({ codes: [record.code] }).then((res) => {
                                      message.success(t('common:success.delete'));
                                      fetchData();
                                    });
                                  }}
                                >
                                  {t('common:btn.delete')}
                                </Menu.Item>
                              </>
                            )}
                          </Menu>
                        }
                      >
                        <EllipsisOutlined style={{ verticalAlign: 'middle', width: '14px', height: '14px' }} />
                      </Dropdown>
                    );
                  },
                },
              ]}
            />
          </div>
        </div>
      </div>
      <ImportModal
        visible={visibleImport}
        onCancel={() => {
          setVisibleImport(false);
          setSingleSelect(undefined);
        }}
        onOk={handleImportSubmit}
      />
      <DashboardInfo
        visible={visibleInfo}
        onCancel={() => {
          setVisibleInfo(false), setSingleSelect(undefined);
        }}
        initialValues={singleSelect}
        onOk={handleInfoSubmit}
      />
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
