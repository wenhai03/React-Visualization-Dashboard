import { scaleLinear, scaleTime } from 'd3-scale';
import { area, curveMonotoneY } from 'd3-shape';
import { max } from 'lodash';
import * as React from 'react';

interface DensityChartProps {
  buckets: any[];
  end: number;
  start: number;
  width: number;
  height: number;
}

export const DensityChart: React.FC<DensityChartProps> = ({ buckets, start, end, width, height }) => {
  if (start >= end || height <= 0 || width <= 0 || buckets.length <= 0) {
    return null;
  }

  const yScale = scaleTime().domain([start, end]).range([0, height]);

  const xMax = max(buckets.map((bucket) => bucket.entriesCount)) || 0;
  const xScale = scaleLinear().domain([0, xMax]).range([0, width]);

  const path = area<any>()
    .x0(xScale(0) ?? 0)
    .x1((bucket) => xScale(bucket.entriesCount) ?? 0)
    .y0((bucket) => yScale(bucket.start) ?? 0)
    .y1((bucket) => yScale(bucket.end) ?? 0)
    .curve(curveMonotoneY);

  const firstBucket = buckets[0];
  const lastBucket = buckets[buckets.length - 1];
  const pathBuckets = [
    // Make sure the graph starts at the count of the first point
    { start, end: start, entriesCount: firstBucket.entriesCount },
    ...buckets,
    // Make sure the line ends at the height of the last point
    { start: lastBucket.end, end: lastBucket.end, entriesCount: lastBucket.entriesCount },
    // If the last point is not at the end of the minimap, make sure it doesn't extend indefinitely and goes to 0
    { start: end, end, entriesCount: 0 },
  ];
  const pathData = path(pathBuckets);

  return (
    <g>
      <rect width={width} height={height} style={{ fill: 'rgb(245, 247, 250)' }} />
      <path d={pathData || ''} style={{ fill: 'rgb(211, 218, 230)' }} />
    </g>
  );
};
