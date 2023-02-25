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
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import { Input, Notification, Table } from "@mantine/core";
import "./style.scss";
import "../../styles/icons.scss";
import { useUser } from "../../hooks/useUser";
import { useNavigate } from "react-router-dom";
import { hideNotification, showNotification } from "@mantine/notifications";

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

interface Edit {
  id: string;
  uid: string;
  last: Date;
  [key: string]: string | Date;
}

export function Home() {
  const fluidsCollection = useRef<
    CollectionReference<DocumentData> | undefined
  >();
  const editsCollection = useRef<
    CollectionReference<DocumentData> | undefined
  >();
  const unsubscribe = useRef<Function | undefined>();
  const changeTimeout = useRef<NodeJS.Timeout | undefined>();
  const toSync = useRef<string[]>([]);
  const edits = useRef<Edit[] | undefined>();
  const [serverId, setServerId] = useState<string | undefined>();
  const [fluids, setFluids] = useState<Fluid[] | undefined>();
  const [user] = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return navigate("/login");

    const app = initializeApp(FIREBASE_CONFIG);
    const db = getFirestore(app);
    fluidsCollection.current = collection(db, "fluids");
    editsCollection.current = collection(db, "edits");

    const editsQuery = query(
      editsCollection.current,
      where("uid", "==", user.id)
    );
    onSnapshot(editsQuery, (snapshot) => {
      edits.current = [];
      snapshot.forEach((doc) => {
        edits.current!!.push({
          id: doc.id,
          ...doc.data(),
        } as Edit);
      });
    });
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

  async function createFluid() {
    if (!user) return navigate("/login");
    if (!fluidsCollection.current) return;

    showNotification({
      id: "create",
      message: "Creating document...",
      loading: true,
    });
    await addDoc(fluidsCollection.current, {
      cause: "you're",
      echo: "gay",
      rank: 1,
      serverId: serverId,
      solid: false,
      uid: user.id,
    });
    hideNotification("create");
  }

  function changeFluid(
    id: string,
    key: string,
    value: string | number | boolean
  ) {
    // TODO: only allow changing 1 doc at a time
    if (!user) return navigate("/login");
    if (!fluids || !fluidsCollection) return;
    const fluidIndex = fluids.findIndex((fluid) => fluid.id === id);
    if (fluidIndex < 0) return;

    const temp = [...fluids];
    temp[fluidIndex][key] = value;
    setFluids(temp);
    if (!toSync.current.includes(id)) toSync.current.push(id);

    if (changeTimeout.current) clearTimeout(changeTimeout.current);
    changeTimeout.current = setTimeout(async () => {
      if (!user) return navigate("/login");
      if (!fluidsCollection.current) return;

      showNotification({
        id: "update",
        message: "Updating document...",
        loading: true,
      });
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
            uid: user.id,
          });
        })
      );
      hideNotification("update");
      toSync.current = [];
    }, 1500);
  }

  async function deleteFluid(id: string) {
    if (!user) return navigate("/login");
    if (!fluidsCollection.current) return;

    const fluidDoc = doc(fluidsCollection.current, id);
    showNotification({
      id: "delete",
      message: "Deleting document...",
      loading: true,
    });
    await updateDoc(fluidDoc, {
      uid: user.id,
    });
    await deleteDoc(fluidDoc);
    hideNotification("delete");
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
        <>
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
                <th>Delete</th>
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
                  <td>
                    <div className="delete">
                      <button
                        className="delete"
                        disabled={fluid.solid}
                        onClick={() => deleteFluid(fluid.id)}
                      >
                        <span className="material-symbols-outlined">
                          delete
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <button className="add" onClick={createFluid}>
            <span className="material-symbols-outlined">add</span>
          </button>
        </>
      )}
    </div>
  );
}
