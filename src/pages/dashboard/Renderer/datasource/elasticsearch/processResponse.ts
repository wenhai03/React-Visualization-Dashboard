import _ from 'lodash';
import { getSerieName } from '@/pages/dashboard/Renderer/datasource/utils';

function processAggregations(
  aggregations: any,
  seriesList: any[],
  metric: { [index: string]: string },
  hasCountFunc: boolean,
  calc?: string,
) {
  let aggId;
  const metricObj = _.cloneDeep(metric);
  for (aggId in aggregations) {
    const buckets = aggregations[aggId].buckets;
    if (aggId === 'date') {
      const subAggs = _.omit(buckets[0], ['key', 'key_as_string', 'doc_count']);
      if (hasCountFunc) {
        seriesList.push({
          metric: {
            ...metricObj,
            __name__: 'count',
          },
          value: aggregations.doc_count,
          data: [],
        });
      }
      // console.log('calc --->', calc)
      _.forEach(subAggs, (_subAgg, subAggId) => {
        if (subAggId.indexOf('p90') === 0 || subAggId.indexOf('p95') === 0 || subAggId.indexOf('p99') === 0) {
          const percentilesField = subAggId.split(subAggId.substring(0, 4))[1];
          const percentiles = _subAgg.values;
          _.forEach(percentiles, (_percentileValue, percentileKey) => {
            seriesList.push({
              metric: {
                ...metricObj,
                __name__: `p${percentileKey}_${percentilesField}`,
              },
              value: calc === 'valueExtraction' ? _.values(aggregations?.[`p${percentileKey.replace(/\.\d+$/, "")}_${percentilesField}`]?.values)[0] : _.values(percentiles)[0],
              data: [],
            });
          });
        } else {
          seriesList.push({
            metric: {
              ...metricObj,
              __name__: subAggId,
            },
            value: calc === 'valueExtraction' ? aggregations?.[subAggId]?.value : subAggs?.[subAggId]?.value,
            data: [],
          });
        }
      });
    }
    _.forEach(buckets, (bucket) => {
      const { key, doc_count } = bucket;
      const subAggs = _.omit(bucket, ['key', 'key_as_string']) as any[];
      if (aggId === 'date') {
        _.forEach(subAggs, (subAgg, subAggId: string) => {
          if (subAggId.indexOf('p90') === 0 || subAggId.indexOf('p95') === 0 || subAggId.indexOf('p99') === 0) {
            const percentilesField = subAggId.split(subAggId.substring(0, 4))[1];
            const percentiles = subAgg.values;
            _.forEach(percentiles, (percentileValue, percentileKey) => {
              const series = _.find(seriesList, (s) =>
                _.isEqual(s.metric, {
                  ...metric,
                  __name__: `p${percentileKey}_${percentilesField}`,
                }),
              );
              if (series) {
                series.data.push([key / 1000, percentileValue]);
              }
            });
          } else {
            const { value } = subAgg;
            const series = _.find(seriesList, (s) =>
              _.isEqual(s.metric, {
                ...metric,
                __name__: subAggId,
                // value,
              }),
            );
            if (series) {
              series.data.push([key / 1000, value]);
            }
          }
        });
        if (hasCountFunc) {
          const series = _.find(seriesList, (s) =>
            _.isEqual(s.metric, {
              ...metric,
              __name__: 'count',
              // value: aggregations?.doc_count,
            }),
          );
          if (series) {
            series.data.push([key / 1000, doc_count]);
          }
        }
      } else {
        metric[aggId] = key;
        processAggregations(subAggs, seriesList, metric, hasCountFunc, calc);
      }
    });
  }
}

function hasCountFunc(target: { values: { func: string }[] }) {
  return _.some(target?.values, (m) => m.func === 'count');
}

export function processResponseToSeries(responses: any[], params: any[]) {
  const seriesList: any[] = [];
  _.forEach(responses, (response, idx: number) => {
    const { aggregations } = response;
    processAggregations(aggregations, seriesList, {}, hasCountFunc(params[idx]), params[idx].calc);
  });
  return _.map(seriesList, (item) => {
    return {
      ...item,
      name: getSerieName(item.metric),
    };
  });
}
