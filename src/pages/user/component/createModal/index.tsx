import React, { useRef, useState, useContext } from 'react';
import { Modal, message, Button, Checkbox, Typography } from 'antd';
import { CommonStateContext } from '@/App';
import UserForm from '../userForm';
import TeamForm from '../teamForm';
import BusinessForm from '../businessForm';
import PasswordForm from '../passwordForm';
import AddUser from '../addUser';
import AddHost from '../AddHost';
import BusinessAPIForm from '../businessAPI';
import {
  createUser,
  createTeam,
  changeUserInfo,
  changeTeamInfo,
  changeUserPassword,
  addTeamUser,
  createBusinessTeam,
  changeBusinessTeam,
  addBusinessMember,
  addAPIConfig,
  updateAPIConfig,
} from '@/services/manage';
import { moveTargetBusi } from '@/services/targets';
import { ModalProps, User, Team, UserType, ActionType, Contacts } from '@/store/manageInterface';
import { useTranslation } from 'react-i18next';

const CreateModal: React.FC<ModalProps> = (props: ModalProps) => {
  const { t } = useTranslation('user');
  const { visible, userType, onClose, action, userId, teamId, onSearch, width, roleList, apiId } = props;
  const { profile, setProfile } = useContext(CommonStateContext);
  const [selectedUser, setSelectedUser] = useState<string[]>();
  const [selectedHost, setSelectedHost] = useState<string[]>();
  const userRef = useRef(null as any);
  const teamRef = useRef(null as any);
  const passwordRef = useRef(null as any);
  const isBusinessForm =
    userType === 'business' &&
    (action === ActionType.CreateBusiness ||
      action === ActionType.AddBusinessMember ||
      action === ActionType.EditBusiness);
  const isUserForm: boolean =
    (action === ActionType.CreateUser || action === ActionType.EditUser) && userType === UserType.User ? true : false;
  const isTeamForm: boolean =
    (action === ActionType.CreateTeam || action === ActionType.EditTeam) && userType === UserType.Team ? true : false;
  const isPasswordForm: boolean = action === ActionType.Reset ? true : false;
  const isAddUser: boolean = action === ActionType.AddUser ? true : false;
  const isAddHost: boolean = action === ActionType.AddHost ? true : false;
  const isBussinessAPI: boolean = action === ActionType.AddAPI || action === ActionType.EditAPI ? true : false;
  const [confirmChecked, setConfirmChecked] = useState(false);

  const onOk = async (val?: string) => {
    if (isUserForm) {
      let form = userRef.current.form;
      const values: any = await form.validateFields();
      let contacts = {};
      values.contacts &&
        values.contacts.forEach((item: Contacts) => {
          contacts[item.key] = item.value;
        });
      let user_groups = [];
      user_groups =
        values.user_groups &&
        values.user_groups.map((item: Contacts) => ({
          id: item,
        }));

      if (action === ActionType.CreateUser) {
        createUser({ ...values, contacts, user_groups, confirm: undefined }).then((_) => {
          message.success(t('common:success.add'));
          onClose(true);
        });
      }

      if (action === ActionType.EditUser && userId) {
        const last_number_user_group = values.old_user_groups
          .filter((item) => !values.user_groups.includes(item.id) && item.user_number === 1)
          .map((item) => item.name);
        delete values.old_user_groups;
        if (last_number_user_group.length > 0) {
          Modal.confirm({
            content: `${last_number_user_group.join('、')} ${t('team.last_member_tip')}`,
            okText: t('common:btn.ok'),
            cancelText: t('common:btn.cancel'),
            onOk: () => {
              changeUserInfo(userId, { ...values, contacts, user_groups, confirm: undefined }).then((_) => {
                message.success(t('common:success.modify'));
                if (profile.id === Number(userId)) {
                  setProfile({ ...profile, ...values });
                }
                onClose(true);
              });
            },
            onCancel: () => {},
          });
        } else {
          changeUserInfo(userId, { ...values, contacts, user_groups, confirm: undefined }).then((_) => {
            message.success(t('common:success.modify'));
            if (profile.id === Number(userId)) {
              setProfile({ ...profile, ...values });
            }
            onClose(true);
          });
        }
      }
    }

    if (isTeamForm) {
      let form = teamRef.current.form;
      const values: Team = await form.validateFields();
      let params = { ...values };

      if (action === ActionType.CreateTeam) {
        createTeam(params).then((_) => {
          message.success(t('common:success.add'));
          onClose(true);

          if (val === 'search') {
            onSearch(params.name);
          }
        });
      }

      if (action === ActionType.EditTeam && teamId) {
        changeTeamInfo(teamId, params).then((_) => {
          message.success(t('common:success.modify'));
          onClose('updateName');
        });
      }
    }

    if (isPasswordForm && userId) {
      let form = passwordRef.current.form;
      const values = await form.validateFields();
      let params = { ...values };
      changeUserPassword(userId, params).then((_) => {
        message.success(t('common:password.resetSuccess'));
        onClose();
      });
    }

    if (isAddUser && teamId) {
      let params = {
        ids: selectedUser,
      };
      addTeamUser(teamId, params).then((_) => {
        message.success(t('common:success.add'));
        onClose('updateMember');
      });
    }

    if (isAddHost && teamId) {
      moveTargetBusi({ bgid: Number(teamId), idents: selectedHost }).then(() => {
        message.success(t('common:success.add'));
        onClose('addHost');
      });
    }

    if (isBusinessForm) {
      let form = teamRef.current.form;
      const { name, members, label_enable, label_value, extra, rawExtra, alert_notify } = await form.validateFields();
      const notify_groups =
        members?.filter((item) => item.notify_group).map((item) => item.user_group_id.toString()) || [];

      let params = {
        name,
        label_enable: label_enable ? 1 : 0,
        label_value,
        extra,
        members: members
          ? members.map(({ perm_flag, user_group_id }) => ({
              user_group_id,
              perm_flag: perm_flag ? 'rw' : 'ro',
            }))
          : undefined,
        alert_notify: alert_notify
          ? { notify_channels: alert_notify.notify_channels, notify_groups: [...new Set(notify_groups)] }
          : undefined,
      };

      if (action === ActionType.CreateBusiness) {
        createBusinessTeam(params).then((res) => {
          message.success(t('common:success.add'));
          onClose('create');
          onSearch(res);
        });
      }

      if (action === ActionType.EditBusiness && teamId) {
        if (rawExtra?.public && !extra?.public) {
          Modal.confirm({
            content: t('business.public_close_second_confirm'),
            okText: t('common:btn.ok'),
            cancelText: t('common:btn.cancel'),
            onOk: async () => {
              changeBusinessTeam(teamId, params).then((_) => {
                message.success(t('common:success.modify'));
                onClose('update');
              });
            },
            onCancel: () => {},
          });
        } else {
          changeBusinessTeam(teamId, params).then((_) => {
            message.success(t('common:success.modify'));
            onClose('update');
          });
        }
      }

      if (action === ActionType.AddBusinessMember && teamId) {
        const params = members.map(({ perm_flag, user_group_id }) => ({
          user_group_id,
          perm_flag: perm_flag ? 'rw' : 'ro',
          busi_group_id: Number(teamId),
        }));
        addBusinessMember(teamId, params).then((_) => {
          message.success(t('common:success.add'));
          onClose('addMember');
        });
      }
    }

    if (isBussinessAPI && teamId) {
      let form = teamRef.current.form;
      const { id, user, expire_at, status, note, perpetuity } = await form.validateFields();
      let params = {
        user,
        expire_at: perpetuity ? -1 : expire_at.endOf('day').unix(),
        status,
        note,
      };

      if (action == ActionType.AddAPI && teamId) {
        addAPIConfig(teamId, params).then((res) => {
          message.success(t('common:success.add'));
          onClose('addAPI');
          let modalInstance = Modal.info({
            width: 500,
            content: (
              <div>
                <div>{t('business.password_tip')}</div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div>
                    {t('common:profile.account')}：
                    <Typography.Paragraph
                      copyable
                      code
                      style={{ fontSize: '16px', margin: '10px 0', display: 'inline-block' }}
                    >
                      {res.user}
                    </Typography.Paragraph>
                  </div>
                  <div>
                    {t('common:password.name')}：
                    <Typography.Paragraph
                      copyable
                      code
                      style={{ fontSize: '16px', margin: '10px 0', display: 'inline-block' }}
                    >
                      {res.password}
                    </Typography.Paragraph>
                  </div>
                  <div>
                    <Checkbox
                      value={confirmChecked}
                      onChange={(e) => {
                        const newChecked = e.target.checked;
                        setConfirmChecked(newChecked);
                        // 每次勾选时更新弹窗内容
                        modalInstance.update((prevConfig) => ({
                          ...prevConfig,
                          okButtonProps: { disabled: !newChecked },
                        }));
                      }}
                    >
                      {t('business.confirm_tip')}
                    </Checkbox>
                  </div>
                </div>
              </div>
            ),
            okText: t('common:btn.ok'),
            okButtonProps: { disabled: !confirmChecked },
            onOk: () => modalInstance?.destroy(),
          });
        });
      }

      if (action == ActionType.EditAPI && teamId) {
        updateAPIConfig(teamId, { ...params, id: id }).then(() => {
          message.success(t('common:success.modify'));
          onClose('editAPI');
        });
      }
    }
  };

  const actionLabel = () => {
    if (action === ActionType.CreateUser) {
      return t('user.create');
    }
    if (action === ActionType.CreateTeam) {
      return t('team.create');
    }
    if (action === ActionType.CreateBusiness) {
      return t('business.create');
    }
    if (action === ActionType.AddBusinessMember) {
      return t('business.binding_team');
    }
    if (action === ActionType.EditBusiness) {
      return t('business.edit');
    }
    if (action === ActionType.EditUser) {
      return t('user.edit');
    }
    if (action === ActionType.EditTeam) {
      return t('team.edit');
    }
    if (action === ActionType.Reset) {
      return t('common:password.reset');
    }
    if (action === ActionType.Disable) {
      return t('disbale');
    }
    if (action === ActionType.Undisable) {
      return t('enable');
    }
    if (action === ActionType.AddUser) {
      return t('team.add_member');
    }
    if (action === ActionType.AddHost) {
      return t('business.add_host');
    }
    if (action === ActionType.AddAPI) {
      return t('business.api_create');
    }
    if (action === ActionType.EditAPI) {
      return t('business.api_edit');
    }
  };

  return (
    <Modal
      title={actionLabel()}
      visible={visible}
      width={width ? width : 700}
      onCancel={() => onClose('cancel')}
      destroyOnClose={true}
      footer={[
        <Button key='back' onClick={() => onClose('cancel')}>
          {t('common:btn.cancel')}
        </Button>,
        <Button key='submit' type='primary' onClick={() => onOk()}>
          {t('common:btn.ok')}
        </Button>,
        action === ActionType.CreateTeam && (
          <Button type='primary' onClick={() => onOk('search')}>
            {t('ok_and_search')}
          </Button>
        ),
      ]}
    >
      {isUserForm && <UserForm ref={userRef} userId={userId} />}
      {isTeamForm && <TeamForm ref={teamRef} teamId={teamId} roleList={roleList} />}
      {isBusinessForm && <BusinessForm ref={teamRef} businessId={teamId} action={action} />}
      {isPasswordForm && <PasswordForm ref={passwordRef} userId={userId} />}
      {isAddUser && <AddUser teamId={teamId} onSelect={(val) => setSelectedUser(val)}></AddUser>}
      {isAddHost && <AddHost teamId={teamId} onSelect={(val) => setSelectedHost(val)}></AddHost>}
      {isBussinessAPI && <BusinessAPIForm ref={teamRef} teamId={teamId} apiId={apiId}></BusinessAPIForm>}
    </Modal>
  );
};

export default CreateModal;
