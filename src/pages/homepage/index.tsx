import React, { useEffect, useState, useContext } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Modal,
  Button,
  Typography,
  Space,
  Table,
  Tag,
  Empty,
  message,
  List,
  Skeleton,
} from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { useLocation, useHistory } from 'react-router-dom';
import queryString from 'query-string';
import { PlusOutlined } from '@ant-design/icons';
import { CommonStateContext } from '@/App';
import { Link } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import Markdown from '@/components/Markdown';
import EmptyDatasourcePopover from '@/components/DatasourceSelect/EmptyDatasourcePopover';
import { useTranslation } from 'react-i18next';
import { TimeRangePickerWithRefresh, parseRange, IRawTimeRange } from '@/components/TimeRangePicker';
import { Column } from '@ant-design/plots';
import { calculateThroughputWithRange } from './utils';
import {
  getHost,
  getContainer,
  getInput,
  getDial,
  getAlertRule,
  getAlertEvents,
  getAppLogSearch,
  getApmServiceSearch,
} from '@/services/home';
import { defaultColors } from '@/utils/constant';
import './index.less';
import './locale';

interface IGather {
  total: number;
  abnormal: number;
}

const CONTAINER_SETTINGS_VALUE = `version: "3"
services:
  nginx:
      image: nginx
      labels:
        busi: dev-demo
        cndgraf/input.nginx: |
          [[instances]]
          ## An array of Nginx stub_status URI to gather stats.
          urls = [
              "http://$cndgraf_containerIp:8000/nginx_status"
          ]
          labels = { job="nginx", busi="dev-demo", instance="$HOSTNAME" }
          
          ## interval = global.interval * interval_times
          # interval_times = 1
          
          ## Set response_timeout (default 5 seconds)
          response_timeout = "5s"

          ## Whether to follow redirects from the server (defaults to false)
          # follow_redirects = false

          ## Optional HTTP Basic Auth Credentials
          #username = "admin"
          #password = "admin"
      ports:
          - 80:80
      volumes:
          - ./src:/usr/share/nginx/html
...  `;

