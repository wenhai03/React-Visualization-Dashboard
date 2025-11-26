import React from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Form, Button, message } from 'antd';
import ModalHOC, { ModalWrapProps } from '@/components/ModalHOC';
import { updateDashboardConfigs } from '@/services/dashboardV2';
import { getValidImportData } from './utils';

interface IProps {
  id: number;
  refreshList: () => void;
}

function Import(props: IProps & ModalWrapProps) {
  const { t } = useTranslation('dashboard');
  const { visible, destroy, id, refreshList } = props;

  return (
    <Modal
      title={t('batch.import')}
      visible={visible}
      onCancel={() => {
        refreshList();
        destroy();
      }}
      footer={null}
    >
      <Form
        layout='vertical'
        onFinish={(vals) => {
          const data = getValidImportData(vals.import);
          updateDashboardConfigs(id, { configs: data.configs }).then(() => {
            message.success(t('common:success.import'));
            refreshList();
            destroy();
          });
        }}
      >
        <Form.Item
          label={t('batch.label')}
          name='import'
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input.TextArea className='code-area' rows={16} />
        </Form.Item>
        <Form.Item>
          <Button type='primary' htmlType='submit'>
            {t('common:btn.import')}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default ModalHOC(Import);
