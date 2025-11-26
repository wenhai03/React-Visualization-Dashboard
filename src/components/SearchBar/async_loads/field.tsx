import { getFieldSubtypeNested } from '../utils';
import { partition } from 'lodash';
import { QuerySuggestionTypes } from '../index';
import { escapeKuery } from '../es-query';

const keywordComparator = (first: any, second: any) => {
  const extensions = ['raw', 'keyword'];
  if (extensions.map((ext) => `${first.name}.${ext}`).includes(second.name)) {
    return 1;
  } else if (extensions.map((ext) => `${second.name}.${ext}`).includes(first.name)) {
    return -1;
  }

  return first.name.localeCompare(second.name);
};

export function sortPrefixFirst(array: any[], prefix?: string | number, property?: string): any[] {
  if (!prefix) {
    return array;
  }
  const lowerCasePrefix = ('' + prefix).toLowerCase();

  const partitions = partition(array, (entry) => {
    const value = ('' + (property ? entry[property] : entry)).toLowerCase();

    return value.startsWith(lowerCasePrefix);
  });

  return [...partitions[0], ...partitions[1]];
}

export const setupGetFieldSuggestions = (core) => {
  return async (
    { indexPatterns, suggestionsAbstraction, fieldcaps },
    { start, end, prefix, suffix, nestedPath = '' },
  ) => {
    // 只保留 _id、_index
    const allFields = fieldcaps
      .map((element) => ({
        text: element.name,
        name: element.name,
        type: element.type,
      }))
      .filter((item) => !item.name.startsWith('_') || item.name === '_id' || item.name === '_index');

    const search = `${prefix}${suffix}`.trim().toLowerCase();
    const matchingFields = allFields.filter((field) => {
      const subTypeNested = getFieldSubtypeNested(field);
      if (suggestionsAbstraction?.fields?.[field.name]) {
        return (
          (!nestedPath || (nestedPath && subTypeNested?.nested.path.includes(nestedPath))) &&
          (suggestionsAbstraction?.fields[field.name]?.displayField ?? '').toLowerCase().includes(search)
        );
      } else {
        return (
          (!nestedPath || (nestedPath && subTypeNested?.nested.path.includes(nestedPath))) &&
          field.name.toLowerCase().includes(search)
        );
      }
    });
    const sortedFields = sortPrefixFirst(matchingFields.sort(keywordComparator), search, 'name');
    const suggestions: any[] = sortedFields.map((field) => {
      const isNested = field.subType && field.subType.nested;
      const isSuggestionsAbstractionOn = !!suggestionsAbstraction?.fields?.[field.name];

      const remainingPath =
        field.subType && field.subType.nested
          ? isSuggestionsAbstractionOn
            ? (suggestionsAbstraction?.fields[field.name].displayField ?? '').slice(
                nestedPath ? nestedPath.length + 1 : 0,
              )
            : field.subType.nested.path.slice(nestedPath ? nestedPath.length + 1 : 0)
          : '';
      let text =
        isNested && remainingPath.length > 0
          ? `${escapeKuery(remainingPath)}:{ ${escapeKuery(field.name.slice(field.subType.nested.path.length + 1))}  }`
          : `${escapeKuery(field.name.slice(nestedPath ? nestedPath.length + 1 : 0))} `;

      if (isSuggestionsAbstractionOn) {
        if (isNested && remainingPath.length > 0) {
          text = `${escapeKuery(remainingPath)}:{ ${escapeKuery(
            suggestionsAbstraction?.fields[field.name]?.nestedDisplayField ?? '',
          )}  }`;
        } else if (isNested && remainingPath.length === 0) {
          text = suggestionsAbstraction?.fields[field.name]?.nestedDisplayField ?? '';
        } else {
          text = suggestionsAbstraction?.fields[field.name].displayField ?? '';
        }
      }

      const cursorIndex = isNested && remainingPath.length > 0 ? text.length - 2 : text.length;

      return {
        type: QuerySuggestionTypes.Field,
        text,
        start,
        end,
        cursorIndex,
        field,
      };
    });

    return Promise.resolve(suggestions);
  };
};
