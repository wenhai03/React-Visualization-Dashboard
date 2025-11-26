import React from 'react';
import { getAgentIconKey } from '../utils';
import { AGENT_NAME, SPAN_SUBTYPE, SPAN_TYPE } from '../utils/apm';
import DefaultIcon from '../../../../public/image/default.svg';
import CppIcon from '../../../../public/image/cpp.svg';
import DotNetIcon from '../../../../public/image/dotnet.svg';
import ErlangIcon from '../../../../public/image/erlang.svg';
import GoIcon from '../../../../public/image/go.svg';
import IosIcon from '../../../../public/image/ios.svg';
import JavaIcon from '../../../../public/image/java.svg';
import NodeJsIcon from '../../../../public/image/nodejs.svg';
import OcamlIcon from '../../../../public/image/ocaml.svg';
import OpenTelemetryIcon from '../../../../public/image/opentelemetry.svg';
import PhpIcon from '../../../../public/image/php.svg';
import PythonIcon from '../../../../public/image/python.svg';
import RubyIcon from '../../../../public/image/ruby.svg';
import RumJsIcon from '../../../../public/image/rum.svg';
import RustIcon from '../../../../public/image/rust.svg';
import AndroidIcon from '../../../../public/image/android.svg';
import LogoDocker from '../../../../public/image/logo_docker.svg';
import LogoKubernetes from '../../../../public/image/logo_kubernetes.svg';
import LogoGcp from '../../../../public/image/logo_gcp.svg';
import LogoAzure from '../../../../public/image/logo_azure.svg';
import AlogoAws from '../../../../public/image/logo_aws.svg';
import LambdaIcon from '../../../../public/image/lambda.svg';

const baseUrl = '/image/';

const cloudIcons: Record<string, React.ReactElement> = {
  gcp: <LogoGcp />,
  aws: <AlogoAws />,
  azure: <LogoAzure />,
};

const agentIcons: { [key: string]: React.ReactElement } = {
  cpp: <CppIcon />,
  dotnet: <DotNetIcon />,
  erlang: <ErlangIcon />,
  go: <GoIcon />,
  ios: <IosIcon />,
  java: <JavaIcon />,
  nodejs: <NodeJsIcon />,
  ocaml: <OcamlIcon />,
  lambda: <LambdaIcon />,
  opentelemetry: <OpenTelemetryIcon />,
  php: <PhpIcon />,
  python: <PythonIcon />,
  ruby: <RubyIcon />,
  rum: <RumJsIcon />,
  rust: <RustIcon />,
  android: <AndroidIcon />,
};

export function getAgentIcon(agentName: string | undefined) {
  const key = agentName && getAgentIconKey(agentName);
  if (!key) {
    return <DefaultIcon />;
  }
  return agentIcons[key] ?? <DefaultIcon />;
}

export function getCloudIcon(provider?: string) {
  if (provider) {
    return cloudIcons[provider];
  }
}

export function getContainerIcon(container) {
  if (!container) {
    return;
  }
  switch (container) {
    case 'Kubernetes':
      return <LogoKubernetes />;
    default:
      return <LogoDocker />;
  }
}

export const spanTypeIcons: {
  [type: string]: { [subtype: string]: string };
} = {
  aws: {
    servicename: `${baseUrl}aws.svg`,
  },
  cache: { redis: `${baseUrl}redis.svg` },
  db: {
    cassandra: `${baseUrl}cassandra.svg`,
    cosmosdb: `${baseUrl}azure.svg`,
    dynamodb: `${baseUrl}aws.svg`,
    elasticsearch: `${baseUrl}elasticsearch.svg`,
    mongodb: `${baseUrl}mongodb.svg`,
    mysql: `${baseUrl}mysql.svg`,
    postgresql: `${baseUrl}postgresql.svg`,
    redis: `${baseUrl}redis.svg`,
  },
  external: {
    graphql: `${baseUrl}graphql.svg`,
    grpc: `${baseUrl}grpc.svg`,
    websocket: `${baseUrl}websocket.svg`,
  },
  messaging: {
    azurequeue: `${baseUrl}azure.svg`,
    azureservicebus: `${baseUrl}azure.svg`,
    jms: `${baseUrl}java.svg`,
    kafka: `${baseUrl}kafka.svg`,
    sns: `${baseUrl}aws.svg`,
    sqs: `${baseUrl}aws.svg`,
  },
  storage: {
    azureblob: `${baseUrl}azure.svg`,
    azurefile: `${baseUrl}azure.svg`,
    azuretable: `${baseUrl}azure.svg`,
    s3: `${baseUrl}aws.svg`,
  },
  template: {
    handlebars: `${baseUrl}handlebars.svg`,
  },
};

const defaultSpanTypeIcons: { [key: string]: string } = {
  cache: `${baseUrl}database.svg`,
  db: `${baseUrl}database.svg`,
  ext: `${baseUrl}globe.svg`,
  external: `${baseUrl}globe.svg`,
  messaging: `${baseUrl}documents.svg`,
  resource: `${baseUrl}globe.svg`,
};

const defaultUrl = `${baseUrl}default.svg`;

export function getAgentIconUrl(agentName: string | undefined) {
  const key = agentName && getAgentIconKey(agentName);
  if (!key) {
    return defaultUrl;
  }
  return `${baseUrl}${key}.svg` ?? defaultUrl;
}

export function getSpanIconUrl(type?: string, subtype?: string) {
  if (!type) {
    return defaultUrl;
  }

  const types = spanTypeIcons[type];

  if (subtype && types && subtype in types) {
    return types[subtype];
  }
  return defaultSpanTypeIcons[type] || defaultUrl;
}

export function iconForNode(node: any) {
  const agentName = node[AGENT_NAME];
  const subtype = node[SPAN_SUBTYPE];
  const type = node[SPAN_TYPE];

  return agentName ? getAgentIconUrl(agentName) : getSpanIconUrl(type, subtype);
}
