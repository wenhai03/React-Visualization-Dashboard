import React, { useEffect, useState, useContext, useRef } from 'react';
import { MinusCircleOutlined, PlusCircleOutlined, QuestionCircleOutlined, EditOutlined } from '@ant-design/icons';
import { CommonStateContext } from '@/App';
import {
  Form,
  Space,
  Select,
  Card,
  Row,
  Col,
  Input,
  InputNumber,
  Button,
  AutoComplete,
  Spin,
  Tooltip,
  Dropdown,
  Menu,
  Tag,
} from 'antd';
import _ from 'lodash';
import moment from 'moment';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { updateFieldStatus } from '@/pages/logs/utils';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { json } from '@codemirror/lang-json';
import { Column, Line } from '@ant-design/plots';
import { useTranslation, Trans } from 'react-i18next';
import DatasourceValueSelect from '@/pages/alertRules/Form/components/DatasourceValueSelect';
import { DatasourceCateSelect } from '@/components/DatasourceSelect';
import Severity from '@/pages/alertRules/Form/components/Severity';
import AdditionalLabel from '@/pages/alertRules/Form/components/AdditionalLabel';
import { getDataCategory, getFieldcaps, searchAlertTest } from '@/services/warning';
import {
  getFieldsForWildcard,
  getFieldsFromRawFields,
  normalizedFieldTypes,
  isSuggestingValues,
} from '@/components/SearchBar/utils';
import { buildEsQuery } from '@/components/SearchBar/es-query';
import FiltersBuilder, { filterOperators } from '@/components/FiltersBuilder';
import SearchBar from '@/components/SearchBar';
import Inhibit from '@/pages/alertRules/Form/components/Inhibit';
import { builtInAggregationTypes } from '@/pages/alertRules/types';
import { defaultRuleConfig } from '../../../../Form/constants';
import { getDefaultValuesByCate } from '../../../utils';
import {
  getCompatibleComparatorsForField,
  getGroupedResults,
  processGroupedResults,
  processUngroupedResults,
  processIndexResults,
} from '../utils';
import { conversionTime } from '@/pages/traces/utils';
import { defaultColors } from '@/utils/constant';
import { getIndex } from '@/pages/logs/utils';

