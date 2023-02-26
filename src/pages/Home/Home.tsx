import { useEffect, useRef, useState } from "react";
import {
  doc,
  onSnapshot,
  query,
  where,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
} from "firebase/firestore";
import { Table, Input, Button } from "@mantine/core";
import { useUser } from "../../hooks/useUser";
import { useNavigate } from "react-router-dom";
import { showNotification, updateNotification } from "@mantine/notifications";
import { useBackendUrl } from "../../hooks/useBackendUrl";
import { useFirebase } from "../../hooks/useFirebase";
import { logEvent } from "firebase/analytics";
import axios from "axios";
import "./style.scss";
import "../../styles/icons.scss";

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
  const { fluidsCollection, editsCollection, analytics } = useFirebase();
  const unsubscribe = useRef<Function | undefined>();
  const [toSync, setToSync] = useState<string | undefined>();
  const [serverId, setServerId] = useState<string | undefined>();
  const [fluids, setFluids] = useState<Fluid[] | undefined>();
  const [user] = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return navigate("/login");
  }, []);

  useEffect(() => {
    if (!fluidsCollection.current || !serverId) return;
    if (unsubscribe.current) unsubscribe.current();
    if (analytics.current) {
      logEvent(analytics.current, "select_item", {
        serverId: serverId,
      });
    }

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

  async function getMoreRefills() {
    const response = await axios.get(`${useBackendUrl()}/createPayment`);
    window.location = response.data.url;
  }

  async function useRefill() {
    // TODO
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
        updateNotification({
          id: "create",
          message: "Created comment",
        });
      })
      .catch(() => {
        updateNotification({
          id: "create",
          message: "Failed to create document (out of edits)",
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
        updateNotification({
          id: "create",
          message: "Updated document",
        });
        setToSync(undefined);
      })
      .catch(() => {
        updateNotification({
          id: "update",
          message: "Failed to update document (out of edits)",
          color: "red",
        });
        setToSync(undefined);
      });
  }

  async function resetFluids() {
    if (!fluidsCollection.current || !serverId) return;

    const fluidsQuery = query(
      fluidsCollection.current,
      where("serverId", "==", serverId)
    );
    const snapshot = await getDocs(fluidsQuery);
    const array: Fluid[] = [];
    snapshot.forEach((doc) => {
      array.push({
        id: doc.id,
        ...doc.data(),
      } as Fluid);
    });
    setFluids(array);
    setToSync(undefined);
  }

  function deleteFluid(id: string) {
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
            updateNotification({
              id: "delete",
              message: "Deleted document",
            });
          })
          .catch(() => {
            updateNotification({
              id: "delete",
              message: "Failed to delete document (out of edits)",
              color: "red",
            });
          });
      })
      .catch(() => {
        updateNotification({
          id: "delete",
          message: "Failed to delete document (out of edits)",
          color: "red",
        });
      });
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
          </Table>

          <div className="buttons">
            {toSync && (
              <>
                <button onClick={resetFluids}>
                  <span className="material-symbols-outlined">restart_alt</span>
                </button>
                <button onClick={syncFluid}>
                  <span className="material-symbols-outlined">save</span>
                </button>
              </>
            )}
            <button onClick={createFluid}>
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </>
      )}

      <div className="refill-controls">
        <Button size="lg" onClick={useRefill}>
          Use refill
        </Button>
        <button className="get" onClick={getMoreRefills}>
          Need more?
          <span className="material-symbols-outlined">exposure_plus_1</span>
        </button>
      </div>
    </div>
  );
}
