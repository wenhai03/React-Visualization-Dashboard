import React, { useEffect, useState, useContext } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import { List, Button, message, Modal, Space } from 'antd';
import { SoundOutlined } from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import { getAlertNotifyTpls, createNotifyTpls, updateNotifyTpls } from '@/services/warning';
import HTML from '@/pages/help/NotificationTpls/Editor/HTML';
import Markdown from '@/pages/help/NotificationTpls/Editor/Markdown';
import Text from '@/pages/help/NotificationTpls/Editor/Text';
import Toml from '@/pages/help/NotificationTpls/Editor/Toml';
import { deleteNotifyTpl } from '@/pages/help/NotificationTpls/services';
import '../locale';

export default function NotificationTpls() {
  const { curBusiGroup } = useContext(CommonStateContext);
  const { t } = useTranslation('alertRules');
  const { curBusiId } = useContext(CommonStateContext);
  const [data, setData] = useState<any[]>([]);
  const [active, setActive] = useState<any>();
  const fetchData = () => {
    getAlertNotifyTpls({ group_id: curBusiId }).then((res) => {
      setData(res.dat);
      if (!active) {
        setActive(res.dat[0]);
      } else {
        setActive(_.find(res.dat, { channel: active.channel }) || res[0]);
      }
    });
  };

  useEffect(() => {
    fetchData();
  }, [curBusiId]);

  return (
    <PageLayout title={t('notification_tpls_config')} icon={<SoundOutlined />}>
      <div className='user-manage-content'>
        <div style={{ display: 'flex', height: '100%' }}>
          <div className='left-tree-area'>
            <div className='sub-title'>
              {t('notification_tpls')}
              <a style={{ fontSize: '13px' }} target='_blank' href='/docs/reference/alert/alert_template'>
                {t('instructions_for_use')}
              </a>
            </div>
            <List
              style={{
                marginBottom: '12px',
                flex: 1,
                overflow: 'auto',
              }}
              dataSource={data}
              size='small'
              renderItem={(item: any) => (
                <List.Item
                  key={item.channel}
                  className={active?.channel === item.channel ? 'is-active' : ''}
                  onClick={() => setActive(item)}
                >
                  {item.name}
                </List.Item>
              )}
            />
          </div>
          <div className='resource-table-content'>
            <div
              style={{
                height: 'calc(100% - 115px)',
                marginBottom: 10,
              }}
            >
              {active?.channel && _.endsWith(active.channel, 'msg_center_sms') ? (
                <Text
                  key={active?.channel}
                  value={active?.content}
                  record={active}
                  onChange={(value) => {
                    setActive((data) => ({ ...data, content: value }));
                  }}
                  type={active?.type || (active?.id === 0 ? 'default' : 'custom')}
                  editable={curBusiGroup.perm === 'rw' && (active?.type || active?.id !== 0)}
                />
              ) : active?.channel && _.endsWith(active.channel, 'email') ? (
                <HTML
                  key={active?.channel}
                  value={active?.content}
                  record={active}
                  onChange={(value) => {
                    setActive((data) => ({ ...data, content: value }));
                  }}
                  type={active?.type || (active?.id === 0 ? 'default' : 'custom')}
                  editable={curBusiGroup.perm === 'rw' && (active?.type || active?.id !== 0)}
                />
              ) : active?.channel &&
                (_.endsWith(active.channel, 'wecom_message') || _.endsWith(active.channel, 'feishu')) ? (
                <Toml
                  key={active?.channel}
                  value={active?.content}
                  record={active}
                  onChange={(value) => {
                    setActive((data) => ({ ...data, content: value }));
                  }}
                  type={active?.type || (active?.id === 0 ? 'default' : 'custom')}
                  editable={curBusiGroup.perm === 'rw' && (active?.type || active?.id !== 0)}
                />
              ) : (
                active && (
                  <Markdown
                    key={`${active.channel}-${curBusiId}`}
                    value={active?.content}
                    record={active}
                    onChange={(value) => {
                      setActive((data) => ({ ...data, content: value }));
                    }}
                    type={active?.type || (active?.id === 0 ? 'default' : 'custom')}
                    editable={curBusiGroup.perm === 'rw' && (active?.type || active?.id !== 0)}
                  />
                )
              )}
            </div>
            <Space>
              {active?.type !== 'custom' && active?.id === 0 ? (
                <Button
                  type='primary'
                  onClick={() => {
                    setActive((data) => ({ ...data, type: 'custom' }));
                  }}
                  disabled={curBusiGroup.perm === 'ro'}
                >
                  {t('custom')}
                </Button>
              ) : (
                <Button
                  type='primary'
                  disabled={curBusiGroup.perm === 'ro'}
                  onClick={() => {
                    if (active) {
                      const params = {
                        group_id: curBusiId,
                        name: active.name,
                        channel: active.channel,
                        content: active.content,
                      };
                      if (active.id === 0) {
                        createNotifyTpls(params).then(() => {
                          message.success(t('common:success.save'));
                          fetchData();
                        });
                      } else {
                        updateNotifyTpls({ ...params, id: active.id }).then(() => {
                          message.success(t('common:success.save'));
                          fetchData();
                        });
                      }
                    }
                  }}
                >
                  {t('common:btn.save')}
                </Button>
              )}
              {active?.id !== 0 && (
                <Button
                  disabled={curBusiGroup.perm === 'ro'}
                  onClick={() => {
                    Modal.confirm({
                      title: t('common:confirm.delete'),
                      okText: t('common:btn.ok'),
                      cancelText: t('common:btn.cancel'),
                      onOk: () => {
                        if (active?.id) {
                          deleteNotifyTpl(active.id).then(() => {
                            message.success(t('common:success.delete'));
                            fetchData();
                          });
                        }
                      },
                      onCancel: () => {},
                    });
                  }}
                >
                  {t('delete_customization')}
                </Button>
              )}
            </Space>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
