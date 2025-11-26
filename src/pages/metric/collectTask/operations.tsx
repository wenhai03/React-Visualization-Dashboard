import React, { useEffect, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import {
  Form,
  Space,
  Button,
  Table,
  message,
  Tooltip,
  Select,
  Tag,
  Modal,
  Input,
  Typography,
  Card,
  Checkbox,
  Row,
  Col,
  Spin,
  Switch,
  Popconfirm,
} from 'antd';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import queryString from 'query-string';
import { PlusCircleOutlined } from '@ant-design/icons';
import { useHistory, useLocation, Link } from 'react-router-dom';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import { StreamLanguage } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { createAgentSettings } from '@/services/agent';
import { getMonObjectList } from '@/services/targets';
import {
  updateMetricsInputTask,
  getMetricsInputTasks,
  getPublicTargets,
  getMetricsInputTaskDetail,
  checkMetricsTask,
} from '@/services/metric';
import './index.less';
import '../locale';

// 支持运行在云上的指标
const ON_CLOUD_METRIC = [
  'aliyun',
  'appdynamics',
  'clickhouse',
  'cloudwatch',
  'consul',
  'docker',
  'elasticsearch',
  'haproxy',
  'jenkins',
  'jolokia_agent',
  'kafka',
  'kubernetes',
  'logstash',
  'mongodb',
  'mysql',
  'nginx',
  'nginx_upstream_check',
  'nsq',
  'ntp',
  'oracle',
  'phpfpm',
  'postgresql',
  'prometheus',
  'rabbitmq',
  'redis',
  'redis_sentinel',
  'redfish',
  'snmp',
  'sqlserver',
  'switch_legacy',
  'tomcat',
  'vsphere',
  'xskyapi',
  'zookeeper',
];

const getCentent = (name, content) => {
  return `apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: demo-xxxx
  spec:
    selector:
      matchLabels:
        app: demo-xxxx
    replicas: 1
    template:
      metadata:
        annotations:
          # 重要标识，APM服务名，中间件也要命名
          cndgraf/tags.service_name: demo-xxxx
          cndgraf/tags.service_environment: prod
          # 具体指标采集配置
          cndgraf/input.${name.replace('metrics:', '')}:
  ${content
    .replace(/^/gm, ' '.repeat(10))
    .replace(/^\s*[\r\n]+|[\r\n]+\s*$/g, '')
    .replace(/\n\s*\n/g, '\n')}  
        labels:
          app: demo-xxxx
      spec:
        containers:
        - name: demo-xxxx
          image: ****
  ... `;
};

export default function Operations() {
  const history = useHistory();
  const { search } = useLocation();
  const { name } = queryString.parse(search) as { name: string };
  const { t } = useTranslation('metric');
  const [metricList, setMetricList] = useState<{ category: string; content: string }[] | []>([]);
  const [selectedMetric, setSelectedMetric] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit' | undefined>();
  const [defaultName, setDefaultName] = useState<string>('');
  const [tableData, setTableData] = useState<any>([]);
  const [hostList, setHostList] = useState<any>([]);
  const [publicList, setPublicList] = useState([]);
  const [visible, setVisible] = useState(false);
  const [containerVisible, setContainerVisible] = useState(false);
  const { curBusiId, curBusiGroup, profile } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const [configForm] = Form.useForm();
  const rtList = {
    pm: t('common:physical_machine'),
    vm: t('common:virtual_machine'),
    ct: 'Docker',
    'ct-k8s': t('common:kubernetes'),
  };
  const osList = ['windows', 'linux'];
  const columns = [
    {
      title: t('input_task.type'),
      dataIndex: 'mode',
      width: 120,
      render: (val) => t(`input_task.type_${val}`),
    },
    {
      title: t('overview.relevance_host'),
      dataIndex: ['config', 'idents'],
      width: 360,
      ellipsis: {
        showTitle: false,
      },
      render: (val, record) => {
        const rt = record.config.rt?.map((item) => rtList[item] ?? item);
        const value =
          record.mode === 3
            ? val ?? []
            : record.mode === 4
            ? record.config.public_tags ?? []
            : record.mode === 6
            ? [...(record.config.os ?? []), ...(rt ?? []), ...(val ?? [])]
            : [...(record.config.os ?? []), ...(rt ?? [])];
        const tagList = value?.map((item) => (
          <Tag color='blue' key={item}>
            {item}
          </Tag>
        ));
        return value && value.length ? (
          <Tooltip
            placement='topLeft'
            title={<Space wrap>{tagList}</Space>}
            overlayClassName='metrics-tooltip-content'
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
      title: t('input_task.note'),
      dataIndex: ['config', 'note'],
      width: 300,
    },
    {
      title: t('overview.config_content'),
      dataIndex: ['config', 'content'],
      ellipsis: {
        showTitle: false,
      },
      render: (val, { config }) => (
        <>
          <Tooltip
            placement='topLeft'
            overlayClassName='metrics-tooltip-content'
            title={<pre style={{ overflow: 'initial' }}>{val}</pre>}
            overlayInnerStyle={{
              maxWidth: 600,
              maxHeight: 400,
              width: 'max-content',
              height: 'max-content',
              overflow: 'auto',
            }}
          >
            {val}
          </Tooltip>
          {config.tags && (
            <div>
              {Object.entries(config.tags).map(([key, value]) => (
                <Tag color='orange' key={key}>
                  {key}:{value}
                </Tag>
              ))}
            </div>
          )}
        </>
      ),
    },
    ...(curBusiGroup.perm === 'rw'
      ? [
          {
            title: t('common:table.operations'),
            dataIndex: 'operate',
            width: 140,
            render(value, record) {
              return (
                <Space>
                  <Tooltip title={record.mode === 6 ? t('input_task.operations_tip') : ''}>
                    <Switch
                      disabled={record.mode === 6}
                      checkedChildren={t('common:table.enabled')}
                      unCheckedChildren={t('common:table.disabled')}
                      checked={record.disabled ? false : true}
                      onChange={(checked) => {
                        const data = tableData.map((item) =>
                          item.id === record.id ? { ...item, disabled: checked ? 0 : 1 } : item,
                        );
                        form.setFieldsValue({ config_list: data });
                        setTableData(data);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title={record.mode === 6 ? t('input_task.operations_tip') : ''}>
                    <Button
                      disabled={record.mode === 6}
                      type='link'
                      size='small'
                      style={{ padding: 0 }}
                      onClick={() => {
                        setVisible(true), configForm.setFieldsValue(record);
                      }}
                    >
                      {t('common:btn.edit')}
                    </Button>
                  </Tooltip>
                  <Tooltip title={record.mode === 6 && !profile.admin ? t('input_task.operations_tip') : ''}>
                    <Button
                      disabled={record.mode === 6 && !profile.admin}
                      type='link'
                      size='small'
                      danger
                      style={{ padding: 0 }}
                      onClick={() => {
                        const result = tableData.filter((item) => {
                          return item.key !== record.key;
                        });
                        form.setFieldsValue({ config_list: result });
                        setTableData(result);
                      }}
                    >
                      {t('common:btn.delete')}
                    </Button>
                  </Tooltip>
                </Space>
              );
            },
          },
        ]
      : []),
  ];

  // 获取采集器标签列表
  const getPublicList = () => {
    getPublicTargets().then((res) => {
      setPublicList(res.dat);
    });
  };

  const handleCreate = (type) => {
    if (type === 'cloud') {
      getPublicList();
    }
    const content = metricList.filter((item: any) => item.category === defaultName)?.[0]?.content;
    const initialValues =
      type === 'cloud'
        ? { mode: 4, disabled: 0, config: { public_tags: [], content: '', single_run: true } }
        : { mode: 2, disabled: 0, config: { os: [], rt: [], content } };
    configForm.setFieldsValue(initialValues);
    // TODO 创建 on cloud ,编辑器行号错乱,怀疑渲染问题,暂时用此方法延迟渲染
    if (type === 'cloud') {
      setTimeout(() => configForm.setFieldsValue({ config: { content } }), 300);
    }
    setVisible(true);
  };

  useEffect(() => {
    if (name) {
      setLoading(true);
      getMetricsInputTaskDetail(curBusiId, name)
        .then((res) => {
          if (res.dat) {
            form.setFieldsValue(res.dat);
            // 赋予唯一值 key
            const data = res.dat.config_list.map((item, index) => ({ ...item, key: index }));
            setTableData(data);
            setDefaultName(res.dat.name);
            setMode('edit');
          } else {
            setMode('add');
          }
          setLoading(false);
        })
        .catch((err) => setLoading(false));
    } else {
      setMode('add');
    }
  }, [search]);

  useEffect(() => {
    if (mode) {
      const requests = [
        // 所有指标项
        createAgentSettings({ category: 'metrics:*,global', showDefaultContent: true }).catch((err) => {}),
        // 获取指标采集任务列表（已选择的项）
        getMetricsInputTasks({ bgid: curBusiId, limit: 2000, p: 1 }).catch((err) => {}),
        getMonObjectList({ limit: -1, bgid: curBusiId }).catch((err) => {}),
      ];

      Promise.all(requests).then(([metricList, selectedMetric, monObjectList]) => {
        const selectedList = selectedMetric.dat.list.map((item) => item.name);
        setMetricList(metricList.dat);
        setSelectedMetric(selectedList);
        setHostList(
          _.map(monObjectList?.dat?.list || [], (item) => {
            return {
              id: item.ident,
              name: item.ident,
            };
          }),
        );
        if (mode === 'add') {
          const filterFirst = metricList.dat.find((item: any) => !selectedList.includes(item.category));
          form.setFieldsValue({ name: filterFirst.category });
          setDefaultName(filterFirst.category);
        }
      });
    }
  }, [mode]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      updateMetricsInputTask(curBusiId, values.name, values).then(() => {
        message.success(t('common:success.save'));
        history.push('/metric/input-task');
      });
    });
  };

  const handleOk = () => {
    const metricName = form.getFieldValue('name');
    configForm.validateFields().then(async (values) => {
      let checkState = true;
      if (metricName === 'metrics:exec') {
        const data = await checkMetricsTask({ category: metricName, content: values.config.content }).catch(
          () => false,
        );
        checkState = data?.success;
      }
      if (checkState) {
        if (values.key !== undefined) {
          // 编辑
          const data = tableData.map((item) => (item.key === values.key ? { ...item, ...values } : item));
          form.setFieldsValue({ config_list: data });
          setTableData(data);
        } else {
          // 新增
          form.setFieldsValue({ config_list: [...tableData, { ...values }] });
          setTableData([...tableData, { ...values, key: tableData.length }]);
        }
        configForm.resetFields();
        setVisible(false);
      }
    });
  };

  return (
    <PageLayout title={t('input_task.title')} showBack backPath='/metric/input-task'>
      <Spin spinning={loading}>
        <div className='input-task-form'>
          <Form form={form} layout='vertical' disabled={curBusiGroup.perm === 'ro'}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={
                    <>
                      {t('overview.metric_name')}（{t('input_task.metric_name_tip')}
                      <Link to='/docs/reference/metric/gathers' target='_blank'>
                        {t('input_task.can_be_collected')}
                      </Link>
                      ）
                    </>
                  }
                  name='name'
                  rules={[
                    {
                      required: true,
                    },
                  ]}
                >
                  <Select
                    disabled={mode === 'edit'}
                    style={{ maxWidth: '400px ' }}
                    showSearch
                    optionFilterProp='children'
                    onChange={(val) => {
                      setDefaultName(val);
                      form.setFieldsValue({ config_list: [] });
                      setTableData([]);
                    }}
                  >
                    {metricList.map((item: { category: string }) => (
                      <Select.Option
                        disabled={selectedMetric.includes(item.category)}
                        key={item.category}
                        value={item.category}
                      >
                        {item.category.replace('metrics:', '')}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Card
              size='small'
              bodyStyle={{ paddingTop: '2px' }}
              title={
                <Space align='baseline'>
                  {t('input_task.collect_object')}
                  <Button disabled={curBusiGroup.perm === 'ro'} onClick={() => handleCreate('host')} size='small'>
                    {t('input_task.on_host')} <PlusCircleOutlined className='control-icon-normal' />
                  </Button>
                  <Button onClick={() => setContainerVisible(true)} size='small'>
                    {t('input_task.on_container')}
                  </Button>
                  <Tooltip
                    title={
                      ON_CLOUD_METRIC.includes(defaultName.replace('metrics:', ''))
                        ? null
                        : t('input_task.on_cloud_tip')
                    }
                  >
                    <Button
                      size='small'
                      onClick={() => handleCreate('cloud')}
                      disabled={
                        curBusiGroup.perm === 'ro' || !ON_CLOUD_METRIC.includes(defaultName.replace('metrics:', ''))
                      }
                    >
                      {t('input_task.on_cloud')}
                    </Button>
                  </Tooltip>
                  <Tooltip
                    title={<pre style={{ margin: 0 }}>{t('input_task.choose_from_tip')}</pre>}
                    overlayInnerStyle={{ width: '420px' }}
                  >
                    <span style={{ cursor: 'help', borderBottom: '1px dashed #ccc', fontStyle: 'italic' }}>
                      {t('input_task.choose_from')}
                    </span>
                  </Tooltip>
                </Space>
              }
            >
              <Table
                size='small'
                rowKey='id'
                columns={columns}
                dataSource={tableData}
                pagination={false}
                scroll={{ y: 'calc(100vh - 328px)' }}
              />
            </Card>
            <Form.Item
              className='input-task-form-item'
              name='config_list'
              rules={[
                {
                  required: mode === 'add' ? true : false,
                  message: t('input_task.config_list_tip'),
                },
              ]}
            >
              <div />
            </Form.Item>
            {curBusiGroup.perm === 'rw' && (
              <Form.Item>
                <Space>
                  {mode === 'edit' && !tableData.length ? (
                    <Popconfirm
                      title={<div style={{ width: 142 }}>{t('input_task.delete_tip')}</div>}
                      onConfirm={handleSubmit}
                    >
                      <Button type='primary'>{t('common:btn.save')}</Button>
                    </Popconfirm>
                  ) : (
                    <Button type='primary' onClick={handleSubmit}>
                      {t('common:btn.save')}
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      history.push('/metric/input-task');
                    }}
                  >
                    {t('common:btn.cancel')}
                  </Button>
                </Space>
              </Form.Item>
            )}
          </Form>
        </div>
        <Modal
          title={t('input_task.config_detail')}
          visible={visible}
          width={1000}
          onOk={handleOk}
          maskClosable={false}
          onCancel={() => {
            configForm.resetFields();
            setVisible(false);
          }}
          centered
        >
          <Form form={configForm} labelAlign='right' labelCol={{ span: 4 }}>
            <Form.Item name='key' hidden>
              <div />
            </Form.Item>
            <Form.Item name='id' hidden>
              <Input />
            </Form.Item>
            <Form.Item name='disabled' hidden>
              <div />
            </Form.Item>
            <Form.Item name={['config', 'paas_id']} hidden>
              <div />
            </Form.Item>
            <Form.Item shouldUpdate={(prevValues, curValues) => !_.isEqual(prevValues.mode, curValues.mode)} noStyle>
              {({ getFieldValue }) => {
                const type = getFieldValue('mode');
                return (
                  <>
                    <Row>
                      <Col span={12}>
                        <Form.Item
                          label={t('input_task.type')}
                          name='mode'
                          tooltip={
                            type !== 4 && (
                              <pre className='input-task-form-type-pre'>
                                {`${curBusiGroup?.extra?.super ? `${t('input_task.type_1')}、` : ''}${t(
                                  'input_task.type_tip',
                                )}`}
                              </pre>
                            )
                          }
                        >
                          <Select>
                            {type === 4 ? (
                              <Select.Option key='4' value={4}>
                                {t('input_task.type_4')}
                              </Select.Option>
                            ) : (
                              <>
                                {curBusiGroup?.extra?.super && (
                                  <Select.Option key='1' value={1}>
                                    {t('input_task.type_1')}
                                  </Select.Option>
                                )}
                                <Select.Option key='2' value={2}>
                                  {t('input_task.type_2')}
                                </Select.Option>
                                <Select.Option key='3' value={3}>
                                  {t('input_task.type_3')}
                                </Select.Option>
                              </>
                            )}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        {type === 4 && (
                          // 暂时不开放
                          <Form.Item
                            name={['config', 'single_run']}
                            valuePropName='checked'
                            tooltip='标签对应多台采集器的情况下，是否只选择一台机器运行'
                            label='是否单机运行'
                            labelCol={{ span: 6 }}
                            hidden
                          >
                            <Checkbox disabled={curBusiGroup.perm === 'ro'}></Checkbox>
                          </Form.Item>
                        )}
                      </Col>
                      {type === 3 ? (
                        <Col span={24}>
                          <Form.Item
                            label={t('input_task.host')}
                            labelCol={{ span: 2 }}
                            name={['config', 'idents']}
                            rules={[
                              {
                                required: true,
                              },
                            ]}
                          >
                            <Select mode='multiple' allowClear maxTagCount={5}>
                              {_.map(hostList, (item) => {
                                return (
                                  <Select.Option key={item.id} value={item.id}>
                                    {item.name}
                                  </Select.Option>
                                );
                              })}
                            </Select>
                          </Form.Item>
                        </Col>
                      ) : type === 4 ? (
                        <Col span={24}>
                          <Form.Item
                            label={t('input_task.collector_tag')}
                            name={['config', 'public_tags']}
                            labelCol={{ span: 2 }}
                            extra={t('input_task.collector_tag_tip')}
                            rules={[
                              {
                                required: true,
                              },
                            ]}
                          >
                            <Select mode='multiple' allowClear>
                              {publicList.map((item) => (
                                <Select.Option key={item} value={item}>
                                  {item}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                      ) : (
                        <>
                          <Col span={12}>
                            <Form.Item label={t('input_task.rt')} name={['config', 'rt']}>
                              <Select mode='multiple' allowClear placeholder={t('input_task.rt_placeholder')}>
                                {Object.entries(rtList).map(([key, value]) => (
                                  <Select.Option key={key} value={key}>
                                    {value}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label={t('input_task.os')} name={['config', 'os']}>
                              <Select mode='multiple' allowClear placeholder={t('input_task.os_placeholder')}>
                                {osList.map((item) => (
                                  <Select.Option key={item} value={item}>
                                    {item}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                        </>
                      )}
                      <Col span={24}>
                        <Form.Item labelCol={{ span: 2 }} label={t('input_task.note')} name={['config', 'note']}>
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                );
              }}
            </Form.Item>
            <Col span={24}>
              <Form.Item
                label={t('overview.config_content')}
                labelCol={{ span: 2 }}
                name={['config', 'content']}
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <CodeMirror
                  className='metric-task-code-mirror'
                  theme='light'
                  basicSetup
                  editable
                  extensions={[
                    EditorView.lineWrapping,
                    StreamLanguage.define(toml),
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
            </Col>
          </Form>
        </Modal>
        <Modal
          width={800}
          visible={containerVisible}
          title={t('input_task.on_container')}
          footer={[
            <Button key='submit' type='primary' onClick={() => setContainerVisible(false)}>
              {t('common:btn.know')}
            </Button>,
          ]}
          centered
          onCancel={() => setContainerVisible(false)}
        >
          <Typography.Paragraph>
            要采集容器内应用的业务指标，可通过标记POD的annotations或Docker的labels实现，例如（关注
            <Typography.Text mark>cndgraf/*</Typography.Text>部分）：
          </Typography.Paragraph>
          <Typography.Paragraph>
            <pre className='metric-task-on-container'>
              {containerVisible &&
                getCentent(defaultName, metricList.filter((item: any) => item.category === defaultName)?.[0]?.content)}
            </pre>
          </Typography.Paragraph>
        </Modal>
      </Spin>
    </PageLayout>
  );
}
