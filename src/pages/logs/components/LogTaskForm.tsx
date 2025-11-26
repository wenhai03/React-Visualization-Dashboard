import React, { useEffect, useState, useContext, useRef } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { copy2ClipBoard } from '@/utils';
import { CommonStateContext } from '@/App';
import {
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Select,
  Row,
  Col,
  Card,
  Tooltip,
  Modal,
  Typography,
  Table,
  Radio,
  Tag,
  Alert,
  message,
  Switch,
  Dropdown,
  Menu,
} from 'antd';
import {
  PlusCircleOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  LinkOutlined,
  WarningOutlined,
  FormOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { groovy } from '@codemirror/legacy-modes/mode/groovy';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { StreamLanguage } from '@codemirror/language';
import { getDatasourceBriefList } from '@/services/common';
import { logTaskDefaultConfig, TomlCheck, TomlConvert, getVectorValidate } from '@/services/logstash';
import type { Datasource } from '@/App';
import CollectForm from './CollectForm';
import ProcessingRule from './ProcessingRule';
import '../task/index.less';

const { Text } = Typography;

interface IProps {
  initialValues?: {
    ident_list: any;
    public_task: any;
    id: number;
    deleted?: boolean; // 日志采集任务列表删除有延迟，通过后端给的标识判定
    status: number;
    item_public_rules: any;
    processor: 1 | 2;
    template_code: string;
  };
  onSubmit: (values, back?: boolean) => void;
  mode: 'add' | 'edit';
  groupId: number;
}

interface ITemplates {
  logstash_templates: { name: string; config: string }[];
  vector_templates: { name: string; config: string }[];
}

interface ISelectTemplates {
  name: string;
  config: string;
  note: string;
  code: string;
}

const defaultValue = {
  status: -1,
  filter: '',
  workers: 1,
  batch_size: 125,
  batch_delay: 50,
  auto_multi_line_detection: false,
  public: 0,
  processor: 2,
  datasource_id: '',
  ident_list: [],
};

const FORM_DOCKER_CONTENT = `apiVersion: apps/v1
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
        # 重要标识，APM服务名
        cndgraf/tags.service_name: demo-xxxx
        cndgraf/tags.service_environment: prod
        cndgraf/logs.items: |
          [[logs.items]]
          enable = true # 是否启用
          type = 'file' # 采集类型 file: 查找宿主机文件，因此要将容器的日志目录映射到宿主机上； container_file: 查找容器内文件, 按照 docker inspect 中的 Mount、UpperDir 路径进行查找
          container_name = "" # type: container_file 时生效， 匹配的容器名称，k8s pod中存在多个容器的情况下，可指定具体的容器，默认全部查找
          path = '/some/dir/*.log' # 日志文件路径，会根据 type 类型不同而查找不同的路径 
          topic = 'xxxx' # kafka的topic
          #encoding = 'GB18030' # 编码规则，默认UTF8
          #exclude_paths = ['/some/dir/a.log'] # 排除文件路径数组
          [logs.items.fields] # 额外字段，可自由定义，类似filebeat的fields
          service_name = 'demo-xxxx' # 关联APM服务名
          service_environment = 'prod'
          type = 'xxx'
          [[logs.items.log_processing_rules]] # 选填，可按需定义
          type = 'multi_line' # 自动合并多行，更多规则参考任务配置页
          name = 'multi_line-0'
          pattern = '^\\d+-\\d+-\\d+ \\d+:\\d+:\\d+((,|\\.)\\d+)?' # 如果日志不是以 yyyy-MM-dd HH:mm:ss.SSS 开头，则自动合并到上一行
      labels:
        app: demo-xxxx
    spec:
      containers:
      - name: demo-xxxx
        image: ****
... `;
const LogTaskForm: React.FC<IProps> = (props) => {
  const { t } = useTranslation('logs');
  const { profile, curBusiGroup } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const [checkForm] = Form.useForm();
  const { onSubmit, initialValues, mode, groupId } = props;
  // 采集容器内的应用日志
  const [visible, setVisible] = useState(false);
  // 采集服务器文件
  const [collectVisible, setCollectVisible] = useState(false);
  // 日志采集明细toml配置内容校验
  const [checkVisible, setCheckVisible] = useState(false);
  // 新手配置工具
  const [beginnerVisible, setBeginnerVisible] = useState(false);
  // 公共处理规则
  const [commonRuleVisible, setCommonRuleVisible] = useState(false);
  // 校验结果
  const [checkResult, setCheckResult] = useState();
  const collectRef = useRef<any>(null);
  const beginnerRef = useRef<any>(null);
  const [beginnerConfigRes, setBeginnerConfigRes] = useState();
  const [templateVisible, setTemplateVisible] = useState(false);
  const [collectTable, setCollectTable] = useState<any>([]);
  // 模板列表
  const [templates, setTemplates] = useState<ITemplates | {}>({});
  const [pagination, setPagination] = useState<{ p: number; limit: number }>({ p: 1, limit: 10 });
  const [selectedRowsId, setSelectedRowsId] = useState<number[]>([]);
  // 选中的模板code
  const [templateCode, setTemplateCode] = useState<string>();

  // vector 验证结果
  const [validateResult, setValidateResult] = useState();
  const [validateLoading, setValidateLoading] = useState(false);
  const [type, setType] = useState<'add' | 'edit' | 'clone'>();

  const [groupedDatasourceList, setGroupedDatasourceList] = useState<{
    prometheus?: Datasource[];
    elasticsearch?: Datasource[];
  }>({});
  // 模板
  const [selectRow, setSelectedRow] = useState<ISelectTemplates | undefined>();
  const [searchParams, setSearchParams] = useState({ host: undefined, content: undefined, status: undefined });
  const rtList = {
    pm: t('common:physical_machine'),
    vm: t('common:virtual_machine'),
    ct: 'Docker',
    'ct-k8s': t('common:kubernetes'),
  };

  useEffect(() => {
    if (initialValues) {
      // 兼容旧数据，将所有 multiline类型的规则都排到前面
      const newIdentList = initialValues?.ident_list?.map((element, index) => ({
        ...element,
        virtual_id: index,
        content: {
          ...element.content,
          logs: {
            items: element.content.logs.items.map((item) => ({
              ...item,
              log_processing_rules: item.log_processing_rules?.sort((a, b) => {
                // 如果 a 的 type 是 multi_line 且 b 的 type 不是 multi_line，a 应该排在前面
                if (a.type === 'multi_line' && b.type !== 'multi_line') {
                  return -1;
                }
                // 如果 b 的 type 是 multi_line 且 a 的 type 不是 multi_line，b 应该排在前面
                if (b.type === 'multi_line' && a.type !== 'multi_line') {
                  return 1;
                }
                // 否则保持原来的顺序
                return 0;
              }),
            })),
          },
        },
      }));
      form.setFieldsValue({ ...initialValues, ident_list: newIdentList });
      setCollectTable(newIdentList);
    } else {
      form.setFieldsValue(defaultValue);
    }
    // 获取 logstash 管道 可选择模板
    logTaskDefaultConfig().then((res) => {
      setTemplates(res);
      if (initialValues) {
        const type = `${initialValues.processor === 1 ? 'logstash' : 'vector'}_templates`;
        const selectedTemplate = res[type].find((item) => item.code === initialValues.template_code);
        setTemplateCode(initialValues.template_code);
        if (selectedTemplate) {
          form.setFieldsValue({ filter: selectedTemplate.config });
          setSelectedRow(selectedTemplate);
        }
      }
    });
  }, [initialValues]);

  useEffect(() => {
    if (groupId) {
      // 获取数据源列表
      getDatasourceBriefList().then((res) => {
        const groupList = _.groupBy(res, 'plugin_type');
        setGroupedDatasourceList(groupList);
      });
    }
  }, [groupId]);

  const handleSubmit = (back?: boolean) => {
    form
      .validateFields()
      .then((values) => {
        const data = {
          ...values,
          group_id: groupId,
          ident_list: values.ident_list.filter((item) => !item.deleted),
          enabled: values.enabled ? 1 : 0,
        };
        onSubmit(data, back);
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  // 日志采集明细toml配置内容校验
  const handleCheckToml = () => {
    checkForm
      .validateFields()
      .then((values) => {
        TomlCheck(values).then((res) => {
          setCheckResult(res.dat);
        });
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  const handleConfig = () => {
    collectRef.current.form.validateFields().then((values) => {
      const new_ident_list = form.getFieldValue('ident_list') || [];
      const virtual_id = new_ident_list[new_ident_list.length - 1]?.virtual_id;
      const topic = form.getFieldValue('topic');
      TomlConvert({ topic: topic, item: values }).then((res) => {
        values.content_str = res.dat;
        if (values.virtual_id === undefined) {
          // 新增
          values.virtual_id = virtual_id === undefined ? 0 : virtual_id + 1;
          form.setFieldsValue({ ident_list: [...new_ident_list, values] });
          setCollectTable([...new_ident_list, values]);
        } else {
          // 编辑
          const currentIndex = new_ident_list.findIndex((item) => item.virtual_id === values.virtual_id);
          new_ident_list[currentIndex] = values;
          new_ident_list[currentIndex].content.logs.items = new_ident_list[currentIndex].content.logs.items.map(
            (ele) => ({
              ...ele,
              topic: topic,
            }),
          );
          form.setFieldsValue({ ident_list: new_ident_list });
          setCollectTable(new_ident_list);
        }
        collectRef.current.form.resetFields();
        setCollectVisible(false);
      });
    });
  };

  const handleBeginnerConfig = () => {
    beginnerRef.current.form.validateFields().then((values) => {
      TomlConvert({ topic: values.topic, item: values }).then((res) => {
        setBeginnerConfigRes(res.dat);
      });
    });
  };

  const getItemPublicRulesContent = () => {
    const item_public_rules = form.getFieldValue('item_public_rules');
    return item_public_rules?.length ? (
      <Tag color='orange' className='common-rule-tag'>
        {item_public_rules.map(
          (item, index) =>
            `${t(`task.${item.type}`)} : ${item.pattern}${
              item.replace_placeholder && item.replace_placeholder !== '' ? ` -> ${item.replace_placeholder}` : ''
            }${index + 1 === item_public_rules.length ? '' : ' , '}`,
        )}
      </Tag>
    ) : null;
  };

  const batchOperation = (field, value) => {
    const ident_list = form.getFieldValue('ident_list');
    const new_ident_list = ident_list.map((item) => ({
      ...item,
      [field]: selectedRowsId.includes(item.virtual_id) ? value : item[field],
    }));
    form.setFieldsValue({ ident_list: new_ident_list });
    setCollectTable(new_ident_list);
  };

  const handleSearch = (value) => {
    const newSearchParams = { ...searchParams, ...value };
    setSearchParams(newSearchParams);
    const ident_list = form.getFieldValue('ident_list');
    const new_ident_list = ident_list.filter((data) => {
      const items = _.get(data, ['content', 'logs', 'items']);
      const rt = data.rt ? data.rt.map((item) => rtList[item] ?? item) : [];
      const host = [...rt, ...(data.idents ?? []), ...(data.os ?? [])];
      // 匹配配置内容
      const contentString = items.reduce(
        (previousValue, currentValue) =>
          `${currentValue.type}:${currentValue.path}->${currentValue.topic}` + previousValue,
        '',
      );
      const matchContent =
        newSearchParams.content !== undefined
          ? contentString.toLowerCase().includes((newSearchParams.content as string).toLowerCase())
          : true;
      // 匹配关联机器
      const matchHost =
        newSearchParams.host !== undefined
          ? host.some((ele) => ele.toLowerCase().includes((newSearchParams.host as string).toLowerCase()))
          : true;
      // 匹配状态
      const matchStatus = newSearchParams.status !== undefined ? data.disabled === newSearchParams.status : true;
      return matchContent && matchHost && matchStatus;
    });

    setCollectTable(new_ident_list);
  };

  return (
    <div>
      <Form
        form={form}
        layout='vertical'
        className='log-task-form-wrapper'
        disabled={curBusiGroup.perm === 'ro' || initialValues?.deleted}
      >
        <Card title={t('task.basic_setting')} size='small'>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item
                label={t('task.name')}
                name='name'
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Input maxLength={255} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={t('common:table.ident')}
                tooltip={t('task.ident_tip')}
                name='topic'
                rules={[
                  {
                    required: true,
                  },
                  {
                    validator: (_, value) => {
                      const reg = /^[a-z0-9_-]{1,32}$/;
                      return !value || reg.test(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error(t('task.ident_required')));
                    },
                  },
                ]}
              >
                {/* 在编辑状态下，状态启用时，不可编辑，状态禁用时，且非管理员时不可编辑 */}
                <Input
                  disabled={
                    mode === 'edit' && (initialValues?.status === 1 || (initialValues?.status === 0 && !profile.admin))
                  }
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={t('task.status')} name='status'>
                <Select
                  disabled={!profile.admin && ((mode === 'edit' && initialValues?.status === -1) || mode === 'add')}
                >
                  {(mode === 'add' || initialValues?.status === -1) && (
                    <Select.Option value={-1}>{t('management.reviewed')}</Select.Option>
                  )}
                  <Select.Option value={1}>{t('management.enable')}</Select.Option>
                  <Select.Option value={0}>{t('management.disable')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label={t('task.note')} name='note'>
                <Input.TextArea rows={1} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
        <Form.Item name='item_public_rules' hidden>
          <div />
        </Form.Item>
        <Form.Item name='ident_list' hidden>
          <div />
        </Form.Item>
        <Card
          title={
            <Space align='baseline'>
              {t('task.log_source')}
              <Button
                size='small'
                onClick={() => {
                  const topic = form.getFieldValue('topic');
                  if (topic) {
                    let data = collectRef.current?.form.getFieldsValue();
                    data.content.logs.items = data.content.logs.items.map((ele) => ({
                      ...ele,
                      topic: topic,
                    }));
                    collectRef.current?.form.setFieldsValue(data);
                    setType('add');
                    setCollectVisible(true);
                  } else {
                    message.warning(t('task.topic_tip'));
                  }
                }}
              >
                {t('task.from_server')}
                <PlusCircleOutlined className='control-icon-normal' />
              </Button>
              <Button size='small' onClick={() => setVisible(true)}>
                {t('task.from_docker')}
              </Button>
              <Tooltip
                title={<pre style={{ margin: 0 }}>{t('task.choose_from_tip')}</pre>}
                overlayInnerStyle={{ width: '440px' }}
              >
                <span style={{ cursor: 'help', borderBottom: '1px dashed #ccc', fontStyle: 'italic' }}>
                  {t('task.choose_from')}
                </span>
              </Tooltip>
            </Space>
          }
          extra={
            <Space>
              <Button
                size='small'
                onClick={() => {
                  const topic = form.getFieldValue('topic');
                  if (topic) {
                    checkForm.setFieldsValue({ topic: topic }), setCheckVisible(true);
                  } else {
                    message.warning(t('task.topic_tip'));
                  }
                }}
              >
                {t('task.content_detection')}
              </Button>
              <Button
                size='small'
                onClick={() => {
                  const topic = form.getFieldValue('topic');
                  if (topic) {
                    beginnerRef.current?.form.setFieldsValue({ topic: topic });
                    setBeginnerVisible(true);
                  } else {
                    message.warning(t('task.topic_tip'));
                  }
                }}
              >
                {t('task.novice_config')}
              </Button>
            </Space>
          }
          size='small'
        >
          <Row gutter={8} wrap={false} align='middle'>
            <Col>
              <Button
                disabled={initialValues?.deleted}
                size='small'
                onClick={() => {
                  setCommonRuleVisible(true);
                }}
              >
                {t('task.common_rule')}
                <FormOutlined />
              </Button>
            </Col>
            <Col flex='auto' style={{ height: '21.6px' }}>
              {getItemPublicRulesContent()}
            </Col>
            <Col flex='500px'>
              <Space>
                <Input
                  size='small'
                  allowClear
                  value={searchParams.host}
                  placeholder={t('task.relevance_host')}
                  onChange={(e) => handleSearch({ host: e.target.value })}
                />
                <Input
                  size='small'
                  allowClear
                  value={searchParams.content}
                  placeholder={t('task.content')}
                  onChange={(e) => handleSearch({ content: e.target.value })}
                  style={{ width: '220px' }}
                />
                <Select
                  allowClear
                  size='small'
                  value={searchParams.status}
                  placeholder={t('task.status')}
                  onChange={(e) => handleSearch({ status: e })}
                  style={{ width: '60px' }}
                >
                  <Select.Option value={0}>{t('common:table.enabled')}</Select.Option>
                  <Select.Option value={1}>{t('common:table.disabled')}</Select.Option>
                </Select>
                <Dropdown
                  disabled={!Boolean(selectedRowsId.length)}
                  overlay={
                    <Menu>
                      <Menu.Item key='batch_enabled' onClick={() => batchOperation('disabled', 0)}>
                        {t('common:btn.batch_enabled')}
                      </Menu.Item>
                      <Menu.Item key='batch_disable' onClick={() => batchOperation('disabled', 1)}>
                        {t('common:btn.batch_disable')}
                      </Menu.Item>
                      <Menu.Item key='batch_delete' onClick={() => batchOperation('deleted', true)}>
                        {t('common:btn.batch_delete')}
                      </Menu.Item>
                    </Menu>
                  }
                  trigger={['click']}
                >
                  <Button size='small'>
                    {t('common:btn.batch_operations')} <DownOutlined />
                  </Button>
                </Dropdown>
              </Space>
            </Col>
          </Row>
          <Table
            rowKey='virtual_id'
            size='small'
            columns={[
              {
                title: t('task.collect_object'),
                dataIndex: 'mode',
                width: 135,
                render: (val, record) => (
                  <Space size={4}>
                    <Text delete={record.deleted}>
                      {val === 'all'
                        ? t('task.all_host')
                        : val === 'group'
                        ? t('task.current_group')
                        : val === 'idents'
                        ? t('task.host')
                        : val === 'container'
                        ? t('task.container')
                        : ''}
                    </Text>
                    {val === 'container' && record.status ? (
                      <Tooltip title={t('task.config_exception')}>
                        <WarningOutlined style={{ color: '#cf1322' }} />
                      </Tooltip>
                    ) : null}
                  </Space>
                ),
              },
              {
                title: t('task.relevance_host'),
                dataIndex: 'idents',
                width: 360,
                ellipsis: {
                  showTitle: false,
                },
                render: (val, record) => {
                  const rt = record.rt ? record.rt.map((item) => rtList[item] ?? item) : [];
                  const value = [...rt, ...(val ?? []), ...(record.os ?? [])];
                  const getTagList = (type: 'table' | 'tooltip') =>
                    value?.map((item) => (
                      <Tag
                        style={
                          (record.shield_idents?.length || record.disabled) && type === 'table'
                            ? { color: '#00000073', background: '#0000000d', borderColor: '#bfbfbf' }
                            : {}
                        }
                        color='blue'
                        key={item}
                      >
                        <Text delete={record.deleted} style={{ color: '#096dd9' }}>
                          {item}
                        </Text>
                      </Tag>
                    ));
                  return value && value.length ? (
                    <Tooltip
                      placement='topLeft'
                      title={<Space wrap>{getTagList('tooltip')}</Space>}
                      overlayClassName='metrics-tooltip-content'
                      overlayInnerStyle={{
                        maxWidth: 360,
                        maxHeight: 400,
                        width: 'max-content',
                        height: 'max-content',
                        overflow: 'auto',
                      }}
                    >
                      {getTagList('table')}
                    </Tooltip>
                  ) : (
                    '-'
                  );
                },
              },
              {
                title: `${t('task.content')}${t('task.copy_tip')}`,
                dataIndex: 'content_str',
                ellipsis: {
                  showTitle: false,
                },
                render: (val, record) => {
                  const items = _.get(record, ['content', 'logs', 'items']);
                  return (
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
                      {val ? (
                        <Text delete={record.deleted}>
                          <a
                            style={record.shield_idents?.length || record.disabled ? { color: '#00000073' } : {}}
                            onClick={() => copy2ClipBoard(val)}
                          >
                            {items.map((item) => (
                              <div>{`${item.type}:${item.path} -> ${item.topic}`}</div>
                            ))}
                          </a>
                        </Text>
                      ) : (
                        '-'
                      )}
                      {record.tags && (
                        <div>
                          {Object.entries(record.tags).map(([key, value]) => (
                            <Tag
                              style={
                                record.disabled
                                  ? { color: '#00000073', background: '#0000000d', borderColor: '#bfbfbf' }
                                  : {}
                              }
                              color='orange'
                              key={key}
                            >
                              <Text delete={record.deleted} style={{ color: '#d46b08' }}>
                                {key}:{value}
                              </Text>
                            </Tag>
                          ))}
                        </div>
                      )}
                    </Tooltip>
                  );
                },
              },
              {
                title: t('common:table.operations'),
                dataIndex: 'operator',
                width: 180,
                render: (val, record) => (
                  <Space>
                    <Switch
                      disabled={record.deleted}
                      checkedChildren={t('common:table.enabled')}
                      unCheckedChildren={t('common:table.disabled')}
                      checked={record.disabled ? false : true}
                      onChange={(checked) => {
                        const ident_list = form.getFieldValue('ident_list');
                        const currentItem = ident_list.findIndex((item) => item.virtual_id === record.virtual_id);
                        ident_list[currentItem] = { ...record, disabled: checked ? 0 : 1 };
                        form.setFieldsValue({ ident_list: ident_list });
                        setCollectTable(ident_list);
                      }}
                    />
                    <Button
                      disabled={record.mode === 'container' || record.deleted}
                      type='link'
                      style={{ padding: 0 }}
                      onClick={() => {
                        const data = { ...record };
                        delete data.id;
                        delete data.virtual_id;
                        collectRef.current?.form.setFieldsValue(data);
                        setType('clone');
                        setCollectVisible(true);
                      }}
                    >
                      {t('common:btn.clone')}
                    </Button>
                    <Button
                      disabled={record.mode === 'container' || record.deleted}
                      type='link'
                      style={{ padding: 0 }}
                      onClick={() => {
                        collectRef.current?.form.setFieldsValue(record);
                        setType('edit');
                        setCollectVisible(true);
                      }}
                    >
                      {t('common:btn.edit')}
                    </Button>
                    {curBusiGroup.perm === 'rw' && (
                      <Button
                        disabled={
                          (record.mode === 'container' && !profile.admin) || initialValues?.deleted || record.deleted
                        }
                        type='link'
                        danger
                        style={{ padding: 0 }}
                        onClick={() => {
                          const ident_list = form.getFieldValue('ident_list');
                          const new_ident_list = ident_list.map((ele) =>
                            record.virtual_id === ele.virtual_id ? { ...ele, deleted: true } : ele,
                          );
                          form.setFieldsValue({ ident_list: new_ident_list });
                          setCollectTable(new_ident_list);
                        }}
                      >
                        {t('common:btn.delete')}
                      </Button>
                    )}
                  </Space>
                ),
              },
            ]}
            rowSelection={{
              selectedRowKeys: selectedRowsId,
              onChange: (selectedRowKeys: number[]) => {
                setSelectedRowsId(selectedRowKeys);
              },
            }}
            dataSource={collectTable}
            pagination={{
              current: pagination.p,
              pageSize: pagination.limit,
              total: collectTable.length,
              showTotal: (total) => {
                return t('common:table.total', { total });
              },
              showSizeChanger: true,
              onChange: (p, l) => {
                setPagination({ p, limit: l });
              },
            }}
            scroll={{ y: 500 }}
          />
        </Card>
        <Card title={t('task.access_target')} size='small'>
          <Row gutter={24}>
            <Form.Item name='template_code' hidden>
              <input />
            </Form.Item>
            <Col span={6}>
              <Form.Item
                label={t('task.processor')}
                name='processor'
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Radio.Group
                  onChange={(e) => {
                    form.setFieldsValue({ filter: '', template_code: '' });
                    setTemplateCode(undefined);
                    setSelectedRow(undefined);
                  }}
                >
                  <Radio value={2}>
                    <Space size={2}>
                      Vector
                      <Tooltip title={t('common:view_doc')}>
                        <a
                          href='/docs/recommand/use-vector-processor'
                          target='_blank'
                          style={{ color: '#262626', verticalAlign: 'middle' }}
                        >
                          <LinkOutlined />
                        </a>
                      </Tooltip>
                    </Space>
                  </Radio>
                  <Radio value={1}>
                    <Tooltip
                      title={<pre style={{ margin: 0 }}>{t('task.logstash_deprecated_tip')}</pre>}
                      overlayInnerStyle={{ width: '400px' }}
                    >
                      <span style={{ cursor: 'help', fontStyle: 'italic' }}>
                        Logstash ({t('task.logstash_deprecated')})
                      </span>
                    </Tooltip>
                  </Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label={t('task.access_data_source')}
                name='datasource_id'
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Select>
                  {groupedDatasourceList.elasticsearch?.map((item) => (
                    <Select.Option value={item.id} key={item.id}>
                      {item.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            shouldUpdate={(prevValues, currentValues) => prevValues.processor !== currentValues.processor}
            noStyle
          >
            {({ getFieldValue }) => {
              const processor = getFieldValue('processor');
              return (
                <>
                  <Row gutter={24}>
                    {processor === 1 && (
                      <>
                        <Col span={6}>
                          <Form.Item
                            label={t('task.workers')}
                            name='workers'
                            tooltip={{
                              overlayInnerStyle: undefined,
                              title: 'logstash pipeline.workers',
                            }}
                            rules={[
                              {
                                required: true,
                              },
                            ]}
                          >
                            <InputNumber min={1} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            label={t('task.batch_size')}
                            name='batch_size'
                            tooltip={'logstash pipeline.batch.size'}
                            rules={[
                              {
                                required: true,
                              },
                            ]}
                          >
                            <InputNumber min={1} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            label={t('task.batch_delay')}
                            name='batch_delay'
                            tooltip={'logstash pipeline.batch delay'}
                            rules={[
                              {
                                required: true,
                              },
                            ]}
                          >
                            <InputNumber min={1} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                      </>
                    )}
                  </Row>
                  <Form.Item
                    label={
                      <Space>
                        {`${processor === 1 ? 'Logstash' : 'Vector'}${t('task.filter_rule')}`}
                        <Button size='small' onClick={() => setTemplateVisible(true)}>
                          {t('task.template')}
                        </Button>
                        {templateCode && (
                          <>
                            <Button
                              size='small'
                              onClick={() => {
                                form.setFieldsValue({ template_code: '' });
                                setTemplateCode(undefined);
                                setSelectedRow(undefined);
                              }}
                            >
                              {t('stream.custom')}
                            </Button>
                            {selectRow?.name ? (
                              <Tag color='orange'>
                                {t('task.binding_template')}
                                {selectRow.name}
                              </Tag>
                            ) : (
                              <Tag color='red'>
                                {t('task.tpl_not_exist')}
                                {templateCode}
                              </Tag>
                            )}
                          </>
                        )}
                      </Space>
                    }
                    name='filter'
                    rules={[
                      {
                        required: true,
                      },
                    ]}
                  >
                    {templateCode ? (
                      <Typography.Paragraph>
                        <pre style={{ height: 500 }}>{selectRow?.config}</pre>
                      </Typography.Paragraph>
                    ) : (
                      <CodeMirror
                        height='500px'
                        theme='light'
                        basicSetup
                        editable={curBusiGroup.perm === 'rw' && !initialValues?.deleted}
                        extensions={[
                          EditorView.lineWrapping,
                          StreamLanguage.define(processor === 1 ? groovy : toml),
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
                    )}
                  </Form.Item>
                </>
              );
            }}
          </Form.Item>
        </Card>
        {curBusiGroup.perm === 'rw' && !initialValues?.deleted && (
          <Form.Item
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.processor !== currentValues.processor || prevValues.filter !== currentValues.filter
            }
            noStyle
          >
            {({ getFieldValue }) => {
              const processor = getFieldValue('processor');
              const content = getFieldValue('filter');
              return (
                <Form.Item>
                  <Space>
                    {mode === 'edit' && <Button onClick={() => handleSubmit(true)}>{t('common:btn.save_back')}</Button>}
                    <Button type='primary' onClick={() => handleSubmit(false)}>
                      {t('common:btn.save')}
                    </Button>
                    {processor === 2 ? (
                      <>
                        <Tooltip title={t('task.vector_validate_tip')}>
                          <Button
                            loading={validateLoading}
                            onClick={() => {
                              setValidateLoading(true);
                              const topic = form.getFieldValue('topic');
                              const datasource_id = form.getFieldValue('datasource_id');
                              getVectorValidate({
                                datasource_id: datasource_id === '' ? 0 : datasource_id,
                                topic,
                                content,
                              })
                                .then((res) => {
                                  setValidateResult(res.dat);
                                  setValidateLoading(false);
                                })
                                .catch((err) => setValidateLoading(false));
                            }}
                          >
                            {t('task.vector_validate')}
                          </Button>
                        </Tooltip>
                        <Tooltip title={t('task.vector_vrl_tip')}>
                          <Link to='/log/voctor/vrl' target='_blank'>
                            <Button>{t('task.vector_vrl')}</Button>
                          </Link>
                        </Tooltip>
                      </>
                    ) : null}
                  </Space>
                </Form.Item>
              );
            }}
          </Form.Item>
        )}
      </Form>
      <Modal
        width={900}
        visible={visible}
        title={t('task.from_docker')}
        maskClosable={false}
        footer={[
          <Button key='submit' type='primary' onClick={() => setVisible(false)}>
            {t('common:btn.know')}
          </Button>,
        ]}
        onCancel={() => setVisible(false)}
      >
        <Typography.Paragraph>
          要采集容器内的应用日志，可通过标记POD的annotations或Docker的labels实现，
          <br />
          例如（注意
          <Typography.Text mark>cndgraf/*</Typography.Text>部分，其中cndgraf/logs.items部分可以借助{' '}
          <a
            onClick={() => {
              setVisible(false);
              beginnerRef.current?.form.setFieldsValue({ topic: form.getFieldValue('topic') });
              setBeginnerVisible(true);
            }}
          >
            新手配置工具
          </a>{' '}
          生成）：
        </Typography.Paragraph>
        <Typography.Paragraph>
          <pre style={{ height: '570px' }}>{FORM_DOCKER_CONTENT}</pre>
        </Typography.Paragraph>
      </Modal>
      <Modal
        width={900}
        visible={templateVisible}
        maskClosable={false}
        title={t('task.template')}
        footer={[
          <Button key='cancel' onClick={() => setTemplateVisible(false)}>
            {t('common:btn.cancel')}
          </Button>,
          <Button
            key='submit'
            type='primary'
            onClick={() => {
              setTemplateVisible(false);
              form.setFieldsValue({
                filter: selectRow?.config,
                template_code: selectRow?.code,
              });
              setTemplateCode(selectRow?.code);
            }}
          >
            {t('common:btn.submit')}
          </Button>,
        ]}
        onCancel={() => setTemplateVisible(false)}
      >
        <Table
          rowKey='name'
          size='small'
          columns={[
            {
              title: t('task.template_name'),
              dataIndex: 'name',
            },
            {
              title: t('task.template_note'),
              dataIndex: 'note',
              render(text) {
                return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text) }} />;
              },
            },
          ]}
          onRow={(record: any) => {
            return {
              onClick: (event) => setSelectedRow({ ...record }), // 点击行
            };
          }}
          rowSelection={{
            type: 'radio',
            selectedRowKeys: selectRow?.name ? [selectRow?.name as string] : [],
            onChange: (selectedRowKeys: string[], selectedRows: any) => {
              setSelectedRow({ ...selectedRows[0] });
            },
          }}
          dataSource={
            templates?.[form.getFieldValue('processor') === 1 ? 'logstash_templates' : 'vector_templates'] || []
          }
          pagination={false}
          scroll={{ y: 500 }}
        />
      </Modal>
      <Modal
        width={870}
        visible={collectVisible}
        maskClosable={false}
        title={`${t(`common:btn.${type}`)}${t('task.from_server')}`}
        onOk={handleConfig}
        onCancel={() => {
          collectRef.current.form.resetFields();
          setCollectVisible(false);
        }}
        forceRender
        bodyStyle={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}
      >
        <CollectForm ref={collectRef} deleted={initialValues?.deleted} groupId={groupId} />
      </Modal>
      <Modal
        width={1300}
        visible={beginnerVisible}
        maskClosable={false}
        title={t('task.novice_config')}
        onCancel={() => {
          beginnerRef.current.form.resetFields();
          setBeginnerConfigRes(undefined);
          setBeginnerVisible(false);
        }}
        bodyStyle={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}
        forceRender
        footer={[
          <Button
            key='cancel'
            onClick={() => {
              beginnerRef.current.form.resetFields();
              setBeginnerConfigRes(undefined);
              setBeginnerVisible(false);
            }}
          >
            {t('common:btn.cancel')}
          </Button>,
          <Button key='submit' type='primary' onClick={handleBeginnerConfig}>
            {t('task.build_configuration')}
          </Button>,
        ]}
      >
        <Row gutter={8}>
          <Col flex='830px'>
            <CollectForm ref={beginnerRef} deleted={initialValues?.deleted} groupId={groupId} type='beginner' />
          </Col>
          <Col flex='auto' className='beginner-code'>
            <div style={{ padding: '8px 0' }}>{t('task.config_result')}</div>
            <CodeMirror
              height='calc(100% - 35px)'
              theme='light'
              basicSetup
              value={beginnerConfigRes}
              editable={true}
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
          </Col>
        </Row>
      </Modal>
      <Modal
        forceRender
        title={t('task.content_detection')}
        visible={checkVisible}
        maskClosable={false}
        width={600}
        destroyOnClose
        footer={[
          <Button
            key='cancel'
            onClick={() => {
              setCheckVisible(false), setCheckResult(undefined), checkForm.resetFields();
            }}
          >
            {t('common:btn.cancel')}
          </Button>,
          <Button key='submit' type='primary' onClick={handleCheckToml}>
            {t('task.verify')}
          </Button>,
        ]}
        onCancel={() => {
          setCheckVisible(false), setCheckResult(undefined), checkForm.resetFields();
        }}
      >
        <Alert message={t('task.content_detection_tip')} type='info' showIcon style={{ marginBottom: '14px' }} />
        <Form form={checkForm}>
          <Form.Item label={t('task.topic_name')} name='topic' hidden>
            <Input />
          </Form.Item>
          <Form.Item label={t('task.content')} name='toml' rules={[{ required: true }]}>
            <CodeMirror
              height='300px'
              theme='light'
              basicSetup
              editable={curBusiGroup.perm === 'rw' && !initialValues?.deleted}
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
          <Form.Item label={t('task.verify_result')}>
            {checkResult === '' ? (
              <Tag color='green'>{t('task.success')}</Tag>
            ) : checkResult ? (
              <span style={{ color: 'red' }}>{checkResult}</span>
            ) : (
              '-'
            )}
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        width={800}
        visible={Boolean(validateResult)}
        title={t('task.vector_validate')}
        maskClosable={false}
        footer={[
          <Button key='submit' type='primary' onClick={() => setValidateResult(undefined)}>
            {t('common:btn.know')}
          </Button>,
        ]}
        onCancel={() => setValidateResult(undefined)}
      >
        <pre style={{ marginBottom: 0 }}>{validateResult}</pre>
      </Modal>
      {/* 公共处理规则 */}
      <ProcessingRule
        visible={commonRuleVisible}
        setVisible={setCommonRuleVisible}
        initialValues={{
          item_public_rules: form.getFieldValue('item_public_rules') || [
            {
              name: '',
              pattern: '',
            },
          ],
        }}
        form={form}
      />
    </div>
  );
};

export default LogTaskForm;
