import React from 'react';
import { useTranslation } from 'react-i18next';
import DefaultIcon from '../../../../public/field_icons/questionInCircle.svg';
import TokenDate from '../../../../public/field_icons/tokenDate.svg';
import TokenNumber from '../../../../public/field_icons/tokenNumber.svg';
import TokenKeyword from '../../../../public/field_icons/tokenKeyword.svg';
import TokenIP from '../../../../public/field_icons/tokenIP.svg';
import TokenString from '../../../../public/field_icons/tokenString.svg';
import TokenBoolean from '../../../../public/field_icons/tokenBoolean.svg';
import TokenGeo from '../../../../public/field_icons/tokenGeo.svg';
import TokenTag from '../../../../public/field_icons/tokenTag.svg';
import TokenNested from '../../../../public/field_icons/tokenNested.svg';
import TokenHistogram from '../../../../public/field_icons/tokenHistogram.svg';
import TokenSearchType from '../../../../public/field_icons/tokenSearchType.svg';
import EditorCodeBlock from '../../../../public/field_icons/editorCodeBlock.svg';
import Alert from '../../../../public/field_icons/alert.svg';

// field icon
export const typeToFieldIconMap: Record<string, React.ReactElement> = {
  boolean: <TokenBoolean />,
  conflict: <Alert />,
  date: <TokenDate />,
  date_range: <TokenDate />,
  geo_point: <TokenGeo />,
  geo_shape: <TokenGeo />,
  ip: <TokenIP />,
  ip_range: <TokenIP />,
  match_only_text: <TokenString />,
  murmur3: <TokenSearchType />,
  integer: <TokenNumber />,
  long: <TokenNumber />,
  scaled_float: <TokenNumber />,
  number: <TokenNumber />,
  number_range: <TokenNumber />,
  histogram: <TokenHistogram />,
  _source: <EditorCodeBlock />,
  string: <TokenString />,
  text: <TokenString />,
  keyword: <TokenKeyword />,
  nested: <TokenNested />,
  version: <TokenTag />,
  defaultIcon: <DefaultIcon />, //  a unknown datatype
};

export default function FieldIcon({ type }: { type: string }) {
  const { t } = useTranslation('logs');
  return (
    <div title={typeToFieldIconMap[type] ? t(`field.${type}`) : type} style={{ display: 'flex' }}>
      {typeToFieldIconMap[type] ?? typeToFieldIconMap['defaultIcon']}
    </div>
  );
}
