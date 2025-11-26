import React, { useEffect, useState } from 'react';
import _ from 'lodash';
import { Form, Input, Button, message, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { getContainerData, updateContainer } from '@/services/home';
import { getDashboardCates } from '@/pages/dashboardBuiltin/services';
import { BoardCateType, BoardType } from '@/pages/dashboardBuiltin/types';

export default function Container() {
  const [form] = Form.useForm();
  const [cateList, setCateList] = useState<BoardCateType[]>([]);
  const [nameList, setNameList] = useState<BoardType[]>([]);
  const { t } = useTranslation('other');

  useEffect(() => {
    (async () => {
      const { dat: containerData } = await getContainerData();
      const dashboardCate = await getDashboardCates();
      form.setFieldsValue(containerData);
      setCateList(dashboardCate);
      if (containerData.home_container_dashboard_url.cate_code) {
        const initialValue = dashboardCate?.filter(
          (item) => item.code === containerData.home_container_dashboard_url.cate_code,
        )[0];
        setNameList(initialValue?.boards);
      }
    })();
  }, []);

  const handleName = (val) => {
    form.setFieldsValue({ home_container_dashboard_url: { name: '' } });
    const data = cateList.filter((item) => item.code === val)[0];
    data.boards && setNameList(data.boards);
  };

  return (
    <div>
      <Form form={form} layout='vertical' style={{ width: '50%' }}>
        <Form.Item
          label={t('container.dashboard_cate')}
          name={['home_container_dashboard_url', 'cate_code']}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select onChange={handleName}>
            {cateList?.map((item) => (
              <Select.Option value={item.code} key={item.code}>
                {item.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label={t('container.dashboard_name')}
          name={['home_container_dashboard_url', 'code']}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select>
            {nameList?.map((item) => (
              <Select.Option value={item.code} key={item.code}>
                {item.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label={t('container.all_prom_ql')}
          name='home_container_all_prom_ql'
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={t('container.abnormal_prom_ql')}
          name='home_container_abnormal_prom_ql'
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <div>
          <Button
            type='primary'
            onClick={() => {
              form.validateFields().then((values) => {
                updateContainer(values).then(() => {
                  message.success(t('common:success.save'));
                });
              });
            }}
          >
            {t('common:btn.save')}
          </Button>
        </div>
      </Form>
    </div>
  );
}
