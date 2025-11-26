import React, { useEffect, useState } from 'react';
import { Popover, Button, Space } from 'antd';
import { getAPMMetadataDetails, getAPMMetadataIcons } from '@/services/traces';
import { asInteger } from './OverallLatencyDistribution/util';
import { conversionTime, handleMetaDetail, handleMetaIcons } from '../utils';
import { getAgentIcon, getContainerIcon, getCloudIcon } from '../utils/getIcon';

type Icons = 'service' | 'container' | 'serverless' | 'cloud' | 'alerts';

export interface PopoverItem {
  key: Icons;
  icon?: React.ReactElement;
  isVisible: boolean;
  title: string;
  component: any;
}

interface IServiceIcons {
  start: string;
  end: string;
  bgid: string;
  data_id: string;
  serviceName: string;
}

const ServiceIcons: React.FC<IServiceIcons> = (props) => {
  const { start, end, bgid, data_id, serviceName } = props;
  const [metaDetail, setMetaDetial] = useState<PopoverItem[]>([]);
  useEffect(() => {
    const timeRange = conversionTime(start, end);
    const requestParams = {
      busi_group_id: bgid,
      datasource_id: data_id,
      ...timeRange,
      service_name: serviceName,
    };
    Promise.all([getAPMMetadataIcons(requestParams), getAPMMetadataDetails(requestParams)]).then(([icons, detail]) => {
      const iconValue = handleMetaIcons(icons.dat);
      const metaValue = handleMetaDetail(detail.dat);
      const { cloud, container, serverless, service } = metaValue;
      const cloudDetails: any = [];
      if (cloud?.provider) {
        cloudDetails.push({
          title: 'Cloud provider',
          description: <>{cloud.provider}</>,
        });
      }
      if (cloud?.serviceName) {
        cloudDetails.push({
          title: 'Cloud service',
          description: <>{cloud.serviceName}</>,
        });
      }

      // TODO serverless 和 cloud 没有相关数据进行验证，暂时注释，后续有数据后再解开
      // if (!!cloud?.availabilityZones?.length) {
      //   cloudDetails.push({
      //     title: i18n.translate('xpack.apm.serviceIcons.serviceDetails.cloud.availabilityZoneLabel', {
      //         defaultMessage:
      //           '{zones, plural, =0 {Availability zone} one {Availability zone} other {Availability zones}} ',
      //         values: { zones: cloud.availabilityZones.length },
      //       }),
      //     description: (
      //       <ul>
      //         {cloud.availabilityZones.map((zone, index) => (
      //           <li key={index}>{zone}</li>
      //         ))}
      //       </ul>
      //     ),
      //   });
      // }

      // if (!!cloud?.regions?.length) {
      //   cloudDetails.push({
      //     title: i18n.translate('xpack.apm.serviceIcons.serviceDetails.cloud.regionLabel', {
      //       defaultMessage: '{regions, plural, =0 {Region} one {Region} other {Regions}} ',
      //       values: { regions: cloud.regions.length },
      //     }),
      //     description: (
      //       <ul>
      //         {cloud.regions.map((region, index) => (
      //           <li key={index}>{region}</li>
      //         ))}
      //       </ul>
      //     ),
      //   });
      // }

      // if (!!cloud?.machineTypes?.length) {
      //   cloudDetails.push({
      //     title: i18n.translate('xpack.apm.serviceIcons.serviceDetails.cloud.machineTypesLabel', {
      //       defaultMessage: '{machineTypes, plural, =0{Machine type} one {Machine type} other {Machine types}} ',
      //       values: { machineTypes: cloud.machineTypes.length },
      //     }),
      //     description: (
      //       <ul>
      //         {cloud.machineTypes.map((type, index) => (
      //           <li key={index}>{type}</li>
      //         ))}
      //       </ul>
      //     ),
      //   });
      // }

      if (cloud?.projectName) {
        cloudDetails.push({
          title: 'Project ID',
          description: cloud.projectName,
        });
      }

      const containerDetails: any = [];
      if (container?.os) {
        containerDetails.push({
          title: 'OS',
          description: container.os,
        });
      }

      if (container?.isContainerized !== undefined) {
        containerDetails.push({
          title: '容器化', // 'Containerized',
          description: container.isContainerized ? 'Yes' : 'No',
        });
      }

      if (container?.totalNumberInstances) {
        containerDetails.push({
          title: '实例总数', //'Total number of instances',
          description: asInteger(container.totalNumberInstances),
        });
      }

      if (container?.type) {
        containerDetails.push({
          title: '编排', // 'Orchestration',
          description: container.type,
        });
      }

      const serverlessDetails: any = [];

      // if (!!serverless?.functionNames?.length) {
      //   serverlessDetails.push({
      //     title: i18n.translate('xpack.apm.serviceIcons.serviceDetails.cloud.functionNameLabel', {
      //       defaultMessage: '{functionNames, plural, =0 {Function name} one {Function name} other {Function names}} ',
      //       values: { functionNames: serverless.functionNames.length },
      //     }),
      //     description: (
      //       <ul>
      //         {serverless.functionNames.map((type, index) => (
      //           <li key={index}>{type}</li>
      //         ))}
      //       </ul>
      //     ),
      //   });
      // }

      // if (!!serverless?.faasTriggerTypes?.length) {
      //   serverlessDetails.push({
      //     title: i18n.translate('xpack.apm.serviceIcons.serviceDetails.cloud.faasTriggerTypeLabel', {
      //       defaultMessage: '{triggerTypes, plural, =0 {Trigger type} one {Trigger type} other {Trigger types}} ',
      //       values: { triggerTypes: serverless.faasTriggerTypes.length },
      //     }),
      //     description: (
      //       <ul>
      //         {serverless.faasTriggerTypes.map((type, index) => (
      //           <li key={index}>{type}</li>
      //         ))}
      //       </ul>
      //     ),
      //   });
      // }

      const serviceDetails: any = [];
      if (!!service?.versions?.length) {
        serviceDetails.push({
          title: '服务版本', //'Service version',
          description: (
            <ul>
              {service.versions.map((version, index) => (
                <li key={index}>{version}</li>
              ))}
            </ul>
          ),
        });
      }

      if (service?.runtime) {
        serviceDetails.push({
          title: '运行时名称和版本', //'Runtime name & version',
          description: (
            <>
              {service.runtime.name} {service.runtime.version}
            </>
          ),
        });
      }

      if (service?.framework) {
        serviceDetails.push({
          title: '框架名称', //'Framework name',
          description: service.framework,
        });
      }

      if (service?.agent) {
        serviceDetails.push({
          title: '代理名称和版本', //Agent name & version',
          description: (
            <>
              {service.agent.name} {service.agent.version}
            </>
          ),
        });
      }

      const data: PopoverItem[] = [
        {
          key: 'service',
          icon: getAgentIcon(iconValue?.agentName),
          isVisible: !!iconValue?.agentName,
          title: '服务', // 'Service',
          component: serviceDetails,
        },
        {
          key: 'container',
          icon: getContainerIcon(iconValue?.containerType),
          isVisible: !!iconValue?.containerType,
          title: '容器', //'Container',
          component: containerDetails,
        },
        {
          key: 'serverless',
          icon: getAgentIcon(iconValue?.serverlessType),
          isVisible: !!iconValue?.serverlessType,
          title: 'Serverless',
          component: serverlessDetails,
        },
        {
          key: 'cloud',
          icon: getCloudIcon(iconValue?.cloudProvider),
          isVisible: !!iconValue?.cloudProvider,
          title: 'Cloud',
          component: cloudDetails,
        },
      ];
      setMetaDetial(data);
    });
  }, [start, end, bgid, data_id, serviceName]);

  return (
    <Space className='service-icons-wrapper'>
      {metaDetail?.map((item: any) =>
        item.isVisible ? (
          <Popover
            key={item.key}
            content={
              <Space direction='vertical' size='middle' className='service-icons-content'>
                {item.component.map((ele) => (
                  <div key={ele.title}>
                    <div style={{ color: '#343741' }}>{ele.title}</div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{ele.description}</div>
                  </div>
                ))}
              </Space>
            }
            title={<div style={{ fontWeight: 700, fontSize: '14px', padding: '5px 0' }}>{item.title}</div>}
            trigger='click'
          >
            <Button icon={item.icon} />
          </Popover>
        ) : null,
      )}
    </Space>
  );
};

export default ServiceIcons;
