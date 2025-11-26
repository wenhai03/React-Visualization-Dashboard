import React, { useState, useEffect, useImperativeHandle } from 'react';
import _ from 'lodash';
import queryString from 'query-string';
import { useLocation } from 'react-router-dom';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { EditOutlined } from '@ant-design/icons';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import { Datasource } from '@/App';
import {
  convertExpressionToQuery,
  replaceExpressionVars,
  replaceExpressionVarsForEs,
  getVaraiableSelected,
  setVaraiableSelected,
  filterOptionsByReg,
  stringToRegex,
} from './constant';
import { IVariable } from './definition';
import DisplayItem from './DisplayItem';
import EditItems from './EditItems';
import './index.less';

interface IProps {
  id: string;
  editable?: boolean;
  value?: IVariable[];
  range: IRawTimeRange | { start: number; end: number };
  onChange: (data: IVariable[], needSave: boolean, options?: IVariable[]) => void;
  onOpenFire?: () => void;
  isPreview?: boolean;
  updateVariable?: string;
  group_id: number;
  groupedDatasourceList: { [key: string]: Datasource[] };
  disabled?: boolean; // 用于分享，控制不可选择
  chart_share_id?: string;
  valueWithOption?: any;
  // onRef?: any;
  // isRow?: boolean; // 是否为分组
}

function includes(source, target) {
  if (_.isArray(target)) {
    return _.intersection(source, target);
  }
  return _.includes(source, target);
}

