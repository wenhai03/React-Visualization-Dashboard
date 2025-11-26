import React, { useState, useContext } from 'react';
import { useAntdTable } from 'ahooks';
import _ from 'lodash';
import { Table, Space, Dropdown, Button, Menu, Row, Col, Input, message, Modal, Select, Tag } from 'antd';
import { DownOutlined, SearchOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { CommonStateContext } from '@/App';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import { getApmFormConfig, deleteApmFormConfig, exportApmFormConfig } from '@/services/traces';
import { useTranslation } from 'react-i18next';
import { download } from '@/utils';
import '../locale';
import Add from './add';
import Edit from './edit';

export { Add, Edit };

export const includeAgents = [
  'go',
  'java',
  'js-base',
  'iOS/swift',
  'rum-js',
  'nodejs',
  'python',
  'dotnet',
  'ruby',
  'php',
  'android/java',
  'all',
];

const ApmForm: React.FC = () => {
  const { t } = useTranslation('traces');
  const { profile } = useContext(CommonStateContext);
  const [filter, setFilter] = useState<{ category?: string; include_agents?: string }>({});
  const [selectedRows, setSelectRowKeys] = useState<number[]>([]);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const pagination = usePagination({ PAGESIZE_KEY: 'apm-form-list' });
  const columns = [
    {
      title: t('form.category'),
      dataIndex: 'category',
    },
    {
      title: t('form.label'),
      dataIndex: 'label',
    },
    {
      title: t('form.default_value'),
      dataIndex: 'default_value',
      width: 500,
    },
    {
      title: t('form.include_agents'),
      dataIndex: 'include_agents',
      render(tagArr) {
        const content =
          tagArr &&
          tagArr.map((item) => (
            <Tag color='blue' key={item}>
              {item}
            </Tag>
          ));
        return tagArr && content;
      },
    },
    {
      title: t('common:table.operations'),
      key: 'action',
      width: 100,
      render: (text, record) => (
        <Space size='middle'>
          <Link to={`traces-form/edit/${record.id}`}>{t('common:btn.edit')}</Link>
          <a
            style={{ color: 'red' }}
            onClick={() =>
              Modal.confirm({
                title: t('common:confirm.delete'),
                okText: t('common:btn.ok'),
                cancelText: t('common:btn.cancel'),
                onOk: () => handleDelete('single', record.id),
                onCancel() {},
              })
            }
          >
            {t('common:btn.delete')}
          </a>
        </Space>
      ),
    },
  ];

  const handleDelete = (type: 'single' | 'batch', id?: number) => {
    let data = { ids: selectedRows };
    if (type !== 'batch') {
      data.ids = [id!];
    }
    deleteApmFormConfig(data).then((res) => {
      setRefreshFlag(_.uniqueId('refresh_'));
      message.success(t('common:success.delete'));
    });
  };

  const fetchData = ({ current, pageSize }) => {
    const params = {
      p: current,
      limit: pageSize,
      ...filter,
    };
    return getApmFormConfig(params).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };
  const { tableProps } = useAntdTable(fetchData, {
    refreshDeps: [filter, refreshFlag],
    defaultPageSize: pagination.pageSize,
  });

  return (
    <PageLayout title={t('form.title')}>
      <div>
        <div style={{ padding: '10px' }}>
          <Row justify='space-between'>
            <Col>
              <Space>
                <Input
                  className={'searchInput'}
                  prefix={<SearchOutlined />}
                  onPressEnter={(e: any) => setFilter({ ...filter, category: e.target.value })}
                  placeholder={t('form.category')}
                />
                <Select
                  mode='multiple'
                  showSearch
                  allowClear
                  optionFilterProp='children'
                  style={{ width: '260px' }}
                  onChange={(e) => setFilter({ ...filter, include_agents: e.join(',') })}
                  placeholder={t('form.include_agents')}
                >
                  {includeAgents.map((item) => (
                    <Select.Option value={item} key={item}>
                      {item}
                    </Select.Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col>
              <Space>
                <Link to={'/traces-form/add'}>
                  <Button type='primary'>{t('common:btn.add')}</Button>
                </Link>
                {profile.admin && (
                  <Button
                    onClick={() =>
                      exportApmFormConfig()
                        .then((res) => {
                          const data = JSON.stringify(res.dat, null, 4);
                          download(data, `${t('download_name')}.json`);
                          message.success(t('common:success.export'));
                        })
                        .catch((err) => message.error(t('common:error.export')))
                    }
                  >
                    {t('common:btn.export')}
                  </Button>
                )}
                <Dropdown
                  trigger={['click']}
                  disabled={!Boolean(selectedRows.length)}
                  overlay={
                    <Menu>
                      <Menu.Item key='batch_delete' onClick={() => handleDelete('batch')}>
                        {t('common:btn.batch_delete')}
                      </Menu.Item>
                    </Menu>
                  }
                >
                  <Button>
                    {t('common:btn.batch_operations')} <DownOutlined />
                  </Button>
                </Dropdown>
              </Space>
            </Col>
          </Row>
          <Table
            size='small'
            rowKey='id'
            columns={columns}
            {...tableProps}
            rowSelection={{
              selectedRowKeys: selectedRows.map((item) => item),
              onChange: (selectedRowKeys: number[]) => {
                setSelectRowKeys(selectedRowKeys);
              },
            }}
            pagination={{
              ...tableProps.pagination,
              ...pagination,
            }}
            scroll={{ x: 'max-content' }}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default ApmForm;
