import React from 'react';
import _ from 'lodash';
import { Tabs, Pagination, Spin, Empty, Row, Col, Button, Tooltip, Tag, Space, Affix } from 'antd';
import { useTranslation } from 'react-i18next';
import Waterfall from '../../components/Waterfall';
import MetadataTable from '../../components/MetadataTable';
import LogStream from '@/components/LogStream';
import TransactionSummary from '../../components/TransationSmmary';

interface ITraceGraph {
  page: number; // 链路分页
  changePage: (page: number) => void;
  getFullTraceInfor: () => void; // 开启全链路
  waterfall: any;
  logStream: any;
  fieldcaps: any;
  activeKey: string;
  selectRowData?: any;
  filterData: any;
  processor: any;
  setActiveKey: (val) => void;
  loading: boolean;
  total: number;
  logLoading: boolean;
  timezone: string;
  timeField: string[];
  drawerWidth?: string; // 跨度详情抽屉宽度
  shouldUpdateUrl?: boolean; // 从日志查询过来的链路详情不更新url
  showSpanLink?: boolean; // 从日志查询过来的链路详情不展示跨度链接
}
const TraceGraph: React.FC<ITraceGraph> = (props) => {
  const { t } = useTranslation('traces');
  const {
    changePage,
    getFullTraceInfor,
    waterfall,
    logStream,
    activeKey,
    fieldcaps,
    setActiveKey,
    page,
    loading,
    total,
    selectRowData,
    filterData,
    processor,
    logLoading,
    timezone,
    timeField,
    drawerWidth,
    shouldUpdateUrl,
    showSpanLink = true,
  } = props;

  const customTabBar = (props, DefaultTabBar) => {
    return (
      <Affix className='tabs-affix-wrapper' offsetTop={0} target={() => document.getElementById('traces-detail')}>
        <DefaultTabBar {...props} />
      </Affix>
    );
  };

  return (
    <Spin spinning={loading}>
      {total && page > 0 ? (
        <>
          <Row justify='space-between'>
            <Col>
              <Pagination simple current={page} total={total} onChange={changePage} defaultPageSize={1} />
            </Col>
            <Col>
              <Tooltip title={filterData.all_trace === 'false' ? '' : t('view_full_info_ing')}>
                <Button
                  type='primary'
                  disabled={filterData.all_trace === 'true' && _.isEmpty(waterfall.traceDocs)}
                  onClick={getFullTraceInfor}
                >
                  {t('view_full_traces_info')}
                </Button>
              </Tooltip>
            </Col>
          </Row>

          <div className='apm-transation-view' style={{ padding: '0 16px' }}>
            <Space>
              {!_.isEmpty(waterfall) && waterfall.entryWaterfallTransaction && (
                <TransactionSummary
                  errorCount={waterfall.totalErrorsCount}
                  totalDuration={waterfall.rootWaterfallTransaction?.duration}
                  doc={waterfall.entryWaterfallTransaction?.doc}
                  docType={waterfall.entryWaterfallTransaction?.docType}
                />
              )}
              {filterData.all_trace === 'true' && (
                <Tag color='#f50' style={{ marginTop: '8px' }}>
                  {t('view_full_info_ing')}
                </Tag>
              )}
            </Space>
            <Tabs
              destroyInactiveTabPane
              activeKey={activeKey}
              onChange={(key) => setActiveKey(key)}
              renderTabBar={customTabBar}
            >
              <Tabs.TabPane tab={t('timeline')} key='timeline'>
                <Waterfall
                  showCriticalPath={false}
                  waterfallItemId={undefined}
                  waterfall={waterfall}
                  filterData={filterData}
                  selectRowData={selectRowData}
                  drawerWidth={drawerWidth}
                  shouldUpdateUrl={shouldUpdateUrl}
                  showSpanLink={showSpanLink}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab={t('metadata')} key='metadata' className='traces-timeline-drawer'>
                <MetadataTable data_id={filterData.data_id} {...processor} type='tab' />
              </Tabs.TabPane>
              <Tabs.TabPane tab={t('logs')} key='logs'>
                <LogStream
                  logStream={logStream}
                  loading={logLoading}
                  type='apm'
                  time_field='@timestamp'
                  fieldcaps={fieldcaps}
                  timezone={timezone}
                  timeField={timeField}
                  customStyle={{ scale: 'medium', wrap: 'wrap' }}
                  columnsConfigs={{
                    apm: ['service.name', 'message'].map((item) => ({
                      name: item,
                      visible: true,
                    })),
                  }}
                />
              </Tabs.TabPane>
            </Tabs>
          </div>
        </>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Spin>
  );
};

export default TraceGraph;
