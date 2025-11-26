import React from 'react';
import { Form, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
export const DATASOURCE_ALL = 0;

interface IProps {
  setFieldsValue: any;
  cate: string;
  datasourceList: { id: number; name: string }[];
  mode?: 'multiple';
  required?: boolean;
  disabled?: boolean;
  isExistAll?: boolean; // 内置告警
  onChange?: () => void;
}

export default function DatasourceValueSelect({
  setFieldsValue,
  cate,
  datasourceList,
  mode,
  required = true,
  disabled,
  isExistAll,
  onChange,
}: IProps) {
  const { t } = useTranslation();
  const handleClusterChange = (v: number[] | number) => {
    if (_.isArray(v)) {
      const curVal = _.last(v);
      if (curVal === DATASOURCE_ALL) {
        setFieldsValue({ datasource_ids: [DATASOURCE_ALL] });
      } else if (typeof v !== 'number' && v.includes(DATASOURCE_ALL)) {
        setFieldsValue({ datasource_ids: _.without(v, DATASOURCE_ALL) });
      }
      onChange && onChange();
    } else {
      // 兼容数据源类型是ES时，下拉模式单选，选中值为数组（保持和多选值格式一致）
      setFieldsValue({ datasource_ids: [v] });
      onChange && onChange();
    }
  };

  if (cate === 'prometheus' || isExistAll) {
    datasourceList = [
      {
        id: DATASOURCE_ALL,
        name: '$all',
      },
      ...datasourceList,
    ];
  }

  return (
    <Form.Item
      label={t('common:datasource.id')}
      name='datasource_ids'
      rules={[
        {
          required,
        },
      ]}
    >
      <Select
        mode={mode}
        onChange={handleClusterChange}
        maxTagCount='responsive'
        disabled={disabled}
        showSearch
        optionFilterProp='children'
      >
        {datasourceList?.map((item) => (
          <Select.Option value={item.id} key={item.id}>
            {item.name}
          </Select.Option>
        ))}
      </Select>
    </Form.Item>
  );
}
