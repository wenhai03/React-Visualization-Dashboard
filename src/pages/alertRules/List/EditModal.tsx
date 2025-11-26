import React, { useState, useEffect, useCallback, useContext } from 'react';
import moment from 'moment';
import _ from 'lodash';
import {
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Row,
  Col,
  TimePicker,
  Checkbox,
  Tag,
  message,
  Space,
  Switch,
  Tooltip,
  Modal,
  Button,
} from 'antd';
import {
  QuestionCircleFilled,
  MinusCircleOutlined,
  PlusCircleOutlined,
  CaretDownOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getBusinessTeam, getNotifiesList } from '@/services/manage';
import DatasourceValueSelect from '@/pages/alertRules/Form/components/DatasourceValueSelect';
import { debounce, join } from 'lodash';
import { CommonStateContext } from '@/App';

const { Option } = Select;
const layout = {
  labelCol: {
    span: 3,
  },
  wrapperCol: {
    span: 20,
  },
};

const fields = [
  // {
  //   id: 2,
  //   field: 'datasource_ids',
  //   name: '数据源',
  // },
  // {
  //   id: 3,
  //   field: 'severity',
  //   name: '级别',
  // },
  // {
  //   id: 5,
  //   field: 'prom_eval_interval',
  //   name: '执行频率',
  // },
  // {
  //   id: 6,
  //   field: 'prom_for_duration',
  //   name: '持续时长',
  // },
  {
    id: 4,
    field: 'disabled',
    name: '启用',
  },
  {
    id: 13,
    field: 'effective_time',
    name: '生效时间',
  },
  // {
  //   id: 12,
  //   field: 'append_tags',
  //   name: '附加标签',
  // },
  {
    id: 7,
    field: 'notify_channels_groups',
    name: '通知媒介与接收团队',
  },
  {
    id: 9,
    field: 'notify_recovered',
    name: '启用恢复通知',
  },
  {
    id: 10,
    field: 'notify_repeat_step',
    name: '重复发送频率',
  },
  {
    id: 15,
    field: 'recover_duration',
    name: '留观时长',
  },
  {
    id: 16,
    field: 'notify_max_number',
    name: '最大发送次数',
  },
  // 暂时隐藏 批量更新回调地址 功能
  // {
  //   id: 11,
  //   field: 'callbacks',
  //   name: '回调地址',
  // },
  // {
  //   id: 0,
  //   field: 'note',
  //   name: '备注',
  // },
  {
    id: 1,
    field: 'runbook_url',
    name: '预案链接',
  },
];

// 校验单个标签格式是否正确
// function isTagValid(tag) {
//   const contentRegExp = /^[a-zA-Z_][\w]*={1}[^=]+$/;
//   return {
//     isCorrectFormat: contentRegExp.test(tag.toString()),
//     isLengthAllowed: tag.toString().length <= 64,
//   };
// }

interface Props {
  isModalVisible: boolean;
  editModalFinish: Function;
}

