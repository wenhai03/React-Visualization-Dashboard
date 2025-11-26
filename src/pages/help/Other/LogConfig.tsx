import React, { useEffect } from 'react';
import _ from 'lodash';
import moment from 'moment-timezone';
import { Form, Button, message, Select, InputNumber } from 'antd';
import { useTranslation } from 'react-i18next';
import { getLogConfig, setLogConfig } from '@/services/config';

export default function LogConfig() {
  const [form] = Form.useForm();
  const { t } = useTranslation('other');
  const timezones = [
    'Browser',
    ...moment.tz
      .names()
      // We need to filter out some time zones, that moment.js knows about, but Elasticsearch
      // does not understand and would fail thus with a 400 bad request when using them.
      .filter((tz) => !['America/Nuuk', 'EST', 'HST', 'ROC', 'MST'].includes(tz)),
  ];

  useEffect(() => {
    getLogConfig().then((res) => {
      if (res.success) {
        form.setFieldsValue(res.dat ?? '');
      }
    });
  }, []);

  return (
    <div>
      <Form form={form} layout='vertical' style={{ width: '50%' }}>
        <Form.Item
          label={t('log.date_zone')}
          name='date_zone'
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select
            style={{ width: '300px' }}
            showSearch
            options={timezones.map((val) => ({ label: val, value: val }))}
          />
        </Form.Item>
        <Form.Item
          label={t('log.data_size')}
          name='data_size'
          rules={[
            {
              required: true,
            },
          ]}
        >
          <InputNumber min={1} style={{ width: '300px' }} />
        </Form.Item>
        <div>
          <Button
            type='primary'
            onClick={() => {
              form.validateFields().then((values) => {
                setLogConfig(values).then(() => {
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
