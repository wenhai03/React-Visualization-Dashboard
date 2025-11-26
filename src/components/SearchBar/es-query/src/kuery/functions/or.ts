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
): any {
  const children = node.arguments || [];

  return {
    bool: {
      should: children.map((child: KueryNode) => {
        return ast.toElasticsearchQuery(child, indexPattern, config, context);
      }),
      minimum_should_match: 1,
    },
  };
}
