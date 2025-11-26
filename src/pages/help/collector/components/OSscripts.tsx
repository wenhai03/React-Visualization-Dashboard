import { Radio, RadioChangeEvent } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ScriptItem from './ScriptItem';

interface OSItemProps {
  os: string;
  description: string;
  mode: string;
  height: string;
}

export default function OSscripts(props: OSItemProps) {
  const { t } = useTranslation('collector');
  const [action, setAction] = useState('install');

  const changeAction = (e: RadioChangeEvent) => {
    console.log('changeAction:', e);
    setAction(e.target.value);
  };

  return (
    <>
      {props.os !== 'kubernetes' && (
        <Radio.Group
          optionType='button'
          buttonStyle='solid'
          style={{ marginBottom: '10px' }}
          value={action}
          onChange={changeAction}
        >
          <Radio value='install'>{t('script.install')}</Radio>
          <Radio value='upgrade'>{t('script.upgrade')}</Radio>
          <Radio value='uninstall'>{t('script.uninstall')}</Radio>
        </Radio.Group>
      )}
      <ScriptItem
        os={props.os}
        action={action}
        description={props.description}
        mode={props.mode}
        height={props.height}
      />
    </>
  );
}
