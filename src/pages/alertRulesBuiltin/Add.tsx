import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import Form from '@/pages/alertRules/Form';

export default function Add() {
  const { t } = useTranslation('alertRules');
  const { cate } = useParams<{ cate: string }>();

  return (
    <PageLayout title={t('title')} showBack backPath={`/alert-rules-built-in/${cate}`}>
      <Form isBuiltin={true} />
    </PageLayout>
  );
}
