import React from 'react';
import purify from 'dompurify';
import { html } from '@codemirror/lang-html';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import FieldWithEditor, { generateRules } from './components/FieldWithEditor';

interface IProps {
  value?: string;
  onChange?: (value?: string) => void;
  record?: any;
  type?: 'default' | 'custom';
  editable?: boolean;
}

const LIMIT_SIZE = 1000;

export const emailRules = generateRules(LIMIT_SIZE);

export default function Email(props: IProps) {
  const { t } = useTranslation('notificationTpls');
  const { value, onChange, record, type, editable = true } = props;

  return (
    <FieldWithEditor
      value={value}
      onChange={onChange}
      record={record}
      extensions={[html()]}
      renderPreview={(newValue) => {
        return (
          <iframe srcDoc={purify.sanitize(newValue, { FORCE_BODY: true })} style={{ border: 'none', width: '100%' }} />
        );
      }}
      limitSize={LIMIT_SIZE}
      titleExtra={`HTML${type ? (type === 'default' ? t('default_content') : t('custom_content')) : ''}`}
      editable={editable}
    />
  );
}
