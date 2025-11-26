import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  LineChartOutlined,
  FormatPainterOutlined,
  CompressOutlined,
  ExpandOutlined,
  ShrinkOutlined,
  ArrowsAltOutlined,
  CopyOutlined,
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
  Tabs,
  Drawer,
  Alert,
  Pagination,
} from 'antd';
import { useAntdResizableHeader } from '@minko-fe/use-antd-resizable-header';
import '@minko-fe/use-antd-resizable-header/dist/style.css';
import moment from 'moment';
import _ from 'lodash';
import Timeseries from '@/pages/dashboard/Renderer/Renderer/Timeseries';
import { useHistory } from 'react-router-dom';
import { CommonStateContext } from '@/App';
import { parseRange } from '@/components/TimeRangePicker';
import { useTranslation } from 'react-i18next';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { json } from '@codemirror/lang-json';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { getLogSearch, getLogDetailSearch } from '@/services/logs';
import PageLayout from '@/components/pageLayout';
import CustomFieldModal from '@/components/CustomFieldModal';
import { copyToClipBoard } from '@/utils';
import Filter from './Filter';
import FieldIcon from '@/pages/logs/components/FieldIcon';
import { getFieldsForWildcard } from '@/components/SearchBar/utils';
import { getFieldcaps } from '@/services/warning';
import { getInterval, getFieldsToShow } from '@/pages/logs/utils';
import '@/pages/explorer/index.less';
import '@/pages/logs/InstantQuery/index.less';
import '@/pages/logs/locale';
import './locale';

type IType = 'single' | 'auto' | 'custom';

const TIME_FORMAT = 'YYYY.MM.DD HH:mm:ss';

