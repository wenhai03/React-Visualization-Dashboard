import React, { useEffect, useState } from 'react';
import { Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { setConfigByKey, getPlatformNotification } from '@/services/config';

const MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'], // toggled buttons
    ['link', 'image'],

    [{ header: 1 }, { header: 2 }], // custom button values
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ script: 'sub' }, { script: 'super' }], // superscript/subscript
    [{ indent: '-1' }, { indent: '+1' }], // outdent/indent
    [{ direction: 'rtl' }], // text direction

    // [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
    [{ header: [1, 2, 3, 4, 5, 6, false] }],

    [{ color: [] }, { background: [] }], // dropdown with defaults from theme
    [{ font: [] }],
    [{ align: [] }],

    ['clean'], // remove formatting button
  ],
};

export default function PlatformNotification() {
  const { t } = useTranslation('notificationSettings');
  const [editorState, setEditorState] = useState<any>('');
  const handleEditorState = (editorState) => {
    setEditorState(editorState);
  };

  useEffect(() => {
    getPlatformNotification().then((res) => {
      setEditorState(res.dat.platform_notify ?? '');
    });
  }, []);

  return (
    <div>
      <ReactQuill theme='snow' modules={MODULES} value={editorState} onChange={handleEditorState} />
      <Button
        type='primary'
        style={{ marginTop: '10px' }}
        onClick={() => {
          if (editorState.length > 10000) {
            message.warning(t('platform_notification.value_beyond_tip'));
          } else {
            let value = editorState;
            if (editorState.replace(/<(.|\n)*?>/g, '').trim().length === 0) {
              value = '';
            }
            setConfigByKey({ ckey: 'platform_notify', cval: value }).then(() => {
              message.success(t('common:success.save'));
            });
          }
        }}
      >
        {t('common:btn.save')}
      </Button>
    </div>
  );
}
