import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();
const editsCollection = db.collection("edits");

export const markEdit = functions.firestore
  .document("/fluids/{docId}")
  .onWrite(async (snap, context) => {
    if (context.eventType === "google.firestore.document.delete") {
      functions.logger.log("Skipping DELETE event");
      return Promise.resolve("Skipped");
    }

    let uid: string | undefined;
    if (snap.after.exists) uid = snap.after.data()!!.uid;
    else if (snap.before.exists) uid = snap.before.data()!!.uid;
    if (!uid) {
      functions.logger.log("UID not found");
      return Promise.reject("UID not found");
    }

    return editsCollection.doc(uid).set(
      {
        last: Date.now().toString(),
      },
      { merge: true }
    );
  });
