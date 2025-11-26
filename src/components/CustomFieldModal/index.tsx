import React, { useState } from 'react';
import { Modal, Input, Collapse, Tag, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { SearchOutlined, CloseOutlined, PlusCircleFilled } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { getFieldsToShow } from '@/pages/logs/utils';
import './index.less';

interface IProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (value: any) => void;
  extra: React.ReactNode;
  fieldcaps: any;
  selectedFields: any;
  setSelectedFields: (selectedFields) => void;
  onReset?: () => void;
}

export default function ShieldIdentsModal(props: IProps) {
  const { t } = useTranslation('common');
  const { visible, onCancel, onOk, fieldcaps, selectedFields, setSelectedFields, extra, onReset } = props;
  // 自定义展示列筛选
  const [fieldSearch, setFieldSearch] = useState('');

  const fieldsToShow = getFieldsToShow(
    (fieldcaps || []).map((ele) => ele.name),
    fieldcaps,
    false,
  );
  const optionalField = (fieldcaps || []).filter((ele) => fieldsToShow.includes(ele.name));

  // 重新排序 helper 函数
  const reorder = (list: string[], startIndex: number, endIndex: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  // 自定义展示列拖拽
  const onDragEnd = (result) => {
    if (!result.destination) {
      return;
    }
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    const sortedData = reorder(selectedFields, sourceIndex, destIndex);
    setSelectedFields(sortedData);
  };

  return (
    <Modal
      width={540}
      visible={visible}
      title={t('custom_column')}
      onCancel={onCancel}
      maskClosable={false}
      footer={[
        <Button key='cancel' onClick={onCancel}>
          {t('common:btn.cancel')}
        </Button>,
        <Button key='reset' onClick={onReset}>
          {t('common:btn.reset')}
        </Button>,
        <Button key='ok' type='primary' onClick={onOk}>
          {t('common:btn.ok')}
        </Button>,
      ]}
    >
      {extra}
      <Input
        onChange={(e) => setFieldSearch(e.target.value)}
        style={{ margin: '10px 0' }}
        prefix={<SearchOutlined />}
      />
      <Collapse ghost defaultActiveKey={['selected', 'selectable']} className='custom-column-collapse'>
        {selectedFields.length && (
          <Collapse.Panel header={t('selected_field')} key='selected' extra={<Tag>{selectedFields.length}</Tag>}>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId='droppable'>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {selectedFields
                      .filter((field) => field.toLowerCase().includes(fieldSearch.toLowerCase()))
                      .map((item, index) => (
                        <Draggable key={item} draggableId={item} index={index}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                              <div className='custom-column-field'>
                                {item}
                                <CloseOutlined
                                  className='custom-column-operation-icon'
                                  style={{ color: '#bd271e' }}
                                  onClick={() => setSelectedFields(selectedFields.filter((ele) => ele !== item))}
                                />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </Collapse.Panel>
        )}
        <Collapse.Panel
          header={t('selectable_field')}
          key='selectable'
          extra={<Tag>{optionalField?.filter((item) => !selectedFields.includes(item.name)).length}</Tag>}
        >
          {optionalField
            ?.filter(
              (item) =>
                !selectedFields.includes(item.name) &&
                item.name !== '@timestamp' &&
                item.name.toLowerCase().includes(fieldSearch.toLowerCase()),
            )
            .map((item) => (
              <div className='custom-column-field' onClick={() => setSelectedFields([...selectedFields, item.name])}>
                {item.name}
                <PlusCircleFilled className='custom-column-operation-icon' style={{ color: '#0071c2' }} />
              </div>
            ))}
        </Collapse.Panel>
      </Collapse>
    </Modal>
  );
}
