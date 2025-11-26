import { QuerySuggestionTypes } from '../index';

const bothArgumentsText = 'both arguments';

const oneOrMoreArgumentsText = 'one or more arguments';

const conjunctions = {
  and: `Requires ${bothArgumentsText} to be true`,
  or: `Requires ${oneOrMoreArgumentsText} to be true`,
};

export const setupGetConjunctionSuggestions = (core) => {
  return (querySuggestionsArgs, { text, end }) => {
    let suggestions: any[] | [] = [];

    if (text.endsWith(' ')) {
      suggestions = Object.keys(conjunctions).map((key) => ({
        type: QuerySuggestionTypes.Conjunction,
        text: `${key} `,
        description: conjunctions[key],
        start: end,
        end,
      }));
    }

    return Promise.resolve(suggestions);
  };
};
