import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import {
  FileSearchOutlined,
  FormatPainterOutlined,
  CompressOutlined,
  ExpandOutlined,
  ShrinkOutlined,
  ArrowsAltOutlined,
  TableOutlined,
} from '@ant-design/icons';
import {
  Card,
  Select,
  Spin,
  InputNumber,
  Table,
  Empty,
  Space,
  Popover,
  Radio,
  Slider,
  Alert,
  message,
  Tag,
} from 'antd';
import { useAntdResizableHeader } from '@minko-fe/use-antd-resizable-header';
import '@minko-fe/use-antd-resizable-header/dist/style.css';
import DOMPurify from 'dompurify';
import Timeseries from '@/pages/dashboard/Renderer/Renderer/Timeseries';
import _ from 'lodash';
import { useHistory, useLocation } from 'react-router-dom';
import { parseRange } from '@/components/TimeRangePicker';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import {
  getLogSearch,
  getLogDetailSearch,
  getLogsCustomConfig,
  createLogsCustomConfig,
  updateLogsCustomConfig,
} from '@/services/logs';
import { CommonStateContext } from '@/App';
import PageLayout from '@/components/pageLayout';
import Filter from '../Filter';
import { buildEsQuery, buildFilter, buildCustomFilter } from '@/components/SearchBar/es-query';
import CustomFieldModal from '@/components/CustomFieldModal';
import { getLogConfig } from '@/services/config';
import { getAlertKql } from '@/services/common';
import { filterOperators } from '@/components/FiltersBuilder';
import queryString from 'query-string';
import '@/pages/explorer/index.less';
import LogDetailDrawer from '../components/LogDetailDrawer';
import { getInterval, getIndex, getMoment, getFieldsToShow, getHighlightHtml } from '../utils';
import '../locale';
import './index.less';

type IType = 'single' | 'auto' | 'custom';

