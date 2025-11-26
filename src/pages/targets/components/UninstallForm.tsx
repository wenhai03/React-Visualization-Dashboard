import { uninstallAgent } from '@/services/agent';
import { Form, Input, Typography } from 'antd';
import { useTranslation, Trans } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { getClusterList } from '@/services/targets';
import AgentModal from './AgentModal';

const { TextArea } = Input;
const { Paragraph, Text } = Typography;

interface UninstallFormProps {
  visible: boolean;
  onCancel: () => void;
  onOk: () => void;
  record: any[];
}

const UninstallForm: React.FC<UninstallFormProps> = ({ visible, onCancel, onOk, record }) => {
  const { t } = useTranslation('targets');
  const [idents, setIdents] = useState<any>([]);
  const submitUninstall = async (values: any) => {
    return uninstallAgent({ ...values, idents: values.idents.split(/[ ,\n]+/) });
  };

  useEffect(() => {
    if (visible) {
      const hasK8s = record.filter((item) => item.rt === 'ct-k8s');
      const identList = record.map(({ ident }) => ident);
      if (hasK8s.length) {
        getClusterList({ idents: identList.join(',') }).then((res) => {
          setIdents(res.dat);
        });
      } else {
        setIdents(identList);
      }
    }
  }, [visible]);

  const items = (
    <>
      <Form.Item
        name='idents'
        label={t('instance')}
        initialValue={idents}
        rules={[{ required: true, whitespace: true, message: t('uninstall_message') }]}
      >
        <TextArea readOnly style={{ height: 200, resize: 'none' }} />
      </Form.Item>
      <Form.Item label={t('pay_attention')} style={{ alignItems: 'baseline' }}>
        <Paragraph style={{ marginBottom: '0' }}>
          <Trans t={t} i18nKey='uninstall_prompt_text' components={[<Text type='danger' />, <Text mark />]} />
        </Paragraph>
      </Form.Item>
    </>
  );

  const initValues = {
    idents: idents.join('\n'),
  };

  return (
    <AgentModal
      visible={visible}
      title={`${t('uninstall')}Agent`}
      onOk={onOk}
      onCancel={onCancel}
      operation={submitUninstall}
      formItems={items}
      formInitValues={initValues}
    ></AgentModal>
  );
};

export default UninstallForm;
