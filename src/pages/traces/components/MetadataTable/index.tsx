import React, { useEffect, useState, useContext } from 'react';
import { List, Row, Col, Spin, Tooltip, Empty, Tabs, Collapse } from 'antd';
import { CommonStateContext } from '@/App';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import queryString from 'query-string';
import { useLocation } from 'react-router-dom';
import { sql, MySQL } from '@codemirror/lang-sql';
import _ from 'lodash';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { SERVICE_NAME, SPAN_DESTINATION_SERVICE_RESOURCE, SPAN_NAME, TRANSACTION_NAME } from '../../utils/apm';
import { getSectionsFromFields, calculationTime } from '../../utils';
import { getAPMErroMmetadata } from '@/services/traces';
import SpanLink from '../../components/SpanLink';
import TransactionSummary from '../../components/TransationSmmary';
import '@/pages/traces/error/index.less';

const { TabPane } = Tabs;

interface IMetadataTableProps {
  data_id: string;
  processorEvent: string;
  transactionId?: string;
  id?: string;
  time: number;
  duration: number;
  type: 'tab' | 'drawer';
  span?: any;
  doc?: any;
  getErrorCount?: (id?: string) => number;
  spanLinksCount?: { linkedChildren: number; linkedParents: number };
  linkedChildren?: { trace_id: string; span_id: string }[];
  linkedParents?: { trace_id: string; span_id: string }[];
  timeRange?: { start: number; end: number };
  onClose?: () => void;
}

interface IMetadataProps {
  key: string;
  label: string;
  properties: { field: string; value: string[] }[];
}

// 元数据公共模块
const MetaList = ({ metaData }) => {
  return !_.isEmpty(metaData) ? (
    metaData.map((meta) => (
      <List
        key={meta.key}
        style={{ marginBottom: '10px' }}
        header={<div style={{ fontWeight: 'bold' }}>{meta.label}</div>}
        bordered
        dataSource={meta.properties}
        renderItem={(item: any) => (
          <List.Item>
            <Row style={{ width: '100%' }}>
              <Col span={10}>{item.field}</Col>
              <Col span={14}>
                {item.field === '@timestamp'
                  ? moment(item.value, moment.ISO_8601).format('YYYY-MM-DD HH:mm:ss.SSS')
                  : item.value.map((ele) => {
                      if (typeof ele === 'object') {
                        return JSON.stringify(ele);
                      }
                      return ele;
                    })}
              </Col>
            </Row>
          </List.Item>
        )}
      />
    ))
  ) : (
    <div className='empty-wrapper'>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
    </div>
  );
};

