export function normalizeESQueryRequestBody(params: any) {
  const query = {
    bool: {
      filter: [
        {
          query_string: {
            analyze_wildcard: true,
            query: params?.query,
          },
        },
      ],
    },
  };
  const body = {
    size: 0,
    aggs: {
      A: {
        [params?.find]: {
          field: `${params?.field}`,
          size: params?.size || 500,
          order: {
            _key: 'asc',
          },
        },
      },
    },
  };

  if (!params?.query) {
    query.bool.filter.pop();
  }

  // 添加时间范围
  if (params?.timefield && params?.start && params?.end) {
    const range = {};
    range[params?.timefield] = {
      gte: params?.start,
      lte: params?.end,
      format: 'epoch_millis',
    };
    query.bool.filter.push({range: range} as any);
  }

  if (query.bool.filter.length > 0) {
    body['query'] = query;
  }

  return body;
}
