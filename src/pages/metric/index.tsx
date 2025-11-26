import React, { useContext, useRef, useEffect } from 'react';
import { CommonStateContext } from '@/App';
import { useLocation } from 'react-router-dom';
import { Form, Card, Space, Input, Select } from 'antd';
import queryString from 'query-string';
import { LineChartOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import EmptyDatasourcePopover from '@/components/DatasourceSelect/EmptyDatasourcePopover';
import Prometheus from '@/pages/explorer/Prometheus';
import './locale';
import './index.less';

const MetricExplorerPage = () => {
  const { t } = useTranslation('metric');
  const { search } = useLocation();
  const params = queryString.parse(search);
  const { groupedDatasourceList } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const headerExtraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const value = _.get(groupedDatasourceList, ['prometheus', 0, 'id']);
    form.setFieldsValue({
      datasourceValue: Number(params.data_id) || value,
    });
  }, [groupedDatasourceList]);

  return (
    <PageLayout title={t('title')} icon={<LineChartOutlined />}>
      <div className='metric-wrapper'>
        <Card bodyStyle={{ padding: 16 }} className='panel'>
          <Form form={form}>
            <Space align='start'>
              <EmptyDatasourcePopover datasourceList={groupedDatasourceList?.prometheus}>
                <Input.Group compact>
                  <span
                    className='ant-input-group-addon'
                    style={{
                      width: 'max-content',
                      height: 32,
                      lineHeight: '32px',
                    }}
                  >
                    {t('common:datasource.id')}
                  </span>

                  <Form.Item
                    name='datasourceValue'
                    rules={[
                      {
                        required: true,
                        message: t('common:datasource.id_required'),
                      },
                    ]}
                  >
                    <Select
                      style={{ minWidth: 70 }}
                      dropdownMatchSelectWidth={false}
                      showSearch
                      optionFilterProp='children'
                    >
                      {_.map(groupedDatasourceList.prometheus, (item) => (
                        <Select.Option value={item.id} key={item.id}>
                          {item.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Input.Group>
              </EmptyDatasourcePopover>
              <div ref={headerExtraRef} />
            </Space>
            <Form.Item shouldUpdate noStyle>
              {({ getFieldValue }) => {
                const datasourceValue = getFieldValue('datasourceValue');
                return (
                  <Prometheus
                    key={datasourceValue}
                    headerExtra={headerExtraRef.current}
                    datasourceValue={datasourceValue}
                    form={form}
                  />
                );
              }}
            </Form.Item>
          </Form>
        </Card>
      </div>
    </PageLayout>
  );
};

export default MetricExplorerPage;
