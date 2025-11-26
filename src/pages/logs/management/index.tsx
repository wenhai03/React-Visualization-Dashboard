import React, { useState, useEffect, useContext } from 'react';
import _ from 'lodash';
import { ColumnsType } from 'antd/es/table';
import { CommonStateContext } from '@/App';
import { Table, Switch, message, Tooltip, Tag } from 'antd';
import { useAntdTable } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { createFromIconfontCN } from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import { getMonObjectList } from '@/services/targets';
import { getBusiGroups } from '@/services/common';
import { setTargetExtra } from '@/services/logstash';
import BusiGroupSelect from '@/components/BusiGroupSelect';
import '@/pages/targets/locale';

const IconCnd = createFromIconfontCN({
  scriptUrl: '/font/cndicon.js',
});

const Management: React.FC = () => {
  const { t } = useTranslation('targets');
  const { profile } = useContext(CommonStateContext);
  const [busiGroup, setBusiGroup] = useState<{ label: string; options: any }[]>([]);
  const [bgid, setBgid] = useState<number | string>('logstash');
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const pagination = usePagination({ PAGESIZE_KEY: 'logstash-list' });
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
      title: t('tags'),
      dataIndex: 'tags',
      ellipsis: {
        showTitle: false,
      },
      render(tagArr) {
        const content =
          tagArr &&
          tagArr.map((item) => (
            <Tag color='blue' key={item}>
              {item}
            </Tag>
          ));
        return (
          tagArr && (
            <Tooltip
              title={content}
              placement='topLeft'
              getPopupContainer={() => document.body}
              overlayClassName='mon-manage-table-tooltip'
            >
              {content}
            </Tooltip>
          )
        );
      },
    },
    {
      title: t('common:table.note'),
      dataIndex: 'note',
      ellipsis: {
        showTitle: false,
      },
      render(note) {
        return (
          <Tooltip title={note} placement='topLeft' getPopupContainer={() => document.body}>
            {note}
          </Tooltip>
        );
      },
    },
    {
      title: t('management.logstash_ident'),
      dataIndex: ['extra', 'logstash'],
      width: 200,
      render: (val, record) => {
        return (
          <Switch
            disabled={!profile.admin}
            checkedChildren={t('management.enable')}
            unCheckedChildren={t('management.disable')}
            checked={val}
            onChange={() => {
              const data = {
                ident: record.ident,
                extra: { ...record.extra, logstash: !Boolean(val) },
              };
              setTargetExtra(data).then(() => {
                setRefreshFlag(_.uniqueId('refresh_'));
                message.success(t('common:success.edit'));
              });
            }}
          />
        );
      },
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
    getBusiGroups('', 5000, { logstash: 1 }).then((res) => {
      const option = res.dat.map((item) => ({ label: item.name, value: item.id }));
      setBusiGroup([
        {
          label: t('common:default_filter'),
          options: [{ label: t('common:all'), value: 'logstash' }],
        },
        {
          label: t('common:logstash_cluster'),
          options: option,
        },
      ]);
    });
  }, []);

  return (
    <PageLayout
      title={t('management.title')}
      rightArea={
        <BusiGroupSelect
          name={t('common:available_logstash_cluster')}
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
    </PageLayout>
  );
};

export default Management;
