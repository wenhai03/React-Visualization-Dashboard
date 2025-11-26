import React from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { List, Modal, Space, Button } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import ModalHOC, { ModalWrapProps } from '@/components/ModalHOC';
import { getDefaultColumnsConfigs, setTargetColumnsConfigs } from './utils';

interface Key {
  name: string;
  visible: boolean;
}

interface OrganizeColumnsProps {
  value: Key[];
  onChange: (value: Key[]) => void;
}

function OrganizeColumns(props: OrganizeColumnsProps & ModalWrapProps) {
  const { t } = useTranslation('targets');
  const { value, onChange, visible, destroy } = props;
  const [list, setList] = React.useState<Key[]>(value);

  return (
    <Modal
      title={t('organize_columns.title')}
      visible={visible}
      onCancel={destroy}
      footer={[
        <Button key='cancel' onClick={destroy}>
          {t('common:btn.cancel')}
        </Button>,
        <Button
          key='cancel'
          onClick={() => {
            const defaultColumnsConfigs = getDefaultColumnsConfigs();
            setTargetColumnsConfigs(defaultColumnsConfigs);
            onChange(defaultColumnsConfigs);
            destroy();
          }}
        >
          {t('common:btn.reset')}
        </Button>,
        <Button
          key='ok'
          type='primary'
          onClick={() => {
            onChange(list);
            destroy();
          }}
        >
          {t('common:btn.ok')}
        </Button>,
      ]}
    >
      <List
        style={{ height: 'calc(100vh - 360px)', overflow: 'auto' }}
        bordered
        dataSource={list}
        renderItem={(item) => (
          <List.Item>
            <Space>
              <span
                onClick={() => {
                  const newList = _.cloneDeep(list);
                  const index = newList.findIndex((i) => i.name === item.name);
                  newList[index].visible = !newList[index].visible;
                  setList(newList);
                }}
              >
                {item.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              </span>
              {t(item.name)}
            </Space>
          </List.Item>
        )}
      />
    </Modal>
  );
}

export default ModalHOC<OrganizeColumnsProps>(OrganizeColumns);
