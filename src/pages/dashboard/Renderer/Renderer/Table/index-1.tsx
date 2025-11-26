import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import _ from 'lodash';
import { Space, Table } from 'antd';
import { Link } from 'react-router-dom';
import { useSize } from 'ahooks';
import { useAntdResizableHeader } from '@minko-fe/use-antd-resizable-header';
import '@minko-fe/use-antd-resizable-header/dist/style.css';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import { isAbsolutePath } from '@/pages/dashboard/utils';
import getCalculatedValuesBySeries, { getSerieTextObj } from '../../utils/getCalculatedValuesBySeries';
import { getColor, getColumnsKeys, getSortOrder, transformColumns, transformColumnsLink } from './utils';
import './style.less';
import { useCsvExport } from '@/pages/dashboard/Renderer/Renderer/Table/hooks/useCsvExport';
import { useColumnSearch } from './hooks/useColumnSearch';
import { useSort } from '@/pages/dashboard/Renderer/Renderer/Table/hooks/useSort';
import { IPanel } from '@/pages/dashboard/types';
import { useGlobalState } from '@/pages/dashboard/globalState';
import { localeCompare } from '@/utils';
import getOverridePropertiesByName from '@/pages/dashboard/Renderer/utils/getOverridePropertiesByName';
import formatToTable from '@/pages/dashboard/Renderer/utils/formatToTable';
import { getDetailUrl } from '@/pages/dashboard/Renderer/utils/replaceExpressionDetail';

interface IProps {
  values: IPanel;
  series: any[];
  themeMode?: 'dark';
  time: IRawTimeRange | { start: number; end: number };
  isShare?: boolean;
}

