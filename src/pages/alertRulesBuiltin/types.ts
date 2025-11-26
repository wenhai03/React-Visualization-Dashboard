export interface RuleCateType {
  id: number;
  name: string;
  icon_url: string;
  alert_rules: RuleType[];
  favorite: boolean;
  code: string;
}

export interface RuleType {
  id: number;
  cate_code: string;
  code: string;
  fname: string;
  name: string;
  append_tags: string[];
  prod: string;
  __cate__: string;
  __group__: string;
}
