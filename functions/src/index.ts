import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { defineSecret, defineString } from "firebase-functions/params";
const stripeModule = require("stripe");
const cors = require("cors")({ origin: true });

let stripe: any | undefined;
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const FRONTEND_URL = defineString("FRONTEND_URL");
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

export const createPayment = functions
  .runWith({ secrets: ["STRIPE_SECRET_KEY"] })
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!stripe) stripe = stripeModule(STRIPE_SECRET_KEY.value());

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "EUR",
              product_data: {
                name: "Automod Refill",
              },
              unit_amount: 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${FRONTEND_URL.value()}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_URL.value()}/cancel`,
      });
      functions.logger.log("c4");
      res.json({ url: session.url });
    });
  });

export const completePayment = functions
  .runWith({ secrets: ["STRIPE_SECRET_KEY"] })
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!stripe) stripe = stripeModule(STRIPE_SECRET_KEY.value());

      const session = await stripe.checkout.sessions.retrieve(req.query.id);
      if (!session) res.status(404).json({ response: "Not found" });
      // TODO: update refill collection
      res.json({ response: "Success" });
    });
  });
