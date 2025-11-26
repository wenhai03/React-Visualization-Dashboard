import React, { useState, useEffect, useRef, useContext } from 'react';
import _ from 'lodash';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { useInViewport } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { Dropdown, Menu, Tooltip, Space } from 'antd';
import {
  InfoCircleOutlined,
  MoreOutlined,
  LinkOutlined,
  SettingOutlined,
  ShareAltOutlined,
  DeleteOutlined,
  CopyOutlined,
  SyncOutlined,
  ExpandOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import { CommonStateContext } from '@/App';
import { isAbsolutePath } from '@/pages/dashboard/utils';
import Timeseries from './Timeseries';
import Stat from './Stat';
import Table from './Table';
import Pie from './Pie';
import Hexbin from './Hexbin';
import BarGauge from './BarGauge';
import Text from './Text';
import Gauge from './Gauge';
import Iframe from './Iframe';
import { IVariable } from '../../VariableConfig/definition';
import Markdown from '../../Editor/Components/Markdown';
import useQuery from '../datasource/useQuery';
import { IPanel } from '../../types';
import replaceFieldWithVariable from '../utils/replaceFieldWithVariable';
import './style.less';

interface IProps {
  datasourceValue?: number; // 全局数据源，如 values.datasourceValue 未设置则用全局数据源
  themeMode?: 'dark';
  dashboardId: string;
  id?: string;
  group_id?: number;
  board_id?: number;
  time: IRawTimeRange | { start: number; end: number };
  values: IPanel;
  variableConfig?: IVariable[];
  isPreview?: boolean; // 是否是预览，预览中不显示编辑和分享
  isBuiltin?: boolean;
  isShare?: boolean;
  esVersion?: string;
  onCloneClick?: () => void;
  onShareClick?: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
  groupedDatasourceList?: any;
  headerRef?: any;
}

function Renderer(props: IProps) {
  const { t } = useTranslation('dashboard');
  const { curBusiGroup, groupedDatasourceList, menuWidth, fullScreenPanel, setFullScreenPanel } =
    useContext(CommonStateContext);
  const {
    datasourceValue,
    themeMode,
    dashboardId,
    id,
    variableConfig,
    isPreview,
    isBuiltin,
    onCloneClick,
    onShareClick,
    onEditClick,
    onDeleteClick,
    group_id,
    board_id,
    isShare,
    esVersion,
    headerRef,
  } = props;
  const newGroupedDatasourceList = props.groupedDatasourceList ?? groupedDatasourceList;
  const [time, setTime] = useState(props.time);
  const [visible, setVisible] = useState(false);
  const values = _.cloneDeep(props.values);
  const ref = useRef<HTMLDivElement>(null);
  const tableRef = useRef<{ handleExportCsv: () => void }>(null);
  const bodyWrapRef = useRef<HTMLDivElement>(null);
  const [inViewPort] = useInViewport(ref);
  const { series, error, loading } = useQuery({
    id,
    dashboardId,
    time,
    group_id,
    board_id,
    calc: values.custom?.calc,
    targets: values.targets,
    variableConfig,
    inViewPort: isPreview || inViewPort,
    datasourceCate: values.datasourceCate || 'prometheus',
    datasourceValue: values.datasourceValue || datasourceValue,
    spanNulls: values.custom?.spanNulls,
    scopedVars: values.scopedVars,
    isShare,
    groupedDatasourceList: newGroupedDatasourceList,
    esVersion,
  });
  const name = replaceFieldWithVariable(dashboardId, values.name, variableConfig, values.scopedVars);
  const description = replaceFieldWithVariable(dashboardId, values.description, variableConfig, values.scopedVars);
  const tipsVisible = !error && (description || !_.isEmpty(values.links));

  useEffect(() => {
    setTime(props.time);
  }, [JSON.stringify(props.time)]);

  if (_.isEmpty(values)) return null;

  // TODO: 如果 hexbin 的 colorRange 为 string 时转成成 array
  if (typeof _.get(values, 'custom.colorRange') === 'string') {
    _.set(values, 'custom.colorRange', _.split(_.get(values, 'custom.colorRange'), ','));
  }
  const subProps = {
    values,
    series,
  };
  const RendererCptMap = {
    timeseries: () => <Timeseries {...subProps} themeMode={themeMode} time={time} isShare={isShare} />,
    stat: () => <Stat {...subProps} bodyWrapRef={bodyWrapRef} themeMode={themeMode} />,
    table: () => <Table {...subProps} themeMode={themeMode} time={time} isShare={isShare} ref={tableRef} />,
    pie: () => <Pie {...subProps} themeMode={themeMode} time={time} isShare={isShare} />,
    hexbin: () => <Hexbin {...subProps} themeMode={themeMode} time={time} isShare={isShare} />,
    barGauge: () => <BarGauge {...subProps} themeMode={themeMode} time={time} isShare={isShare} />,
    text: () => <Text {...subProps} />,
    gauge: () => <Gauge {...subProps} themeMode={themeMode} />,
    iframe: () => <Iframe {...subProps} time={time} isShare={isShare} />,
  };

  return (
    <div
      className={classNames({
        'renderer-container': true,
        'renderer-container-no-title': !values.name,
        'full-screen': fullScreenPanel && fullScreenPanel === id,
      })}
      ref={ref}
      style={
        fullScreenPanel && fullScreenPanel === id
          ? {
              left: `${menuWidth}px`,
              top: `${(headerRef?.getBoundingClientRect()?.height || 0) + 62}px`,
              height: `calc(100vh - ${(headerRef?.getBoundingClientRect()?.height || 0) + 51}px)`,
            }
          : {}
      }
    >
      <div className='renderer-body-wrap' ref={bodyWrapRef}>
        <div className='renderer-header graph-header'>
          {tipsVisible ? (
            <Tooltip
              placement='leftTop'
              overlayInnerStyle={{
                maxWidth: 300,
              }}
              getPopupContainer={() => ref.current!}
              title={
                <Space direction='vertical'>
                  {description ? <Markdown content={description} /> : null}
                  {_.map(values.links, (link, i) => {
                    return (
                      <div key={i}>
                        {!link.targetBlank && !isAbsolutePath(link.url) ? (
                          <Link to={replaceFieldWithVariable(dashboardId, link.url, variableConfig, values.scopedVars)}>
                            {replaceFieldWithVariable(dashboardId, link.title, variableConfig, values.scopedVars)}
                          </Link>
                        ) : (
                          <a
                            href={replaceFieldWithVariable(dashboardId, link.url, variableConfig, values.scopedVars)}
                            target={link.targetBlank ? '_blank' : '_self'}
                          >
                            {replaceFieldWithVariable(dashboardId, link.title, variableConfig, values.scopedVars)}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </Space>
              }
            >
              <div className='renderer-header-desc'>{description ? <InfoCircleOutlined /> : <LinkOutlined />}</div>
            </Tooltip>
          ) : null}
          {error && (
            <Tooltip
              title={error}
              placement='leftTop'
              overlayInnerStyle={{
                maxWidth: 300,
              }}
              getPopupContainer={() => ref.current!}
            >
              <div className='renderer-header-error'>
                <InfoCircleOutlined style={{ color: 'red' }} />
              </div>
            </Tooltip>
          )}
          <div className='renderer-header-content'>
            <Tooltip title={name} getPopupContainer={() => ref.current!}>
              <div className='renderer-header-title dashboards-panels-item-drag-handle'>{name}</div>
            </Tooltip>
          </div>
          <div className='renderer-header-loading'>
            {loading ? (
              <SyncOutlined spin />
            ) : (
              !isPreview &&
              !isShare && (
                <Dropdown
                  trigger={['click']}
                  placement='bottom'
                  getPopupContainer={() => ref.current!}
                  overlayStyle={{
                    minWidth: '100px',
                  }}
                  visible={visible}
                  onVisibleChange={(visible) => {
                    setVisible(visible);
                  }}
                  overlay={
                    <Menu>
                      {fullScreenPanel ? null : (
                        <Menu.Item
                          onClick={() => {
                            setVisible(false);
                            setFullScreenPanel(id);
                          }}
                          key='5'
                        >
                          <div>
                            <ExpandOutlined style={{ marginRight: 8 }} />
                            {t('common:btn.unfold')}
                          </div>
                        </Menu.Item>
                      )}
                      <Menu.Item
                        onClick={() => {
                          setVisible(true);
                          setTime({
                            ...time,
                            refreshFlag: _.uniqueId('refreshFlag_ '),
                          });
                        }}
                        key='0'
                      >
                        <SyncOutlined style={{ marginRight: 8 }} />
                        {t('refresh_btn')}
                      </Menu.Item>
                      {!values.repeatPanelId && curBusiGroup.perm === 'rw' && (
                        <Menu.Item
                          onClick={() => {
                            setVisible(false);
                            if (onEditClick) onEditClick();
                          }}
                          key='1'
                        >
                          <SettingOutlined style={{ marginRight: 8 }} />
                          {t('common:btn.edit')}
                        </Menu.Item>
                      )}
                      {!values.repeatPanelId && curBusiGroup.perm === 'rw' && (
                        <Menu.Item
                          onClick={() => {
                            setVisible(false);
                            if (onCloneClick) onCloneClick();
                          }}
                          key='2'
                        >
                          <CopyOutlined style={{ marginRight: 8 }} />
                          {t('common:btn.clone')}
                        </Menu.Item>
                      )}
                      {values.type === 'table' && (
                        <Menu.Item
                          onClick={() => {
                            if (tableRef.current) {
                              tableRef.current.handleExportCsv();
                            }
                          }}
                          key='export'
                        >
                          <ExportOutlined style={{ marginRight: 8 }} />
                          {t('common:btn.export')}
                        </Menu.Item>
                      )}
                      <Menu.Item
                        onClick={() => {
                          setVisible(false);
                          if (onShareClick) onShareClick();
                        }}
                        key='3'
                      >
                        <ShareAltOutlined style={{ marginRight: 8 }} />
                        {t('share_btn')}
                      </Menu.Item>
                      {!values.repeatPanelId && curBusiGroup.perm === 'rw' && (
                        <Menu.Item
                          onClick={() => {
                            setVisible(false);
                            if (onDeleteClick) onDeleteClick();
                          }}
                          key='4'
                        >
                          <DeleteOutlined style={{ marginRight: 8 }} />
                          {t('common:btn.delete')}
                        </Menu.Item>
                      )}
                    </Menu>
                  }
                >
                  <MoreOutlined className='renderer-header-more' />
                </Dropdown>
              )
            )}
          </div>
        </div>

        <div className='renderer-body' style={{ height: values.name ? `calc(100% - 34px)` : '100%' }}>
          {_.isEmpty(series) && values.type !== 'text' && values.type !== 'iframe' ? (
            <div className='renderer-body-content-empty'>No Data</div>
          ) : (
            <>
              {RendererCptMap[values.type] ? (
                RendererCptMap[values.type]()
              ) : (
                <div className='unknown-type'>{`无效的图表类型 ${values.type}`}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(Renderer);
