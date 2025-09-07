export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      message: "Yehazz-MD Bot API is running 🚀",
      endpoints: ["/api/pair", "/api/qr"],
    });
  }

  res.status(405).json({ error: "Method not allowed" });
}
