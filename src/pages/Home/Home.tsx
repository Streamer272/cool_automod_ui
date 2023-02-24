import { useEffect } from "react";
import { initializeApp } from "firebase/app";
import { collection, getFirestore } from "firebase/firestore";
import "./style.scss";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBTp2fk1PNYxSrnaG2LOLu0yUAJ7ZBD4hY",
  authDomain: "automod-5f5ab.firebaseapp.com",
  projectId: "automod-5f5ab",
  storageBucket: "automod-5f5ab.appspot.com",
  messagingSenderId: "443774039339",
  appId: "1:443774039339:web:23009675563b39bfdcc16e",
};

export function Home() {
  useEffect(() => {
    const app = initializeApp(FIREBASE_CONFIG);
    const db = getFirestore(app);
    const fluids = collection(db, "fluids");
  }, []);

  return (
    <>
      <h1>Home</h1>
    </>
  );
}
