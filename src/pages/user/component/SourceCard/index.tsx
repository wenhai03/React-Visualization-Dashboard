import React, { FC, useState, useEffect, useContext } from 'react';
import { PlusCircleOutlined, MinusCircleOutlined, FormOutlined } from '@ant-design/icons';
import { Select, Input, Space, Form, Button, Popconfirm, Row, Col, message } from 'antd';
import { CommonStateContext } from '@/App';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import DataViewDrawer from '../DataViewDrawer';
import './index.less';

interface IDataViewCmdProps {
  name: string;
  index: string;
  time_field: string;
}

interface ISourceProps {
  type: 'prometheus' | 'elasticsearch' | 'dataView';
  indexOptions?: any;
  serviceNameIndex?: any;
  teamId: number;
  disabled: boolean;
  data: {
    data_id: string;
    id: number;
    virtual_id: number;
    cmd: string[] | IDataViewCmdProps[];
  };
  datasourceList: { name: string; id: number; plugin_type: string }[] | [];
  systemCmd?: string[];
  onSubmit: (data: any) => void;
  onChange: (
    optionType: 'create' | 'delete',
    type: 'prometheus' | 'elasticsearch' | 'dataView',
    virtual_id: number,
    id?: number,
  ) => void;
}

const SourceCard: FC<ISourceProps> = (props) => {
  const {
    type,
    data,
    indexOptions,
    onSubmit,
    onChange,
    datasourceList,
    teamId,
    disabled,
    serviceNameIndex,
    systemCmd,
  } = props;
  const { profile } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const { t } = useTranslation('user');
  const [dataId, setDataId] = useState(data.data_id);
  const [visible, setVisible] = useState(false);
  const [initialValues, setInitialValues] = useState<{ key: number; value: any }>();
  const [isCmd, setIsCmd] = useState(Boolean(form.getFieldValue('cmd')?.[0]?.name));

  useEffect(() => {
    setIsCmd(form.getFieldValue('cmd')?.[0]?.name);
  }, [form.getFieldValue('cmd')]);

  useEffect(() => {
    form.setFieldsValue(data);
  }, [data]);

  const changeDataId = (value) => {
    if (type === 'elasticsearch') {
      form.setFieldsValue({
        cmd: [],
      });
    }
    setDataId(value);
  };

  const handleDataView = (key?: number) => {
    if (key !== undefined) {
      // 编辑
      const cmd = form.getFieldValue('cmd');
      setInitialValues({ key: key, value: cmd[key] });
    } else {
      setInitialValues(undefined);
    }
    setVisible(true);
  };

  const onOk = (values) => {
    let cmdList = form.getFieldValue('cmd');
    if (initialValues?.value !== undefined) {
      cmdList[initialValues.key] = values;
    } else {
      cmdList = [...cmdList, values];
    }
    form.setFieldsValue({
      cmd: cmdList,
    });
    setVisible(false);
  };

  const handleAppService = () => {
    let cmdList = form.getFieldValue('cmd') || [];
    form.setFieldsValue({
      cmd: Array.from(new Set([...cmdList, ...serviceNameIndex])),
    });
  };

  return (
    <div className='source-card-wrapper'>
      <Form
        form={form}
        onFinish={type === 'dataView' && !isCmd ? () => message.warning(t('business.required_data_view')) : onSubmit}
        autoComplete='off'
        layout='vertical'
        disabled={disabled}
      >
        <Form.Item name='cmd_type' hidden>
          <Input />
        </Form.Item>
        <Form.Item name='id' hidden>
          <Input />
        </Form.Item>
        <Form.Item name='virtual_id' hidden>
          <Input />
        </Form.Item>
        <Form.Item
          label={
            <Space>
              {t('common:datasource.name')}
              {((type === 'dataView' && !disabled) || profile.admin) && (
                <PlusCircleOutlined onClick={() => onChange('create', type, data.virtual_id)} />
              )}
              {data.id && ((type === 'dataView' && !disabled) || profile.admin) ? (
                <Popconfirm
                  title={<div style={{ width: 100 }}>{t('common:confirm.delete')}</div>}
                  onConfirm={() => onChange('delete', type, data.virtual_id, data.id)}
                >
                  <MinusCircleOutlined />
                </Popconfirm>
              ) : (
                ((type === 'dataView' && !disabled) || profile.admin) && (
                  <MinusCircleOutlined onClick={() => onChange('delete', type, data.virtual_id, data.id)} />
                )
              )}
            </Space>
          }
          name='data_id'
          rules={[{ required: true, message: t('common:datasource.id_required') }]}
        >
          <Select
            onChange={changeDataId}
            disabled={(type === 'dataView' && isCmd) || (type !== 'dataView' && !profile.admin)}
          >
            {datasourceList.map((item) => (
              <Select.Option value={item.id} key={item.id}>
                {item.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {type === 'prometheus' ? (
          <Form.List name='cmd'>
            {(fields, { add, remove }) => (
              <>
                <Space style={{ paddingBottom: '8px' }}>
                  <span className='tag-filter'>{t('business.tag_filter')}</span>
                  {profile.admin && <PlusCircleOutlined onClick={() => add()} />}
                </Space>
                {fields.map(({ key, name, ...restField }) => {
                  const cmdItem = form.getFieldValue(['cmd', name]);
                  return (
                    <Space key={key} className='prometheus-filter-label' align='baseline'>
                      <Form.Item
                        {...restField}
                        name={[name]}
                        rules={[{ required: true, message: t('business.tag_required') }]}
                      >
                        <Input disabled={!profile.admin || systemCmd?.includes(cmdItem)} />
                      </Form.Item>
                      {fields.length > 1 && profile.admin && <MinusCircleOutlined onClick={() => remove(name)} />}
                    </Space>
                  );
                })}
              </>
            )}
          </Form.List>
        ) : type === 'elasticsearch' ? (
          <Form.Item
            label={
              <Space>
                {t('business.index')}
                <Button size='small' onClick={handleAppService} disabled={!profile?.admin}>
                  {t('business.get_app_service_btn')}
                </Button>
              </Space>
            }
            name='cmd'
            rules={[{ required: true, message: t('business.index_required') }]}
          >
            <Select
              mode='tags'
              style={{ width: '100%' }}
              placeholder={t('business.index_required')}
              options={indexOptions[dataId]}
              disabled={!profile.admin}
            />
          </Form.Item>
        ) : (
          <Form.List name='cmd'>
            {(fields, { remove }) => (
              <>
                <Space>
                  {t('business.data_view')}
                  {!disabled && (
                    <PlusCircleOutlined
                      onClick={() =>
                        form.getFieldValue('data_id')
                          ? handleDataView()
                          : message.warning(t('business.required_data_source'))
                      }
                    />
                  )}
                </Space>
                {isCmd ? (
                  <>
                    <Row gutter={24}>
                      <Col span={6}>{t('business.view_name')}</Col>
                      <Col span={8}>{t('business.index_mode')}</Col>
                      <Col span={6}>{t('common:date_field')}</Col>
                    </Row>
                    {fields.map(({ key, name }) => (
                      <Row gutter={24} align='middle' key={key}>
                        <Col span={6}>
                          <Form.Item name={[name, 'name']}>
                            <Input disabled />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item name={[name, 'index']}>
                            <Input disabled />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item shouldUpdate noStyle>
                            {({ getFieldValue }) => {
                              const timeField = getFieldValue(['cmd', name, 'time_field']);
                              return (
                                <Form.Item name={[name, 'time_field']}>
                                  <Select
                                    disabled
                                    options={[
                                      ...(timeField === ''
                                        ? [{ label: t('common:date_field'), value: '' }]
                                        : [{ label: timeField, value: timeField }]),
                                    ]}
                                  />
                                </Form.Item>
                              );
                            }}
                          </Form.Item>
                        </Col>
                        <Col style={{ marginBottom: '18px' }}>
                          {!disabled && <FormOutlined onClick={() => handleDataView(key)} />}
                        </Col>
                        <Col style={{ marginBottom: '18px' }}>
                          {fields.length > 1 && !disabled && <MinusCircleOutlined onClick={() => remove(name)} />}
                        </Col>
                      </Row>
                    ))}
                  </>
                ) : (
                  <div style={{ margin: '10px 0' }}>{t('business.required_data_view')}</div>
                )}
              </>
            )}
          </Form.List>
        )}
        {(type === 'dataView' || profile.admin) && (
          <Button className='source-card-btn' size='small' type='primary' htmlType='submit'>
            {t('common:btn.save')}
          </Button>
        )}
      </Form>

      <DataViewDrawer
        initialValues={initialValues?.value}
        visible={visible}
        onOk={onOk}
        onCancel={() => setVisible(false)}
        dataId={dataId}
        bgid={teamId}
      />
    </div>
  );
};

export default SourceCard;
