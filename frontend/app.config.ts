import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'LevantiLearn',
  slug: 'levantilearn',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'levantilearn',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#2D6A4F',      // Arabic green
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.levantilearn.app',
    infoPlist: {
      NSMicrophoneUsageDescription: 'LevantiLearn needs mic access for pronunciation practice.',
      NSSpeechRecognitionUsageDescription: 'Used to score your Arabic pronunciation.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#2D6A4F',
    },
    package: 'com.levantilearn.app',
    permissions: ['RECORD_AUDIO'],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-av',
      { microphonePermission: 'Allow LevantiLearn to access your microphone for pronunciation practice.' },
    ],
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    eas: { projectId: 'your-eas-project-id' },
  },
});
