import React, { useEffect } from 'react';
import _ from 'lodash';
import { Form, Button, message, InputNumber } from 'antd';
import { useTranslation } from 'react-i18next';
import { getApmConfig, setApmConfig } from '@/services/config';

export default function ApmConfig() {
  const [form] = Form.useForm();
  const { t } = useTranslation('other');

  useEffect(() => {
    getApmConfig().then((res) => {
      if (res.success) {
        form.setFieldsValue(res.dat);
      }
    });
  }, []);

  return (
    <div>
      <Form form={form} layout='vertical' style={{ width: '50%' }}>
        <Form.Item
          label={t('apm.max_trace_items')}
          name='max_trace_items'
          rules={[
            {
              required: true,
            },
          ]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label={t('apm.transaction_group_bucket_size')}
          name='transaction_group_bucket_size'
          rules={[
            {
              required: true,
            },
          ]}
        >
          <InputNumber min={1} max={10000} style={{ width: '100%' }} />
        </Form.Item>
        <div>
          <Button
            type='primary'
            onClick={() => {
              form.validateFields().then((values) => {
                setApmConfig(values).then(() => {
                  message.success(t('common:success.save'));
                });
              });
            }}
          >
            {t('common:btn.save')}
          </Button>
        </div>
      </Form>
    </div>
  );
}
