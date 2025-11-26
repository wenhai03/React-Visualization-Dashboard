import React, { useContext, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import moment from 'moment';
import _ from 'lodash';
import queryString from 'query-string';
import { Button, Card, message, Space, Spin, Tag, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { getAlertEventsById, getHistoryEventsById } from '@/services/warning';
import { priorityColor } from '@/utils/constant';
import { deleteAlertEventsModal } from '.';
import { parseValues } from '@/pages/alertRules/utils';
import { CommonStateContext } from '@/App';
// @ts-ignore
import plusEventDetail from 'plus:/parcels/Event/eventDetail';
// @ts-ignore
import PlusPreview from 'plus:/parcels/Event/Preview';
// @ts-ignore
import PlusLogsDetail from 'plus:/parcels/Event/LogsDetail';
import PrometheusDetail from './Detail/Prometheus';
import Host from './Detail/Host';
import LogModal from './Detail/Log';
import './detail.less';

const EventDetailPage: React.FC = () => {
  const { t } = useTranslation('AlertCurEvents');
  const [countdown, setCountdown] = useState(0);
  const { busiId, eventId } = useParams<{ busiId: string; eventId: string }>();
  const commonState = useContext(CommonStateContext);
  const { busiGroups, datasourceList, curBusiId } = commonState;
  const handleNavToWarningList = (id) => {
    if (busiGroups.find((item) => item.id === id)) {
      history.push(`/alert-rules?bgid=${id}`);
    } else {
      message.error(t('common:buisness_not_exist'));
    }
  };
  const handleNavToWarningEdit = (ruleId, groupId) => {
    if (busiGroups.find((item) => item.id === groupId)) {
      window.open(`/alert-rules/edit/${ruleId}?bgid=${groupId}`, '_blank');
    } else {
      message.error(t('common:no_permission'));
    }
  };
  const history = useHistory();
  const isHistory = history.location.pathname.includes('alert-his-events');
  const [eventDetail, setEventDetail] = useState<any>();
  const [visible, setVisible] = useState(false);
  if (eventDetail) eventDetail.cate = eventDetail.cate || 'prometheus'; // TODO: 兼容历史的告警事件
  const parsedEventDetail = parseValues(eventDetail);
  const descriptionInfo = [
    {
      label: t('detail.rule_name'),
      key: 'rule_name',
      render(content, { rule_id, group_id, subscribe_id, subscriber_name }) {
        if (!_.includes(['firemap', 'northstar'], eventDetail?.rule_prod)) {
          return subscribe_id !== 0 ? (
            <>
              {content}
              <Button
                size='small'
                type='link'
                className='rule-link-btn'
                onClick={() => window.open(`/alert-subscribes/edit/${subscribe_id}?bgid=${group_id}`, '_blank')}
              >
                <span style={{ color: 'orange' }}>{` (${t('subscribe')}：${subscriber_name})`}</span>
              </Button>
            </>
          ) : (
            <Button
              size='small'
              type='link'
              className='rule-link-btn'
              onClick={() => handleNavToWarningEdit(rule_id, group_id)}
            >
              {content}
            </Button>
          );
        }
        return content;
      },
    },
    ...(!_.includes(['firemap', 'northstar'], eventDetail?.rule_prod)
      ? [
          {
            label: t('detail.group_name'),
            key: 'group_name',
            render(content, { group_id }) {
              return (
                <Button
                  size='small'
                  type='link'
                  className='rule-link-btn'
                  onClick={() => handleNavToWarningList(group_id)}
                >
                  {content}
                </Button>
              );
            },
          },
        ]
      : [
          {
            label: t('detail.detail_url'),
            key: 'rule_config',
            render(val) {
              const detail_url = _.get(val, 'detail_url');
              return (
                <a href={detail_url} target='_blank'>
                  {detail_url}
                </a>
              );
            },
          },
        ]),
    { label: t('detail.rule_note'), key: 'rule_note' },
    {
      label: t('detail.severity'),
      key: 'severity',
      render: (severity) => {
        return <Tag color={priorityColor[severity - 1]}>S{severity}</Tag>;
      },
    },
    {
      label: t('detail.is_recovered'),
      key: 'is_recovered',
      render(isRecovered) {
        return <Tag color={isRecovered ? 'green' : 'red'}>{isRecovered ? 'Recovered' : 'Triggered'}</Tag>;
      },
    },
    {
      label: t('detail.tags'),
      key: 'tags',
      render(tags) {
        return tags
          ? tags.map((tag) => (
              <Tag color='blue' key={tag}>
                {tag}
              </Tag>
            ))
          : '';
      },
    },
    ...(eventDetail?.annotations
      ? [
          {
            label: t('detail.annotations'),
            key: 'annotations',
            render(values) {
              return Object.entries(values).map(([key, value]) => (
                <Tag color='green' key={`${key}_${value}`}>
                  {key}={value}
                </Tag>
              ));
            },
          },
        ]
      : []),
    ...(!_.includes(['firemap', 'northstar'], eventDetail?.rule_prod)
      ? [{ label: t('detail.target_note'), key: 'target_note' }]
      : [false]),
    {
      label: t('detail.first_trigger_time'),
      key: 'first_trigger_time',
      render(time) {
        return moment(time * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      label: t('detail.trigger_time'),
      key: 'trigger_time',
      render(time) {
        return moment(time * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    ...(eventDetail?.is_recovered
      ? []
      : [
          {
            label: t('detail.trigger_value'),
            key: 'trigger_value',
            render(val) {
              return (
                <span>
                  {val}
                  <PlusLogsDetail data={eventDetail} />
                </span>
              );
            },
          },
        ]),
    {
      label: t('detail.recover_time'),
      key: 'recover_time',
      render(time) {
        return moment((time || 0) * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    // {
    //   label: t('detail.rule_algo'),
    //   key: 'rule_algo',
    //   render(text) {
    //     if (text) {
    //       return t('detail.rule_algo_anomaly');
    //     }
    //     return t('detail.rule_algo_threshold');
    //   },
    // },
    {
      label: t('detail.rule_prod'),
      key: 'rule_prod',
    },
    ...(eventDetail?.cate === 'elasticsearch' && !eventDetail?.is_recovered
      ? [
          {
            label: t('detail.log_detail'),
            key: 'rule_config',
            render(val) {
              return (
                <>
                  <Button
                    size='small'
                    onClick={() => {
                      // 跳转指定页面
                      if (eventDetail?.rule_prod === 'apm' || eventDetail?.rule_prod === 'log') {
                        // 具体触发了那一条告警条件
                        const logFilterString = eventDetail.tags.filter((item) =>
                          item.startsWith('__log_filter__='),
                        )[0];
                        const logFilter = logFilterString?.split('=')[1];
                        const query_num = logFilter ? JSON.parse(logFilter)?.query_num : 0;
                        const rule_config_current = eventDetail.rule_config.queries[query_num || 0];
                        if (['apm_error', 'apm_failed', 'apm_latency'].includes(rule_config_current.type)) {
                          // 跳转服务跟踪
                          history.push(`/service-tracking?id=${eventDetail.id}`);
                        } else {
                          // 跳转日志查询
                          window.open(`/log/explorer?id=${eventDetail.id}`);
                        }
                      }
                    }}
                  >
                    {eventDetail?.rule_prod === 'apm' ? t('detail.view_trace') : t('detail.view_log')}
                  </Button>
                </>
              );
            },
          },
        ]
      : [false]),
    {
      label: t('detail.cate'),
      key: 'cate',
    },
    ...(!_.includes(['firemap', 'northstar'], eventDetail?.rule_prod)
      ? [
          {
            label: t('detail.datasource_id'),
            key: 'datasource_id',
            render(content) {
              return _.find(datasourceList, (item) => item.id === content)?.name;
            },
          },
        ]
      : [false]),
    ...(eventDetail?.cate === 'prometheus'
      ? PrometheusDetail({
          eventDetail,
          history,
          groupId: curBusiId,
        })
      : [false]),
    ...(eventDetail?.cate === 'host' ? Host(t, commonState) : [false]),
    ...(plusEventDetail(eventDetail?.cate, t) || []),
    {
      label: t('detail.prom_eval_interval'),
      key: 'prom_eval_interval',
      render(content) {
        return `${content} s`;
      },
    },
    {
      label: t('detail.prom_for_duration'),
      key: 'prom_for_duration',
      render(content) {
        return `${content} s`;
      },
    },
    {
      label: t('detail.notify_channels'),
      key: 'notify_channels',
      render(channels) {
        return channels.join(' ');
      },
    },
    {
      label: t('detail.notify_groups_obj'),
      key: 'notify_groups_obj',
      render(groups) {
        return groups ? groups.map((group) => <Tag color='blue'>{group.name}</Tag>) : '';
      },
    },
    {
      label: 'Hash',
      key: 'hash',
    },
    // {
    //   label: t('detail.callbacks'),
    //   key: 'callbacks',
    //   render(callbacks) {
    //     return callbacks
    //       ? callbacks.map((callback) => (
    //           <Tag>
    //             <Paragraph copyable style={{ margin: 0 }}>
    //               {callback}
    //             </Paragraph>
    //           </Tag>
    //         ))
    //       : '';
    //   },
    // },
  ];

  useEffect(() => {
    if (isHistory) {
      getHistoryEventsById(eventId).then((res) => {
        setEventDetail(res.dat);
      });
    } else {
      getAlertEventsById(eventId)
        .then((res) => {
          if (res.dat == 'No such active event') {
            setCountdown(3);
            // 开始倒计时
            const interval = setInterval(() => {
              setCountdown((count) => {
                if (count <= 1) {
                  clearInterval(interval);
                  window.location.href = `/alert-his-events/${eventId}`;
                  return 0;
                }
                return count - 1;
              });
            }, 1000);
          } else {
            setEventDetail(res.dat);
          }
        })
        .catch((err) => {
          setEventDetail(undefined);
        });
    }
  }, [busiId, eventId]);

  return (
    <PageLayout title={t('detail.title')} showBack backPath='/alert-his-events'>
      <div className='event-detail-container'>
        {countdown ? (
          <Result title={t('detail.anti_alarm', { countdown })} />
        ) : (
          <Spin spinning={!eventDetail}>
            <Card
              size='small'
              className='desc-container'
              title={t('detail.card_title')}
              actions={
                eventDetail?.group_obj.perm === 'rw'
                  ? [
                      <div className='action-btns'>
                        <Space>
                          <Button
                            type='primary'
                            onClick={() => {
                              history.push({
                                pathname: '/alert-mutes/add',
                                search: queryString.stringify({
                                  bgid: eventDetail.group_id,
                                  prod: eventDetail.rule_prod,
                                  cate: eventDetail.cate,
                                  datasource_ids: [eventDetail.datasource_id],
                                  tags: eventDetail.tags,
                                }),
                              });
                            }}
                          >
                            {t('shield')}
                          </Button>
                          {!isHistory && (
                            <Button
                              danger
                              onClick={() => {
                                if (eventDetail.group_id) {
                                  deleteAlertEventsModal(
                                    [Number(eventId)],
                                    () => {
                                      history.replace('/alert-cur-events');
                                    },
                                    t,
                                  );
                                } else {
                                  message.warn('该告警未返回业务组ID');
                                }
                              }}
                            >
                              {t('common:btn.delete')}
                            </Button>
                          )}
                        </Space>
                      </div>,
                    ]
                  : undefined
              }
            >
              {eventDetail && (
                <div>
                  <PlusPreview data={parsedEventDetail} />
                  {descriptionInfo
                    .filter((item: any) => {
                      if (!item) return false;
                      return parsedEventDetail.is_recovered ? true : item.key !== 'recover_time';
                    })
                    .map(({ label, key, render }: any, i) => {
                      return (
                        <div className='desc-row' key={key + i}>
                          <div className='desc-label'>{label}：</div>
                          <div className='desc-content'>
                            {render ? render(parsedEventDetail[key], parsedEventDetail) : parsedEventDetail[key]}
                          </div>
                        </div>
                      );
                    })}
                  {eventDetail.cate === 'elasticsearch' && (
                    <LogModal detail={eventDetail} visible={visible} onCancel={() => setVisible(false)} />
                  )}
                </div>
              )}
            </Card>
          </Spin>
        )}
      </div>
    </PageLayout>
  );
};

export default EventDetailPage;
