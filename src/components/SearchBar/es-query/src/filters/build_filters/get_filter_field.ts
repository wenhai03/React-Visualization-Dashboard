import { getExistsFilterField, isExistsFilter } from './exists_filter';
import { getPhrasesFilterField, isPhrasesFilter } from './phrases_filter';
import { getPhraseFilterField, isPhraseFilter, isScriptedPhraseFilter } from './phrase_filter';
import { getRangeFilterField, isRangeFilter, isScriptedRangeFilter } from './range_filter';
import type { Filter } from './types';

/** @internal */
export const getFilterField = (filter: Filter) => {
  if (isExistsFilter(filter)) {
    return getExistsFilterField(filter);
  }
  if (isPhraseFilter(filter) || isScriptedPhraseFilter(filter)) {
    return getPhraseFilterField(filter);
  }
  if (isPhrasesFilter(filter)) {
    return getPhrasesFilterField(filter);
  }
  if (isRangeFilter(filter) || isScriptedRangeFilter(filter)) {
    return getRangeFilterField(filter);
  }

  return;
};
