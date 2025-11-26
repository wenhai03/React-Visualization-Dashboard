import React from 'react';
import { useParams } from 'react-router-dom';
import _ from 'lodash';
import Detail from '@/pages/dashboard/Detail/Detail';

export default function dashboardBuiltinDetail() {
  const { cate } = useParams<{ cate: string }>();

  return <Detail isPreview={false} isBuiltin gobackPath={`/dashboards-built-in/${cate}`} />;
}
