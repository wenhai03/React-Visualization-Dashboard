import React, { useState } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { Table, Space, Input, Button, Row, Col, message, Popconfirm } from 'antd';
import { useAntdTable } from 'ahooks';
import { getLogShieldRules, addLogShieldRule, batchdeleteLogShieldRules } from '@/services/logstash';
import { useTranslation } from 'react-i18next';
// import ShieldIdentsModal from '@/components/ShieldIdentsModal';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';

const ShieldLogs: React.FC = () => {
  const { t } = useTranslation('collector');
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const [filter, setFilter] = useState();
  // 屏蔽规则弹窗
  // const [shieldVisible, setShieldVisible] = useState(false);
  const [selectedRowkeys, setSelectedRowKeys] = useState<number[]>([]);

  const columns: any = [
    {
      title: t('script.shield_log_rules.ident'),
      dataIndex: 'ident',
      width: 200,
    },
    {
      title: t('script.shield_log_rules.topic'),
      dataIndex: 'topic',
    },
    {
      title: t('script.shield_log_rules.collection_type'),
      dataIndex: 'type',
      render: (val) =>
        val == 'file'
          ? t('script.shield_log_rules.type_file')
          : val == 'journald'
          ? t('script.shield_log_rules.type_journald')
          : '',
    },
    {
      title: t('script.shield_log_rules.file_path'),
      dataIndex: 'path',
    },
    {
      title: t('script.shield_log_rules.hash'),
      dataIndex: 'hash',
    },
    {
      title: t('common:table.create_at'),
      dataIndex: 'create_at',
      width: '180px',
      render(value) {
        return moment(value * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      title: t('common:table.operations'),
      width: '80px',
      render: (text: string, record) => (
        <Popconfirm
          title={t('common:confirm.delete')}
          onConfirm={() => {
            batchdeleteLogShieldRules({ ids: [record.id] }).then((res) => {
              setRefreshFlag(_.uniqueId('refresh_'));
              message.success(t('common:success.delete'));
            });
          }}
        >
          <a style={{ color: '#ff4d4f' }}>{t('common:btn.delete')}</a>
        </Popconfirm>
      ),
    },
  ];

  const featchData = ({ current, pageSize }: { current: number; pageSize: number }): Promise<any> => {
    const query = {
      limit: pageSize,
      p: current,
      query: filter,
    };
    return getLogShieldRules(query).then((res) => ({
      total: res.dat.total,
      list: res.dat.list,
    }));
  };

  const { tableProps } = useAntdTable(featchData, {
    refreshDeps: [filter, refreshFlag],
    defaultPageSize: 10,
  });

  // 提交日志屏蔽规则
  // const handleshieldLogRule = (values) => {
  //   addLogShieldRule(values).then((res) => {
  //     setShieldVisible(false);
  //     setRefreshFlag(_.uniqueId('refresh_'));
  //     message.success(t('common:success.submit'));
  //   });
  // };

  return (
    <>
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
              onPressEnter={(e: any) => setFilter(e.target.value)}
              placeholder={t('script.shield_log_rules.filter_placeholder')}
            />
          </Space>
        </Col>
        <Col>
          <Space>
            {/* <Button type='primary' onClick={() => setShieldVisible(true)}>
              {t('common:btn.add')}
            </Button> */}
            <Button
              disabled={!Boolean(selectedRowkeys.length)}
              onClick={() => {
                batchdeleteLogShieldRules({ ids: selectedRowkeys }).then((res) => {
                  setRefreshFlag(_.uniqueId('refresh_'));
                  message.success(t('common:success.delete'));
                });
              }}
            >
              {t('common:btn.batch_delete')}
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        size='small'
        rowKey='id'
        bordered
        columns={columns}
        scroll={{ y: 'calc(100vh - 218px)' }}
        {...tableProps}
        rowSelection={{
          selectedRowKeys: selectedRowkeys.map((item) => item),
          onChange: (selectedRowKeys: number[]) => {
            setSelectedRowKeys(selectedRowKeys);
          },
        }}
        pagination={{
          ...tableProps.pagination,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => t('common:table.total', { total }),
          showSizeChanger: true,
        }}
      />
      {/* <ShieldIdentsModal
        visible={shieldVisible}
        onCancel={() => {
          setShieldVisible(false);
        }}
        onOk={handleshieldLogRule}
      /> */}
    </>
  );
};

export default ShieldLogs;
