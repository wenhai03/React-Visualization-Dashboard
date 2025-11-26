const compareOptions = ['lt', 'gt', 'leq', 'geq', 'eq'].map((ele) => ({
  label: ele,
  value: ele,
}));

const relationOptions = ['contains', 'not_contains', 'is', 'is_not', 'match_regex', 'not_match_regex'].map((ele) => ({
  label: ele,
  value: ele,
}));

export const defaultConfig = {
  'dial:dial_http': {
    body: {
      options: relationOptions,
      item: {
        check_type: 'body',
        op: 'contains',
        value: '',
      },
    },
    header: {
      options: relationOptions,
      item: {
        check_type: 'header',
        key: '',
        op: 'contains',
        value: '',
      },
    },
    response_time: {
      item: {
        check_type: 'response_time',
        value: '',
      },
    },
    status_code: {
      options: ['is', 'is_not', 'match_regex', 'not_match_regex'].map((ele) => ({
        label: ele,
        value: ele,
      })),
      item: {
        check_type: 'status_code',
        op: 'is',
        value: '',
      },
    },
    pre_script_out: {
      options: relationOptions,
      item: {
        check_type: 'pre_script_out',
        op: 'contains',
        value: '',
      },
    },
    script_out: {
      options: relationOptions,
      item: {
        check_type: 'script_out',
        op: 'contains',
        value: '',
      },
    },
  },
  'dial:dial_tcp': {
    body: {
      options: relationOptions,
      item: {
        check_type: 'body',
        op: 'contains',
        value: '',
      },
    },
    response_time: {
      options: [
        { label: 'without_DNS', value: 'is' },
        { label: 'including_DNS', value: 'is_not' },
      ],
      item: {
        check_type: 'response_time',
        op: 'is',
        value: '',
      },
    },
    hops: {
      options: compareOptions,
      item: {
        check_type: 'hops',
        op: 'lt',
        value: '',
      },
    },
    pre_script_out: {
      options: relationOptions,
      item: {
        check_type: 'pre_script_out',
        op: 'contains',
        value: '',
      },
    },
    script_out: {
      options: relationOptions,
      item: {
        check_type: 'script_out',
        op: 'contains',
        value: '',
      },
    },
  },
  'dial:dial_udp': {
    body: {
      options: relationOptions,
      item: {
        check_type: 'body',
        op: 'contains',
        value: '',
      },
    },
    response_time: {
      item: {
        check_type: 'response_time',
        value: '',
      },
    },
    pre_script_out: {
      options: relationOptions,
      item: {
        check_type: 'pre_script_out',
        op: 'contains',
        value: '',
      },
    },
    script_out: {
      options: relationOptions,
      item: {
        check_type: 'script_out',
        op: 'contains',
        value: '',
      },
    },
  },
  'dial:dial_icmp': {
    response_time: {
      options: compareOptions,
      funcOptions: ['avg', 'min', 'max', 'std'].map((ele) => ({
        label: ele,
        value: ele,
      })),
      item: {
        check_type: 'response_time',
        func: 'avg',
        op: 'lt',
        value: '',
      },
    },
    hops: {
      options: compareOptions,
      item: {
        check_type: 'hops',
        op: 'lt',
        value: '',
      },
    },
    packet_loss_percent: {
      options: compareOptions,
      item: {
        check_type: 'packet_loss_percent',
        op: 'lt',
        value: '',
      },
    },
    packets: {
      options: ['eq', 'lt', 'gt', 'leq', 'geq'].map((ele) => ({
        label: ele,
        value: ele,
      })),
      item: {
        check_type: 'packets',
        op: 'eq',
        value: '',
      },
    },
  },
  'dial:dial_websocket': {
    header: {
      options: ['is', 'is_not', 'contains', 'not_contains', 'match_regex', 'not_match_regex'].map((ele) => ({
        label: ele,
        value: ele,
      })),
      item: {
        check_type: 'header',
        key: '',
        op: 'is',
        value: '',
      },
    },
    response_time: {
      item: {
        check_type: 'response_time',
        value: '',
      },
    },
    body: {
      options: relationOptions,
      item: {
        check_type: 'body',
        op: 'contains',
        value: '',
      },
    },
    pre_script_out: {
      options: relationOptions,
      item: {
        check_type: 'pre_script_out',
        op: 'contains',
        value: '',
      },
    },
    script_out: {
      options: relationOptions,
      item: {
        check_type: 'script_out',
        op: 'contains',
        value: '',
      },
    },
  },
  'dial:dial_whois': {},
};

export const defaultValues = {
  category: 'dial:dial_http',
  name: '',
  enabled: true,
  content_json: {
    method: 'GET',
    interval: 15,
    success_when_logic: 'or',
    success_when: [defaultConfig['dial:dial_http'].body.item],
  },
};

export const dialTabs = [
  'dial:dial_http',
  'dial:dial_tcp',
  'dial:dial_udp',
  'dial:dial_icmp',
  'dial:dial_websocket',
  'dial:dial_whois',
];

export const defaultItem = {
  'dial:dial_http': 'body',
  'dial:dial_tcp': 'body',
  'dial:dial_udp': 'body',
  'dial:dial_icmp': 'response_time',
  'dial:dial_websocket': 'header',
};

export const defaultRequestFormat = {
  'dial:dial_http': {
    url: '',
    method: 'GET',
    headers_list: [],
    username: '',
    password: '',
    interval: 15,
  },
  'dial:dial_tcp': {
    url: '',
    port: 443,
    enable_traceroute: false,
    interval: 15,
  },
  'dial:dial_udp': {
    url: '',
    port: 443,
    enable_traceroute: false,
    interval: 15,
  },
  'dial:dial_icmp': {
    url: '',
    enable_traceroute: false,
    packet_count: 4,
    interval: 15,
  },
  'dial:dial_websocket': {
    url: '',
    body: '',
    headers_list: [],
    username: '',
    password: '',
    interval: 15,
  },
  'dial:dial_whois': {
    url: '',
    interval: 1,
  },
};

export const advanced_set_fields = [
  'timeout',
  'follow_redirects',
  'username',
  'password',
  'body',
  'http_proxy',
  'fail_save',
  'success_save',
  'pre_script',
  'post_script',
  'script_timeout',
  'headers_list',
];
