import React from 'react';
import { Form, Space, Select, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { defaultConfig, defaultItem } from '../constants';

const SuccessWhen = ({ form, perm }) => {
  const { t } = useTranslation('dial');

  return (
    <Form.Item shouldUpdate className='success-when-wrapper' noStyle>
      {() => {
        const { category } = form.getFieldsValue();
        return (
          category !== 'dial:dial_whois' && (
            <>
              <div className='module-title'>{t('task.success_when')}</div>
              <Space style={{ marginBottom: '10px' }}>
                {t('task.follow_text1')}
                <Form.Item name={['content_json', 'success_when_logic']} noStyle>
                  <Select style={{ width: 100 }}>
                    <Select.Option value='or'>{t('task.or')}</Select.Option>
                    <Select.Option value='and'>{t('task.and')}</Select.Option>
                  </Select>
                </Form.Item>
                {t('task.follow_text2')}
              </Space>
              <Form.List name={['content_json', 'success_when']}>
                {(fields, { add, remove }) => (
                  <div>
                    <Space align='baseline' className='control-icon-normal'>
                      {t('task.conditions')}
                      {perm === 'rw' && (
                        <PlusCircleOutlined onClick={() => add(defaultConfig[category][defaultItem[category]].item)} />
                      )}
                    </Space>
                    {fields.map(({ key, name, ...restField }, idx) => (
                      <div style={{ display: 'flex' }} key={key}>
                        <Form.Item shouldUpdate noStyle>
                          {() => {
                            const success_when = form.getFieldValue(['content_json', 'success_when']);
                            const check_type = success_when[idx]?.check_type;
                            return (
                              <Space>
                                <Form.Item {...restField} name={[name, 'check_type']}>
                                  <Select
                                    style={{ width: '120px' }}
                                    onChange={(e) => {
                                      const data = form.getFieldValue(['content_json', 'success_when']);
                                      data[key] = defaultConfig[category][e].item;
                                      form.setFieldsValue({ content_json: { success_when: data } });
                                    }}
                                  >
                                    {Object.keys(defaultConfig[category]).map((item) => (
                                      <Select.Option value={item} key={item}>
                                        {(category === 'dial:dial_tcp' ||
                                          category === 'dial:dial_udp' ||
                                          category === 'dial:dial_websocket') &&
                                        item === 'body'
                                          ? t('task.response_message')
                                          : t(`task.${item}`)}
                                      </Select.Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                                {check_type === 'header' && (
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'key']}
                                    rules={[{ required: true, message: t('task.empty_required') }]}
                                  >
                                    <Input />
                                  </Form.Item>
                                )}

                                {category === 'dial:dial_icmp' && check_type === 'response_time' && (
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'func']}
                                    rules={[{ required: true, message: t('task.empty_required') }]}
                                  >
                                    <Select>
                                      {defaultConfig[category][check_type].funcOptions.map((item) => (
                                        <Select.Option value={item.value} key={item.value}>
                                          {t(`task.${item.label}`)}
                                        </Select.Option>
                                      ))}
                                    </Select>
                                  </Form.Item>
                                )}

                                {!(
                                  (category === 'dial:dial_http' ||
                                    category === 'dial:dial_websocket' ||
                                    category === 'dial:dial_whois' ||
                                    category === 'dial:dial_udp') &&
                                  (check_type === 'response_time' || check_type === 'expiration_time')
                                ) && (
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'op']}
                                    rules={[{ required: true, message: t('task.empty_required') }]}
                                  >
                                    <Select
                                      style={{
                                        width:
                                          category === 'dial:dial_tcp' && check_type === 'response_time' ? 130 : 85,
                                      }}
                                    >
                                      {defaultConfig[category][check_type].options.map((item) => (
                                        <Select.Option value={item.value} key={item.value}>
                                          {t(`task.${item.label}`)}
                                        </Select.Option>
                                      ))}
                                    </Select>
                                  </Form.Item>
                                )}
                                <Form.Item
                                  {...restField}
                                  name={[name, 'value']}
                                  rules={[
                                    { required: true, message: t('task.empty_required') },
                                    {
                                      validator: async (_, value) => {
                                        const timeout = form.getFieldValue(['content_json', 'timeout']) || 3;
                                        if (
                                          category !== 'dial:dial_icmp' &&
                                          check_type === 'response_time' &&
                                          Number(value) / 1000 >= timeout
                                        ) {
                                          return Promise.reject(
                                            `${t('task.timeout_valid')}${
                                              category === 'dial:dial_tcp'
                                                ? t('task.tcp_request_timeout')
                                                : t('task.request_timeout')
                                            }（${t('task.current')}${timeout}${t('common:time.second')}）`,
                                          );
                                        }
                                        return Promise.resolve();
                                      },
                                    },
                                  ]}
                                >
                                  {check_type === 'response_time' || check_type === 'expiration_time' ? (
                                    <Input addonAfter='ms' />
                                  ) : (
                                    <Input addonAfter={check_type === 'packet_loss_percent' ? '%' : null} />
                                  )}
                                </Form.Item>

                                {fields.length > 1 && perm === 'rw' && (
                                  <Form.Item>
                                    <MinusCircleOutlined className='control-icon-normal' onClick={() => remove(name)} />
                                  </Form.Item>
                                )}
                              </Space>
                            );
                          }}
                        </Form.Item>
                      </div>
                    ))}
                  </div>
                )}
              </Form.List>
            </>
          )
        );
      }}
    </Form.Item>
  );
};
export default SuccessWhen;
