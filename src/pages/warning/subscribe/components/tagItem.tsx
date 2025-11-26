import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Col, Row } from 'antd';
const { Option } = Select;
const { TextArea } = Input;
import { MinusCircleOutlined, CaretDownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface Itag {
  field: any;
  remove: Function;
  add: Function;
  fields: any[];
  perm: 'rw' | 'ro';
  form: any;
}

const TagItem: React.FC<Itag> = ({ field, remove, form, perm }) => {
  const { t } = useTranslation();
  const [valuePlaceholder, setValuePlaceholder] = useState<string>('');
  const [funcCur, setfuncCur] = useState('==');

  useEffect(() => {
    const tags = form.getFieldValue('tags');
    funcChange(tags[field.name].func);
  }, []);

  const funcChange = (val) => {
    let text = '';
    if (val === 'in') {
      text = '可以输入多个值，用回车分割';
    } else if (val === '=~') {
      text = '请输入正则表达式匹配标签value';
    }
    setfuncCur(val);
    setValuePlaceholder(text);
  };
  return (
    <>
      <Row gutter={[10, 10]} style={{ marginBottom: '10px' }}>
        <Col span={5}>
          <Form.Item
            style={{ marginBottom: 0 }}
            name={[field.name, 'key']}
            fieldKey={[field.name, 'key']}
            rules={[{ required: true, message: t('key不能为空') }]}
          >
            <Input
              onChange={(e) => {
                const tags = form.getFieldValue('tags');
                tags[field.name].func = '==';
                form.setFieldsValue({ tags: tags });
              }}
            />
          </Form.Item>
        </Col>
        <Col span={3}>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const keyValue = getFieldValue(['tags', field.name, 'key']);
              return (
                <Form.Item
                  style={{ marginBottom: 0 }}
                  name={[field.name, 'func']}
                  fieldKey={[field.name, 'func']}
                  initialValue='=='
                >
                  <Select suffixIcon={<CaretDownOutlined />} onChange={funcChange}>
                    {keyValue === '__trigger_value__' ||  keyValue === '__severity__' ? (
                      <>
                        <Option value='>'>{`>`}</Option>
                        <Option value='>='>{`>=`}</Option>
                        <Option value='<'>{`<`}</Option>
                        <Option value='<='>{`<=`}</Option>
                        <Option value='=='>==</Option>
                        <Option value='!='>!=</Option>
                      </>
                    ) : (
                      <>
                        <Option value='=='>==</Option>
                        <Option value='=~'>=~</Option>
                        <Option value='in'>in</Option>
                        <Option value='not in'>not in</Option>
                        <Option value='!='>!=</Option>
                        <Option value='!~'>!~</Option>
                      </>
                    )}
                  </Select>
                </Form.Item>
              );
            }}
          </Form.Item>
        </Col>
        <Col span={15}>
          <Form.Item
            style={{ marginBottom: 0 }}
            name={[field.name, 'value']}
            fieldKey={[field.name, 'value']}
            rules={[{ required: true, message: t('value不能为空') }]}
          >
            {['not in', 'in'].includes(funcCur) ? (
              <Select
                mode='tags'
                open={false}
                style={{ width: '100%' }}
                placeholder={t(valuePlaceholder)}
                tokenSeparators={[' ']}
              ></Select>
            ) : (
              <Input className='ant-input' placeholder={t(valuePlaceholder)} />
            )}
          </Form.Item>
        </Col>
        {perm === 'rw' && (
          <Col>
            <MinusCircleOutlined style={{ marginTop: '8px' }} onClick={() => remove(field.name)} />
          </Col>
        )}
      </Row>
    </>
  );
};

export default TagItem;
