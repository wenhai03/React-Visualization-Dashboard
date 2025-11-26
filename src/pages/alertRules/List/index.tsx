import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, Link, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import _ from 'lodash';
import moment from 'moment';
import { Table, Tag, Switch, Modal, Space, Button, Row, Col, message, Select, Tooltip } from 'antd';
import { ColumnType } from 'antd/lib/table';
import AdvancedWrap from '@/components/AdvancedWrap';
import { DatasourceSelectInSearch } from '@/components/DatasourceSelect';
import RefreshIcon from '@/components/RefreshIcon';
import SearchInput from '@/components/BaseSearchInput';
import usePagination from '@/components/usePagination';
import {
  getStrategyGroupSubList,
  updateAlertRules,
  deleteStrategy,
  getWhetherEnableForecast,
} from '@/services/warning';
import { CommonStateContext } from '@/App';
import { priorityColor } from '@/utils/constant';
import { localeCompare } from '@/utils';
import { AlertRuleType, AlertRuleStatus } from '../types';
import MoreOperations from './MoreOperations';
import { ruleTypeOptions } from '../Form/constants';
import { createAgentSettings } from '@/services/agent';

interface ListProps {
  bgid?: number;
}

interface Filter {
  cate?: string;
  datasourceIds?: number[];
  search?: string;
  prod?: string;
  severities?: number[];
  disabled?: number;
  includeBuiltIn: boolean; // 是否包括托管规则
  includeActiveAlarm: boolean; // 只显示异常规则(还有活跃告警)
  relation_input?: string;
}

