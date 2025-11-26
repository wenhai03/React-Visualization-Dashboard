import React, { useEffect, useState, useContext } from 'react';
import { Form, Space, Button, InputNumber, message, Input, Select, Row, Col, Spin } from 'antd';
import { CommonStateContext } from '@/App';
import querystring from 'query-string';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { updateApmAgentConfig, getApmFormConfig, getApmAgentConfig, getServiceNameList } from '@/services/traces';
import { getLabelValues } from '@/services/dashboardV2';
import './index.less';
import '@/pages/dial/index.less';

interface ITaskFormProps {
  initialValues?: any;
  mode: 'add' | 'edit';
}

const DynamicForm = ({ data, t }) => {
  return (
    <Row gutter={24}>
      <Col span={10} style={{ marginBottom: '18px' }}>
        <div className='apm-setting-form-title'>{data.label}</div>
        <div>{data.description}</div>
        <div className='apm-setting-form-default'>Default: {data.default_value}</div>
      </Col>
      <Col span={12}>
        {data.type === 'select' || data.type === 'boolean' ? (
          <Form.Item name={['settings', data.category, 'value']} label={data.category}>
            <Select placeholder={data.placeholder} style={{ width: '400px' }}>
              {data.units.map((unit) => (
                <Select.Option key={unit} value={unit}>
                  {unit}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ) : data.type === 'text' ? (
          <Form.Item name={['settings', data.category, 'value']} label={data.category}>
            <Input placeholder={data.placeholder} />
          </Form.Item>
        ) : data.type === 'float' || data.type === 'integer' ? (
          <Space>
            <Form.Item name={['settings', data.category, 'value']} label={data.category}>
              <InputNumber
                style={{ width: data.units.length ? '242px' : '400px' }}
                placeholder={data.placeholder}
                max={data.max === undefined ? Number.MAX_SAFE_INTEGER : data.max}
                min={data.min === undefined ? Number.MIN_SAFE_INTEGER : data.min}
              />
            </Form.Item>
            {data.units.length ? (
              <Form.Item name={['settings', data.category, 'unit']} label={t('form.units')}>
                <Select style={{ width: '150px' }}>
                  {data.units.map((item) => (
                    <Select.Option key={item} value={item}>
                      {item}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            ) : null}
          </Space>
        ) : null}
      </Col>
    </Row>
  );
};

const ApmSettingForm: React.FC<ITaskFormProps> = (props) => {
  const { initialValues, mode } = props;
  const { curBusiId, curBusiGroup } = useContext(CommonStateContext);
  const history = useHistory();
  const { search } = useLocation();
  const { data_id } = querystring.parse(search);
  const { t } = useTranslation('traces');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [apmFormList, setApmFormList] = useState([]);
  const [agentName, setAgentName] = useState();
  const [serviceNames, setServiceNames] = useState<{ label: string; value: string }[]>([
    { label: t('all'), value: 'all' },
  ]);
  const [serviceEnvironments, setServiceEnvironments] = useState<
    { label: string; value: string; alreadyConfigured: boolean }[]
  >([{ label: t('all'), value: 'all', alreadyConfigured: false }]);
  const [isNext, setIsNext] = useState(false);

  // 获取动态表单
  const handleApmFormList = (agent_name) => {
    const agentName = agent_name || '';
    setAgentName(agentName);
    getApmFormConfig({ include_agents: agentName === '' ? 'all' : agentName, limit: 1000 }).then((res) => {
      setApmFormList(res.dat.list);
    });
  };

  useEffect(() => {
    if (initialValues) {
      let settings = {};
      Object.entries(initialValues.settings ?? {}).forEach(([key, data]: [string, string]) => {
        const match = data.match(/\d+|\D+/g);
        settings[key] = {};
        settings[key].value = match?.[0];
        match?.[1] && (settings[key].unit = match[1]);
      });
      let service = { ...initialValues.service };
      service.name = !service.name || service.name === '' ? 'all' : service.name;
      service.environment = !service.environment || service.environment === '' ? 'all' : service.environment;
      form.setFieldsValue({ ...initialValues, settings, service });
      handleApmFormList(initialValues.agent_name);
    }
  }, [initialValues]);

  useEffect(() => {
    if (mode === 'add' && data_id && curBusiId) {
      getServiceNameList({ datasource_id: Number(data_id), group_id: curBusiId }).then((res) => {
        const data = res.dat.map((item) => ({
          label: item === '' ? t('all') : item,
          value: item === '' ? 'all' : item,
        }));
        setServiceNames(data);
      });
    }
  }, [mode, data_id, curBusiId]);

  // 修改服务名称，重新渲染服务环境列表
  const changeServiceName = (e) => {
    const serviceName = e === 'all' ? '' : e;
    form.setFieldsValue({ service: { environment: undefined } });
    Promise.all([
      getApmAgentConfig({ datasource_id: data_id, group_id: curBusiId }),
      getLabelValues(
        'service_environment',
        { 'match[]': `{job="apm", service_name="${serviceName}"}` },
        Number(data_id),
        curBusiId,
      ),
    ]).then(([list, environments]) => {
      const alreadyConfiguredEnv = list.dat.map((item) => {
        if (item.service.name === serviceName) {
          return item.service.environment || 'all';
        }
      });
      const newEnvironments = environments.data.map((item) => ({
        label: item,
        value: item,
        alreadyConfigured: alreadyConfiguredEnv.includes(item),
      }));
      setServiceEnvironments([
        { label: t('all'), value: 'all', alreadyConfigured: alreadyConfiguredEnv.includes('all') },
        ...newEnvironments,
      ]);
    });
  };

  const handleNext = () => {
    const service_name = form.getFieldValue(['service', 'name']);
    getLabelValues(
      'agent_name',
      { 'match[]': `{job="apm", service_name="${service_name}"}` },
      Number(data_id),
      curBusiId,
    ).then((res) => {
      setIsNext(true);
      handleApmFormList(res.data[0]);
      form.setFieldsValue({ agent_name: res.data[0] });
    });
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      setLoading(true);
      const settings = {};
      const service = values.service;
      service.name === 'all' && (service.name = '');
      service.environment === 'all' && (service.environment = '');
      Object.entries(values.settings).forEach(([key, data]: [string, { value: string; unit?: string }]) => {
        if (data.value) {
          const value = data.value.toString();
          settings[key] = data.unit ? value + data.unit : value;
        }
      });
      updateApmAgentConfig({ ...values, settings, service, agent_name: agentName })
        .then(() => {
          setLoading(false);
          message.success(t('common:success.save'));
          history.push('/traces-setting');
        })
        .catch((err) => setLoading(false));
    });
  };

  return (
    <div>
      <div className='dial-task-form-wrapper'>
        <Spin spinning={loading}>
          <Form form={form} layout='vertical' disabled={curBusiGroup.perm === 'ro'}>
            <Row gutter={24}>
              <Col span={10}>
                <div className='apm-setting-form-title'>{t('serviceName')}</div>
                <div>{t('setting.service_name_des')}</div>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['service', 'name']}
                  label={t('service_name')}
                  rules={[
                    {
                      required: true,
                    },
                  ]}
                >
                  <Select
                    disabled={mode === 'edit' || isNext}
                    style={{ width: '400px' }}
                    onChange={changeServiceName}
                    showSearch
                  >
                    {serviceNames.map((item) => (
                      <Select.Option key={item.value} value={item.value}>
                        {item.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col span={10}>
                <div className='apm-setting-form-title'>{t('environment')}</div>
                <div>{t('setting.service_env_des')}</div>
              </Col>
              <Col span={12}>
                <Form.Item shouldUpdate noStyle>
                  {({ getFieldValue }) => {
                    const name = getFieldValue(['service', 'name']);
                    return (
                      <Form.Item
                        name={['service', 'environment']}
                        label={t('service_environment')}
                        rules={[
                          {
                            required: true,
                          },
                        ]}
                      >
                        <Select disabled={!name || mode === 'edit' || isNext} style={{ width: '400px' }}>
                          {serviceEnvironments.map((item) => (
                            <Select.Option key={item.value} value={item.value} disabled={item.alreadyConfigured}>
                              {item.label} {item.alreadyConfigured && '(已配置)'}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </Col>
            </Row>
            {apmFormList?.map((item, index) => (
              <DynamicForm key={index} data={item} t={t} />
            ))}
            <Form.Item shouldUpdate noStyle>
              {({ getFieldValue }) => {
                const name = getFieldValue(['service', 'name']);
                const environment = getFieldValue(['service', 'environment']);
                return curBusiGroup.perm === 'rw' ? (
                  <Form.Item>
                    <Space>
                      {mode === 'edit' || isNext ? (
                        <Button type='primary' onClick={handleSubmit}>
                          {t('common:btn.save')}
                        </Button>
                      ) : (
                        <Button type='primary' onClick={handleNext} disabled={!name || !environment}>
                          {t('next')}
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          history.push('/traces-setting');
                        }}
                      >
                        {t('common:btn.cancel')}
                      </Button>
                    </Space>
                  </Form.Item>
                ) : null;
              }}
            </Form.Item>
          </Form>
        </Spin>
      </div>
    </div>
  );
};

export default ApmSettingForm;
