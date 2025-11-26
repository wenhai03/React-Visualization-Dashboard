/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import React, { useContext } from 'react';
import { MinusCircleOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Form, InputNumber, Space, Select, Card, Tooltip, Row, Col } from 'antd';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import Severity from '@/pages/alertRules/Form/components/Severity';
import AdditionalLabel from '@/pages/alertRules/Form/components/AdditionalLabel';
import Inhibit from '@/pages/alertRules/Form/components/Inhibit';
import ValuesSelect from './ValuesSelect';
import Preview from './Preview';
import './style.less';

const triggerTypeOptions = [
  { value: 'target_miss' },
  { value: 'pct_target_miss' },
  { value: 'offset' },
  { value: 'agent_crash' },
  { value: 'agent_start_abnormal' },
];

export default function Host() {
  const { t } = useTranslation('alertRules');
  const { curBusiGroup } = useContext(CommonStateContext);
  const form = Form.useFormInstance();
  const commonOption = [{ value: 'group' }, { value: 'tags' }, { value: 'hosts' }];
  const queryKeyOptions = curBusiGroup?.extra?.super
    ? [{ value: 'all_hosts' }, { value: 'group_ids' }, ...commonOption]
    : commonOption;

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <Form.List name={['rule_config', 'queries']}>
          {(fields, { add, remove }) => (
            <Card
              title={
                <Space>
                  <span>{t('host.query.title')}</span>
                  {curBusiGroup.perm === 'rw' && (
                    <PlusCircleOutlined
                      onClick={() =>
                        add({
                          key: 'group',
                          op: '==',
                          values: [],
                        })
                      }
                    />
                  )}
                </Space>
              }
              size='small'
            >
              {fields.map((field, idx) => (
                <div key={field.key}>
                  <Space align='baseline'>
                    {idx > 0 && <div className='alert-rule-host-condition-tips'>且</div>}
                    <Form.Item
                      {...field}
                      name={[field.name, 'key']}
                      rules={[{ required: true, message: 'Missing key' }]}
                    >
                      <Select
                        style={{ minWidth: idx > 0 ? 100 : 142 }}
                        onChange={() => {
                          const queries = form.getFieldValue(['rule_config', 'queries']);
                          const query = queries[field.name];
                          query.values = [];
                          form.setFieldsValue({
                            rule_config: {
                              queries,
                            },
                          });
                        }}
                      >
                        {queryKeyOptions.map((item) => (
                          <Select.Option key={item.value} value={item.value}>
                            {t(`host.query.key.${item.value}`)}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item shouldUpdate noStyle>
                      {({ getFieldValue }) => {
                        const queryKey = getFieldValue(['rule_config', 'queries', field.name, 'key']);
                        if (queryKey === 'all_hosts' || queryKey === 'group') return null;
                        return (
                          <Space align='baseline'>
                            <Form.Item
                              {...field}
                              name={[field.name, 'op']}
                              rules={[{ required: true, message: 'Missing op' }]}
                            >
                              <Select style={{ minWidth: 60 }}>
                                <Select.Option value='=='>==</Select.Option>
                                <Select.Option value='!='>!=</Select.Option>
                              </Select>
                            </Form.Item>
                            <ValuesSelect queryKey={queryKey} field={field} />
                          </Space>
                        );
                      }}
                    </Form.Item>
                    {idx > 0 && curBusiGroup.perm === 'rw' && (
                      <MinusCircleOutlined onClick={() => remove(field.name)} />
                    )}
                  </Space>
                </div>
              ))}
              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) => {
                  const queries = getFieldValue(['rule_config', 'queries']);
                  return <Preview queries={queries} />;
                }}
              </Form.Item>
            </Card>
          )}
        </Form.List>
      </div>
      <div style={{ marginBottom: 10 }}>
        <Form.List name={['rule_config', 'triggers']}>
          {(fields, { add, remove }) => (
            <Card
              title={
                <Space>
                  <span>{t('host.trigger.title')}</span>
                  <Tooltip
                    title={<pre>{t('host.trigger.tip')}</pre>}
                    overlayInnerStyle={{
                      width: 300,
                    }}
                  >
                    <QuestionCircleOutlined />
                  </Tooltip>
                  {curBusiGroup.perm === 'rw' && (
                    <PlusCircleOutlined
                      onClick={() =>
                        add({
                          type: 'target_miss',
                          severity: 3,
                          duration: 30,
                        })
                      }
                    />
                  )}
                  <Inhibit triggersKey='triggers' />
                </Space>
              }
              size='small'
            >
              <div className='alert-rule-triggers-container'>
                {fields.map((field) => (
                  <div key={field.key} className='alert-rule-trigger-container'>
                    <Space align='baseline'>
                      <Form.Item
                        {...field}
                        name={[field.name, 'type']}
                        rules={[{ required: true, message: 'Missing type' }]}
                      >
                        <Select
                          style={{ minWidth: 120 }}
                          onChange={(val) => {
                            const triggers = form.getFieldValue(['rule_config', 'triggers']);
                            const trigger = triggers[field.name];
                            if (val === 'target_miss') {
                              trigger.duration = 30;
                            } else if (val === 'offset') {
                              trigger.duration = 500;
                            } else if (val === 'agent_start_abnormal') {
                              trigger.duration = 180;
                            } else {
                              trigger.duration = 30;
                            }
                            form.setFieldsValue({
                              rule_config: {
                                triggers: triggers,
                              },
                            });
                          }}
                        >
                          {triggerTypeOptions.map((item) => (
                            <Select.Option key={item.value} value={item.value}>
                              {t(`host.trigger.key.${item.value}`)}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                      
                      <Form.Item shouldUpdate noStyle>
                      {({ getFieldValue }) => {
                          const type = getFieldValue(['rule_config', 'triggers', field.name, 'type']);
                          return (
                            <span>{type === 'agent_start_abnormal' ? '': t('host.trigger.than')} </span>
                          );
                        }}
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, 'duration']}
                        rules={[{ required: true, message: 'Missing duration' }]}
                      >
                        <InputNumber style={{ width: 80 }} min={1} step={1} />
                      </Form.Item>
                      <Form.Item shouldUpdate noStyle>
                        {({ getFieldValue }) => {
                          const type = getFieldValue(['rule_config', 'triggers', field.name, 'type']);
                          return (
                            <Space align='baseline'>
                              <span>
                                {type === 'pct_target_miss'
                                  ? t('host.trigger.pct_target_miss_text')
                                  : type === 'offset'
                                  ? t('host.trigger.millisecond')
                                  : type === 'agent_start_abnormal'
                                  ? t('host.trigger.agent_start_abnormal_text')
                                  : t('host.trigger.second')}
                              </span>
                              {type === 'pct_target_miss' && (
                                <>
                                  <Form.Item
                                    {...field}
                                    name={[field.name, 'percent']}
                                    rules={[{ required: true, message: 'Missing percent' }]}
                                  >
                                    <InputNumber style={{ width: 80 }} min={1} max={100} step={1} />
                                  </Form.Item>
                                  <span>%</span>
                                </>
                              )}
                              {type === 'agent_start_abnormal' && (
                                <>
                                  <Form.Item
                                    {...field}
                                    name={[field.name, 'count']}
                                    rules={[{ required: true, message: 'Missing count' }]}
                                  >
                                    <InputNumber style={{ width: 80 }} min={0} max={100} step={1} defaultValue={0}/>
                                  </Form.Item>
                                </>
                              )}
                            </Space>
                          );
                        }}
                      </Form.Item>
                    </Space>
                    <Row align='middle'>
                      <Col flex='350px' style={{ marginBottom: '18px', lineHeight: '32px' }}>
                        <Severity field={field} />
                      </Col>
                      <Col span={8}>
                        <AdditionalLabel field={field} />
                      </Col>
                    </Row>
                    {curBusiGroup.perm === 'rw' && (
                      <MinusCircleOutlined className='alert-rule-trigger-remove' onClick={() => remove(field.name)} />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </Form.List>
      </div>
    </div>
  );
}
