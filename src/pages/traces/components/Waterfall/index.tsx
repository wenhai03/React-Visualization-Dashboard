import { Drawer, Space, Empty, Affix } from 'antd';
import { transparentize } from 'polished';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useHistory } from 'react-router-dom';
import MetadataTable from '../MetadataTable';
import Timeline from '../Timeline';
import _ from 'lodash';
import { parse } from 'query-string';
import AccordionWaterfall from '../AccordionWaterfall';
import './index.less';

export const getErrorMarks = (errorItems: any[]) => {
  if (_.isEmpty(errorItems)) {
    return [];
  }

  return errorItems.map((error) => ({
    type: 'errorMark',
    offset: Math.max(error.offset + error.skew, 0),
    verticalLine: false,
    id: error.doc.error?.id,
    error: error.doc,
    serviceColor: error.color,
  }));
};

export function toQuery(search?: string) {
  return search ? parse(search.slice(1), { sort: false }) : {};
}

interface Props {
  waterfallItemId?: string;
  waterfall: any;
  showCriticalPath: boolean;
  filterData: any;
  selectRowData?: any;
  drawerWidth?: string;
  shouldUpdateUrl?: boolean;
  showSpanLink?: boolean;
}

function getWaterfallMaxLevel(waterfall: any) {
  const entryId = waterfall.entryWaterfallTransaction?.id;
  if (!entryId) {
    return 0;
  }
  let maxLevel = 1;
  function countLevels(id: string, currentLevel: number) {
    const children = waterfall.childrenByParentId[id] || [];
    if (children.length) {
      children.forEach((child) => {
        countLevels(child.id, currentLevel + 1);
      });
    } else {
      if (maxLevel < currentLevel) {
        maxLevel = currentLevel;
      }
    }
  }

  countLevels(entryId, 1);
  return maxLevel;
}

