// Minimal plugin runtime for Penpot
// Focus: only debug this function that imports an image from a URL.

function sendToUI(type, detail) {
  // In Penpot, use penpot.ui.sendMessage if available; in inline UI context, postMessage
  try {
    if (typeof penpot !== "undefined" && penpot.ui && penpot.ui.sendMessage) {
      penpot.ui.sendMessage({ type, detail });
    } else {
      // Fallback for environments where UI is same frame
      parent && parent.postMessage({ pluginMessage: { type, detail } }, "*");
    }
  } catch (e) {
    // Silent
  }
}

async function importImageFromURL(imageUrl) {
  sendToUI("import-progress", `Fetching URL:\n${imageUrl}`);

  // Basic validation
  try {
    // Will throw if invalid
    new URL(imageUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  // Attempt CORS-enabled fetch
  let response;
  try {
    response = await fetch(imageUrl, {
      mode: "cors",
      method: "GET",
      credentials: "omit",
    });
  } catch (err) {
    // Network / DNS / mixed-content failures
    throw new Error(
      `Network error while fetching image: ${
        err && err.message ? err.message : String(err)
      }`
    );
  }

  if (!response.ok) {
    // HTTP errors
    throw new Error(
      `HTTP ${response.status}: ${
        response.statusText || "Error fetching image"
      }`
    );
  }

  // Convert to Uint8Array
  let blob;
  try {
    blob = await response.blob();
  } catch (err) {
    throw new Error(
      `Failed to read response as Blob: ${
        err && err.message ? err.message : String(err)
      }`
    );
  }

  // MIME sanity check (optional)
  const mime = blob.type || "application/octet-stream";
  if (!mime.startsWith("image/")) {
    // Some servers omit correct type; not fatal, but warn
    sendToUI(
      "import-progress",
      `Warning: server returned content-type "${mime}". Proceeding.`
    );
  }

  let arrayBuffer;
  try {
    arrayBuffer = await blob.arrayBuffer();
  } catch (err) {
    throw new Error(
      `Failed to read Blob as ArrayBuffer: ${
        err && err.message ? err.message : String(err)
      }`
    );
  }

  const uint8 = new Uint8Array(arrayBuffer);

  sendToUI(
    "import-progress",
    `Uploading ${uint8.byteLength.toLocaleString()} bytes (${mime}) to Penpot...`
  );

  // Upload into Penpot as media
  let imageMedia;
  try {
    // Type "image" is the Penpot media kind; mime is used for format
    imageMedia = await penpot.uploadMediaData("image", uint8, mime);
  } catch (err) {
    // CORS will fail earlier, but backend/media errors surface here
    throw new Error(
      `Penpot upload failed: ${err && err.message ? err.message : String(err)}`
    );
  }

  // Create a rectangle and apply as fill
  try {
    const rect = penpot.createRectangle();
    // Reasonable default size; Penpot will scale the fill
    rect.resize(600, 400);
    rect.x = 100;
    rect.y = 100;

    rect.fills = [{ fillOpacity: 1, fillImage: imageMedia }];
  } catch (err) {
    throw new Error(
      `Failed to create shape or apply fill: ${
        err && err.message ? err.message : String(err)
      }`
    );
  }
}

function handleMessage(msg) {
  if (!msg || !msg.type) return;

  if (msg.type === "import-image-url") {
    const url = msg.url;
    importImageFromURL(url)
      .then(() => {
        sendToUI("import-success", "Done.");
      })
      .catch((err) => {
        // Provide actionable hints for common CORS issues
        const hint = [
          err && err.message ? err.message : String(err),
          "",
          "Hints:",
          "- If you see a CORS error, the remote server must send Access-Control-Allow-Origin for your Penpot/plugin origin.",
          "- Try another image host that allows CORS (e.g., an image CDN) or use your own proxy that adds CORS headers.",
          "- Ensure the URL is HTTPS (no mixed content) and publicly accessible.",
        ].join("\n");
        sendToUI("import-error", hint);
      });
  }
}

// Wire UI messages
if (typeof penpot !== "undefined" && penpot.ui && penpot.ui.onMessage) {
  penpot.ui.onMessage((message) => handleMessage(message));
} else {
  // Fallback if same-frame messaging is used during local tests
  window.addEventListener("message", (event) => {
    const data = event.data && event.data.pluginMessage;
    if (data) handleMessage(data);
  });
}
