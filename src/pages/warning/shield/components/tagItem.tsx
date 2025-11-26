import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Col, Row } from 'antd';
import { MinusCircleOutlined, CaretDownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
const { Option } = Select;
interface Itag {
  field: any;
  remove: Function;
  form: any;
  perm: 'ro' | 'rw';
}

const TagItem: React.FC<Itag> = ({ field, remove, form, perm }) => {
  const { t } = useTranslation('alertMutes');
  const [valuePlaceholder, setValuePlaceholder] = useState<string>('');
  const [funcCur, setfuncCur] = useState('==');

  useEffect(() => {
    const tags = form.getFieldValue('tags');
    funcChange(tags[field.name].func);
  }, [field]);

  const funcChange = (val) => {
    let text = '';
    if (val === 'in') {
      text = t('tag.value.placeholder1');
    } else if (val === '=~') {
      text = t('tag.value.placeholder2');
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
            rules={[{ required: true, message: t('tag.key.msg') }]}
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
            rules={[{ required: true, message: t('tag.value.msg') }]}
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
