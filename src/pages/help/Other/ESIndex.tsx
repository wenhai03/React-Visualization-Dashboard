import React, { useEffect, useContext, useState } from 'react';
import _ from 'lodash';
import { Form, Input, Button, message, Row, Col, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import { setElasticIndex } from '@/services/config';
import { getDatasourceList } from '@/services/common';

export default function Container() {
  const { ESIndex, setESIndex } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const { t } = useTranslation('other');
  const [datasourceList, setDatasourceList] = useState<{ name: string; id: string }[]>([]);

  useEffect(() => {
    getDatasourceList(['elasticsearch'])
      .then((res) => {
        const formattedData = res.map(item => ({
          ...item,
          id: item.id.toString() // 显式转换数字为字符串
        }));

        setDatasourceList(formattedData);
      })
      .catch(() => {
        setDatasourceList([]);
      });

    form.setFieldsValue(ESIndex);
  }, [ESIndex]);

  return (
    <div>
      <Form form={form} layout='vertical'>
        <Row gutter={24} wrap>
          <Col span={10}>
            <strong style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>{t('es_index.base_index_title')}</strong>
          </Col>
        </Row>
        
        <Row gutter={24} wrap>
          <Col span={10}>
            <Form.Item
              label={t('es_index.app')}
              name='elastic_app_log_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label={t('es_index.apm_map_index')}
              name='elastic_apm_map_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label={t('es_index.host')}
              name='elastic_journald_log_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label={t('es_index.apm_error_index')}
              name='elastic_apm_error_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label={t('es_index.pod')}
              name='elastic_pod_log_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label={t('es_index.apm_load_index')}
              name='elastic_apm_load_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>

          <Col span={10}>
            <Form.Item
              label={t('es_index.container')}
              name='elastic_container_log_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label={t('es_index.apm_span_index')}
              name='elastic_apm_span_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          {/* <Col span={10}>
            <Form.Item
              label={t('es_index.syslog')}
              name='elastic_sys_log_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col> */}
          <Col span={10}>
            <Form.Item
              label={t('es_index.apm_trace_index')}
              name='elastic_apm_trace_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label={t('es_index.dial')}
              name='elastic_dial_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label={t('es_index.apm_metrics_index')}
              name='elastic_apm_metrics_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label={t('es_index.home_log_index')}
              name='home_logs_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label={t('es_index.elastic_graf_log_index')}
              name='elastic_graf_log_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label={t('es_index.elastic_k8s_event_index')}
              name='elastic_k8s_event_index'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          
        </Row>
        
        <Row gutter={24} wrap>
          <Col span={10}>
            <strong style={{ display: 'block', marginBottom: 16, fontSize: 14 }}>{t('es_index.network_index_title')}</strong>
          </Col>
        </Row>

        <Row gutter={24} wrap>
          <Col span={10}>
            <Form.Item
              label={t('es_index.network_log_datasource')}
              name='network_log_datasource'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Select
                // mode={mode}
                // onChange={handleClusterChange}
                // maxTagCount='responsive'
                // showSearch
                // optionFilterProp='children'
              >
                {datasourceList?.map((item) => (
                  <Select.Option value={item.id} key={item.id}>
                    {item.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24} wrap>
          <Col span={10}>
            <Form.Item label={t('es_index.elastic_network_auth_index')} name='elastic_network_auth_index'>
              <Input />
            </Form.Item>
          </Col>

          <Col span={10}>
            <Form.Item label={t('es_index.elastic_sang_for_log_index')} name='elastic_sang_for_log_index'>
              <Input />
            </Form.Item>
          </Col>

          <Col span={10}>
            <Form.Item label={t('es_index.elastic_360_log_index')} name='elastic_360_log_index'>
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <div>
          <Button
            type='primary'
            onClick={() => {
              form.validateFields().then((values) => {
                setElasticIndex(values).then((res) => {
                  setESIndex(res.dat);
                  message.success(t('common:success.save'));
                });
              });
            }}
          >
            {t('common:btn.save')}
          </Button>
        </div>
      </Form>
    </div>
  );
}
