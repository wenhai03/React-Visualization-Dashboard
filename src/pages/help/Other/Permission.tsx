import React, { useEffect, useState, useContext } from 'react';
import _ from 'lodash';
import { Button, message, Switch, Tooltip, Row, Col, InputNumber, Space, Select, notification } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { CommonStateContext } from '@/App';
import {
  syncAllElastic,
  syncData,
  setConfigByKey,
  getConfigsBatch,
  syncCollectConfig,
  syncBuiltInKey,
} from '@/services/config';
import type { Datasource } from '@/App';
import { getDatasourceBriefList } from '@/services/common';

export default function PermissionSync() {
  const { t } = useTranslation('other');
  const { search } = useLocation();
  const { isInit } = queryString.parse(search);
  const { busiGroups, initBoot } = useContext(CommonStateContext);
  const [initialValues, setInitialValues] = useState<{
    chart_share_switch: boolean;
    maintenance_mode: boolean;
    verify_data_frequency: number;
    group_id: string;
    sync: string[];
    datasource_id?: number;
    network_auth_ip?: string[];
  }>({
    chart_share_switch: false,
    maintenance_mode: false,
    verify_data_frequency: 0,
    group_id: '',
    sync: [],
    network_auth_ip: [],
  });
  // 内置配置导入
  const [dataSelected, setDataSelected] = useState<string[]>([]);
  // ES 索引模板
  const [indexTplValues, setIndexTplValues] = useState({
    sync: ['es_index_tpl'],
    group_id: '',
    datasource_id: '',
  });
  // ES 索引模板数据源
  const [datasourceList, setDatasourceList] = useState<Datasource[]>([]);
  // 全局任务导入数据源
  const [importDatasourceList, setImportDatasourceList] = useState<Datasource[]>([]);
  const handleSync = () => {
    syncAllElastic().then((_) => {
      message.success(t('permission.success'));
    });
  };

  const handleDataSync = () => {
    syncData({ sync: dataSelected }).then((_) => {
      message.success(t('permission.success'));
    });
  };

  const handleBuiltInKeySync = () => {
    syncBuiltInKey().then((_) => {
      message.success(t('permission.success'));
    });
  };

  useEffect(() => {
    getConfigsBatch({ ckey: 'chart_share_switch,maintenance_mode,verify_data_frequency,network_auth_ip' }).then(
      (res) => {
        if (res.success) {
          setInitialValues({
            ...initialValues,
            chart_share_switch: res.dat.chart_share_switch === 'on' ? true : false,
            maintenance_mode: res.dat.maintenance_mode === 'on' ? true : false,
            verify_data_frequency: res.dat.verify_data_frequency === '' ? 0 : res.dat.verify_data_frequency,
            network_auth_ip: res.dat.network_auth_ip ? res.dat.network_auth_ip.split(',') : [],
          });
        }
      },
    );
  }, []);

  useEffect(() => {
    if (indexTplValues?.group_id) {
      getDatasourceBriefList().then((res) => {
        const list = res.filter((item) => item.plugin_type === 'elasticsearch');
        setDatasourceList(list);
      });
    }
  }, [indexTplValues?.group_id]);

  useEffect(() => {
    if (initialValues?.group_id && initialValues?.sync?.includes('log')) {
      getDatasourceBriefList().then((res) => {
        const list = res.filter((item) => item.plugin_type === 'elasticsearch');
        setImportDatasourceList(list);
      });
    }
  }, [JSON.stringify(initialValues)]);

  useEffect(() => {
    if (isInit === 'true' && initBoot?.ds_elasticsearch) {
      setInitialValues({
        ...initialValues,
        sync: ['log'],
      });
    }
  }, [isInit, initBoot]);

  return (
    <Row gutter={[0, 24]}>
      <Col span={24}>
        <span style={{ marginRight: '8px' }}>{t('permission.sync_label')}</span>
        <Button onClick={handleSync} type='primary' size='small'>
          {t('permission.sync')}
        </Button>
      </Col>
      <Col span={24}>
        <span style={{ marginRight: '8px' }}>
          {t('permission.built_in_sync')}{' '}
          <Tooltip title={t('permission.built_in_sync_tip')}>
            <QuestionCircleOutlined />
          </Tooltip>
        </span>
        <Button onClick={handleBuiltInKeySync} type='primary' size='small'>
          {t('permission.sync')}
        </Button>
      </Col>
      <Col span={24}>
        <span style={{ marginRight: '8px' }}>{t('permission.share_switch_label')}</span>
        <Switch
          checkedChildren={t('permission.on')}
          unCheckedChildren={t('permission.off')}
          checked={initialValues.chart_share_switch}
          onChange={(checked: boolean) => {
            setConfigByKey({ ckey: 'chart_share_switch', cval: checked ? 'on' : 'off' }).then(() => {
              setInitialValues({
                ...initialValues,
                chart_share_switch: checked,
              });
              message.success(t('common:success.save'));
            });
          }}
        />
      </Col>
      <Col span={24}>
        <span style={{ marginRight: '8px', verticalAlign: 'middle' }}>
          {t('permission.maintenance_mode')}{' '}
          <Tooltip title={t('permission.maintenance_mode_tip')}>
            <QuestionCircleOutlined />
          </Tooltip>
        </span>
        <Switch
          checkedChildren={t('permission.on')}
          unCheckedChildren={t('permission.off')}
          checked={initialValues.maintenance_mode}
          onChange={(checked: boolean) => {
            setConfigByKey({ ckey: 'maintenance_mode', cval: checked ? 'on' : 'off' }).then(() => {
              setInitialValues({
                ...initialValues,
                maintenance_mode: checked,
              });
              message.success(t('common:success.save'));
            });
          }}
        />
      </Col>
      <Col span={24}>
        <Space>
          <span>
            {t('permission.data_sync')}{' '}
            <Tooltip title={t('permission.data_sync_tip')}>
              <QuestionCircleOutlined />
            </Tooltip>
          </span>
          <Select
            mode='multiple'
            options={[
              {
                label: '内置仪表盘、内置告警规则',
                value: 'builtin_detail',
              },
              {
                label: 'APM配置项',
                value: 'apm_form',
              },
              {
                label: '采集器各部署脚本',
                value: 'agent_script',
              },
              {
                label: '采集器默认配置',
                value: 'agent_default',
              },
              {
                label: 'logstash 日志采集默认配置',
                value: 'logstash',
              },
              {
                label: 'vector 日志采集默认配置',
                value: 'vector',
              },
              {
                label: '时序指标-标签过滤配置',
                value: 'group_filter',
              },
              {
                label: '更新数据库表关联的用户id',
                value: 'user_id',
              },
            ]}
            allowClear
            style={{ minWidth: 180 }}
            onChange={(e) => setDataSelected(e)}
          />
          <Button disabled={!dataSelected.length} onClick={handleDataSync} type='primary'>
            {t('permission.sync')}
          </Button>
        </Space>
      </Col>
      <Space>
        <span>
          {t('permission.verify_data_frequency')}{' '}
          <Tooltip title={t('permission.verify_data_frequency_tip')}>
            <QuestionCircleOutlined />
          </Tooltip>
        </span>
        <InputNumber
          min={0}
          value={initialValues.verify_data_frequency}
          addonAfter='分钟'
          precision={0}
          onChange={(e: any) =>
            setInitialValues({
              ...initialValues,
              verify_data_frequency: e,
            })
          }
        />
        <Button
          type='primary'
          disabled={!initialValues.verify_data_frequency && initialValues.verify_data_frequency !== 0}
          onClick={() => {
            setConfigByKey({
              ckey: 'verify_data_frequency',
              cval: initialValues.verify_data_frequency.toString(),
            }).then(() => {
              message.success(t('common:success.save'));
            });
          }}
        >
          {t('common:btn.save')}
        </Button>
      </Space>
      <Col span={24} className='init-boot collect-config-sync'>
        <Space>
          <span>
            {t('permission.collect_config_sync')}{' '}
            <Tooltip title={t('permission.collect_config_sync_tip')}>
              <QuestionCircleOutlined />
            </Tooltip>
          </span>
          <Select
            showSearch
            optionFilterProp='label'
            value={initialValues.group_id}
            style={{ width: 180 }}
            onChange={(value) =>
              setInitialValues({
                ...initialValues,
                group_id: value,
              })
            }
            options={busiGroups
              .filter((item: any) => item.extra?.super)
              .map((ele) => ({ label: ele.name, value: ele.id }))}
          />
          <Select
            value={initialValues.sync}
            style={{ width: 325 }}
            mode='multiple'
            onChange={(value) =>
              setInitialValues({
                ...initialValues,
                sync: value,
              })
            }
            options={[
              {
                label: t('permission.metrics'),
                value: 'metrics',
              },
              {
                label: t('permission.log'),
                value: 'log',
              },
            ]}
          />
          {initialValues.sync.includes('log') && (
            <Select
              value={initialValues.datasource_id}
              style={{ width: 200 }}
              onChange={(value) =>
                setInitialValues({
                  ...initialValues,
                  datasource_id: value,
                })
              }
              options={importDatasourceList.map((ele) => ({
                label: ele.name,
                value: ele.id,
              }))}
            />
          )}

          <Button
            type='primary'
            disabled={
              initialValues.group_id === '' ||
              !Boolean(initialValues.sync.length) ||
              (initialValues.sync.includes('log') && !initialValues.datasource_id)
            }
            onClick={() => {
              syncCollectConfig({
                group_id: initialValues.group_id,
                sync: initialValues.sync,
                datasource_id: initialValues.sync.includes('log') ? initialValues.datasource_id : undefined,
              }).then((res) => {
                if (res.dat) {
                  notification.warning({
                    message: t('other:permission.topic_exist_title'),
                    duration: null,
                    style: { width: 'auto' },
                    description: (
                      <>
                        {res.dat.map((item) => (
                          <div>
                            {t('other:permission.topic_exist_tip', {
                              busi_group_name: item.busi_group_name,
                              topic: item.topic,
                            })}
                          </div>
                        ))}
                      </>
                    ),
                  });
                } else {
                  message.success(t('permission.success'));
                }
              });
            }}
          >
            {t('permission.sync')}
          </Button>
        </Space>
      </Col>
      <Col span={24} className='init-boot es-index-tpl'>
        <Space>
          {t('permission.es_index_tpl')}
          <Select
            showSearch
            optionFilterProp='label'
            value={indexTplValues.group_id}
            style={{ width: 180 }}
            onChange={(value) =>
              setIndexTplValues({
                ...indexTplValues,
                group_id: value,
              })
            }
            options={busiGroups
              .filter((item: any) => item.extra?.super)
              .map((ele) => ({ label: ele.name, value: ele.id }))}
          />
          <Select
            value={indexTplValues.datasource_id}
            style={{ width: 200 }}
            onChange={(value) =>
              setIndexTplValues({
                ...indexTplValues,
                datasource_id: value,
              })
            }
            options={datasourceList.map((ele) => ({
              label: ele.name,
              value: ele.id,
            }))}
          />
          <Button
            type='primary'
            disabled={indexTplValues.group_id === '' || indexTplValues.datasource_id === ''}
            onClick={() => {
              syncCollectConfig(indexTplValues).then(() => {
                message.success(t('permission.success'));
              });
            }}
          >
            {t('permission.sync')}
          </Button>
        </Space>
      </Col>
      <Col span={24} className='init-boot es-index-tpl'>
        <Space>
          {t('permission.network_auth_ip')}
          <Select
            mode='tags'
            open={false}
            allowClear
            style={{ minWidth: 200 }}
            value={initialValues.network_auth_ip}
            onChange={(value) =>
              setInitialValues({
                ...initialValues,
                network_auth_ip: value,
              })
            }
          />
          <Button
            type='primary'
            disabled={!initialValues.network_auth_ip?.length}
            onClick={() => {
              setConfigByKey({ ckey: 'network_auth_ip', cval: initialValues.network_auth_ip?.join(',') }).then(() => {
                message.success(t('common:success.save'));
              });
            }}
          >
            {t('common:btn.save')}
          </Button>
        </Space>
      </Col>
    </Row>
  );
}
