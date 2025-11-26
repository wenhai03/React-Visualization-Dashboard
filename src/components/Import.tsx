import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Button, Upload, message, Row, Col } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import ModalHOC, { ModalWrapProps } from '@/components/ModalHOC';
import { importBatchDataDetail } from '@/services/common';

interface IProps {
  bgid: number;
  refreshList: () => void;
  type: 'builtin_boards' | 'builtin_alerts' | 'input_tasks' | 'logs_tasks' | 'alert_rules' | 'boards';
}

function Import(props: IProps & ModalWrapProps) {
  const { t } = useTranslation('common');
  const { visible, destroy, bgid, refreshList, type } = props;
  const [data, setData] = useState<any>();

  const handleCustomRequest = ({ file }) => {
    // 读取文件内容
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = event.target?.result;
      setData(fileContent);
    };
    reader.readAsText(file); // 以文本形式读取文件内容
  };

  const handleBeforeUpload = (file) => {
    const fileType = file.type; // 获取文件类型
    const acceptedTypes = ['application/json', 'text/plain']; // 支持的文件类型：JSON 和 TXT

    // 检查文件类型是否在支持的列表中
    if (!acceptedTypes.includes(fileType)) {
      message.error(t('file_format_restriction'));
      return false;
    }
    return true;
  };

  const handleImport = () => {
    if (data) {
      importBatchDataDetail(type, bgid, data).then((res) => {
        message.success(t('success.import'));
        destroy();
        refreshList();
      });
    }
  };

  return (
    <Modal
      width={800}
      title={t('btn.batch_import')}
      visible={visible}
      onCancel={() => {
        destroy();
      }}
      footer={[
        <Button
          key='cancel'
          onClick={() => {
            destroy();
          }}
        >
          {t('common:btn.cancel')}
        </Button>,
        <Button key='ok' type='primary' onClick={handleImport}>
          {t('btn.import')}
        </Button>,
      ]}
    >
      <Row justify='space-between' align='middle'>
        <Col>
          <Upload
            showUploadList={false}
            beforeUpload={handleBeforeUpload}
            customRequest={handleCustomRequest}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />} type='link'>
              {t('upload_file')}
            </Button>
          </Upload>
        </Col>
        <Col>{t('upload_tip')}</Col>
      </Row>

      <Input.TextArea
        value={data}
        onChange={(e) => {
          setData(e.target.value);
        }}
        rows={30}
      />
    </Modal>
  );
}

export default ModalHOC(Import);
