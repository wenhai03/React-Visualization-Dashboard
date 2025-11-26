import React, { useEffect, useState, useContext } from 'react';
import { Form, Button, message, Input, Row, Col, Select, InputNumber, Radio, Tabs, Popconfirm, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import { getAreaConfig, addAreaConfig, deleteAreaConfig } from '@/services/config';
import { CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import _ from 'lodash';

const RegionalConfig: React.FC = () => {
  const { t } = useTranslation('collector');
  const [activeKey, setActiveKey] = useState<string>();
  const { initBoot, setInitBoot } = useContext(CommonStateContext);
  const [areaConfigList, setAreaConfigList] = useState<any>([
    {
      name: 'default',
      area_id: 'default',
      send_type: 'kafka',
    },
  ]);
  const [form] = Form.useForm();

  const handelAreaConfig = () => {
    getAreaConfig({ ckey: 'ms_area' }).then((res) => {
      if (res.dat) {
        setAreaConfigList(res.dat);
        const filterConfig = res.dat.find((item) => item.area_id === activeKey);
        if (filterConfig) {
          form.setFieldsValue(filterConfig);
        } else {
          setActiveKey(res.dat[0].area_id);
          form.setFieldsValue(res.dat[0]);
        }
      } else {
        form.setFieldsValue(areaConfigList[0]);
      }
    });
  };

  useEffect(() => {
    handelAreaConfig();
  }, []);

  return (
    <Tabs
      tabPosition='left'
      type='editable-card'
      className='target-script-regional-config init-boot'
      activeKey={activeKey}
      onEdit={(targetKey: string, action: 'add' | 'remove') => {
        if (action === 'add') {
          // 生成唯一值作为name和area_id的初始值
          const timestamp = Date.now();
          const base36 = timestamp.toString(36);
          const key = base36.replace(/[0-9]/g, (match) => String.fromCharCode(97 + parseInt(match)));
          areaConfigList.filter((item) => item.area_id);
          const data = {
            virtual_id: 0,
            name: key,
            area_id: key,
            basic_auth_user: '',
            basic_auth_pass: '',
            url: '',
            agent: {
              download_url: '',
              image_name: '',
            },
            send_type: 'kafka',
            kafka: {
              user: '',
              password: '',
              mechanism: '',
              url: '',
            },
            ntp: { servers: [], nterval: 60 },
          };
          const newAreaConfigList = [...areaConfigList, data];
          form.setFieldsValue(data);
          setAreaConfigList(newAreaConfigList);
          setActiveKey(key);
        }
      }}
      onChange={(val) => {
        const selectedArea = areaConfigList.find((item) => item.area_id === val);
        form.setFieldsValue(selectedArea);
        setActiveKey(selectedArea.area_id);
      }}
    >
      {areaConfigList.map((areaConfig) => (
        <Tabs.TabPane
          tab={areaConfig.name}
          key={areaConfig.area_id}
          style={{ padding: '10px 24px', height: 'calc(100vh - 153px)', overflow: 'auto' }}
          closeIcon={
            areaConfig.area_id !== 'default' ? (
              areaConfig.virtual_id ? (
                <Popconfirm
                  title={<>{t('common:confirm.delete')}</>}
                  onConfirm={() => {
                    deleteAreaConfig(areaConfig.virtual_id).then((res) => {
                      message.success(t('common:success.delete'));
                      handelAreaConfig();
                    });
                  }}
                >
                  <CloseCircleOutlined />
                </Popconfirm>
              ) : (
                <CloseCircleOutlined
                  onClick={() => {
                    const filterConfig = areaConfigList.filter((item) => item.area_id !== areaConfig.area_id);
                    setAreaConfigList(filterConfig);
                    if (areaConfig.area_id === activeKey) {
                      form.setFieldsValue(areaConfigList[0]);
                      setActiveKey('default');
                    }
                  }}
                />
              )
            ) : (
              <></>
            )
          }
        >
          <Form form={form}>
            <Form.Item name='virtual_id' hidden>
              <div />
            </Form.Item>
            <Row gutter={18}>
              <Col span={12}>
                <Form.Item label={t('common:regional_config_name')} name='name' rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={t('script.regional_config.id')}
                  name='area_id'
                  rules={[
                    { required: true },
                    {
                      validator: (_, value) => {
                        const pattern = /^[a-z][a-z0-9-_]*$/; // 正则表达式，只允许输入小写字母和数字，以字母开头
                        if (value && !pattern.test(value)) {
                          return Promise.reject(t('script.regional_config.area_id_validator_text'));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    disabled={areaConfig.area_id === 'default'}
                    suffix={
                      <Tooltip title={t('script.regional_config.area_id_tip')}>
                        <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
                      </Tooltip>
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row className='target-script-regional-config-title'>{t('script.regional_config.writer_config')}</Row>
            <Form.Item label={t('script.regional_config.base_address')} name='url' rules={[{ required: true }]}>
              <Input
                placeholder={t('script.regional_config.base_address_tip')}
                suffix={
                  <Tooltip title={t('script.regional_config.base_address_tip')}>
                    <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
                  </Tooltip>
                }
              />
            </Form.Item>
            <Row gutter={18}>
              <Col span={12}>
                <Form.Item
                  label={t('script.regional_config.auth_account')}
                  name='basic_auth_user'
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={t('script.regional_config.auth_password')}
                  name='basic_auth_pass'
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row className='target-script-regional-config-title'>{t('script.regional_config.logs_config')}</Row>
            <Form.Item name='send_type' label={t('script.regional_config.send_type')} rules={[{ required: true }]}>
              <Radio.Group>
                <Radio value='kafka'>kafka</Radio>
                <Radio value='http'>http</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.send_type !== curValues.send_type} noStyle>
              {({ getFieldValue }) => {
                const type = getFieldValue('send_type');
                return type === 'kafka' ? (
                  <>
                    <Form.Item
                      label={t('script.regional_config.request_url')}
                      name={['kafka', 'url']}
                      rules={[{ required: true }]}
                    >
                      <Input
                        placeholder='kafka broker列表，多个用逗号隔开，如 192.168.1.1:9092,192.168.1.2:9092'
                        suffix={
                          <Tooltip title='kafka broker列表，多个用逗号隔开，如 192.168.1.1:9092,192.168.1.2:9092'>
                            <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
                          </Tooltip>
                        }
                      />
                    </Form.Item>
                    <Row gutter={18}>
                      <Col span={8}>
                        <Form.Item
                          label={t('script.regional_config.username')}
                          name={['kafka', 'user']}
                          rules={[{ required: true }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          label={t('script.regional_config.password')}
                          name={['kafka', 'password']}
                          rules={[{ required: true }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          label={t('script.regional_config.mechanism')}
                          name={['kafka', 'mechanism']}
                          rules={[{ required: true }]}
                        >
                          <Select>
                            {['PLAIN', 'SCRAM-SHA-256', 'SCRAM-SHA-512'].map((item) => (
                              <Select.Option value={item} key={item}>
                                {item}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ) : (
                  <>
                    <Form.Item
                      label={t('script.regional_config.request_url')}
                      name={['logs_http', 'url']}
                      rules={[{ required: true }]}
                    >
                      <Input
                        placeholder='只填写 http 基础地址，如 http://localhost:9090'
                        suffix={
                          <Tooltip title='只填写 http 基础地址，如 http://localhost:9090'>
                            <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
                          </Tooltip>
                        }
                      />
                    </Form.Item>
                    <Row gutter={18}>
                      <Col span={8}>
                        <Form.Item
                          label={t('script.regional_config.username')}
                          name={['logs_http', 'user']}
                          rules={[{ required: true }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          label={t('script.regional_config.password')}
                          name={['logs_http', 'password']}
                          rules={[{ required: true }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                );
              }}
            </Form.Item>
            <Row className='target-script-regional-config-title'>{t('script.regional_config.agent_config')}</Row>
            <Row gutter={18}>
              <Col span={12}>
                <Form.Item
                  label={t('script.agent.download_address')}
                  name={['agent', 'download_url']}
                  rules={[{ required: true }]}
                >
                  <Input
                    suffix={
                      <Tooltip title='例如 http://jfgf-oss-gyl-tyjk-sc.oss-cn-xm-jfcloud-d01-a.ops.jfcloud.chinacdc.com/cndgraf/cndgraf-{{.Version}}-{{.Os}}-{{.Arch}}{{.Suffix}}'>
                        <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
                      </Tooltip>
                    }
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={t('script.agent.agent_image_name')}
                  name={['agent', 'image_name']}
                  rules={[{ required: true }]}
                >
                  <Input
                    suffix={
                      <Tooltip title='例如 harbor.devops.cndinfo.com/elk/cndgraf:{{.Version}}'>
                        <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
                      </Tooltip>
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row className='target-script-regional-config-title'>{t('script.regional_config.ntp_config')}</Row>
            <Row gutter={18}>
              <Col span={12}>
                <Form.Item
                  label={t('script.regional_config.servers')}
                  name={['ntp', 'servers']}
                  rules={[{ required: true }]}
                >
                  <Select mode='tags' open={false} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={t('script.regional_config.interval')}
                  name={['ntp', 'interval']}
                  rules={[{ required: true }]}
                >
                  <InputNumber style={{ width: '100%' }} min={15} addonAfter='秒' />
                </Form.Item>
              </Col>
            </Row>
            <Button
              type='primary'
              onClick={() => {
                form.validateFields().then((values) => {
                  addAreaConfig(values).then((res) => {
                    if (res.success) {
                      // 更新需要引导配置项
                      const newInitBoot = _.cloneDeep(initBoot);
                      delete newInitBoot.ms_area;
                      setInitBoot(newInitBoot);
                      handelAreaConfig();
                      message.success(t('common:success.save'));
                    }
                  });
                });
              }}
            >
              {t('common:btn.save')}
            </Button>
          </Form>
        </Tabs.TabPane>
      ))}
    </Tabs>
  );
};

export default RegionalConfig;
