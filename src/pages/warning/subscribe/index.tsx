import React, { useState, useEffect, useContext } from 'react';
import { Button, Input, Table, message, Modal, Space, Select, Tag } from 'antd';
import { CopyOutlined, ExclamationCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useHistory, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import moment from 'moment';
import PageLayout from '@/components/pageLayout';
import { getSubscribeList, deleteSubscribes } from '@/services/subscribe';
import { subscribeItem } from '@/store/warningInterface/subscribe';
import RefreshIcon from '@/components/RefreshIcon';
import BlankBusinessPlaceholder from '@/components/BlankBusinessPlaceholder';
import { CommonStateContext } from '@/App';
import { priorityColor } from '@/utils/constant';
import { pageSizeOptionsDefault } from '../const';
import './locale';
import './index.less';

export { default as Add } from './add';
export { default as Edit } from './edit';

const { confirm } = Modal;
const Shield: React.FC = () => {
  const { t } = useTranslation('alertSubscribes');
  const history = useHistory();
  const { curBusiId: bgid, groupedDatasourceList, curBusiGroup } = useContext(CommonStateContext);
  const [query, setQuery] = useState<string>('');
  const [currentShieldDataAll, setCurrentShieldDataAll] = useState<Array<subscribeItem>>([]);
  const [currentShieldData, setCurrentShieldData] = useState<Array<subscribeItem>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [datasourceIds, setDatasourceIds] = useState<number[]>();

  const columns: ColumnsType = [
    {
      title: t('name'),
      dataIndex: 'name',
    },
    {
      title: t('common:datasource.id'),
      dataIndex: 'datasource_ids',
      render: (data) => {
        return _.map(data, (item) => {
          if (item === 0) {
            return (
              <Tag color='blue' key={item}>
                $all
              </Tag>
            );
          }
          return (
            <Tag color='blue' key={item}>
              {_.find(groupedDatasourceList?.prometheus, { id: item })?.name!}
            </Tag>
          );
        });
      },
    },
    {
      title: t('sub_rule_name'),
      colSpan: 2,
      dataIndex: 'rule_id',
      width: 150,
      render: (val, { rule_group_id }) => (
        <Tag color='blue'>{val ? t('appoint_alert_rule') : rule_group_id ? t('appoint_bgid') : t('all_bgid')}</Tag>
      ),
    },
    {
      title: t('sub_rule_name'),
      colSpan: 0,
      dataIndex: 'rule_name',
      render: (val, { rule_id, rule_group_id, rule_group_name }) =>
        rule_id ? `${val}(${t('common:business_group')}:${rule_group_name})` : rule_group_id ? rule_group_name : '',
    },
    {
      title: t('tags'),
      dataIndex: 'tags',
      render: (text: any) => {
        return (
          <>
            {text
              ? text.map((tag, index) => {
                  return tag ? (
                    <div key={index}>{`${tag.key} ${tag.func} ${
                      tag.func === 'in' ? tag.value.split(' ').join(', ') : tag.value
                    }`}</div>
                  ) : null;
                })
              : ''}
          </>
        );
      },
    },
    {
      title: t('user_groups'),
      dataIndex: 'user_groups',
      render: (text: string, record: subscribeItem) => {
        return (
          <>
            {record.user_groups?.map((item) => (
              <Tag color='blue' key={item.id}>
                {item.name}
              </Tag>
            ))}
          </>
        );
      },
    },
    {
      title: t('redefine_severity'),
      dataIndex: 'new_severity',
      render: (text: number, record: subscribeItem) => {
        if (record.redefine_severity === 1) {
          return (
            <Tag key={text} color={priorityColor[text - 1]}>
              S{text}
            </Tag>
          );
        }
        return null;
      },
    },
    {
      title: t('common:table.create_by'),
      ellipsis: true,
      dataIndex: 'update_by',
    },
    {
      title: t('common:table.update_at'),
      dataIndex: 'update_at',
      width: 150,
      render: (text) => {
        return moment.unix(text).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      title: t('common:table.operations'),
      width: 110,
      dataIndex: 'operation',
      render: (text: undefined, record: subscribeItem) => {
        return (
          <>
            <Space>
              <Link
                to={{
                  pathname: `/alert-subscribes/edit/${record.id}`,
                }}
              >
                {t(curBusiGroup.perm === 'rw' ? 'common:btn.modify' : 'common:btn.detail')}
              </Link>
              {curBusiGroup.perm === 'rw' && (
                <>
                  <div
                    className='table-operator-area-normal'
                    style={{
                      cursor: 'pointer',
                      display: 'inline-block',
                    }}
                    onClick={() => {
                      history.push(`/alert-subscribes/edit/${record.id}?mode=clone`);
                    }}
                  >
                    {t('common:btn.clone')}
                  </div>
                  <div
                    className='table-operator-area-warning'
                    onClick={() => {
                      confirm({
                        title: t('common:confirm.delete'),
                        okText: t('common:btn.ok'),
                        cancelText: t('common:btn.cancel'),
                        icon: <ExclamationCircleOutlined />,
                        onOk: () => {
                          dismiss(record.id);
                        },

                        onCancel() {},
                      });
                    }}
                  >
                    {t('common:btn.delete')}
                  </div>
                </>
              )}
            </Space>
          </>
        );
      },
    },
  ];

  useEffect(() => {
    getList();
  }, [bgid]);

  useEffect(() => {
    filterData();
  }, [query, datasourceIds, currentShieldDataAll]);

  const dismiss = (id: number) => {
    deleteSubscribes({ ids: [id] }, Number(bgid)).then((res) => {
      refreshList();
      if (res.err) {
        message.success(res.err);
      } else {
        message.success(t('common:success.delete'));
      }
    });
  };

  const filterData = () => {
    const data = JSON.parse(JSON.stringify(currentShieldDataAll));
    const res = data.filter((item: subscribeItem) => {
      const tagFind = item?.tags?.find((tag) => {
        return tag.key.indexOf(query) > -1 || tag.value.indexOf(query) > -1 || tag.func.indexOf(query) > -1;
      });
      const groupFind = item?.user_groups?.find((item) => {
        return item?.name?.indexOf(query) > -1;
      });
      return (
        (item?.rule_name?.indexOf(query) > -1 || !!tagFind || !!groupFind) &&
        (_.some(item.datasource_ids, (id) => {
          if (id === 0) return true;
          return _.includes(datasourceIds, id);
        }) ||
          datasourceIds?.length === 0 ||
          !datasourceIds)
      );
    });
    setCurrentShieldData(res || []);
  };

  const getList = async () => {
    if (bgid) {
      setLoading(true);
      const { success, dat } = await getSubscribeList({ id: Number(bgid) });
      if (success) {
        setCurrentShieldDataAll(dat || []);
        setLoading(false);
      }
    }
  };

  const refreshList = () => {
    getList();
  };

  const onSearchQuery = (e) => {
    let val = e.target.value;
    setQuery(val);
  };

  return (
    <PageLayout title={t('title')} icon={<CopyOutlined />}>
      <div>
        {bgid ? (
          <div className='shield-index'>
            <div className='header'>
              <Space>
                <RefreshIcon
                  onClick={() => {
                    refreshList();
                  }}
                />
                <Select
                  allowClear
                  placeholder={t('common:datasource.id')}
                  style={{ minWidth: 100 }}
                  dropdownMatchSelectWidth={false}
                  mode='multiple'
                  value={datasourceIds}
                  onChange={(val) => {
                    setDatasourceIds(val);
                  }}
                >
                  {_.map(groupedDatasourceList?.prometheus, (item) => (
                    <Select.Option value={item.id} key={item.id}>
                      {item.name}
                    </Select.Option>
                  ))}
                </Select>
                <Input
                  style={{ minWidth: 200 }}
                  onPressEnter={onSearchQuery}
                  prefix={<SearchOutlined />}
                  placeholder={t('search_placeholder')}
                />
              </Space>
              {curBusiGroup.perm === 'rw' && (
                <div className='header-right'>
                  <Button
                    type='primary'
                    className='add'
                    onClick={() => {
                      history.push(`/alert-subscribes/add`);
                    }}
                  >
                    {t('common:btn.add')}
                  </Button>
                </div>
              )}
            </div>
            <Table
              size='small'
              rowKey='id'
              pagination={{
                total: currentShieldData.length,
                showQuickJumper: true,
                showSizeChanger: true,
                showTotal: (total) => {
                  return t('common:table.total', { total });
                },
                pageSizeOptions: pageSizeOptionsDefault,
                defaultPageSize: 30,
              }}
              loading={loading}
              dataSource={currentShieldData}
              columns={columns}
            />
          </div>
        ) : (
          <BlankBusinessPlaceholder text={t('title')} />
        )}
      </div>
    </PageLayout>
  );
};

export default Shield;
