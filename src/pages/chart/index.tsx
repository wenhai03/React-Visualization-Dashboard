import React, { useEffect, useState, useRef } from 'react';
import semver from 'semver';
import { Space, Alert } from 'antd';
import moment from 'moment';
import VariableConfig, { IVariable } from '@/pages/dashboard/VariableConfig';
import { FieldNumberOutlined } from '@ant-design/icons';
import { useParams } from 'react-router';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { GetTmpChartData } from '@/services/metric';
import { getAuthorizedDatasourceCates } from '@/components/AdvancedWrap';
import PageLayout from '@/components/pageLayout';
import Renderer from '../dashboard/Renderer/Renderer';
import { mergeTwoVarOption } from '@/pages/dashboard/Panels/utils';
import './locale';
import './index.less';

export default function Chart() {
  const { t } = useTranslation('shareChart');
  const datasourceCates = getAuthorizedDatasourceCates();
  const { ids } =
    useParams<{
      ids: string;
    }>();
  const [chartData, setChartData] =
    useState<
      Array<{
        ref: any;
        dataProps: any;
      }>
    >();
  const datasourceCate = useRef<string>();
  const datasourceName = useRef<string>();
  const timeRange = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const [variableConfig, setVariableConfig] = useState<IVariable[]>();

  useEffect(() => {
    initChart();
  }, []);

  const initChart = () => {
    GetTmpChartData(ids)
      .then((res) => {
        const data = res.dat
          .filter((item) => !!item)
          .map((item) => {
            return { ...JSON.parse(item.configs), ref: React.createRef() };
          });
        datasourceCate.current = _.find(datasourceCates, { value: data[0].dataProps.datasourceCate })?.label;
        datasourceName.current = data[0].dataProps.datasourceName;
        timeRange.current = data[0].dataProps.range;
        setVariableConfig(
          _.map(data[0].dataProps.var, (item) => {
            return _.omit(item, 'options'); // 兼容性代码，去除掉已保存的 options
          }) as IVariable[],
        );
        setChartData(data);
      })
      .catch((err) => setChartData([]));
  };

  if (!chartData) return null;
  if (_.isEmpty(chartData)) {
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
          <div className='dashboard-detail-header-left'></div>
          <div className='dashboard-detail-header-right'>
            <Space>
              {chartData[0].dataProps.variableConfigWithOptions && (
                <VariableConfig
                  isPreview={false}
                  onChange={() => {}}
                  value={variableConfig}
                  range={timeRange.current}
                  id={ids}
                  group_id={chartData[0].dataProps.group_id}
                  groupedDatasourceList={chartData[0].dataProps.groupedDatasourceList}
                  editable={false}
                  disabled={true}
                  chart_share_id={ids}
                  valueWithOption={mergeTwoVarOption(
                    chartData[0].dataProps.variableConfigWithOptions,
                    chartData[0].dataProps.rowVarOption,
                  )}
                />
              )}
              <span>
                {t('common:datasource.type')}：{datasourceCate.current}
              </span>
              <span>
                {t('common:datasource.id')}：{datasourceName.current}
              </span>
              <span>
                {t('start_time')}
                {moment(timeRange.current.start).format('YYYY-MM-DD HH:mm:ss')}
              </span>
              <span>
                {t('end_time')}
                {moment(timeRange.current.end).format('YYYY-MM-DD HH:mm:ss')}
              </span>
            </Space>
          </div>
        </div>
      }
    >
      <div className='chart-container'>
        {chartData.map((item: any, index) => {
          if (semver.valid(item.dataProps?.version)) {
            return (
              <>
                <div style={{ height: 740, border: '1px solid #efefef' }}>
                  <Renderer
                    dashboardId={ids}
                    group_id={item.dataProps.group_id}
                    board_id={item.dataProps.board_id}
                    key={index}
                    time={timeRange.current}
                    variableConfig={mergeTwoVarOption(
                      chartData[0].dataProps.variableConfigWithOptions,
                      chartData[0].dataProps.rowVarOption,
                    )}
                    values={_.merge({}, item.dataProps, {
                      options: {
                        legend: {
                          displayMode: 'table',
                        },
                      },
                    })}
                    isPreview
                    isShare={true}
                    esVersion={item.dataProps.esVersion}
                  />
                </div>
              </>
            );
          }
          return <Alert type='warning' message='v6 版本不再支持 < v5.4.0 的配置，请重新生成临时图' />;
        })}
      </div>
    </PageLayout>
  );
}
