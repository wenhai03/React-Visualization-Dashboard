import { BASE_API_PREFIX } from '@/utils/constant';

function getApi(path: string) {
  const prefix = `${BASE_API_PREFIX}/busi-group`;
  return (busiGroup: string | number) => {
    return `${prefix}/${busiGroup}${path}`;
  };
}

const api = {
  tasktpls: getApi('/task-tpls'),
  tasktpl: getApi('/task-tpl'),
  tasks: getApi('/tasks'),
  task: getApi('/task'),
  perms: getApi('/builtin-perms'),
};

export default api;
