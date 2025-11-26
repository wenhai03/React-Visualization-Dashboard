import React, { useState } from 'react';
import { Form, Input, Select, Checkbox, InputNumber, Tabs, Space, Alert } from 'antd';
import { RightOutlined, DownOutlined, MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const RequestHeader: React.FC<{ perm: 'ro' | 'rw' }> = ({ perm }) => {
  const { t } = useTranslation('dial');
  return (
    <Form.List name={['content_json', 'headers_list']}>
      {(fields, { add, remove }) => (
        <>
          <div className='request-set-header'>
            {t('task.request_header')} {perm === 'rw' && <PlusCircleOutlined onClick={() => add()} />}
          </div>
          {fields.map(({ key, name, ...restField }) => (
            <div key={key}>
              <Space align='baseline'>
                <Form.Item {...restField} name={[name, 'key']}>
                  <Input style={{ width: '140px' }} />
                </Form.Item>
                <Form.Item {...restField} name={[name, 'value']}>
                  <Input />
                </Form.Item>
                {perm === 'rw' && <MinusCircleOutlined onClick={() => remove(name)} />}
              </Space>
            </div>
          ))}
        </>
      )}
    </Form.List>
  );
};

const RequestFormat = ({ form, perm, isExtend }) => {
  const { t } = useTranslation('dial');
  const [advanced, setAdvanced] = useState(false);

  return (
    <Form.Item shouldUpdate noStyle>
      {() => {
        const category = form.getFieldValue('category');
        return (
          <div>
            <div className='module-title'>{t('task.request_format')}</div>
            <Form.Item
              label={
                category === 'dial:dial_http' || category === 'dial:dial_websocket'
                  ? 'URL'
                  : category === 'dial:dial_whois'
                  ? 'Domain'
                  : 'Host'
              }
              name={['content_json', 'url']}
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input
                addonBefore={
                  category === 'dial:dial_http' ? (
                    <Form.Item
                      noStyle
                      name={['content_json', 'method']}
                      rules={[
                        {
                          required: true,
                        },
                      ]}
                    >
                      <Select className='select-before' style={{ width: '72px' }}>
                        <Select.Option value='GET'>GET</Select.Option>
                        <Select.Option value='POST'>POST</Select.Option>
                        <Select.Option value='PUT'>PUT</Select.Option>
                        <Select.Option value='HEAD'>HEAD</Select.Option>
                      </Select>
                    </Form.Item>
                  ) : null
                }
              />
            </Form.Item>
            {(category === 'dial:dial_tcp' || category === 'dial:dial_udp') && (
              <Form.Item
                label='Port'
                name={['content_json', 'port']}
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Input />
              </Form.Item>
            )}
            {(category === 'dial:dial_websocket' || category === 'dial:dial_udp') && (
              <Form.Item
                label={t('task.request_content')}
                name={['content_json', 'body']}
                rules={[
                  {
                    required: true,
                  },
                ]}
                tooltip={t('task.body_content_tip')}
              >
                <Input.TextArea />
              </Form.Item>
            )}
            {category === 'dial:dial_http' && (
              <Alert
                message={t('task.request_format_tip')}
                type='info'
                style={{ marginBottom: '12px', width: '500px' }}
              />
            )}
            {category !== 'dial:dial_icmp' && category !== 'dial:dial_whois' && (
              <div className='advanced-set'>
                <a onClick={() => setAdvanced(!advanced)}>
                  {t('task.advanced_set')} {advanced ? <DownOutlined /> : <RightOutlined />}
                </a>
                {(advanced || isExtend) && (
                  <Tabs className='advanced-set-wrapper'>
                    {category === 'dial:dial_http' && (
                      <>
                        <Tabs.TabPane tab={t('task.request_set')} key='request_set'>
                          <Form.Item
                            name={['content_json', 'timeout']}
                            label={t('task.request_timeout')}
                            tooltip={t('task.request_timeout_tip')}
                          >
                            <InputNumber min={1} style={{ width: '150px' }} addonAfter='s' />
                          </Form.Item>
                          <Form.Item name={['content_json', 'follow_redirects']} valuePropName='checked'>
                            <Checkbox disabled={perm === 'ro'}>{t('task.follow_redirects')}</Checkbox>
                          </Form.Item>
                          <Form.Item name={['content_json', 'insecure_skip_verify']} valuePropName='checked'>
                            <Checkbox disabled={perm === 'ro'}>{t('task.ignore_certificate_error')}</Checkbox>
                          </Form.Item>
                          <RequestHeader perm={perm} />
                          <Form.Item label='HTTP auth'>
                            <Space>
                              <Form.Item name={['content_json', 'username']}>
                                <Input style={{ width: '140px' }} placeholder={t('common:profile.username')} />
                              </Form.Item>
                              <Form.Item name={['content_json', 'password']}>
                                <Input placeholder={t('common:password.name')} />
                              </Form.Item>
                            </Space>
                          </Form.Item>
                        </Tabs.TabPane>
                        <Tabs.TabPane tab={t('task.request_body')} key='request_body'>
                          <Form.Item
                            name={['content_json', 'body']}
                            label={t('task.body_content')}
                            tooltip={t('task.body_content_tip')}
                          >
                            <Input.TextArea />
                          </Form.Item>
                        </Tabs.TabPane>
                        <Tabs.TabPane tab={t('task.agency')} key='agency'>
                          <Form.Item name={['content_json', 'http_proxy']} label={t('task.certificate')}>
                            <Input placeholder='http://host:ip' />
                          </Form.Item>
                        </Tabs.TabPane>
                      </>
                    )}
                    {(category === 'dial:dial_tcp' || category === 'dial:dial_udp') && (
                      <Tabs.TabPane tab={t('task.request_set')} key='request_set'>
                        <Form.Item
                          name={['content_json', 'timeout']}
                          label={
                            category === 'dial:dial_tcp' ? t('task.tcp_request_timeout') : t('task.request_timeout')
                          }
                          tooltip={
                            category === 'dial:dial_tcp'
                              ? t('task.tcp_request_timeout_tip')
                              : t('task.request_timeout_tip')
                          }
                        >
                          <InputNumber min={1} style={{ width: '150px' }} addonAfter='s' />
                        </Form.Item>
                      </Tabs.TabPane>
                    )}
                    {category === 'dial:dial_tcp' && (
                      <Tabs.TabPane tab={t('task.request_body')} key='request_body'>
                        <Form.Item
                          name={['content_json', 'body']}
                          label={t('task.request_content')}
                          tooltip={t('task.body_content_tip')}
                        >
                          <Input.TextArea />
                        </Form.Item>
                      </Tabs.TabPane>
                    )}
                    {category === 'dial:dial_websocket' && (
                      <>
                        <Tabs.TabPane tab={t('task.request_set')} key='request_set'>
                          <Form.Item
                            name={['content_json', 'timeout']}
                            label={t('task.request_timeout')}
                            tooltip={t('task.request_timeout_tip')}
                          >
                            <InputNumber min={1} style={{ width: '150px' }} addonAfter='s' />
                          </Form.Item>
                          <RequestHeader perm={perm} />
                        </Tabs.TabPane>
                        <Tabs.TabPane tab={t('task.identity')} key='identity'>
                          <Form.Item label={t('common:profile.username')} name={['content_json', 'username']}>
                            <Input />
                          </Form.Item>
                          <Form.Item label={t('common:password.name')} name={['content_json', 'password']}>
                            <Input />
                          </Form.Item>
                        </Tabs.TabPane>
                      </>
                    )}
                    <Tabs.TabPane tab={t('task.privacy')} key='privacy'>
                      <Form.Item name={['content_json', 'fail_save']} valuePropName='checked'>
                        <Checkbox disabled={perm === 'ro'}>{t('task.fail_save')}</Checkbox>
                      </Form.Item>
                      <Form.Item name={['content_json', 'success_save']} valuePropName='checked'>
                        <Checkbox disabled={perm === 'ro'}>{t('task.success_save')}</Checkbox>
                      </Form.Item>
                    </Tabs.TabPane>
                    <Tabs.TabPane tab={t('task.pre_post_script')} key='pre_post_script'>
                      <Alert
                        type='warning'
                        message={t('task.script_notice')}
                        showIcon
                        style={{ marginBottom: '10px' }}
                      />
                      <Form.Item
                        name={['content_json', 'pre_script']}
                        label={t('task.pre_script')}
                        tooltip={{
                          overlayInnerStyle: { width: 580 },
                          title: <pre style={{ whiteSpace: 'pre-wrap' }}>{t('task.pre_script_tip')}</pre>,
                        }}
                        rules={[
                          {
                            validator: (_, value) =>
                              /^(\/opt\/monscripts|[cC]:\\monscripts\\)(?:(?!\.\.).)*$/.test(value) || !value
                                ? Promise.resolve()
                                : Promise.reject(new Error(t('task.script_error_tip'))),
                          },
                        ]}
                      >
                        <Input style={{ width: '600px' }} />
                      </Form.Item>
                      <Form.Item
                        name={['content_json', 'post_script']}
                        label={t('task.post_script')}
                        tooltip={{
                          overlayInnerStyle: { width: 580 },
                          title: <pre style={{ whiteSpace: 'pre-wrap' }}>{t('task.post_script_tip')}</pre>,
                        }}
                        rules={[
                          {
                            validator: (_, value) =>
                              /^(\/opt\/monscripts|[cC]:\\monscripts\\)(?:(?!\.\.).)*$/.test(value) || !value
                                ? Promise.resolve()
                                : Promise.reject(new Error(t('task.script_error_tip'))),
                          },
                        ]}
                      >
                        <Input style={{ width: '600px' }} />
                      </Form.Item>
                      <Form.Item name={['content_json', 'script_timeout']} label={t('task.script_timeout')}>
                        <InputNumber min={1} style={{ width: '150px' }} addonAfter='s' />
                      </Form.Item>
                    </Tabs.TabPane>
                  </Tabs>
                )}
              </div>
            )}

            {(category === 'dial:dial_tcp' || category === 'dial:dial_icmp' || category === 'dial:dial_udp') && (
              <Form.Item name={['content_json', 'enable_traceroute']} valuePropName='checked'>
                <Checkbox disabled={perm === 'ro'}>{t('task.route_tracing')}</Checkbox>
              </Form.Item>
            )}
            {category === 'dial:dial_icmp' && (
              <Space style={{ marginBottom: '10px' }}>
                {t('task.send_ping_start')}
                <Form.Item
                  name={['content_json', 'packet_count']}
                  rules={[
                    {
                      required: true,
                    },
                  ]}
                  noStyle
                >
                  <InputNumber min={1} max={10} />
                </Form.Item>
                {t('task.send_ping_end')}
              </Space>
            )}
          </div>
        );
      }}
    </Form.Item>
  );
};

export default RequestFormat;
