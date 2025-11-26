import { inRange } from 'lodash';
import React, { ReactNode } from 'react';
import { getDurationFormatter, conversionTime } from '@/pages/traces/utils';
import { Tooltip } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import queryString from 'query-string';

// Remove any tick that is too close to topTraceDuration
export const getXAxisTickValues = (tickValues: number[], topTraceDuration?: number) => {
  if (topTraceDuration == null) {
    return tickValues;
  }

  const padding = (tickValues[1] - tickValues[0]) / 2;
  const lowerBound = topTraceDuration - padding;
  const upperBound = topTraceDuration + padding;

  return tickValues.filter((value) => {
    const isInRange = inRange(value, lowerBound, upperBound);
    return !isInRange && value !== topTraceDuration;
  });
};

interface TimelineAxisProps {
  header?: ReactNode;
  plotValues: any;
  marks?: any[];
  topTraceDuration: number;
}

export function TimelineAxis({ plotValues, marks = [], topTraceDuration }: TimelineAxisProps) {
  const { margins, tickValues, width, xMax, xScale } = plotValues;
  const tickFormatter = getDurationFormatter(xMax);
  const { search } = useLocation();
  const params = queryString.parse(search);
  const timeRange = conversionTime(params.start, params.end);
  const duration = timeRange.end - timeRange.start;
  // 小于25小时（90000000），默认选择前一天，大于等于25小时，小于8天（691200000），默认选择上一周，大于等于8天，默认选择计算出来的日期
  let contrast_time_default = duration < 90000000 ? '1' : duration >= 691200000 ? '100' : '7';
  const tickPositionsAndLabels = getXAxisTickValues(tickValues, topTraceDuration).reduce<
    Array<{ position: number; label: string }>
  >((ticks, tick) => {
    const position = xScale(tick);
    return Number.isFinite(position) ? [...ticks, { position, label: tickFormatter(tick).formatted }] : ticks;
  }, []);
  const topTraceDurationPosition = topTraceDuration > 0 ? xScale(topTraceDuration) : NaN;
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        borderBottom: '1px solid rgb(152, 162, 179)',
        height: margins.top,
        zIndex: 2,
        width: '100%',
        backgroundColor: '#fff',
      }}
    >
      <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={margins.top}>
        <g transform={`translate(0 ${margins.top - 20})`}>
          {tickPositionsAndLabels.map(({ position, label }) => (
            <text
              key={`tick-${position}`}
              x={position}
              y={0}
              textAnchor='middle'
              fill='rgb(105, 112, 125)'
              fontSize={11}
            >
              {label}
            </text>
          ))}
          {Number.isFinite(topTraceDurationPosition) && (
            <text key='topTrace' x={topTraceDurationPosition} y={0} fill='rgb(105, 112, 125)' textAnchor='middle'>
              {tickFormatter(topTraceDuration).formatted}
            </text>
          )}
        </g>
      </svg>

      {marks.map((mark) => (
        <div key={mark.id} style={{ left: xScale(mark.offset) ?? 0 - 11 / 2, position: 'absolute', bottom: 0 }}>
          {
            mark.type === 'errorMark' ? (
              <Tooltip
                placement='top'
                trigger='click'
                color='rgb(255, 255, 255)'
                title={
                  <div style={{ color: 'rgb(105, 112, 125)' }}>
                    <div>@ {tickFormatter(mark.offset).formatted}</div>
                    <div>{mark?.error?.service?.name}</div>
                    <Link
                      className='jump-link'
                      to={{
                        pathname: '/service-tracking/error/view',
                        search: `?data_id=${params.data_id}&bgid=${params.bgid}&serviceName=${
                          mark?.error?.service?.name
                        }&transactionType=${params.transactionType}&environment=${params.environment}&start=${
                          params.start
                        }&end=${params.end}&filter=trace.id : "${mark?.error?.trace?.id}" and transaction.id : "${
                          mark?.error?.transaction?.id
                        }"&errorKey=${mark?.error?.error?.grouping_key}&contrast_time=${contrast_time_default}${
                          params.fieldRecord ? `&fieldRecord=${encodeURIComponent(params.fieldRecord as string)}` : ''
                        }`,
                      }}
                    >
                      {mark?.error?.message}
                    </Link>
                  </div>
                }
              >
                <div
                  style={{
                    width: '11px',
                    height: '11px',
                    marginRight: '0px',
                    background: 'rgb(189, 39, 30)',
                    borderRadius: '0px',
                    cursor: 'pointer',
                  }}
                ></div>
              </Tooltip>
            ) : null
            //   <AgentMarker mark={mark} />
          }
        </div>
      ))}
    </div>
  );
}
