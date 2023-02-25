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

    const edit = await editsCollection.where("uid", "==", uid).limit(1).get();
    if (edit.empty) {
      functions.logger.log("Empty edit snapshot");
      return editsCollection.add({
        uid: uid,
        last: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return editsCollection.doc(edit.docs[0].id).update({
      last: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
