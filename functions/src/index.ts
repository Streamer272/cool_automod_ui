import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  defineInt,
  defineSecret,
  defineString,
} from "firebase-functions/params";
import axios from "axios";
const stripeModule = require("stripe");
const cors = require("cors")({ origin: true });

let stripe: any | undefined;
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const FRONTEND_URL = defineString("FRONTEND_URL");
const STRIPE_PRICE_ID = defineString("STRIPE_PRICE_ID");
const REFILLS_COUNT = defineInt("REFILLS_COUNT");
const DISCORD_CLIENT_ID = defineString("DISCORD_CLIENT_ID");
const DISCORD_CLIENT_SECRET = defineSecret("DISCORD_CLIENT_SECRET");
admin.initializeApp();
const db = admin.firestore();
const editsCollection = db.collection("edits");

export const markEdit = functions.firestore
  .document("/fluids/{docId}")
  .onWrite(async (snap, context) => {
    if (context.eventType === "google.firestore.document.delete")
      return Promise.resolve("Skipped");

    let uid: string | undefined;
    if (snap.after.exists) uid = snap.after.data()!!.uid;
    else if (snap.before.exists) uid = snap.before.data()!!.uid;
    if (!uid) {
      functions.logger.log("UID not found");
      return Promise.reject("UID not found");
    }

    try {
      editsCollection.doc(uid).update({ last: Date.now() });
    } catch (_) {
      editsCollection.doc(uid).set({ last: Date.now(), refills: 0 });
    }

    return Promise.resolve("Updated");
  });

export const createPayment = functions
  .runWith({ secrets: ["STRIPE_SECRET_KEY"] })
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!stripe) stripe = stripeModule(STRIPE_SECRET_KEY.value());

      functions.logger.log("Creating checkout session");
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: STRIPE_PRICE_ID.value(),
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${FRONTEND_URL.value()}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_URL.value()}/cancel`,
      });
      res.json({ url: session.url });
    });
  });

export const completePayment = functions
  .runWith({ secrets: ["STRIPE_SECRET_KEY"] })
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!stripe) stripe = stripeModule(STRIPE_SECRET_KEY.value());
      if (!req.query.id || !req.query.uid || typeof req.query.uid !== "string")
        return res
          .status(400)
          .json({ response: "ID or UID missing or invalid" });

      const session = await stripe.checkout.sessions.retrieve(req.query.id);
      if (!session) return res.status(404).json({ response: "Not found" });

      try {
        const editsDoc = await editsCollection.doc(req.query.uid).get();
        if (editsDoc.data()?.session === req.query.id) {
          functions.logger.log("Disallowed reuse of Stripe Session ID");
          return res.status(400).json({ response: "Session ID used" });
        }
      } catch (_) {}

      try {
        editsCollection.doc(req.query.uid).update({
          refills: admin.firestore.FieldValue.increment(REFILLS_COUNT.value()),
          session: req.query.id,
        });
      } catch (_) {
        editsCollection.doc(req.query.uid).set({
          last: 0,
          refills: REFILLS_COUNT.value(),
          session: req.query.id,
        });
      }

      return res.json({ response: "Success" });
    });
  });

export const discordLogin = functions
  .runWith({ secrets: ["DISCORD_CLIENT_SECRET"] })
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!req.query.code)
        return res.status(400).json({ response: "Missing CODE" });

      try {
        const token = await axios.post(
          "https://discord.com/api/v10/oauth2/token",
          {
            client_id: DISCORD_CLIENT_ID.value(),
            client_secret: DISCORD_CLIENT_SECRET.value(),
            grant_type: "authorization_code",
            redirect_uri: `${FRONTEND_URL.value()}/login`,
            scope: "identify",
            code: req.query.code,
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        const user = await axios.get("https://discord.com/api/users/@me", {
          headers: {
            Authorization: `${token.data.token_type} ${token.data.access_token}`,
          },
        });
        return res.json({ id: user.data.id });
      } catch (e: any) {
        functions.logger.log("E", e.response.data);
        return res
          .status(500)
          .json({
            response: "Internal Server Error",
            description: e.response.data,
          });
      }
    });
  });
