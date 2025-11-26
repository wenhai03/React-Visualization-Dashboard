import React from 'react';
import { Select, Form, Tag, Tooltip, Row, Col } from 'antd';
import { useTranslation } from 'react-i18next';

export default function AdditionalLabel({ field, labelWidth = '70px' }: { field: any; labelWidth?: string }) {
  const { t } = useTranslation('alertRules');

  // 校验单个标签格式是否正确
  function isTagValid(tag) {
    const contentRegExp = /^[a-zA-Z_][\w]*={1}[^=]+$/;
    return {
      isCorrectFormat: contentRegExp.test(tag.toString()),
      isLengthAllowed: tag.toString().length <= 64,
    };
  }

  // 渲染标签
  const tagRender = (content) => {
    const { isCorrectFormat, isLengthAllowed } = isTagValid(content.value ?? '');
    return isCorrectFormat && isLengthAllowed ? (
      <Tag closable={content.closable} onClose={content.onClose}>
        {content.value}
      </Tag>
    ) : (
      <Tooltip title={isCorrectFormat ? t('append_tags_msg1') : t('append_tags_msg2')}>
        <Tag color='error' closable={content.closable} onClose={content.onClose} style={{ marginTop: '2px' }}>
          {content.value}
        </Tag>
      </Tooltip>
    );
  };

  // 校验所有标签格式
  function isValidFormat() {
    return {
      validator(_, value) {
        const isInvalid =
          value &&
          value.some((tag) => {
            const { isCorrectFormat, isLengthAllowed } = isTagValid(tag);
            if (!isCorrectFormat || !isLengthAllowed) {
              return true;
            }
          });
        return isInvalid ? Promise.reject(new Error(t('append_tags_msg'))) : Promise.resolve();
      },
    };
  }

  return (
    <Row align='middle'>
      <Col flex={labelWidth} style={{ marginBottom: '18px' }}>
        {t('append_tags')} ：
      </Col>
      <Col flex='auto'>
        <Form.Item {...field} name={[field.name, 'severity_tags']} rules={[isValidFormat]}>
          <Select
            mode='tags'
            tokenSeparators={[' ']}
            open={false}
            placeholder={t('append_tags_placeholder')}
            tagRender={tagRender}
          />
        </Form.Item>
      </Col>
    </Row>
  );
}
