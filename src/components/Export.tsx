import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Space, message } from 'antd';
import { exportBatchDataDetail } from '@/services/common';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import ModalHOC, { ModalWrapProps } from '@/components/ModalHOC';
import { download, copyToClipBoard } from '@/utils';

interface IProps {
  data: string;
  filename: string;
  allowCopyToml?: {
    type: string;
    bgid: number;
    data: any;
  };
}

function Export(props: IProps & ModalWrapProps) {
  const { t } = useTranslation('common');
  const { visible, destroy, filename, allowCopyToml } = props;
  const [data, setData] = useState(props.data);
  return (
    <Modal
      width={800}
      title={t('btn.export')}
      visible={visible}
      onCancel={() => {
        destroy();
      }}
      footer={null}
    >
      <p>
        <a
          onClick={() => {
            download([data], `${filename}.json`);
          }}
        >
          <DownloadOutlined />
          {filename}.json
        </a>
        <Space style={{ float: 'right' }}>
          {allowCopyToml && (
            <a
              onClick={() => {
                exportBatchDataDetail(
                  allowCopyToml.type as 'input_tasks_toml' | 'logs_tasks_toml',
                  allowCopyToml.bgid,
                  allowCopyToml.data,
                ).then((res) => {
                  try {
                    const textarea = document.createElement('textarea');
                    textarea.value = res.dat;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy'); // 旧方法，仍然有效
                    document.body.removeChild(textarea);
                    message.success(t('复制到剪贴板'));
                  } catch (err) {
                    message.error(t('复制失败'));
                  }
                });
              }}
            >
              <CopyOutlined />
              复制 TOML 内容到剪贴板
            </a>
          )}
          |
          <a onClick={() => copyToClipBoard(data, (val) => val)}>
            <CopyOutlined />
            {t('copy')}
          </a>
        </Space>
      </p>
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

export default ModalHOC(Export);
