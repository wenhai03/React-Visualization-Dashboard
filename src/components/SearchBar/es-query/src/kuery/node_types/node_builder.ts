import type { RangeFilterParams } from '../../filters';
import { KueryNode, nodeTypes } from '../types';

export const nodeBuilder = {
  is: (fieldName: string, value: string | KueryNode): KueryNode => {
    return nodeTypes.function.buildNodeWithArgumentNodes('is', [
      nodeTypes.literal.buildNode(fieldName),
      typeof value === 'string' ? nodeTypes.literal.buildNode(value) : value,
    ]);
  },
  or: (nodes: KueryNode[]): KueryNode => {
    return nodes.length === 1 ? nodes[0] : nodeTypes.function.buildNode('or', nodes);
  },
  and: (nodes: KueryNode[]): KueryNode => {
    return nodes.length === 1 ? nodes[0] : nodeTypes.function.buildNode('and', nodes);
  },
  range: (
    fieldName: string,
    operator: keyof Pick<RangeFilterParams, 'gt' | 'gte' | 'lt' | 'lte'>,
    value: number | string
  ): KueryNode => {
    return nodeTypes.function.buildNodeWithArgumentNodes('range', [
      nodeTypes.literal.buildNode(fieldName),
      operator,
      typeof value === 'string' ? nodeTypes.literal.buildNode(value) : value,
    ]);
  },
};
