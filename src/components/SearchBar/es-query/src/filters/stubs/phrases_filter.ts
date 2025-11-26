import { FilterStateStore, PhrasesFilter } from '..';

export const phrasesFilter: PhrasesFilter = {
  meta: {
    index: 'logstash-*',
    type: 'phrases',
    key: 'machine.os.raw',
    value: 'win xp, osx',
    params: ['win xp', 'osx'],
    negate: false,
    disabled: false,
    alias: null,
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
  query: {},
};
