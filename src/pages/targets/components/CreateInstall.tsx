import React, { useContext } from 'react';
import { Modal, Form, Select, Alert } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';

interface IModal {
  visible: boolean;
  onCancel: () => void;
  onOk: () => void;
}

const CreateInstall: React.FC<IModal> = (props) => {
  const { visible, onCancel, onOk } = props;
  const history = useHistory();
  const { t } = useTranslation('targets');
  const { busiGroups } = useContext(CommonStateContext);
  const [form] = Form.useForm();

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        form.resetFields();
        onOk();
        history.push('/targets-install');
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };
  return (
    <Modal
      forceRender
      title={t('new_deployment')}
      visible={visible}
      width={400}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
    >
      <Alert type='info' showIcon style={{ marginBottom: '10px' }} message={t('new_deployment_tip')} />
      <Form form={form}>
        <Form.Item label={t('common:business_group')} name='busi_group' rules={[{ required: true }]}>
          <Select showSearch>
            {busiGroups.map((item) => (
              <Select.Option key={item.id} value={item.name}>
                {item.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateInstall;
