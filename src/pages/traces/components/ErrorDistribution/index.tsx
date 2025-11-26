import React from 'react';
import { Row, Col, Card } from 'antd';
import { Column } from '@ant-design/plots';
import { useTranslation } from 'react-i18next';

interface ILAtencyProps {
  now: any;
  contrast?: any;
  loading: boolean;
}

const ErrorDistribution: React.FC<ILAtencyProps> = (props) => {
  const { now = [], contrast = [], loading } = props;
  const { t } = useTranslation('traces');
  const config: any = {
    data: [...now, ...contrast],
    isGroup: true,
    animation: false,
    xField: 'time',
    yField: 'value',
    seriesField: 'type',
    color: ['#0065D9', '#009A95'],
    legend: {
      position: 'bottom',
    },
  };

  return (
    <Card size='small'>
      <Row justify='space-between'>
        <Col>{t('err_occurrences_num')}</Col>
      </Row>
      <Column {...config} height={240} style={{ padding: '15px 10px 0' }} loading={loading} />
    </Card>
  );
};

export default ErrorDistribution;
