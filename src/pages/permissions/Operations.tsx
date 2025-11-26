import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Tree, Button, Modal, message } from 'antd';
import { getOperationsByRole, putOperationsByRole } from './services';
import { OperationType } from './types';

function transformOperations(operations: OperationType[]) {
  return _.map(operations, (item) => ({
    title: item.cname,
    key: item.name,
    children: _.map(item.ops, (item) => ({
      title: item.cname,
      key: item.name,
      ...(item.ops
        ? {
            children: _.map(item.ops, (item) => ({
              title: item.cname,
              key: item.name,
            })),
          }
        : {}),
    })),
  }));
}

interface IProps {
  data: OperationType[];
  roleId?: number;
  disabled: boolean;
}

export default function Operations(props: IProps) {
  const { t } = useTranslation('permissions');
  const { data, roleId, disabled } = props;
  const [operations, setOperations] = useState<string[]>([]);

  useEffect(() => {
    if (roleId) {
      getOperationsByRole(roleId).then((res) => {
        setOperations(res);
      });
    }
  }, [roleId]);

  if (!roleId) return <div>请先选择角色</div>;

  // 获取父辈节点
  const getParentNodes = (parentKeys) => {
    const treeData = transformOperations(data);
    return [
      treeData[parentKeys[0]].key,
      ...(parentKeys[1] ? [treeData[parentKeys[0]].children[parentKeys[1]].key] : []),
    ];
  };

  return (
    <div>
      <Tree
        key={roleId}
        checkable
        checkStrictly
        defaultExpandAll
        disabled={disabled}
        checkedKeys={operations}
        treeData={transformOperations(data)}
        onCheck={(checkedKeys: any, e: any) => {
          let checkedArr = checkedKeys.checked;
          // 关闭父级，子级全部关闭
          if (e.node.checked && e.node.children?.length) {
            const childrenKeys = e.node.children.reduce((previousValue, currentValue) => {
              return [
                ...previousValue,
                currentValue.key,
                ...(currentValue.children ? currentValue.children.map((item) => item.key) : []),
              ];
            }, []);
            checkedArr = checkedArr.filter((item) => !childrenKeys.includes(item));
          }
          // 选中子级，祖先节点显示
          const parentKeys = e.node.pos.split('-');
          parentKeys.shift();
          parentKeys.pop();
          if (!e.node.checked && parentKeys.length) {
            const parentNodes = getParentNodes(parentKeys);
            checkedArr = Array.from(new Set([...checkedArr, ...parentNodes]));
          }
          setOperations(checkedArr);
        }}
      />
      {!disabled && (
        <div style={{ marginTop: 16 }}>
          <Button
            type='primary'
            onClick={() => {
              Modal.confirm({
                title: t('common:confirm.save'),
                okText: t('common:btn.ok'),
                cancelText: t('common:btn.cancel'),
                onOk: () => {
                  putOperationsByRole(roleId, operations).then(() => {
                    message.success(t('common:success.save'));
                  });
                },
              });
            }}
          >
            {t('common:btn.save')}
          </Button>
        </div>
      )}
    </div>
  );
}
