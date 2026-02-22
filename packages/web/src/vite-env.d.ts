/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GATEWAY_URL: string
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_VAPID_KEY: string
  readonly VITE_GA_MEASUREMENT_ID: string
  readonly VITE_DEBUG_AUTO_LOGIN: string
  readonly VITE_DEBUG_AUTO_LOGIN_EMAIL: string
  readonly VITE_DEBUG_API_BASE: string
  readonly VITE_GOOGLE_IOS_CLIENT_ID: string
  readonly VITE_GOOGLE_WEB_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}