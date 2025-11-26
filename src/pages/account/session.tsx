import React, { useContext, useState } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { CommonStateContext } from '@/App';
import { RobotOutlined, ReloadOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { Table, Button, message, Space, Popconfirm, Row, Col, Tag } from 'antd';
import { useAntdTable } from 'ahooks';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { getAuthSession, deleteAuthSession } from '@/services/account';
import './locale';

const Session: React.FC = () => {
  const { curBusiId, profile } = useContext(CommonStateContext);
  const { t } = useTranslation('account');
  const [selectedRowkeys, setSelectRowKeys] = useState<string[]>([]);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const columns: ColumnsType<any> = [
    {
      title: 'IP',
      dataIndex: 'ip',
      render: (val, record) => (
        <Space>
          {val && val !== '' ? val : t('common:unknown')}
          {record.current_session && <Tag color='gold'>{t('current_session')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('login_time'),
      dataIndex: 'login_time',
      width: 180,
      render: (val) => (val ? moment.unix(val).format('YYYY-MM-DD HH:mm:ss') : t('common:unknown')),
    },
    {
      title: 'User-Agent',
      dataIndex: 'user_agent',
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
    return getAuthSession({ user_id: profile?.id }).then((res) => {
      return {
        total: res.dat.length,
        list: res.dat,
      };
    });
  };

  const { tableProps } = useAntdTable(featchData, {
    refreshDeps: [curBusiId, refreshFlag],
  });

  const handleBatchDelete = () => {
    deleteAuthSession({ refresh_uuids: selectedRowkeys }).then((res) => {
      setRefreshFlag(_.uniqueId('refreshFlag_'));
      setSelectRowKeys([]);
      message.success(t('logout_success'));
    });
  };

  return (
    <PageLayout title={t('common:active_session')} icon={<RobotOutlined />}>
      <div>
        <div style={{ padding: '10px' }}>
          <Row justify='space-between'>
            <Col>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setRefreshFlag(_.uniqueId('refresh_'));
                }}
              />
            </Col>
            <Col>
              <Button disabled={!selectedRowkeys.length} style={{ float: 'right' }}>
                <Popconfirm placement='right' title={t('logout_confirm')} onConfirm={handleBatchDelete}>
                  {t('batch_logout')}
                </Popconfirm>
              </Button>
            </Col>
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
            pagination={false}
            scroll={{ y: 'calc(100vh - 172px)' }}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default Session;
