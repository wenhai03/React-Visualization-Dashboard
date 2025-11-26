import React, { useState, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Form, Input, Select, Card, Row, Col, Tag, Tooltip, Space } from 'antd';
import { createAgentSettings } from '@/services/agent';
import { panelBaseProps } from '../constants';
import moment from 'moment';
import { QuestionCircleOutlined } from '@ant-design/icons';

// 校验单个标签格式是否正确
function isTagValid(tag) {
  const contentRegExp = /^[a-zA-Z_][\w]*={1}[^=]+$/;
  return {
    isCorrectFormat: contentRegExp.test(tag.toString()),
    isLengthAllowed: tag.toString().length <= 64,
  };
}

export default function Base(props) {
  const { t } = useTranslation('alertRules');
  const [metricList, setMetricList] = useState<{ category: string; content: string }[] | []>([]);
  const { type, initialValues, isBuiltin } = props;
  const mask = initialValues?.builtin_id > 0 && type !== 2;

  useEffect(() => {
    if (isBuiltin) {
      createAgentSettings({ category: 'metrics:*,global', showDefaultContent: true }).then((res) => {
        setMetricList(res.dat);
      });
    }
  }, [isBuiltin]);
  // 渲染标签
  function tagRender(content) {
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
  }

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
    <Card {...panelBaseProps} title={t('basic_configs')} className={mask ? 'disabled-mask' : undefined}>
      <Row gutter={10}>
        <Col span={12}>
          <Form.Item
            label={t('name')}
            name='name'
            rules={[{ required: true }]}
            tooltip={<Trans i18nKey='alertRules:variable_tip' components={{ 1: <br />, 2: '{{', 3: '}}' }}></Trans>}
          >
            <Input />
          </Form.Item>
        </Col>
        {isBuiltin ? (
          <Col span={12}>
            <Form.Item name='relation_input' label={t('relation_input')}>
              <Select style={{ width: '100%' }} showSearch optionFilterProp='children' allowClear>
                {metricList.map((item: { category: string }) => (
                  <Select.Option key={item.category} value={item.category}>
                    {item.category.replace('metrics:', '')}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        ) : mask ? (
          <Col span={6}>
            <Form.Item label={t('relation_input')} name='relation_input'>
              {initialValues.relation_input?.[0]?.replace('metrics:', '') || ''}
            </Form.Item>
          </Col>
        ) : null}
        {mask && (
          <Col span={6}>
            <Form.Item label={t('builtin_update_at')}>
              {moment.unix(initialValues.builtin_update_at).format('YYYY-MM-DD HH:mm:ss')}
            </Form.Item>
          </Col>
        )}
        <Col span={24}>
          <Form.Item label={t('append_tags')} name='append_tags' rules={[isValidFormat]}>
            <Select
              mode='tags'
              tokenSeparators={[' ']}
              open={false}
              placeholder={t('append_tags_placeholder')}
              tagRender={tagRender}
            />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item
            label={
              <Space size={4}>
                {t('note')}
                <Tooltip
                  title={
                    <Trans
                      i18nKey='alertRules:note_tip'
                      components={{
                        1: <br />,
                        2: '{{',
                        3: '}}',
                        4: <a href='/docs/reference/alert/alert_template#变量说明' target='_blank'></a>,
                      }}
                    ></Trans>
                  }
                  overlayInnerStyle={{
                    width: 300,
                  }}
                >
                  <QuestionCircleOutlined style={{ color: '#00000073', cursor: 'help' }} />
                </Tooltip>
              </Space>
            }
            name='note'
          >
            <Input.TextArea />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item
            label={
              <Space size={4}>
                {t('recovered_note')}
                <Tooltip
                  title={
                    <Trans
                      i18nKey='alertRules:note_tip'
                      components={{
                        1: <br />,
                        2: '{{',
                        3: '}}',
                        4: <a href='/docs/reference/alert/alert_template#变量说明' target='_blank'></a>,
                      }}
                    ></Trans>
                  }
                  overlayInnerStyle={{
                    width: 300,
                  }}
                >
                  <QuestionCircleOutlined style={{ color: '#00000073', cursor: 'help' }} />
                </Tooltip>
              </Space>
            }
            name='recovered_note'
          >
            <Input.TextArea />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}
