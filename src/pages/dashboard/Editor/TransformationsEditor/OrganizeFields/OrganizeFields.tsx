import React, { useState, useEffect } from 'react';
import { Input, Row, Col, Button, Space, Tooltip, Switch, Form } from 'antd';
import {
  MenuOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  InfoCircleOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import { arrayMoveImmutable } from 'array-move';
import { Trans, useTranslation } from 'react-i18next';
import _ from 'lodash';
import InputGroupWithFormItem from '@/components/InputGroupWithFormItem';
import Collapse, { Panel } from '../../Components/Collapse';
import { useGlobalState } from '../../../globalState';
import './style.less';

interface Value {
  excludeByName?: {
    [index: string]: boolean;
  };
  indexByName?: {
    [index: string]: number;
  };
  renameByName?: {
    [index: string]: string;
  };
  widthByName?: {
    [index: string]: string;
  };
  linkByName?: {
    [index: string]: {
      path?: string;
      _blank?: boolean;
    };
  };
}

interface IProps {
  value?: Value;
  onChange?: (value: Value) => void;
  chartForm: any;
}

const SortableBody = SortableContainer(({ children }) => {
  return <div>{children}</div>;
});
const SortableItem = SortableElement(({ children }) => <div style={{ marginBottom: 8 }}>{children}</div>);
const DragHandle = SortableHandle(() => <Button icon={<MenuOutlined />} />);

export default function OrganizeFields(props: IProps) {
  const { value, onChange, chartForm } = props;
  const [displayedTableFields, setDisplayedTableFields] = useGlobalState('displayedTableFields');
  const [fields, setFields] = useState(displayedTableFields);
  const { t } = useTranslation('dashboard');
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>();
  useEffect(() => {
    setFields(displayedTableFields);
  }, [JSON.stringify(displayedTableFields)]);

  return (
    <Collapse>
      <Panel header='字段管理'>
        <SortableBody
          useDragHandle
          helperClass='row-dragging'
          onSortEnd={({ oldIndex, newIndex }) => {
            const newFields = arrayMoveImmutable(fields, oldIndex, newIndex);
            setFields(newFields);
            onChange &&
              onChange({
                ...(value || {}),
                indexByName: _.reduce(
                  newFields,
                  (result, value, index) => {
                    result[value] = index;
                    return result;
                  },
                  {},
                ),
              });
          }}
        >
          {_.map(fields, (field, index) => {
            const exclude = _.find(value?.excludeByName, (val, key) => {
              return key === field;
            });
            let rename = _.find(value?.renameByName, (val, key) => {
              return key === field;
            });
            const width = _.find(value?.widthByName, (val, key) => {
              return key === field;
            });
            const link = _.find(value?.linkByName, (val, key) => {
              return key === field;
            });
            const isExpanded = (expanded?.[field] === undefined && (width || link)) || expanded?.[field];
            return (
              <SortableItem key={field} index={index}>
                <Row gutter={8}>
                  <Col flex='32px'>
                    <DragHandle />
                  </Col>
                  <Col flex='32px'>
                    <Button
                      icon={exclude ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      onClick={() => {
                        onChange &&
                          onChange({
                            ...(value || {}),
                            excludeByName: {
                              ...(value?.excludeByName || {}),
                              [field]: !exclude,
                            },
                          });
                      }}
                    />
                  </Col>
                  <Col flex='auto'>
                    <Row gutter={8}>
                      <Col flex='auto'>
                        <Form.Item
                          shouldUpdate={(prevValues, curValues) => !_.isEqual(prevValues.targets, curValues.targets)}
                          noStyle
                        >
                          {({ getFieldValue }) => {
                            const targets = getFieldValue('targets');
                            targets?.forEach((element) => {
                              if (element.refId === field) {
                                rename = element.legend;
                              }
                            });

                            return (
                              <InputGroupWithFormItem label={field}>
                                <Input
                                  value={rename}
                                  onChange={(e) => {
                                    onChange &&
                                      onChange({
                                        ...(value || {}),
                                        renameByName: {
                                          ...(value?.renameByName || {}),
                                          [field]: e.target.value,
                                        },
                                      });
                                    const index = targets.findIndex((item) => item.refId === field);
                                    if (index !== -1) {
                                      targets[index] = { ...targets[index], legend: e.target.value };
                                      chartForm.setFieldsValue({ targets: targets });
                                    }
                                  }}
                                />
                              </InputGroupWithFormItem>
                            );
                          }}
                        </Form.Item>
                      </Col>
                      <Col flex='88px'>
                        <Button
                          onClick={() => {
                            setExpanded({ ...expanded, [field]: !Boolean(isExpanded) });
                          }}
                        >
                          {t('panel.standardOptions.title')} {isExpanded ? <DownOutlined /> : <RightOutlined />}
                        </Button>
                      </Col>
                    </Row>
                    {isExpanded && (
                      <Row style={{ marginTop: '8px' }} gutter={8} align='middle'>
                        <Col flex='125px'>
                          <InputGroupWithFormItem label='Width'>
                            <Input
                              value={width}
                              onChange={(e) => {
                                onChange &&
                                  onChange({
                                    ...(value || {}),
                                    widthByName: {
                                      ...(value?.widthByName || {}),
                                      [field]: e.target.value,
                                    },
                                  });
                              }}
                            />
                          </InputGroupWithFormItem>
                        </Col>
                        <Col flex='auto'>
                          <InputGroupWithFormItem
                            label={
                              <Space>
                                Link
                                <Tooltip
                                  title={
                                    <Trans ns='dashboard' i18nKey='dashboard:link.url_tip' components={{ 1: <br /> }} />
                                  }
                                >
                                  <InfoCircleOutlined />
                                </Tooltip>
                              </Space>
                            }
                          >
                            <Input
                              value={link?.path}
                              onChange={(e) => {
                                onChange &&
                                  onChange({
                                    ...(value || {}),
                                    linkByName: {
                                      ...(value?.linkByName || {}),
                                      [field]: { ...(value?.linkByName?.[field] || {}), path: e.target.value },
                                    },
                                  });
                              }}
                            />
                          </InputGroupWithFormItem>
                        </Col>
                        <Col flex='20px'>
                          <Tooltip title={t('panel.base.link.isNewBlank')}>
                            <Switch
                              checked={Boolean(link?._blank)}
                              onChange={(checked) =>
                                onChange &&
                                onChange({
                                  ...(value || {}),
                                  linkByName: {
                                    ...(value?.linkByName || {}),
                                    [field]: { ...(value?.linkByName?.[field] || {}), _blank: checked },
                                  },
                                })
                              }
                            />
                          </Tooltip>
                        </Col>
                      </Row>
                    )}
                  </Col>
                </Row>
              </SortableItem>
            );
          })}
        </SortableBody>
      </Panel>
    </Collapse>
  );
}
