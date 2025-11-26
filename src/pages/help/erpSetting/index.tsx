import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import PageLayout from '@/components/pageLayout';
import { Select, Space, Form, Button, message, InputNumber, Spin, Row, Col } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getUserInfoList } from '@/services/manage';
import { getLogErpConfig, setLogErpConfig } from '@/services/erp';
import { getTeamInfoList } from '@/services/manage';
import './locale';
import './index.less';

export default function OperateAudit() {
  const { t } = useTranslation('erpSetting');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [teamList, setTeamList] = useState([]);
  const [users, setUsers] = useState([]);

  // 保存
  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        setLogErpConfig(values).then((res) => {
          message.success(t('common:success.modify'));
        });
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  useEffect(() => {
    setLoading(true);
    // 获取团队列表
    getTeamInfoList().then((data) => {
      setTeamList(data.dat || []);
    });
    // 获取配置
    getLogErpConfig()
      .then((res) => {
        form.setFieldsValue({
          ...res.dat,
          user_tags: res.dat.user_tags ?? [{ users: [], tags: [] }],
          query_day: res.dat.query_day ?? [{ ids: [] }],
        });
        setLoading(false);
      })
      .catch((err) => setLoading(false));
    // 获取用户列表
    getUserInfoList({
      limit: -1,
    }).then((res) => {
      setUsers(res.dat.list);
    });
  }, []);

  return (
    <PageLayout title={t('title')}>
      <div>
        <div className='erp-setting-wrapper'>
          <Spin spinning={loading}>
            <Form form={form} onFinish={handleOk} autoComplete='off' layout='vertical'>
              {/* 服务日志 */}
              <div className='group-title'>{t('java_log')}</div>
              <Row gutter={18}>
                <Col span={12}>
                  <Form.Item name='host_ip' label={t('host_ip')} tooltip={t('host_ip_tip')}>
                    <Select mode='tags' open={false} allowClear />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name='host_port' label={t('host_port')} tooltip={t('host_port_tip')}>
                    <Select mode='tags' open={false} allowClear />
                  </Form.Item>
                </Col>
              </Row>
              {/* nginx日志 */}
              <div className='group-title'>{t('nginx_log')}</div>
              <Row gutter={18}>
                <Col span={24}>
                  <Form.Item name='req_host' label={t('req_host')}>
                    <Select mode='tags' open={false} allowClear />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name='upstream_host_ip' label={t('host_ip')} tooltip={t('host_ip_tip')}>
                    <Select mode='tags' open={false} allowClear />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name='upstream_host_port' label={t('host_port')} tooltip={t('host_port_tip')}>
                    <Select mode='tags' open={false} allowClear />
                  </Form.Item>
                </Col>
              </Row>
              <Form.List name='query_day'>
                {(fields, { add, remove }) => (
                  <>
                    <Space className='group-title'>
                      {t('search_range')} <PlusCircleOutlined onClick={() => add({ ids: [] })} />
                    </Space>
                    {fields.map(({ key, name }) => {
                      const query_day = form.getFieldValue('query_day') || [];
                      // 当前下拉框已选的值
                      const currentIds = query_day[name]?.ids;
                      // 排除当前下拉框已选的值
                      const ids = query_day
                        .reduce((result: any, ele) => {
                          return (result = result.concat(ele.ids));
                        }, [])
                        .filter((ele) => !currentIds.includes(ele));
                      return (
                        <Row key={key} gutter={8}>
                          <Col flex='auto'>
                            <Form.Item name={[name, 'ids']} label={t('team')}>
                              <Select
                                mode='multiple'
                                showSearch
                                optionFilterProp='children'
                                allowClear
                                maxTagCount='responsive'
                              >
                                {teamList.map((item: any) => (
                                  <Select.Option
                                    disabled={ids.includes(item.id)}
                                    value={item.id}
                                    key={item.id}
                                    showSearch
                                  >
                                    {item.name}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col flex='200px'>
                            <Form.Item
                              name={[name, 'day']}
                              label={t('num_date')}
                              tooltip={t('num_data_tooltip')}
                              rules={[
                                {
                                  validator: async (_, value) => {
                                    const query_day = form.getFieldValue('query_day');
                                    const day_list = query_day.map((item) => item.day);
                                    const otherValues = (day_list || []).filter((_, index) => index !== name);

                                    if (value && otherValues.includes(value)) {
                                      return Promise.reject(t('day_tip'));
                                    }
                                    return Promise.resolve();
                                  },
                                },
                              ]}
                            >
                              <InputNumber min={1} style={{ width: '200px' }} />
                            </Form.Item>
                          </Col>
                          {fields.length > 1 && (
                            <Col span={1} style={{ margin: 'auto' }}>
                              <MinusCircleOutlined onClick={() => remove(name)} style={{ marginTop: '18px' }} />
                            </Col>
                          )}
                        </Row>
                      );
                    })}
                  </>
                )}
              </Form.List>
              <Form.List name='user_tags'>
                {(fields, { add, remove }) => (
                  <>
                    <Space className='group-title'>
                      {t('user_tags')} <PlusCircleOutlined onClick={() => add({ users: [], tags: [] })} />
                    </Space>
                    {fields.map(({ key, name }) => {
                      return (
                        <Row key={key} gutter={8}>
                          <Col span={11}>
                            <Form.Item name={[name, 'users']} label={t('users')}>
                              <Select
                                mode='multiple'
                                showSearch
                                optionFilterProp='children'
                                allowClear
                                maxTagCount='responsive'
                              >
                                {users.map((item: any) => (
                                  <Select.Option value={item.id} key={item.id} showSearch>
                                    {item.nickname}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name={[name, 'tags']}
                              label={t('tag')}
                              tooltip={{
                                title: <pre style={{ margin: 0 }}>{t('tag_tip')}</pre>,
                                overlayInnerStyle: { width: '370px' },
                              }}
                            >
                              <Select mode='tags' allowClear tokenSeparators={[' ']} maxTagCount='responsive' />
                            </Form.Item>
                          </Col>
                          {fields.length > 1 && (
                            <Col span={1} style={{ margin: 'auto' }}>
                              <MinusCircleOutlined onClick={() => remove(name)} style={{ marginTop: '18px' }} />
                            </Col>
                          )}
                        </Row>
                      );
                    })}
                  </>
                )}
              </Form.List>
              <Form.Item>
                <Button type='primary' htmlType='submit'>
                  {t('common:btn.save')}
                </Button>
              </Form.Item>
            </Form>
          </Spin>
        </div>
      </div>
    </PageLayout>
  );
}
