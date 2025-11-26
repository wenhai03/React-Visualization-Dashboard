/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React from 'react';
import { Form, Radio, Select, Row, Col, InputNumber, Switch, Button, Space, Mentions, Tooltip } from 'antd';
import {
  CaretDownOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  QuestionCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation, Trans } from 'react-i18next';
import { Panel } from '../../Components/Collapse';
import { calcsOptions } from '../../config';
import { colors } from '../../../Components/ColorRangeMenu/config';
import '../../../Components/ColorRangeMenu/style.less';

export default function GraphStyles({ targets, variableConfigWithOptions }) {
  const { t, i18n } = useTranslation('dashboard');
  const namePrefix = ['custom'];
  const colorRange = Form.useWatch([...namePrefix, 'colorRange']);

  return (
    <Panel header={t('panel.custom.title')} isInner>
      <>
        <Row gutter={10}>
          <Col span={12}>
            <Form.Item label={t('panel.custom.textMode')} name={[...namePrefix, 'textMode']}>
              <Radio.Group buttonStyle='solid'>
                <Radio.Button value='valueAndName'>{t('panel.custom.valueAndName')}</Radio.Button>
                <Radio.Button value='name'>{t('panel.custom.name')}</Radio.Button>
                <Radio.Button value='value'>{t('panel.custom.value')}</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={10}>
          <Col span={8}>
            <Form.Item label={t('panel.custom.calc')} name={[...namePrefix, 'calc']}>
              <Select suffixIcon={<CaretDownOutlined />}>
                {_.map(calcsOptions, (item, key) => {
                  return (
                    <Select.Option key={key} value={key}>
                      {i18n.language === 'en_US' ? key : item.name}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label={t('panel.custom.colorRange')} name={[...namePrefix, 'colorRange']}>
              <Select suffixIcon={<CaretDownOutlined />} dropdownClassName='color-scales' optionLabelProp='label'>
                {_.map(colors, (item) => {
                  return (
                    <Select.Option key={item.label} label={item.label} value={_.join(item.value, ',')}>
                      <span className='color-scales-menu-colors'>
                        {item.type === 'palette' &&
                          _.map(item.value, (color) => {
                            return (
                              <span
                                key={color}
                                style={{
                                  backgroundColor: color,
                                }}
                              />
                            );
                          })}
                      </span>
                      {item.label}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>
          {colorRange !== 'thresholds' && (
            <Col span={8}>
              <Form.Item
                label={t('panel.custom.reverseColorOrder')}
                name={[...namePrefix, 'reverseColorOrder']}
                valuePropName='checked'
              >
                <Switch />
              </Form.Item>
            </Col>
          )}
        </Row>
        {colorRange !== 'thresholds' && (
          <Row gutter={10}>
            <Col span={8}>
              <Form.Item
                label={t('panel.custom.colorDomainAuto')}
                tooltip={t('panel.custom.colorDomainAuto_tip')}
                name={[...namePrefix, 'colorDomainAuto']}
                valuePropName='checked'
              >
                <Switch />
              </Form.Item>
            </Col>
            <Form.Item shouldUpdate noStyle>
              {({ getFieldValue }) => {
                if (!getFieldValue([...namePrefix, 'colorDomainAuto'])) {
                  return (
                    <>
                      <Col span={8}>
                        <Form.Item label='min' name={[...namePrefix, 'colorDomain', 0]}>
                          <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label='max' name={[...namePrefix, 'colorDomain', 1]}>
                          <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </>
                  );
                }
              }}
            </Form.Item>
          </Row>
        )}
        <Form.List name={[...namePrefix, 'detailUrl']}>
          {(fields, { add, remove }) => (
            <>
              <Space align='baseline'>
                {t('panel.base.link.label')}
                <Tooltip title={<Trans ns='dashboard' i18nKey='dashboard:link.url_tip' components={{ 1: <br /> }} />}>
                  <QuestionCircleOutlined />
                </Tooltip>
                <PlusCircleOutlined
                  className='control-icon-normal'
                  onClick={() =>
                    add({
                      queryType: '',
                      urls: [
                        {
                          title: '',
                          url: '',
                          targetBlank: false,
                        },
                      ],
                    })
                  }
                />
              </Space>
              {fields.map(({ key, name, ...restField }) => (
                <Panel
                  key={key}
                  header='模块'
                  extra={
                    <MinusCircleOutlined
                      onClick={() => {
                        remove(name);
                      }}
                    />
                  }
                >
                  <Form.Item
                    label={t('panel.overrides.matcher')}
                    {...restField}
                    name={[name, 'queryType']}
                    rules={[
                      {
                        required: true,
                      },
                    ]}
                  >
                    <Select suffixIcon={<CaretDownOutlined />} allowClear>
                      {_.map(targets, (target) => {
                        return (
                          <Select.Option key={target.refId} value={target.refId}>
                            {target.refId}
                          </Select.Option>
                        );
                      })}
                    </Select>
                  </Form.Item>
                  <Form.List name={[name, 'urls']}>
                    {(fields, { add, remove }) => (
                      <>
                        <Button
                          style={{ width: '100%', marginBottom: 10 }}
                          onClick={() => {
                            add();
                          }}
                        >
                          {t('panel.base.link.btn')}
                        </Button>
                        {fields.map(({ key: urlsKey, name: urlsName, ...restField }) => {
                          return (
                            <Space
                              key={urlsKey}
                              style={{
                                alignItems: 'flex-start',
                              }}
                            >
                              <Form.Item
                                {...restField}
                                name={[urlsName, 'title']}
                                rules={[
                                  {
                                    required: true,
                                    message: t('panel.base.link.name_msg'),
                                  },
                                ]}
                              >
                                <Mentions prefix='$' split='' placeholder={t('panel.base.link.name')}>
                                  {_.map(variableConfigWithOptions, (item) => {
                                    return (
                                      <Mentions.Option key={item.name} value={item.name}>
                                        {item.name}
                                      </Mentions.Option>
                                    );
                                  })}
                                </Mentions>
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[urlsName, 'url']}
                                rules={[
                                  {
                                    required: true,
                                    message: t('panel.base.link.url_msg'),
                                  },
                                ]}
                              >
                                <Mentions
                                  prefix='$'
                                  split=''
                                  style={{ width: 280 }}
                                  placeholder={t('panel.base.link.url')}
                                >
                                  {_.map(variableConfigWithOptions, (item) => {
                                    return (
                                      <Mentions.Option key={item.name} value={item.name}>
                                        {item.name}
                                      </Mentions.Option>
                                    );
                                  })}
                                </Mentions>
                              </Form.Item>
                              <Tooltip title={t('panel.base.link.isNewBlank')}>
                                <Form.Item {...restField} name={[urlsName, 'targetBlank']} valuePropName='checked'>
                                  <Switch />
                                </Form.Item>
                              </Tooltip>
                              <Button
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                  remove(urlsName);
                                }}
                              />
                            </Space>
                          );
                        })}
                      </>
                    )}
                  </Form.List>
                </Panel>
              ))}
            </>
          )}
        </Form.List>
        <Form.Item label={t('panel.base.description')} name='description'>
          <Mentions prefix='$' split='' rows={3}>
            {_.map(variableConfigWithOptions, (item) => {
              return (
                <Mentions.Option key={item.name} value={item.name}>
                  {item.name}
                </Mentions.Option>
              );
            })}
          </Mentions>
        </Form.Item>
      </>
    </Panel>
  );
}
