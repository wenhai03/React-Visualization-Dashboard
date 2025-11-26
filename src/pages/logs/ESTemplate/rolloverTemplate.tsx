import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { Table, Space, Row, Col, Input, Select, Button, Popconfirm, message } from 'antd';
import { useParams } from 'react-router';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import { getRolloverRecord, runRollover } from '@/services/esTemplate';
import { useTranslation } from 'react-i18next';
import './index.less';
import '../locale';

const RolloverTemplate: React.FC = () => {
  const { t } = useTranslation('logs');
  const [filter, setFilter] = useState<{ value: string; status?: number }>({ value: '' });
  const [rolloverData, setRolloverData] = useState<any>();
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const [loading, setLoading] = useState(false);
  const pagination = usePagination({ PAGESIZE_KEY: 'es-template-rollover-list' });
  const { id } = useParams<{ id: string }>();
  const columns = [
    {
      title: t('template.index_patterns'),
      dataIndex: 'index_pattern',
      width: 180,
    },
    {
      title: t('template.data_stream'),
      dataIndex: 'data_stream',
      width: 250,
    },
    {
      title: t('template.cost'),
      dataIndex: 'cost',
      width: 120,
      render: (val) => `${val} ms`,
    },
    {
      title: t('template.result'),
      dataIndex: 'result',
      sorter: (a, b) => a.status - b.status,
      render: (val, { status }) => (
        <>
          {status === 1 ? t('template.success') : status === 2 ? t('template.fail') : ''}
          {val ? `：${val}` : ''}
        </>
      ),
    },
    {
      title: t('common:table.update_at'),
      dataIndex: 'update_at',
      width: 150,
      render: (val) => {
        return val ? moment.unix(Number(val)).format('YYYY-MM-DD HH:mm:ss') : '-';
      },
    },
  ];

  useEffect(() => {
    if (id) {
      setLoading(true);
      getRolloverRecord({ id: Number(id) })
        .then((res) => {
          setLoading(false);
          setRolloverData(res.dat);
        })
        .catch((res) => setLoading(false));
    }
  }, [id, refreshFlag]);

  return (
    <PageLayout title={`${t('template.roll')}${rolloverData?.name}`} showBack backPath='/log/es-template'>
      <div>
        <div style={{ padding: '10px' }}>
          <Row justify='space-between'>
            <Col>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setRefreshFlag(_.uniqueId('refreshFlag_'));
                  }}
                />
                <Input
                  className={'searchInput'}
                  prefix={<SearchOutlined />}
                  placeholder={t('template.search_placeholder')}
                  onPressEnter={(e) => {
                    setFilter({ ...filter, value: (e.target as HTMLInputElement).value });
                  }}
                />
                <Select
                  value={filter?.status}
                  style={{ width: '120px' }}
                  allowClear
                  onChange={(e) => setFilter({ ...filter, status: e })}
                  placeholder={t('template.status_placeholder')}
                >
                  <Select.Option value={0} key='0'>
                    {t('template.not_run')}
                  </Select.Option>
                  <Select.Option value={1} key='1'>
                    {t('template.success')}
                  </Select.Option>
                  <Select.Option value={2} key='2'>
                    {t('template.fail')}
                  </Select.Option>
                </Select>
              </Space>
            </Col>
            <Col>
              {rolloverData?.rollover_status === 2 ? (
                <Button disabled={true}>{t('template.running')}</Button>
              ) : (
                <Popconfirm
                  title={t('template.run_tooltip')}
                  placement='left'
                  onConfirm={() => {
                    runRollover({ id: Number(id) }).then((res) => {
                      message.success(`${t('template.run')}${t('template.success')}`);
                      setRefreshFlag(_.uniqueId('refreshFlag_'));
                    });
                  }}
                >
                  <Button type='primary'>{t('template.run')} Rollover</Button>
                </Popconfirm>
              )}
            </Col>
          </Row>
          <Table
            size='small'
            rowKey='id'
            loading={loading}
            columns={columns}
            dataSource={
              rolloverData?.rollover
                ? rolloverData.rollover.filter((item) => {
                    return (
                      (filter.status !== undefined ? item.status === filter.status : true) &&
                      (item.index_pattern.toString().toLowerCase().includes(filter.value.toLowerCase()) ||
                        item.data_stream.toString().toLowerCase().includes(filter.value.toLowerCase()))
                    );
                  })
                : []
            }
            pagination={pagination}
            scroll={{ y: 'calc(100vh - 228px)' }}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default RolloverTemplate;
