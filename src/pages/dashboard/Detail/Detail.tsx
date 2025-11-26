import React, { useState, useRef, useEffect, useContext } from 'react';
import _ from 'lodash';
import semver from 'semver';
import { useTranslation } from 'react-i18next';
import { getDatasourceBriefList } from '@/services/common';
import { useInterval } from 'ahooks';
import { v4 as uuidv4 } from 'uuid';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { Alert, Modal, Button, message } from 'antd';
import moment from 'moment';
import PageLayout from '@/components/pageLayout';
import { IRawTimeRange, getDefaultValue, parseRange } from '@/components/TimeRangePicker';
import { Dashboard } from '@/store/dashboardInterface';
import { getDashboard, updateDashboardConfigs, getDashboardPure, getBuiltinDashboard } from '@/services/dashboardV2';
import { updateDashboardDetail } from '@/pages/dashboardBuiltin/services';
import { CommonStateContext } from '@/App';
import MigrationModal from '@/pages/help/migrate/MigrationModal';
import VariableConfig, { IVariable } from '../VariableConfig';
import { ILink } from '../types';
import DashboardLinks from '../DashboardLinks';
import Panels from '../Panels';
import Title from './Title';
import { JSONParse } from '../utils';
import Editor from '../Editor';
import { defaultCustomValuesMap, defaultOptionsValuesMap } from '../Editor/config';
import {
  sortPanelsByGridLayout,
  panelsMergeToConfigs,
  updatePanelsInsertNewPanelToGlobal,
  bindRowId,
  mergeTwoVarOption,
} from '../Panels/utils';
import { useGlobalState } from '../globalState';
import { createShareChartID } from '@/services/metricViews';
import ShareChartModal from '@/components/ShareChartModal';
import replaceFieldWithVariable from '../Renderer/utils/replaceFieldWithVariable';
import { replaceExpressionVarsForEs, replaceExpressionVars } from '../VariableConfig/constant';
import './style.less';
import './dark.antd.less';
import './dark.less';

interface URLParam {
  id: string;
  cate: string;
  code: string;
}

interface IProps {
  isPreview?: boolean;
  isBuiltin?: boolean;
  gobackPath?: string;
  gobackSearch?: string;
  onLoaded?: (dashboard: Dashboard['configs']) => boolean;
}

export const dashboardTimeCacheKey = 'dashboard-timeRangePicker-value';
const fetchDashboard = ({ id, builtinParams }) => {
  if (builtinParams) {
    const { cate_code, code } = builtinParams;
    return getBuiltinDashboard(cate_code, code);
  }
  return getDashboard(id);
};

