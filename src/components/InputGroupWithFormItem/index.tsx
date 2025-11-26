import React from 'react';
import { Input } from 'antd';
import classNames from 'classnames';
import './style.less';

interface IProps {
  children: React.ReactNode;
  label: React.ReactNode;
  labelWidth?: number | string;
  noStyle?: boolean;
  labelHeight?: number | string;
  style?: any;
}

export default function index(props: IProps) {
  const { children, style = {}, label, labelHeight = '32px', labelWidth = 'max-content', noStyle = false } = props;
  return (
    <Input.Group compact className='input-group-with-form-item' style={style}>
      <span
        className={classNames({
          'ant-input-group-addon': !noStyle,
          'input-group-with-form-item-label': true,
        })}
        style={{
          width: labelWidth,
          maxWidth: 'unset',
          height: labelHeight,
        }}
      >
        {label}
      </span>
      <div className='input-group-with-form-item-content'>{children}</div>
    </Input.Group>
  );
}
