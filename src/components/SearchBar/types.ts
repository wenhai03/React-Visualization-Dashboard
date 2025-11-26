export enum QuerySuggestionTypes {
  Field = 'field',
  Value = 'value',
  Operator = 'operator',
  Conjunction = 'conjunction',
  RecentSearch = 'recentSearch',
}

export type QuerySuggestionGetFn = (args: QuerySuggestionGetFnArgs) => Promise<QuerySuggestion[]> | undefined;

export type SuggestionsListSize = 's' | 'l';

export interface SuggestionsAbstraction {
  type: 'alerts' | 'rules' | 'cases';
  fields: Record<
    string,
    {
      field: string;
      fieldToQuery: string;
      displayField: string | undefined;
      nestedDisplayField?: string;
      nestedField?: string;
      nestedPath?: string;
    }
  >;
}

/** @public **/
export interface QuerySuggestionGetFnArgs {
  language: string;
  indexPatterns: any[];
  query: string;
  selectionStart: number;
  selectionEnd: number;
  signal?: AbortSignal;
  useTimeRange?: boolean;
  boolFilter?: any;
  method?: 'terms_enum' | 'terms_agg';
  suggestionsAbstraction?: SuggestionsAbstraction;
}

/** @public **/
export interface QuerySuggestionBasic {
  type: QuerySuggestionTypes;
  description?: string | JSX.Element;
  end: number;
  start: number;
  text: string;
  cursorIndex?: number;
}

/** @public **/
export interface QuerySuggestionField extends QuerySuggestionBasic {
  type: QuerySuggestionTypes.Field;
  field: any;
}

/** @public **/
export type QuerySuggestion = QuerySuggestionBasic | QuerySuggestionField;

export type SuggestionOnClick = (suggestion: QuerySuggestion, index: number) => void;

export type SuggestionOnMouseEnter = (suggestion: QuerySuggestion, index: number) => void;

export interface DataViewByIdOrTitle {
  type: 'title' | 'id';
  value: string;
}
