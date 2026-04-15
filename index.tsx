import 'react-native-url-polyfill/auto';
import './src/__create/polyfills';
global.Buffer = require('buffer').Buffer;

import '@expo/metro-runtime';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { initTestFlightLogger } from './__create/testflight-logger';
import App from './entrypoint';

initTestFlightLogger();

renderRootComponent(App);
