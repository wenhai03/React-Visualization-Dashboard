import React, { useContext } from 'react';
import { Modal, Form, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';

interface IModal {
  visible: boolean;
  onCancel: () => void;
  onOk: (values: any) => void;
}

const SelectGroupModal: React.FC<IModal> = (props) => {
  const { visible, onCancel, onOk } = props;
  const { t } = useTranslation('targets');
  const { busiGroups } = useContext(CommonStateContext);
  const [form] = Form.useForm();

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        form.resetFields();
        onOk(values);
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };
  return (
    <Modal
      forceRender
      title={t('common:business_group')}
      visible={visible}
      width={400}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
    >
      <Form form={form}>
        <Form.Item label={t('common:business_group')} name='busi_group' rules={[{ required: true }]}>
          <Select showSearch>
            {busiGroups.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SelectGroupModal;
