import { Filter, FilterMeta, FilterStateStore } from './types';

export const buildEmptyFilter = (isPinned: boolean, index?: string): Filter => {
  const meta: FilterMeta = {
    disabled: false,
    negate: false,
    alias: null,
    index,
  };
  const $state: Filter['$state'] = {
    store: isPinned ? FilterStateStore.GLOBAL_STATE : FilterStateStore.APP_STATE,
  };

  return { meta, $state };
};
