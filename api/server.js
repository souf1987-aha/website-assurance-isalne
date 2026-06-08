const express = require("express");
const multer = require("multer");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const app = express();
app.set("trust proxy", true);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 8,
    fileSize: 5 * 1024 * 1024,
    fieldSize: 1024 * 1024,
  },
});

const port = Number(process.env.PORT || 3000);
const graphVersion = process.env.WHATSAPP_API_VERSION || "v22.0";
const token = process.env.WHATSAPP_TOKEN || "";
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const fallbackRecipient = process.env.WHATSAPP_TO || "212661744550";
const recipientByType = {
  request: process.env.WHATSAPP_TO_REQUEST || fallbackRecipient,
  claim: process.env.WHATSAPP_TO_CLAIM || fallbackRecipient,
};
const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr";
const claimHasDocumentHeader = String(process.env.WHATSAPP_TEMPLATE_CLAIM_HAS_DOCUMENT_HEADER || "").toLowerCase() === "true";

const templateByType = {
  request: process.env.WHATSAPP_TEMPLATE_REQUEST_NAME || process.env.WHATSAPP_TEMPLATE_DEVIS_NAME || "",
  claim: process.env.WHATSAPP_TEMPLATE_CLAIM_NAME || "",
};

const templateParamsByType = {
  request: process.env.WHATSAPP_TEMPLATE_REQUEST_PARAMS || "message",
  claim: process.env.WHATSAPP_TEMPLATE_CLAIM_PARAMS || "message",
};
const rateLimitMaxRequests = Number(process.env.WHATSAPP_RATE_LIMIT_MAX_REQUESTS || 5);
const rateLimitWindowMs = Number(process.env.WHATSAPP_RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000;
const rateLimitBlockMs = Number(process.env.WHATSAPP_RATE_LIMIT_BLOCK_MINUTES || 60) * 60 * 1000;
const rateLimitStore = new Map();

app.use(express.json({ limit: "1mb" }));

const sendJson = (res, status, payload) => {
  res.status(status).type("application/json; charset=utf-8").set("Cache-Control", "no-store").send(payload);
};

const getClientIp = (req) => {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwardedFor || req.ip || req.socket.remoteAddress || "unknown";
};

const whatsappRateLimiter = (req, res, next) => {
  if (!rateLimitMaxRequests || rateLimitMaxRequests < 1) {
    next();
    return;
  }

  const now = Date.now();
  const ip = getClientIp(req);
  const current = rateLimitStore.get(ip);

  if (current?.blockedUntil && current.blockedUntil > now) {
    const retryAfter = Math.ceil((current.blockedUntil - now) / 1000);
    res.set("Retry-After", String(retryAfter));
    sendJson(res, 429, {
      ok: false,
      error: "Trop de demandes ont ete envoyees depuis cette adresse IP. Veuillez reessayer plus tard.",
      retryAfter,
    });
    return;
  }

  const windowStart = current?.windowStart && now - current.windowStart < rateLimitWindowMs ? current.windowStart : now;
  const count = windowStart === current?.windowStart ? current.count + 1 : 1;
  const nextRecord = { windowStart, count, blockedUntil: 0 };

  if (count > rateLimitMaxRequests) {
    nextRecord.blockedUntil = now + rateLimitBlockMs;
    nextRecord.count = rateLimitMaxRequests;
    rateLimitStore.set(ip, nextRecord);
    res.set("Retry-After", String(Math.ceil(rateLimitBlockMs / 1000)));
    sendJson(res, 429, {
      ok: false,
      error: "Trop de demandes ont ete envoyees depuis cette adresse IP. Veuillez reessayer plus tard.",
      retryAfter: Math.ceil(rateLimitBlockMs / 1000),
    });
    return;
  }

  rateLimitStore.set(ip, nextRecord);

  if (rateLimitStore.size > 5000) {
    for (const [key, record] of rateLimitStore.entries()) {
      const expiredWindow = now - record.windowStart > rateLimitWindowMs;
      const expiredBlock = !record.blockedUntil || record.blockedUntil < now;
      if (expiredWindow && expiredBlock) {
        rateLimitStore.delete(key);
      }
    }
  }

  next();
};

const getTemplateParamKeys = (type) => {
  const raw = String(templateParamsByType[type] || "").trim();
  if (!raw || raw.toLowerCase() === "none") return [];

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const sanitizeTemplateText = (value) => {
  const normalized = String(value || "").trim();
  return normalized.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ") || "Non renseigné";
};

const getTemplateParamValue = (key, { message, fields }) => {
  const value = Object.prototype.hasOwnProperty.call(fields || {}, key) ? fields[key] : key === "message" ? message : "";
  return sanitizeTemplateText(value).slice(0, 1024);
};

const buildBodyComponent = (type, options) => {
  const paramKeys = getTemplateParamKeys(type);
  if (!paramKeys.length) return undefined;

  return {
    type: "body",
    parameters: paramKeys.map((key) => ({
      type: "text",
      text: getTemplateParamValue(key, options),
    })),
  };
};

const buildTemplateComponents = (type, options = {}) => {
  const components = [];

  if (type === "claim" && claimHasDocumentHeader && options.documentMediaId) {
    components.push({
      type: "header",
      parameters: [
        {
          type: "document",
          document: {
            id: options.documentMediaId,
            filename: options.documentFilename || "dossier-sinistre.pdf",
          },
        },
      ],
    });
  }

  const bodyComponent = buildBodyComponent(type, options);
  if (bodyComponent) {
    components.push(bodyComponent);
  }

  return components.length ? components : undefined;
};

const buildMetaPayload = ({ type, message, fields, to, documentMediaId, documentFilename }) => {
  const recipient = String(to || recipientByType[type] || fallbackRecipient).replace(/[^\d]/g, "");
  const templateName = templateByType[type] || "";

  if (templateName) {
    const components = buildTemplateComponents(type, { message, fields, documentMediaId, documentFilename });
    const template = {
      name: templateName,
      language: { code: templateLanguage },
    };

    if (components) {
      template.components = components;
    }

    return {
      messaging_product: "whatsapp",
      to: recipient,
      type: "template",
      template,
    };
  }

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: {
      preview_url: false,
      body: message,
    },
  };
};

const assertWhatsAppConfig = () => {
  if (!token || !phoneNumberId) {
    const missing = [
      !token ? "WHATSAPP_TOKEN" : "",
      !phoneNumberId ? "WHATSAPP_PHONE_NUMBER_ID" : "",
    ].filter(Boolean);
    const error = new Error(`Configuration WhatsApp manquante: ${missing.join(", ")}`);
    error.status = 500;
    throw error;
  }
};

const callMeta = async (url, options) => {
  assertWhatsAppConfig();

  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result?.error?.message || "Erreur Meta WhatsApp Cloud API");
    error.status = response.status;
    error.meta = result;
    throw error;
  }

  return result;
};

