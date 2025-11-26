const en_US = {
  title: 'Notification Settings',
  webhooks: {
    title: 'Callbacks',
    enable: 'Enable',
    note: 'Note',
    url: 'URL',
    timeout: 'Timeout (unit: s)',
    basic_auth_user: 'Username (Basic Auth)',
    basic_auth_password: 'Password (Basic Auth)',
    skip_verify: 'Skip SSL verification',
    add: 'Add',
  },
  script: {
    title: 'Script',
    enable: 'Enable',
    timeout: 'Timeout (unit: s)',
    type: ['Script', 'File Path'],
    path: 'Path',
  },
  channels: {
    title: 'Channels',
    name: 'Name',
    ident: 'Ident',
    ident_msg1: 'Ident must contain letters, numbers, underscores and hyphens',
    ident_msg2: 'Ident already exists',
    hide: 'Hide',
    add: 'Add',
    add_title: 'Add Channel',
    edit_title: 'Edit Channel',
  },
  contacts: {
    title: 'Push robot',
    add_title: 'Add Push robot',
    edit_title: 'Edit Push robot',
  },
  smtp: {
    title: 'SMTP',
  },
  message_center: {
    title: 'Message center',
  },
  platform_notification: {
    title: 'Platform notification',
    value_beyond_tip:
      'Save failed, the platform notice content must not exceed 10000 words, please re-write and submit',
  },
  ibex: {
    title: 'Ibex Settings',
  },
};
export default en_US;
