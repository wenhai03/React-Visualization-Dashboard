import React, { useContext } from 'react';
import { Form, Row, Col, Radio, Tag, Tooltip, Select, Card, InputNumber, AutoComplete, Input } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import { PromQLInputWithBuilder } from '@/components/PromQLInput/PromQLInputWithBuilder';
import { FormStateContext } from '@/pages/alertRules/Form';
import '@/pages/alertRules/style.less';

const DATASOURCE_ALL = 0;

function getFirstDatasourceId(datasourceIds: number[] = [], datasourceList: { id: number }[] = []) {
  return _.isEqual(datasourceIds, [DATASOURCE_ALL]) && datasourceList.length > 0
    ? datasourceList[0]?.id
    : datasourceIds[0];
}

export default function Forecast(props: { datasourceCate: string; datasourceValue: number[]; form: any }) {
  const { datasourceCate, datasourceValue, form } = props;
  const { t } = useTranslation('alertRules');
  const { groupedDatasourceList, curBusiId, profile } = useContext(CommonStateContext);
  const { disabled } = useContext(FormStateContext);
  const curDatasourceList = groupedDatasourceList[datasourceCate] || [];
  const datasourceId = getFirstDatasourceId(datasourceValue, curDatasourceList);

  // 校验单个标签格式是否正确
  function isTagValid(tag) {
    const contentRegExp = /^[a-zA-Z_][\w]*={1}[^=]+$/;
    return {
      isCorrectFormat: contentRegExp.test(tag.toString()),
      isLengthAllowed: tag.toString().length <= 64,
    };
  }

  // 渲染标签
  const tagRender = (content) => {
    const { isCorrectFormat, isLengthAllowed } = isTagValid(content.value ?? '');
    return isCorrectFormat && isLengthAllowed ? (
      <Tag closable={content.closable} onClose={content.onClose}>
        {content.value}
      </Tag>
    ) : (
      <Tooltip title={isCorrectFormat ? t('append_tags_msg1') : t('append_tags_msg2')}>
        <Tag color='error' closable={content.closable} onClose={content.onClose} style={{ marginTop: '2px' }}>
          {content.value}
        </Tag>
      </Tooltip>
    );
  };

  // 校验所有标签格式
  function isValidFormat() {
    return {
      validator(_, value) {
        const isInvalid =
          value &&
          value.some((tag) => {
            const { isCorrectFormat, isLengthAllowed } = isTagValid(tag);
            if (!isCorrectFormat || !isLengthAllowed) {
              return true;
            }
          });
        return isInvalid ? Promise.reject(new Error(t('append_tags_msg'))) : Promise.resolve();
      },
    };
  }

  return (
    <Card title={t('metric.query.title')} size='small'>
      <div className='alert-rule-trigger-container'>
        <Row>
          <Col flex='80px'>
            <div style={{ marginTop: 6 }}>PromQL</div>
          </Col>
          <Col flex='auto'>
            <Form.Item
              name={['rule_config', 'prom_ql']}
              validateTrigger={['onBlur']}
              trigger='onChange'
              rules={[{ required: true, message: t('metric.promql_required') }]}
            >
              <PromQLInputWithBuilder groupId={curBusiId} readonly={disabled} datasourceValue={datasourceId} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={8}>
            <Row align='middle' style={{ lineHeight: '32px' }}>
              <Col flex='80px'>{t('severity_label')}：</Col>
              <Col flex='auto'>
                <Form.Item
                  name={['rule_config', 'severity']}
                  rules={[{ required: true, message: 'Missing severity' }]}
                  initialValue={2}
                  noStyle
                >
                  <Radio.Group disabled={disabled}>
                    <Radio value={1}>{t('common:severity.1')}</Radio>
                    <Radio value={2}>{t('common:severity.2')}</Radio>
                    <Radio value={3}>{t('common:severity.3')}</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>
          </Col>
          <Col span={8}>
            <Row align='middle'>
              <Col flex='80px' style={{ marginBottom: '18px' }}>
                {t('append_tags')} ：
              </Col>
              <Col flex='auto'>
                <Form.Item name={['rule_config', 'severity_tags']} rules={[isValidFormat]}>
                  <Select
                    mode='tags'
                    tokenSeparators={[' ']}
                    open={false}
                    placeholder={t('append_tags_placeholder')}
                    tagRender={tagRender}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Col>
          <Col span={8} />
          <Form.Item noStyle hidden={!profile?.admin}>
            <Col span={8}>
              <Row align='middle'>
                <Col flex='80px' style={{ marginBottom: '18px' }}>
                  {t('metric.models')}：
                </Col>
                <Col flex='auto'>
                  <Form.Item
                    name={['rule_config', 'models']}
                    rules={[{ required: true, message: t('metric.models_required') }]}
                    initialValue={'SeasonalNaive'}
                  >
                    <Select>
                      <Select.Option key='SeasonalNaive' value='SeasonalNaive'>
                        {t('metric.seasonal_naive')}
                      </Select.Option>
                      <Select.Option key='MSTL' value='MSTL'>
                        {t('metric.mstl')}
                      </Select.Option>
                      {/* <Select.Option key='HistoricAverage' value='HistoricAverage'>
                        {t('metric.historic_average')}
                      </Select.Option> */}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Col>
          </Form.Item>
          <Form.Item
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.rule_config.models !== currentValues.rule_config.models
            }
            noStyle
          >
            {({ getFieldValue }) => {
              const models = getFieldValue(['rule_config', 'models']);
              return models === 'HistoricAverage' ? null : (
                <Col span={8}>
                  <Row align='middle' wrap={false}>
                    <Col flex='80px' style={{ marginBottom: '18px' }}>
                      {t('metric.season')}
                      <Tooltip title={t('metric.season_tip')}>
                        <QuestionCircleOutlined style={{ margin: '0 2px' }} />
                      </Tooltip>
                      ：
                    </Col>
                    <Col flex='auto'>
                      <Row gutter={8} wrap={false}>
                        <Col flex='auto'>
                          <Form.Item
                            shouldUpdate={(prevValues, currentValues) =>
                              prevValues.rule_config.season?.[1] !== currentValues.rule_config.season?.[1]
                            }
                            noStyle
                          >
                            {({ getFieldValue, setFieldsValue }) => {
                              // const season_second = getFieldValue(['rule_config', 'season', 1]);
                              // const freq = getFieldValue(['rule_config', 'freq']);
                              return (
                                <Form.Item
                                  name={['rule_config', 'season', 0]}
                                  rules={[
                                    {
                                      required: true,
                                      message:
                                        models === 'MSTL' ? t('metric.season_1_required') : t('metric.season_required'),
                                    },
                                    // {
                                    //   validator: (_, value) => {
                                    //     if (!season_second || !value || value < season_second) {
                                    //       return Promise.resolve();
                                    //     }

                                    //     return Promise.reject(new Error(t('metric.season_1_validator')));
                                    //   },
                                    // },
                                    // {
                                    //   validator: (_, value) => {
                                    //     if (!value || value > freq) {
                                    //       return Promise.resolve();
                                    //     }

                                    //     return Promise.reject(new Error(t('metric.season_2_validator')));
                                    //   },
                                    // },
                                  ]}
                                >
                                  <AutoComplete
                                    style={{ width: '100%' }}
                                    placeholder={models === 'MSTL' ? t('metric.season_1') : ''}
                                    options={[
                                      { label: `1${t('common:time.minute')}`, value: 60 },
                                      { label: `5${t('common:time.minute')}`, value: 300 },
                                      { label: `10${t('common:time.minute')}`, value: 600 },
                                      { label: `30${t('common:time.minute')}`, value: 1800 },
                                      { label: `1${t('common:time.hour')}`, value: 3600 },
                                      { label: `1${t('common:interval.d')}`, value: 3600 * 24 },
                                      { label: `1${t('common:interval.w')}`, value: 24 * 7 * 3600 },
                                      { label: `1${t('common:interval.M')}`, value: 24 * 30 * 3600 },
                                    ]}
                                  >
                                    <Input addonAfter='s' />
                                  </AutoComplete>
                                </Form.Item>
                              );
                            }}
                          </Form.Item>
                        </Col>

                        <Form.Item
                          shouldUpdate={
                            (prevValues, currentValues) =>
                              prevValues.rule_config.season?.[0] !== currentValues.rule_config.season?.[0]
                            // prevValues.rule_config.freq !== currentValues.rule_config.freq
                          }
                          noStyle
                        >
                          {({ getFieldValue }) => {
                            const season_first = getFieldValue(['rule_config', 'season', 0]);
                            // const freq = getFieldValue(['rule_config', 'freq']);
                            return models === 'MSTL' ? (
                              <Col span={12}>
                                <Form.Item
                                  name={['rule_config', 'season', 1]}
                                  rules={[
                                    { required: true, message: t('metric.season_2_required') },
                                    // {
                                    //   validator: (_, value) => {
                                    //     if (!value || season_first < value) {
                                    //       return Promise.resolve();
                                    //     } else {
                                    //       return Promise.reject(new Error(t('metric.season_1_validator')));
                                    //     }
                                    //   },
                                    // },
                                    // {
                                    //   validator: (_, value) => {
                                    //     if (!value || freq < value) {
                                    //       return Promise.resolve();
                                    //     }

                                    //     return Promise.reject(new Error(t('metric.season_2_validator')));
                                    //   },
                                    // },
                                  ]}
                                >
                                  <AutoComplete
                                    placeholder={t('metric.season_2')}
                                    disabled={!season_first}
                                    options={[
                                      ...(season_first < 300
                                        ? [{ label: `5${t('common:time.minute')}`, value: 300 }]
                                        : []),
                                      ...(season_first < 600
                                        ? [{ label: `10${t('common:time.minute')}`, value: 600 }]
                                        : []),
                                      ...(season_first < 1800
                                        ? [{ label: `30${t('common:time.minute')}`, value: 1800 }]
                                        : []),
                                      ...(season_first < 3600
                                        ? [{ label: `1${t('common:time.hour')}`, value: 3600 }]
                                        : []),
                                      ...(season_first < 3600 * 24
                                        ? [{ label: `1${t('common:interval.d')}`, value: 3600 * 24 }]
                                        : []),
                                      ...(season_first < 24 * 7 * 3600
                                        ? [{ label: `1${t('common:interval.w')}`, value: 24 * 7 * 3600 }]
                                        : []),
                                      ...(season_first < 24 * 30 * 3600
                                        ? [{ label: `1${t('common:interval.M')}`, value: 24 * 30 * 3600 }]
                                        : []),
                                    ]}
                                  >
                                    <Input addonAfter='s' />
                                  </AutoComplete>
                                </Form.Item>
                              </Col>
                            ) : null;
                          }}
                        </Form.Item>
                      </Row>
                    </Col>
                  </Row>
                </Col>
              );
            }}
          </Form.Item>
          <Col span={8}>
            <Row align='middle'>
              <Col flex='80px' style={{ marginBottom: '18px' }}>
                {t('metric.freq')}
                <Tooltip title={t('metric.freq_tip')}>
                  <QuestionCircleOutlined style={{ margin: '0 2px' }} />
                </Tooltip>
                ：
              </Col>
              <Col flex='auto'>
                <Form.Item
                  name={['rule_config', 'freq']}
                  rules={[{ required: true, message: t('metric.freq_required') }]}
                  initialValue={15}
                >
                  <Select
                    onChange={(e) => {
                      form.setFieldsValue({ prom_eval_interval: e * 2, prom_for_duration: e * 4 });
                    }}
                  >
                    <Select.Option key='15' value={15}>
                      15{t('common:time.second')}
                    </Select.Option>
                    <Select.Option key='30' value={30}>
                      30{t('common:time.second')}
                    </Select.Option>
                    <Select.Option key='60' value={60}>
                      1{t('common:time.minute')}
                    </Select.Option>
                    <Select.Option key='300' value={300}>
                      5{t('common:time.minute')}
                    </Select.Option>
                    <Select.Option key='600' value={600}>
                      10{t('common:time.minute')}
                    </Select.Option>
                    <Select.Option key='3600' value={3600}>
                      1{t('common:time.hour')}
                    </Select.Option>
                    <Select.Option key='86400' value={86400}>
                      1{t('common:interval.d')}
                    </Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Col>
          <Form.Item noStyle hidden={!profile?.admin}>
            <Col span={8}>
              <Row align='middle'>
                <Col flex='80px' style={{ marginBottom: '18px' }}>
                  {t('metric.levels')}
                  <Tooltip title={t('metric.levels_tip')}>
                    <QuestionCircleOutlined style={{ margin: '0 2px' }} />
                  </Tooltip>
                  ：
                </Col>
                <Col flex='auto'>
                  <Form.Item name={['rule_config', 'levels']} initialValue={99}>
                    <InputNumber style={{ width: '100%' }} max={99} />
                  </Form.Item>
                </Col>
              </Row>
            </Col>
            <Col span={8}>
              <Row align='middle'>
                <Col flex='80px' style={{ marginBottom: '18px' }}>
                  {t('metric.steps')}
                  <Tooltip title={t('metric.steps_tip')}>
                    <QuestionCircleOutlined style={{ margin: '0 2px' }} />
                  </Tooltip>
                  ：
                </Col>
                <Col flex='auto'>
                  <Form.Item name={['rule_config', 'steps']} initialValue={10}>
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Col>
          </Form.Item>
        </Row>
      </div>
    </Card>
  );
}
