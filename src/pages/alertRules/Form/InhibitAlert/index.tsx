import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { Card, Form, Space, Row, Col, Select, Tooltip } from 'antd';
import {
  PlusCircleOutlined,
  MinusCircleOutlined,
  ExclamationCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { FormStateContext } from '@/pages/alertRules/Form';
import { getBuiltinAlerts, getStrategyGroupSubList } from '@/services/warning';
import { panelBaseProps } from '../../constants';

export default function InhibitAlert(props) {
  const { bgid, isBuiltin, initialValues, type } = props;
  const { disabled } = useContext(FormStateContext);
  const { t } = useTranslation('alertRules');
  const [builtinList, setBuiltInList] = useState([]);
  const [alertList, setAlertList] = useState([]);
  const mask = initialValues?.builtin_id > 0 && type !== 2;

  useEffect(() => {
    getBuiltinAlerts().then((res) => {
      setBuiltInList(res.dat ?? []);
    });
    getStrategyGroupSubList({ id: bgid }).then((res) => {
      const data = res.dat?.map((item) => {
        const newItem = { ...item, isDisabled: item.disabled };
        delete newItem.disabled;
        return newItem;
      });
      setAlertList(data ?? []);
    });
  }, []);

  return (
    <Card
      {...panelBaseProps}
      title={
        <Space size={4}>
          {t('inhibit_alert')}
          <Tooltip title={t('inhibit_alert_tip')}>
            <QuestionCircleOutlined />
          </Tooltip>
        </Space>
      }
      className={mask ? 'disabled-mask' : undefined}
    >
      <Form.List name='inhibit_alert'>
        {(fields, { add, remove }) => (
          <div>
            {fields.map((field) => (
              <Row gutter={16} key={field.key}>
                <Col flex='120px'>
                  <Form.Item {...field} name={[field.name, 'type']}>
                    <Select disabled={isBuiltin}>
                      <Select.Option value='rule'>{t('general_alarm')}</Select.Option>
                      <Select.Option value='builtin'>{t('built_in_alarm')}</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Form.Item
                  shouldUpdate={(prevValues, curValues) =>
                    _.get(prevValues, ['inhibit_alert', field.name, 'type']) !==
                    _.get(curValues, ['inhibit_alert', field.name, 'type'])
                  }
                  noStyle
                >
                  {({ getFieldValue }) => {
                    const type = getFieldValue(['inhibit_alert', field.name, 'type']);
                    return (
                      <Col flex='300px'>
                        {type === 'builtin' ? (
                          <Form.Item {...field} name={[field.name, 'builtin_code']}>
                            <Select
                              fieldNames={{
                                label: 'name',
                                value: 'code',
                                options: 'alert_rules',
                              }}
                              optionFilterProp='name'
                              options={builtinList}
                              showSearch
                            />
                          </Form.Item>
                        ) : (
                          <Form.Item {...field} name={[field.name, 'rule_id']}>
                            <Select
                              fieldNames={{
                                label: 'name',
                                value: 'id',
                              }}
                              showSearch
                              optionFilterProp='name'
                              options={alertList
                                .filter((item: any) => !(item.builtin_id > 0))
                                .map((ele: any) => ({
                                  ...ele,
                                  name: (
                                    <Space size={3}>
                                      {ele.isDisabled ? <ExclamationCircleOutlined style={{ color: 'red' }} /> : null}
                                      {ele.name}
                                    </Space>
                                  ),
                                }))}
                            />
                          </Form.Item>
                        )}
                      </Col>
                    );
                  }}
                </Form.Item>
                <Col flex='auto'>
                  <Form.Item {...field} name={[field.name, 'labels']}>
                    <Select mode='tags' tokenSeparators={[' ']} open={false} placeholder='关联标签' />
                  </Form.Item>
                </Col>
                {!disabled && (
                  <Col flex='40px'>
                    <MinusCircleOutlined className='control-icon-normal' onClick={() => remove(field.name)} />
                  </Col>
                )}
              </Row>
            ))}
            {!disabled && (
              <PlusCircleOutlined
                style={{ marginBottom: '10px' }}
                onClick={() =>
                  add({
                    type: isBuiltin ? 'builtin' : 'rule',
                  })
                }
              />
            )}
          </div>
        )}
      </Form.List>
    </Card>
  );
}
