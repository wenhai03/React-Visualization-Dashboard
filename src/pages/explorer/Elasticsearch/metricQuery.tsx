import _ from 'lodash';
import { getDsQuery } from './services';
import { normalizeTime } from '@/pages/alertRules/utils';
import { normalizeTimeseriesQueryRequestBody } from './utils';

interface IOptions {
  datasourceCate: string;
  datasourceValue: number;
  query: any;
  start: number;
  end: number;
  interval: number;
  intervalUnit: 'second' | 'min' | 'hour';
  version: string;
  curBusiId: number;
}

export default async function metricQuery(options: IOptions) {
  const { query, datasourceValue, start, end, interval, intervalUnit, version, curBusiId } = options;
  let series: any[] = [];
  let intervalkey = version === '8.0+' ? 'fixed_interval' : 'interval';
  const res = await getDsQuery(
    datasourceValue,
    normalizeTimeseriesQueryRequestBody(
      {
        index: query.index,
        filter: query.filter,
        date_field: query.date_field,
        interval: `${normalizeTime(interval, intervalUnit)}s`,
        start: start,
        end: end,
      },
      intervalkey,
    ),
    curBusiId,
  );
  series = [
    {
      id: _.uniqueId('series_'),
      name: 'doc_count',
      metric: {
        __name__: 'doc_count',
      },
      data: _.map(res, (item) => {
        return [item.key / 1000, item.doc_count];
      }),
    },
  ];
  return series;
}
