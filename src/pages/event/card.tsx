import React, { useEffect, useState, useLayoutEffect, useRef, useImperativeHandle } from 'react';
import { Button, Row, Col, Drawer, Tag, Table } from 'antd';
import { useHistory } from 'react-router';
import { ReactNode } from 'react-markdown/lib/react-markdown';
import _, { throttle } from 'lodash';
import moment from 'moment';
import { useDebounceFn } from 'ahooks';
import queryString from 'query-string';
import { useTranslation } from 'react-i18next';
import { getAlertCards, getCardDetail } from '@/services/warning';
import { SeverityColor, deleteAlertEventsModal } from './index';
import CardLeft from './cardLeft';
import './index.less';
interface Props {
  filter: any;
  header: ReactNode;
  refreshFlag: string;
}

interface CardType {
  severity: number;
  title: string;
  total: number;
  event_ids: number[];
}

function containerWidthToColumn(width: number): number {
  if (width > 1500) {
    return 4;
  } else if (width > 1000) {
    return 6;
  } else if (width > 850) {
    return 8;
  } else {
    return 12;
  }
}

function Card(props: Props, ref) {
  const { t } = useTranslation('AlertCurEvents');
  const { filter, header, refreshFlag } = props;
  const Ref = useRef<HTMLDivElement>(null);
  const history = useHistory();
  const [span, setSpan] = useState<number>(4);
  const [rule, setRule] = useState<string>();
  const [cardList, setCardList] = useState<CardType[]>();
  const [openedCard, setOpenedCard] = useState<CardType>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [drawerList, setDrawerList] = useState<any>();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    reloadCard();
  }, [filter, rule, refreshFlag]);

  const { run: reloadCard } = useDebounceFn(
    () => {
      if (!rule) return;
      getAlertCards({ ...filter, rule: rule.trim() }).then((res) => {
        setCardList(res.dat);
      });
    },
    {
      wait: 500,
    },
  );

  useLayoutEffect(() => {
    function updateSize() {
      const width = Ref.current?.offsetWidth;
      width && setSpan(containerWidthToColumn(width));
    }
    const debounceNotify = throttle(updateSize, 400);

    window.addEventListener('resize', debounceNotify);
    updateSize();
    return () => window.removeEventListener('resize', debounceNotify);
  }, []);

  const onClose = () => {
    setVisible(false);
  };

  const columns = [
    {
      title: t('prod'),
      dataIndex: 'rule_prod',
      width: 100,
      render: (value) => {
        return t(`common:rule_prod.${value}`);
      },
    },
    {
      title: t('rule_name'),
      dataIndex: 'rule_name',
      render(title, { id, tags, subscribe_id, subscriber_name }) {
        const content =
          tags &&
          tags.map((item) => (
            <Tag color='blue' key={item}>
              {item}
            </Tag>
          ));
        return (
          <>
            <div>
              <a style={{ padding: 0 }} onClick={() => history.push(`/alert-cur-events/${id}`)}>
                {title}
                <span style={{ color: 'orange' }}>
                  {subscribe_id !== 0 ? `(${t('subscribe')}：${subscriber_name} )` : ''}
                </span>
              </a>
            </div>
            <div>
              <span className='event-tags'>{content}</span>
            </div>
          </>
        );
      },
    },
    {
      title: t('first_trigger_time'),
      dataIndex: 'first_trigger_time',
      width: 120,
      render(time) {
        return moment(time * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      title: t('trigger_time'),
      dataIndex: 'trigger_time',
      width: 120,
      render(value) {
        return moment(value * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      title: t('common:table.operations'),
      dataIndex: 'operate',
      width: 120,
      render(value, record) {
        return record.group_obj?.perm === 'rw' ? (
          <>
            <Button
              size='small'
              type='link'
              onClick={() => {
                history.push({
                  pathname: '/alert-mutes/add',
                  search: queryString.stringify({
                    bgid: record.group_id,
                    prod: record.rule_prod,
                    cate: record.cate,
                    datasource_ids: [record.datasource_id],
                    tags: record.tags,
                  }),
                });
              }}
            >
              {t('shield')}
            </Button>
            <Button
              size='small'
              type='link'
              danger
              onClick={() =>
                deleteAlertEventsModal(
                  [record.id],
                  () => {
                    setSelectedRowKeys(selectedRowKeys.filter((key) => key !== record.id));
                    fetchCardDetail(openedCard!);
                  },
                  t,
                )
              }
            >
              {t('common:btn.delete')}
            </Button>
          </>
        ) : (
          '-'
        );
      },
    },
  ];

  const fetchCardDetail = (card: CardType) => {
    setVisible(true);
    setOpenedCard(card);
    getCardDetail(card.event_ids).then((res) => {
      setDrawerList(res.dat);
    });
  };

  useImperativeHandle(ref, () => ({
    reloadCard,
  }));

  return (
    <div className='event-content cur-events' style={{ display: 'flex', height: '100%' }} ref={Ref}>
      <CardLeft onRefreshRule={setRule} />
      <div style={{ background: '#fff', flex: 1, padding: 16 }}>
        {header}
        <div style={{ height: 'calc(100vh - 150px)', overflow: 'auto', marginTop: 16 }}>
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            {cardList?.map((card, i) => (
              <Col span={span} key={i}>
                <div
                  className={`event-card ${SeverityColor[card.severity - 1]} ${
                    SeverityColor[card.severity - 1]
                  }-left-border`}
                  onClick={() => fetchCardDetail(card)}
                >
                  <div className='event-card-title'>{card.title}</div>
                  <div className='event-card-num'>{card.total}</div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </div>
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{openedCard?.title}</span>
            <Button
              danger
              disabled={selectedRowKeys.length === 0}
              onClick={() =>
                deleteAlertEventsModal(
                  selectedRowKeys,
                  () => {
                    setSelectedRowKeys([]);
                    fetchCardDetail(openedCard!);
                  },
                  t,
                )
              }
            >
              {t('common:btn.batch_delete')}
            </Button>
          </div>
        }
        placement='right'
        onClose={onClose}
        visible={visible}
        width={960}
      >
        <Table
          size='small'
          rowKey={'id'}
          className='card-event-drawer'
          rowClassName={(record: { severity: number }, index) => {
            return SeverityColor[record.severity - 1] + '-left-border';
          }}
          rowSelection={{
            selectedRowKeys: selectedRowKeys,
            onChange(selectedRowKeys, selectedRows) {
              setSelectedRowKeys(selectedRowKeys.map((key) => Number(key)));
            },
            getCheckboxProps: (record) => ({
              disabled: record.group_obj?.perm === 'ro', // 配置无法勾选的列
            }),
          }}
          dataSource={drawerList}
          columns={columns}
        />
      </Drawer>
    </div>
  );
}

export default React.forwardRef(Card);
