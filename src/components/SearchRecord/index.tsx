import React, { useState } from 'react';
import { Dropdown, Menu, Button, Drawer, Table, Modal, Form, Input, Popconfirm, message, Switch, Space } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { localeCompare } from '@/utils';
import { DownOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import queryString from 'query-string';
import { useHistory, useLocation } from 'react-router-dom';
import { createLogsCustomConfig, updateLogsCustomConfig } from '@/services/logs';

interface IRecordProps {
  curBusiId: number;
  indexed: string;
  customColumn: any;
  searchRecord: { id: number; key: string; target: number; value: any[] };
  refreshSearchRcored: (bgid: number) => void;
}

const SearchRecord: React.FC<IRecordProps> = (props) => {
  const { t } = useTranslation();
  const { curBusiId, indexed, searchRecord, refreshSearchRcored, customColumn } = props;
  const history = useHistory();
  const { search } = useLocation();
  const urlParams = queryString.parse(search) as Record<string, string>;
  const [saveVisible, setSaveVisible] = useState(false);
  const [recordVisible, setRecordVisible] = useState(false);
  const [filter, setFilter] = useState({
    query: '',
  });
  const [form] = Form.useForm();

  const filterData =
    searchRecord?.value?.filter((item) => item.name.toLowerCase().includes(filter.query.toLowerCase())) || [];

  return (
    <>
      <Dropdown
        trigger={['click']}
        overlay={
          <Menu>
            <Menu.Item
              key='create'
              onClick={() => {
                const newParams = urlParams;
                delete newParams.record_name;
                delete newParams.fieldRecord;
                delete newParams.column;
                const initData = {
                  start: 'now-15m',
                  end: 'now',
                  bgid: newParams.bgid,
                  data_id: newParams.data_id,
                  type: newParams.type,
                };
                history.push({
                  pathname: '/log/explorer',
                  search: `?${Object.keys(newParams)
                    .map((key) => {
                      if (initData[key]) {
                        return `${key}=${initData[key]}`;
                      }
                      return `${key}=`;
                    })
                    .join('&')}`,
                });
              }}
            >
              {t('common:btn.new')}
            </Menu.Item>
            <Menu.Item
              key='open'
              onClick={() => {
                setRecordVisible(true);
              }}
            >
              {t('common:btn.open')}
            </Menu.Item>
            <Menu.Item
              key='save'
              onClick={() => {
                // 当前是否处于搜索记录
                setSaveVisible(true);
                if (urlParams.record_name) {
                  const currentRecord = searchRecord!.value.find((item) => item.name === urlParams.record_name) || {
                    name: urlParams.record_name,
                    description: '',
                    new: false,
                  };
                  form.setFieldsValue({ name: currentRecord.name, description: currentRecord.description, new: false });
                } else {
                  form.setFieldsValue({ name: '', description: '', new: false });
                }
              }}
            >
              {t('common:btn.save')}
            </Menu.Item>
          </Menu>
        }
      >
        <Button>
          {t('common:search_record')}
          <DownOutlined />
        </Button>
      </Dropdown>
      <Drawer
        width='50%'
        title={t('common:open_seach')}
        placement='right'
        onClose={() => setRecordVisible(false)}
        visible={recordVisible}
      >
        <Input
          prefix={<SearchOutlined />}
          value={filter.query}
          onChange={(e) => {
            setFilter({ ...filter, query: e.target.value });
          }}
          placeholder={t('common:search_placeholder')}
          allowClear
          style={{ marginBottom: '10px' }}
        />
        <Table
          size='small'
          tableLayout='fixed'
          columns={[
            {
              title: t('common:table.title'),
              width: 200,
              dataIndex: 'name',
              render: (val, record) => (
                <a
                  onClick={() => {
                    const newParams = Object.entries({
                      ...record.search,
                      record_name: val,
                      column: record.search.column,
                    }).map(([key, value]) => `${key}=${value ?? urlParams[key]}`);
                    setRecordVisible(false);
                    history.push({
                      pathname: '/log/explorer',
                      search: `?${Object.values(newParams).join('&')}`,
                    });
                  }}
                >
                  {val}
                </a>
              ),
              sorter: (a, b) => localeCompare(a.name, b.name),
            },
            {
              title: t('common:table.description'),
              dataIndex: 'description',
              render: (val) => <pre>{val}</pre>,
            },
            {
              title: t('common:table.update_at'),
              dataIndex: 'update_at',
              width: 150,
              sorter: (a, b) => localeCompare(a.update_at ?? 0, b.update_at ?? 0),
              render: (text: string) => {
                return (
                  <div className='table-text'>
                    {text ? moment.unix(Number(text)).format('YYYY-MM-DD HH:mm:ss') : '-'}
                  </div>
                );
              },
            },
            {
              title: t('common:table.operations'),
              dataIndex: 'operator',
              width: 50,
              render: (val, data) => (
                <Popconfirm
                  title={t('common:confirm.delete')}
                  placement='left'
                  onConfirm={() => {
                    const newValue = searchRecord!.value.filter((item) => item.name !== data.name);
                    updateLogsCustomConfig({
                      id: searchRecord!.id,
                      key: 'g_log_search',
                      target: curBusiId,
                      value: JSON.stringify(newValue),
                    }).then((res) => {
                      refreshSearchRcored(curBusiId);
                      message.success(t('common:success.delete'));
                    });
                  }}
                >
                  <a style={{ color: 'red' }}>{t('common:btn.delete')}</a>
                </Popconfirm>
              ),
            },
          ]}
          dataSource={filterData}
          pagination={{
            total: filterData.length,
            showSizeChanger: true,
            showTotal: (total) => {
              return t('common:table.total', { total });
            },
            pageSizeOptions: ['15', '50', '100', '300'],
            defaultPageSize: 30,
          }}
          scroll={{ y: 'calc(100vh - 220px)' }}
        />
      </Drawer>
      <Modal
        title={t('common:save_search')}
        destroyOnClose
        maskClosable={false}
        closable={false}
        visible={saveVisible}
        footer={[
          <Button
            key='back'
            onClick={() => {
              setSaveVisible(false);
            }}
          >
            {t('common:btn.cancel')}
          </Button>,
          <Button
            key='submit'
            type='primary'
            onClick={() => {
              form.validateFields().then((values) => {
                const searchValue: any = {
                  ...urlParams,
                  column: urlParams.column || customColumn?.value?.[indexed] || [],
                };
                delete searchValue.record_name;
                const data = {
                  name: values.name,
                  description: values.description,
                  indexed,
                  update_at: moment().unix(),
                  search: searchValue,
                };
                if (searchRecord) {
                  let newValue: any[] = [...searchRecord.value];
                  if (values.new !== false) {
                    // 新增
                    newValue = [...searchRecord.value, data];
                  } else {
                    // 修改
                    const index = searchRecord.value.findIndex((item) => item.name === urlParams.record_name);
                    newValue[index] = data;
                  }
                  if (newValue.length > 100) {
                    message.error(t('common:record_over_line'));
                    return null;
                  } else {
                    updateLogsCustomConfig({
                      id: searchRecord.id,
                      key: 'g_log_search',
                      target: curBusiId,
                      value: JSON.stringify(newValue),
                    }).then((res) => {
                      setSaveVisible(false);
                      message.success(t('common:success.save'));
                      refreshSearchRcored(curBusiId);
                    });
                  }
                } else {
                  const requestParams = {
                    key: 'g_log_search',
                    target: curBusiId,
                    value: JSON.stringify([data]),
                  };
                  createLogsCustomConfig(requestParams).then((res) => {
                    setSaveVisible(false);
                    message.success(t('common:success.save'));
                    refreshSearchRcored(curBusiId);
                  });
                }
                // 更新路由
                history.push({
                  pathname: '/log/explorer',
                  search: `?${Object.entries(searchValue)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('&')}&record_name=${values.name}`,
                });
              });
            }}
          >
            {t('common:btn.save')}
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout='vertical'
          labelCol={{
            span: 3,
          }}
        >
          <Form.Item
            name='name'
            label={t('common:table.title')}
            dependencies={['new']}
            rules={[
              { required: true },
              {
                validator: (_, value) => {
                  const newSearch = form.getFieldValue('new');
                  const nameList = searchRecord?.value?.map((item) => item.name) || [];
                  if (value && (newSearch === undefined || newSearch === true) && nameList.includes(value)) {
                    // 当前不处于搜索记录中或 处于搜索记录中且另存为新的搜索
                    return Promise.reject(t('common:already_exists'));
                  } else if (
                    value &&
                    newSearch === false &&
                    nameList.filter((item) => item !== urlParams.record_name).includes(value)
                  ) {
                    // 当前处于搜索记录中且不另存为新的搜索
                    return Promise.reject(t('common:already_exists'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name='description' label={t('common:table.description')}>
            <Input.TextArea />
          </Form.Item>
          {urlParams.record_name && searchRecord?.value?.find((item) => item.name === urlParams.record_name) && (
            <Space>
              <Form.Item name='new' valuePropName='checked' noStyle>
                <Switch
                  onChange={(checked) => {
                    const name = form.getFieldValue('name');
                    const nameList = searchRecord?.value?.map((item) => item.name) || [];
                    // 开启，name不能和列表中的重复
                    // 关闭，name不能和列表中的重复，除自己外
                    if (
                      (checked && nameList.includes(name)) ||
                      (!checked && nameList.filter((item) => item !== name).includes(name))
                    ) {
                      form.setFields([
                        {
                          name: 'name',
                          errors: [t('common:already_exists')],
                        },
                      ]);
                    } else {
                      form.setFields([
                        {
                          name: 'name',
                          errors: [],
                        },
                      ]);
                    }
                  }}
                />
              </Form.Item>
              {t('common:save_as')}
            </Space>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default SearchRecord;
