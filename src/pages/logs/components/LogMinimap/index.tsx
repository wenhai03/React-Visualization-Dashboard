import { scaleLinear } from 'd3-scale';
import * as React from 'react';
import { DensityChart } from '../DensityChart';
import { HighlightedInterval } from '../HighlightedInterval';
import { SearchMarkers } from '../SearchMarkers';
import { TimeRuler } from '../TimeRuler';
import './index.less';

interface Interval {
  end: number;
  start: number;
}

interface LogMinimapProps {
  className?: string;
  height: number;
  highlightedInterval: Interval | null;
  jumpToTarget: (params: any) => any;
  summaryBuckets: any[];
  summaryHighlightBuckets?: any[];
  target: number | null;
  start: number | null;
  end: number | null;
  width: number;
  timezone: string;
}

interface LogMinimapState {
  target: number | null;
  timeCursorY: number;
}

// Wide enough to fit "September"
const TIMERULER_WIDTH = 50;

function calculateYScale(start: number | null, end: number | null, height: number) {
  return scaleLinear()
    .domain([start || 0, end || 0])
    .range([0, height]);
}

export class LogMinimap extends React.Component<LogMinimapProps, LogMinimapState> {
  constructor(props: LogMinimapProps) {
    super(props);
    this.state = {
      timeCursorY: 0,
      target: props.target,
    };
  }

  public handleClick: React.MouseEventHandler<SVGSVGElement> = (event) => {
    const minimapTop = event.currentTarget.getBoundingClientRect().top;
    const clickedYPosition = event.clientY - minimapTop;

    const clickedTime = Math.floor(this.getYScale().invert(clickedYPosition));

    this.props.jumpToTarget({
      tiebreaker: 0,
      time: clickedTime,
    });
  };

  public getYScale = () => {
    const { start, end, height } = this.props;
    return calculateYScale(start, end, height);
  };

  public getPositionOfTime = (time: number) => {
    return this.getYScale()(time) ?? 0;
  };

  private updateTimeCursor: React.MouseEventHandler<SVGSVGElement> = (event) => {
    const svgPosition = event.currentTarget.getBoundingClientRect();
    const timeCursorY = event.clientY - svgPosition.top;

    this.setState({ timeCursorY });
  };

  public render() {
    const {
      start,
      end,
      className,
      height,
      highlightedInterval,
      jumpToTarget,
      summaryBuckets,
      summaryHighlightBuckets,
      width,
      timezone,
    } = this.props;
    const { timeCursorY, target } = this.state;
    const [minTime, maxTime] = calculateYScale(start, end, height).domain();
    const tickCount = height ? Math.floor(height / 50) : 12;
    return (
      <svg
        className='minimap-wrapper'
        height={height}
        preserveAspectRatio='none'
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        onClick={this.handleClick}
        onMouseMove={this.updateTimeCursor}
      >
        <line className='minimap-border' x1={TIMERULER_WIDTH} x2={TIMERULER_WIDTH} y1={0} y2={height} />
        <TimeRuler
          start={minTime}
          end={maxTime}
          width={TIMERULER_WIDTH}
          height={height}
          tickCount={tickCount}
          timezone={timezone}
        />
        <g transform={`translate(${TIMERULER_WIDTH}, 0)`}>
          <DensityChart
            buckets={summaryBuckets}
            start={minTime}
            end={maxTime}
            width={width - TIMERULER_WIDTH}
            height={height}
          />

          <SearchMarkers
            buckets={summaryHighlightBuckets || []}
            start={minTime}
            end={maxTime}
            width={width - TIMERULER_WIDTH}
            height={height}
            jumpToTarget={jumpToTarget}
          />
        </g>

        {highlightedInterval ? (
          <HighlightedInterval
            className='minimap-heightlight-interval'
            end={highlightedInterval.end}
            getPositionOfTime={this.getPositionOfTime}
            start={highlightedInterval.start}
            targetWidth={TIMERULER_WIDTH}
            width={width}
            target={target}
          />
        ) : null}
        <line className='minimap-hover-line' x1={TIMERULER_WIDTH} x2={width} y1={timeCursorY} y2={timeCursorY} />
      </svg>
    );
  }
}
