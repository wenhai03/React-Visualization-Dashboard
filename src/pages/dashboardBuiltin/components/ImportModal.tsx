import React from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Modal, Form, Input, Button } from 'antd';

interface IProps {
  visible: boolean;
  onOk: (values) => void;
  onCancel: () => void;
}

const GroupModal: React.FC<IProps> = (props) => {
  const [form] = Form.useForm();
  const { visible, onOk, onCancel } = props;
  const { t } = useTranslation('dashboardBuiltin');

  return (
    <Modal
      title={t('edit_title')}
      visible={visible}
      destroyOnClose
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      footer={null}
    >
      <Form
        layout='vertical'
        onFinish={(vals) => {
          onOk(vals);
        }}
      >
        <Form.Item
          label={t('json_label')}
          name='import'
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input.TextArea className='code-area' rows={16} />
        </Form.Item>
        <Form.Item>
          <Button type='primary' htmlType='submit'>
            {t('common:btn.import')}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default GroupModal;
