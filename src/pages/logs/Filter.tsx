import React, { useContext, useEffect, useState, useRef } from 'react';
import moment from 'moment';
import { Space, Input, Form, Select, Button, Tag, Typography, message, Dropdown, Menu } from 'antd';
import {
  PlusCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  EditOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import _ from 'lodash';
import { useLocation, useHistory } from 'react-router-dom';
import queryString from 'query-string';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import { getBusinessIndexView, addBusinessFilter } from '@/services/manage';
import { getDataCategory } from '@/services/warning';
import SearchBar from '@/components/SearchBar';
import TimeRangePicker, { parseRange, isMathString } from '@/components/TimeRangePicker';
import EmptyDatasourcePopover from '@/components/DatasourceSelect/EmptyDatasourcePopover';
import FiltersBuilder, { filterOperators } from '@/components/FiltersBuilder';
import DataViewDrawer from '@/pages/user/component/DataViewDrawer';
import { conversionTime } from '@/pages/traces/utils';
import SearchRecord from '@/components/SearchRecord';
import { getLabelValues, getTermsList, getGroupCluster } from '@/services/logs';
import { getIndex, onDownLoad, updateFieldStatus, sortIpAddresses } from './utils';
import '@/pages/explorer/index.less';
import './index.less';
import { buildEsQuery } from '@/components/SearchBar/es-query';

interface IFiterProps {
  filterTime?: { start: number; end: number };
  onRefresh: (formData) => void; // 重新请求数据
  onRedirection: (formData) => void; // 路由重定向
  pathType: 'log-explorer' | 'log-stream';
  fieldcaps: any;
  refreshFieldcaps: (val: any) => void;
  timezone?: string;
  customColumn?: any;
  searchRecord?: { id: number; key: string; target: number; value: any[] };
  refreshSearchRcored?: (bgid: number) => void;
}

const LOGS_LIMIT = 500;

const Filter: React.FC<IFiterProps> = (props) => {
  const { search } = useLocation();
  const history = useHistory();
  const refEditUi =
    useRef<{
      setVisible: (val: boolean) => void;
      setFiltrateMode: (val: 'field' | 'dsl') => void;
      setInitialValues: (val: any) => void;
      setType: (val: 'add' | 'edit') => void;
      form: any;
    }>(null);
  const params = queryString.parse(search) as Record<string, string>;
  const {
    onRefresh,
    onRedirection,
    filterTime,
    pathType,
    fieldcaps,
    refreshFieldcaps,
    timezone,
    customColumn,
    searchRecord,
    refreshSearchRcored,
  } = props;
  const { t } = useTranslation('logs');
  const { curBusiId: bgid, busiGroups, groupedDatasourceList, ESIndex, menuPerm } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const [historyRecord, setHistoryRecord] = useState<any>();
  const [viewVisible, setViewVisible] = useState(false);
  const [timeOptions, setTimeOptions] = useState<{ label: string; value: string }[]>([
    { label: t('common:not_used_time'), value: '' },
  ]);

  // 过滤条件
  const [query, setQuery] = useState('');
  // 时间排序
  const sortOrder = useRef('desc');
  // 筛选类型下拉数据
  const [typeGroup, setTypeGroup] = useState({
    serviceNames: [],
    serviceEnvironments: [],
    idents: [],
    podNames: [],
    clusterNames: [],
    containerNames: [],
    containerIds: [],
    syslogIndex: [],
    groupCluster: [],
    Index: [],
    dataView: [],
  });
  // 初始查询数据
  const initialValues = {
    data_id: '',
    type: 'view',
    index: '',
    filter: '',
    range: { start: 'now-15m', end: 'now' },
  };

  useEffect(() => {
    if (params.type) {
      const fieldRecord = params.fieldRecord;
      setHistoryRecord(fieldRecord ? JSON.parse(fieldRecord) : []);
    }
  }, [search]);

  const changeType = (val) => {
    retrieveData();
    setTimeOptions([{ label: t('common:not_used_time'), value: '' }]);
    const range = form.getFieldValue('range');
    if (!range.start || !range.end) {
      form.setFieldsValue({ range: { start: 'now-15m', end: 'now' } });
    }
    form.setFieldsValue({
      service_names: [],
      service_environments: [],
      idents: [],
      pod_names: [],
      cluster_names: [],
      container_names: [],
      container_ids: [],
      index: '',
      ip: '',
      time_field: '',
    });
  };

  const updataTimeField = () => {
    const dateOptions =
      fieldcaps
        ?.filter((item) => item.esTypes?.includes('date'))
        .map((ele) => ({ label: ele.name, value: ele.name })) || [];
    const options =
      pathType === 'log-stream' ? dateOptions : [{ label: t('common:not_used_time'), value: '' }, ...dateOptions];
    setTimeOptions(options);
    return dateOptions;
  };

  // 重新获取数据视图、索引等下拉数据
  const retrieveData = async () => {
    const type = form.getFieldValue('type');
    const datasourceValue = form.getFieldValue('data_id');
    const time = form.getFieldValue('range');
    const timeRange = conversionTime(time.start, time.end);
    if (type === 'app') {
      Promise.all([
        // 应用日志：service_name
        getTermsList({
          busi_group_id: bgid,
          datasource_id: datasourceValue,
          mode: 'app',
          field: 'service.name',
          time_field: '@timestamp',
          ...timeRange,
        }),
        // 应用日志：service_environment
        getTermsList({
          busi_group_id: bgid,
          datasource_id: datasourceValue,
          mode: 'app',
          field: 'service.environment',
          time_field: '@timestamp',
          ...timeRange,
        }),
      ]).then(([serviceNames, serviceEnvironments]) => {
        setTypeGroup({ ...typeGroup, serviceNames, serviceEnvironments });
      });
    } else if (type === 'host' || type === 'graf') {
      // 主机
      getLabelValues({ group_id: bgid, ...timeRange, prom_ql: 'system_load1', label: 'ident' }).then((idents) => {
        setTypeGroup({ ...typeGroup, idents });
      });
    } else if (type === 'pod') {
      Promise.all([
        // POD日志：pod_name
        getLabelValues({
          group_id: bgid,
          ...timeRange,
          prom_ql: 'container_cpu_usage_seconds_total{job="cadvisor"}',
          label: 'pod',
        }),
        // POD日志：cluster_name
        getLabelValues({
          group_id: bgid,
          ...timeRange,
          prom_ql: 'container_cpu_usage_seconds_total{job="cadvisor"}',
          label: 'cluster',
        }),
      ]).then(([podNames, clusterNames]) => {
        setTypeGroup({ ...typeGroup, podNames, clusterNames });
      });
    } else if (type === 'container') {
      Promise.all([
        // 容器日志： container_name
        getLabelValues({
          group_id: bgid,
          ...timeRange,
          prom_ql: 'docker_container_status_uptime{job="docker"}',
          label: 'container_name',
        }),
        // 容器日志： container_id
        getLabelValues({
          group_id: bgid,
          ...timeRange,
          prom_ql: 'docker_container_status_uptime{job="docker"}',
          label: 'container_id',
        }),
      ]).then(([containerNames, containerIds]) => {
        setTypeGroup({ ...typeGroup, containerNames, containerIds });
      });
    } else if (type === 'syslog') {
      // Syslog日志
      getDataCategory({
        busi_group_id: bgid,
        datasource_id: datasourceValue,
        index: ESIndex.elastic_sys_log_index,
      }).then((res) => {
        let indexData: any = [];
        if (!_.isEmpty(res)) {
          ['aliases', 'data_streams', 'indices'].forEach((key) => {
            indexData = [
              ...indexData,
              ...res[key]
                .filter((indexItem) => !indexItem.data_stream)
                .map((element) => ({ label: element.name.replace('syslog-', ''), value: element.name })),
            ];
          });
        }
        setTypeGroup({
          ...typeGroup,
          syslogIndex: sortIpAddresses(indexData),
        });
      });
    } else if (type === 'k8s-event') {
      // k8s-event 日志
      getGroupCluster({
        busi_group_id: bgid,
      }).then((res) => {
        setTypeGroup({ ...typeGroup, groupCluster: res.dat || [] });
      });
    } else if (type === 'index') {
      // 自选索引
      const indexOptions = await getDataCategory({
        busi_group_id: bgid,
        datasource_id: datasourceValue,
        index: '*',
      });
      let indexData: any = [];
      if (!_.isEmpty(indexOptions)) {
        ['aliases', 'data_streams', 'indices'].forEach((key) => {
          indexData = [
            ...indexData,
            ...indexOptions[key]
              .filter((indexItem) => !indexItem.data_stream)
              .map((element) => ({ value: element.name })),
          ];
        });
      }
      setTypeGroup({ ...typeGroup, Index: indexData });
      return indexData[0];
    } else if (type === 'view') {
      // 自选视图
      const dataViewOptions = await getBusinessIndexView(bgid.toString(), { data_id: datasourceValue });
      let dataViewData: any = [];
      dataViewOptions.forEach((element) => {
        dataViewData = [...dataViewData, ...element.cmd];
      });
      setTypeGroup({ ...typeGroup, dataView: dataViewData });
      return dataViewData[0];
    }
  };

  const handleSubmit = (mode: 'search' | 'download') => {
    form.validateFields().then((values) => {
      const formData: any = {
        data_id: values.data_id,
        type: values.type,
        bgid,
        index: values.index, //索引
        ip: values.ip,
        limit: LOGS_LIMIT, //日志条数
        order: sortOrder.current, // 排序规则
        filter: values.filter,
        time_field: values.time_field ?? '@timestamp',
        ...(params.fieldRecord ? { fieldRecord: params.fieldRecord } : {}),
        ...(params.record_name ? { record_name: params.record_name } : {}),
      };
      if (values.time_field !== '') {
        formData.start = isMathString(values.range.start)
          ? values.range.start
          : moment(values.range.start).format('YYYY-MM-DD HH:mm:ss');
        formData.end = isMathString(values.range.end)
          ? values.range.end
          : moment(values.range.end).format('YYYY-MM-DD HH:mm:ss');
      }
      let changeParams =
        Number(params.data_id) !== values.data_id ||
        Number(params.bgid) !== bgid ||
        params.type !== values.type ||
        params.filter !== values.filter ||
        params.time_field !== values.time_field;
      if (values.time_field !== '') {
        changeParams = changeParams || params.start !== formData.start || params.end !== formData.end;
      }
      switch (formData.type) {
        case 'app': {
          // 应用日志
          const service_names = values.service_names.join(',');
          const service_environments = values.service_environments.join(',');
          changeParams =
            changeParams ||
            params.service_names !== service_names ||
            params.service_environments !== service_environments;
          formData.service_names = service_names;
          formData.service_environments = service_environments;
          break;
        }
        case 'host': {
          // 主机日志
          const idents = values.idents.join(',');
          changeParams = changeParams || params.idents !== idents;
          formData.idents = idents;
          break;
        }
        case 'graf': {
          // 采集器日志
          const idents = values.idents.join(',');
          changeParams = changeParams || params.idents !== idents;
          formData.idents = idents;
          break;
        }
        case 'pod': {
          // POD日志
          const pod_names = values.pod_names.join(',');
          const cluster_names = values.cluster_names.join(',');
          changeParams = changeParams || params.pod_names !== pod_names || params.cluster_names !== cluster_names;
          formData.pod_names = pod_names;
          formData.cluster_names = cluster_names;
          break;
        }
        case 'container': {
          // 容器日志
          const container_names = values.container_names.join(',');
          const container_ids = values.container_ids.join(',');
          changeParams =
            changeParams || params.container_names !== container_names || params.container_ids !== container_ids;
          formData.container_names = container_names;
          formData.container_ids = container_ids;
          break;
        }
        case 'syslog': {
          // syslog日志
          changeParams = changeParams || params.ip !== values.ip;
          formData.ip = values.ip;
          break;
        }
        case 'k8s-event': {
          // k8s-event 日志
          const cluster_names = values.cluster_names.join(',');
          changeParams = changeParams || params.cluster_names !== cluster_names;
          formData.cluster_names = cluster_names;
          break;
        }

        default: {
          // 自选索引、自选视图
          changeParams = changeParams || params.index !== values.index;
        }
      }
      if (changeParams) {
        onRedirection(formData);
        if (mode === 'download') {
          handleDownLoad(formData);
        }
      } else {
        mode === 'download' ? handleDownLoad(formData) : setRefreshFlag(_.uniqueId('refresh_'));
      }
    });
  };

  const handleDownLoad = (formData) => {
    const { start: timeStart, end: timeEnd } = parseRange({ start: formData.start, end: formData.end });
    const start = moment(timeStart).valueOf();
    const end = moment(timeEnd).valueOf();
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
    } = formData;
    const fieldRecord = params.fieldRecord;
    const historyRecord = fieldRecord ? JSON.parse(fieldRecord) : [];
    const queryResult = buildEsQuery(filter, historyRecord);
    let body: any = {
      datasource_id: Number(data_id),
      busi_group_id: Number(bgid),
      start,
      end,
      size: 500,
      order: 'desc', // 排序规则
      kql: queryResult, // 过滤条件
      mode: ['index', 'view'].includes(type) ? 'common' : type,
      time_field: time_field,
      time_formats: {
        fields: timeOptions?.map((ele) => ele.value),
        format: 'strict_date_optional_time',
      },
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
      body.cluster_names = cluster_names === '' ? [] : cluster_names.split(',');
    }
    body.indexed = getIndex(type, ESIndex, type === 'syslog' ? ip : index);
    onDownLoad(body, timezone);
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

    const newParams = params;
    newParams.fieldRecord = JSON.stringify(data);
    history.push({
      pathname: pathType === 'log-explorer' ? '/log/explorer' : '/log/stream',
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
      const data = updataTimeField();
      // 默认选中第一项
      if (params.time_field && params.time_field !== '') {
        form.setFieldsValue({ time_field: data[0]?.value ?? '' });
      }
    }
  }, [fieldcaps]);

  useEffect(() => {
    (async () => {
      const currentDataId = groupedDatasourceList.elasticsearch?.[0]?.id;
      // 数据源优先取url上带的，没有则取当前业务组中 elasticsearch 列表第一个
      const data_id = Number(params.data_id) || currentDataId;
      const bgid_value = Number(params.bgid) || bgid;
      const type = params.type || 'view';
      const matchGroup = busiGroups.filter((item) => item.id === Number(bgid_value));
      const matchDataId = groupedDatasourceList.elasticsearch?.filter((item) => item.id === data_id);
      // 判断 url 上的业务组、数据源是否存在
      if (matchGroup.length && matchDataId.length) {
        let searchParams: string | boolean =
          params.data_id &&
          Boolean(bgid_value) &&
          params.type &&
          (params.time_field === '' ? true : params.start && params.end) &&
          params.filter !== undefined;
        const initialValues: any = {};
        switch (type) {
          case 'app': {
            // 应用日志
            searchParams =
              searchParams && params.service_names !== undefined && params.service_environments !== undefined;
            initialValues.service_names = params.service_names === '' ? [] : params.service_names?.split(',');
            initialValues.service_environments =
              params.service_environments === '' ? [] : params.service_environments?.split(',');
            break;
          }
          case 'host': {
            // 主机日志
            searchParams = searchParams && params.idents !== undefined;
            initialValues.idents = params.idents === '' ? [] : params.idents?.split(',');
            break;
          }
          case 'graf': {
            // 采集器日志
            searchParams = searchParams && params.idents !== undefined;
            initialValues.idents = params.idents === '' ? [] : params.idents?.split(',');
            break;
          }
          case 'pod': {
            // POD日志
            searchParams = searchParams && params.pod_names !== undefined && params.cluster_names !== undefined;
            initialValues.pod_names = params.pod_names === '' ? [] : params.pod_names?.split(',');
            initialValues.cluster_names = params.cluster_names === '' ? [] : params.cluster_names?.split(',');
            break;
          }
          case 'container': {
            // 容器日志
            searchParams = searchParams && params.container_names !== undefined && params.container_ids !== undefined;
            initialValues.container_names = params.container_names === '' ? [] : params.container_names?.split(',');
            initialValues.container_ids = params.container_ids === '' ? [] : params.container_ids?.split(',');
            break;
          }
          case 'syslog': {
            // syslog日志
            searchParams = searchParams && params.ip !== undefined && params.ip !== '';
            initialValues.ip = params.ip || '';
            break;
          }
          case 'k8s-event': {
            // k8s-event 日志
            searchParams = searchParams && params.cluster_names !== undefined;
            initialValues.cluster_names = params.cluster_names === '' ? [] : params.cluster_names?.split(',');
            break;
          }
          default: {
            // 自选索引、自选视图
            searchParams =
              searchParams && params.index !== undefined && params.index !== '' && params.time_field !== undefined;
            initialValues.index = params.index || '';
            initialValues.time_field = params.time_field || '';
          }
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
          retrieveData();
          let time_formats: { fields?: { label: string; value: string }[]; format: string } = {
            fields: updataTimeField()?.map((ele) => ele.value),
            format: 'strict_date_optional_time',
          };
          onRefresh({
            ...params,
            time_formats: time_formats,
            ...(params.fieldRecord ? { fieldRecord: params.fieldRecord } : {}),
          });
        } else if (data_id && bgid_value) {
          //重定向
          const formData: any = {
            data_id,
            bgid: bgid_value,
            type: type,
            start: params.start || 'now-15m',
            end: params.end || 'now',
            filter: params.filter || '',
            ...(params.fieldRecord ? { fieldRecord: params.fieldRecord } : {}),
          };
          switch (type) {
            case 'app': {
              // 应用日志
              formData.service_names = params.service_names || '';
              formData.service_environments = params.service_environments || '';
              break;
            }
            case 'host': {
              // 主机日志
              formData.idents = params.idents || '';

              break;
            }
            case 'graf': {
              // 采集器日志
              formData.idents = params.idents || '';

              break;
            }
            case 'pod': {
              // POD日志
              formData.pod_names = params.pod_names || '';
              formData.cluster_names = params.cluster_names || '';

              break;
            }
            case 'container': {
              // 容器日志
              formData.container_names = params.container_names || '';
              formData.container_ids = params.container_ids || '';

              break;
            }
            case 'syslog': {
              // 容器日志
              formData.ip = params.ip || '';
              break;
            }
            case 'k8s-event': {
              // k8s-event 日志
              formData.cluster_names = params.cluster_names || '';
              break;
            }
            default: {
              let defaultIndex;
              let default_time_field;
              if (!params.index) {
                const defaultIndexItem = await retrieveData();
                if (type === 'index') {
                  // 索引
                  defaultIndex = defaultIndexItem?.value || '';
                  default_time_field = '';
                } else {
                  // 视图
                  defaultIndex = defaultIndexItem?.index || '';
                  default_time_field = defaultIndexItem?.time_field || '';
                }
              }
              // 自选索引、自选视图
              formData.index = params.index || defaultIndex;
              formData.time_field = params.time_field || default_time_field;
            }
          }
          form.setFieldsValue({
            ..._.omit(formData, ['start', 'end']),
            range: { start: formData.start, end: formData.end },
            ...initialValues,
          });
          onRedirection(formData);
        } else {
          form.setFieldsValue({
            ..._.omit(params, ['start', 'end']),
            data_id: Number(params.data_id),
            range: { start: params.start, end: params.end },
            ...initialValues,
          });
        }
      }
    })();
  }, [search, refreshFlag, groupedDatasourceList]);

  const onOk = (values) => {
    addBusinessFilter(bgid, {
      cmd_type: 3,
      data_id: form.getFieldValue('data_id'),
      cmd: [values],
    }).then((res) => {
      retrieveData();
      setViewVisible(false);
      message.success(t('common:success.create'));
    });
  };

  return (
    <>
      <Form form={form} initialValues={initialValues} className='log-filter-form-wrapper'>
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
                    form.setFieldsValue({ type: 'index' });
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
            <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.data_id !== curValues.data_id} noStyle>
              {({ getFieldValue }) => {
                const datasourceValue = getFieldValue('data_id');
                const datasourceData = groupedDatasourceList.elasticsearch?.find((item) => item.id === datasourceValue);
                return (
                  <Form.Item name='type'>
                    <Select onChange={changeType} className='form-item-width-110'>
                      {datasourceData?.settings?.mode === 1 ? null : (
                        <>
                          <Select.Option value='app'>{t('application_log')}</Select.Option>
                          <Select.Option value='host'>{t('host_log')}</Select.Option>
                          <Select.Option value='pod'>{t('POD_log')}</Select.Option>
                          <Select.Option value='container'>{t('container_log')}</Select.Option>
                          {/* <Select.Option value='syslog'>{t('syslog')}</Select.Option> */}
                          <Select.Option value='graf'>{t('collector_log')}</Select.Option>
                          <Select.Option value='k8s-event'>{t('k8s_event')}</Select.Option>
                        </>
                      )}
                      <Select.Option value='index'>{t('optional_index')}</Select.Option>
                      <Select.Option value='view'>{t('optional_view')}</Select.Option>
                    </Select>
                  </Form.Item>
                );
              }}
            </Form.Item>
          </Input.Group>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              return type === 'app' ? (
                // 应用日志
                <Space>
                  <Input.Group compact>
                    <span className='ant-input-group-addon log-input-group-addon'>{t('service_name')}</span>
                    <Form.Item name='service_names'>
                      <Select mode='tags' showSearch allowClear className='form-item-min-width-300'>
                        {typeGroup.serviceNames.map((item) => (
                          <Select.Option value={item} key={item}>
                            {item}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Input.Group>
                  <Input.Group compact>
                    <span className='ant-input-group-addon log-input-group-addon'>{t('service_environment')}</span>
                    <Form.Item name='service_environments'>
                      <Select mode='tags' showSearch allowClear className='form-item-min-width-300'>
                        {typeGroup.serviceEnvironments.map((item) => (
                          <Select.Option value={item} key={item}>
                            {item}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Input.Group>
                </Space>
              ) : type === 'host' || type === 'graf' ? (
                // 主机日志
                <Input.Group compact>
                  <span className='ant-input-group-addon log-input-group-addon'>{t('host')}</span>
                  <Form.Item name='idents'>
                    <Select mode='multiple' showSearch allowClear className='form-item-min-width-300'>
                      {typeGroup.idents.map((item) => (
                        <Select.Option value={item} key={item}>
                          {item}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Input.Group>
              ) : type === 'pod' ? (
                // POD日志
                <Space>
                  <Input.Group compact>
                    <span className='ant-input-group-addon log-input-group-addon'>{t('pod_name')}</span>
                    <Form.Item name='pod_names'>
                      <Select mode='multiple' showSearch allowClear className='form-item-min-width-300'>
                        {typeGroup.podNames.map((item) => (
                          <Select.Option value={item} key={item}>
                            {item}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Input.Group>
                  <Input.Group compact>
                    <span className='ant-input-group-addon log-input-group-addon'>{t('cluster_name')}</span>
                    <Form.Item name='cluster_names'>
                      <Select mode='multiple' showSearch allowClear className='form-item-min-width-300'>
                        {typeGroup.clusterNames.map((item) => (
                          <Select.Option value={item} key={item}>
                            {item}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Input.Group>
                </Space>
              ) : type === 'container' ? (
                // 容器日志
                <Space>
                  <Input.Group compact>
                    <span className='ant-input-group-addon log-input-group-addon'>{t('container_name')}</span>
                    <Form.Item name='container_names'>
                      <Select mode='multiple' showSearch allowClear className='form-item-min-width-300'>
                        {typeGroup.containerNames.map((item) => (
                          <Select.Option value={item} key={item}>
                            {item}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Input.Group>
                  <Input.Group compact>
                    <span className='ant-input-group-addon log-input-group-addon'>{t('container_id')}</span>
                    <Form.Item name='container_ids'>
                      <Select mode='multiple' showSearch allowClear className='form-item-min-width-300'>
                        {typeGroup.containerIds.map((item) => (
                          <Select.Option value={item} key={item}>
                            {item}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Input.Group>
                </Space>
              ) : type === 'syslog' ? (
                // Syslog日志
                <Input.Group compact>
                  <span className='ant-input-group-addon log-input-group-addon'>{t('device_IP')}</span>
                  <Form.Item
                    name='ip'
                    rules={[
                      {
                        required: true,
                        message: t('required_ip'),
                      },
                    ]}
                  >
                    <Select showSearch options={typeGroup.syslogIndex} className='form-item-min-width-300'></Select>
                  </Form.Item>
                </Input.Group>
              ) : type === 'k8s-event' ? (
                // Syslog日志
                <Input.Group compact>
                  <span className='ant-input-group-addon log-input-group-addon'>{t('group_cluster')}</span>
                  <Form.Item name='cluster_names'>
                    <Select mode='multiple' showSearch allowClear className='form-item-min-width-300'>
                      {typeGroup.groupCluster.map((item) => (
                        <Select.Option value={item} key={item}>
                          {item}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Input.Group>
              ) : type === 'index' ? (
                // 自选索引
                <Input.Group compact>
                  <span className='ant-input-group-addon log-input-group-addon'>{t('datasource:es.index')}</span>
                  <Form.Item
                    name='index'
                    rules={[
                      {
                        required: true,
                        message: t('datasource:es.index_msg'),
                      },
                    ]}
                    validateTrigger='onBlur'
                  >
                    <Select showSearch options={typeGroup.Index} className='form-item-min-width-300'></Select>
                  </Form.Item>
                </Input.Group>
              ) : type === 'view' ? (
                // 自选视图
                <Input.Group compact>
                  <span className='ant-input-group-addon log-input-group-addon'>
                    {t('data_view')}{' '}
                    {menuPerm?.includes('/busi-groups/put') ? (
                      <PlusCircleOutlined
                        style={{ cursor: 'pointer', color: '#1890ff' }}
                        onClick={() => setViewVisible(true)}
                      />
                    ) : null}
                  </span>
                  <Form.Item
                    name='index'
                    rules={[
                      {
                        required: true,
                        message: t('datasource:es.index_msg'),
                      },
                    ]}
                    validateTrigger='onBlur'
                  >
                    <Select
                      showSearch
                      className='form-item-min-width-300'
                      onChange={(e) => {
                        const matchDataView: any = typeGroup.dataView.find((item: any) => item.index === e);
                        form.setFieldsValue({ time_field: matchDataView.time_field });
                        const range = form.getFieldValue('range');
                        if (!range.start || !range.end) {
                          form.setFieldsValue({ range: { start: 'now-15m', end: 'now' } });
                        }
                      }}
                    >
                      {typeGroup.dataView
                        .filter((ele: any) => (pathType === 'log-stream' ? ele.time_field !== '' : ele))
                        .map((item: any) => (
                          <Select.Option value={item.index} key={item.name}>
                            {item.name}
                          </Select.Option>
                        ))}
                    </Select>
                  </Form.Item>
                </Input.Group>
              ) : null;
            }}
          </Form.Item>
          {
            <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.type !== curValues.type} noStyle>
              {({ getFieldValue }) => {
                const type = getFieldValue('type');
                return type === 'index' || type === 'view' ? (
                  <Input.Group compact>
                    <span className='ant-input-group-addon log-input-group-addon'>{t('common:date_field')}</span>
                    <Form.Item
                      name='time_field'
                      rules={[
                        {
                          required: pathType === 'log-stream',
                          message: t('common:date_field_tip'),
                        },
                      ]}
                    >
                      <Select
                        onChange={(e) => {
                          const range = form.getFieldValue('range');
                          if (!range.start || !range.end) {
                            form.setFieldsValue({ range: { start: 'now-15m', end: 'now' } });
                          }
                        }}
                        options={[...timeOptions]}
                        style={{ minWidth: '150px' }}
                        disabled={type === 'view'}
                      />
                    </Form.Item>
                  </Input.Group>
                ) : null;
              }}
            </Form.Item>
          }
          <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.time_field !== curValues.time_field} noStyle>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              const time_field = getFieldValue('time_field');
              return time_field === '' && (type === 'index' || type === 'view') ? null : (
                <Form.Item name='range'>
                  <TimeRangePicker onChange={retrieveData as any} />
                </Form.Item>
              );
            }}
          </Form.Item>
          {pathType === 'log-explorer' && (
            <Form.Item shouldUpdate noStyle>
              {({ getFieldValue }) => {
                const type = getFieldValue('type');

                return (
                  <Form.Item>
                    <SearchRecord
                      curBusiId={bgid}
                      searchRecord={searchRecord!}
                      customColumn={customColumn}
                      refreshSearchRcored={refreshSearchRcored!}
                      indexed={getIndex(
                        type,
                        ESIndex,
                        type === 'syslog' ? getFieldValue('ip') : getFieldValue('index'),
                      )}
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>
          )}
          <div className='es-discover-container'>
            <Space className='filter-wrapper'>
              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) => {
                  const datasourceValue = getFieldValue('data_id');
                  const type = getFieldValue('type');
                  let index = getIndex(type, ESIndex, type === 'syslog' ? getFieldValue('ip') : getFieldValue('index'));
                  const range = getFieldValue('range');
                  const time_field = getFieldValue('time_field');
                  return (
                    <Space>
                      <Form.Item>
                        <FiltersBuilder
                          fields={fieldcaps}
                          urlParams={params}
                          pathname={pathType === 'log-explorer' ? '/log/explorer' : '/log/stream'}
                          curBusiId={bgid}
                          datasourceValue={datasourceValue}
                          indexPatterns={index}
                          timeField={time_field}
                          timeRange={range && parseRange(range)}
                          mode={type}
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
                          onSubmit={() => handleSubmit('search')}
                          mode={type}
                          fields={fieldcaps}
                          refreshFieldcaps={refreshFieldcaps}
                          placeholder={
                            pathType === 'log-stream'
                              ? '搜索日志条目……（例如 host.name:host-1）'
                              : '使用 KQL 语法筛选数据'
                          }
                        />
                      </Form.Item>
                    </Space>
                  );
                }}
              </Form.Item>
              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) => {
                  const type = getFieldValue('type');
                  const time_field = getFieldValue('time_field');
                  return (
                    <Form.Item>
                      <Space>
                        <Button type='primary' onClick={() => handleSubmit('search')}>
                          {t('query_btn')}
                        </Button>
                        {pathType === 'log-explorer' && (
                          <Button onClick={() => handleSubmit('download')}>{t('explorer.log_export')}</Button>
                        )}
                      </Space>
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Space>
          </div>
        </Space>
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
                        pathname: pathType === 'log-explorer' ? '/log/explorer' : '/log/stream',
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
                        pathname: pathType === 'log-explorer' ? '/log/explorer' : '/log/stream',
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
      <DataViewDrawer
        visible={viewVisible}
        onOk={onOk}
        onCancel={() => setViewVisible(false)}
        dataId={form.getFieldValue('data_id')}
        bgid={bgid}
      />
    </>
  );
};

export default Filter;
