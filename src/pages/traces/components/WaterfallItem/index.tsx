import React, { ReactNode, useRef, useState, useEffect } from 'react';
import { Tooltip, Tag, message } from 'antd';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { Link, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { DatabaseOutlined, MergeCellsOutlined, GlobalOutlined, RightOutlined } from '@ant-design/icons';
import { asDuration, conversionTime } from '@/pages/traces/utils';
import './index.less';

interface IWaterfallItemProps {
  timelineMargins: any;
  totalDuration?: number;
  item: any;
  hasToggle: boolean;
  color: string;
  isSelected: boolean;
  errorCount: number;
  marginLeftLevel: number;
  segments?: Array<{
    left: number;
    width: number;
    color: string;
  }>;
  onClick: (flyoutDetailTab: string) => unknown;
}

function PrefixIcon({ item }: { item: any }) {
  switch (item.docType) {
    case 'span': {
      // icon for database spans
      const isDbType = item.doc.span.type.startsWith('db');
      if (isDbType) {
        return <DatabaseOutlined />;
      }

      // omit icon for other spans
      return null;
    }
    case 'transaction': {
      // icon for RUM agent transactions
      if (['js-base', 'rum-js', 'opentelemetry/webjs'].includes(item.doc.agent.name!)) {
        return <GlobalOutlined />;
      }

      // icon for other transactions
      return <MergeCellsOutlined />;
    }
    default:
      return null;
  }
}

interface SpanActionToolTipProps {
  children: ReactNode;
  item?: any;
}

function SpanActionToolTip({ item, children }: SpanActionToolTipProps) {
  if (item?.docType === 'span') {
    return (
      <Tooltip title={`${item.doc.span.subtype}.${item.doc.span.action}`}>
        <>{children}</>
      </Tooltip>
    );
  }
  return <>{children}</>;
}

function Duration({ item }: { item: any }) {
  return (
    <div color='subdued' className='waterfall-duration'>
      {asDuration(item.duration)}
    </div>
  );
}

function HttpStatusCode({ item }: { item: any }) {
  // http status code for transactions of type 'request'
  const httpStatusCode =
    item.docType === 'transaction' && item.doc.transaction.type === 'request' ? item.doc.transaction.result : undefined;

  if (!httpStatusCode) {
    return null;
  }

  return <div>{httpStatusCode}</div>;
}

function NameLabel({ item }: { item: any }) {
  switch (item.docType) {
    case 'span':
      let name = item.doc.span.name;
      if (item.doc.span.composite) {
        const compositePrefix = item.doc.span.composite.compression_strategy === 'exact_match' ? 'x' : '';
        name = `${item.doc.span.composite.count}${compositePrefix} ${name}`;
      }
      return (
        <div style={{ overflow: 'hidden' }}>
          <Tooltip title={name}>{name}</Tooltip>
          {/* <TruncateWithTooltip content={name} text={name} /> */}
        </div>
      );
    case 'transaction':
      return <div style={{ fontWeight: 'bold' }}>{item.doc.transaction.name}</div>;
    default:
      return null;
  }
}

function RelatedErrors({ t, item, errorCount, params }: { t: any; item: any; errorCount: number; params: any }) {
  if (errorCount > 0) {
    const timeRange = conversionTime(params.start, params.end);
    const duration = timeRange.end - timeRange.start;
    // 小于25小时（90000000），默认选择前一天，大于等于25小时，小于8天（691200000），默认选择上一周，大于等于8天，默认选择计算出来的日期
    let contrast_time_default = duration < 90000000 ? '1' : duration >= 691200000 ? '100' : '7';
    return (
      <Link
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
        }}
        to={{
          pathname: '/service-tracking/error',
          search: `data_id=${params.data_id}&bgid=${params.bgid}&serviceName=${item.doc.service.name}&transactionType=${
            params.transactionType
          }&environment=${params.environment}&start=${params.start}&end=${params.end}&filter=trace.id : "${
            params.traceId
          }" and transaction.id : "${item.doc.transaction.id}"&contrast_time=${contrast_time_default}${
            params.fieldRecord ? `&fieldRecord=${encodeURIComponent(params.fieldRecord)}` : ''
          }`,
        }}
      >
        <Tag color='#bd271e' className='jump-link'>
          <RightOutlined /> 查看{errorCount}个相关错误
        </Tag>
      </Link>
    );
  }
  if (item?.doc?.event?.outcome !== 'failure') {
    return null;
  }

  return (
    <Tooltip title='event.outcome = failure'>
      <Tag color='#bd271e'>failure</Tag>
    </Tooltip>
  );
}

const agentsSyncMap: Record<string, boolean> = {
  nodejs: true,
  'js-base': true,
  'rum-js': true,
  php: false,
  python: false,
  dotnet: false,
  'iOS/swift': false,
  ruby: false,
  java: false,
  go: false,
};

