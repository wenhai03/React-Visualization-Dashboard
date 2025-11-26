import React, { useEffect, useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import { useParams, useHistory } from 'react-router-dom';
import { message } from 'antd';
import PageLayout from '@/components/pageLayout';
import { logTaskDetail } from '@/services/logstash';
import Form from '../components/LogTaskForm';
import { getDatasourceBriefList } from '@/services/common';
import { updateLogTask } from '@/services/logstash';
import '../locale';

export default function Edit() {
  const { t } = useTranslation('logs');
  const history = useHistory();
  const { curBusiId, setCurBusiId, setDatasourceList } = useContext(CommonStateContext);
  const { id } = useParams<{ id: string }>();
  const taskId = Number(id);
  const [initialValues, setInitialValues] = useState();

  const refreshData = () => {
    logTaskDetail(taskId).then((res) => {
      setInitialValues(res);
      if (res.group_id && res.group_id !== curBusiId) {
        setCurBusiId(res.group_id);
        getDatasourceBriefList().then((res) => {
          setDatasourceList(res);
        });
        message.success('当前业务组已进行变更');
      }
    });
  };

  useEffect(() => {
    if (taskId) {
      refreshData();
    }
  }, [taskId]);

  const handleSubmit = (values, back) => {
    updateLogTask(values, taskId).then((res) => {
      message.success(t('common:success.edit'));
      if (back) {
        history.push('/log/collection');
      } else {
        refreshData();
      }
    });
  };

  return (
    <PageLayout title={t('task.edit')} showBack backPath='/log/collection'>
      <Form
        mode='edit'
        initialValues={initialValues}
        onSubmit={handleSubmit}
        groupId={curBusiId}
      />
    </PageLayout>
  );
}
