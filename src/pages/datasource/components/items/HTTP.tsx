import React from 'react';
import { Input, Form, InputNumber, Row, Col, Space } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface IProps {
  urlExtra?: React.ReactNode;
}

const FormItem = Form.Item;

export default function HTTP(props: IProps) {
  const { t } = useTranslation('datasourceManage');
  const { urlExtra } = props;

  return (
    <div>
      <div className='page-title'>HTTP</div>
      <Form.List name={['http', 'urls']} initialValue={['']}>
        {(fields, { add, remove }) => (
          <>
            <Space style={{ paddingBottom: '8px' }}>
              URL <PlusCircleOutlined onClick={() => add()} />
            </Space>
            {fields.map(({ key, name, ...restField }) => (
              <Row key={key} gutter={24} align='middle'>
                <Col span={23}>
                  <Form.Item
                    {...restField}
                    name={name}
                    rules={[
                      { required: true, message: t('form.request_url') },
                      {
                        validator: (_, value) =>
                          !value.includes(' ')
                            ? Promise.resolve()
                            : Promise.reject(new Error(t('form.url_no_spaces_msg'))),
                      },
                    ]}
                  >
                    <Input placeholder='http://localhost:9090' />
                  </Form.Item>
                </Col>
                <Col style={{ marginBottom: '18px' }} span={1}>
                  {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(name)} />}
                </Col>
              </Row>
            ))}
          </>
        )}
      </Form.List>
      {urlExtra}
      <FormItem
        label={t('form.timeout')}
        name={['http', 'timeout']}
        rules={[{ type: 'number', min: 0 }]}
        initialValue={10000}
      >
        <InputNumber style={{ width: '100%' }} controls={false} />
      </FormItem>
    </div>
  );
}
