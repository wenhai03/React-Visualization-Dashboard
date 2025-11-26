import React, { useState, useEffect, useContext } from 'react';
import { message, Spin, Modal } from 'antd';
import { CommonStateContext } from '@/App';
import { RollbackOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import { getDataSourceDetailById, submitRequest } from './services';
import Form from './Datasources/Form';
import './index.less';
import './locale';

export default function FormCpt() {
  const { t } = useTranslation('datasourceManage');
  const history = useHistory();
  const params = useParams<{ action: string; type: string; id: string }>();
  const { initBoot, setInitBoot } = useContext(CommonStateContext);
  const { action } = params;
  const id = action === 'edit' ? params.id : undefined;
  const [type, setType] = useState(action === 'add' ? params.type : '');
  const [data, setData] = useState<any>();
  const [submitLoading, setSubmitLoading] = useState(false);
  const onFinish = async (values: any) => {
    setSubmitLoading(true);
    // 转换 http.headers 格式
    if (type === 'influxdb') {
      _.set(
        values,
        ['settings', 'influxdb.headers'],
        _.transform(
          values?.settings?.['influxdb.headers'],
          (result, item) => {
            result[item.key] = item.value;
          },
          {},
        ),
      );
    } else {
      _.set(
        values,
        'http.headers',
        _.transform(
          values?.http?.headers,
          (result, item) => {
            result[item.key] = item.value;
          },
          {},
        ),
      );
    }
    return submitRequest({
      ...values,
      plugin_type: type,
      id: data?.id,
      is_enable: data ? undefined : true,
      is_test: true,
    })
      .then(() => {
        message.success(action === 'add' ? t('common:success.add') : t('common:success.modify'));
        const newInitBoot = _.cloneDeep(initBoot);
        // 更新需要引导配置项
        const type = initBoot?.ds_prometheus
          ? 'ds_prometheus'
          : initBoot?.ds_elasticsearch
          ? 'ds_elasticsearch'
          : undefined;
        type === 'ds_prometheus' && delete newInitBoot[type];
        type === 'ds_elasticsearch' && (newInitBoot[type!].stepIndex = 2);
        setInitBoot(newInitBoot);
        if (!initBoot?.ds_prometheus && initBoot?.ds_elasticsearch) {
          // ds_prometheus不存在，ds_elasticsearch存在,无论ms_area在不在，都跳转进行业务组绑定数据源
          history.push('/busi-groups?initType=elasticsearch');
        } else if (initBoot?.ds_prometheus && !initBoot?.ds_elasticsearch && newInitBoot?.ms_area) {
          // ds_prometheus存在，ds_elasticsearch不存在,ms_area存在，跳转进行区域配置
          history.push('/help/collector-management?tab=ms_area');
        } else {
          // 其他情况保持正常跳转列表
          setTimeout(() => {
            history.push({
              pathname: '/help/source',
            });
          }, 2000);
        }
      })
      .finally(() => {
        setSubmitLoading(false);
      });
  };

  useEffect(() => {
    if (action === 'edit' && id !== undefined) {
      getDataSourceDetailById(id).then((res: any) => {
        _.set(res, 'http.headers', _.map(res?.http?.headers, (value, key) => ({ key, value })) || []);
        setData(res);
        setType(res.plugin_type);
      });
    }
  }, []);

  return (
    <PageLayout
      title={_.capitalize(type)}
      icon={<RollbackOutlined className='back' onClick={() => history.push('/help/source')} />}
    >
      <div className='datasource-wrapper init-boot'>
        <div style={{ padding: '10px' }}>
          {action === 'edit' && data === undefined ? (
            <Spin spinning={true} />
          ) : (
            <Form
              data={data}
              onFinish={(values, clusterInstance) => {
                if (
                  (type === 'prometheus' && !values.cluster_name) ||
                  (import.meta.env['VITE_IS_ALERT_ES'] && type === 'elasticsearch' && !values.cluster_name) ||
                  (import.meta.env['VITE_IS_INFLUXDB_DS'] && type === 'influxdb' && !values.cluster_name) ||
                  (import.meta.env['VITE_IS_CK_DS'] && type === 'ck' && !values.cluster_name) ||
                  (import.meta.env['VITE_IS_SLS_DS'] && type === 'aliyun-sls' && !values.cluster_name)
                ) {
                  Modal.confirm({
                    title: t('form.cluster_confirm'),
                    okText: t('form.cluster_confirm_ok'),
                    cancelText: t('form.cluster_confirm_cancel'),
                    onOk: () => {
                      onFinish(values);
                    },
                    onCancel: () => {
                      if (clusterInstance && clusterInstance.focus) {
                        clusterInstance.focus();
                      }
                    },
                  });
                } else {
                  onFinish(values);
                }
              }}
              submitLoading={submitLoading}
            />
          )}
        </div>
      </div>
    </PageLayout>
  );
}
