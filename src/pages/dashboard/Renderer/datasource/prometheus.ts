import _ from 'lodash';
import moment from 'moment';
import { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';
import { fetchHistoryRangeBatch, fetchHistoryInstantBatch } from '@/services/dashboardV2';
import { ITarget } from '../../types';
import { IVariable } from '../../VariableConfig/definition';
import replaceExpressionBracket from '../utils/replaceExpressionBracket';
import { completeBreakpoints, getSerieName } from './utils';
import replaceFieldWithVariable from '../utils/replaceFieldWithVariable';
import { replaceExpressionVars } from '../../VariableConfig/constant';
import { getDefaultStepByStartAndEnd } from '@/utils';

interface IOptions {
  id?: string; // panelId
  group_id: number;
  board_id: number;
  dashboardId: string;
  datasourceCate: string;
  datasourceValue: number; // 关联变量时 datasourceValue: string
  time: IRawTimeRange | { start: number; end: number };
  targets: ITarget[];
  variableConfig?: IVariable[];
  spanNulls?: boolean;
  scopedVars?: any;
  isShare?: boolean;
}

const getTIme = (time, isShare) => {
  let start: number;
  let end: number;
  if (isShare) {
    let shareTime = time as { start: number; end: number };
    start = Math.trunc(shareTime.start / 1000);
    end = Math.trunc(shareTime.end / 1000);
  } else {
    const parsedRange = parseRange(time as IRawTimeRange);
    start = moment(parsedRange.start).unix();
    end = moment(parsedRange.end).unix();
  }
  return { start, end };
};

export default async function prometheusQuery(options: IOptions) {
  const { dashboardId, id, time, targets, variableConfig, spanNulls, scopedVars, group_id, board_id, isShare } =
    options;
  if (!time.start) return Promise.resolve([]);

  // 分享图表的日期已是时间戳，可以直接取，非分享图表需要转化
  const newTime = getTIme(time, isShare);
  let start = newTime.start;
  let end = newTime.end;
  let _step: any = getDefaultStepByStartAndEnd(start, end);
  const series: any[] = [];
  let batchQueryParams: any[] = [];
  let batchInstantParams: any[] = [];
  let exprs: string[] = [];
  let refIds: string[] = [];
  let signalKey = `${id}`;
  const datasourceValue = variableConfig
    ? replaceExpressionVars(options.datasourceValue as any, variableConfig, variableConfig.length, dashboardId)
    : options.datasourceValue;

  if (targets && typeof datasourceValue === 'number') {
    _.forEach(targets, (target) => {
      if (target.time) {
        const newTime = getTIme(target.time, isShare);
        start = newTime.start;
        end = newTime.end;
        _step = getDefaultStepByStartAndEnd(start, end);
      }
      if (target.step) {
        _step = target.step;
      }
      // TODO: 消除毛刺？
      start = isShare ? start : start - (start % _step!);
      end = isShare ? end : end - (end % _step!);

      const realExpr = variableConfig
        ? replaceFieldWithVariable(dashboardId, target.expr, variableConfig, scopedVars)
        : target.expr;
      if (realExpr) {
        if (target.instant) {
          batchInstantParams.push({
            time: end,
            query: realExpr,
          });
        } else {
          batchQueryParams.push({
            end,
            start,
            query: realExpr,
            step: _step,
          });
        }
        exprs.push(target.expr);
        refIds.push(target.refId);
        signalKey += `-${target.expr}`;
      }
    });
    try {
      if (!_.isEmpty(batchQueryParams)) {
        const res = await fetchHistoryRangeBatch(
          { queries: batchQueryParams, datasource_id: datasourceValue, chart_share_id: isShare && Number(dashboardId) },
          signalKey,
          board_id,
          group_id,
          isShare,
        );
        const dat = res.dat || [];
        for (let i = 0; i < dat?.length; i++) {
          var item = {
            result: dat[i],
            expr: exprs[i],
            refId: refIds[i],
          };
          const target = _.find(targets, (t) => t.expr === item.expr);
          _.forEach(item.result, (serie) => {
            series.push({
              id: _.uniqueId('series_'),
              refId: item.refId,
              name: target?.legend
                ? replaceExpressionBracket(target?.legend, serie.metric)
                : getSerieName(serie.metric),
              metric: serie.metric,
              expr: item.expr,
              data: !spanNulls ? completeBreakpoints(_step, serie.values) : serie.values,
            });
          });
        }
      }
      if (!_.isEmpty(batchInstantParams)) {
        const res = await fetchHistoryInstantBatch(
          {
            queries: batchInstantParams,
            datasource_id: datasourceValue,
            chart_share_id: isShare && Number(dashboardId),
          },
          signalKey,
          board_id,
          group_id,
          isShare,
        );
        const dat = res.dat || [];
        for (let i = 0; i < dat?.length; i++) {
          var item = {
            result: dat[i],
            expr: exprs[i],
            refId: refIds[i],
          };
          const target = _.find(targets, (t) => t.expr === item.expr);
          _.forEach(item.result, (serie) => {
            series.push({
              id: _.uniqueId('series_'),
              refId: item.refId,
              name: target?.legend
                ? replaceExpressionBracket(target?.legend, serie.metric)
                : getSerieName(serie.metric),
              metric: serie.metric,
              expr: item.expr,
              data: !spanNulls ? completeBreakpoints(_step, [serie.value]) : [serie.value],
            });
          });
        }
      }
      return Promise.resolve(series);
    } catch (e) {
      console.error(e);
      return Promise.reject(e);
    }
  }
  return Promise.resolve([]);
}
