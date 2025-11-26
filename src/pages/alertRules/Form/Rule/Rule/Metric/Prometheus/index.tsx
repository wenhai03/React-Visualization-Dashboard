import React, { useContext } from 'react';
import { Form, Row, Col, Card, Space } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import { PromQLInputWithBuilder } from '@/components/PromQLInput/PromQLInputWithBuilder';
import AdditionalLabel from '@/pages/alertRules/Form/components/AdditionalLabel';
import Severity from '@/pages/alertRules/Form/components/Severity';
import Inhibit from '@/pages/alertRules/Form/components/Inhibit';
import { FormStateContext } from '@/pages/alertRules/Form';
import './style.less';

const DATASOURCE_ALL = 0;

function getFirstDatasourceId(datasourceIds: number[] = [], datasourceList: { id: number }[] = []) {
  return _.isEqual(datasourceIds, [DATASOURCE_ALL]) && datasourceList.length > 0
    ? datasourceList[0]?.id
    : datasourceIds[0];
}

export default function Prometheus(props: { datasourceCate: string; datasourceValue: number[] }) {
  const { datasourceCate, datasourceValue } = props;
  const { t } = useTranslation('alertRules');
  const { groupedDatasourceList, curBusiId, curBusiGroup } = useContext(CommonStateContext);
  const { disabled } = useContext(FormStateContext);
  const curDatasourceList = groupedDatasourceList[datasourceCate] || [];
  const datasourceId = getFirstDatasourceId(datasourceValue, curDatasourceList);

  return (
    <Form.List name={['rule_config', 'queries']}>
      {(fields, { add, remove }) => (
        <Card
          title={
            <Space>
              <span>{t('metric.query.title')}</span>
              {curBusiGroup.perm === 'rw' && (
                <PlusCircleOutlined
                  onClick={() =>
                    add({
                      prom_ql: '',
                      severity: 3,
                    })
                  }
                />
              )}
              <Inhibit triggersKey='queries' />
            </Space>
          }
          size='small'
        >
          <div className='alert-rule-triggers-container'>
            {fields.map((field) => (
              <div key={field.key} className='alert-rule-trigger-container'>
                <Row>
                  <Col flex='80px'>
                    <div style={{ marginTop: 6 }}>PromQL</div>
                  </Col>
                  <Col flex='auto' style={{ zIndex: 2 }}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'prom_ql']}
                      validateTrigger={['onBlur']}
                      trigger='onChange'
                      rules={[{ required: true, message: t('请输入PromQL') }]}
                    >
                      <PromQLInputWithBuilder groupId={curBusiId} readonly={disabled} datasourceValue={datasourceId} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row align='middle'>
                  <Col flex='350px' style={{ marginBottom: '18px', lineHeight: '32px' }}>
                    <Severity field={field} />
                  </Col>
                  <Col span={8}>
                    <AdditionalLabel field={field} />
                  </Col>
                </Row>
                {curBusiGroup.perm === 'rw' && (
                  <MinusCircleOutlined className='alert-rule-trigger-remove' onClick={() => remove(field.name)} />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </Form.List>
  );
}
