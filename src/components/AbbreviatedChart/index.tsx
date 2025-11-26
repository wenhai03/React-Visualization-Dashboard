import React from 'react';
import { Mix } from '@ant-design/plots';
import ChartNoData from '../../../public/image/chartNoData.svg';

interface IChartProps {
  now: any;
  contrast?: any;
  nowColor?: string;
  contrastColor?: string;
  height?: string;
}

const AbbreviatedChart: React.FC<IChartProps> = (props) => {
  const { now = [], contrast = [], nowColor = '#da8b45', contrastColor = '#edc5a2', height = '40px' } = props;
  const config: any = {
    tooltip: false,
    plots: [
      ...(contrast?.length
        ? [
            {
              type: 'area',
              options: {
                data: contrast.map((item) => ({ ...item, type: 'contrast' })) || [],
                xField: 'x',
                yField: 'y',
                xAxis: false,
                yAxis: false,
                smooth: true,
                color: contrastColor,
                seriesField: 'type',
                areaStyle: {
                  fill: contrastColor,
                  fillOpacity: 0.5,
                },
              },
            },
          ]
        : []),
      {
        type: 'line',
        options: {
          data: now.map((item) => ({ ...item, type: 'now' })) || [],
          xField: 'x',
          yField: 'y',
          xAxis: false,
          yAxis: false,
          smooth: true,
          seriesField: 'type',
          color: nowColor,
        },
      },
    ],
  };

  return <div style={{ height: height }}>{now.length || contrast.length ? <Mix {...config} /> : <ChartNoData />}</div>;
};

export default AbbreviatedChart;
