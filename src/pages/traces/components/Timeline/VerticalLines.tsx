import React from 'react';
import { PlotValues } from '../Timeline';

interface VerticalLinesProps {
  marks?: any[];
  plotValues: PlotValues;
  topTraceDuration: number;
}

export function VerticalLines({ topTraceDuration, plotValues, marks = [] }: VerticalLinesProps) {
  const { width, height, margins, tickValues, xScale } = plotValues;

  const markTimes = marks.filter((mark) => mark.verticalLine).map(({ offset }) => offset);

  const tickPositions = tickValues.reduce<number[]>((positions: any, tick: any) => {
    const position = xScale(tick);
    return Number.isFinite(position) ? [...positions, position] : positions;
  }, []);

  const markPositions = markTimes.reduce<number[]>((positions, mark) => {
    const position = xScale(mark);
    return Number.isFinite(position) ? [...positions, position] : positions;
  }, []);

  const topTraceDurationPosition = topTraceDuration > 0 ? xScale(topTraceDuration) : NaN;

  return (
    <svg
      width={width}
      height={height + margins.top}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    >
      <g transform={`translate(0 ${margins.top})`}>
        {tickPositions.map((position) => (
          <line key={`tick-${position}`} x1={position} x2={position} y1={0} y2={height} stroke='rgb(245, 247, 250)' />
        ))}
        {markPositions.map((position) => (
          <line key={`mark-${position}`} x1={position} x2={position} y1={0} y2={height} stroke='rgb(245, 247, 250)' />
        ))}
        {Number.isFinite(topTraceDurationPosition) && (
          <line
            key='topTrace'
            x1={topTraceDurationPosition}
            x2={topTraceDurationPosition}
            y1={0}
            y2={height}
            stroke='rgb(245, 247, 250)'
          />
        )}
      </g>
    </svg>
  );
}
