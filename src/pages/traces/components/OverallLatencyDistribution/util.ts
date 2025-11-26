import moment from 'moment';
import { memoize, isFinite } from 'lodash';
import numeral from '@elastic/numeral';
import { convertTo } from '@/pages/traces/utils';
import { SPAN_DURATION, TRANSACTION_DURATION, TRANSACTION_DURATION_HISTOGRAM } from '../../utils/apm';

export function isFiniteNumber(value: any): value is number {
  return isFinite(value);
}

export enum LatencyDistributionChartType {
  transactionLatency = 'transactionLatency',
  latencyCorrelations = 'latencyCorrelations',
  failedTransactionsCorrelations = 'failedTransactionsCorrelations',
  dependencyLatency = 'dependencyLatency',
}

const { transactionLatency, latencyCorrelations, failedTransactionsCorrelations, dependencyLatency } =
  LatencyDistributionChartType;

export const toMicroseconds = (value: number, timeUnit) => moment.duration(value, timeUnit).asMilliseconds() * 1000;

function getDurationUnitKey(max: number, threshold = 10) {
  if (max > toMicroseconds(threshold, 'hours')) {
    return 'hours';
  }
  if (max > toMicroseconds(threshold, 'minutes')) {
    return 'minutes';
  }
  if (max > toMicroseconds(threshold, 'seconds')) {
    return 'seconds';
  }
  if (max > toMicroseconds(1, 'milliseconds')) {
    return 'milliseconds';
  }
  return 'microseconds';
}

export function asInteger(value?: number | null) {
  if (!isFiniteNumber(value)) {
    return 'NOT_AVAILABLE_LABEL';
  }

  return numeral(value).format('0,0');
}

export function getDurationField(chartType: LatencyDistributionChartType, searchMetrics: boolean) {
  switch (chartType) {
    case transactionLatency:
      if (searchMetrics) {
        return TRANSACTION_DURATION_HISTOGRAM;
      }
      return TRANSACTION_DURATION;
    case latencyCorrelations:
      return TRANSACTION_DURATION;
    case failedTransactionsCorrelations:
      return TRANSACTION_DURATION;
    case dependencyLatency:
      return SPAN_DURATION;
    default:
      return TRANSACTION_DURATION;
  }
}

export const getDurationFormatter = memoize(
  (max: number, threshold: number = 10, scalingFactor: number = 1) => {
    const unit = getDurationUnitKey(max, threshold);
    return (value, { defaultValue }: any = {}) => {
      return convertTo({
        unit,
        microseconds: isFiniteNumber(value) ? value * scalingFactor : value,
        defaultValue,
        threshold,
      });
    };
  },
  (max, threshold) => `${max}_${threshold}`,
);
