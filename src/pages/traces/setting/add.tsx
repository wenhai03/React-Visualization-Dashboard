import React from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import Form from '../components/ApmSettingForm';
import '../locale';

export default function Add() {
  const { t } = useTranslation('traces');

  return (
    <PageLayout title={t('setting.title')} showBack backPath='/traces-setting'>
      <Form mode='add' />
    </PageLayout>
  );
}
