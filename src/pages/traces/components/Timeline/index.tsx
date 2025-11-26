import React, { useState, useRef, useEffect } from 'react';
import { scaleLinear } from 'd3-scale';
import { Affix } from 'antd';
import _ from 'lodash';
import { TimelineAxis } from './TimelineAxis';
import { VerticalLines } from './VerticalLines';

export type PlotValues = ReturnType<typeof getPlotValues>;

export function getPlotValues({
  width,
  xMin = 0,
  xMax,
  height,
  margins,
}: {
  width: number;
  xMin?: number;
  xMax: number;
  height: number;
  margins: Margins;
}) {
  const xScale = scaleLinear()
    .domain([xMin, xMax])
    .range([margins.left, width - margins.right]);

  return {
    height,
    margins,
    tickValues: xScale.ticks(7),
    width,
    xDomain: xScale.domain(),
    xMax,
    xScale,
  };
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface TimelineProps {
  marks?: any[];
  xMin?: number;
  xMax?: number;
  height: number;
  margins: Margins;
  width?: number;
}

function TimeLineContainer({ width, xMin, xMax, height, marks, margins }: TimelineProps) {
  if (xMax == null || !width) {
    return null;
  }
  const plotValues = getPlotValues({ width, xMin, xMax, height, margins });
  const topTraceDuration = xMax - (xMin ?? 0);

  return (
    <>
      <Affix offsetTop={76} target={() => document.getElementById('traces-detail')}>
        <TimelineAxis plotValues={plotValues} marks={marks} topTraceDuration={topTraceDuration} />
      </Affix>
      <VerticalLines plotValues={plotValues} marks={marks} topTraceDuration={topTraceDuration} />
    </>
  );
}

export default function Timeline(props: TimelineProps) {
  const [width, setWidth] = useState(0);
  const resizeRef = useRef<HTMLDivElement>(null);

  const calcRow = () => {
    if (resizeRef.current) {
      const { clientWidth } = resizeRef.current;
      setWidth(clientWidth);
    }
  };

  const resizeTable = _.throttle(() => {
    calcRow();
  }, 100);

  useEffect(() => {
    calcRow();
    window.addEventListener('resize', resizeTable);
    return () => {
      window.removeEventListener('resize', resizeTable);
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }} ref={resizeRef}>
      <TimeLineContainer {...props} width={width} />
    </div>
  );
}
