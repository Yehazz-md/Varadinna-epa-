import fs from "fs";
import pino from "pino";
import pn from "awesome-phonenumber";
import {
  makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";

function removeFile(FilePath) {
  try {
    if (fs.existsSync(FilePath)) fs.rmSync(FilePath, { recursive: true, force: true });
  } catch (e) {
    console.error("Error removing file:", e);
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method not allowed");

  let num = req.query.number;
  let dirs = "/tmp/" + (num || "session");

  removeFile(dirs);

  num = num.replace(/[^0-9]/g, "");
  const phone = pn("+" + num);
  if (!phone.isValid()) {
    return res.status(400).json({ code: "Invalid phone number" });
  }
  num = phone.getNumber("e164").replace("+", "");

  async function initiateSession() {
    const { state, saveCreds } = await useMultiFileAuthState(dirs);
    try {
      const { version } = await fetchLatestBaileysVersion();
      let sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.windows("Chrome"),
      });

      if (!sock.authState.creds.registered) {
        await delay(2000);
        try {
          let code = await sock.requestPairingCode(num);
          code = code?.match(/.{1,4}/g)?.join("-") || code;
          return res.json({ code });
        } catch (err) {
          return res.status(503).json({ code: "Failed to get pairing code" });
        }
      }
      sock.ev.on("creds.update", saveCreds);
    } catch {
      return res.status(503).json({ code: "Service Unavailable" });
    }
  }
  await initiateSession();
}
