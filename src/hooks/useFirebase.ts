import { Analytics, getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import {
  CollectionReference,
  DocumentData,
  collection,
  getFirestore,
} from "firebase/firestore";
import { useRef } from "react";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBTp2fk1PNYxSrnaG2LOLu0yUAJ7ZBD4hY",
  authDomain: "automod-5f5ab.firebaseapp.com",
  projectId: "automod-5f5ab",
  storageBucket: "automod-5f5ab.appspot.com",
  messagingSenderId: "443774039339",
  appId: "1:443774039339:web:23009675563b39bfdcc16e",
};

export function useFirebase() {
  const fluidsCollection = useRef<
    CollectionReference<DocumentData> | undefined
  >();
  const editsCollection = useRef<
    CollectionReference<DocumentData> | undefined
  >();
  const analytics = useRef<Analytics | undefined>();

  const app = initializeApp(FIREBASE_CONFIG);
  const db = getFirestore(app);
  fluidsCollection.current = collection(db, "fluids");
  editsCollection.current = collection(db, "edits");
  analytics.current = getAnalytics(app);

  return { fluidsCollection, editsCollection, analytics };
}
