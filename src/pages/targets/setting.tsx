import { Tabs, Result, Tag, Space } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import queryString from 'query-string';
import React, { useState, useEffect, FC } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RollbackOutlined } from '@ant-design/icons';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';
import { groovy } from '@codemirror/legacy-modes/mode/groovy';
import { StreamLanguage } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import PageLayout from '@/components/pageLayout';
import { getAgentSettings } from '@/services/agent';
import './index.less';
import './locale';

interface ISettingOption {
  id: number;
  ident: string;
  category: string;
  version: number;
  format: 'toml' | 'json' | 'xml' | 'yaml';
  content: string;
  create_at: number;
  create_by: string;
  update_at: number;
  update_by: string;
}

interface ITomlCodeMirror {
  type: (string | number)[];
  content: string;
  updateAt?: number;
  height: string;
  format: 'toml' | 'json' | 'xml' | 'yaml' | 'conf';
}

interface ISetting {
  global: ISettingOption | null;
  logs: ISettingOption | null;
  logs_item_list?: Record<string, ISettingOption[]> | null;
  pipelines?: ISettingOption | null;
  logstash?: ISettingOption | null;
  prometheus: { in_cluster_scrape: ISettingOption | null; prometheus: ISettingOption | null };
  metrics_list: Record<string, Record<string, ISettingOption>> | null;
}

