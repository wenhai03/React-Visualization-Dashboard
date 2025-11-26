import _ from 'lodash';
import moment from 'moment';

// 获取机器列表默认自定义显示列
export const getDefaultColumnsConfigs = () => {
  return _.map(
    [
      'tags',
      'group_obj',
      'mem_util',
      'cpu_util',
      'offset',
      'cpu_num',
      'mem_total',
      'os',
      'arch',
      'kernel_version',
      'os_name',
      'os_version',
      'agent_version',
      'area_id',
      'unixtime',
      'remote_addr',
      'note',
    ],
    (item) => {
      return {
        name: item,
        // 以下默认不展示
        visible: ![
          'remote_addr', //来源 IP
          'os', // 操作系统
          'arch', // CPU架构
          'mem_total', // 总内存
          'kernel_version', // 内核版本
          'os_name', // 发行版名称
          'os_version', // 系统版本
          'area_id', // 区域
        ].includes(item),
      };
    },
  );
};

export const getTargetColumnsConfigs = () => {
  let defaultColumnsConfigs = getDefaultColumnsConfigs();
  const localColumnsConfigs = localStorage.getItem('targets_columns_configs');
  if (localColumnsConfigs) {
    try {
      defaultColumnsConfigs = _.map(defaultColumnsConfigs, (item) => {
        const localItem = _.find(JSON.parse(localColumnsConfigs), (i) => i.name === item.name);
        if (localItem) {
          item.visible = localItem.visible;
        }
        return item;
      });
    } catch (e) {
      console.error(e);
    }
  }
  return defaultColumnsConfigs;
};

export const setTargetColumnsConfigs = (columnsConfigs) => {
  localStorage.setItem('targets_columns_configs', JSON.stringify(columnsConfigs));
};

export const getDateDiffText = (timestamp: number) => {
  const now = Date.now();
  const diffInMilliseconds = now - timestamp;
  const duration = moment.duration(diffInMilliseconds);

  if (diffInMilliseconds < 1000) {
    return '刚刚';
  } else if (duration.asSeconds() < 60) {
    return `${duration.asSeconds().toFixed(0)}秒前`;
  } else if (duration.asMinutes() < 60) {
    return `${duration.asMinutes().toFixed(0)}分钟前`;
  } else if (duration.asHours() < 24) {
    return `${duration.asHours().toFixed(0)}小时前`;
  } else if (duration.asDays() < 30) {
    return `${duration.asDays().toFixed(0)}天前`;
  } else {
    return `${moment(timestamp).format('YYYY年M月D日 HH:mm:ss')}`;
  }
};

export const getDateText = (timestamp: number) => {
  return `${moment(timestamp).format('YYYY年M月D日 HH:mm:ss')}`;
};
