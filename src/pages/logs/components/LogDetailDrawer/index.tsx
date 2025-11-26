import React, { useEffect, useState } from 'react';
import { Drawer, Tabs, Table, Pagination, Spin, Space } from 'antd';
import DOMPurify from 'dompurify';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { copyToClipBoard } from '@/utils';
import { CopyOutlined } from '@ant-design/icons';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { json } from '@codemirror/lang-json';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import TraceDetail from '../TraceDetail';
import FieldIcon from '../FieldIcon';
import { getFieldsToShow, getHighlightHtml, getMoment } from '../../utils';

const LogDetailDrawer = ({
  visible,
  onClose,
  selected,
  logTable,
  fieldcaps,
  filterData,
  timezone,
  setSelected,
  handleJson,
  detailJson,
  detailJsonLoading,
  params,
}) => {
  const { t } = useTranslation('logs');
  const [activeKey, setActiveKey] = useState('table');
  const [traceFilter, setTraceFilter] = useState<{
    transactionType?: string;
    traceId?: string;
    timestamp?: string;
    serviceName?: string;
  }>({});

  useEffect(() => {
    if (selected) {
      setTraceFilter({
        transactionType: selected.json?.['transaction.type'],
        traceId: selected.json?.['trace.id'],
        timestamp: selected.json?.['@timestamp'],
        serviceName: selected.json?.['service.name'],
      });
    }
  }, [JSON.stringify(selected)]);
  // 日志详情弹窗
  const logDetail = (t, data) => {
    // 保证 对象转字符串，属性顺序不受影响
    const orderedObject = new Map();
    Object.entries(data)
      .sort(function ([key1, value1], [key2, value2]) {
        return key1.localeCompare(key2);
      })
      .forEach(([key, value]) => {
        orderedObject.set(key, value);
      });
    let value = '';
    try {
      value = JSON.stringify(Object.fromEntries(orderedObject), null, 4);
    } catch (e) {
      console.error(e);
      value = t('explorer.unable_parse');
    }
    return (
      <>
        <a
          style={{ textAlign: 'right', display: 'block', marginBottom: '6px' }}
          onClick={() => copyToClipBoard(value, (val) => val)}
        >
          <CopyOutlined />
          {t('copy')}
        </a>
        <CodeMirror
          value={value}
          height='calc(100vh - 172px)'
          theme='light'
          basicSetup={false}
          editable={false}
          extensions={[
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            json(),
            EditorView.lineWrapping,
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
      </>
    );
  };

  return (
    <Drawer
      width='50%'
      title={t('explorer.detail')}
      placement='right'
      mask={false}
      onClose={() => {
        setActiveKey('table');
        onClose && onClose();
      }}
      visible={visible}
      style={{ transform: 'none' }}
    >
      <Tabs
        activeKey={activeKey}
        onChange={(key) => {
          setActiveKey(key);
          if (key === 'json' && selected?.id) {
            handleJson(selected.id, selected.index);
          }
        }}
        destroyInactiveTabPane
        tabBarExtraContent={
          <Pagination
            simple
            pageSize={1}
            current={logTable.findIndex((item) => item.id === selected?.id) + 1 || 1}
            total={logTable.length}
            onChange={(page) => {
              const current = logTable[page - 1];
              let data: any = [];
              let jsonData = {};
              if (fieldcaps?.length) {
                // 过滤衍生字段
                const fieldsToShow = getFieldsToShow(Object.keys(current.fields), fieldcaps || [], false);
                data = fieldcaps
                  .filter((ele) => fieldsToShow.includes(ele.name))
                  .map((field) => {
                    jsonData[field.name] = current.fields[field.name];
                    return {
                      ...field,
                      value: current.fields[field.name],
                    };
                  });
              } else {
                jsonData = current.fields;
                data = Object.entries(current.fields).map(([key, value]) => ({
                  name: key,
                  value: value,
                }));
              }
              setSelected({ ...current, fields: data, json: jsonData });
              // 如果不存在trace.id,tab 切换到table
              if (activeKey === 'trace' && !jsonData['trace.id']) {
                setActiveKey('table');
              }
              if (activeKey === 'json') {
                handleJson(current.id, current.index);
              }
            }}
          />
        }
      >
        <Tabs.TabPane tab='Table' key='table'>
          <Table
            size='small'
            columns={[
              {
                title: 'Field',
                dataIndex: 'name',
                width: '260px',
                render: (text, record: any) => (
                  <Space>
                    <FieldIcon type={record.esTypes?.[0]} />
                    {text}
                  </Space>
                ),
              },
              {
                title: 'Value',
                dataIndex: 'value',
                render: (text, record) => {
                  const isTimeField = filterData?.time_formats?.fields?.includes(record.name);
                  const value = isTimeField ? getMoment(text, timezone).format() : _.escape(text);
                  return (
                    <span style={{whiteSpace: 'pre-wrap'}}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          selected?.highlight?.[record.name]
                            ? getHighlightHtml(value, selected.highlight[record.name])
                            : value,
                        ),
                      }}
                    />
                  );
                },
              },
            ]}
            dataSource={selected?.fields?.sort((a, b) => a.name.localeCompare(b.name))}
            scroll={{ y: 'calc(100vh - 238px)' }}
            pagination={false}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab='Json' key='json'>
          <Spin spinning={detailJsonLoading}>{logDetail(t, detailJson)}</Spin>
        </Tabs.TabPane>
        {selected.json?.['trace.id'] && (
          <Tabs.TabPane tab='Trace' key='trace'>
            <TraceDetail data_id={params.data_id} bgid={params.bgid} {...traceFilter} />
          </Tabs.TabPane>
        )}
      </Tabs>
    </Drawer>
  );
};

export default LogDetailDrawer;