const sendWhatsApp = (payload) =>
  callMeta(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

const uploadWhatsAppDocument = async (buffer, filename) => {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append("file", new Blob([buffer], { type: "application/pdf" }), filename);

  const result = await callMeta(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  return result.id;
};

const drawWrappedText = (page, text, x, y, options = {}) => {
  const { font, size = 10, color = rgb(0.08, 0.13, 0.2), maxWidth = 500, lineHeight = 14 } = options;
  const words = String(text || "").split(/\s+/);
  let line = "";
  let cursorY = y;

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, size);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: cursorY, size, font, color });
      cursorY -= lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  });

  if (line) {
    page.drawText(line, { x, y: cursorY, size, font, color });
    cursorY -= lineHeight;
  }

  return cursorY;
};

const appendClaimSummary = async (pdfDoc, fields) => {
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let y = 790;

  page.drawText("Dossier de déclaration de sinistre", {
    x: 48,
    y,
    size: 18,
    font: bold,
    color: rgb(0.02, 0.3, 0.52),
  });
  y -= 32;

  const rows = [
    ["Nom", fields.name],
    ["Téléphone", fields.phone],
    ["Produit", fields.product],
    ["Date du sinistre", fields.claim_date],
    ["Lieu", fields.claim_place],
    ["Immatriculation", fields.registration],
    ["Description", fields.message],
  ];

  rows.forEach(([label, value]) => {
    page.drawText(`${label} :`, { x: 48, y, size: 11, font: bold, color: rgb(0.08, 0.13, 0.2) });
    y = drawWrappedText(page, sanitizeTemplateText(value), 170, y, {
      font,
      size: 11,
      maxWidth: 360,
      lineHeight: 15,
    });
    y -= 6;
  });
};

