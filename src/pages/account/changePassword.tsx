import React, { useContext } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UpdatePwd } from '@/services/login';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';

export default function ChangePassword() {
  const { t } = useTranslation('account');
  const [form] = Form.useForm();
  const { profile, setProfile } = useContext(CommonStateContext);

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      modifyPassword();
    } catch (e) {
      console.log(e);
    }
  };

  const modifyPassword = () => {
    const values = form.getFieldsValue();
    UpdatePwd(values).then(() => {
      message.success(t('changeSuccess'));
      if (values.username) {
        setProfile({ ...profile, username: values.username });
      }
    });
  };

  return (
    <Form form={form} layout='vertical' requiredMark={true}>
      <Form.Item label={<span>{t('common:profile.username')}:</span>} name='username' initialValue={profile.username}>
        <Input disabled={!profile?.admin} placeholder={t('common:password.empty_placeholder')} />
      </Form.Item>
      {profile?.has_password && (
        <Form.Item label={<span>{t('common:password.old')}:</span>} name='oldpass'>
          <Input placeholder={t('common:password.empty_placeholder')} type='password' />
        </Form.Item>
      )}
      <Form.Item
        label={<span>{t('common:password.new')}:</span>}
        name='newpass'
        hasFeedback
        rules={[
          {
            validator: async (_, value) => {
              const oldPassword = form.getFieldValue('oldpass');
              if (oldPassword && !value) {
                return Promise.reject(t('common:password.newMsg'));
              }
              return Promise.resolve();
            },
          },
          {
            validator: (_, value) => {
              const reg = /^(?![A-Za-z]+$)(?![A-Z\d]+$)(?![A-Z\W]+$)(?![a-z\d]+$)(?![a-z\W]+$)(?![\d\W]+$)\S{8,}$/;
              return !value || reg.test(value)
                ? Promise.resolve()
                : Promise.reject(
                    new Error('密码必须包含数字、小写字母、大写字母、特殊符号中的三种及以上且长度不小于8'),
                  );
            },
          },
        ]}
      >
        <Input placeholder={t('common:password.empty_placeholder')} type='password' />
      </Form.Item>
      <Form.Item
        label={<span>{t('common:password.confirm')}: </span>}
        name='newpassagain'
        hasFeedback
        rules={[
          {
            validator: async (_, value) => {
              const newPassword = form.getFieldValue('newpass');
              if (newPassword && !value) {
                return Promise.reject(t('common:password.confirmMsg'));
              }
              return Promise.resolve();
            },
          },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('newpass') === value) {
                return Promise.resolve();
              }

              return Promise.reject(new Error(t('common:password.notMatch')));
            },
          }),
        ]}
      >
        <Input type='password' />
      </Form.Item>

      <Form.Item>
        <Button type='primary' onClick={handleSubmit}>
          {t('save')}
        </Button>
      </Form.Item>
    </Form>
  );
}
