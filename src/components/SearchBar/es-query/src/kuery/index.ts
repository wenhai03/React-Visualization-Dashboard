import { toElasticsearchQuery as astToElasticsearchQuery } from './ast';

/**
 * @params {String} indexPattern
 * @params {Object} config - contains the dateFormatTZ
 *
 * IndexPattern isn't required, but if you pass one in, we can be more intelligent
 * about how we craft the queries (e.g. scripted fields)
 */
export const toElasticsearchQuery = (...params: Parameters<typeof astToElasticsearchQuery>) => {
  return astToElasticsearchQuery(...params);
};

export { KQLSyntaxError } from './kuery_syntax_error';
export { nodeTypes, nodeBuilder } from './node_types';
export { fromKueryExpression } from './ast';
export { escapeKuery } from './utils';
export type { FunctionTypeBuildNode } from './node_types';
export type { DslQuery, KueryNode, KueryQueryOptions, KueryParseOptions } from './types';
