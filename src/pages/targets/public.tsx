import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import { ColumnsType } from 'antd/es/table';
import { Table, Switch, message, Input, Modal, Form, Tag } from 'antd';
import { useAntdTable } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { createFromIconfontCN } from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import { getMonObjectList, updateTargetsExtra } from '@/services/targets';
import { getBusiGroups } from '@/services/common';
import BusiGroupSelect from '@/components/BusiGroupSelect';
import './locale';

const IconCnd = createFromIconfontCN({
  scriptUrl: '/font/cndicon.js',
});

const Management: React.FC = () => {
  const [form] = Form.useForm();
  const { t } = useTranslation('targets');
  const [visible, setVisible] = useState(false);
  const [busiGroup, setBusiGroup] = useState<{ label: string; options: any }[]>([]);
  const [bgid, setBgid] = useState<number | string>('public');
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const pagination = usePagination({ PAGESIZE_KEY: 'public-list' });
  const runtimes = {
    pm: {
      icon: 'icon-wuliji',
      title: t('physical_machine'),
    },
    vm: {
      icon: 'icon-xuniji1',
      title: t('virtual_machine'),
    },
    ct: {
      icon: 'icon-Docker',
      title: t('docker'),
    },
    'ct-k8s': {
      icon: 'icon-ks',
      title: t('kubernetes'),
    },
  };
  const columns: ColumnsType<any> = [
    {
      title: t('common:table.ident'),
      dataIndex: 'ident',
      align: 'left',
      width: 300,
      render: (value, { rt }) => {
        return (
          <div title={runtimes[rt]?.title ?? t('non_standard_collector')}>
            <IconCnd type={runtimes[rt]?.icon ?? 'icon-unknown'} />
            <span style={{ paddingLeft: '3px' }}>{value}</span>
          </div>
        );
      },
    },
    {
      title: t('group_obj'),
      dataIndex: 'group_obj',
      width: 300,
      render(groupObj) {
        return groupObj ? groupObj.name : t('not_grouped');
      },
    },
    {
      title: t('dial_tags'),
      dataIndex: ['extra', 'dial_tags'],
      width: 200,
      render: (val) => val ?? '-',
    },
    {
      title: t('common:public_host'),
      dataIndex: ['extra', 'public'],
      width: 200,
      render: (val) => val ?? '-',
    },
    {
      title: t('management.logstash_ident'),
      dataIndex: ['extra', 'logstash'],
      width: 120,
      render: (val) => {
        return (
          <>
            {val ? (
              <Tag color='success'>{t('common:table.enabled')}</Tag>
            ) : (
              <Tag color='error'>{t('common:table.disabled')}</Tag>
            )}
          </>
        );
      },
    },
    {
      title: t('common:table.operations'),
      width: '80px',
      dataIndex: 'operation',
      render: (text, record) => (
        <a
          onClick={() => {
            setVisible(true);
            form.setFieldsValue({
              ident: record.ident,
              extra: {
                public: record?.extra?.public || '',
                dial_tags: record?.extra?.dial_tags || '',
                logstash: record?.extra?.logstash || false,
              },
            });
          }}
        >
          {t('common:btn.modify')}
        </a>
      ),
    },
  ];

  const featchData = ({ current, pageSize }: { current: number; pageSize: number }): Promise<any> => {
    const query = {
      bgid: bgid,
      limit: pageSize,
      p: current,
    };
    return getMonObjectList(query).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };

  const { tableProps } = useAntdTable(featchData, {
    refreshDeps: [bgid, refreshFlag],
    defaultPageSize: pagination.pageSize,
  });

  useEffect(() => {
    getBusiGroups('', 5000, { public: 1 }).then((res) => {
      const option = res.dat.map((item) => ({ label: item.name, value: item.id }));
      setBusiGroup([
        {
          label: t('common:default_filter'),
          options: [{ label: t('common:all'), value: 'public' }],
        },
        {
          label: t('common:public_cluster'),
          options: option,
        },
      ]);
    });
  }, []);

  const handleOk = () => {
    form.validateFields().then((values) => {
      updateTargetsExtra(values).then((res) => {
        message.success(t('common:success.modify'));
        setVisible(false);
        setRefreshFlag(_.uniqueId('refresh_'));
      });
    });
  };

  return (
    <PageLayout
      title={t('common_node')}
      rightArea={
        <BusiGroupSelect
          name={t('common:available_public_cluster')}
          value={busiGroup.length ? bgid : ''}
          onChange={(value) => setBgid(value)}
          options={busiGroup as any}
        />
      }
    >
      <div>
        <div style={{ padding: '10px' }}>
          <Table
            rowKey='id'
            columns={columns}
            size='small'
            {...tableProps}
            pagination={{
              ...tableProps.pagination,
              ...pagination,
            }}
            scroll={{ x: 'max-content' }}
          />
        </div>
      </div>
      <Modal
        title={t('common:btn.edit')}
        visible={visible}
        width={400}
        onOk={handleOk}
        onCancel={() => {
          setVisible(false);
          form.resetFields();
        }}
        destroyOnClose={true}
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='ident' hidden>
            <div />
          </Form.Item>
          <Form.Item label={t('dial_tags')} name={['extra', 'dial_tags']}>
            <Input />
          </Form.Item>
          <Form.Item label={t('common:public_host')} name={['extra', 'public']}>
            <Input />
          </Form.Item>
          <Form.Item label={t('management.logstash_ident')} name={['extra', 'logstash']} valuePropName='checked'>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </PageLayout>
  );
};

export default Management;
