import React, { useEffect, useState, useContext, useCallback } from 'react';
import { MinusCircleOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { CommonStateContext } from '@/App';
import { Form, Space, Select, Card, Row, Col, InputNumber, Button, Input, Tooltip, Spin, AutoComplete } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { useTranslation, Trans } from 'react-i18next';
import DatasourceValueSelect from '@/pages/alertRules/Form/components/DatasourceValueSelect';
import { DatasourceCateSelect } from '@/components/DatasourceSelect';
import AdditionalLabel from '@/pages/alertRules/Form/components/AdditionalLabel';
import Severity from '@/pages/alertRules/Form/components/Severity';
import { searchAlertTest, getFieldcaps } from '@/services/warning';
import {
  getServiceEnvironments,
  getServiceTransactionTypes,
  getServiceName,
  getTransactionName,
} from '@/services/traces';
import { Column } from '@ant-design/plots';
import { getFieldsForWildcard } from '@/components/SearchBar/utils';
import Inhibit from '@/pages/alertRules/Form/components/Inhibit';
import { defaultRuleConfig } from '../../../../Form/constants';
import { getDefaultValuesByCate } from '../../../utils';
import { conversionTime } from '@/pages/traces/utils';

export default function Apm({ isBuiltin }) {
  const { t } = useTranslation('alertRules');
  const { curBusiId, groupedDatasourceList, curBusiGroup, ESIndex } = useContext(CommonStateContext);
  const form = Form.useFormInstance();
  // 服务列表
  const [serviceList, setServiceList] = useState<{ label: string; value: string }[]>([{ label: '全部', value: '' }]);
  // 环境列表
  const [environmentList, setEnvironmentList] = useState<{ label: string; value: string }[]>([
    { label: '全部', value: '' },
  ]);
  // 事务类型列表
  const [transtionTypeList, setTranstionTypeList] = useState<{ label: string; value: string }[]>([
    { label: '全部', value: '' },
  ]);
  const [loading, setLoading] = useState(false);
  // 取值字段
  const [fieldsData, setFieldsData] = useState<any>([]);
  const chartConfig: any = {
    xField: 'x',
    yField: 'y',
    animation: false,
    color: '#0065D9',
  };

  // 测试查询
  const onTestFetch = async (index) => {
    let data_id = form.getFieldValue('datasource_ids')[0];
    if (data_id === 0 && groupedDatasourceList.elasticsearch?.length) {
      data_id = groupedDatasourceList.elasticsearch[0].id;
    }
    let queries = form.getFieldValue(['rule_config', 'queries']);
    const type = queries[index].type;
    const get_value_type = queries[index].rule.get_value_type;
    const requestBody: any = {
      busi_group_id: curBusiId,
      datasource_id: data_id,
      query: {
        type: type,
        rule: {
          search_time: queries[index].rule.search_time,
          service_name: queries[index].rule.service_name,
          service_environment: queries[index].rule.service_environment,
          transaction_type: queries[index].rule.transaction_type,
          transaction_name: queries[index].rule.transaction_name,
          url_path: queries[index].rule.url_path,
          excludes: queries[index].rule.excludes,
        },
      },
    };

    if (type === 'apm_latency') {
      requestBody.query.rule.get_value_type = get_value_type;
    }

    searchAlertTest(requestBody).then((res) => {
      let queries = form.getFieldValue(['rule_config', 'queries']);
      const points = _.get(res, 'dat.aggregations.timeseries.buckets');
      if (type === 'apm_error') {
        queries[index].points = points.map((item) => ({
          x: moment(item.key).format('YYYY-MM-DD HH:mm:ss'),
          y: item.doc_count,
        }));
      } else if (type === 'apm_failed') {
        queries[index].points = points.map((item) => {
          const failure = item.outcomes.buckets.find((ele) => ele.key === 'failure') || { doc_count: 0 };
          return {
            x: moment(item.key).format('YYYY-MM-DD HH:mm:ss'),
            y: (failure?.doc_count / item.doc_count) * 100,
          };
        });
      } else if (type === 'apm_latency') {
        queries[index].points = points.map((item) => ({
          x: moment(item.key).format('YYYY-MM-DD HH:mm:ss'),
          y:
            get_value_type === 'avg'
              ? item.agg.value
                ? item.agg.value / 1000
                : 0
              : get_value_type === '95th'
              ? item.agg.values['95.0']
                ? item.agg.values['95.0'] / 1000
                : 0
              : item.agg.values['99.0']
              ? item.agg.values['99.0'] / 1000
              : 0,
        }));
      }

      form.setFieldsValue({ rule_config: { queries } });
    });
  };

  // 重新请求服务、环境、事务类型列表
  const resetData = (elasticsearch) => {
    let data_id = form.getFieldValue('datasource_ids')[0];
    if (data_id === 0 && elasticsearch?.length) {
      data_id = elasticsearch[0].id;
    }
    if (data_id) {
      const timeRange = conversionTime('now-24h', 'now');
      const requestParams = {
        busi_group_id: curBusiId,
        datasource_id: data_id,
        ...timeRange,
      };
      Promise.all([
        getServiceName(requestParams),
        getServiceEnvironments(requestParams),
        getServiceTransactionTypes(requestParams),
      ]).then(([serviceName, serviceEnvironments, typeList]) => {
        const newEnvironmentList =
          serviceEnvironments?.aggregations?.environments?.buckets?.map((item) => ({
            key: item.key,
            value: item.key,
          })) || [];
        const newServiceList =
          serviceName?.aggregations?.service_names?.buckets?.map((item) => ({ key: item.key, value: item.key })) || [];
        const newTypeList =
          typeList?.aggregations?.types?.buckets?.map((item) => ({ key: item.key, value: item.key })) || [];
        setEnvironmentList([{ label: '全部', value: '' }, ...newEnvironmentList]);
        setServiceList([{ label: '全部', value: '' }, ...newServiceList]);
        setTranstionTypeList([{ label: '全部', value: '' }, ...newTypeList]);
      });
    }
  };

  const changeType = (elasticsearch) => {
    let data_id = form.getFieldValue('datasource_ids')[0];
    if (data_id === 0 && elasticsearch?.length) {
      data_id = elasticsearch[0].id;
    }
    if (data_id) {
      const params = {
        busi_group_id: curBusiId,
        datasource_id: data_id,
        mode: 'common' as 'host' | 'container' | 'pod' | 'graf' | 'common',
        indexed: ESIndex.elastic_apm_index,
        fields: '_source,_id,_index,_score,*',
      };
      getFieldcaps(params)
        .then((res) => {
          const fields = getFieldsForWildcard(res.dat) || [];
          setFieldsData(fields);
        })
        .catch((e) => {
          setFieldsData([]);
        });
    }
  };

  useEffect(() => {
    if (curBusiId) {
      changeType(groupedDatasourceList.elasticsearch);
      resetData(groupedDatasourceList.elasticsearch);
    }
  }, [curBusiId]);

  const getTransactionNameList = (val, index, elasticsearch) => {
    let data_id = form.getFieldValue('datasource_ids')[0];
    let queries = form.getFieldValue(['rule_config', 'queries']);
    if (data_id === 0 && elasticsearch?.length) {
      data_id = elasticsearch[0].id;
    }

    if (data_id && curBusiId) {
      const timeRange = conversionTime('now-24h', 'now');
      setLoading(true);
      getTransactionName({
        busi_group_id: curBusiId,
        datasource_id: data_id,
        size: 10,
        filter_query: val,
        ...timeRange,
      })
        .then((res) => {
          const result =
            res?.aggregations?.transaction_names?.buckets?.map((item) => ({ key: item.key, value: item.key })) || [];
          queries[index].transactionNames = result;
          setLoading(false);
        })
        .catch((err) => setLoading(false));
    }
  };

  const onTransactionNameChange = useCallback(_.debounce(getTransactionNameList, 1000), []);
  return (
    <div>
      <Row gutter={8} wrap>
        <Col span={12}>
          <Form.Item label={t('common:datasource.type')} name='cate'>
            <DatasourceCateSelect
              scene='alert'
              filterCates={(cates) => {
                return _.filter(cates, (item) => item.type === 'apm' && !!item.alertRule);
              }}
              onChange={(val) => {
                form.setFieldsValue(getDefaultValuesByCate('apm', val));
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
                  isExistAll={isBuiltin}
                  mode={cate === 'prometheus' ? 'multiple' : undefined}
                  datasourceList={groupedDatasourceList[cate] || []}
                  onChange={() => resetData(groupedDatasourceList[cate])}
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
                    <PlusCircleOutlined onClick={() => add(defaultRuleConfig.apm.queries[0])} />
                  )}
                  <Inhibit triggersKey='queries' />
                </Space>
              }
              size='small'
            >
              <div className='alert-rule-triggers-container'>
                {fields.map((field) => {
                  const namePrefix = ['rule_config', 'queries', field.name];

                  return (
                    <div key={field.key} className='alert-rule-trigger-container'>
                      <Row gutter={8}>
                        <Col span={8}>
                          <Row gutter={8}>
                            <Col flex='70px' style={{ marginTop: 6 }}>
                              {t('apm.type')} :
                            </Col>
                            <Col flex='auto'>
                              <Form.Item
                                {...field}
                                name={[field.name, 'type']}
                                rules={[{ required: true, message: 'Missing value' }]}
                              >
                                <Select
                                  onChange={(e) => {
                                    const queries = form.getFieldValue(['rule_config', 'queries']);
                                    if (e === 'apm_error') {
                                      queries[field.name].rule.check_value.values = [25];
                                      queries[field.name].rule.search_time = {
                                        size: 1,
                                        unit: 'm',
                                      };
                                    } else if (e === 'apm_failed') {
                                      queries[field.name].rule.check_value.values = [30];
                                      queries[field.name].rule.search_time = {
                                        size: 5,
                                        unit: 'm',
                                      };
                                    } else if (e === 'apm_latency') {
                                      queries[field.name].rule.check_value.values = [1500];
                                      queries[field.name].rule.search_time = {
                                        size: 5,
                                        unit: 'm',
                                      };
                                    }
                                    queries[field.name].points = undefined;
                                    queries[field.name].rule.data_fields = [];
                                    changeType(groupedDatasourceList.elasticsearch);
                                  }}
                                >
                                  <Select.Option key='apm_error' value='apm_error'>
                                    {t('apm.error_count_threshold')}
                                  </Select.Option>
                                  <Select.Option key='apm_failed' value='apm_failed'>
                                    {t('apm.failed_transaction_rate_threshold')}
                                  </Select.Option>
                                  <Select.Option key='apm_latency' value='apm_latency'>
                                    {t('apm.latency_threshold')}
                                  </Select.Option>
                                </Select>
                              </Form.Item>
                            </Col>
                          </Row>
                        </Col>
                        <Col span={8} style={{ lineHeight: '32px', minWidth: '350px' }}>
                          <Severity field={field} />
                        </Col>
                        <Col span={8}>
                          <AdditionalLabel field={field} />
                        </Col>
                        <Col span={8}>
                          <Row gutter={8}>
                            <Col flex='70px' style={{ marginTop: 6 }}>
                              {t('apm.service')} :
                            </Col>
                            <Col flex='auto'>
                              <Form.Item {...field} name={[field.name, 'rule', 'service_name']}>
                                <Select showSearch>
                                  {serviceList?.map((item) => (
                                    <Select.Option key={item.value} value={item.value}>
                                      {item.label}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            </Col>
                          </Row>
                        </Col>
                        <Col span={8}>
                          <Row gutter={8}>
                            <Col flex='70px' style={{ marginTop: 6 }}>
                              {t('apm.environment')} :
                            </Col>
                            <Col flex='auto'>
                              <Form.Item {...field} name={[field.name, 'rule', 'service_environment']}>
                                <Select showSearch>
                                  {environmentList?.map((item) => (
                                    <Select.Option key={item.value} value={item.value}>
                                      {item.label}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            </Col>
                          </Row>
                        </Col>
                        <Form.Item
                          shouldUpdate={(prevValues, curValues) =>
                            _.get(prevValues, [...namePrefix, 'type']) !== _.get(curValues, [...namePrefix, 'type']) ||
                            _.get(prevValues, [...namePrefix, 'transactionNames']) !==
                              _.get(curValues, [...namePrefix, 'transactionNames'])
                          }
                          noStyle
                        >
                          {({ getFieldValue }) => {
                            const type = getFieldValue([...namePrefix, 'type']);
                            const data = getFieldValue(namePrefix);
                            const maxPoint = data.points?.filter((item) => item.y > data.rule.check_value.values[0]);
                            return (
                              <>
                                <Col span={8}>
                                  <Row gutter={8}>
                                    <Col flex='70px' style={{ marginTop: 6 }}>
                                      {t('apm.transaction_type')} :
                                    </Col>
                                    <Col flex='auto'>
                                      <Form.Item {...field} name={[field.name, 'rule', 'transaction_type']}>
                                        <Select showSearch>
                                          {transtionTypeList?.map((item) => (
                                            <Select.Option key={item.value} value={item.value}>
                                              {item.label}
                                            </Select.Option>
                                          ))}
                                        </Select>
                                      </Form.Item>
                                    </Col>
                                  </Row>
                                </Col>
                                <Col span={8}>
                                  <Row gutter={8}>
                                    <Col flex='70px' style={{ marginTop: 6 }}>
                                      {t('apm.transaction_name')}:
                                    </Col>
                                    <Col flex='auto'>
                                      <Form.Item {...field} name={[field.name, 'rule', 'transaction_name']}>
                                        <AutoComplete
                                          allowClear
                                          showSearch
                                          filterOption={false}
                                          placeholder={t('apm.empty_placeholder')}
                                          onSearch={(e) =>
                                            onTransactionNameChange(e, field.name, groupedDatasourceList.elasticsearch)
                                          }
                                          onDropdownVisibleChange={(open) => {
                                            if (open) {
                                              getTransactionNameList(
                                                data.rule.transaction_name,
                                                field.name,
                                                groupedDatasourceList.elasticsearch,
                                              );
                                            }
                                          }}
                                          notFoundContent={loading ? <Spin size='small' /> : null}
                                          options={loading ? [] : data.transactionNames || []}
                                        />
                                      </Form.Item>
                                    </Col>
                                  </Row>
                                </Col>
                                <Col span={8}>
                                  <Row gutter={8}>
                                    <Col flex='70px' style={{ marginTop: 6 }}>
                                      Http Path:
                                    </Col>
                                    <Col flex='auto'>
                                      <Form.Item {...field} name={[field.name, 'rule', 'url_path']}>
                                        <Input placeholder={t('apm.empty_placeholder')} />
                                      </Form.Item>
                                    </Col>
                                  </Row>
                                </Col>
                                <Col span={8}>
                                  <Row gutter={8}>
                                    <Col flex='80px' style={{ marginTop: 6 }}>
                                      {t('log.data_fields')}
                                      <Tooltip
                                        title={
                                          <Trans
                                            ns='alertRules'
                                            i18nKey='log.data_fields_tip'
                                            components={{ 1: '{{', 2: '}}' }}
                                          ></Trans>
                                        }
                                      >
                                        <QuestionCircleOutlined style={{ padding: '0 3px' }} />
                                      </Tooltip>
                                      :
                                    </Col>
                                    <Col flex='auto'>
                                      <Form.Item {...field} name={[field.name, 'rule', 'data_fields']}>
                                        <Select showSearch allowClear mode='multiple'>
                                          {fieldsData
                                            ?.filter(
                                              (ele) => !['_id', '_index', '_scorer', '_source'].includes(ele.name),
                                            )
                                            .map((item) => (
                                              <Select.Option key={item.name}>{item.name}</Select.Option>
                                            ))}
                                        </Select>
                                      </Form.Item>
                                    </Col>
                                  </Row>
                                </Col>
                                {type === 'apm_error' && (
                                  <Col span={8}>
                                    <Row gutter={8}>
                                      <Col flex='70px' style={{ marginTop: 6 }}>
                                        {t('apm.excludes')}:
                                      </Col>
                                      <Col flex='auto'>
                                        <Form.Item {...field} name={[field.name, 'rule', 'excludes']}>
                                          <Select mode='tags' open={false} placeholder={t('apm.excludes_placehlder')} />
                                        </Form.Item>
                                      </Col>
                                    </Row>
                                  </Col>
                                )}
                                {type === 'apm_latency' && (
                                  <Col span={8}>
                                    <Row gutter={8}>
                                      <Col flex='70px' style={{ marginTop: 6, textAlign: 'right' }}>
                                        {t('apm.summary_type')} :
                                      </Col>
                                      <Col flex='auto'>
                                        <Form.Item
                                          {...field}
                                          name={[field.name, 'rule', 'get_value_type']}
                                          rules={[{ required: true, message: 'Missing value' }]}
                                        >
                                          <Select>
                                            <Select.Option key='avg' value='avg'>
                                              {t('apm.avg')}
                                            </Select.Option>
                                            <Select.Option key='95th' value='95th'>
                                              {t('apm.95th')}
                                            </Select.Option>
                                            <Select.Option key='99th' value='99th'>
                                              {t('apm.99th')}
                                            </Select.Option>
                                          </Select>
                                        </Form.Item>
                                      </Col>
                                    </Row>
                                  </Col>
                                )}
                                <Col span={8}>
                                  <Row gutter={8}>
                                    <Col flex='70px' style={{ marginTop: 6 }}>
                                      {t('apm.gt')} :
                                    </Col>
                                    <Col flex='auto'>
                                      <Form.Item
                                        {...field}
                                        name={[field.name, 'rule', 'check_value', 'values', 0]}
                                        rules={[{ required: true, message: 'Missing value' }]}
                                      >
                                        <InputNumber
                                          style={{ width: '100%' }}
                                          min={0}
                                          precision={0}
                                          addonAfter={
                                            type === 'apm_error'
                                              ? t('apm.error')
                                              : type === 'apm_failed'
                                              ? '%'
                                              : type === 'apm_latency'
                                              ? 'ms'
                                              : undefined
                                          }
                                        />
                                      </Form.Item>
                                    </Col>
                                  </Row>
                                </Col>
                                <Col span={8}>
                                  <Row gutter={8} wrap={false}>
                                    <Col flex='70px' style={{ marginTop: 6 }}>
                                      {t('apm.formerly')} :
                                    </Col>
                                    <Col flex='auto'>
                                      <Form.Item
                                        {...field}
                                        name={[field.name, 'rule', 'search_time', 'size']}
                                        rules={[{ required: true, message: 'Missing value' }]}
                                      >
                                        <InputNumber style={{ width: '100%' }} min={0} precision={0} />
                                      </Form.Item>
                                    </Col>
                                    <Col flex='100px'>
                                      <Form.Item
                                        {...field}
                                        name={[field.name, 'rule', 'search_time', 'unit']}
                                        rules={[{ required: true, message: 'Missing value' }]}
                                      >
                                        <Select>
                                          <Select.Option key='s' value='s'>
                                            {t('log.seconds')}
                                          </Select.Option>
                                          <Select.Option key='m' value='m'>
                                            {t('log.minutes')}
                                          </Select.Option>
                                          <Select.Option key='h' value='h'>
                                            {t('log.hour')}
                                          </Select.Option>
                                          <Select.Option key='d' value='d'>
                                            {t('log.day')}
                                          </Select.Option>
                                        </Select>
                                      </Form.Item>
                                    </Col>
                                  </Row>
                                </Col>
                                <Col span={8}>
                                  <Button type='primary' onClick={() => onTestFetch(field.name)}>
                                    {t('log.test_query')}
                                  </Button>
                                </Col>
                                {data.points && (
                                  <Col span={24}>
                                    <Column
                                      {...chartConfig}
                                      annotations={[
                                        {
                                          type: 'line',
                                          id: 'line',
                                          /** 起始位置 */
                                          start: ['min', data.rule.check_value.values[0]],
                                          /** 结束位置 */
                                          end: ['max', data.rule.check_value.values[0]],
                                          style: {
                                            stroke: '#f48a8f',
                                            lineWidth: 2,
                                            lineDash: [4, 2],
                                          },
                                        },
                                      ]}
                                      yAxis={{
                                        max: maxPoint?.length ? undefined : data.rule.check_value.values[0],
                                        label: {
                                          formatter: (val) => (data.type === 'apm_failed' ? val + '%' : val),
                                        },
                                      }}
                                      tooltip={{
                                        formatter: (datum) => ({
                                          name: datum.x,
                                          value: data.type === 'apm_failed' ? datum.y + '%' : datum.y,
                                        }),
                                      }}
                                      data={data.points}
                                      height={200}
                                      style={{ padding: '10px' }}
                                    />
                                  </Col>
                                )}
                              </>
                            );
                          }}
                        </Form.Item>
                      </Row>
                      {curBusiGroup.perm === 'rw' && (
                        <MinusCircleOutlined className='alert-rule-trigger-remove' onClick={() => remove(field.name)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </Form.List>
      </div>
    </div>
  );
}