export default function Log({ isBuiltin }) {
  const { t } = useTranslation('alertRules');
  const { curBusiId, groupedDatasourceList, curBusiGroup, ESIndex } = useContext(CommonStateContext);
  // 当前测试查询项
  const [current, setCurrent] = useState();
  const form = Form.useFormInstance();
  const refEditUi =
    useRef<{
      setVisible: (val: boolean) => void;
      setFiltrateMode: (val: 'field' | 'dsl') => void;
      setInitialValues: (val: any) => void;
      setType: (val: 'add' | 'edit') => void;
      form: any;
    }>(null);
  // 索引列表
  const [indexOptions, setIndexOptions] = useState<any[]>([]);
  const [ipOptions, setIpOptions] = useState([]);
  const chartConfig: any = {
    xField: 'timestamp',
    yField: 'value',
    animation: false,
    color: '#0065D9',
  };
  // 分组图表
  const groupChart: any = {
    isGroup: true,
    xField: 'timestamp',
    yField: 'value',
    seriesField: 'id',
    legend: false,
    animation: false,
    color: defaultColors,
  };

  // 获取syslog ip列表
  const getSyslogIpList = (data_id) => {
    getDataCategory({
      busi_group_id: curBusiId,
      datasource_id: data_id,
      index: ESIndex.elastic_sys_log_index,
    }).then((res) => {
      let indexData: any = [];
      if (!_.isEmpty(res)) {
        ['aliases', 'data_streams', 'indices'].forEach((key) => {
          indexData = [
            ...indexData,
            ...res[key]
              .filter((indexItem) => !indexItem.data_stream)
              .map((element) => ({ label: element.name.replace('syslog-', ''), value: element.name })),
          ];
        });
      }
      setIpOptions(indexData);
    });
  };

  // 获取索引列表
  const getIndexList = (data_id) => {
    getDataCategory({
      busi_group_id: curBusiId,
      datasource_id: data_id,
      index: '*',
    })
      .then((res) => {
        let indexOptions: any = [];
        if (!_.isEmpty(res)) {
          ['aliases', 'data_streams', 'indices'].forEach((key) => {
            indexOptions = [
              ...indexOptions,
              ...res[key].filter((indexItem) => !indexItem.data_stream).map((element) => ({ value: element.name })),
            ];
          });
        }
        setIndexOptions(indexOptions);
      })
      .catch(() => {
        setIndexOptions([]);
      });
  };

  const changeIndex = (mode, index, num, elasticsearch) => {
    let data_id = form.getFieldValue('datasource_ids')[0];
    let queries = form.getFieldValue(['rule_config', 'queries']);
    if (data_id === 0 && elasticsearch?.length) {
      data_id = elasticsearch[0].id;
    }
    if (index) {
      const params = {
        busi_group_id: curBusiId,
        datasource_id: data_id,
        mode: mode as 'host' | 'container' | 'pod' | 'graf' | 'common',
        indexed: index,
        fields: '_source,_id,_index,_score,*',
      };
      getFieldcaps(params)
        .then((res) => {
          queries[num].fieldsData = getFieldsForWildcard(res.dat) || [];
          queries[num].fieldsSource = getFieldsFromRawFields(res.dat) || [];
          form.setFieldsValue({ rule_config: { queries } });
        })
        .catch((e) => {
          queries[num].fieldsData = [];
          queries[num].fieldsSource = [];
          form.setFieldsValue({ rule_config: { queries } });
        });
    }
  };

  // DSL 测试查询
  const onDSLTestFetch = (index) => {
    setCurrent(index);
    let data_id = form.getFieldValue('datasource_ids')[0];
    const rule = form.getFieldValue(['rule_config', 'queries', index, 'rule']);
    if (data_id === 0 && groupedDatasourceList.elasticsearch?.length) {
      data_id = groupedDatasourceList.elasticsearch[0].id;
    }
    const requestBody = {
      busi_group_id: curBusiId,
      datasource_id: data_id,
      query: {
        type: 'elastic_dsl',
        rule: {
          mode: rule.mode,
          index: rule.index,
          dsl: rule.dsl,
          search_time: rule.search_time,
          time_field: rule.time_field,
        },
      },
    };
    searchAlertTest(requestBody)
      .then((res) => {
        let queries = form.getFieldValue(['rule_config', 'queries']);
        // TODO ,提交表单要删除count
        const count = _.get(res, 'dat.hits.total.value');
        queries[index].count = count;
        form.setFieldsValue({ rule_config: { queries } });
        setCurrent(undefined);
      })
      .catch((err) => setCurrent(undefined));
  };

  // KQL 测试查询
  const onKqlTestFetch = (index) => {
    setCurrent(index);
    let data_id = form.getFieldValue('datasource_ids')[0];
    const rule = form.getFieldValue(['rule_config', 'queries', index, 'rule']);
    if (data_id === 0 && groupedDatasourceList.elasticsearch?.length) {
      data_id = groupedDatasourceList.elasticsearch[0].id;
    }
    const search_kql = buildEsQuery(rule.kql ?? '', rule.filters ?? []);
    const requestBody = {
      busi_group_id: curBusiId,
      datasource_id: data_id,
      query: {
        type: 'elastic_kql',
        rule: {
          mode: rule.mode,
          index: rule.index,
          kql: rule.kql,
          filters: rule.filters,
          search_kql,
          search_time: rule.search_time,
          time_field: rule.time_field,
        },
      },
    };
    searchAlertTest(requestBody)
      .then((res) => {
        let queries = form.getFieldValue(['rule_config', 'queries']);
        const count = _.get(res, 'dat.hits.total.value');
        queries[index].count = count;
        form.setFieldsValue({ rule_config: { queries } });
        setCurrent(undefined);
      })
      .catch((err) => setCurrent(undefined));
  };

  // log阈值 测试查询
  const onLogTestFetch = async (index) => {
    setCurrent(index);
    let data_id = form.getFieldValue('datasource_ids')[0];
    if (data_id === 0 && groupedDatasourceList.elasticsearch?.length) {
      data_id = groupedDatasourceList.elasticsearch[0].id;
    }
    let queries = form.getFieldValue(['rule_config', 'queries']);
    const groupBy = queries[index].rule.aggregation;

    const isGrouped = groupBy && groupBy.length > 0 ? true : false;

    const requestBody = {
      busi_group_id: curBusiId,
      datasource_id: data_id,
      query: {
        type: 'elastic_log',
        rule: {
          mode: queries[index].rule.mode,
          index: queries[index].rule.index,
          check_value: queries[index].rule.check_value,
          search_time: queries[index].rule.search_time,
          comparators: queries[index].rule.comparators,
          aggregation: queries[index].rule.aggregation,
          time_field: queries[index].rule.time_field,
        },
      },
    };

    const series = isGrouped
      ? processGroupedResults(await getGroupedResults(requestBody))
      : processUngroupedResults(await searchAlertTest(requestBody));
    setCurrent(undefined);
    if (isGrouped) {
      let data: any = [];
      series.forEach((element) => {
        data = [
          ...data,
          ...element.points.map((item) => ({
            ...item,
            timestamp: moment(item.timestamp).format('YYYY-MM-DD HH:mm:ss'),
            id: element.id,
          })),
        ];
      });
      queries[index].points = data;
    } else {
      queries[index].points = series[0]?.points?.map((item) => ({
        ...item,
        timestamp: moment(item.timestamp).format('YYYY-MM-DD HH:mm:ss'),
      }));
    }

    form.setFieldsValue({ rule_config: { queries } });
  };

  // 索引阈值 测试查询
  const onIndexTestFetch = async (index) => {
    setCurrent(index);
    let data_id = form.getFieldValue('datasource_ids')[0];
    if (data_id === 0 && groupedDatasourceList.elasticsearch?.length) {
      data_id = groupedDatasourceList.elasticsearch[0].id;
    }
    let queries = form.getFieldValue(['rule_config', 'queries']);
    const interval = form.getFieldValue('prom_eval_interval');
    const type = queries[index].rule.group.type === 'all' ? 'dateAgg' : 'groupAgg';
    const requestBody = {
      busi_group_id: curBusiId,
      datasource_id: data_id,
      interval,
      query: {
        type: 'elastic_index',
        rule: {
          mode: queries[index].rule.mode,
          index: queries[index].rule.index,
          aggregation_type: queries[index].rule.aggregation_type,
          aggregation_name: queries[index].rule.aggregation_name,
          search_time: queries[index].rule.search_time,
          group: queries[index].rule.group,
          time_field: queries[index].rule.time_field,
        },
      },
    };
    const series = processIndexResults(await searchAlertTest(requestBody).catch((err) => setCurrent(undefined)), type);
    queries[index].points = series[0]?.points?.map((item) => ({
      ...item,
      timestamp: moment(item.timestamp).format('YYYY-MM-DD HH:mm:ss'),
    }));

    form.setFieldsValue({ rule_config: { queries } });
    setCurrent(undefined);
  };

  const refreshData = (elasticsearch) => {
    let data_id = form.getFieldValue('datasource_ids')[0];
    if (data_id === 0 && elasticsearch?.length) {
      data_id = elasticsearch[0].id;
    }
    if (data_id) {
      getIndexList(data_id);
      getSyslogIpList(data_id);
      const queries = form.getFieldValue(['rule_config', 'queries']);
      queries.forEach((element, num) => {
        const mode = element.rule.mode || 'common';
        changeIndex(mode, getIndex(mode, ESIndex, element.rule.index), num, elasticsearch);
      });
    }
  };

  useEffect(() => {
    if (curBusiId) {
      refreshData(groupedDatasourceList.elasticsearch);
    }
  }, [curBusiId]);

  return (
    <div>
      <Row gutter={8}>
        <Col span={12}>
          <Form.Item label={t('common:datasource.type')} name='cate'>
            <DatasourceCateSelect
              scene='alert'
              filterCates={(cates) => {
                return _.filter(cates, (item) => item.type === 'log' && !!item.alertRule);
              }}
              onChange={(val) => {
                form.setFieldsValue(getDefaultValuesByCate('log', val));
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
                  onChange={() => refreshData(groupedDatasourceList[cate])}
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
                    <PlusCircleOutlined onClick={() => add(defaultRuleConfig.log.queries[0])} />
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
                            <Col flex='40px' style={{ marginTop: 6 }}>
                              {t('log.type')} :
                            </Col>
                            <Col flex='auto'>
                              <Form.Item {...field} name={[field.name, 'type']} rules={[{ required: true }]}>
                                <Select
                                  onChange={(e) => {
                                    const queries = form.getFieldValue(['rule_config', 'queries']);
                                    const dsl = queries[field.name].rule.dsl;
                                    const comparators = queries[field.name].rule.comparators;
                                    const check_value = queries[field.name].rule.check_value;
                                    if (e === 'elastic_dsl') {
                                      queries[field.name].rule.dsl =
                                        dsl ||
                                        `{
  "query":{
  "match_all" : {}
  }
}`;
                                    } else if (e === 'elastic_log') {
                                      queries[field.name].rule.check_value =
                                        check_value.operator === '~='
                                          ? defaultRuleConfig.log.queries[0].rule.check_value
                                          : check_value || defaultRuleConfig.log.queries[0].rule.check_value;
                                      queries[field.name].rule.comparators =
                                        comparators || defaultRuleConfig.log.queries[0].rule.comparators;
                                    }
                                    if (queries[field.name].rule.index && !queries[field.name].fieldsData) {
                                      const mode = queries[field.name].rule.mode || 'common';
                                      changeIndex(
                                        mode,
                                        getIndex(mode, ESIndex, queries[field.name].rule.index),
                                        field.name,
                                        groupedDatasourceList.elasticsearch,
                                      );
                                    }
                                    queries[field.name].points = undefined;
                                    form.setFieldsValue({ rule_config: { queries } });
                                  }}
                                >
                                  <Select.Option key='elastic_log' value='elastic_log'>
                                    {t('log.by_filter')}
                                  </Select.Option>
                                  <Select.Option key='elastic_dsl' value='elastic_dsl'>
                                    {t('log.by_dsl')}
                                  </Select.Option>
                                  <Select.Option key='elastic_kql' value='elastic_kql'>
                                    {t('log.by_kql')}
                                  </Select.Option>
                                  <Select.Option key='elastic_index' value='elastic_index'>
                                    {t('log.by_index')}
                                  </Select.Option>
                                </Select>
                              </Form.Item>
                            </Col>
                          </Row>
                        </Col>
                        <Col span={8}>
                          <Row gutter={8} wrap={false}>
                            <Col flex='40px' style={{ marginTop: 6 }}>
                              {t('log.index')} :
                            </Col>
                            <Col flex='110px'>
                              <Form.Item
                                {...field}
                                name={[field.name, 'rule', 'mode']}
                                rules={[{ required: true }]}
                                initialValue={'common'}
                              >
                                <Select
                                  onChange={(e) => {
                                    form.setFields([
                                      {
                                        name: ['rule_config', 'queries', field.name, 'rule', 'index'],
                                        value: undefined,
                                        errors: [],
                                      },
                                      {
                                        name: ['rule_config', 'queries', field.name, 'rule', 'time_field'],
                                        value: e === 'common' ? undefined : '@timestamp',
                                      },
                                    ]);
                                    // 非索引，变更字段列表
                                    if (e !== 'common') {
                                      changeIndex(
                                        e,
                                        getIndex(e, ESIndex, ''),
                                        field.name,
                                        groupedDatasourceList.elasticsearch,
                                      );
                                    }
                                  }}
                                >
                                  <Select.Option value='app'>{t('logs:application_log')}</Select.Option>
                                  <Select.Option value='host'>{t('logs:host_log')}</Select.Option>
                                  <Select.Option value='pod'>{t('logs:POD_log')}</Select.Option>
                                  <Select.Option value='container'>{t('logs:container_log')}</Select.Option>
                                  <Select.Option value='syslog'>{t('logs:syslog')}</Select.Option>
                                  <Select.Option value='graf'>{t('logs:collector_log')}</Select.Option>
                                  <Select.Option value='k8s-event'>{t('logs:k8s_event')}</Select.Option>
                                  <Select.Option value='common'>{t('logs:optional_index')}</Select.Option>
                                </Select>
                              </Form.Item>
                            </Col>
                            <Col flex='auto'>
                              <Form.Item
                                shouldUpdate={(prevValues, curValues) =>
                                  _.get(prevValues, [...namePrefix, 'rule', 'mode']) !==
                                  _.get(curValues, [...namePrefix, 'rule', 'mode'])
                                }
                                noStyle
                              >
                                {({ getFieldValue }) => {
                                  const mode = getFieldValue([...namePrefix, 'rule', 'mode']) || 'common';
                                  return (
                                    <Form.Item
                                      {...field}
                                      name={[field.name, 'rule', 'index']}
                                      rules={[
                                        {
                                          required: mode === 'syslog' || mode === 'common' ? true : false,
                                          message: mode === 'syslog' ? '请选择IP' : '请输入索引',
                                        },
                                      ]}
                                    >
                                      {mode === 'syslog' ? (
                                        <Select
                                          showSearch
                                          options={ipOptions}
                                          className='form-item-min-width-300'
                                        ></Select>
                                      ) : (
                                        <AutoComplete
                                          disabled={mode !== 'common'}
                                          options={indexOptions}
                                          filterOption={(inputValue, option) => {
                                            if (option && option.value && typeof option.value === 'string') {
                                              return option.value.indexOf(inputValue) !== -1;
                                            }
                                            return true;
                                          }}
                                          onChange={(e) => {
                                            const queries = form.getFieldValue(['rule_config', 'queries']);
                                            queries[field.name].rule.time_field = '';
                                            form.setFieldsValue({ rule_config: { queries } });
                                          }}
                                          onBlur={(e: any) =>
                                            changeIndex(
                                              'common',
                                              e.target.value,
                                              field.name,
                                              groupedDatasourceList.elasticsearch,
                                            )
                                          }
                                        />
                                      )}
                                    </Form.Item>
                                  );
                                }}
                              </Form.Item>
                            </Col>
                          </Row>
                        </Col>
                        <Col span={8}>
                          <Row gutter={8}>
                            <Col flex='80px' style={{ marginTop: 6 }}>
                              {t('common:date_field')} :
                            </Col>
                            <Col flex='auto'>
                              <Form.Item
                                shouldUpdate={(prevValues, curValues) =>
                                  _.get(prevValues, [...namePrefix, 'rule', 'index']) !==
                                    _.get(curValues, [...namePrefix, 'rule', 'index']) ||
                                  _.get(prevValues, [...namePrefix, 'rule', 'mode']) !==
                                    _.get(curValues, [...namePrefix, 'rule', 'mode'])
                                }
                                noStyle
                              >
                                {({ getFieldValue }) => {
                                  const mode = getFieldValue([...namePrefix, 'rule', 'mode']);
                                  const queriesItem = getFieldValue(namePrefix).fieldsData || [];
                                  const timeFieldOptions = queriesItem
                                    .filter((item) => item.esTypes?.includes('date'))
                                    .map((ele) => ({ label: ele.name, value: ele.name }));
                                  return (
                                    <Form.Item
                                      {...field}
                                      name={[field.name, 'rule', 'time_field']}
                                      rules={[{ required: true, message: t('common:date_field_tip') }]}
                                    >
                                      <Select options={timeFieldOptions} disabled={mode !== 'common'} />
                                    </Form.Item>
                                  );
                                }}
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
                          <Form.Item
                            shouldUpdate={(prevValues, curValues) =>
                              _.get(prevValues, [...namePrefix, 'rule', 'index']) !==
                              _.get(curValues, [...namePrefix, 'rule', 'index'])
                            }
                            noStyle
                          >
                            {({ getFieldValue }) => {
                              const queriesItem = getFieldValue(namePrefix);
                              return (
                                <Row gutter={8} wrap={false}>
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
                                        {queriesItem.fieldsData
                                          ?.filter((ele) => !['_id', '_index', '_scorer', '_source'].includes(ele.name))
                                          .map((item) => (
                                            <Select.Option key={item.name}>{item.name}</Select.Option>
                                          ))}
                                      </Select>
                                    </Form.Item>
                                  </Col>
                                </Row>
                              );
                            }}
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={8}>
                        <Col span={8}>
                          <Row gutter={8} wrap={false}>
                            <Form.Item
                              shouldUpdate={(prevValues, curValues) =>
                                _.get(prevValues, [...namePrefix, 'rule', 'check_value', 'operator']) !==
                                  _.get(curValues, [...namePrefix, 'rule', 'check_value', 'operator']) ||
                                _.get(prevValues, [...namePrefix, 'type']) !== _.get(curValues, [...namePrefix, 'type'])
                              }
                              noStyle
                            >
                              {({ getFieldValue }) => {
                                const operator = getFieldValue([...namePrefix, 'rule', 'check_value', 'operator']);
                                const type = getFieldValue([...namePrefix, 'type']);
                                return (
                                  <>
                                    <Col flex='40px' style={{ marginTop: 6 }}>
                                      {t('log.threshold')} :
                                    </Col>
                                    <Col flex='107px'>
                                      <Form.Item
                                        {...field}
                                        name={[field.name, 'rule', 'check_value', 'operator']}
                                        rules={[{ required: true }]}
                                      >
                                        <Select>
                                          <Select.Option key='>' value='>'>
                                            {t('log.gt')}
                                          </Select.Option>
                                          <Select.Option key='>=' value='>='>
                                            {t('log.gt_or_eq')}
                                          </Select.Option>
                                          <Select.Option key='<' value='<'>
                                            {t('log.lt')}
                                          </Select.Option>
                                          <Select.Option key='<=' value='<='>
                                            {t('log.lt_or_eq')}
                                          </Select.Option>
                                          {type !== 'elastic_log' && (
                                            <Select.Option key='~=' value='~='>
                                              {t('log.between')}
                                            </Select.Option>
                                          )}
                                        </Select>
                                      </Form.Item>
                                    </Col>
                                    <Col flex={operator === '~=' ? '180px' : 'auto'}>
                                      <Form.Item
                                        name={[field.name, 'rule', 'check_value', 'values', 0]}
                                        rules={[{ required: true, message: 'Missing value' }]}
                                      >
                                        <InputNumber style={{ width: '100%' }} min={1} />
                                      </Form.Item>
                                    </Col>
                                    {operator === '~=' && (
                                      <Col flex='auto'>
                                        <Form.Item
                                          name={[field.name, 'rule', 'check_value', 'values', 1]}
                                          rules={[{ required: true, message: 'Missing value' }]}
                                        >
                                          <InputNumber style={{ width: '100%' }} min={1} />
                                        </Form.Item>
                                      </Col>
                                    )}
                                  </>
                                );
                              }}
                            </Form.Item>
                          </Row>
                        </Col>
                        <Col span={8}>
                          <Row gutter={8} wrap={false}>
                            <Col flex='40px' style={{ marginTop: 6 }}>
                              {t('log.formerly')} :
                            </Col>
                            <Col flex='auto'>
                              <Form.Item
                                {...field}
                                name={[field.name, 'rule', 'search_time', 'size']}
                                rules={[{ required: true, message: 'Missing value' }]}
                              >
                                <InputNumber style={{ width: '100%' }} min={1} />
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
                          <Form.Item
                            shouldUpdate={(prevValues, curValues) =>
                              _.get(prevValues, [...namePrefix, 'type']) !==
                                _.get(curValues, [...namePrefix, 'type']) ||
                              _.get(prevValues, [...namePrefix, 'rule', 'index']) !==
                                _.get(curValues, [...namePrefix, 'rule', 'index'])
                            }
                            noStyle
                          >
                            {({ getFieldValue }) => {
                              const queriesItem = getFieldValue(namePrefix);
                              return queriesItem.type === 'elastic_log' ? (
                                <Row gutter={8}>
                                  <Col flex='80px' style={{ marginTop: 6 }}>
                                    {t('log.aggregation')}
                                    <Tooltip
                                      title={
                                        <Trans
                                          ns='alertRules'
                                          i18nKey='log.aggregation_tip'
                                          components={{ 1: '{{', 2: '}}' }}
                                        ></Trans>
                                      }
                                    >
                                      <QuestionCircleOutlined style={{ padding: '0 3px' }} />
                                    </Tooltip>
                                    :
                                  </Col>
                                  <Col flex='auto'>
                                    <Form.Item {...field} name={[field.name, 'rule', 'aggregation']}>
                                      <Select showSearch allowClear mode='multiple'>
                                        {queriesItem.fieldsData
                                          ?.filter((item) => isSuggestingValues(item))
                                          ?.map((item) => (
                                            <Select.Option key={item.name}>{item.name}</Select.Option>
                                          ))}
                                      </Select>
                                    </Form.Item>
                                  </Col>
                                </Row>
                              ) : null;
                            }}
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item
                        shouldUpdate={(prevValues, curValues) =>
                          _.get(prevValues, [...namePrefix, 'type']) !== _.get(curValues, [...namePrefix, 'type']) ||
                          _.get(prevValues, [...namePrefix, 'count']) !== _.get(curValues, [...namePrefix, 'count'])
                        }
                        noStyle
                      >
                        {({ getFieldValue }) => {
                          const type = getFieldValue([...namePrefix, 'type']);
                          const data = getFieldValue(namePrefix);
                          const maxPoint = data.points?.filter((item) => item.value > data.rule.check_value.values[0]);
                          let data_id = form.getFieldValue('datasource_ids')[0];
                          if (data_id === 0 && groupedDatasourceList.elasticsearch?.length) {
                            data_id = groupedDatasourceList.elasticsearch[0].id;
                          }

                          return type === 'elastic_dsl' ? (
                            <Row gutter={8}>
                              <Col span={16}>
                                <Row gutter={8}>
                                  <Col flex='66px'>{t('log.dsl_query')} :</Col>
                                  <Col flex='auto'>
                                    <Form.Item
                                      {...field}
                                      name={[field.name, 'rule', 'dsl']}
                                      rules={[{ required: true, message: 'Missing value' }]}
                                    >
                                      <CodeMirror
                                        height='200px'
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
                                  </Col>
                                </Row>
                              </Col>
                              <Col span={8}>
                                <Button type='primary' onClick={() => onDSLTestFetch(field.name)}>
                                  {t('log.test_query')}
                                </Button>
                                <div style={{ margin: '10px 0' }}>
                                  {field.name === current ? (
                                    <Spin size='small' />
                                  ) : data.count !== undefined ? (
                                    `查询在过去 ${data.rule.search_time.size}${data.rule.search_time.unit} 匹配 ${data.count} 个文档。`
                                  ) : null}
                                </div>
                              </Col>
                            </Row>
                          ) : type === 'elastic_kql' ? (
                            <>
                              <Row gutter={8} wrap={false}>
                                <Col flex='65px' style={{ marginTop: 6 }}>
                                  {t('log.define_query')} :
                                </Col>
                                <Col flex='40px'>
                                  <FiltersBuilder
                                    fields={data.fieldsData}
                                    urlParams={{ fieldRecord: JSON.stringify(data.rule.filters) }}
                                    curBusiId={curBusiId}
                                    mode={data.rule.mode}
                                    datasourceValue={data_id}
                                    indexPatterns={data.rule.index}
                                    timeField={data.rule.time_field}
                                    timeRange={conversionTime('now-24h', 'now')}
                                    refreshHistory={(record) => {
                                      // 更新字段筛选值
                                      const queries = form.getFieldValue(['rule_config', 'queries']);
                                      queries[field.name].rule.filters = record;
                                      form.setFieldsValue({ rule_config: { queries } });
                                    }}
                                    ref={refEditUi}
                                  />
                                  <Form.Item {...field} name={[field.name, 'rule', 'filters']} hidden>
                                    <div />
                                  </Form.Item>
                                </Col>
                                <Col flex='auto'>
                                  <SearchBar
                                    curBusiId={curBusiId}
                                    datasourceValue={data_id}
                                    indexPatterns={data.rule.index}
                                    timeRange={conversionTime('now-24h', 'now')}
                                    mode={data.rule.mode}
                                    size={50}
                                    query={data.rule.kql}
                                    timeField={data.rule.time_field}
                                    onChange={(value) => {
                                      const queries = form.getFieldValue(['rule_config', 'queries']);
                                      queries[field.name].rule.kql = value;
                                      form.setFieldsValue({ rule_config: { queries } });
                                    }}
                                    fields={data.fieldsData}
                                    refreshFieldcaps={() => {}}
                                    placeholder='使用 KQL 语法筛选数据'
                                  />
                                  <Form.Item {...field} name={[field.name, 'rule', 'kql']} hidden>
                                    <div />
                                  </Form.Item>
                                </Col>
                                <Col flex='80px'>
                                  <Button type='primary' onClick={() => onKqlTestFetch(field.name)}>
                                    {t('log.test_query')}
                                  </Button>
                                </Col>
                              </Row>
                              <Space style={{ margin: '10px 0' }} wrap>
                                {data.rule.filters?.map((item, index) => (
                                  <Dropdown
                                    trigger={['click']}
                                    overlay={
                                      <Menu style={{ width: '300px' }}>
                                        <Menu.Item
                                          key='edit'
                                          onClick={() => {
                                            if (refEditUi.current) {
                                              const { setVisible, setFiltrateMode, setType, setInitialValues } =
                                                refEditUi.current;
                                              setType('edit');
                                              setVisible(true);
                                              setFiltrateMode(item.meta.type === 'custom' ? 'dsl' : 'field');
                                              const queryString = item.query.query ? item.query : { query: item.query };
                                              const data = Object.values(filterOperators(t));
                                              const findItem = data.find(
                                                (ele) => ele.type === item.meta.type && ele.negate === item.meta.negate,
                                              );
                                              setInitialValues(
                                                item.meta.type === 'custom'
                                                  ? {
                                                      dsl: JSON.stringify(queryString, null, 2),
                                                      disabled: item.meta.disabled,
                                                      negate: item.meta.negate,
                                                    }
                                                  : {
                                                      fieldName: item.meta.field.name,
                                                      operator: findItem?.value,
                                                      value: item.meta.params,
                                                      negate: item.meta.negate,
                                                      disabled: item.meta.disabled,
                                                      type: item.meta.type,
                                                    },
                                              );
                                            }
                                          }}
                                        >
                                          <Space>
                                            <EditOutlined />
                                            {t('common:editing_filter')}
                                          </Space>
                                        </Menu.Item>
                                        <Menu.Item
                                          key='negate'
                                          onClick={() => {
                                            const queries = form.getFieldValue(['rule_config', 'queries']);
                                            const tagsData = updateFieldStatus(
                                              queries[field.name].rule.filters,
                                              item,
                                              'negate',
                                            );
                                            queries[field.name].rule.filters = tagsData;
                                            form.setFieldsValue({ rule_config: { queries } });
                                          }}
                                        >
                                          {item.meta.negate ? (
                                            <Space>
                                              <PlusCircleOutlined />
                                              {t('common:include_results')}
                                            </Space>
                                          ) : (
                                            <Space>
                                              <MinusCircleOutlined />
                                              {t('common:exclusion_result')}
                                            </Space>
                                          )}
                                        </Menu.Item>
                                      </Menu>
                                    }
                                    arrow
                                  >
                                    <Tag
                                      key={index}
                                      closable
                                      onClose={(e) => {
                                        e.preventDefault();
                                        const queries = form.getFieldValue(['rule_config', 'queries']);
                                        let tagsData = _.cloneDeep(queries[field.name].rule.filters);
                                        if (item.meta.type === 'custom') {
                                          tagsData = tagsData.filter(
                                            (ele) =>
                                              ele.meta.type !== 'custom' ||
                                              JSON.stringify(ele.query) !== JSON.stringify(item.query),
                                          );
                                        } else {
                                          tagsData = tagsData.filter(
                                            (ele) =>
                                              ele.meta.type === 'custom' ||
                                              `${ele.meta.negate}-${ele.meta.field.name}-${
                                                ele.meta.type
                                              }-${JSON.stringify(ele.meta.params ?? {})}` !==
                                                `${item.meta.negate}-${item.meta.field.name}-${
                                                  item.meta.type
                                                }-${JSON.stringify(item.meta.params ?? {})}`,
                                          );
                                        }
                                        queries[field.name].rule.filters = tagsData;
                                        form.setFieldsValue({ rule_config: { queries } });
                                      }}
                                    >
                                      <span style={{ cursor: 'pointer' }}>
                                        {item.meta.negate ? <span style={{ color: 'red' }}>非 </span> : ''}
                                        {item.meta?.field?.name
                                          ? `${item.meta.field.name}: ${
                                              item.meta.type === 'phrase' || item.meta.type === 'range'
                                                ? ''
                                                : t(`common:operators.${item.meta.type}`)
                                            } ${
                                              item.meta.params === undefined
                                                ? ''
                                                : _.isArray(item.meta.params)
                                                ? item.meta.params?.join(',')
                                                : _.isObject(item.meta.params)
                                                ? `${
                                                    item.meta.field.type === 'date' ||
                                                    item.meta.field.type === 'date_range'
                                                      ? moment(item.meta.params.from).format('YYYY-MM-DD HH:mm:ss')
                                                      : item.meta.params.from
                                                  } to ${
                                                    item.meta.field.type === 'date' ||
                                                    item.meta.field.type === 'date_range'
                                                      ? moment(item.meta.params.to).format('YYYY-MM-DD HH:mm:ss')
                                                      : item.meta.params.to
                                                  }`
                                                : item.meta.params
                                            }`
                                          : JSON.stringify(item.query)}
                                      </span>
                                    </Tag>
                                  </Dropdown>
                                ))}
                              </Space>
                              <div style={{ marginTop: '10px' }}>
                                {field.name === current ? (
                                  <Spin size='small' />
                                ) : data.count !== undefined ? (
                                  `查询在过去 ${data.rule.search_time.size}${data.rule.search_time.unit} 匹配 ${data.count} 个文档。`
                                ) : null}
                              </div>
                            </>
                          ) : type === 'elastic_log' ? (
                            <>
                              <Form.Item name={[field.name, 'rule', 'compare_type']} hidden>
                                <Input value={1} />
                              </Form.Item>
                              <Form.List name={[field.name, 'rule', 'comparators']}>
                                {(fields, { add, remove }) => (
                                  <>
                                    <Space style={{ marginBottom: '18px' }}>
                                      <span>{t('log.filter')}</span>
                                      {curBusiGroup.perm === 'rw' && <PlusCircleOutlined onClick={() => add()} />}
                                    </Space>
                                    <Row gutter={8}>
                                      {fields.map(({ key, name, ...restField }) => (
                                        <Col span={12}>
                                          <Row gutter={8} wrap={false}>
                                            <Col flex='300px'>
                                              <Form.Item
                                                {...restField}
                                                name={[name, 'field']}
                                                rules={[
                                                  {
                                                    required: true,
                                                    message: 'Missing value',
                                                  },
                                                ]}
                                              >
                                                <Select showSearch>
                                                  {data.fieldsData?.map((item) => (
                                                    <Select.Option key={item.name}>{item.name}</Select.Option>
                                                  ))}
                                                </Select>
                                              </Form.Item>
                                            </Col>
                                            <Col flex='100px'>
                                              <Form.Item
                                                shouldUpdate={(prevValues, curValues) =>
                                                  _.get(prevValues, [
                                                    ...namePrefix,
                                                    'rule',
                                                    'comparators',
                                                    name,
                                                    'field',
                                                  ]) !==
                                                  _.get(curValues, [
                                                    ...namePrefix,
                                                    'rule',
                                                    'comparators',
                                                    name,
                                                    'field',
                                                  ])
                                                }
                                                noStyle
                                              >
                                                {({ getFieldValue }) => {
                                                  const fieldName = getFieldValue([
                                                    ...namePrefix,
                                                    'rule',
                                                    'comparators',
                                                    name,
                                                    'field',
                                                  ]);
                                                  const currentField = data.fieldsData?.filter(
                                                    (item) => item.name === fieldName,
                                                  )?.[0];
                                                  const options = getCompatibleComparatorsForField(currentField);
                                                  return (
                                                    <Form.Item
                                                      {...restField}
                                                      name={[name, 'comparator']}
                                                      rules={[
                                                        {
                                                          required: true,
                                                          message: 'Missing value',
                                                        },
                                                      ]}
                                                    >
                                                      <Select>
                                                        {options.map((item) => (
                                                          <Select.Option key={item.value}>
                                                            {t(`log.${item.label}`)}
                                                          </Select.Option>
                                                        ))}
                                                      </Select>
                                                    </Form.Item>
                                                  );
                                                }}
                                              </Form.Item>
                                            </Col>
                                            <Col flex='auto'>
                                              <Form.Item
                                                {...restField}
                                                name={[name, 'value']}
                                                rules={[
                                                  {
                                                    required: true,
                                                    message: 'Missing value',
                                                  },
                                                ]}
                                              >
                                                <Input />
                                              </Form.Item>
                                            </Col>
                                            <Col flex='40px'>
                                              {fields.length > 1 && curBusiGroup.perm === 'rw' && (
                                                <MinusCircleOutlined
                                                  className='control-icon-normal'
                                                  onClick={() => remove(name)}
                                                />
                                              )}
                                            </Col>
                                          </Row>
                                        </Col>
                                      ))}
                                    </Row>
                                  </>
                                )}
                              </Form.List>
                              <Button type='primary' onClick={() => onLogTestFetch(field.name)}>
                                {t('log.test_query')}
                              </Button>
                              {field.name === current ? (
                                <Spin size='small' style={{ display: 'block' }} />
                              ) : (
                                data.points && (
                                  <Column
                                    {...(data.rule.aggregation?.length ? groupChart : chartConfig)}
                                    xAxis={{
                                      title: {
                                        text: `过去${
                                          data.rule.search_time.size * (data.rule.aggregation?.length ? 5 : 20)
                                        }${data.rule.search_time.unit}的数据`,
                                      },
                                    }}
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
                                    yAxis={maxPoint?.length ? undefined : { max: data.rule.check_value.values[0] }}
                                    data={data.points}
                                    height={200}
                                    style={{ padding: '10px' }}
                                  />
                                )
                              )}
                            </>
                          ) : (
                            <>
                              <Row gutter={8} wrap={false}>
                                <Col span={8}>
                                  <Row gutter={8} wrap={false}>
                                    <Col flex='66px' style={{ marginTop: 6 }}>
                                      {t('log.aggregation_type')} :
                                    </Col>
                                    <Col flex='auto'>
                                      <Form.Item {...field} name={[field.name, 'rule', 'aggregation_type']}>
                                        <Select>
                                          <Select.Option key='count'>{`count()`}</Select.Option>
                                          <Select.Option key='avg'>{`average()`}</Select.Option>
                                          <Select.Option key='sum'>{`sum()`}</Select.Option>
                                          <Select.Option key='min'>{`min()`}</Select.Option>
                                          <Select.Option key='max'>{`max()`}</Select.Option>
                                        </Select>
                                      </Form.Item>
                                    </Col>
                                    <Form.Item
                                      shouldUpdate={(prevValues, curValues) =>
                                        _.get(prevValues, [...namePrefix, 'rule', 'aggregation_type']) !==
                                        _.get(curValues, [...namePrefix, 'rule', 'aggregation_type'])
                                      }
                                      noStyle
                                    >
                                      {({ getFieldValue }) => {
                                        const queriesItem = getFieldValue(namePrefix);
                                        const aggType = getFieldValue([...namePrefix, 'rule', 'aggregation_type']);
                                        let availablefieldsOptions = [];
                                        if (aggType !== 'count') {
                                          availablefieldsOptions = queriesItem.fieldsSource?.reduce(
                                            (esFieldOptions: any[], field: any) => {
                                              if (
                                                builtInAggregationTypes[aggType]?.validNormalizedTypes?.includes(
                                                  normalizedFieldTypes[field.type] || field.type,
                                                )
                                              ) {
                                                esFieldOptions.push({
                                                  label: field.name,
                                                  value: field.name,
                                                });
                                              }
                                              return esFieldOptions;
                                            },
                                            [],
                                          );
                                        }

                                        return aggType !== 'count' ? (
                                          <Col flex='auto'>
                                            <Form.Item
                                              {...field}
                                              name={[field.name, 'rule', 'aggregation_name']}
                                              rules={[{ required: true }]}
                                            >
                                              <Select
                                                showSearch
                                                options={availablefieldsOptions}
                                                placeholder={t('log.field')}
                                              />
                                            </Form.Item>
                                          </Col>
                                        ) : null;
                                      }}
                                    </Form.Item>
                                  </Row>
                                </Col>
                                <Col span={8}>
                                  <Row gutter={8} wrap={false}>
                                    <Col flex='66px' style={{ marginTop: 6 }}>
                                      {t('log.group_type')} :
                                    </Col>
                                    <Col flex='auto'>
                                      <Form.Item {...field} name={[field.name, 'rule', 'group', 'type']}>
                                        <Select>
                                          <Select.Option key='all'>{t('log.all')}</Select.Option>
                                          <Select.Option key='top'>{t('log.top')}</Select.Option>
                                        </Select>
                                      </Form.Item>
                                    </Col>
                                    <Form.Item
                                      shouldUpdate={(prevValues, curValues) =>
                                        _.get(prevValues, [...namePrefix, 'rule', 'group', 'type']) !==
                                        _.get(curValues, [...namePrefix, 'rule', 'group', 'type'])
                                      }
                                      noStyle
                                    >
                                      {({ getFieldValue }) => {
                                        const type = getFieldValue([...namePrefix, 'rule', 'group', 'type']);
                                        const queriesItem = getFieldValue(namePrefix);

                                        return type === 'top' ? (
                                          <Col flex='auto'>
                                            <Row gutter={8} wrap={false}>
                                              <Col flex='80px'>
                                                <Form.Item
                                                  {...field}
                                                  name={[field.name, 'rule', 'group', 'top_count']}
                                                  rules={[{ required: true, message: t('log.value_required') }]}
                                                >
                                                  <InputNumber style={{ width: '100%' }} min={1} />
                                                </Form.Item>
                                              </Col>
                                              <Col flex='auto'>
                                                <Form.Item
                                                  {...field}
                                                  name={[field.name, 'rule', 'group', 'top_field']}
                                                  rules={[{ required: true, message: t('log.field_required') }]}
                                                >
                                                  <Select showSearch placeholder={t('log.field')}>
                                                    {queriesItem.fieldsSource
                                                      ?.filter((item) => isSuggestingValues(item))
                                                      ?.filter(
                                                        (ele) =>
                                                          !['_id', '_index', '_scorer', '_source'].includes(ele.name),
                                                      )
                                                      .map((item) => (
                                                        <Select.Option key={item.name}>{item.name}</Select.Option>
                                                      ))}
                                                  </Select>
                                                </Form.Item>
                                              </Col>
                                            </Row>
                                          </Col>
                                        ) : null;
                                      }}
                                    </Form.Item>
                                  </Row>
                                </Col>
                                <Col span={8}>
                                  <Button type='primary' onClick={() => onIndexTestFetch(field.name)}>
                                    {t('log.test_query')}
                                  </Button>
                                </Col>
                              </Row>
                              <div>
                                {field.name === current ? (
                                  <Spin size='small' style={{ display: 'block' }} />
                                ) : (
                                  data.points && (
                                    <Line
                                      xField='time'
                                      yField='value'
                                      seriesField='category'
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
                                      yAxis={
                                        data.points?.filter((item) => item.value > data.rule.check_value.values[0])
                                          ?.length
                                          ? undefined
                                          : { max: data.rule.check_value.values[0] }
                                      }
                                      color={defaultColors}
                                      data={data.points}
                                      height={200}
                                      style={{ padding: '10px' }}
                                    />
                                  )
                                )}
                              </div>
                            </>
                          );
                        }}
                      </Form.Item>
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
