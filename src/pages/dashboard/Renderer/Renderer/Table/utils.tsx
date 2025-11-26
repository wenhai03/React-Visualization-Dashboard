import _ from 'lodash';
import React from 'react';
import { isAbsolutePath } from '@/pages/dashboard/utils';
import { getDetailUrl } from '../../utils/replaceExpressionDetail';
import { Link } from 'react-router-dom';

export function transformColumns(columns: any[], transformations?: any[]): any[] {
  let newColumns: any[] = columns;
  if (!transformations) {
    return newColumns;
  }
  const organizeOptions = transformations[0]?.options;
  if (organizeOptions) {
    const { excludeByName, indexByName, renameByName, widthByName } = organizeOptions;
    if (indexByName) {
      newColumns = _.map(newColumns, (column) => {
        const index = indexByName[column.dataIndex];
        return {
          ...column,
          sort: index,
        };
      });
      newColumns = _.sortBy(newColumns, 'sort');
    }
    if (excludeByName) {
      newColumns = _.filter(newColumns, (column) => !excludeByName[column.dataIndex]);
    }
    if (renameByName) {
      newColumns = _.map(newColumns, (column) => {
        const newName = renameByName[column.title];
        if (newName) {
          return { ...column, title: newName };
        }
        return column;
      });
    }
    if (widthByName) {
      newColumns = _.map(newColumns, (column) => {
        const newWidth = widthByName[column.dataIndex];
        if (newWidth) {
          return { ...column, width: Number(newWidth) };
        }
        return column;
      });
    }
  }

  return newColumns;
}

export function transformColumnsLink(record: any, value, dataIndex: string, option, transformations?: any) {
  const { displayMode, aggrDimension, dashboardMeta, time, tableFields, isShare } = option;
  if (!transformations) {
    return value;
  }
  const organizeOptions = transformations[0]?.options;
  if (organizeOptions) {
    const { linkByName } = organizeOptions;
    if (linkByName) {
      const newLink = linkByName[dataIndex];
      if (newLink) {
        const data = {
          name: record.name,
          value: record.value,
          metric: record.metric,
        };
        if (displayMode === 'labelValuesToRows' && aggrDimension) {
          data.metric = {};
          _.forEach(tableFields, (item) => {
            data.metric[item] = record[item];
          });
        }
        return !newLink._blank && !isAbsolutePath(newLink.path) ? (
          <Link to={getDetailUrl(newLink.path, data, dashboardMeta, time, isShare)!}>{value}</Link>
        ) : (
          <a
            href={getDetailUrl(newLink.path, data, dashboardMeta, time, isShare)}
            target={newLink._blank ? '_blank' : '_self'}
          >
            {value}
          </a>
        );
      }
    }
  }

  return value;
}
