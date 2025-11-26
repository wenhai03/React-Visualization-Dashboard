import React, { useEffect, useState } from 'react';
import { Tag, Input, Table } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useTranslation } from 'react-i18next';
import { getTeamInfo, getUserInfoList } from '@/services/manage';
import { TeamProps, User, Team } from '@/store/manageInterface';
import './index.less';

const AddUser: React.FC<TeamProps> = (props: TeamProps) => {
  const { t } = useTranslation('user');
  const { teamId, onSelect } = props;
  const [teamInfo, setTeamInfo] = useState<Team>();
  const [users, setUsers] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [selectedUser, setSelectedUser] = useState<React.Key[]>([]);
  const [selectedUserRows, setSelectedUserRows] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const userColumn: ColumnsType<User> = [
    {
      title: t('common:profile.username'),
      dataIndex: 'username',
    },
    {
      title: t('common:profile.nickname'),
      dataIndex: 'nickname',
      render: (text: string, record) => record.nickname || '-',
    },
    {
      title: t('common:profile.email'),
      dataIndex: 'email',
      render: (text: string, record) => record.email || '-',
    },
    {
      title: t('common:profile.idm'),
      dataIndex: 'idm_id',
      render: (text: string, record) => record.idm_id || '-',
    },
    {
      title: t('common:profile.phone'),
      dataIndex: 'phone',
      render: (text: string, record) => record.phone || '-',
    },
  ];
  useEffect(() => {
    getTeam();
    getUserInfoList({
      limit: -1,
    }).then((res) => {
      setUsers(res.dat.list);
      setFilterData(res.dat.list);
    });
  }, []);

  const getTeam = () => {
    if (!teamId) return;
    getTeamInfo(teamId).then((data) => {
      setTeamInfo(data.user_group);
    });
  };

  const handleClose = (val) => {
    let newList = selectedUserRows.filter((item) => item.id !== val.id);
    let newId = newList.map((item) => item.id);
    setSelectedUserRows(newList);
    setSelectedUser(newId);
  };

  const onSelectChange = (newKeys: [], newRows: []) => {
    onSelect(newKeys);
    setSelectedUser(newKeys);
    setSelectedUserRows(newRows);
  };

  return (
    <div>
      <div>
        <span>{t('team.name')}：</span>
        {teamInfo && teamInfo.name}
      </div>
      <div
        style={{
          margin: '20px 0 16px',
        }}
      >
        {selectedUser.length > 0 && <span>{t('team.add_member_selected', { num: selectedUser.length })} </span>}
        {selectedUserRows.map((item, index) => {
          return (
            <Tag
              style={{
                marginBottom: '4px',
              }}
              closable
              onClose={() => handleClose(item)}
              key={item.id}
            >
              {item.nickname || item.email || item.idm_id}
            </Tag>
          );
        })}
      </div>
      <Input
        className={'searchInput'}
        style={{ marginBottom: '12px' }}
        prefix={<SearchOutlined />}
        placeholder={t('full_search_placeholder')}
        onPressEnter={(e) => {
          const value = (e.target as HTMLInputElement).value;
          const data = users.filter((item: any) => {
            const filterString = `${item.nickname}-${item.username}-${item.first_letter}-${item.py}`;
            return filterString.toString().toLowerCase().includes(value.toLowerCase());
          });
          setFilterData(data);
        }}
      />
      <Table
        size='small'
        rowKey='id'
        columns={userColumn}
        dataSource={filterData}
        rowSelection={{
          preserveSelectedRowKeys: true,
          selectedRowKeys: selectedUser,
          onChange: onSelectChange,
        }}
        pagination={{
          size: 'small',
          pageSizeOptions: ['5', '10', '20', '50', '100'],
          showTotal: (total) => t('common:table.total', { total }),
          showSizeChanger: true,
        }}
      />
    </div>
  );
};

export default AddUser;
