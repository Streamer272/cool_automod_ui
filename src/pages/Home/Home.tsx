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
import * as core from "@mantine/core";
import "./style.scss";
import "../../styles/icons.scss";
import { useUser } from "../../hooks/useUser";
import { useNavigate } from "react-router-dom";
import {
  hideNotification,
  showNotification,
  updateNotification,
} from "@mantine/notifications";

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
  const edits = useRef<Edit[] | undefined>();
  const unsubscribe = useRef<Function | undefined>();
  const [toSync, setToSync] = useState<string | undefined>();
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

  function getDisabled(fluid: Fluid): boolean {
    return fluid.solid || (!!toSync && toSync !== fluid.id);
  }

  function createFluid() {
    if (!user) return navigate("/login");
    if (!fluidsCollection.current) return;

    showNotification({
      id: "create",
      message: "Creating document...",
      loading: true,
    });
    addDoc(fluidsCollection.current, {
      cause: "you're",
      echo: "gay",
      rank: 1,
      serverId: serverId,
      solid: false,
      uid: user.id,
    })
      .then(() => {
        hideNotification("create");
      })
      .catch(() => {
        updateNotification({
          id: "create",
          message: "Failed to create document",
          color: "red",
        });
      });
  }

  function changeFluid(
    id: string,
    key: string,
    value: string | number | boolean
  ) {
    if (!user) return navigate("/login");
    if (!fluids || !fluidsCollection) return;
    const fluidIndex = fluids.findIndex((fluid) => fluid.id === id);
    if (fluidIndex < 0 || (toSync && toSync !== id)) return;

    fluids[fluidIndex][key] = value;
    setFluids([...fluids]);
    setToSync(id);
  }

  function syncFluid() {
    if (!user) return navigate("/login");
    if (!fluidsCollection.current || !toSync || !fluids) return;

    showNotification({
      id: "update",
      message: "Updating document...",
      loading: true,
    });
    const fluid = fluids.find((fluid) => fluid.id === toSync);
    const fluidDoc = doc(fluidsCollection.current!!, toSync);
    if (!fluid) return;

    updateDoc(fluidDoc, {
      cause: fluid.cause,
      echo: fluid.echo,
      rank: fluid.rank,
      serverId: fluid.serverId,
      uid: user.id,
    })
      .then(() => {
        hideNotification("update");
      })
      .catch(() => {
        updateNotification({
          id: "update",
          message: "Failed to update document",
          color: "red",
        });
      })
      .finally(() => {
        setToSync(undefined);
      });
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
    updateDoc(fluidDoc, {
      uid: user.id,
    })
      .then(() => {
        deleteDoc(fluidDoc)
          .then(() => {
            hideNotification("delete");
          })
          .catch(() => {
            updateNotification({
              id: "delete",
              message: "Failed to delete document",
              color: "red",
            });
          });
      })
      .catch(() => {
        updateNotification({
          id: "delete",
          message: "Failed to delete document",
          color: "red",
        });
      });
  }

  return (
    <div className="home">
      <core.Input
        placeholder="Server ID"
        radius="xl"
        size="lg"
        className="input"
        onChange={(event) => setServerId(event.target.value)}
      />

      {!!serverId && !!fluids && (
        <>
          <core.Table
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
                      disabled={getDisabled(fluid)}
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
                      disabled={getDisabled(fluid)}
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
                      disabled={getDisabled(fluid)}
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
                      disabled={getDisabled(fluid)}
                      onChange={(event) =>
                        changeFluid(fluid.id, "serverId", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <div className="delete">
                      <button
                        className="delete"
                        disabled={getDisabled(fluid)}
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
          </core.Table>

          <div className="buttons">
            {toSync && (
              <button onClick={syncFluid}>
                <span className="material-symbols-outlined">save</span>
              </button>
            )}
            <button onClick={createFluid}>
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
