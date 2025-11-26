import React, { useEffect, useState, useContext, useRef } from 'react';
import { CommonStateContext } from '@/App';
import { Row, Col } from 'antd';

const PerRowWater = ({ waterMarkText }) => {
  return (
    <Row wrap={false} style={{ overflow: 'hidden' }}>
      <Col flex='400px' className='water-mark-content'>
        {waterMarkText}
      </Col>
      <Col flex='400px' className='water-mark-content'>
        {waterMarkText}
      </Col>
      <Col flex='400px' className='water-mark-content'>
        {waterMarkText}
      </Col>
      <Col flex='400px' className='water-mark-content'>
        {waterMarkText}
      </Col>
      <Col flex='400px' className='water-mark-content'>
        {waterMarkText}
      </Col>
    </Row>
  );
};

const WaterMarkContent = () => {
  const { profile } = useContext(CommonStateContext);
  const watermarkContainerRef = useRef(null);
  const [waterMarkText, setWaterMarkText] = useState('');

  const getDateTime = () => {
    const time = new Date();
    const year = time.getFullYear();
    const month = time.getMonth() + 1;
    const day = time.getDate();
    const hour = time.getHours();
    const m = time.getMinutes();
    const minutes = m < 10 ? `0${m}` : m;
    const s = time.getSeconds();
    const seconds = s <= 9 ? '0' + s : s;
    return `@${year}/${month}/${day} ${hour}:${minutes}:${seconds}`;
  };

  const updateWaterText = () => {
    const dateTime = getDateTime();
    const text = `${profile?.nickname || ''}${dateTime}`;
    setWaterMarkText(text);
  };

  useEffect(() => {
    updateWaterText();
    const timmer = setInterval(updateWaterText, 1000);

    return () => {
      clearTimeout(timmer);
    };
  }, [profile]);

  return (
    <div className='water-mark-wrapper' ref={watermarkContainerRef}>
      <PerRowWater waterMarkText={waterMarkText} />
      <PerRowWater waterMarkText={waterMarkText} />
      <PerRowWater waterMarkText={waterMarkText} />
    </div>
  );
};

export default WaterMarkContent;
