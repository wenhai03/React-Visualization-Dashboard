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
import React from 'react';
import { Form, Input, Row, Col, Select, Switch, Button, Space, Typography } from 'antd';
import { QuestionCircleOutlined, LinkOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import IndexSelect from '@/pages/dashboard/Editor/QueryEditor/Elasticsearch/IndexSelect';
import ClusterSelect from '@/pages/dashboard/Editor/QueryEditor/components/ClusterSelect';
import { Datasource } from '@/App';
import { IVariable } from './definition';
import {
  convertExpressionToQuery,
  replaceExpressionVars,
  filterOptionsByReg,
  setVaraiableSelected,
  stringToRegex,
} from './constant';

const { Paragraph, Text, Link } = Typography;

interface IProps {
  id: string;
  range: IRawTimeRange;
  index: number;
  data: IVariable;
  vars: IVariable[];
  datasourceVars: IVariable[];
  groupedDatasourceList: { [key: string]: Datasource[] };
  onOk: (val: IVariable) => void;
  onCancel: () => void;
}

const typeOptions = [
  {
    label: 'Query',
    value: 'query',
  },
  {
    label: 'Custom',
    value: 'custom',
  },
  {
    label: 'Text box',
    value: 'textbox',
  },
  {
    label: 'Constant',
    value: 'constant',
  },
  {
    label: 'Datasource',
    value: 'datasource',
  },
];

const allOptions = [
  {
    value: 'prometheus',
    label: 'Prometheus',
  },
  {
    value: 'elasticsearch',
    label: 'Elasticsearch',
  },
];

function DefinitionHelp(input: any) {
  if (input?.ds === 'prometheus') {
    return (
      <Typography>
        <Paragraph>
          从Prometheus指标中提取变量值列表，有几种方法，例如
          <ul style={{ margin: 0 }}>
            <li>
              <Text code copyable>
                label_names()
              </Text>
              <br />
              返回所有标签名
            </li>
            <li>
              <Text code copyable>
                label_values(job)
              </Text>
              <br />
              返回指定<Text code>job</Text>标签的所有值
            </li>
            <li>
              <Text code copyable>
                label_values(kernel_boot_time, ident)
              </Text>
              <br />
              返回<Text code>kernel_boot_time</Text>这个指标中<Text code>ident</Text>标签的所有值
            </li>
            <li>
              <Text code copyable>
                metrics(cpu)
              </Text>
              <br />
              返回指标名称中包含<Text code>cpu</Text>的指标名
            </li>
            <li>
              <Text code copyable>
                query_result(promQL)
              </Text>
              <br />
              返回指定<Text code>promQL</Text>查询语句的执行结果
            </li>
          </ul>
          <Link
            href='https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/#use-query-variables'
            target='_blank'
          >
            点击了解更多
            <LinkOutlined />
          </Link>
        </Paragraph>
      </Typography>
    );
  } else if (input?.ds === 'elasticsearch') {
    return (
      <Typography>
        <Paragraph>
          从Elasticsearch索引中提取变量值列表，有几种方法，例如
          <ul style={{ margin: 0 }}>
            {/* TODO 还不支持mapping查询
            <li><Text code>&#123;"find":"fields","type":"keyword"&#125;</Text><br/>返回索引类型为<Text code>keyword</Text>的字段名称列表</li>
            */}
            <li>
              <Text code copyable>
                &#123;"find": "terms","field":"hostname.keyword","timefield":"@timestamp","size":100&#125;
              </Text>
              <br />
              返回使用 term 聚合的关键字的值列表
            </li>
            <li>
              <Text code copyable>
                &#123;"find":"terms","field":"hostname","timefield":"@timestamp","query":"&lt;Lucene query&gt;"&#125;
              </Text>
              <br />
              返回使用 term 聚合和指定 Lucene 查询筛选条件的关键字字段的值列表
            </li>
          </ul>
          注意：<Text code>timefield</Text>字段是可选字段，表示索引的时间字段，用于按仪表盘时间段过滤。Lucene 可使用{' '}
          <Text code>$abc</Text> 引用其他变量。
          <br />
          <Link
            href='https://grafana.com/docs/grafana/latest/datasources/elasticsearch/template-variables/#create-a-query'
            target='_blank'
          >
            点击了解更多
            <LinkOutlined />
          </Link>
        </Paragraph>
      </Typography>
    );
  }
  return null;
}

function EditItem(props: IProps) {
  const { t } = useTranslation('dashboard');
  const { search } = useLocation();
  const query = queryString.parse(search);
  const bgid = Number(query.bgid);
  const { data, vars, range, id, index, datasourceVars, groupedDatasourceList, onOk, onCancel } = props;
  const [form] = Form.useForm();
  // TODO: 不太清楚这里的逻辑是干嘛的，后面找时间看下
  const handleBlur = (val?: string) => {
    const reg = data.reg;
    const expression = val || data.definition;
    if ((!reg || new RegExp('^/(.*?)/(g?i?m?y?)$').test(reg)) && expression && data) {
      const formData = form.getFieldsValue();
      var newExpression = replaceExpressionVars(expression, formData, index, id);
      convertExpressionToQuery(newExpression, range, data, bgid).then((res) => {
        const regFilterRes = filterOptionsByReg(res, reg, formData, index, id);
        if (regFilterRes.length > 0) {
          setVaraiableSelected({ name: formData.var[index].name, value: regFilterRes[0], id });
        }
      });
    }
  };

  return (
    <Form layout='vertical' autoComplete='off' preserve={false} form={form} initialValues={data}>
      <Row gutter={16}>
        <Col span={6}>
          <Form.Item
            label={t('var.name')}
            name='name'
            rules={[{ required: true }, { pattern: /^[0-9a-zA-Z_]+$/, message: t('var.name_msg') }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label={t('var.label')} name='label'>
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label={t('var.type')} name='type' rules={[{ required: true }]}>
            <Select
              style={{ width: '100%' }}
              onChange={() => {
                form.setFieldsValue({
                  definition: '',
                  defaultValue: '',
                });
              }}
            >
              {_.map(typeOptions, (item) => {
                return (
                  <Select.Option value={item.value} key={item.value}>
                    {item.label}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
        </Col>
        <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.type !== curValues.type} noStyle>
          {({ getFieldValue }) => {
            const type = getFieldValue('type');
            if (type !== 'constant') {
              return (
                <Col span={6}>
                  <Form.Item label={t('var.hide')} name='hide' valuePropName='checked'>
                    <Switch />
                  </Form.Item>
                </Col>
              );
            }
          }}
        </Form.Item>
      </Row>
      <Form.Item
        shouldUpdate={(prevValues, curValues) =>
          prevValues.type !== curValues.type || prevValues?.datasource?.cate !== curValues?.datasource?.cate
        }
        noStyle
      >
        {({ getFieldValue }) => {
          const type = getFieldValue('type');
          if (type === 'query') {
            return (
              <Form.Item
                shouldUpdate={(prevValues, curValues) => prevValues?.datasource?.cate !== curValues?.datasource?.cate}
                noStyle
              >
                {({ getFieldValue }) => {
                  const datasourceCate = getFieldValue(['datasource', 'cate']) || 'prometheus';
                  return (
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          label={t('common:datasource.type')}
                          name={['datasource', 'cate']}
                          rules={[{ required: true }]}
                          initialValue='prometheus'
                        >
                          <Select
                            dropdownMatchSelectWidth={false}
                            style={{ minWidth: 70 }}
                            onChange={() => {
                              form.setFieldsValue({
                                datasource: {
                                  value: undefined,
                                },
                              });
                            }}
                          >
                            {_.map(allOptions, (item) => (
                              <Select.Option key={item.value} value={item.value}>
                                {item.label}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <ClusterSelect
                          cate={datasourceCate}
                          label={t('common:datasource.id')}
                          name={['datasource', 'value']}
                          datasourceVars={datasourceVars}
                          groupId={query?.bgid as string}
                        />
                      </Col>
                      {datasourceCate === 'elasticsearch' && (
                        <>
                          <Col span={8}>
                            <Form.Item
                              shouldUpdate={(prevValues, curValues) =>
                                prevValues?.datasource?.value !== curValues?.datasource?.value
                              }
                              noStyle
                            >
                              {({ getFieldValue }) => {
                                let datasourceValue = getFieldValue(['datasource', 'value']);
                                datasourceValue = replaceExpressionVars(datasourceValue as any, vars, vars.length, id);
                                return (
                                  <IndexSelect
                                    name={['config', 'index']}
                                    cate={datasourceCate}
                                    datasourceValue={datasourceValue}
                                  />
                                );
                              }}
                            </Form.Item>
                          </Col>
                        </>
                      )}
                    </Row>
                  );
                }}
              </Form.Item>
            );
          }
        }}
      </Form.Item>

      <Form.Item
        shouldUpdate={(prevValues, curValues) =>
          prevValues.type !== curValues.type || prevValues?.datasource?.cate !== curValues?.datasource?.cate
        }
        noStyle
      >
        {({ getFieldValue }) => {
          const type = getFieldValue('type');
          const datasourceCate = getFieldValue(['datasource', 'cate']) || 'prometheus';
          if (type === 'query') {
            return (
              <>
                <Form.Item
                  label={t('var.definition')}
                  name='definition'
                  required
                  tooltip={{
                    title: <DefinitionHelp ds={datasourceCate} />,
                    color: 'white',
                    overlayInnerStyle: { width: '400px' },
                  }}
                  rules={[
                    () => ({
                      validator(_) {
                        const datasourceCate = getFieldValue(['datasource', 'cate']);
                        const definition = getFieldValue('definition');
                        if (definition) {
                          if (datasourceCate === 'elasticsearch') {
                            try {
                              JSON.parse(definition);
                              return Promise.resolve();
                            } catch (e) {
                              return Promise.reject('变量定义必须是合法的JSON');
                            }
                          }
                          return Promise.resolve();
                        } else {
                          return Promise.reject(new Error('请输入变量定义'));
                        }
                      },
                    }),
                  ]}
                >
                  <Input onBlur={(e) => handleBlur(e.target.value)} />
                </Form.Item>
                <Form.Item
                  label={t('var.reg')}
                  name='reg'
                  tooltip={t('var.reg_tip')}
                  rules={[{ pattern: new RegExp('^/(.*?)/(g?i?m?y?)$'), message: 'invalid regex' }]}
                >
                  <Input placeholder='/*.hna/' onBlur={() => handleBlur()} />
                </Form.Item>
              </>
            );
          } else if (type === 'textbox') {
            return (
              <Form.Item label={t('var.textbox.defaultValue')} name='defaultValue'>
                <Input onBlur={() => handleBlur()} />
              </Form.Item>
            );
          } else if (type === 'custom') {
            return (
              <Form.Item label={t('var.custom.definition')} name='definition' rules={[{ required: true }]}>
                <Input onBlur={() => handleBlur()} placeholder='1,10' />
              </Form.Item>
            );
          } else if (type === 'constant') {
            return (
              <Form.Item
                label={t('var.constant.definition')}
                name='definition'
                tooltip={t('var.constant.defaultValue_tip')}
                rules={[{ required: true }]}
              >
                <Input onBlur={() => handleBlur()} />
              </Form.Item>
            );
          } else if (type === 'datasource') {
            return (
              <>
                <Form.Item label={t('var.datasource.definition')} name='definition' rules={[{ required: true }]}>
                  <Select>
                    {_.map(allOptions, (item) => (
                      <Select.Option key={item.value} value={item.value}>
                        {item.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item label={t('var.datasource.regex')} name='regex' tooltip={t('var.datasource.regex_tip')}>
                  <Input />
                </Form.Item>
                <Form.Item
                  shouldUpdate={(prevValues, curValues) =>
                    prevValues?.definition !== curValues?.regex || prevValues?.regex
                  }
                  noStyle
                >
                  {({ getFieldValue }) => {
                    const definition = getFieldValue('definition');
                    const regex = getFieldValue('regex');
                    return (
                      <Form.Item label={t('var.datasource.defaultValue')} name='defaultValue'>
                        <Select>
                          {_.map(
                            _.filter(groupedDatasourceList[definition], (item) => {
                              if (regex) {
                                const reg = stringToRegex(regex);
                                return reg ? reg.test(item.name) : false;
                              }
                              return true;
                            }),
                            (item) => (
                              <Select.Option key={item.id} value={item.id}>
                                {item.name}
                              </Select.Option>
                            ),
                          )}
                        </Select>
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </>
            );
          }
        }}
      </Form.Item>
      <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.type !== curValues.type} noStyle>
        {({ getFieldValue }) => {
          const type = getFieldValue('type');
          if (type === 'query' || type === 'custom') {
            return (
              <Row gutter={16}>
                <Col flex='120px'>
                  <Form.Item label={t('var.multi')} name='multi' valuePropName='checked'>
                    <Switch />
                  </Form.Item>
                </Col>
                <Col flex='120px'>
                  <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.multi !== curValues.multi} noStyle>
                    {({ getFieldValue }) => {
                      const multi = getFieldValue('multi');
                      if (multi) {
                        return (
                          <Form.Item label={t('var.allOption')} name='allOption' valuePropName='checked'>
                            <Switch />
                          </Form.Item>
                        );
                      }
                    }}
                  </Form.Item>
                </Col>
                <Col flex='auto'>
                  <Form.Item shouldUpdate noStyle>
                    {({ getFieldValue }) => {
                      const multi = getFieldValue('multi');
                      const allOption = getFieldValue('allOption');
                      const datasourceCate = getFieldValue(['datasource', 'cate']);
                      if (multi && allOption) {
                        return (
                          <Form.Item label={t('var.allValue')} name='allValue'>
                            <Input placeholder={datasourceCate === 'elasticsearch' ? '*' : '.*'} />
                          </Form.Item>
                        );
                      }
                    }}
                  </Form.Item>
                </Col>
              </Row>
            );
          }
        }}
      </Form.Item>
      <Form.Item>
        <Space>
          <Button
            type='primary'
            onClick={() => {
              form.validateFields().then((res) => {
                onOk(res);
              });
            }}
          >
            {t('common:btn.save')}
          </Button>
          <Button onClick={onCancel}>{t('common:btn.cancel')}</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

export default EditItem;
