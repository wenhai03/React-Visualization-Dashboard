export function getDefaultValuesByProd(prod) {
  if (prod === 'host') {
    return {
      prod,
      cate: 'host',
      datasource_ids: undefined,
    };
  }
  if (prod === 'anomaly') {
    return {
      prod,
      cate: 'prometheus',
    };
  }
  if (prod === 'metric') {
    return {
      prod,
      cate: 'prometheus',
    };
  }
  if (prod === 'dial') {
    return {
      prod,
      cate: 'prometheus',
    };
  }
  if (prod === 'log') {
    return {
      prod,
      cate: 'elasticsearch',
    };
  }
  if (prod === 'apm') {
    return {
      prod,
      cate: 'elasticsearch',
    };
  }
  if (prod === 'logging') {
    return {
      prod,
      cate: 'elasticsearch',
    };
  }
}
