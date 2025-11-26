import React from 'react';
import { flatten } from 'lodash';
import { QuerySuggestionTypes } from '../index';

const equalsText = 'equals';
const lessThanOrEqualToText = 'less than or equal to';
const greaterThanOrEqualToText = 'greater than or equal to';
const lessThanText = 'less than';
const greaterThanText = 'greater than';
const existsText = 'exists';

const operators = {
  ':': {
    description: `${equalsText} some value`,
    fieldTypes: [
      'string',
      'number',
      'number_range',
      'date',
      'date_range',
      'ip',
      'ip_range',
      'geo_point',
      'geo_shape',
      'boolean',
    ],
  },
  '<=': {
    description: `is ${lessThanOrEqualToText} some value`,
    fieldTypes: ['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'],
  },
  '>=': {
    description: `is ${greaterThanOrEqualToText} some value`,
    fieldTypes: ['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'],
  },
  '<': {
    description: `is ${lessThanText} some value`,
    fieldTypes: ['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'],
  },
  '>': {
    description: `is ${greaterThanText} some value`,
    fieldTypes: ['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'],
  },
  ': *': {
    description: `${existsText} in any form`,
    fieldTypes: undefined,
  },
};

const getOperatorByName = (operator: string) => operators[operator as any];
const getDescription = (operator: string) => <p>{getOperatorByName(operator).description}</p>;

export const setupGetOperatorSuggestions = () => {
  return ({ fieldcaps }, { end, fieldName, nestedPath }) => {
    const allFields = fieldcaps
      .map((element) => ({
        name: element.name,
        text: element.name,
        type: element.type,
      }))
      .filter((item) => !item.name.startsWith('_') || item.name === '_id' || item.name === '_index');
    const fullFieldName = nestedPath ? `${nestedPath}.${fieldName}` : fieldName;
    const fields = allFields
      .filter((field) => field.name === fullFieldName)
      .map((field) => {
        const matchingOperators = Object.keys(operators).filter((operator) => {
          const { fieldTypes } = getOperatorByName(operator);
          return !fieldTypes || fieldTypes.includes(field.type);
        });

        const suggestions = matchingOperators.map((operator) => ({
          type: QuerySuggestionTypes.Operator,
          text: operator + ' ',
          description: getDescription(operator),
          start: end,
          end,
        }));
        return suggestions;
      });

    return Promise.resolve(flatten(fields));
  };
};
