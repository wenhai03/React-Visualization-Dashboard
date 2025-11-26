import React, { useEffect, useState, useImperativeHandle, ReactNode, useContext } from 'react';
import { Form, Input, Select, Tag, Row, Col } from 'antd';
import { CommonStateContext } from '@/App';
import { getUserInfo, getTeamInfoList } from '@/services/manage';
import { UserAndPasswordFormProps, Contacts, User } from '@/store/manageInterface';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';

const UserForm = React.forwardRef<ReactNode, UserAndPasswordFormProps>((props, ref) => {
  const { t } = useTranslation('user');
  const { profile } = useContext(CommonStateContext);
  const { userId } = props;
  const [form] = Form.useForm();
  const [teamList, setTeamList] = useState([]);
  const [initialValues, setInitialValues] = useState<any>({
    status: 100,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useImperativeHandle(ref, () => ({
    form: form,
  }));
  useEffect(() => {
    if (userId) {
      getUserInfoDetail(userId);
    } else {
      setLoading(false);
    }
    if (profile.admin) {
      // 管理员 获取团队列表
      getTeamInfoList({ query: '', limit: 2000 }).then((data) => {
        setTeamList(data.dat || []);
      });
    }
  }, []);

  const getUserInfoDetail = (id: number) => {
    getUserInfo(id).then((data: User) => {
      let contacts: Array<Contacts> = [];

      if (data.contacts) {
        Object.keys(data.contacts).forEach((item: string) => {
          let val: Contacts = {
            key: item,
            value: data.contacts[item],
          };
          contacts.push(val);
        });
      }
      const owning_user_groups = data.user_groups.map((item) => item.id);

      setInitialValues(
        Object.assign({}, data, {
          contacts,
          user_groups: owning_user_groups,
          old_user_groups: data.user_groups,
        }),
      );
      setLoading(false);
    });
  };

  return !loading ? (
    <Form layout='vertical' form={form} initialValues={initialValues} preserve={false}>
      <Row gutter={24}>
        <Col span={12}>
          <Form.Item
            label={t('common:profile.username')}
            name='username'
            initialValue={initialValues?.username}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={t('common:profile.nickname')} name='nickname'>
            <Input />
          </Form.Item>
        </Col>
      </Row>
      {!userId && (
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name='password'
              label={t('common:password.name')}
              rules={[
                {
                  required: true,
                },
                {
                  validator: (_, value) => {
                    const reg =
                      /^(?![A-Za-z]+$)(?![A-Z\d]+$)(?![A-Z\W]+$)(?![a-z\d]+$)(?![a-z\W]+$)(?![\d\W]+$)\S{8,}$/;
                    return !value || reg.test(value)
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error('密码必须包含数字、小写字母、大写字母、特殊符号中的三种及以上且长度不小于8'),
                        );
                  },
                },
              ]}
              hasFeedback
            >
              <Input.Password />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name='confirm'
              label={t('common:password.confirm')}
              dependencies={['password']}
              hasFeedback
              rules={[
                {
                  required: true,
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }

                    return Promise.reject(new Error(t('common:password.notMatch')));
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>
          </Col>
        </Row>
      )}
      <Row gutter={24}>
        <Col span={12}>
          <Form.Item label={t('white_ip')} name='white_ip'>
            <Select mode='tags' open={false} placeholder={t('white_ip_placeholder')} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={t('account_status')} name='status'>
            <Select>
              <Select.Option value={100}>{t('normal')}</Select.Option>
              <Select.Option value={200}>{t('unauthorized')}</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={12}>
          <Form.Item label={t('common:profile.email')} name='email'>
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={t('common:profile.phone')} name='phone'>
            <Input />
          </Form.Item>
        </Col>
      </Row>
      {userId && (
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label={t('common:profile.wecom')}>
              <div>{initialValues?.wecom_id || '-'}</div>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label={t('common:profile.idm')}>
              <div>{initialValues?.idm_id || '-'}</div>
            </Form.Item>
          </Col>
        </Row>
      )}
      <Form.Item label={t('common:owning_team')} name='user_groups'>
        <Select mode='multiple' showSearch optionFilterProp='children'>
          {teamList.map((item: any) => (
            <Select.Option value={item.id} key={item.id} showSearch>
              {item.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      {profile.admin && initialValues?.id && (
        <>
          <Form.Item label={t('common:owning_team')} name='old_user_groups' hidden>
            <div />
          </Form.Item>
          <Form.Item label={t('common:owning_business_group')}>
            {initialValues?.busi_groups?.length
              ? initialValues.busi_groups.map((item) => (
                  <Tag color={item.perm === 'ro' ? 'default' : 'blue'} key={item.id} style={{ marginBottom: '10px' }}>
                    {`${item.name}${item.perm === 'ro' ? '（只读）' : ''}`}
                  </Tag>
                ))
              : '-'}
          </Form.Item>
          <Form.Item label={t('attribution_role')}>
            {initialValues?.roles?.length
              ? initialValues.roles.map((item) => (
                  <Tag color='blue' key={item} style={{ marginBottom: '10px' }}>
                    {item}
                  </Tag>
                ))
              : '-'}
          </Form.Item>
        </>
      )}
    </Form>
  ) : null;
});
export default UserForm;
