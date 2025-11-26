import React, { useState, useRef, useEffect } from 'react';
import { Input } from 'antd';
import _ from 'lodash';
import { getFieldcaps } from '@/services/warning';
import Suggestions from './components/Suggestions';
import queryString from 'query-string';
import { useLocation } from 'react-router-dom';
import { toUser, fromUser, matchPairs, getQuerySuggestions, getFieldsForWildcard } from './utils';
import './index.less';
import { suggestionsAbstraction } from './constant';

const KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  ENTER: 13,
  ESC: 27,
  TAB: 9,
  HOME: 36,
  END: 35,
};

export enum QuerySuggestionTypes {
  Field = 'field',
  Value = 'value',
  Operator = 'operator',
  Conjunction = 'conjunction',
  RecentSearch = 'recentSearch',
}

const SearchBar = (props) => {
  const {
    query,
    size,
    indexPatterns,
    onChange: handleChange,
    onSubmit,
    bubbleSubmitEvent,
    autoSubmit,
    curBusiId,
    datasourceValue,
    timeRange,
    timeField,
    fields: fieldcaps,
    refreshFieldcaps,
    mode = 'index',
    placeholder,
  } = props;
  const { search } = useLocation();
  const searchParams = queryString.parse(search) as Record<string, string>;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [suggestionLimit, setSuggestionLimit] = useState(50);
  const [suggestions, setSuggestions] = useState<any>([]);
  const [selection, setSelection] = useState<{ selectionStart: number | null; selectionEnd: number | null }>({
    selectionStart: null,
    selectionEnd: null,
  });
  const [queryBarInputDiv, setQueryBarInputDiv] = useState<HTMLDivElement | null>(null);

  const getRecentSearchSuggestions = (query: string) => {
    const recentSearches = [];
    const matchingRecentSearches = recentSearches.filter((recentQuery) => {
      const recentQueryString = typeof recentQuery === 'object' ? toUser(recentQuery) : recentQuery;
      return recentQueryString !== '' && recentQueryString.includes(query);
    });
    return matchingRecentSearches.map((recentSearch) => {
      const text = toUser(recentSearch);
      const start = 0;
      const end = query.length;
      return { type: QuerySuggestionTypes.RecentSearch, text, start, end };
    });
  };

  useEffect(() => {
    const onClickDocument = (event) => {
      if (event.target?.id === 'search-input-id' || event.target.parentNode?.id === 'searchbar__items') {
        setIsSuggestionsVisible(true);
      } else {
        setIsSuggestionsVisible(false);
      }
    };
    document.addEventListener('click', onClickDocument);
    return () => {
      document.removeEventListener('click', onClickDocument);
    };
  }, []);

  const handleFieldCaps = (indexPatterns, filter) => {
    if (indexPatterns) {
      const params = {
        busi_group_id: curBusiId,
        datasource_id: datasourceValue,
        mode: ['index', 'view'].includes(mode) ? 'common' : mode,
        indexed: indexPatterns,
        fields: '_source,_id,_index,_score,*',
      };
      refreshFieldcaps(undefined);
      getFieldcaps(params).then((res) => {
        updateSuggestions(filter || '', res.dat ? getFieldsForWildcard(res.dat) : []);
        refreshFieldcaps(res.dat ? getFieldsForWildcard(res.dat) : []);
      });
    }
  };

  useEffect(() => {
    handleFieldCaps(indexPatterns, query);
  }, [mode, indexPatterns, curBusiId, datasourceValue]);

  useEffect(() => {
    if (selection.selectionStart !== null && selection.selectionEnd !== null) {
      if (inputRef.current != null) {
        inputRef.current.setSelectionRange(selection.selectionStart, selection.selectionEnd);
      }
      setSelection({ selectionStart: null, selectionEnd: null });
    }
  }, [selection]);

  const getSuggestions = async (paramValue?: string, fieldData?: any) => {
    if (!inputRef.current) {
      return;
    }

    const queryString = toUser(paramValue!);
    const recentSearchSuggestions = getRecentSearchSuggestions(queryString);
    // if (!Array.isArray(indexPatterns) || _.compact(indexPatterns).length === 0) {
    //   return recentSearchSuggestions;
    // }
    // 光标位置
    // @ts-ignore
    const { selectionStart, selectionEnd } = inputRef.current.input;
    if (selectionStart === null || selectionEnd === null) {
      return;
    }

    try {
      const suggestions =
        (await getQuerySuggestions({
          curBusiId,
          datasourceValue,
          fieldcaps: fieldData || fieldcaps,
          indexPatterns: indexPatterns,
          query: queryString,
          selectionStart: selectionStart,
          selectionEnd: selectionEnd,
          timeRange: timeRange,
          suggestionsAbstraction: suggestionsAbstraction,
          mode,
          timeField: timeField ?? '@timestamp',
        })) || [];
      return [...suggestions, ...recentSearchSuggestions];
    } catch (e: any) {
      if (e.message === 'The user aborted a request.') return;
      throw e;
    }
  };
  // 过滤条件列表变更
  const updateSuggestions = _.debounce(async (value: string, fieldData: any) => {
    const suggestions = (await getSuggestions(value, fieldData)) || [];
    setSuggestions(suggestions);
  }, 100);

  const onChange = (query) => {
    // 输入条件变更，更新过滤条件列表
    updateSuggestions(query, fieldcaps);
    handleChange && handleChange(fromUser(query));
  };

  const onQueryStringChange = (value: string) => {
    setIndex(null);
    setIsSuggestionsVisible(true);
    setSuggestionLimit(50);
    if (query !== value) {
      onChange(value);
    }
  };

  const selectSuggestion = (suggestion: any, listIndex: number) => {
    if (!inputRef.current) {
      return;
    }
    const { type, text, start, end, cursorIndex } = suggestion;

    const queryString = toUser(query);
    // @ts-ignore
    const { selectionStart, selectionEnd } = inputRef.current.input;
    if (selectionStart === null || selectionEnd === null) {
      return;
    }

    const value = queryString.substr(0, selectionStart) + queryString.substr(selectionEnd);
    const newQueryString = value.substr(0, start) + text + value.substr(end);
    onQueryStringChange(newQueryString);

    setSelection({
      selectionStart: start + (cursorIndex ? cursorIndex : text.length),
      selectionEnd: start + (cursorIndex ? cursorIndex : text.length),
    });

    const isTypeRecentSearch = type === QuerySuggestionTypes.RecentSearch;

    const isAutoSubmitAndValid =
      autoSubmit && (type === QuerySuggestionTypes.Value || [':*', ': *'].includes(value.trim()));

    if (isTypeRecentSearch || isAutoSubmitAndValid) {
      setIndex(null);
      setIsSuggestionsVisible(false);
    }
  };

  const assignQueryInputDivRef = (node: HTMLDivElement | null) => {
    setQueryBarInputDiv(node);
  };

  const formatTextAreaValue = (newValue: string): string => {
    return newValue.replace(/\u00A0/g, ' ');
  };
  // 搜索框值
  const forwardNewValueIfNeeded = (newQueryString: string) => {
    const oldQueryString = inputRef.current?.value ?? '';
    const formattedNewQueryString = formatTextAreaValue(newQueryString);
    // if old & new values are equal with formatting applied, then return an old query without formatting applied
    if (formattedNewQueryString === formatTextAreaValue(oldQueryString)) {
      return oldQueryString;
    } else {
      return formattedNewQueryString;
    }
  };

  const onKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if ([KEY_CODES.LEFT, KEY_CODES.RIGHT, KEY_CODES.HOME, KEY_CODES.END].includes(event.keyCode)) {
      setIsSuggestionsVisible(true);
      if (event.target instanceof HTMLInputElement) {
        const value = formatTextAreaValue(event.target.value);
        onQueryStringChange(value);
      }
    }
  };

  const incrementIndex = (currentIndex: number) => {
    let nextIndex = currentIndex + 1;
    if (currentIndex === null || nextIndex >= suggestions.length) {
      nextIndex = 0;
    }
    setIndex(nextIndex);
  };

  const decrementIndex = (currentIndex: number) => {
    const previousIndex = currentIndex - 1;
    if (previousIndex < 0) {
      setIndex(suggestions.length - 1);
    } else {
      setIndex(previousIndex);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.target instanceof HTMLInputElement) {
      const preventDefault = event.preventDefault.bind(event);
      const { target, key, metaKey } = event;
      const { value, selectionStart, selectionEnd } = target;
      const updateQuery = (query: string, newSelectionStart: number, newSelectionEnd: number) => {
        onQueryStringChange(query);

        if (
          inputRef.current?.selectionStart !== newSelectionStart ||
          inputRef.current?.selectionEnd !== newSelectionEnd
        ) {
          setSelection({ selectionStart: newSelectionStart, selectionEnd: newSelectionEnd });
        }
      };

      switch (event.keyCode) {
        case KEY_CODES.DOWN:
          if (isSuggestionsVisible && index !== null) {
            event.preventDefault();
            incrementIndex(index);
          } else if ((isSuggestionsVisible && index == null) || toUser(query) === '') {
            event.preventDefault();
            setIsSuggestionsVisible(true);
            setIndex(0);
          }
          break;
        case KEY_CODES.UP:
          if (isSuggestionsVisible && index !== null) {
            event.preventDefault();
            decrementIndex(index);
          }
          break;
        case KEY_CODES.ENTER:
          if (!bubbleSubmitEvent) {
            event.preventDefault();
          }
          if (isSuggestionsVisible && index !== null && suggestions[index]) {
            event.preventDefault();
            selectSuggestion(suggestions[index], index);
          } else if (onSubmit) {
            onSubmit();
            setIsSuggestionsVisible(false);
          }
          break;
        case KEY_CODES.ESC:
          if (isSuggestionsVisible) {
            event.preventDefault();
          }
          setIndex(null);
          setIsSuggestionsVisible(false);
          break;
        case KEY_CODES.TAB:
          setIndex(null);
          setIsSuggestionsVisible(false);
          break;
        default:
          if (selectionStart !== null && selectionEnd !== null) {
            matchPairs({
              value,
              selectionStart,
              selectionEnd,
              key,
              metaKey,
              updateQuery,
              preventDefault,
            });
          }

          break;
      }
    }
  };

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = formatTextAreaValue(event.target.value);
    onQueryStringChange(value);
  };

  const onClickInput = (event: React.MouseEvent<HTMLInputElement>) => {
    if (event.target instanceof HTMLInputElement) {
      const value = formatTextAreaValue(event.target.value);
      onQueryStringChange(value);
    }
  };

  const onMouseEnterSuggestion = (suggestion: any, index: number) => {
    setIndex(index);
  };

  const onClickSuggestion = (suggestion: any, index: number) => {
    if (!inputRef.current) {
      return;
    }
    selectSuggestion(suggestion, index);
    inputRef.current.focus();
  };

  return (
    <div style={{ position: 'relative' }}>
      <div ref={assignQueryInputDivRef}>
        <Input
          allowClear
          placeholder={placeholder}
          value={forwardNewValueIfNeeded(toUser(query))}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onChange={onInputChange}
          onClick={onClickInput}
          // @ts-ignore
          ref={inputRef}
          id='search-input-id'
          autoComplete='off'
        />
      </div>
      <div>
        <Suggestions
          show={isSuggestionsVisible}
          suggestions={suggestions.slice(0, suggestionLimit)}
          index={index}
          onClick={onClickSuggestion}
          onMouseEnter={onMouseEnterSuggestion}
          size={size}
          inputContainer={queryBarInputDiv}
        />
      </div>
    </div>
  );
};

export default SearchBar;
