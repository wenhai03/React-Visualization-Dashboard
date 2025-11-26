import React, { useEffect, useState, useImperativeHandle, ReactNode, useContext } from 'react';
import { Form, Input, Select, Space, Row, Col } from 'antd';
import { MinusCircleOutlined, PlusCircleOutlined, CaretDownOutlined } from '@ant-design/icons';
import { getNotifyChannels } from '@/services/manage';
import _ from 'lodash';
import { Link } from 'react-router-dom';
import { CommonStateContext } from '@/App';
import { getTeamInfo } from '@/services/manage';
import { TeamProps, Team, TeamInfo } from '@/store/manageInterface';
import { useTranslation } from 'react-i18next';
import { ContactsItem } from '@/store/manageInterface';

const TeamForm = React.forwardRef<ReactNode, TeamProps>((props, ref) => {
  const { t } = useTranslation('user');
  const { teamId, roleList } = props;
  const [form] = Form.useForm();
  const [contactsList, setContactsList] = useState<ContactsItem[]>([]);
  const [initialValues, setInitialValues] = useState<Team>();
  const [loading, setLoading] = useState<boolean>(true);
  const { profile } = useContext(CommonStateContext);
  useImperativeHandle(ref, () => ({
    form: form,
  }));
  useEffect(() => {
    if (teamId) {
      getTeamInfoDetail(teamId);
    } else {
      setLoading(false);
    }
    getContacts();
  }, []);

  const getContacts = () => {
    getNotifyChannels().then((data: Array<ContactsItem>) => {
      setContactsList(data);
    });
  };

  const getTeamInfoDetail = (id: number) => {
    getTeamInfo(id).then((data: TeamInfo) => {
      setInitialValues(data.user_group);
      setLoading(false);
    });
  };

  return !loading ? (
    <Form layout='vertical' form={form} initialValues={initialValues} preserve={false}>
      <Form.Item
        label={t('common:table.name')}
        name='name'
        rules={[
          {
            required: true,
          },
        ]}
        tooltip={{ title: <pre style={{ margin: 0 }}>{t('team.name_tip')}</pre>, overlayInnerStyle: { width: '340px' } }}
      >
        <Input disabled={!profile?.admin} placeholder='集团名-公司部门名-系统名-环境名-角色名' />
      </Form.Item>
      <Form.Item
        label={t('roles')}
        name='role_ids'
        rules={[
          {
            required: true,
          },
        ]}
      >
        <Select mode='multiple' disabled={!profile?.admin} className='select-roles'>
          {roleList?.map((item, index) => (
            <Select.Option value={item.id} key={index}>
              <div>
                <div>{item.name}</div>
                <div className='roles-note'>{item.note}</div>
              </div>
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item label={t('common:table.note')} name='note'>
        <Input />
      </Form.Item>
      <Form.Item
        label={
          <Space>
            {t('common:profile.moreContact')}
            {profile.admin && (
              <Link to='/help/notification-settings?tab=contacts' target='_blank'>
                {t('common:profile.moreContactLinkToSetting')}
              </Link>
            )}
          </Space>
        }
      >
        <Form.List name='contacts'>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, fieldKey, ...restField }) => (
                <Row gutter={8} wrap={false} key={key}>
                  <Col flex='180px'>
                    <Form.Item
                      {...restField}
                      name={[name, 'key']}
                      rules={[
                        {
                          required: true,
                          message: t('common:profile.moreContactPlaceholder'),
                        },
                      ]}
                    >
                      <Select
                        suffixIcon={<CaretDownOutlined />}
                        placeholder={t('common:profile.moreContactPlaceholder')}
                      >
                        {_.map(contactsList, (item, index) => (
                          <Select.Option value={item.key} key={index}>
                            {item.label}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col flex='auto'>
                    <Form.Item
                      {...restField}
                      name={[name, 'value']}
                      rules={[
                        {
                          required: true,
                          message: t('common:profile.moreContactValueRequired'),
                        },
                      ]}
                    >
                      <Input placeholder={t('common:profile.moreContactValuePlaceholder')} />
                    </Form.Item>
                  </Col>
                  <Col flex='30px'>
                    <MinusCircleOutlined className='control-icon-normal' onClick={() => remove(name)} />
                  </Col>
                </Row>
              ))}
              <PlusCircleOutlined className='control-icon-normal' onClick={() => add()} />
            </>
          )}
        </Form.List>
      </Form.Item>
    </Form>
  ) : null;
});
export default TeamForm;
