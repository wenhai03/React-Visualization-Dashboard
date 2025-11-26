import _ from 'lodash';

const formatToTable = (series: any[], rowBy: string[], colBy: string) => {
  const rowByLen = rowBy.length;
  const rows = _.groupBy(series, (item) => {
    let groupkeys = '';
    _.forEach(rowBy, (key) => {
      groupkeys += item.fields[key];
    });
    return groupkeys;
  });
  const newSeries = _.map(rows, (val, key) => {
    const item: any = {
      id: _.uniqueId('series_'),
    };
    _.forEach(rowBy, (key) => {
      item[key] = val?.[0]?.fields?.[key];
    });
    const subGrouped = _.groupBy(val, (item) => {
      return colBy === 'refId' ? item.fields[colBy] : item.metric.__name__;
    });
    _.forEach(subGrouped, (subVal, subKey) => {
      // rowByLen 为 0 时，计算所有元素的 stat 总和
      let totalStat = _.sumBy(subVal, 'stat');
      // 表示不需要分组聚合，直接取第一个元素的值
      if (rowByLen) {
        totalStat = subVal[0].stat;
        // 特殊情况，当 rowBy 只包含 __name__ 时，计算所有元素的 stat 总和
        if (rowByLen === 1 && rowBy[0] === '__name__') {
          totalStat = _.sumBy(subVal, 'stat');
        }
      }
      item[subKey] = {
        name: subVal[0].name,
        id: subVal[0].id,
        stat: totalStat,
        color: subVal[0].color,
        text: subVal[0].text,
      };
    });
    item.groupNames = _.keys(subGrouped);
    return item;
  });
  return newSeries;
};

export default formatToTable;
