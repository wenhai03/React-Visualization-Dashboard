const zh_HK = {
  user: {
    title: '使用者管理',
    search_placeholder: '使用者名稱、郵箱或手機',
    create: '建立使用者',
    edit: '編輯使用者',
  },
  team: {
    title: '團隊管理',
    list: '團隊列表',
    search_placeholder: '使用者名稱、顯示名、郵箱或手機',
    create: '建立團隊',
    edit: '編輯團隊',
    add_member: '新增成員',
    empty: '沒有與你相關的團隊，請先',
    name: '團隊名稱',
    add_member_selected: '已選擇 {{num}} 項',
    name_tip: '由小寫字母、數字、中劃線(-)、下劃線(_)組成，長度不超過64個字符。建議按最小團隊劃分，如gf-eblink-reader、gf-eblink-owner',
  },
  business: {
    title: '業務組管理',
    list: '業務組列表',
    search_placeholder: '業務名',
    team_search_placeholder: '搜尋團隊名稱',
    create: '建立業務組',
    edit: '編輯業務組',
    add_team: '新增團隊',
    perm_flag: '許可權',
    note_content: '監控對象、儀表盤、告警規則、自愈腳本、日誌、鏈路等都要歸屬於某個業務組，是一個在系統裏可以自閉環的組織，用戶只能查看自身團隊所關聯的業務組數據。',
    empty: '業務組（監控對象、儀表盤、告警規則、自愈腳本、日誌、鏈路等都要歸屬於某個業務組，用戶也只能查看自身團隊所關聯的業務組數據）爲空，請先',
    name: '業務組名稱',
    name_tip: '由小寫字母、數字、中劃線(-)、下劃線(_)組成，長度不超過64個字符。建議按經營單位-業務系統劃分，如 gf-eblink、gf-erp',
    label_enable: '作為標籤使用',
    label_enable_tip: '系統會自動把業務組的英文標識作為標籤附到該業務組下轄監控物件的時序資料上',
    label_value: '英文標識',
    label_value_tip: `
      <0>
        儘量用英文，不能與其他業務組標識重複，系統會自動生成
        <1>busigroup={{val}}</1>
        的標籤
      </0>
    `,
    team_name: '團隊',
    perm_flag_0: '只讀',
    perm_flag_1: '讀寫',
  },
  disbale: '禁用',
  enable: '啟用',
  ok_and_search: '確定並搜尋',
};

export default zh_HK;
