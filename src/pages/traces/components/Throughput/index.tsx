import React from 'react';
import { Row, Col, Card } from 'antd';
import queryString from 'query-string';
import { useLocation } from 'react-router-dom';
import { Mix, G2 } from '@ant-design/plots';
import { useTranslation } from 'react-i18next';

interface IThroughputProps {
  now: any;
  contrast?: any;
  onRefresh: (params: any) => void;
  loading: boolean;
}

const Throughput: React.FC<IThroughputProps> = (props) => {
  const { now = [], contrast = [], onRefresh, loading } = props;
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
          type === t('throughput')
            ? {
                fill: '#da8b45',
                stroke: '#da8b45',
                fillOpacity: 1,
              }
            : {
                fill: '#edc5a2',
                stroke: '#edc5a2',
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
                color: '#FFBB90',
                seriesField: 'type',
                animation: false,
                areaStyle: {
                  fill: '#edc5a2',
                  fillOpacity: 0.5,
                },
                yAxis: {
                  label: {
                    formatter: (val) => val + ' tpm',
                  },
                },
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
          color: '#FF8030',
          animation: false,
          yAxis: {
            label: {
              formatter: (val) => val + ' tpm',
            },
          },
          interactions: [{ type: 'brush-x-value' }],
        },
      },
    ],
  };

  return (
    <Card size='small'>
      <Row justify='space-between'>
        <Col>{t('throughput')}</Col>
      </Row>
      <Mix
        {...config}
        height={240}
        loading={loading}
        style={{ padding: '15px 10px 0' }}
        onEvent={(plot) => {
          plot.on(G2.BRUSH_FILTER_EVENTS.AFTER_FILTER, (event) => {
            if (event?.view?.filteredData) {
              const filteredData = event.view.filteredData;
              onRefresh({
                start: filteredData[0].time,
                end: filteredData[filteredData.length - 1].time,
              });
              event.stopPropagation();
            }
          });
        }}
      />
    </Card>
  );
};

export default Throughput;
