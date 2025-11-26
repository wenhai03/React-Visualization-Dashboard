import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import { getApmFormConfig } from '@/services/traces';
import Form from '../components/ApmForm';

export default function Edit() {
  const { t } = useTranslation('traces');
  const { id } = useParams<{ id: string }>();
  const editId = Number(id);
  const [initialValues, setInitialValues] = useState<any>();

  useEffect(() => {
    if (editId) {
      getApmFormConfig({ id: editId }).then((res) => {
        setInitialValues(res.dat.list[0]);
      });
    }
  }, [editId]);

  return (
    <PageLayout title={t('form.title')} showBack backPath='/traces-form'>
      <Form initialValues={initialValues} />
    </PageLayout>
  );
}
