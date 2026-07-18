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
    android: {
      package: envConfig.androidPackage,
    },
    ios: {
      bundleIdentifier: envConfig.androidPackage,
    },
    plugins: [
      "expo-router",
      "expo-splash-screen",
      "expo-status-bar",
      "expo-web-browser",
    ],
    extra: {
      apiUrl: envConfig.apiUrl,
      eas: {
        projectId: "20dbfe9a-6b5a-45d2-baa3-e74d84f4a258",
      },
    },
  };
};