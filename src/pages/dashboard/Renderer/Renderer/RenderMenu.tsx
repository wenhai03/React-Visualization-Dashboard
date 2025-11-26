import React from 'react';
import { Tooltip, Space, Dropdown, Menu } from 'antd';
import {
  InfoCircleOutlined,
  MoreOutlined,
  LinkOutlined,
  SyncOutlined,
  ExpandOutlined,
  ExportOutlined,
  SettingOutlined,
  ShareAltOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import Markdown from '../../Editor/Components/Markdown';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { isAbsolutePath } from '@/pages/dashboard/utils';

interface RenderMenuProps {
  name: string;
  description?: string;
  links?: any[];
  error?: string;
  loading?: boolean;
  isPreview?: boolean;
  isShare?: boolean;
  hasEditPermission?: boolean;
  isTableType?: boolean;
  isFullScreen?: boolean;
  onRefresh?: () => void;
  onEdit?: () => void;
  onClone?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onToggleFullScreen?: () => void;
  containerRef?: React.RefObject<HTMLDivElement>;
}

const RenderMenu: React.FC<RenderMenuProps> = ({
  name,
  description,
  links,
  error,
  loading,
  isPreview,
  isShare,
  hasEditPermission,
  isTableType,
  isFullScreen,
  onRefresh,
  onEdit,
  onClone,
  onShare,
  onDelete,
  onExport,
  onToggleFullScreen,
  containerRef,
}) => {
  const { t } = useTranslation('dashboard');
  const [menuVisible, setMenuVisible] = React.useState(false);
  const hasTips = !error && (description || !_.isEmpty(links));

  const renderTooltipContent = () => (
    <Space direction='vertical'>
      {description && <Markdown content={description} />}
      {links?.map((link, i) => (
        <div key={i}>
          {link.targetBlank || isAbsolutePath(link.url) ? (
            <a href={link.url} target={link.targetBlank ? '_blank' : '_self'}>
              {link.title}
            </a>
          ) : (
            <Link to={link.url}>{link.title}</Link>
          )}
        </div>
      ))}
    </Space>
  );

  const menuItems = [
    {
      key: 'fullscreen',
      icon: <ExpandOutlined style={{ marginRight: 8 }} />,
      label: t('common:btn.unfold'),
      onClick: onToggleFullScreen,
      show: !isFullScreen,
    },
    {
      key: 'refresh',
      icon: <SyncOutlined style={{ marginRight: 8 }} />,
      label: t('refresh_btn'),
      onClick: () => {
        setMenuVisible(true);
        onRefresh?.();
      },
      show: true,
    },
    {
      key: 'edit',
      icon: <SettingOutlined style={{ marginRight: 8 }} />,
      label: t('common:btn.edit'),
      onClick: () => {
        setMenuVisible(false);
        onEdit?.();
      },
      show: hasEditPermission,
    },
    {
      key: 'clone',
      icon: <CopyOutlined style={{ marginRight: 8 }} />,
      label: t('common:btn.clone'),
      onClick: onClone,
      show: hasEditPermission,
    },
    {
      key: 'export',
      icon: <ExportOutlined style={{ marginRight: 8 }} />,
      label: t('common:btn.export'),
      onClick: () => {
        setMenuVisible(false);
        onExport?.();
      },
      show: isTableType,
    },
    {
      key: 'share',
      icon: <ShareAltOutlined style={{ marginRight: 8 }} />,
      label: t('share_btn'),
      onClick: () => {
        setMenuVisible(false);
        onShare?.();
      },
      show: true,
    },
    {
      key: 'delete',
      icon: <DeleteOutlined style={{ marginRight: 8 }} />,
      label: t('common:btn.delete'),
      onClick: () => {
        setMenuVisible(false);
        onDelete?.();
      },
      show: hasEditPermission,
    },
  ];

  return (
    <div className='renderer-header graph-header'>
      {hasTips && (
        <Tooltip
          placement='leftTop'
          overlayInnerStyle={{ maxWidth: 300 }}
          getPopupContainer={() => containerRef?.current || document.body}
          title={renderTooltipContent()}
        >
          <div className='renderer-header-desc'>{description ? <InfoCircleOutlined /> : <LinkOutlined />}</div>
        </Tooltip>
      )}

      {error && (
        <Tooltip
          title={error}
          placement='leftTop'
          overlayInnerStyle={{ maxWidth: 300 }}
          getPopupContainer={() => containerRef?.current || document.body}
        >
          <div className='renderer-header-error'>
            <InfoCircleOutlined style={{ color: 'red' }} />
          </div>
        </Tooltip>
      )}

      <div className='renderer-header-content'>
        <Tooltip title={name} getPopupContainer={() => containerRef?.current || document.body}>
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
              getPopupContainer={() => containerRef?.current || document.body}
              overlayStyle={{ minWidth: '100px' }}
              visible={menuVisible}
              onVisibleChange={setMenuVisible}
              overlay={
                <Menu>
                  {menuItems
                    .filter((item) => item.show)
                    .map((item) => (
                      <Menu.Item key={item.key} onClick={item.onClick}>
                        {item.icon}
                        {item.label}
                      </Menu.Item>
                    ))}
                </Menu>
              }
            >
              <MoreOutlined className='renderer-header-more' />
            </Dropdown>
          )
        )}
      </div>
    </div>
  );
};

export default RenderMenu;
