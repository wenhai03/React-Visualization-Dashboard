import React, { useEffect, useState } from 'react';
import { Modal, Form, Upload, Input, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import '@/pages/alertRules/locale'

interface IProps {
  visible: boolean;
  initialValue?: any;
  onOk: (value) => void;
  onCancel: () => void;
}
const CateModal: React.FC<IProps> = (props) => {
  const { t } = useTranslation('alertRules');
  const [form] = Form.useForm();
  const { visible, onOk, onCancel, initialValue } = props;
  const [base64, setBase64] = useState();

  useEffect(() => {
    if (visible && initialValue) {
      setBase64(initialValue.icon_base64);
      form.setFieldsValue(initialValue);
    } else {
      form.resetFields();
      setBase64(undefined);
    }
  }, [visible, initialValue]);

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        onOk(values);
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  return (
    <Modal forceRender title={t('cate')} visible={visible} width={400} onOk={handleOk} onCancel={onCancel}>
      <Form form={form}>
        <Form.Item name='id' hidden>
          <div />
        </Form.Item>
        <Form.Item label={t('cate_name')} name='name' rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label={t('cate_icon')} name='icon_base64' rules={[{ required: true }]} extra={t('cate_icon_extra')}>
          <Input hidden />
          <Upload
            listType='picture-card'
            showUploadList={false}
            beforeUpload={(file: any) => {
              const isImage = file.type.startsWith('image/');
              const maxSize = 20 * 1024; // 20KB
              if (!isImage) {
                message.error(t('required_image'));
              } else if (file.size > maxSize) {
                message.error(t('required_max_size'));
              } else {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                  const base64Str: any = reader.result;
                  setBase64(base64Str);
                  form.setFieldsValue({ icon_base64: base64Str });
                };
              }
              return false;
            }}
          >
            <div style={{ backgroundImage: `url("${base64}")` }} className='builtin-cate-upload'>
              {!base64 && (
                <span style={{ lineHeight: '102px' }}>
                  <UploadOutlined />
                  Upload
                </span>
              )}
              <PlusOutlined className='builtin-cate-upload-icon' />
            </div>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CateModal;
