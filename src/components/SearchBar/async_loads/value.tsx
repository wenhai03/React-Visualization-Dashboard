import { flatten } from 'lodash';
import moment from 'moment';
import { getTermsList } from '@/services/logs';
import { isSuggestingValues } from '@/components/SearchBar/utils';
import { QuerySuggestionTypes } from '../index';

export function escapeQuotes(str: string) {
  return str.replace(/"/g, '\\"');
}

export const wrapAsSuggestions = (start: number, end: number, query: string, values: string[]) =>
  values
    .filter((value) => value.toLowerCase().includes(query.toLowerCase()))
    .map((value) => ({
      type: QuerySuggestionTypes.Value,
      text: `${value} `,
      start,
      end,
    }));

export const setupGetValueSuggestions = (core: any) => {
  return async (
    { indexPatterns, curBusiId, datasourceValue, timeRange, mode, timeField, fieldcaps },
    { start, end, prefix, suffix, fieldName, nestedPath },
  ): Promise<any[]> => {
    const fieldData = fieldcaps.find((item) => item.name === fieldName);
    if (isSuggestingValues(fieldData)) {
      const query = `${prefix}${suffix}`.trim();
      const body = {
        busi_group_id: curBusiId,
        datasource_id: datasourceValue,
        mode: ['index', 'view'].includes(mode) ? 'common' : mode,
        indexed: indexPatterns,
        field: fieldName,
        prefix: prefix,
        start: moment(timeRange.start).valueOf(),
        end: moment(timeRange.end).valueOf(),
        time_field: ['index', 'view'].includes(mode) ? timeField : '@timestamp',
      };
      const data = await getTermsList(body).then((res) => {
        const quotedValues = res.map((value) => (typeof value === 'string' ? `"${escapeQuotes(value)}"` : `${value}`));
        return wrapAsSuggestions(start, end, query, quotedValues);
      });

      return flatten(data);
    }
    return [];
  };
};
