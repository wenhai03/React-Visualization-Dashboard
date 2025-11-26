import React, { useState, useContext, useEffect } from 'react';
import _ from 'lodash';
import { Table, Space, Tag, Tooltip } from 'antd';
import { EditTwoTone } from '@ant-design/icons';
import { CommonStateContext } from '@/App';
import { useHistory } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import { getMetricsInputOverview } from '@/services/metric';
import { useTranslation } from 'react-i18next';
import './index.less';
import './locale';

const Overview: React.FC = () => {
  const { t } = useTranslation('metric');
  const history = useHistory();
  const [overviewlist, setOverviewList] = useState<any>();
  const [loading, setLoading] = useState(false);
  const { curBusiId } = useContext(CommonStateContext);

  const jumpPage = (record: any) => {
    history.push(`/metric/input-task/operations?name=${record.name.replace('metrics:', '')}`);
  };

  const columns: any = [
    {
      title: t('overview.metric_name'),
      dataIndex: 'name',
      width: 260,
      render: (text, record, index) => {
        const prevRecord = overviewlist[index - 1];
        if (index > 0 && prevRecord.name === text) {
          return {
            children: <div></div>,
            props: {
              rowSpan: 0,
            },
          };
        } else {
          let count = 1;
          for (let i = index + 1; i < overviewlist.length; i++) {
            if (overviewlist[i].name === text) {
              count++;
            } else {
              break;
            }
          }
          return {
            children: text.replace('metrics:', ''),
            props: {
              rowSpan: count,
            },
          };
        }
      },
    },
    {
      title: t('input_task.task_type'),
      dataIndex: 'mode',
      width: 110,
      render: (val) => (!val ? t('input_task.no_task') : t(`input_task.type_${val}`)),
    },
    {
      title: t('overview.config_content'),
      dataIndex: 'content',
      ellipsis: {
        showTitle: false,
      },
      render: (val) => (
        <Tooltip
          placement='topLeft'
          title={<pre style={{ overflow: 'initial' }}>{val}</pre>}
          overlayClassName='table-tooltip-content'
          overlayInnerStyle={{
            maxHeight: 400,
            maxWidth: 875,
            width: 'max-content',
            height: 'max-content',
            overflow: 'auto',
          }}
        >
          {val}
        </Tooltip>
      ),
    },
    {
      title: t('overview.relevance_host'),
      dataIndex: 'idents',
      width: 360,
      ellipsis: {
        showTitle: false,
      },
      render: (val) => {
        const tagList = val.map((item) => (
          <Tag color='blue' key={item}>
            {item}
          </Tag>
        ));
        return val && val.length ? (
          <Tooltip
            placement='topRight'
            title={<Space wrap>{tagList}</Space>}
            overlayClassName='table-tooltip-content'
            overlayInnerStyle={{
              maxWidth: 360,
              maxHeight: 400,
              width: 'max-content',
              height: 'max-content',
              overflow: 'auto',
            }}
          >
            {tagList}
          </Tooltip>
        ) : (
          '-'
        );
      },
    },
    {
      title: t('common:table.operations'),
      dataIndex: 'operate',
      width: 50,
      align: 'center',
      render(value, record) {
        return <EditTwoTone onClick={() => jumpPage(record)} />;
      },
    },
  ];

  useEffect(() => {
    if (curBusiId) {
      setLoading(true);
      getMetricsInputOverview({ bgid: curBusiId })
        .then((res) => {
          setLoading(false);
          setOverviewList(res.dat);
        })
        .catch((err) => {
          setLoading(false);
        });
    }
  }, [curBusiId]);

  return (
    <PageLayout title={t('overview.title')} showBack backPath='/metric/input-task'>
      <div>
        <div style={{ padding: '10px' }}>
          <Table
            size='small'
            rowKey='id'
            bordered
            columns={columns}
            dataSource={overviewlist}
            loading={loading}
            pagination={false}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default Overview;
