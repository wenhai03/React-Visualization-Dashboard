import type { KueryNode } from '../types';

export const KQL_NODE_TYPE_LITERAL = 'literal';

export type KqlLiteralType = null | boolean | number | string;

export interface KqlLiteralNode extends KueryNode {
  type: typeof KQL_NODE_TYPE_LITERAL;
  value: KqlLiteralType;
  isQuoted: boolean;
}

export function isNode(node: KueryNode): node is KqlLiteralNode {
  return node.type === KQL_NODE_TYPE_LITERAL;
}

export function buildNode(value: KqlLiteralType, isQuoted: boolean = false): KqlLiteralNode {
  return {
    type: KQL_NODE_TYPE_LITERAL,
    value,
    isQuoted,
  };
}

export function toElasticsearchQuery(node: KqlLiteralNode) {
  return node.value;
}
