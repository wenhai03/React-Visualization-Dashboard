import React, { useState } from 'react';
import { Dropdown, Button, Modal, message, Menu } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { deleteStrategy, updateAlertRules } from '@/services/warning';
import Export from '@/components/Export';
import Import from '@/components/Import';
import EditModal from './EditModal';

interface MoreOperationsProps {
  bgid: number;
  selectRowKeys: React.Key[];
  selectedRows: any[];
  getAlertRules: () => void;
  perm: 'ro' | 'rw';
}

export default function MoreOperations(props: MoreOperationsProps) {
  const { t } = useTranslation('alertRules');
  const { bgid, selectRowKeys, selectedRows, getAlertRules, perm } = props;
  const [isModalVisible, setisModalVisible] = useState<boolean>(false);

  return (
    <>
      <Dropdown
        overlay={
          <Menu>
            {perm === 'rw' && (
              <Menu.Item
                key='batch_import'
                onClick={() => {
                  Import({
                    bgid: bgid,
                    type: 'alert_rules',
                    refreshList: getAlertRules,
                  });
                }}
              >
                {t('common:btn.batch_import')}
              </Menu.Item>
            )}
            <Menu.Item
              key='batch_export'
              disabled={Boolean(!selectedRows.length)}
              onClick={() => {
                Export({
                  filename: t('title'),
                  data: JSON.stringify(selectedRows, null, 4),
                });
              }}
            >
              {t('common:btn.batch_export')}
            </Menu.Item>
            {perm === 'rw' && (
              <>
                <Menu.Item
                  key='delete'
                  disabled={Boolean(!selectedRows.length)}
                  onClick={() => {
                    const widthBuiltIdRow = selectedRows.filter((item) => item.builtin_id > 0);
                    if (widthBuiltIdRow.length) {
                      // 普通用户不可删除系统生成的规则
                      message.warning(t('batch.has_built_in_rule'));
                    } else {
                      Modal.confirm({
                        title: t('batch.delete_confirm'),
                        okText: t('common:btn.ok'),
                        cancelText: t('common:btn.cancel'),
                        onOk: () => {
                          deleteStrategy(selectRowKeys as number[], bgid).then(() => {
                            message.success(t('batch.delete.success'));
                            getAlertRules();
                          });
                        },
                      });
                    }
                  }}
                >
                  <span>{t('batch.delete')}</span>
                </Menu.Item>
                <Menu.Item
                  key='update'
                  disabled={Boolean(!selectedRows.length)}
                  onClick={() => {
                    setisModalVisible(true);
                  }}
                >
                  <span>{t('batch.update.title')}</span>
                </Menu.Item>
              </>
            )}
          </Menu>
        }
        trigger={['click']}
      >
        <Button onClick={(e) => e.stopPropagation()}>
          {t('common:btn.more')}
          <DownOutlined
            style={{
              marginLeft: 2,
            }}
          />
        </Button>
      </Dropdown>
      <EditModal
        isModalVisible={isModalVisible}
        editModalFinish={async (isOk, fieldsData) => {
          if (isOk) {
            const action = fieldsData.action;
            delete fieldsData.action;
            const res = await updateAlertRules(
              {
                ids: selectRowKeys,
                fields: fieldsData,
                action,
              },
              bgid,
            );
            if (!res.err) {
              message.success('修改成功！');
              getAlertRules();
              setisModalVisible(false);
            } else {
              message.error(res.err);
            }
          } else {
            setisModalVisible(false);
          }
        }}
      />
    </>
  );
}
