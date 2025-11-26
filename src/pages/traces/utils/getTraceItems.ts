import moment from 'moment';
import _ from 'lodash';

export interface TraceItems {
  exceedsMax: boolean;
  traceDocs: any[];
  errorDocs: any[];
  spanLinksCountById: Record<string, number>;
  traceItemCount: number;
  maxTraceItems: number;
  encryptedTraceId: string;
}

export function getBufferedTimerange({
  start,
  end,
  bufferSize = 4,
}: {
  start: number;
  end: number;
  bufferSize?: number;
}) {
  return {
    startWithBuffer: moment(start).subtract(bufferSize, 'days').valueOf(),
    endWithBuffer: moment(end).add(bufferSize, 'days').valueOf(),
  };
}
