// plugin.js - DEBUG VERSION
console.log("[Plugin] Loading...");

penpot.ui.open("Image URL Importer", "./ui.html", {
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
    // Validate URL
    console.log("[Plugin] Validating URL...");
    new URL(imageUrl);
    console.log("[Plugin] URL valid");

    // Fetch with CORS
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

    // Convert to Blob
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

    // Convert to Uint8Array
    console.log("[Plugin] Converting to ArrayBuffer...");
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    console.log("[Plugin] Uint8Array created, length:", uint8.byteLength);

    sendToUI(
      "import-progress",
      `Uploading ${uint8.byteLength.toLocaleString()} bytes...`
    );

    // Upload to Penpot - THIS IS WHERE IT OFTEN FAILS
    console.log("[Plugin] Calling penpot.uploadMediaData...");
    console.log("[Plugin] Parameters:", "image", uint8.byteLength, mime);

    const imageMedia = await penpot.uploadMediaData("image", uint8, mime);
    console.log("[Plugin] Upload successful, imageMedia:", imageMedia);

    // Create shape
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
    }\n\nHints:\n- Check browser console (F12) for details\n- Verify CORS support\n- Ensure HTTPS URL\n- Try another image host`;

    sendToUI("import-error", errorMsg);
  }
}

penpot.ui.onMessage((message) => {
  console.log("[Plugin] Received message:", message);

  if (message.type === "import-image-url") {
    console.log("[Plugin] Processing import request for:", message.url);
    importImageFromURL(message.url);
  }
});

console.log("[Plugin] Message listener registered");
