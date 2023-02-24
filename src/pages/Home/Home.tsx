import { useEffect, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  CollectionReference,
  DocumentData,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import "./style.scss";
import { Input, Loader, Table } from "@mantine/core";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBTp2fk1PNYxSrnaG2LOLu0yUAJ7ZBD4hY",
  authDomain: "automod-5f5ab.firebaseapp.com",
  projectId: "automod-5f5ab",
  storageBucket: "automod-5f5ab.appspot.com",
  messagingSenderId: "443774039339",
  appId: "1:443774039339:web:23009675563b39bfdcc16e",
};

interface Fluid {
  id: string;
  cause: string;
  echo: string;
  rank: number;
  serverId: string;
  solid: boolean;
  [key: string]: string | number | boolean;
}

export function Home() {
  const fluidsCollection = useRef<
    CollectionReference<DocumentData> | undefined
  >();
  const unsubscribe = useRef<Function | undefined>();
  const changeTimeout = useRef<NodeJS.Timeout | undefined>();
  const toSync = useRef<string[]>([]);
  const [serverId, setServerId] = useState<string | undefined>();
  const [fluids, setFluids] = useState<Fluid[] | undefined>();
  const [syncing, setSyncing] = useState<boolean>(false);

  useEffect(() => {
    const app = initializeApp(FIREBASE_CONFIG);
    const db = getFirestore(app);
    fluidsCollection.current = collection(db, "fluids");
  }, []);

  useEffect(() => {
    if (!fluidsCollection.current || !serverId) return;
    if (unsubscribe.current) unsubscribe.current();
    const fluidsQuery = query(
      fluidsCollection.current,
      where("serverId", "==", serverId)
    );
    unsubscribe.current = onSnapshot(fluidsQuery, (snapshot) => {
      const array: Fluid[] = [];
      snapshot.forEach((doc) => {
        array.push({
          id: doc.id,
          ...doc.data(),
        } as Fluid);
      });
      setFluids(array);
    });
  }, [serverId]);

  function createFluid() {}

  function changeFluid(
    id: string,
    key: string,
    value: string | number | boolean
  ) {
    if (!fluids || !id) return;
    const fluidIndex = fluids.findIndex((fluid) => fluid.id === id);
    if (fluidIndex < 0) return;

    const temp = [...fluids];
    temp[fluidIndex][key] = value;
    setFluids(temp);
    if (!toSync.current.includes(id)) toSync.current.push(id);

    if (changeTimeout.current) clearTimeout(changeTimeout.current);
    changeTimeout.current = setTimeout(async () => {
      if (!fluidsCollection.current) return;

      setSyncing(true);
      await Promise.all(
        toSync.current.map((id: string) => {
          const fluid = fluids.find((fluid) => fluid.id === id);
          const fluidDoc = doc(fluidsCollection.current!!, id);
          if (!fluid) return;

          return updateDoc(fluidDoc, {
            cause: fluid.cause,
            echo: fluid.echo,
            rank: fluid.rank,
            serverId: fluid.serverId,
          });
        })
      );
      setSyncing(false);
      toSync.current = [];
    }, 1000);
  }

  function deleteFluid(id: string) {
    console.log("deleting fluid");
  }

  return (
    <div className="home">
      <Input
        placeholder="Server ID"
        radius="xl"
        size="lg"
        className="input"
        onChange={(event) => setServerId(event.target.value)}
      />

      {!!serverId && !!fluids && (
        <Table
          highlightOnHover
          withColumnBorders
          fontSize={"md"}
          horizontalSpacing={"lg"}
          verticalSpacing={"sm"}
          className="table"
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>Cause</th>
              <th>Echo</th>
              <th>Rank</th>
              <th>Server ID</th>
            </tr>
          </thead>
          <tbody>
            {fluids.map((fluid) => (
              <tr key={fluid.id}>
                <td>{fluid.id}</td>
                <td>
                  <input
                    value={fluid.cause}
                    placeholder="Cause"
                    className="editable"
                    disabled={fluid.solid}
                    onChange={(event) =>
                      changeFluid(fluid.id, "cause", event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    value={fluid.echo}
                    placeholder="Echo"
                    className="editable"
                    disabled={fluid.solid}
                    onChange={(event) =>
                      changeFluid(fluid.id, "echo", event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    value={fluid.rank}
                    placeholder="Rank"
                    className="editable"
                    disabled={fluid.solid}
                    onChange={(event) =>
                      !isNaN(+event.target.value) &&
                      changeFluid(fluid.id, "rank", +event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    value={fluid.serverId}
                    placeholder="Server ID"
                    className="editable"
                    disabled={fluid.solid}
                    onChange={(event) =>
                      changeFluid(fluid.id, "serverId", event.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {syncing && <Loader className="sync" />}
    </div>
  );
}
