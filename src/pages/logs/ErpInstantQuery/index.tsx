import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import {
  LineChartOutlined,
  FormatPainterOutlined,
  CompressOutlined,
  ExpandOutlined,
  ShrinkOutlined,
  ArrowsAltOutlined,
} from '@ant-design/icons';
import { Card, Spin, InputNumber, Table, Empty, Space, Popover, Radio, Slider } from 'antd';
import { useAntdResizableHeader } from '@minko-fe/use-antd-resizable-header';
import '@minko-fe/use-antd-resizable-header/dist/style.css';
import _ from 'lodash';
import { useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { parseRange } from '@/components/TimeRangePicker';
import { useTranslation } from 'react-i18next';
import { getErpLogSearch, getLogDetailSearch } from '@/services/logs';
import { CommonStateContext } from '@/App';
import PageLayout from '@/components/pageLayout';
import Filter from '../ErpFilter';
import { buildEsQuery } from '@/components/SearchBar/es-query';
import { getLogConfig } from '@/services/config';
import '@/pages/explorer/index.less';
import DOMPurify from 'dompurify';
import LogDetailDrawer from '../components/LogDetailDrawer';
import { getMoment, getFieldsToShow, getHighlightHtml } from '../utils';
import '../locale';
import '../InstantQuery/index.less';

type IType = 'single' | 'auto' | 'custom';

const ErpInstantQuery = () => {
  const { t } = useTranslation('logs');
  const history = useHistory();
  const { search } = useLocation();
  const urlParams = queryString.parse(search) as Record<string, string>;
  const [fullScreen, setFullScreen] = useState(false);
  const { ESIndex } = useContext(CommonStateContext);
  const type = localStorage.getItem('discover-row-type') as IType;
  const row = localStorage.getItem('discover-row-row');
  const filterRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [customRow, setCustomRow] = useState<{ type: IType; row: number }>(
    type ? { type: type, row: Number(row) } : { type: 'auto', row: 0 },
  );
  const [timezone, setTimezone] = useState('Browser');
  const [dataSize, setDataSize] = useState(500);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<{ start: number; end: number }>();
  // table 数据
  const [logTable, setLogTable] = useState<any[]>([]);
  // 查询条件
  const [filterData, setFilterData] = useState<any>();
  // 选中的日志
  const [selected, setSelected] = useState<{ id: boolean | string; fields: any; index?: string; highlight?: any }>({
    id: false,
    fields: [],
  });
  // 抽屉内loading
  const [detailJsonLoading, setDetailJsonLoading] = useState(false);
  // JSON 数据
  const [detailJson, setDetailJson] = useState({});
  // 字段列表
  const [fieldcaps, setFieldcaps] = useState<any>();

  const columnRender = (fieldName, val, highlight) => {
    const data = val ? _.escape(val) : '';
    return (
      <div
        className={`es-discover-logs-row ${customRow.row ? 'document-row-style' : undefined} `}
        style={{ WebkitLineClamp: customRow.row }}
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(highlight?.[fieldName] ? getHighlightHtml(data, highlight[fieldName]) : data),
        }}
      />
    );
  };

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
    {
      title: '@timestamp',
      dataIndex: '@timestamp',
      width: 170,
      sorter: (a, b) =>
        getMoment(a.fields['@timestamp'], timezone).valueOf() - getMoment(b.fields['@timestamp'], timezone).valueOf(),
      render: (_, { fields, highlight }) => {
        const timeValue = getMoment(fields['@timestamp'], timezone).format('YYYY-MM-DD HH:mm:ss.SSS');
        return (
          <span
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(
                highlight?.['@timestamp'] ? getHighlightHtml(timeValue, highlight['@timestamp']) : timeValue,
              ),
            }}
          />
        );
      },
    },
    ...(filterData?.type === 'java'
      ? [
          {
            title: 'host',
            dataIndex: ['fields', 'host.name'],
            width: 270,
            render: (val, { fields, highlight }) => {
              const host = val ? _.escape(val) : '';
              const hostPort = fields['host.port'] ? _.escape(fields['host.port']) : '';
              return (
                <div
                  className={`es-discover-logs-row ${customRow.row ? 'document-row-style' : undefined} `}
                  style={{ WebkitLineClamp: customRow.row }}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      `${highlight?.['host.name'] ? getHighlightHtml(host, highlight['host.name']) : host}:${
                        highlight?.['host.port'] ? getHighlightHtml(hostPort, highlight['host.port']) : hostPort
                      }`,
                    ),
                  }}
                />
              );
            },
          },
          {
            title: 'message',
            dataIndex: ['fields', 'message'],
            render: (val, { highlight }) => columnRender('message', val, highlight),
          },
        ]
      : [
          {
            title: t('erp_log.req_clientip'),
            dataIndex: ['fields', 'req.clientip'],
            width: 120,
            render: (val, { highlight }) => columnRender('req.clientip', val, highlight),
          },
          {
            title: t('erp_log.resp_time'),
            dataIndex: ['fields', 'resp.time'],
            width: 90,
            render: (val, { highlight }) => columnRender('resp.time', val, highlight),
          },
          {
            title: t('erp_log.upstream_time'),
            dataIndex: ['fields', 'upstream.time'],
            width: 100,
            render: (val, { highlight }) => columnRender('upstream.time', val, highlight),
          },
          {
            title: t('erp_log.network_delay'),
            dataIndex: ['fields', 'resp.delta'],
            width: 80,
            render: (val, { highlight }) => columnRender('resp.delta', val, highlight),
          },
          {
            title: t('erp_log.resp_status'),
            dataIndex: ['fields', 'resp.status'],
            width: 70,
            render: (val, { highlight }) => columnRender('resp.status', val, highlight),
          },
          {
            title: t('erp_log.resp_bytes'),
            dataIndex: ['fields', 'resp.bytes'],
            width: 110,
            render: (val, { highlight }) => columnRender('resp.bytes', val, highlight),
          },
          {
            title: t('host_ip'),
            dataIndex: ['fields', 'upstream.host'],
            width: 160,
            render: (val, { highlight }) => columnRender('upstream.host', val, highlight),
          },
          {
            title: t('req_url'),
            dataIndex: ['fields', 'req.url'],
            render: (val, { highlight }) => columnRender('req.url', val, highlight),
          },
        ]),
  ];

  const { components, resizableColumns, tableWidth } = useAntdResizableHeader({
    columns: useMemo(() => columns as any, [selected, logTable, customRow]),
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
        index: item._index,
        highlight: item.highlight,
      };
    });
    setLogTable(newData);

    setLoading(false);
    const tableEleNodes = document.querySelectorAll(`.es-discover-logs-table .ant-table-body`)[0];
    tableEleNodes?.scrollTo(0, 0);
  };

  const onRefresh = (params) => {
    const { start: timeStart, end: timeEnd } = parseRange({ start: params.start, end: params.end });
    const newFormData = {
      ...params,
      start: getMoment(timeStart, timezone).valueOf(),
      end: getMoment(timeEnd, timezone).valueOf(),
    };
    const {
      type,
      data_id,
      bgid,
      start,
      end,
      filter,
      keys,
      service_names,
      host_ip,
      host_port,
      req_host,
      req_client_ip,
      upstream_time,
      resp_time,
      req_url,
      time_formats,
    } = newFormData;
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
        order: 'desc', // 排序规则
        kql: queryResult, // 过滤条件
        type,
        mode: 'app',
        host_ip: host_ip ? host_ip.split(',') : [],
        host_port: host_port ? host_port.split(',') : [],
        time_field: '@timestamp',
        time_formats,
        is_highlight: true,
      };
      if (type === 'java') {
        // 应用日志
        body.service_names = service_names ? service_names.split(',') : [];
        body.keys = keys ? keys.split(',') : [];
      } else {
        body.req_host = req_host ? req_host.split(',') : [];
        body.req_client_ip = req_client_ip;
        body.upstream_time = upstream_time ? parseFloat(upstream_time) : undefined;
        body.resp_time = resp_time ? parseFloat(resp_time) : undefined;
        body.req_url = req_url;
      }
      body.indexed = ESIndex.elastic_app_log_index;
      setLoading(true);
      getErpLogSearch(body)
        .then((res) => {
          setCurrentPage(1);
          handleResult(res, start, end);
        })
        .catch((err) => setLoading(false));
    } catch (err) {
      setLogTable([]);
    }
  };

  // 提交查询
  const onRedirection = (formData) => {
    const searchParams = Object.entries({
      ...formData,
      filter: encodeURIComponent(formData.filter),
      ...(formData.fieldRecord ? { fieldRecord: encodeURIComponent(formData.fieldRecord) } : {}),
    }).map(([key, value]) => `${key}=${value}`);
    history.replace({
      pathname: '/c/cnd/erp/log',
      search: `?${searchParams.join('&')}`,
    });
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

  useEffect(() => {
    getLogConfig().then((res) => {
      setTimezone(res.dat.date_zone);
      setDataSize(res.dat.data_size || 500);
    });
  }, []);

  // 获取日志详情
  const handleJson = (_id, _index) => {
    const { start: timeStart, end: timeEnd } = parseRange({ start: filterData.start, end: filterData.end });
    const newFormData = {
      ...filterData,
      start: getMoment(timeStart, timezone).valueOf(),
      end: getMoment(timeEnd, timezone).valueOf(),
    };
    const { data_id, bgid, start, end, filter, time_formats } = newFormData;
    const fieldRecord = newFormData.fieldRecord;
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
        mode: 'app',
        time_field: '@timestamp',
        time_formats,
      };
      body.indexed = ESIndex.elastic_app_log_index;
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

  return (
    <PageLayout
      title={t('explorer.erp_title')}
      icon={<LineChartOutlined />}
      className={fullScreen ? 'elasticsearch-full-screen' : undefined}
    >
      <div className='prometheus-page'>
        <Card bodyStyle={{ padding: 16 }} className='panel logs-wrapper'>
          <div ref={filterRef}>
            <Filter
              onRedirection={onRedirection}
              onRefresh={onRefresh}
              filterTime={range ? range : undefined}
              fieldcaps={fieldcaps}
              refreshFieldcaps={(val) => setFieldcaps(val)}
            />
          </div>
          <Spin spinning={loading}>
            {!_.isEmpty(logTable) ? (
              <div className='es-discover-content erp-discover-content'>
                <div className='es-discover-main'>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'end', padding: '0 10px' }}>
                      <Space>
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
                      scroll={{ y: `calc(100vh - ${220 + filterRef?.current?.clientHeight ?? 0}px)`, x: tableWidth }}
                      components={components}
                      pagination={{
                        current: currentPage,
                        showSizeChanger: true,
                        onChange: (page) => setCurrentPage(page),
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
      </div>
    </PageLayout>
  );
};

export default ErpInstantQuery;
