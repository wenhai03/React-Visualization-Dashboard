import React, { FC, useEffect } from 'react';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { Select, Input, Space, Form, Button, Row, Col, message, Empty } from 'antd';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { updateBusinessServiceName } from '@/services/manage';

interface IFormProps {
  teamId: number;
  disabled: boolean;
  initialValue: any;
}

const ApplicationServiceForm: FC<IFormProps> = (props) => {
  const { initialValue, disabled, teamId } = props;
  const [form] = Form.useForm();
  const { t } = useTranslation('user');

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        updateBusinessServiceName(teamId, values.application_service).then((res) => {
          message.success(t('common:success.modify'));
        });
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  useEffect(() => {
    form.setFieldsValue({
      application_service: initialValue || [],
    });
  }, [initialValue]);

  return (
    <Form form={form} onFinish={handleOk} autoComplete='off' disabled={disabled}>
      <Form.List name='application_service'>
        {(fields, { add, remove }) => (
          <>
            {!disabled && (
              <Space className='source-card-btn'>
                <Button icon={<PlusOutlined />} onClick={() => add({ mode: 'all', name: '' })}>
                  {t('common:btn.add')}
                </Button>
                <Button type='primary' htmlType='submit'>
                  {t('common:btn.save')}
                </Button>
              </Space>
            )}
            {fields.length ? (
              fields.map(({ key, name }) => (
                <Row gutter={24} align='middle' key={key}>
                  <Col span={6}>
                    <Form.Item name={[name, 'mode']} label={t('business.mode')} rules={[{ required: true }]}>
                      <Select>
                        <Select.Option value='all' key='all'>
                          {t('business.full_name')}
                        </Select.Option>
                        <Select.Option value='prefix' key='prefix'>
                          {t('business.prefix')}
                        </Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item shouldUpdate noStyle>
                      {({ getFieldValue }) => {
                        const mode = getFieldValue(['application_service', name, 'mode']);
                        return (
                          <Form.Item name={[name, 'name']} label={t('business.view_name')} rules={[{ required: true }]}>
                            <Input
                              placeholder={
                                mode === 'all' ? t('business.full_name_placeholder') : t('business.prefix_placeholder')
                              }
                            />
                          </Form.Item>
                        );
                      }}
                    </Form.Item>
                  </Col>
                  <Col style={{ marginBottom: '18px' }}>
                    <Space>{!disabled && <MinusCircleOutlined onClick={() => remove(name)} />}</Space>
                  </Col>
                </Row>
              ))
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </>
        )}
      </Form.List>
    </Form>
  );
};

export default ApplicationServiceForm;
