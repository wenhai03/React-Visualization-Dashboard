import React, { useState } from 'react';
import { Row, Col, Form, Select, Button, Input, InputNumber, AutoComplete } from 'antd';
import { VerticalRightOutlined, VerticalLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import InputGroupWithFormItem from '@/components/InputGroupWithFormItem';
import _ from 'lodash';
import { groupByCates, groupByCatesMap } from './configs';

export default function Terms({ parentNames, prefixFieldNames, prefixField, fieldsOptions, values }) {
  const { t } = useTranslation('alertRules');
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  return (
    <Row gutter={16}>
      <Col flex='auto'>
        <Row gutter={16}>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const terms_type = getFieldValue([
                ...parentNames,
                ...prefixFieldNames,
                'group_by',
                prefixField.name,
                'terms_type',
              ]);
              return (
                <>
                  <Col span={terms_type === 'script' ? 8 : 12}>
                    <Form.Item {...prefixField} name={[prefixField.name, 'cate']} noStyle>
                      <Select style={{ width: '100%' }}>
                        {groupByCates.map((func) => (
                          <Select.Option key={func} value={func}>
                            {func} ({groupByCatesMap[func]})
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={terms_type === 'script' ? 6 : 12}>
                    <InputGroupWithFormItem label='terms 类型' labelWidth={90}>
                      <Form.Item {...prefixField} name={[prefixField.name, 'terms_type']} initialValue='field_key'>
                        <Select style={{ width: '100%' }}>
                          <Select.Option value='field_key'>Field key</Select.Option>
                          <Select.Option value='script'>Script</Select.Option>
                        </Select>
                      </Form.Item>
                    </InputGroupWithFormItem>
                  </Col>
                  {terms_type === 'script' && (
                    <Col span={10}>
                      <InputGroupWithFormItem label='Script 名称' labelWidth={100}>
                        <Form.Item {...prefixField} name={[prefixField.name, 'script_name']}>
                          <AutoComplete style={{ width: '100%' }} />
                        </Form.Item>
                      </InputGroupWithFormItem>
                    </Col>
                  )}
                  <Col span={24}>
                    {terms_type === 'script' ? (
                      <InputGroupWithFormItem
                        label='Script'
                        labelWidth={80}
                        labelHeight='auto'
                        style={{ marginBottom: '18px' }}
                      >
                        <Form.Item
                          noStyle
                          {...prefixField}
                          name={[prefixField.name, 'script']}
                          rules={[{ required: true, message: '必须填写 script' }]}
                        >
                          <Input.TextArea allowClear />
                        </Form.Item>
                      </InputGroupWithFormItem>
                    ) : (
                      <InputGroupWithFormItem label='Field key' labelWidth={80}>
                        <Form.Item
                          {...prefixField}
                          name={[prefixField.name, 'field']}
                          rules={[{ required: true, message: '必须填写 field key' }]}
                        >
                          <AutoComplete
                            options={_.filter(fieldsOptions, (item) => {
                              if (search) {
                                return item.value.includes(search);
                              }
                              return true;
                            })}
                            style={{ width: '100%' }}
                            onSearch={setSearch}
                          />
                        </Form.Item>
                      </InputGroupWithFormItem>
                    )}
                  </Col>
                </>
              );
            }}
          </Form.Item>
          {expanded && (
            <>
              <Col span={6}>
                <InputGroupWithFormItem label='Size'>
                  <Form.Item {...prefixField} name={[prefixField.name, 'size']} noStyle>
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                </InputGroupWithFormItem>
              </Col>
              <Col span={6}>
                <InputGroupWithFormItem label={t('datasource:es.terms.min_value')}>
                  <Form.Item {...prefixField} name={[prefixField.name, 'min_value']} noStyle>
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                </InputGroupWithFormItem>
              </Col>
              <Col span={6}>
                <InputGroupWithFormItem label='Order'>
                  <Form.Item {...prefixField} name={[prefixField.name, 'order']}>
                    <Select>
                      <Select.Option value='desc'>Descend</Select.Option>
                      <Select.Option value='asc'>Ascend</Select.Option>
                    </Select>
                  </Form.Item>
                </InputGroupWithFormItem>
              </Col>
              <Col span={6}>
                <InputGroupWithFormItem label='OrderBy'>
                  <Form.Item {...prefixField} name={[prefixField.name, 'orderBy']}>
                    <Select>
                      <Select.Option value='_key'>Term value</Select.Option>
                      <Select.Option value='_count'>Count</Select.Option>
                      {_.map(values, (item) => {
                        const key = `${item.func}_${item.field.replace(/\./g, '_')}`;
                        return (
                          <Select.Option key={item.ref} value={key}>
                            {key}
                          </Select.Option>
                        );
                      })}
                    </Select>
                  </Form.Item>
                </InputGroupWithFormItem>
              </Col>
            </>
          )}
        </Row>
      </Col>
      <Col flex='88px'>
        <Button
          onClick={() => {
            setExpanded(!expanded);
          }}
        >
          {t('datasource:es.terms.more')} {expanded ? <VerticalLeftOutlined /> : <VerticalRightOutlined />}
        </Button>
      </Col>
    </Row>
  );
}
