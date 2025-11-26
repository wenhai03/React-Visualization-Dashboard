// @ts-ignore
import { AdvancedDatasourceCateEnum } from 'plus:/types';
export const PAGE_SIZE = 15;
export const PAGE_SIZE_MAX = 100000;
export const PAGE_SIZE_OPTION = 20;
export const PAGE_SIZE_OPTION_LARGE = 150;
export const BASE_API_PREFIX = '/api/web';

export const randomColor = [
  'pink',
  'red',
  'yellow',
  'orange',
  'cyan',
  'green',
  'blue',
  'purple',
  'geekblue',
  'magenta',
  'volcano',
  'gold',
  'lime',
];

export const priorityColor = ['red', 'orange', 'blue'];
// 主题色
export const chartColor = [
  '#c23531',
  '#2f4554',
  '#61a0a8',
  '#d48265',
  '#91c7ae',
  '#749f83',
  '#ca8622',
  '#bda29a',
  '#6e7074',
  '#546570',
  '#c4ccd3',
];
export const METRICS = {
  TOTAL: 'total',
  ERROR: 'error',
  LATENCY: 'latency',
};

export const chartDefaultOptions = {
  color: chartColor,
  xAxis: { data: [] },
  yAxis: {},
  series: [],
  tooltip: {
    show: true,
    trigger: 'axis',
    textStyle: {
      fontSize: 12,
      lineHeight: 12,
    },
  },
  grid: {
    left: '2%',
    right: '1%',
    top: '20',
    bottom: '20',
  },
  legend: {
    lineStyle: {
      width: 1,
    },
  },
  animation: false,
};

enum BaseDatasourceCateEnum {
  prometheus = 'prometheus',
  elasticsearch = 'elasticsearch',
}

export const DatasourceCateEnum = { ...BaseDatasourceCateEnum, ...AdvancedDatasourceCateEnum };
export type DatasourceCateEnum = BaseDatasourceCateEnum | AdvancedDatasourceCateEnum;

// 包含业务组的路由（用于控制 Header 上 业务组展示）
export const containBusiGroups = {
  '/dashboards': 'rw',
  '/alert-rules': 'rw',
  '/alert-rules/add': 'ro',
  '/alert-mutes': 'rw',
  '/alert-subscribes': 'rw',
  '/alert-subscribes/add': 'ro',
  '/alert-mutes/add': 'ro',
  '/recording-rules': 'rw',
  '/recording-rules/add': 'ro',
  // '/job-tpls': 'rw',
  // '/job-tpls/add': 'ro',
  // '/job-tasks/add': 'ro',
  // '/job-tpls/add/task': 'ro',
  '/job-tasks': 'rw',
  // '/help/migrate': 'rw',
  '/targets': 'rw',
  '/targets/event': 'rw',
  '/targets-install': 'rw',
  '/metric/explorer': 'rw',
  '/metric/input-task/overview': 'rw',
  '/metric/input-task': 'rw',
  '/metric/input-task/operations': 'ro',
  '/object/explorer': 'rw',
  '/log/explorer': 'rw',
  '/c/cnd/erp/log': 'rw',
  '/log/stream': 'rw',
  '/dial-task': 'rw',
  '/dial-explorer': 'rw',
  // '/dial/node-management': 'rw',
  '/dial-task/add': 'ro',
  '/log/collection': 'rw',
  '/log/collection/add': 'ro',
  '/traces': 'rw',
  '/home': 'rw',
  '/dashboards-built-in': 'rw',
  '/share-chart-record': 'rw',
  '/alert-rules-built-in': 'rw',
  '/traces-setting': 'rw',
  '/traces-setting/add': 'ro',
  '/traces-setting/edit': 'ro',
  '/service-tracking': 'rw',
  '/service-tracking/transaction': 'ro',
  '/service-tracking/transaction/view': 'ro',
  '/service-tracking/error': 'ro',
  '/service-tracking/error/view': 'ro',
  '/alert-template': 'rw',
  '/log/es-template': 'rw',
  '/alert-his-events': 'rw',
  '/alert-cur-events': 'rw',
  '/service-map': 'rw',
};

export const containBusiGroupsStartWidth = {
  '/dashboards-built-in/': 'rw',
  '/alert-rules-built-in/': 'rw',
  '/alert-rules-built-in/add/': 'ro',
  '/log/collection/edit/': 'ro',
  // '/job-tpls/modify/': 'ro',
  // '/job-tpls/clone/': 'ro',
  // '/job-tpls/detail/': 'ro',
  '/alert-rules/brain/': 'ro',
  '/dial-task/edit/': 'ro',
  '/recording-rules/edit/': 'ro',
  '/alert-rules/edit/': 'ro',
  '/alert-mutes/edit/': 'ro',
  '/alert-subscribes/edit/': 'ro',
};

export const defaultColors = [
  '#0065D9', // 蓝色500
  '#009A95', // 青色500
  '#FFD11D', // 黄色500
  '#FF8030', // 橙色400
  '#E30018', // 红色500
  '#9E199D', // 洋红500
  '#8A52EB', // 紫色400
  '#D888D8', // 洋红200
  '#79D7D4', // 青色200
  '#87B3F0', // 蓝色200
  '#DAC6FA', // 紫色100
  '#FFBB90', // 橙色200
  '#F48A8F', // 红色200
  '#FFEB9B', // 黄色200
  '#B1EBE9', // 青色100
  '#BAD3F7', // 蓝色100
  '#ECB9EC', //洋红100
  '#FFD8C0', // 橙色100
  '#DEE1E8', // 蓝灰200
  '#BDC2CC', // 蓝灰300
];

// 日志高亮变量
export const highlightTags = {
  pre: '@cndinsight-highlighted-field@',
  post: '@/cndinsight-highlighted-field@',
};

// 用来替换高亮变量的标签
export const htmlTags = {
  pre: '<span class="log-highlight-mask">',
  post: '</span>',
};
