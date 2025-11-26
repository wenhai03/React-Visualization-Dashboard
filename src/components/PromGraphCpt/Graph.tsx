/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React, { useState, useEffect, useContext } from 'react';
import moment from 'moment';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Space, InputNumber, Radio, Button, Popover, message } from 'antd';
import { LineChartOutlined, AreaChartOutlined, SettingOutlined, ShareAltOutlined } from '@ant-design/icons';
import TimeRangePicker, { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';
import LineGraphStandardOptions from './components/GraphStandardOptions';
import Timeseries from '@/pages/dashboard/Renderer/Renderer/Timeseries';
import { completeBreakpoints } from '@/pages/dashboard/Renderer/datasource/utils';
import { CommonStateContext } from '@/App';
import { getPromData } from './services';
import { createShareChartID } from '@/services/metricViews';
import { QueryStats } from './components/QueryStatsView';
import ShareChartModal from '@/components/ShareChartModal';
import './locale';

interface IProps {
  url: string;
  datasourceValue: number;
  promql?: string;
  setQueryStats: (stats: QueryStats) => void;
  setErrorContent: (content: string) => void;
  contentMaxHeight: number;
  range: IRawTimeRange;
  setRange: (range: IRawTimeRange) => void;
  step?: number;
  setStep: (step?: number) => void;
  graphOperates: {
    enabled: boolean;
  };
  refreshFlag: string;
  groupId: number;
}

enum ChartType {
  Line = 'line',
  StackArea = 'stackArea',
}

const getSerieName = (metric: any) => {
  const metricName = metric?.__name__ || '';
  const labels = _.keys(metric)
    .filter((ml) => ml !== '__name__')
    .map((label) => {
      return `${label}="${metric[label]}"`;
    });

  return `${metricName}{${_.join(labels, ',')}}`;
};

export default function Graph(props: IProps) {
  const { datasourceList } = useContext(CommonStateContext);
  const {
    url,
    groupId,
    datasourceValue,
    promql,
    setQueryStats,
    setErrorContent,
    contentMaxHeight,
    range,
    setRange,
    step,
    setStep,
    graphOperates,
    refreshFlag,
  } = props;
  const { t } = useTranslation('promGraphCpt');
  const [data, setData] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const [searchRange, setSearchRange] = useState({ start: 0, end: 0 });
  const [highLevelConfig, setHighLevelConfig] = useState({
    shared: true,
    sharedSortDirection: 'desc',
    legend: true,
    unit: 'none',
    reverseColorOrder: false,
    colorDomainAuto: true,
    colorDomain: [],
    chartheight: 300,
  });
  const [chartType, setChartType] = useState<ChartType>(ChartType.Line);
  const lineGraphProps = {
    custom: {
      drawStyle: 'lines',
      fillOpacity: chartType === ChartType.Line ? 0 : 0.5,
      stack: chartType === ChartType.Line ? 'hidden' : 'noraml',
      lineInterpolation: 'smooth',
    },
    options: {
      legend: {
        displayMode: highLevelConfig.legend ? 'table' : 'hidden',
      },
      tooltip: {
        mode: highLevelConfig.shared ? 'all' : 'single',
        sort: highLevelConfig.sharedSortDirection,
      },
      standardOptions: {
        util: highLevelConfig.unit,
      },
    },
  };

  useEffect(() => {
    if (datasourceValue && promql) {
      const parsedRange = parseRange(range);
      const start = moment(parsedRange.start).unix();
      const end = moment(parsedRange.end).unix();
      setSearchRange({ start: moment(parsedRange.start).valueOf(), end: moment(parsedRange.end).valueOf() });
      let realStep = step;
      if (!step) realStep = Math.max(Math.floor((end - start) / 240), 1);
      const queryStart = Date.now();
      getPromData(
        `${url}/${datasourceValue}/api/v1/query_range`,
        {
          query: promql,
          start: moment(parsedRange.start).unix(),
          end: moment(parsedRange.end).unix(),
          step: realStep,
        },
        groupId,
      )
        .then((res) => {
          const series = _.map(res?.result, (item) => {
            return {
              id: _.uniqueId('series_'),
              name: getSerieName(item.metric),
              metric: item.metric,
              data: completeBreakpoints(realStep, item.values),
            };
          });
          setQueryStats({
            loadTime: Date.now() - queryStart,
            resolution: step,
            resultSeries: series.length,
          });

          setData(series);
        })
        .catch((err) => {
          const msg = _.get(err, 'message');
          setErrorContent(`Error executing query: ${msg}`);
        });
    }
  }, [JSON.stringify(range), step, datasourceValue, promql, refreshFlag]);

  const onCreateShareUrl = async (values) => {
    const dataProps = {
      type: 'timeseries',
      version: '3.0.0',
      name: promql,
      step,
      range: searchRange,
      ...lineGraphProps,
      targets: [
        {
          expr: promql,
        },
      ],
      datasourceCate: 'prometheus',
      datasourceName: _.find(datasourceList, { id: datasourceValue })?.name,
      datasourceValue,
      group_id: groupId,
    };
    let expiration: number;
    const size = Number(values.size);
    if (values.size === '') {
      expiration = -1;
    } else {
      const interval = size * (values.unit === 'h' ? 3600 : 86400);
      expiration = moment(new Date()).unix() + interval;
    }
    const result = await createShareChartID([
      {
        configs: JSON.stringify({
          dataProps,
        }),
        share_type: 2, //1：仪表盘，2，单个图表
        expiration: expiration,
        user_ids: values.user_ids,
        note: values.note,
        group_id: groupId,
      },
    ]);
    return '/chart/' + result.dat[0];
  };

  return (
    <div className='prom-graph-graph-container'>
      <div className='prom-graph-graph-controls'>
        <Space>
          <TimeRangePicker value={range} onChange={setRange} dateFormat='YYYY-MM-DD HH:mm:ss' />
          <InputNumber
            placeholder='Res. (s)'
            value={step}
            onKeyDown={(e: any) => {
              if (e.code === 'Enter') {
                setStep(_.toNumber(e.target.value));
              }
            }}
            onBlur={(e) => {
              setStep(_.toNumber(e.target.value));
            }}
          />
          <Radio.Group
            options={[
              { label: <LineChartOutlined />, value: ChartType.Line },
              { label: <AreaChartOutlined />, value: ChartType.StackArea },
            ]}
            onChange={(e) => {
              e.preventDefault();
              setChartType(e.target.value);
            }}
            value={chartType}
            optionType='button'
            buttonStyle='solid'
          />
          {graphOperates.enabled && (
            <>
              <Popover
                placement='left'
                content={
                  <LineGraphStandardOptions highLevelConfig={highLevelConfig} setHighLevelConfig={setHighLevelConfig} />
                }
                trigger='click'
                autoAdjustOverflow={false}
                getPopupContainer={() => document.body}
              >
                <Button icon={<SettingOutlined />} />
              </Popover>
              <Button
                icon={
                  <ShareAltOutlined
                    onClick={() => (datasourceValue && promql ? setVisible(true) : message.warning(t('share_tip')))}
                  />
                }
              />
            </>
          )}
        </Space>
      </div>
      <Timeseries inDashboard={false} values={lineGraphProps as any} series={data} />
      <ShareChartModal
        visible={visible}
        onCancel={() => setVisible(false)}
        mode='add'
        onCreateShareUrl={onCreateShareUrl}
      />
    </div>
  );
}
