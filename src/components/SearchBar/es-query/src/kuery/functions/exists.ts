import type { DataViewFieldBase, DataViewBase, KueryNode, KueryQueryOptions } from '../../..';
import * as literal from '../node_types/literal';
import type { KqlContext } from '../types';

export function buildNodeParams(fieldName: string) {
  return {
    arguments: [literal.buildNode(fieldName)],
  };
}

export function toElasticsearchQuery(
  node: KueryNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): any {
  const {
    arguments: [fieldNameArg],
  } = node;
  const fullFieldNameArg = {
    ...fieldNameArg,
    value: context?.nested ? `${context.nested.path}.${fieldNameArg.value}` : fieldNameArg.value,
  };
  const fieldName = literal.toElasticsearchQuery(fullFieldNameArg) as string;
  const field = indexPattern?.fields?.find((fld: DataViewFieldBase) => fld.name === fieldName);

  if (field?.scripted) {
    throw new Error(`Exists query does not support scripted fields`);
  }
  return {
    exists: { field: fieldName },
  };
}
