module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated v4 no longer needs the plugin listed here
    // babel-preset-expo handles it automatically in SDK 54
  };
};
