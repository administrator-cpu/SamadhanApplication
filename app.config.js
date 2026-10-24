// app.config.js
export default ({ config }) => {
  const env = "production";

  const envConfig = {
    development: {
      name: "Samadhan (Dev)",
      apiUrl: "https://samadhan-api.fab5connect.com/api",
      androidPackage: "com.harshjha047.samadhan",
    },
    staging: {
      name: "Samadhan (Staging)",
      apiUrl: "https://samadhan-api.fab5connect.com/api",
      androidPackage: "com.harshjha047.samadhan",
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
    newArchEnabled: true,
    android: {
      package: envConfig.androidPackage,
      softwareKeyboardLayoutMode: 'resize',
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
      },
      permissions: ["RECORD_AUDIO", "MODIFY_AUDIO_SETTINGS"],
      blockedPermissions: [
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.ACCESS_MEDIA_LOCATION",
      ],
    },
    ios: {
      bundleIdentifier: envConfig.androidPackage,
      infoPlist: {
        NSCameraUsageDescription: 'Samadhan needs camera access so you can attach a photo of the issue to your ticket.',
        NSMicrophoneUsageDescription: 'Samadhan needs microphone access to make and receive calls.',
      },
    },
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
            extraProguardRules: [
              "-keep class org.webrtc.** { *; }",
              "-dontwarn org.webrtc.**",
            ].join("\n"),
          },
        },
      ],
      "expo-video",
      "expo-audio",
      "expo-router",
      "expo-splash-screen",
      "expo-status-bar",
      "expo-web-browser",
      "expo-font",
      "expo-image",
      "expo-sharing",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          color: "#2563eb",
          sounds: ["./assets/sounds/incoming_ring.wav"],
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow Samadhan to access your photos to attach them to a ticket.",
        },
      ],
      "expo-document-picker",
      [
        "expo-media-library",
        {
          photosPermission: "Allow Samadhan to access your photos.",
          savePhotosPermission: "Allow Samadhan to save images from tickets to your gallery.",
          isAccessMediaLocationEnabled: false,
        },
      ],
      [
        "@config-plugins/react-native-webrtc",
        {
          cameraPermission: "Samadhan needs camera access for video calls.",
          microphonePermission: "Samadhan needs microphone access for calls.",
        },
      ],
    ],
    scheme: 'samadhan',
    extra: {
      apiUrl: envConfig.apiUrl,
      eas: { projectId: "20dbfe9a-6b5a-45d2-baa3-e74d84f4a258" },
    },
  };
};