export default function List(props: ListProps) {
  const { bgid } = props;
  const { t } = useTranslation('alertRules');
  const history = useHistory();
  const { search } = useLocation();
  const { disabled } = queryString.parse(search);
  const { datasourceList, curBusiGroup } = useContext(CommonStateContext);
  const pagination = usePagination({ PAGESIZE_KEY: 'alert-rules-pagesize' });
  const includeBuiltn = localStorage.getItem('alert-rules-include-built-in');
  const includeActiveAlarm = localStorage.getItem('alert-rules-include-active-alarm');
  const [filter, setFilter] = useState<Filter>({
    disabled: disabled ? Number(disabled) : undefined,
    includeBuiltIn: includeBuiltn === 'false' ? false : true,
    includeActiveAlarm: includeActiveAlarm === 'true' ? true : false,
    relation_input: undefined,
  });
  const [selectRowKeys, setSelectRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<AlertRuleType<any>[]>([]);
  const [data, setData] = useState<AlertRuleType<any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [enableForecast, setEnableForecast] = useState(true);
  const [metricList, setMetricList] = useState<{ category: string; content: string }[] | []>([]);

  // 列表勾选状态，如果更改了启用状态，需要同步更改勾选的数据
  const updateSelectedRowsData = (id: number, disabled: 0 | 1) => {
    if (selectedRows.length) {
      const newSelectedRows = [...selectedRows];
      const index = selectedRows.findIndex((item) => item.id === id);
      if (index !== -1) {
        newSelectedRows[index].disabled = disabled;
        setSelectedRows(newSelectedRows);
      }
    }
  };

  const columns: ColumnType<AlertRuleType<any>>[] = [
    {
      title: t('common:table.name'),
      dataIndex: 'name',
      sorter: (a, b) => localeCompare(a.name, b.name),
      render: (data, record) => {
        return (
          <Space>
            <Link
              className='table-text'
              to={{
                pathname: `/alert-rules/edit/${record.id}`,
              }}
            >
              {data}
            </Link>
            {Boolean(record.event_count) && (
              <Tooltip title='活跃告警数'>
                <Link to='/alert-cur-events'>
                  <Tag color='red' style={{ marginLeft: '8px' }}>
                    {record.event_count}
                  </Tag>
                </Link>
              </Tooltip>
            )}
            {record.builtin_id > 0 ? (
              <Tooltip title={t('system_generation_tip')}>
                <Tag color='green' style={{ fontSize: '11px' }}>
                  {record.relation_input?.[0]?.replace('metrics:', '') ?? ''}
                </Tag>
              </Tooltip>
            ) : null}
          </Space>
        );
      },
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
      title: t('severity'),
      dataIndex: 'severities',
      render: (data) => {
        return _.map(data, (severity, index) => {
          return (
            <Tag key={index} color={priorityColor[severity - 1]}>
              S{severity}
            </Tag>
          );
        });
      },
    },
    {
      title: t('task_type'),
      dataIndex: 'prod',
      sorter: (a, b) => localeCompare(a.prod, b.prod),
      render: (val, record) => (
        <>
          {val}
          {record.sub_prod === 'forecast' &&
            (enableForecast ? (
              <Tooltip title={t('training_result_tip')}>
                <Link
                  to={{
                    pathname: `/alert-rules/brain/${record.id}`,
                  }}
                >
                  <div className='ai-icon'>AI</div>
                </Link>
              </Tooltip>
            ) : null)}
        </>
      ),
    },
    {
      title: t('notify_groups'),
      dataIndex: 'notify_groups_obj',
      width: 150,
      render: (data) => {
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
      title: t('append_tags'),
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
      width: 150,
      sorter: (a, b) => localeCompare(a.update_at, b.update_at),
      render: (text: string) => {
        return <div className='table-text'>{moment.unix(Number(text)).format('YYYY-MM-DD HH:mm:ss')}</div>;
      },
    },
    {
      title: t('common:table.update_by'),
      dataIndex: 'update_by',
      width: 100,
    },
    {
      title: t('common:table.enabled'),
      dataIndex: 'disabled',
      width: 60,
      render: (disabled, record) => (
        <Switch
          disabled={curBusiGroup.perm === 'ro' || (!enableForecast && record.sub_prod === 'forecast')}
          checked={disabled === AlertRuleStatus.Enable}
          size='small'
          onChange={(checked) => {
            const { id } = record;
            if (!checked) {
              Modal.confirm({
                content: `${t('disabled_confirm_tip')}“${record.name}”`,
                okText: t('common:btn.ok'),
                cancelText: t('common:btn.cancel'),
                onOk: () => {
                  bgid &&
                    updateAlertRules(
                      {
                        ids: [id],
                        fields: {
                          disabled: 1,
                        },
                      },
                      bgid,
                    ).then(() => {
                      getAlertRules();
                      updateSelectedRowsData(record.id, 1);
                    });
                },
                onCancel: () => {},
              });
            } else {
              bgid &&
                updateAlertRules(
                  {
                    ids: [id],
                    fields: {
                      disabled: 0,
                    },
                  },
                  bgid,
                ).then(() => {
                  getAlertRules();
                  updateSelectedRowsData(record.id, 0);
                });
            }
          }}
        />
      ),
    },
    ...(curBusiGroup.perm === 'rw'
      ? [
          {
            title: t('common:table.operations'),
            dataIndex: 'operator',
            width: 80,
            render: (data, record: any) => {
              return (
                <div className='table-operator-area'>
                  {!enableForecast && record.sub_prod === 'forecast' ? (
                    <span style={{ cursor: 'no-drop', color: '#00000080', marginRight: 8 }}>
                      {t('common:btn.clone')}
                    </span>
                  ) : (
                    <Link
                      className='table-operator-area-normal'
                      style={{ marginRight: 8 }}
                      to={{
                        pathname: `/alert-rules/edit/${record.id}?mode=clone`,
                      }}
                      target='_blank'
                    >
                      {t('common:btn.clone')}
                    </Link>
                  )}

                  {!(record.builtin_id > 0) && (
                    <div
                      className='table-operator-area-warning'
                      onClick={() => {
                        Modal.confirm({
                          title: `${t('title')}：“${record.name}” ，${t('common:confirm.delete')}`,
                          okText: t('common:btn.ok'),
                          cancelText: t('common:btn.cancel'),
                          onOk: () => {
                            bgid &&
                              deleteStrategy([record.id], bgid).then(() => {
                                message.success(t('common:success.delete'));
                                getAlertRules();
                              });
                          },

                          onCancel() {},
                        });
                      }}
                    >
                      {t('common:btn.delete')}
                    </div>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
  ];

  const filterData = () => {
    return data.filter((item) => {
      const {
        cate,
        datasourceIds,
        search,
        prod,
        severities,
        disabled,
        includeBuiltIn,
        includeActiveAlarm,
        relation_input,
      } = filter;
      const lowerCaseQuery = search?.toLowerCase() || '';
      return (
        (item.name.toLowerCase().indexOf(lowerCaseQuery) > -1 ||
          item.append_tags.join(' ').toLowerCase().indexOf(lowerCaseQuery) > -1) &&
        (disabled === undefined || disabled === item.disabled) &&
        ((cate && cate === item.cate) || !cate) &&
        ((prod && prod === item.prod) || !prod) &&
        (includeBuiltIn || (!includeBuiltIn && !(item.builtin_id > 0))) &&
        (!includeActiveAlarm || (includeActiveAlarm && Boolean(item.event_count))) &&
        (!relation_input || (item.relation_input?.[0] && item.relation_input?.[0] === relation_input)) &&
        ((item.severities &&
          _.some(item.severities, (severity) => {
            if (_.isEmpty(severities)) return true;
            return _.includes(severities, severity);
          })) ||
          !item.severities) &&
        (_.some(item.datasource_ids, (id) => {
          if (id === 0) return true;
          return _.includes(datasourceIds, id);
        }) ||
          datasourceIds?.length === 0 ||
          !datasourceIds)
      );
    });
  };
  const getAlertRules = async () => {
    if (!bgid) {
      return;
    }
    setLoading(true);
    const { success, dat } = await getStrategyGroupSubList({ id: bgid });
    if (success) {
      setData(dat || []);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bgid) {
      getAlertRules();
    }
    setSelectRowKeys([]);
    setSelectedRows([]);
  }, [bgid]);

  useEffect(() => {
    createAgentSettings({ category: 'metrics:*,global', showDefaultContent: true }).then((res) => {
      setMetricList(res.dat);
    });
    // 查询是否开启智能阈值告警
    getWhetherEnableForecast().then((res) => {
      setEnableForecast(res.dat);
    });
  }, []);

  if (!bgid) return null;
  const filteredData = filterData();

  return (
    <div className='alert-rules-list-container'>
      <Row justify='space-between'>
        <Col span={20}>
          <Space>
            <RefreshIcon
              onClick={() => {
                getAlertRules();
              }}
            />
            <AdvancedWrap var='VITE_IS_ALERT_AI,VITE_IS_ALERT_ES,VITE_IS_SLS_DS'>
              {(isShow) => {
                let options = ruleTypeOptions;
                if (isShow[0]) {
                  options = [
                    ...options,
                    {
                      label: 'Anomaly',
                      value: 'anomaly',
                      pro: true,
                    },
                  ];
                }
                if (isShow[1] || isShow[2]) {
                  options = [
                    ...options,
                    {
                      label: 'Log',
                      value: 'logging',
                      pro: true,
                    },
                  ];
                }
                return (
                  <Select
                    style={{ width: 90 }}
                    placeholder={t('prod')}
                    allowClear
                    value={filter.prod}
                    onChange={(val) => {
                      setFilter({
                        ...filter,
                        prod: val,
                      });
                    }}
                  >
                    {options.map((item) => {
                      return (
                        <Select.Option value={item.value} key={item.value}>
                          {item.label}
                        </Select.Option>
                      );
                    })}
                  </Select>
                );
              }}
            </AdvancedWrap>
            <DatasourceSelectInSearch
              datasourceCate={filter.cate}
              onDatasourceCateChange={(val) => {
                setFilter({
                  ...filter,
                  cate: val,
                });
              }}
              datasourceValue={filter.datasourceIds}
              datasourceValueMode='multiple'
              onDatasourceValueChange={(val: number[]) => {
                setFilter({
                  ...filter,
                  datasourceIds: val,
                });
              }}
              filterCates={(cates) => {
                return _.filter(cates, (item) => {
                  return !!item.cateOption;
                });
              }}
            />
            <Select
              mode='multiple'
              placeholder={t('severity')}
              style={{ width: 120 }}
              maxTagCount='responsive'
              value={filter.severities}
              onChange={(val) => {
                setFilter({
                  ...filter,
                  severities: val,
                });
              }}
            >
              <Select.Option value={1}>S1</Select.Option>
              <Select.Option value={2}>S2</Select.Option>
              <Select.Option value={3}>S3</Select.Option>
            </Select>
            <Select
              allowClear
              placeholder={t('common:table.status')}
              style={{ width: 120 }}
              value={filter.disabled}
              onChange={(val) => {
                history.replace({
                  pathname: '/alert-rules',
                  search: val !== undefined ? `disabled=${val}` : undefined,
                });
                setFilter({
                  ...filter,
                  disabled: val,
                });
              }}
            >
              <Select.Option value={0}>{t('common:table.enabled')}</Select.Option>
              <Select.Option value={1}>{t('common:table.disabled')}</Select.Option>
            </Select>
            <Select
              style={{ width: 120 }}
              showSearch
              allowClear
              value={filter.relation_input}
              optionFilterProp='children'
              placeholder={t('relation_input')}
              onChange={(val) => {
                setFilter({
                  ...filter,
                  relation_input: val,
                });
              }}
            >
              {metricList.map((item: { category: string }) => (
                <Select.Option key={item.category} value={item.category}>
                  {item.category.replace('metrics:', '')}
                </Select.Option>
              ))}
            </Select>
            <SearchInput
              placeholder={t('search_placeholder')}
              onSearch={(val) => {
                setFilter({
                  ...filter,
                  search: val,
                });
              }}
              allowClear
            />
            <Switch
              onChange={(checked) => {
                setFilter({
                  ...filter,
                  includeBuiltIn: checked,
                });
                localStorage.setItem('alert-rules-include-built-in', checked.toString());
              }}
              checked={filter.includeBuiltIn}
            />
            {`${t('include_built_in')}(${data.filter((item) => item.builtin_id > 0).length || 0})`}
            <Switch
              onChange={(checked) => {
                setFilter({
                  ...filter,
                  includeActiveAlarm: checked,
                });
                localStorage.setItem('alert-rules-include-active-alarm', checked.toString());
              }}
              checked={filter.includeActiveAlarm}
            />
            {`${t('include_active_alarm')}(${data.filter((item) => Boolean(item.event_count)).length || 0})`}
          </Space>
        </Col>
        <Col>
          <Space>
            {curBusiGroup.perm === 'rw' && (
              <Button
                type='primary'
                onClick={() => {
                  history.push('/alert-rules/add');
                }}
                className='strategy-table-search-right-create'
              >
                {t('common:btn.add')}
              </Button>
            )}
            <MoreOperations
              bgid={bgid}
              selectRowKeys={selectRowKeys}
              selectedRows={selectedRows}
              getAlertRules={getAlertRules}
              perm={curBusiGroup.perm}
            />
          </Space>
        </Col>
      </Row>
      <Table
        size='small'
        rowKey='id'
        pagination={pagination}
        loading={loading}
        dataSource={filteredData}
        rowSelection={{
          selectedRowKeys: selectedRows.map((item) => item.id),
          onChange: (selectedRowKeys: React.Key[], selectedRows: AlertRuleType<any>[]) => {
            setSelectRowKeys(selectedRowKeys);
            setSelectedRows(selectedRows);
          },
          getCheckboxProps: (record) => ({
            disabled: !enableForecast && record.sub_prod === 'forecast',
          }),
        }}
        columns={columns}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
}
