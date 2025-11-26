import type { SerializableRecord } from '../../es_query/types';
import { has } from 'lodash';
import type { Filter, FilterMeta } from './types';

export interface MatchAllFilterMeta extends FilterMeta, SerializableRecord {
  field: string;
  formattedValue: string;
}

export type MatchAllFilter = Filter & {
  meta: MatchAllFilterMeta;
  query: {
    match_all: any;
  };
};

/**
 * @param filter
 * @returns `true` if a filter is an `MatchAllFilter`
 *
 * @public
 */
export const isMatchAllFilter = (filter: Filter): filter is MatchAllFilter =>
  has(filter, 'query.match_all');
