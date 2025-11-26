import React, { useContext, useState } from 'react';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import { ColumnsType } from 'antd/es/table';
import { Table, Tag, Modal, message, Input, Alert } from 'antd';
import { useAntdTable } from 'ahooks';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { useTranslation } from 'react-i18next';
import { createFromIconfontCN } from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import { getMonObjectList } from '@/services/targets';
import { setTargetExtra } from '@/services/dial';
import './locale';

const IconCnd = createFromIconfontCN({
  scriptUrl: '/font/cndicon.js',
});

const NodeManagement: React.FC = () => {
  const { curBusiId, profile } = useContext(CommonStateContext);
  const { search } = useLocation();
  const { id } = queryString.parse(search);
  const bgid = id ?? curBusiId;
  const [visible, setVisible] = useState(false);
  const [tag, setTag] = useState('');
  const { t } = useTranslation('targets');
  const [selectRow, setSelectRow] = useState<{ ident: string; extra: { dial_tags: string[] } | null }>();
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const pagination = usePagination({ PAGESIZE_KEY: 'node-management-list' });
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
      width: 180,
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
      width: 180,
      render(groupObj) {
        return groupObj ? groupObj.name : t('not_grouped');
      },
    },
    {
      title: t('dial:task.dial_tags'),
      dataIndex: ['extra', 'dial_tags'],
      ellipsis: {
        showTitle: false,
      },
      render(val) {
        return val ? <Tag color='blue'>{val}</Tag> : '-';
      },
    },
    ...(!profile.admin && bgid === 'public'
      ? []
      : [
          {
            title: t('common:table.operations'),
            width: '100px',
            dataIndex: 'operation',
            render: (text, record) => {
              return record.group_obj.perm === 'rw' ? (
                <a onClick={() => onEditTags(record)}>{t('dial:node_management.edit_tags')}</a>
              ) : (
                '-'
              );
            },
          },
        ]),
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

  const onEditTags = (values) => {
    values.extra && setTag(values.extra.dial_tags);
    setSelectRow(values);
    setVisible(true);
  };

  const handleOk = () => {
    const data = {
      ident: selectRow!.ident,
      extra: { ...selectRow!.extra, dial_tags: tag },
    };
    setTargetExtra(data).then(() => {
      setVisible(false);
      setRefreshFlag(_.uniqueId('refresh_'));
      message.success(t('common:success.edit'));
    });
  };

  return (
    <PageLayout title={t('dial:node_management.title')}>
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
          <Modal
            title={t('dial:node_management.edit_tags')}
            visible={visible}
            width={400}
            onOk={handleOk}
            onCancel={() => {
              setVisible(false);
            }}
            destroyOnClose={true}
          >
            <Alert showIcon message={t('dial:node_management.tip')} type='warning' style={{ marginBottom: '12px' }} />
            <Input
              allowClear
              value={tag}
              placeholder={t('dial:node_management.edit_tags_placeholder')}
              onChange={(e) => setTag(e.target.value)}
            />
          </Modal>
        </div>
      </div>
    </PageLayout>
  );
};

export default NodeManagement;
