import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { useAntdTable } from 'ahooks';
import _ from 'lodash';
import { SearchOutlined, ReloadOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Table, Tooltip, Card, Checkbox, Space, Input, Select, Spin, Empty } from 'antd';
import PageLayout from '@/components/pageLayout';
import { getAlertForecast, getAlertForecastMetric } from '@/services/warning';
import usePagination from '@/components/usePagination';
import { useParams } from 'react-router';
import { TimeRangePickerWithRefresh, IRawTimeRange, parseRange } from '@/components/TimeRangePicker';
import { Chart } from '@antv/g2';
import { newTickFormat } from '../utils';
import '../locale';
import './index.less';

interface IChartDataProps {
  section: {
    time: number;
    value: string[];
  }[];
  data: {
    time: number;
    value: string;
  }[];
  status: string;
}

const StrategyBrain: React.FC = () => {
  const { t } = useTranslation('alertRules');
  const chartRefs = useRef<any>({});
  const [filter, setFilter] = useState<{ prom_ql?: string; status?: Number }>({});
  const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);
  // 多图表实例
  const [cacheChart, setCacheChart] = useState<{ [key: string]: any }>();
  // 多图表越界点异常配置
  const [showAbnormalList, setShowAbnormalList] = useState<{ [key: string]: boolean }>();
  // 多图表时间配置
  const [timeRangeList, setTimeRangeList] = useState<{ [key: string]: IRawTimeRange }>();
  // 多个图表数据
  const [chartDataList, setChartDataList] = useState<{ [key: string]: IChartDataProps }>();
  // 多个图表 loading 状态
  const [loadingList, setLoadingList] = useState<{ [key: string]: boolean }>();
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const pagination = usePagination({ PAGESIZE_KEY: 'alert-strategy-brain' });
  const { id } =
    useParams<{
      id: string;
    }>();
  const [alertRuleInfo, setAlertRuleInfo] = useState<{ start: string; end: string; rule_name: string }>();

  const clip = (chart) => {
    const { canvas } = chart.getContext();
    const document = canvas.document;
    const [cloned] = document.getElementsByClassName('cloned-line');
    if (cloned) cloned.remove();
    const elements = document.getElementsByClassName('element');
    const line = elements.find((d) => d.markType === 'line');
    const area = elements.find((d) => d.markType === 'area');
    const clonedLine = line.cloneNode(true);
    clonedLine.__data__ = line.__data__;
    clonedLine.style.stroke = '#E30018';
    clonedLine.style.clipPath = null;
    clonedLine.className = 'cloned-line';
    line.parentNode.insertBefore(clonedLine, line);
    line.style.clipPath = area;
  };

  const columns = [
    {
      title: 'PromQL',
      dataIndex: 'prom_ql',
      ellipsis: {
        showTitle: false,
      },
      render: (val) => (
        <Tooltip
          placement='topLeft'
          title={val}
          overlayInnerStyle={{
            maxWidth: 650,
            width: 'max-content',
            height: 'max-content',
          }}
        >
          {val}
        </Tooltip>
      ),
    },
    {
      title: t('common:datasource.name'),
      dataIndex: 'datasource_name',
      width: 100,
    },
    {
      title: t('metric.status'),
      dataIndex: 'status',
      width: 90,
      render: (val) => t(`metric.status_${val}`),
    },
    {
      title: t('metric.reason'),
      dataIndex: 'reason',
      ellipsis: {
        showTitle: false,
      },
      render: (val) => (
        <Tooltip
          placement='topLeft'
          title={val}
          overlayInnerStyle={{
            maxWidth: 650,
            width: 'max-content',
            height: 'max-content',
          }}
        >
          {val}
        </Tooltip>
      ),
    },
    {
      title: t('metric.cost'),
      dataIndex: 'cost',
      width: 150,
    },
    {
      title: t('metric.last_time'),
      dataIndex: 'last_time',
      width: 150,
      render: (text: number) => moment.unix(text).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  const featchData = ({ current, pageSize }: { current: number; pageSize: number }): Promise<any> => {
    const query = {
      rule_id: id,
      limit: pageSize,
      p: current,
      ...filter,
    };
    return getAlertForecast(query).then((res) => {
      setAlertRuleInfo({ start: res.dat.start, end: res.dat.end, rule_name: res.dat.rule_name });
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };

  const { tableProps } = useAntdTable(featchData, {
    refreshDeps: [filter, refreshFlag],
    defaultPageSize: pagination.pageSize,
  });

  const refreshData = (val, id) => {
    cacheChart?.[`chart${id}`]?.clear();
    setTimeRangeList({ ...timeRangeList, [`chart${id}`]: val });
    getDetail(id, val, showAbnormalList?.[`chart${id}`]);
  };

  const drawChart = (id, chartData, showAbnormal) => {
    let chart;
    if (cacheChart?.[`chart${id}`]) {
      chart = cacheChart[`chart${id}`];
    } else {
      chart = new Chart({
        container: chartRefs.current[`chart${id}`]?.dom,
        autoFit: true,
        height: 200,
      });
      setCacheChart({
        ...cacheChart,
        [`chart${id}`]: chart,
      });
    }
    chart
      .data({
        value: chartData?.section || [],
        transform: [
          {
            type: 'map',
            callback: (d) => ({
              time: d.time,
              low: d.value[0],
              high: d.value[1],
            }),
          },
        ],
      })
      .axis('x', { title: false, labelFormatter: (v) => newTickFormat(new Date(v * 1000)) })
      .axis('y', { title: false });

    chart
      .area()
      .encode('x', (d) => d.time)
      .encode('y', ['low', 'high'])
      .encode('shape', 'area')
      .style('fillOpacity', 0.3)
      .style('fill', '#BDC2CC')
      .tooltip({
        title: (d) => moment.unix(d.time).format('YYYY-MM-DD HH:mm:ss'),
        items: [
          (d) => ({ name: 'Max', value: d.high, color: '#BDC2CC' }),
          (d) => ({ name: 'Min', value: d.low, color: '#BDC2CC' }),
        ],
      });

    chart
      .line()
      .data(chartData?.data || [])
      .encode('x', (d) => d.time)
      .encode('y', 'value')
      .encode('shape', 'line')
      .style('stroke', '#0065D9')
      .style('lineWidth', 1)
      .tooltip({
        title: (d) => moment.unix(d.time).format('YYYY-MM-DD HH:mm:ss'),
        items: [(d) => ({ name: 'Value', value: d.value, color: '#0065D9' })],
      });

    if (showAbnormal) {
      chart.on('afterrender', () => clip(chart));
    }
    chart.render();
    setLoadingList({ ...loadingList, [`chart${id}`]: false });
  };

  const getDetail = (id, timeRange, showAbnormal) => {
    const time = parseRange(timeRange);
    const start = moment(time.start).unix();
    const end = moment(time.end).unix();
    const requestParams = {
      id: id,
      start,
      end,
    };
    setLoadingList({ ...loadingList, [`chart${id}`]: true });
    getAlertForecastMetric(requestParams)
      .then((res) => {
        const forecast_hi = res.dat.matrix?.find((item) => item.metric.__name__.startsWith('forecast_hi'));
        const forecast_lo = res.dat.matrix?.find((item) => item.metric.__name__.startsWith('forecast_lo'));
        const forecast_value = res.dat.matrix?.find(
          (item) => !item.metric.__name__.startsWith('forecast_hi') && !item.metric.__name__.startsWith('forecast_lo'),
        );
        const section = forecast_hi?.values?.map((element, index) => ({
          time: element[0],
          value: [Number(forecast_lo?.values?.[index]?.[1]), Number(element[1])],
        }));
        const data = forecast_value?.values?.map((item) => ({ time: item[0], value: Number(item[1]) }));
        setChartDataList({
          ...chartDataList,
          [`chart${id}`]: { section: section, data: data, status: res.dat.status },
        });
        drawChart(id, { section: section, data: data, status: res.dat.status }, showAbnormal);
      })
      .catch((err) => setLoadingList({ ...loadingList, [`chart${id}`]: false }));
  };

  return (
    <PageLayout
      showBack
      backPath='/alert-rules'
      title={`${t('training_result')}（${t('title')}：${alertRuleInfo?.rule_name ?? ''}）`}
    >
      <div>
        <div className='alert-rule-strategy-brain'>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setRefreshFlag(_.uniqueId('refresh_'));
              }}
            />
            <Input
              className={'searchInput'}
              prefix={<SearchOutlined />}
              onPressEnter={(e: any) => setFilter({ ...filter, prom_ql: e.target.value })}
              placeholder='promql'
              allowClear
            />
            <Select
              allowClear
              value={filter.status}
              style={{ width: '100px' }}
              placeholder={t('metric.status')}
              onChange={(val) => {
                setFilter({
                  ...filter,
                  status: val,
                });
              }}
            >
              <Select.Option key='0' value={0}>
                {t('metric.status_0')}
              </Select.Option>
              <Select.Option key='1' value={1}>
                {t('metric.status_1')}
              </Select.Option>
              <Select.Option key='2' value={2}>
                {t('metric.status_2')}
              </Select.Option>
              <Select.Option key='3' value={3}>
                {t('metric.status_3')}
              </Select.Option>
            </Select>
          </Space>
          <Table
            size='small'
            rowKey='id'
            columns={columns}
            {...tableProps}
            pagination={{
              ...tableProps.pagination,
              ...pagination,
            }}
            expandable={{
              expandedRowKeys: expandedRowKeys,
              expandIcon: ({ expanded, onExpand, record }) => {
                return expanded ? (
                  <DownOutlined
                    onClick={(e) => {
                      cacheChart?.[`chart${record.id}`]?.clear();
                      const newKeys = expandedRowKeys.filter((item) => item !== record.id);
                      setExpandedRowKeys(newKeys);
                      onExpand(record, e);
                    }}
                  />
                ) : (
                  <RightOutlined
                    onClick={(e) => {
                      setExpandedRowKeys(Array.from(new Set([...expandedRowKeys, record.id])));
                      setTimeRangeList({
                        ...timeRangeList,
                        [`chart${record.id}`]: {
                          start: `now-${alertRuleInfo!.start}`,
                          end: `now+${alertRuleInfo!.end}`,
                        },
                      });
                      getDetail(
                        record.id,
                        {
                          start: `now-${alertRuleInfo!.start}`,
                          end: `now+${alertRuleInfo!.end}`,
                        },
                        showAbnormalList?.[`chart${record.id}`],
                      );
                      onExpand(record, e);
                    }}
                  />
                );
              },
              expandedRowRender: (record) => (
                <Card
                  key={record.id}
                  title={t('metric.interval_prediction_curve')}
                  size='small'
                  className='strategy-brain-chart'
                  extra={
                    <Space>
                      <TimeRangePickerWithRefresh
                        dateFormat='YYYY-MM-DD HH:mm:ss'
                        value={timeRangeList?.[`chart${record.id}`]}
                        onChange={(e) => refreshData(e, record.id)}
                      />
                      <Checkbox
                        checked={Boolean(showAbnormalList?.[`chart${record.id}`])}
                        onChange={(e) => {
                          cacheChart?.[`chart${record.id}`]?.clear();
                          setShowAbnormalList({ ...showAbnormalList, [`chart${record.id}`]: e.target.checked });
                          drawChart(record.id, chartDataList?.[`chart${record.id}`], e.target.checked);
                        }}
                      >
                        {t('metric.show_overreach_exception')}
                      </Checkbox>
                    </Space>
                  }
                >
                  <Spin spinning={loadingList?.[`chart${record.id}`]}>
                    {chartDataList?.[`chart${record.id}`] ? (
                      chartDataList?.[`chart${record.id}`]?.status === '' ? (
                        <div ref={(el) => (chartRefs.current[`chart${record.id}`] = { dom: el })} />
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description={chartDataList?.[`chart${record.id}`]?.status}
                        />
                      )
                    ) : (
                      <div style={{ padding: '10px' }} />
                    )}
                  </Spin>
                </Card>
              ),
            }}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default StrategyBrain;
