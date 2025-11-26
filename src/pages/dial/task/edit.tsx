import React, { useEffect, useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import { CommonStateContext } from '@/App';
import { useParams } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import { getDatasourceBriefList } from '@/services/common';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { getDiagTaskDetail, getDialTaskTags } from '@/services/dial';
import Form from '../components/Form';
import '../locale';

export default function Edit() {
  const { t } = useTranslation('dial');
  const { curBusiId, setCurBusiId, setDatasourceList } = useContext(CommonStateContext);
  const { id } = useParams<{ id: string }>();
  const { search } = useLocation();
  const { mode } = queryString.parse(search);
  const taskId = Number(id);
  const [tagsTree, setTagsTree] = useState({ public: [], private: [] });
  const [values, setValues] = useState<any>({});

  useEffect(() => {
    if (taskId) {
      getDiagTaskDetail(taskId).then((res) => {
        const content_json = { ...res.dat.content_json };
        if (res.dat.category === 'dial:dial_whois') {
          content_json.interval = (res.dat.content_json.interval / 86400).toFixed(1);
        }
        setValues({ ...res.dat, content_json });
        if (res.dat.group_id && res.dat.group_id !== curBusiId) {
          setCurBusiId(res.dat.group_id);
          getDatasourceBriefList().then((res) => {
            setDatasourceList(res);
          });
          message.success('当前业务组已进行变更');
        }
      });

      // 获取拨测机器标签
      getDialTaskTags({ group_id: curBusiId }).then((res) => {
        setTagsTree(res.dat);
      });
    }
  }, [taskId]);

  return (
    <PageLayout title={t('task.title')} showBack backPath='/dial-task'>
      <Form tagsTree={tagsTree} initialValues={values} mode={mode === 'clone' ? 'clone' : 'edit'} groupId={curBusiId} />
    </PageLayout>
  );
}
