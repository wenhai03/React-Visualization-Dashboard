import _ from 'lodash';
// @ts-ignore
import { advancedCates, envCateMap } from 'plus:/constants';

export interface Cate {
  value: string;
  label: string;
  type: string;
  cateOption: boolean;
  alertRule: boolean;
  dashboard: boolean;
  graphPro: boolean;
  alertPro: boolean;
}

export const baseCates: Cate[] = [
  {
    value: 'prometheus',
    label: 'Prometheus',
    type: 'metric',
    cateOption: true,
    alertRule: true,
    dashboard: true,
    graphPro: false,
    alertPro: false,
  },
  {
    value: 'prometheus',
    label: 'Prometheus',
    type: 'dial',
    cateOption: false,
    alertRule: true,
    dashboard: false,
    graphPro: false,
    alertPro: false,
  },
  {
    value: 'elasticsearch',
    label: 'Elasticsearch',
    cateOption: true,
    type: 'log',
    alertRule: true,
    dashboard: true,
    graphPro: false,
    alertPro: true,
  },
  {
    value: 'elasticsearch',
    label: 'Elasticsearch',
    cateOption: false,
    type: 'apm',
    alertRule: true,
    dashboard: false,
    graphPro: false,
    alertPro: true,
  },
  {
    value: 'elasticsearch',
    label: 'Elasticsearch',
    cateOption: false,
    type: 'logging',
    alertRule: true,
    dashboard: false,
    graphPro: false,
    alertPro: true,
  },
];

export const getAuthorizedDatasourceCates = () => {
  const datasourceCates = [...baseCates];
  _.forEach(import.meta.env, (value, key) => {
    if (_.endsWith(key, '_DS') && value === 'true') {
      const cate = envCateMap[key];
      if (cate) {
        const finded = _.find(advancedCates, { value: cate });
        if (finded) {
          datasourceCates.push(finded);
        }
      }
    }
  });
  return datasourceCates;
};
