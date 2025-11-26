import React, { useEffect, useRef, useState } from 'react';
import _ from 'lodash';
import * as d3 from 'd3';
import { useSize } from 'ahooks';
import TsGraph from '@fc-plot/ts-graph';
import '@fc-plot/ts-graph/dist/index.css';
import { IPanel } from '../../../types';
import { statHexPalette } from '../../../config';
import getCalculatedValuesBySeries from '../../utils/getCalculatedValuesBySeries';
import { useGlobalState } from '../../../globalState';
import './style.less';

interface IProps {
  values: IPanel;
  series: any[];
  bodyWrapRef: {
    current: HTMLDivElement | null;
  };
  themeMode?: 'dark';
}

const UNIT_SIZE = 12;
const MIN_SIZE = 12;
const UNIT_PADDING = 4;
const getTextColor = (color, colorMode) => {
  return colorMode === 'value' ? color : '#fff';
};

function StatItem(props) {
  const ele = useRef(null);
  const eleSize = useSize(ele);
  const chartEleRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<TsGraph>(null);
  const {
    item,
    colSpan,
    textMode,
    colorMode,
    textSize,
    isFullSizeBackground,
    valueField = 'Value',
    graphMode,
    serie,
    boxRef,
  } = props;
  // 容器高度，扣除padding
  const boxHeight = boxRef.current?.getBoundingClientRect()?.height - 20;
  // 值所在行的宽度
  const dimension = eleSize?.width! - item.unit.length * UNIT_SIZE - UNIT_PADDING - 20;
  // 按照值、名称各占一行来算，取各自的高度
  const avgHight = item.name === '' ? boxHeight : boxHeight / 2;
  // 高度和font-size 的关系 fong-size =  高度/1.4
  const headerFontSize = textSize?.title
    ? textSize?.title
    : avgHight / 1.4 > (eleSize?.width! - 20) / (_.toString(item.name).length || MIN_SIZE)
    ? (eleSize?.width! - 20) / (_.toString(item.name).length || MIN_SIZE)
    : avgHight / 1.4;
  const valueString = valueField === 'Value' ? `${item.value}${item.unit}` : _.get(item, ['metric', valueField]);
  let statFontSize = textSize?.value
    ? textSize?.value
    : avgHight / 1.4 > dimension / (_.toString(valueString).length || MIN_SIZE)
    ? dimension / (_.toString(valueString).length || MIN_SIZE)
    : avgHight / 1.4;
  const color = item.color;
  const backgroundColor = colorMode === 'background' ? color : 'transparent';

  if (statFontSize > eleSize?.height! - 20) {
    statFontSize = eleSize?.height! - 20;
  }

  useEffect(() => {
    if (chartEleRef.current) {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
      chartRef.current = new TsGraph({
        timestamp: 'X',
        xkey: 0,
        ykey: 1,
        ykey2: 2,
        ykeyFormatter: (value) => Number(value),
        chart: {
          renderTo: chartEleRef.current,
          height: chartEleRef.current.clientHeight,
          marginTop: 0,
          marginRight: 0,
          marginBottom: 0,
          marginLeft: 0,
          colors: [colorMode === 'background' ? 'rgba(255, 255, 255, 0.5)' : color],
        },
        series: [serie],
        line: {
          width: 1,
        },
        xAxis: {
          visible: false,
        },
        yAxis: {
          visible: false,
        },
        area: {
          opacity: 0.2,
        },
      });
    }
  }, [colorMode, graphMode]);

  return (
    <div
      className='renderer-stat-item'
      ref={ele}
      style={{
        width: `${100 / colSpan}%`,
        flexBasis: `${100 / colSpan}%`,
        backgroundColor: isFullSizeBackground ? 'transparent' : backgroundColor,
      }}
    >
      <div style={{ width: '100%' }}>
        {graphMode === 'area' && (
          <div className='renderer-stat-item-graph'>
            <div ref={chartEleRef} style={{ height: '100%', width: '100%' }} />
          </div>
        )}
        <div className='renderer-stat-item-content'>
          {textMode === 'valueAndName' && (
            <div
              className='renderer-stat-header'
              style={{
                fontSize: headerFontSize > 100 ? 100 : headerFontSize,
              }}
            >
              {item.name}
            </div>
          )}
          <div
            className='renderer-stat-value'
            style={{
              color: getTextColor(color, colorMode),
              fontSize: statFontSize > 100 ? 100 : statFontSize,
            }}
          >
            {valueField === 'Value' ? (
              <>
                {item.value}
                <span style={{ fontSize: UNIT_SIZE, paddingLeft: UNIT_PADDING }}>{item.unit}</span>
              </>
            ) : (
              _.get(item, ['metric', valueField])
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const getColumnsKeys = (data: any[]) => {
  const keys = _.reduce(
    data,
    (result, item) => {
      return _.union(result, _.keys(item.metric));
    },
    [],
  );
  return _.uniq(keys);
};

export default function Stat(props: IProps) {
  const { values, series, bodyWrapRef } = props;
  const { custom, options } = values;
  const { calc, textMode, colorMode, colSpan, textSize, valueField, graphMode } = custom;
  const boxRef = useRef<HTMLDivElement>(null);
  const calculatedValues = getCalculatedValuesBySeries(
    series,
    calc,
    {
      unit: options?.standardOptions?.util,
      decimals: options?.standardOptions?.decimals,
      dateFormat: options?.standardOptions?.dateFormat,
    },
    options?.valueMappings,
    options?.thresholds,
  );
  const [isFullSizeBackground, setIsFullSizeBackground] = useState(false);
  const [statFields, setStatFields] = useGlobalState('statFields');

  // 只有单个序列值且是背景色模式，则填充整个卡片的背景色
  useEffect(() => {
    setStatFields(getColumnsKeys(calculatedValues));
    if (bodyWrapRef.current) {
      if (calculatedValues.length === 1 && colorMode === 'background') {
        const head = _.head(calculatedValues);
        const color = head?.color ? head.color : statHexPalette[0];
        const colorObject = d3.color(color);
        bodyWrapRef.current.style.border = `1px solid ${colorObject + ''}`;
        bodyWrapRef.current.style.backgroundColor = colorObject + '';
        bodyWrapRef.current.style.color = '#fff';
        setIsFullSizeBackground(true);
      } else {
        bodyWrapRef.current.style.border = `0 none`;
        bodyWrapRef.current.style.backgroundColor = 'unset';
        bodyWrapRef.current.style.color = 'unset';
        setIsFullSizeBackground(false);
      }
    }
  }, [JSON.stringify(calculatedValues), colorMode]);

  return (
    <div className='renderer-stat-container'>
      <div ref={boxRef} className='renderer-stat-container-box scroll-container'>
        {_.map(calculatedValues, (item, idx) => {
          return (
            <StatItem
              key={item.id}
              item={item}
              idx={idx}
              colSpan={colSpan}
              textMode={textMode}
              colorMode={colorMode}
              textSize={textSize}
              isFullSizeBackground={isFullSizeBackground}
              valueField={valueField}
              graphMode={graphMode}
              serie={_.find(series, { id: item.id })}
              boxRef={boxRef}
            />
          );
        })}
      </div>
    </div>
  );
}
