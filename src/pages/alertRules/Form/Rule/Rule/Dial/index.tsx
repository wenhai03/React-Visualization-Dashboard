import React, { useEffect, useState, useContext } from 'react';
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Form, Space, Select, Card, Row, Col } from 'antd';
import { CommonStateContext } from '@/App';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import DatasourceValueSelect from '@/pages/alertRules/Form/components/DatasourceValueSelect';
import { DatasourceCateSelect } from '@/components/DatasourceSelect';
import AdditionalLabel from '@/pages/alertRules/Form/components/AdditionalLabel';
import Severity from '@/pages/alertRules/Form/components/Severity';
import { getDialTaskList } from '@/services/dial';
import Inhibit from '@/pages/alertRules/Form/components/Inhibit';
import { getDefaultValuesByCate } from '../../../utils';

export default function Dial() {
  const { t } = useTranslation('alertRules');
  const { curBusiId, groupedDatasourceList, curBusiGroup } = useContext(CommonStateContext);
  const form = Form.useFormInstance();
  const [options, setOptions] = useState<any[]>([]);
  const [httpAndWhoisTasks, sethttpAndWhoisTasks] = useState<any[]>([]);

  useEffect(() => {
    const params = {
      p: 1,
      limit: 1000,
      bgid: curBusiId,
    };
    getDialTaskList(params).then((res) => {
      setOptions(res.dat.list);
    });
    getDialTaskList({ ...params, category: 'dial:dial_http,dial:dial_whois' }).then((res) => {
      sethttpAndWhoisTasks(res.dat.list);
    });
  }, []);

  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={t('common:datasource.type')} name='cate'>
            <DatasourceCateSelect
              scene='alert'
              filterCates={(cates) => {
                return _.filter(cates, (item) => item.type === 'dial' && !!item.alertRule);
              }}
              onChange={(val) => {
                form.setFieldsValue(getDefaultValuesByCate('dial', val));
              }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.cate !== curValues.cate} noStyle>
            {({ getFieldValue, setFieldsValue }) => {
              const cate = getFieldValue('cate');
              return (
                <DatasourceValueSelect
                  setFieldsValue={setFieldsValue}
                  cate={cate}
                  datasourceList={groupedDatasourceList[cate] || []}
                  mode={cate === 'prometheus' ? 'multiple' : undefined}
                />
              );
            }}
          </Form.Item>
        </Col>
      </Row>
      <div style={{ marginBottom: 10 }}>
        <Form.List name={['rule_config', 'queries']}>
          {(fields, { add, remove }) => (
            <Card
              title={
                <Space>
                  <span>{t('host.trigger.title')}</span>
                  {curBusiGroup.perm === 'rw' && (
                    <PlusCircleOutlined
                      onClick={() =>
                        add({
                          type: 'all',
                          severity: 2,
                          alert_type: 'fail',
                        })
                      }
                    />
                  )}
                  <Inhibit triggersKey='queries' />
                </Space>
              }
              size='small'
            >
              <div className='alert-rule-triggers-container'>
                {fields.map((field) => (
                  <div key={field.key} className='alert-rule-trigger-container'>
                    <Space align='baseline'>
                      {t('dial.tasks')}:
                      <Form.Item
                        {...field}
                        name={[field.name, 'alert_type']}
                        rules={[{ required: true, message: 'Missing value' }]}
                      >
                        <Select style={{ width: '100px' }}>
                          <Select.Option key='fail' value='fail'>
                            {t('dial.fail')}
                          </Select.Option>
                          <Select.Option key='expiration' value='expiration'>
                            {t('dial.expiration')}
                          </Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, 'type']}
                        rules={[{ required: true, message: 'Missing value' }]}
                      >
                        <Select
                          style={{ width: '100px' }}
                          onChange={(e) => {
                            const queries = form.getFieldValue(['rule_config', 'queries']);
                            delete queries.task_ids;
                            queries.type = e;
                            if (e === 'tasks') {
                              queries.task_ids = [];
                            }
                            form.setFieldsValue({
                              rule_config: {
                                queries,
                              },
                            });
                          }}
                        >
                          <Select.Option key='all' value='all'>
                            {t('dial.all')}
                          </Select.Option>
                          <Select.Option key='tasks' value='tasks'>
                            {t('dial.tasks')}
                          </Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item shouldUpdate noStyle>
                        {({ getFieldValue }) => {
                          const type = getFieldValue(['rule_config', 'queries', field.name, 'type']);
                          const alertType = getFieldValue(['rule_config', 'queries', field.name, 'alert_type']);
                          const data = alertType === 'fail' ? options : httpAndWhoisTasks;
                          if (type === 'all') return null;
                          return (
                            <Form.Item
                              {...field}
                              name={[field.name, 'task_ids']}
                              rules={[{ required: true, message: 'Missing value' }]}
                            >
                              <Select
                                mode='multiple'
                                showSearch
                                optionFilterProp='children'
                                style={{ minWidth: 200, maxWidth: 600 }}
                              >
                                {data.map((item) => (
                                  <Select.Option value={item.dial_id} key={item.dial_id} showSearch>
                                    {item.name}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
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
