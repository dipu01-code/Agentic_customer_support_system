"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAiokjUMk45aZ57Yusgeo78uvBRCcBcm6A",
  authDomain: "foai-4c548.firebaseapp.com",
  projectId: "foai-4c548",
  storageBucket: "foai-4c548.firebasestorage.app",
  messagingSenderId: "671476703172",
  appId: "1:671476703172:web:c7bbe5392e72e8f5114e91",
  measurementId: "G-5ZTH5VLTFX"
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});
