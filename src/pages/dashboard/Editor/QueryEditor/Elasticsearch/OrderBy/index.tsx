import React, { useEffect, useState, useContext } from 'react';
import { Form, Row, Col, AutoComplete, Select } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useDebounceFn } from 'ahooks';
import { CommonStateContext } from '@/App';
import { getFields } from '@/pages/explorer/Elasticsearch/services';
import InputGroupWithFormItem from '@/components/InputGroupWithFormItem';

interface IProps {
  parentNames?: (string | number)[]; // 前缀字段名的父级路径
  prefixField?: any;
  prefixFieldNames?: (string | number)[]; // 前缀字段名路径
  datasourceValue: number;
  index: string; // ES 索引
  backgroundVisible?: boolean;
  disabled?: boolean;
}

export default function OrderBy({
  prefixField = {},
  prefixFieldNames = [],
  parentNames = [],
  datasourceValue,
  index,
  backgroundVisible = true,
  disabled,
}: IProps) {
  const { curBusiId } = useContext(CommonStateContext);
  const [fieldsOptions, setFieldsOptions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const { run } = useDebounceFn(
    () => {
      getFields(datasourceValue, index, undefined, curBusiId).then((res) => {
        setFieldsOptions(
          _.map(res.allFields, (item) => {
            return {
              value: item,
            };
          }),
        );
      });
    },
    {
      wait: 500,
    },
  );

  useEffect(() => {
    if (datasourceValue && index) {
      run();
    }
  }, [datasourceValue, index]);

  return (
    <Form.List {...prefixField} name={[...prefixFieldNames, 'order_by']}>
      {(fields, { add, remove }) => (
        <div>
          <div style={{ marginBottom: 8 }}>
            Order By{' '}
            <PlusCircleOutlined
              style={{ cursor: 'pointer' }}
              onClick={() => {
                add({
                  field: '',
                  order: 'desc',
                });
              }}
              disabled={disabled}
            />
          </div>
          {fields.map((field) => {
            return (
              <div key={field.key} style={{ marginBottom: backgroundVisible ? 16 : 0 }}>
                <Form.Item shouldUpdate noStyle>
                  {({ getFieldValue }) => {
                    const values = getFieldValue([...parentNames, ...prefixFieldNames, 'values']);
                    return (
                      <Row gutter={10} align='top'>
                        <Col flex='auto'>
                          <div
                            style={
                              backgroundVisible
                                ? {
                                    backgroundColor: '#FAFAFA',
                                    padding: 16,
                                  }
                                : {}
                            }
                          >
                            <InputGroupWithFormItem label='Field key' labelWidth={80}>
                              <Form.Item
                                {...prefixField}
                                name={[field.name, 'field']}
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
                          </div>
                        </Col>
                        <Col flex='200px'>
                          <InputGroupWithFormItem label='Order'>
                            <Form.Item {...prefixField} name={[field.name, 'order']}>
                              <Select>
                                <Select.Option value='desc'>Descend</Select.Option>
                                <Select.Option value='asc'>Ascend</Select.Option>
                              </Select>
                            </Form.Item>
                          </InputGroupWithFormItem>
                        </Col>
                        <Col flex='40px' style={{ display: 'flex', alignItems: 'center' }}>
                          <div
                            onClick={() => {
                              remove(field.name);
                            }}
                            style={{ height: 32, lineHeight: '32px' }}
                          >
                            <MinusCircleOutlined style={{ cursor: 'pointer' }} />
                          </div>
                        </Col>
                      </Row>
                    );
                  }}
                </Form.Item>
              </div>
            );
          })}
        </div>
      )}
    </Form.List>
  );
}
