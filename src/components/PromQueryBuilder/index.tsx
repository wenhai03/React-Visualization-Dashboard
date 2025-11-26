import React from 'react';
import MetricSelect from './MetricSelect';
import LabelFilters from './LabelFilters';
import Operations from './Operations';
import RawQuery from './RawQuery';
import { PromVisualQuery } from './types';
import NestedQueryList from './NestedQueryList';
import { normalizeDefaultValue } from './utils';
import './style.less';

export type { PromVisualQuery } from './types';
export { renderQuery } from './RawQuery';
export { buildPromVisualQueryFromPromQL } from './utils/buildPromVisualQueryFromPromQL';

interface IProps {
  groupId: number;
  datasourceValue: number;
  params: {
    start: number;
    end: number;
  };
  rawQueryOpen?: boolean;
  value: PromVisualQuery;
  onChange: (query: PromVisualQuery) => void;
}

export default function index(props: IProps) {
  const { groupId, datasourceValue, params, rawQueryOpen = true, value, onChange } = props;
  const query = normalizeDefaultValue(value);
  return (
    <div className='prom-query-builder-container'>
      <div className='prom-query-builder-metric-label-container'>
        <MetricSelect
          groupId={groupId}
          datasourceValue={datasourceValue}
          params={params}
          value={value.metric}
          onChange={(val) => {
            onChange({
              ...query,
              metric: val,
            });
          }}
        />
        <LabelFilters
          groupId={groupId}
          datasourceValue={datasourceValue}
          metric={query.metric}
          params={params}
          value={query.labels}
          onChange={(val) => {
            onChange({
              ...query,
              labels: val,
            });
          }}
        />
      </div>
      <Operations
        groupId={groupId}
        metric={query.metric}
        query={query}
        datasourceValue={datasourceValue}
        params={params}
        value={query.operations}
        onChange={(val) => {
          onChange(val);
        }}
      />
      {query.binaryQueries && query.binaryQueries.length > 0 && (
        <NestedQueryList
          groupId={groupId}
          params={params}
          datasourceValue={datasourceValue}
          value={query.binaryQueries}
          onChange={(val) => {
            onChange({
              ...query,
              binaryQueries: val,
            });
          }}
        />
      )}
      {rawQueryOpen && <RawQuery groupId={groupId} query={query} datasourceValue={datasourceValue} />}
    </div>
  );
}
