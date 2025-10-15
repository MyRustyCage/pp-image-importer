// plugin.js
// Open the UI panel when plugin loads
penpot.ui.open("Image URL Importer", "./pp-image-importer/ui.html", {
  width: 400,
  height: 300,
});

// Send messages to UI
function sendToUI(type, detail) {
  if (penpot.ui && penpot.ui.sendMessage) {
    penpot.ui.sendMessage({ type, detail });
  }
}

// Core import function
async function importImageFromURL(imageUrl) {
  sendToUI("import-progress", `Fetching URL:\n${imageUrl}`);

  // Validate URL
  try {
    new URL(imageUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  // Fetch with CORS
  const response = await fetch(imageUrl, {
    mode: "cors",
    method: "GET",
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Convert to Uint8Array
  const blob = await response.blob();
  const mime = blob.type || "image/png";

  if (!mime.startsWith("image/")) {
    sendToUI("import-progress", `Warning: content-type "${mime}". Proceeding.`);
  }

  const arrayBuffer = await blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  sendToUI(
    "import-progress",
    `Uploading ${uint8.byteLength.toLocaleString()} bytes...`
  );

  // Upload to Penpot
  const imageMedia = await penpot.uploadMediaData("image", uint8, mime);

  // Create shape
  const rect = penpot.createRectangle();
  rect.resize(600, 400);
  rect.x = 100;
  rect.y = 100;
  rect.fills = [{ fillOpacity: 1, fillImage: imageMedia }];
}

// Handle messages from UI
penpot.ui.onMessage((message) => {
  if (message.type === "import-image-url") {
    importImageFromURL(message.url)
      .then(() => {
        sendToUI("import-success", "Image imported successfully!");
      })
      .catch((err) => {
        sendToUI(
          "import-error",
          `Failed: ${err.message}\n\nHints:\n- Check CORS support\n- Verify HTTPS URL\n- Try another image host`
        );
      });
  }
});
