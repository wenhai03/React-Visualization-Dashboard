export interface baseItem {
  busi_group_id: number;
  datasource_id: number;
  service_name?: string;
  start: number;
  end: number;
}

export interface tracesListItem extends baseItem {
  service_environment?: string;
  transaction_type?: string;
  kql?: { must: any; filter: any; should: any; must_not: any };
}

export interface tracesSamplesItem extends tracesListItem {
  range_from?: number;
  range_to?: number;
}
