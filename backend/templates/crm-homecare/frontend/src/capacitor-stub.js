// Stub for all @capacitor/* packages when running in browser/web
export const Capacitor = {
  isNativePlatform: () => false,
  getPlatform: () => 'web',
  isPluginAvailable: () => false,
};
export const Geolocation = null;
export const Network = null;
export const Haptics = null;
export const LocalNotifications = null;
export const BackgroundGeolocation = null;
export const SplashScreen = null;
export const StatusBar = null;
export const Keyboard = null;
export const PushNotifications = null;
export default {};
