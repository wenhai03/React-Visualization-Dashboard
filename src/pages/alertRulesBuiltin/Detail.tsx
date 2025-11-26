/**
 * 详情页面只是用于内置规则的展示
 */
import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import { useParams } from 'react-router-dom';
import _ from 'lodash';
import PageLayout from '@/components/pageLayout';
import Form from '@/pages/alertRules/Form';
import BusiGroupSelect from '@/components/BusiGroupSelect';
import { getRuleCatesDetail } from './services';
import '@/pages/alertRules/locale';

export default function Edit() {
  const { t } = useTranslation('alertRules');
  const { profile, busiGroups, curBusiId } = useContext(CommonStateContext);
  const { cate, code } = useParams<{ cate: string; code: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [initialValues, setInitialValues] = useState<any>(null);

  useEffect(() => {
    getRuleCatesDetail(cate, code)
      .then((res) => {
        setInitialValues(res.alert_rule);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return null;

  return (
    <PageLayout
      title={t('title')}
      showBack
      backPath={`/alert-rules-built-in/${cate}`}
      rightArea={
        <BusiGroupSelect
          disabled={true}
          value={busiGroups.length ? curBusiId : ''}
          options={busiGroups.map((item: any) => ({
            label: `${item.name}${item.perm === 'ro' ? '（只读）' : ''}`,
            value: item.id,
          }))}
        />
      }
    >
      {initialValues ? (
        <Form isBuiltin={true} type={profile.admin ? 1 : 3} initialValues={initialValues} />
      ) : (
        <div>{t('detail_no_result')}</div>
      )}
    </PageLayout>
  );
}
