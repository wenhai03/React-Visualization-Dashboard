import React, { useContext, useEffect } from 'react';
import { Form, Input, Button, Select, Row, Col, Tooltip, Modal, Alert } from 'antd';
import { CommonStateContext } from '@/App';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { MinusCircleOutlined, QuestionCircleOutlined, DragOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import RegexpTool from '@/components/RegexpTool';

const ProcessingRule = (props) => {
  const { t } = useTranslation('logs');
  const { curBusiGroup } = useContext(CommonStateContext);
  const [commonRuleForm] = Form.useForm();
  const { initialValues, visible, setVisible, form } = props;

  useEffect(() => {
    if (initialValues) {
      commonRuleForm.setFieldsValue(initialValues);
    }
  }, [initialValues]);

  // 重新排序 helper 函数
  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const onDragEnd = (result) => {
    if (!result.destination) {
      return;
    }
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    const formData = commonRuleForm.getFieldsValue();
    const matchMultiLine = formData.item_public_rules.filter((item) => item.type === 'multi_line');
    const matchOther = formData.item_public_rules.filter((item) => item.type !== 'multi_line');
    const sortedData = reorder(matchOther, sourceIndex, destIndex);
    formData.item_public_rules = [...matchMultiLine, ...sortedData];
    commonRuleForm.setFieldsValue(formData);
  };

  // 判断选项是否应禁用
  const isOptionDisabled = () => {
    const formData = commonRuleForm.getFieldsValue();
    const matchMultiLine = formData.item_public_rules?.filter((item) => item.type === 'multi_line');
    if (matchMultiLine?.length) {
      return true;
    }
    return false;
  };

  return (
    <Modal
      width={800}
      visible={visible}
      title={t('task.common_rule')}
      maskClosable={false}
      onOk={() => {
        commonRuleForm.validateFields().then((values) => {
          form.setFieldsValue(values);
          setVisible(false);
          commonRuleForm.resetFields();
        });
      }}
      onCancel={() => {
        setVisible(false);
        commonRuleForm.resetFields();
      }}
    >
      <Form form={commonRuleForm} layout='vertical'>
        <Form.List name='item_public_rules'>
          {(fields, { add, remove }) => (
            <>
              <Row gutter={8} justify='space-between' style={{ marginBottom: '10px' }}>
                <Col flex='auto'>
                  <Alert message={t('task.common_rule_alert')} type='info' showIcon />
                </Col>
                <Col style={{ margin: 'auto' }}>
                  {curBusiGroup.perm === 'rw' && (
                    <Button type='primary' onClick={() => add({ type: '', pattern: '' })}>
                      {t('common:btn.add')}
                    </Button>
                  )}
                </Col>
              </Row>
              <div style={{ height: 'calc(100vh - 328px)', overflowY: 'auto' }}>
                {fields
                  .filter(
                    (field) =>
                      _.get(commonRuleForm.getFieldsValue(), `item_public_rules.${field.name}.type`) === 'multi_line',
                  )
                  .map(({ key, name: ruleName, ...restField }) => (
                    <Row gutter={24} align='middle' style={{ margin: 0 }}>
                      <span
                        style={{
                          paddingLeft: '10px',
                          marginTop: '10px',
                          width: '22px',
                        }}
                      ></span>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          label={
                            <Tooltip
                              title={<pre style={{ margin: 0 }}>{t('task.rule_type_tip')}</pre>}
                              overlayInnerStyle={{ width: '340px' }}
                            >
                              {t('task.rule_type')} <QuestionCircleOutlined />
                            </Tooltip>
                          }
                          name={[ruleName, 'type']}
                          rules={[{ required: true, message: t('task.rule_type_requied') }]}
                        >
                          <Select
                            onChange={(e) => {
                              const formData = commonRuleForm.getFieldsValue();
                              commonRuleForm.setFieldsValue(formData);
                            }}
                          >
                            <Select.Option value='multi_line' disabled={isOptionDisabled()}>
                              {t('task.multi_line')}
                            </Select.Option>
                            <Select.Option value='include_at_match'>{t('task.include_at_match')}</Select.Option>
                            <Select.Option value='exclude_at_match'>{t('task.exclude_at_match')}</Select.Option>
                            <Select.Option value='mask_sequences'>{t('task.mask_sequences')}</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          label={
                            <>
                              <Tooltip title={t('task.rule_pattern_tip')}>
                                {t('task.pattern')} <QuestionCircleOutlined />
                              </Tooltip>
                              <Button
                                type='link'
                                size='small'
                                onClick={() => {
                                  const data = commonRuleForm.getFieldsValue();
                                  const pattern = _.get(data, `item_public_rules.${ruleName}.pattern`);
                                  return Modal.info({
                                    width: 600,
                                    icon: null,
                                    okText: t('common:btn.close'),
                                    okType: 'default',
                                    content: <RegexpTool regexp={pattern ?? ''} />,
                                    onOk() {},
                                  });
                                }}
                              >
                                {t('common:tool.to_test')}
                              </Button>
                            </>
                          }
                          name={[ruleName, 'pattern']}
                          rules={[{ required: true, message: t('task.pattern_requied') }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                      <Form.Item
                        shouldUpdate={(prevValues, currentValues) => {
                          const param = `item_public_rules.${ruleName}.type`;
                          const prevType = _.get(prevValues, param);
                          const currentType = _.get(currentValues, param);
                          return prevType !== currentType;
                        }}
                        noStyle
                      >
                        {({ getFieldValue }) => {
                          const type = getFieldValue(['item_public_rules', ruleName, 'type']);
                          return (
                            type === 'mask_sequences' && (
                              <Col span={6}>
                                <Form.Item
                                  {...restField}
                                  label={t('task.replace_placeholder')}
                                  name={[ruleName, 'replace_placeholder']}
                                >
                                  <Input />
                                </Form.Item>
                              </Col>
                            )
                          );
                        }}
                      </Form.Item>
                      {curBusiGroup.perm === 'rw' && (
                        <Col span={5} style={{ marginTop: '14px' }}>
                          <MinusCircleOutlined onClick={() => remove(ruleName)} />
                        </Col>
                      )}
                    </Row>
                  ))}

                <DragDropContext onDragEnd={(result) => onDragEnd(result)}>
                  <Droppable droppableId='droppable'>
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef}>
                        {fields
                          .filter(
                            (field) =>
                              _.get(commonRuleForm.getFieldsValue(), `item_public_rules.${field.name}.type`) !==
                              'multi_line',
                          )
                          .map(({ key, name: ruleName, ...restField }, index) => (
                            <Draggable key={key} draggableId={key.toString()} index={index}>
                              {(provided) => (
                                <div ref={provided.innerRef} {...provided.draggableProps}>
                                  <Row gutter={24} align='middle' style={{ margin: 0 }}>
                                    <span
                                      style={{
                                        paddingLeft: '10px',
                                        marginTop: '10px',
                                        width: '22px',
                                      }}
                                    >
                                      <DragOutlined {...provided.dragHandleProps} />
                                    </span>
                                    <Col span={6}>
                                      <Form.Item
                                        {...restField}
                                        label={
                                          <Tooltip
                                            title={<pre style={{ margin: 0 }}>{t('task.rule_type_tip')}</pre>}
                                            overlayInnerStyle={{ width: '340px' }}
                                          >
                                            {t('task.rule_type')} <QuestionCircleOutlined />
                                          </Tooltip>
                                        }
                                        name={[ruleName, 'type']}
                                        rules={[{ required: true, message: t('task.rule_type_requied') }]}
                                      >
                                        <Select
                                          onChange={(e) => {
                                            const formData = commonRuleForm.getFieldsValue();
                                            // 当前类型切换为 multi_line 时，当前项排到第一个（能选择 multi_line说明当前还不存在）
                                            if (e === 'multi_line') {
                                              const [item] = formData.item_public_rules.splice(ruleName, 1);
                                              formData.item_public_rules.unshift(item);
                                            }
                                            commonRuleForm.setFieldsValue(formData);
                                          }}
                                        >
                                          <Select.Option value='multi_line' disabled={isOptionDisabled()}>
                                            {t('task.multi_line')}
                                          </Select.Option>
                                          <Select.Option value='include_at_match'>
                                            {t('task.include_at_match')}
                                          </Select.Option>
                                          <Select.Option value='exclude_at_match'>
                                            {t('task.exclude_at_match')}
                                          </Select.Option>
                                          <Select.Option value='mask_sequences'>
                                            {t('task.mask_sequences')}
                                          </Select.Option>
                                        </Select>
                                      </Form.Item>
                                    </Col>
                                    <Col span={6}>
                                      <Form.Item
                                        {...restField}
                                        label={
                                          <>
                                            <Tooltip title={t('task.rule_pattern_tip')}>
                                              {t('task.pattern')} <QuestionCircleOutlined />
                                            </Tooltip>
                                            <Button
                                              type='link'
                                              size='small'
                                              onClick={() => {
                                                const data = commonRuleForm.getFieldsValue();
                                                const pattern = _.get(data, `item_public_rules.${ruleName}.pattern`);
                                                return Modal.info({
                                                  width: 600,
                                                  icon: null,
                                                  okText: t('common:btn.close'),
                                                  okType: 'default',
                                                  content: <RegexpTool regexp={pattern ?? ''} />,
                                                  onOk() {},
                                                });
                                              }}
                                            >
                                              {t('common:tool.to_test')}
                                            </Button>
                                          </>
                                        }
                                        name={[ruleName, 'pattern']}
                                        rules={[
                                          {
                                            required: true,
                                            message: t('task.pattern_requied'),
                                          },
                                        ]}
                                      >
                                        <Input />
                                      </Form.Item>
                                    </Col>
                                    <Form.Item
                                      shouldUpdate={(prevValues, currentValues) => {
                                        const param = `item_public_rules.${ruleName}.type`;
                                        const prevType = _.get(prevValues, param);
                                        const currentType = _.get(currentValues, param);
                                        return prevType !== currentType;
                                      }}
                                      noStyle
                                    >
                                      {({ getFieldValue }) => {
                                        const type = getFieldValue(['item_public_rules', ruleName, 'type']);
                                        return (
                                          type === 'mask_sequences' && (
                                            <Col span={6}>
                                              <Form.Item
                                                {...restField}
                                                label={t('task.replace_placeholder')}
                                                name={[ruleName, 'replace_placeholder']}
                                              >
                                                <Input />
                                              </Form.Item>
                                            </Col>
                                          )
                                        );
                                      }}
                                    </Form.Item>
                                    {curBusiGroup.perm === 'rw' && (
                                      <Col span={5} style={{ marginTop: '14px' }}>
                                        <MinusCircleOutlined onClick={() => remove(ruleName)} />
                                      </Col>
                                    )}
                                  </Row>
                                </div>
                              )}
                            </Draggable>
                          ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default ProcessingRule;
