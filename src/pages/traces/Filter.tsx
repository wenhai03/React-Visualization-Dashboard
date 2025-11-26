import React, { useContext, useEffect, useState, useRef } from 'react';
import { Space, Input, Form, Select, Button, Tag, Typography, Dropdown, Menu } from 'antd';
import moment from 'moment';
import _ from 'lodash';
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  EditOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import queryString from 'query-string';
import { useLocation, useHistory } from 'react-router-dom';
import { CommonStateContext } from '@/App';
import SearchBar from '@/components/SearchBar';
import InputGroupWithFormItem from '@/components/InputGroupWithFormItem';
import { getServiceEnvironments, getServiceTransactionTypes } from '@/services/traces';
import FiltersBuilder, { filterOperators } from '@/components/FiltersBuilder';
import TimeRangePicker, { parseRange, isMathString } from '@/components/TimeRangePicker';
import EmptyDatasourcePopover from '@/components/DatasourceSelect/EmptyDatasourcePopover';
import { updateFieldStatus } from '@/pages/logs/utils';
import { conversionTime } from './utils';

interface IFiterProps {
  initialValues?: any;
  onRefresh: (formData) => void; // 重新请求数据
  onRedirection: (formData) => void; // 路由重定向
  searchPlaceholder: string;
}

const LOGS_LIMIT = 500;