export default function Waterfall({
  waterfall,
  waterfallItemId,
  showCriticalPath,
  filterData,
  selectRowData,
  drawerWidth = '70%',
  shouldUpdateUrl, // 链路追踪需要更新路由，日志查询的链路不需要
  showSpanLink, // 日志查询详情点进来的链路详情不展示span
}: Props) {
  if (_.isEmpty(waterfall)) {
    return (
      <div className='empty-wrapper'>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }
  const { legends, items } = waterfall;
  const { pathname } = useLocation();
  const history = useHistory();
  const queryParams = new URLSearchParams(location.search);
  const { t } = useTranslation('traces');
  const { serviceName, spanId, transactionId } = filterData as {
    serviceName: string;
    spanId: string;
    transactionId: string;
  };

  // Service colors are needed to color the dot in the error popover
  const serviceLegends = legends.filter(({ type }) => type === 'serviceName');
  const serviceColors = serviceLegends.reduce((colorMap, legend) => {
    return {
      ...colorMap,
      [legend.value!]: legend.color,
    };
  }, {} as Record<string, string>);

  // only color by span type if there are only events for one service
  const colorBy = serviceLegends.length > 1 ? 'serviceName' : 'spanType';

  const displayedLegends = legends.filter((legend) => legend.type === colorBy);
  const legendsByValue = _.keyBy(displayedLegends, 'value');

  // mutate items rather than rebuilding both items and childrenByParentId
  items.forEach((item) => {
    let color = '';
    if ('legendValues' in item) {
      color = legendsByValue[item.legendValues[colorBy]].color;
    }

    if (!color) {
      // fall back to service color if there's no span.type, e.g. for transactions
      color = serviceColors[item.doc.service.name];
    }

    item.color = color;
  });

  const legendsWithFallbackLabel = displayedLegends.map((legend) => {
    return { ...legend, value: !legend.value ? serviceName : legend.value };
  });
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const [visible, setVisible] = useState(false);
  const [selectRow, setSelectRow] =
    useState<{
      processorEvent: string;
      transactionId?: string;
      id?: string;
      duration: number;
      time: number;
      parentId?: number;
      span?: any;
      doc?: any;
      spanLinksCount: { linkedChildren: number; linkedParents: number };
      linkedChildren?: { trace_id: string; span_id: string }[];
      linkedParents?: { trace_id: string; span_id: string }[];
    }>();
  const itemContainerHeight = 58; // TODO: This is a nasty way to calculate the height of the svg element. A better approach should be found
  const waterfallHeight = itemContainerHeight * waterfall.items.length;

  const { duration } = waterfall;

  const errorMarks = getErrorMarks(waterfall.errorItems);

  const timelineMargins = useMemo(() => {
    // Calculate the left margin relative to the deepest level, or 100px, whichever
    // is more.
    const maxLevel = getWaterfallMaxLevel(waterfall);
    return {
      top: 40,
      left: Math.max(100, maxLevel * 10),
      right: 50,
      bottom: 0,
    };
  }, [waterfall]);

  useEffect(() => {
    if (selectRowData) {
      setVisible(true);
      setSelectRow({
        parentId: selectRowData.parentId,
        span: selectRowData.doc?.span,
        processorEvent: selectRowData.docType,
        id: spanId === 'null' ? transactionId : spanId,
        duration: selectRowData.duration,
        time: Math.round(selectRowData.doc?.timestamp.us / 1000),
        doc: selectRowData.doc,
        spanLinksCount: selectRowData.spanLinksCount,
        // 传入
        linkedChildren: selectRowData.parentId ? [] : waterfall.rootLinks,
        // 传出
        linkedParents: selectRowData.doc?.span?.links?.map((ele) => ({ trace_id: ele.trace.id, span_id: ele.span.id })),
      });
    }
  }, [selectRowData]);

  return (
    <div className='traces-timeline-wrapper'>
      <Affix offsetTop={38} target={() => document.getElementById('traces-detail')}>
        <Space className='traces-timeline-header'>
          <span>{t(colorBy)}</span>
          {legendsWithFallbackLabel.map((legend, index) => (
            <div key={index}>
              <span className='waterfall-legends-circle' style={{ background: transparentize(0, legend.color) }}></span>
              {legend.value}
              {/* <Legend color={legend.color} text={legend.value} /> */}
            </div>
          ))}
        </Space>
      </Affix>
      <Timeline marks={errorMarks} xMax={duration} height={waterfallHeight} margins={timelineMargins} />
      <div style={{ borderBottom: '1px solid rgb(152, 162, 179)' }}>
        {!waterfall.entryWaterfallTransaction ? null : (
          <AccordionWaterfall
            // used to recreate the entire tree when `isAccordionOpen` changes, collapsing or expanding all elements.
            key={`accordion_state_${isAccordionOpen}`}
            isOpen={isAccordionOpen}
            item={waterfall.entryWaterfallTransaction}
            level={0}
            waterfallItemId={waterfallItemId}
            duration={duration}
            waterfall={waterfall}
            timelineMargins={timelineMargins}
            onClickWaterfallItem={(item: any) => {
              setVisible(true);

              const type = item.docType;
              setSelectRow({
                parentId: item.parentId,
                span: item.doc?.span,
                processorEvent: type,
                id: item.doc[type]?.id,
                duration: item.duration,
                time: Math.round(item.doc?.timestamp.us / 1000),
                doc: item.doc,
                spanLinksCount: showSpanLink ? item.spanLinksCount : 0,
                // 传入
                linkedChildren: showSpanLink ? (item.parentId ? [] : waterfall.rootLinks) : [],
                // 传出
                linkedParents: showSpanLink
                  ? item.doc?.span?.links?.map((ele) => ({
                      trace_id: ele.trace.id,
                      span_id: ele.span.id,
                    }))
                  : [],
              });

              if (shouldUpdateUrl) {
                // URL 存储spanId 值，方便抽屉未关闭时刷新能自动打开
                queryParams.set('spanId', item.doc?.span?.id || 'null');
                history.replace({
                  pathname: pathname,
                  search: queryParams.toString(),
                });
              }
            }}
            showCriticalPath={showCriticalPath}
            maxLevelOpen={waterfall.traceItemCount}
          />
        )}
      </div>

      <Drawer
        className='traces-timeline-drawer'
        width={drawerWidth}
        title={
          <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
            {selectRow?.parentId ? t('span_detail') : t('transaction_detail')}
          </div>
        }
        placement='right'
        onClose={() => {
          setVisible(false);

          if (shouldUpdateUrl) {
            queryParams.delete('spanId');
            // 抽屉关闭，清除URL上 spanId 参数
            history.replace({
              pathname: pathname,
              search: queryParams.toString(),
            });
          }
        }}
        visible={visible}
      >
        {visible && selectRow && (
          <MetadataTable
            data_id={filterData.data_id}
            timeRange={{ start: filterData.start, end: filterData.end }}
            {...selectRow}
            type='drawer'
            getErrorCount={waterfall.getErrorCount}
            onClose={() => setVisible(false)}
          />
        )}
      </Drawer>
    </div>
  );
}