const HomePage = () => {
  const { t } = useTranslation('home');
  const { curBusiId, groupedDatasourceList } = useContext(CommonStateContext);
  const history = useHistory();
  const { search } = useLocation();
  const { start, end } = queryString.parse(search) as { start: string; end: string };
  const [timeRange, setTimeRange] = useState<IRawTimeRange>({ start: start || 'now-15m', end: end || 'now' });
  const [visible, setVisible] = useState(false);
  const [markdownVisible, setMarkdownVisible] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  // 机器
  const [hostLoading, setHostLoading] = useState(false);
  const [host, setHost] = useState({
    all: { total: 0, abnormal: 0 },
    linux: { total: 0, abnormal: 0 },
    'ct-k8s': { total: 0, abnormal: 0 },
    ct: { total: 0, abnormal: 0 },
    windows: { total: 0, abnormal: 0 },
    unknown: { total: 0, abnormal: 0 },
  });
  // 采集
  const [inputLoading, setInputLoading] = useState(false);
  const [input, setInput] = useState({ input_total: 0, logs_task_total: 0 });
  // 监控
  const [ruleLoading, setRuleLoading] = useState(false);
  const [alertRule, setAlertRule] = useState({ total: 0 });
  // 告警
  const [eventLoading, setEventLoading] = useState(false);
  const [alertEvents, setAlertEvents] = useState({ total: 0, events: [] });
  // 容器
  const [containerLoading, setContainerLoading] = useState(false);
  const [container, setContainer] =
    useState<{
      dataSourceValue?: number;
      data: { home_container_dashboard_url: { code: string; cate_code: string }; summary: IGather };
    }>();
  // 拨测数据源
  const [dialLoading, setDialLoading] = useState(false);
  const [dial, setDial] = useState<{ dataSourceValue?: number; data?: IGather }>();
  // 日志数据源
  const [logLoading, setLogLoading] = useState(false);
  const [logs, setLogs] =
    useState<{
      dataSourceValue?: number;
      data?: any[];
      level?: { key: string; doc_count: number }[];
    }>();
  // 服务数据源
  const [servicesLoading, setServicesLoading] = useState(false);
  const [services, setServices] =
    useState<{
      dataSourceValue?: number;
      data?: any[];
      servicesNum: number;
      throughput: number;
      outcomes?: any;
    }>();
  const logConfig: any = {
    isStack: true,
    xField: 'time',
    yField: 'value',
    seriesField: 'type',
    color: defaultColors,
    animation: false,
  };

  const list = [
    {
      title: '日志自助采集和告警上线试运行，欢迎反馈',
      content: `**日志采集和日志告警功能上线**

点击"日志分析"-"日志采集"，用于可以自行配置日志采集任务，编写日志解析脚本，不再限定日志格式了！

欢迎试用和反馈。`,
    },
    {
      title: '网络拨测功能上线',
      content: `**网络拨测功能上线了**

网络拨测功能上线了，支持常见的HTTP/TCP/ICMP请求探测，支持自定义请求报文和结果验证方式，

更支持https证书过期、域名注册过期、自定义拨测节点等，欢迎试用和反馈。

功能坐标：网络拨测 - 拨测任务。`,
    },
    {
      title: '容器日志自动采集已发布',
      content: `**容器监控又加入了日志采集功能**
      
安装好采集器后，会自动收集K8S POD或普通docker的容器日志，这份数据对定位问题可能有奇效。`,
    },
    {
      title: '可以直接在时序指标里查询JVM APM数据了，JVM监控不再复杂',
      content: `**可以直接在时序指标里查询JVM APM数据了，JVM监控不再复杂**

通过打通APM和Prometheus，将apm java agent采集的大量监控数据引入了时序库中。各类业务指标、容器指标、应用指标等都可以直接在时序库里查询，方便快速定位问题。

数据坐标：专用指标标签 job="apm"
`,
    },
  ];

  const servicesConfig: any = {
    isStack: true,
    xField: 'time',
    yField: 'value',
    seriesField: 'type',
    color: ['#009A95', '#E30018'],
    animation: false,
  };

  // 获取监控数据
  const handleAlertRule = () => {
    setRuleLoading(true);
    getAlertRule(curBusiId)
      .then((res) => {
        setRuleLoading(false);
        setAlertRule(res);
      })
      .catch(() => setRuleLoading(false));
  };

  // 获取告警数据
  const handleAlertEvents = () => {
    setEventLoading(true);
    getAlertEvents(curBusiId)
      .then((res) => {
        setEventLoading(false);
        setAlertEvents(res);
      })
      .catch(() => setEventLoading(false));
  };

  // 获取机器
  const handleHost = () => {
    setHostLoading(true);
    getHost(curBusiId)
      .then((res) => {
        setHostLoading(false);
        setHost(res);
      })
      .catch(() => setHostLoading(false));
  };

  // 获取采集数据
  const handleInput = () => {
    setInputLoading(true);
    getInput(curBusiId)
      .then((res) => {
        setInputLoading(false);
        setInput(res);
      })
      .catch(() => setInputLoading(false));
  };

  // 变更容器数据源
  const handleContainer = (val) => {
    if (val) {
      setContainerLoading(true);
      getContainer(curBusiId, { datasource_id: val })
        .then((res) => {
          setContainerLoading(false);
          setContainer({ dataSourceValue: val, data: res });
        })
        .catch(() => setContainerLoading(false));
    } else {
      setContainer({
        dataSourceValue: val,
        data: { home_container_dashboard_url: { code: '', cate_code: '' }, summary: { abnormal: 0, total: 0 } },
      });
    }
  };

  // 变更拨测数据源
  const handleDial = (val) => {
    if (val) {
      setDialLoading(true);
      getDial(curBusiId, { datasource_id: val })
        .then((res) => {
          setDialLoading(false);
          setDial({ dataSourceValue: val, data: res });
        })
        .catch(() => setDialLoading(false));
    } else {
      setDial({ dataSourceValue: val, data: { total: 0, abnormal: 0 } });
    }
  };

  // 变更日志数据源
  const handleLogs = (val: number, time?: { start: string; end: string }) => {
    const { start, end } = parseRange(time || timeRange);
    const requestParams = {
      start: moment(start).valueOf(),
      end: moment(end).valueOf(),
      datasource_id: val,
    };
    if (val) {
      setLogLoading(true);
      getAppLogSearch(curBusiId, requestParams).then((res) => {
        const aggregations = _.get(res, 'dat.aggregations');
        const result = aggregations?.group_by_minute?.buckets?.reduce((preVialue, currentValue) => {
          const lecelData = currentValue.group_by_level.buckets.map((ele) => ({
            time: moment(currentValue.key).format('YYYY-MM-DD HH:mm:ss'),
            type: ele.key,
            value: ele.doc_count,
          }));

          return [...preVialue, ...lecelData];
        }, []);
        setLogs({ dataSourceValue: val, data: result, level: aggregations?.all_level?.buckets });
        setLogLoading(false);
      });
    } else {
      setLogs({ dataSourceValue: val, data: [], level: [] });
    }
  };

  // 变更服务数据源
  const handleServices = (val: number, time?: { start: string; end: string }) => {
    const { start, end } = parseRange(time || timeRange);
    const requestParams = {
      start: moment(start).valueOf(),
      end: moment(end).valueOf(),
      datasource_id: val,
    };
    if (val) {
      setServicesLoading(true);
      getApmServiceSearch(curBusiId, requestParams)
        .then((res) => {
          const data = _.get(res, 'dat.aggregations');
          const result = data?.timeseries?.buckets?.reduce((preVialue, currentValue) => {
            const lecelData = currentValue.outcomes.buckets.map((ele) => ({
              time: moment(currentValue.key).format('YYYY-MM-DD HH:mm:ss'),
              type: ele.key,
              value: ele.doc_count,
            }));

            return [...preVialue, ...lecelData];
          }, []);

          const servicesNum = data?.service_total?.value ?? 0;
          const totalCount = data?.services_count?.buckets?.reduce(
            (preVialue, currentValue) => preVialue + currentValue.doc_count,
            0,
          );
          const throughput = calculateThroughputWithRange({
            start: moment(start).valueOf(),
            end: moment(end).valueOf(),
            value: totalCount,
          });
          setServices({
            dataSourceValue: val,
            data: result,
            servicesNum,
            throughput,
            outcomes: data?.outcomes?.buckets,
          });
          setServicesLoading(false);
        })
        .catch(() => setServicesLoading(false));
    } else {
      setServices({
        dataSourceValue: val,
        data: [],
        servicesNum: 0,
        throughput: 0,
        outcomes: 0,
      });
    }
  };

  const refreshData = (val) => {
    setTimeRange(val);
    const initialPrometheus = groupedDatasourceList?.prometheus?.[0]?.id;
    const initialElasticsearch = groupedDatasourceList?.elasticsearch?.[0]?.id;
    handleContainer(initialPrometheus);
    handleDial(initialPrometheus);
    handleLogs(initialElasticsearch, val);
    handleServices(initialElasticsearch, val);
    if (curBusiId) {
      handleAlertEvents();
      handleHost();
      handleInput();
      handleAlertRule();
    }
  };

  const jumpDashboard = () => {
    if (!container!.data.home_container_dashboard_url.cate_code || !container!.data.home_container_dashboard_url.code) {
      message.warning('当前没有进行容器设置，请联系管理员进行设置');
    } else {
      history.push(
        `/dashboards-built-in/${container!.data.home_container_dashboard_url?.cate_code}/detail/${
          container!.data.home_container_dashboard_url?.code
        }`,
      );
    }
  };

  useEffect(() => {
    const initialPrometheus = groupedDatasourceList?.prometheus?.[0]?.id;
    const initialElasticsearch = groupedDatasourceList?.elasticsearch?.[0]?.id;
    handleContainer(initialPrometheus);
    handleDial(initialPrometheus);
    handleLogs(initialElasticsearch);
    handleServices(initialElasticsearch);
  }, [groupedDatasourceList]);

  useEffect(() => {
    if (curBusiId) {
      handleAlertEvents();
      handleHost();
      handleInput();
      handleAlertRule();
    }
  }, [curBusiId]);

  return (
    <PageLayout
      title={t('title')}
      className='home-page-wrapper'
      rightArea={
        <TimeRangePickerWithRefresh
          dateFormat='YYYY-MM-DD HH:mm:ss'
          refreshMap={{ 0: 'off', 60: '1m', 300: '5m' }}
          value={timeRange}
          onChange={refreshData}
          style={{ marginRight: '10px' }}
        />
      }
    >
      <div>
        <Card
          title={t('alarm')}
          size='small'
          className='alram-box'
          bordered={false}
          extra={<Link to={{ pathname: '/alert-his-events' }}>{t('view_all_alarm')}</Link>}
        >
          <Skeleton active loading={eventLoading} style={{ padding: '12px' }}>
            <Row>
              <Col span={4} style={{ margin: 'auto' }}>
                <Link to={{ pathname: '/alert-cur-events', search: `bgid=${curBusiId}` }} className='alert-events-box'>
                  <div className={`alert-events-total ${alertEvents?.total ? 'active-alarms' : 'empty-active-alarms'}`}>
                    {alertEvents?.total}
                  </div>
                  {t('active_alarms_num')}
                </Link>
              </Col>
              <Col span={20}>
                <Table
                  size='small'
                  tableLayout='fixed'
                  rowKey='id'
                  bordered
                  scroll={{ y: 172 }}
                  columns={[
                    {
                      title: t('prod'),
                      dataIndex: 'rule_prod',
                      width: 100,
                      render: (value) => {
                        return t(`common:rule_prod.${value}`);
                      },
                    },
                    {
                      title: t('common:datasource.name'),
                      dataIndex: 'datasource_id',
                      width: 120,
                      render: (value, record: any) => {
                        if (value === 0) {
                          return (
                            <Tag color='blue' key={value}>
                              $all
                            </Tag>
                          );
                        }
                        const name = _.find(groupedDatasourceList[record.cate], { id: value })?.name;
                        if (!name) return null;
                        return (
                          <Tag color='blue' key={value}>
                            {_.find(groupedDatasourceList[record.cate], { id: value })?.name}
                          </Tag>
                        );
                      },
                    },
                    {
                      title: t('rule_name'),
                      dataIndex: 'rule_name',
                      render(title, { id, tags }) {
                        const content =
                          tags &&
                          tags.map((item) => (
                            <Tag color='blue' key={item}>
                              {item}
                            </Tag>
                          ));
                        return (
                          <>
                            <div>
                              <a style={{ padding: 0 }} onClick={() => history.push(`/alert-cur-events/${id}`)}>
                                {title}
                              </a>
                            </div>
                            <div>
                              <span className='event-tags'>{content}</span>
                            </div>
                          </>
                        );
                      },
                    },
                    {
                      title: t('trigger_time'),
                      dataIndex: 'trigger_time',
                      width: 90,
                      render(value) {
                        return moment(value * 1000).format('YYYY-MM-DD HH:mm:ss');
                      },
                    },
                  ]}
                  pagination={false}
                  dataSource={alertEvents?.events}
                />
              </Col>
            </Row>
          </Skeleton>
        </Card>
        <Row gutter={16} className='home-page-box' style={{ marginRight: '-6px' }}>
          {/* 机器 */}
          <Col span={8}>
            <Card
              title={t('host')}
              size='small'
              bordered={false}
              extra={
                <Link to={{ pathname: '/targets-install' }}>
                  <Space>
                    <PlusOutlined />
                    {t('deployment')}
                  </Space>
                </Link>
              }
            >
              <Skeleton active loading={hostLoading} paragraph={{ rows: 5 }}>
                <div className='card-body-box' style={{ justifyContent: 'center' }}>
                  <Row className='card-body-box-summary'>
                    <Col span={12} className='total-box'>
                      <Link to={{ pathname: '/targets' }} className='total-box'>
                        <div className='total-num'>{host.all?.total}</div>
                        {t('monitoring_host_num')}
                      </Link>
                    </Col>
                    <Col span={12} className='abnormal-box'>
                      <Link to={{ pathname: '/targets' }} className='total-box'>
                        <div className='abnormal-num'>{host.all?.abnormal}</div>
                        {t('abnormal_num')}
                      </Link>
                    </Col>
                  </Row>
                </div>
              </Skeleton>
            </Card>
          </Col>
          {/* 采集 */}
          <Col span={8}>
            <Card
              title={t('collection')}
              size='small'
              bordered={false}
              extra={
                <Link to={{ pathname: '/targets' }}>
                  <Space>
                    <PlusOutlined />
                    {t('add_metrics')}
                  </Space>
                </Link>
              }
            >
              <Skeleton active loading={inputLoading} paragraph={{ rows: 5 }}>
                <div className='card-body-box'>
                  采集包含 指标采集 和 日志采集。 注意：一个采集任务指同一类数据在多台机器或服务实例上的数据采集。
                  <Row className='card-body-box-summary'>
                    <Col span={12} className='total-box'>
                      <Link to={{ pathname: '/metric/input-task' }} className='total-box'>
                        <div className='total-num'>{input?.input_total}</div>
                        {t('metrics_num')}
                      </Link>
                    </Col>
                    <Col span={12} className='total-box'>
                      <Link to={{ pathname: '/log/collection' }} className='total-box'>
                        <div className='total-num'>{input?.logs_task_total}</div>
                        {t('log_num')}
                      </Link>
                    </Col>
                  </Row>
                </div>
              </Skeleton>
            </Card>
          </Col>
          {/* 展示板 */}
          <Col span={8}>
            <Card title='平台黑板报' size='small' bordered={false}>
              <List
                size='small'
                dataSource={list}
                renderItem={(item) => (
                  <List.Item
                    onClick={() => {
                      setMarkdownVisible(true);
                      setMarkdownContent(item.content);
                    }}
                  >
                    {item.title}
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          {/* 容器 */}
          <Col span={8}>
            <Card
              title={t('container')}
              size='small'
              bordered={false}
              extra={
                <Space>
                  <EmptyDatasourcePopover datasourceList={groupedDatasourceList?.prometheus} isTriggerNode={true}>
                    {t('common:datasource.id')}:{' '}
                    <Select
                      size='small'
                      style={{ minWidth: 70 }}
                      dropdownMatchSelectWidth={false}
                      value={container?.dataSourceValue}
                      onChange={handleContainer}
                      showSearch
                      optionFilterProp='children'
                    >
                      {_.map(groupedDatasourceList?.prometheus, (item) => (
                        <Select.Option value={item.id} key={item.id}>
                          {item.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </EmptyDatasourcePopover>
                  <a onClick={() => setVisible(true)}>
                    <Space>
                      <PlusOutlined />
                      {t('container_configuration')}
                    </Space>
                  </a>
                </Space>
              }
            >
              <Skeleton active loading={containerLoading} paragraph={{ rows: 5 }}>
                <div className='card-body-box'>
                  支持对K8S/Docker容器本身，以及容器内业务系统的各类指标和运行日志进行监控。
                  <Row className='card-body-box-summary'>
                    <Col span={12}>
                      <div className='total-box cursor-style' onClick={jumpDashboard}>
                        <div className='total-num'>{container?.data.summary?.total}</div>
                        {t('container_num')}
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className='abnormal-box' onClick={jumpDashboard}>
                        <div className='abnormal-num'>{container?.data.summary?.abnormal}</div>
                        {t('abnormal_num')}
                      </div>
                    </Col>
                  </Row>
                </div>
              </Skeleton>
            </Card>
          </Col>
          {/* 拨测 */}
          <Col span={8}>
            <Card
              title={t('dial')}
              size='small'
              bordered={false}
              extra={
                <Space>
                  <EmptyDatasourcePopover datasourceList={groupedDatasourceList?.prometheus} isTriggerNode={true}>
                    {t('common:datasource.id')}:{' '}
                    <Select
                      size='small'
                      style={{ minWidth: 70 }}
                      dropdownMatchSelectWidth={false}
                      value={dial?.dataSourceValue}
                      onChange={handleDial}
                      showSearch
                      optionFilterProp='children'
                    >
                      {_.map(groupedDatasourceList?.prometheus, (item) => (
                        <Select.Option value={item.id} key={item.id}>
                          {item.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </EmptyDatasourcePopover>
                  <Link to={{ pathname: 'dial/task/add', search: `bgid=${curBusiId}` }}>
                    <Space>
                      <PlusOutlined />
                      {t('add_dial_task')}
                    </Space>
                  </Link>
                </Space>
              }
            >
              <Skeleton active loading={dialLoading} paragraph={{ rows: 5 }}>
                <div className='card-body-box'>
                  网络拨测支持HTTP/TCP/ICMP/WEBSOCKET等常见协议从指定位置发起的主动探测。
                  <Row className='card-body-box-summary'>
                    <Col span={12}>
                      <Link to={{ pathname: '/dial-task' }} className='total-box'>
                        <div className='total-num'>{dial?.data?.total}</div>
                        {t('dial_task_num')}
                      </Link>
                    </Col>
                    <Col span={12}>
                      <Link to={{ pathname: '/dial-task' }} className='abnormal-box'>
                        <div className='abnormal-num'>{dial?.data?.abnormal}</div>
                        {t('abnormal_num')}
                      </Link>
                    </Col>
                  </Row>
                </div>
              </Skeleton>
            </Card>
          </Col>
          {/* 监控 */}
          <Col span={8}>
            <Card
              title={t('monitoring')}
              size='small'
              bordered={false}
              extra={
                <Link to={{ pathname: `alert-rules/add/${curBusiId}`, search: `bgid=${curBusiId}` }}>
                  <Space>
                    <PlusOutlined />
                    {t('add_alarm_rule')}
                  </Space>
                </Link>
              }
            >
              <Skeleton active loading={ruleLoading} paragraph={{ rows: 5 }}>
                <div className='card-body-box'>
                  对采集的数据，根据规则进行计算，并按计算结果进行异常告警。
                  <Link
                    to={{ pathname: '/alert-rules', search: 'disabled=0' }}
                    className='total-box card-body-box-summary'
                  >
                    <div className='total-num'>{alertRule?.total}</div>
                    {t('alarm_rule_num')}
                  </Link>
                </div>
              </Skeleton>
            </Card>
          </Col>
        </Row>
        <Card
          title={t('logs')}
          size='small'
          bordered={false}
          extra={
            <EmptyDatasourcePopover datasourceList={groupedDatasourceList?.elasticsearch} isTriggerNode={true}>
              {t('common:datasource.id')}:{' '}
              <Select
                size='small'
                style={{ minWidth: 70 }}
                dropdownMatchSelectWidth={false}
                value={logs?.dataSourceValue}
                onChange={(val) => handleLogs(val)}
                showSearch
                optionFilterProp='children'
              >
                {_.map(groupedDatasourceList?.elasticsearch, (item) => (
                  <Select.Option value={item.id} key={item.id}>
                    {item.name}
                  </Select.Option>
                ))}
              </Select>
            </EmptyDatasourcePopover>
          }
        >
          <Skeleton active loading={logLoading}>
            {logs?.data?.length ? (
              <>
                <div>{t('log_rate')}</div>
                <Row gutter={16}>
                  {logs.level?.map((item, index) => (
                    <Col key={item.key}>
                      {item.key}
                      <div style={{ color: logConfig.color[index] }} className='chart-info'>
                        {item.doc_count > 1000 ? `${(item.doc_count / 1000).toFixed(2)} k` : item.doc_count}
                      </div>
                    </Col>
                  ))}
                </Row>
                <Column {...logConfig} data={[...logs.data]} height={300} style={{ padding: '26px' }} />
              </>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Skeleton>
        </Card>
        <Card
          title={t('services')}
          size='small'
          bordered={false}
          extra={
            <EmptyDatasourcePopover datasourceList={groupedDatasourceList?.elasticsearch} isTriggerNode={true}>
              {t('common:datasource.id')}:{' '}
              <Select
                size='small'
                style={{ minWidth: 70 }}
                dropdownMatchSelectWidth={false}
                value={services?.dataSourceValue}
                onChange={(val) => handleServices(val)}
                showSearch
                optionFilterProp='children'
              >
                {_.map(groupedDatasourceList?.elasticsearch, (item) => (
                  <Select.Option value={item.id} key={item.id}>
                    {item.name}
                  </Select.Option>
                ))}
              </Select>
            </EmptyDatasourcePopover>
          }
        >
          <Skeleton active loading={servicesLoading}>
            {services?.data?.length ? (
              <>
                <Row gutter={16}>
                  <Col>
                    {t('service')}
                    <div className='chart-info'>
                      {services.servicesNum > 1000
                        ? `${(services.servicesNum / 1000).toFixed(2)} k`
                        : services.servicesNum}
                    </div>
                  </Col>
                  <Col>
                    {t('throughput')}
                    <div className='chart-info' style={{ color: '#4294f2' }}>
                      {services.throughput > 1000
                        ? `${(services.throughput / 1000).toFixed(2)} k tpm`
                        : services.throughput}
                    </div>
                  </Col>
                  {services.outcomes?.map((item) => (
                    <Col>
                      {t(item.key)}
                      <div className='chart-info' style={{ color: item.key === 'success' ? '#009a95' : '#d34b5a' }}>
                        {item.doc_count > 1000 ? `${(item.doc_count / 1000).toFixed(2)} k` : item.doc_count}
                      </div>
                    </Col>
                  ))}
                </Row>
                <Column {...servicesConfig} data={services.data} height={300} style={{ padding: '26px' }} />
              </>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Skeleton>
        </Card>
      </div>
      <Modal
        width={600}
        visible={visible}
        title={t('container_configuration')}
        footer={[
          <Button key='submit' type='primary' onClick={() => setVisible(false)}>
            {t('common:btn.know')}
          </Button>,
        ]}
        onCancel={() => setVisible(false)}
      >
        <Typography.Paragraph>要对容器进行监控，分作两步：</Typography.Paragraph>
        <Typography.Paragraph>
          <ul>
            <li>
              <Typography.Text>安装采集器，K8S通过部署daemonSet，Docker则在宿主机上直接安装。</Typography.Text>
            </li>
            <li>
              <Typography.Text>对容器设置annotation(针对k8s)或label(针对Docker)，定义采集任务，例如：</Typography.Text>
            </li>
          </ul>
        </Typography.Paragraph>
        {/* <a
          onClick={() => copyToClipBoard(CONTAINER_SETTINGS_VALUE, t)}
          style={{ display: 'block', textAlign: 'right' }}
        >
          <CopyOutlined />
          {t('common:btn.copy')}
        </a> */}
        <Typography.Paragraph>
          <pre>{CONTAINER_SETTINGS_VALUE}</pre>
        </Typography.Paragraph>
      </Modal>
      <Modal
        width={800}
        visible={markdownVisible}
        title='详情'
        footer={[
          <Button key='submit' type='primary' onClick={() => setMarkdownVisible(false)}>
            {t('common:btn.know')}
          </Button>,
        ]}
        onCancel={() => setMarkdownVisible(false)}
      >
        <Markdown content={markdownContent}></Markdown>
      </Modal>
    </PageLayout>
  );
};

export default HomePage;