const Filter: React.FC<IFiterProps> = (props) => {
  const { onRedirection, onRefresh, searchPlaceholder } = props;
  const { t } = useTranslation('traces');
  const history = useHistory();
  const { search, pathname } = useLocation();
  const [timeDuration, setTimeDuration] = useState(0);
  const [environmentList, setEnvironmentList] = useState<{ label: string; value: string }[]>([
    { label: t('all'), value: 'ENVIRONMENT_ALL' },
  ]);
  const [transactionTypeList, setTransactionTypeList] = useState<{ label: string; value: string }[]>([
    { label: t('all'), value: '' },
  ]);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const [historyRecord, setHistoryRecord] = useState<any>();
  const [fieldcaps, setFieldcaps] = useState([]);
  const params = queryString.parse(search) as Record<string, string>;
  const refEditUi =
    useRef<{
      setVisible: (val: boolean) => void;
      setFiltrateMode: (val: 'field' | 'dsl') => void;
      setInitialValues: (val: any) => void;
      setType: (val: 'add' | 'edit') => void;
      form: any;
    }>(null);
  const hasContrast = [
    '/service-tracking/overview',
    '/service-tracking/error',
    '/service-tracking/transaction',
    '/service-tracking/error/view',
  ];
  const hasAggType = ['/service-tracking/overview', '/service-tracking/transaction'];
  const {
    data_id,
    start,
    end,
    filter,
    serviceName,
    transactionType,
    environment,
    transactionName,
    page,
    bgid,
    contrast_time,
    aggregation_type,
    errorKey,
  } = params;
  const { curBusiId, busiGroups, groupedDatasourceList, ESIndex } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  // 过滤条件
  const [query, setQuery] = useState('');
  // 时间排序
  const sortOrder = useRef('desc');

  useEffect(() => {
    if (params.data_id) {
      const fieldRecord = params.fieldRecord;
      setHistoryRecord(fieldRecord ? JSON.parse(fieldRecord) : []);
    }
  }, [search]);

  // 获取环境列表
  const getEnvironments = (data_id, timeRange) => {
    getServiceEnvironments({
      busi_group_id: curBusiId,
      datasource_id: data_id,
      service_name: serviceName,
      ...timeRange,
    }).then((res) => {
      const aggs = res.aggregations;
      const environmentsBuckets = aggs?.environments.buckets || [];
      const environments = environmentsBuckets.map((environmentBucket) => ({
        label: environmentBucket.key,
        value: environmentBucket.key,
      }));
      setEnvironmentList([{ label: t('all'), value: 'ENVIRONMENT_ALL' }, ...environments]);
    });
  };

  // 获取事务类型
  const getTransactionType = (data_id, timeRange) => {
    getServiceTransactionTypes({
      busi_group_id: curBusiId,
      datasource_id: data_id,
      service_name: serviceName,
      ...timeRange,
    }).then((res) => {
      const typeList =
        res.aggregations?.types.buckets.map((bucket) => ({ label: bucket.key, value: bucket.key })) || [];
      setTransactionTypeList([{ label: t('all'), value: '' }, ...typeList]);
    });
  };

  // 重新获取事务类型和环境列表
  const retrieveData = (data_id_value?: number, timeRange?: any) => {
    const new_data_id = data_id_value ?? form.getFieldValue('data_id');
    let new_time_range = timeRange;
    if (!timeRange) {
      const range = form.getFieldValue('range');
      new_time_range = conversionTime(range.start, range.end);
    }
    if (new_data_id && new_time_range) {
      // 获取环境列表
      getEnvironments(new_data_id, new_time_range);
      // 获取事务类型
      getTransactionType(new_data_id, new_time_range);
    }
  };

  useEffect(() => {
    const currentDataId = groupedDatasourceList.elasticsearch?.[0]?.id;
    const data_id_value = Number(data_id) || currentDataId;
    const bgid_value = Number(bgid) || curBusiId;
    const matchGroup = busiGroups.filter((item) => item.id === Number(bgid_value));
    const timeRange = conversionTime(start, end);
    const duration = timeRange.end - timeRange.start;
    setTimeDuration(duration);
    if (matchGroup.length) {
      if (data_id_value && bgid_value && start && end) {
        retrieveData(data_id_value, timeRange);
      } else {
        setEnvironmentList([{ label: t('all'), value: 'ENVIRONMENT_ALL' }]);
        setTransactionTypeList([{ label: t('all'), value: '' }]);
      }
      setQuery(filter ?? '');
      if (
        data_id &&
        bgid &&
        environment &&
        transactionType !== undefined &&
        start &&
        end &&
        filter !== undefined &&
        (hasContrast.includes(pathname) ? contrast_time : true) &&
        ([...hasContrast, '/service-tracking/transaction/view'].includes(pathname) ? serviceName : true) &&
        (hasAggType.includes(pathname) ? aggregation_type : true) &&
        (pathname === '/service-tracking/error/view' ? errorKey : true)
      ) {
        form.setFieldsValue({
          ..._.omit(params, ['start', 'end']),
          data_id: Number(params.data_id),
          range: { start: params.start, end: params.end },
        });
        // 重新请求
        onRefresh(params);
      } else if (data_id_value && bgid_value) {
        // 重定向
        let formData: any = {
          data_id: data_id_value,
          bgid: bgid_value,
          environment: environment ?? 'ENVIRONMENT_ALL',
          transactionType: transactionType ?? '',
          start: start || 'now-15m',
          end: end || 'now',
          filter: filter || '',
          serviceName: serviceName || '',
          ...(params.fieldRecord ? { fieldRecord: params.fieldRecord } : {}),
        };

        // 小于25小时（90000000），默认选择前一天，大于等于25小时，小于8天（691200000），默认选择上一周，大于等于8天，默认选择计算出来的日期
        let contrast_time_default = duration < 90000000 ? '1' : duration >= 691200000 ? '100' : '7';

        if (hasContrast) {
          formData.contrast_time = contrast_time || contrast_time_default;
        }
        if (hasAggType.includes(pathname)) {
          formData.aggregation_type = aggregation_type || 'avg';
        }
        form.setFieldsValue({
          ..._.omit(formData, ['start', 'end']),
          range: { start: formData.start, end: formData.end },
        });
        onRedirection(formData);
      }
    }
  }, [search, refreshFlag, groupedDatasourceList]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      // 获取 es 版本
      const version = groupedDatasourceList.elasticsearch?.filter((item) => item.id === values.data_id)[0]?.settings
        ?.version as string;

      const formData = {
        environment: values.environment,
        transactionType: values.transactionType,
        serviceName: serviceName,
        transactionName: transactionName,
        data_id: values.data_id,
        bgid: curBusiId,
        version: version,
        start: isMathString(values.range.start)
          ? values.range.start
          : moment(values.range.start).format('YYYY-MM-DD HH:mm:ss'),
        end: isMathString(values.range.end) ? values.range.end : moment(values.range.end).format('YYYY-MM-DD HH:mm:ss'),
        index: ESIndex.elastic_apm_index, //索引
        filter: query, // 过滤条件
        date_field: '@timestamp', // 日期字段
        limit: LOGS_LIMIT, //日志条数
        order: sortOrder.current, // 排序规则
        page: page,
        ...(hasContrast.includes(pathname) ? { contrast_time: values.contrast_time ?? 0 } : {}),
        ...(hasAggType.includes(pathname) ? { aggregation_type } : {}),
        errorKey: errorKey,
        ...(params.fieldRecord ? { fieldRecord: params.fieldRecord } : {}),
      };
      if (
        Number(data_id) !== values.data_id ||
        Number(bgid) !== curBusiId ||
        environment !== values.environment ||
        transactionType !== values.transactionType ||
        start !== formData.start ||
        end !== formData.end ||
        filter !== query ||
        (hasContrast.includes(pathname) ? contrast_time !== values.contrast_time : false) ||
        (hasAggType.includes(pathname) ? !aggregation_type : false)
      ) {
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
    localStorage.setItem('traces-promql-history-record', JSON.stringify(data));
    const newParams = params;
    newParams.fieldRecord = JSON.stringify(data);
    history.push({
      pathname: pathname,
      search: `?${Object.entries(newParams)
        .map(([key, value]) => `${key}=${value}`)
        .join('&')}`,
    });
    setHistoryRecord(data);
    if (!deleteData.meta.disabled) {
      setRefreshFlag(_.uniqueId('refresh_'));
    }
  };

  return (
    <Form form={form}>
      <Space align='start' className='filter-wrapper'>
        <Form.Item noStyle>
          <EmptyDatasourcePopover datasourceList={groupedDatasourceList.elasticsearch}>
            <Input.Group compact>
              <span
                className='ant-input-group-addon'
                style={{
                  width: 'max-content',
                  height: 32,
                  lineHeight: '32px',
                }}
              >
                {t('common:datasource.id')}
              </span>
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
                  dropdownMatchSelectWidth={false}
                  showSearch
                  optionFilterProp='children'
                  onChange={() => retrieveData()}
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
        </Form.Item>
        <InputGroupWithFormItem label={t('table.type')}>
          <Form.Item name='transactionType' noStyle>
            <Select style={{ width: '160px' }}>
              {transactionTypeList?.map((item) => (
                <Select.Option value={item.value} key={item.label}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </InputGroupWithFormItem>
        <InputGroupWithFormItem label={t('environment')}>
          <Form.Item name='environment' noStyle>
            <Select style={{ width: '160px' }}>
              {environmentList.map((item) => (
                <Select.Option value={item.value} key={item.label}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </InputGroupWithFormItem>
        {contrast_time && (
          <InputGroupWithFormItem label={t('compare')}>
            <Form.Item name='contrast_time' noStyle>
              <Select style={{ width: '160px' }}>
                <Select.Option value='0' key={0}>
                  {t('incontrast')}
                </Select.Option>
                {timeDuration < 90000000 && (
                  <Select.Option value='1' key={1}>
                    {t('the_day_before')}
                  </Select.Option>
                )}
                {timeDuration < 691200000 && (
                  <Select.Option value='7' key={7}>
                    {t('the_previous_week')}
                  </Select.Option>
                )}
                {timeDuration >= 691200000 && (
                  <Select.Option value='100' key={100}>
                    {`${moment(moment(start).valueOf() - timeDuration).format('YYYY-MM-DD HH:mm:ss')}-${moment(
                      start,
                    ).format('YYYY-MM-DD HH:mm:ss')}`}
                  </Select.Option>
                )}
              </Select>
            </Form.Item>
          </InputGroupWithFormItem>
        )}
        <Form.Item name={'range'}>
          <TimeRangePicker onChange={() => retrieveData()} />
        </Form.Item>
      </Space>
      <div className='es-discover-container'>
        <Space className='filter-wrapper'>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const data_id = getFieldValue('data_id');
              const range = getFieldValue('range');
              const indexPatterns = data_id ? ESIndex.elastic_apm_index : undefined;

              return (
                <Space>
                  <Form.Item>
                    <FiltersBuilder
                      fields={fieldcaps}
                      urlParams={params}
                      pathname={pathname}
                      curBusiId={curBusiId}
                      datasourceValue={data_id}
                      indexPatterns={indexPatterns}
                      timeRange={range && parseRange(range)}
                      refreshHistory={refreshHistory}
                      mode='common'
                      timeField='@timestamp'
                      ref={refEditUi}
                    />
                  </Form.Item>
                  <Form.Item name={'filter'} style={{ width: '836px' }}>
                    <SearchBar
                      curBusiId={curBusiId}
                      datasourceValue={data_id}
                      indexPatterns={indexPatterns}
                      timeRange={range && parseRange(range)}
                      size={50}
                      query={query}
                      timeField='@timestamp'
                      onChange={(value) => setQuery(value)}
                      onSubmit={handleSubmit}
                      fields={fieldcaps}
                      refreshFieldcaps={(val) => setFieldcaps(val)}
                      placeholder={searchPlaceholder}
                    />
                  </Form.Item>
                </Space>
              );
            }}
          </Form.Item>
          <Form.Item>
            <Button type='primary' onClick={handleSubmit}>
              {t('query_btn')}
            </Button>
          </Form.Item>
        </Space>
      </div>
      <Space style={{ marginBottom: '10px' }} wrap>
        {historyRecord?.map((item, index) => (
          <Dropdown
            trigger={['click']}
            key={index}
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
                      pathname: pathname,
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
                      pathname: pathname,
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
  );
};

export default Filter;
