import React, { useEffect } from 'react';
import { Modal, Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import '@/pages/logs/locale';

interface IProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (value: any) => void;
  initialValues?: any;
  disabled?: boolean;
}

export default function ShieldIdentsModal(props: IProps) {
  const { t } = useTranslation('logs');
  // 屏蔽规则表单
  const [shieldForm] = Form.useForm();
  const { visible, onCancel, onOk, initialValues, disabled } = props;

  const handleOk = () => {
    shieldForm
      .validateFields()
      .then((values) => {
        onOk && onOk(values);
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  useEffect(() => {
    if (initialValues) {
      shieldForm.setFieldsValue(initialValues);
    }
  }, [initialValues]);

  useEffect(() => {
    if (!visible) {
      shieldForm.resetFields();
    }
  }, [visible]);

  return (
    <Modal
      forceRender
      title={t('task.shield_ident')}
      visible={visible}
      maskClosable={false}
      width={600}
      destroyOnClose
      onCancel={onCancel}
      onOk={handleOk}
    >
      <Form form={shieldForm} disabled={disabled}>
        <Form.Item
          label={t('task.relevance_host')}
          name='ident'
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={t('task.topic')}
          name='topic'
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item label={<span style={{ marginLeft: '8px' }}>{t('task.collection_type')}</span>} name='type'>
          <Select allowClear>
            <Select.Option value='file'>{t('task.type_file')}</Select.Option>
            <Select.Option value='journald'>{t('task.type_journald')}</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label={<span style={{ marginLeft: '8px' }}>{t('task.file_path')}</span>} name='path'>
          <Input />
        </Form.Item>
        <Form.Item label={<span style={{ marginLeft: '18px' }}>{t('task.hash')}</span>} name='hash'>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
