const express = require("express");

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 10000;
const API_KEY = process.env.SHADOWHAT_API_KEY || "";
const WA_TOKEN = process.env.WHATSAPP_CLOUD_API_TOKEN || "";
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";

function authorize(req, res, next) {
  if (!API_KEY) return next();

  const supplied = req.get("x-api-key") || "";
  if (supplied !== API_KEY) {
    return res.status(401).json({ error: "No autorizado" });
  }
  next();
}

app.get("/", (req, res) => {
  res.json({
    name: "SHADOWHAT Cloud",
    status: "online",
    message: "Servidor iniciado"
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/verify", authorize, (req, res) => {
  res.json({
    connected: true,
    service: "SHADOWHAT Cloud",
    whatsappConfigured: Boolean(WA_TOKEN && PHONE_ID)
  });
});

app.post("/api/whatsapp/template", authorize, async (req, res) => {
  if (!WA_TOKEN || !PHONE_ID) {
    return res.status(503).json({
      error: "Falta configurar las credenciales de WhatsApp Cloud API"
    });
  }

  const { to, templateName, languageCode = "es" } = req.body || {};

  if (
    typeof to !== "string" ||
    !/^\+?[1-9]\d{7,14}$/.test(to) ||
    typeof templateName !== "string" ||
    !/^[a-zA-Z0-9_]+$/.test(templateName)
  ) {
    return res.status(400).json({
      error: "Se requiere un teléfono válido y un nombre de plantilla válido"
    });
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to.replace(/^\+/, ""),
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode }
          }
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "WhatsApp Cloud API rechazó la solicitud",
        details: result
      });
    }

    return res.json({
      accepted: true,
      result
    });
  } catch {
    return res.status(502).json({
      error: "No se pudo contactar con WhatsApp Cloud API"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SHADOWHAT Cloud escuchando en el puerto ${PORT}`);
});
