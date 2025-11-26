/**
 * 仪表盘列表页面
 */
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Table, Tag, Modal, message, Dropdown, Menu } from 'antd';
import { FundViewOutlined, EllipsisOutlined } from '@ant-design/icons';
import moment from 'moment';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Dashboard as DashboardType } from '@/store/dashboardInterface';
import { getDashboards, cloneDashboard, removeDashboards, getDashboard } from '@/services/dashboardV2';
import PageLayout from '@/components/pageLayout';
import BlankBusinessPlaceholder from '@/components/BlankBusinessPlaceholder';
import { CommonStateContext } from '@/App';
import usePagination from '@/components/usePagination';
import Header from './Header';
import FormCpt from './Form';
import Export from '@/components/Export';
import Import from './Import';
import { localeCompare } from '@/utils';
import { exportDataStringify } from './utils';
import './style.less';

export default function DashboardList() {
  const { t } = useTranslation('dashboard');
  const { curBusiId: busiId, curBusiGroup } = useContext(CommonStateContext);
  const [list, setList] = useState<any[]>([]);
  const [selectRowKeys, setSelectRowKeys] = useState<number[]>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(_.uniqueId('refreshKey_'));
  const [searchVal, setsearchVal] = useState<string>('');
  const pagination = usePagination({ PAGESIZE_KEY: 'dashboard-pagesize' });

  useEffect(() => {
    if (busiId) {
      getDashboards(busiId).then((res) => {
        setList(res);
      });
    }
    setSelectRowKeys([]);
    setSelectedRows([]);
  }, [busiId, refreshKey]);

  const data = _.filter(list, (item) => {
    if (searchVal) {
      return (
        _.includes(item.name.toLowerCase(), searchVal.toLowerCase()) ||
        item.tags.toLowerCase().includes(searchVal.toLowerCase())
      );
    }
    return true;
  });

  return (
    <PageLayout title={t('title')} icon={<FundViewOutlined />}>
      <div>
        {busiId ? (
          <div className='dashboards-v2'>
            <Header
              busiId={busiId}
              selectRowKeys={selectRowKeys}
              selectedRows={selectedRows}
              refreshList={() => {
                setRefreshKey(_.uniqueId('refreshKey_'));
              }}
              perm={curBusiGroup.perm}
              searchVal={searchVal}
              onSearchChange={setsearchVal}
            />
            <Table
              dataSource={data}
              columns={[
                {
                  title: t('name'),
                  dataIndex: 'name',
                  className: 'name-column',
                  sorter: (a, b) => localeCompare(a.name, b.name),
                  render: (text: string, record: DashboardType) => {
                    return (
                      <Link
                        className='table-active-text'
                        to={{
                          pathname: `/dashboards/${record.ident || record.id}`,
                        }}
                      >
                        {text}
                      </Link>
                    );
                  },
                },
                {
                  title: t('tags'),
                  dataIndex: 'tags',
                  className: 'tags-column',
                  render: (text: string) => (
                    <>
                      {_.map(_.split(text, ' '), (tag, index) => {
                        return tag ? (
                          <Tag
                            color='blue'
                            key={index}
                            style={{
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              const queryItem = searchVal.length > 0 ? searchVal.split(' ') : [];
                              if (queryItem.includes(tag)) return;
                              setsearchVal((searchVal) => {
                                if (searchVal) {
                                  return searchVal + ' ' + tag;
                                }
                                return tag;
                              });
                            }}
                          >
                            {tag}
                          </Tag>
                        ) : null;
                      })}
                    </>
                  ),
                },
                {
                  title: t('common:table.update_at'),
                  width: 150,
                  dataIndex: 'update_at',
                  render: (text: number) => moment.unix(text).format('YYYY-MM-DD HH:mm:ss'),
                  sorter: (a, b) => localeCompare(a.update_at, b.update_at),
                },
                {
                  title: t('common:table.update_by'),
                  dataIndex: 'update_by',
                  width: 100,
                },
                // {
                //   title: t('public.name'),
                //   width: 120,
                //   dataIndex: 'public',
                //   render: (text: number, record: DashboardType) => {
                //     return (
                //       <div>
                //         <Switch
                //           checked={text === 1}
                //           onChange={() => {
                //             Modal.confirm({
                //               title: record.public ? t('public.1.confirm') : t('public.0.confirm'),
                //               onOk: async () => {
                //                 await updateDashboardPublic(record.id, { public: record.public ? 0 : 1 });
                //                 message.success(record.public ? t('public.1.success') : t('public.0.success'));
                //                 setRefreshKey(_.uniqueId('refreshKey_'));
                //               },
                //             });
                //           }}
                //         />
                //         {text === 1 && (
                //           <Link
                //             target='_blank'
                //             to={{
                //               pathname: `/dashboards/share/${record.id}`,
                //               search: queryString.stringify({
                //                 viewMode: 'fullscreen',
                //               }),
                //             }}
                //             style={{ marginLeft: 10 }}
                //           >
                //             {t('common:btn.view')}
                //           </Link>
                //         )}
                //       </div>
                //     );
                //   },
                // },
                {
                  title: t('common:table.operations'),
                  width: 50,
                  render: (text: string, record: DashboardType) => (
                    <Dropdown
                      trigger={['click']}
                      overlay={
                        <Menu>
                          {curBusiGroup.perm === 'rw' && (
                            <>
                              <Menu.Item
                                onClick={() => {
                                  FormCpt({
                                    mode: 'edit',
                                    initialValues: {
                                      ...record,
                                      tags: record.tags ? _.split(record.tags, ' ') : undefined,
                                    },
                                    busiId,
                                    refreshList: () => {
                                      setRefreshKey(_.uniqueId('refreshKey_'));
                                    },
                                  });
                                }}
                                key='modify'
                              >
                                {t('common:btn.modify')}
                              </Menu.Item>
                              <Menu.Item
                                onClick={async () => {
                                  Modal.confirm({
                                    title: t('common:confirm.clone'),
                                    okText: t('common:btn.ok'),
                                    cancelText: t('common:btn.cancel'),
                                    onOk: async () => {
                                      await cloneDashboard(busiId as number, record.id);
                                      message.success(t('common:success.clone'));
                                      setRefreshKey(_.uniqueId('refreshKey_'));
                                    },
                                    onCancel() {},
                                  });
                                }}
                                key='clone'
                              >
                                {t('common:btn.clone')}
                              </Menu.Item>
                              <Menu.Item
                                onClick={async () => {
                                  Import({
                                    id: record.id,
                                    refreshList: () => {
                                      setRefreshKey(_.uniqueId('refreshKey_'));
                                    },
                                  });
                                }}
                                key='import'
                              >
                                {t('common:btn.import')}
                              </Menu.Item>
                            </>
                          )}
                          <Menu.Item
                            onClick={async () => {
                              const exportData = await getDashboard(record.id);
                              Export({
                                filename: 'Download',
                                data: exportDataStringify(exportData),
                              });
                            }}
                            key='export'
                          >
                            {t('common:btn.export')}
                          </Menu.Item>
                          {curBusiGroup.perm === 'rw' && (
                            <Menu.Item
                              onClick={async () => {
                                Modal.confirm({
                                  title: t('common:confirm.delete'),
                                  okText: t('common:btn.ok'),
                                  cancelText: t('common:btn.cancel'),
                                  onOk: async () => {
                                    await removeDashboards([record.id]);
                                    message.success(t('common:success.delete'));
                                    setRefreshKey(_.uniqueId('refreshKey_'));
                                  },

                                  onCancel() {},
                                });
                              }}
                              key='delete'
                            >
                              {t('common:btn.delete')}
                            </Menu.Item>
                          )}
                        </Menu>
                      }
                    >
                      <EllipsisOutlined style={{ verticalAlign: 'middle', width: '14px', height: '14px' }} />
                    </Dropdown>
                  ),
                },
              ]}
              rowKey='id'
              size='small'
              rowSelection={{
                selectedRowKeys: selectRowKeys,
                onChange: (selectedRowKeys: number[], selectedRows: any[]) => {
                  setSelectRowKeys(selectedRowKeys);
                  setSelectedRows(selectedRows);
                },
              }}
              pagination={pagination}
            />
          </div>
        ) : (
          <BlankBusinessPlaceholder text='监控仪表盘' />
        )}
      </div>
    </PageLayout>
  );
}