const appendImagePage = async (pdfDoc, file) => {
  const image = isPng(file.buffer) ? await pdfDoc.embedPng(file.buffer) : await pdfDoc.embedJpg(file.buffer);
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = image.scale(1);
  const maxWidth = 515;
  const maxHeight = 730;
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  const drawWidth = width * ratio;
  const drawHeight = height * ratio;

  page.drawText(file.originalname.slice(0, 80), {
    x: 40,
    y: 795,
    size: 11,
    font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    color: rgb(0.08, 0.13, 0.2),
  });
  page.drawImage(image, {
    x: (595.28 - drawWidth) / 2,
    y: (760 - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  });
};

const isPdf = (buffer) => buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF";

const isPng = (buffer) =>
  buffer.length >= 8 &&
  buffer[0] === 0x89 &&
  buffer[1] === 0x50 &&
  buffer[2] === 0x4e &&
  buffer[3] === 0x47 &&
  buffer[4] === 0x0d &&
  buffer[5] === 0x0a &&
  buffer[6] === 0x1a &&
  buffer[7] === 0x0a;

const isJpeg = (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

const hasAcceptedExtension = (filename = "") => /\.(pdf|png|jpe?g)$/i.test(filename);

const appendUnsupportedFilePage = async (pdfDoc, file, reason) => {
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let y = 790;

  page.drawText("Pièce jointe non intégrée", {
    x: 48,
    y,
    size: 16,
    font: bold,
    color: rgb(0.73, 0.05, 0.18),
  });
  y -= 32;
  y = drawWrappedText(page, `Fichier : ${file.originalname || "Sans nom"}`, 48, y, {
    font,
    size: 11,
    maxWidth: 500,
    lineHeight: 16,
  });
  y -= 8;
  drawWrappedText(page, `Motif : ${reason}`, 48, y, {
    font,
    size: 11,
    maxWidth: 500,
    lineHeight: 16,
  });
};

const appendPdfPages = async (pdfDoc, file) => {
  const source = await PDFDocument.load(file.buffer);
  const pages = await pdfDoc.copyPages(source, source.getPageIndices());
  pages.forEach((page) => pdfDoc.addPage(page));
};

const createClaimPdf = async (fields, files) => {
  const pdfDoc = await PDFDocument.create();
  await appendClaimSummary(pdfDoc, fields);

  for (const file of files) {
    try {
      if (!hasAcceptedExtension(file.originalname)) {
        await appendUnsupportedFilePage(pdfDoc, file, "Format non accepté. Formats acceptés : PDF, PNG, JPG, JPEG.");
      } else if (isPdf(file.buffer)) {
        await appendPdfPages(pdfDoc, file);
      } else if (isPng(file.buffer) || isJpeg(file.buffer)) {
        await appendImagePage(pdfDoc, file);
      } else {
        await appendUnsupportedFilePage(
          pdfDoc,
          file,
          "Le fichier porte une extension acceptée, mais son contenu ne correspond pas à un PDF, PNG ou JPEG valide."
        );
      }
    } catch (error) {
      await appendUnsupportedFilePage(pdfDoc, file, `Lecture impossible : ${error.message || "fichier invalide"}.`);
    }
  }

  return Buffer.from(await pdfDoc.save());
};

const normalizeBodyFields = (body) => {
  const fields = {};
  Object.entries(body || {}).forEach(([key, value]) => {
    fields[key] = Array.isArray(value) ? value.join(", ") : String(value || "");
  });
  fields.registration = sanitizeTemplateText(fields.registration) === "Non renseigné" ? "-" : fields.registration;
  return fields;
};

const buildClaimMessage = (fields) =>
  [
    "Bonjour Assurances Islane,",
    "",
    "Je souhaite déclarer un sinistre depuis le site web.",
    "",
    `Nom: ${fields.name || ""}`,
    `Téléphone: ${fields.phone || ""}`,
    `Produit: ${fields.product || ""}`,
    `Date du sinistre: ${fields.claim_date || ""}`,
    `Lieu du sinistre: ${fields.claim_place || ""}`,
    `Immatriculation: ${fields.registration || ""}`,
    `Description: ${fields.message || ""}`,
  ].join("\n");

const handleError = (res, error) => {
  console.error("[whatsapp-api]", error);
  if (error.meta) {
    console.error("[whatsapp-api-meta]", JSON.stringify(error.meta, null, 2));
  }
  sendJson(res, error.status || 500, {
    ok: false,
    error: error.message || "Erreur serveur.",
    meta: error.meta,
  });
};

app.get(["/health", "/api/health"], (req, res) => {
  sendJson(res, 200, { ok: true });
});

app.use("/api/whatsapp", whatsappRateLimiter);

app.post("/api/whatsapp/request", async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();

    if (!message) {
      sendJson(res, 400, { ok: false, error: "Message requis." });
      return;
    }

    const metaPayload = buildMetaPayload({
      type: "request",
      message,
      fields: req.body.fields || {},
      to: req.body.to,
    });
    const meta = await sendWhatsApp(metaPayload);
    sendJson(res, 200, { ok: true, meta });
  } catch (error) {
    handleError(res, error);
  }
});

app.post(
  "/api/whatsapp/claim",
  upload.fields([
    { name: "constat", maxCount: 1 },
    { name: "carte_grise", maxCount: 1 },
    { name: "assurance", maxCount: 1 },
    { name: "attachments", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const fields = normalizeBodyFields(req.body);
      const files = Object.values(req.files || {}).flat();
      const message = buildClaimMessage(fields);
      let documentMediaId;
      let documentFilename;

      if (claimHasDocumentHeader) {
        documentFilename = `dossier-sinistre-${Date.now()}.pdf`;
        const pdfBuffer = await createClaimPdf(fields, files);
        documentMediaId = await uploadWhatsAppDocument(pdfBuffer, documentFilename);
      }

      const metaPayload = buildMetaPayload({
        type: "claim",
        message,
        fields,
        to: fields.to,
        documentMediaId,
        documentFilename,
      });
      const meta = await sendWhatsApp(metaPayload);
      sendJson(res, 200, { ok: true, meta, document: Boolean(documentMediaId) });
    } catch (error) {
      handleError(res, error);
    }
  }
);

app.use((req, res) => {
  sendJson(res, 404, { ok: false, error: "Route introuvable." });
});

app.listen(port, () => {
  console.log(`WhatsApp API backend listening on port ${port}`);
});
