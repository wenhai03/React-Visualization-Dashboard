import React, { useState, useRef, useEffect, useContext } from 'react';
import _ from 'lodash';
import { FieldNumberOutlined } from '@ant-design/icons';
import { useParams, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { Space } from 'antd';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { Dashboard } from '@/store/dashboardInterface';
import { CommonStateContext } from '@/App';
import moment from 'moment';
import Panels from '../Panels';
import VariableConfig, { IVariable } from '../VariableConfig';
import { JSONParse } from '../utils';
import { IDashboard } from '@/pages/dashboard/types';
import { sortPanelsByGridLayout } from '../Panels/utils';
import { getShareChartData } from '@/services/metricViews';
import '../Detail/style.less';
import '../Detail/dark.antd.less';
import '../Detail/dark.less';
import '@/pages/chart/index.less';
import '@/pages/chart/locale'

interface URLParam {
  id: string;
}

interface IProps {
  isPreview?: boolean;
  isBuiltin?: boolean;
}

type IShareDashboard = Omit<Dashboard, 'configs'> & {
  configs: IDashboard & { groupedDatasourceList?: any; dashboardName?: string; variableConfigWithOptions?: any };
};

export const dashboardTimeCacheKey = 'dashboard-timeRangePicker-value';
const fetchDashboard = ({ id }) => {
  return getShareChartData(id);
};

export default function DashboardShare(props: IProps) {
  const { t } = useTranslation('shareChart');
  const { isPreview = false, isBuiltin = false } = props;
  const { search } = useLocation<any>();
  const query = queryString.parse(search);
  const bgid = Number(query.bgid);
  const { curBusiId } = useContext(CommonStateContext);
  let { id } = useParams<URLParam>();
  const [variableConfig, setVariableConfig] = useState<IVariable[]>();
  const [dashboard, setDashboard] = useState<IShareDashboard>({} as IShareDashboard);
  const [panels, setPanels] = useState<any[]>();
  const [searchRange, setSearchRange] = useState<{ start: number; end: number }>();
  let updateAtRef = useRef<number>();
  const refresh = async (cbk?: () => void) => {
    fetchDashboard({ id })
      .then((res) => {
        const configs = _.isString(res.configs) ? JSONParse(res.configs) : res.configs;
        setDashboard({
          group_id: bgid || curBusiId,
          ...res,
          configs,
        });
        if (configs) {
          const variableConfig = configs.var
            ? configs
            : {
                ...configs,
                var: [],
              };
          setVariableConfig(
            _.map(variableConfig.var, (item) => {
              return _.omit(item, 'options'); // 兼容性代码，去除掉已保存的 options
            }) as IVariable[],
          );
          setPanels(sortPanelsByGridLayout(configs.panels));
          setSearchRange(configs.range);
          if (cbk) {
            cbk();
          }
        }
      })
      .catch((err) => setPanels([]));
  };

  useEffect(() => {
    refresh();
  }, [id]);

  if (!panels) return null;
  if (_.isEmpty(panels)) {
    return (
      <h2 className='chart-container-holder'>
        <FieldNumberOutlined
          style={{
            fontSize: '30px',
          }}
        />
        <span>{t('该分享链接无图表数据')}</span>
      </h2>
    );
  }

  return (
    <PageLayout
      customArea={
        <div className='dashboard-detail-header'>
          <div className='dashboard-detail-header-left'>
            <div className='title'>{dashboard.configs?.dashboardName}</div>
          </div>
          <div className='dashboard-detail-header-right'>
            <Space>
              {dashboard.configs?.variableConfigWithOptions && searchRange && (
                <VariableConfig
                  isPreview={false}
                  onChange={() => {}}
                  value={variableConfig}
                  range={searchRange}
                  id={id}
                  group_id={dashboard.group_id}
                  groupedDatasourceList={dashboard.configs?.groupedDatasourceList}
                  editable={false}
                  disabled={true}
                  chart_share_id={id}
                  valueWithOption={dashboard.configs?.variableConfigWithOptions}
                />
              )}
              <span>
                {t('start_time')}
                {moment(searchRange?.start || 0).format('YYYY-MM-DD HH:mm:ss')}
              </span>
              <span>
                {t('end_time')}
                {moment(searchRange?.end || 0).format('YYYY-MM-DD HH:mm:ss')}
              </span>
            </Space>
          </div>
        </div>
      }
    >
      <div className='dashboard-detail-container'>
        <div className='dashboard-detail-content'>
          {dashboard.configs?.variableConfigWithOptions && searchRange && (
            <Panels
              dashboardId={id}
              isPreview={isPreview}
              isBuiltin={isBuiltin}
              editable={false}
              panels={panels}
              setPanels={setPanels}
              dashboard={dashboard}
              range={searchRange}
              isShare={true}
              variableConfig={dashboard.configs?.variableConfigWithOptions}
              groupedDatasourceList={dashboard.configs?.groupedDatasourceList}
              onUpdated={(res) => {
                updateAtRef.current = res.update_at;
                refresh();
              }}
            />
          )}
        </div>
      </div>
    </PageLayout>
  );
}
