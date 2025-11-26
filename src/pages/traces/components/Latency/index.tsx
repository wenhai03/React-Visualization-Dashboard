import React from 'react';
import { Row, Col, Input, Select, Card } from 'antd';
import queryString from 'query-string';
import { useLocation } from 'react-router-dom';
import { Mix, G2 } from '@ant-design/plots';
import { useTranslation } from 'react-i18next';

interface ILAtencyProps {
  loading: boolean;
  now: any;
  contrast?: any;
  onRefresh: (range: any) => void;
  height?: number;
}

const Latency: React.FC<ILAtencyProps> = (props) => {
  const { now = [], contrast = [], onRefresh, loading, height = 168 } = props;
  const { search } = useLocation();
  const params = queryString.parse(search);
  const { t } = useTranslation('traces');

  G2.registerInteraction('brush-x-value', {
    showEnable: [
      { trigger: 'plot:mouseenter', action: 'cursor:crosshair' },
      { trigger: 'mask:mouseenter', action: 'cursor:move' },
      { trigger: 'plot:mouseleave', action: 'cursor:default' },
      { trigger: 'mask:mouseleave', action: 'cursor:crosshair' },
    ],
    start: [
      {
        trigger: 'plot:mousedown',
        isEnable: (context) => {
          return context.isInPlot();
        },
        action: ['x-rect-mask:start', 'x-rect-mask:show'],
      },
    ],
    processing: [
      {
        trigger: 'plot:mousemove',
        isEnable: (context) => {
          return context.isInPlot();
        },
        action: 'x-rect-mask:resize',
      },
    ],
    end: [
      {
        trigger: 'plot:mouseup',
        action: ['element-filter:filter', 'x-rect-mask:end', 'x-rect-mask:hide', 'sibling-x-filter:reset'],
        callback: (context) => {
          const xScale = context.view.getXScale();
          const coord = context.view.getCoordinate();

          // 获取框选的的结果
          const { points } = context.getAction('x-rect-mask') as any;
          if (points.length > 1) {
            const point1 = coord.invert(points[0]);
            const point2 = coord.invert(points[points.length - 1]);

            // 拿到大大正确的起止点
            let minX = Math.min(point1['x'], point2['x']);
            let maxX = Math.max(point1['x'], point2['x']);

            // 和 range 范围做一些比较
            // @see: https://github.com/antvis/G2/blob/master/src/interaction/action/data/range-filter.ts#L9
            const [rangeMin, rangeMax] = xScale.range as any;
            if (minX < rangeMin) {
              minX = rangeMin;
            }
            if (maxX > rangeMax) {
              maxX = rangeMax;
            }
            // 范围大于整个 view 的范围，则返回 null
            if (minX === rangeMax && maxX === rangeMax) {
              return null;
            }

            // 将值域转换为定义域
            const minValue = xScale.invert(minX);
            const maxValue = xScale.invert(maxX);
            onRefresh({
              ...params,
              start: minValue,
              end: maxValue,
            });
          }
        },
      },
    ],
  });

  const config: any = {
    legend: {
      position: 'bottom',
      marker: (type) => ({
        symbol: 'square',
        style:
          type === t('avg') || type === t('95th') || type === t('99th')
            ? {
                fill: '#0065D9',
                stroke: '#0065D9',
                fillOpacity: 1,
              }
            : {
                fill: '#BAD3F7',
                stroke: '#BAD3F7',
                fillOpacity: 1,
              },
      }),
    },
    tooltip: {
      shared: true,
    },
    plots: [
      ...(contrast?.length
        ? [
            {
              type: 'area',
              options: {
                data: contrast || [],
                xField: 'time',
                yField: 'value',
                smooth: true,
                seriesField: 'type',
                color: '#BAD3F7',
                yAxis: {
                  label: {
                    formatter: (val) => val + ' ms',
                  },
                },
                areaStyle: {
                  fill: '#BAD3F7',
                  fillOpacity: 0.5,
                },
                animation: false,
              },
            },
          ]
        : []),
      {
        type: 'line',
        options: {
          data: now || [],
          xField: 'time',
          yField: 'value',
          smooth: true,
          seriesField: 'type',
          color: '#0065D9',
          yAxis: {
            label: {
              formatter: (val) => val + ' ms',
            },
          },
          interactions: [{ type: 'brush-x-value' }],
          animation: false,
        },
      },
    ],
  };

  return (
    <Card size='small'>
      <Row justify='space-between'>
        <Col>{t('table.delay')}</Col>
        <Col>
          <Input.Group compact>
            <span
              className='ant-input-group-addon'
              style={{
                width: 'max-content',
                height: 32,
                lineHeight: '32px',
              }}
            >
              {t('metrics')}
            </span>
            <Select
              style={{ width: 120 }}
              defaultValue='avg'
              value={params.aggregation_type}
              onChange={(e) => {
                onRefresh({
                  ...params,
                  aggregation_type: e,
                });
              }}
            >
              <Select.Option value='avg' key='avg'>
                Average
              </Select.Option>
              <Select.Option value='95th' key='95th'>
                95th percentile
              </Select.Option>
              <Select.Option value='99th' key='99th'>
                99th percentile
              </Select.Option>
            </Select>
          </Input.Group>
        </Col>
      </Row>
      <Mix {...config} height={height} loading={loading} style={{ padding: '15px 10px 0' }} />
    </Card>
  );
};

export default Latency;
