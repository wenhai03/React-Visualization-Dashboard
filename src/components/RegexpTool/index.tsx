import React, { useState, FC, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Form, Input, Tag } from 'antd';
import { setRegexp } from '@/services/agent';

const RegexpTool: FC<{ regexp?: string }> = ({ regexp }) => {
  const { t } = useTranslation('common');
  const [form] = Form.useForm();
  const [result, setResult] = useState();
  const handleCodeOk = () => {
    form.validateFields().then((values) => {
      setRegexp(values).then((res) => {
        setResult(res.dat);
      });
    });
  };

  useEffect(() => {
    if (regexp) {
      form.setFieldsValue({ regexp_rule: regexp });
    }
  }, [regexp]);

  return (
    <>
      <Form form={form}>
        <Form.Item
          label={t('tool.regexp_rule')}
          name='regexp_rule'
          rules={[{ required: true, message: t('tool.rule_required') }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={t('tool.test_text')}
          name='text'
          rules={[{ required: true, message: t('tool.text_required') }]}
        >
          <Input.TextArea rows={6} />
        </Form.Item>
        <Form.Item label={<span style={{ marginLeft: '10px' }}>{t('tool.match_result')}</span>}>
          {result === undefined ? (
            '-'
          ) : result ? (
            <Tag color='green'>{t('common:tool.match_success')}</Tag>
          ) : (
            <Tag color='red'>{t('common:tool.match_fail')}</Tag>
          )}
        </Form.Item>
        <Button type='primary' style={{ position: 'absolute', bottom: '24px', right: '100px' }} onClick={handleCodeOk}>
          {t('tool.test')}
        </Button>
      </Form>
    </>
  );
};

export default RegexpTool;
