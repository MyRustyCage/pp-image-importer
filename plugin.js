// plugin.js - FINAL VERSION: With CORS proxy option
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

  // Use CORS proxy to bypass CORS restrictions
  const corsProxy = "https://corsproxy.io/?";
  const proxiedUrl = corsProxy + encodeURIComponent(imageUrl);

  console.log("[Plugin] Using CORS proxy:", proxiedUrl);
  sendToUI("import-progress", "Fetching via CORS proxy...");

  // Fetch via proxy
  let response;
  try {
    response = await fetch(proxiedUrl);
    console.log("[Plugin] Fetch status:", response.status);
  } catch (err) {
    throw new Error(`Fetch error: ${err.message || err}`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Read as Blob
  let blob;
  try {
    console.log("[Plugin] Converting to Blob...");
    blob = await response.blob();
    console.log("[Plugin] Blob size:", blob.size, "type:", blob.type);
  } catch (err) {
    throw new Error(`Blob error: ${err.message || err}`);
  }

  const mime = blob.type || "image/png";
  if (!mime.startsWith("image/")) {
    sendToUI("import-progress", `Warning: content-type "${mime}". Proceeding.`);
    console.warn("[Plugin] Non-image MIME:", mime);
  }

  // Convert Blob to Uint8Array
  let arrayBuffer;
  try {
    console.log("[Plugin] Converting Blob to ArrayBuffer...");
    arrayBuffer = await blob.arrayBuffer();
  } catch (err) {
    throw new Error(`ArrayBuffer error: ${err.message || err}`);
  }
  const uint8 = new Uint8Array(arrayBuffer);
  console.log("[Plugin] Uint8Array length:", uint8.byteLength);

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
      sendToUI(
        "import-error",
        `Failed: ${
          err.message || err
        }\n\nNote: This plugin uses a CORS proxy to fetch images.`
      );
    });
  } else {
    console.log("[Plugin] Ignored message type:", msg.type || msg.command);
  }
});

console.log("[Plugin] Message listener registered");