function VariableConfig(props: IProps) {
  const { t } = useTranslation('dashboard');
  const query = queryString.parse(useLocation().search);
  const {
    id,
    editable = true,
    range,
    onChange,
    onOpenFire,
    isPreview = false,
    group_id,
    updateVariable = '',
    groupedDatasourceList,
    disabled,
    chart_share_id,
    valueWithOption,
    // onRef,
    // isRow,
  } = props;
  const [editing, setEditing] = useState<boolean>(false);
  const [data, setData] = useState<IVariable[]>([]);
  const dataWithoutConstant = _.filter(data, (item) => item.type !== 'constant');
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refreshFlag_'));
  const value = _.map(props.value, (item) => {
    return {
      ...item,
      type: item.type || 'query',
    };
  });

  // useImperativeHandle(onRef, () => ({
  //   changeEditing: (val) => {
  //     setEditing(val);
  //   },
  // }));

  const resetSelect = (item, id) => {
    let val = getVaraiableSelected(item?.name, item?.type, id);
    if (item.type === 'datasource') {
      const matchData = item.options?.find((ele) => ele.id === val);
      val = matchData ? val : '';
    } else if (item.type === 'constant') {
      return item.definition;
    } else if (Array.isArray(val)) {
      val = item.options?.length ? val : [];
    } else if (item.type != 'textbox') {
      const matchData = item.options?.find((ele) => ele === val);
      val = matchData ? val : '';
    }
    return val;
  };

  useEffect(() => {
    if (valueWithOption) {
      valueWithOption.forEach((element) => {
        setVaraiableSelected({ name: element.name, value: element.value, id, urlAttach: false });
      });

      setData(valueWithOption);
    } else if (value) {
      let result: IVariable[] = [];
      (async () => {
        for (let idx = 0; idx < value.length; idx++) {
          const item = _.cloneDeep(value[idx]);
          if (item.type === 'query' && item.definition) {
            const definition =
              idx > 0
                ? item.datasource.cate === 'elasticsearch'
                  ? replaceExpressionVarsForEs(item.definition, result, idx, id, true)
                  : replaceExpressionVars(item.definition, result, idx, id)
                : item.definition;
            let options = [];
            try {
              options = await convertExpressionToQuery(
                definition,
                range,
                {
                  ...item,
                  datasource: {
                    ...(item?.datasource || {}),
                    value: result.length
                      ? (replaceExpressionVars(item?.datasource?.value as any, result, result.length, id) as any)
                      : item?.datasource?.value,
                  },
                },
                group_id,
                chart_share_id,
              );
              options = _.sortBy(options);
            } catch (error) {
              console.error(error);
            }
            const regFilterOptions = filterOptionsByReg(options, item.reg, result, idx, id);
            result[idx] = item;
            result[idx].fullDefinition = definition;
            result[idx].options = item.type === 'query' ? _.sortBy(regFilterOptions) : regFilterOptions;
            // 当仪表盘变量值为空时，设置默认值
            // 如果已选项不在待选项里也视做空值处理
            // const selected = isRow
            //   ? data.find((ele) => ele.name === item.name)?.value
            //   : item.isRow
            //   ? item.value
            //   : getVaraiableSelected(item.name, item.type, id);
            const selected = getVaraiableSelected(item.name, item.type, id);
            if (query.__variable_value_fixed === undefined) {
              if (
                selected === null ||
                (selected && !_.isEmpty(regFilterOptions) && !includes(regFilterOptions, selected))
              ) {
                const head = regFilterOptions?.[0];
                const defaultVal = item.multi ? (item.allOption ? ['all'] : head ? [head] : []) : head;
                setVaraiableSelected({ name: item.name, value: defaultVal, id, urlAttach: true });
              }
            }
          } else if (item.type === 'custom') {
            result[idx] = item;
            result[idx].options = _.map(_.compact(_.split(item.definition, ',')), _.trim);
            // const selected = isRow
            //   ? data.find((ele) => ele.name === item.name)?.value
            //   : item.isRow
            //   ? item.value
            //   : getVaraiableSelected(item.name, item.type, id);
            const selected = getVaraiableSelected(item.name, item.type, id);
            if (selected === null && query.__variable_value_fixed === undefined) {
              setVaraiableSelected({ name: item.name, value: item.defaultValue!, id, urlAttach: true });
            }
          } else if (item.type === 'textbox') {
            result[idx] = item;
            // const selected = isRow
            //   ? data.find((ele) => ele.name === item.name)?.value
            //   : item.isRow
            //   ? item.value
            //   : getVaraiableSelected(item.name, item.type, id);
            const selected = getVaraiableSelected(item.name, item.type, id);
            if (selected === null && query.__variable_value_fixed === undefined) {
              setVaraiableSelected({ name: item.name, value: item.defaultValue!, id, urlAttach: true });
            }
          } else if (item.type === 'constant') {
            result[idx] = item;
            // const selected = isRow
            //   ? data.find((ele) => ele.name === item.name)?.value
            //   : item.isRow
            //   ? item.value
            //   : getVaraiableSelected(item.name, item.type, id);
            const selected = getVaraiableSelected(item.name, item.type, id);
            if (selected === null && query.__variable_value_fixed === undefined) {
              setVaraiableSelected({ name: item.name, value: item.definition, id, urlAttach: true });
            }
          } else if (item.type === 'datasource') {
            const options = item.definition ? (groupedDatasourceList[item.definition] as any) : [];
            const regex = item.regex ? stringToRegex(item.regex) : null;
            result[idx] = item;
            if (regex) {
              result[idx].options = _.filter(options, (option) => {
                return regex.test(option.name);
              });
            } else {
              result[idx].options = options;
            }
            // const selected = isRow
            //   ? data.find((ele) => ele.name === item.name)?.value
            //   : item.isRow
            //   ? item.value
            //   : getVaraiableSelected(item.name, item.type, id);
            const selected = getVaraiableSelected(item.name, item.type, id);
            if (selected === null) {
              if (item.defaultValue) {
                setVaraiableSelected({ name: item.name, value: item.defaultValue, id, urlAttach: true });
              } else {
                if (query.__variable_value_fixed === undefined) {
                  setVaraiableSelected({ name: item.name, value: options[0]?.id, id, urlAttach: true });
                }
              }
            }
          }
        }

        // 设置变量默认值，优先从 url 中获取，其次是 localStorage
        result = _.map(_.compact(result), (item: any) => {
          // let val = isRow
          //   ? data.find((ele) => ele.name === item.name)?.value
          //   : item.isRow
          //   ? item.value
          //   : resetSelect(item, id);
          let val = resetSelect(item, id);
          return {
            ...item,
            value: val,
          };
        });
        setData(result);
        onChange(value, false, result);
      })();
    }
  }, [
    JSON.stringify(value),
    refreshFlag,
    groupedDatasourceList,
    updateVariable,
    JSON.stringify(valueWithOption),
    JSON.stringify(range),
  ]);

  return (
    <div className='tag-area'>
      <div className={classNames('tag-content', 'tag-content-close')}>
        {_.map(dataWithoutConstant, (item) => {
          return (
            <DisplayItem
              key={item.name}
              expression={item}
              value={item.value}
              disabled={disabled}
              onChange={(val) => {
                // 分组变量不使用url和缓存参数
                // if (!(isRow || item.isRow)) {
                // 缓存变量值，更新 url 里的变量值
                setVaraiableSelected({
                  name: item.name,
                  value: val,
                  id,
                  urlAttach: true,
                  vars: dataWithoutConstant,
                });
                // }

                const newData = _.map(data, (subItem) => {
                  if (subItem.name === item.name) {
                    return {
                      ...item,
                      value: val,
                    };
                  }
                  return subItem;
                });

                setData(newData);
                // onChange(value, false, newData);
                setRefreshFlag(_.uniqueId('refreshFlag_'));
              }}
            />
          );
        })}
        {editable && !isPreview ? (
          <EditOutlined
            className='icon'
            onClick={() => {
              setEditing(true);
              onOpenFire && onOpenFire();
            }}
          />
        ) : null}
        {(data ? _.filter(data, (item) => item.type != 'constant')?.length === 0 : true) && editable && !isPreview && (
          <div
            className='add-variable-tips'
            onClick={() => {
              setEditing(true);
              onOpenFire && onOpenFire();
            }}
          >
            {t('var.btn')}
          </div>
        )}
      </div>
      <EditItems
        visible={editing}
        setVisible={setEditing}
        value={value}
        onChange={(v: IVariable[]) => {
          if (v) {
            onChange(v, true);
            setData(v);
          }
        }}
        range={range as IRawTimeRange}
        id={id}
        groupedDatasourceList={groupedDatasourceList}
      />
    </div>
  );
}

export type { IVariable } from './definition';
export { replaceExpressionVars } from './constant';
export default React.memo(VariableConfig);
