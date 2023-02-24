import { useEffect, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  CollectionReference,
  DocumentData,
  collection,
  getFirestore,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import "./style.scss";
import { Input } from "@mantine/core";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBTp2fk1PNYxSrnaG2LOLu0yUAJ7ZBD4hY",
  authDomain: "automod-5f5ab.firebaseapp.com",
  projectId: "automod-5f5ab",
  storageBucket: "automod-5f5ab.appspot.com",
  messagingSenderId: "443774039339",
  appId: "1:443774039339:web:23009675563b39bfdcc16e",
};

interface Fluid {
  cause: string;
  echo: string;
  serverId: string;
  rank: number;
  solid: boolean;
}

export function Home() {
  const fluidsCollection = useRef<
    CollectionReference<DocumentData> | undefined
  >(undefined);
  const unsubscribe = useRef<Function | undefined>(undefined);
  const [serverId, setServerId] = useState<string | undefined>(undefined);
  const [fluids, setFluids] = useState<Fluid[] | undefined>(undefined);

  useEffect(() => {
    const app = initializeApp(FIREBASE_CONFIG);
    const db = getFirestore(app);
    fluidsCollection.current = collection(db, "fluids");
  }, []);

  useEffect(() => {
    console.log("serverId changed");
    if (!fluidsCollection.current || !serverId) return;
    if (unsubscribe.current) unsubscribe.current();
    const fluidsQuery = query(
      fluidsCollection.current,
      where("serverId", "==", serverId)
    );
    unsubscribe.current = onSnapshot(fluidsQuery, (snapshot) => {
      const array: Fluid[] = [];
      snapshot.forEach((doc) => {
        array.push(doc.data() as Fluid);
      });
      setFluids(array);
    });
  }, [serverId]);

  return (
    <>
      <Input
        placeholder="Server ID"
        radius="xl"
        size="lg"
        onChange={(event) => setServerId(event.target.value)}
      />

      {serverId !== undefined &&
        fluids &&
        fluids.map((thing) => <p>{thing.echo}</p>)}
    </>
  );
}
