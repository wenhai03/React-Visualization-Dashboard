import React, { useState, useEffect, useContext } from 'react';
import {
  Radio,
  RadioChangeEvent,
  Badge,
  Tabs,
  Button,
  Result,
  message,
  Row,
  Col,
  Space,
  Modal,
  Form,
  Input,
  Popconfirm,
} from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { CommonStateContext } from '@/App';
import { useTranslation } from 'react-i18next';
import { PlusOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { StreamLanguage } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';
import { groovy } from '@codemirror/legacy-modes/mode/groovy';
import LogCollection from './LogCollection';
import { getAgentSettings, updateAgentSettings, updateAgentSettingsBatch, deleteAgentSettings } from '@/services/agent';

interface ISettingOption {
  id: number;
  ident: string;
  category: string;
  version: number;
  format: 'toml' | 'json' | 'xml' | 'yaml' | 'conf';
  content: string;
  create_at: number;
  create_by: string;
  update_at: number;
  update_by: string;
}

interface ITomlCodeMirror {
  type: string[];
  content: string;
  updateAt?: number;
  height: string;
  id?: string;
  handleEdit: (type: string[], content: string) => void;
  onSubmit: (type: string[]) => void;
  format: 'toml' | 'json' | 'xml' | 'yaml' | 'conf';
}

interface ISetting {
  config: ISettingOption | null;
  global: ISettingOption | null;
  metrics_list: Record<string, Record<string, ISettingOption>> | null;
}

const CodeMirrorContainer: React.FC<ITomlCodeMirror> = ({
  type,
  content,
  updateAt,
  handleEdit,
  onSubmit,
  height,
  format,
}) => {
  const { t } = useTranslation('collector');
  return (
    <>
      {type[0] !== 'metrics_list' && (
        <div className='agents-setting-header'>
          <span className='agents-setting-header-title'>
            {type.slice(-1)}.{format || 'toml'}
          </span>
          <div>
            {updateAt && (
              <span className='agents-setting-update-at'>
                {t('script.setting.recently_updated')}
                {moment.unix(updateAt).format('YYYY-MM-DD HH:mm:ss')}
              </span>
            )}
            <Button type='primary' size='small' onClick={() => onSubmit(type)}>
              {t('common:btn.save')}
            </Button>
          </div>
        </div>
      )}
      <CodeMirror
        height={height}
        value={content}
        onChange={(value) => handleEdit(type, value)}
        theme='light'
        basicSetup
        editable
        extensions={[
          EditorView.lineWrapping,
          StreamLanguage.define(format === 'conf' ? groovy : format === 'yaml' ? yaml : toml),
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

export default function DefaultConfig() {
  const { t } = useTranslation('collector');
  const { profile } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const [action, setAction] = useState('config');
  const defaultData = {
    config: null,
    global: null,
    metrics_list: null,
  };
  // 初始值
  const [settingData, setSettingData] = useState<ISetting>(defaultData);
  // 渲染数据
  const [currentData, setCurrentData] = useState<ISetting | {}>({});
  // 指标编辑状态
  const [metricsEdits, setMetricsEdits] = useState({});
  // 全局编辑状态
  const [globalIsEdit, setGlobalIsEdit] = useState(false);
  // 启动编辑状态
  const [configIsEdit, setConfigIsEdit] = useState(false);
  // 日志采集编辑状态
  const [LogIsEdit, setLogIsEdit] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleEdit = (type, content) => {
    const typeString = type.join('.');
    const data = _.cloneDeep(currentData);
    _.set(data, `${typeString}.content`, content);
    setCurrentData(data);
    // 指标标识编辑状态
    if (action === 'metrics_list') {
      let editObj = { ...metricsEdits };
      if (_.get(settingData, `${typeString}.content`) !== content) {
        editObj[`${type[1]}-${type[2]}`] = content;
      } else {
        delete editObj[`${type[1]}-${type[2]}`];
      }
      setMetricsEdits(editObj);
    } else if (action === 'global') {
      setGlobalIsEdit(true);
    } else if (action === 'config') {
      setConfigIsEdit(true);
    }
  };

  // 提交内容
  const handleSubmitContent = (type) => {
    const prevItem = _.get(settingData, type);
    const nextItem = _.get(currentData, type);
    let data;
    if (prevItem?.content !== nextItem.content) {
      data = { ...prevItem } || {};
      const time = Math.round(new Date().getTime() / 1000);
      if (prevItem) {
        // 修改
        data.version += 1;
        data.update_at = time;
        data.update_by = profile.username;
        data.content = nextItem.content;
      } else {
        // 新增
        data = {
          ident: '__default__',
          category: nextItem.category,
          version: 1,
          format: nextItem.format,
          content: nextItem.content,
          create_at: time,
          create_by: profile.username,
          update_at: time,
          update_by: profile.username,
        };
      }
    }
    return data;
  };

  const onSubmit = (type) => {
    const content = handleSubmitContent(type);
    if (content) {
      updateAgentSettings(content).then(() => {
        message.success(t('common:success.save'));
        // 更新列表
        getAgentSettings('__default__').then((res) => {
          setSettingData(res.dat);
        });
        if (action === 'metrics_list') {
          const editStateContent = { ...metricsEdits };
          delete editStateContent[`${type[1]}-${type[2]}`];
          setMetricsEdits(editStateContent);
        } else if (action === 'global') {
          setGlobalIsEdit(false);
        } else if (action === 'config') {
          setConfigIsEdit(false);
        }
      });
    }
  };

  // 指标批量保存
  const onSubmitBatch = () => {
    const data: any = [];
    Object.keys(metricsEdits).map((key) => {
      const metricsArr = key.split('-');
      const content = handleSubmitContent(['metrics_list', ...metricsArr]);
      data.push(content);
    });
    if (data.length) {
      // 批量更新
      updateAgentSettingsBatch(data).then(() => {
        message.success(t('common:success.save'));
        // 更新列表
        getAgentSettings('__default__').then((res) => {
          setSettingData(res.dat);
        });
        setMetricsEdits({});
      });
    }
  };

  useEffect(() => {
    // 总数据
    getAgentSettings('__default__').then((res) => {
      setSettingData(res.dat);
      setCurrentData(res.dat);
    });
  }, []);

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        const time = Math.round(new Date().getTime() / 1000);
        const body = {
          ident: '__default__',
          category: `metrics:${values.category}`,
          version: 0,
          format: 'toml',
          content: values.content,
          create_at: time,
          create_by: profile.username,
          update_at: time,
          update_by: profile.username,
        };

        updateAgentSettings(body).then(() => {
          message.success(t('common:success.create'));
          setVisible(false);
          form.resetFields();
          // 更新列表
          getAgentSettings('__default__').then((res) => {
            setSettingData(res.dat);
            setCurrentData(res.dat);
            setMetricsEdits({});
          });
        });
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  // 删除指标
  const onRemove = (key: string) => {
    deleteAgentSettings({ ident: '__default__', category: 'metrics:' + key }).then(() => {
      message.success(t('common:success.delete'));
      // 更新列表
      getAgentSettings('__default__').then((res) => {
        setSettingData(res.dat);
        setCurrentData(res.dat);
        setMetricsEdits({});
      });
    });
  };

  return (
    <>
      <Row justify='space-between'>
        <Col>
          <Radio.Group
            optionType='button'
            buttonStyle='solid'
            className='collector-default-config-radio'
            value={action}
            onChange={(e: RadioChangeEvent) => {
              setAction(e.target.value);
            }}
          >
            <Radio value='config'>
              <Badge dot={configIsEdit}>{t('script.setting.config')}</Badge>
            </Radio>
            <Radio value='global'>
              <Badge dot={globalIsEdit}>{t('script.setting.global')}</Badge>
            </Radio>
            <Radio value='metrics_list'>
              <Badge dot={!_.isEmpty(metricsEdits)}>{t('script.setting.metrics')}</Badge>
            </Radio>
            <Radio value='logs_list'>
              <Badge dot={LogIsEdit}>{t('script.setting.logs')}</Badge>
            </Radio>
          </Radio.Group>
        </Col>
        <Col>
          {/* 批量保存 */}
          {action === 'metrics_list' && (
            <Space>
              <Button size='middle' onClick={() => setVisible(true)}>
                <PlusOutlined />
                {t('common:btn.add')}
              </Button>
              <Button size='middle' onClick={onSubmitBatch}>
                {t('script.setting.batch_save')}
              </Button>
            </Space>
          )}
        </Col>
      </Row>
      {action === 'config' ? (
        <CodeMirrorContainer
          type={[action]}
          height='calc(100vh - 240px)'
          content={currentData[action]?.content}
          updateAt={settingData[action]?.update_at}
          handleEdit={handleEdit}
          onSubmit={onSubmit}
          format={currentData[action]?.format}
        />
      ) : action === 'global' ? (
        <CodeMirrorContainer
          type={[action]}
          height='calc(100vh - 240px)'
          content={currentData[action]?.content}
          updateAt={settingData[action]?.update_at}
          handleEdit={handleEdit}
          onSubmit={onSubmit}
          format={currentData[action]?.format}
        />
      ) : action === 'metrics_list' ? (
        _.isEmpty(currentData[action]) ? (
          <Result subTitle={t('common:nodata')} />
        ) : (
          <Tabs
            tabPosition='left'
            type='editable-card'
            className='agents-setting-metrics'
            style={{ height: 'calc(100vh - 194px)' }}
            hideAdd
          >
            {Object.entries(currentData[action]).map(
              ([metricsKey, metricsGroup]: [string, Record<string, ISettingOption>]) => (
                <Tabs.TabPane
                  tab={
                    <Badge
                      dot={Boolean(Object.keys(metricsEdits).filter((item) => item.startsWith(metricsKey))?.length)}
                    >
                      {metricsKey}
                    </Badge>
                  }
                  key={metricsKey}
                  closeIcon={
                    <Popconfirm title={<>{t('common:confirm.delete')}</>} onConfirm={() => onRemove(metricsKey)}>
                      <CloseCircleOutlined />
                    </Popconfirm>
                  }
                >
                  <Tabs style={{ position: 'relative' }} tabBarExtraContent={<div style={{ width: '250px' }}></div>}>
                    {Object.entries(metricsGroup).map(([itemKey, item]: [string, ISettingOption]) => (
                      <Tabs.TabPane
                        tab={
                          <Badge dot={settingData['metrics_list']?.[metricsKey]?.[itemKey]?.content !== item.content}>
                            {itemKey}.{item.format || 'toml'}
                          </Badge>
                        }
                        key={itemKey}
                        closable={false}
                      >
                        <div style={{ position: 'absolute', top: '14px', right: 0 }}>
                          {settingData['metrics_list']?.[metricsKey]?.[itemKey]?.update_at && (
                            <span className='agents-setting-update-at'>
                              {t('script.setting.recently_updated')}
                              {moment
                                .unix(settingData['metrics_list'][metricsKey][itemKey].update_at)
                                .format('YYYY-MM-DD HH:mm:ss')}
                            </span>
                          )}
                          <Button
                            type='primary'
                            size='small'
                            onClick={() => onSubmit(['metrics_list', metricsKey, itemKey])}
                          >
                            {t('common:btn.save')}
                          </Button>
                        </div>

                        <CodeMirrorContainer
                          type={['metrics_list', metricsKey, itemKey]}
                          height='calc(100vh - 252px)'
                          content={item.content}
                          handleEdit={handleEdit}
                          onSubmit={onSubmit}
                          format={item.format}
                        />
                      </Tabs.TabPane>
                    ))}
                  </Tabs>
                </Tabs.TabPane>
              ),
            )}
          </Tabs>
        )
      ) : action === 'logs_list' ? (
        <LogCollection handleIsEdit={(val) => setLogIsEdit(val)} />
      ) : null}
      <Modal
        title={t('script.setting.add_metrics_category')}
        visible={visible}
        width={800}
        onOk={handleOk}
        onCancel={() => {
          form.resetFields();
          setVisible(false);
        }}
      >
        <Form form={form}>
          <Form.Item
            label={t('script.setting.name')}
            name='category'
            rules={[
              { required: true },
              {
                validator: (_, value) => {
                  const pattern = /^[a-z_]+$/;
                  if (value && !pattern.test(value)) {
                    return Promise.reject(t('script.setting.name_tip'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item label={t('script.setting.metric_content')} name='content' rules={[{ required: true }]}>
            <CodeMirror
              height='400px'
              theme='light'
              basicSetup
              editable
              extensions={[
                EditorView.lineWrapping,
                StreamLanguage.define(toml),
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
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