// toml 编辑器
const CodeMirrorContainer: FC<ITomlCodeMirror> = ({ type, content, updateAt, height, format }) => {
  const { t } = useTranslation('targets');
  return (
    <>
      {updateAt && (
        <div className='agents-setting-header'>
          <span className='agents-setting-header-title'>
            {type.slice(-1)}.{format || 'toml'}
          </span>
          <div>
            <span className='agents-setting-update-at'>
              {t('setting.recently_updated')}
              {moment.unix(updateAt).format('YYYY-MM-DD HH:mm:ss')}
            </span>
          </div>
        </div>
      )}
      <CodeMirror
        height={height}
        value={content}
        theme='light'
        basicSetup
        editable={false}
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

const Setting: FC = () => {
  const history = useHistory();
  const { search } = useLocation();
  const { t } = useTranslation('targets');
  const { tab = 'global', id } = queryString.parse(search) as {
    tab?: string;
    id: string;
  };
  const defaultData = {
    global: null,
    logs: null,
    prometheus: { in_cluster_scrape: null, prometheus: null },
    metrics_list: null,
    dial_list: null,
  };
  // 初始值
  const [settingData, setSettingData] = useState<ISetting>(defaultData);
  const [activeKey, setActiveKey] = useState<{
    tab: string;
  }>({ tab });
  useEffect(() => {
    if (id) {
      // 总数据
      getAgentSettings(id).then((res) => {
        setSettingData({
          ...res.dat,
          logs_item_list: res.dat.logs ? { logs: [res.dat.logs], ...res.dat.logs_item_list } : res.dat.logs_item_list,
        });
      });
    }
  }, []);

  return (
    <PageLayout
      title={t('setting.configuration')}
      icon={<RollbackOutlined className='back' onClick={() => history.push('/targets')} />}
    >
      <div>
        <div className='agents-setting'>
          <Space className='agents-setting-left-action'>
            <Tag color='blue'>
              {t('setting.hosts')}
              {id}
            </Tag>
          </Space>
          <Tabs
            activeKey={activeKey.tab}
            onChange={(val) => {
              setActiveKey({ tab: val });
              history.push({
                pathname: location.pathname,
                search: `?id=${id}&tab=${val}`,
              });
            }}
          >
            {Object.entries(settingData).map(([key, value]) =>
              key === 'global' ? (
                <Tabs.TabPane tab={t(`setting.${key}`)} key={key}>
                  {value ? (
                    <CodeMirrorContainer
                      type={[key]}
                      height='calc(100vh - 186px)'
                      content={value.content}
                      updateAt={settingData[key]?.update_at}
                      format={value.format}
                    />
                  ) : (
                    <Result subTitle={t('common:nodata')} />
                  )}
                </Tabs.TabPane>
              ) : key === 'metrics_list' ? (
                <Tabs.TabPane tab={t('setting.metrics')} key={key}>
                  {_.isEmpty(value) ? (
                    <Result subTitle={t('common:nodata')} />
                  ) : (
                    <Tabs tabPosition='left' type='card' className='agents-setting-metrics' hideAdd>
                      {Object.entries(value).map(
                        ([metricsKey, metricsGroup]: [string, Record<string, ISettingOption>]) => (
                          <Tabs.TabPane tab={metricsKey} key={metricsKey} closable={false}>
                            <Tabs
                              style={{ position: 'relative' }}
                              tabBarExtraContent={<div style={{ width: '206px' }}></div>}
                            >
                              {Object.entries(metricsGroup).map(([itemKey, item]: [string, ISettingOption]) => (
                                <Tabs.TabPane
                                  tab={`${itemKey}.${item.format || 'toml'}`}
                                  key={itemKey}
                                  closable={false}
                                >
                                  <div style={{ position: 'absolute', top: '14px', right: 0 }}>
                                    {settingData['metrics_list']?.[metricsKey]?.[itemKey]?.update_at && (
                                      <span className='agents-setting-update-at'>
                                        {t('setting.recently_updated')}
                                        {moment
                                          .unix(settingData['metrics_list'][metricsKey][itemKey].update_at)
                                          .format('YYYY-MM-DD HH:mm:ss')}
                                      </span>
                                    )}
                                  </div>

                                  <CodeMirrorContainer
                                    type={['metrics_list', metricsKey, itemKey]}
                                    height='calc(100vh - 205px)'
                                    content={item.content}
                                    format={item.format}
                                  />
                                </Tabs.TabPane>
                              ))}
                            </Tabs>
                          </Tabs.TabPane>
                        ),
                      )}
                    </Tabs>
                  )}
                </Tabs.TabPane>
              ) : key === 'dial_list' ? (
                <Tabs.TabPane tab={t('setting.dial')} key='dial-config'>
                  {_.isEmpty(value) ? (
                    <Result subTitle={t('common:nodata')} />
                  ) : (
                    <Tabs tabPosition='left' type='card' className='agents-setting-metrics'>
                      {Object.entries(value).map(([dialKey, dialGroup]: [string, Record<string, ISettingOption>]) => (
                        <Tabs.TabPane tab={dialKey} key={dialKey}>
                          <Tabs
                            style={{ position: 'relative' }}
                            tabBarExtraContent={<div style={{ width: '206px' }}></div>}
                          >
                            {Object.entries(dialGroup).map(([itemKey, item]: [string, ISettingOption]) => (
                              <Tabs.TabPane tab={`${itemKey}.${item.format || 'toml'}`} key={itemKey}>
                                <div style={{ position: 'absolute', top: '14px', right: 0 }}>
                                  {value?.[dialKey]?.[itemKey]?.update_at && (
                                    <span className='agents-setting-update-at'>
                                      {t('setting.recently_updated')}
                                      {moment.unix(value[dialKey][itemKey].update_at).format('YYYY-MM-DD HH:mm:ss')}
                                    </span>
                                  )}
                                </div>
                                <CodeMirrorContainer
                                  type={['dial-config']}
                                  height='calc(100vh - 205px)'
                                  content={item.content}
                                  format={item.format}
                                />
                              </Tabs.TabPane>
                            ))}
                          </Tabs>
                        </Tabs.TabPane>
                      ))}
                    </Tabs>
                  )}
                </Tabs.TabPane>
              ) : (
                <>
                  {key === 'logs' && (
                    <Tabs.TabPane tab={<div style={{ color: '#262626' }}>{t('setting.logs')}</div>} key={key}>
                      {_.isEmpty(value) && _.isEmpty(settingData.logs_item_list) ? (
                        <Result subTitle={t('common:nodata')} />
                      ) : (
                        settingData.logs_item_list && (
                          <Tabs
                            tabPosition='left'
                            type='card'
                            className='agents-setting-metrics'
                            style={{ height: `calc(100vh - 508px)` }}
                            hideAdd
                          >
                            {Object.entries(settingData.logs_item_list).map(
                              ([logKey, logValue]: [string, ISettingOption[]]) => (
                                <Tabs.TabPane tab={logKey} key={logKey} closable={false}>
                                  <Tabs
                                    style={{ position: 'relative' }}
                                    tabBarExtraContent={<div style={{ width: '206px' }}></div>}
                                  >
                                    {logValue.map((item: ISettingOption) => (
                                      <Tabs.TabPane
                                        tab={`${item.id}.${item.format || 'toml'}`}
                                        key={item.id}
                                        closable={false}
                                      >
                                        <div style={{ position: 'absolute', top: '14px', right: 0 }}>
                                          {item?.update_at && (
                                            <span className='agents-setting-update-at'>
                                              {t('setting.recently_updated')}
                                              {moment.unix(item.update_at).format('YYYY-MM-DD HH:mm:ss')}
                                            </span>
                                          )}
                                        </div>

                                        <CodeMirrorContainer
                                          type={['logs_item_list', logKey, item.id]}
                                          height='calc(100vh - 205px)'
                                          content={item.content}
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
                      )}
                    </Tabs.TabPane>
                  )}
                  {key === 'pipelines' && value && (
                    <Tabs.TabPane tab={<div style={{ color: '#262626' }}>Logstash</div>} key={key}>
                      <CodeMirrorContainer
                        type={[key]}
                        height='300px'
                        content={value.content}
                        updateAt={settingData[key]?.update_at}
                        format={value.format}
                      />
                      {settingData.logstash && (
                        <Tabs
                          tabPosition='left'
                          type='card'
                          className='agents-setting-metrics'
                          style={{ height: `calc(100vh - 508px)`, marginTop: '20px' }}
                          hideAdd
                        >
                          {Object.entries(settingData.logstash).map(
                            ([logstashKey, logstashValue]: [string, ISettingOption]) => (
                              <Tabs.TabPane tab={logstashKey} key={logstashKey} closable={false}>
                                <CodeMirrorContainer
                                  type={['logs', logstashKey]}
                                  height='calc(100vh - 208px)'
                                  content={logstashValue.content}
                                  updateAt={settingData['logstash']?.[logstashKey]?.update_at}
                                  format={logstashValue.format}
                                />
                              </Tabs.TabPane>
                            ),
                          )}
                        </Tabs>
                      )}
                    </Tabs.TabPane>
                  )}
                </>
              ),
            )}
          </Tabs>
        </div>
      </div>
    </PageLayout>
  );
};
export default Setting;
