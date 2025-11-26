import { scaleTime } from 'd3-scale';
import * as React from 'react';
import { getTimeLabelFormat, newTickFormat } from '../../utils';
import './index.less';

interface TimeRulerProps {
  end: number;
  height: number;
  start: number;
  tickCount: number;
  width: number;
  timezone: string;
}

const useZonedDate = (timestamp: number, timezone: string) => {
  const localTimezone = timezone === 'Browser' ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
  const zonedDateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: localTimezone, // 替换为需要的时区
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).format(new Date(timestamp));

  // 转换为 Date 对象
  return new Date(zonedDateStr);
};

export const TimeRuler: React.FC<TimeRulerProps> = ({ end, height, start, tickCount, width, timezone }) => {
  const startWithOffset = useZonedDate(start, timezone);
  const endWithOffset = useZonedDate(end, timezone);

  const yScale = scaleTime().domain([startWithOffset, endWithOffset]).range([0, height]);

  const ticks = yScale.ticks(tickCount);
  const timeLabelFormat = getTimeLabelFormat(startWithOffset.getTime(), endWithOffset.getTime());
  const formatTick = timeLabelFormat == null ? newTickFormat : yScale.tickFormat(tickCount, timeLabelFormat);

  return (
    <g>
      {ticks.map((tick, tickIndex) => {
        const y = yScale(tick) ?? 0;
        return (
          <g key={`tick${tickIndex}`}>
            <text className='time-ruler-text' x={0} y={y - 4}>
              {formatTick(tick)}
            </text>
            <line className='time-ruler-line' x1={0} y1={y} x2={width} y2={y} />
          </g>
        );
      })}
    </g>
  );
};

TimeRuler.displayName = 'TimeRuler';
