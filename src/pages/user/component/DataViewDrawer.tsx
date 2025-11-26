import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Drawer, Row, Col, Form, Input, Table, Space, Button, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { getDataCategory, getFieldcaps } from '@/services/warning';
import { getFieldsForWildcard } from '@/components/SearchBar/utils';
import _ from 'lodash';
import '@/pages/user/locale';

interface IDataViewProps {
  visible: boolean;
  initialValues?: any;
  dataId: string;
  bgid: number | string;
  onOk: (val) => void;
  onCancel: () => void;
}

const DataViewDrawer: React.FC<IDataViewProps> = (props) => {
  const { t } = useTranslation('user');
  const [form] = Form.useForm();
  const [indexPattern, setIndexPattern] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeOptions, setTimeOptions] = useState<{ label: string; value: string }[]>([
    { label: t('common:not_used_time'), value: '' },
  ]);
  const { visible, initialValues, onOk, onCancel, dataId, bgid } = props;
  const inputRef = useRef(null);
  // 跟踪是否是第一次输入
  const [isFirstInput, setIsFirstInput] = useState(true);
  useEffect(() => {
    setIsFirstInput(true);
  }, [visible]);

  const onIndexChange = useCallback(
    _.debounce((val, dataId) => {
      if (dataId && val) {
        setLoading(true);
        Promise.all([
          getDataCategory({
            busi_group_id: Number(bgid),
            datasource_id: Number(dataId),
            index: val,
          }).catch(() => {
            setLoading(false);
          }),
          getFieldcaps({
            busi_group_id: Number(bgid),
            datasource_id: Number(dataId),
            mode: 'common',
            indexed: val,
            fields: '_source,_id,_index,_score,*',
          }).catch(() => {
            setLoading(false);
          }),
        ]).then(([Indexs, fields]) => {
          // 处理索引列表
          let data: any = [];
          if (!_.isEmpty(Indexs)) {
            ['aliases', 'data_streams', 'indices'].forEach((key) => {
              data = [
                ...data,
                ...Indexs[key]
                  .filter((item) => !item.data_stream)
                  .map((element) => ({ name: element.name, type: key })),
              ];
            });
          }
          setIndexPattern(data);
          setLoading(false);
          // 处理字段
          const fieldsData = fields?.dat ? getFieldsForWildcard(fields.dat) : [];
          const dateOptions = fieldsData
            .filter((item) => item.esTypes?.includes('date'))
            .map((ele) => ({ label: ele.name, value: ele.name }));
          const options = [...dateOptions, { label: t('common:not_used_time'), value: '' }];
          setTimeOptions(options);
          form.setFieldsValue({ time_field: options[0].value });
        });
      }
    }, 1000),
    [bgid],
  );

  useEffect(() => {
    if (initialValues !== undefined) {
      // 编辑
      form.setFieldsValue(initialValues);
      onIndexChange(initialValues.index, dataId);
    } else {
      // 创建
      setIndexPattern([]);
    }
  }, [initialValues]);

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        onOk(values);
        form.resetFields();
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  return (
    <Drawer
      title={t('business.data_view')}
      visible={visible}
      width={800}
      onClose={() => {
        form.resetFields();
        onCancel();
      }}
      maskClosable={false}
      footer={
        <Space style={{ float: 'right' }}>
          <Button
            onClick={() => {
              form.resetFields();
              onCancel();
            }}
          >
            {t('common:btn.cancel')}
          </Button>
          <Button type='primary' onClick={handleOk}>
            {t('common:btn.save')}
          </Button>
        </Space>
      }
    >
      <Row gutter={24}>
        <Col span={12}>
          <Form form={form} layout='vertical'>
            <Form.Item label={t('business.view_name')} name='name' rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t('business.index_mode')} name='index' rules={[{ required: true }]}>
              <Input
                ref={inputRef}
                onChange={(e) => {
                  const { value } = e.target;
                  setIsFirstInput(Boolean(value === ''));
                  let updatedValue = value;
                  if (!value.endsWith('*') && isFirstInput) {
                    updatedValue = value + '*';
                    const input: any = inputRef.current;
                    form.setFieldsValue({ index: updatedValue });
                    if (input) {
                      const length = updatedValue.length;
                      setTimeout(function () {
                        input.focus();
                        input.setSelectionRange(length - 1, length - 1);
                      }, 0);
                    }
                  }
                  onIndexChange(updatedValue, dataId);
                }}
              />
            </Form.Item>
            <Form.Item label={t('common:date_field')} name='time_field'>
              <Select options={timeOptions} />
            </Form.Item>
          </Form>
        </Col>
        <Col span={12}>
          <div style={{ margin: '10px 0' }}>
            {t('business.tip_1')} {indexPattern.length} {t('business.tip_2')}
          </div>
          <Table
            size='small'
            rowKey='id'
            dataSource={indexPattern}
            scroll={{ y: 'calc(100vh - 215px)' }}
            columns={[
              {
                title: t('common:name'),
                dataIndex: 'name',
                ellipsis: true,
              },
              {
                title: t('business.type'),
                dataIndex: 'type',
                width: '80px',
                render: (text) => t(`business.${text}`),
              },
            ]}
            loading={loading}
            pagination={false}
          />
        </Col>
      </Row>
    </Drawer>
  );
};

export default DataViewDrawer;
