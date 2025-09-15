import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {
    FIREBASE_API_KEY as ENV_FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN as ENV_FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID as ENV_FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET as ENV_FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID as ENV_FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID as ENV_FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID as ENV_FIREBASE_MEASUREMENT_ID,
} from '@env';

const firebaseConfig = {
    apiKey: ENV_FIREBASE_API_KEY || Constants.expoConfig.extra.FIREBASE_API_KEY,
    authDomain: ENV_FIREBASE_AUTH_DOMAIN || Constants.expoConfig.extra.FIREBASE_AUTH_DOMAIN,
    projectId: ENV_FIREBASE_PROJECT_ID || Constants.expoConfig.extra.FIREBASE_PROJECT_ID,
    storageBucket: ENV_FIREBASE_STORAGE_BUCKET || Constants.expoConfig.extra.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: ENV_FIREBASE_MESSAGING_SENDER_ID || Constants.expoConfig.extra.FIREBASE_MESSAGING_SENDER_ID,
    appId: ENV_FIREBASE_APP_ID || Constants.expoConfig.extra.FIREBASE_APP_ID,
    measurementId: ENV_FIREBASE_MEASUREMENT_ID || Constants.expoConfig.extra.FIREBASE_MEASUREMENT_ID
};

// Verifica se o Firebase já foi inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});