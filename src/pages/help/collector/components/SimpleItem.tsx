import { getConfigByKey, setConfigByKey } from '@/services/config';
import { Col, Divider, Row, Tooltip, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';

const { Paragraph } = Typography;

interface SimpleItemProps {
  ckey: string;
  label: string;
  description: string | React.ReactElement;
}

export default function SimpleItem(props: SimpleItemProps) {
  const { t } = useTranslation();
  const [val, setVal] = useState('');

  useEffect(() => {
    getConfigByKey({ ckey: props.ckey }).then((res) => {
      if (res.success) {
        setVal(res.dat);
      }
    });
  }, []);

  const changeVal = (newVal) => {
    if (newVal == '' && props.ckey !== 'agent_domain') {
      return false;
    }
    let config = { ckey: props.ckey, cval: newVal };
    setConfigByKey(config).then((res) => {
      if (res.success) {
        setVal(newVal);
        message.success(t('common:success.modify'), 2);
      }
    });
  };

  return (
    <>
      <Divider />
      <Row>
        <Col span={2} style={{ textAlign: 'right', paddingRight: '15px' }}>
          <Tooltip title={props.description}>{props.label}:</Tooltip>
        </Col>
        <Col span={22}>
          <Paragraph editable={{ onChange: changeVal }}>{val}</Paragraph>
        </Col>
      </Row>
    </>
  );
}