const InstantQuery = () => {
  const { t } = useTranslation('logs');
  const history = useHistory();
  const { search } = useLocation();
  const urlParams = queryString.parse(search) as Record<string, string>;
  const [fullScreen, setFullScreen] = useState(false);
  const { ESIndex, curBusiGroup } = useContext(CommonStateContext);
  const type = localStorage.getItem('discover-row-type') as IType;
  const row = localStorage.getItem('discover-row-row');
  const filterRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [customRow, setCustomRow] = useState<{ type: IType; row: number }>(
    type ? { type: type, row: Number(row) } : { type: 'single', row: 1 },
  );
  const [timezone, setTimezone] = useState('Browser');
  const [dataSize, setDataSize] = useState(500);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<{ start: number; end: number }>();
  // table 数据
  const [logTable, setLogTable] = useState<any[]>([]);
  // 图表数据
  const [series, setSeries] = useState<{ hits_num: number; result: any }>({ hits_num: 0, result: [] });
  // 图表处设置时间单位
  const [intervalUnit, setIntervalUnit] = useState('auto');
  // 展示所查询的时间
  const [displayTimes, setDisplayTimes] = useState('');
  // 查询条件
  const [filterData, setFilterData] = useState<any>();
  // 选中的日志
  const [selected, setSelected] = useState<{ id: boolean | string; fields: any; index?: string; highlight?: any }>({
    id: false,
    fields: [],
  });
  // 自定义展示列配置弹窗显示
  const [visible, setVisible] = useState(false);
  // 抽屉内loading
  const [detailJsonLoading, setDetailJsonLoading] = useState(false);
  // JSON 数据
  const [detailJson, setDetailJson] = useState({});
  // 字段列表
  const [fieldcaps, setFieldcaps] = useState<any>();
  // 自定义展示列
  const [customColumn, setCustomColumn] =
    useState<{ id: number; key: string; target: number; value: Record<string, string[]> }>();
  const [searchRecord, setSearchRecord] = useState<{ id: number; key: string; target: number; value: any[] }>();
  // 选中的自定义展示列
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const indexed = getIndex(
    filterData?.type,
    ESIndex,
    filterData?.type === 'syslog' ? filterData?.ip : filterData?.index,
  );
  const displayColumn = urlParams.column ? urlParams.column.split(',') : customColumn?.value?.[indexed];

  const columns = [
    {
      width: 30,
      dataIndex: 'id',
      render: (val, record) => (
        <div
          onClick={() => {
            let data: any = [];
            let jsonData = {};
            if (fieldcaps?.length) {
              // 过滤衍生字段
              const fieldsToShow = getFieldsToShow(Object.keys(record.fields), fieldcaps || [], false);
              data = fieldcaps
                .filter((ele) => fieldsToShow.includes(ele.name))
                .map((field) => {
                  jsonData[field.name] = record.fields[field.name];
                  return {
                    ...field,
                    value: record.fields[field.name],
                  };
                });
            } else {
              jsonData = record.fields;
              data = Object.entries(record.fields).map(([key, value]) => ({
                name: key,
                value: value,
              }));
            }
            setSelected({ ...record, fields: data, json: jsonData });
          }}
          style={{ fontSize: '16px', cursor: 'pointer' }}
        >
          {val === selected?.id ? <ShrinkOutlined /> : <ArrowsAltOutlined />}
        </div>
      ),
    },
    ...(filterData?.time_field === undefined || (filterData?.time_field && filterData?.time_field !== '')
      ? [
          {
            title: filterData?.time_field || '@timestamp',
            dataIndex: filterData?.time_field || '@timestamp',
            width: 170,
            render: (_, { fields, highlight }) => {
              const timeField = filterData?.time_field || '@timestamp';
              const timeValue = getMoment(fields[timeField], timezone).format('YYYY-MM-DD HH:mm:ss.SSS');
              return (
                <span
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      highlight?.[timeField] ? getHighlightHtml(timeValue, highlight[timeField]) : timeValue,
                    ),
                  }}
                />
              );
            },
            sorter: true,
          },
        ]
      : []),
    ...(displayColumn?.length
      ? displayColumn.map((item, index) => ({
          title: item,
          width: displayColumn.length === index + 1 ? undefined : 200,
          dataIndex: item,
          key: item,
          render: (val, { fields, highlight }) => {
            const isTimeField = filterData.time_formats.fields?.includes(item);
            const value = isTimeField
              ? getMoment(fields[item], timezone).format('YYYY-MM-DD HH:mm:ss.SSS')
              : _.escape(fields[item]);
            return (
              <div
                className={`es-discover-logs-row ${customRow.row ? 'document-row-style' : undefined} `}
                style={{ WebkitLineClamp: customRow.row }}
              >
                <span
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(highlight?.[item] ? getHighlightHtml(value, highlight[item]) : value),
                  }}
                />
              </div>
            );
          },
        }))
      : [
          {
            title: t('explorer.doc'),
            dataIndex: 'fields',
            render(text, record) {
              return (
                <dl
                  className={`es-discover-logs-row ${customRow.row ? 'document-row-style' : undefined} `}
                  style={{ WebkitLineClamp: customRow.row }}
                >
                  {_.map(text, (val, key) => {
                    const value = _.isArray(val) ? _.join(val, ',') : val;
                    const isTimeField = filterData.time_formats.fields?.includes(key);
                    const data = isTimeField
                      ? getMoment(value, timezone).format('YYYY-MM-DD HH:mm:ss.SSS')
                      : _.escape(value);
                    return (
                      <React.Fragment key={key}>
                        <dt>{key}:</dt>
                        <dd
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(
                              record.highlight?.[key] ? getHighlightHtml(data, record.highlight[key]) : data,
                            ),
                          }}
                        />
                      </React.Fragment>
                    );
                  })}
                </dl>
              );
            },
          },
        ]),
  ];

  const { components, resizableColumns, tableWidth } = useAntdResizableHeader({
    columns: useMemo(() => columns, [customColumn, urlParams.column, selected, logTable, customRow]),
    minConstraints: 30,
  });

  const handleCustomRow = (type: 'single' | 'auto' | 'custom', row?: number) => {
    const newRow = row ? Number(row) : type === 'single' ? 1 : type === 'custom' ? 2 : 0;
    localStorage.setItem('discover-row-type', type);
    localStorage.setItem('discover-row-row', newRow.toString());
    setCustomRow({ type: type, row: newRow });
  };

  const handleResult = (res, start, end) => {
    const newData = _.map(res.list, (item) => {
      return {
        id: item._id,
        fields: item.fields,
        highlight: item.highlight,
        index: item._index,
      };
    });
    setLogTable(newData);
    // 图表
    const hits_num = res.total || 0;
    let series = [
      {
        id: _.uniqueId('series_'),
        name: 'doc_count',
        metric: {
          __name__: 'doc_count',
        },
        hits_num,
        data: _.map(res?.count_by_date, (item) => {
          return [item.key / 1000, item.doc_count];
        }),
        duration: res?.count_by_date?.[1]?.key - res?.count_by_date?.[0]?.key,
      },
    ];

    setSeries({ hits_num, result: series });
    if (series[0].data?.length) {
      setDisplayTimes(
        `${getMoment(start, timezone).format('YYYY.MM.DD HH:mm:ss')} - ${getMoment(end, timezone).format(
          'YYYY.MM.DD HH:mm:ss',
        )} （时间间隔：${intervalUnit === 'auto' ? '自动 -' : ''}${
          series[0].data.length === 1 ? `1 ${t(`common:interval.${intervalUnit}`)}` : getInterval(series[0].duration)
        }）`,
      );
    }

    setLoading(false);
    const tableEleNodes = document.querySelectorAll(`.es-discover-logs-table .ant-table-body`)[0];
    tableEleNodes?.scrollTo(0, 0);
  };

  const onRefresh = (params, order = 'desc') => {
    const { start: timeStart, end: timeEnd } = parseRange({ start: params.start, end: params.end });
    const {
      type,
      data_id,
      bgid,
      index,
      filter,
      idents,
      service_names: serviceName,
      service_environments: environment,
      pod_names,
      cluster_names,
      ip,
      container_names,
      container_ids,
      time_field,
      time_formats,
    } = params;
    const start = getMoment(timeStart, timezone).valueOf();
    const end = getMoment(timeEnd, timezone).valueOf();
    setFilterData(params);
    const fieldRecord = params.fieldRecord;
    const historyRecord = fieldRecord ? JSON.parse(fieldRecord) : [];
    try {
      const queryResult = buildEsQuery(filter, historyRecord);
      let body: any = {
        datasource_id: Number(data_id),
        busi_group_id: Number(bgid),
        start,
        end,
        size: dataSize,
        is_highlight: true,
        order, // 排序规则
        kql: queryResult, // 过滤条件
        mode: ['index', 'view'].includes(type) ? 'common' : type,
        aggs: [
          {
            type: 'date_histogram',
            name: 'count_by_date',
            fixed: intervalUnit,
          },
          {
            type: 'value_count',
            name: 'total_count',
          },
        ],
        time_field: time_field ?? '@timestamp',
        time_formats,
      };
      if (type === 'app') {
        // 应用日志
        body.service_names = serviceName ? serviceName.split(',') : [];
        body.service_environments = environment ? environment.split(',') : [];
      } else if (type === 'host' || type === 'graf') {
        // 主机日志
        body.idents = idents === '' ? [] : idents.split(',');
      } else if (type === 'pod') {
        // POD日志
        body.type = 'kubernates';
        body.pod_names = pod_names === '' ? [] : pod_names.split(',');
        body.cluster_names = cluster_names === '' ? [] : cluster_names.split(',');
      } else if (type === 'container') {
        // 容器日志
        body.type = 'docker';
        body.container_names = container_names === '' ? [] : container_names.split(',');
        body.container_ids = container_ids === '' ? [] : container_ids.split(',');
      } else if (type === 'k8s-event') {
        // k8s-event 日志
        body.cluster_names = cluster_names === '' ? [] : cluster_names.split(',');
      }
      body.indexed = getIndex(type, ESIndex, type === 'syslog' ? ip : index);
      setLoading(true);
      getLogSearch(body).then((res) => {
        setCurrentPage(1);
        handleResult(res, start, end);
      });
    } catch (err) {
      setLogTable([]);
      setSeries({ hits_num: 0, result: [] });
    }
  };

  // 提交查询
  const onRedirection = (formData) => {
    let searchParams = [
      `data_id=${formData.data_id}`,
      `bgid=${formData.bgid}`,
      `type=${formData.type}`,
      `filter=${encodeURIComponent(formData.filter)}`,
      ...(formData.fieldRecord ? [`fieldRecord=${encodeURIComponent(formData.fieldRecord)}`] : []),
      ...(formData.record_name ? [`record_name=${formData.record_name}`] : []),
    ];
    if (!((formData.type === 'view' || formData.type === 'index') && formData.time_field === '')) {
      searchParams = [...searchParams, `start=${formData.start}`, `end=${formData.end}`];
    }
    switch (formData.type) {
      case 'app': {
        // 应用日志
        searchParams = [
          ...searchParams,
          `service_names=${formData.service_names}`,
          `service_environments=${formData.service_environments}`,
        ];
        break;
      }
      case 'host': {
        // 主机日志
        searchParams = [...searchParams, `idents=${formData.idents}`];
        break;
      }
      case 'graf': {
        // 采集器日志
        searchParams = [...searchParams, `idents=${formData.idents}`];
        break;
      }
      case 'pod': {
        // POD日志
        searchParams = [...searchParams, `pod_names=${formData.pod_names}`, `cluster_names=${formData.cluster_names}`];
        break;
      }
      case 'k8s-event': {
        // k8s-event 日志
        searchParams = [...searchParams, `cluster_names=${formData.cluster_names}`];
        break;
      }
      case 'container': {
        // 容器日志
        searchParams = [
          ...searchParams,
          `container_names=${formData.container_names}`,
          `container_ids=${formData.container_ids}`,
        ];
        break;
      }
      case 'syslog': {
        // syslog日志
        searchParams = [...searchParams, `ip=${formData.ip}`];
        break;
      }

      default: {
        // 自选索引、自选视图
        searchParams = [...searchParams, `index=${formData.index}`, `time_field=${formData.time_field}`];
      }
    }
    history.push({
      pathname: '/log/explorer',
      search: `?${searchParams.join('&')}`,
    });
  };

  const handleRange = (range) => {
    setRange({ start: range.start, end: range.end });
  };

  useEffect(() => {
    if (range) {
      onRedirection({
        ...filterData,
        start: getMoment(range.start, timezone).format('YYYY-MM-DD HH:mm:ss'),
        end: getMoment(range.end, timezone).format('YYYY-MM-DD HH:mm:ss'),
      });
    }
  }, [range]);

  // 获取自定义展示列表
  const handleCustomColumn = (bgid) => {
    if (bgid) {
      getLogsCustomConfig({ key: 'g_log_column', target: bgid }).then((res) => {
        setCustomColumn(res.dat ? { ...res.dat, value: JSON.parse(res.dat.value) } : res.dat);
      });
    }
  };

  // 获取搜索记录
  const handleSearchRecord = (bgid) => {
    if (bgid) {
      getLogsCustomConfig({ key: 'g_log_search', target: bgid }).then((res) => {
        setSearchRecord(res.dat ? { ...res.dat, value: JSON.parse(res.dat.value) } : []);
      });
    }
  };

  useEffect(() => {
    if (filterData?.bgid) {
      handleSearchRecord(filterData?.bgid);
    }
  }, [filterData?.bgid]);

  useEffect(() => {
    if (urlParams.id) {
      // 日志告警跳转过来查询日志
      getAlertKql({ his_alert_id: urlParams.id }).then((res) => {
        const {
          start,
          end,
          kql,
          datasource_id,
          filters = [],
          filters_custom = [],
          mode,
          indexed,
          busi_group_id,
          time_field,
        } = res.dat;
        let dsl;
        const filterRecord = filters_custom.map((item) => {
          if (item.operator === 'DSL') {
            // DSL 模式
            try {
              dsl = JSON.parse(item.value);
            } catch (e) {
              message.error(t('json_error'));
              return null;
            }

            if (!dsl?.query) {
              dsl = { query: dsl };
            }
            const data = buildCustomFilter(indexed, dsl, false, item.negate, null);
            return data;
          } else {
            // 筛选值 模式
            const operatorInfo = { ...filterOperators(t)[item.operator], negate: item.negate };
            const data = buildFilter(
              indexed,
              { name: item.field_name } as any,
              operatorInfo,
              false,
              item.value ?? '',
              null,
            );
            return data;
          }
        });
        history.push({
          pathname: '/log/explorer',
          search: `?data_id=${datasource_id}&bgid=${busi_group_id}&type=${mode}&filter=${encodeURIComponent(
            kql,
          )}&start=${moment(start).format('YYYY-MM-DD HH:mm:ss')}&end=${moment(end).format(
            'YYYY-MM-DD HH:mm:ss',
          )}&index=${indexed}&time_field=${time_field}&fieldRecord=${encodeURIComponent(
            JSON.stringify([...filterRecord, ...filters]),
          )}`,
        });
      });
    } else {
      getLogConfig().then((res) => {
        setTimezone(res.dat.date_zone);
        setDataSize(res.dat.data_size || 500);
      });
    }
  }, [urlParams.id]);

  useEffect(() => {
    handleCustomColumn(filterData?.bgid);
  }, [filterData?.bgid]);

  // 更新图表
  useEffect(() => {
    if (filterData) {
      onRefresh(filterData);
    }
  }, [intervalUnit]);

  // 获取日志详情
  const handleJson = (_id, _index) => {
    const { start: timeStart, end: timeEnd } = parseRange({ start: filterData.start, end: filterData.end });
    const newFormData = {
      ...filterData,
      start: getMoment(timeStart, timezone).valueOf(),
      end: getMoment(timeEnd, timezone).valueOf(),
    };
    const { type, data_id, bgid, start, end, index, filter, ip, time_field, time_formats } = newFormData;
    const fieldRecord = filterData.fieldRecord;
    const historyRecord = fieldRecord ? JSON.parse(fieldRecord) : [];
    try {
      const queryResult = buildEsQuery(filter, historyRecord);
      let body: any = {
        datasource_id: Number(data_id),
        busi_group_id: Number(bgid),
        start,
        end,
        size: 1,
        ids: [_id],
        index: _index,
        kql: queryResult, // 过滤条件
        mode: ['index', 'view'].includes(type) ? 'common' : type,
        time_field: time_field ?? '@timestamp',
        time_formats,
      };
      body.indexed = getIndex(type, ESIndex, type === 'syslog' ? ip : index);
      setDetailJsonLoading(true);
      getLogDetailSearch(body).then((res) => {
        setDetailJson(res ?? {});
        setDetailJsonLoading(false);
      });
    } catch (err) {
      setDetailJson({});
      setDetailJsonLoading(false);
    }
  };

  if (urlParams.id) {
    return null;
  }

  return (
    <PageLayout
      title={t('explorer.title')}
      secondTitle={
        urlParams.record_name && (
          <>
            &nbsp;/
            <Tag
              style={{ margin: '0 4px', paddingRight: 0 }}
              closable
              onClose={(e) => {
                e.preventDefault();
                const newParams = urlParams;
                delete newParams.record_name;
                delete newParams.fieldRecord;
                delete newParams.column;
                const initData = {
                  start: 'now-15m',
                  end: 'now',
                  bgid: newParams.bgid,
                  data_id: newParams.data_id,
                  type: newParams.type,
                };
                history.push({
                  pathname: '/log/explorer',
                  search: `?${Object.keys(newParams)
                    .map((key) => {
                      if (initData[key]) {
                        return `${key}=${initData[key]}`;
                      }
                      return `${key}=`;
                    })
                    .join('&')}`,
                });
              }}
            >
              {urlParams.record_name}
            </Tag>
          </>
        )
      }
      icon={<FileSearchOutlined />}
      className={fullScreen ? 'elasticsearch-full-screen' : undefined}
    >
      <div className='prometheus-page'>
        <Card bodyStyle={{ padding: 16 }} className='panel logs-wrapper'>
          <div ref={filterRef}>
            <Filter
              onRedirection={onRedirection}
              onRefresh={onRefresh}
              filterTime={range ? range : undefined}
              pathType='log-explorer'
              fieldcaps={fieldcaps}
              refreshFieldcaps={(val) => setFieldcaps(val)}
              timezone={timezone}
              customColumn={customColumn}
              searchRecord={searchRecord}
              refreshSearchRcored={handleSearchRecord}
            />
          </div>
          <Spin spinning={loading}>
            {!_.isEmpty(logTable) ? (
              <div className='es-discover-content'>
                <div className='es-discover-main'>
                  {(filterData?.type === 'index' || filterData?.type === 'view') &&
                  filterData?.time_field === '' ? null : (
                    <div className='es-discover-chart'>
                      <div className='es-discover-chart-title'>
                        <h3>{t('explorer.hits', { num: series.hits_num })}</h3>
                        <div>
                          <span>{displayTimes}</span>
                          <Space style={{ marginLeft: 10 }}>
                            {t('explorer.interval')}
                            <Select
                              size='small'
                              style={{ width: 80 }}
                              value={intervalUnit}
                              onChange={(val) => setIntervalUnit(val)}
                              listHeight={320}
                            >
                              {['auto', 'ms', 's', 'm', 'h', 'd', 'w', 'M', 'y'].map((item) => (
                                <Select.Option key={item} value={item} label={t(`common:interval.${item}`)}>
                                  {t(`common:interval.${item}`)}
                                </Select.Option>
                              ))}
                            </Select>
                          </Space>
                        </div>
                      </div>
                      <div className='es-discover-chart-content'>
                        <Timeseries
                          series={series.result}
                          values={
                            {
                              custom: {
                                drawStyle: 'bar',
                                lineInterpolation: 'smooth',
                              },
                              options: {
                                legend: {
                                  displayMode: 'hidden',
                                },
                                tooltip: {
                                  mode: 'all',
                                },
                              },
                            } as any
                          }
                          onRange={handleRange}
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'end', padding: '0 10px' }}>
                      <Space>
                        {curBusiGroup.perm === 'rw' && (
                          <TableOutlined
                            onClick={() => {
                              setVisible(true);
                              setSelectedFields(displayColumn ?? []);
                            }}
                          />
                        )}
                        <Popover
                          content={
                            <div className='custom-row-number'>
                              <div>
                                <span>{t('row_height')}</span>
                                <Radio.Group
                                  onChange={(e) => handleCustomRow(e.target.value)}
                                  size='middle'
                                  defaultValue={customRow.type}
                                  optionType='button'
                                  buttonStyle='solid'
                                >
                                  <Radio value='single'>{t('explorer.single')}</Radio>
                                  <Radio value='auto'>{t('explorer.auto')}</Radio>
                                  <Radio value='custom'>{t('explorer.custom')}</Radio>
                                </Radio.Group>
                              </div>
                              {customRow.type === 'custom' && (
                                <div>
                                  <span>{t('explorer.row_num')}</span>
                                  <Space>
                                    <Slider
                                      value={customRow.row}
                                      onChange={(value) => handleCustomRow('custom', value)}
                                      max={20}
                                      min={1}
                                    />
                                    <InputNumber
                                      max={20}
                                      min={1}
                                      value={customRow.row}
                                      onChange={(value) => handleCustomRow('custom', value)}
                                    />
                                  </Space>
                                </div>
                              )}
                            </div>
                          }
                          trigger='click'
                          placement='bottomLeft'
                        >
                          <FormatPainterOutlined />
                        </Popover>

                        {fullScreen ? (
                          <CompressOutlined onClick={() => setFullScreen(false)} />
                        ) : (
                          <ExpandOutlined onClick={() => setFullScreen(true)} />
                        )}
                      </Space>
                    </div>
                    <Table
                      size='small'
                      className='es-discover-logs-table'
                      tableLayout='fixed'
                      rowKey='id'
                      rowClassName={(record) => (record.id === selected.id ? 'highlight-row' : '')}
                      columns={resizableColumns}
                      dataSource={logTable}
                      scroll={{ y: `calc(100vh - ${396 + filterRef?.current?.clientHeight ?? 0}px)`, x: tableWidth }}
                      components={components}
                      pagination={{
                        current: currentPage,
                        showSizeChanger: true,
                        onChange: (page) => setCurrentPage(page),
                      }}
                      onChange={(pagination, filters, sorter: any) => {
                        const time_field = filterData?.time_field || '@timestamp';
                        if (time_field === sorter.field) {
                          const order = sorter.order === 'ascend' ? 'asc' : 'desc';
                          onRefresh(filterData, order);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className='empty-wrapper'>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            )}
          </Spin>
        </Card>
        <LogDetailDrawer
          visible={Boolean(selected.id)}
          onClose={() => {
            setSelected({ fields: selected.fields, id: false });
            setDetailJson({});
          }}
          selected={selected}
          logTable={logTable}
          fieldcaps={fieldcaps}
          filterData={filterData}
          timezone={timezone}
          detailJsonLoading={detailJsonLoading}
          detailJson={detailJson}
          handleJson={handleJson}
          setSelected={setSelected}
          params={urlParams}
        />
        {/* 自定义展示列 */}
        <CustomFieldModal
          visible={visible}
          onCancel={() => setVisible(false)}
          onOk={() => {
            const { type, ip, index, bgid } = filterData;
            const indexed = getIndex(type, ESIndex, type === 'syslog' ? ip : index);
            if (customColumn) {
              updateLogsCustomConfig({
                id: customColumn.id,
                key: 'g_log_column',
                target: Number(bgid),
                value: JSON.stringify({ ...customColumn.value, [indexed]: selectedFields }),
              }).then((res) => {
                setVisible(false);
                handleCustomColumn(bgid);
                message.success(t('common:success.save'));
              });
            } else {
              const requestParams = {
                key: 'g_log_column',
                target: Number(bgid),
                value: JSON.stringify({ [indexed]: selectedFields }),
              };
              createLogsCustomConfig(requestParams).then((res) => {
                setVisible(false);
                handleCustomColumn(bgid);
                message.success(t('common:success.save'));
              });
            }
            // 更新路由
            history.push({
              pathname: '/log/explorer',
              search: `?${Object.entries({ ...urlParams, column: selectedFields })
                .map(([key, value]) => `${key}=${value}`)
                .join('&')}`,
            });
          }}
          extra={<Alert message={t('explorer.custom_column_tip')} type='info' showIcon />}
          fieldcaps={fieldcaps} // 可选字段
          selectedFields={selectedFields} // 选中的展示字段
          setSelectedFields={setSelectedFields}
        />
      </div>
    </PageLayout>
  );
};

export default InstantQuery;
