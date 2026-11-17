/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __APP_BUILD_DATE__: string;

declare module 'firebase/app';
declare module 'firebase/firestore';
declare module 'firebase/auth';
declare module 'firebase/analytics';

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
