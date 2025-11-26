import * as ast from '../ast';
import * as literal from '../node_types/literal';
import type { DataViewBase, KueryNode, KueryQueryOptions } from '../../..';
import type { KqlContext } from '../types';

export function buildNodeParams(path: any, child: any) {
  const pathNode =
    typeof path === 'string' ? ast.fromLiteralExpression(path) : literal.buildNode(path);
  return {
    arguments: [pathNode, child],
  };
}

export function toElasticsearchQuery(
  node: KueryNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): any {
  const [path, child] = node.arguments;
  const stringPath = ast.toElasticsearchQuery(path) as unknown as string;
  const fullPath = context?.nested?.path ? `${context.nested.path}.${stringPath}` : stringPath;

  return {
    nested: {
      path: fullPath,
      query: ast.toElasticsearchQuery(child, indexPattern, config, {
        ...context,
        nested: { path: fullPath },
      }),
      score_mode: 'none',
      ...(typeof config.nestedIgnoreUnmapped === 'boolean' && {
        ignore_unmapped: config.nestedIgnoreUnmapped,
      }),
    },
  };
}
