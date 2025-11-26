import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import queryString from 'query-string';
import { useLocation } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import { getApmAgentConfigDetail } from '@/services/traces';
import Form from '../components/ApmSettingForm';
import '../locale';

export default function Edit() {
  const { t } = useTranslation('traces');
  const { search } = useLocation();
  const query = queryString.parse(search);
  const [initialValues, setInitialValues] = useState<any>();

  useEffect(() => {
    if (query) {
      getApmAgentConfigDetail(query).then((res) => {
        setInitialValues(res.dat);
      });
    }
  }, [search]);

  return (
    <PageLayout title={t('setting.title')} showBack backPath='/traces-setting'>
      <Form initialValues={initialValues} mode='edit' />
    </PageLayout>
  );
}
