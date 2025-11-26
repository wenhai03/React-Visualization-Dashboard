import React, { useContext, useState, useEffect } from 'react';
import { Row, Col, Form, Input, InputNumber, Select, AutoComplete, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import { getFields } from '@/pages/explorer/Elasticsearch/services';
import { QuestionCircleOutlined } from '@ant-design/icons';

export default function Time({ prefixField = {}, prefixNameField = [], datasourceValue, index }: any) {
  const { t } = useTranslation('datasource');
  const { curBusiId } = useContext(CommonStateContext);
  const [fieldsOptions, setFieldsOptions] = useState<any[]>([]);

  useEffect(() => {
    if (datasourceValue && index) {
      getFields(datasourceValue, index, 'date', curBusiId).then((res) => {
        setFieldsOptions(
          _.map(res.fields, (item) => {
            return {
              value: item,
            };
          }),
        );
      });
    }
  }, [datasourceValue, index]);

  return (
    <>
      <div style={{ marginBottom: 8 }}>{t('datasource:es.time_label')}</div>
      <Row gutter={10}>
        <Col span={12}>
          <Form.Item
            {...prefixField}
            name={[...prefixNameField, 'query', 'date_field']}
            rules={[
              {
                required: true,
                message: t('datasource:es.date_field_msg'),
              },
            ]}
          >
            <AutoComplete options={fieldsOptions} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Input.Group>
            <span className='ant-input-group-addon'>
              {t('datasource:es.interval')}

              <Tooltip placement='top' title={t('datasource:es.time_empty_tip')}>
                <QuestionCircleOutlined style={{ marginLeft: 5, cursor: 'help' }} />
              </Tooltip>
            </span>

            <Form.Item {...prefixField} name={[...prefixNameField, 'query', 'interval']} noStyle>
              <InputNumber style={{ width: '100%' }} placeholder={t('datasource:es.time_auto_text')} />
            </Form.Item>
            <span className='ant-input-group-addon'>
              <Form.Item
                {...prefixField}
                name={[...prefixNameField, 'query', 'interval_unit']}
                noStyle
                initialValue='min'
              >
                <Select>
                  <Select.Option value='second'>{t('common:time.second')}</Select.Option>
                  <Select.Option value='min'>{t('common:time.minute')}</Select.Option>
                  <Select.Option value='hour'>{t('common:time.hour')}</Select.Option>
                </Select>
              </Form.Item>
            </span>
          </Input.Group>
        </Col>
      </Row>
    </>
  );
}
