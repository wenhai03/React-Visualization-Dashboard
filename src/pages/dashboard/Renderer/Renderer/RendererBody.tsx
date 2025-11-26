import React from 'react';
import _ from 'lodash';
import Timeseries from './Timeseries';
import Stat from './Stat';
import Table from './Table';
import Pie from './Pie';
import Hexbin from './Hexbin';
import BarGauge from './BarGauge';
import Text from './Text';
import Gauge from './Gauge';
import Iframe from './Iframe';
import { Spin } from 'antd';

interface PanelBodyProps {
  loading?: boolean;
  type: string;
  values: any;
  series: any[];
  themeMode?: 'dark';
  time?: any;
  isShare?: boolean;
  bodyWrapRef?: React.RefObject<HTMLDivElement> | any;
  tableRef?: React.RefObject<{ handleExportCsv: () => void }>;
}

const RendererBody: React.FC<PanelBodyProps> = ({
  loading,
  type,
  values,
  series,
  themeMode,
  time,
  isShare,
  bodyWrapRef,
  tableRef,
}) => {
  const renderers = {
    timeseries: <Timeseries values={values} series={series} themeMode={themeMode} time={time} isShare={isShare} />,
    stat: <Stat values={values} series={series} bodyWrapRef={bodyWrapRef} themeMode={themeMode} />,
    table: <Table values={values} series={series} themeMode={themeMode} time={time} isShare={isShare} ref={tableRef} />,
    pie: <Pie values={values} series={series} themeMode={themeMode} time={time} isShare={isShare} />,
    hexbin: <Hexbin values={values} series={series} themeMode={themeMode} time={time} isShare={isShare} />,
    barGauge: <BarGauge values={values} series={series} themeMode={themeMode} time={time} isShare={isShare} />,
    text: <Text values={values} series={series} />,
    gauge: <Gauge values={values} series={series} themeMode={themeMode} />,
    iframe: <Iframe values={values} series={series} time={time} isShare={isShare} />,
  };

  if (loading) {
    return (
      <div
        className='renderer-body-content-empty'
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Spin />
      </div>
    );
  }

  if (_.isEmpty(series) && type !== 'text' && type !== 'iframe') {
    return <div className='renderer-body-content-empty'>No Data</div>;
  }

  return renderers[type] || <div className='unknown-type'>{`无效的图表类型 ${type}`}</div>;
};

export default React.memo(RendererBody);
