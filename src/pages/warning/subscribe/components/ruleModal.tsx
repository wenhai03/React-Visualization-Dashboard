import React, { useState, useEffect, useContext } from 'react';
import { Input, Table, Switch, Tag, Modal, Row, Col, Select, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ColumnType } from 'antd/lib/table';
import moment from 'moment';
import _ from 'lodash';
import { strategyItem, strategyStatus } from '@/store/warningInterface';
import { getStrategyGroupSubList, updateAlertRules } from '@/services/warning';
import { priorityColor } from '@/utils/constant';
import { CommonStateContext } from '@/App';
import usePagination from '@/components/usePagination';

interface props {
  visible: boolean;
  ruleModalClose: Function;
  subscribe: Function;
}

const RuleModal: React.FC<props> = ({ visible, ruleModalClose, subscribe }) => {
  const { t } = useTranslation('alertSubscribes');
  const pagination = usePagination({ PAGESIZE_KEY: 'alert-rules-subscribe-pagesize' });
  const { curBusiId, datasourceList, busiGroups } = useContext(CommonStateContext);
  const [currentStrategyDataAll, setCurrentStrategyDataAll] = useState([]);
  const [currentStrategyData, setCurrentStrategyData] = useState([]);
  const [bgid, setBgid] = useState(curBusiId);
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    setBgid(curBusiId);
  }, [curBusiId]);

  useEffect(() => {
    getAlertRules();
  }, [bgid]);

  useEffect(() => {
    filterData();
  }, [query, currentStrategyDataAll]);

  const getAlertRules = async (id?: number) => {
    const { success, dat } = await getStrategyGroupSubList({ id: id || bgid });
    if (success) {
      setCurrentStrategyDataAll(dat || []);
    }
  };

  const filterData = () => {
    const data = JSON.parse(JSON.stringify(currentStrategyDataAll));
    const res = data.filter((item) => {
      return item.name.indexOf(query) > -1 || item.append_tags.join(' ').indexOf(query) > -1;
    });
    setCurrentStrategyData(res || []);
  };

  const onSearchQuery = (e) => {
    let val = e.target.value;
    setQuery(val);
  };

  const columns: ColumnType<strategyItem>[] = [
    {
      title: t('common:datasource.type'),
      dataIndex: 'cate',
    },
    {
      title: t('common:datasource.name'),
      dataIndex: 'datasource_ids',
      render: (value, record) => {
        if (!record.datasource_ids) return '-';
        return (
          <div>
            {_.map(record.datasource_ids, (item) => {
              if (item === 0) {
                return (
                  <Tag color='blue' key={item}>
                    $all
                  </Tag>
                );
              }
              const name = _.find(datasourceList, { id: item })?.name;
              if (!name) return '';
              return (
                <Tag color='blue' key={item}>
                  {name}
                </Tag>
              );
            })}
          </div>
        );
      },
    },
    {
      title: t('common:severity.title'),
      dataIndex: 'severities',
      render: (data) => {
        return _.map(data, (severity) => {
          return (
            <Tag key={severity} color={priorityColor[severity - 1]}>
              S{severity}
            </Tag>
          );
        });
      },
    },
    {
      title: t('common:table.name'),
      dataIndex: 'name',
      render: (data, record) => {
        return (
          <Link
            className='table-text'
            to={{
              pathname: `/alert-rules/edit/${record.id}`,
            }}
          >
            {data}
          </Link>
        );
      },
    },
    {
      title: t('common:notify_channels.groups'),
      dataIndex: 'notify_groups_obj',
      render: (data, record) => {
        return (
          (data.length &&
            data.map(
              (
                user: {
                  nickname: string;
                  username: string;
                } & { name: string },
                index: number,
              ) => {
                return (
                  <Tag color='blue' key={index}>
                    {user.nickname || user.username || user.name}
                  </Tag>
                );
              },
            )) || <div></div>
        );
      },
    },
    {
      title: t('common:append_tags'),
      dataIndex: 'append_tags',
      render: (data) => {
        const array = data || [];
        return (
          (array.length &&
            array.map((tag: string, index: number) => {
              return (
                <Tag color='blue' key={index}>
                  {tag}
                </Tag>
              );
            })) || <div></div>
        );
      },
    },
    {
      title: t('common:table.update_at'),
      dataIndex: 'update_at',
      width: 120,
      render: (text: string) => {
        return <div className='table-text'>{moment.unix(Number(text)).format('YYYY-MM-DD HH:mm:ss')}</div>;
      },
    },
    {
      title: t('common:table.enabled'),
      dataIndex: 'disabled',
      width: 60,
      render: (disabled, record) => (
        <Switch
          checked={disabled === strategyStatus.Enable}
          disabled
          size='small'
          onChange={() => {
            const { id, disabled } = record;
            updateAlertRules(
              {
                ids: [id],
                fields: {
                  disabled: !disabled ? 1 : 0,
                },
              },
              curBusiId,
            ).then(() => {
              getAlertRules();
            });
          }}
        />
      ),
    },
    {
      title: t('common:table.operations'),
      dataIndex: 'operator',
      fixed: 'right',
      width: 100,
      render: (data, record) => {
        return (
          <div className='table-operator-area'>
            <div
              className='table-operator-area-normal'
              onClick={() => {
                handleSubscribe(record);
              }}
            >
              {t('subscribe_btn')}
            </div>
          </div>
        );
      },
    },
  ];

  const handleSubscribe = (record) => {
    subscribe(record);
  };

  const modalClose = () => {
    ruleModalClose();
  };

  return (
    <>
      <Modal
        title={t('sub_rule_name')}
        footer=''
        forceRender
        visible={visible}
        onCancel={() => {
          modalClose();
        }}
        width={'80%'}
      >
        <Row justify='space-between' style={{ marginBottom: '10px' }}>
          <Col>
            <Space>
              <Input
                style={{ width: '280px' }}
                onPressEnter={onSearchQuery}
                prefix={<SearchOutlined />}
                placeholder={t('规则名称、附加标签')}
              />
              <Select
                defaultValue={curBusiId}
                style={{ width: '280px' }}
                onChange={(value) => getAlertRules(Number(value))}
                options={busiGroups.map((item: any) => ({
                  label: `${item.name}${item.perm === 'ro' ? '（只读）' : ''}`,
                  value: item.id,
                }))}
              />
            </Space>
          </Col>
          <Col></Col>
        </Row>
        <div className='rule_modal_table'>
          <Table
            size='small'
            rowKey='id'
            pagination={pagination}
            dataSource={currentStrategyData}
            columns={columns}
            scroll={{ y: 'calc(100vh - 430px)' }}
          />
        </div>
      </Modal>
    </>
  );
};

export default RuleModal;
