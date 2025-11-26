import { getConfigByKey, setConfigByKey } from '@/services/config';
import { powerShell } from '@codemirror/legacy-modes/mode/powershell';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';
import { StreamLanguage } from '@codemirror/language';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { Typography, Button, message } from 'antd';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Paragraph } = Typography;

interface ScriptItemProps {
  os: string;
  action: string;
  description: string;
  mode: string;
  height: string;
}

export default function ScriptItem(props: ScriptItemProps) {
  const { t } = useTranslation();
  const [val, setVal] = useState('');

  useEffect(() => {
    let key = `script_${props.action}_${props.os}`;
    getConfigByKey({ ckey: key }).then((res) => {
      if (res.success) {
        setVal(res.dat);
      }
    });
  }, [props.action]);

  const editorMode = (mode: string) => {
    if (mode === 'powerShell') {
      return powerShell;
    } else if (mode === 'shell') {
      return shell;
    }
    return yaml;
  };

  const saveScript = () => {
    if (val == '') {
      return false;
    }
    let key = `script_${props.action}_${props.os}`;
    let config = { ckey: key, cval: val };
    setConfigByKey(config).then((res) => {
      if (res.success) {
        message.success(t('common:success.save'), 2);
      }
    });
  };

  return (
    <>
      <Paragraph>{props.description}</Paragraph>
      <CodeMirror
        height={props.height}
        theme='light'
        basicSetup
        value={val}
        onChange={(val) => setVal(val)}
        extensions={[
          EditorView.lineWrapping,
          StreamLanguage.define(editorMode(props.mode)),
          EditorView.theme({
            '&': {
              backgroundColor: '#F6F6F6 !important',
            },
            '&.cm-editor.cm-focused': {
              outline: 'unset',
            },
          }),
        ]}
      />
      <Button type='primary' style={{ marginTop: '10px' }} onClick={saveScript}>
        {t('common:btn.save')}
      </Button>
    </>
  );
}
