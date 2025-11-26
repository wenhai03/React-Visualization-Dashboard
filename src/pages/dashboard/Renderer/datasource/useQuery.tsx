import React, { useState, useEffect, useRef } from 'react';
import _ from 'lodash';
import { useDebounceFn } from 'ahooks';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import { ITarget } from '../../types';
import { getVaraiableSelected } from '../../VariableConfig/constant';
import { IVariable } from '../../VariableConfig/definition';
import replaceExpressionBracket from '../utils/replaceExpressionBracket';
import { getSerieName } from './utils';
import prometheusQuery from './prometheus';
import elasticsearchQuery from './elasticsearch';
// @ts-ignore
import plusDatasource from 'plus:/parcels/Dashboard/datasource';

interface IProps {
  id?: string;
  group_id?: number;
  board_id?: number;
  dashboardId: string;
  datasourceCate: string;
  datasourceValue?: number;
  time: IRawTimeRange | { start: number; end: number };
  targets: ITarget[];
  variableConfig?: IVariable[];
  inViewPort?: boolean;
  spanNulls?: boolean;
  scopedVars?: any;
  isShare?: boolean;
  esVersion?: string;
  groupedDatasourceList?: any;
  calc?: string;
}

export default function usePrometheus(props: IProps) {
  const { dashboardId, datasourceCate, time, targets, variableConfig, inViewPort, spanNulls, datasourceValue } = props;
  const [series, setSeries] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const cachedVariableValues = _.map(variableConfig, (item) => {
    return getVaraiableSelected(item.name, item.type, dashboardId);
  });
  const flag = useRef(false);
  const fetchQueryMap = {
    prometheus: prometheusQuery,
    elasticsearch: elasticsearchQuery,
    ...plusDatasource,
  };
  const { run: fetchData } = useDebounceFn(
    () => {
      if (!datasourceCate) return;
      setLoading(true);
      const data: IProps = { ...props };
      fetchQueryMap[datasourceCate](data)
        .then((res: any[]) => {
          setSeries(res);
          setError('');
        })
        .catch((e) => {
          setSeries([]);
          setError(e.message);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    {
      wait: 500,
    },
  );

  useEffect(() => {
    // 配置变化时且图表在可视区域内重新请求数据，同时重置 flag
    if (inViewPort) {
      fetchData();
    } else {
      flag.current = false;
    }
  }, [
    JSON.stringify(targets),
    JSON.stringify(time),
    JSON.stringify(variableConfig),
    JSON.stringify(cachedVariableValues),
    spanNulls,
    datasourceValue,
  ]);

  useEffect(() => {
    // 如果图表在可视区域内并且没有请求过数据，则请求数据
    if (inViewPort && !flag.current) {
      flag.current = true;
      fetchData();
    }
  }, [inViewPort]);

  useEffect(() => {
    // 目前只有 prometheus 支持 legend 替换
    const _series = _.map(series, (item) => {
      const target = _.find(targets, (t) => t.expr === item.expr);
      return {
        ...item,
        name: target?.legend ? replaceExpressionBracket(target?.legend, item.metric) : getSerieName(item.metric),
      };
    });
    setSeries(_series);
  }, [JSON.stringify(_.map(targets, 'legend'))]);

  return { series, error, loading };
}
