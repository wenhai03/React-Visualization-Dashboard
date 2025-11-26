import React, { useContext, useEffect, useState } from 'react';
import { Space, Input, Form, Select, Button } from 'antd';
import moment from 'moment';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import queryString from 'query-string';
import { useLocation } from 'react-router-dom';
import { CommonStateContext } from '@/App';
import InputGroupWithFormItem from '@/components/InputGroupWithFormItem';
import { getServiceEnvironments } from '@/services/traces';
import TimeRangePicker, { isMathString } from '@/components/TimeRangePicker';
import EmptyDatasourcePopover from '@/components/DatasourceSelect/EmptyDatasourcePopover';
import { conversionTime } from '../utils';

interface IFiterProps {
  initialValues?: any;
  onRefresh: (formData) => void; // 重新请求数据
  onRedirection: (formData) => void; // 路由重定向
  searchPlaceholder: string;
}

const Filter: React.FC<IFiterProps> = (props) => {
  const { onRedirection, onRefresh } = props;
  const { t } = useTranslation('traces');
  const { search } = useLocation();
  const [timeDuration, setTimeDuration] = useState(0);
  const [environmentList, setEnvironmentList] = useState<{ label: string; value: string }[]>([
    { label: t('all'), value: 'ENVIRONMENT_ALL' },
  ]);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const params = queryString.parse(search) as Record<string, string>;
  const { data_id, start, end, environment, bgid, contrast_time } = params;
  const { curBusiId, busiGroups, groupedDatasourceList } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const watch_ata_id = Form.useWatch('data_id', form);

  // 获取环境列表
  const retrieveData = () => {
    const data_id = form.getFieldValue('data_id');
    if (data_id) {
      // 获取环境列表
      const time = form.getFieldValue('range');
      const timeRange = conversionTime(time.start, time.end);

      getServiceEnvironments({
        busi_group_id: curBusiId,
        datasource_id: data_id,
        ...timeRange,
      }).then((res) => {
        const aggs = res.aggregations;
        const environmentsBuckets = aggs?.environments.buckets || [];
        const environments = environmentsBuckets.map((environmentBucket) => ({
          label: environmentBucket.key,
          value: environmentBucket.key,
        }));
        setEnvironmentList([{ label: t('all'), value: 'ENVIRONMENT_ALL' }, ...environments]);
      });
    }
  };

  useEffect(() => {
    if (curBusiId) {
      retrieveData();
    }
  }, [curBusiId, watch_ata_id]);

  useEffect(() => {
    const currentDataId = groupedDatasourceList.elasticsearch?.[0]?.id;
    const data_id_value = Number(data_id) || currentDataId;
    const bgid_value = Number(bgid) || curBusiId;
    const matchGroup = busiGroups.filter((item) => item.id === Number(bgid_value));
    const timeRange = conversionTime(start, end);
    const duration = timeRange.end - timeRange.start;
    setTimeDuration(duration);
    if (matchGroup.length) {
      if (data_id && bgid && environment && start && end && contrast_time) {
        form.setFieldsValue({
          ..._.omit(params, ['start', 'end']),
          data_id: Number(params.data_id),
          range: { start: params.start, end: params.end },
        });
        // 重新请求
        onRefresh(params);
      } else if (data_id_value && bgid_value) {
        // 小于25小时（90000000），默认选择前一天，大于等于25小时，小于8天（691200000），默认选择上一周，大于等于8天，默认选择计算出来的日期
        let contrast_time_default = duration < 90000000 ? '1' : duration >= 691200000 ? '100' : '7';
        // 重定向
        let formData: any = {
          data_id: data_id_value,
          bgid: bgid_value,
          environment: environment ?? 'ENVIRONMENT_ALL',
          start: start || 'now-15m',
          end: end || 'now',
          contrast_time: contrast_time || contrast_time_default,
        };

        form.setFieldsValue({
          ..._.omit(formData, ['start', 'end']),
          range: { start: formData.start, end: formData.end },
        });
        onRedirection(formData);
      }
    }
  }, [search, refreshFlag]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const formData = {
        environment: values.environment,
        data_id: values.data_id,
        bgid: curBusiId,
        start: isMathString(values.range.start)
          ? values.range.start
          : moment(values.range.start).format('YYYY-MM-DD HH:mm:ss'),
        end: isMathString(values.range.end) ? values.range.end : moment(values.range.end).format('YYYY-MM-DD HH:mm:ss'),
        contrast_time: values.contrast_time ?? 0,
      };
      if (
        Number(data_id) !== values.data_id ||
        Number(bgid) !== curBusiId ||
        environment !== values.environment ||
        start !== formData.start ||
        end !== formData.end ||
        contrast_time !== values.contrast_time
      ) {
        onRedirection(formData);
      } else {
        setRefreshFlag(_.uniqueId('refresh_'));
      }
    });
  };

  return (
    <Form form={form}>
      <Space align='start' className='filter-wrapper'>
        <Form.Item noStyle>
          <EmptyDatasourcePopover datasourceList={groupedDatasourceList.elasticsearch}>
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
                name='data_id'
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
                  {_.map(groupedDatasourceList.elasticsearch, (item) => (
                    <Select.Option value={item.id} key={item.id}>
                      {item.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Input.Group>
          </EmptyDatasourcePopover>
        </Form.Item>
        <InputGroupWithFormItem label={t('environment')}>
          <Form.Item name='environment' noStyle>
            <Select style={{ width: '160px' }}>
              {environmentList.map((item) => (
                <Select.Option value={item.value} key={item.label}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </InputGroupWithFormItem>
        {contrast_time && (
          <InputGroupWithFormItem label={t('compare')}>
            <Form.Item name='contrast_time' noStyle>
              <Select style={{ width: '160px' }}>
                <Select.Option value='0' key={0}>
                  {t('incontrast')}
                </Select.Option>
                {timeDuration < 90000000 && (
                  <Select.Option value='1' key={1}>
                    {t('the_day_before')}
                  </Select.Option>
                )}
                {timeDuration < 691200000 && (
                  <Select.Option value='7' key={7}>
                    {t('the_previous_week')}
                  </Select.Option>
                )}
                {timeDuration >= 691200000 && (
                  <Select.Option value='100' key={100}>
                    {`${moment(moment(start).valueOf() - timeDuration).format('YYYY-MM-DD HH:mm:ss')}-${moment(
                      start,
                    ).format('YYYY-MM-DD HH:mm:ss')}`}
                  </Select.Option>
                )}
              </Select>
            </Form.Item>
          </InputGroupWithFormItem>
        )}
        <Form.Item name={'range'}>
          <TimeRangePicker onChange={retrieveData} />
        </Form.Item>
        <Form.Item>
          <Button type='primary' onClick={handleSubmit}>
            {t('query_btn')}
          </Button>
        </Form.Item>
      </Space>
    </Form>
  );
};

export default Filter;
