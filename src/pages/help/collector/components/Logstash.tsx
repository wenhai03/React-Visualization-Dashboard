import React, { useContext, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { Button, Input, message, Select, Space, Table, Tag, Tooltip } from 'antd';
import { CommonStateContext } from '@/App';
import { getLogstoolConfigs, logsServiceConfigs, setLogstoolConfigs } from '@/services/logstash';
import { useTranslation } from 'react-i18next';
import { isTagValid } from '@/utils';
import { SearchOutlined } from '@ant-design/icons';

const Logstash: React.FC = () => {
  const { t } = useTranslation('collector');
  const [logstashList, setLogstashList] = useState<any>();
  const [loading, setLoading] = useState(false);
  const { curBusiId } = useContext(CommonStateContext);
  const [whiteList, setWhiteList] = useState([]);
  const [searchValue, setSearchValue] = useState(''); // 新增状态，用于存储搜索框的值

  const columns = useMemo(
    () => [
      {
        title: () => (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>{t('script.logstash.name')}</span>
            <Input
              allowClear
              size='small'
              placeholder={t('common:search_placeholder')}
              style={{ marginLeft: 'auto', width: 180 }}
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
              }}
              prefix={<SearchOutlined />}
            />
          </div>
        ),
        dataIndex: 'name',
        key: 'name',
        width: 300,
      },
      {
        title: t('script.logstash.file_type'),
        dataIndex: 'format',
        width: 80,
      },
      {
        title: t('script.logstash.content'),
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
        title: t('script.logstash.relevance_host'),
        dataIndex: 'idents',
        width: 200,
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
              placement='topLeft'
              title={<Space wrap>{tagList}</Space>}
              overlayClassName='table-tooltip-content'
              overlayInnerStyle={{
                maxWidth: 400,
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
        title: t('common:table.update_at'),
        dataIndex: 'update_at',
        width: 160,
        render: (text) => {
          return moment.unix(text).format('YYYY-MM-DD HH:mm:ss');
        },
      },
    ],
    [t, searchValue], // 将 searchValue 添加到依赖数组中
  );

  // 根据搜索值筛选数据
  const filteredData = useMemo(() => {
    if (!searchValue) return logstashList;
    return logstashList?.filter((item) => item.name.toLowerCase().includes(searchValue.toLowerCase()));
  }, [searchValue, logstashList]);

  const tagRender = (content) => {
    const isCorrectFormat = isTagValid(content.value ?? '');
    return isCorrectFormat ? (
      <Tag closable={content.closable} onClose={content.onClose}>
        {content.value}
      </Tag>
    ) : (
      <Tooltip title={t('script.logstash.ip_error')}>
        <Tag color='error' closable={content.closable} onClose={content.onClose} style={{ marginTop: '2px' }}>
          {content.value}
        </Tag>
      </Tooltip>
    );
  };

  useEffect(() => {
    if (curBusiId) {
      setLoading(true);
      logsServiceConfigs()
        .then((res) => {
          setLoading(false);
          setLogstashList(res.dat?.list || []);
        })
        .catch((err) => {
          setLoading(false);
        });
    }
  }, [curBusiId]);

  useEffect(() => {
    getLogstoolConfigs().then((res) => {
      if (res.success) {
        setWhiteList(res.dat);
      }
    });
  }, []);

  const handleSubmit = () => {
    const isInvalid =
      whiteList &&
      whiteList.some((tag) => {
        const isCorrectFormat = isTagValid(tag);
        if (!isCorrectFormat) {
          return true;
        }
      });
    if (!isInvalid) {
      setLogstoolConfigs(whiteList).then((res) => {
        if (res.success) {
          message.success(t('common:success.save'));
        }
      });
    } else {
      message.error(t('script.logstash.ip_error'));
    }
  };

  return (
    <>
      <Space>
        <span>{t('script.logstash.white_list')}</span>
        <Select
          value={whiteList}
          mode='tags'
          tokenSeparators={[' ']}
          open={false}
          tagRender={tagRender}
          style={{ minWidth: '500px' }}
          onChange={(e) => {
            setWhiteList(e);
          }}
        />
        <Button type='primary' onClick={handleSubmit}>
          {t('common:btn.save')}
        </Button>
      </Space>
      <Table
        size='small'
        rowKey='id'
        bordered
        columns={columns}
        dataSource={filteredData} // 使用筛选后的数据
        loading={loading}
        pagination={false}
        scroll={{ y: 'calc(100vh - 218px)' }}
      />
    </>
  );
};

export default React.memo(Logstash);
