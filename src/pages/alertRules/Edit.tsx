import React, { useEffect, useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'react-router-dom';
import { CommonStateContext } from '@/App';
import { message } from 'antd';
import queryString from 'query-string';
import { getDatasourceBriefList } from '@/services/common';
import PageLayout from '@/components/pageLayout';
import { getWarningStrategy } from '@/services/warning';
import Form from './Form';

export default function Edit() {
  const { t } = useTranslation('alertRules');
  const { curBusiId, setCurBusiId, setDatasourceList } = useContext(CommonStateContext);
  const { id } = useParams<{ id: string }>();
  const alertRuleId = Number(id);
  const [values, setValues] = useState<any>({});
  const { search } = useLocation();
  const { mode } = queryString.parse(search);

  useEffect(() => {
    if (alertRuleId) {
      getWarningStrategy(alertRuleId).then((res) => {
        setValues(res.dat || {});
        if (res.dat.group_id && res.dat.group_id !== curBusiId) {
          setCurBusiId(res.dat.group_id);
          getDatasourceBriefList().then((res) => {
            setDatasourceList(res);
          });
          message.success('当前业务组已进行变更');
        }
      });
    }
  }, [alertRuleId]);

  return (
    <PageLayout title={t('title')} showBack backPath='/alert-rules'>
      <Form type={mode === 'clone' ? 2 : 1} initialValues={values} />
    </PageLayout>
  );
}
