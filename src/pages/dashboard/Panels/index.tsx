import React, { useRef, useState, useContext, useEffect } from 'react';
import _ from 'lodash';
import semver from 'semver';
import { v4 as uuidv4 } from 'uuid';
import { message, Modal } from 'antd';
import { useLocation, useParams } from 'react-router-dom';
import querystring from 'query-string';
import RGL, { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import { updateDashboardConfigs as updateDashboardConfigsFunc } from '@/services/dashboardV2';
import { updateDashboardDetail } from '@/pages/dashboardBuiltin/services';
import { Dashboard } from '@/store/dashboardInterface';
import { useTranslation } from 'react-i18next';
import { CommonStateContext, Datasource } from '@/App';
import {
  buildLayout,
  sortPanelsByGridLayout,
  updatePanelsLayout,
  handleRowToggle,
  updatePanelsWithNewPanel,
  updatePanelsInsertNewPanel,
  panelsMergeToConfigs,
  updatePanelsInsertNewPanelToRow,
  getRowCollapsedPanels,
  getRowUnCollapsedPanels,
  processRepeats,
} from './utils';
import Renderer from '../Renderer/Renderer/index';
import Row from './Row';
import Editor from '../Editor';
import './style.less';

interface IProps {
  dashboardId: string; // 普通仪表盘 id or 分享仪表盘 id
  editable: boolean;
  dashboard: Dashboard;
  range: IRawTimeRange | { start: number; end: number };
  variableConfig: any;
  panels: any[];
  isPreview: boolean;
  isBuiltin?: boolean;
  isShare?: boolean;
  headerRef?: any;
  setPanels: (panels: any[]) => void;
  onShareClick?: (panel: any) => void;
  onUpdated: (res: any) => void;
  updateVariableConfig?: () => void;
  groupedDatasourceList: { [key: string]: Datasource[] };
}

const ReactGridLayout = WidthProvider(RGL);

function Panels(props: IProps) {
  const { t } = useTranslation('dashboard');
  const { profile, menuWidth } = useContext(CommonStateContext);
  const location = useLocation();
  const { cate, code } = useParams<{ cate: string; code: string }>();
  const { themeMode } = querystring.parse(location.search) as {
    themeMode: string;
  };
  const {
    dashboardId,
    editable,
    dashboard,
    range,
    variableConfig,
    panels,
    isPreview,
    isBuiltin,
    isShare,
    groupedDatasourceList,
    updateVariableConfig,
    setPanels,
    onShareClick,
    onUpdated,
    headerRef,
  } = props;
  const roles = _.get(profile, 'roles', []);
  const isAuthorized = isBuiltin
    ? profile.admin && !isPreview
    : !(roles.length === 1 && roles[0] === 'Guest') && !isPreview;
  const layoutInitialized = useRef(false);
  const allowUpdateDashboardConfigs = useRef(false);
  const reactGridLayoutDefaultProps = {
    rowHeight: 40,
    cols: 24,
    useCSSTransforms: false,
    draggableHandle: '.dashboards-panels-item-drag-handle',
  };
  const updateDashboardConfigs = (dashboardId, options) => {
    if (!editable) {
      message.warning('仪表盘已经被别人修改，为避免相互覆盖，请刷新仪表盘查看最新配置和数据');
    }
    if (!_.isEmpty(roles) && isAuthorized && editable) {
      return isBuiltin
        ? updateDashboardDetail(cate, code, {
            id: dashboard.id,
            tags: dashboard.tags,
            name: dashboard.name,
            ...options,
          })
        : updateDashboardConfigsFunc(dashboardId, options);
    }
    return Promise.reject();
  };

  const [editorData, setEditorData] = useState({
    mode: 'add',
    visible: false,
    id: '',
    initialValues: {} as any,
  });

  useEffect(() => {
    setPanels(processRepeats(panels, variableConfig));
  }, []);

  useEffect(() => {
    // 解决菜单栏收缩仪表盘布局未自适应问题
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 500);
  }, [menuWidth]);

  return (
    <div className='dashboards-panels scroll-container'>
      <ReactGridLayout
        layout={buildLayout(panels)}
        onLayoutChange={(layout) => {
          if (layoutInitialized.current) {
            let newPanels = sortPanelsByGridLayout(updatePanelsLayout(panels, layout));
            // 位置发生改变
            if (!_.isEqual(panels, newPanels)) {
              // 如果改变了分组，重新绑定分组id
              // newPanels = bindRowId(newPanels);
              setPanels(newPanels);
              // TODO: 这里可能会触发两次 update, 删除、克隆面板后可能会触发 layoutChange，此时需要更新面板重新更新下 dashboard 配置
              if (allowUpdateDashboardConfigs.current) {
                allowUpdateDashboardConfigs.current = false;
                updateDashboardConfigs(dashboard.id, {
                  configs: panelsMergeToConfigs(dashboard.configs, newPanels),
                }).then((res) => {
                  onUpdated(res);
                });
              }
            }
          }
          layoutInitialized.current = true;
        }}
        onDragStop={(layout) => {
          const newPanels = sortPanelsByGridLayout(updatePanelsLayout(panels, layout));
          if (!_.isEqual(panels, newPanels)) {
            updateDashboardConfigs(dashboard.id, {
              configs: panelsMergeToConfigs(dashboard.configs, newPanels),
            }).then((res) => {
              onUpdated(res);
            });
          }
        }}
        onResizeStop={(layout) => {
          const newPanels = sortPanelsByGridLayout(updatePanelsLayout(panels, layout));
          if (!_.isEqual(panels, newPanels)) {
            updateDashboardConfigs(dashboard.id, {
              configs: panelsMergeToConfigs(dashboard.configs, newPanels),
            }).then((res) => {
              onUpdated(res);
            });
          }
        }}
        {...reactGridLayoutDefaultProps}
      >
        {_.map(panels, (item) => {
          return (
            <div key={item.layout.i} data-id={item.layout.i}>
              {item.type !== 'row' ? (
                semver.valid(item.version) ? (
                  <Renderer
                    headerRef={headerRef}
                    isPreview={!isAuthorized}
                    isBuiltin={isBuiltin}
                    themeMode={themeMode as 'dark'}
                    dashboardId={_.toString(props.dashboardId)}
                    id={item.id}
                    group_id={dashboard.group_id}
                    board_id={dashboard.id}
                    time={range}
                    values={item}
                    isShare={isShare}
                    variableConfig={
                      variableConfig
                      //   mergeTwoVarOption(
                      //   variableConfig,
                      //   panels.find((ele) => ele.id === item.rowId)?.varOption,
                      // )
                    }
                    groupedDatasourceList={groupedDatasourceList}
                    onCloneClick={() => {
                      const newPanels = updatePanelsInsertNewPanel(panels, {
                        ...item,
                        id: uuidv4(),
                        layout: {
                          ...item.layout,
                          i: uuidv4(),
                        },
                      });
                      setPanels(newPanels);
                      // 克隆面板必然会触发 layoutChange，更新 dashboard 放到 onLayoutChange 里面处理
                      allowUpdateDashboardConfigs.current = true;
                    }}
                    onShareClick={
                      onShareClick
                        ? () =>
                            onShareClick({
                              ...item,
                              // rowVarOption: panels.find((ele) => ele.id === item.rowId)?.varOption,
                            })
                        : undefined
                    }
                    onEditClick={() => {
                      setEditorData({
                        mode: 'edit',
                        visible: true,
                        id: item.id,
                        initialValues: {
                          ...item,
                          id: item.id,
                        },
                      });
                    }}
                    onDeleteClick={() => {
                      Modal.confirm({
                        title: `是否删除图表：${item.name}`,
                        okText: t('common:btn.ok'),
                        cancelText: t('common:btn.cancel'),
                        onOk: async () => {
                          const newPanels = _.filter(panels, (panel) => panel.id !== item.id);
                          allowUpdateDashboardConfigs.current = true;
                          setPanels(newPanels);
                          updateDashboardConfigs(dashboard.id, {
                            configs: panelsMergeToConfigs(dashboard.configs, newPanels),
                          }).then((res) => {
                            onUpdated(res);
                          });
                        },
                      });
                    }}
                  />
                ) : (
                  <div className='dashboards-panels-item-invalid'>
                    <div>
                      <div>无效的图表配置</div>
                      <a
                        onClick={() => {
                          const newPanels = _.filter(panels, (panel) => panel.id !== item.id);
                          allowUpdateDashboardConfigs.current = true;
                          setPanels(newPanels);
                          updateDashboardConfigs(dashboard.id, {
                            configs: panelsMergeToConfigs(dashboard.configs, newPanels),
                          }).then((res) => {
                            onUpdated(res);
                          });
                        }}
                      >
                        删除
                      </a>
                    </div>
                  </div>
                )
              ) : (
                <Row
                  isPreview={!isAuthorized}
                  row={item}
                  range={range}
                  isBuiltin={isBuiltin}
                  isShare={isShare}
                  dashboard={dashboard}
                  groupedDatasourceList={groupedDatasourceList}
                  panels={panels}
                  setPanels={setPanels}
                  onToggle={() => {
                    const newPanels = handleRowToggle(!item.collapsed, panels, _.cloneDeep(item));
                    setPanels(newPanels);
                    updateDashboardConfigs(dashboard.id, {
                      configs: panelsMergeToConfigs(dashboard.configs, newPanels),
                    }).then((res) => {
                      onUpdated(res);
                    });
                  }}
                  onAddClick={() => {
                    setEditorData({
                      mode: 'add',
                      visible: true,
                      id: item.id,
                      initialValues: {
                        type: 'timeseries',
                        name: 'Panel Title',
                        targets: [
                          {
                            refId: 'A',
                            expr: '',
                          },
                        ],
                        rowId: item.id,
                      },
                    });
                  }}
                  onEditClick={(newPanel) => {
                    const newPanels = updatePanelsWithNewPanel(panels, newPanel);
                    setPanels(newPanels);
                    updateDashboardConfigs(dashboard.id, {
                      configs: panelsMergeToConfigs(dashboard.configs, newPanels),
                    }).then((res) => {
                      onUpdated(res);
                    });
                  }}
                  onDeleteClick={(mode: 'self' | 'withPanels') => {
                    let newPanels: any[] = _.cloneDeep(panels);
                    if (mode === 'self') {
                      newPanels = getRowCollapsedPanels(newPanels, item);
                      newPanels = _.filter(newPanels, (panel) => panel.id !== item.id);
                    } else {
                      newPanels = getRowUnCollapsedPanels(newPanels, item);
                      newPanels = _.filter(newPanels, (panel) => panel.id !== item.id);
                    }
                    allowUpdateDashboardConfigs.current = true;
                    setPanels(newPanels);
                    updateDashboardConfigs(dashboard.id, {
                      configs: panelsMergeToConfigs(dashboard.configs, newPanels),
                    }).then((res) => {
                      onUpdated(res);
                    });
                  }}
                />
              )}
            </div>
          );
        })}
      </ReactGridLayout>
      <Editor
        mode={editorData.mode}
        visible={editorData.visible}
        setVisible={(visible) => {
          setEditorData({
            ...editorData,
            visible,
          });
        }}
        variableConfigWithOptions={
          variableConfig
          //   mergeTwoVarOption(
          //     variableConfig
          //   variableConfig,
          //   panels.find((ele) => ele.id === editorData.initialValues.rowId)?.varOption,
          // )
        }
        updateVariableConfig={updateVariableConfig}
        id={editorData.id}
        group_id={dashboard.group_id}
        board_id={dashboard.id}
        dashboardId={_.toString(props.dashboardId)}
        time={range as IRawTimeRange}
        initialValues={editorData.initialValues}
        groupedDatasourceList={groupedDatasourceList}
        // panels={panels}
        // setPanels={setPanels}
        onOK={(values, mode) => {
          const newPanels =
            mode === 'edit'
              ? updatePanelsWithNewPanel(panels, values)
              : updatePanelsInsertNewPanelToRow(panels, editorData.id, values);
          setPanels(newPanels);
          updateDashboardConfigs(dashboard.id, {
            configs: panelsMergeToConfigs(dashboard.configs, newPanels),
          }).then((res) => {
            onUpdated(res);
          });
        }}
      />
    </div>
  );
}

export default React.memo(Panels);
