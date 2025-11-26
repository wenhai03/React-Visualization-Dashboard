/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React, { useState, useEffect, useContext } from 'react';
import { Form, Input, Button, Modal, Row, Col, message, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import { UpdateProfile } from '@/services/account';

export default function Info() {
  const { t } = useTranslation('account');
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { profile, setProfile } = useContext(CommonStateContext);
  const [selectAvatar, setSelectAvatar] = useState<string>(profile.portrait || '/image/avatar1.png');
  const [customAvatar, setCustomAvatar] = useState('');
  useEffect(() => {
    const { id, nickname, email, phone, contacts, portrait } = profile;
    form.setFieldsValue({
      nickname,
      email,
      phone,
      contacts,
    });
    if (portrait?.startsWith('http')) {
      setCustomAvatar(portrait);
    }
  }, [profile]);

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      updateProfile();
    } catch (err) {
      console.log(err);
    }
  };

  const handleOk = () => {
    if (customAvatar) {
      if (!customAvatar.startsWith('http')) {
        message.error(t('pictureMsg'));
        return;
      }

      fetch(customAvatar, { mode: 'no-cors' })
        .then(() => {
          setIsModalVisible(false);
          handleSubmit();
        })
        .catch((err) => {
          message.error(err);
        });
    } else {
      setIsModalVisible(false);
      handleSubmit();
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const updateProfile = () => {
    const { nickname, email, phone, moreContacts } = form.getFieldsValue();
    let { contacts } = form.getFieldsValue();

    if (moreContacts && moreContacts.length > 0) {
      _.forEach(moreContacts, (item) => {
        const { key, value } = item;

        if (key && value) {
          if (contacts) {
            contacts[key] = value;
          } else {
            contacts = {
              [key]: value,
            };
          }
        }
      });
    }

    for (let key in contacts) {
      if (!contacts[key]) {
        delete contacts[key];
      }
    }

    const newData = {
      ...profile,
      portrait: customAvatar || selectAvatar,
      nickname,
      email,
      phone,
      contacts,
    };

    UpdateProfile(newData).then(() => {
      setProfile(newData);
      message.success(t('common:success.modify'));
    });
  };

  const avatarList = new Array(8).fill(0).map((_, i) => i + 1);

  const handleImgClick = (i) => {
    setSelectAvatar(`/image/avatar${i}.png`);
  };

  return (
    <>
      <Form form={form} layout='vertical'>
        <Row gutter={16} className='info-line-spacing'>
          <Col span={20}>
            <div className='info-line-spacing'>
              <label>{t('common:profile.username')}：</label>
              <span>{profile.username}</span>
            </div>
            <div className='info-line-spacing'>
              <label>{t('common:profile.role')}：</label>
              <span>{profile.roles?.join(', ')}</span>
            </div>
            <Form.Item label={<span>{t('common:profile.nickname')}：</span>} name='nickname'>
              <Input disabled={profile.type === 200} />
            </Form.Item>
            <Form.Item label={<span>{t('common:profile.email')}：</span>} name='email'>
              <Input />
            </Form.Item>
            <Form.Item label={<span>{t('common:profile.phone')}：</span>} name='phone'>
              <Input />
            </Form.Item>
            <div className='info-line-spacing'>
              <label>{t('common:profile.wecom')}：</label>
              <span>{profile.wecom_id || '-'}</span>
            </div>
            <div className='info-line-spacing'>
              <label>{t('common:profile.idm')}：</label>
              <span>{profile.idm_id || '-'}</span>
            </div>
            <div className='info-line-spacing'>
              <label>{t('common:owning_team')}：</label>
              <span>
                {profile.user_groups?.length
                  ? profile.user_groups.map((item) => (
                      <Tag color='blue' key={item.id} style={{ marginBottom: '10px' }}>
                        {item.name}
                      </Tag>
                    ))
                  : '-'}
              </span>
            </div>
            <div className='info-line-spacing'>
              <label>{t('common:owning_business_group')}：</label>
              <span>
                {profile.busi_groups?.length
                  ? profile.busi_groups.map((item) => (
                      <Tag
                        color={item.perm === 'ro' ? 'default' : 'blue'}
                        key={item.id}
                        style={{ marginBottom: '10px' }}
                      >
                        {`${item.name}${item.perm === 'ro' ? '（只读）' : ''}`}
                      </Tag>
                    ))
                  : '-'}
              </span>
            </div>
            <Form.Item>
              <Button type='primary' onClick={handleSubmit}>
                {t('save')}
              </Button>
            </Form.Item>
          </Col>
          <Col span={4}>
            <div className='avatar'>
              <img src={profile.portrait || '/image/avatar1.png'} />
              <Button type='primary' className='update-avatar' onClick={() => setIsModalVisible(true)}>
                {t('editPicture')}
              </Button>
            </div>
          </Col>
        </Row>
      </Form>
      <Modal
        title={t('editPicture')}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        wrapClassName='avatar-modal'
      >
        <div className='avatar-content'>
          {avatarList.map((i) => {
            return (
              <div
                key={i}
                className={`/image/avatar${i}.png` === selectAvatar ? 'avatar active' : 'avatar'}
                onClick={() => handleImgClick(i)}
              >
                <img src={`/image/avatar${i}.png`} />
              </div>
            );
          })}
        </div>
        <Input
          addonBefore={<span>{t('pictureURL')}:</span>}
          onChange={(e) => setCustomAvatar(e.target.value)}
          value={customAvatar}
        />
      </Modal>
    </>
  );
}
