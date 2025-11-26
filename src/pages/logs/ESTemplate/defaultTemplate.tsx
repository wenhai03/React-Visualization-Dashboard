import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import { Table, Space, Row, Col, Input, Tooltip, Tag, Select, Drawer, Tabs, Typography } from 'antd';
import { useParams } from 'react-router';
import { SearchOutlined, CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { copy2ClipBoard } from '@/utils';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import { getDefaultTemplate } from '@/services/esTemplate';
import { useTranslation } from 'react-i18next';
import './index.less';
import '../locale';

const DefaultTemplate: React.FC = () => {
  const { t } = useTranslation('logs');
  const [filter, setFilter] = useState<{ name?: string; legacy?: boolean }>({ name: '' });
  const [list, setList] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [current, setCurent] = useState<{ name: string; index_template: any; legacy: boolean }>();
  const pagination = usePagination({ PAGESIZE_KEY: 'es-template-default-list' });
  const { id } = useParams<{ id: string }>();
  const columns = [
    {
      title: t('common:table.name'),
      dataIndex: 'name',
      width: 360,
      render: (val, record) => (
        <a
          onClick={() => {
            setVisible(true);
            setCurent(record);
          }}
        >
          {val}
        </a>
      ),
    },
    {
      title: t('template.version'),
      dataIndex: 'legacy',
      width: 80,
      render: (val) => (val ? t('template.old') : t('template.new')),
    },
    {
      title: t('template.index_patterns'),
      dataIndex: ['index_template', 'index_patterns'],
      ellipsis: {
        showTitle: false,
      },
      render: (val) => {
        const tagList = val.map((item) => (
          <Tag color='blue' key={item}>
            {item}
          </Tag>
        ));
        return val && val.length ? (
          <Tooltip
            placement='topRight'
            title={<Space wrap>{tagList}</Space>}
            overlayClassName='table-tooltip-content'
            overlayInnerStyle={{
              maxWidth: 460,
              maxHeight: 400,
              width: 'max-content',
              height: 'max-content',
              overflow: 'auto',
            }}
          >
            {tagList}
          </Tooltip>
        ) : (
          '-'
        );
      },
    },
    {
      title: t('template.data_stream'),
      dataIndex: ['index_template', 'data_stream'],
      width: 80,
      render: (val) => (val ? <CheckOutlined /> : ''),
    },
  ];

  useEffect(() => {
    if (id) {
      setLoading(true);
      getDefaultTemplate({ datasource_id: Number(id) })
        .then((res) => {
          setLoading(false);
          setList(res.dat);
        })
        .catch((res) => setLoading(false));
    }
  }, [id]);

  return (
    <PageLayout title={t('template.default')} showBack backPath='/log/es-template'>
      <div>
        <div style={{ padding: '10px' }}>
          <Row justify='space-between'>
            <Col>
              <Space>
                <Input
                  className={'searchInput'}
                  prefix={<SearchOutlined />}
                  placeholder={t('common:table.name')}
                  onPressEnter={(e) => {
                    setFilter({ ...filter, name: (e.target as HTMLInputElement).value });
                  }}
                />
                <Select
                  value={filter?.legacy}
                  style={{ width: '120px' }}
                  allowClear
                  onChange={(e) => setFilter({ ...filter, legacy: e })}
                  placeholder={t('template.version')}
                >
                  <Select.Option value={false} key='new'>
                    {t('template.new')}
                  </Select.Option>
                  <Select.Option value={true} key='old'>
                    {t('template.old')}
                  </Select.Option>
                </Select>
              </Space>
            </Col>
          </Row>
          <Table
            size='small'
            rowKey='id'
            loading={loading}
            columns={columns}
            dataSource={_.filter(list, (item) => {
              return (
                _.upperCase(item.name).indexOf(_.upperCase(filter?.name)) > -1 &&
                (filter?.legacy !== undefined ? item.legacy === filter?.legacy : true)
              );
            })}
            pagination={pagination}
          />
        </div>
      </div>
      <Drawer title={t('template.title')} width={720} onClose={() => setVisible(false)} visible={visible}>
        <Tabs defaultActiveKey='preview' size='small'>
          <Tabs.TabPane tab={t('template.preview')} key='preview'>
            <Typography.Paragraph className='es-default-template'>
              <a className='copy'>
                <CopyOutlined onClick={() => copy2ClipBoard(JSON.stringify(current?.index_template, null, 2))} />
              </a>
              <pre style={{ height: 'calc(100vh - 150px)', margin: 0 }}>
                {JSON.stringify(current?.index_template, null, 2)}
              </pre>
            </Typography.Paragraph>
          </Tabs.TabPane>
        </Tabs>
      </Drawer>
    </PageLayout>
  );
};

export default DefaultTemplate;
