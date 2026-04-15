import * as SecureStore from 'expo-secure-store';
import { fetch as expoFetch } from 'expo/fetch';

const originalFetch = fetch;
const authKey = 'rakah-auth-jwt';

const getURLFromArgs = (...args: Parameters<typeof fetch>) => {
  const [urlArg] = args as [unknown, ...unknown[]];
  let url: string | null;
  if (typeof urlArg === 'string') {
    url = urlArg;
  } else if (urlArg instanceof Request) {
    url = urlArg.url;
  } else if (urlArg && typeof urlArg === 'object') {
    const maybeUrl = String(urlArg);
    url = typeof maybeUrl === 'string' ? maybeUrl : null;
  } else {
    url = null;
  }
  return url;
};

const isFileURL = (url: string) => {
  return url.startsWith('file://') || url.startsWith('data:');
};

const isRelativeURL = (url: string) => url.startsWith('/');

type Params = Parameters<typeof expoFetch>;
const fetchToWeb = async function fetchWithHeaders(...args: Params) {
  const apiBaseURL = process.env.EXPO_PUBLIC_API_BASE_URL;
  const [input, init] = args;
  const url = getURLFromArgs(input, init);
  if (!url) {
    return expoFetch(input, init);
  }

  if (isFileURL(url)) {
    return originalFetch(input, init);
  }

  let finalInput = input;
  if (typeof input === 'string') {
    if (isRelativeURL(input) && apiBaseURL) {
      finalInput = `${apiBaseURL}${input}`;
    }
  } else {
    return expoFetch(input, init);
  }

  const initHeaders = init?.headers ?? {};
  const finalHeaders = new Headers(initHeaders);

  const auth = await SecureStore.getItemAsync(authKey)
    .then((auth) => {
      return auth ? JSON.parse(auth) : null;
    })
    .catch(() => {
      return null;
    });

  if (auth) {
    finalHeaders.set('authorization', `Bearer ${auth.jwt}`);
  }

  return expoFetch(finalInput, {
    ...init,
    headers: finalHeaders,
  });
};

export default fetchToWeb;
