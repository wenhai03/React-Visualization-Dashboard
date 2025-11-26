import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Form } from 'antd';
import { panelBaseProps } from '../../constants';
import { Host, Metric, Dial, Log, Apm } from './Rule';
import { getDefaultValuesByProd } from '../utils';
import ProdSelect from '../components/ProdSelect';
import { CommonStateContext } from '@/App';
// @ts-ignore
import PlusAlertRule from 'plus:/parcels/AlertRule';
import IntervalAndDuration from '@/pages/alertRules/Form/components/IntervalAndDuration';
import { processInitialValues } from '../utils';

export default function Rule({ form, mask, initialValues, isBuiltin }) {
  const { t } = useTranslation('alertRules');
  const { curBusiGroup } = useContext(CommonStateContext);

  const getComponent = (prod) => {
    switch (prod) {
      case 'host': {
        return <Host />;
      }
      case 'metric': {
        return <Metric form={form} />;
      }
      case 'dial': {
        return <Dial />;
      }
      case 'log': {
        return <Log isBuiltin={isBuiltin} />;
      }
      case 'apm': {
        return <Apm isBuiltin={isBuiltin} />;
      }
      default: {
        return <PlusAlertRule prod={prod} form={form} />;
      }
    }
  };

  return (
    <Card {...panelBaseProps} title={t('rule_configs')}>
      <div className={mask ? 'disabled-mask rule-mask' : undefined}>
        <ProdSelect
          onChange={(e) => {
            const val = e.target.value;
            if (initialValues?.prod === val) {
              const cover_alert_notify = initialValues.notify_mode === 1 ? curBusiGroup.alert_notify : {};

              form.setFieldsValue(processInitialValues({ ...initialValues, ...cover_alert_notify }));
            } else {
              form.setFieldsValue(getDefaultValuesByProd(val, {}));
            }
          }}
        />
        <Form.Item isListField={false} name={['rule_config', 'inhibit']} valuePropName='checked' noStyle hidden>
          <div />
        </Form.Item>
        <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.prod !== currentValues.prod}>
          {() => {
            const prod = form.getFieldValue('prod');
            return getComponent(prod);
          }}
        </Form.Item>
      </div>
      <IntervalAndDuration
        intervalTip={(num) => {
          return t('metric.prom_eval_interval_tip', { num });
        }}
        durationTip={(num) => {
          return t('metric.prom_for_duration_tip', { num });
        }}
      />
    </Card>
  );
}
