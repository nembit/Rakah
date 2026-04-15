import 'react-native-url-polyfill/auto';
import './src/lib/polyfills';
global.Buffer = require('buffer').Buffer;

import '@expo/metro-runtime';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { initTestFlightLogger } from './lib/testflight-logger';
import App from './entrypoint';

initTestFlightLogger();

renderRootComponent(App);
