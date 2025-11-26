import React, { useContext, useState } from 'react';
import { Button, Input, message, Modal, Select, Space, Row, Col } from 'antd';
import {
  AlertOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import AdvancedWrap from '@/components/AdvancedWrap';
import PageLayout from '@/components/pageLayout';
import { deleteAlertEvents } from '@/services/warning';
import { AutoRefresh } from '@/components/TimeRangePicker';
import { CommonStateContext } from '@/App';
import { setDefaultHours } from '@/pages/historyEvents';
import Card from './card';
import Table from './Table';
import { hoursOptions } from './constants';
import './locale';
import './index.less';

const { confirm } = Modal;
export const SeverityColor = ['red', 'orange', 'yellow', 'green'];
export function deleteAlertEventsModal(ids: number[], onSuccess = () => {}, t) {
  confirm({
    title: t('delete_confirm.title'),
    okText: t('common:btn.ok'),
    cancelText: t('common:btn.cancel'),
    icon: <ExclamationCircleOutlined />,
    content: t('delete_confirm.content'),
    maskClosable: true,
    okButtonProps: { danger: true },
    zIndex: 1001,
    onOk() {
      return deleteAlertEvents(ids).then((res) => {
        message.success(t('common:success.delete'));
        onSuccess();
      });
    },
    onCancel() {},
  });
}

const Event: React.FC = () => {
  const { t } = useTranslation('AlertCurEvents');
  const { search } = useLocation();
  const { id } = queryString.parse(search) as { id?: string };
  const [view, setView] = useState<'card' | 'list'>('card');
  const { curBusiId, datasourceList } = useContext(CommonStateContext);
  const bgid = id ? Number(id) : curBusiId;
  const [filter, setFilter] = useState<{
    hours?: number;
    cate?: string;
    datasourceIds: number[];
    severity?: number;
    queryContent: string;
    rule_prods: string[];
  }>({
    datasourceIds: [],
    queryContent: '',
    rule_prods: [],
  });
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  function renderLeftHeader() {
    return (
      <Row justify='space-between' style={{ width: '100%' }}>
        <Space>
          <Button icon={<AppstoreOutlined />} onClick={() => setView('card')} />
          <Button icon={<UnorderedListOutlined />} onClick={() => setView('list')} />
          <Select
            allowClear
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
                    label: t('rule_prod_firemap'),
                    value: 'firemap',
                  },
                  {
                    label: t('rule_prod_northstar'),
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
            allowClear
            style={{ minWidth: 80 }}
            placeholder={t('severity')}
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
          <Input
            className='search-input'
            prefix={<SearchOutlined />}
            placeholder={t('search_placeholder')}
            style={{ width: '290px' }}
            value={filter.queryContent}
            onChange={(e) => {
              setFilter({
                ...filter,
                queryContent: e.target.value,
              });
            }}
          />
        </Space>
        <Col
          flex='100px'
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          {view === 'list' && (
            <Button
              danger
              style={{ marginRight: 8 }}
              disabled={selectedRowKeys.length === 0}
              onClick={() =>
                deleteAlertEventsModal(
                  selectedRowKeys,
                  () => {
                    setSelectedRowKeys([]);
                    setRefreshFlag(_.uniqueId('refresh_'));
                  },
                  t,
                )
              }
            >
              {t('common:btn.batch_delete')}
            </Button>
          )}
          <AutoRefresh
            onRefresh={() => {
              setRefreshFlag(_.uniqueId('refresh_'));
            }}
          />
        </Col>
      </Row>
    );
  }

  const filterObj = Object.assign(
    { hours: filter.hours },
    filter.datasourceIds.length ? { datasource_ids: filter.datasourceIds } : {},
    filter.severity ? { severity: filter.severity } : {},
    filter.queryContent ? { query: filter.queryContent } : {},
    { bgid: bgid },
    filter.rule_prods.length ? { rule_prods: _.join(filter.rule_prods, ',') } : {},
  );

  return (
    <PageLayout icon={<AlertOutlined />} title={t('title')}>
      {view === 'card' ? (
        <Card header={renderLeftHeader()} filter={filterObj} refreshFlag={refreshFlag} />
      ) : (
        <Table
          header={renderLeftHeader()}
          filter={filter}
          filterObj={filterObj}
          setFilter={setFilter}
          refreshFlag={refreshFlag}
          selectedRowKeys={selectedRowKeys}
          setSelectedRowKeys={setSelectedRowKeys}
        />
      )}
    </PageLayout>
  );
};

export default Event;
