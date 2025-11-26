import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Table, Tag, Alert } from 'antd';
import moment from 'moment';
import _ from 'lodash';
import semver from 'semver';
import PageLayout from '@/components/pageLayout';
import { CommonStateContext } from '@/App';
import BlankBusinessPlaceholder from '@/components/BlankBusinessPlaceholder';
import { getDashboards, getDashboard } from '@/services/dashboardV2';
import MigrationModal from './MigrationModal';
import './locale';

export default function Migrate() {
  const { t } = useTranslation('migrationDashboard');
  const { curBusiId: busiId } = useContext(CommonStateContext);
  const [refreshFlag, setRefreshFlag] = useState(_.uniqueId('refresh_'));
  const [loading, setLoading] = useState(false);
  const [boards, setBoards] = useState<any[]>([]);
  const [settingOpen, setSettingOpen] = useState(false);

  useEffect(() => {
    if (busiId) {
      setLoading(true);
      getDashboards(busiId)
        .then((res) => {
          let requests: Promise<any>[] = [];
          _.forEach(res, (board) => {
            requests.push(getDashboard(board.id));
          });
          Promise.all(requests)
            .then((res) => {
              setBoards(
                _.filter(res, (item) => {
                  try {
                    const configs = JSON.parse(item.configs);
                    // v6 对应的版本号是 3.0.0，小于 3.0.0 的都是需要迁移的
                    return configs && semver.lt(configs.version, '3.0.0');
                  } catch (e) {
                    return false;
                  }
                }),
              );
            })
            .finally(() => {
              setLoading(false);
            });
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [busiId, refreshFlag]);

  return (
    <PageLayout title={t('title')}>
      <div>
        {busiId ? (
          <div className='dashboards-v2'>
            <div style={{ marginBottom: 10 }}>
              <Button
                type='primary'
                onClick={() => {
                  setSettingOpen(true);
                }}
              >
                {t('migration')}
              </Button>
            </div>
            <Alert
              message={
                <div>
                  {t('message_1')}
                  <br />
                  {t('message_2')}
                  <br />
                  {t('message_3')}
                </div>
              }
              type='warning'
            />
            <Table
              size='small'
              loading={loading}
              dataSource={boards}
              columns={[
                {
                  title: t('dashboard_name'),
                  dataIndex: 'name',
                },
                {
                  title: t('cate_tags'),
                  dataIndex: 'tags',
                  render: (text: string) => (
                    <>
                      {_.map(_.split(text, ' '), (tag, index) => {
                        return tag ? (
                          <Tag color='blue' key={index}>
                            {tag}
                          </Tag>
                        ) : null;
                      })}
                    </>
                  ),
                },
                {
                  title: t('common:table.update_at'),
                  width: 200,
                  dataIndex: 'update_at',
                  render: (text: number) => moment.unix(text).format('YYYY-MM-DD HH:mm:ss'),
                },
                {
                  title: t('common:table.create_by'),
                  width: 70,
                  dataIndex: 'create_by',
                },
              ]}
              pagination={false}
            />
          </div>
        ) : (
          <BlankBusinessPlaceholder text={t('dashboard')} />
        )}
      </div>
      <MigrationModal
        visible={settingOpen}
        setVisible={setSettingOpen}
        boards={boards}
        onOk={() => {
          setRefreshFlag(_.uniqueId('refresh_'));
        }}
      />
    </PageLayout>
  );
}
