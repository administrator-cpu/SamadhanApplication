// app.config.js
export default ({ config }) => {
  const env = process.env.APP_ENV || "development";

  const envConfig = {
    development: {
      name: "Samadhan (Dev)",
      apiUrl: "https://samadhan-api.fab5connect.com/api",
      androidPackage: "com.harshjha047.samadhan.dev",
    },
    staging: {
      name: "Samadhan (Staging)",
      apiUrl: "https://samadhan-api.fab5connect.com/api",
      androidPackage: "com.harshjha047.samadhan.staging",
    },
    production: {
      name: "Samadhan",
      apiUrl: "https://samadhan-api.fab5connect.com/api",
      androidPackage: "com.harshjha047.samadhan",
    },
  }[env];

 return {
  ...config,
  name: envConfig.name,
  slug: "samadhan",
  icon: "./assets/icon.png",
  android: {
    package: envConfig.androidPackage,
    softwareKeyboardLayoutMode: 'resize',
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
    },
  },
  ios: {
    bundleIdentifier: envConfig.androidPackage,
  },
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  plugins: [
    "expo-router",
    "expo-splash-screen",
    "expo-status-bar",
    "expo-web-browser",
    [
      "expo-notifications",
      { color: "#2563eb" },
    ],
  ],
  scheme: 'samadhan',
  extra: {
    apiUrl: envConfig.apiUrl,
    eas: { projectId: "20dbfe9a-6b5a-45d2-baa3-e74d84f4a258" },
  },
};
};