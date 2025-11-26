import React, { useImperativeHandle, ReactNode } from 'react';
import { Form, Input } from 'antd';
import { UserAndPasswordFormProps } from '@/store/manageInterface';
import { useTranslation } from 'react-i18next';
const PasswordForm = React.forwardRef<ReactNode, UserAndPasswordFormProps>((props, ref) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  useImperativeHandle(ref, () => ({
    form: form,
  }));
  return (
    <Form layout='vertical' form={form}>
      <Form.Item
        name='password'
        label={t('common:password.name')}
        rules={[
          {
            required: true,
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
        hasFeedback
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        name='confirm'
        label={t('common:password.confirm')}
        dependencies={['password']}
        hasFeedback
        rules={[
          {
            required: true,
          },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }

              return Promise.reject(new Error(t('common:password.notMatch')));
            },
          }),
        ]}
      >
        <Input.Password />
      </Form.Item>
    </Form>
  );
});
export default PasswordForm;
