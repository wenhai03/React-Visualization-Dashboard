import React, { useEffect, useState, useImperativeHandle, ReactNode } from 'react';
import { Form, Input, Select, DatePicker, Space, Switch } from 'antd';
import { apiConfigFirst } from '@/services/manage';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';

const BusinessAPIForm = React.forwardRef<ReactNode, { teamId?: number; apiId?: number }>((props, ref) => {
  const { t } = useTranslation('user');
  const { apiId, teamId } = props;
  const [form] = Form.useForm();
  const [initialValues, setInitialValues] = useState<any>({
    id: 0,
    status: 1,
    perpetuity: true,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useImperativeHandle(ref, () => ({
    form: form,
  }));
  useEffect(() => {
    if (teamId && apiId) {
      getBusiGroupAPIDetail(teamId, apiId);
    } else {
      setInitialValues(
        Object.assign(
          {},
          {
            user: Date.now().toString(16),
          },
        ),
      );
      setLoading(false);
    }
  }, []);

  const generateRandomString = () => {
    const timestampHex = Date.now().toString(16);
    const chars = 'Zabcdefghijklmnopqrstuvwxyz0123456789';
    const randomStr = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return timestampHex + randomStr;
  };

  const getBusiGroupAPIDetail = (teamId: number, apiId: number) => {
    apiConfigFirst(teamId, apiId).then((data) => {
      setInitialValues(
        Object.assign({}, data, {
          perpetuity: data.expire_at === -1 ? true : false,
          expire_at: data.expire_at === -1 ? -1 : moment.unix(data.expire_at),
        }),
      );
      setLoading(false);
    });
  };

  return !loading ? (
    <Form layout='vertical' form={form} initialValues={initialValues} preserve={false}>
      <Form.Item name='id' hidden>
        <div />
      </Form.Item>
      <Form.Item
        label={t('common:profile.account')}
        name='user'
        rules={[
          {
            required: true,
          },
          {
            validator: (_, value) => {
              const reg = /^[A-Za-z0-9]{1,32}$/;
              return !value || reg.test(value)
                ? Promise.resolve()
                : Promise.reject(new Error(t('business.username_required_tip')));
            },
          },
        ]}
      >
        <Input />
      </Form.Item>
      <div>{t('business.api_expire_at')}</div>
      <Space>
        <Form.Item name='perpetuity' valuePropName='checked'>
          <Switch
            checkedChildren={t('business.api_expire_at_forever')}
            unCheckedChildren={t('business.api_expire_at_set')}
            onChange={(checked) => {
              if (!checked) {
                form.setFieldsValue({ expire_at: '' });
              }
            }}
          />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(prevValues, curValues) => prevValues.perpetuity !== curValues.perpetuity}>
          {({ getFieldValue }) => {
            const perpetuity = getFieldValue('perpetuity');
            return !perpetuity ? (
              <Form.Item name='expire_at' rules={[{ required: true }]}>
                <DatePicker
                  style={{ width: '100%' }}
                  format='YYYY-MM-DD'
                  disabledDate={(current) => current && current.isBefore(moment(), 'day')}
                />
              </Form.Item>
            ) : null;
          }}
        </Form.Item>
      </Space>
      <Form.Item label={t('account_status')} name='status' initialValue={1}>
        <Select>
          <Select.Option value={1}>{t('normal')}</Select.Option>
          <Select.Option value={2}>{t('unauthorized')}</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item
        label={t('common:table.note')}
        name='note'
        rules={[
          {
            validator: (_, value) => {
              const reg = /^[\s\S]{0,1024}$/;
              return !value || reg.test(value)
                ? Promise.resolve()
                : Promise.reject(new Error(t('business.note_required_tip')));
            },
          },
        ]}
      >
        <Input.TextArea />
      </Form.Item>
    </Form>
  ) : null;
});
export default BusinessAPIForm;
