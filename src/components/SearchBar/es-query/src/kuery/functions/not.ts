import * as ast from '../ast';
import type { DataViewBase, KueryNode, KueryQueryOptions } from '../../..';
import type { KqlContext } from '../types';

export function buildNodeParams(child: KueryNode) {
  return {
    arguments: [child],
  };
}

export function toElasticsearchQuery(
  node: KueryNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): any {
  const [argument] = node.arguments;

  return {
    bool: {
      must_not: ast.toElasticsearchQuery(
        argument,
        indexPattern,
        config,
        context
      ),
    },
  };
}
