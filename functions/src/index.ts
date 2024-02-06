import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  defineSecret,
  defineString,
} from "firebase-functions/params";
import axios from "axios";
const cors = require("cors")({ origin: true });

const FRONTEND_URL = defineString("FRONTEND_URL");
const DISCORD_CLIENT_ID = defineString("DISCORD_CLIENT_ID");
const DISCORD_CLIENT_SECRET = defineSecret("DISCORD_CLIENT_SECRET");
admin.initializeApp();

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
        return res.status(500).json({
          response: "Internal Server Error",
          description: e.response.data,
        });
      }
    });
  });
