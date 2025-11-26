import React from 'react';
import _ from 'lodash';

const queriesValuesIdToName = (queries, datasourceList, busiGroups) => {
  return _.map(queries, (query) => {
    if (query?.key === 'group_ids') {
      const values = _.map(query?.values, (value) => {
        const group = _.find(busiGroups, { id: value });
        return group?.name;
      });
      return { ...query, values };
    }
    if (query?.key === 'datasource_ids') {
      const values = _.map(query?.values, (value) => {
        const host = _.find(datasourceList, { id: value });
        return host?.name;
      });
      return { ...query, values };
    }
    return query;
  });
};

export default function HostDetail(t, commonState) {
  const { busiGroups, datasourceList } = commonState;
  return [
    {
      label: t('common:host.query.title'),
      key: 'rule_config',
      render(val) {
        const queries = queriesValuesIdToName(val.queries, datasourceList, busiGroups);
        return _.map(queries, (query) => {
          if (query?.key === 'all_hosts') return <div key={query.key}>{t(`common:host.query.key.${query?.key}`)}</div>;
          return (
            <div key={query.key}>
              {t(`common:host.query.key.${query?.key}`)} {query?.op} {_.join(query?.values, ',')}
            </div>
          );
        });
      },
    },
    {
      label: t('common:host.trigger.title'),
      key: 'rule_config',
      render(val) {
        const { triggers } = val;
        return (
          <div>
            {_.map(triggers, (trigger) => {
              const type = trigger?.type;
              return (
                <div key={type}>
                  {t(`common:host.trigger.key.${type}`)}
                  <span> {t('common:host.trigger.than')} </span>
                  <span>{trigger?.duration} </span>
                  <span>
                    {type === 'pct_target_miss'
                      ? t('common:host.trigger.pct_target_miss_text')
                      : type === 'offset'
                      ? t('common:host.trigger.millisecond')
                      : t('common:host.trigger.second')}
                  </span>
                  {type === 'pct_target_miss' && trigger.percent}, {t('detail.host.trigger')}{' '}
                  {t(`common:severity.${trigger?.severity}`)}
                </div>
              );
            })}
          </div>
        );
      },
    },
  ];
}
