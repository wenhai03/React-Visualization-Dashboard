import React from 'react';
import { Form, Input, InputNumber, Select, DatePicker } from 'antd';

interface IValueInputType {
  fieldType: string;
  name: string[];
  label: string;
}

const ValueInputType: React.FC<IValueInputType> = (props) => {
  const { fieldType, name, label } = props;
  return (
    <Form.Item name={name} label={label}>
      {fieldType === 'string' ? (
        <Input style={{ width: '100%' }} />
      ) : fieldType === 'number' || fieldType === 'number_range' ? (
        <InputNumber style={{ width: '100%' }} />
      ) : fieldType === 'date' || fieldType === 'date_range' ? (
        <DatePicker showTime style={{ width: '100%' }} />
      ) : fieldType === 'ip' || fieldType === 'ip_range' ? (
        <Input style={{ width: '100%' }} />
      ) : fieldType === 'boolean' ? (
        <Select style={{ width: '100%' }}>
          <Select.Option value='true' key='true'>
            true
          </Select.Option>
          <Select.Option value='false' key='false'>
            false
          </Select.Option>
        </Select>
      ) : null}
    </Form.Item>
  );
};

export default ValueInputType;
