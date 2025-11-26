import _ from 'lodash';
import { ElasticsearchQuery } from './types';

export function getLogsQuery(target: ElasticsearchQuery) {
  const isSameDateField = target.order_by?.find((item) => item.field === target.date_field);
  const queryObj: any = {
    size: target.limit,
    query: {
      bool: {
        filter: [
          {
            range: {
              [target.date_field]: {
                gte: target.start,
                lte: target.end,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    },
    sort: [],
    script_fields: {},
    aggs: {},
  };
  if (target.filter && target.filter !== '') {
    queryObj.query.bool.filter = [
      ...queryObj.query.bool.filter,
      {
        query_string: {
          analyze_wildcard: true,
          query: target.filter,
        },
      },
    ];
  }

  if (target.order_by?.length) {
    target.order_by.map((item) => {
      queryObj.sort.push({
        [item.field!]: {
          order: item.order,
        },
      });
    });
  }

  if (isSameDateField) {
    queryObj.sort.push({
      [target.date_field]: {
        order: 'desc',
        unmapped_type: 'boolean',
      },
    });
  }
  return queryObj;
}

function convertMultiLineJSON(input) {
  // 正则匹配所有属性及其多行内容（支持 """ 或其他定界符）
  const regex = /"([^"]+)":\s*("""|`)([^]*?)\2/gm;
  const data = {};

  let match;
  while ((match = regex.exec(input)) !== null) {
    const key = match[1];
    let value = match[3]
      .replace(/^ +/gm, '') // 删除行首空格
      .replace(/"/g, '"') // 转义双引号
      .replace(/\n/g, '\n'); // 换行符 → \n

    data[key] = value;
  }
  return data;
}

export function getSeriesQuery(target: ElasticsearchQuery, intervalkey: string) {
  target = _.cloneDeep(target);
  target.values = target.values || [{ func: 'count' }];
  target.group_by = target.group_by || [{ cate: 'date_histogram' }];

  // console.log('target --->', target);

  if (!_.find(target.group_by, { cate: 'date_histogram' })) {
    target.group_by = [...target.group_by, { cate: 'date_histogram' }];
  }

  const queryObj: any = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              [target.date_field]: {
                gte: target.start,
                lte: target.end,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    },
  };

  if (target.filter && target.filter !== '') {
    queryObj.query.bool.filter.push({
      query_string: {
        analyze_wildcard: true,
        query: target.filter,
      },
    });
  }

  let nestedAggs = queryObj;

  for (const aggDef of target.group_by) {
    const esAgg: any = {};
    let aggField;

    switch (aggDef.cate) {
      case 'date_histogram':
        aggField = 'date';
        esAgg.date_histogram = {
          field: target.date_field,
          min_doc_count: 0,
          extended_bounds: {
            min: target.start,
            max: target.end,
          },
          format: 'epoch_millis',
          [intervalkey]: target.interval,
        };
        break;

      case 'terms':
        aggField = aggDef.terms_type === 'script' ? aggDef.script_name || 'terms_script' : aggDef.field;

        let orderByField = aggDef.orderBy || '_key';
        if (orderByField.includes('p90') || orderByField.includes('p95') || orderByField.includes('p99')) {
          orderByField = `${orderByField.replace(/\s+/g, '_')}.${orderByField.substring(1, 3)}`;
        }

        esAgg.terms = {
          ...(aggDef.terms_type === 'script'
            ? { script: convertMultiLineJSON(aggDef.script) }
            : { field: aggDef.field }),
          size: aggDef.size || 10,
          order: { [orderByField]: aggDef.order || 'desc' },
          min_doc_count: aggDef.min_value || 1,
        };
        break;
    }

    nestedAggs.aggs = nestedAggs.aggs || {};
    if (aggField) {
      nestedAggs.aggs[aggField] = esAgg;
    }

    const currentAgg = esAgg;
    currentAgg.aggs = currentAgg.aggs || {};

    for (const metric of target.values) {
      if (metric.func === 'count') continue;

      let metricAgg: any;
      let aggregationType = metric.func;

      if (metric.func === 'rate') {
        currentAgg.aggs[`${metric.func}_${metric.field.replace(/\./g, '_')}`] = {
          [metric.func]: { unit: metric.field },
        };
        continue;
      }

      const percentileMatch = metric.func.match(/^p(\d+)$/);
      if (percentileMatch) {
        aggregationType = metric.func;
        metricAgg = {
          field: metric.field,
          percents: [parseInt(percentileMatch[1])],
        };
      } else {
        metricAgg = { field: metric.field };
      }

      // console.log('metric --->', metric);

      currentAgg.aggs[`${aggregationType}_${metric.field.replace(/\./g, '_')}`] = {
        ['percentiles']: metricAgg,
      };
    }

    nestedAggs = esAgg;
  }
  // console.log('queryObj --->', queryObj);

  return queryObj;
}
