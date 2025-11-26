import React, { useContext, useEffect, useState } from 'react';
import { Space, Form, Select, Button, Input } from 'antd';
import _ from 'lodash';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import moment from 'moment';
import TimeRangePicker, { isMathString } from '@/components/TimeRangePicker';
import { getDialTaskOptions } from '@/services/dial';
import '@/pages/explorer/index.less';

interface IFiterProps {
  onRefresh: (formData) => void; // 重新请求数据
  onRedirection: (formData) => void; // 路由重定向
}

const Filter: React.FC<IFiterProps> = (props) => {
  const { search } = useLocation();
  const params = queryString.parse(search) as Record<string, string>;
  const { onRefresh, onRedirection } = props;
  const { t } = useTranslation('logs');
  const { curBusiId } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const [taskList, setTaskList] = useState([]);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const formData = {
        bgid: curBusiId,
        taskIds: values.taskIds.join(','),
        status: values.status || '',
        start: isMathString(values.range.start)
          ? values.range.start
          : moment(values.range.start).format('YYYY-MM-DD HH:mm:ss'),
        end: isMathString(values.range.end) ? values.range.end : moment(values.range.end).format('YYYY-MM-DD HH:mm:ss'),
      };
      if (
        Number(params.bgid) !== curBusiId ||
        params.start !== formData.start ||
        params.end !== formData.end ||
        params.taskIds !== formData.taskIds ||
        params.status !== formData.status
      ) {
        onRedirection(formData);
      } else {
        setRefreshFlag(_.uniqueId('refresh_'));
      }
    });
  };

  useEffect(() => {
    (async () => {
      const bgid = Number(params.bgid) || curBusiId;
      if (params.bgid && params.start && params.end && params.taskIds !== undefined && params.status !== undefined) {
        // 重新请求
        onRefresh(params);
        form.setFieldsValue({
          ..._.omit(params, ['start', 'end']),
          taskIds: params.taskIds === '' ? [] : params.taskIds.split(',').map((item) => Number(item)),
          range: { start: params.start, end: params.end },
        });
      } else if (bgid) {
        //重定向
        const formData = {
          bgid,
          start: params.start || 'now-15m',
          end: params.end || 'now',
          taskIds: params.taskIds || '',
          status: params.status || '',
        };
        form.setFieldsValue({
          ..._.omit(formData, ['start', 'end']),
          taskIds: formData.taskIds === '' ? [] : formData.taskIds.split(',').map((item) => Number(item)),
          range: { start: formData.start, end: formData.end },
        });
        onRedirection(formData);
      }
    })();
  }, [search, refreshFlag]);

  useEffect(() => {
    getDialTaskOptions(curBusiId).then((res) => {
      setTaskList(res.dat);
    });
  }, [curBusiId]);

  return (
    <Form form={form}>
      <Space align='start' className='filter-wrapper' wrap={true}>
        <Input.Group compact>
          <span
            className='ant-input-group-addon'
            style={{
              width: 50,
              height: 32,
              lineHeight: '32px',
            }}
          >
            {t('common:table.status')}
          </span>
          <Form.Item name='status'>
            <Select allowClear style={{ width: '100px' }}>
              <Select.Option value='OK' key='OK'>
                OK
              </Select.Option>
              <Select.Option value='FAIL' key='FAIL'>
                FAIL
              </Select.Option>
            </Select>
          </Form.Item>
        </Input.Group>
        <Form.Item name='range'>
          <TimeRangePicker />
        </Form.Item>
        <Input.Group compact>
          <span
            className='ant-input-group-addon'
            style={{
              width: 90,
              height: 32,
              lineHeight: '32px',
            }}
          >
            {t('datasource:es.filter')}
          </span>
          <Form.Item name='taskIds' style={{ width: '836px' }}>
            <Select allowClear placeholder='请选择拨测任务名称' mode='multiple' optionFilterProp='children'>
              {taskList.map((item: any) => (
                <Select.Option value={item.id} key={item.id} showSearch>
                  {item.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Input.Group>
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
