import { repeat, uniq } from 'lodash';

const endOfInputText = 'end of input'

const grammarRuleTranslations: Record<string, string> = {
  fieldName: 'field name',
  value: 'value',
  literal: 'literal',
  whitespace: 'whitespace',
};

const getItemText = (item: KQLSyntaxErrorExpected): string => {
  if (item.type === 'other') {
    return item.description!;
  } else if (item.type === 'literal') {
    return `"${item.text!}"`;
  } else if (item.type === 'end') {
    return 'end of input';
  } else {
    return item.text || item.description || '';
  }
};

interface KQLSyntaxErrorData extends Error {
  found: string;
  expected: KQLSyntaxErrorExpected[] | null;
  location: any;
}

interface KQLSyntaxErrorExpected {
  description?: string;
  text?: string;
  type: string;
}

/**
 * A type of error indicating KQL syntax errors
 * @public
 */
export class KQLSyntaxError extends Error {
  shortMessage: string;

  constructor(error: KQLSyntaxErrorData, expression: any) {
    let message = error.message;
    if (error.expected) {
      const translatedExpectations = error.expected.map((expected) => {
        const key = getItemText(expected);
        return grammarRuleTranslations[key] || key;
      });

      const translatedExpectationText = uniq(translatedExpectations)
        .filter((item) => item !== undefined)
        .sort()
        .join(', ');

      message = `Expected ${translatedExpectationText} but ${error.found ? `"${error.found}"` : endOfInputText} found.`
    }

    const fullMessage = [message, expression, repeat('-', error.location.start.offset) + '^'].join(
      '\n'
    );

    super(fullMessage);
    this.name = 'KQLSyntaxError';
    this.shortMessage = message;
  }
}
