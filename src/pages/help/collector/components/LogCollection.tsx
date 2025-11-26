import React, { useEffect } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Form, Input, Button, message, Card, Tooltip, Collapse } from 'antd';
import ReactQuill from 'react-quill';
import { QuestionCircleOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { groovy } from '@codemirror/legacy-modes/mode/groovy';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { StreamLanguage } from '@codemirror/language';
import { logTaskDefaultConfig, UpdatelogTaskDefaultConfig } from '@/services/logstash';
import 'react-quill/dist/quill.snow.css';
import '../locale';

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

const LogDefaultConfig: React.FC<{ handleIsEdit: (val: boolean) => void }> = ({ handleIsEdit }) => {
  const { t } = useTranslation('collector');
  const [form] = Form.useForm();

  useEffect(() => {
    logTaskDefaultConfig().then((res) => {
      form.setFieldsValue(res);
    });
  }, []);

  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        UpdatelogTaskDefaultConfig(values).then((res) => {
          message.success(t('common:success.edit'));
          handleIsEdit(false);
        });
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  return (
    <Form form={form} onFinish={handleSubmit} className='log-default-config'>
      <Card title={t('script.setting.logs')} size='small'>
        <Form.Item
          name='logs_content'
          label={t('script.setting.content')}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <CodeMirror
            height='400px'
            theme='light'
            basicSetup
            editable
            onChange={() => handleIsEdit(true)}
            extensions={[
              EditorView.lineWrapping,
              StreamLanguage.define(toml),
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
        </Form.Item>
      </Card>
      <Card title='pipelines.yml' size='small'>
        <Form.Item label={t('script.setting.content')} name={['configs', 'logstash_pipelines_config']}>
          <CodeMirror
            height='200px'
            theme='light'
            basicSetup
            editable
            onChange={() => handleIsEdit(true)}
            extensions={[
              EditorView.lineWrapping,
              StreamLanguage.define(yaml),
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
        </Form.Item>
      </Card>
      <Card
        title={
          <Tooltip
            title={
              <pre>{`${t('script.setting.logstash_pipeline_tip1')}
    {{.topic}}${t('script.setting.logstash_pipeline_tip2')}
    {{.consumer_threads}}${t('script.setting.logstash_pipeline_tip3')}
    {{.datasource_url}}${t('script.setting.logstash_pipeline_tip4')}
    {{.datasource_user}}${t('script.setting.logstash_pipeline_tip5')}
    {{.datasource_password}}${t('script.setting.logstash_pipeline_tip6')}
            `}</pre>
            }
            overlayInnerStyle={{ width: '360px' }}
          >
            {t('script.setting.logstash_pipeline')} <QuestionCircleOutlined />
          </Tooltip>
        }
        size='small'
      >
        <Form.List name='logstash_templates'>
          {(fields, { add, remove }) => (
            <>
              <Button
                type='default'
                icon={<PlusOutlined />}
                onClick={() => {
                  add(), handleIsEdit(true);
                }}
                style={{ marginBottom: '18px' }}
              >
                {t('script.setting.create_template')}
              </Button>
              <Collapse>
                {fields.map(({ key, name, ...restField }) => (
                  <Collapse.Panel
                    header={`模板 ${key + 1}`}
                    extra={
                      <MinusCircleOutlined
                        onClick={() => {
                          remove(name), handleIsEdit(true);
                        }}
                      />
                    }
                    key={key}
                  >
                    <Form.Item
                      label={t('script.setting.code')}
                      name={[name, 'code']}
                      rules={[
                        {
                          required: true,
                        },
                      ]}
                    >
                      <Input onChange={() => handleIsEdit(true)} />
                    </Form.Item>
                    <Form.Item
                      label={t('script.setting.template_name')}
                      name={[name, 'name']}
                      rules={[
                        {
                          required: true,
                        },
                      ]}
                    >
                      <Input onChange={() => handleIsEdit(true)} />
                    </Form.Item>
                    <Form.Item
                      label={t('script.setting.content')}
                      name={[name, 'config']}
                      rules={[
                        {
                          required: true,
                        },
                      ]}
                    >
                      <CodeMirror
                        height='400px'
                        theme='light'
                        basicSetup
                        editable
                        onChange={() => handleIsEdit(true)}
                        extensions={[
                          EditorView.lineWrapping,
                          StreamLanguage.define(groovy),
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
                    </Form.Item>
                    <Form.Item label={t('script.setting.template_note')} name={[name, 'note']}>
                      <ReactQuill theme='snow' modules={MODULES} onChange={() => handleIsEdit(true)} />
                    </Form.Item>
                  </Collapse.Panel>
                ))}
              </Collapse>
            </>
          )}
        </Form.List>
      </Card>
      <Card
        title={
          <Tooltip
            title={
              <pre>{`${t('script.setting.vector_pipeline_tip1')}
    {{.topic}}${t('script.setting.logstash_pipeline_tip2')}
    {{.consumer_threads}}${t('script.setting.logstash_pipeline_tip3')}
    {{.datasource_url}}${t('script.setting.logstash_pipeline_tip4')}
    {{.datasource_user}}${t('script.setting.logstash_pipeline_tip5')}
    {{.datasource_password}}${t('script.setting.logstash_pipeline_tip6')}
            `}</pre>
            }
            overlayInnerStyle={{ width: '360px' }}
          >
            {t('script.setting.vector_pipeline')} <QuestionCircleOutlined />
          </Tooltip>
        }
        size='small'
      >
        <Form.List name='vector_templates'>
          {(fields, { add, remove }) => (
            <>
              <Button
                type='default'
                icon={<PlusOutlined />}
                onClick={() => {
                  add(), handleIsEdit(true);
                }}
                style={{ marginBottom: '18px' }}
              >
                {t('script.setting.create_template')}
              </Button>
              <Collapse>
                {fields.map(({ key, name, ...restField }) => (
                  <Collapse.Panel
                    header={`模板 ${key + 1}`}
                    extra={
                      <MinusCircleOutlined
                        onClick={() => {
                          remove(name), handleIsEdit(true);
                        }}
                      />
                    }
                    key={key}
                  >
                    <Form.Item
                      label={t('script.setting.code')}
                      name={[name, 'code']}
                      rules={[
                        {
                          required: true,
                        },
                      ]}
                    >
                      <Input onChange={() => handleIsEdit(true)} />
                    </Form.Item>
                    <Form.Item
                      label={t('script.setting.template_name')}
                      name={[name, 'name']}
                      rules={[
                        {
                          required: true,
                        },
                      ]}
                    >
                      <Input onChange={() => handleIsEdit(true)} />
                    </Form.Item>
                    <Form.Item
                      label={t('script.setting.content')}
                      name={[name, 'config']}
                      rules={[
                        {
                          required: true,
                        },
                      ]}
                    >
                      <CodeMirror
                        height='400px'
                        theme='light'
                        basicSetup
                        editable
                        onChange={() => handleIsEdit(true)}
                        extensions={[
                          EditorView.lineWrapping,
                          StreamLanguage.define(toml),
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
                    </Form.Item>
                    <Form.Item label={t('script.setting.template_note')} name={[name, 'note']}>
                      <ReactQuill theme='snow' modules={MODULES} onChange={() => handleIsEdit(true)} />
                    </Form.Item>
                  </Collapse.Panel>
                ))}
              </Collapse>
            </>
          )}
        </Form.List>
      </Card>
      <Form.Item>
        <Button type='primary' htmlType='submit'>
          {t('common:btn.save')}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default LogDefaultConfig;
