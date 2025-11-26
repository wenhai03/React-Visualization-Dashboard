import { DataViewFieldBase } from '../../..';

/**
 * Base index pattern fields for testing
 */
export const fields: DataViewFieldBase[] = [
  {
    name: 'bytes',
    type: 'number',
    scripted: false,
  },
  {
    name: 'ssl',
    type: 'boolean',
    scripted: false,
  },
  {
    name: '@timestamp',
    type: 'date',
    scripted: false,
  },
  {
    name: 'extension',
    type: 'string',
    scripted: false,
  },
  {
    name: 'machine.os',
    type: 'string',
    scripted: false,
  },
  {
    name: 'machine.os.raw',
    type: 'string',
    scripted: false,
  },
  {
    name: 'machine.os.keyword',
    type: 'string',
    esTypes: ['keyword'],
    scripted: false,
  },
  {
    name: 'script number',
    type: 'number',
    scripted: true,
    script: '1234',
    lang: 'expression',
  },
  {
    name: 'script date',
    type: 'date',
    scripted: true,
    script: '1234',
    lang: 'painless',
  },
  {
    name: 'script string',
    type: 'string',
    scripted: true,
    script: '1234',
    lang: 'painless',
  },
  {
    name: 'nestedField.child',
    type: 'string',
    scripted: false,
    subType: { nested: { path: 'nestedField' } },
  },
  {
    name: 'nestedField.nestedChild.doublyNestedChild',
    type: 'string',
    scripted: false,
    subType: { nested: { path: 'nestedField.nestedChild' } },
  },
];

export const getField = (name: string) => fields.find((field) => field.name === name);
