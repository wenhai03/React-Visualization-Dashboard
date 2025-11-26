import React, { useState, FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Form, Input, Typography } from 'antd';
import { setEncrypt, setDecrypt } from '@/services/agent';
import '@/pages/targets/locale';

const EncodingContainer: FC<{ type: 'encrypt' | 'decrypt' }> = ({ type }) => {
  const { t } = useTranslation('targets');
  const [form] = Form.useForm();
  const [encodingResult, setEncodingResult] = useState('');
  const handleCodeOk = (type) => {
    form.validateFields().then((values) => {
      if (type === 'encrypt') {
        // 加密
        setEncrypt(values)
          .then((res) => {
            setEncodingResult(res.dat.encrypt);
          })
          .catch(() => setEncodingResult(''));
      } else {
        // 解密
        setDecrypt(values)
          .then((res) => {
            setEncodingResult(res.dat.decrypt);
          })
          .catch(() => setEncodingResult(''));
      }
    });
  };
  return (
    <>
      <Form form={form}>
        <Form.Item
          label={t(`setting.${type}_text`)}
          name='data'
          rules={[{ required: true, message: t('setting.required_encodding') + t(`setting.${type}_text`) }]}
        >
          <div className='agents-setting-modal-info'>
            <Input />
            <Button type='primary' onClick={() => handleCodeOk(type)}>
              {t(type)}
            </Button>
          </div>
        </Form.Item>
        <Form.Item
          label={
            <div style={{ paddingLeft: '10px' }}>{t(`setting.${type === 'encrypt' ? 'decrypt' : 'encrypt'}_text`)}</div>
          }
        >
          {encodingResult ? (
            <Typography.Paragraph copyable code style={{ fontSize: '16px' }}>
              {encodingResult}
            </Typography.Paragraph>
          ) : (
            '-'
          )}
        </Form.Item>
      </Form>
    </>
  );
};

export default EncodingContainer;
