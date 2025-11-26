import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import _ from 'lodash';
import { Select, Popover, Button, Form, Row, Col, Space, Input, message, AutoComplete, Switch, Tooltip } from 'antd';
import { PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { json } from '@codemirror/lang-json';
import { useHistory } from 'react-router-dom';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import ValueInputType from './ValueInputType';
import { getTermsList } from '@/services/logs';
import { escapeQuotes } from '@/components/SearchBar/async_loads/value';
import { buildFilter, buildCustomFilter, buildQueryFromFilters } from '@/components/SearchBar/es-query';
import { isSuggestingValues } from '@/components/SearchBar/utils';

interface IProps {
  fields: any;
  curBusiId: number;
  datasourceValue: string;
  indexPatterns?: string;
  timeRange: any;
  mode?: string;
  timeField: string;
  urlParams: Record<string, string>;
  pathname?: string;
  refreshHistory: (newRecord: any) => void;
  ref;
}

export const filterOperators = (t) => ({
  is: { label: t('operators.is'), value: 'is', type: 'phrase', negate: false },
  is_not: {
    label: t('operators.is_not'),
    value: 'is_not',
    type: 'phrase',
    negate: true,
  },
  is_one_of: {
    label: t('operators.is_one_of'),
    value: 'is_one_of',
    type: 'phrases',
    negate: false,
    fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
  },
  is_not_one_of: {
    label: t('operators.is_not_one_of'),
    value: 'is_not_one_of',
    type: 'phrases',
    negate: true,
    fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
  },
  is_between: {
    label: t('operators.is_between'),
    value: 'is_between',
    type: 'range',
    negate: false,
    field: (field: any) => {
      if (['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'].includes(field.type)) return true;

      if (field.type === 'string' && field.esTypes?.includes('version')) return true;

      return false;
    },
  },
  is_not_between: {
    label: t('operators.is_not_between'),
    value: 'is_not_between',
    type: 'range',
    negate: true,
    field: (field: any) => {
      if (['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'].includes(field.type)) return true;

      if (field.type === 'string' && field.esTypes?.includes('version')) return true;

      return false;
    },
  },
  exists: {
    label: t('operators.exists'),
    value: 'exists',
    type: 'exists',
    negate: false,
  },
  does_not_exist: {
    label: t('operators.does_not_exist'),
    value: 'does_not_exist',
    type: 'exists',
    negate: true,
  },
});

const FiltersBuilder: React.FC<IProps> = forwardRef((props, ref) => {
  const [form] = Form.useForm();
  const { t } = useTranslation('common');
  const history = useHistory();
  const [type, setType] = useState('add');
  const [initialValues, setInitialValues] = useState<any>();
  const [visible, setVisible] = useState(false);
  const [valueOptions, setValueOptions] = useState([]);
  const [fieldsName, setFieldsName] = useState('');
  const [filtrateMode, setFiltrateMode] = useState<'field' | 'dsl'>();
  const {
    fields = [],
    curBusiId,
    datasourceValue,
    indexPatterns,
    timeRange,
    mode = 'index',
    urlParams,
    timeField,
    pathname,
    refreshHistory,
  } = props;

  useImperativeHandle(ref, () => ({
    setVisible,
    setFiltrateMode,
    setInitialValues,
    setType,
  }));

  useEffect(() => {
    if (initialValues && type === 'edit') {
      form.setFieldsValue(initialValues);
      if (initialValues.fieldName) {
        // 查询下拉值列表
        const fieldInfo = fields.find((item) => item.name === initialValues.fieldName);
        changeOperators(initialValues.type, fieldInfo);
      }
    }
  }, [JSON.stringify(initialValues), type, fields]);

  const getOperatorOptions = (field) => {
    return Object.values(filterOperators(t)).filter((operator: any) => {
      if (operator.field) return operator.field(field);
      if (operator.fieldTypes) return operator.fieldTypes.includes(field.type);
      return true;
    });
  };

  const changeSelectedFields = (val) => {
    form.setFieldsValue({ fieldName: val, operator: undefined, value: undefined });
    setValueOptions([]);
    setFieldsName('');
  };

  const changeOperators = (operatoTtype, field, prefix?: string) => {
    if (
      (isSuggestingValues(field) &&
        _.isEmpty(valueOptions) &&
        ((operatoTtype === 'phrase' && field.type === 'string') || operatoTtype === 'phrases')) ||
      prefix ||
      prefix === ''
    ) {
      const body = {
        busi_group_id: curBusiId,
        datasource_id: Number(datasourceValue),
        mode: ['index', 'view'].includes(mode) ? 'common' : mode,
        time_field: ['index', 'view'].includes(mode) ? timeField : '@timestamp',
        indexed: indexPatterns!,
        field: field.name,
        prefix: prefix || '',
        start: moment(timeRange.start).valueOf(),
        end: moment(timeRange.end).valueOf(),
      };
      getTermsList(body).then((res) => {
        const quotedValues = res.map((value) => ({
          label: typeof value === 'string' ? `${escapeQuotes(value)}` : `${value}`,
          value: typeof value === 'string' ? `${escapeQuotes(value)}` : `${value}`,
        }));
        setValueOptions(quotedValues);
      });
    }
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const newValue = values.textarea ? values.value.split('\n').filter((line) => line.trim() !== '') : values.value;
      const oldRecord = urlParams.fieldRecord ? JSON.parse(urlParams.fieldRecord) : [];
      let newRecord: any = [];
      let dsl;
      if (filtrateMode === 'dsl') {
        // DSL 模式
        try {
          dsl = JSON.parse(values.dsl);
        } catch (e) {
          message.error(t('json_error'));
          return null;
        }

        if (!dsl?.query) {
          dsl = { query: dsl };
        }
        const data = buildCustomFilter(indexPatterns, dsl, false, false, null);
        if (!oldRecord) {
          newRecord = [data];
        } else if (type === 'add') {
          newRecord = [
            ...oldRecord.filter(
              (item) =>
                item.meta.type !== 'custom' ||
                `${item.meta.type}-${JSON.stringify(item.query)}` !== `${data.meta.type}-${JSON.stringify(data.query)}`,
            ),
            data,
          ];
        } else if (type === 'edit') {
          if (initialValues.fieldName) {
            // 编辑的模式从筛选值转DSL
            // 获取当前项索引
            const index = oldRecord.findIndex(
              (item) =>
                item.meta.type !== 'custom' &&
                `${item.meta.negate}-${item.meta.field.name}-${item.meta.type}-${JSON.stringify(
                  item.meta.params ?? {},
                )}` ===
                  `${initialValues.negate}-${initialValues.fieldName}-${initialValues.type}-${JSON.stringify(
                    initialValues.value ?? {},
                  )}`,
            );
            const newData = {
              ...data,
              meta: { ...data.meta, negate: initialValues.negate, disabled: initialValues.disabled },
            };
            // 变更的配置是否已存在，保留一个
            const sameItemIndex = oldRecord.findIndex(
              (item) =>
                item.meta.type === 'custom' &&
                `${item.meta.type}-${JSON.stringify(item.query, null, 2)}` ===
                  `${newData.meta.type}-${JSON.stringify(newData.query, null, 2)}`,
            );
            newRecord = [...oldRecord];
            newRecord[index] = newData;
            if (sameItemIndex !== -1 && sameItemIndex !== index) {
              // 优先删除禁用的那项
              newRecord.splice(newData.meta.disabled ? index : sameItemIndex, 1);
            }
          } else {
            // 在 DSL 模式下变更配置
            // 获取当前项索引
            const index = oldRecord.findIndex(
              (item) =>
                item.meta.type === 'custom' &&
                `${item.meta.type}-${JSON.stringify({ query: item.query }, null, 2)}` ===
                  `custom-${initialValues!.dsl as string}`,
            );
            const newData = { ...data, meta: { ...data.meta, disabled: oldRecord[index].meta.disabled } };
            // 变更的配置是否已存在，保留一个
            const sameItemIndex = oldRecord.findIndex(
              (item) =>
                item.meta.type === 'custom' &&
                `${item.meta.type}-${JSON.stringify(item.query, null, 2)}` ===
                  `${newData.meta.type}-${JSON.stringify(newData.query, null, 2)}`,
            );
            newRecord = [...oldRecord];
            newRecord[index] = newData;
            if (sameItemIndex !== -1 && sameItemIndex !== index) {
              newRecord.splice(newData.meta.disabled ? index : sameItemIndex, 1);
            }
          }
        }
      } else {
        // 筛选值 模式
        const field = fields.find((item) => item.name === values.fieldName);
        const operatorInfo = filterOperators(t)[values.operator];
        const data = buildFilter(indexPatterns, field, operatorInfo, false, newValue ?? '', null);
        if (!oldRecord) {
          newRecord = [data];
        } else if (type === 'add') {
          newRecord = [
            ...oldRecord.filter(
              (item) =>
                item.meta.type === 'custom' ||
                `${item.meta.field.name}-${item.meta.type}-${JSON.stringify(item.meta.params ?? {})}` !==
                  `${data.meta.field.name}-${data.meta.type}-${JSON.stringify(data.meta.params ?? {})}`,
            ),
            data,
          ];
        } else if (type === 'edit') {
          if (initialValues.dsl) {
            // 编辑的模式从DSL转筛选值
            // 获取当前项索引
            const index = oldRecord.findIndex(
              (item) =>
                item.meta.type === 'custom' &&
                `${item.meta.type}-${JSON.stringify({ query: item.query }, null, 2)}` ===
                  `custom-${initialValues!.dsl as string}`,
            );
            const newData = { ...data };
            // 变更的配置是否已存在，保留一个
            const sameItemIndex = oldRecord.findIndex(
              (item) =>
                item.meta.type !== 'custom' &&
                `${item.meta.field.name}-${item.meta.type}-${JSON.stringify(item.meta.params ?? {})}` ===
                  `${newData.meta.field.name}-${newData.meta.type}-${JSON.stringify(newData.meta.params ?? {})}`,
            );
            newRecord = [...oldRecord];
            newRecord[index] = newData;
            if (sameItemIndex !== -1 && sameItemIndex !== index) {
              newRecord.splice(newData.meta.disabled ? index : sameItemIndex, 1);
            }
          } else {
            const index = oldRecord.findIndex(
              (item) =>
                item.meta.type !== 'custom' &&
                `${item.meta.field.name}-${item.meta.type}-${JSON.stringify(item.meta.params ?? {})}` ===
                  `${initialValues.fieldName}-${initialValues.type}-${JSON.stringify(initialValues.value ?? {})}`,
            );
            const newData = { ...data, meta: { ...data.meta, disabled: oldRecord[index].meta.disabled } };
            // 变更的配置是否已存在，保留一个
            const sameItemIndex = oldRecord.findIndex(
              (item) =>
                item.meta.type !== 'custom' &&
                `${item.meta.field.name}-${item.meta.type}-${JSON.stringify(item.meta.params ?? {})}` ===
                  `${newData.meta.field.name}-${newData.meta.type}-${JSON.stringify(newData.meta.params ?? {})}`,
            );
            newRecord = [...oldRecord];
            newRecord[index] = newData;
            if (sameItemIndex !== -1 && sameItemIndex !== index) {
              newRecord.splice(newData.meta.disabled ? index : sameItemIndex, 1);
            }
          }
        }
      }
      if (pathname) {
        const newParams = urlParams;
        newParams.fieldRecord = JSON.stringify(newRecord);
        history.push({
          pathname: pathname,
          search: `?${Object.entries(newParams)
            .map(([key, value]) => `${key}=${value}`)
            .join('&')}`,
        });
      }
      refreshHistory(newRecord);
      setVisible(false);
      form.resetFields();
      setFiltrateMode('field');
      setFieldsName('');
      setType('add');
      setValueOptions([]);
    });
  };

  return (
    <Popover
      content={
        <Form form={form} layout='vertical' initialValues={{ dsl: '{}' }}>
          {filtrateMode === 'dsl' ? (
            <Form.Item name='dsl' label={t('field_dsl')} rules={[{ required: true }]}>
              <CodeMirror
                height='300px'
                theme='light'
                basicSetup={false}
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
          ) : (
            <>
              <Row gutter={16}>
                <Col span={18}>
                  <Form.Item name='fieldName' label={t('field')} rules={[{ required: true }]}>
                    <Select
                      showSearch
                      allowClear
                      onSearch={(val) => {
                        setFieldsName(val);
                      }}
                      options={fields
                        .filter((field) => field.name.toLowerCase().includes(fieldsName.toLowerCase()))
                        .slice(0, 50)
                        .map((item: { name: string; value: string }) => ({ label: item.name, value: item.name }))}
                      onChange={changeSelectedFields}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    shouldUpdate={(prevValues, curValues) => prevValues.fieldName !== curValues.fieldName}
                    noStyle
                  >
                    {({ getFieldValue }) => {
                      const fieldName = getFieldValue('fieldName');
                      const fieldInfo = fields.find((item) => item.name === fieldName);
                      const operators = fieldInfo ? getOperatorOptions(fieldInfo) : [];
                      const oldOperator = getFieldValue('operator');
                      return (
                        <Form.Item name='operator' label='运算符' rules={[{ required: true }]}>
                          <Select
                            options={operators}
                            onChange={(e) => {
                              changeOperators(filterOperators(t)[e]?.type, fieldInfo);
                              const oldOperatorsType = operators.find((item) => item.value === oldOperator);
                              const nowOperatorsType = operators.find((item) => item.value === e);
                              if (oldOperatorsType?.type !== nowOperatorsType?.type) {
                                form.setFieldsValue({ value: undefined });
                              }
                            }}
                          />
                        </Form.Item>
                      );
                    }}
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.operator !== curValues.operator} noStyle>
                {({ getFieldValue }) => {
                  const fieldName = getFieldValue('fieldName');
                  const fieldInfo = fields.find((item) => item.name === fieldName);
                  const operator = getFieldValue('operator');
                  switch (filterOperators(t)[operator]?.type) {
                    case 'exists':
                      return null;
                    case 'phrase':
                      // 单选
                      return isSuggestingValues(fieldInfo) ? (
                        <Form.Item name='value' label='值'>
                          <AutoComplete
                            options={valueOptions}
                            onSearch={(val) => {
                              changeOperators(filterOperators(t)[operator]?.type, fieldInfo, val);
                            }}
                          />
                        </Form.Item>
                      ) : (
                        <Form.Item name='value' label='值'>
                          <Input />
                        </Form.Item>
                      );
                    case 'phrases':
                      // 多选
                      return (
                        <div style={{ position: 'relative' }}>
                          <Space
                            style={{ position: 'absolute', right: 0, top: '-5px', minHeight: 0, zIndex: 2 }}
                            size={6}
                          >
                            <Form.Item name='textarea' valuePropName='checked'>
                              <Switch
                                size='small'
                                checkedChildren='多行'
                                unCheckedChildren='单行'
                                onChange={(checked) => {
                                  const value = getFieldValue('value');
                                  const newValue = checked
                                    ? value.join('\n')
                                    : value.split('\n').filter((line) => line.trim() !== '');
                                  form.setFieldsValue({ value: newValue });
                                }}
                              />
                            </Form.Item>
                            <Tooltip title='使用多行模式时，每行一个值'>
                              <QuestionCircleOutlined style={{ marginBottom: '19px' }} />
                            </Tooltip>
                          </Space>
                          <Form.Item
                            shouldUpdate={(prevValues, curValues) => prevValues.textarea !== curValues.textarea}
                            noStyle
                          >
                            {({ getFieldValue }) => {
                              const textarea = getFieldValue('textarea');
                              return (
                                <Form.Item name='value' label='值'>
                                  {textarea ? (
                                    <Input.TextArea allowClear />
                                  ) : (
                                    <Select options={valueOptions} mode='tags' />
                                  )}
                                </Form.Item>
                              );
                            }}
                          </Form.Item>
                        </div>
                      );
                    case 'range':
                      // 范围区间
                      return (
                        <Row gutter={16}>
                          <Col span={12}>
                            <ValueInputType name={['value', 'from']} label='范围开始' fieldType={fieldInfo.type} />
                          </Col>
                          <Col span={12}>
                            <ValueInputType name={['value', 'to']} label='范围结束' fieldType={fieldInfo.type} />
                          </Col>
                        </Row>
                      );
                    default:
                      // 文本输入
                      return operator ? (
                        <Form.Item name='value' label='值'>
                          <Input />
                        </Form.Item>
                      ) : null;
                  }
                }}
              </Form.Item>
            </>
          )}
          <Row justify='end'>
            <Space>
              <Button
                onClick={() => {
                  setVisible(false);
                  setFiltrateMode('field');
                  form.resetFields();
                  setFieldsName('');
                  setType('add');
                  setValueOptions([]);
                }}
              >
                {t('btn.cancel')}
              </Button>
              <Button type='primary' onClick={handleSubmit}>
                {type === 'add' ? t('btn.create_filter') : t('btn.update_filter')}
              </Button>
            </Space>
          </Row>
        </Form>
      }
      visible={visible}
      overlayInnerStyle={{ width: 800 }}
      placement='leftTop'
      title={
        <Row justify='space-between'>
          <Col style={{ fontWeight: 'bold' }}>{t('btn.create_filter')}</Col>
          <Col>
            <Button
              type='link'
              style={{ padding: '0', height: 'auto' }}
              onClick={() => {
                // 编辑状态下，由筛选值切换为DSL时，将筛选值解析成JSON放入DSL
                if (type === 'edit' && initialValues.type !== 'custom' && filtrateMode === 'field') {
                  const field = fields.find((item) => item.name === initialValues.fieldName);
                  const operatorInfo = filterOperators(t)[initialValues.operator];
                  const data = buildFilter(
                    indexPatterns,
                    field,
                    { ...operatorInfo, negate: false },
                    false,
                    initialValues.value ?? '',
                    null,
                  );
                  const filterQuery = buildQueryFromFilters([data]);
                  form.setFieldsValue({ dsl: JSON.stringify({ query: filterQuery.filter[0] }, null, 2) });
                }
                setFiltrateMode(filtrateMode === 'dsl' ? 'field' : 'dsl');
              }}
            >
              {filtrateMode === 'dsl' ? t('edit_filter_value') : t('edit_as_query_dsl')}
            </Button>
          </Col>
        </Row>
      }
      trigger='click'
      onVisibleChange={(e) => {
        setVisible(e);
        if (!e) {
          setFiltrateMode('field');
          setFieldsName('');
          form.resetFields();
          setType('add');
          setValueOptions([]);
        }
      }}
    >
      <Button icon={<PlusCircleOutlined />} />
    </Popover>
  );
});

export default FiltersBuilder;