const Stat = forwardRef((props: IProps, ref) => {
  const [dashboardMeta] = useGlobalState('dashboardMeta');
  const eleRef = useRef<HTMLDivElement>(null);
  const size = useSize(eleRef);
  const { values, series, themeMode, time, isShare } = props;
  const { datasourceCate, custom, options, overrides, transformations, targets, name } = values;
  let { showHeader, calc, aggrDimension, displayMode, columns, sortColumn, sortOrder, colorMode = 'value' } = custom;
  const [calculatedValues, setCalculatedValues] = useState<any[]>([]);

  const [tableFields, setTableFields] = useGlobalState('tableFields');
  const [displayedTableFields, setDisplayedTableFields] = useGlobalState('displayedTableFields');
  const option = {
    time,
    dashboardMeta,
    aggrDimension,
    displayMode,
    isShare,
    tableFields,
  };

  useEffect(() => {
    // console.log('series --->', series);
    const data = getCalculatedValuesBySeries(
      series,
      calc,
      {
        unit: options?.standardOptions?.util,
        decimals: options?.standardOptions?.decimals,
        dateFormat: options?.standardOptions?.dateFormat,
      },
      options?.valueMappings,
    );
    let fields: string[] = [];
    if (displayMode === 'seriesToRows') {
      fields = ['name', 'value'];
    } else if (displayMode === 'labelsOfSeriesToRows') {
      fields = !_.isEmpty(columns) ? columns : [...getColumnsKeys(data), 'value'];
    } else if (displayMode === 'labelValuesToRows') {
      if (transformations?.[0]?.options?.indexByName) {
        fields = Object.entries(transformations?.[0]?.options?.indexByName)
          .sort((a: [string, number], b: [string, number]) => a[1] - b[1])
          .map((entry) => entry[0]);
      } else {
        const aggrDimensions = _.isArray(aggrDimension) ? aggrDimension : [aggrDimension];
        fields = [...aggrDimensions, ...targets?.map((item) => item.refId || [])];
      }
    }
    if (fields.length) {
      fields = fields.filter((item) => Boolean(item));
    }
    setDisplayedTableFields(fields);
    setTableFields(getColumnsKeys(data));
    setCalculatedValues(data);
  }, [JSON.stringify(series), calc, JSON.stringify(options), displayMode, aggrDimension, JSON.stringify(columns)]);

  // 排序逻辑
  const { sortObj, updateSort } = useSort({ sortColumn, sortOrder });
  // 表格列搜索功能
  const { getColumnSearchProps } = useColumnSearch();
  let tableDataSource = calculatedValues;
  let tableColumns: any[] = [
    {
      title: 'name',
      dataIndex: 'name',
      key: 'name',
      // width: size?.width! - 200,
      sorter: (a, b) => {
        return localeCompare(a.name, b.name);
      },
      sortOrder: getSortOrder('name', sortObj),
      render: (text, record) => (
        <div className='renderer-table-td-content'>
          {transformColumnsLink(record, text, 'name', option, transformations)}
        </div>
      ),
      ...getColumnSearchProps(['name']),
    },
    {
      title: 'value',
      dataIndex: 'value',
      key: 'value',
      sorter: (a, b) => {
        return a.stat - b.stat;
      },
      sortOrder: getSortOrder('value', sortObj),
      className: 'renderer-table-td-content-value-container',
      render: (_val, record) => {
        let textObj;
        const overrideProps = getOverridePropertiesByName(overrides, record.fields?.refId);
        if (!_.isEmpty(overrideProps)) {
          textObj = getSerieTextObj(record?.stat, overrideProps?.standardOptions, overrideProps?.valueMappings);
        } else {
          textObj = getSerieTextObj(
            record?.stat,
            {
              unit: options?.standardOptions?.util,
              decimals: options?.standardOptions?.decimals,
              dateFormat: options?.standardOptions?.dateFormat,
            },
            options?.valueMappings,
          );
        }
        const colorObj = getColor(textObj.color, colorMode, themeMode);
        return (
          <div
            className='renderer-table-td-content'
            style={{
              ...colorObj,
            }}
          >
            {transformColumnsLink(record, textObj.text, 'value', option, transformations)}
          </div>
        );
      },
      ...getColumnSearchProps(['text']),
    },
  ];

  if (displayMode === 'labelsOfSeriesToRows') {
    const columnsKeys: any[] = _.isEmpty(columns) ? _.concat(getColumnsKeys(calculatedValues), 'value') : columns;
    tableColumns = _.map(columnsKeys, (key, idx) => {
      return {
        title: key,
        dataIndex: key,
        key: key,
        sorter: (a, b) => {
          if (key === 'value') {
            return a.stat - b.stat;
          }
          return localeCompare(_.toString(_.get(a.metric, key)), _.toString(_.get(b.metric, key)));
        },
        sortOrder: getSortOrder(key, sortObj),
        className: key === 'value' ? 'renderer-table-td-content-value-container' : '',
        render: (_val, record) => {
          if (key === 'value') {
            let textObj = {
              text: record?.text,
              color: record.color,
            };
            const overrideProps = getOverridePropertiesByName(overrides, record.fields?.refId);
            if (!_.isEmpty(overrideProps)) {
              textObj = getSerieTextObj(record?.stat, overrideProps?.standardOptions, overrideProps?.valueMappings);
            }
            const colorObj = getColor(textObj.color, colorMode, themeMode);
            return (
              <div
                className='renderer-table-td-content'
                style={{
                  ...colorObj,
                }}
              >
                {transformColumnsLink(record, textObj.text, key, option, transformations)}
              </div>
            );
          }
          return <span title={_.get(record.metric, key)}>{_.get(record.metric, key)}</span>;
        },
        ...getColumnSearchProps(['metric', key]),
      };
    });
  }

  if (displayMode === 'labelValuesToRows') {
    let aggrDimensions = _.isArray(aggrDimension) ? aggrDimension : [aggrDimension];
    if (!aggrDimension || (aggrDimension?.length === 0 && datasourceCate !== 'prometheus')) {
      aggrDimensions = [];
    }
    if (!aggrDimension || !aggrDimensions?.length) aggrDimensions = [];
    const colBy = datasourceCate === 'prometheus' ? 'refId' : '__name__';
    tableDataSource = formatToTable(calculatedValues, aggrDimensions, colBy);

    const groupNames = _.reduce(
      tableDataSource,
      (pre, item) => {
        return _.union(_.concat(pre, item.groupNames));
      },
      [],
    );
    tableColumns = _.map(aggrDimensions, (aggrDimension) => {
      return {
        title: aggrDimension,
        dataIndex: aggrDimension,
        key: aggrDimension,
        // width: size?.width! / (groupNames.length + 1),
        sorter: (a, b) => {
          return localeCompare(a[aggrDimension], b[aggrDimension]);
        },
        sortOrder: getSortOrder(aggrDimension, sortObj),
        render: (text, record) => (
          <div className='renderer-table-td-content'>
            {transformColumnsLink(record, text, aggrDimension, option, transformations)}
          </div>
        ),
        ...getColumnSearchProps([aggrDimension]),
      };
    });
    _.map(groupNames, (name, idx) => {
      const result = _.find(tableDataSource, (item) => {
        return item[name];
      });
      tableColumns.push({
        title: result[name]?.name,
        dataIndex: name,
        key: name,
        // TODO: 暂时关闭维度值列的伸缩，降低对目前不太理想的列伸缩交互的理解和操作成本
        // width: idx < groupNames.length - 1 ? size?.width! / (groupNames.length + 1) : undefined,
        sorter: (a, b) => {
          return _.get(a[name], 'stat') - _.get(b[name], 'stat');
        },
        sortOrder: getSortOrder(name, sortObj),
        className: 'renderer-table-td-content-value-container',
        render: (record) => {
          let textObj;
          const overrideProps = getOverridePropertiesByName(overrides, name);
          if (!_.isEmpty(overrideProps)) {
            textObj = getSerieTextObj(record?.stat, overrideProps?.standardOptions, overrideProps?.valueMappings);
          } else {
            textObj = getSerieTextObj(
              record?.stat,
              {
                unit: options?.standardOptions?.util,
                decimals: options?.standardOptions?.decimals,
                dateFormat: options?.standardOptions?.dateFormat,
              },
              options?.valueMappings,
            );
          }
          const colorObj = getColor(textObj.color, colorMode, themeMode);
          return (
            <div
              className='renderer-table-td-content'
              style={{
                ...colorObj,
              }}
            >
              {transformColumnsLink(record, textObj?.text, name, option, transformations)}
            </div>
          );
        },
        ...getColumnSearchProps([name, 'text']),
      });
    });
  }

  if (custom.links) {
    tableColumns.push({
      title: '链接',
      render: (_val, record) => {
        return (
          <Space>
            {_.map(custom.links, (link, idx) => {
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
              return !link.targetBlank && !isAbsolutePath(link.url) ? (
                <Link key={idx} to={getDetailUrl(link.url, data, dashboardMeta, time, isShare)!}>
                  {link.title}
                </Link>
              ) : (
                <a
                  key={idx}
                  href={getDetailUrl(link.url, data, dashboardMeta, time, isShare)}
                  target={link.targetBlank ? '_blank' : '_self'}
                >
                  {link.title}
                </a>
              );
            })}
          </Space>
        );
      },
    });
  }

  if (!_.isEmpty(calculatedValues) && !_.isEmpty(tableColumns)) {
    tableColumns = transformColumns(tableColumns, values.transformations);
  }

  const headerHeight = showHeader ? 44 : 0;
  const height = size?.height! - headerHeight;
  const realHeight = isNaN(height) ? 0 : height;
  // 可调整列宽功能
  const { components, resizableColumns, tableWidth, resetColumns } = useAntdResizableHeader({
    columns: useMemo(
      () => tableColumns,
      [
        JSON.stringify(columns),
        displayMode,
        JSON.stringify(calculatedValues),
        sortObj,
        themeMode,
        aggrDimension,
        overrides,
        size,
      ],
    ),
  });

  const { handleExportCsv } = useCsvExport({
    resizableColumns,
    tableDataSource,
    custom,
    overrides,
    options,
    displayMode,
    targets,
    name,
  });
  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    handleExportCsv,
  }));

  // console.log('tableDataSource --->', tableDataSource);

  return (
    <div className='renderer-table-container' ref={eleRef}>
      <div className='renderer-table-container-box'>
        <Table
          rowKey='id'
          size='small'
          getPopupContainer={() => document.body}
          showSorterTooltip={false}
          showHeader={showHeader}
          dataSource={tableDataSource}
          columns={resizableColumns}
          scroll={{ y: realHeight, x: tableWidth }}
          bordered={false}
          pagination={false}
          onChange={updateSort}
          components={components}
        />
      </div>
    </div>
  );
});

export default React.memo(Stat);
