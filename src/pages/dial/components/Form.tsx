import React, { useEffect, useState, useContext } from 'react';
import { CommonStateContext } from '@/App';
import _ from 'lodash';
import {
  Form,
  Radio,
  Space,
  Button,
  InputNumber,
  Checkbox,
  message,
  Input,
  Switch,
  Tooltip,
  Select,
  Row,
  Col,
  Tag,
} from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import cronParser from 'cron-parser';
import RequestFormat from './RequestFormat';
import SuccessWhen from './SuccessWhen';
import {
  defaultValues,
  defaultConfig,
  defaultItem,
  defaultRequestFormat,
  dialTabs,
  advanced_set_fields,
} from '../constants';
import { setDialTask } from '@/services/dial';
import { getMonObjectList } from '@/services/targets';
import '../index.less';

interface ITaskFormProps {
  tagsTree: any;
  initialValues?: any;
  mode: 'add' | 'edit' | 'clone';
  groupId: number;
}

const validateCron = (_, value) => {
  try {
    cronParser.parseExpression(value);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new Error('Invalid Cron expression'));
  }
};

// 校验单个标签格式是否正确
function isTagValid(tag) {
  const contentRegExp = /^[a-zA-Z_][\w]*={1}[^=]+$/;
  return {
    isCorrectFormat: contentRegExp.test(tag.toString()),
    isLengthAllowed: tag.toString().length <= 64,
  };
}

