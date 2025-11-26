import React, { useContext } from 'react';
import { CommonStateContext } from '@/App';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import Form from '../components/LogTaskForm';
import { createLogTask } from '@/services/logstash';
import { message } from 'antd';
import '../locale';

export default function Add() {
  const { t } = useTranslation('logs');
  const { curBusiId } = useContext(CommonStateContext);
  const history = useHistory();

  const handleSubmit = (values) => {
    createLogTask(values).then((res) => {
      message.success(t('common:success.create'));
      history.push('/log/collection');
    });
  };

  return (
    <PageLayout title={t('task.create')} showBack backPath='/log/collection'>
      <Form mode='add' onSubmit={handleSubmit} groupId={curBusiId} />
    </PageLayout>
  );
}
