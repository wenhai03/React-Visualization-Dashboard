import React, { useEffect, useState, useContext } from 'react';
import { Modal, Table } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import { flattenHits } from '@/pages/logs/utils';
import { parseDuration } from '@/pages/alertRules/Form/Rule/Rule/utils';
import { searchAlertLog } from '@/services/warning';
import '@/pages/explorer/index.less';

// 日志告警和APM告警的日志详情
export default function LogDetail({ visible, onCancel, detail }) {
  const { t } = useTranslation('AlertCurEvents');
  const { ESIndex } = useContext(CommonStateContext);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>([]);
  const { rule_config, datasource_id: data_id, group_id, trigger_time, rule_prod } = detail;
  const logFilterString = detail.tags.filter((item) => item.startsWith('__log_filter__='))[0];
  const logFilter = logFilterString?.split('=')[1];
  // 具体触发了那一条告警条件
  const query_num = logFilter ? JSON.parse(logFilter)?.query_num : 0;
  const params = rule_config.queries[query_num || 0];
  // 触发告警的分组依据条件
  const group = logFilter ? JSON.parse(logFilter)?.group : {};
  const groupFilter = Object.entries(group ?? {}).map(([key, value]) => ({
    term: { [key]: value },
  }));

  useEffect(() => {
    if (visible) {
      setLoading(true);
      // 获取触发告警的时间条件
      const time = `${params.rule.search_time.size}${params.rule.search_time.unit}`;
      const parseTime = parseDuration(time);
      const requestBody: any = {
        busi_group_id: group_id,
        datasource_id: data_id,
        query: {
          type: params.type,
        },
        start: trigger_time * 1000 - parseTime,
        end: trigger_time * 1000,
        size: 500,
      };
      if (rule_prod === 'log') {
        // 日志告警
        if (params.type === 'elastic_dsl') {
          requestBody.query.rule = {
            index: params.rule.index,
            dsl: params.rule.dsl,
            time_field: params.rule.time_field,
          };

          searchAlertLog(requestBody).then((res) => {
            const result = _.get(res, 'dat.hits.hits');
            const { docs } = flattenHits(result);
            setData(docs);
            setLoading(false);
          });
        } else if (params.type === 'elastic_log') {
          requestBody.query.rule = {
            index: params.rule.index,
            check_value: params.rule.check_value,
            search_time: params.rule.search_time,
            comparators: params.rule.comparators,
            aggregation: params.rule.aggregation,
            time_field: params.rule.time_field,
          };
          requestBody.LogFilter = groupFilter;

          searchAlertLog(requestBody).then((res) => {
            const result = _.get(res, 'dat.hits.hits');
            const { docs } = flattenHits(result);
            setData(docs);
            setLoading(false);
          });
        }
        // TODO 后续日志跳转链接
        // else if (params.type === 'elastic_index') {
        //   requestBody.query.rule = {
        //     index: params.rule.index,
        //     aggregation_type: params.rule.aggregation_type,
        //     aggregation_name: params.rule.aggregation_name,
        //     search_time: params.rule.search_time,
        //     group: params.rule.group,
        //     time_field: params.rule.time_field,
        //     interval: params.interval,
        //   };

        //   searchAlertLog(requestBody).then((res) => {
        //     const result = _.get(res, 'dat.hits.hits');
        //     const { docs } = flattenHits(result);
        //     setData(docs);
        //     setLoading(false);
        //   });
        // }
      } else if (rule_prod === 'apm') {
        // APM告警
        requestBody.query.rule = {
          service_name: params.rule.service_name,
          service_environment: params.rule.service_environment,
          transaction_type: params.rule.transaction_type,
          transaction_name: params.rule.transaction_name,
          url_path: params.rule.url_path,
        };
        if (params.type === 'apm_latency') {
          requestBody.query.rule.get_value_type = params.rule.get_value_type;
        }
        if (params.type === 'apm_error') {
          requestBody.query.rule.excludes = params.rule.excludes;
        }

        searchAlertLog(requestBody).then((res) => {
          const result = _.get(res, 'dat.hits.hits');
          const { docs } = flattenHits(result);
          setData(docs);
          setLoading(false);
        });
      }
    }
  }, [visible]);

  return (
    <Modal
      width={1200}
      visible={visible}
      title={t('detail.log_detail')}
      footer={null}
      onCancel={onCancel}
      getContainer={false}
    >
      <Table
        size='small'
        tableLayout='fixed'
        loading={loading}
        columns={[
          {
            title: '@timestamp',
            dataIndex: '_source',
            width: 200,
            render: (val) => {
              return moment(val['@timestamp'], moment.ISO_8601).format('YYYY-MM-DD HH:mm:ss.SSS');
            },
            sorter: (a, b) =>
              moment(a['_source']['@timestamp']).valueOf() - moment(b['_source']['@timestamp']).valueOf(),
          },
          {
            title: t('detail.doc'),
            dataIndex: '_source',
            render(text) {
              return (
                <dl className='es-discover-logs-row'>
                  {_.map(text, (val, key) => {
                    const value = _.isArray(val) ? _.join(val, ',') : val;
                    return (
                      <React.Fragment key={key}>
                        <dt>{key}:</dt> <dd>{value}</dd>
                      </React.Fragment>
                    );
                  })}
                </dl>
              );
            },
          },
        ]}
        dataSource={data}
        scroll={{ y: 'calc(100vh - 400px)' }}
      />
    </Modal>
  );
}