export default function DetailV2(props: IProps) {
  const { isPreview = false, isBuiltin = false, gobackPath, gobackSearch } = props;
  const { t, i18n } = useTranslation('dashboard');
  const history = useHistory();
  const headerRef = useRef(null);
  const { search } = useLocation<any>();
  const query = queryString.parse(search);
  const bgid = Number(query.bgid);
  // 分享的图表、仪表盘
  const [shareConfig, setShareConfig] = useState<{ type: 'chart' | 'dashboard'; configs: string }>();
  const { datasourceList, profile, curBusiId, setCurBusiId, setDatasourceList, groupedDatasourceList, curBusiGroup } =
    useContext(CommonStateContext);
  const roles = _.get(profile, 'roles', []);

  const isAuthorized = !(roles.length === 1 && roles[0] === 'Guest') && !isPreview;
  const [dashboardMeta, setDashboardMeta] = useGlobalState('dashboardMeta');
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refreshFlag_'));
  let { id, cate, code } = useParams<URLParam>();
  if (isBuiltin) {
    const query = queryString.parse(useLocation().search);
    id = query?.id as string;
  }
  const refreshRef = useRef<{ closeRefresh: Function }>();
  const [dashboard, setDashboard] = useState<Dashboard>({} as Dashboard);
  const [variableConfig, setVariableConfig] = useState<IVariable[]>();
  const [variableConfigWithOptions, setVariableConfigWithOptions] = useState<IVariable[]>();
  const [dashboardLinks, setDashboardLinks] = useState<ILink[]>();
  const [panels, setPanels] = useState<any[]>([]);
  const [range, setRange] = useState<IRawTimeRange>(
    getDefaultValue(dashboardTimeCacheKey, {
      start: 'now-1h',
      end: 'now',
    }),
  );
  // 最近一次查询使用的具体时间
  const [searchRange, setSearchRange] = useState({ start: 0, end: 0 });
  const [editable, setEditable] = useState(true);
  const [shareVisible, setShareVisible] = useState(false);
  const [editorData, setEditorData] = useState({
    visible: false,
    id: '',
    initialValues: {} as any,
  });
  const [migrationVisible, setMigrationVisible] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  let updateAtRef = useRef<number>();
  const refresh = async (cbk?: () => void) => {
    const builtinParams = isBuiltin
      ? { cate_code: cate, code: code, id: query.id !== undefined ? Number(query.id) : 0 }
      : undefined;
    fetchDashboard({
      id,
      builtinParams,
    }).then((res) => {
      updateAtRef.current = res.update_at;
      const configs = _.isString(res.configs) ? JSONParse(res.configs) : res.configs;
      if (props.onLoaded && !props.onLoaded(configs)) {
        return;
      }
      if (!configs.version || semver.lt(configs.version, '3.0.0')) {
        setMigrationVisible(true);
      }

      setDashboard({
        group_id: bgid || curBusiId,
        ...res,
        configs,
      });
      if (configs) {
        // TODO: configs 中可能没有 var 属性会导致 VariableConfig 报错
        const variableConfig = configs.var
          ? configs
          : {
              ...configs,
              var: [],
            };
        setVariableConfig(
          _.map(variableConfig.var, (item) => {
            return _.omit(item, 'options'); // 兼容性代码，去除掉已保存的 options
          }) as IVariable[],
        );
        setDashboardLinks(configs.links);
        const newPanels = bindRowId(configs.panels);
        setPanels(sortPanelsByGridLayout(newPanels));
        if (cbk) {
          cbk();
        }
      }
    });
  };
  const handleUpdateDashboardConfigs = (id, configs) => {
    if (isBuiltin) {
      updateDashboardDetail(dashboard.cate_code!, dashboard.code!, {
        id: dashboard.id,
        tags: dashboard.tags,
        code: dashboard.code,
        ...configs,
      }).then((res) => {
        refresh();
      });
    } else {
      updateDashboardConfigs(id, configs).then((res) => {
        updateAtRef.current = res.update_at;
        refresh();
      });
    }
  };
  const handleVariableChange = (value, b, valueWithOptions) => {
    const dashboardConfigs: any = dashboard.configs;
    dashboardConfigs.var = value;
    // 更新变量配置
    b && handleUpdateDashboardConfigs(dashboard.id, { configs: JSON.stringify(dashboardConfigs) });
    // 更新变量配置状态
    if (valueWithOptions) {
      setVariableConfigWithOptions(valueWithOptions);
      setDashboardMeta({
        dashboardId: _.toString(dashboard.id),
        variableConfigWithOptions: valueWithOptions,
      });
    }
  };
  const stopAutoRefresh = () => {
    refreshRef.current?.closeRefresh();
  };

  useEffect(() => {
    refresh();
  }, [search]);

  useEffect(() => {
    const parsedRange = parseRange(range);
    const start = moment(parsedRange.start).valueOf();
    const end = moment(parsedRange.end).valueOf();
    setSearchRange({ start, end });
  }, [range]);

  useEffect(() => {
    if (!isBuiltin && dashboard.group_id && dashboard.group_id !== curBusiId) {
      setCurBusiId(dashboard.group_id);
      getDatasourceBriefList().then((res) => {
        setDatasourceList(res);
      });
      message.success('当前业务组已进行变更');
    }
  }, [dashboard.group_id]);

  useInterval(() => {
    if (import.meta.env.PROD && dashboard.id && !isBuiltin) {
      getDashboardPure(_.toString(dashboard.id)).then((res) => {
        if (updateAtRef.current && res.update_at > updateAtRef.current) {
          if (editable) setEditable(false);
        } else {
          setEditable(true);
        }
      });
    }
  }, 2000);

  const onCreateShareUrl = async (values) => {
    let expiration: number;
    const size = Number(values.size);
    if (values.size === '') {
      expiration = -1;
    } else {
      const interval = size * (values.unit === 'h' ? 3600 : 86400);
      expiration = moment(new Date()).unix() + interval;
    }

    const result = await createShareChartID([
      {
        configs: shareConfig?.configs!,
        share_type: shareConfig?.type === 'chart' ? 2 : 1, //1：仪表盘，2，单个图表
        note: values.note,
        expiration: expiration,
        user_ids: values.user_ids,
        group_id: dashboard.group_id,
      },
    ]);
    return shareConfig?.type === 'chart' ? `/chart/${result.dat[0]}` : `/dashboards/share/${result.dat[0]}`;
  };

  return (
    <PageLayout
      customArea={
        <Title
          isPreview={isPreview}
          isBuiltin={isBuiltin}
          isAuthorized={isAuthorized}
          gobackPath={gobackPath}
          gobackSearch={gobackSearch}
          dashboard={dashboard}
          range={range}
          setRange={(v) => {
            setRange(v);
          }}
          onShareChart={() => {
            setShareVisible(true);
            const newpanels = panels.map((panel) => {
              let query: string[] = [];
              let targets = panel.targets?.map((target) => {
                if (panel.datasourceCate === 'elasticsearch') {
                  const realExpr: any = variableConfigWithOptions
                    ? replaceExpressionVarsForEs(
                        target.query.filter,
                        variableConfigWithOptions,
                        variableConfigWithOptions.length,
                        id,
                      )
                    : query.filter;
                  realExpr && query.push(realExpr);
                } else {
                  const realExpr = variableConfigWithOptions
                    ? replaceFieldWithVariable(id, target.expr, variableConfigWithOptions, panel.scopedVars)
                    : target.expr;
                  realExpr && query.push(realExpr);
                }
                let time = target.time;
                if (target.time) {
                  const parsedRange = parseRange(target.time);
                  const start = moment(parsedRange.start).valueOf();
                  const end = moment(parsedRange.end).valueOf();
                  time = { start, end };
                }

                return target.time ? { ...target, time } : target;
              });
              return { ...panel, query, targets };
            });

            setShareConfig({
              type: 'dashboard',
              configs: JSON.stringify({
                ...dashboard.configs,
                panels: newpanels,
                range: searchRange,
                groupedDatasourceList,
                dashboardName: dashboard.name,
                variableConfigWithOptions,
              }),
            });
          }}
          onAddPanel={(type) => {
            if (type === 'row') {
              const newPanels = updatePanelsInsertNewPanelToGlobal(
                panels,
                {
                  type: 'row',
                  id: uuidv4(),
                  name: i18n.language === 'en_US' ? 'Row' : '分组',
                  collapsed: true,
                },
                'row',
              );
              setPanels(newPanels);
              handleUpdateDashboardConfigs(dashboard.id, {
                configs: panelsMergeToConfigs(dashboard.configs, newPanels),
              });
            } else {
              // 获取最近的分组
              const lastRow = panels
                .slice()
                .reverse()
                .find((item) => item.type === 'row');

              setEditorData({
                visible: true,
                id: uuidv4(),
                initialValues: {
                  name: 'Panel Title',
                  type,
                  targets: [
                    {
                      refId: 'A',
                      expr: '',
                    },
                  ],
                  custom: defaultCustomValuesMap[type],
                  options: defaultOptionsValuesMap[type],
                  rowId: lastRow?.id,
                },
              });
            }
          }}
        />
      }
    >
      <div className='dashboard-detail-container'>
        <div className='dashboard-detail-content'>
          {!editable && (
            <div style={{ padding: '5px 10px' }}>
              <Alert type='warning' message='仪表盘已经被别人修改，为避免相互覆盖，请刷新仪表盘查看最新配置和数据' />
            </div>
          )}
          <div className='dashboard-detail-content-header' ref={headerRef}>
            <div className='variable-area'>
              {variableConfig && (
                <VariableConfig
                  isPreview={!isAuthorized}
                  onChange={handleVariableChange}
                  value={variableConfig}
                  updateVariable={refreshFlag}
                  range={range}
                  id={id}
                  onOpenFire={stopAutoRefresh}
                  group_id={dashboard.group_id}
                  groupedDatasourceList={groupedDatasourceList}
                  editable={curBusiGroup.perm === 'rw'}
                />
              )}
            </div>
            {isAuthorized && !isBuiltin && (
              <DashboardLinks
                value={dashboardLinks}
                onChange={(v) => {
                  const dashboardConfigs: any = dashboard.configs;
                  dashboardConfigs.links = v;
                  handleUpdateDashboardConfigs(id, {
                    configs: JSON.stringify(dashboardConfigs),
                  });
                  setDashboardLinks(v);
                }}
                editable={curBusiGroup.perm === 'rw'}
              />
            )}
          </div>
          {variableConfigWithOptions && (
            <Panels
              dashboardId={id}
              isPreview={isPreview}
              isBuiltin={isBuiltin}
              editable={editable}
              panels={panels}
              setPanels={setPanels}
              dashboard={dashboard}
              range={range}
              variableConfig={variableConfigWithOptions}
              headerRef={headerRef.current}
              updateVariableConfig={() => setRefreshFlag(_.uniqueId('refreshFlag_'))}
              groupedDatasourceList={groupedDatasourceList}
              onShareClick={(panel) => {
                setShareVisible(true);
                let esVersion: string | undefined;
                const curDatasourceValue = replaceExpressionVars(
                  panel.datasourceValue,
                  variableConfigWithOptions,
                  variableConfigWithOptions.length,
                  id,
                );
                if (panel.datasourceCate === 'elasticsearch') {
                  esVersion = groupedDatasourceList.elasticsearch.filter(
                    (element) => element.id === Number(curDatasourceValue),
                  )[0]?.settings?.version;
                }

                let query: string[] = [];
                panel.targets?.forEach((target) => {
                  if (panel.datasourceCate === 'elasticsearch') {
                    const realExpr: any = variableConfigWithOptions
                      ? replaceExpressionVarsForEs(
                          target.query.filter,
                          variableConfigWithOptions,
                          variableConfigWithOptions.length,
                          id,
                        )
                      : query.filter;
                    realExpr && query.push(realExpr);
                  } else {
                    const realExpr = variableConfigWithOptions
                      ? replaceFieldWithVariable(id, target.expr, variableConfigWithOptions, panel.scopedVars)
                      : target.expr;
                    realExpr && query.push(realExpr);
                  }
                  let time = target.time;
                  if (target.time) {
                    const parsedRange = parseRange(target.time);
                    const start = moment(parsedRange.start).valueOf();
                    const end = moment(parsedRange.end).valueOf();
                    time = { start, end };
                  }

                  return time ? { ...target, time } : target;
                });

                const serielData = {
                  dataProps: {
                    ...panel,
                    group_id: dashboard.group_id,
                    board_id: dashboard.id,
                    datasourceValue: curDatasourceValue,
                    // @ts-ignore
                    datasourceName: _.find(datasourceList, { id: curDatasourceValue })?.name,
                    targets: _.map(panel.targets, (target) => {
                      const realExpr = variableConfigWithOptions
                        ? replaceExpressionVars(
                            target.expr,
                            variableConfigWithOptions,
                            variableConfigWithOptions.length,
                            id,
                          )
                        : target.expr;
                      return {
                        ...target,
                        expr: realExpr,
                      };
                    }),
                    range: searchRange,
                    esVersion: esVersion,
                    groupedDatasourceList,
                    var: dashboard.configs.var,
                    query,
                    variableConfigWithOptions,
                  },
                };
                setShareConfig({ type: 'chart', configs: JSON.stringify(serielData) });
              }}
              onUpdated={(res) => {
                updateAtRef.current = res.update_at;
                refresh();
              }}
            />
          )}
        </div>
      </div>
      <Editor
        mode='add'
        visible={editorData.visible}
        setVisible={(visible) => {
          setEditorData({
            ...editorData,
            visible,
          });
        }}
        updateVariableConfig={() => setRefreshFlag(_.uniqueId('refreshFlag_'))}
        variableConfigWithOptions={mergeTwoVarOption(
          variableConfig,
          panels.find((ele) => ele.id === editorData.initialValues.rowId)?.varOption,
        )}
        id={editorData.id}
        group_id={dashboard.group_id}
        board_id={dashboard.id}
        dashboardId={id}
        time={range}
        initialValues={editorData.initialValues}
        groupedDatasourceList={groupedDatasourceList}
        onOK={(values) => {
          const newPanels = updatePanelsInsertNewPanelToGlobal(panels, values, 'chart');
          setPanels(newPanels);
          handleUpdateDashboardConfigs(dashboard.id, {
            configs: panelsMergeToConfigs(dashboard.configs, newPanels),
          });
        }}
      />
      {/*迁移*/}
      <Modal
        title='迁移大盘'
        visible={migrationVisible}
        onCancel={() => {
          setMigrationVisible(false);
        }}
        footer={
          isBuiltin
            ? profile.admin
              ? [
                  <Button
                    key='cancel'
                    danger
                    onClick={() => {
                      setMigrationVisible(false);
                      handleUpdateDashboardConfigs(dashboard.id, {
                        configs: JSON.stringify({
                          ...dashboard.configs,
                          version: '3.0.0',
                        }),
                      });
                    }}
                  >
                    升级到3.0.0版本
                  </Button>,
                ]
              : null
            : [
                <Button
                  key='cancel'
                  danger
                  onClick={() => {
                    setMigrationVisible(false);
                    handleUpdateDashboardConfigs(dashboard.id, {
                      configs: JSON.stringify({
                        ...dashboard.configs,
                        version: '3.0.0',
                      }),
                    });
                  }}
                >
                  升级到3.0.0版本
                </Button>,
                // <Button
                //   key='batchMigrate'
                //   type='primary'
                //   ghost
                //   onClick={() => {
                //     history.push('/help/migrate');
                //   }}
                // >
                //   前往批量迁移大盘
                // </Button>,
                <Button
                  key='migrate'
                  type='primary'
                  onClick={() => {
                    setMigrationVisible(false);
                    setMigrationModalOpen(true);
                  }}
                >
                  迁移当前大盘
                </Button>,
              ]
        }
      >
        v6 版本将不再支持全局 Prometheus 集群切换，新版本可通过图表关联数据源变量来实现该能力。 <br />
        迁移工具会创建数据源变量以及关联所有未关联数据源的图表。
      </Modal>
      <MigrationModal
        visible={migrationModalOpen}
        setVisible={setMigrationModalOpen}
        boards={[dashboard]}
        onOk={() => {
          refresh();
        }}
      />
      <ShareChartModal
        visible={shareVisible}
        mode='add'
        onCancel={() => setShareVisible(false)}
        onCreateShareUrl={onCreateShareUrl}
      />
    </PageLayout>
  );
}
