import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import _ from 'lodash';
import { useInViewport } from 'ahooks';
import classNames from 'classnames';
import { CommonStateContext } from '@/App';
import { IVariable } from '../../VariableConfig/definition';
import { IPanel } from '../../types';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import replaceFieldWithVariable from '../utils/replaceFieldWithVariable';
import useQuery from '../datasource/useQuery';
import RenderMenu from './RenderMenu';
import RendererBody from './RendererBody';
import './style.less';

interface RendererProps {
  datasourceValue?: number;
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
  headerRef?: React.RefObject<HTMLDivElement>;
}

const Renderer: React.FC<RendererProps> = (props) => {
  const {
    datasourceValue,
    themeMode,
    dashboardId,
    id,
    variableConfig,
    isPreview,
    onCloneClick,
    onShareClick,
    onEditClick,
    onDeleteClick,
    group_id,
    board_id,
    isShare,
    esVersion,
    headerRef,
    values,
  } = props;

  const { curBusiGroup, groupedDatasourceList, menuWidth, fullScreenPanel, setFullScreenPanel } =
    useContext(CommonStateContext);

  const newGroupedDatasourceList = props.groupedDatasourceList ?? groupedDatasourceList;
  const [time, setTime] = useState(props.time);
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

  useEffect(() => {
    setTime(props.time);
  }, [JSON.stringify(props.time)]);

  const handleRefresh = useCallback(() => {
    setTime({
      ...time,
      refreshFlag: _.uniqueId('refreshFlag_'),
    });
  }, [time]);

  const handleToggleFullScreen = useCallback(() => {
    setFullScreenPanel(id);
  }, [id, setFullScreenPanel]);

  const handleExport = useCallback(() => {
    tableRef.current?.handleExportCsv();
  }, []);

  if (_.isEmpty(values)) return null;

  // 处理 hexbin 的 colorRange
  if (typeof _.get(values, 'custom.colorRange') === 'string') {
    _.set(values, 'custom.colorRange', _.split(_.get(values, 'custom.colorRange'), ','));
  }

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
              top: `${(headerRef?.current?.getBoundingClientRect()?.height || 0) + 62}px`,
              height: `calc(100vh - ${(headerRef?.current?.getBoundingClientRect()?.height || 0) + 51}px)`,
            }
          : {}
      }
    >
      <div className='renderer-body-wrap' ref={bodyWrapRef}>
        <RenderMenu
          name={name}
          description={description}
          links={values.links}
          error={error}
          loading={loading}
          isPreview={isPreview}
          isShare={isShare}
          hasEditPermission={curBusiGroup.perm === 'rw' && !values.repeatPanelId}
          isTableType={values.type === 'table'}
          isFullScreen={fullScreenPanel === id}
          onRefresh={handleRefresh}
          onEdit={onEditClick}
          onClone={onCloneClick}
          onShare={onShareClick}
          onDelete={onDeleteClick}
          onExport={handleExport}
          onToggleFullScreen={handleToggleFullScreen}
          containerRef={ref}
        />

        <div className='renderer-body' style={{ height: values.name ? 'calc(100% - 34px)' : '100%' }}>
          <RendererBody
            loading={loading}
            type={values.type}
            values={values}
            series={series}
            themeMode={themeMode}
            time={time}
            isShare={isShare}
            bodyWrapRef={bodyWrapRef}
            tableRef={tableRef}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(Renderer);
