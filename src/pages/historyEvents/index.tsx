import React, { useContext, useState } from 'react';
import { AlertOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import _ from 'lodash';
import { useAntdTable } from 'ahooks';
import { Input, Tag, Button, Space, Table, Select, message, Switch } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import AdvancedWrap from '@/components/AdvancedWrap';
import PageLayout from '@/components/pageLayout';
import RefreshIcon from '@/components/RefreshIcon';
import { hoursOptions } from '@/pages/event/constants';
import { CommonStateContext } from '@/App';
import exportEvents, { downloadFile } from './exportEvents';
import { getEvents } from './services';
import { SeverityColor } from '../event';
import '../event/index.less';
import './locale';

export const getDefaultHours = () => {
  const locale = window.localStorage.getItem('alert_events_hours');
  if (locale) {
    return _.toNumber(locale) || 6;
  }
  return 6;
};

export const setDefaultHours = (hours: number) => {
  window.localStorage.setItem('alert_events_hours', `${hours}`);
};

const Event: React.FC = () => {
  const { t } = useTranslation('AlertHisEvents');
  const { search } = useLocation();
  const { id } = queryString.parse(search) as { id?: string };
  const { groupedDatasourceList, curBusiId, datasourceList } = useContext(CommonStateContext);
  const bgid = id ? Number(id) : curBusiId;
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const [filter, setFilter] = useState<{
    hours: number;
    datasourceIds: number[];
    severity?: number;
    eventType?: number;
    queryContent: string;
    rule_prods: string[];
    subscribe?: number;
  }>({
    hours: getDefaultHours(),
    datasourceIds: [],
    queryContent: '',
    rule_prods: [],
  });
  const columns = [
    {
      title: t('prod'),
      dataIndex: 'rule_prod',
      width: 100,
      render: (value) => {
        return t(`rule_prod.${value}`);
      },
    },
    {
      title: t('common:datasource.id'),
      dataIndex: 'datasource_id',
      width: 100,
      render: (value, record) => {
        return _.find(groupedDatasourceList?.[record.cate], { id: value })?.name || '-';
      },
    },
    {
      title: t('rule_name'),
      dataIndex: 'rule_name',
      render(title, { id, tags, subscribe_id, subscriber_name }) {
        const content =
          tags &&
          tags.map((item) => (
            <Tag
              color='blue'
              key={item}
              onClick={(e) => {
                if (!filter.queryContent.includes(item)) {
                  setFilter({
                    ...filter,
                    queryContent: filter.queryContent ? `${filter.queryContent.trim()} ${item}` : item,
                  });
                }
              }}
            >
              {item}
            </Tag>
          ));
        return (
          <>
            <div>
              <Link
                to={{
                  pathname: `/alert-his-events/${id}`,
                }}
              >
                {title}
                <span style={{ color: 'orange' }}>
                  {subscribe_id !== 0 ? ` (${t('subscribe')}：${subscriber_name})` : ''}
                </span>
              </Link>
            </div>
            <div>
              <span className='event-tags'>{content}</span>
            </div>
          </>
        );
      },
    },
    {
      title: t('first_trigger_time'),
      dataIndex: 'first_trigger_time',
      width: 120,
      render(value) {
        return moment((value ? value : 0) * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      title: t('last_eval_time'),
      dataIndex: 'last_eval_time',
      width: 120,
      render(value) {
        return moment((value ? value : 0) * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
  ];
  const [exportBtnLoadding, setExportBtnLoadding] = useState(false);
  const filterObj = Object.assign(
    { hours: filter.hours },
    filter.datasourceIds.length ? { datasource_ids: _.join(filter.datasourceIds, ',') } : {},
    filter.severity !== undefined ? { severity: filter.severity } : {},
    filter.subscribe !== undefined ? { subscribe: filter.subscribe } : {},
    filter.queryContent ? { query: filter.queryContent } : {},
    filter.eventType !== undefined ? { is_recovered: filter.eventType } : {},
    { bgid: bgid },
    filter.rule_prods.length ? { rule_prods: _.join(filter.rule_prods, ',') } : {},
  );

  function renderLeftHeader() {
    return (
      <div className='table-operate-box'>
        <Space>
          <RefreshIcon
            onClick={() => {
              setRefreshFlag(_.uniqueId('refresh_'));
            }}
          />
          <Select
            style={{ minWidth: 80 }}
            value={filter.hours}
            onChange={(val) => {
              setFilter({
                ...filter,
                hours: val,
              });
              setDefaultHours(val);
            }}
          >
            {hoursOptions.map((item) => {
              return <Select.Option value={item.value}>{t(`hours.${item.value}`)}</Select.Option>;
            })}
          </Select>
          <AdvancedWrap var='VITE_IS_ALERT_AI,VITE_IS_ALERT_ES,VITE_IS_SLS_DS,VITE_IS_COMMON_DS'>
            {(isShow) => {
              let options = [
                {
                  label: 'Metric',
                  value: 'metric',
                },
                {
                  label: 'Host',
                  value: 'host',
                },
                {
                  label: 'Dial',
                  value: 'dial',
                },
                {
                  label: 'Log',
                  value: 'log',
                },
                {
                  label: 'Apm',
                  value: 'apm',
                },
              ];
              if (isShow[0]) {
                options = [
                  ...options,
                  {
                    label: 'Anomaly',
                    value: 'anomaly',
                  },
                ];
              }
              if (isShow[1] || isShow[2]) {
                options = [
                  ...options,
                  {
                    label: 'Log',
                    value: 'logging',
                  },
                ];
              }
              if (isShow[3]) {
                options = [
                  ...options,
                  {
                    label: t('rule_prod.firemap'),
                    value: 'firemap',
                  },
                  {
                    label: t('rule_prod.northstar'),
                    value: 'northstar',
                  },
                ];
              }
              return (
                <Select
                  allowClear
                  placeholder={t('prod')}
                  style={{ minWidth: 80 }}
                  value={filter.rule_prods}
                  mode='multiple'
                  onChange={(val) => {
                    setFilter({
                      ...filter,
                      rule_prods: val,
                    });
                  }}
                  dropdownMatchSelectWidth={false}
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
          <Select
            allowClear
            mode='multiple'
            placeholder={t('common:datasource.id')}
            style={{ minWidth: 100 }}
            maxTagCount='responsive'
            dropdownMatchSelectWidth={false}
            value={filter.datasourceIds}
            onChange={(val) => {
              setFilter({
                ...filter,
                datasourceIds: val,
              });
            }}
          >
            {_.map(datasourceList, (item) => (
              <Select.Option value={item.id} key={item.id}>
                {item.name}
              </Select.Option>
            ))}
          </Select>
          <Select
            style={{ minWidth: 60 }}
            placeholder={t('severity')}
            allowClear
            value={filter.severity}
            onChange={(val) => {
              setFilter({
                ...filter,
                severity: val,
              });
            }}
          >
            <Select.Option value={1}>S1</Select.Option>
            <Select.Option value={2}>S2</Select.Option>
            <Select.Option value={3}>S3</Select.Option>
          </Select>
          <Select
            style={{ minWidth: 60 }}
            placeholder={t('eventType')}
            allowClear
            value={filter.eventType}
            onChange={(val) => {
              setFilter({
                ...filter,
                eventType: val,
              });
            }}
          >
            <Select.Option value={0}>Triggered</Select.Option>
            <Select.Option value={1}>Recovered</Select.Option>
          </Select>
          <Select
            style={{ minWidth: 60 }}
            placeholder={t('subscribe_or_not')}
            allowClear
            value={filter.subscribe}
            onChange={(val) => {
              setFilter({
                ...filter,
                subscribe: val,
              });
            }}
          >
            <Select.Option value={1}>{t('is')}</Select.Option>
            <Select.Option value={0}>{t('no')}</Select.Option>
          </Select>
          <Input
            className='search-input'
            prefix={<SearchOutlined />}
            placeholder={t('search_placeholder')}
            style={{ width: '294px' }}
            value={filter.queryContent}
            onChange={(e) => {
              setFilter({
                ...filter,
                queryContent: e.target.value,
              });
            }}
            onPressEnter={(e) => {
              setRefreshFlag(_.uniqueId('refresh_'));
            }}
          />
          <Button
            loading={exportBtnLoadding}
            onClick={() => {
              setExportBtnLoadding(true);
              exportEvents({ ...filterObj, limit: 1000000, p: 1 }, (err, csv) => {
                if (err) {
                  message.error(t('export_failed'));
                } else {
                  downloadFile(csv, `events_${moment().format('YYYY-MM-DD_HH-mm-ss')}.csv`);
                }
                setExportBtnLoadding(false);
              });
            }}
          >
            {t('export')}
          </Button>
        </Space>
      </div>
    );
  }

  const fetchData = ({ current, pageSize }) => {
    return getEvents({
      p: current,
      limit: pageSize,
      ...filterObj,
      bgid: bgid,
    }).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };

  const { tableProps } = useAntdTable(fetchData, {
    refreshDeps: [refreshFlag, JSON.stringify(filterObj)],
    defaultPageSize: 30,
  });

  return (
    <PageLayout icon={<AlertOutlined />} title={t('title')}>
      <div className='event-content'>
        <div className='table-area'>
          {renderLeftHeader()}
          <Table
            size='small'
            columns={columns}
            {...tableProps}
            rowClassName={(record: { severity: number; is_recovered: number }) => {
              return SeverityColor[record.is_recovered ? 3 : record.severity - 1] + '-left-border';
            }}
            pagination={{
              ...tableProps.pagination,
              pageSizeOptions: ['30', '100', '200', '500'],
            }}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default Event;
