export interface ElasticsearchQuery {
  index: string;
  filter: string;
  date_field: string;
  interval?: string; // TODO: 是否可以为空？
  values: {
    func: string;
    field: string;
  }[];
  order_by?:{
    field?:string;
    order?:string;
  }[],
  group_by: {
    terms_type?: 'field_key' | 'script';
    cate: string;
    field?: string;
    min_value?: number;
    size?: number;
    order?: string;
    orderBy?: string;
    script?: string;
    script_name?: string;
  }[];
  start: number;
  end: number;
  limit?: number;
}
