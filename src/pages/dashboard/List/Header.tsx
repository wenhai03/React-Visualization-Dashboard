import React from 'react';
import { Input, Button, Dropdown, Modal, Space, message, Menu } from 'antd';
import { SearchOutlined, DownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { removeDashboards } from '@/services/dashboardV2';
import RefreshIcon from '@/components/RefreshIcon';
import FormCpt from './Form';
import { exportBatchDataDetail } from '@/services/common';
import Export from '@/components/Export';
import Import from '@/components/Import';
import ImportGrafana from '@/components/ImportGrafana';

interface IProps {
  busiId: number;
  selectRowKeys: any[];
  selectedRows: any[];
  refreshList: () => void;
  searchVal: string;
  onSearchChange: (val) => void;
  perm: 'ro' | 'rw';
}

export default function Header(props: IProps) {
  const { t } = useTranslation('dashboard');
  const { busiId, selectRowKeys, refreshList, searchVal, onSearchChange, perm, selectedRows } = props;

  return (
    <>
      <div className='table-handle' style={{ padding: 0 }}>
        <Space>
          <RefreshIcon
            onClick={() => {
              refreshList();
            }}
          />
          <div className='table-handle-search'>
            <Input
              className={'searchInput'}
              value={searchVal}
              onChange={(e) => {
                onSearchChange(e.target.value);
              }}
              prefix={<SearchOutlined />}
              placeholder={t('search_placeholder')}
            />
          </div>
        </Space>
        <div className='table-handle-buttons'>
          {perm === 'rw' && (
            <Button
              type='primary'
              onClick={() => {
                FormCpt({
                  mode: 'create',
                  busiId,
                  refreshList,
                });
              }}
            >
              {t('common:btn.add')}
            </Button>
          )}
          <div className={'table-more-options'}>
            <Dropdown
              overlay={
                <Menu>
                  {perm === 'rw' && (
                    <>
                      <Menu.Item
                        key='import_grafana'
                        onClick={() => {
                          ImportGrafana({
                            id: busiId,
                            type: 'dashboard',
                            refreshList: refreshList,
                          });
                        }}
                      >
                        {t('common:btn.batch_import_grafana')}
                      </Menu.Item>
                      <Menu.Item
                        key='batch_import'
                        onClick={() => {
                          Import({
                            bgid: busiId,
                            type: 'boards',
                            refreshList: refreshList,
                          });
                        }}
                      >
                        {t('common:btn.batch_import')}
                      </Menu.Item>
                    </>
                  )}
                  <Menu.Item
                    key='batch_export'
                    disabled={Boolean(!selectedRows.length)}
                    onClick={() => {
                      exportBatchDataDetail('boards', busiId, selectedRows).then((res) => {
                        Export({
                          filename: t('title'),
                          data: JSON.stringify(res.dat, null, 4),
                        });
                      });
                    }}
                  >
                    {t('common:btn.batch_export')}
                  </Menu.Item>
                  {perm === 'rw' && (
                    <Menu.Item
                      key='delete'
                      disabled={Boolean(!selectedRows.length)}
                      onClick={() => {
                        Modal.confirm({
                          title: t('common:confirm.delete'),
                          okText: t('common:btn.ok'),
                          cancelText: t('common:btn.cancel'),
                          onOk: async () => {
                            removeDashboards(selectRowKeys).then(() => {
                              message.success(t('common:success.delete'));
                            });
                            // TODO: 删除完后立马刷新数据有时候不是实时的，这里暂时间隔0.5s后再刷新列表
                            setTimeout(() => {
                              refreshList();
                            }, 500);
                          },
                        });
                      }}
                    >
                      <span>{t('common:btn.batch_delete')}</span>
                    </Menu.Item>
                  )}
                </Menu>
              }
              trigger={['click']}
            >
              <Button onClick={(e) => e.stopPropagation()}>
                {t('common:btn.more')} <DownOutlined />
              </Button>
            </Dropdown>
          </div>
        </div>
      </div>
    </>
  );
}
