// app.config.js
export default {
  expo: {
    name: "GymApp",
    slug: "gymapp-sisgimnasio",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.sisgimnasio.gymapp"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.sisgimnasio.gymapp"
    },
    web: {
      favicon: "./assets/favicon.png"
    }
  }
};