const MetadataTable: React.FC<IMetadataTableProps> = (props) => {
  const {
    data_id,
    processorEvent,
    id,
    time,
    duration,
    type,
    span,
    doc,
    getErrorCount = () => 0,
    spanLinksCount,
    linkedChildren,
    linkedParents,
    timeRange,
    onClose,
  } = props;
  const { search } = useLocation();
  const { t } = useTranslation('traces');
  const { curBusiId } = useContext(CommonStateContext);
  const [loading, setLoading] = useState(false);
  const [metaData, setMetadate] = useState<IMetadataProps[]>([]);
  const { serviceName, transactionName } = queryString.parse(search);
  const dependencyStickyProperties = span?.destination?.service.resource
    ? [
        {
          label: t('dependency'),
          fieldName: SPAN_DESTINATION_SERVICE_RESOURCE,
          value: span.destination?.service.resource,
        },
      ]
    : [];

  const spanStickyProperties = span?.name
    ? [
        {
          label: t('name'),
          fieldName: SPAN_NAME,
          value: span?.name ?? 'no data',
          truncated: true,
        },
      ]
    : [];

  const stickyProperties = [
    ...spanStickyProperties,
    ...dependencyStickyProperties,
    {
      label: t('serviceName'),
      fieldName: SERVICE_NAME,
      value: doc?.service?.name ?? serviceName,
    },
    {
      label: t('transaction_name'),
      fieldName: TRANSACTION_NAME,
      value: doc?.transaction?.name ?? transactionName,
    },
    ,
  ];

  // 分组堆栈追溯
  const stackGroup: any = [];
  let count = -1;
  span?.stacktrace?.forEach((element) => {
    if (element.library_frame) {
      if (Array.isArray(stackGroup[count])) {
        stackGroup[count].push(`${element.classname}.${element.function}(${element.filename}:${element.line.number})`);
      } else {
        count = count + 1;
        stackGroup[count] = [];
        stackGroup[count].push(`${element.classname}.${element.function}(${element.filename}:${element.line.number})`);
      }
    } else {
      count = count + 1;
      stackGroup[count] = `${element.classname}.${element.function}(${element.filename}:${element.line.number})`;
    }
  });
  useEffect(() => {
    const timeRange = calculationTime(time, duration);
    setLoading(true);
    getAPMErroMmetadata(id, {
      busi_group_id: Number(curBusiId),
      datasource_id: Number(data_id),
      ...timeRange,
      event: processorEvent,
    })
      .then((res) => {
        const result = _.get(res, 'dat.hits.hits[0].fields');
        const data = result ?? {
          ...(props.doc.transaction?.id ? { 'transaction.id': [props.doc.transaction.id] } : {}),
          ...(props.doc.trace?.id ? { 'trace.id': [props.doc.trace.id] } : {}),
          ...(props.doc.span?.id ? { 'span.id': [props.doc.span.id] } : {}),
        };
        const sections = getSectionsFromFields(data);
        setLoading(false);
        setMetadate(sections);
      })
      .catch((err) => {
        setLoading(false);
      });
  }, [id]);
  return (
    <Spin spinning={loading}>
      {type === 'drawer' ? (
        <>
          <div className='metadata-header'>
            <Row gutter={24} style={{ lineHeight: '30px' }}>
              {stickyProperties.map((item: { label: string; value: string; fieldName: string }) => (
                <Col span={6}>
                  <div className='metadata-header-info-key'>{item.label}</div>
                  <div className='metadata-header-info-value'>
                    <Tooltip title={item.value}>{item.value}</Tooltip>
                  </div>
                </Col>
              ))}
            </Row>
            <TransactionSummary
              errorCount={getErrorCount(id)}
              totalDuration={duration}
              doc={doc}
              docType={processorEvent as 'span' | 'transaction'}
            />
          </div>
          {span?.db?.statement &&
            metaData
              ?.find((item) => item.key === 'span')
              ?.properties?.find((ele) => ele.field === 'span.db.statement') && (
              <div className='metadata-codemirror-wrapper'>
                <div className='metadata-codemirror-title'>{t('database_statement')}</div>
                <CodeMirror
                  height='auto'
                  theme='light'
                  basicSetup
                  value={span?.db?.statement}
                  editable={false}
                  extensions={[
                    EditorView.lineWrapping,
                    sql({ dialect: MySQL }),
                    EditorView.theme({
                      '&': {
                        backgroundColor: '#F6F6F6 !important',
                      },
                      '&.cm-editor.cm-focused': {
                        outline: 'unset',
                      },
                    }),
                  ]}
                />
              </div>
            )}
          <Tabs>
            <TabPane tab={t('metadata')} key='meta'>
              <MetaList metaData={metaData} />
            </TabPane>
            {span?.stacktrace && (
              <TabPane tab={t('stacktrace')} key='stacktrace' className='apm-error-detail'>
                <Collapse ghost>
                  {stackGroup.map((item, stackIndex) =>
                    Array.isArray(item) ? (
                      // 当只有一个分组时，铺开展示
                      stackGroup.length === 1 ? (
                        <div className='apm-error-detail-collapse'>
                          {item.map((ele, index) => (
                            <div key={index} style={{ color: 'rgb(105, 112, 125)' }}>
                              <span className='stack-at-text'>at</span>
                              <span>{ele}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Collapse.Panel
                          header={`${item.length} 个库帧`}
                          key={stackIndex}
                          className='apm-error-detail-collapse'
                        >
                          {item.map((ele, index) => (
                            <div key={index} style={{ color: 'rgb(105, 112, 125)' }}>
                              <span className='stack-at-text'>at</span>
                              <span>{ele}</span>
                            </div>
                          ))}
                        </Collapse.Panel>
                      )
                    ) : (
                      <div key={stackIndex} className='apm-error-detail-collapse'>
                        <span className='stack-at-text'>at</span>
                        <span>{item}</span>
                      </div>
                    ),
                  )}
                </Collapse>
              </TabPane>
            )}
            {!spanLinksCount?.linkedChildren && !spanLinksCount?.linkedParents ? null : (
              <TabPane
                tab={`${t('span_link.title')} ${spanLinksCount.linkedChildren + spanLinksCount.linkedParents}`}
                key='spanLinks'
              >
                <SpanLink
                  curBusiId={curBusiId}
                  data_id={Number(data_id)}
                  linkedChildren={linkedChildren}
                  linkedParents={linkedParents}
                  timeRange={timeRange!}
                  onClose={onClose!}
                  setLoading={setLoading}
                />
              </TabPane>
            )}
          </Tabs>
        </>
      ) : (
        <MetaList metaData={metaData} />
      )}
    </Spin>
  );
};

export default MetadataTable;
