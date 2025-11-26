import React from 'react';
import { G2, Column } from '@ant-design/plots';
import { Card, Row, Col } from 'antd';
import { getDurationFormatter } from './util';
import { useTranslation } from 'react-i18next';
import { asDuration } from '@/pages/traces/utils';

interface IProps {
  loading: boolean;
  all?: any;
  failure?: any;
  currentTransation?: any;
  ninetyFivePercent?: number;
  onRefresh: (values: any) => void;
}

const OverallLatencyDistribution: React.FC<IProps> = (props) => {
  const { t } = useTranslation('traces');
  const { all, failure, currentTransation, ninetyFivePercent, onRefresh, loading } = props;
  G2.registerInteraction('brush-x-value', {
    showEnable: [
      { trigger: 'plot:mouseenter', action: 'cursor:crosshair', isEnable: () => true },
      { trigger: 'mask:mouseenter', action: 'cursor:move', isEnable: () => true },
      { trigger: 'plot:mouseleave', action: 'cursor:default' },
      { trigger: 'mask:mouseleave', action: 'cursor:crosshair' },
    ],
    start: [
      {
        trigger: 'plot:mousedown',
        isEnable: (context) => {
          // 不要点击在 mask 上重新开始
          return !context.isInShape('mask');
        },
        action: [`x-rect-mask:start`, `x-rect-mask:show`],
      },
    ],
    processing: [
      {
        trigger: 'plot:mousemove',
        action: [`x-rect-mask:resize`],
      },
    ],
    end: [
      {
        trigger: 'plot:mouseup',
        action: [`x-rect-mask:end`],
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
              start: minValue,
              end: maxValue,
            });
          }
        },
      },
    ],
    rollback: [
      {
        trigger: 'dblclick',
        action: ['element-range-highlight:clear', `x-rect-mask:hide`],
        callback: (context) => {
          const { points } = context.getAction('x-rect-mask') as any;
          if (points.length > 1) {
            const data = all?.overallHistogram;
            onRefresh({
              start: data?.[0].key,
              end: data?.[(data?.length || 1) - 1].key,
            });
          }
        },
      },
    ],
  });

  const config: any = {
    data: [...(all?.overallHistogram || []), ...(failure?.overallHistogram || [])],
    columnWidthRatio: 1,
    xField: 'key',
    yField: 'doc_count',
    seriesField: 'type',
    animation: false,
    padding: [25, 0, 50, 30],
    legend: {
      position: 'bottom',
      offsetY: 10,
    },
    xAxis: {
      tickMethod: (ticks) => {
        const ticksLabel: string[] = [];
        const ticksValue: string[] = [];
        ticks.values.forEach((element) => {
          const label: string = getDurationFormatter(element, 0.9999)(element).formatted;
          if (!ticksLabel.includes(label)) {
            ticksLabel.push(label);
            ticksValue.push(element);
          }
        });
        return ticksValue;
      },
      label: {
        formatter: function formatter(d: any) {
          return getDurationFormatter(Number(d), 0.9999)(Number(d)).formatted;
        },
      },
      nice: false,
    },
    yAxis: {
      tickCount: 4,
      nice: false,
    },
    colorField: 'type',
    color: ({ type }) => {
      if (type === t('all_transactions')) {
        return '#0065D9';
      }
      return '#E30018';
    },
    interactions: [{ type: 'brush-x-value' }],
    annotations: [
      {
        type: 'line',
        top: true,
        start: [
          [...(all?.overallHistogram || []), ...(failure?.overallHistogram || [])].find(
            (item) => item.key > currentTransation?.duration,
          )?.key,
          'min',
        ],
        end: [
          [...(all?.overallHistogram || []), ...(failure?.overallHistogram || [])].find(
            (item) => item.key > currentTransation?.duration,
          )?.key,
          'max',
        ],
        style: {
          stroke: '#54b399',
          lineWidth: 2,
        },
        text: {
          content: `当前案例(${asDuration(currentTransation?.duration)})`,
          style: {
            textAlign: 'right',
            fill: '#54b399',
          },
          position: 'start',
          autoRotate: false,
          offsetX: (`当前案例(${asDuration(currentTransation?.duration)})`.length / 2) * 9,
          offsetY: 32,
        },
      },
      {
        type: 'line',
        top: true,
        start: [
          ninetyFivePercent !== undefined
            ? [...(all?.overallHistogram || []), ...(failure?.overallHistogram || [])].find(
                (item) => item.key > Number(ninetyFivePercent),
              )?.key
            : undefined,
          'min',
        ],
        end: [
          ninetyFivePercent !== undefined
            ? [...(all?.overallHistogram || []), ...(failure?.overallHistogram || [])].find(
                (item) => item.key > Number(ninetyFivePercent),
              )?.key
            : undefined,
          'max',
        ],
        style: {
          stroke: 'gray',
          lineWidth: 2,
        },
        text: {
          content: `p95(${asDuration(Number(ninetyFivePercent))})`,
          style: {
            textAlign: 'right',
            fill: 'gray',
          },
          position: 'end',
          autoRotate: false,
          offsetX: (`p95(${asDuration(Number(ninetyFivePercent))})`.length / 2) * 5,
          offsetY: -5,
        },
      },
    ],
  };

  return (
    <Card size='small' style={{ margin: '10px 0' }}>
      <Row justify='space-between'>
        <Col>{t('delay_distribution')}</Col>
      </Row>
      <Column loading={loading} {...config} height={240} style={{ padding: '15px 10px 0' }} />
    </Card>
  );
};

export default React.memo(OverallLatencyDistribution);
