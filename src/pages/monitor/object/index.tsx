import React, { useState, useContext, useEffect } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Select } from 'antd';
import { LineChartOutlined, InfoCircleOutlined } from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import { CommonStateContext } from '@/App';
import { Link } from 'react-router-dom';
import { IMatch } from './types';
import List from './metricViews/List';
import LabelsValues from './metricViews/LabelsValues';
import Metrics from './metricViews/Metrics';
import './locale';
import './style.less';

export default function QuickView() {
  const { t } = useTranslation('objectExplorer');
  const [match, setMatch] = useState<IMatch>();
  const [range, setRange] = useState<IRawTimeRange>({
    start: 'now-1h',
    end: 'now',
  });
  const [rerenderFlag, setRerenderFlag] = useState(_.uniqueId('rerenderFlag_'));
  const { groupedDatasourceList, curBusiId, profile } = useContext(CommonStateContext);
  const datasources = groupedDatasourceList.prometheus;
  const [datasourceValue, setDatasourceValue] = useState<number>();

  useEffect(() => {
    setMatch(undefined);
  }, [curBusiId]);

  useEffect(() => {
    const value = _.get(groupedDatasourceList, ['prometheus', 0, 'id']);
    setDatasourceValue(value);
  }, [groupedDatasourceList]);

  return (
    <PageLayout
      title={t('title')}
      icon={<LineChartOutlined />}
      rightArea={
        <div
          style={{
            marginRight: 20,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {t('common:datasource.name')}：
          <Select
            dropdownMatchSelectWidth={false}
            value={datasourceValue}
            onChange={(val) => {
              setDatasourceValue(val);
              setRerenderFlag(_.uniqueId('rerenderFlag_'));
            }}
          >
            {_.map(datasources, (item) => {
              return (
                <Select.Option key={item.id} value={item.id}>
                  {item.name}
                </Select.Option>
              );
            })}
          </Select>
        </div>
      }
    >
      {datasourceValue ? (
        <div className='n9e-metric-views' key={rerenderFlag}>
          <List
            datasourceValue={datasourceValue}
            onSelect={(record: IMatch) => {
              setMatch(record);
            }}
            range={range}
          />
          {match ? (
            <>
              <LabelsValues
                datasourceValue={datasourceValue}
                range={range}
                value={match}
                curBusiId={curBusiId}
                onChange={(val) => {
                  setMatch(val);
                }}
              />
              <Metrics
                datasourceValue={datasourceValue}
                range={range}
                setRange={setRange}
                match={match}
                curBusiId={curBusiId}
              />
            </>
          ) : null}
        </div>
      ) : (
        <div>
          <div className='n9e-metric-empty-views'>
            <p style={{ fontWeight: 'bold' }}>
              <InfoCircleOutlined style={{ color: '#1473ff' }} /> Tips
            </p>
            <p>
              {t('common:datasource.empty_modal.title')}{' '}
              {profile.admin ? <Link to='/busi-groups'>{t('common:datasource.empty_modal.btn1')}</Link> : null}
            </p>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
