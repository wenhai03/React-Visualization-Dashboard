import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Form, Button, Select, Row, Col, Switch, message, Checkbox, Collapse } from 'antd';
import ModalHOC, { ModalWrapProps } from '@/components/ModalHOC';
import DatasourceValueSelect from '@/pages/alertRules/Form/components/DatasourceValueSelect';
import { getBusinessTeam, getNotifiesList } from '@/services/manage';
import { createRule } from './services';

interface IProps {
  data: any;
  curBusiId: number;
  curBusiGroup: any;
  groupedDatasourceList: any;
}

function Import(props: IProps & ModalWrapProps) {
  const [form] = Form.useForm();
  const { t } = useTranslation('alertRulesBuiltin');
  const [contactList, setContactList] = useState<{ key: string; label: string }[]>([]);
  const [notifyGroups, setNotifyGroups] = useState<any[]>([]);
  const { visible, destroy, data, curBusiId, curBusiGroup, groupedDatasourceList } = props;
  const dataObj = JSON.parse(data);
  const datasourceCates = [{ value: dataObj.cate, label: _.capitalize(dataObj.cate) }];

  useEffect(() => {
    if (visible) {
      getNotifiesList().then((res) => {
        setContactList(res || []);
      });

      getBusinessTeam(curBusiId).then((res) => {
        setNotifyGroups(res.dat || []);
      });
    }
  }, [visible]);

  return (
    <Modal
      title={t('common:btn.clone')}
      visible={visible}
      centered
      width={800}
      onCancel={() => {
        destroy();
      }}
      maskClosable={false}
      footer={null}
    >
      <Form
        form={form}
        labelCol={{ span: 6 }}
        initialValues={{
          import: data,
          cate: dataObj.cate,
          datasource_ids: [],
          enabled: true,
          notify_mode: 1,
          ...curBusiGroup.alert_notify,
        }}
        onFinish={(vals) => {
          let data: any[] = [];
          try {
            data = JSON.parse(vals.import);
            if (!_.isArray(data)) {
              data = [data];
            }
            data = _.map(data, (item) => {
              const record = _.omit(item, ['id', 'group_id', 'create_at', 'create_by', 'update_at', 'update_by']);
              return {
                ...record,
                cate: vals.cate,
                datasource_ids: vals.datasource_ids,
                disabled: vals.enabled ? 0 : 1,
                notify_groups: vals.notify_groups,
                notify_channels: vals.notify_channels,
                notify_mode: vals.notify_mode,
              };
            });
          } catch (e) {
            message.error(t('json_msg'));
            return;
          }
          createRule(curBusiId, data).then((res) => {
            const failed = _.some(res, (val) => {
              return !!val;
            });
            if (failed) {
              Modal.error({
                title: t('common:error.clone'),
                content: (
                  <div>
                    {_.map(res, (val, key) => {
                      return (
                        <div key={key}>
                          {key}: {val}
                        </div>
                      );
                    })}
                  </div>
                ),
              });
            } else {
              message.success(t('common:success.clone'));
              destroy();
            }
          });
        }}
      >
        <Row gutter={10}>
          <Col span={12}>
            <Form.Item
              label={t('common:business_group')}
              name='bgid'
              initialValue={curBusiId}
              rules={[
                {
                  required: true,
                },
              ]}
            >
              {curBusiGroup.name}
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label={t('common:table.enabled')} name='enabled' valuePropName='checked'>
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label={t('common:datasource.type')} name='cate'>
              <Select>
                {_.map(datasourceCates, (item) => {
                  return (
                    <Select.Option key={item.value} value={item.value}>
                      {item.label}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.cate !== curValues.cate} noStyle>
              {({ getFieldValue, setFieldsValue }) => {
                const cate = getFieldValue('cate');
                return (
                  <DatasourceValueSelect
                    mode={cate === 'prometheus' ? 'multiple' : undefined}
                    setFieldsValue={setFieldsValue}
                    cate={cate}
                    datasourceList={groupedDatasourceList[cate] || []}
                  />
                );
              }}
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label={t('notify_mode')} name='notify_mode' labelCol={{ span: 3 }}>
          <Select
            style={{ width: '50%' }}
            onChange={(e) => {
              if (e === 1) {
                // 业务组
                form.setFieldsValue({ ...curBusiGroup.alert_notify });
              } else {
                // 自定义
                form.setFieldsValue({ notify_groups: [], notify_channels: [] });
              }
            }}
          >
            <Select.Option value={0} key={0}>
              {t('custom')}
            </Select.Option>
            <Select.Option value={1} key={1}>
              {t('group_default')}
            </Select.Option>
          </Select>
        </Form.Item>
        <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.notify_mode !== curValues.notify_mode} noStyle>
          {({ getFieldValue }) => {
            const notify_mode = getFieldValue('notify_mode');
            return (
              <>
                <Form.Item
                  label={t('common:notify_channels.title')}
                  name='notify_channels'
                  tooltip={t('common:notify_channels.tip')}
                  labelCol={{ span: 3 }}
                  rules={[
                    {
                      required: true,
                    },
                  ]}
                >
                  <Checkbox.Group disabled={notify_mode === 1}>
                    {contactList.map((item) => {
                      return (
                        <Checkbox value={item.key} key={item.label}>
                          {item.label}
                        </Checkbox>
                      );
                    })}
                  </Checkbox.Group>
                </Form.Item>
                <Form.Item
                  label={t('common:notify_channels.groups')}
                  name='notify_groups'
                  labelCol={{ span: 3 }}
                  rules={[
                    {
                      required: true,
                    },
                  ]}
                >
                  <Select
                    mode='multiple'
                    showSearch
                    optionFilterProp='children'
                    maxTagCount={5}
                    disabled={notify_mode === 1}
                  >
                    {_.map(notifyGroups, (item) => {
                      return (
                        <Select.Option value={_.toString(item.user_group.id)} key={item.user_group.id}>
                          {item.user_group.name}
                        </Select.Option>
                      );
                    })}
                  </Select>
                </Form.Item>
              </>
            );
          }}
        </Form.Item>

        <div className='alert-rules-build-in-import-code'>
          <Collapse>
            <Collapse.Panel header={t('json_label')} key='1'>
              <Form.Item name='import'>
                <Input.TextArea className='code-area' rows={16} />
              </Form.Item>
            </Collapse.Panel>
          </Collapse>
          <Form.Item
            name='import'
            rules={[
              {
                required: true,
                message: '请填写规则JSON',
              },
            ]}
          >
            <div />
          </Form.Item>
        </div>
        <Form.Item>
          <Button type='primary' htmlType='submit'>
            {t('common:btn.import')}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default ModalHOC(Import);
