import React, { useState, useEffect, useContext } from 'react';
import {
  Form,
  Card,
  Select,
  Col,
  Button,
  Row,
  message,
  Checkbox,
  Tooltip,
  Radio,
  Modal,
  Space,
  InputNumber,
  Input,
} from 'antd';
import {
  QuestionCircleFilled,
  PlusCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation, Trans } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { addSubscribe, editSubscribe, deleteSubscribes } from '@/services/subscribe';
import { getDatasourceBriefList } from '@/services/common';
import type { Datasource } from '@/App';
import { CommonStateContext } from '@/App';
import { getNotifiesList, getAllTeamGroup } from '@/services/manage';
import { subscribeItem } from '@/store/warningInterface/subscribe';
import DatasourceValueSelect from '@/pages/alertRules/Form/components/DatasourceValueSelect';
import ProdSelect from '@/pages/alertRules/Form/components/ProdSelect';
import AdvancedWrap, { getAuthorizedDatasourceCates } from '@/components/AdvancedWrap';
import RuleModal from './ruleModal';
import TagItem from './tagItem';
import { getDefaultValuesByProd } from '../../shield/components/utils';
import '../index.less';

const { Option } = Select;
interface Props {
  detail?: subscribeItem;
  type?: number; // 1:编辑; 2:克隆
}