export function getSyncLabel(agentName: string, sync?: boolean) {
  if (sync === undefined) {
    return;
  }

  const agentSyncValue = agentsSyncMap[agentName];
  if (sync && agentSyncValue) {
    return 'blocking';
  }

  if (!sync && !agentSyncValue) {
    return 'async';
  }
}

export function SyncBadge({ sync, agentName }) {
  const syncLabel = getSyncLabel(agentName, sync);
  if (!syncLabel) {
    return null;
  }

  return <Tag>{syncLabel}</Tag>;
}

export function WaterfallItem({
  timelineMargins,
  totalDuration,
  item,
  hasToggle,
  color,
  isSelected,
  errorCount,
  marginLeftLevel,
  onClick,
  segments,
}: IWaterfallItemProps) {
  const { t } = useTranslation('traces');
  const [widthFactor, setWidthFactor] = useState(1);
  const waterfallItemRef: React.RefObject<any> = useRef(null);
  const { search } = useLocation();
  const params = queryString.parse(search);
  useEffect(() => {
    if (waterfallItemRef?.current && marginLeftLevel) {
      setWidthFactor(1 + marginLeftLevel / waterfallItemRef.current.offsetWidth);
    }
  }, [marginLeftLevel]);

  if (!totalDuration) {
    return null;
  }

  const width = (item.duration / totalDuration) * widthFactor * 100;
  const left = (((item.offset + item.skew) / totalDuration) * widthFactor - widthFactor + 1) * 100;

  const isCompositeSpan = item.docType === 'span' && item.doc.span.composite;

  const itemBarStyle = getItemBarStyle(item, color, width, left);

  const isServerlessColdstart = item.docType === 'transaction' && item.doc.faas?.coldstart;

  const waterfallItemFlyoutTab = 'metadata';
  const linkTotal = item.spanLinksCount.linkedParents + item.spanLinksCount.linkedChildren;
  return (
    <div
      className='water-fall-item-wrapper'
      style={{
        marginRight: `${timelineMargins.right}px`,
        marginLeft: `${hasToggle ? timelineMargins.left - 30 : timelineMargins.left}px`,
        backgroundColor: isSelected ? 'rgb(245, 247, 250)' : 'initial',
      }}
      ref={waterfallItemRef}
      // type={item.docType}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        if (item.doc.allTrace) {
          message.warning(t('detail_perm'));
        } else {
          onClick(waterfallItemFlyoutTab);
        }
      }}
    >
      <div // using inline styles instead of props to avoid generating a css class for each item
        style={{ ...itemBarStyle, backgroundColor: isCompositeSpan ? 'transparent' : color }}
        className='water-fall-item-bar'
      ></div>
      <div // using inline styles instead of props to avoid generating a css class for each item
        className='water-fall-item-text'
        style={{ minWidth: `${Math.max(100 - left, 0)}%` }}
      >
        <SpanActionToolTip item={item}>
          <PrefixIcon item={item} />
        </SpanActionToolTip>
        <HttpStatusCode item={item} />
        <NameLabel item={item} />

        <Duration item={item} />
        <RelatedErrors t={t} item={item} errorCount={errorCount} params={params} />
        {item.docType === 'span' && <SyncBadge sync={item.doc.span.sync} agentName={item.doc.agent.name} />}
        {/* 跨度 */}
        {item.spanLinksCount.linkedParents || item.spanLinksCount.linkedChildren ? (
          <Tooltip
            title={
              <>
                <div>
                  {t('span_link.find')} {linkTotal} {t('span_link.link_num')}
                </div>
                <div>
                  {item.spanLinksCount.linkedChildren} {t('span_link.in')}
                </div>
                <div>
                  {item.spanLinksCount.linkedParents} {t('span_link.out')}
                </div>
              </>
            }
          >
            <Tag color='#d3dae6' style={{ color: '#000000' }}>
              {linkTotal} {t('span_link.link_num')}
            </Tag>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}

function getItemBarStyle(item: any, color: string, width: number, left: number): React.CSSProperties {
  let itemBarStyle = { left: `${left}%`, width: `${width}%` };

  if (item.docType === 'span' && item.doc.span.composite) {
    const percNumItems = 100.0 / item.doc.span.composite.count;
    const spanSumRatio = item.doc.span.composite.sum.us / item.doc.span.duration.us;
    const percDuration = percNumItems * spanSumRatio;

    itemBarStyle = {
      ...itemBarStyle,
      ...{
        backgroundImage:
          `repeating-linear-gradient(90deg, ${color},` +
          ` ${color} max(${percDuration}%,3px),` +
          ` transparent max(${percDuration}%,3px),` +
          ` transparent max(${percNumItems}%,max(${percDuration}%,3px) + 3px))`,
      },
    };
  }

  return itemBarStyle;
}
