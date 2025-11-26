import React, { useContext, useState } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { CommonStateContext } from '@/App';
import { SearchOutlined, ShareAltOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { Table, Tag, Button, message, Space, Popconfirm, Row, Col, Input } from 'antd';
import { useAntdTable } from 'ahooks';
import ShareChartModal from '@/components/ShareChartModal';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import { getShareChardRecord, setShareChardRecord, deleteShareChardRecord } from '@/services/dashboardV2';
import '../locale';

const ShareRecord: React.FC = () => {
  const { curBusiId, curBusiGroup } = useContext(CommonStateContext);
  const [filter, setFilter] = useState();
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation('dashboard');
  const [currentRecord, setCurrentRecord] = useState<any>();
  const [selectedRowkeys, setSelectRowKeys] = useState<number[]>([]);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const pagination = usePagination({ PAGESIZE_KEY: 'share-chart-record' });
  const columns: ColumnsType<any> = [
    {
      title: t('share_record.url'),
      dataIndex: 'id',
      width: 80,
      render: (val, record) => (
        <a target='_blank' href={record.share_type === 1 ? `/dashboards/share/${val}` : `/chart/${val}`}>
          {t('common:btn.view')}
        </a>
      ),
    },
    {
      title: t('share_record.expiration'),
      width: 150,
      dataIndex: 'expiration',
      render: (val) => (val === -1 ? t('share_record.long_term') : moment(val * 1000).format('YYYY-MM-DD HH:mm:ss')),
    },
    {
      title: t('share_record.user'),
      dataIndex: 'user_infos',
      render: (val) =>
        val?.length
          ? val.map((item) => (
              <Tag color='blue' key={item.id} style={{ marginBottom: '10px' }}>
                {item.nickname || item.email || item.idm_id || item.username}
              </Tag>
            ))
          : t('share_record.no_limit_user'),
    },
    {
      title: t('common:table.note'),
      dataIndex: 'note',
    },
    {
      title: t('common:table.create_by'),
      dataIndex: 'create_by',
    },
    {
      title: t('common:table.update_by'),
      dataIndex: 'update_by',
      render: (val) => (val && val !== '' ? val : '-'),
    },
    ...(curBusiGroup.perm === 'rw'
      ? [
          {
            title: t('common:table.operations'),
            width: '100px',
            dataIndex: 'operation',
            render: (text, record) => (
              <Space>
                <a
                  onClick={() => {
                    setVisible(true);
                    setCurrentRecord(record);
                  }}
                >
                  {t('common:btn.modify')}
                </a>
                <Popconfirm
                  title={t('common:confirm.delete')}
                  onConfirm={() => {
                    deleteShareChardRecord({ ids: [record.id] }).then((res) => {
                      setRefreshFlag(_.uniqueId('refreshFlag_'));
                      message.success(t('common:success.delete'));
                    });
                  }}
                >
                  <a style={{ color: 'red' }}>{t('common:btn.delete')}</a>
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  const featchData = ({ current, pageSize }: { current: number; pageSize: number }): Promise<any> => {
    const query = {
      query: filter,
      group_id: curBusiId,
      limit: pageSize,
      p: current,
    };
    return getShareChardRecord(query).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };

  const { tableProps } = useAntdTable(featchData, {
    refreshDeps: [curBusiId, refreshFlag, filter],
    defaultPageSize: pagination.pageSize,
  });

  const handleEdit = (values) => {
    let expiration: number;
    const size = Number(values.size);
    if (values.size === '') {
      expiration = -1;
    } else {
      const interval = size * (values.unit === 'h' ? 3600 : 86400);
      expiration = moment(new Date()).unix() + interval;
    }

    setShareChardRecord({
      id: currentRecord.id,
      expiration,
      user_ids: values.user_ids,
      note: values.note,
    }).then((res) => {
      setVisible(false);
      setRefreshFlag(_.uniqueId('refreshFlag_'));
      message.success(t('common:success.modify'));
    });
  };

  const handleBatchDelete = () => {
    deleteShareChardRecord({ ids: selectedRowkeys }).then((res) => {
      setRefreshFlag(_.uniqueId('refreshFlag_'));
      message.success(t('common:success.delete'));
    });
  };

  return (
    <PageLayout title={t('share_record.title')} icon={<ShareAltOutlined />}>
      <div>
        <div style={{ padding: '10px' }}>
          <Row justify='space-between'>
            <Col>
              <Input
                className={'searchInput'}
                prefix={<SearchOutlined />}
                onPressEnter={(val: any) => setFilter(val.target.value)}
                placeholder={t('share_record.search_placeholder')}
              />
            </Col>
            {curBusiGroup.perm === 'rw' && (
              <Col>
                <Button disabled={!selectedRowkeys.length} onClick={handleBatchDelete}>
                  {t('common:btn.batch_delete')}
                </Button>
              </Col>
            )}
          </Row>

          <Table
            rowKey='id'
            columns={columns}
            size='small'
            rowSelection={{
              selectedRowKeys: selectedRowkeys.map((item) => item),
              onChange: (selectedRowKeys: number[]) => {
                setSelectRowKeys(selectedRowKeys);
              },
            }}
            {...tableProps}
            pagination={{
              ...tableProps.pagination,
              ...pagination,
            }}
            scroll={{ x: 'max-content' }}
          />
          <ShareChartModal
            initialValues={currentRecord}
            visible={visible}
            onCancel={() => setVisible(false)}
            mode='edit'
            onEdit={handleEdit}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default ShareRecord;
