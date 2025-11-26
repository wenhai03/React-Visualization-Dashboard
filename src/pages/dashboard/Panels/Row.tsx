import React, { useState, useRef } from 'react';
import { Space, Modal, Button, Mentions } from 'antd';
import {
  CaretRightOutlined,
  CaretDownOutlined,
  HolderOutlined,
  SettingOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ControlOutlined,
} from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { AddPanelIcon } from '../config';
import { useGlobalState } from '../globalState';
import VariableConfig, { IVariable, replaceExpressionVars } from '../VariableConfig';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import { updateDashboardDetail } from '@/pages/dashboardBuiltin/services';
import { updateDashboardConfigs } from '@/services/dashboardV2';
import { updatePanelsInsertRowVar, updatePanelsInsertRowVarOptions } from '../Panels/utils';

interface IProps {
  isPreview?: boolean;
  row: any;
  range: IRawTimeRange | { start: number; end: number };
  dashboard: any;
  groupedDatasourceList: any;
  isBuiltin?: boolean;
  panels: any;
  isShare?: boolean;
  onToggle: () => void;
  onAddClick: () => void;
  onEditClick: (row: any) => void;
  onDeleteClick: (mode: 'self' | 'withPanels') => void;
  setPanels: (panels: any[]) => void;
}

function replaceFieldWithVariable(value: string, dashboardId?: string, variableConfig?: IVariable[]) {
  if (!dashboardId || !variableConfig) {
    return value;
  }
  return replaceExpressionVars(value, variableConfig, variableConfig.length, dashboardId);
}

export default function Row(props: IProps) {
  const { t } = useTranslation('dashboard');
  const {
    isPreview,
    row,
    range,
    dashboard,
    groupedDatasourceList,
    isBuiltin,
    panels,
    isShare,
    onToggle,
    onAddClick,
    onEditClick,
    onDeleteClick,
    setPanels,
  } = props;
  const [editVisble, setEditVisble] = useState(false);
  const [newName, setNewName] = useState<string>();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [dashboardMeta] = useGlobalState('dashboardMeta');
  const editRef = useRef<any>(null);
  const refresh = (configs) => {
    setPanels(configs.panels);
  };

  const handleUpdateRowConfigs = (configs) => {
    const newConfigs = { configs: JSON.stringify(configs) };

    if (isBuiltin) {
      updateDashboardDetail(dashboard.cate_code!, dashboard.code!, {
        id: dashboard.id,
        tags: dashboard.tags,
        code: dashboard.code,
        ...newConfigs,
      }).then((res) => {
        refresh(configs);
      });
    } else {
      updateDashboardConfigs(dashboard.id, newConfigs).then((res) => {
        refresh(configs);
      });
    }
  };

  const handleVariableChange = (value, b, valueWithOptions) => {
    const dashboardConfigs: any = dashboard.configs;
    const newPanels = updatePanelsInsertRowVar(panels, row.id, value);
    dashboardConfigs.panels = newPanels;
    // 更新变量配置
    b && handleUpdateRowConfigs(dashboardConfigs);
    // 更新变量配置状态
    if (valueWithOptions) {
      const newPanels = updatePanelsInsertRowVarOptions(panels, row.id, valueWithOptions);
      dashboardConfigs.panels = newPanels;
      refresh(dashboardConfigs);
    }
  };

  return (
    <div className='dashboards-panels-row'>
      <div
        className='dashboards-panels-row-name'
        onClick={() => {
          onToggle();
        }}
      >
        <span style={{ paddingRight: 6 }}>
          {replaceFieldWithVariable(row.name, dashboardMeta.dashboardId, dashboardMeta.variableConfigWithOptions)}
        </span>
        {row.collapsed ? <CaretDownOutlined /> : <CaretRightOutlined />}
        {/* TODO 分组变量有问题，待改 */}
        {/* <div style={{ marginLeft: '10px' }} onClick={(e) => e.stopPropagation()}>
          <VariableConfig
            isPreview={isPreview}
            onChange={handleVariableChange}
            value={row.var}
            range={range}
            id={dashboard.id}
            group_id={dashboard?.group_id}
            groupedDatasourceList={groupedDatasourceList}
            editable={false}
            onRef={editRef}
            disabled={isShare}
            valueWithOption={row.var?.map((ele) => {
              const matchData = row.varOption.find((option) => option.name === ele.name);
              return { ...matchData, value: matchData?.isRow ? matchData.value : undefined };
            })}
            isRow={true}
          />
        </div> */}
      </div>
      {!isPreview && !isShare && (
        <Space>
          <AddPanelIcon
            onClick={() => {
              onAddClick();
            }}
          />
          <ControlOutlined onClick={() => editRef.current?.changeEditing(true)} />
          <SettingOutlined
            onClick={() => {
              setEditVisble(true);
              setNewName(row.name);
            }}
          />
          <DeleteOutlined
            onClick={() => {
              setDeleteVisible(true);
            }}
          />
          {row.collapsed === false && <HolderOutlined className='dashboards-panels-item-drag-handle' />}
        </Space>
      )}
      <Modal
        title={t('row.edit_title')}
        visible={editVisble}
        onCancel={() => {
          setEditVisble(false);
        }}
        onOk={() => {
          onEditClick({
            ...row,
            name: newName,
          });
          setEditVisble(false);
        }}
      >
        <div>
          {t('row.name')}
          <Mentions
            prefix='$'
            split=''
            value={newName}
            onChange={(val) => {
              setNewName(val);
            }}
            onPressEnter={() => {
              onEditClick({
                ...row,
                name: newName,
              });
              setEditVisble(false);
            }}
          >
            {_.map(dashboardMeta.variableConfigWithOptions, (item) => {
              return (
                <Mentions.Option key={item.name} value={item.name}>
                  {item.name}
                </Mentions.Option>
              );
            })}
          </Mentions>
        </div>
      </Modal>
      <Modal
        closable={false}
        visible={deleteVisible}
        onCancel={() => {
          setDeleteVisible(false);
        }}
        footer={[
          <Button
            key='cancel'
            onClick={() => {
              setDeleteVisible(false);
            }}
          >
            {t('row.cancel')}
          </Button>,
          <Button
            key='ok'
            type='primary'
            onClick={() => {
              onDeleteClick('self');
              setDeleteVisible(false);
            }}
          >
            {t('row.ok2')}
          </Button>,
          <Button
            key='all'
            type='primary'
            danger
            onClick={() => {
              onDeleteClick('withPanels');
              setDeleteVisible(false);
            }}
          >
            {t('row.ok')}
          </Button>,
        ]}
      >
        <div>
          <h3 style={{ fontSize: 16 }}>
            <InfoCircleOutlined
              style={{ color: '#faad14', marginRight: 10, fontSize: 22, position: 'relative', top: 4 }}
            />{' '}
            {t('row.delete_title')}
          </h3>
          <div style={{ marginLeft: 38, fontSize: 14 }}>{t('row.delete_confirm')}</div>
        </div>
      </Modal>
    </div>
  );
}
