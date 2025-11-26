import React from 'react';
import { Space, Tooltip, Tag } from 'antd';
import { asDuration } from '@/pages/traces/utils';
import { statusCodes, httpStatusCodeToColor } from '../utils/constant';
import moment from 'moment';
import { useTranslation } from 'react-i18next';

interface Props {
  doc: any;
  totalDuration: number | undefined;
  errorCount: number;
  coldStartBadge?: boolean;
  docType: 'transaction' | 'span';
}

function getTransactionResultSummaryItem(t, transaction) {
  const result = transaction.transaction.result;
  const url = transaction.url?.full || transaction.transaction?.page?.url;

  if (url) {
    const method = transaction.http?.request?.method;
    const status = transaction.http?.response?.status_code;

    return (
      <Space>
        <div className='transation-smmary-url'>
          {method && (
            <Tooltip title='Request method'>
              <>{method.toUpperCase()}</>
            </Tooltip>
          )}
          &nbsp;
          <Tooltip title={url}>{url}</Tooltip>
        </div>
        {status && (
          <Tooltip title={t('status')}>
            <Tag color={httpStatusCodeToColor(status)}>
              {status} {statusCodes[status.toString()]}
            </Tag>
          </Tooltip>
        )}
      </Space>
    );
  }

  if (result) {
    return <Tooltip title='Result'>{result}</Tooltip>;
  }

  return null;
}

function formatTimezone(momentTime: moment.Moment) {
  const DEFAULT_TIMEZONE_FORMAT = 'Z';

  const utcOffsetHours = momentTime.utcOffset() / 60;

  const customTimezoneFormat = utcOffsetHours > 0 ? `+${utcOffsetHours}` : utcOffsetHours;

  const utcOffsetFormatted = Number.isInteger(utcOffsetHours) ? customTimezoneFormat : DEFAULT_TIMEZONE_FORMAT;

  return momentTime.format(`(UTC${utcOffsetFormatted})`);
}

const TransactionSummary: React.FC<Props> = ({ doc, totalDuration, coldStartBadge, errorCount, docType }) => {
  const { t } = useTranslation('traces');
  const time = Math.round(doc.timestamp.us / 1000);
  const momentTime = moment(time);
  const relativeTimeLabel = momentTime.fromNow();
  const absoluteTimeLabel = moment(time).format(`MMM D, YYYY, HH:mm:ss.SSS ${formatTimezone(moment(time))}`);
  const items = [
    <Tooltip title={absoluteTimeLabel}>{relativeTimeLabel}</Tooltip>,
    <Tooltip title={t('duration')}>{asDuration(doc[docType].duration.us)} &nbsp;</Tooltip>,
    getTransactionResultSummaryItem(t, doc),
    errorCount ? (
      <Tag color='#bd271e'>
        {errorCount} {t('error_count')}
      </Tag>
    ) : null,
    doc.user_agent ? (
      <Tooltip title={t('agent_and_version')}>
        {doc.user_agent.name}&nbsp;
        {doc.user_agent.version && <span>({doc.user_agent.version})</span>}
      </Tooltip>
    ) : null,
    coldStartBadge ? 'cold start' : null,
  ];

  return (
    <div style={{ margin: '12px 0 4px 0' }}>
      {items.filter(Boolean).map((item, index) => (
        <Space key={index}>
          {index > 0 && <div style={{ marginLeft: '4px' }}>|</div>}
          <div>{item}</div>
        </Space>
      ))}
    </div>
  );
};

export default TransactionSummary;
