/**
 * A field's sub type
 * @public
 */
export type IFieldSubType = IFieldSubTypeMultiOptional | IFieldSubTypeNestedOptional;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type IFieldSubTypeMultiOptional = {
  multi?: { parent: string };
};

export interface IFieldSubTypeMulti {
  multi: { parent: string };
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type IFieldSubTypeNestedOptional = {
  nested?: { path: string };
};

export interface IFieldSubTypeNested {
  nested: { path: string };
}

/**
 * A base interface for an index pattern field
 * @public
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DataViewFieldBase = {
  name: string;
  /**
   * Kibana field type
   */
  type: string;
  subType?: IFieldSubType;
  /**
   * Scripted field painless script
   */
  script?: string;
  /**
   * Scripted field language
   * Painless is the only valid scripted field language
   */
  lang?: any;
  scripted?: boolean;
  /**
   * ES field types as strings array.
   */
  esTypes?: string[];
};

/**
 * A base interface for an index pattern
 * @public
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DataViewBase = {
  fields: DataViewFieldBase[];
  id?: string;
  title: string;
};

export interface BoolQuery {
  must: any;
  must_not:any;
  filter:any;
  should:any;
}

export type Serializable =
  | string
  | number
  | boolean
  | null
  | undefined
  | SerializableArray
  | SerializableRecord;

// we need interfaces instead of types here to allow cyclic references
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SerializableArray extends Array<Serializable> {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SerializableRecord extends Record<string, Serializable> {}

export type JsonValue = null | boolean | number | string | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JsonArray extends Array<JsonValue> {}