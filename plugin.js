// plugin.js - CORRECTED MESSAGE HANDLING
console.log("[Plugin] Loading...");

penpot.ui.open("Image URL Importer", "./pp-image-importer/ui.html", {
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
  sendToUI("import-progress", `Fetching URL:\n${imageUrl}`);

  // Replace new URL() validation with regex
  if (!/^https?:\/\/.+/.test(imageUrl)) {
    throw new Error("Invalid URL format");
  }

  // Fetch with CORS
  let response;
  try {
    response = await fetch(imageUrl, {
      mode: "cors",
      method: "GET",
      credentials: "omit",
    });
  } catch (err) {
    throw new Error(
      `Network error while fetching image: ${err.message || err}`
    );
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // ...rest of the function remains unchanged
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
