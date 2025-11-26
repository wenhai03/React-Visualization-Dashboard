import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Tree, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import ModalHOC, { ModalWrapProps } from '@/components/ModalHOC';
import { download, copyToClipBoard } from '@/utils';
import { exportBatchDataDetail } from '@/services/common';

interface IProps {
  type: 'builtin_boards' | 'builtin_alerts';
  filename: string;
  bgid: number;
  treeData: any;
  fieldNames: any;
}

function BatchTreeExport(props: IProps & ModalWrapProps) {
  const { t } = useTranslation('common');
  const { visible, destroy, filename, treeData, fieldNames, type, bgid } = props;
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([type]);
  const [checkedTree, setCheckedTree] = useState<any>([]);
  const [checkedKeys, setCheckedKeys] = useState<any>([]);
  const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);

  const onExpand = (expandedKeysValue: React.Key[]) => {
    setExpandedKeys(expandedKeysValue);
    setAutoExpandParent(false);
  };

  const handleCheck = (checkedKeys) => {
    setCheckedKeys(checkedKeys);
    const data: any = [];
    checkedKeys.forEach((key) => {
      const parent = findParentByKey(treeData[0][fieldNames.children], key);
      if (parent && parent.code !== key) {
        const index = data.findIndex((item) => item.code === parent.code);
        const board = parent[fieldNames.children].filter((item) => item.code === key);
        if (index == -1) {
          data.push({
            ...(type === 'builtin_boards' ? { id: parent.id } : parent),
            [fieldNames.children]: board,
          });
        } else {
          data[index][fieldNames.children].push(...board);
        }
      }
    });
    setCheckedTree(data);
  };

  const findParentByKey = (nodes, key) => {
    for (let node of nodes) {
      if (node[fieldNames.children]) {
        // 如果当前节点有子节点，则递归查找子节点
        const foundChild = findParentByKey(node[fieldNames.children], key);
        if (foundChild) {
          // 如果找到了子节点，则当前节点为目标节点的父节点
          return node;
        }
      }
      // 如果当前节点就是目标节点，则返回当前节点
      if (node.code === key) {
        return node;
      }
    }
    return null;
  };

  return (
    <Modal
      width={800}
      title={t('btn.batch_export')}
      visible={visible}
      onCancel={() => {
        destroy();
      }}
      footer={null}
    >
      <p>
        <a
          onClick={() => {
            if (checkedKeys.length) {
              exportBatchDataDetail(type, bgid, checkedTree).then((res) => {
                const data = JSON.stringify(res.dat, null, 4);
                download([data], `${filename}.json`);
              });
            } else {
              message.warning(t('checked_required'));
            }
          }}
        >
          {filename}.json
        </a>
        <a
          style={{ float: 'right' }}
          onClick={() => {
            if (checkedKeys.length) {
              exportBatchDataDetail(type, bgid, checkedTree).then((res) => {
                const data = JSON.stringify(res.dat, null, 4);
                copyToClipBoard(data, (val) => val);
              });
            } else {
            }
          }}
        >
          <CopyOutlined />
          {t('copy')}
        </a>
      </p>
      <Tree
        checkable
        onExpand={onExpand}
        fieldNames={fieldNames}
        expandedKeys={expandedKeys}
        autoExpandParent={autoExpandParent}
        onCheck={handleCheck}
        checkedKeys={checkedKeys}
        treeData={treeData}
        style={{ height: '600px', overflowY: 'auto' }}
      />
    </Modal>
  );
}

export default ModalHOC(BatchTreeExport);
