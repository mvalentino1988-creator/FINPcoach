/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __APP_BUILD_DATE__: string;

declare module 'firebase/app';
declare module 'firebase/firestore';
declare module 'firebase/auth';
declare module 'firebase/analytics';