const TaskForm: React.FC<ITaskFormProps> = (props) => {
  const { curBusiGroup, curBusiId } = useContext(CommonStateContext);
  const { tagsTree, initialValues, mode, groupId } = props;
  const history = useHistory();
  const { t } = useTranslation('dial');
  const [form] = Form.useForm();
  // 用于判定高级设置里面有没有内容，有内容默认展开
  const [isExtend, setIsExtend] = useState(false);
  // 用于判定是否选择自建节点
  const [privateTags, setPrivateTags] = useState(false);
  const [hostList, setHostList] = useState<string[]>([]);
  const rtList = {
    pm: t('common:physical_machine'),
    vm: t('common:virtual_machine'),
    ct: 'Docker',
    'ct-k8s': t('common:kubernetes'),
  };
  const osList = ['windows', 'linux'];

  useEffect(() => {
    getMonObjectList({ limit: -1, bgid: curBusiId }).then((res) => {
      const list = res.dat?.list.map((item) => item.ident);
      setHostList(list || []);
    });
  }, []);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const content_json = { ...values.content_json };
      if (values.category === 'dial:dial_whois') {
        content_json.interval = values.content_json.interval * 86400;
      }
      content_json.use_tls = content_json.insecure_skip_verify;
      setDialTask({ ...values, content_json, group_id: groupId }).then(() => {
        message.success(`${mode === 'add' ? t('common:success.create') : t(`common:success.${mode}`)}`);
        history.push('/dial-task');
      });
    });
  };

  useEffect(() => {
    if (mode !== 'add') {
      const name = mode === 'clone' ? `${initialValues.name}_copy` : initialValues.name;
      form.setFieldsValue({ ...initialValues, name });
      const hasContent = advanced_set_fields.some((field) => _.get(initialValues, ['content_json', field]));
      setIsExtend(hasContent);
      if (initialValues?.targets?.mode) {
        setPrivateTags(true);
      }
    } else {
      form.setFieldsValue(defaultValues);
    }
  }, [initialValues]);

  // 校验所有标签格式
  function isValidFormat() {
    return {
      validator(_, value) {
        const isInvalid =
          value &&
          value.some((tag) => {
            const { isCorrectFormat, isLengthAllowed } = isTagValid(tag);
            if (!isCorrectFormat || !isLengthAllowed) {
              return true;
            }
          });
        return isInvalid ? Promise.reject(new Error(t('task.append_tags_msg'))) : Promise.resolve();
      },
    };
  }

  // 渲染标签
  function tagRender(content) {
    const { isCorrectFormat, isLengthAllowed } = isTagValid(content.value ?? '');
    return isCorrectFormat && isLengthAllowed ? (
      <Tag closable={content.closable} onClose={content.onClose}>
        {content.value}
      </Tag>
    ) : (
      <Tooltip title={isCorrectFormat ? t('task.append_tags_msg1') : t('task.append_tags_msg2')}>
        <Tag color='error' closable={content.closable} onClose={content.onClose} style={{ marginTop: '2px' }}>
          {content.value}
        </Tag>
      </Tooltip>
    );
  }

  return (
    <div>
      <div className='dial-task-form-wrapper'>
        <Form form={form} layout='vertical' disabled={curBusiGroup.perm === 'ro'}>
          {mode === 'edit' && (
            <Form.Item name='id' hidden>
              <div />
            </Form.Item>
          )}
          <Form.Item name='content_json' hidden>
            <div />
          </Form.Item>
          <Form.Item label={t('task.category')} name='category'>
            <Radio.Group
              buttonStyle='solid'
              disabled={mode !== 'add'}
              onChange={(e) => {
                const data = form.getFieldsValue();
                form.resetFields();
                const success_when_item = defaultConfig[e.target.value]?.[defaultItem[e.target.value]]?.item;
                form.setFieldsValue({
                  ...data,
                  content_json: {
                    ...data.content_json,
                    ...(success_when_item ? { success_when: [success_when_item] } : {}),
                    ...defaultRequestFormat[e.target.value],
                  },
                });
              }}
            >
              {dialTabs.map((item) => (
                <Radio.Button key={item} value={item}>
                  {t(`task.${item.replace('dial:dial_', '')}_protocol`)}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>
          <Form.Item
            label={t('task.name')}
            name='name'
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t('task.append_tags')}
            name='tags'
            rules={[isValidFormat]}
            tooltip={t('task.append_tags_tip')}
          >
            <Select
              style={{ width: '500px' }}
              mode='tags'
              tokenSeparators={[' ']}
              open={false}
              placeholder={t('task.append_tags_placeholder')}
              tagRender={tagRender}
            />
          </Form.Item>
          <RequestFormat form={form} perm={curBusiGroup.perm} isExtend={isExtend} />
          <Form.Item shouldUpdate noStyle>
            {() => {
              const category = form.getFieldValue('category');
              const isHttp = category === 'dial:dial_http';
              return (
                (isHttp || category === 'dial:dial_whois') && (
                  <div>
                    <div className='module-title'>
                      <Space size={3}>
                        {t(`${isHttp ? 'task.http_validity' : 'task.whois_validity'}`)}
                        {isHttp && (
                          <Tooltip title={t('task.expiration_day_tip')}>
                            <QuestionCircleOutlined />
                          </Tooltip>
                        )}
                      </Space>
                    </div>
                    <Space style={{ marginBottom: '10px' }}>
                      {t('task.validity_tip_1')}
                      <Form.Item name={['content_json', 'expiration_day']} noStyle>
                        <InputNumber min={1} addonAfter='day' style={{ width: '140px' }} />
                      </Form.Item>
                      {t('task.validity_tip_2')}
                    </Space>
                  </div>
                )
              );
            }}
          </Form.Item>
          <SuccessWhen form={form} perm={curBusiGroup.perm} />
          <div className='module-title'>{t('task.dial_tags')}</div>
          <Row wrap={false} align='middle' gutter={8} style={{ marginBottom: '10px' }}>
            <Col>
              <Space size={3}>
                {t('task.public_tags')}
                <Tooltip
                  title={t('task.common_node_tip')}
                  overlayInnerStyle={{
                    width: 300,
                  }}
                >
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
              ：
            </Col>
            <Col>
              <Form.Item name={['targets', 'dial_tags']} noStyle>
                {tagsTree.public?.length ? (
                  <Checkbox.Group>
                    {tagsTree.public.map((item) => {
                      return (
                        <Checkbox value={item.name} key={item.name}>
                          <Tooltip title={item.value.join(' , ')}>{item.name}</Tooltip>
                        </Checkbox>
                      );
                    })}
                  </Checkbox.Group>
                ) : (
                  '-'
                )}
              </Form.Item>
            </Col>
          </Row>
          <Row wrap={false} align='middle' gutter={8}>
            <Col style={{ marginBottom: '18px' }}>
              <Space size={3}>
                {t('task.private_tags')}
                <Tooltip title={t('task.private_tags_tip')}>
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
              ：
            </Col>
            <Col>
              <Form.Item>
                <Checkbox checked={privateTags} onChange={(e) => setPrivateTags(e.target.checked)}></Checkbox>
              </Form.Item>
            </Col>
            {privateTags && (
              <>
                <Col>
                  <Form.Item
                    name={['targets', 'mode']}
                    tooltip={<pre className='input-task-form-type-pre'>{t('task.type_tip')}</pre>}
                    initialValue={3}
                  >
                    <Select style={{ width: '300px' }}>
                      <Select.Option key='2' value={2}>
                        {t('task.type_2')}
                      </Select.Option>
                      <Select.Option key='3' value={3}>
                        {t('task.type_3')}
                      </Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Form.Item
                  shouldUpdate={(prevValues, curValues) =>
                    !_.isEqual(prevValues.targets?.mode, curValues.targets?.mode)
                  }
                  noStyle
                >
                  {({ getFieldValue }) => {
                    const type = getFieldValue(['targets', 'mode']);
                    return type === 2 ? (
                      <>
                        <Col>
                          <Form.Item name={['targets', 'rt']}>
                            <Select
                              mode='multiple'
                              allowClear
                              style={{ minWidth: '300px' }}
                              placeholder={t('task.rt_tip')}
                            >
                              {Object.entries(rtList).map(([key, value]) => (
                                <Select.Option key={key} value={key}>
                                  {value}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col>
                          <Form.Item name={['targets', 'os']}>
                            <Select
                              mode='multiple'
                              allowClear
                              style={{ minWidth: '300px' }}
                              placeholder={t('task.os_tip')}
                            >
                              {osList.map((item) => (
                                <Select.Option key={item} value={item}>
                                  {item}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                      </>
                    ) : (
                      <Col>
                        <Form.Item
                          name={['targets', 'idents']}
                          rules={[
                            {
                              required: true,
                              message: '请选择机器',
                            },
                          ]}
                        >
                          <Select mode='multiple' allowClear style={{ minWidth: '300px' }} placeholder={t('task.host')}>
                            {_.map(hostList, (item) => {
                              return (
                                <Select.Option key={item} value={item}>
                                  {item}
                                </Select.Option>
                              );
                            })}
                          </Select>
                        </Form.Item>
                      </Col>
                    );
                  }}
                </Form.Item>
              </>
            )}
          </Row>
          <Space size={3} style={{ paddingBottom: '8px' }}>
            {t('task.operation_rule')}
            <Tooltip title={t('task.operation_rule_tip')}>
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
          <Row gutter={8}>
            <Col>
              <Form.Item name={['content_json', 'run_type']} initialValue={0}>
                <Select style={{ width: '100px' }}>
                  <Select.Option key='0' value={0}>
                    {t('task.interval')}
                  </Select.Option>
                  <Select.Option key='1' value={1}>
                    {t('task.cron')}
                  </Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col>
              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) => {
                  const category = getFieldValue('category');
                  const run_type = getFieldValue(['content_json', 'run_type']);
                  return run_type === 0 ? (
                    <Form.Item
                      name={['content_json', 'interval']}
                      rules={[
                        {
                          required: true,
                        },
                      ]}
                    >
                      <InputNumber
                        min={category === 'dial:dial_whois' ? 0.5 : 15}
                        style={{ width: '150px' }}
                        addonAfter={category === 'dial:dial_whois' ? 'day' : 's'}
                      />
                    </Form.Item>
                  ) : (
                    <Form.Item
                      name={['content_json', 'cron']}
                      rules={[
                        {
                          required: true,
                          message: t('task.cron_required'),
                        },
                        {
                          validator: (_, value) => {
                            return !value ? Promise.resolve() : validateCron(_, value);
                          },
                        },
                      ]}
                    >
                      <Input placeholder={t('task.cron_placeholder')} />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name='enabled' valuePropName='checked' label={t('task.status')}>
            <Switch checkedChildren={t('task.enabled')} unCheckedChildren={t('task.disable')} />
          </Form.Item>
          {curBusiGroup.perm === 'rw' && (
            <Form.Item>
              <Space>
                <Button type='primary' onClick={handleSubmit}>
                  {t('common:btn.save')}
                </Button>
                <Button
                  onClick={() => {
                    history.push('/dial-task');
                  }}
                >
                  {t('common:btn.cancel')}
                </Button>
              </Space>
            </Form.Item>
          )}
        </Form>
      </div>
    </div>
  );
};

export default TaskForm;
