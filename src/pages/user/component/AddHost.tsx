import React, { useState } from 'react';
import { Tag, Input, Table } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useTranslation } from 'react-i18next';
import { useAntdTable } from 'ahooks';
import { TeamProps, User } from '@/store/manageInterface';
import { getMonObjectList } from '@/services/targets';

const AddHost: React.FC<TeamProps> = (props: TeamProps) => {
  const { t } = useTranslation('user');
  const { onSelect } = props;
  const [selectedHost, setSelectedHost] = useState<React.Key[]>([]);
  const [query, setQuery] = useState('');
  const [searchHostValue, setSearchHostValue] = useState<string>('');
  const hostColumn: ColumnsType<User> = [
    {
      title: t('common:table.ident'),
      dataIndex: 'ident',
      width: '120px',
      ellipsis: true,
    },
    {
      title: t('common:business_group'),
      dataIndex: 'group_obj',
      width: '150px',
      ellipsis: true,
      render(groupObj) {
        return groupObj ? groupObj.name : t('business.no_group');
      },
    },
    {
      title: t('tags'),
      dataIndex: 'tags',
      render: (tagArr) =>
        tagArr.map((item) => (
          <Tag
            color='blue'
            key={item}
            onClick={(e) => {
              if (!searchHostValue.includes(item)) {
                const val = query ? `${query.trim()} ${item}` : item;
                setQuery(val);
                setSearchHostValue(val);
              }
            }}
          >
            {item}
          </Tag>
        )),
    },
  ];

  const onSelectChange = (newKeys: [], newRows: []) => {
    onSelect(newKeys);
    setSelectedHost(newKeys);
  };

  const getHostTableData = ({ current, pageSize }): Promise<any> => {
    const params = {
      query: query,
      bgid: -1,
      p: current,
      limit: pageSize,
    };

    return getMonObjectList(params).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };

  const { tableProps } = useAntdTable(getHostTableData, {
    defaultPageSize: 10,
    refreshDeps: [query],
  });

  return (
    <div>
      <Input
        style={{ marginBottom: '10px' }}
        prefix={<SearchOutlined />}
        placeholder={t('business.host_placeholder')}
        value={searchHostValue}
        onChange={(e) => setSearchHostValue(e.target.value)}
        onPressEnter={(e) => {
          setQuery((e.target as HTMLInputElement).value);
        }}
        onBlur={(e) => {
          setQuery((e.target as HTMLInputElement).value);
        }}
      />
      <Table
        size='small'
        rowKey='ident'
        columns={hostColumn}
        {...tableProps}
        rowSelection={{
          preserveSelectedRowKeys: true,
          selectedRowKeys: selectedHost,
          onChange: onSelectChange,
        }}
        pagination={{
          ...tableProps.pagination,
          size: 'small',
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => {
            return t('common:table.total', { total });
          },
          showSizeChanger: true,
        }}
      />
    </div>
  );
};

export default AddHost;
