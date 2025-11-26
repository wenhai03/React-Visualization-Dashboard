/**
 * WARNING: these typings are incomplete
 */

export type FunctionName = 'is' | 'and' | 'or' | 'not' | 'range' | 'exists' | 'nested';

export interface FunctionTypeBuildNode {
  type: 'function';
  function: FunctionName;
  // TODO -> Need to define a better type for DSL query
  arguments: any[];
}
