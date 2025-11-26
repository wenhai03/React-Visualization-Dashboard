import React, { useState, useContext, useEffect } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { Table, Space, Button, Row, Col, Select, message, Modal, Input, Tooltip, Form, Tag, Drawer } from 'antd';
import { SearchOutlined, CheckOutlined, TableOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAntdTable } from 'ahooks';
import { CommonStateContext } from '@/App';
import { useHistory } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { json } from '@codemirror/lang-json';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import EmptyDatasourcePopover from '@/components/DatasourceSelect/EmptyDatasourcePopover';
import { getTemplate, createTemplate, updateTemplate, deleteTemplate } from '@/services/esTemplate';
import { useTranslation } from 'react-i18next';
import '../locale';

const ESTemplate: React.FC = () => {
  const { t } = useTranslation('logs');
  const history = useHistory();
  const [form] = Form.useForm();
  const { groupedDatasourceList, curBusiId, curBusiGroup, profile } = useContext(CommonStateContext);
  const [selectRowKeys, setSelectRowKeys] = useState<number[]>([]);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [filter, setFilter] = useState<{ query?: string; datasource_id?: number; legacy?: boolean }>();
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const pagination = usePagination({ PAGESIZE_KEY: 'es-template-list' });
  const [requestParams, setRequestParams] = useState({
    current: 1,
    pageSize: pagination.pageSize,
  });
  const columns = [
    {
      title: t('common:table.name'),
      dataIndex: 'name',
      width: 360,
      render: (val, record) => (
        <a
          onClick={() => {
            setVisible(true);
            setMode('edit');
            form.setFieldsValue(record);
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
      dataIndex: 'index_patterns',
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
              maxWidth: 360,
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
      title: t('common:table.update_at'),
      dataIndex: 'update_at',
      width: 150,
      render: (val) => {
        return val ? moment.unix(Number(val)).format('YYYY-MM-DD HH:mm:ss') : '-';
      },
    },
    {
      title: t('template.data_stream'),
      dataIndex: 'data_stream',
      width: 80,
      render: (val) => (val ? <CheckOutlined /> : ''),
    },
    {
      title: t('common:table.operations'),
      key: 'action',
      width: 120,
      render: (text, record) =>
        curBusiGroup.perm === 'rw' && (
          <Space size='middle'>
            <a
              onClick={() => {
                setVisible(true);
                setMode('edit');
                form.setFieldsValue(record);
              }}
            >
              {t('common:btn.modify')}
            </a>
            <a onClick={() => history.push(`/log/es-template/rollover/${record.id}`)}>{t('template.roll')}</a>
            <a
              style={{ color: 'red' }}
              onClick={() =>
                Modal.confirm({
                  title: t('common:confirm.delete'),
                  okText: t('common:btn.ok'),
                  cancelText: t('common:btn.cancel'),
                  onOk: () => handleDelete({ ids: [record.id] }),
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

  const handleDelete = (params) => {
    deleteTemplate(params).then((res) => {
      setRefreshFlag(_.uniqueId('refreshFlag_'));
      message.success(t('common:success.delete'));
    });
  };

  const featchData = ({ current, pageSize }: { current: number; pageSize: number }): Promise<any> => {
    const params = {
      group_id: curBusiId,
      limit: pageSize,
      p: current,
      ...filter,
    };
    return getTemplate(params).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };

  const { tableProps, run } = useAntdTable(featchData, {
    defaultPageSize: pagination.pageSize,
    manual: true,
  });

  useEffect(() => {
    if (filter?.datasource_id) {
      run(requestParams);
    }
  }, [filter, curBusiId, refreshFlag, JSON.stringify(requestParams)]);

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        if (mode === 'add') {
          createTemplate({ ...values, group_id: curBusiId, datasource_id: filter!.datasource_id }).then(() => {
            setVisible(false);
            setRefreshFlag(_.uniqueId('refresh_'));
            message.success(t('common:success.edit'));
            form.resetFields();
          });
        } else {
          updateTemplate({ ...values, group_id: curBusiId }).then(() => {
            setVisible(false);
            setRefreshFlag(_.uniqueId('refresh_'));
            message.success(t('common:success.edit'));
            form.resetFields();
          });
        }
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  useEffect(() => {
    if (groupedDatasourceList?.elasticsearch) {
      setFilter({ ...filter, datasource_id: groupedDatasourceList.elasticsearch[0].id });
    } else {
      setFilter({ ...filter, datasource_id: undefined });
    }
  }, [groupedDatasourceList]);

  return (
    <PageLayout title={t('template.title')} icon={<TableOutlined />}>
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
                <EmptyDatasourcePopover datasourceList={groupedDatasourceList?.elasticsearch}>
                  <Select
                    style={{ minWidth: 70 }}
                    value={filter?.datasource_id}
                    dropdownMatchSelectWidth={false}
                    onChange={(e) => setFilter({ ...filter, datasource_id: e })}
                    placeholder={t('common:datasource.name')}
                    optionFilterProp='children'
                  >
                    {_.map(groupedDatasourceList?.elasticsearch, (item) => (
                      <Select.Option value={item.id} key={item.id}>
                        {item.name}
                      </Select.Option>
                    ))}
                  </Select>
                </EmptyDatasourcePopover>
                <Input
                  className={'searchInput'}
                  prefix={<SearchOutlined />}
                  placeholder={t('common:table.name')}
                  onPressEnter={(e) => {
                    setFilter({ ...filter, query: (e.target as HTMLInputElement).value });
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
            <Col>
              <Space>
                {profile?.admin && (
                  <Button
                    onClick={() => history.push(`/log/es-template/default/${filter?.datasource_id}`)}
                    disabled={!filter?.datasource_id}
                  >
                    {t('template.default')}
                  </Button>
                )}
                {curBusiGroup.perm === 'rw' && (
                  <>
                    <Button
                      type='primary'
                      onClick={() => {
                        setVisible(true);
                        setMode('add');
                      }}
                      disabled={!filter?.datasource_id}
                    >
                      {t('common:btn.add')}
                    </Button>
                    <Button disabled={!selectRowKeys.length} onClick={() => handleDelete({ ids: selectRowKeys })}>
                      {t('common:btn.batch_delete')}
                    </Button>
                  </>
                )}
              </Space>
            </Col>
          </Row>
          <Table
            size='small'
            rowKey='id'
            columns={columns}
            {...tableProps}
            pagination={pagination}
            rowSelection={{
              selectedRowKeys: selectRowKeys,
              onChange: (selectedRowKeys: number[]) => {
                setSelectRowKeys(selectedRowKeys);
              },
            }}
            onChange={(pagination) => {
              setRequestParams({
                current: pagination.current!,
                pageSize: pagination.pageSize!,
              });
            }}
          />
        </div>
      </div>
      <Drawer
        title={t('template.title')}
        width={720}
        onClose={() => {
          setVisible(false);
          form.resetFields();
        }}
        visible={visible}
        maskClosable={false}
        footer={
          <Space style={{ float: 'right' }}>
            <Button
              onClick={() => {
                setVisible(false);
                form.resetFields();
              }}
            >
              {t('common:btn.cancel')}
            </Button>
            <Button onClick={handleOk} type='primary'>
              {t('common:btn.save')}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout='vertical'>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={t('common:table.name')} name='name' rules={[{ required: true }]}>
                <Input disabled={mode === 'edit'} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('template.version')} name='legacy' rules={[{ required: true }]}>
                <Select disabled={mode === 'edit'}>
                  <Select.Option value={false} key='new'>
                    {t('template.new')}
                  </Select.Option>
                  <Select.Option value={true} key='old'>
                    {t('template.old')}
                  </Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name='id' hidden>
            <div />
          </Form.Item>
          <Form.Item label={t('template.content')} name='content' rules={[{ required: true }]}>
            <CodeMirror
              height='calc(100vh - 265px)'
              theme='light'
              basicSetup
              editable
              extensions={[
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                json(),
                EditorView.lineWrapping,
                EditorView.theme({
                  '&': {
                    backgroundColor: '#F6F6F6 !important',
                  },
                  '&.cm-editor.cm-focused': {
                    outline: 'unset',
                  },
                }),
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </PageLayout>
  );
};

export default ESTemplate;
