import React, { useState, ReactNode } from 'react';
import { Row, Col, Spin, Empty, Button, Popover, Divider, Drawer, Table, Affix, Space } from 'antd';
import '@/pages/logs/Stream/index.less';
import { useTranslation } from 'react-i18next';
import FieldIcon from '@/pages/logs/components/FieldIcon';
import _ from 'lodash';
import DOMPurify from 'dompurify';
import { highlightFieldValue } from '@/pages/logs/Stream';
import '@/pages/logs/locale';
import {
  formatMessageSegments,
  compileFormattingRules,
  getFieldsToShow,
  getMoment,
  getHighlightHtml,
} from '@/pages/logs/utils';
import { getBuiltinRules } from '@/pages/logs/utils/generic';

interface ILogStreamProps {
  /**
   * 日志流数据
   */
  logStream: any;
  /**
   * 日志流数据请求状态
   */
  loading: boolean;
  /**
   * 日志流查询类型：app、host、pod、container、syslog、graf、k8s-event、index、view。链路日志：apm
   */
  type: string;
  /**
   * 当前关键字高亮的日志id
   */
  activeId?: string;
  /**
   * 时间戳字段
   */
  time_field: string;
  /**
   * 自定义展示列
   */
  columnsConfigs: Record<string, { name: string; visible: boolean }[]>;
  /**
   * 定制样式：文本大小、长换行
   */
  customStyle: { scale: 'small' | 'medium' | 'large'; wrap: 'wrap' | 'no-warp' };
  /**
   * 控制滚动加载更多
   */
  scrollRef?: any;
  /**
   * 日志流列表样式
   */
  wrapperStyle?: any;
  /**
   * 日志流列表样式
   */
  footer?: ReactNode;
  fieldcaps?: any;
  /**
   * 时区
   */
  timezone: string;
  /**
   * 时间字段列表
   */
  timeField: string[];
}

const LogStreamHeader = (time_field, columnsConfigs, type, t) => (
  <Row className='log-stream-header'>
    <Col flex='130px'>{time_field}</Col>
    {columnsConfigs[type].map(
      (item) =>
        item.visible && (
          <Col
            flex={
              item.name === '消息' || item.name === 'message' || type === 'index' || type === 'view'
                ? 'auto'
                : item.name === 'log.level'
                ? '70px'
                : item.name === 'service.environment' || item.name === 'type'
                ? '80px'
                : item.name === 'involvedObject.kind'
                ? '100px'
                : item.name === 'reason' || item.name === 'involvedObject.name'
                ? '250px'
                : '150px'
            }
            key={item.name}
          >
            {type !== 'index' && type !== 'view' ? t(`stream.${item.name}`) : item.name}
          </Col>
        ),
    )}
  </Row>
);

