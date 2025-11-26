import React, { useContext, useEffect, useState } from 'react';
import { Form, Select, Switch, TimePicker, Button, message, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { CommonStateContext } from '@/App';
import { getVersionSettings, setVersionSettings } from '@/services/config';

const UpgradeConfig: React.FC = () => {
  const { t } = useTranslation('collector');
  const { busiGroups } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  let defaultrRtList = [
    {
      label: t('script.upgrade_config.all'),
      value: '',
      disabled: false,
    },
    {
      label: t('common:physical_machine'),
      value: 'pm',
      disabled: false,
    },
    {
      label: t('common:virtual_machine'),
      value: 'vm',
      disabled: false,
    },
    {
      label: 'Docker',
      value: 'Docker',
      disabled: false,
    },
    {
      label: t('common:kubernetes'),
      value: 'ct-k8s',
      disabled: false,
    },
  ];
  const [rtList, setRtList] = useState(defaultrRtList);
  const [bgidList, setBgidList] = useState<{ label: string; value: number; disabled: boolean }[]>([]);
  useEffect(() => {
    getVersionSettings().then((res) => {
      if (res.success) {
        form.setFieldsValue({
          ...res.dat,
          upgrade: {
            ...res.dat.upgrade,
            upgrade_time: [
              moment(res.dat.upgrade.upgrade_start, 'HH:mm'),
              moment(res.dat.upgrade.upgrade_end, 'HH:mm'),
            ],
          },
        });
        changeRtKist(res.dat.upgrade.rts);
      }
    });
  }, []);

  const changeRtKist = (value) => {
    let newRtList = [...defaultrRtList];
    if (value.length && value.includes('')) {
      newRtList = defaultrRtList.map((item) => ({ ...item, disabled: item.value === '' ? item.disabled : true }));
    } else if (value.length && !value.includes('')) {
      newRtList[0].disabled = true;
    }
    setRtList(newRtList);
  };

  const changeBgidList = (value) => {
    const defaultBgidList = [
      { label: t('script.upgrade_config.all'), value: 0, disabled: false },
      ...busiGroups.map((item) => ({ label: item.name, value: item.id, disabled: false })),
    ];
    let newBgidList = [...defaultBgidList];
    if (value.length && value.includes(0)) {
      newBgidList = defaultBgidList.map((item) => ({
        ...item,
        disabled: item.value === 0 ? item.disabled : true,
      }));
    } else if (value.length && !value.includes(0)) {
      newBgidList[0].disabled = true;
    }
    setBgidList(newBgidList);
  };

  useEffect(() => {
    if (busiGroups) {
      const newBgidList = busiGroups.map((item) => ({ label: item.name, value: item.id, disabled: false }));
      setBgidList([{ label: t('script.upgrade_config.all'), value: 0, disabled: false }, ...newBgidList]);
    }
  }, [busiGroups]);

  return (
    <Form form={form} layout='vertical'>
      <Form.Item label={t('script.agent.default_version')} name='version' rules={[{ required: true }]}>
        <Input style={{ width: '400px' }} />
      </Form.Item>
      <Form.Item
        label={t('script.upgrade_config.auto_upgrade')}
        name={['upgrade', 'auto_upgrade']}
        valuePropName='checked'
        rules={[{ required: true }]}
      >
        <Switch checkedChildren={t('script.upgrade_config.on')} unCheckedChildren={t('script.upgrade_config.off')} />
      </Form.Item>
      <Form.Item
        label={t('script.upgrade_config.upgrade_time')}
        name={['upgrade', 'upgrade_time']}
        rules={[{ required: true }]}
      >
        <TimePicker.RangePicker format='HH:mm' />
      </Form.Item>
      <Form.Item label={t('common:business_group')} name={['upgrade', 'group_ids']}>
        <Select
          showSearch
          style={{ width: '400px' }}
          mode='multiple'
          maxTagCount='responsive'
          allowClear
          onDropdownVisibleChange={(open) => {
            if (open) {
              changeBgidList(form.getFieldValue('group_ids'));
            }
          }}
          onChange={changeBgidList}
        >
          {bgidList.map((item) => (
            <Select.Option key={item.value} value={item.value} disabled={item.disabled}>
              {item.label}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item label={t('script.upgrade_config.rts')} name={['upgrade', 'rts']}>
        <Select style={{ width: '400px' }} mode='multiple' onChange={changeRtKist} allowClear>
          {rtList.map((item) => (
            <Select.Option key={item.value} value={item.value} disabled={item.disabled}>
              {item.label}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Button
        type='primary'
        onClick={() => {
          form.validateFields().then((values) => {
            const data = {
              ...values,
              upgrade: {
                ...values.upgrade,
                upgrade_start: values.upgrade.upgrade_time[0].format('HH:mm'),
                upgrade_end: values.upgrade.upgrade_time[1].format('HH:mm'),
              },
            };
            delete data.upgrade_time;
            setVersionSettings(data).then((res) => {
              if (res.success) {
                message.success(t('common:success.save'));
              }
            });
          });
        }}
      >
        {t('common:btn.save')}
      </Button>
    </Form>
  );
};

export default UpgradeConfig;