const editModal: React.FC<Props> = ({ isModalVisible, editModalFinish }) => {
  const { t, i18n } = useTranslation('alertRules');
  const [form] = Form.useForm();
  const { profile, datasourceList, curBusiId, curBusiGroup } = useContext(CommonStateContext);
  const [contactList, setInitContactList] = useState([]);
  const [notifyGroups, setNotifyGroups] = useState<any>([]);
  const [field, setField] = useState<string>('disabled');
  const [refresh, setRefresh] = useState(true);
  const [fieldList, setFieldList] = useState(fields);
  const changetoText = t('batch.update.changeto');

  useEffect(() => {
    getNotifyChannel();
    // 管理员才可对此项进行更改
    // if (profile.admin) {
    //   setFieldList([
    //     ...fields,
    //     {
    //       id: 14,
    //       field: 'enable_in_bg',
    //       name: '仅在本业务组生效',
    //     },
    //   ]);
    // }

    return () => {};
  }, []);

  useEffect(() => {
    if (curBusiId) {
      getGroups('');
    }
  }, [curBusiId]);

  // 渲染标签
  // function tagRender(content) {
  //   const { isCorrectFormat, isLengthAllowed } = isTagValid(content.value);
  //   return isCorrectFormat && isLengthAllowed ? (
  //     <Tag closable={content.closable} onClose={content.onClose}>
  //       {content.value}
  //     </Tag>
  //   ) : (
  //     <Tooltip title={isCorrectFormat ? t('append_tags_msg1') : t('append_tags_msg2')}>
  //       <Tag color='error' closable={content.closable} onClose={content.onClose} style={{ marginTop: '2px' }}>
  //         {content.value}
  //       </Tag>
  //     </Tooltip>
  //   );
  // }

  // 校验所有标签格式
  // function isValidFormat() {
  //   return {
  //     validator(_, value) {
  //       const isInvalid =
  //         value &&
  //         value.some((tag) => {
  //           const { isCorrectFormat, isLengthAllowed } = isTagValid(tag);
  //           if (!isCorrectFormat || !isLengthAllowed) {
  //             return true;
  //           }
  //         });
  //       return isInvalid ? Promise.reject(new Error(t('append_tags_msg'))) : Promise.resolve();
  //     },
  //   };
  // }

  const enableDaysOfWeekOptions = [0, 1, 2, 3, 4, 5, 6].map((item) => {
    return (
      <Option value={String(item)} key={item}>
        {t(`common:time.weekdays.${item}`)}
      </Option>
    );
  });

  const contactListCheckboxes = contactList.map((c: { key: string; label: string }) => (
    <Checkbox value={c.key} key={c.label}>
      {c.label}
    </Checkbox>
  ));

  const notifyGroupsOptions = notifyGroups.map((ng: any) => (
    <Option value={ng.user_group.id.toString()} key={ng.user_group.id}>
      {ng.user_group.name}
    </Option>
  ));

  const getNotifyChannel = async () => {
    const res = await getNotifiesList();
    let contactList = res || [];
    setInitContactList(contactList);
  };

  const getGroups = async (str) => {
    const res = await getBusinessTeam(curBusiId);
    setNotifyGroups(res.dat || []);
  };

  const debounceFetcher = useCallback(debounce(getGroups, 800), []);

  const modelOk = () => {
    form.validateFields().then(async (values) => {
      const data = { ...values };
      switch (values.field) {
        case 'effective_time':
          data.enable_days_of_week = '';
          values.effective_time.map((item, index) => {
            if (values.effective_time.length === 1) {
              data.enable_days_of_week += join(item.enable_days_of_week, ' ');
            } else {
              if (index === values.effective_time.length - 1) {
                data.enable_days_of_week += join(item.enable_days_of_week, ' ');
              } else {
                data.enable_days_of_week += join(item.enable_days_of_week, ' ') + ';';
              }
            }
          }),
            (data.enable_stime = values.effective_time.map((item) => item.enable_stime.format('HH:mm'))),
            (data.enable_etime = values.effective_time.map((item) => item.enable_etime.format('HH:mm'))),
            delete data.effective_time;
          break;
        case 'disabled':
          data.disabled = !values.enable_status ? 1 : 0;
          delete data.enable_status;
          break;
        // case 'enable_in_bg':
        //   data.enable_in_bg = values.enable_in_bg ? 1 : 0;
        //   break;
        // case 'callbacks':
        //   if (data.action === 'cover') {
        //     delete data.action;
        //     data.callbacks = values.callbacks.map((item) => item.url);
        //   } else {
        //     data.callbacks = values.callbacks;
        //   }
        //   break;
        case 'notify_recovered':
          data.notify_recovered = values.notify_recovered ? 1 : 0;
          break;
        default:
          break;
      }
      delete data.field;
      Object.keys(data).forEach((key) => {
        // 因为功能上有清除备注的需求，需要支持传空
        if (data[key] === undefined) {
          data[key] = '';
        }
        // if (Array.isArray(data[key]) && key !== 'datasource_ids') {
        //   data[key] = data[key].join(' ');
        // }
      });
      editModalFinish(true, data);
    });
  };

  const editModalClose = () => {
    editModalFinish(false);
  };

  const fieldChange = (val) => {
    setField(val);
  };

  return (
    <>
      <Modal
        title={t('batch.update.name')}
        visible={isModalVisible}
        onOk={modelOk}
        width={860}
        onCancel={() => {
          editModalClose();
        }}
      >
        <Form
          {...layout}
          form={form}
          className='strategy-form'
          layout={refresh ? 'horizontal' : 'horizontal'}
          initialValues={{
            // prom_eval_interval: 15,
            disabled: 0, // 0:立即启用 1:禁用
            enable_status: true, // true:立即启用 false:禁用
            notify_recovered: 1, // 1:启用
            effective_time: [
              {
                enable_stime: moment('00:00', 'HH:mm'),
                enable_etime: moment('23:59', 'HH:mm'),
                enable_days_of_week: ['1', '2', '3', '4', '5', '6', '0'],
              },
            ],
            // datasource_ids: [],
            field: 'disabled',
            notify_mode: 1,
            ...curBusiGroup.alert_notify,
          }}
        >
          <Form.Item
            label={t('batch.update.field')}
            name='field'
            rules={[
              {
                required: false,
              },
            ]}
          >
            <Select suffixIcon={<CaretDownOutlined />} style={{ width: '100%' }} onChange={fieldChange}>
              {fieldList.map((item) => (
                <Option key={item.id} value={item.field}>
                  {t(`batch.update.options.${item.field}`)}
                </Option>
              ))}
            </Select>
          </Form.Item>
          {(() => {
            switch (field) {
              // case 'note':
              //   return (
              //     <>
              //       <Form.Item label={changetoText} name='note'>
              //         <Input />
              //       </Form.Item>
              //     </>
              //   );
              case 'runbook_url':
                return (
                  <>
                    <Form.Item label={changetoText} name='runbook_url'>
                      <Input />
                    </Form.Item>
                  </>
                );

              // case 'datasource_ids':
              //   return (
              //     <>
              //       <DatasourceValueSelect
              //         mode='multiple'
              //         setFieldsValue={form.setFieldsValue}
              //         cate='prometheus'
              //         datasourceList={datasourceList || []}
              //       />
              //     </>
              //   );
              // case 'severity':
              //   return (
              //     <>
              //       <Form.Item label={changetoText} name='severity' initialValue={2}>
              //         <Radio.Group>
              //           <Radio value={1}>{t('common:severity.1')}</Radio>
              //           <Radio value={2}>{t('common:severity.2')}</Radio>
              //           <Radio value={3}>{t('common:severity.3')}</Radio>
              //         </Radio.Group>
              //       </Form.Item>
              //     </>
              //   );
              case 'disabled':
                return (
                  <>
                    <Form.Item label={changetoText} name='enable_status' valuePropName='checked'>
                      <Switch />
                    </Form.Item>
                  </>
                );
              // case 'enable_in_bg':
              //   return (
              //     <>
              //       <Form.Item label={changetoText}>
              //         <Space align='baseline'>
              //           <Form.Item name='enable_in_bg' valuePropName='checked'>
              //             <Switch />
              //           </Form.Item>
              //           <span>{t('batch.update.enable_in_bg_tip')}</span>
              //         </Space>
              //       </Form.Item>
              //     </>
              //   );
              // case 'prom_eval_interval':
              //   return (
              //     <>
              //       <Form.Item label={changetoText}>
              //         <Space>
              //           <Form.Item
              //             style={{ marginBottom: 0 }}
              //             name='prom_eval_interval'
              //             initialValue={15}
              //             wrapperCol={{ span: 10 }}
              //           >
              //             <InputNumber
              //               min={1}
              //               onChange={(val) => {
              //                 setRefresh(!refresh);
              //               }}
              //             />
              //           </Form.Item>
              //           {t('common:time.second')}
              //         </Space>
              //       </Form.Item>
              //     </>
              //   );
              // case 'prom_for_duration':
              //   return (
              //     <>
              //       <Form.Item label={changetoText}>
              //         <Space>
              //           <Form.Item
              //             style={{ marginBottom: 0 }}
              //             name='prom_for_duration'
              //             initialValue={60}
              //             wrapperCol={{ span: 10 }}
              //           >
              //             <InputNumber min={0} />
              //           </Form.Item>
              //           {t('common:time.second')}
              //         </Space>
              //       </Form.Item>
              //     </>
              //   );
              case 'notify_channels_groups':
                return (
                  <>
                    <Form.Item label={t('notify_mode')} name='notify_mode'>
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
                          {t('custom_own')}
                        </Select.Option>
                        <Select.Option value={1} key={1}>
                          {t('group_default')}
                        </Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item shouldUpdate noStyle>
                      {({ getFieldValue }) => {
                        const notify_mode = getFieldValue('notify_mode');
                        return (
                          <>
                            <Form.Item label={changetoText} name='notify_channels'>
                              <Checkbox.Group disabled={notify_mode === 1}>{contactListCheckboxes}</Checkbox.Group>
                            </Form.Item>
                            <Form.Item label={changetoText} name='notify_groups'>
                              <Select
                                disabled={notify_mode === 1}
                                mode='multiple'
                                showSearch
                                optionFilterProp='children'
                                filterOption={false}
                                onSearch={(e) => debounceFetcher(e)}
                                onBlur={() => getGroups('')}
                              >
                                {notifyGroupsOptions}
                              </Select>
                            </Form.Item>
                          </>
                        );
                      }}
                    </Form.Item>
                  </>
                );
              case 'notify_recovered':
                return (
                  <>
                    <Form.Item label={changetoText} name='notify_recovered' valuePropName='checked'>
                      <Switch />
                    </Form.Item>
                  </>
                );
              case 'recover_duration':
                return (
                  <>
                    <Form.Item label={changetoText}>
                      <Space>
                        <Form.Item
                          style={{ marginBottom: 0 }}
                          name='recover_duration'
                          initialValue={0}
                          wrapperCol={{ span: 10 }}
                        >
                          <InputNumber
                            min={0}
                            onChange={() => {
                              setRefresh(!refresh);
                            }}
                          />
                        </Form.Item>
                        {t('common:time.second')}
                        <Tooltip title={t('recover_duration_tip', { num: form.getFieldValue('recover_duration') })}>
                          <QuestionCircleFilled />
                        </Tooltip>
                      </Space>
                    </Form.Item>
                  </>
                );
              case 'notify_repeat_step':
                return (
                  <>
                    <Form.Item label={changetoText}>
                      <Space>
                        <Form.Item
                          style={{ marginBottom: 0 }}
                          name='notify_repeat_step'
                          initialValue={60}
                          wrapperCol={{ span: 10 }}
                        >
                          <InputNumber
                            min={0}
                            onChange={(val) => {
                              setRefresh(!refresh);
                            }}
                          />
                        </Form.Item>
                        {t('common:time.minute')}
                        <Tooltip title={<pre>{t('notify_repeat_step_tip')}</pre>} overlayInnerStyle={{ width: 310 }}>
                          <QuestionCircleFilled />
                        </Tooltip>
                      </Space>
                    </Form.Item>
                  </>
                );
              case 'notify_max_number':
                return (
                  <>
                    <Form.Item label={changetoText}>
                      <Space>
                        <Form.Item
                          style={{ marginBottom: 0 }}
                          name='notify_max_number'
                          initialValue={0}
                          wrapperCol={{ span: 10 }}
                          rules={[
                            {
                              required: true,
                            },
                          ]}
                        >
                          <InputNumber min={0} precision={0} />
                        </Form.Item>
                        <Tooltip title={t('notify_max_number_tip')}>
                          <QuestionCircleFilled />
                        </Tooltip>
                      </Space>
                    </Form.Item>
                  </>
                );
              // case 'callbacks':
              //   return (
              //     <>
              //       <Form.Item name='action' label={t('batch.update.callback_cover.mode')} initialValue='cover'>
              //         <Radio.Group
              //           buttonStyle='solid'
              //           onChange={(e) => {
              //             if (e.target.value === 'cover') {
              //               form.setFieldsValue({
              //                 callbacks: [
              //                   {
              //                     url: '',
              //                   },
              //                 ],
              //               });
              //             } else {
              //               form.setFieldsValue({ callbacks: '' });
              //             }
              //           }}
              //         >
              //           <Radio.Button value='cover'>{t('batch.update.callback_cover.cover')}</Radio.Button>
              //           <Radio.Button value='callback_add'>{t('batch.update.callback_cover.callback_add')}</Radio.Button>
              //           <Radio.Button value='callback_del'>{t('batch.update.callback_cover.callback_del')}</Radio.Button>
              //         </Radio.Group>
              //       </Form.Item>
              //       <Form.Item shouldUpdate noStyle>
              //         {({ getFieldValue }) => {
              //           const action = getFieldValue('action');
              //           if (action === 'cover') {
              //             return (
              //               <Form.Item label={changetoText}>
              //                 <Form.List name='callbacks' initialValue={[{}]}>
              //                   {(fields, { add, remove }, { errors }) => (
              //                     <>
              //                       {fields.map((field, index) => (
              //                         <Row gutter={[10, 0]} key={field.key}>
              //                           <Col span={22}>
              //                             <Form.Item name={[field.name, 'url']}>
              //                               <Input />
              //                             </Form.Item>
              //                           </Col>

              //                           <Col span={1}>
              //                             <MinusCircleOutlined className='control-icon-normal' onClick={() => remove(field.name)} />
              //                           </Col>
              //                         </Row>
              //                       ))}
              //                       <PlusCircleOutlined className='control-icon-normal' onClick={() => add()} />
              //                     </>
              //                   )}
              //                 </Form.List>
              //               </Form.Item>
              //             );
              //           } else if (action === 'callback_add') {
              //             return (
              //               <Form.Item name='callbacks' label={t('batch.update.callback_cover.callback_add')}>
              //                 <Input />
              //               </Form.Item>
              //             );
              //           } else if (action === 'callback_del') {
              //             return (
              //               <Form.Item name='callbacks' label={t('batch.update.callback_cover.callback_del')}>
              //                 <Input />
              //               </Form.Item>
              //             );
              //           }
              //         }}
              //       </Form.Item>
              //     </>
              //   );
              // case 'append_tags':
              //   return (
              //     <>
              //       <Form.Item label={t('append_tags')} name='append_tags' rules={[isValidFormat]}>
              //         <Select
              //           mode='tags'
              //           tokenSeparators={[' ']}
              //           open={false}
              //           placeholder={t('append_tags_placeholder')}
              //           tagRender={tagRender}
              //         />
              //       </Form.Item>
              //     </>
              //   );
              case 'effective_time':
                return (
                  <>
                    <Form.Item
                      label={changetoText}
                      name='effective_time'
                      rules={[
                        {
                          required: true,
                          message: t('batch.update.effective_time_msg'),
                        },
                      ]}
                    >
                      <Form.List name='effective_time'>
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <Space
                                key={key}
                                style={{
                                  display: 'flex',
                                  marginBottom: 8,
                                }}
                                align='baseline'
                              >
                                <Form.Item
                                  {...restField}
                                  name={[name, 'enable_days_of_week']}
                                  style={{
                                    width: 450,
                                  }}
                                  rules={[
                                    {
                                      required: true,
                                      message: t('effective_time_week_msg'),
                                    },
                                  ]}
                                >
                                  <Select mode='multiple'>{enableDaysOfWeekOptions}</Select>
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'enable_stime']}
                                  rules={[
                                    {
                                      required: true,
                                      message: t('effective_time_start_msg'),
                                    },
                                  ]}
                                >
                                  <TimePicker format='HH:mm' />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'enable_etime']}
                                  rules={[
                                    {
                                      required: true,
                                      message: t('effective_time_end_msg'),
                                    },
                                  ]}
                                >
                                  <TimePicker format='HH:mm' />
                                </Form.Item>
                                <MinusCircleOutlined onClick={() => remove(name)} />
                              </Space>
                            ))}
                            <Form.Item>
                              <Button type='dashed' onClick={() => add()} block icon={<PlusOutlined />}>
                                {t('batch.update.effective_time_add')}
                              </Button>
                            </Form.Item>
                          </>
                        )}
                      </Form.List>
                    </Form.Item>
                  </>
                );
              default:
                return null;
            }
          })()}
        </Form>
      </Modal>
    </>
  );
};

export default editModal;