const LogStream: React.FC<ILogStreamProps> = (props) => {
  const { t } = useTranslation('logs');
  const {
    loading,
    logStream,
    time_field,
    scrollRef,
    wrapperStyle,
    type,
    customStyle,
    columnsConfigs,
    activeId,
    footer,
    fieldcaps,
    timezone,
    timeField,
  } = props;
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selected, setSelected] = useState<{ fields: any; highlight?: any }>({ fields: [] });

  return (
    <>
      {!_.isEmpty(logStream) ? (
        <Spin spinning={loading}>
          {/* 表头 */}
          {type === 'apm' ? (
            <Affix offsetTop={38} target={() => document.getElementById('traces-detail')}>
              {LogStreamHeader(time_field, columnsConfigs, type, t)}
            </Affix>
          ) : (
            LogStreamHeader(time_field, columnsConfigs, type, t)
          )}
          <div className='log-stream-view-wrapper' ref={scrollRef} style={wrapperStyle}>
            {logStream.map((item, idx) => {
              const currentTimestamp = item.fields[time_field];
              let showDate = false;

              if (idx > 0) {
                const prevTimestamp = logStream[idx - 1].fields[time_field];
                showDate = !getMoment(currentTimestamp, timezone).isSame(prevTimestamp, 'day');
              }
              return (
                <div
                  key={item['_id']}
                  id={item['_id']}
                  data-is-highlight={Boolean(item.highlights)}
                  data-time={item.sort[0]}
                >
                  {showDate && (
                    <Divider orientation='left' orientationMargin='0' style={{ fontWeight: 'bold', fontSize: '15px' }}>
                      {getMoment(item.fields[time_field], timezone).format('YYYY-MM-DD')}
                    </Divider>
                  )}

                  <Row wrap={false} className={`log-stream-row log-text-${customStyle.scale}`}>
                    <Popover
                      content={
                        <div>
                          <Button
                            type='link'
                            onClick={() => {
                              let data: any = [];
                              if (fieldcaps?.length) {
                                const fieldsToShow = getFieldsToShow(Object.keys(item.fields), fieldcaps, false);
                                data = fieldcaps
                                  .filter((ele) => fieldsToShow.includes(ele.name))
                                  .map((field) => ({
                                    ...field,
                                    value: item.fields[field.name],
                                  }));
                              } else {
                                data = Object.entries(item.fields).map(([key, value]) => ({
                                  name: key,
                                  value: value,
                                }));
                              }

                              setSelected({ fields: data, highlight: item.highlight });
                              setDrawerVisible(true);
                            }}
                          >
                            查看详情
                          </Button>
                        </div>
                      }
                      trigger='hover'
                      placement='bottomLeft'
                    >
                      <Button type='primary' className='log-detail-btn'>
                        。。。
                      </Button>
                    </Popover>
                    <Col flex='130px'>
                      <span
                        title={getMoment(item.fields[time_field || '@timestamp'], timezone).format(
                          'YYYY-MM-DD HH:mm:ss.SSS',
                        )}
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(
                            item.highlight?.[time_field || '@timestamp']
                              ? getHighlightHtml(
                                  getMoment(item.fields[time_field || '@timestamp'], timezone).format('HH:mm:ss.SSS'),
                                  item.highlight?.[time_field || '@timestamp'],
                                )
                              : getMoment(item.fields[time_field || '@timestamp'], timezone).format('HH:mm:ss.SSS'),
                          ),
                        }}
                      />
                    </Col>
                    {columnsConfigs[type].map((ele) => {
                      let data = item.highlight ? { ...item.highlight } : {};
                      const newField = {};
                      if (ele.name === '消息') {
                        Object.entries(item.highlight || {}).forEach(([key, value]: [string, any]) => {
                          data[key] = item.highlights?.[key]
                            ? item.fields[key]
                            : getHighlightHtml(
                                timeField?.includes(key)
                                  ? getMoment(item.fields[key], timezone).format('YYYY-MM-DD HH:mm:ss.SSS')
                                  : _.escape(item.fields[key]),
                                value,
                              );
                        });
                        Object.entries(item.fields || {}).forEach(([key, value]: [string, any]) => {
                          newField[key] = timeField?.includes(key)
                            ? getMoment(item.fields[key], timezone).format('YYYY-MM-DD HH:mm:ss.SSS')
                            : _.escape(item.fields[key]);
                        });
                      }

                      return (
                        ele.visible && (
                          <Col
                            flex={
                              ele.name === '消息' || ele.name === 'message' || type === 'index' || type === 'view'
                                ? 'auto'
                                : ele.name === 'log.level'
                                ? '70px'
                                : ele.name === 'service.environment' || ele.name === 'type'
                                ? '80px'
                                : ele.name === 'involvedObject.kind'
                                ? '100px'
                                : ele.name === 'reason' || ele.name === 'involvedObject.name'
                                ? '250px'
                                : '150px'
                            }
                            key={ele.name}
                          >
                            <div
                              className={`log-entry-row-wrapper ${
                                customStyle.wrap === 'wrap' ? 'log-entry-wrap' : 'log-entry-nowrap'
                              }`}
                            >
                              <span title={item.fields[ele.name]}>
                                {ele.name === '消息' ? (
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: DOMPurify.sanitize(
                                        formatMessageSegments(
                                          compileFormattingRules(getBuiltinRules(['message'])).format(
                                            {
                                              ...newField,
                                              ...data,
                                            },
                                            item.highlights?.[ele.name] || [],
                                          ),
                                          item.highlights?.[ele.name] || [],
                                          item._id === activeId,
                                        )
                                          .map((item) => `<span>${item}</span>`)
                                          .join(''),
                                      ),
                                    }}
                                  />
                                ) : item.highlights?.[ele.name] ? (
                                  highlightFieldValue(
                                    timeField?.includes(ele.name)
                                      ? getMoment(item.fields[ele.name], timezone).format('YYYY-MM-DD HH:mm:ss.SSS')
                                      : _.escape(item.fields[ele.name]),
                                    item.highlights?.[ele.name] || [],
                                    item._id === activeId,
                                  )
                                ) : (
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: DOMPurify.sanitize(
                                        getHighlightHtml(
                                          timeField?.includes(ele.name)
                                            ? getMoment(item.fields[ele.name], timezone).format(
                                                'YYYY-MM-DD HH:mm:ss.SSS',
                                              )
                                            : _.escape(item.fields[ele.name]),
                                          item.highlight?.[ele.name],
                                        ),
                                      ),
                                    }}
                                  />
                                )}
                              </span>
                            </div>
                          </Col>
                        )
                      );
                    })}
                  </Row>
                </div>
              );
            })}
            {footer}
          </div>
        </Spin>
      ) : (
        <div className='empty-wrapper'>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )}
      <Drawer
        width='50%'
        title={t('explorer.detail')}
        placement='right'
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
      >
        <Table
          size='small'
          tableLayout='fixed'
          columns={[
            {
              title: 'Field',
              dataIndex: 'name',
              width: '260px',
              render: (text, record: { esTypes: string[] }) => {
                return (
                  <Space>
                    <FieldIcon type={record.esTypes?.[0]} />
                    {text}
                  </Space>
                );
              },
            },
            {
              title: 'Value',
              dataIndex: 'value',
              render: (text, record: any) => {
                if (Array.isArray(text)) {
                  const data = _.escape(JSON.stringify(text));
                  return (
                    <span style={{whiteSpace: 'pre-wrap'}}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          selected.highlight?.[record.name]
                            ? getHighlightHtml(data, selected.highlight?.[record.name])
                            : data,
                        ),
                      }}
                    />
                  );
                } else {
                  const isTimeField = timeField?.includes(record.name);
                  const value = isTimeField ? getMoment(text, timezone).format() : _.escape(text);
                  return (
                    <span style={{whiteSpace: 'pre-wrap'}}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          selected.highlight?.[record.name]
                            ? getHighlightHtml(value, selected.highlight?.[record.name])
                            : value,
                        ),
                      }}
                    />
                  );
                }
              },
            },
          ]}
          dataSource={selected.fields.sort(function (a: { name: string }, b: { name: string }) {
            return a.name.localeCompare(b.name);
          })}
          pagination={{
            total: Object.keys(selected.fields).length,
            showQuickJumper: true,
            showSizeChanger: true,
            showTotal: (total) => {
              return t('common:table.total', { total });
            },
            pageSizeOptions: ['15', '50', '100', '300'],
            defaultPageSize: 30,
          }}
          scroll={{ y: 'calc(100vh - 180px)' }}
        />
      </Drawer>
    </>
  );
};

export default LogStream;
