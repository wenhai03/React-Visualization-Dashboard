import PageLayout from '@/components/pageLayout';
import { createFromIconfontCN } from '@ant-design/icons';
import { Alert, Steps, Table, Tabs, Typography, Form, Input, Space, Radio } from 'antd';
import queryString from 'query-string';
import { CommonStateContext } from '@/App';
import React, { useEffect, useState, useContext } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { getAreaList } from '@/services/config';
import './locale';

const { Text, Title, Paragraph } = Typography;
const { Step } = Steps;

const IconCnd = createFromIconfontCN({
  scriptUrl: '/font/cndicon.js',
});

const Install = (props: any) => {
  const { busiGroups, curBusiId, curBusiGroup } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const history = useHistory();
  const { search } = useLocation();
  const query = queryString.parse(search);
  const [activeKey, setActiveKey] = React.useState((query.tab as string) || 'linux');
  const [selectedArea, setSelectedArea] = useState<{ url: string; area_id: string }>();
  const [cmds, setCmds] = useState<{ linuxCmd?: string; windowsCmd?: string; kubernetesCmd?: string }>();
  // 区域配置
  const [areaConfig, setAreaConfig] = useState([]);
  const { t } = useTranslation('targets');
  const currentBusinessGroup = busiGroups.filter((item) => item.id === Number(curBusiId))[0];

  const k8sVarTableData = [
    {
      name: '$cndgraf_podIp',
      value: t('install.pod_ip'),
    },
    {
      name: '$cndgraf_podName',
      value: t('install.pod_name'),
    },
    {
      name: '$cndgraf_namespace',
      value: t('install.k8s_namespace'),
    },
    {
      name: '$cndgraf_nodeName',
      value: t('install.k8s_node_name'),
    },
  ];
  const k8sVarColumns = [
    {
      title: t('install.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('install.value'),
      dataIndex: 'value',
      key: 'value',
    },
  ];

  const dockerVarTableData = [
    {
      name: '$cndgraf_containerName',
      value: t('install.docker_name'),
    },
    {
      name: '$cndgraf_containerIp',
      value: t('install.docker_ip'),
    },
  ];
  const dockerVarColumns = [
    {
      title: t('install.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('install.value'),
      dataIndex: 'value',
      key: 'value',
    },
  ];

  const changeCmd = (domain: string, area_id: string, cluster_name?: string) => {
    setCmds({
      linuxCmd: `bash -c "$(curl -L ${domain}/install/linux/group/${curBusiId}/area/${area_id})"`,
      windowsCmd: `powershell -nop -c "iex(New-Object Net.WebClient).DownloadString('${domain}/install/windows/group/${curBusiId}/area/${area_id}')"`,
      kubernetesCmd:
        cluster_name && area_id
          ? `kubectl apply -f ${domain}/install/kubernetes/group/${curBusiId}/cluster/${cluster_name}/area/${area_id}`
          : undefined,
    });
  };

  useEffect(() => {
    getAreaList({ ckey: 'ms_area' }).then((res) => {
      if (res.dat) {
        const defaultArea = res.dat.find((item) => item.area_id === 'default');
        form.setFieldsValue({ area_id: defaultArea.area_id });
        setSelectedArea(defaultArea);
        setAreaConfig(res.dat);
        history.replace({
          pathname: location.pathname,
          search: '?area_id=default',
        });
      }
    });
  }, []);

  useEffect(() => {
    if (curBusiId && selectedArea) {
      changeCmd(selectedArea.url, selectedArea.area_id, form.getFieldValue('cluster_name'));
    }
  }, [curBusiId, selectedArea]);

  return (
    <PageLayout title={t('new_deployment')}>
      <div>
        <div style={{ padding: '10px' }}>
          <Text>{t('install.text')}</Text>
          <Text>
            ({t('install.tip')}
            <span style={{ color: 'red' }}>{currentBusinessGroup?.name ?? '-'}</span>)
          </Text>
          <Tabs
            activeKey={activeKey}
            size='large'
            style={{ padding: '10px' }}
            type='card'
            destroyInactiveTabPane
            onChange={(val) => {
              setActiveKey(val);
              history.push({
                pathname: location.pathname,
                search: `?tab=${val}`,
              });
            }}
          >
            <Tabs.TabPane
              tab={
                <span>
                  <IconCnd type='icon-linux' style={{ fontSize: '18px' }} />
                  Linux
                </span>
              }
              key='linux'
            >
              <Title level={5}>{t('install.on_linux')}</Title>
              <Alert message={t('install.linux_message')} type='info' showIcon />
              <Steps direction='vertical' size='small' style={{ paddingTop: '10px' }}>
                <Step
                  title={t('install.area_id_tip')}
                  status='process'
                  description={
                    <Form form={form} disabled={curBusiGroup.perm === 'ro'}>
                      <Space align='baseline'>
                        <Form.Item
                          label={t('install.deployment_area')}
                          name='area_id'
                          rules={[{ required: true }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Radio.Group
                            onChange={(e) => {
                              const selectedValue: any = areaConfig.find(
                                (item: { area_id: number }) => item.area_id === e.target.value,
                              );
                              setSelectedArea(selectedValue);
                            }}
                          >
                            {areaConfig.map((item: any) => (
                              <Radio value={item.area_id} key={item.area_id}>
                                {item.name}
                              </Radio>
                            ))}
                          </Radio.Group>
                        </Form.Item>
                      </Space>
                    </Form>
                  }
                />
                <Step
                  title={
                    <>
                      {t('install.linux_process')}
                      <span style={{ color: 'red' }}>{t('install.use_root')}</span>
                    </>
                  }
                  status='process'
                  description={
                    <>
                      {cmds?.linuxCmd ? (
                        <>
                          <Paragraph copyable code style={{ fontSize: '16px' }}>
                            {cmds.linuxCmd}
                          </Paragraph>
                          <Text>{t('install.linux_deploy_service')}</Text>
                        </>
                      ) : (
                        <Paragraph code type='danger'>
                          {t('install.required_area_id')}
                        </Paragraph>
                      )}
                    </>
                  }
                />
                <Step
                  title={t('install.check_running')}
                  status='process'
                  description={
                    <Paragraph copyable code style={{ fontSize: '16px' }}>
                      service cndgraf status
                    </Paragraph>
                  }
                />
                <Step
                  title={t('install.config_scrap')}
                  status='process'
                  description={
                    <Text>
                      <Trans
                        t={t}
                        i18nKey='install.config_scrap_host'
                        components={[
                          <Link key={0} to={{ pathname: '/targets' }} />,
                          <Link key={1} to={{ pathname: '/metric/input-task' }} />,
                          <Link key={2} to={{ pathname: '/log/collection' }} />,
                        ]}
                      />
                    </Text>
                  }
                />
              </Steps>
            </Tabs.TabPane>
            <Tabs.TabPane
              tab={
                <span>
                  <IconCnd type='icon-windows' style={{ fontSize: '18px' }} />
                  Windows
                </span>
              }
              key='windows'
            >
              <Title level={5}>{t('install.on_windows')}</Title>
              <Alert message={t('install.windows_message')} type='info' showIcon />
              <Steps direction='vertical' size='small' style={{ paddingTop: '10px' }}>
                <Step
                  title={t('install.area_id_tip')}
                  status='process'
                  description={
                    <Form form={form} disabled={curBusiGroup.perm === 'ro'}>
                      <Space align='baseline'>
                        <Form.Item
                          label={t('install.deployment_area')}
                          name='area_id'
                          rules={[{ required: true }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Radio.Group
                            onChange={(e) => {
                              const selectedValue: any = areaConfig.find(
                                (item: { area_id: number }) => item.area_id === e.target.value,
                              );
                              setSelectedArea(selectedValue);
                            }}
                          >
                            {areaConfig.map((item: any) => (
                              <Radio value={item.area_id} key={item.area_id}>
                                {item.name}
                              </Radio>
                            ))}
                          </Radio.Group>
                        </Form.Item>
                      </Space>
                    </Form>
                  }
                />
                <Step
                  title={
                    <>
                      <Trans
                        t={t}
                        i18nKey='install.windows_process'
                        components={{
                          red: <span style={{ color: 'red' }} />,
                          blue: <span style={{ color: 'blue' }} />,
                        }}
                      />
                    </>
                  }
                  status='process'
                  description={
                    <>
                      {cmds?.windowsCmd ? (
                        <>
                          <Paragraph copyable code style={{ fontSize: '16px' }}>
                            {cmds.windowsCmd}
                          </Paragraph>
                          <Paragraph>{t('install.linux_deploy_service')}</Paragraph>
                          <Paragraph mark>提示：若安装过程出现错误，请 <Link to="/docs/reference/intra/add#windows_faq" target="_blank">查阅文档</Link> 解决。</Paragraph>
                        </>
                      ) : (
                        <Paragraph code type='danger'>
                          {t('install.required_area_id')}
                        </Paragraph>
                      )}
                    </>
                  }
                />
                <Step
                  title={t('install.windows_check_running')}
                  status='process'
                  description={
                    <Paragraph copyable code style={{ fontSize: '16px' }}>
                      sc query cndgraf
                    </Paragraph>
                  }
                />
                <Step
                  title={t('install.config_scrap')}
                  status='process'
                  description={
                    <Text>
                      <Trans
                        t={t}
                        i18nKey='install.config_scrap_host'
                        components={[
                          <Link key={0} to={{ pathname: '/targets' }} />,
                          <Link key={1} to={{ pathname: '/metric/input-task' }} />,
                          <Link key={2} to={{ pathname: '/log/collection' }} />,
                        ]}
                      />
                    </Text>
                  }
                />
              </Steps>
            </Tabs.TabPane>
            <Tabs.TabPane
              tab={
                <span>
                  <IconCnd type='icon-ks' style={{ fontSize: '18px' }} />
                  Kubernetes
                </span>
              }
              key='k8s'
            >
              <Title level={5}>{t('install.on_kubernetes')}</Title>
              <Steps direction='vertical' size='small' style={{ paddingTop: '10px' }}>
                <Step
                  title={t('install.cluster_name_and_area_id_tip')}
                  status='process'
                  description={
                    <Form form={form} disabled={curBusiGroup.perm === 'ro'}>
                      <Space align='baseline'>
                        <Form.Item
                          label={t('install.cluster_name')}
                          name='cluster_name'
                          rules={[{ required: true }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input
                            style={{ width: '300px' }}
                            onChange={(e) =>
                              changeCmd(selectedArea!.url, form.getFieldValue('area_id'), e.target.value)
                            }
                          />
                        </Form.Item>
                        <Form.Item
                          label={t('install.deployment_area')}
                          name='area_id'
                          rules={[{ required: true }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Radio.Group
                            onChange={(e) => {
                              const selectedValue: any = areaConfig.find(
                                (item: { area_id: number }) => item.area_id === e.target.value,
                              );
                              setSelectedArea(selectedValue);
                            }}
                          >
                            {areaConfig.map((item: any) => (
                              <Radio value={item.area_id} key={item.area_id}>
                                {item.name}
                              </Radio>
                            ))}
                          </Radio.Group>
                        </Form.Item>
                      </Space>
                    </Form>
                  }
                />
                <Step
                  title={
                    <Trans
                      t={t}
                      i18nKey='install.kubernetes_process1'
                      components={[<Text style={{ color: 'red' }} />]}
                    />
                  }
                  status='process'
                  description={
                    <>
                      {cmds?.kubernetesCmd ? (
                        <Paragraph copyable code style={{ fontSize: '16px' }}>
                          {cmds.kubernetesCmd}
                        </Paragraph>
                      ) : (
                        <Paragraph code type='danger'>
                          {t('install.required_cluster_name_and_area_id')}
                        </Paragraph>
                      )}
                    </>
                  }
                />
                <Step
                  title={t('install.check_running')}
                  status='process'
                  description={
                    <Paragraph copyable code style={{ fontSize: '16px' }}>
                      kubectl get pod -n cndgraf
                    </Paragraph>
                  }
                />
                <Step
                  title={t('install.config_scrap')}
                  status='process'
                  description={
                    <>
                      <Paragraph>
                        <Trans
                          t={t}
                          i18nKey='install.config_scrap_k8s'
                          components={[<Link key={0} to={{ pathname: '/targets' }} />]}
                        />
                      </Paragraph>
                      <Text>{t('install.config_k8s_auto')}</Text>
                      <Paragraph>
                        <pre>
                          {`apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  selector:
    matchLabels:
      app: redis
  replicas: 1
  template:
    metadata:
      annotations:
        cndgraf/tags.service_name: demo-redis
        cndgraf/tags.service_environment: dev
        cndgraf/input.redis: |
          [[instances]]
          address = "$cndgraf_podIp:6379"
          # username = ""
          # password = ""
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:6.2
        ports:
        - containerPort: 6379
... `}
                        </pre>
                      </Paragraph>
                      <pre style={{ border: 'none', background: 'transparent', marginBottom: 0 }}>
                        {t('install.config_k8s_label')}
                      </pre>
                      <Table columns={k8sVarColumns} dataSource={k8sVarTableData} pagination={false} size='small' />
                    </>
                  }
                />
              </Steps>
            </Tabs.TabPane>
            <Tabs.TabPane
              tab={
                <span>
                  <IconCnd type='icon-Docker' style={{ fontSize: '18px' }} />
                  Docker
                </span>
              }
              key='docker'
            >
              <Title level={5}>{t('install.on_docker')}</Title>
              <Alert message={t('install.docker_message')} type='info' showIcon />
              <Steps direction='vertical' size='small' style={{ paddingTop: '10px' }}>
                <Step
                  title={t('install.area_id_tip')}
                  status='process'
                  description={
                    <Form form={form} disabled={curBusiGroup.perm === 'ro'}>
                      <Space align='baseline'>
                        <Form.Item
                          label={t('install.deployment_area')}
                          name='area_id'
                          rules={[{ required: true }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Radio.Group
                            onChange={(e) => {
                              const selectedValue: any = areaConfig.find(
                                (item: { area_id: number }) => item.area_id === e.target.value,
                              );
                              setSelectedArea(selectedValue);
                            }}
                          >
                            {areaConfig.map((item: any) => (
                              <Radio value={item.area_id} key={item.area_id}>
                                {item.name}
                              </Radio>
                            ))}
                          </Radio.Group>
                        </Form.Item>
                      </Space>
                    </Form>
                  }
                />
                <Step
                  title={
                    <>
                      {t('install.linux_process')}
                      <span style={{ color: 'red' }}>{t('install.use_root')}</span>
                    </>
                  }
                  status='process'
                  description={
                    <>
                      {cmds?.linuxCmd ? (
                        <>
                          <Paragraph copyable code style={{ fontSize: '16px' }}>
                            {cmds.linuxCmd}
                          </Paragraph>
                          <Text>{t('install.linux_deploy_service')}</Text>
                        </>
                      ) : (
                        <Paragraph code type='danger'>
                          {t('install.required_area_id')}
                        </Paragraph>
                      )}
                    </>
                  }
                />
                <Step
                  title={t('install.check_running')}
                  status='process'
                  description={
                    <Paragraph copyable code style={{ fontSize: '16px' }}>
                      service cndgraf status
                    </Paragraph>
                  }
                />
                <Step
                  title={t('install.config_scrap')}
                  status='process'
                  description={
                    <>
                      <Paragraph>
                        <Trans
                          t={t}
                          i18nKey='install.config_scrap_docker'
                          components={[<Link key={0} to={{ pathname: '/targets' }} />]}
                        />
                      </Paragraph>
                      <Text>{t('install.config_docker_auto')}</Text>
                      <Paragraph>
                        {/* prettier-ignore */}
                        <pre>
                          {
                            `version: "3"
services:
  nginx:
      image: nginx
      labels:
        cndgraf/tags.service_name: demo-nginx
        cndgraf/tags.service_environment: dev
        cndgraf/input.nginx: |
          [[instances]]
          ## An array of Nginx stub_status URI to gather stats.
          urls = [
              "http://$cndgraf_containerIp:8000/nginx_status"
          ]
          labels = { instance="$HOSTNAME" }
          
          ## interval = global.interval * interval_times
          # interval_times = 1
          
          ## Set response_timeout (default 5 seconds)
          response_timeout = "5s"

          ## Whether to follow redirects from the server (defaults to false)
          # follow_redirects = false

          ## Optional HTTP Basic Auth Credentials
          #username = "admin"
          #password = "admin"
      ports:
          - 80:80
      volumes:
          - ./src:/usr/share/nginx/html
... `
                          }
                        </pre>
                      </Paragraph>
                      <Text>
                        <Trans t={t} i18nKey='install.config_docker_label' components={[<Text mark />]} />
                      </Text>
                      <Table
                        columns={dockerVarColumns}
                        dataSource={dockerVarTableData}
                        pagination={false}
                        size='small'
                      />
                    </>
                  }
                />
              </Steps>
            </Tabs.TabPane>
          </Tabs>
        </div>
      </div>
    </PageLayout>
  );
};

export default Install;
