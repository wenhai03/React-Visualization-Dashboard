import React, { useMemo, useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { CommonStateContext } from '@/App';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { getRecordingRule } from '@/services/recording';
import { useQuery } from '@/utils';
import { getDatasourceBriefList } from '@/services/common';
import OperateForm from './components/operateForm';
import './index.less';
import './locale';

const StrategyEdit: React.FC = () => {
  const { t } = useTranslation('recordingRules');
  const query = useQuery();
  const { curBusiId, setCurBusiId, setDatasourceList } = useContext(CommonStateContext);
  const isClone = query.get('mode');
  const params: any = useParams();
  const strategyId = useMemo(() => {
    return params.id;
  }, [params]);
  const [curStrategy, setCurStrategy] = useState<any>({});
  useEffect(() => {
    getStrategy();
    return () => {};
  }, [strategyId]);

  const getStrategy = async () => {
    const res = await getRecordingRule(strategyId);
    setCurStrategy(res.dat || {});
    if (res.dat.group_id && res.dat.group_id !== curBusiId) {
      setCurBusiId(res.dat.group_id);
      getDatasourceBriefList().then((res) => {
        setDatasourceList(res);
      });
      message.success('当前业务组已进行变更');
    }
  };

  return (
    <PageLayout title={t('title')} showBack>
      {curStrategy.id && <OperateForm detail={curStrategy} type={!isClone ? 1 : 2} />}
    </PageLayout>
  );
};

export default StrategyEdit;
