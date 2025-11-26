import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { Modal, Button, Input, Typography, Space, Select, Row, Col } from 'antd';
import { useTranslation } from 'react-i18next';
import { getUserInfoList } from '@/services/manage';
import './index.less';
import './locale';

interface IModal {
  visible: boolean;
  onCancel: () => void;
  mode: 'add' | 'edit';
  onCreateShareUrl?: (values: any) => Promise<string>;
  onEdit?: (values: any) => void;
  initialValues?: any;
}

const ShareChartModal: React.FC<IModal> = (props) => {
  const { visible, onCancel, onCreateShareUrl, onEdit, mode, initialValues } = props;
  const initialValueDefault: { size?: string; unit: 'h' | 'day'; user_ids: number[]; note: string } = {
    size: '',
    unit: 'h',
    user_ids: [],
    note: '',
  };
  const { t } = useTranslation('shareChart');
  const [formData, setFormData] = useState(initialValueDefault);
  const [userList, setUserList] = useState<any>([]);
  const [initialUsers, setInitialUsers] = useState<any>([]);
  const [shareUrl, setShareUrl] = useState<string>();
  const host = window.location.host;

  const handleChange = (val) => {
    setFormData({ ...formData, user_ids: val });
  };

  const handleInputNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value: inputValue } = e.target;
    const reg = /^\d*(\.\d*)?$/;
    if (reg.test(inputValue) || inputValue === '') {
      setFormData({ ...formData, size: inputValue });
    }
  };

  const handleBlur = () => {
    if (formData.size === '.') {
      setFormData({ ...formData, size: '' });
    }
  };

  useEffect(() => {
    if (visible) {
      getUserInfoList({
        limit: -1,
        status: 100,
      }).then((res) => {
        setUserList(res.dat.list);
        setInitialUsers(res.dat.list);
      });
      if (initialValues) {
        const time = Math.round(((initialValues.expiration - moment(new Date()).unix()) / 3600) * 10) / 10;
        setFormData({
          size: initialValues.expiration === -1 ? '' : time > 0 ? time.toString() : '0',
          unit: 'h',
          user_ids: initialValues.user_ids,
          note: initialValues.note,
        });
      }
    }
  }, [visible, initialValues]);

  const modalClose = () => {
    onCancel();
    setFormData(initialValueDefault);
    setShareUrl(undefined);
  };

  const createShareUrl = async () => {
    if (onCreateShareUrl) {
      const url = await onCreateShareUrl(formData);
      setShareUrl(url);
    }
  };

  // 修改分享信息
  const handleSubmit = () => {
    onEdit && onEdit(formData);
  };

  return (
    <Modal
      title={mode === 'edit' ? t('edit_share_record') : t('share_btn')}
      visible={visible}
      width={800}
      maskClosable={false}
      footer={[
        <Button onClick={modalClose}>{mode === 'edit' ? t('common:btn.cancel') : t('common:btn.close')}</Button>,
        ...(mode === 'edit'
          ? [
              <Button onClick={handleSubmit} type='primary'>
                {t('common:btn.save')}
              </Button>,
            ]
          : []),
      ]}
      onCancel={modalClose}
    >
      <Row gutter={[0, 18]}>
        <Col span={24}>
          <Row align='middle' gutter={8}>
            <Col flex='80px'>{t('limit_user_view')}</Col>
            <Col flex='auto'>
              <Select
                style={{ width: '100%' }}
                mode='multiple'
                allowClear
                showSearch
                optionFilterProp='searchLabel'
                value={formData.user_ids}
                placeholder={t('user_tip')}
                optionLabelProp='customLabel'
                options={userList.map((item) => ({
                  label: (
                    <Row gutter={8}>
                      <Col span={8}>{item.nickname}</Col>
                      <Col span={8} style={{ color: '#999999' }}>
                        {item.email}
                      </Col>
                      <Col span={8} style={{ color: '#999999' }}>
                        {item.phone}
                      </Col>
                    </Row>
                  ),
                  value: item.id,
                  // 展示用到字段
                  customLabel: item.nickname || item.email || item.idm_id || item.username,
                  // 搜索用到的字段
                  searchLabel: `${item.nickname}-${item.username}-${item.first_letter}-${item.py}`,
                }))}
                onBlur={() => setUserList(initialUsers)}
                onChange={handleChange}
              />
            </Col>
          </Row>
        </Col>
        <Col span={24}>
          <Row align='middle' gutter={8}>
            <Col flex='80px' style={{ textAlign: 'right' }}>
              {t('common:table.note')}
            </Col>
            <Col flex='auto'>
              <Input.TextArea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              />
            </Col>
          </Row>
        </Col>
        <Col span={24}>
          <Row align='middle' gutter={8}>
            <Col flex='80px' style={{ textAlign: 'right' }}>
              {t('cut_off_time')}
            </Col>
            <Col flex='auto'>
              <Input
                style={{ width: 220 }}
                value={formData.size}
                placeholder={t('expiration_placeholder')}
                onChange={handleInputNumberChange}
                onBlur={handleBlur}
                addonAfter={
                  <Select
                    style={{ width: 80 }}
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e })}
                  >
                    <Select.Option key='h' value='h'>
                      {t('common:interval.h')}
                    </Select.Option>
                    <Select.Option key='d' value='d'>
                      {t('common:interval.d')}
                    </Select.Option>
                  </Select>
                }
              />
            </Col>
          </Row>
        </Col>
        {mode === 'add' && (
          <Col span={24}>
            <Space>
              <Button onClick={createShareUrl} type='primary'>
                {t('access_link')}
              </Button>
              {shareUrl && (
                <Typography.Paragraph
                  copyable
                  code
                  style={{ fontSize: '16px', marginBottom: '0', color: '#1890ff', cursor: 'pointer' }}
                  onClick={() => {
                    window.open(shareUrl);
                  }}
                >
                  {host + shareUrl}
                </Typography.Paragraph>
              )}
            </Space>
          </Col>
        )}
      </Row>
    </Modal>
  );
};

export default ShareChartModal;
