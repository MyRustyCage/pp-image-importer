// plugin.js - Receives image data from UI
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

async function importImageData(imageDataArray, mime) {
  console.log(
    "[Plugin] Importing image data, length:",
    imageDataArray.length,
    "mime:",
    mime
  );

  // Convert Array back to Uint8Array
  const uint8 = new Uint8Array(imageDataArray);
  console.log("[Plugin] Uint8Array created:", uint8.byteLength);

  try {
    console.log("[Plugin] Calling uploadMediaData...");
    const imageMedia = await penpot.uploadMediaData("image", uint8, mime);
    console.log("[Plugin] uploadMediaData success:", imageMedia);

    console.log("[Plugin] Creating rectangle...");
    const rect = penpot.createRectangle();
    rect.resize(600, 400);
    rect.x = 100;
    rect.y = 100;
    rect.fills = [{ fillOpacity: 1, fillImage: imageMedia }];
    console.log("[Plugin] Rectangle created");

    sendToUI("import-success", "Image imported!");
    console.log("[Plugin] Import complete");
  } catch (err) {
    console.error("[Plugin] ERROR:", err);
    sendToUI("import-error", `Upload failed: ${err.message || err}`);
  }
}

penpot.ui.onMessage((message) => {
  console.log("[Plugin] Received message:", message);
  const msg = message.pluginMessage || message;

  if (msg.type === "import-image-data") {
    console.log("[Plugin] Processing image data import");
    importImageData(msg.imageData, msg.mime);
  }
});

console.log("[Plugin] Ready");
