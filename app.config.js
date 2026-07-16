// app.config.js
export default ({ config }) => {
  const env = process.env.APP_ENV || "development";

  const envConfig = {
    development: {
      name: "Samadhan (Dev)",
      apiUrl: "http://192.168.1.5:8000",
      androidPackage: "com.harshjha047.samadhan.dev",
    },
    staging: {
      name: "Samadhan (Staging)",
      apiUrl: "https://staging-api.samadhan.example.com",
      androidPackage: "com.harshjha047.samadhan.staging",
    },
    production: {
      name: "Samadhan",
      apiUrl: "https://api.samadhan.example.com",
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
      bundleIdentifier: envConfig.androidPackage, // reuse same string for iOS
    },
    extra: {
      apiUrl: envConfig.apiUrl,
      eas: {
        projectId: "20dbfe9a-6b5a-45d2-baa3-e74d84f4a258",
      },
    },
  };
};