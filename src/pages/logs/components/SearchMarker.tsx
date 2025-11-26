import * as React from 'react';
import { SearchMarkerTooltip } from './SearchMarkerTooltip';
interface SearchMarkerProps {
  bucket: any;
  height: number;
  width: number;
  jumpToTarget: (target: any) => void;
}

interface SearchMarkerState {
  hoveredPosition: ClientRect | null;
}

export class SearchMarker extends React.PureComponent<SearchMarkerProps, SearchMarkerState> {
  public readonly state: SearchMarkerState = {
    hoveredPosition: null,
  };

  public handleClick: React.MouseEventHandler<SVGGElement> = (evt) => {
    evt.stopPropagation();

    this.props.jumpToTarget(this.props.bucket.representativeKey);
  };

  public handleMouseEnter: React.MouseEventHandler<SVGGElement> = (evt) => {
    this.setState({
      hoveredPosition: evt.currentTarget.getBoundingClientRect(),
    });
  };

  public handleMouseLeave: React.MouseEventHandler<SVGGElement> = () => {
    this.setState({
      hoveredPosition: null,
    });
  };

  public render() {
    const { bucket, height, width } = this.props;
    const { hoveredPosition } = this.state;

    const bulge =
      bucket.entriesCount > 1 ? (
        <rect x='-2' y='-2' width='4' height={height + 2} rx='2' ry='2' style={{ fill: 'rgb(240, 78, 152)' }} />
      ) : (
        <>
          <rect x='-1' y='0' width='2' height={height} style={{ fill: 'rgb(240, 78, 152)' }} />
          <rect x='-2' y={height / 2 - 2} width='4' height='4' rx='2' ry='2' style={{ fill: 'rgb(240, 78, 152)' }} />
        </>
      );

    return (
      <>
        {hoveredPosition ? <SearchMarkerTooltip markerPosition={hoveredPosition}></SearchMarkerTooltip> : null}
        <g onClick={this.handleClick} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <rect
            x='0'
            y='0'
            width={width}
            height={height}
            style={{ opacity: 0, cursor: 'pointer', fill: 'rgb(240, 78, 152)', transition: 'opacity 250ms ease-in 0s' }}
          />
          {bulge}
        </g>
      </>
    );
  }
}
