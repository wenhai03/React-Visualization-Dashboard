import { JsonObject } from '../../es_query/types';
import { nodeTypes } from '../node_types';
import { KQLSyntaxError } from '../kuery_syntax_error';
import type { KqlContext, KueryNode, KueryParseOptions, KueryQueryOptions } from '../types';
import { message } from 'antd';
import { parse as parseKuery } from '../grammar';
import { DataViewBase } from '../../..';

const fromExpression = (
  expression: string | any,
  parseOptions: Partial<KueryParseOptions> = {},
  parse: Function = parseKuery,
): KueryNode => {
  if (typeof expression === 'undefined') {
    throw new Error('expression must be a string, got undefined instead');
  }

  return parse(expression, { ...parseOptions, helpers: { nodeTypes } });
};

export const fromLiteralExpression = (
  expression: string | any,
  parseOptions: Partial<KueryParseOptions> = {},
): KueryNode => {
  return fromExpression(
    expression,
    {
      ...parseOptions,
      startRule: 'Literal',
    },
    parseKuery,
  );
};

export const fromKueryExpression = (
  expression: string | any,
  parseOptions: Partial<KueryParseOptions> = {},
  promptParsing?: boolean,
): KueryNode => {
  try {
    return fromExpression(expression, parseOptions, parseKuery);
  } catch (error: any) {
    if (promptParsing) {
      message.error('过滤条件语法有误，请修正后重新查询');
    }
    if (error.name === 'SyntaxError') {
      throw new KQLSyntaxError(error, expression);
    } else {
      throw error;
    }
  }
};

/**
 * @params {String} indexPattern
 * @params {Object} config - contains the dateFormatTZ
 *
 * IndexPattern isn't required, but if you pass one in, we can be more intelligent
 * about how we craft the queries (e.g. scripted fields)
 *
 */
export const toElasticsearchQuery = (
  node: KueryNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context?: KqlContext,
): JsonObject => {
  if (!node || !node.type || !nodeTypes[node.type]) {
    return toElasticsearchQuery(nodeTypes.function.buildNode('and', []), indexPattern);
  }

  // TODO: the return type of this function might be incorrect and it works only because of this casting
  const nodeType = nodeTypes[node.type] as unknown as any;
  return nodeType.toElasticsearchQuery(node, indexPattern, config, context);
};
