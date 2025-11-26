import React, { useState, useContext, useEffect } from 'react';
import moment from 'moment';
import _ from 'lodash';
import { Table, Space, Button, Row, Col, Select, message, Modal } from 'antd';
import EmptyDatasourcePopover from '@/components/DatasourceSelect/EmptyDatasourcePopover';
import { CommonStateContext } from '@/App';
import { useHistory } from 'react-router-dom';
import { Link } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import { getApmAgentConfig, deleteApmAgentConfig } from '@/services/traces';
import { useTranslation } from 'react-i18next';
import '../locale';
import Add from './add';
import Edit from './edit';

export { Add, Edit };

const ApmForm: React.FC = () => {
  const { t } = useTranslation('traces');
  const history = useHistory();
  const { groupedDatasourceList, curBusiId, curBusiGroup } = useContext(CommonStateContext);
  const [dataSourceId, setDataSourceId] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const pagination = usePagination({ PAGESIZE_KEY: 'apm-setting-list' });
  const columns = [
    {
      title: t('service_name'),
      dataIndex: ['service', 'name'],
      render: (val) => (val && val !== '' ? val : t('all')),
    },
    {
      title: t('service_environment'),
      dataIndex: ['service', 'environment'],
      render: (val) => (val && val !== '' ? val : t('all')),
    },
    {
      title: t('setting.agent_name'),
      dataIndex: 'agent_name',
      render: (val) => (val && val !== '' ? val : t('all')),
    },
    {
      title: t('setting.applied_by_agent'),
      dataIndex: 'applied_by_agent',
      width: 150,
      render: (val) => (val ? t('setting.is') : t('setting.is_not')),
    },
    {
      title: t('setting.update_at'),
      dataIndex: '@timestamp',
      width: 250,
      render: (text: number) => moment(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: t('common:table.operations'),
      key: 'action',
      width: 150,
      render: (text, record) => (
        <Space size='middle'>
          <Link
            to={`traces-setting/edit?data_id=${dataSourceId}&name=${record.service.name ?? ''}${
              record.service.environment ? `&environment=${record.service.environment}` : ''
            }`}
          >
            {t(curBusiGroup.perm === 'rw' ? 'common:btn.edit' : 'common:btn.detail')}
          </Link>
          {curBusiGroup.perm === 'rw' && (
            <a
              style={{ color: 'red' }}
              onClick={() =>
                Modal.confirm({
                  title: t('common:confirm.delete'),
                  okText: t('common:btn.ok'),
                  cancelText: t('common:btn.cancel'),
                  onOk: () => handleDelete(record),
                  onCancel() {},
                })
              }
            >
              {t('common:btn.delete')}
            </a>
          )}
        </Space>
      ),
    },
  ];

  const handleDelete = (data) => {
    setLoading(true);
    deleteApmAgentConfig({ service: data.service })
      .then((res) => {
        getApmAgentList(dataSourceId);
        message.success(t('common:success.delete'));
        setLoading(false);
      })
      .catch((err) => setLoading(false));
  };

  const getApmAgentList = (data_id) => {
    setDataSourceId(data_id);
    setLoading(true);
    getApmAgentConfig({ datasource_id: data_id, group_id: curBusiId })
      .then((res) => {
        setList(res.dat);
        setLoading(false);
      })
      .catch((err) => setLoading(false));
  };

  useEffect(() => {
    if (groupedDatasourceList?.prometheus?.[0]?.id) {
      getApmAgentList(groupedDatasourceList?.prometheus?.[0]?.id);
    } else {
      setList([]);
      setDataSourceId(undefined);
    }
  }, [groupedDatasourceList]);

  return (
    <PageLayout title={t('setting.title')}>
      <div>
        <div style={{ padding: '10px' }}>
          <Row justify='space-between'>
            <Col>
              <EmptyDatasourcePopover datasourceList={groupedDatasourceList?.prometheus}>
                {t('common:datasource.id')}:
                <Select
                  size='small'
                  style={{ minWidth: 70 }}
                  dropdownMatchSelectWidth={false}
                  value={dataSourceId}
                  onChange={(e: any) => getApmAgentList(e)}
                  showSearch
                  optionFilterProp='children'
                >
                  {_.map(groupedDatasourceList?.prometheus, (item) => (
                    <Select.Option value={item.id} key={item.id}>
                      {item.name}
                    </Select.Option>
                  ))}
                </Select>
              </EmptyDatasourcePopover>
            </Col>
            {curBusiGroup.perm === 'rw' && (
              <Col>
                <Space>
                  <Button
                    type='primary'
                    disabled={!dataSourceId}
                    onClick={() => history.push(`/traces-setting/add?data_id=${dataSourceId}`)}
                  >
                    {t('common:btn.add')}
                  </Button>
                </Space>
              </Col>
            )}
          </Row>
          <Table
            size='small'
            rowKey='id'
            columns={columns}
            dataSource={list}
            loading={loading}
            pagination={pagination}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default ApmForm;
