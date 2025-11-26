import * as functionType from './function';
import * as literal from './literal';
import * as wildcard from './wildcard';
import { FunctionTypeBuildNode } from './types';

export type { FunctionTypeBuildNode };
export { nodeBuilder } from './node_builder';

/**
 * @public
 */
export const nodeTypes = {
  // This requires better typing of the different typings and their return types.
  // @ts-ignore
  function: functionType,
  literal,
  wildcard,
};