const TaskDetail = () => {
  const { t } = useTranslation('logs');
  const history = useHistory();
  const { curBusiId } = useContext(CommonStateContext);
  const [fullScreen, setFullScreen] = useState(false);
  const type = localStorage.getItem('dial-discover-row-type') as IType;
  const row = localStorage.getItem('dial-discover-row-row');
  // 自定义展示列配置弹窗显示
  const [visible, setVisible] = useState(false);
  const [activeKey, setActiveKey] = useState('table');
  // 抽屉内loading
  const [detailJsonLoading, setDetailJsonLoading] = useState(false);
  // JSON 数据
  const [detailJson, setDetailJson] = useState({});
  const [customRow, setCustomRow] = useState<{ type: IType; row: number }>(
    type ? { type: type, row: Number(row) } : { type: 'single', row: 1 },
  );
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<{ start: string; end: string }>();
  // table 数据
  const [logTable, setLogTable] = useState<any[]>([]);
  // 图表数据
  const [series, setSeries] = useState<{ hits_num: number; result: any[] }>({ hits_num: 0, result: [] });
  // 图表处设置时间单位
  const [intervalUnit, setIntervalUnit] = useState('auto');
  // 展示所查询的时间
  const [displayTimes, setDisplayTimes] = useState('');
  // 查询条件
  const [filterData, setFilterData] = useState<any>();
  // 选中的日志
  const [selected, setSelected] = useState<{ id: boolean | string; fields: any; index?: string }>({
    id: false,
    fields: [],
  });
  // field 字段
  const [fieldcaps, setFieldcaps] = useState<any>();
  // 选中的自定义展示列
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const initalColumn = {
    'dial.dial_name': t('common:table.name'),
    ident: t('dial:explorer.ident'),
    'dial.status': t('dial:explorer.dial_status'),
    'dial.url': t('explorer.address'),
    'dial.fail_reason': t('explorer.fail_reason'),
  };
  // 获取缓存在浏览器的拨测自定义展示列
  const customColumn = window.localStorage.getItem('dial-custom-column');
  const columns = [
    {
      width: 30,
      dataIndex: 'id',
      render: (val, record) => (
        <div
          onClick={() => {
            let data: any = [];
            if (fieldcaps?.length) {
              // 过滤衍生字段
              const fieldsToShow = getFieldsToShow(Object.keys(record.fields), fieldcaps || [], false);
              data = fieldcaps
                .filter((ele) => fieldsToShow.includes(ele.name))
                .map((field) => ({
                  ...field,
                  value: record.fields[field.name],
                }));
            } else {
              data = Object.entries(record.fields).map(([key, value]) => ({
                name: key,
                value: value,
              }));
            }

            setSelected({ ...record, fields: data });
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
      width: 200,
      render: (_, { fields }) => {
        return moment(fields['@timestamp'], moment.ISO_8601).format('YYYY-MM-DD HH:mm:ss.SSS');
      },
      sorter: (a, b) => moment(a.fields['@timestamp']).valueOf() - moment(b.fields['@timestamp']).valueOf(),
    },
    ...selectedFields.map((item, index) => ({
      title: initalColumn[item] ?? item,
      dataIndex: item,
      width: selectedFields.length === index + 1 ? undefined : 200,
      render(_, { fields }) {
        return (
          <div
            className={`es-discover-logs-row ${customRow.row ? 'document-row-style' : undefined} `}
            style={{ WebkitLineClamp: customRow.row }}
          >
            {fields[item]}
          </div>
        );
      },
    })),
  ];

  const { components, resizableColumns, tableWidth } = useAntdResizableHeader({
    columns: useMemo(() => columns, [customColumn, selected, logTable, customRow]),
    minConstraints: 30,
  });

  // 日志详情弹窗
  const logDetail = (data) => {
    // 保证 对象转字符串，属性顺序不受影响
    const orderedObject = new Map();
    Object.entries(data)
      .sort(function ([key1, value1], [key2, value2]) {
        return key1.localeCompare(key2);
      })
      .forEach(([key, value]) => {
        orderedObject.set(key, value);
      });
    let value = '';
    try {
      value = JSON.stringify(Object.fromEntries(orderedObject), null, 4);
    } catch (e) {
      console.error(e);
      value = t('explorer.unable_parse');
    }
    return (
      <>
        <a
          style={{ textAlign: 'right', display: 'block', marginBottom: '6px' }}
          onClick={() => copyToClipBoard(value, (val) => val)}
        >
          <CopyOutlined />
          {t('copy')}
        </a>
        <CodeMirror
          value={value}
          height='auto'
          theme='light'
          basicSetup={false}
          editable={false}
          extensions={[
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            json(),
            EditorView.lineWrapping,
            EditorView.theme({
              '&': {
                backgroundColor: '#F6F6F6 !important',
              },
              '&.cm-editor.cm-focused': {
                outline: 'unset',
              },
            }),
          ]}
        />
      </>
    );
  };

  const handleCustomRow = (type: 'single' | 'auto' | 'custom', row?: number) => {
    const newRow = row ? Number(row) : type === 'single' ? 1 : type === 'custom' ? 2 : 0;
    localStorage.setItem('dial-discover-row-type', type);
    localStorage.setItem('dial-discover-row-row', newRow.toString());
    setCustomRow({ type: type, row: newRow });
  };

  const onRefresh = (params) => {
    const { start: timeStart, end: timeEnd } = parseRange({ start: params.start, end: params.end });
    const newFormData = { ...params, start: moment(timeStart).valueOf(), end: moment(timeEnd).valueOf() };
    const { bgid, start, end, taskIds, status } = newFormData;
    setFilterData(params);
    setLoading(true);
    let body: any = {
      datasource_id: -1,
      status,
      dial_ids: taskIds === '' ? [] : taskIds.split(',').map((ele) => Number(ele)),
      busi_group_id: Number(bgid),
      start,
      end,
      size: 500,
      order: 'desc', // 排序规则
      mode: 'dial',
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
      time_field: '@timestamp',
    };

    getLogSearch(body).then((res) => {
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
      const result = res.count_by_date?.reduce((preVialue, currentValue) => {
        let lecelData = currentValue.result_code.buckets.map((ele) => ({
          type: ele.key === 0 ? 'success' : 'fail',
          doc_count: ele.doc_count,
          key: currentValue.key,
        }));

        if (!lecelData.length) {
          lecelData = [
            {
              type: 'success',
              doc_count: 0,
              key: currentValue.key,
            },
            {
              type: 'fail',
              doc_count: 0,
              key: currentValue.key,
            },
          ];
        } else if (lecelData.length < 2) {
          lecelData.push({
            type: lecelData[0].type === 'success' ? 'fail' : 'success',
            doc_count: 0,
            key: lecelData[0].key,
          });
        }
        return [...preVialue, ...lecelData];
      }, []);
      const successData = result.filter((item) => item.type === 'success');
      const failData = result.filter((item) => item.type === 'fail');
      let series = [
        {
          id: _.uniqueId('series_'),
          color: '#009A95',
          name: 'success',
          metric: {
            __name__: 'doc_count',
          },
          hits_num,
          data: _.map(successData, (item) => {
            return [item.key / 1000, item.doc_count];
          }),
          duration: res?.count_by_date?.[1]?.key - res?.count_by_date?.[0]?.key,
        },
        {
          id: _.uniqueId('series_'),
          color: '#E30018',
          name: 'fail',
          metric: {
            __name__: 'doc_count',
          },
          hits_num,
          data: _.map(failData, (item) => {
            return [item.key / 1000, item.doc_count];
          }),
          duration: res?.count_by_date?.[1]?.key - res?.count_by_date?.[0]?.key,
        },
      ];

      if (successData?.length) {
        setDisplayTimes(
          `${moment(start).format(TIME_FORMAT)} - ${moment(end).format(TIME_FORMAT)} （时间间隔：${
            intervalUnit === 'auto' ? '自动 -' : ''
          }${
            successData.length === 1
              ? `1 ${t(`common:interval.${intervalUnit}`)}`
              : getInterval(successData[1].key - successData[0].key)
          }）`,
        );
      }

      setSeries({ hits_num, result: series });

      setLoading(false);
      const tableEleNodes = document.querySelectorAll(`.es-discover-logs-table .ant-table-body`)[0];
      tableEleNodes?.scrollTo(0, 0);
    });
  };

  // 提交查询
  const onRedirection = (formData) => {
    history.replace({
      pathname: '/dial-explorer',
      search: `?bgid=${formData.bgid}&start=${formData.start}&end=${formData.end}&taskIds=${formData.taskIds}&status=${formData.status}`,
    });
  };

  useEffect(() => {
    setSelectedFields(customColumn ? customColumn.split(',') : Object.keys(initalColumn));
  }, [customColumn]);

  useEffect(() => {
    if (range) {
      onRedirection({
        ...filterData,
        ...range,
      });
    }
  }, [JSON.stringify(range)]);

  // 更新图表
  useEffect(() => {
    if (filterData) {
      onRefresh(filterData);
    }
  }, [intervalUnit]);

  useEffect(() => {
    if (curBusiId) {
      const requestParams = {
        datasource_id: -1,
        busi_group_id: curBusiId,
        mode: 'dial' as 'host' | 'container' | 'pod' | 'graf' | 'common',
        fields: '_source,_id,_index,_score,*',
      };
      getFieldcaps(requestParams)
        .then((res) => {
          const fields = getFieldsForWildcard(res.dat) || [];
          setFieldcaps(fields);
        })
        .catch((e) => {
          setFieldcaps([]);
        });
    }
  }, [curBusiId]);

  // 获取日志详情
  const handleJson = (_id, _index) => {
    const { start: timeStart, end: timeEnd } = parseRange({ start: filterData.start, end: filterData.end });
    const newFormData = {
      ...filterData,
      start: moment(timeStart).valueOf(),
      end: moment(timeEnd).valueOf(),
    };
    const { bgid, start, end } = newFormData;
    try {
      let body: any = {
        datasource_id: -1,
        busi_group_id: Number(bgid),
        start,
        end,
        size: 1,
        ids: [_id],
        index: _index,
        mode: 'dial',
        time_field: '@timestamp',
      };
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
      title={t('explorer.dial_search')}
      icon={<LineChartOutlined />}
      className={fullScreen ? 'elasticsearch-full-screen' : undefined}
    >
      <div className='prometheus-page'>
        <Card bodyStyle={{ padding: 16 }} className='panel logs-wrapper'>
          <Filter onRedirection={onRedirection} onRefresh={onRefresh} />
          <Spin spinning={loading}>
            {!_.isEmpty(logTable) ? (
              <div className='es-discover-content'>
                <div className='es-discover-main'>
                  <div className='es-discover-chart'>
                    <div className='es-discover-chart-title'>
                      <h3>{t('explorer.hits', { num: series.hits_num })}</h3>
                      <Space>
                        <span>{displayTimes}</span>
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
                    <div className='es-discover-chart-content'>
                      <Timeseries
                        series={series.result}
                        values={
                          {
                            custom: {
                              drawStyle: 'bar',
                              lineInterpolation: 'smooth',
                              stack: 'noraml',
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
                        onRange={(value: any) => {
                          setRange({
                            start: moment(value.start).format('YYYY-MM-DD HH:mm:ss'),
                            end: moment(value.end).format('YYYY-MM-DD HH:mm:ss'),
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'end', padding: '0 10px' }}>
                    <Space>
                      <TableOutlined
                        onClick={() => {
                          setVisible(true);
                        }}
                      />
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

                  <div>
                    <Table
                      size='small'
                      className='es-discover-logs-table'
                      tableLayout='fixed'
                      rowKey='id'
                      rowClassName={(record) => (record.id === selected.id ? 'highlight-row' : '')}
                      columns={resizableColumns}
                      dataSource={logTable}
                      scroll={{ y: 'calc(100vh - 498px)', x: tableWidth }}
                      components={components}
                      pagination={{
                        showSizeChanger: true,
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
        <Drawer
          width='50%'
          title={t('explorer.detail')}
          placement='right'
          mask={false}
          onClose={() => {
            setActiveKey('table');
            setSelected({ fields: selected.fields, id: false });
            setDetailJson({});
          }}
          visible={Boolean(selected.id)}
        >
          <Tabs
            activeKey={activeKey}
            onChange={(key: 'table' | 'json') => {
              setActiveKey(key);
              if (key === 'json') {
                handleJson(selected.id, selected.index);
              }
            }}
            tabBarExtraContent={
              <Pagination
                simple
                pageSize={1}
                current={logTable.findIndex((item) => item.id === selected.id) + 1 || 1}
                total={logTable.length}
                onChange={(page) => {
                  const current = logTable[page - 1];
                  // 过滤衍生字段
                  const fieldsToShow = getFieldsToShow(Object.keys(current.fields), fieldcaps || [], false);
                  const data = fieldcaps
                    .filter((ele) => fieldsToShow.includes(ele.name))
                    .map((field) => ({
                      ...field,
                      value: current.fields[field.name],
                    }));
                  setSelected({ ...current, fields: data });
                  if (activeKey === 'json') {
                    handleJson(current.id, current.index);
                  }
                }}
              />
            }
          >
            <Tabs.TabPane tab='Table' key='table'>
              <Table
                size='small'
                columns={[
                  {
                    title: 'Field',
                    dataIndex: 'name',
                    width: '260px',
                    render: (text, record: any) => {
                      return (
                        <Space>
                          <FieldIcon type={record.esTypes?.[0]} />
                          {text}
                        </Space>
                      );
                    },
                  },
                  {
                    title: 'Value',
                    dataIndex: 'value',
                    render: (text) => {
                      if (Array.isArray(text)) {
                        return <div>{JSON.stringify(text)}</div>;
                      } else {
                        return text;
                      }
                    },
                  },
                ]}
                dataSource={selected.fields.sort(function (a: { name: string }, b: { name: string }) {
                  return a.name.localeCompare(b.name);
                })}
                scroll={{ y: 'calc(100vh - 238px)' }}
                pagination={{
                  total: Object.keys(selected.fields).length,
                  showQuickJumper: true,
                  showSizeChanger: true,
                  showTotal: (total) => {
                    return t('common:table.total', { total });
                  },
                  pageSizeOptions: ['15', '50', '100', '300'],
                  defaultPageSize: 30,
                }}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab='Json' key='json'>
              <Spin spinning={detailJsonLoading}>{logDetail(detailJson)}</Spin>
            </Tabs.TabPane>
          </Tabs>
        </Drawer>
        {/* 自定义展示列 */}
        <CustomFieldModal
          visible={visible}
          onCancel={() => setVisible(false)}
          onOk={() => {
            window.localStorage.setItem('dial-custom-column', selectedFields.join(','));
            setVisible(false);
          }}
          extra={<Alert message='未选定任何字段时，默认展示 @timestamp' type='info' showIcon />}
          fieldcaps={fieldcaps} // 可选字段
          selectedFields={selectedFields} // 选中的展示字段
          setSelectedFields={setSelectedFields}
          onReset={() => {
            setSelectedFields(Object.keys(initalColumn));
            window.localStorage.setItem('dial-custom-column', Object.keys(initalColumn).join(','));
            setVisible(false);
          }}
        />
      </div>
    </PageLayout>
  );
};

export default TaskDetail;
