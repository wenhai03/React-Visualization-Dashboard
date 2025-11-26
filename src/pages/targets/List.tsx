import React, { useState, useRef, useContext, useEffect } from 'react';
import { Table, Tag, Tooltip, Space, Input, Dropdown, Menu, Button, Modal, message, Select } from 'antd';
import { ColumnsType } from 'antd/es/table';
import {
  createFromIconfontCN,
  DownOutlined,
  ReloadOutlined,
  CopyOutlined,
  ApartmentOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  FileTextOutlined,
  EllipsisOutlined,
  WarningTwoTone,
  SyncOutlined,
  UploadOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import _ from 'lodash';
import moment from 'moment';
import { CommonStateContext } from '@/App';
import queryString from 'query-string';
import { useTranslation, Trans } from 'react-i18next';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { BusiGroupItem } from '@/store/commonInterface';
import { getMonObjectList, getExtraList } from '@/services/targets';
import { timeFormatter } from '@/pages/dashboard/Renderer/utils/valueFormatter';
import clipboard from './clipboard';
import ChangeLog from './components/ChangeLog';
import UpgradeForm from '@/pages/targets/components/UpgradeForm';
import UninstallForm from '@/pages/targets/components/UninstallForm';
import { localeCompare } from '@/utils';
import OrganizeColumns from './OrganizeColumns';
import { OperationModal } from '../targets';
import { getTargetColumnsConfigs, setTargetColumnsConfigs } from './utils';
// @ts-ignore
import CollectsDrawer from 'plus:/pages/collects/CollectsDrawer';
import { BASE_API_PREFIX } from '@/utils/constant';

const IconCnd = createFromIconfontCN({
  scriptUrl: '/font/cndicon.js',
});

enum OperateType {
  BindTag = 'bindTag',
  UnbindTag = 'unbindTag',
  UpdateBusi = 'updateBusi',
  RemoveBusi = 'removeBusi',
  UpdateNote = 'updateNote',
  UpdateArea = 'updateArea',
  Delete = 'delete',
  None = 'none',
  Restart = 'restart',
}

interface ITargetProps {
  id: number;
  cluster: string;
  group_id: number;
  group_obj: object | null;
  ident: string;
  note: string;
  tags: string[];
  update_at: number;
}

const GREEN_COLOR = '#3FC453';
const YELLOW_COLOR = '#fec10b';
const ORANGE_COLOR = '#FF9919';
const RED_COLOR = '#FF656B';
const LOST_COLOR = '#CCCCCC';

export default function List() {
  const { t } = useTranslation('targets');
  const history = useHistory();
  const [operateType, setOperateType] = useState<OperateType>(OperateType.None);
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  const [selectedIdents, setSelectedIdents] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<any>([]);
  const [refreshFlag, setRefreshFlag] = useState(_.uniqueId('refreshFlag_'));
  const { curBusiId } = useContext(CommonStateContext);
  const [targetList, setTargetList] = useState([]);
  const isAddTagToQueryInput = useRef(false);
  const [tableQueryContent, setTableQueryContent] = useState<{
    query: string[];
    os: string[];
    agent_version: string[];
    area_id: string[];
  }>({ query: [], os: [], agent_version: [], area_id: [] });
  const [columnsConfigs, setColumnsConfigs] = useState<{ name: string; visible: boolean }[]>(getTargetColumnsConfigs());
  const [collectsDrawerVisible, setCollectsDrawerVisible] = useState(false);
  // 单选
  const [singleSelect, setSingleSelect] = useState<string[] | []>([]);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [uninstallVisible, setUninstallVisible] = useState(false);
  const [collectsDrawerIdent, setCollectsDrawerIdent] = useState('');
  const [extraList, setExtraList] = useState<{ agent_version: string[]; os: string[]; area: any }>({
    agent_version: [],
    os: [],
    area: [],
  });
  const [current, setCurrent] = useState(1);
  const { search } = useLocation();
  const { id } = queryString.parse(search);
  const bgid = id ? Number(id) : curBusiId;
  const token = localStorage.getItem('access_token');

  const runtimes = {
    pm: {
      icon: 'icon-wuliji',
      title: t('physical_machine'),
    },
    vm: {
      icon: 'icon-xuniji1',
      title: t('virtual_machine'),
    },
    ct: {
      icon: 'icon-Docker',
      title: t('docker'),
    },
    'ct-k8s': {
      icon: 'icon-ks',
      title: t('kubernetes'),
    },
  };

  const handleBatch = (type: string) => {
    setUpgradeVisible(false);
    if (singleSelect.length) {
      // 单个
      setSingleSelect([]);
    } else if (type === 'ok') {
      // 多选
      setSelectedIdents([]);
      setSelectedRowKeys([]);
      setSelectedRows([]);
    }
  };

  const handleIdentDashboard = (ident, os, bgroup: string) => {
    let code = os == 'windows' ? 'bn007003' : 'bn007002';
    let link = `/dashboards-built-in/bc007/detail/${code}?cate=Host&bgid=${bgroup}&ident=${ident}`;
    history.push(link);
  };

  const columns: ColumnsType<any> = [
    {
      title: (
        <Space>
          {t('common:table.ident')}
          <Dropdown
            trigger={['click']}
            overlay={
              <Menu
                onClick={async ({ key }) => {
                  let tobeCopy = _.map(targetList, (item: any) => item.ident);
                  if (key === 'selected') {
                    tobeCopy = selectedIdents.map(({ ident }) => ident);
                  }

                  if (_.isEmpty(tobeCopy)) {
                    message.warn(t('copy.no_data'));
                    return;
                  }

                  const tobeCopyStr = _.join(tobeCopy, '\n');
                  const copySucceeded = clipboard(tobeCopyStr);

                  if (copySucceeded) {
                    message.success(t('ident_copy_success', { num: tobeCopy.length }));
                  } else {
                    Modal.warning({
                      title: t('host.copy.error'),
                      content: <Input.TextArea defaultValue={tobeCopyStr} />,
                    });
                  }
                }}
              >
                <Menu.Item key='current_page'>{t('copy.current_page')}</Menu.Item>
                <Menu.Item key='all'>{t('copy.all')}</Menu.Item>
                <Menu.Item key='selected'>{t('copy.selected')}</Menu.Item>
              </Menu>
            }
          >
            <CopyOutlined
              style={{
                cursor: 'pointer',
              }}
            />
          </Dropdown>
        </Space>
      ),
      dataIndex: 'ident',
      align: 'left',
      width: 160,
      render: (value, { rt, group_id, os, extra }) => {
        const now = moment(new Date()).valueOf();
        return (
          <>
            <Space wrap>
              <div title={runtimes[rt]?.title ?? t('non_standard_collector')}>
                <IconCnd type={runtimes[rt]?.icon ?? 'icon-unknown'} />
                <span
                  style={{ paddingLeft: '3px', cursor: 'pointer', color: '#1890ff' }}
                  onClick={() => {
                    handleIdentDashboard(value, os, group_id);
                  }}
                >
                  {value}
                </span>
              </div>
              {/* uninstall为1且卸载时间+5分钟小于当前时间，触发卸载异常提示 */}
              {extra?.uninstall &&
                (extra.uninstall * 1000 + 300000 < now ? (
                  <Tooltip title={t('unload_exception_tip')}>
                    <WarningTwoTone twoToneColor='#cf1322' />
                  </Tooltip>
                ) : (
                  <Tooltip title={t('unload_exception_ing_tip')}>
                    <SyncOutlined spin style={{ color: '#cf1322' }} />
                  </Tooltip>
                ))}
              {/* 升级配置icon */}
              {extra?.upgrade_time ? (
                <Tooltip
                  title={`${t('upgrade_time_tip')} ${moment(extra.upgrade_time * 1000).format('YYYY-MM-DD HH:mm:ss')}`}
                >
                  <UploadOutlined />
                </Tooltip>
              ) : null}
              {extra?.abnormal_state?.length ? (
                <Tooltip
                  title={
                    <>
                      {extra.abnormal_state.map((item) => (
                        <div key={item}>{t(item)}</div>
                      ))}
                    </>
                  }
                >
                  <AlertOutlined style={{ color: '#cf1322' }} />
                </Tooltip>
              ) : null}
              {import.meta.env['VITE_IS_COLLECT'] && (
                <Tooltip title='查看关联采集配置'>
                  <ApartmentOutlined
                    onClick={() => {
                      setCollectsDrawerVisible(true);
                      setCollectsDrawerIdent(value);
                    }}
                  />
                </Tooltip>
              )}
            </Space>
            {extra?.cluster_name && extra.cluster_name !== '' && (
              <Tooltip title={t('install.cluster_name')}>
                <Tag color='gold' style={{ marginBottom: '4px', marginLeft: '14px' }}>
                  {extra.cluster_name}
                </Tag>
              </Tooltip>
            )}
          </>
        );
      },
    },
  ];

  _.forEach(columnsConfigs, (item) => {
    if (!item.visible) return;
    if (item.name === 'tags') {
      columns.push({
        title: t('tags'),
        dataIndex: 'tags',
        width: 160,
        ellipsis: {
          showTitle: false,
        },
        render(tagArr) {
          const content =
            tagArr &&
            tagArr.map((item) => (
              <Tag
                color='blue'
                key={item}
                onClick={(e) => {
                  if (!tableQueryContent.query.includes(item)) {
                    isAddTagToQueryInput.current = true;
                    setTableQueryContent({ ...tableQueryContent, query: [...tableQueryContent.query, item] });
                  }
                }}
              >
                {item}
              </Tag>
            ));
          return (
            tagArr && (
              <Tooltip
                title={content}
                placement='topLeft'
                getPopupContainer={() => document.body}
                overlayClassName='mon-manage-table-tooltip'
              >
                {content}
              </Tooltip>
            )
          );
        },
      });
    }
    if (item.name === 'group_obj') {
      columns.push({
        title: t('group_obj'),
        dataIndex: 'group_obj',
        width: 150,
        render(groupObj: BusiGroupItem | null) {
          return groupObj ? groupObj.name : t('not_grouped');
        },
      });
    }
    if (item.name === 'mem_util') {
      columns.push({
        title: t('mem_util'),
        width: 100,
        dataIndex: 'mem_util',
        sorter: (a, b) => a.mem_util - b.mem_util,
        render(text, reocrd) {
          if (reocrd.cpu_num === -1) return 'unknown';
          let backgroundColor = GREEN_COLOR;
          if (text > 85) {
            backgroundColor = YELLOW_COLOR;
          }
          if (text > 90) {
            backgroundColor = ORANGE_COLOR;
          }
          if (text > 95) {
            backgroundColor = RED_COLOR;
          }
          if (reocrd.target_up === 0) {
            backgroundColor = LOST_COLOR;
          }
          return (
            <div
              className='table-td-fullBG'
              style={{
                backgroundColor: backgroundColor,
              }}
            >
              {_.floor(text, 1)}%
            </div>
          );
        },
      });
    }
    if (item.name === 'cpu_util') {
      columns.push({
        title: t('cpu_util'),
        width: 100,
        dataIndex: 'cpu_util',
        sorter: (a, b) => a.cpu_util - b.cpu_util,
        render(text, reocrd) {
          if (reocrd.cpu_num === -1) return 'unknown';
          let backgroundColor = GREEN_COLOR;
          if (text > 90) {
            backgroundColor = YELLOW_COLOR;
          }
          if (text > 95) {
            backgroundColor = ORANGE_COLOR;
          }
          if (text > 99) {
            backgroundColor = RED_COLOR;
          }
          if (reocrd.target_up === 0) {
            backgroundColor = LOST_COLOR;
          }
          return (
            <div
              className='table-td-fullBG'
              style={{
                backgroundColor: backgroundColor,
              }}
            >
              {_.floor(text, 1)}%
            </div>
          );
        },
      });
    }
    if (item.name === 'offset') {
      columns.push({
        title: t('offset'),
        width: 100,
        dataIndex: 'offset',
        sorter: (a, b) => a.offset - b.offset,
        render(val, reocrd) {
          const text = val < 0 ? Math.abs(val) : val;
          // if (reocrd.cpu_num === -1) return 'unknown';
          let backgroundColor = GREEN_COLOR;
          if (text > 1000) {
            backgroundColor = YELLOW_COLOR;
          }
          if (text > 10000) {
            backgroundColor = ORANGE_COLOR;
          }
          if (text > 20000) {
            backgroundColor = RED_COLOR;
          }
          if (reocrd.target_up === 0) {
            backgroundColor = LOST_COLOR;
          }
          if (text === null) {
            backgroundColor = RED_COLOR;
          }

          return (
            <div
              className='table-td-fullBG'
              style={{
                backgroundColor: backgroundColor,
              }}
            >
              {text === null
                ? 'unknown'
                : val < 0
                ? `-${timeFormatter(text, 'milliseconds', 2)?.text}`
                : timeFormatter(text, 'milliseconds', 2)?.text}
            </div>
          );
        },
      });
    }
    if (item.name === 'cpu_num') {
      columns.push({
        title: t('cpu_num'),
        width: 60,
        dataIndex: 'cpu_num',
        sorter: (a, b) => a.cpu_num - b.cpu_num,
        render: (val, reocrd) => {
          if (reocrd.cpu_num === -1) return 'unknown';
          return val;
        },
      });
    }
    if (item.name === 'mem_total') {
      columns.push({
        title: t('mem_total'),
        width: 70,
        dataIndex: 'mem_total',
        render: (val, reocrd) => {
          if (val === 0) return 'unknown';
          return Math.round(val / 1000 / 1000 / 10) / 100 + 'GB';
        },
      });
    }
    if (item.name === 'os') {
      columns.push({
        title: t('os'),
        width: 90,
        dataIndex: 'os',
        filteredValue: tableQueryContent.os || null,
        filters: [...extraList.os.map((item) => ({ text: item, value: item }))],
        render: (val, reocrd) => {
          if (reocrd.cpu_num === -1) return 'unknown';
          return val;
        },
      });
    }
    if (item.name === 'arch') {
      columns.push({
        title: t('arch'),
        width: 70,
        dataIndex: 'arch',
        render: (val, reocrd) => {
          if (reocrd.cpu_num === -1) return 'unknown';
          return val;
        },
      });
    }
    if (item.name === 'kernel_version') {
      columns.push({
        title: t('kernel_version'),
        width: 100,
        dataIndex: 'kernel_version',
      });
    }
    if (item.name === 'os_name') {
      columns.push({
        title: t('os_name'),
        width: 100,
        dataIndex: 'os_name',
      });
    }
    if (item.name === 'os_version') {
      columns.push({
        title: t('os_version'),
        width: 100,
        dataIndex: 'os_version',
      });
    }
    if (item.name === 'agent_version') {
      columns.push({
        title: t('agent_version'),
        width: 100,
        dataIndex: 'agent_version',
        filteredValue: tableQueryContent.agent_version || null,
        filters: [...extraList.agent_version.map((item) => ({ text: item, value: item }))],
        render: (val) => val || 'unknown',
      });
    }
    if (item.name === 'area_id') {
      columns.push({
        title: t('area_id'),
        width: 100,
        dataIndex: 'area_id',
        filteredValue: tableQueryContent.area_id || null,
        filters: [...extraList.area.map((item) => ({ text: item.name, value: item.area_id }))],
        render: (val, record) => record.area_name || '',
      });
    }
    if (item.name === 'unixtime') {
      columns.push({
        title: (
          <Space>
            {t('unixtime')}
            <Tooltip title={<Trans ns='targets' i18nKey='unixtime_tip' components={{ 1: <br /> }} />}>
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
        ),
        width: 100,
        dataIndex: 'unixtime',
        sorter: (a, b) => localeCompare(a.unixtime, b.unixtime),
        render: (val, reocrd) => {
          let result = moment(val).format('YYYY-MM-DD HH:mm:ss');
          let backgroundColor = GREEN_COLOR;
          if (reocrd.cpu_num === -1) {
            result = 'unknown';
          }
          if (reocrd.target_up === 0) {
            backgroundColor = RED_COLOR;
          } else if (reocrd.target_up === 1) {
            backgroundColor = ORANGE_COLOR;
          }
          return (
            <div
              className='table-td-fullBG'
              style={{
                backgroundColor,
              }}
            >
              {result}
            </div>
          );
        },
      });
    }
    if (item.name === 'remote_addr') {
      columns.push({
        title: t('remote_addr'),
        width: 100,
        dataIndex: 'remote_addr',
        render: (val, reocrd) => {
          if (reocrd.cpu_num === -1) return 'unknown';
          return val;
        },
      });
    }
    if (item.name === 'note') {
      columns.push({
        title: t('common:table.note'),
        dataIndex: 'note',
        ellipsis: {
          showTitle: false,
        },
        render(note) {
          return (
            <Tooltip title={note} placement='topLeft' getPopupContainer={() => document.body}>
              {note}
            </Tooltip>
          );
        },
      });
    }
  });

  columns.push({
    title: t('event.action'),
    dataIndex: 'action',
    align: 'left',
    width: 105,
    render: (_, record) => {
      const { ident, rt, group_obj, extra, os, group_id } = record;
      const now = moment(new Date()).valueOf();
      return (
        <>
          {rt ? (
            <>
              {(!extra?.uninstall || (extra?.uninstall && extra.uninstall * 1000 + 300000 < now)) && (
                <Button
                  onClick={() => {
                    history.push({ pathname: '/targets/setting', search: `id=${ident}` });
                  }}
                  type='text'
                  icon={<SettingOutlined />}
                  title={t('configuration')}
                />
              )}
              <Button
                onClick={() => {
                  Modal.info({
                    width: 800,
                    icon: null,
                    okText: t('close'),
                    okType: 'default',
                    content: <ChangeLog host={ident} id={group_id} history={history} />,
                    onOk() {},
                  });
                }}
                type='text'
                icon={<FileTextOutlined />}
                title={t('changelogs')}
              />
              {!(group_obj?.perm === 'ro') &&
                rt !== 'ct' &&
                (!extra?.uninstall || (extra?.uninstall && extra.uninstall * 1000 + 300000 < now)) && (
                  <Dropdown
                    trigger={['click']}
                    overlay={
                      <Menu
                        onClick={({ key }) => {
                          const newKey = key === 'upgrade' || key === 'uninstall' ? OperateType.None : key;
                          setOperateType(newKey as OperateType);
                          setSingleSelect([record]);
                        }}
                      >
                        <Menu.Item key={OperateType.BindTag}>{t('bind_tag.title')}</Menu.Item>
                        <Menu.Item key={OperateType.UnbindTag}>{t('unbind_tag.title')}</Menu.Item>
                        <Menu.Item key={OperateType.UpdateBusi}>{t('update_busi.title')}</Menu.Item>
                        <Menu.Item key={OperateType.RemoveBusi}>{t('remove_busi.title')}</Menu.Item>
                        <Menu.Item key={OperateType.UpdateNote}>{t('update_note.title')}</Menu.Item>
                        <Menu.Item key={OperateType.UpdateArea}>{t('update_area.title')}</Menu.Item>
                        <Menu.Item key={OperateType.Delete}>{t('batch_delete.btn')}</Menu.Item>
                        <Menu.Item key='upgrade' onClick={() => setUpgradeVisible(true)}>
                          {t('upgrade')}
                        </Menu.Item>
                        <Menu.Item key='uninstall' onClick={() => setUninstallVisible(true)}>
                          {t('uninstall')}
                        </Menu.Item>
                        <Menu.Item disabled={os === 'windows'} key={OperateType.Restart}>
                          {t('restart.title')}
                        </Menu.Item>
                      </Menu>
                    }
                  >
                    <EllipsisOutlined style={{ verticalAlign: 'middle', width: '14px', height: '14px' }} />
                  </Dropdown>
                )}
            </>
          ) : (
            <Space>
              <Button type='link' disabled>
                N/A
              </Button>
            </Space>
          )}
        </>
      );
    },
  });

  useEffect(() => {
    const query = {
      query: tableQueryContent.query.join(','),
      os: tableQueryContent.os?.join(','),
      agent_version: tableQueryContent.agent_version?.join(','),
      area_id: tableQueryContent.area_id?.join(','),
      bgid: bgid,
      limit: -1,
    };
    getMonObjectList(query).then((res) => {
      setTargetList(res.dat?.list ?? []);
      setCurrent(1);
    });
  }, [JSON.stringify(tableQueryContent), refreshFlag, bgid]);

  useEffect(() => {
    getExtraList({ bgid: bgid }).then((res) => {
      setExtraList(res.dat);
    });
  }, [refreshFlag, bgid]);

  useEffect(() => {
    // 重置检索条件和分页缓存
    setTableQueryContent({ query: [], os: [], agent_version: [], area_id: [] });
  }, [bgid]);

  const handleClick = (type) => {
    const disable = selectedRows.some((item) => item.rt === '' || item.rt === 'ct');
    if (disable) {
      message.warning(t('batch_update_error'));
    } else {
      type === 'upgrade' ? setUpgradeVisible(true) : setUninstallVisible(true);
    }
  };

  return (
    <div>
      <div className='table-operate-box'>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setRefreshFlag(_.uniqueId('refreshFlag_'));
            }}
          />
          <Select
            allowClear
            className='search-input'
            value={tableQueryContent.query}
            mode='tags'
            open={false}
            placeholder={t('search_placeholder')}
            onChange={(e) => {
              setTableQueryContent({ ...tableQueryContent, query: e });
            }}
          />
        </Space>
        <Space>
          <Link to={{ pathname: '/targets/event' }}>
            <Button>{t('changelogs')}</Button>
          </Link>
          <Button
            onClick={() => {
              OrganizeColumns({
                value: columnsConfigs,
                onChange: (val) => {
                  setColumnsConfigs(val);
                  setTargetColumnsConfigs(val);
                },
              });
            }}
          >
            {t('organize_columns.title')}
          </Button>
          <a href={`${BASE_API_PREFIX}/targets/download?token=${token}&bgid=${bgid}`} download='机器列表.csv'>
            <Button>{t('common:btn.export')}</Button>
          </a>

          <Dropdown
            trigger={['click']}
            disabled={!selectedRowKeys.length}
            overlay={
              <Menu
                onClick={({ key }) => {
                  const newKey = key === 'upgrade' || key === 'uninstall' ? OperateType.None : key;
                  setOperateType(newKey as OperateType);
                  setSingleSelect([]);
                }}
              >
                <Menu.Item key={OperateType.BindTag}>{t('bind_tag.title')}</Menu.Item>
                <Menu.Item key={OperateType.UnbindTag}>{t('unbind_tag.title')}</Menu.Item>
                <Menu.Item key={OperateType.UpdateBusi}>{t('update_busi.title')}</Menu.Item>
                <Menu.Item key={OperateType.RemoveBusi}>{t('remove_busi.title')}</Menu.Item>
                <Menu.Item key={OperateType.UpdateNote}>{t('update_note.title')}</Menu.Item>
                <Menu.Item key={OperateType.UpdateArea}>{t('update_area.title')}</Menu.Item>
                <Menu.Item key={OperateType.Delete}>{t('batch_delete.title')}</Menu.Item>
                <Menu.Item key='upgrade' onClick={() => handleClick('upgrade')}>
                  {t('batch_upgrade')}
                </Menu.Item>
                <Menu.Item key='uninstall' onClick={() => handleClick('uninstall')}>
                  {t('batch_uninstall')}
                </Menu.Item>
                <Menu.Item disabled={selectedRows.find((item) => item.os === 'windows')} key={OperateType.Restart}>
                  {t('batch_restart')}
                </Menu.Item>
              </Menu>
            }
          >
            <Button>
              {t('common:btn.batch_operations')} <DownOutlined />
            </Button>
          </Dropdown>
        </Space>
      </div>
      <Table
        rowKey='id'
        columns={columns}
        size='small'
        rowClassName={(record) =>
          record.extra?.uninstall &&
          (record.extra?.uninstall * 1000 + 300000 < moment(new Date()).valueOf() ? '' : 'uninstall-row-bg')
        }
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys: selectedRowKeys,
          onChange(selectedRowKeys, selectedRows: ITargetProps[]) {
            setSelectedRowKeys(selectedRowKeys);
            setSelectedIdents(selectedRows ? selectedRows : []);
            setSelectedRows(selectedRows);
          },
          getCheckboxProps: (record) => ({
            disabled:
              record.group_obj?.perm === 'ro' ||
              (record.extra?.uninstall && record.extra.uninstall * 1000 + 300000 > moment(new Date()).valueOf()), // 配置无法勾选的列
          }),
        }}
        dataSource={targetList}
        pagination={{
          current: current,
          total: targetList.length,
          showSizeChanger: true,
          showTotal: (total) => {
            return t('common:table.total', { total });
          },
          pageSizeOptions: ['10', '20', '50', '100'],
          defaultPageSize: 10,
          onChange: (page) => setCurrent(page),
        }}
        onChange={(pagination, filters) => {
          setTableQueryContent({ ...tableQueryContent, ...filters });
        }}
        scroll={{ y: 'calc(100vh - 242px)' }}
      />
      <CollectsDrawer
        visible={collectsDrawerVisible}
        setVisible={setCollectsDrawerVisible}
        ident={collectsDrawerIdent}
      />
      <UpgradeForm
        visible={upgradeVisible}
        onCancel={() => {
          setUpgradeVisible(false), handleBatch('cancel');
        }}
        onOk={() => {
          setUpgradeVisible(false), handleBatch('ok');
        }}
        record={singleSelect.length ? singleSelect : selectedIdents}
      ></UpgradeForm>
      <UninstallForm
        visible={uninstallVisible}
        onCancel={() => {
          setUninstallVisible(false), handleBatch('cancel');
        }}
        onOk={() => {
          setUninstallVisible(false), handleBatch('ok');
          setRefreshFlag(_.uniqueId('refreshFlag_'));
        }}
        record={singleSelect.length ? singleSelect : selectedIdents}
      ></UninstallForm>
      <OperationModal
        operateType={operateType}
        setOperateType={setOperateType}
        record={singleSelect.length ? singleSelect : selectedIdents}
        reloadList={() => {
          setRefreshFlag(_.uniqueId('refreshFlag_'));
          setSelectedIdents([]);
          setSelectedRowKeys([]);
          setSelectedRows([]);
        }}
      />
    </div>
  );
}
