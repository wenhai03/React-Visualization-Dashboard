import * as React from 'react';

interface HighlightedIntervalProps {
  className?: string;
  getPositionOfTime: (time: number) => number;
  start: number;
  end: number;
  targetWidth: number;
  width: number;
  target: number | null;
}

export const HighlightedInterval: React.FC<HighlightedIntervalProps> = ({
  className,
  end,
  getPositionOfTime,
  start,
  targetWidth,
  width,
  target,
}) => {
  const yStart = getPositionOfTime(start);
  const yEnd = getPositionOfTime(end);
  const yTarget = target && getPositionOfTime(target);

  return (
    <>
      {/* {yTarget && <line className={className} x1={0} x2={targetWidth} y1={yTarget} y2={yTarget} />} */}
      <polygon
        className={className}
        points={` ${targetWidth},${yStart} ${width},${yStart} ${width},${yEnd}  ${targetWidth},${yEnd}`}
      />
    </>
  );
};

HighlightedInterval.displayName = 'HighlightedInterval';
