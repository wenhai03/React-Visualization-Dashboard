import React, { useEffect, useState } from 'react';
import { SearchOutlined, CloseOutlined } from '@ant-design/icons';
import { Input, Modal, Empty, Tooltip, Row, Col, Button } from 'antd';

interface IHistoryRecordProps {
  show: boolean;
  updateShow(show: boolean): void;
  insertAtCursor(query: string): void;
  groupId: number;
}

const HistoryRecord: React.FC<IHistoryRecordProps> = ({ groupId, show, updateShow, insertAtCursor }) => {
  const [record, setRecord] = useState<string[]>([]);
  const [filteredRecord, setFilteredRecord] = useState<string[]>(record);
  const localRecord = localStorage.getItem('metrics-promql-history-record');
  const recordData = localRecord ? JSON.parse(localRecord) : {};

  function checkMetric(value: string) {
    insertAtCursor(value);
    updateShow(false);
  }

  useEffect(() => {
    if (show) {
      setRecord(recordData?.[groupId] || []);
      setFilteredRecord(recordData?.[groupId] || []);
    }
  }, [show]);

  return (
    <Modal
      className='prom-graph-metrics-explorer-modal'
      width={540}
      visible={show}
      title='Historical record'
      footer={null}
      onCancel={() => updateShow(false)}
      getContainer={false}
    >
      <Row gutter={16}>
        <Col flex='auto'>
          <Input
            prefix={<SearchOutlined />}
            onPressEnter={(e) => {
              e.preventDefault();
              const value = e.currentTarget.value;
              setFilteredRecord(record.filter((item) => item.includes(value)));
            }}
          />
        </Col>
        <Col>
          <Button
            onClick={() => {
              setRecord([]);
              setFilteredRecord([]);
              localStorage.setItem('metrics-promql-history-record', JSON.stringify({ ...recordData, [groupId]: [] }));
            }}
          >
            clear
          </Button>
        </Col>
      </Row>

      <div
        className='prom-graph-metrics-explorer-list'
        onClick={(e) => checkMetric((e.target as HTMLElement).innerText)}
      >
        {filteredRecord.length ? (
          filteredRecord.map((item) => (
            <Tooltip title={item}>
              <div className='prom-graph-metrics-explorer-list-item' key={item}>
                <div className='metrics-content'>{item}</div>
                <CloseOutlined
                  className='close-icon'
                  onClick={(e) => {
                    e.stopPropagation();
                    const data = record.filter((ele) => ele !== item);
                    const filterData = filteredRecord.filter((ele) => ele !== item);
                    setRecord(data);
                    setFilteredRecord(filterData);
                    localStorage.setItem(
                      'metrics-promql-history-record',
                      JSON.stringify({ ...recordData, [groupId]: data }),
                    );
                  }}
                />
              </div>
            </Tooltip>
          ))
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>
    </Modal>
  );
};

export default HistoryRecord;
