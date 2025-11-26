import * as ast from '../ast';
import type { DataViewBase, KueryNode, KueryQueryOptions } from '../../..';
import type { KqlContext } from '../types';

export function buildNodeParams(children: KueryNode[]) {
  return {
    arguments: children,
  };
}

export function toElasticsearchQuery(
  node: KueryNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
) {
  const { filtersInMustClause } = config;
  const children = node.arguments || [];
  const key = filtersInMustClause ? 'must' : 'filter';

  return {
    bool: {
      [key]: children.map((child: KueryNode) => {
        return ast.toElasticsearchQuery(child, indexPattern, config, context);
      }),
    },
  };
}
