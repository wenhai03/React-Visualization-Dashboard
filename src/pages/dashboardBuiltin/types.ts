export interface BoardCateType {
  name: string;
  icon_url: string;
  boards: BoardType[];
  favorite: boolean;
  code: string;
}

export interface BoardType {
  cate_code?: string;
  code?: string;
  fname: string;
  name: string;
  tags: string;
  id: number;
  configs?: any;
}

export interface BoardCateIconType {
  name: string;
  icon_url: string;
}
