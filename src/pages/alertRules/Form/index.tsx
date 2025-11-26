import React, { useContext, useEffect, createContext, useState } from 'react';
import { Form, Space, Button, message, Modal, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { useHistory, Link, useParams } from 'react-router-dom';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import { addStrategy, EditStrategy } from '@/services/warning';
import { createBuiltStrategy, updateBuiltStrategy } from '@/pages/alertRulesBuiltin/services';
import { getWhetherEnableForecast } from '@/services/warning';
import Base from './Base';
import Rule from './Rule';
import Effective from './Effective';
import Notify from './Notify';
import InhibitAlert from './InhibitAlert';
import { processFormValues, processInitialValues } from './utils';
import { defaultValues } from './constants';
import '@/pages/alertRules/locale';

interface IProps {
  type?: number; // 空: 新增 1:编辑 2:克隆 3:查看
  initialValues?: any;
  isBuiltin?: boolean; // 判断是否为内置规则
}

export const FormStateContext = createContext({
  disabled: false,
  enableForecast: true,
} as { disabled: boolean; type?: number; enableForecast: boolean });

export default function RuleForm(props: IProps) {
  const { type, initialValues, isBuiltin } = props;
  const history = useHistory();
  const { cate, code } = useParams<{ cate: string; code: string }>();
  const { t } = useTranslation('alertRules');
  const [form] = Form.useForm();
  const { licenseRulesRemaining, curBusiId, curBusiGroup } = useContext(CommonStateContext);
  const disabled = type === 3;
  const [enableForecast, setEnableForecast] = useState(true);
  const handleCheck = async (values) => {
    if (values.cate === 'prometheus') {
      if (values.rule_config.checked && values.prod === 'anomaly') {
        message.warning('请先校验指标');
        return;
      }
      // TODO: 多个 promql 怎么校验？
      // const datasourceId = getFirstDatasourceId(values.datasource_ids, groupedDatasourceList[values.cate]);
      // const res = await prometheusQuery({ query: values.prom_ql }, datasourceId);
      // if (res.error) {
      //   notification.error({
      //     message: res.error,
      //   });
      //   return false;
      // }
    } else if (type !== 1) {
      if (licenseRulesRemaining === 0 && values.prod === 'anomaly') {
        message.error('可添加的智能告警规则数量已达上限，请联系客服');
      }
    }
  };
  const handleMessage = (res) => {
    if (type === 1) {
      if (res.err) {
        message.error(res.error);
      } else {
        message.success(t('common:success.modify'));
        history.push('/alert-rules');
      }
    } else {
      const { dat } = res;
      let errorNum = 0;
      const msg = Object.keys(dat).map((key) => {
        dat[key] && errorNum++;
        return dat[key];
      });

      if (!errorNum) {
        message.success(`${type === 2 ? t('common:success.clone') : t('common:success.add')}`);
        history.push('/alert-rules');
      } else {
        message.error(t(msg));
      }
    }
  };

  useEffect(() => {
    if (type === 1 || type === 2 || type === 3) {
      const cover_alert_notify = initialValues.notify_mode === 1 ? curBusiGroup.alert_notify : {};
      form.setFieldsValue(processInitialValues({ ...initialValues, ...cover_alert_notify }));
    } else {
      form.setFieldsValue({ ...defaultValues, ...curBusiGroup.alert_notify });
    }
  }, [initialValues, curBusiGroup]);

  useEffect(() => {
    // 查询是否开启智能阈值告警
    getWhetherEnableForecast().then((res) => {
      setEnableForecast(res.dat);
    });
  }, []);

  return (
    <FormStateContext.Provider
      value={{
        disabled:
          disabled ||
          curBusiGroup.perm === 'ro' ||
          (type === 1 && !enableForecast && initialValues.sub_prod === 'forecast'),
        type,
        enableForecast,
      }}
    >
      <div>
        <Form
          form={form}
          layout='vertical'
          disabled={
            disabled ||
            curBusiGroup.perm === 'ro' ||
            (type === 1 && !enableForecast && initialValues.sub_prod === 'forecast')
          }
        >
          <div className='alert-rules-form'>
            {initialValues?.builtin_id > 0 && type !== 2 && (
              <Alert message={t('system_generation_tip')} type='info' showIcon />
            )}
            <Form.Item name='disabled' hidden>
              <div />
            </Form.Item>
            <Form.Item name='id' hidden>
              <div />
            </Form.Item>
            <Base {...props} />
            <Rule
              form={form}
              mask={initialValues?.builtin_id > 0 && type !== 2}
              isBuiltin={isBuiltin}
              initialValues={initialValues}
            />
            <InhibitAlert bgid={curBusiId} {...props} />
            <Effective />
            <Notify form={form} isBuiltin={isBuiltin} />
            {!disabled && curBusiGroup.perm === 'rw' && (
              <Space>
                <Button
                  type='primary'
                  onClick={() => {
                    form
                      .validateFields()
                      .then(async (values) => {
                        handleCheck(values);
                        const data = processFormValues(values) as any;
                        // 内置规则可新增修改（仅管理员可操作）
                        if (isBuiltin) {
                          if (type === 1) {
                            // 编辑
                            updateBuiltStrategy(cate, code, { alert_rule: { ...data, datasource_ids: [0] } }).then(
                              (res) => {
                                if (res.err) {
                                  message.error(res.error);
                                } else {
                                  message.success(t('common:success.modify'));
                                  history.push({
                                    pathname: `/alert-rules-built-in/${cate}`,
                                  });
                                }
                              },
                            );
                          } else {
                            // 新增
                            createBuiltStrategy(cate, { alert_rule: { ...data, datasource_ids: [0] } }).then((res) => {
                              if (res.err) {
                                message.error(res.error);
                              } else {
                                message.success(t('common:success.add'));
                                history.push({
                                  pathname: `/alert-rules-built-in/${cate}`,
                                });
                              }
                            });
                          }
                        } else {
                          if (type === 1) {
                            if (!initialValues.disabled && data.disabled) {
                              Modal.confirm({
                                content: t('disabled_confirm_tip'),
                                okText: t('common:btn.ok'),
                                cancelText: t('common:btn.cancel'),
                                onOk: async () => {
                                  const res = await EditStrategy(data, initialValues.group_id, initialValues.id);
                                  handleMessage(res);
                                },
                                onCancel: () => {},
                              });
                            } else {
                              const res = await EditStrategy(data, initialValues.group_id, initialValues.id);
                              handleMessage(res);
                            }
                          } else {
                            const res = await addStrategy([data], curBusiId);
                            handleMessage(res);
                          }
                        }
                      })
                      .catch((err) => {
                        console.error(err);
                      });
                  }}
                >
                  {t('common:btn.save')}
                </Button>
                <Link to={isBuiltin ? `/alert-rules-built-in/${cate}` : '/alert-rules'}>
                  <Button>{t('common:btn.cancel')}</Button>
                </Link>
              </Space>
            )}
          </div>
        </Form>
      </div>
    </FormStateContext.Provider>
  );
}
