import React, { useState, useEffect, useContext } from 'react';
import { Form, AutoComplete } from 'antd';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import { useTranslation } from 'react-i18next';
import { getDataCategory } from '@/services/warning';

interface IProps {
  prefixField?: any;
  prefixName?: string[] | number[];
  cate: string;
  datasourceValue?: number | string;
  name?: string | string[]; // 可自定义 name 或者 [...prefixName, 'query', 'index']
}

export default function IndexSelect({ prefixField = {}, prefixName = [], cate, datasourceValue, name }: IProps) {
  const { curBusiId } = useContext(CommonStateContext);
  const [options, setOptions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const { t } = useTranslation('datasource');

  useEffect(() => {
    if (datasourceValue) {
      getDataCategory({
        busi_group_id: curBusiId,
        datasource_id: datasourceValue,
        index: '*',
      }).then((res) => {
        let indexOptions: any = [];
        if (!_.isEmpty(res)) {
          ['aliases', 'data_streams', 'indices'].forEach((key) => {
            indexOptions = [
              ...indexOptions,
              ...res[key].filter((indexItem) => !indexItem.data_stream).map((element) => ({ value: element.name })),
            ];
          });
        }
        setOptions(indexOptions);
      });
    }
  }, [cate, datasourceValue]);

  return (
    <Form.Item
      label={t('datasource:es.index')}
      tooltip={{ title: <pre style={{ margin: 0 }}>{t('es.index_tip')}</pre>, overlayInnerStyle: { width: '370px' } }}
      {...prefixField}
      name={name || [...prefixName, 'query', 'index']}
      rules={[
        {
          required: true,
          message: t('datasource:es.index_msg'),
        },
      ]}
      validateTrigger='onBlur'
    >
      <AutoComplete
        options={_.filter(options, (item) => {
          if (search) {
            return item.value.includes(search);
          }
          return true;
        })}
        onSearch={(val) => {
          setSearch(val);
        }}
      />
    </Form.Item>
  );
}
