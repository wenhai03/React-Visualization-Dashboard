import React, { useContext, useEffect, useState, useRef } from 'react';
import moment from 'moment';
import { Space, Input, Form, Select, Button, Tag, Typography, InputNumber, Dropdown, Menu } from 'antd';
import _ from 'lodash';
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  EditOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { useLocation, useHistory } from 'react-router-dom';
import queryString from 'query-string';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import { getLogErpConfig } from '@/services/erp';
import SearchBar from '@/components/SearchBar';
import TimeRangePicker, { parseRange, isMathString } from '@/components/TimeRangePicker';
import EmptyDatasourcePopover from '@/components/DatasourceSelect/EmptyDatasourcePopover';
import FiltersBuilder, { filterOperators } from '@/components/FiltersBuilder';
import { getBusinessServiceName } from '@/services/manage';
import { updateFieldStatus } from '@/pages/logs/utils';
import '@/pages/explorer/index.less';
import './index.less';

interface IFiterProps {
  filterTime?: { start: number; end: number };
  onRefresh: (formData) => void; // 重新请求数据
  onRedirection: (formData) => void; // 路由重定向
  fieldcaps: any;
  refreshFieldcaps: (val: any) => void;
}

const LOGS_LIMIT = 500;

const Filter: React.FC<IFiterProps> = (props) => {
  const { search } = useLocation();
  const history = useHistory();
  const [flag, setFlag] = useState(false);
  const refEditUi =
    useRef<{
      setVisible: (val: boolean) => void;
      setFiltrateMode: (val: 'field' | 'dsl') => void;
      setInitialValues: (val: any) => void;
      setType: (val: 'add' | 'edit') => void;
      form: any;
    }>(null);
  const params = queryString.parse(search) as Record<string, string>;
  const { onRefresh, onRedirection, filterTime, fieldcaps, refreshFieldcaps } = props;
  const { t } = useTranslation('logs');
  const { curBusiId: bgid, busiGroups, groupedDatasourceList, ESIndex } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const [historyRecord, setHistoryRecord] = useState<any>();

  useEffect(() => {
    if (params.type) {
      const fieldRecord = params.fieldRecord;
      setHistoryRecord(fieldRecord ? JSON.parse(fieldRecord) : []);
    }
  }, [search]);

  // 过滤条件
  const [query, setQuery] = useState('');
  // 时间排序
  const sortOrder = useRef('desc');
  // 筛选类型下拉数据
  const [typeGroup, setTypeGroup] = useState({
    serviceNames: [], // 服务名称
    req_host: [], // nginx 日志-主机,
    host_ip: [], // 服务日志-服务器
    host_port: [], // 服务日志-端口
    upstream_host_ip: [], // nginx 日志-服务器
    upstream_host_port: [], // nginx 日志-端口
    max_day: 0,
  });
  // 初始查询数据
  const initialValues = {
    data_id: '',
    type: 'java',
    index: '',
    filter: '',
    range: { start: 'now-15m', end: 'now' },
  };

  const changeType = (val) => {
    const { data_id, type, filter } = form.getFieldsValue();
    // 切换类型，搜索条件重置
    let formData: any = {
      start: 'now-15m',
      end: 'now',
      data_id,
      bgid,
      type,
      filter,
      host_ip: '',
      host_port: '',
      ...(params.fieldRecord ? { fieldRecord: params.fieldRecord } : {}),
    };
    if (val === 'java') {
      formData = { ...formData, service_names: '', keys: '' };
    } else {
      formData = { ...formData, req_host: '', req_client_ip: '', upstream_time: '', resp_time: '', req_url: '' };
    }
    onRedirection(formData);
  };
  const getTimeField = (getFirst) => {
    const range = form.getFieldValue('range');
    if (!range.start || !range.end) {
      form.setFieldsValue({ range: { start: 'now-15m', end: 'now' } });
    }
    const dateOptions = fieldcaps
      ?.filter((item) => item.esTypes?.includes('date'))
      .map((ele) => ({ label: ele.name, value: ele.name }));
    return dateOptions;
  };
  // 重新获取数据视图、索引等下拉数据
  const retrieveData = () => {
    const type = form.getFieldValue('type');
    const requestbody = [
      getLogErpConfig({ expand: true }),
      ...(type === 'java' ? [getBusinessServiceName(params.bgid || bgid)] : []),
    ];
    Promise.all(requestbody).then(([otherConfig, serviceNames]) => {
      setTypeGroup({ ...typeGroup, ...otherConfig.dat, serviceNames: serviceNames?.dat ?? [] });
    });
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const formData: any = {
        data_id: values.data_id,
        type: values.type,
        bgid,
        host_ip: values.host_ip.join(','),
        host_port: values.host_port.join(','),
        limit: LOGS_LIMIT, //日志条数
        order: sortOrder.current, // 排序规则
        filter: values.filter,
        time_field: '@timestamp',
        ...(params.fieldRecord ? { fieldRecord: params.fieldRecord } : {}),
      };
      formData.start = isMathString(values.range.start)
        ? values.range.start
        : moment(values.range.start).format('YYYY-MM-DD HH:mm:ss');
      formData.end = isMathString(values.range.end)
        ? values.range.end
        : moment(values.range.end).format('YYYY-MM-DD HH:mm:ss');
      let changeParams =
        Number(params.data_id) !== values.data_id ||
        Number(params.bgid) !== bgid ||
        params.type !== values.type ||
        params.filter !== values.filter ||
        params.host_ip !== values.host_ip.join(',') ||
        params.host_port !== values.host_port.join(',');
      changeParams = changeParams || params.start !== formData.start || params.end !== formData.end;
      if (formData.type === 'java') {
        formData.service_names = values.service_names.join(',');
        formData.keys = values.keys.join(',');
        changeParams = changeParams || params.service_names !== formData.service_names || params.keys !== formData.keys;
      } else {
        formData.req_host = values.req_host.join(',');
        formData.req_client_ip = values.req_client_ip;
        formData.upstream_time = values.upstream_time === null ? '' : values.upstream_time;
        formData.resp_time = values.resp_time === null ? '' : values.resp_time;
        formData.req_url = values.req_url;
        changeParams =
          changeParams ||
          params.req_host !== formData.req_host ||
          params.req_client_ip !== formData.req_client_ip ||
          params.upstream_time !== formData.upstream_time ||
          params.resp_time !== formData.resp_time ||
          params.req_url !== formData.req_url;
      }
      if (changeParams) {
        onRedirection(formData);
      } else {
        setRefreshFlag(_.uniqueId('refresh_'));
      }
    });
  };

  // 刷新历史搜索记录
  const refreshHistory = () => {
    const fieldRecord = params.fieldRecord;
    setHistoryRecord(fieldRecord ? JSON.parse(fieldRecord) : []);
    setRefreshFlag(_.uniqueId('refresh_'));
  };
  // 删除历史搜索记录
  const onCloseHistory = (e, deleteData) => {
    e.preventDefault();
    let data = _.cloneDeep(historyRecord);
    if (deleteData.meta.type === 'custom') {
      data = data.filter(
        (item) => item.meta.type !== 'custom' || JSON.stringify(item.query) !== JSON.stringify(deleteData.query),
      );
    } else {
      data = data.filter(
        (item) =>
          item.meta.type === 'custom' ||
          `${item.meta.negate}-${item.meta.field.name}-${item.meta.type}-${JSON.stringify(item.meta.params ?? {})}` !==
            `${deleteData.meta.negate}-${deleteData.meta.field.name}-${deleteData.meta.type}-${JSON.stringify(
              deleteData.meta.params ?? {},
            )}`,
      );
    }
    localStorage.setItem(`log-erp-${params.type}-promql-history-record`, JSON.stringify(data));
    const newParams = params;
    newParams.fieldRecord = JSON.stringify(data);
    history.push({
      pathname: '/c/cnd/erp/log',
      search: `?${Object.entries(newParams)
        .map(([key, value]) => `${key}=${value}`)
        .join('&')}`,
    });
    setHistoryRecord(data);
    if (!deleteData.meta.disabled) {
      setRefreshFlag(_.uniqueId('refresh_'));
    }
  };

  useEffect(() => {
    if (bgid) {
      retrieveData();
    }
  }, [bgid]);

  useEffect(() => {
    if (filterTime) {
      const newRange = {
        start: moment(filterTime.start).format('YYYY-MM-DD HH:mm:ss'),
        end: moment(filterTime.end).format('YYYY-MM-DD HH:mm:ss'),
      };
      form.setFieldsValue({ range: newRange });
    }
  }, [filterTime]);

  useEffect(() => {
    if (fieldcaps) {
      setFlag(true);
    }
  }, [fieldcaps]);

  useEffect(() => {
    (async () => {
      const currentDataId = groupedDatasourceList.elasticsearch?.[0]?.id;
      // 数据源优先取url上带的，没有则取当前业务组中 elasticsearch 列表第一个
      const data_id = Number(params.data_id) || currentDataId;
      const bgid_value = Number(params.bgid) || bgid;
      const type = params.type || 'java';
      const matchGroup = busiGroups.filter((item) => item.id === Number(bgid_value));
      const matchDataId = groupedDatasourceList.elasticsearch?.filter((item) => item.id === data_id);
      // 判断 url 上的业务组、数据源是否存在
      if (matchGroup.length && matchDataId.length) {
        let searchParams: string | boolean =
          params.data_id &&
          Boolean(bgid_value) &&
          params.type &&
          params.start &&
          params.end &&
          params.filter !== undefined &&
          params.host_ip !== undefined &&
          params.host_port !== undefined;
        const initialValues: any = {
          host_ip: params.host_ip === '' ? [] : params.host_ip?.split(','),
          host_port: params.host_port === '' ? [] : params.host_port?.split(','),
        };
        if (type === 'java') {
          searchParams = searchParams && params.service_names !== undefined && params.keys !== undefined;
          initialValues.service_names = params.service_names === '' ? [] : params.service_names?.split(',');
          initialValues.keys = params.keys === '' ? [] : params.keys?.split(',');
        } else {
          searchParams =
            searchParams &&
            params.req_host !== undefined &&
            params.req_client_ip !== undefined &&
            params.upstream_time !== undefined &&
            params.resp_time !== undefined &&
            params.req_url !== undefined;
          initialValues.req_host = params.req_host === '' ? [] : params.req_host?.split(',');
          initialValues.req_client_ip = params.req_client_ip;
          initialValues.upstream_time = params.upstream_time;
          initialValues.resp_time = params.resp_time;
          initialValues.req_url = params.req_url;
        }

        setQuery(params.filter ?? '');
        if (searchParams) {
          // 重新请求
          form.setFieldsValue({
            ..._.omit(params, ['start', 'end']),
            data_id: Number(params.data_id),
            range: { start: params.start, end: params.end },
            ...initialValues,
          });
          if (flag) {
            let time_formats: { fields?: { label: string; value: string }[]; format: string } = {
              fields: getTimeField(false)?.map((ele) => ele.value),
              format: 'strict_date_optional_time',
            };
            onRefresh({
              ...params,
              time_formats: time_formats,
              ...(params.fieldRecord ? { fieldRecord: params.fieldRecord } : {}),
            });
          }
        } else if (data_id && bgid_value) {
          //重定向
          const formData: any = {
            data_id,
            bgid: bgid_value,
            type: type,
            start: params.start || 'now-15m',
            end: params.end || 'now',
            filter: params.filter || '',
            host_ip: params.host_ip || '',
            host_port: params.host_port || '',
            ...(params.fieldRecord ? { fieldRecord: params.fieldRecord } : {}),
          };
          if (type === 'java') {
            formData.service_names = params.service_names || '';
            formData.keys = params.keys || '';
          } else {
            formData.req_host = params.req_host || '';
            formData.req_client_ip = params.req_client_ip || '';
            formData.upstream_time = params.upstream_time || '';
            formData.resp_time = params.resp_time || '';
            formData.req_url = params.req_url || '';
          }
          form.setFieldsValue({
            ..._.omit(formData, ['start', 'end']),
            range: { start: formData.start, end: formData.end },
            ...initialValues,
          });
          onRedirection(formData);
        }
      }
    })();
  }, [search, refreshFlag, groupedDatasourceList, flag]);

  return (
    <>
      <Form form={form} initialValues={initialValues} className='log-filter-form-wrapper log-erp-filter-form-wrapper'>
        <Space align='end' wrap className='filter-wrapper'>
          <EmptyDatasourcePopover datasourceList={groupedDatasourceList.elasticsearch}>
            <Input.Group compact>
              <span className='ant-input-group-addon log-input-group-addon'>{t('common:datasource.id')}</span>
              <Form.Item
                name='data_id'
                rules={[
                  {
                    required: true,
                    message: t('common:datasource.id_required'),
                  },
                ]}
              >
                <Select
                  style={{ minWidth: 70 }}
                  onChange={(val) => {
                    changeType(val);
                  }}
                >
                  {_.map(groupedDatasourceList.elasticsearch, (item) => (
                    <Select.Option value={item.id} key={item.id}>
                      {item.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Input.Group>
          </EmptyDatasourcePopover>
          <Input.Group compact>
            <span className='ant-input-group-addon log-input-group-addon'>{t('datasource:es.type')}</span>
            <Form.Item name='type'>
              <Select onChange={changeType} className='form-item-min-width-95'>
                <Select.Option value='java'>{t('java_log')}</Select.Option>
                <Select.Option value='nginx'>{t('nginx_log')}</Select.Option>
              </Select>
            </Form.Item>
          </Input.Group>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              return type === 'java' ? (
                // 服务名称
                <Input.Group compact>
                  <span className='ant-input-group-addon log-input-group-addon'>{t('service_name')}</span>
                  <Form.Item name='service_names'>
                    <Select mode='tags' showSearch allowClear className='form-item-min-width-150'>
                      {typeGroup.serviceNames?.map((item: { name: string }) => (
                        <Select.Option value={item.name} key={item.name}>
                          {item.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Input.Group>
              ) : (
                // 主机
                <Input.Group compact>
                  <span className='ant-input-group-addon log-input-group-addon'>{t('host')}</span>
                  <Form.Item name='req_host'>
                    <Select mode='tags' showSearch allowClear className='form-item-min-width-150'>
                      {typeGroup.req_host.map((item) => (
                        <Select.Option value={item} key={item}>
                          {item}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Input.Group>
              );
            }}
          </Form.Item>
          {/* 服务器 */}
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              return (
                <Input.Group compact>
                  <span className='ant-input-group-addon log-input-group-addon'>{t('host_ip')}</span>
                  <Form.Item name='host_ip'>
                    <Select mode='tags' showSearch allowClear className='form-item-min-width-150'>
                      {(type === 'java' ? typeGroup.host_ip : typeGroup.upstream_host_ip)?.map((item) => (
                        <Select.Option value={item} key={item}>
                          {item}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Input.Group>
              );
            }}
          </Form.Item>
          {/* 端口 */}
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              return (
                <Input.Group compact>
                  <span className='ant-input-group-addon log-input-group-addon'>{t('host_port')}</span>
                  <Form.Item name='host_port'>
                    <Select mode='tags' showSearch allowClear className='form-item-min-width-95'>
                      {(type === 'java' ? typeGroup.host_port : typeGroup.upstream_host_port)?.map((item) => (
                        <Select.Option value={item} key={item}>
                          {item}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Input.Group>
              );
            }}
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              return type === 'nginx' ? (
                // 客户端IP
                <Input.Group compact>
                  <span className='ant-input-group-addon log-input-group-addon'>{t('req_client_ip')}</span>
                  <Form.Item name='req_client_ip'>
                    <Input className='form-item-min-width-150' />
                  </Form.Item>
                </Input.Group>
              ) : null;
            }}
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              return type === 'nginx' ? (
                // 网络响应（>N秒）
                <Input.Group compact>
                  <span className='ant-input-group-addon log-input-group-addon'>{t('resp_time')}</span>
                  <Form.Item name='resp_time'>
                    <InputNumber min={0} stringMode className='form-item-min-width-95' />
                  </Form.Item>
                </Input.Group>
              ) : null;
            }}
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              return type === 'nginx' ? (
                // 服务端响应(>N秒)
                <Input.Group compact>
                  <span className='ant-input-group-addon log-input-group-addon'>{t('upstream_time')}</span>
                  <Form.Item name='upstream_time'>
                    <InputNumber min={0} stringMode className='form-item-min-width-95' />
                  </Form.Item>
                </Input.Group>
              ) : (
                // 关键字
                <Input.Group compact>
                  <span className='ant-input-group-addon log-input-group-addon'>{t('keyword')}</span>
                  <Form.Item name='keys'>
                    <Select
                      mode='tags'
                      open={false}
                      placeholder={t('keyword_placeholder')}
                      className='form-item-min-width-300'
                    />
                  </Form.Item>
                </Input.Group>
              );
            }}
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              return type === 'nginx' ? (
                // 请求URL
                <Input.Group compact>
                  <span className='ant-input-group-addon log-input-group-addon'>{t('req_url')}</span>
                  <Form.Item name='req_url'>
                    <Input className='form-item-min-width-300' />
                  </Form.Item>
                </Input.Group>
              ) : null;
            }}
          </Form.Item>
          <Form.Item name='range'>
            <TimeRangePicker
              disabledDate={(current: moment.Moment) => {
                const today = moment().startOf('day');
                const threeDaysLater = moment().subtract(typeGroup.max_day, 'days').endOf('day');

                // 禁用threeDaysLater之前的日期和 今天之后的日期
                return current && (current < threeDaysLater || current > today.add(1, 'days'));
              }}
            />
          </Form.Item>
          <div className='es-discover-container'>
            <Space className='filter-wrapper'>
              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) => {
                  const datasourceValue = getFieldValue('data_id');
                  // TODO datasourceValue获取不到值需要重新处理下
                  let index = ESIndex.elastic_app_log_index;
                  const range = getFieldValue('range');
                  const time_field = getFieldValue('time_field');
                  return datasourceValue !== '' ? (
                    <Space>
                      <Form.Item>
                        <FiltersBuilder
                          fields={fieldcaps}
                          urlParams={params}
                          pathname='/c/cnd/erp/log'
                          curBusiId={bgid}
                          datasourceValue={datasourceValue}
                          indexPatterns={index}
                          timeField={time_field}
                          timeRange={range && parseRange(range)}
                          mode='app'
                          refreshHistory={refreshHistory}
                          ref={refEditUi}
                        />
                      </Form.Item>
                      <Form.Item name='filter' className='form-item-width-836'>
                        <SearchBar
                          curBusiId={bgid}
                          datasourceValue={datasourceValue}
                          indexPatterns={index}
                          timeRange={range && parseRange(range)}
                          size={50}
                          query={query}
                          timeField={time_field}
                          onChange={(value) => setQuery(value)}
                          onSubmit={handleSubmit}
                          mode='app'
                          fields={fieldcaps}
                          refreshFieldcaps={refreshFieldcaps}
                          placeholder='搜索日志条目……（例如 host.name:host-1）'
                        />
                      </Form.Item>
                    </Space>
                  ) : null;
                }}
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type='primary' onClick={handleSubmit}>
                    {t('query_btn')}
                  </Button>
                </Space>
              </Form.Item>
            </Space>
          </div>
        </Space>
        <Space style={{ marginTop: '6px' }} wrap>
          {historyRecord?.map((item, index) => (
            <Dropdown
              key={index}
              trigger={['click']}
              overlay={
                <Menu style={{ width: '300px' }}>
                  <Menu.Item
                    key='edit'
                    onClick={() => {
                      if (refEditUi.current) {
                        const { setVisible, setFiltrateMode, setType, setInitialValues } = refEditUi.current;
                        setType('edit');
                        setVisible(true);
                        setFiltrateMode(item.meta.type === 'custom' ? 'dsl' : 'field');
                        const queryString = item.query.query ? item.query : { query: item.query };
                        const data = Object.values(filterOperators(t));
                        const findItem = data.find(
                          (ele) => ele.type === item.meta.type && ele.negate === item.meta.negate,
                        );
                        setInitialValues(
                          item.meta.type === 'custom'
                            ? {
                                dsl: JSON.stringify(queryString, null, 2),
                                disabled: item.meta.disabled,
                                negate: item.meta.negate,
                              }
                            : {
                                fieldName: item.meta.field.name,
                                operator: findItem?.value,
                                value: item.meta.params,
                                negate: item.meta.negate,
                                disabled: item.meta.disabled,
                                type: item.meta.type,
                              },
                        );
                      }
                    }}
                  >
                    <Space>
                      <EditOutlined />
                      {t('common:editing_filter')}
                    </Space>
                  </Menu.Item>
                  <Menu.Item
                    key='negate'
                    onClick={() => {
                      const newParams = params;
                      const fieldRecord = updateFieldStatus(historyRecord, item, 'negate');
                      newParams.fieldRecord = JSON.stringify(fieldRecord);
                      history.push({
                        pathname: '/c/cnd/erp/log',
                        search: `?${Object.entries(newParams)
                          .map(([key, value]) => `${key}=${value}`)
                          .join('&')}`,
                      });
                      setHistoryRecord(fieldRecord);
                      setRefreshFlag(_.uniqueId('refresh_'));
                    }}
                  >
                    {item.meta.negate ? (
                      <Space>
                        <PlusCircleOutlined />
                        {t('common:include_results')}
                      </Space>
                    ) : (
                      <Space>
                        <MinusCircleOutlined />
                        {t('common:exclusion_result')}
                      </Space>
                    )}
                  </Menu.Item>
                  <Menu.Item
                    key='eyes'
                    onClick={() => {
                      const newParams = params;
                      const fieldRecord = updateFieldStatus(historyRecord, item, 'disabled');
                      newParams.fieldRecord = JSON.stringify(fieldRecord);
                      setHistoryRecord(fieldRecord);
                      history.push({
                        pathname: '/c/cnd/erp/log',
                        search: `?${Object.entries(newParams)
                          .map(([key, value]) => `${key}=${value}`)
                          .join('&')}`,
                      });
                      setRefreshFlag(_.uniqueId('refresh_'));
                    }}
                  >
                    {item.meta.disabled ? (
                      <Space>
                        <EyeOutlined />
                        {t('common:reactivate')}
                      </Space>
                    ) : (
                      <Space>
                        <EyeInvisibleOutlined />
                        {t('common:temporarily_disabled')}
                      </Space>
                    )}
                  </Menu.Item>
                </Menu>
              }
              arrow
            >
              <Tag key={index} closable onClose={(e) => onCloseHistory(e, item)}>
                <Typography.Text delete={item.meta.disabled} style={{ cursor: 'pointer' }}>
                  {item.meta.negate ? <span style={{ color: 'red' }}>非 </span> : ''}
                  {item.meta?.field?.name
                    ? `${item.meta.field.name}: ${
                        item.meta.type === 'phrase' || item.meta.type === 'range'
                          ? ''
                          : t(`common:operators.${item.meta.type}`)
                      } ${
                        item.meta.params === undefined
                          ? ''
                          : _.isArray(item.meta.params)
                          ? item.meta.params?.join(',')
                          : _.isObject(item.meta.params)
                          ? `${
                              item.meta.field.type === 'date' || item.meta.field.type === 'date_range'
                                ? moment(item.meta.params.from).format('YYYY-MM-DD HH:mm:ss')
                                : item.meta.params.from
                            } to ${
                              item.meta.field.type === 'date' || item.meta.field.type === 'date_range'
                                ? moment(item.meta.params.to).format('YYYY-MM-DD HH:mm:ss')
                                : item.meta.params.to
                            }`
                          : item.meta.params
                      }`
                    : JSON.stringify(item.query)}
                </Typography.Text>
              </Tag>
            </Dropdown>
          ))}
        </Space>
      </Form>
    </>
  );
};

export default Filter;
