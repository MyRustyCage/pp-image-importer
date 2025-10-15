// plugin.js - CORRECTED MESSAGE HANDLING
console.log("[Plugin] Loading...");

penpot.ui.open("Image URL Importer", "", {
  width: 400,
  height: 300,
});

console.log("[Plugin] UI opened");

function sendToUI(type, detail) {
  console.log(`[Plugin -> UI] ${type}:`, detail);
  if (penpot.ui && penpot.ui.sendMessage) {
    penpot.ui.sendMessage({ type, detail });
  }
}

async function importImageFromURL(imageUrl) {
  console.log("[Plugin] Starting import for:", imageUrl);
  sendToUI("import-progress", `Fetching URL:\n${imageUrl}`);

  try {
    new URL(imageUrl);
    console.log("[Plugin] URL valid");

    console.log("[Plugin] Fetching image...");
    const response = await fetch(imageUrl, {
      mode: "cors",
      method: "GET",
      credentials: "omit",
    });
    console.log("[Plugin] Fetch response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log("[Plugin] Converting to blob...");
    const blob = await response.blob();
    console.log("[Plugin] Blob size:", blob.size, "type:", blob.type);

    const mime = blob.type || "image/png";

    if (!mime.startsWith("image/")) {
      console.warn("[Plugin] Non-image MIME type:", mime);
      sendToUI(
        "import-progress",
        `Warning: content-type "${mime}". Proceeding.`
      );
    }

    console.log("[Plugin] Converting to ArrayBuffer...");
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    console.log("[Plugin] Uint8Array created, length:", uint8.byteLength);

    sendToUI(
      "import-progress",
      `Uploading ${uint8.byteLength.toLocaleString()} bytes...`
    );

    console.log("[Plugin] Calling penpot.uploadMediaData...");
    const imageMedia = await penpot.uploadMediaData("image", uint8, mime);
    console.log("[Plugin] Upload successful, imageMedia:", imageMedia);

    console.log("[Plugin] Creating rectangle...");
    const rect = penpot.createRectangle();
    rect.resize(600, 400);
    rect.x = 100;
    rect.y = 100;
    rect.fills = [{ fillOpacity: 1, fillImage: imageMedia }];
    console.log("[Plugin] Rectangle created with image fill");

    sendToUI("import-success", "Image imported successfully!");
    console.log("[Plugin] Import complete!");
  } catch (err) {
    console.error("[Plugin] ERROR:", err);
    console.error("[Plugin] Error stack:", err.stack);

    const errorMsg = `Failed: ${
      err.message || err
    }\n\nCheck console (F12) for details`;
    sendToUI("import-error", errorMsg);
  }
}

// FIXED: Access message.pluginMessage instead of message directly
penpot.ui.onMessage((message) => {
  console.log("[Plugin] Received message:", message);

  // Extract the actual message from pluginMessage wrapper
  const msg = message.pluginMessage || message;
  console.log("[Plugin] Extracted message:", msg);

  if (msg.type === "import-image-url") {
    console.log("[Plugin] Processing import request for:", msg.url);
    importImageFromURL(msg.url);
  } else {
    console.log(
      "[Plugin] Ignoring message with type:",
      msg.type || msg.command
    );
  }
});

console.log("[Plugin] Message listener registered");
