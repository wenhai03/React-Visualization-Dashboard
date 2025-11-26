import React from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import Form from '../components/ApmForm';

export default function Add() {
  const { t } = useTranslation('traces');

  return (
    <PageLayout title={t('form.title')} showBack backPath='/traces-form'>
      <Form />
    </PageLayout>
  );
}
