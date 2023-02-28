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
  increment,
  setDoc,
} from "firebase/firestore";
import { useUser } from "../../hooks/useUser";
import { Button, Checkbox, Input, Table } from "@mantine/core";
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
  caseSensitive: boolean;
  serverId: string;
  solid: boolean;
  [key: string]: string | number | boolean;
}

interface Edit {
  last: number;
  refills: number;
}

const MILLIS_TO_DAYS = 1000 * 60 * 60 * 24;

export function Home() {
  const { fluidsCollection, editsCollection, analytics } = useFirebase();
  const unsubscribe = useRef<Function | undefined>();
  const [toSync, setToSync] = useState<string | undefined>();
  const [serverId, setServerId] = useState<string | undefined>();
  const [fluids, setFluids] = useState<Fluid[] | undefined>();
  const [edit, setEdit] = useState<Edit | undefined>();
  const [user] = useUser(true);

  useEffect(() => {
    if (!user || !editsCollection.current)
      return showNotification({
        message: "Couldn't find user or collection",
        color: "red",
      });

    onSnapshot(doc(editsCollection.current, user.id), (doc) => {
      setEdit(doc.data() as Edit);
    });
  }, []);

  useEffect(() => {
    if (!fluidsCollection.current)
      return showNotification({
        message: "Couldn't find collection",
        color: "red",
      });
    if (!serverId) return;
    if (unsubscribe.current) unsubscribe.current();
    if (analytics.current)
      logEvent(analytics.current, "select_item", {
        serverId: serverId,
      });

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

  function getMoreRefills() {
    axios
      .get(`${useBackendUrl()}/createPayment`)
      .then((response) => {
        window.location.assign(response.data.url);
      })
      .catch(() => {
        showNotification({ message: "Couldn't fetch server", color: "red" });
      });
  }

  async function useRefill() {
    if (!edit)
      return showNotification({
        message: "Couldn't find edit record",
        color: "red",
      });
    if (!editsCollection.current || !user)
      return showNotification({
        message: "Couldn't find user or collection",
        color: "red",
      });
    if (edit.refills <= 0)
      return showNotification({
        message: "Not enough refills",
        color: "red",
      });
    if (
      Math.floor(edit.last / MILLIS_TO_DAYS) !==
      Math.floor(Date.now() / MILLIS_TO_DAYS)
    )
      return showNotification({
        message: "Edit is ready",
        color: "red",
      });

    showNotification({
      id: "refill",
      message: "Refilling edit...",
      loading: true,
    });
    updateDoc(doc(editsCollection.current, user.id), {
      last: 0,
      refills: increment(-1),
    })
      .then(() => {
        updateNotification({
          id: "refill",
          message: "Edit refilled",
        });
      })
      .catch((_) => {
        updateNotification({
          id: "refill",
          message: "Couldn't refill",
          color: "red",
        });
      });
  }

  function markEdit() {
    if (!editsCollection.current || !user)
      return showNotification({
        message: "Couldn't find collection or user",
        color: "red",
      });

    updateDoc(doc(editsCollection.current, user.id), {
      last: Date.now(),
    }).catch(() => {
      if (!editsCollection.current)
        return showNotification({
          message: "Couldn't find collection",
          color: "red",
        });

      setDoc(doc(editsCollection.current, user.id), {
        last: Date.now(),
        refills: 1,
      });
    });
  }

  function createFluid() {
    if (!fluidsCollection.current)
      return showNotification({ message: "Couldn't find collection" });

    showNotification({
      id: "create",
      message: "Creating document...",
      loading: true,
    });
    addDoc(fluidsCollection.current, {
      cause: "you're",
      echo: "gay",
      rank: 1,
      caseSensitive: false,
      serverId: serverId,
      solid: false,
      uid: user!!.id,
    })
      .then(() => {
        markEdit();
        updateNotification({
          id: "create",
          message: "Created comment",
        });
      })
      .catch(() => {
        updateNotification({
          id: "create",
          message: "Couldn't create document (edit not ready)",
          color: "red",
        });
      });
  }

  function changeFluid(
    id: string,
    key: string,
    value: string | number | boolean
  ) {
    if (!fluids || !fluidsCollection)
      return showNotification({
        message: "Couldn't find fluids or collection",
        color: "red",
      });
    const fluidIndex = fluids.findIndex((fluid) => fluid.id === id);
    if (fluidIndex < 0)
      return showNotification({ message: "Couldn't find fluid", color: "red" });
    if (toSync && toSync !== id) return;

    fluids[fluidIndex][key] = value;
    setFluids([...fluids]);
    setToSync(id);
  }

  function syncFluid() {
    if (!fluidsCollection.current || !toSync || !fluids)
      return showNotification({
        message: "Couldn't find fluids or syncing fluid or collection",
        color: "red",
      });

    showNotification({
      id: "update",
      message: "Updating document...",
      loading: true,
    });
    const fluid = fluids.find((fluid) => fluid.id === toSync);
    const fluidDoc = doc(fluidsCollection.current!!, toSync);
    if (!fluid)
      return updateNotification({
        id: "update",
        message: "Couldn't find syncing fluid",
        color: "red",
      });

    updateDoc(fluidDoc, {
      cause: fluid.cause,
      echo: fluid.echo,
      rank: fluid.rank,
      caseSensitive: fluid.caseSensitive,
      serverId: fluid.serverId,
      uid: user!!.id,
    })
      .then(() => {
        markEdit();
        updateNotification({
          id: "update",
          message: "Updated document",
        });
        setToSync(undefined);
      })
      .catch(() => {
        updateNotification({
          id: "update",
          message: "Couldn't update document (edit not ready)",
          color: "red",
        });
        setToSync(undefined);
      });
  }

  async function resetFluids() {
    if (!fluidsCollection.current || !serverId)
      return showNotification({
        message: "Couldn't find collection or server ID",
        color: "red",
      });

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
    if (!fluidsCollection.current)
      return showNotification({
        message: "Couldn't find collection",
        color: "red",
      });

    const fluidDoc = doc(fluidsCollection.current, id);
    showNotification({
      id: "delete",
      message: "Deleting document...",
      loading: true,
    });
    deleteDoc(fluidDoc)
      .then(() => {
        markEdit();
        updateNotification({
          id: "delete",
          message: "Deleted document",
        });
      })
      .catch(() => {
        updateNotification({
          id: "delete",
          message: "Couldn't delete document (edit not ready)",
          color: "red",
        });
      });
  }

  return (
    <div className="home">
      {edit && (
        <p className="edit">
          Edit{" "}
          {Math.floor(edit.last / MILLIS_TO_DAYS) ===
            Math.floor(Date.now() / MILLIS_TO_DAYS) && "not "}
          ready
        </p>
      )}

      <div className="refill-controls">
        <Button size="lg" onClick={useRefill}>
          Use refill
        </Button>
        <button className="get" onClick={getMoreRefills}>
          {edit && (
            <>
              You have {edit?.refills}
              <br />
            </>
          )}
          Need more?
          <span className="material-symbols-outlined">exposure_plus_1</span>
        </button>
      </div>

      <div className="wrapper">
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
                  <th>Case Sensitive</th>
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
                    <td className="centered">
                      <Checkbox
                        checked={fluid.caseSensitive}
                        placeholder="Case Sensitive"
                        disabled={getDisabled(fluid)}
                        onChange={(event) =>
                          changeFluid(
                            fluid.id,
                            "caseSensitive",
                            event.target.checked
                          )
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
          </>
        )}

        <div className="buttons">
          {serverId && toSync && (
            <>
              <button onClick={resetFluids}>
                <span className="material-symbols-outlined">restart_alt</span>
              </button>
              <button onClick={syncFluid}>
                <span className="material-symbols-outlined">save</span>
              </button>
            </>
          )}
          {serverId && (
            <button onClick={createFluid}>
              <span className="material-symbols-outlined">add</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
