// plugin.js - Using response.text() workaround
console.log("[Plugin] Loading...");

penpot.ui.open("Image URL Importer", "./pp-image-importer/ui.html", {
  width: 400,
  height: 300,
});
console.log("[Plugin] UI opened");

function sendToUI(type, detail) {
  console.log(`[Plugin → UI] ${type}:`, detail);
  try {
    penpot.ui.sendMessage({ type, detail });
  } catch (e) {
    console.error("[Plugin] sendToUI error:", e);
  }
}

// Convert base64 string to Uint8Array
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function importImageFromURL(imageUrl) {
  // Auto-prefix https if missing
  if (!/^https?:\/\//.test(imageUrl)) {
    imageUrl = `https://${imageUrl}`;
  }

  console.log("[Plugin] Starting import for:", imageUrl);
  sendToUI("import-progress", `Fetching URL:\n${imageUrl}`);

  // Validate URL format
  if (!/^https?:\/\/.+/.test(imageUrl)) {
    throw new Error("Invalid URL format");
  }

  // Use allorigins proxy which returns base64
  const corsProxy = "https://api.allorigins.win/raw?url=";
  const proxiedUrl = corsProxy + encodeURIComponent(imageUrl);

  console.log("[Plugin] Using CORS proxy:", proxiedUrl);
  sendToUI("import-progress", "Fetching via CORS proxy...");

  // Fetch via proxy
  let response;
  try {
    response = await fetch(proxiedUrl);
    console.log("[Plugin] Fetch status:", response.status);
    console.log("[Plugin] Response object:", response);
    console.log(
      "[Plugin] Available methods:",
      Object.getOwnPropertyNames(Object.getPrototypeOf(response))
    );
  } catch (err) {
    throw new Error(`Fetch error: ${err.message || err}`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Try response.text()
  let textData;
  try {
    console.log("[Plugin] Trying response.text()...");
    textData = await response.text();
    console.log("[Plugin] Text data length:", textData.length);
  } catch (err) {
    throw new Error(`Text error: ${err.message || err}`);
  }

  // Convert text to Uint8Array (binary data as string)
  let uint8;
  try {
    console.log("[Plugin] Converting text to Uint8Array...");
    const len = textData.length;
    uint8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      uint8[i] = textData.charCodeAt(i) & 0xff;
    }
    console.log("[Plugin] Uint8Array length:", uint8.byteLength);
  } catch (err) {
    throw new Error(`Conversion error: ${err.message || err}`);
  }

  // Detect MIME type from first bytes
  let mime = "image/png";
  if (uint8[0] === 0xff && uint8[1] === 0xd8 && uint8[2] === 0xff) {
    mime = "image/jpeg";
  } else if (uint8[0] === 0x47 && uint8[1] === 0x49 && uint8[2] === 0x46) {
    mime = "image/gif";
  } else if (
    uint8[0] === 0x89 &&
    uint8[1] === 0x50 &&
    uint8[2] === 0x4e &&
    uint8[3] === 0x47
  ) {
    mime = "image/png";
  }
  console.log("[Plugin] Detected MIME type:", mime);

  sendToUI(
    "import-progress",
    `Uploading ${uint8.byteLength.toLocaleString()} bytes...`
  );

  // Upload to Penpot
  let imageMedia;
  try {
    console.log("[Plugin] Calling uploadMediaData...");
    imageMedia = await penpot.uploadMediaData("image", uint8, mime);
    console.log("[Plugin] uploadMediaData success:", imageMedia);
  } catch (err) {
    throw new Error(`uploadMediaData failed: ${err.message || err}`);
  }

  // Create rectangle and apply fill
  try {
    console.log("[Plugin] Creating rectangle and applying image fill...");
    const rect = penpot.createRectangle();
    rect.resize(600, 400);
    rect.x = 100;
    rect.y = 100;
    rect.fills = [{ fillOpacity: 1, fillImage: imageMedia }];
    console.log("[Plugin] Rectangle created");
  } catch (err) {
    throw new Error(`Canvas error: ${err.message || err}`);
  }

  sendToUI("import-success", "Image imported successfully!");
  console.log("[Plugin] Import complete");
}

penpot.ui.onMessage((message) => {
  console.log("[Plugin] Received raw message:", message);
  const msg = message.pluginMessage || message;
  console.log("[Plugin] Extracted message:", msg);

  if (msg.type === "import-image-url") {
    console.log("[Plugin] Processing import for URL:", msg.url);
    importImageFromURL(msg.url).catch((err) => {
      console.error("[Plugin] ERROR:", err);
      sendToUI("import-error", `Failed: ${err.message || err}`);
    });
  } else {
    console.log("[Plugin] Ignored message type:", msg.type || msg.command);
  }
});

console.log("[Plugin] Message listener registered");
