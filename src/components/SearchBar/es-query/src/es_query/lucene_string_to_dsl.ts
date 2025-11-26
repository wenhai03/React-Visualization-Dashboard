import { isString } from 'lodash';

/**
 *
 * @param query
 * @returns
 *
 * @public
 */
export function luceneStringToDsl(
  query: string | any
): any {
  if (isString(query)) {
    if (query.trim() === '') {
      return { match_all: {} };
    }

    return { query_string: { query } };
  }

  return query;
}
