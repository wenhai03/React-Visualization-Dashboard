import { FilterStateStore } from '..';

export const phraseFilter = {
  meta: {
    negate: false,
    index: 'logstash-*',
    type: 'phrase',
    key: 'machine.os',
    value: 'ios',
    disabled: false,
    alias: null,
    params: {
      query: 'ios',
    },
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
  query: {
    match_phrase: {},
  },
};
