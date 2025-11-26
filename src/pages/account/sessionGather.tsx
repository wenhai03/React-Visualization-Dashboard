import React, { useContext, useState } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { CommonStateContext } from '@/App';
import { useHistory } from 'react-router-dom';
import { RollbackOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { Table, Button, message, Space, Popconfirm, Row, Col, Input, Tag, Tooltip } from 'antd';
import { useAntdTable } from 'ahooks';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { getAuthSession, deleteAuthSession } from '@/services/account';
import './locale';

const Session: React.FC = () => {
  const { curBusiId } = useContext(CommonStateContext);
  const history = useHistory();
  const { t } = useTranslation('account');
  const [filter, setFilter] = useState();
  const [selectedRowkeys, setSelectRowKeys] = useState<string[]>([]);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const columns: ColumnsType<any> = [
    {
      title: t('common:profile.username'),
      dataIndex: 'username',
      width: 200,
      render: (val, record) => (
        <Space>
          {val}
          {record.current_session && <Tag color='gold'>{t('current_session')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('common:profile.nickname'),
      dataIndex: 'nickname',
      width: 150,
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      width: 100,
      render: (val) => (val && val !== '' ? val : t('common:unknown')),
    },
    {
      title: t('login_time'),
      dataIndex: 'login_time',
      width: 120,
      render: (val) => (val ? moment.unix(val).format('YYYY-MM-DD HH:mm:ss') : t('common:unknown')),
    },
    {
      title: 'User-Agent',
      dataIndex: 'user_agent',
      width: 450,
    },
    {
      title: t('common:table.operations'),
      width: 50,
      dataIndex: 'operation',
      render: (text, record) => (
        <Space>
          <Popconfirm
            placement='right'
            title={t('logout_confirm')}
            onConfirm={() => {
              deleteAuthSession({ refresh_uuids: [record.refresh_uuid] }).then((res) => {
                setRefreshFlag(_.uniqueId('refreshFlag_'));
                message.success(t('logout_success'));
              });
            }}
          >
            <a style={{ color: 'red' }}>{t('logout')}</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const featchData = ({ current, pageSize }: { current: number; pageSize: number }): Promise<any> => {
    return getAuthSession({ query: filter }).then((res) => {
      return {
        total: res.dat?.length,
        list: res.dat,
      };
    });
  };

  const { tableProps } = useAntdTable(featchData, {
    refreshDeps: [curBusiId, refreshFlag, filter],
  });

  const handleBatchDelete = () => {
    deleteAuthSession({ refresh_uuids: selectedRowkeys }).then((res) => {
      setRefreshFlag(_.uniqueId('refreshFlag_'));
      setSelectRowKeys([]);
      message.success(t('logout_success'));
    });
  };

  return (
    <PageLayout
      title={t('common:active_session')}
      icon={<RollbackOutlined className='back' onClick={() => history.push('/users')} />}
    >
      <div>
        <div style={{ padding: '10px' }}>
          <Row justify='space-between'>
            <Col>
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
                  onPressEnter={(val: any) => setFilter(val.target.value)}
                  placeholder={t('search_placeholder')}
                />
              </Space>
            </Col>
            <Button disabled={!selectedRowkeys.length} style={{ float: 'right' }}>
              <Popconfirm placement='right' title={t('logout_confirm')} onConfirm={handleBatchDelete}>
                {t('batch_logout')}
              </Popconfirm>
            </Button>
          </Row>

          <Table
            rowKey='refresh_uuid'
            columns={columns}
            size='small'
            rowSelection={{
              selectedRowKeys: selectedRowkeys.map((item) => item),
              onChange: (selectedRowKeys: string[]) => {
                setSelectRowKeys(selectedRowKeys);
              },
            }}
            {...tableProps}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => {
                return t('common:table.total', { total });
              },
              pageSizeOptions: ['10', '20', '50', '100'],
              defaultPageSize: 10,
            }}
            scroll={{ y: 'calc(100vh - 228px)' }}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default Session;
