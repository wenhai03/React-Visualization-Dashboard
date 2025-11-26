import { has } from 'lodash';
import type { Filter, FilterMeta } from './types';

export type QueryStringFilterMeta = FilterMeta;

export type QueryStringFilter = Filter & {
  meta: QueryStringFilterMeta;
  query?: {
    query_string?: {
      query: string;
      fields?: string[];
    };
  };
};

/**
 * @param filter
 * @returns `true` if a filter is a `QueryStringFilter`
 *
 * @public
 */
export const isQueryStringFilter = (filter: Filter): filter is QueryStringFilter =>
  has(filter, 'query.query_string');

/**
 * Creates a filter corresponding to a raw Elasticsearch query DSL object
 * @param query
 * @param index
 * @param alias
 * @returns `QueryStringFilter`
 *
 * @public
 */
export const buildQueryFilter = (
  query: QueryStringFilter['query'],
  index: string,
  alias?: string,
  meta: QueryStringFilterMeta = {}
) => ({ query, meta: { index, alias, ...meta } });
