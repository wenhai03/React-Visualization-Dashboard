import { Button, Form, message, Modal, Popconfirm } from 'antd';
import React, { ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AgentModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: () => void;
  title: string;
  formItems: ReactNode;
  formInitValues: object;
  operation: (value) => Promise<any>;
}

const AgentModal: React.FC<AgentModalProps> = ({
  visible,
  onCancel,
  onOk,
  title,
  formItems,
  formInitValues,
  operation,
}) => {
  const { t } = useTranslation('targets');
  const [form] = Form.useForm();
  const [popConfirm, setPopConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOk = () => {
    form.submit();
  };

  const handleConfirm = (newOpen: boolean) => {
    if (!newOpen) {
      setPopConfirm(newOpen);
      return;
    }
    form
      .validateFields()
      .then(() => setPopConfirm(true))
      .catch(() => {});
  };

  const onFinish = (values) => {
    setLoading(true);

    // fetch('https://reqres.in/api/users', {
    //   method: 'POST',
    //   body: JSON.stringify(values),
    // })
    operation
      .call(undefined, values)
      .then((response) => {
        setLoading(false);
        if (response.success) {
          message.success(t('common:success.submit'), 2);
          onOk();
        } else {
          Modal.error({
            title: t('common:error.submit'),
            content: t('submit_error_message') + response.err,
          });
        }
      })
      .catch((error) => {
        setLoading(false);
        if (error.silence) {
          Modal.error({
            title: t('request_exception'),
            content: error.message,
          });
        }
      });
  };

  const layout = {
    labelCol: { span: 4 },
  };

  const footer = (
    <>
      <Button key='cancel' onClick={onCancel}>
        {t('common:btn.cancel')}
      </Button>
      <Popconfirm
        title={t('secondary_confirmation')}
        visible={popConfirm}
        onConfirm={handleOk}
        onVisibleChange={handleConfirm}
      >
        <Button key='submit' type='primary' loading={loading}>
          {t('common:btn.submit')}
        </Button>
      </Popconfirm>
    </>
  );

  useEffect(() => {
    if (visible) {
      form.setFieldsValue(formInitValues);
    } else {
      form.resetFields();
    }
  }, [visible, form, formInitValues]);

  return (
    <Modal forceRender visible={visible} title={title} onOk={handleOk} onCancel={onCancel} footer={footer}>
      <Form {...layout} form={form} onFinish={onFinish}>
        {formItems}
      </Form>
    </Modal>
  );
};

export default AgentModal;
