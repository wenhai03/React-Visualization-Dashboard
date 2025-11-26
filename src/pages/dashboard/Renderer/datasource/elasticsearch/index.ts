import _ from 'lodash';
import moment from 'moment';
import { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';
import { getDsQuery } from '@/services/warning';
import { normalizeTime } from '@/pages/alertRules/utils';
import { ITarget } from '../../../types';
import { IVariable } from '../../../VariableConfig/definition';
import { replaceExpressionVars, replaceExpressionVarsForEs } from '../../../VariableConfig/constant';
import { getSeriesQuery, getLogsQuery } from './queryBuilder';
import { processResponseToSeries } from './processResponse';
import { flattenHits } from '@/pages/explorer/Elasticsearch/utils';
import replaceExpressionBracket from '../../utils/replaceExpressionBracket';
import { getElsSerieName, getSerieName } from '../utils';
import { getDefaultStepByStartAndEnd } from '@/utils';

interface IOptions {
  group_id: number;
  board_id: number;
  dashboardId: string;
  datasourceCate: string;
  datasourceValue: number;
  id?: string;
  time: IRawTimeRange | { start: number; end: number };
  targets: ITarget[];
  variableConfig?: IVariable[];
  groupedDatasourceList: any;
  isShare?: boolean;
  esVersion?: string;
  calc?: string;
}

/**
 * 根据 target 判断是否为查询 raw data
 */
function isRawDataQuery(target: ITarget) {
  if (_.size(target.query?.values) === 1) {
    const func = _.get(target, ['query', 'values', 0, 'func']);
    return func === 'rawData';
  }
  return false;
}

export default async function elasticSearchQuery(options: IOptions) {
  const {
    dashboardId,
    time,
    targets,
    datasourceCate,
    variableConfig,
    group_id,
    board_id,
    isShare,
    esVersion,
    groupedDatasourceList,
    calc
  } = options;
  // console.log('targets elasticSearchQuery--->', targets)
  if (!time.start) return;
  let start: number;
  let end: number;
  // 分享图表的日期已是时间戳，可以直接取，非分享图表需要转化
  if (isShare) {
    let shareTime = time as { start: number; end: number };
    start = shareTime.start;
    end = shareTime.end;
  } else {
    const parsedRange = parseRange(time as IRawTimeRange);
    start = moment(parsedRange.start).valueOf();
    end = moment(parsedRange.end).valueOf();
  }
  let batchDsParams: any[] = [];
  let batchLogParams: any[] = [];
  let series: any[] = [];
  const isInvalid = _.some(targets, (target) => {
    const query: any = target.query || {};
    return !query.index || !query.date_field;
  });
  const datasourceValue = variableConfig
    ? (replaceExpressionVars(options.datasourceValue as any, variableConfig, variableConfig.length, dashboardId) as any)
    : options.datasourceValue;
  let newEsVersion = esVersion;
  if (datasourceCate === 'elasticsearch' && !esVersion) {
    newEsVersion = groupedDatasourceList.elasticsearch.filter((element) => element.id === Number(datasourceValue))[0]
      ?.settings?.version;
  }
  if (targets && datasourceValue && !isInvalid) {
    _.forEach(targets, (target) => {
      const query: any = target.query || {};
      const filter = variableConfig
        ? replaceExpressionVarsForEs(query.filter, variableConfig, variableConfig.length, dashboardId)
        : query.filter;
      if (isRawDataQuery(target)) {
        batchLogParams.push({
          index: query.index,
          filter,
          date_field: query.date_field,
          limit: query.limit,
          start,
          end,
        });
      } else {
        let interval = `${normalizeTime(query.interval, query.interval_unit)}s`;
        if (!query.interval) {
          // 给 interval 添加默认值，fixed_interval赋值 用的到
          interval = `${getDefaultStepByStartAndEnd(start / 1000, end / 1000)}s`;
        }

        batchDsParams.push({
          index: query.index,
          filter,
          values: query?.values,
          group_by: query.group_by,
          date_field: query.date_field,
          interval,
          start,
          end,
          calc
        });
      }
    });
    if (!_.isEmpty(batchDsParams)) {
      let payload = '';
      let intervalkey = newEsVersion === '8.0+' ? 'fixed_interval' : 'interval';
      _.forEach(batchDsParams, (item) => {
        const esQuery = JSON.stringify(getSeriesQuery(item, intervalkey));
        const header = JSON.stringify({
          search_type: 'query_then_fetch',
          ignore_unavailable: true,
          index: item.index,
        });
        payload += header + '\n';
        payload += esQuery + '\n';
      });
      // console.log('batchDsParams --->', batchDsParams)
      const res = await getDsQuery(datasourceValue, payload, board_id, group_id, isShare ? dashboardId : undefined);
      // console.log('res[0] service--->', res?.[0]?.aggregations?.['service.name']?.buckets)
      series = _.map(processResponseToSeries(res, batchDsParams), (item) => {
        const target = _.find(targets, (t) => t.expr === item.expr);
        return {
          id: _.uniqueId('series_'),
          ...item,
          refId: target?.refId,
          name: target?.legend ? replaceExpressionBracket(target?.legend, item.metric) : getSerieName(item.metric),
        };
      });
    }
    if (!_.isEmpty(batchLogParams)) {
      let payload = '';
      _.forEach(batchLogParams, (item) => {
        const esQuery = JSON.stringify(getLogsQuery(item));
        const header = JSON.stringify({
          search_type: 'query_then_fetch',
          ignore_unavailable: true,
          index: item.index,
        });
        payload += header + '\n';
        payload += esQuery + '\n';
      });
      const res = await getDsQuery(datasourceValue, payload, board_id, group_id, isShare ? dashboardId : undefined);
      _.forEach(res, (item) => {
        const { docs } = flattenHits(item?.hits?.hits);
        _.forEach(docs, (doc: any) => {
          series.push({
            id: doc._id,
            name: doc._index,
            metric: doc.fields,
            data: [],
          });
        });
      });
    }
  }
  return series;
}
