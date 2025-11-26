import React, { useState, useEffect, useContext } from 'react';
import { Table, Space, Button, Input, Select } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import moment from 'moment';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { getN9EServers } from '@/services/help';
import { CommonStateContext } from '@/App';
import localeCompare from '@/pages/dashboard/Renderer/utils/localeCompare';
import './locale';

interface IFilter {
  instance: string;
  datasource_id?: number;
}

export default function Servers() {
  const { t } = useTranslation('servers');
  const { profile, datasourceList, groupedDatasourceList } = useContext(CommonStateContext);
  const [current, setCurrent] = useState(1);
  const [filter, setFilter] = useState<IFilter>({ instance: '' });
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = () => {
    getN9EServers()
      .then((res) => {
        setCurrent(1);
        setData(res.dat ?? []);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [refreshFlag]);

  return (
    <PageLayout title={t('title')}>
      <div>
        <div style={{ padding: 20 }}>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setRefreshFlag(_.uniqueId('refresh_'));
              }}
            />
            <Input
              className={'searchInput'}
              prefix={<SearchOutlined />}
              onPressEnter={(val: any) => setFilter({ ...filter, instance: val.target.value })}
              placeholder={t('instance')}
              allowClear
            />
            <Select
              placeholder={t('datasource')}
              value={filter.datasource_id}
              onChange={(val) => setFilter({ ...filter, datasource_id: val })}
              style={{ width: '150px' }}
              allowClear
              options={Object.entries(groupedDatasourceList).map(([key, value]) => ({
                label: key,
                options: value.map((item) => ({ label: item.name, value: item.id })),
              }))}
            />
          </Space>
          {profile.admin ? (
            <div>
              <Table
                size='small'
                rowKey='id'
                tableLayout='fixed'
                loading={loading}
                dataSource={data.filter((item: any) => {
                  return (
                    item.instance.includes(filter.instance) &&
                    (filter.datasource_id ? item.datasource_id === filter.datasource_id : true)
                  );
                })}
                columns={[
                  {
                    title: t('instance'),
                    dataIndex: 'instance',
                    key: 'instance',
                    sorter: (a: any, b: any) => {
                      return localeCompare(a.instance, b.instance);
                    },
                  },
                  {
                    title: t('cluster'),
                    dataIndex: 'cluster',
                    key: 'cluster',
                    sorter: (a: any, b: any) => {
                      return localeCompare(a.cluster, b.cluster);
                    },
                  },
                  {
                    title: t('datasource'),
                    dataIndex: 'datasource_id',
                    key: 'datasource_id',
                    sorter: (a: any, b: any) => {
                      return localeCompare(a.datasource_id, b.datasource_id);
                    },
                    render: (text) => {
                      return _.get(_.find(datasourceList, { id: text }), 'name');
                    },
                  },
                  {
                    title: t('clock'),
                    dataIndex: 'clock',
                    key: 'clock',
                    sorter: (a: any, b: any) => {
                      return localeCompare(a.clock, b.clock);
                    },
                    render: (text) => {
                      return moment.unix(text).format('YYYY-MM-DD HH:mm:ss');
                    },
                  },
                ]}
                pagination={{
                  current: current,
                  total: data.filter((item: any) => {
                    return (
                      item.instance.includes(filter.instance) &&
                      (filter.datasource_id ? item.datasource_id === filter.datasource_id : true)
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
                scroll={{ y: 'calc(100vh - 246px)' }}
              />
            </div>
          ) : (
            <div>{t('unauthorized')}</div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
