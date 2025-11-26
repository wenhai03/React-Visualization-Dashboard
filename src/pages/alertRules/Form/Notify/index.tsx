import React, { useState, useEffect, useContext } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import { FormStateContext } from '@/pages/alertRules/Form';
import { Card, Form, Checkbox, Switch, Space, Select, Tooltip, Row, Col, InputNumber, Input, AutoComplete } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined, QuestionCircleFilled } from '@ant-design/icons';
import { getBusinessTeam, getNotifiesList } from '@/services/manage';
import { panelBaseProps } from '../../constants';

export default function Notify({ form, isBuiltin }) {
  const { t } = useTranslation('alertRules');
  const { curBusiGroup } = useContext(CommonStateContext);
  const { disabled } = useContext(FormStateContext);
  const [contactList, setContactList] = useState<{ key: string; label: string }[]>([]);
  const [notifyGroups, setNotifyGroups] = useState<any[]>([]);
  const getNotifyChannel = () => {
    getNotifiesList().then((res) => {
      setContactList(res || []);
    });
  };

  useEffect(() => {
    if (!_.isEmpty(curBusiGroup)) {
      getBusinessTeam(curBusiGroup.id).then((res) => {
        setNotifyGroups(res.dat || []);
      });
      getNotifyChannel();
    }
  }, [curBusiGroup]);

  return (
    <Card {...panelBaseProps} title={t('notify_configs')}>
      <Form.Item label={t('notify_mode')} name='notify_mode'>
        <Select
          style={{ width: '50%' }}
          onChange={(e) => {
            if (e === 1) {
              // 业务组
              form.setFieldsValue({ ...curBusiGroup.alert_notify });
            } else {
              // 自定义
              form.setFieldsValue({ notify_groups: [], notify_channels: [] });
            }
          }}
        >
          <Select.Option value={0} key={0}>
            {t('custom_own')}
          </Select.Option>
          <Select.Option value={1} key={1}>
            {t('group_default')}
          </Select.Option>
        </Select>
      </Form.Item>
      <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.notify_mode !== curValues.notify_mode} noStyle>
        {({ getFieldValue }) => {
          const notify_mode = getFieldValue('notify_mode');
          return notify_mode && isBuiltin ? null : (
            <>
              <Form.Item label={t('notify_channels')} name='notify_channels' tooltip={t('notify_channels_tip')}>
                <Checkbox.Group disabled={disabled || notify_mode === 1}>
                  {contactList.map((item) => {
                    return (
                      <Checkbox value={item.key} key={item.label}>
                        {item.label}
                      </Checkbox>
                    );
                  })}
                </Checkbox.Group>
              </Form.Item>
              <Form.Item label={t('notify_groups')} name='notify_groups'>
                <Select mode='multiple' showSearch optionFilterProp='children' disabled={notify_mode === 1}>
                  {_.map(notifyGroups, (item) => {
                    // id to string 兼容 v5
                    return (
                      <Select.Option value={_.toString(item.user_group.id)} key={item.user_group.id}>
                        {item.user_group.name}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </>
          );
        }}
      </Form.Item>
      <Form.Item label={t('notify_recovered')}>
        <Space>
          <Form.Item name='notify_recovered' valuePropName='checked' style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
          <Tooltip title={t(`notify_recovered_tip`)}>
            <QuestionCircleFilled />
          </Tooltip>
        </Space>
      </Form.Item>
      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue }) => {
          return (
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label={t('recover_duration')}
                  name='recover_duration'
                  tooltip={t('recover_duration_tip', { num: getFieldValue('recover_duration') })}
                >
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label={t('notify_repeat_step')}
                  name='notify_repeat_step'
                  rules={[
                    {
                      required: true,
                    },
                  ]}
                  tooltip={{
                    overlayInnerStyle: { width: 310 },
                    title: <pre style={{ whiteSpace: 'pre-wrap'}}>{t('notify_repeat_step_tip')}</pre>,
                  }}
                >
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label={t('notify_max_number')}
                  name='notify_max_number'
                  rules={[
                    {
                      required: true,
                    },
                  ]}
                  tooltip={t('notify_max_number_tip')}
                >
                  <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          );
        }}
      </Form.Item>
      {/* 暂时隐藏 回调地址 相关配置 */}
      {/* <Form.List name='callbacks'>
        {(fields, { add, remove }) => (
          <div>
            <Space align='baseline'>
              {t('callbacks')}
              <PlusCircleOutlined className='control-icon-normal' onClick={() => add()} />
            </Space>
            {fields.map((field) => (
              <Row gutter={16} key={field.key}>
                <Col flex='auto'>
                  <Form.Item {...field} name={[field.name, 'url']}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col flex='40px'>
                  <MinusCircleOutlined className='control-icon-normal' onClick={() => remove(field.name)} />
                </Col>
              </Row>
            ))}
          </div>
        )}
      </Form.List> */}

      <Form.List name='annotations'>
        {(fields, { add, remove }) => (
          <div>
            <Space align='baseline'>
              {t('annotations')}
              {!disabled && <PlusCircleOutlined className='control-icon-normal' onClick={() => add()} />}
            </Space>
            {fields.map((field) => (
              <Row gutter={16} key={field.key}>
                <Col flex='120px'>
                  <Form.Item {...field} name={[field.name, 'key']}>
                    <AutoComplete
                      options={[
                        {
                          value: t('annotationsOptions.plan_link'),
                        },
                        {
                          value: t('annotationsOptions.dashboard_link'),
                        },
                        {
                          value: t('annotationsOptions.desc'),
                        },
                      ]}
                      style={{ width: 200 }}
                    />
                  </Form.Item>
                </Col>
                <Col flex='auto'>
                  <Form.Item {...field} name={[field.name, 'value']}>
                    <Input />
                  </Form.Item>
                </Col>
                {!disabled && (
                  <Col flex='40px'>
                    <MinusCircleOutlined className='control-icon-normal' onClick={() => remove(field.name)} />
                  </Col>
                )}
              </Row>
            ))}
          </div>
        )}
      </Form.List>
    </Card>
  );
}
