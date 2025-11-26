import { Row, Col, Space } from 'antd';
import { RightOutlined, DownOutlined } from '@ant-design/icons';
import { groupBy } from 'lodash';
import { transparentize } from 'polished';
import React, { useState } from 'react';
import { getCriticalPath } from '../../utils';
import { WaterfallItem } from '../WaterfallItem';
import './index.less';

interface AccordionWaterfallProps {
  isOpen: boolean;
  item: any;
  level: number;
  duration: any;
  waterfallItemId?: string;
  waterfall: any;
  timelineMargins: any;
  onClickWaterfallItem: (item: any, flyoutDetailTab: string) => void;
  showCriticalPath: boolean;
  maxLevelOpen: number;
}

const ACCORDION_HEIGHT = '48px';

export default function AccordionWaterfall(props: AccordionWaterfallProps) {
  const {
    item,
    level,
    duration,
    waterfall,
    waterfallItemId,
    timelineMargins,
    onClickWaterfallItem,
    showCriticalPath,
    maxLevelOpen,
  } = props;

  const [isOpen, setIsOpen] = useState(props.isOpen);

  let children = waterfall.childrenByParentId[item.id] || [];

  const criticalPath = showCriticalPath ? getCriticalPath(waterfall) : undefined;

  const criticalPathSegmentsById = groupBy(criticalPath?.segments, (segment) => segment.item.id);
  let displayedColor = item.color;

  if (showCriticalPath) {
    children = children.filter((child) => criticalPathSegmentsById[child.id]?.length);
    displayedColor = transparentize(0, item.color);
  }

  const errorCount = waterfall.getErrorCount(item.id);

  // To indent the items creating the parent/child tree
  const marginLeftLevel = 8 * level;

  function toggleAccordion() {
    setIsOpen((isCurrentOpen) => !isCurrentOpen);
  }

  const hasToggle = !!children.length;

  return (
    <div className='waterfall_accordion' style={{ position: 'relative' }} key={item.id} id={item.id}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          className='accordion-water-fall-button'
          style={{
            marginLeft: `${marginLeftLevel}px`,
            borderLeft:
              item.doc.event?.outcome === 'failure' ? '2px solid rgb(189, 39, 30)' : '1px solid rgb(211, 218, 230)',
          }}
        >
          <Row style={{ width: '100%', height: '100%' }}>
            <Col>
              <ToggleAccordionButton
                show={hasToggle}
                isOpen={isOpen}
                childrenAmount={children.length}
                onClick={toggleAccordion}
              />
            </Col>
            <Col style={{ flexGrow: 1 }}>
              <WaterfallItem
                key={item.id}
                timelineMargins={timelineMargins}
                color={displayedColor}
                item={item}
                hasToggle={hasToggle}
                totalDuration={duration}
                isSelected={item.id === waterfallItemId}
                errorCount={errorCount}
                marginLeftLevel={marginLeftLevel}
                onClick={(flyoutDetailTab: string) => {
                  onClickWaterfallItem(item, flyoutDetailTab);
                }}
                segments={criticalPathSegmentsById[item.id]
                  ?.filter((segment) => segment.self)
                  .map((segment) => ({
                    // color: theme.eui.euiColorAccent,
                    color: 'green',
                    left: (segment.offset - item.offset - item.skew) / item.duration,
                    width: segment.duration / item.duration,
                  }))}
              />{' '}
            </Col>
          </Row>
        </div>
      </div>
      {isOpen &&
        children.map((child) => (
          <AccordionWaterfall {...props} key={child.id} isOpen={maxLevelOpen > level} level={level + 1} item={child} />
        ))}
    </div>
  );
}

function ToggleAccordionButton({
  show,
  isOpen,
  childrenAmount,
  onClick,
}: {
  show: boolean;
  isOpen: boolean;
  childrenAmount: number;
  onClick: () => void;
}) {
  if (!show) {
    return null;
  }

  return (
    <div
      style={{ height: ACCORDION_HEIGHT, display: 'flex', cursor: 'pointer' }}
      onClick={(e: any) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Space>
        <div>{isOpen ? <DownOutlined /> : <RightOutlined />}</div>
        <div>{childrenAmount}</div>
      </Space>
    </div>
  );
}
