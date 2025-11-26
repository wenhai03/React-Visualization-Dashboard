import React from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import FieldWithEditor, { generateRules } from './components/FieldWithEditor';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import { StreamLanguage } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import '../locale';

interface IProps {
  value?: string;
  onChange?: (value?: string) => void;
  record?: any;
  type?: 'default' | 'custom';
  editable?: boolean;
}

const LIMIT_SIZE = 1000;

export const dingtalkRules = generateRules(LIMIT_SIZE);

export default function Text(props: IProps) {
  const { t } = useTranslation('notificationTpls');
  const { value, onChange, record, type, editable } = props;

  return (
    <FieldWithEditor
      value={value}
      onChange={onChange}
      record={record}
      extensions={[
        EditorView.lineWrapping,
        StreamLanguage.define(toml),
        EditorView.theme({
          '&.cm-editor.cm-focused': {
            outline: 'unset',
          },
        }),
      ]}
      renderPreview={(newValue) => {
        return <pre>{newValue}</pre>;
      }}
      limitSize={LIMIT_SIZE}
      titleExtra={`Toml${type ? (type === 'default' ? t('default_content') : t('custom_content')) : ''}`}
      editable={editable}
    />
  );
}
