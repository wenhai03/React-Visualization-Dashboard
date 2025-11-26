import React, { useEffect } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Modal, Form, Input, Select } from 'antd';

interface IProps {
  visible: boolean;
  initialValues?: any;
  onOk: (values) => void;
  onCancel: () => void;
}
const DashboardInfo: React.FC<IProps> = (props) => {
  const [form] = Form.useForm();
  const { visible, initialValues, onOk, onCancel } = props;
  const { t } = useTranslation('dashboardBuiltin');

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        onOk(values);
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  useEffect(() => {
    if (visible) {
      if (initialValues) {
        const data = { ...initialValues };
        data.tags = initialValues.tags ? _.split(initialValues.tags, ' ') : undefined;
        form.setFieldsValue(data);
      } else {
        form.resetFields();
      }
    }
  }, [visible]);

  return (
    <Modal
      title={initialValues ? t('edit_title') : t('add_title')}
      visible={visible}
      onOk={handleOk}
      onCancel={onCancel}
    >
      <Form form={form}>
        <Form.Item
          label={t('name')}
          name='name'
          labelCol={{
            span: 5,
          }}
          wrapperCol={{
            span: 24,
          }}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={t('tags')}
          name='tags'
          labelCol={{
            span: 5,
          }}
          wrapperCol={{
            span: 24,
          }}
        >
          <Select
            mode='tags'
            dropdownStyle={{
              display: 'none',
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DashboardInfo;
