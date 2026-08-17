// app.config.js
export default ({ config }) => {
  const env = "production";

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
      "expo-font",
      [
        "expo-notifications",
        { color: "#2563eb" },
      ],
      // Ticket attachments (RaiseTicketForm / TicketReplyForm) — photo &
      // video picking. The plugin sets NSPhotoLibraryUsageDescription on
      // iOS; without it you get Apple's generic default string instead of
      // in-brand copy.
      [
        "expo-image-picker",
        {
          photosPermission: "Allow Samadhan to access your photos to attach them to a ticket.",
        },
      ],
      // Document attachments (PDFs, CSVs, etc.) via the paperclip menu.
      // No permission strings needed — included here mainly so it's
      // explicit in the manifest and easy to find alongside the others.
      "expo-document-picker",
      // Lightbox "Save" button — saves images to the device gallery.
      // Needs both iOS strings (NSPhotoLibraryUsageDescription /
      // NSPhotoLibraryAddUsageDescription) and the Android media
      // permissions; the plugin wires up both.
      [
        "expo-media-library",
        {
          photosPermission: "Allow Samadhan to access your photos.",
          savePhotosPermission: "Allow Samadhan to save images from tickets to your gallery.",
          isAccessMediaLocationEnabled: false,
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