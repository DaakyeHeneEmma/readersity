const app = require('./app.json').expo;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const plugins = [...(app.plugins || [])];

if (googleIosClientId) {
  const clientIdPrefix = googleIosClientId.replace(/\.apps\.googleusercontent\.com$/, '');
  plugins.push([
    '@react-native-google-signin/google-signin',
    {iosUrlScheme: `com.googleusercontent.apps.${clientIdPrefix}`},
  ]);
}

module.exports = {...app, plugins};
