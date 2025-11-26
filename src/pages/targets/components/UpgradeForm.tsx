import { upgradeAgent } from '@/services/agent';
import { Form, Input, Typography } from 'antd';
import { useTranslation, Trans } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { getConfigVersion } from '@/services/config';
import { getClusterList } from '@/services/targets';
import AgentModal from './AgentModal';

const { TextArea } = Input;
const { Paragraph, Text } = Typography;

interface UpgradeFormProps {
  visible: boolean;
  onCancel: () => void;
  onOk: () => void;
  record: any[];
}

const UpgradeForm: React.FC<UpgradeFormProps> = ({ visible, onCancel, onOk, record }) => {
  const { t } = useTranslation('targets');
  const [version, setVersion] = useState('');
  const [idents, setIdents] = useState<any>([]);
  const submitUpgrade = async (values: any) => {
    return upgradeAgent({ ...values, idents: values.idents.split(/[ ,\n]+/) });
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
      getConfigVersion().then((res) => {
        if (res.success) {
          setVersion(res.dat);
        }
      });
    }
  }, [visible]);

  const items = (
    <>
      <Form.Item
        name='idents'
        label={t('instance')}
        initialValue={idents}
        rules={[{ required: true, whitespace: true, message: t('upgrade_message') }]}
      >
        <TextArea readOnly style={{ height: 200, resize: 'none' }} />
      </Form.Item>
      <Form.Item
        name='version'
        label={t('new_version')}
        rules={[{ required: true, whitespace: true, message: t('new_version_required_messgae') }]}
      >
        <Input />
      </Form.Item>
      <Form.Item label={t('pay_attention')} style={{ alignItems: 'baseline' }}>
        <Paragraph style={{ marginBottom: '0' }}>
          <Trans t={t} i18nKey='upgrade_prompt_text' components={[<Text mark />]} />
        </Paragraph>
      </Form.Item>
    </>
  );

  const initValues = {
    idents: idents.join('\n'),
    version: version,
  };

  return (
    <AgentModal
      visible={visible}
      title={`${t('upgrade')}Agent`}
      onOk={onOk}
      onCancel={onCancel}
      operation={submitUpgrade}
      formItems={items}
      formInitValues={initValues}
    ></AgentModal>
  );
};

export default UpgradeForm;
