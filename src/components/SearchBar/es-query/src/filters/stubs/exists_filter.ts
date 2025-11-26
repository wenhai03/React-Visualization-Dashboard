import { ExistsFilter, FilterStateStore } from '..';

export const existsFilter: ExistsFilter = {
  meta: {
    index: 'logstash-*',
    negate: false,
    disabled: false,
    type: 'exists',
    key: 'machine.os',
    alias: null,
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
  query: {},
};
