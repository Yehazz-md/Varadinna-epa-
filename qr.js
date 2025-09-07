import fs from "fs";
import pino from "pino";
import QRCode from "qrcode";
import {
  makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  Browsers,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";

function removeFile(FilePath) {
  try {
    if (fs.existsSync(FilePath)) fs.rmSync(FilePath, { recursive: true, force: true });
  } catch {}
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method not allowed");

  const sessionId = Date.now().toString();
  const dirs = `/tmp/qr_${sessionId}`;

  if (!fs.existsSync(dirs)) fs.mkdirSync(dirs, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(dirs);
  try {
    const { version } = await fetchLatestBaileysVersion();
    let sock = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      browser: Browsers.windows("Chrome"),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
      },
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, qr } = update;
      if (qr) {
        const qrDataURL = await QRCode.toDataURL(qr, { margin: 1 });
        return res.json({
          qr: qrDataURL,
          instructions: [
            "1. Open WhatsApp on your phone",
            "2. Go to Settings > Linked Devices",
            "3. Tap 'Link a Device'",
            "4. Scan the QR code above",
          ],
        });
      }
      if (connection === "open") {
        setTimeout(() => removeFile(dirs), 10000);
      }
    });

    sock.ev.on("creds.update", saveCreds);

    setTimeout(() => {
      res.status(408).json({ code: "QR generation timeout" });
      removeFile(dirs);
    }, 30000);
  } catch {
    removeFile(dirs);
    return res.status(503).json({ code: "Service Unavailable" });
  }
}
