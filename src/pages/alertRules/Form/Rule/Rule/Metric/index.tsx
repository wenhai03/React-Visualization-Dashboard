import React, { useContext } from 'react';
import { Form, Row, Col, Radio, Tag, Space, Tooltip } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import DatasourceValueSelect from '@/pages/alertRules/Form/components/DatasourceValueSelect';
import { DatasourceCateSelect } from '@/components/DatasourceSelect';
import { FormStateContext } from '@/pages/alertRules/Form';
import { getDefaultValuesByCate } from '../../../utils';
import Prometheus from './Prometheus';
import Forecast from './Forecast';

export default function Metric({ form }) {
  const { t } = useTranslation('alertRules');
  const { groupedDatasourceList } = useContext(CommonStateContext);
  const { type, enableForecast } = useContext(FormStateContext);

  return (
    <div>
      <Form.Item label={t('metric.alarm_mode')} name='sub_prod' initialValue={''}>
        <Radio.Group
          disabled={!type && !enableForecast}
          onChange={(e) => {
            const rule_config = form.getFieldValue('rule_config');
            rule_config.queries = [
              {
                prom_ql: '',
                severity: 2,
              },
            ];
            if (e.target.value !== 'forecast') {
              form.setFieldsValue({ rule_config: rule_config });
            }
          }}
        >
          <Radio value=''>{t('metric.threshold_alarm')}</Radio>
          <Radio value='forecast'>
            <Space size={2}>
              {t('metric.forecast')}
              <Tooltip title={t('common:view_doc')}>
                <a
                  href='/docs/recommand/ai-alert'
                  target='_blank'
                  style={{ color: '#262626', verticalAlign: 'middle' }}
                >
                  <LinkOutlined />
                </a>
              </Tooltip>
              <Tag color='#faad14' style={{ fontSize: '9px', padding: '0 2px', lineHeight: '14px' }}>
                Alpha
              </Tag>
            </Space>
          </Radio>
        </Radio.Group>
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={t('common:datasource.type')} name='cate'>
            <DatasourceCateSelect
              scene='alert'
              filterCates={(cates) => {
                return _.filter(cates, (item) => item.type === 'metric' && !!item.alertRule);
              }}
              onChange={(val) => {
                form.setFieldsValue(getDefaultValuesByCate('metric', val));
              }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.cate !== curValues.cate} noStyle>
            {({ getFieldValue, setFieldsValue }) => {
              const cate = getFieldValue('cate');
              return (
                <DatasourceValueSelect
                  setFieldsValue={setFieldsValue}
                  cate={cate}
                  datasourceList={groupedDatasourceList[cate] || []}
                  mode={cate === 'prometheus' ? 'multiple' : undefined}
                />
              );
            }}
          </Form.Item>
        </Col>
      </Row>
      <div style={{ marginBottom: 10 }}>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, curValues) =>
            !_.isEqual(prevValues.cate, curValues.cate) ||
            !_.isEqual(prevValues.datasource_ids, curValues.datasource_ids) ||
            !_.isEqual(prevValues.sub_prod, curValues.sub_prod)
          }
        >
          {(form) => {
            const cate = form.getFieldValue('cate');
            const datasourceValue = form.getFieldValue('datasource_ids');
            const sub_prod = form.getFieldValue('sub_prod');
            if (sub_prod === 'forecast') {
              return <Forecast datasourceCate={cate} datasourceValue={datasourceValue} form={form} />;
            } else {
              return <Prometheus datasourceCate={cate} datasourceValue={datasourceValue} />;
            }
          }}
        </Form.Item>
      </div>
    </div>
  );
}
