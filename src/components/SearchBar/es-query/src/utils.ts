import moment from 'moment-timezone';
import { DataViewFieldBase, IFieldSubTypeNested, IFieldSubTypeMulti } from './es_query';

/** @internal */
export function getTimeZoneFromSettings(dateFormatTZ: string) {
  const detectedTimezone = moment.tz.guess();

  return dateFormatTZ === 'Browser' ? detectedTimezone : dateFormatTZ;
}

type HasSubtype = Pick<DataViewFieldBase, 'subType'>;

export function isDataViewFieldSubtypeNested(field: HasSubtype) {
  const subTypeNested = field?.subType as IFieldSubTypeNested;
  return !!subTypeNested?.nested?.path;
}

export function getDataViewFieldSubtypeNested(field: HasSubtype) {
  return isDataViewFieldSubtypeNested(field) ? (field.subType as IFieldSubTypeNested) : undefined;
}

export function isDataViewFieldSubtypeMulti(field: HasSubtype) {
  const subTypeNested = field?.subType as IFieldSubTypeMulti;
  return !!subTypeNested?.multi?.parent;
}

export function getDataViewFieldSubtypeMulti(field: HasSubtype) {
  return isDataViewFieldSubtypeMulti(field) ? (field.subType as IFieldSubTypeMulti) : undefined;
}
