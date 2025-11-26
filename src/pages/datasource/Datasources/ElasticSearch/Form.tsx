import React, { useRef } from 'react';
import { Form, Select, InputNumber, Tooltip, Row, Col } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import AdvancedWrap from '@/components/AdvancedWrap';
import Name from '../../components/items/Name';
import HTTP from '../../components/items/HTTP';
import BasicAuth from '../../components/items/BasicAuth';
import SkipTLSVerify from '../../components/items/SkipTLSVerify';
import Headers from '../../components/items/Headers';
import Description from '../../components/items/Description';
import Footer from '../../components/items/Footer';
import Cluster from '../../components/items/Cluster';

export default function FormCpt({ data, onFinish, submitLoading }: any) {
  const { t } = useTranslation('datasourceManage');
  const [form] = Form.useForm();
  const clusterRef = useRef<any>();

  return (
    <Form
      form={form}
      layout='vertical'
      onFinish={(values) => {
        onFinish(values, clusterRef.current);
      }}
      initialValues={data}
      className='settings-source-form'
    >
      <Name />
      <HTTP />
      <BasicAuth />
      <SkipTLSVerify />
      <Headers />
      <div className='page-title' style={{ marginTop: 0 }}>
        {t('form.other')}
      </div>
      <Row gutter={8}>
        <Col span={6}>
          <Form.Item label={t('form.es.version')} name={['settings', 'version']} rules={[]} initialValue='8.0+'>
            <Select
              options={[
                { label: '7.0+', value: '7.0+' },
                { label: '8.0+', value: '8.0+' },
              ]}
            ></Select>
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label={t('form.es.mode')} name={['settings', 'mode']} rules={[]} initialValue={0}>
            <Select
              options={[
                { label: t('form.es.public'), value: 0 },
                { label: t('form.es.privately'), value: 1 },
              ]}
            ></Select>
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            label={t('form.es.max_shard')}
            name={['settings', 'max_shard']}
            rules={[{ type: 'number', min: 0 }]}
            initialValue={5}
          >
            <InputNumber style={{ width: '100%' }} controls={false} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            label={
              <>
                <span>{t('form.es.min_interval')}</span>
                <Tooltip title={t('form.es.min_interval_tip')}>
                  <InfoCircleOutlined className='ml8' />
                </Tooltip>
              </>
            }
            name={['settings', 'min_interval']}
            rules={[{ type: 'number', min: 0 }]}
            initialValue={10}
          >
            <InputNumber style={{ width: '100%' }} controls={false} />
          </Form.Item>
        </Col>
      </Row>
      <Cluster form={form} clusterRef={clusterRef} />
      <Description />
      <div className='mt16'>
        <Footer id={data?.id} submitLoading={submitLoading} />
      </div>
    </Form>
  );
}
