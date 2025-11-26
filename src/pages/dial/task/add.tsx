import React, { useEffect, useState, useContext } from 'react';
import { CommonStateContext } from '@/App';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { getDialTaskTags } from '@/services/dial';
import Form from '../components/Form';
import '../locale';

export default function Add() {
  const { t } = useTranslation('dial');
  const { curBusiId } = useContext(CommonStateContext);
  const [tagsTree, setTagsTree] = useState({ public: [], private: [] });

  useEffect(() => {
    // 获取拨测机器标签
    getDialTaskTags({ group_id: curBusiId }).then((res) => {
      setTagsTree(res.dat);
    });
  }, []);
  return (
    <PageLayout title={t('task.title')} showBack backPath='/dial-task'>
      <Form tagsTree={tagsTree} mode='add' groupId={curBusiId} />
    </PageLayout>
  );
}