const OperateForm: React.FC<Props> = ({ detail = {} as any, type }) => {
  const { t } = useTranslation('alertSubscribes');
  const [form] = Form.useForm(null as any);
  const history = useHistory();
  const [groupedDatasourceList, setGroupedDatasourceList] = useState<{
    prometheus?: Datasource[];
    elasticsearch?: Datasource[];
  }>({});
  const { curBusiId, curBusiGroup, busiGroups } = useContext(CommonStateContext);
  const [ruleModalShow, setRuleModalShow] = useState<boolean>(false);
  const [ruleCur, setRuleCur] = useState<any>();
  const [contactList, setInitContactList] = useState([]);
  const [littleAffect, setLittleAffect] = useState(true);
  const [notifyGroups, setNotifyGroups] = useState<any[]>([]);
  const [bindMode, setBindMode] = useState(3);

  useEffect(() => {
    getNotifyChannel();
  }, []);

  useEffect(() => {
    if (!_.isEmpty(detail)) {
      setRuleCur({
        id: detail.rule_id || 0,
        name: detail.rule_name,
      });
      setBindMode(detail.rule_group_id ? 2 : detail.rule_id ? 3 : 1);
    }
  }, [detail.rule_id]);

  useEffect(() => {
    if (curBusiId) {
      getDatasourceBriefList().then((res) => {
        const groupList = _.groupBy(res, 'plugin_type');
        setGroupedDatasourceList(groupList);
      });
      getAllTeamGroup(curBusiId).then((res) => {
        const { relation, un_relation } = res.dat;
        setNotifyGroups([
          {
            label: t('current_group_team'),
            options: relation.map((ele) => ({
              label: ele.name,
              value: ele.id.toString(),
            })),
          },
          {
            label: t('other_group_team'),
            options: un_relation.map((ele) => ({
              label: ele.name,
              value: ele.id.toString(),
            })),
          },
        ]);
      });
    }
  }, [curBusiId]);

  const getNotifyChannel = async () => {
    const res = await getNotifiesList();
    let contactList = res || [];
    setInitContactList(contactList);
  };

  const onFinish = (values) => {
    const tags = values?.tags?.map((item) => {
      return {
        ...item,
        value: Array.isArray(item.value) ? item.value.join(' ') : item.value,
      };
    });
    const params = {
      ...values,
      tags,
      redefine_severity: values.redefine_severity ? 1 : 0,
      redefine_channels: values.redefine_channels ? 1 : 0,
      rule_id: bindMode === 3 ? ruleCur?.id : 0,
      user_group_ids: values.user_group_ids ? values.user_group_ids.join(' ') : '',
      new_channels: values.new_channels ? values.new_channels.join(' ') : '',
      cluster: '0',
    };
    if (type === 1) {
      editSubscribe([{ ...params, id: detail.id }], curBusiId).then((_) => {
        message.success(t('common:success.edit'));
        history.push('/alert-subscribes');
      });
    } else {
      addSubscribe(params, curBusiId).then((_) => {
        message.success(t('common:success.add'));
        history.push('/alert-subscribes');
      });
    }
  };

  const chooseRule = () => {
    setRuleModalShow(true);
  };

  const subscribeRule = (val) => {
    setRuleModalShow(false);
    setRuleCur(val);
    form.setFieldsValue({
      rule_id: val,
    });
  };

  return (
    <>
      <div className='operate-form-index' id={littleAffect ? 'littleAffect' : ''}>
        <Form
          form={form}
          disabled={curBusiGroup.perm === 'ro'}
          layout='vertical'
          className='operate-form'
          onFinish={onFinish}
          initialValues={{
            ...detail,
            prod: detail.prod || 'metric',
            redefine_severity: detail?.redefine_severity ? true : false,
            redefine_channels: detail?.redefine_channels ? true : false,
            user_group_ids: detail?.user_group_ids ? detail?.user_group_ids?.split(' ') : [],
            new_channels: detail?.new_channels?.split(' '),
          }}
        >
          <Card>
            <Form.Item label={t('name')} name='name' rules={[{ required: true }]}>
              <Input style={{ width: '100%' }} />
            </Form.Item>
            <ProdSelect
              label={t('prod')}
              onChange={(e) => {
                form.setFieldsValue(getDefaultValuesByProd(e.target.value));
              }}
            />
            <Form.Item shouldUpdate noStyle>
              {({ getFieldValue }) => {
                const prod = getFieldValue('prod');
                if (prod !== 'host') {
                  return (
                    <Row gutter={10}>
                      <Col span={12}>
                        <AdvancedWrap var='VITE_IS_ALERT_ES'>
                          {(isShow) => {
                            return (
                              <Form.Item
                                label={t('common:datasource.type')}
                                name='cate'
                                initialValue={prod === 'log' ? 'elasticsearch' : 'prometheus'}
                              >
                                <Select>
                                  {_.map(
                                    _.filter(getAuthorizedDatasourceCates(), (item) => item.type === prod),
                                    (item) => {
                                      return (
                                        <Select.Option value={item.value} key={item.value}>
                                          {item.label}
                                        </Select.Option>
                                      );
                                    },
                                  )}
                                </Select>
                              </Form.Item>
                            );
                          }}
                        </AdvancedWrap>
                      </Col>
                    </Row>
                  );
                }
              }}
            </Form.Item>

            <Form.Item label={t('sub_rule_name')}>
              <Space>
                <Select
                  style={{ width: 160 }}
                  value={bindMode}
                  onChange={(val) => {
                    setBindMode(val);
                    if (val === 1) {
                      form.setFieldsValue({
                        rule_group_id: 0,
                        rule_id: 0,
                      });
                    } else if (val === 2) {
                      const rule_group_id = form.getFieldValue('rule_group_id');
                      form.setFieldsValue({
                        rule_group_id: rule_group_id === 0 ? curBusiId : rule_group_id,
                        rule_id: 0,
                      });
                    } else {
                      setRuleCur(undefined);
                      form.setFieldsValue({
                        rule_id: undefined,
                      });
                    }
                  }}
                >
                  {curBusiGroup?.extra?.super && <Select.Option value={1}>{t('all_bgid')}</Select.Option>}
                  <Select.Option value={2}>{t('appoint_bgid')}</Select.Option>
                  <Select.Option value={3}>{t('appoint_alert_rule')}</Select.Option>
                </Select>
                {bindMode === 2 && (
                  <Form.Item name='rule_group_id' noStyle>
                    <Select
                      style={{ width: 120 }}
                      options={busiGroups.map((item: any) => ({
                        label: `${item.name}${item.perm === 'ro' ? '（只读）' : ''}`,
                        value: item.id,
                      }))}
                    />
                  </Form.Item>
                )}
                {!!ruleCur?.id && bindMode === 3 && (
                  <Button
                    type='primary'
                    ghost
                    style={{ marginRight: '8px' }}
                    onClick={() => {
                      ruleCur?.id && history.push(`/alert-rules/edit/${ruleCur?.id}`);
                    }}
                  >
                    {ruleCur?.name}
                  </Button>
                )}
                {curBusiGroup.perm === 'rw' && bindMode === 3 && (
                  <>
                    <EditOutlined style={{ cursor: 'pointer', fontSize: '18px' }} onClick={chooseRule} />
                    <Form.Item name='rule_id' rules={[{ required: true, message: t('alert_rule_required') }]} noStyle>
                      <div />
                    </Form.Item>
                    {!!ruleCur?.id && (
                      <DeleteOutlined
                        style={{ cursor: 'pointer', fontSize: '18px', marginLeft: 5 }}
                        onClick={() => {
                          subscribeRule([]);
                          form.setFieldsValue({
                            rule_id: undefined,
                          });
                        }}
                      />
                    )}
                  </>
                )}
              </Space>
            </Form.Item>

            <Form.List name='tags' initialValue={[{}]}>
              {(fields, { add, remove }) => (
                <>
                  <Row gutter={[10, 10]} style={{ marginBottom: '8px' }}>
                    <Col span={5}>
                      <Space align='baseline'>
                        <span>{t('tag.key.label')}</span>
                        <Tooltip
                          title={<Trans ns='alertSubscribes' i18nKey='tag.key.tip' components={{ 1: <br /> }} />}
                          overlayStyle={{
                            minWidth: '330px',
                          }}
                        >
                          <QuestionCircleFilled />
                        </Tooltip>
                        {curBusiGroup.perm === 'rw' && (
                          <PlusCircleOutlined className='control-icon-normal' onClick={() => add()} />
                        )}
                      </Space>
                    </Col>
                    <Col span={3}>{t('tag.func.label')}</Col>
                    <Col span={16}>{t('tag.value.label')}</Col>
                  </Row>
                  {fields.map((field, index) => (
                    <TagItem
                      field={field}
                      fields={fields}
                      key={index}
                      remove={remove}
                      add={add}
                      form={form}
                      perm={curBusiGroup.perm}
                    />
                  ))}
                </>
              )}
            </Form.List>
            <Form.Item label={t('for_duration')} name='for_duration'>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label={t('redefine_severity')} name='redefine_severity' valuePropName='checked'>
              <Checkbox
                disabled={curBusiGroup.perm === 'ro'}
                value={1}
                style={{ lineHeight: '32px' }}
                onChange={(e) => {
                  form.setFieldsValue({
                    redefine_severity: e.target.checked ? 1 : 0,
                  });
                  setLittleAffect(!littleAffect);
                }}
              >
                {t('redefine')}
              </Checkbox>
            </Form.Item>
            <Form.Item
              label={t('new_severity')}
              name='new_severity'
              initialValue={2}
              style={{ display: form.getFieldValue('redefine_severity') ? 'block' : 'none' }}
            >
              <Radio.Group>
                <Radio key={1} value={1}>
                  {t('common:severity.1')}
                </Radio>
                <Radio key={2} value={2}>
                  {t('common:severity.2')}
                </Radio>
                <Radio key={3} value={3}>
                  {t('common:severity.3')}
                </Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item label={t('redefine_channels')} name='redefine_channels' valuePropName='checked'>
              <Checkbox
                disabled={curBusiGroup.perm === 'ro'}
                value={1}
                style={{ lineHeight: '32px' }}
                onChange={(e) => {
                  form.setFieldsValue({
                    redefine_channels: e.target.checked ? 1 : 0,
                  });
                  setLittleAffect(!littleAffect);
                }}
              >
                {t('redefine')}
              </Checkbox>
            </Form.Item>
            <Form.Item
              label={t('new_channels')}
              name='new_channels'
              style={{ display: form.getFieldValue('redefine_channels') ? 'block' : 'none' }}
            >
              <Checkbox.Group>
                {contactList.map((c: { key: string; label: string }) => (
                  <Checkbox value={c.key} key={c.label} disabled={curBusiGroup.perm === 'ro'}>
                    {c.label}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>
            {/* 隐藏 回调地址 */}
            {/* <Form.Item label={t('redefine_webhooks')} name='redefine_webhooks' valuePropName='checked'>
              <Checkbox
                disabled={curBusiGroup.perm === 'ro'}
                value={1}
                style={{ lineHeight: '32px' }}
                onChange={(e) => {
                  form.setFieldsValue({
                    redefine_webhooks: e.target.checked ? 1 : 0,
                  });
                  setLittleAffect(!littleAffect);
                }}
              >
                {t('redefine')}
              </Checkbox>
            </Form.Item> */}
            {/* <div style={{ display: form.getFieldValue('redefine_webhooks') ? 'block' : 'none' }}>
              <Form.List name='webhooks' initialValue={[]}>
                {(fields, { add, remove }) => (
                  <>
                    <Row gutter={10} style={{ marginBottom: '8px' }}>
                      <Col span={5}>
                        <Space align='baseline'>
                          <span>{t('webhooks')}</span>
                          {curBusiGroup.perm === 'rw' && <PlusCircleOutlined onClick={() => add()} />}
                        </Space>
                      </Col>
                    </Row>
                    {fields.map((field, index) => (
                      <Row gutter={10}>
                        <Col flex='auto'>
                          <Form.Item
                            name={[field.name]}
                            key={index}
                            rules={[{ required: true, message: t('webhooks_msg') }]}
                          >
                            <Input />
                          </Form.Item>
                        </Col>
                        {curBusiGroup.perm === 'rw' && (
                          <Col flex='32px'>
                            <MinusCircleOutlined style={{ marginTop: '8px' }} onClick={() => remove(field.name)} />
                          </Col>
                        )}
                      </Row>
                    ))}
                  </>
                )}
              </Form.List>
            </div> */}

            <Form.Item label={t('user_group_ids')} name='user_group_ids'>
              <Select
                mode='multiple'
                showSearch
                optionFilterProp='children'
                filterOption={false}
                options={notifyGroups}
              />
            </Form.Item>
            {curBusiGroup.perm === 'rw' && (
              <Form.Item>
                <Button type='primary' htmlType='submit' style={{ marginRight: '8px' }}>
                  {type === 1 ? t('common:btn.edit') : type === 2 ? t('common:btn.clone') : t('common:btn.create')}
                </Button>
                {type === 1 && (
                  <Button
                    danger
                    style={{ marginRight: '8px' }}
                    onClick={() => {
                      Modal.confirm({
                        title: t('common:confirm.delete'),
                        okText: t('common:btn.ok'),
                        cancelText: t('common:btn.cancel'),
                        onOk: () => {
                          detail?.id &&
                            deleteSubscribes({ ids: [detail.id] }, curBusiId).then(() => {
                              message.success(t('common:success.delete'));
                              history.push('/alert-subscribes');
                            });
                        },

                        onCancel() {},
                      });
                    }}
                  >
                    {t('common:btn.delete')}
                  </Button>
                )}
                <Button onClick={() => window.history.back()}>{t('common:btn.cancel')}</Button>
              </Form.Item>
            )}
          </Card>
        </Form>
        <RuleModal
          visible={ruleModalShow}
          ruleModalClose={() => {
            setRuleModalShow(false);
          }}
          subscribe={subscribeRule}
        />
      </div>
    </>
  );
};

export default OperateForm;
