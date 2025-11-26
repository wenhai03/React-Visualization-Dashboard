import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Form, Checkbox, Select, Button, message } from 'antd';
import { getNotifiesList, updateBusinessAlertNotify } from '@/services/manage';
import '@/pages/alertRules/locale';

interface IProps {
  initialValue?: { notify_channels: string[] | null; notify_groups?: string[] | null };
  teamId: number;
  user_groups?: any;
  onOk: () => void;
  disabled: boolean;
}

const DefaultAlertNotify: React.FC<IProps> = (props) => {
  const { t } = useTranslation('alertRules');
  const { initialValue, teamId, user_groups, onOk, disabled } = props;
  const [form] = Form.useForm();
  const [contactList, setContactList] = useState<{ key: string; label: string }[]>([]);

  useEffect(() => {
    if (initialValue?.notify_channels && initialValue?.notify_groups) {
      form.setFieldsValue(initialValue);
    } else {
      form.setFieldsValue({ notify_channels: [], notify_groups: [] });
    }
  }, [initialValue]);

  useEffect(() => {
    getNotifiesList().then((res) => {
      setContactList(res || []);
    });
  }, []);

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        updateBusinessAlertNotify(teamId, values).then((res) => {
          message.success(t('common:success.modify'));
          onOk();
        });
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  return (
    <Form form={form} layout='vertical' disabled={disabled}>
      <Form.Item
        label={t('notify_channels')}
        name='notify_channels'
        tooltip={t('notify_channels_tip')}
        rules={[{ required: true }]}
      >
        <Checkbox.Group disabled={disabled}>
          {contactList.map((item) => {
            return (
              <Checkbox value={item.key} key={item.label}>
                {item.label}
              </Checkbox>
            );
          })}
        </Checkbox.Group>
      </Form.Item>
      <Form.Item label={t('notify_groups')} name='notify_groups' rules={[{ required: true }]}>
        <Select mode='multiple' showSearch optionFilterProp='children'>
          {_.map(user_groups, (item) => {
            return (
              <Select.Option value={_.toString(item.user_group.id)} key={item.user_group.id}>
                {item.user_group.name}
              </Select.Option>
            );
          })}
        </Select>
      </Form.Item>
      <Form.Item>
        <Button type='primary' onClick={handleOk}>
          {t('common:btn.save')}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default DefaultAlertNotify;
