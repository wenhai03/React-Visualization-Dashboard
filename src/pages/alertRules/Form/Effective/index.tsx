import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Form, Switch, Space, Select, TimePicker } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { FormStateContext } from '@/pages/alertRules/Form';
import { panelBaseProps, daysOfWeek } from '../../constants';

export default function Effective() {
  const { disabled } = useContext(FormStateContext);
  const { t } = useTranslation('alertRules');
  return (
    <Card {...panelBaseProps} title={t('effective_configs')}>
      <div style={{ marginBottom: 10 }}>
        <Space>
          <span>{t('enable_status')}</span>
          <Form.Item name='enable_status' valuePropName='checked' noStyle>
            <Switch />
          </Form.Item>
        </Space>
      </div>
      <Form.List name='effective_time'>
        {(fields, { add, remove }) => (
          <>
            <Space>
              <div style={{ width: 450 }}>
                <Space align='baseline'>
                  {t('effective_time')}
                  {!disabled && <PlusCircleOutlined className='control-icon-normal' onClick={() => add()} />}
                </Space>
              </div>
              <div style={{ width: 110 }}>{t('effective_time_start')}</div>
              <div style={{ width: 110 }}>{t('effective_time_end')}</div>
            </Space>
            {fields.map(({ key, name, ...restField }) => (
              <Space
                key={key}
                style={{
                  display: 'flex',
                  marginBottom: 8,
                }}
                align='baseline'
              >
                <Form.Item
                  {...restField}
                  name={[name, 'enable_days_of_week']}
                  style={{ width: 450 }}
                  rules={[
                    {
                      required: true,
                      message: t('effective_time_week_msg'),
                    },
                  ]}
                >
                  <Select mode='tags'>
                    {daysOfWeek.map((item) => {
                      return (
                        <Select.Option key={item} value={String(item)}>
                          {t(`common:time.weekdays.${item}`)}
                        </Select.Option>
                      );
                    })}
                  </Select>
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[name, 'enable_stime']}
                  style={{ width: 110 }}
                  rules={[
                    {
                      required: true,
                      message: t('effective_time_start_msg'),
                    },
                  ]}
                >
                  <TimePicker format='HH:mm' />
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[name, 'enable_etime']}
                  style={{ width: 110 }}
                  rules={[
                    {
                      required: true,
                      message: t('effective_time_end_msg'),
                    },
                  ]}
                >
                  <TimePicker format='HH:mm' />
                </Form.Item>
                {!disabled && <MinusCircleOutlined onClick={() => remove(name)} />}
              </Space>
            ))}
          </>
        )}
      </Form.List>
      {/* <Form.Item
        shouldUpdate={(prevValues, curValues) => prevValues.cate !== curValues.cate}
        noStyle
        hidden={!profile.admin}
      >
        {({ getFieldValue }) => {
          if (getFieldValue('cate') === 'prometheus') {
            return (
              <Form.Item label={t('enable_in_bg')}>
                <Space align='baseline'>
                  <Form.Item name='enable_in_bg' valuePropName='checked'>
                    <Switch />
                  </Form.Item>
                  {t('enable_in_bg_tip')}
                </Space>
              </Form.Item>
            );
          }
        }}
      </Form.Item> */}
    </Card>
  );
}
