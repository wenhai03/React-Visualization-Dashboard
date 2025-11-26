import React from 'react';
import { Form, Row, Col, Input, Button, InputNumber, Typography } from 'antd';
import { DeleteOutlined, LinkOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import IndexSelect from './IndexSelect';
import Values from './Values';
import GroupBy from './GroupBy';
import OrderBy from './OrderBy';
import Time from './Time';
import Collapse, { Panel } from '../../Components/Collapse';
import getFirstUnusedLetter from '../../../Renderer/utils/getFirstUnusedLetter';
import { replaceExpressionVars } from '../../../VariableConfig/constant';

const alphabet = 'ABCDEFGHIGKLMNOPQRSTUVWXYZ'.split('');

const { Paragraph, Text, Link } = Typography;

function EsFilterHelp() {
  return (
    <Typography>
      <Paragraph>
        使用Elasticsearch query string语法，注意AND/OR大写，例如：
        <br />
        <Text code>field1:value1 AND field2:$var</Text>
        <br />
        提示：可使用 <Text code>$abc</Text> 引用变量值。
        <br />
        <Link
          href='https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#query-string-syntax'
          target='_blank'
        >
          点击了解更多
          <LinkOutlined />
        </Link>
      </Paragraph>
    </Typography>
  );
}

export default function Elasticsearch({ chartForm, variableConfig, dashboardId }) {
  const { t } = useTranslation('dashboard');

  return (
    <Form.List name='targets'>
      {(fields, { add, remove }, { errors }) => {
        return (
          <>
            <Collapse>
              {_.map(fields, (field, index) => {
                const prefixName = ['targets', field.name];

                return (
                  <Panel
                    header={
                      <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => {
                          return getFieldValue([...prefixName, 'refId']) || alphabet[index];
                        }}
                      </Form.Item>
                    }
                    key={field.key}
                    extra={
                      <div>
                        {fields.length > 1 ? (
                          <DeleteOutlined
                            style={{ marginLeft: 10 }}
                            onClick={() => {
                              remove(field.name);
                            }}
                          />
                        ) : null}
                      </div>
                    }
                  >
                    <Form.Item noStyle {...field} name={[field.name, 'refId']} hidden />
                    <Row gutter={10}>
                      <Col span={12}>
                        <Form.Item
                          shouldUpdate={(prevValues, curValues) =>
                            _.isEqual(prevValues.datasourceValue, curValues.datasourceValue)
                          }
                          noStyle
                        >
                          {({ getFieldValue }) => {
                            let datasourceValue = getFieldValue('datasourceValue');
                            datasourceValue = replaceExpressionVars(
                              datasourceValue as any,
                              variableConfig,
                              variableConfig.length,
                              dashboardId,
                            );
                            return (
                              <IndexSelect
                                prefixField={field}
                                prefixName={[field.name]}
                                cate={getFieldValue('datasourceCate')}
                                datasourceValue={datasourceValue}
                              />
                            );
                          }}
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label={t('datasource:es.filter')}
                          {...field}
                          name={[field.name, 'query', 'filter']}
                          tooltip={{ title: <EsFilterHelp />, color: 'white', overlayInnerStyle: { width: '400px' } }}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item shouldUpdate noStyle>
                      {({ getFieldValue }) => {
                        let datasourceValue = getFieldValue('datasourceValue');
                        datasourceValue = replaceExpressionVars(
                          datasourceValue as any,
                          variableConfig,
                          variableConfig.length,
                          dashboardId,
                        );

                        return (
                          <>
                            <Values
                              prefixField={field}
                              prefixFields={['targets']}
                              prefixNameField={[field.name]}
                              datasourceValue={datasourceValue}
                              index={getFieldValue([...prefixName, 'query', 'index'])}
                              valueRefVisible={false}
                            />
                            <Form.Item
                              shouldUpdate={(prevValues, curValues) => {
                                const preQueryValues = _.get(prevValues, [...prefixName, 'query', 'values']);
                                const curQueryValues = _.get(curValues, [...prefixName, 'query', 'values']);
                                return !_.isEqual(preQueryValues, curQueryValues);
                              }}
                              noStyle
                            >
                              {({ getFieldValue }) => {
                                const targetQueryValues = getFieldValue([...prefixName, 'query', 'values']);
                                // 当提取日志原文时不显示 groupBy 设置
                                if (_.get(targetQueryValues, [0, 'func']) === 'rawData') {
                                  return (
                                    <Row gutter={10}>
                                      <Col span={24}>
                                        <OrderBy
                                          backgroundVisible={false}
                                          parentNames={['targets']}
                                          prefixField={field}
                                          prefixFieldNames={[field.name, 'query']}
                                          datasourceValue={datasourceValue}
                                          index={getFieldValue([...prefixName, 'query', 'index'])}
                                        />
                                      </Col>
                                      <Col span={12}>
                                        <Form.Item
                                          label={t('datasource:es.date_field')}
                                          {...field}
                                          name={[field.name, 'query', 'date_field']}
                                          rules={[
                                            {
                                              required: true,
                                              message: t('datasource:es.date_field_msg'),
                                            },
                                          ]}
                                        >
                                          <Input />
                                        </Form.Item>
                                      </Col>
                                      <Col span={12}>
                                        <Form.Item
                                          label={t('datasource:es.raw.limit')}
                                          {...field}
                                          name={[field.name, 'query', 'limit']}
                                        >
                                          <InputNumber style={{ width: '100%' }} />
                                        </Form.Item>
                                      </Col>
                                    </Row>
                                  );
                                }
                                return (
                                  <>
                                    <GroupBy
                                      backgroundVisible={false}
                                      parentNames={['targets']}
                                      prefixField={field}
                                      prefixFieldNames={[field.name, 'query']}
                                      datasourceValue={datasourceValue}
                                      index={getFieldValue([...prefixName, 'query', 'index'])}
                                    />
                                    <Time
                                      prefixField={field}
                                      prefixNameField={[field.name]}
                                      datasourceValue={datasourceValue}
                                      index={getFieldValue([...prefixName, 'query', 'index'])}
                                    />
                                  </>
                                );
                              }}
                            </Form.Item>
                          </>
                        );
                      }}
                    </Form.Item>
                    <Row gutter={10}>
                      {/* legend 填写变量可以取自 Group By 的 Field key 配置 */}
                      <Col flex='auto'>
                        <Form.Item
                          label='Legend'
                          {...field}
                          name={[field.name, 'legend']}
                          tooltip={{
                            getPopupContainer: () => document.body,
                            overlayInnerStyle: { width: 420 },
                            title: (
                              <pre style={{ whiteSpace: 'pre-wrap' }}>{`控制时间序列的名称，可以使用名称或模式。例如:
prometheus时，{{hostname}} 将被替换为标签 hostname 的标签值。
elasticsearch时，terms类型为field_key时，使用{{字段名称}}; 当terms类型为script时，使用{{Script名称}},默认{{terms_script}}。`}</pre>
                            ),
                          }}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Panel>
                );
              })}

              <Form.ErrorList errors={errors} />
            </Collapse>
            <Button
              style={{ width: '100%', marginTop: 10 }}
              onClick={() => {
                add({
                  query: {
                    values: [
                      {
                        func: 'count',
                      },
                    ],
                    date_field: '@timestamp',
                    interval: '',
                    interval_unit: 'min',
                  },
                  refId: getFirstUnusedLetter(_.map(chartForm.getFieldValue('targets'), 'refId')),
                });
              }}
            >
              + add query
            </Button>
          </>
        );
      }}
    </Form.List>
  );
}
