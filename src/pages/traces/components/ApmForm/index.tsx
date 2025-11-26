import React, { useEffect } from 'react';
import { Form, Space, Button, InputNumber, message, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { createApmFormConfig, updateApmFormConfig } from '@/services/traces';
import { includeAgents } from '../../form';

interface ITaskFormProps {
  initialValues?: any;
}

const ApmForm: React.FC<ITaskFormProps> = (props) => {
  const { initialValues } = props;
  const history = useHistory();
  const { t } = useTranslation('traces');
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [initialValues]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (initialValues) {
        // 编辑
        updateApmFormConfig(values).then(() => {
          message.success(t('common:success.save'));
          history.push('/traces-form');
        });
      } else {
        // 新增
        createApmFormConfig(values).then(() => {
          message.success(t('common:success.save'));
          history.push('/traces-form');
        });
      }
    });
  };

  return (
    <div>
      <div style={{ padding: '10px' }}>
        <Form form={form} layout='vertical'>
          <Form.Item name='id' hidden>
            <div />
          </Form.Item>
          <Form.Item
            name='category'
            label={t('form.category')}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name='label'
            label={t('form.label')}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name='default_value'
            label={t('form.default_value')}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name='include_agents'
            label={t('form.include_agents')}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select mode='multiple' showSearch optionFilterProp='children' style={{ width: '400px' }}>
              {includeAgents.map((item) => (
                <Select.Option value={item} key={item}>
                  {item}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label={t('form.type')}
            name='type'
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select style={{ width: '400px' }}>
              <Select.Option key='select' value='select'>
                select
              </Select.Option>
              <Select.Option key='text' value='text'>
                text
              </Select.Option>
              <Select.Option key='boolean' value='boolean'>
                boolean
              </Select.Option>
              <Select.Option key='float' value='float'>
                float
              </Select.Option>
              <Select.Option key='integer' value='integer'>
                integer
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name='description'
            label={t('form.description')}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input.TextArea style={{ height: '250px' }} />
          </Form.Item>
          <Form.Item name='placeholder' label={t('form.placeholder')}>
            <Input />
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              return type === 'float' || type === 'integer' ? (
                <>
                  <Form.Item label={t('form.min')} name='min'>
                    <InputNumber style={{ width: '400px' }} />
                  </Form.Item>
                  <Form.Item label={t('form.max')} name='max'>
                    <InputNumber style={{ width: '400px' }} />
                  </Form.Item>
                </>
              ) : null;
            }}
          </Form.Item>

          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              return type !== 'text' ? (
                <Form.Item name='units' label={t('form.units')}>
                  <Select mode='tags' style={{ width: '400px' }} open={false} />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type='primary' onClick={handleSubmit}>
                {t('common:btn.save')}
              </Button>
              <Button
                onClick={() => {
                  history.push('/traces-form');
                }}
              >
                {t('common:btn.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default ApmForm;
