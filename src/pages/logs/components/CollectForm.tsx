import React, { useState, useEffect, useContext, ReactNode, useImperativeHandle } from 'react';
import { Form, Input, Button, Space, Select, Row, Col, Card, Tooltip, Modal, Checkbox, message, Switch } from 'antd';
import { CommonStateContext } from '@/App';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { PlusCircleOutlined, MinusCircleOutlined, QuestionCircleOutlined, DragOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import RegexpTool from '@/components/RegexpTool';
import { getMonObjectList } from '@/services/targets';

const CollectForm = React.forwardRef<ReactNode, { deleted; groupId: number; type?: 'beginner' }>((props, ref) => {
  const { t } = useTranslation('logs');
  const { busiGroups, curBusiGroup } = useContext(CommonStateContext);
  const [collectForm] = Form.useForm();
  const { deleted, groupId, type } = props;
  const [hosts, setHosts] = useState<{ label: string; value: string }[]>();
  const currentBusiGroup: any = busiGroups.filter((item) => item.id === groupId)?.[0];
  const rtList = {
    pm: t('common:physical_machine'),
    vm: t('common:virtual_machine'),
    ct: 'Docker',
    'ct-k8s': t('common:kubernetes'),
  };
  const osList = ['windows', 'linux'];

  useImperativeHandle(ref, () => ({
    form: collectForm,
  }));

  useEffect(() => {
    if (groupId && type !== 'beginner') {
      // 获取机器列表
      getMonObjectList({
        limit: -1,
        bgid: groupId,
      }).then((res) => {
        setHosts(
          _.map(res?.dat?.list || [], (item) => {
            return {
              label: item.ident,
              value: item.ident,
            };
          }),
        );
      });
    }
  }, [groupId]);

  // 重新排序 helper 函数
  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const onDragEnd = (result, index2) => {
    if (!result.destination) {
      return;
    }
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    const formData = collectForm.getFieldsValue();
    const itemData = formData.content.logs.items[index2];
    const matchMultiLine = itemData.log_processing_rules.filter((item) => item.type === 'multi_line');
    const matchOther = itemData.log_processing_rules.filter((item) => item.type !== 'multi_line');
    const sortedData = reorder(matchOther, sourceIndex, destIndex);
    itemData.log_processing_rules = [...matchMultiLine, ...sortedData];
    collectForm.setFieldsValue(formData);
  };

  // 判断选项是否应禁用
  const isOptionDisabled = (index2) => {
    const formData = collectForm.getFieldsValue();
    const itemData = formData.content.logs.items[index2];
    const matchMultiLine = itemData.log_processing_rules.filter((item) => item.type === 'multi_line');
    if (matchMultiLine.length) {
      return true;
    }
    return false;
  };

  const fieldArray2Obj = {
    valuePropName: 'value',
    getValueProps: (value: any) => {
      let res: string[] = [];
      if (value) {
        Object.keys(value).forEach((key) => {
          const val = value[key];
          res.push(key + '=' + val);
        });
      }
      return { value: res };
    },
    getValueFromEvent: (e: any[]) => {
      let res = {};
      if (e) {
        e.map((item) => {
          const arr = item.split('=');
          res[arr[0]] = arr[1];
        });
        return res;
      }
    },
  };

  return (
    <Form
      form={collectForm}
      layout='vertical'
      initialValues={{
        mode: 'idents',
        idents: [],
        content: {
          logs: {
            items: [
              {
                type: 'file',
                path: '',
                auto_multi_line_detection: false,
                log_processing_rules: [],
                exclude_paths: [],
                exclude_units: [],
                include_units: [],
                start_position: 'beginning',
                encoding: 'utf-8',
              },
            ],
          },
        },
      }}
    >
      <Form.Item name='virtual_id' hidden>
        <div />
      </Form.Item>
      {type === 'beginner' ? (
        <Form.Item label={t('common:table.ident')} name='topic' hidden>
          <Input />
        </Form.Item>
      ) : (
        <Row gutter={24}>
          <Form.Item name='disabled' hidden initialValue={0}>
            <Switch />
          </Form.Item>
          <Col flex='170px'>
            <Form.Item label={t('task.mode')} name='mode' rules={[{ required: true }]}>
              <Select>
                {currentBusiGroup?.extra?.super && <Select.Option value='all'>{t('task.all_host')}</Select.Option>}
                <Select.Option value='group'>{t('task.current_group')}</Select.Option>
                <Select.Option value='idents'>{t('task.host')}</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col flex='auto'>
            <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues?.mode !== currentValues?.mode} noStyle>
              {({ getFieldValue }) => {
                const mode = getFieldValue('mode');
                return mode === 'idents' ? (
                  <Form.Item label={t('task.host')} name='idents' rules={[{ required: true }]}>
                    <Select mode='multiple' options={hosts} />
                  </Form.Item>
                ) : (
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item label={t('task.rt')} name='rt'>
                        <Select mode='multiple' allowClear placeholder={t('task.rt_placeholder')}>
                          {Object.entries(rtList).map(([key, value]) => (
                            <Select.Option key={key} value={key}>
                              {value}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={t('task.os')} name='os'>
                        <Select mode='multiple' allowClear placeholder={t('task.os_placeholder')}>
                          {osList.map((item) => (
                            <Select.Option key={item} value={item}>
                              {item}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                );
              }}
            </Form.Item>
          </Col>
        </Row>
      )}
      <Form.List name={['content', 'logs', 'items']}>
        {(fields, { add, remove }) => (
          <Card
            title={
              <Space>
                <span>{t('task.log_collection')}</span>
                {curBusiGroup.perm === 'rw' && !deleted && (
                  <PlusCircleOutlined
                    onClick={() =>
                      add({
                        type: 'file',
                        path: '',
                        auto_multi_line_detection: false,
                        log_processing_rules: [],
                        exclude_paths: [],
                        exclude_units: [],
                        include_units: [],
                        start_position: 'beginning',
                        encoding: 'utf-8',
                      })
                    }
                  />
                )}
              </Space>
            }
            size='small'
          >
            <div className='log-task-items-container'>
              {fields.map(({ key, name: logName, ...restField }) => (
                <div key={key} className='log-task-item-container'>
                  {type === 'beginner' ? null : (
                    <Form.Item name={[logName, 'topic']} {...restField} hidden>
                      <Input />
                    </Form.Item>
                  )}
                  <Row gutter={24}>
                    <Col span={8}>
                      <Form.Item label={t('task.type')} name={[logName, 'type']} {...restField}>
                        <Select>
                          <Select.Option value='file'>{t('task.type_file')}</Select.Option>
                          <Select.Option value='journald'>{t('task.type_journald')}</Select.Option>
                          {type === 'beginner' && (
                            <Select.Option value='container_file'>{t('task.container_file')}</Select.Option>
                          )}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={16}>
                      <Form.Item
                        label={t('task.custom_tags')}
                        tooltip={t('task.custom_tags_tip')}
                        name={[logName, 'fields']}
                        {...restField}
                        {...fieldArray2Obj}
                      >
                        <Select mode='tags' tokenSeparators={[' ']} open={false} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={24}>
                    <Form.Item
                      shouldUpdate={(prevValues, currentValues) => {
                        const param = ['content', 'logs', 'items', logName];
                        return (
                          _.get(prevValues, [...param, 'type']) !== _.get(currentValues, [...param, 'type']) ||
                          _.get(prevValues, [...param, 'path']) !== _.get(currentValues, [...param, 'path'])
                        );
                      }}
                      noStyle
                    >
                      {({ getFieldValue, setFieldsValue }) => {
                        const params = ['logs', 'items', logName];
                        const data = getFieldValue('content');
                        const type = _.get(data, [...params, 'type']);
                        const path = _.get(data, [...params, 'path']);
                        const start_position = _.get(data, [...params, 'start_position']);
                        const beginning_disabled = /[*?[]/.test(path);
                        if (beginning_disabled && ['beginning', 'forceBeginning'].includes(start_position)) {
                          _.set(data, [...params, 'start_position'], 'end');
                          setFieldsValue({ ident_list: data });
                        }

                        return type !== 'journald' ? (
                          <>
                            <Col span={6}>
                              <Form.Item
                                {...restField}
                                label={t('task.file_path')}
                                name={[logName, 'path']}
                                rules={[{ required: true }]}
                                tooltip={t('task.file_path_tip')}
                                key='file_path'
                              >
                                <Input />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item
                                label={t('task.exclude_paths')}
                                name={[logName, 'exclude_paths']}
                                tooltip={t('task.exclude_paths_tip')}
                                {...restField}
                                key='file_exclude_paths'
                              >
                                <Select mode='tags' tokenSeparators={[' ']} open={false} />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item
                                label={t('task.coding_rule')}
                                name={[logName, 'encoding']}
                                tooltip={t('task.file_encoding_tip')}
                                {...restField}
                                key='file_encoding'
                              >
                                <Select allowClear>
                                  <Select.Option value='utf-8'>UTF8</Select.Option>
                                  <Select.Option value='utf-16-be'>UTF16BE</Select.Option>
                                  <Select.Option value='utf-16-le'>UTF16LE</Select.Option>
                                  <Select.Option value='gb18030'>GB18030</Select.Option>
                                  <Select.Option value='big5'>BIG5</Select.Option>
                                </Select>
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item
                                label={t('task.start_mode')}
                                name={[logName, 'start_position']}
                                tooltip={t('task.file_start_position_tip')}
                                {...restField}
                                key='file_start_position'
                              >
                                <Select defaultActiveFirstOption>
                                  {!beginning_disabled && (
                                    <>
                                      <Select.Option value='beginning'>{t('task.start_begin')}</Select.Option>
                                    </>
                                  )}
                                  <Select.Option value='end'>{t('task.start_end')}</Select.Option>
                                  {!beginning_disabled && (
                                    <>
                                      <Select.Option value='forceBeginning'>
                                        {t('task.start_force_begin')}
                                      </Select.Option>
                                    </>
                                  )}
                                  <Select.Option value='forceEnd'>{t('task.start_force_end')}</Select.Option>
                                </Select>
                              </Form.Item>
                            </Col>
                            {type === 'container_file' && (
                              <Col span={24}>
                                <Form.Item
                                  {...restField}
                                  label={t('task.container_name')}
                                  name={[logName, 'container_name']}
                                  tooltip={t('task.container_name_tip')}
                                  style={{width:'50%'}}
                                >
                                  <Input />
                                </Form.Item>
                              </Col>
                            )}
                          </>
                        ) : (
                          <>
                            <Col span={6}>
                              <Form.Item
                                {...restField}
                                label={t('task.journald_path')}
                                name={[logName, 'path']}
                                rules={[{ required: false }]}
                                key='journald_path'
                              >
                                <Input placeholder='留空时使用系统默认的systemd journal目录' />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item
                                {...restField}
                                label={t('task.include_unit')}
                                name={[logName, 'include_units']}
                                key='journald_include_units'
                              >
                                <Select mode='tags' tokenSeparators={[' ']} open={false} />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item
                                {...restField}
                                label={t('task.exclude_unit')}
                                name={[logName, 'exclude_units']}
                                key='journald_exclude_unit'
                              >
                                <Select mode='tags' tokenSeparators={[' ']} open={false} />
                              </Form.Item>
                            </Col>
                            <Col span={6}></Col>
                          </>
                        );
                      }}
                    </Form.Item>
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[logName, 'auto_multi_line_detection']}
                        valuePropName='checked'
                        // label={t('task.merge_multiple')}
                        // tooltip={t('task.auto_multiline_tip')}
                        label={
                          <Tooltip
                            title={<pre style={{ margin: 0 }}>{t('task.auto_multiline_tip')}</pre>}
                            overlayInnerStyle={{ width: '500px' }}
                          >
                            {t('task.merge_multiple')} <QuestionCircleOutlined />
                          </Tooltip>
                        }
                      >
                        <Checkbox
                          disabled={curBusiGroup.perm === 'ro' || deleted}
                          onChange={(e) => {
                            const formData = collectForm.getFieldsValue();
                            const itemData = formData.content.logs.items[logName];
                            const matchMultiLine = itemData.log_processing_rules.filter(
                              (item) => item.type === 'multi_line',
                            );
                            if (matchMultiLine.length && e.target.checked) {
                              itemData.auto_multi_line_detection = false;

                              collectForm.setFieldsValue(formData);
                              message.warning(t('task.auto_multi_line_detection_tip'));
                            }
                          }}
                        ></Checkbox>
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[logName, 'ignore_missing']}
                        valuePropName='checked'
                        label={t('task.ignore_missing')}
                        tooltip={t('task.ignore_missing_tip')}
                      >
                        <Checkbox
                          disabled={curBusiGroup.perm === 'ro' || deleted}
                          onChange={(e) => {
                            const formData = collectForm.getFieldsValue();
                            const itemData = formData.content.logs.items[logName];
                            itemData.ignore_missing = e.target.checked;
                          }}
                        ></Checkbox>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.List name={[logName, 'log_processing_rules']}>
                    {(fields, { add, remove }) => (
                      <>
                        <Space align='baseline' style={{ paddingBottom: '8px' }}>
                          {t('task.rule')}
                          {curBusiGroup.perm === 'rw' && !deleted && (
                            <PlusCircleOutlined
                              className='control-icon-normal'
                              onClick={() => add({ type: '', pattern: '' })}
                            />
                          )}
                        </Space>
                        {fields
                          .filter(
                            (field) =>
                              _.get(
                                collectForm.getFieldsValue(),
                                `content.logs.items.${logName}.log_processing_rules.${field.name}.type`,
                              ) === 'multi_line',
                          )
                          .map(({ key, name: ruleName, ...restField }) => (
                            <Row gutter={24} align='middle'>
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
                                      const formData = collectForm.getFieldsValue();
                                      const itemData = formData.content.logs.items[logName];
                                      const matchMultiLine = itemData.log_processing_rules.filter(
                                        (item) => item.type === 'multi_line',
                                      );
                                      // 当切换类型时，如果所有规则里面有包含 multi_line 类型，取消自动合并多行的勾选
                                      if (matchMultiLine.length) {
                                        itemData.auto_multi_line_detection = false;
                                      }
                                      collectForm.setFieldsValue(formData);
                                    }}
                                  >
                                    <Select.Option value='multi_line' disabled={isOptionDisabled(logName)}>
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
                                          const data = collectForm.getFieldsValue();
                                          const pattern = _.get(
                                            data,
                                            `content.logs.items.${logName}.log_processing_rules.${ruleName}.pattern`,
                                          );
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
                                  const param = `ident_list.${name}.content.logs.items.${logName}.log_processing_rules.${ruleName}.type`;
                                  const prevType = _.get(prevValues, param);
                                  const currentType = _.get(currentValues, param);
                                  return prevType !== currentType;
                                }}
                                noStyle
                              >
                                {({ getFieldValue }) => {
                                  const type = getFieldValue([
                                    'content',
                                    'logs',
                                    'items',
                                    logName,
                                    'log_processing_rules',
                                    ruleName,
                                    'type',
                                  ]);
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
                              {curBusiGroup.perm === 'rw' && !deleted && (
                                <Col span={5} style={{ marginTop: '14px' }}>
                                  <MinusCircleOutlined onClick={() => remove(ruleName)} />
                                </Col>
                              )}
                            </Row>
                          ))}
                        <DragDropContext onDragEnd={(result) => onDragEnd(result, logName)}>
                          <Droppable droppableId='droppable'>
                            {(provided) => (
                              <div {...provided.droppableProps} ref={provided.innerRef}>
                                {fields
                                  .filter(
                                    (field) =>
                                      _.get(
                                        collectForm.getFieldsValue(),
                                        `content.logs.items.${logName}.log_processing_rules.${field.name}.type`,
                                      ) !== 'multi_line',
                                  )
                                  .map(({ key, name: ruleName, ...restField }, index) => (
                                    <Draggable key={key} draggableId={key.toString()} index={index}>
                                      {(provided) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps}>
                                          <Row gutter={24} align='middle'>
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
                                                    const formData = collectForm.getFieldsValue();
                                                    const itemData = formData.content.logs.items[logName];
                                                    const matchMultiLine = itemData.log_processing_rules.filter(
                                                      (item) => item.type === 'multi_line',
                                                    );
                                                    // 当切换类型时，如果所有规则里面有包含 multi_line 类型，取消自动合并多行的勾选
                                                    if (matchMultiLine.length) {
                                                      itemData.auto_multi_line_detection = false;
                                                    }
                                                    // 当前类型切换为 multi_line 时，当前项排到第一个（能选择 multi_line说明当前还不存在）
                                                    if (e === 'multi_line') {
                                                      const [item] = itemData.log_processing_rules.splice(ruleName, 1);
                                                      itemData.log_processing_rules.unshift(item);
                                                    }
                                                    collectForm.setFieldsValue(formData);
                                                  }}
                                                >
                                                  <Select.Option
                                                    value='multi_line'
                                                    disabled={isOptionDisabled(logName)}
                                                  >
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
                                                        const data = collectForm.getFieldsValue();
                                                        const pattern = _.get(
                                                          data,
                                                          `content.logs.items.${logName}.log_processing_rules.${ruleName}.pattern`,
                                                        );
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
                                                const param = `content.logs.items.${logName}.log_processing_rules.${ruleName}.type`;
                                                const prevType = _.get(prevValues, param);
                                                const currentType = _.get(currentValues, param);
                                                return prevType !== currentType;
                                              }}
                                              noStyle
                                            >
                                              {({ getFieldValue }) => {
                                                const type = getFieldValue([
                                                  'content',
                                                  'logs',
                                                  'items',
                                                  logName,
                                                  'log_processing_rules',
                                                  ruleName,
                                                  'type',
                                                ]);
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
                      </>
                    )}
                  </Form.List>
                  {fields.length > 1 && curBusiGroup.perm === 'rw' && !deleted && (
                    <MinusCircleOutlined className='log-task-item-remove' onClick={() => remove(logName)} />
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </Form.List>
    </Form>
  );
});

export default CollectForm;
