import * as React from 'react';
import { AutoSizer } from './AutoSizer';

const POPOVER_ARROW_SIZE = 12; // px, to position it later

interface SearchMarkerTooltipProps {
  markerPosition: ClientRect;
  children: React.ReactNode;
}

export class SearchMarkerTooltip extends React.PureComponent<SearchMarkerTooltipProps & any> {
  public render() {
    const { children, markerPosition, theme } = this.props;

    return (
      <div>
        <AutoSizer content={false} bounds>
          {({ measureRef, bounds: { width, height } }) => {
            //   const { top, left } =
            //     width && height
            //       ? calculatePopoverPosition(markerPosition, { width, height }, 'left', 16, [
            //           'left',
            //         ])
            //       : {
            //           left: -9999, // render off-screen before the first measurement
            //           top: 0,
            //         };
            const { top, left } = {
              left: -9999, // render off-screen before the first measurement
              top: 0,
            };

            return (
              <div
                style={{
                  left,
                  top,
                }}
                ref={measureRef}
              >
                <div style={{ left: width || 0, top: (height || 0) / 2 - POPOVER_ARROW_SIZE / 2 }} />
                <div>{children}</div>
              </div>
            );
          }}
        </AutoSizer>
      </div>
    );
  }
}
