import React, { useMemo, useEffect, useState, useContext } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { CommonStateContext } from '@/App';
import { message } from 'antd';
import { subscribeItem } from '@/store/warningInterface/subscribe';
import PageLayout from '@/components/pageLayout';
import OperateForm from './components/operateForm';
import { useTranslation } from 'react-i18next';
import { getDatasourceBriefList } from '@/services/common';
import { getSubscribeData } from '@/services/subscribe';
import './locale';
import './index.less';

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

const EditSubscribe: React.FC = () => {
  const { t } = useTranslation('alertSubscribes');
  const { curBusiId, setCurBusiId, setDatasourceList } = useContext(CommonStateContext);
  const [curSubscribeData, setCurSubscribeData] = useState<subscribeItem>();
  const query = useQuery();
  const isClone = query.get('mode');
  const params: any = useParams();
  const shieldId = useMemo(() => {
    return params.id;
  }, [params]);

  useEffect(() => {
    getSubscribe();
  }, [shieldId]);

  const getSubscribe = async () => {
    const { dat } = await getSubscribeData(shieldId);
    if (dat.group_id && dat.group_id !== curBusiId) {
      setCurBusiId(dat.group_id);
      getDatasourceBriefList().then((res) => {
        setDatasourceList(res);
      });
      message.success('当前业务组已进行变更');
    }
    const tags = dat.tags.map((item) => {
      return {
        ...item,
        value: item.func === 'in' ? item.value.split(' ') : item.value,
      };
    });
    setCurSubscribeData(
      {
        ...dat,
        tags,
      } || {},
    );
  };

  return (
    <PageLayout title={t('title')} showBack>
      <div className='shield-add'>
        {curSubscribeData?.id && <OperateForm detail={curSubscribeData} type={!isClone ? 1 : 2} />}
      </div>
    </PageLayout>
  );
};

export default EditSubscribe;
