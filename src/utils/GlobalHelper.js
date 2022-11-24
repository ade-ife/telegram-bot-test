const { default: axios } = require('axios');
const { token } = require('../config/config');

export async function QOS_Bot_Action(service, data = {}) {
  const { data } = await axios.post(`https://api.telegram.org/${token}/${service}`, { ...data });

  return data;
}

export function botsApiBuildQueryString(params) {
  const params_arr = [];
  const values = Object.values(params);
  const keys = Object.keys(params);

  values?.forEach((value, index) => {
    if (isNaN(value) && typeof value !== 'string') {
      value = JSON.stringify(value);
    }
    params_arr.push(encodeURIComponent(keys[index]) + '=' + encodeURIComponent(value));
  });
  return params_arr.join('&');
}

export async function botsApiPerformRequest(method, params, options = {}) {
  let BotsApiHandle;
  let BotCredentials = token;

  let api_url = 'https://api.telegram.org/' + BotCredentials;
  let query_string = botsApiBuildQueryString(params);

  let url = api_url + '/' + method;

  if (BotsApiHandle) {
    BotsApiHandle = axios.create({ baseURL: url });
  }

  options = Object.assign(
    {
      http_method: 'GET',
      timeout: 10,
    },
    options
  );

  if (options['http_method'] === 'POST') {
    const params = new URLSearchParams(query_string);
    const entries = params.entries(); //returns an iterator of decoded [key,value] tuples
    const obj = paramsToObject(entries);
    const { data } = await BotsApiHandle.post('', { ...obj });
    return data;
  } else {
    if (query_string) {
      const { data } = await BotsApiHandle.get('?' + query_string);
      return data;
    }
  }
}

function paramsToObject(entries) {
  const result = {};
  for (const [key, value] of entries) {
    result[key] = value;
  }
  return result;
}
