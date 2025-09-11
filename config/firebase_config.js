import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants'; // Importa a biblioteca Constants

const firebaseConfig = {
    apiKey: Constants.expoConfig.extra.FIREBASE_API_KEY,
    authDomain: Constants.expoConfig.extra.FIREBASE_AUTH_DOMAIN,
    projectId: Constants.expoConfig.extra.FIREBASE_PROJECT_ID,
    storageBucket: Constants.expoConfig.extra.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: Constants.expoConfig.extra.FIREBASE_MESSAGING_SENDER_ID,
    appId: Constants.expoConfig.extra.FIREBASE_APP_ID,
    measurementId: Constants.expoConfig.extra.FIREBASE_MEASUREMENT_ID
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});