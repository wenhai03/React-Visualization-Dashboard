import React, { useEffect, useState, useImperativeHandle, ReactNode, useCallback, useRef, useContext } from 'react';
import { Form, Input, Select, Switch, Tag, Space, Button, Modal, message, Checkbox } from 'antd';
import { MinusCircleOutlined, PlusOutlined, CaretDownOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { getBusinessTeamInfo, getTeamInfoList, createTeam, getNotifiesList, getRoles } from '@/services/manage';
import _ from 'lodash';
import { TeamProps, Team, ActionType } from '@/store/manageInterface';
import { useTranslation, Trans } from 'react-i18next';
import { debounce } from 'lodash';
import { CommonStateContext } from '@/App';
import TeamForm from '../teamForm';

const { Option } = Select;
const BusinessForm = React.forwardRef<ReactNode, TeamProps>((props, ref) => {
  const { t } = useTranslation('user');
  const { profile } = useContext(CommonStateContext);
  const { businessId, action } = props;
  const [form] = Form.useForm();
  const [userTeam, setUserTeam] = useState<Team[]>([]);
  const [contactList, setContactList] = useState<{ key: string; label: string }[]>([]);
  // 角色下拉列表
  const [roleList, setRoleList] = useState<{ id: number; name: string; note: string }[]>([]);
  const [initialValues, setInitialValues] = useState<any>({
    label_enable: false,
    label_value: '',
    extra: {
      public: false,
    },
    name: '',
    rawExtra: {
      public: false,
    },
    alert_notify: {
      notify_channels: [] as string[],
      notify_groups: [] as string[],
    },
    members: [
      {
        notify_group: true,
        perm_flag: true,
      },
    ],
  });
  const [visible, setVisible] = useState(false);
  const teamRef = useRef(null as any);
  const [loading, setLoading] = useState<boolean>(true);
  const [refresh, setRefresh] = useState(true);
  useImperativeHandle(ref, () => ({
    form: form,
  }));

  useEffect(() => {
    if (businessId && action === ActionType.EditBusiness) {
      getTeamInfoDetail(businessId);
    } else {
      setLoading(false);
    }
  }, []);

  const getTeamInfoDetail = (id: number) => {
    getBusinessTeamInfo(id).then(
      (data: {
        name: string;
        label_enable: number;
        label_value: string;
        user_groups: { perm_flag: string; user_group: { id: number } }[];
        extra: { public: boolean };
        alert_notify: {
          notify_channels: string[] | null;
          notify_groups: string[] | null;
        };
      }) => {
        setInitialValues({
          name: data.name,
          label_enable: data.label_enable === 1,
          label_value: data.label_value,
          extra: data.extra,
          rawExtra: data.extra,
          alert_notify: {
            notify_channels: data.alert_notify.notify_channels ?? [],
            notify_groups: data.alert_notify.notify_groups ?? [],
          },
        });
        setLoading(false);
      },
    );
  };

  const handleTeamOk = () => {
    let form = teamRef.current.form;
    form.validateFields().then((values) => {
      let params = { ...values };
      createTeam(params).then((res) => {
        message.success(t('common:success.create'));
        setVisible(false);
        // 重新渲染团队列表
        getList('', res);
        form.resetFields();
      });
    });
  };

  useEffect(() => {
    getList('');
    getNotifiesList().then((res) => {
      setContactList(res || []);
    });
  }, []);

  const getList = (str: string, createId?: number) => {
    getTeamInfoList({ query: str }).then((res) => {
      setUserTeam(res.dat);
      if (createId) {
        // 自动绑定新创建的业务组
        const members = form.getFieldValue('members') || [];
        form.setFieldsValue({
          members: [...members, { notify_group: true, user_group_id: createId, perm_flag: true }],
        });
      }
    });
  };

  useEffect(() => {
    getRoles().then((res) => setRoleList(res));
  }, []);

  const debounceFetcher = useCallback(debounce(getList, 800), []);

  return !loading ? (
    <>
      <Form layout='vertical' form={form} initialValues={initialValues} preserve={false}>
        {action !== ActionType.AddBusinessMember && (
          <>
            <Form.Item name='rawExtra' hidden>
              <div />
            </Form.Item>
            <Form.Item
              label={t('business.name')}
              name='name'
              rules={[
                {
                  required: true,
                },
              ]}
              tooltip={{
                title: <pre style={{ margin: 0 }}>{t('business.name_tip')}</pre>,
                overlayInnerStyle: { width: '300px' },
              }}
            >
              <Input disabled={!profile?.admin} placeholder='集团名-公司部门名-系统名-环境名' />
            </Form.Item>
            {profile.admin && (
              <>
                <Form.Item
                  label={t('business.public')}
                  name={['extra', 'public']}
                  valuePropName='checked'
                  tooltip={{ title: t('business.public_tip'), getPopupContainer: () => document.body }}
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  label={t('business.super')}
                  name={['extra', 'super']}
                  valuePropName='checked'
                  tooltip={{ title: t('business.super_tip'), getPopupContainer: () => document.body }}
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  label={t('business.api_enable')}
                  name={['extra', 'api']}
                  valuePropName='checked'
                  tooltip={{ title: t('business.api_enable_tip'), getPopupContainer: () => document.body }}
                >
                  <Switch />
                </Form.Item>
              </>
            )}
            <Form.Item
              label={t('business.label_enable')}
              name='label_enable'
              valuePropName='checked'
              tooltip={{ title: t('business.label_enable_tip'), getPopupContainer: () => document.body }}
            >
              <Switch />
            </Form.Item>
            {action === ActionType.CreateBusiness && (
              <Form.Item
                label={t('common:notify_channels.title')}
                name={['alert_notify', 'notify_channels']}
                tooltip={t('common:notify_channels.tip')}
                rules={[
                  {
                    required: true,
                    message: t('common:notify_channels.required_tip'),
                  },
                ]}
              >
                <Checkbox.Group>
                  {contactList.map((item) => {
                    return (
                      <Checkbox value={item.key} key={item.label}>
                        {item.label}
                      </Checkbox>
                    );
                  })}
                </Checkbox.Group>
              </Form.Item>
            )}
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, curValues) => prevValues.label_enable !== curValues.label_enable}
            >
              {({ getFieldValue }) => {
                return (
                  getFieldValue('label_enable') && (
                    <Form.Item
                      label={t('business.label_value')}
                      name='label_value'
                      rules={[
                        {
                          required: true,
                        },
                      ]}
                      tooltip={{
                        title: (
                          <Trans
                            ns='user'
                            i18nKey='business.label_value_tip'
                            values={{
                              val: form.getFieldValue('label_value'),
                            }}
                          >
                            <span>
                              尽量用英文，不能与其他业务组标识重复，系统会自动生成{' '}
                              <Tag color='blue'>busigroup={form.getFieldValue('label_value')}</Tag> 的标签
                            </span>
                          </Trans>
                        ),
                        getPopupContainer: () => document.body,
                      }}
                    >
                      <Input
                        onChange={(val) => {
                          setRefresh(!refresh);
                        }}
                      />
                    </Form.Item>
                  )
                );
              }}
            </Form.Item>
          </>
        )}

        {(action === ActionType.CreateBusiness || action === ActionType.AddBusinessMember) && (
          <Form.Item required>
            <Form.List name='members'>
              {(fields, { add, remove }) => (
                <>
                  <Space align='baseline'>
                    {t('business.binding_team')}
                    <PlusCircleOutlined className='control-icon-normal' onClick={() => add({ notify_group: true })} />
                  </Space>
                  {fields.map(({ key, name, fieldKey, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align='baseline'>
                      <Form.Item
                        style={{ width: 450 }}
                        {...restField}
                        name={[name, 'user_group_id']}
                        rules={[{ required: true, message: t('业务组团队不能为空！') }]}
                      >
                        <Select
                          suffixIcon={<CaretDownOutlined />}
                          style={{ width: '100%' }}
                          filterOption={false}
                          onSearch={(e) => debounceFetcher(e)}
                          showSearch
                          onBlur={() => getList('')}
                        >
                          {userTeam.map((team) => (
                            <Option key={team.id} value={team.id}>
                              {team.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'perm_flag']} valuePropName='checked'>
                        <Switch
                          checkedChildren={t('business.perm_flag_1')}
                          unCheckedChildren={t('business.perm_flag_0')}
                        />
                      </Form.Item>
                      {action !== ActionType.AddBusinessMember && (
                        <Form.Item {...restField} name={[name, 'notify_group']} valuePropName='checked'>
                          <Switch
                            checkedChildren={t('business.has_notify_group')}
                            unCheckedChildren={t('business.no_notify_group')}
                          />
                        </Form.Item>
                      )}
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type='dashed' onClick={() => setVisible(true)} block icon={<PlusOutlined />}>
                      {t('team.create')}
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form.Item>
        )}
      </Form>
      <Modal
        forceRender
        title={t('business.team_name')}
        visible={visible}
        width={400}
        onOk={handleTeamOk}
        onCancel={() => {
          teamRef.current.form.resetFields();
          setVisible(false);
        }}
      >
        <TeamForm ref={teamRef} roleList={roleList} />
      </Modal>
    </>
  ) : null;
});
export default BusinessForm;
