import { barcodeDetector_atomic } from "./barcode/barcode.js";
import { setCameraStream } from "./webcam/webcam.js";
import { loadItems } from "./inventory.js";

const base = window.APP_CONFIG.API_URL;
const bcDetector = new barcodeDetector_atomic();

// Overlay canvas for the detected barcode box
const canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.style.position = "absolute";
canvas.style.left = 0;
canvas.style.top = 0;
canvas.style.zIndex = 100000;
canvas.style.pointerEvents = "none";
document.body.appendChild(canvas);
const context2D = canvas.getContext("2d");

const webcam = document.getElementById("webcam");
const itemInput = document.getElementById("item");
const amountInput = document.getElementById("amount");
const nameInput = document.getElementById("name");
const formAlert = document.getElementById("form_alert");

let scanning = true; // false while a scanned barcode waits for the user to act
let detectionInFlight = false;

document.getElementById("add_button").addEventListener("click", submitAdd);
document.getElementById("remove_button").addEventListener("click", submitRemove);

// ---------- Scanner ----------

async function startScanner() {
  webcam.addEventListener("loadedmetadata", () => {
    console.log("[webcam] loadedmetadata", webcam.videoWidth, "x", webcam.videoHeight);
    webcam.play();
    setInterval(detectTick, 200);
  });
  await setCameraStream(webcam);
}

async function detectTick() {
  if (!scanning || detectionInFlight || webcam.readyState < 2) return;

  detectionInFlight = true;
  try {
    const res = await bcDetector.detect(webcam);
    if (res !== null) {
      onBarcodeFound(res.val, res.boundingBox);
    }
  } catch (err) {
    console.error("[detect] error:", err);
  } finally {
    detectionInFlight = false;
  }
}

function onBarcodeFound(value, box) {
  console.log("[detect] FOUND barcode:", value);
  itemInput.value = value;
  scanning = false; // pause until the user clicks Add or Remove

  context2D.clearRect(0, 0, canvas.width, canvas.height);
  context2D.strokeStyle = "green";
  context2D.shadowColor = "#dddddd";
  context2D.lineJoin = "bevel";
  context2D.lineWidth = 10;
  context2D.shadowBlur = 20;
  context2D.strokeRect(box.x, box.y, box.width, box.height);
}

function resumeScanning() {
  scanning = true;
  context2D.clearRect(0, 0, canvas.width, canvas.height);
}

// ---------- API ----------

async function sendJson(path, payload) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) {
    const err = new Error(body.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

// ---------- Form actions ----------

// Add: with a name, creates a new item (quantity = starting stock).
//      without a name, adds to an existing item.
async function submitAdd() {
  const barcode = itemInput.value.trim();
  const name = nameInput.value.trim();
  const qty = amountInput.value === "" ? 0 : Number(amountInput.value);

  if (barcode === "") {
    return fail("Enter a barcode.");
  }

  if (name !== "") {
    if (!Number.isInteger(qty) || qty < 0) {
      return fail("Starting quantity must be 0 or more.");
    }
    return createItem(barcode, name, qty);
  }

  if (!Number.isInteger(qty) || qty <= 0) {
    return fail("Enter a quantity greater than 0.");
  }
  return adjustQuantity(barcode, qty);
}

// Remove: only changes existing items, so the name must be empty.
async function submitRemove() {
  const barcode = itemInput.value.trim();
  const name = nameInput.value.trim();
  const qty = Number(amountInput.value);

  if (barcode === "") {
    return fail("Enter a barcode.");
  }
  if (name !== "") {
    return fail("Clear the name field to remove stock from an existing item.");
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    return fail("Enter a quantity greater than 0.");
  }
  return adjustQuantity(barcode, -qty);
}

async function adjustQuantity(barcode, delta) {
  formAlert.textContent = "";
  try {
    await sendJson("/items/adjust", { item: barcode, amount: delta });
    clearAllFields();
    await loadItems();
  } catch (err) {
    if (err.status === 404) {
      formAlert.textContent = "Unknown barcode. Enter a name and press Add to create it.";
    } else {
      formAlert.textContent = `Failed: ${err.message}`;
    }
  } finally {
    resumeScanning();
  }
}

async function createItem(barcode, name, quantity) {
  formAlert.textContent = "";
  try {
    await sendJson("/items", { barcode, name, quantity });
    clearAllFields();
    await loadItems();
  } catch (err) {
    formAlert.textContent = err.status === 409
      ? "This barcode already exists. Clear the name field to change its quantity."
      : `Failed: ${err.message}`;
  } finally {
    resumeScanning();
  }
}

function fail(message) {
  formAlert.textContent = message;
  resumeScanning();
}

function clearAllFields() {
  itemInput.value = "";
  amountInput.value = "";
  nameInput.value = "";
  formAlert.textContent = "";
}

startScanner();