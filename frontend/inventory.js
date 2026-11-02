const output = document.getElementById("output");
const itemsList = document.getElementById("items");
const base = window.APP_CONFIG.API_URL;

document.getElementById("check").addEventListener("click", async () => {
  try {
    const health = await fetch(`${base}/health`).then((r) => r.json());
    const db = await fetch(`${base}/health/db`).then((r) => r.json());
    output.textContent = JSON.stringify({ health, db }, null, 2);
  } catch (err) {
    output.textContent = `Request failed: ${err}`;
  }
});

async function adjustFromList(barcode, action) {
  try {
    const url = `${base}/items/${encodeURIComponent(barcode)}/${action}`;
    const res = await fetch(url, { method: "POST" });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
    output.textContent = "";
    await loadItems();
  } catch (err) {
    output.textContent = `Failed to ${action} barcode ${barcode}: ${err.message}`;
  }
}

export async function loadItems() {
  try {
    const items = await fetch(`${base}/items`).then((r) => r.json());
    itemsList.innerHTML = "";
    for (const item of items) {
      const li = document.createElement("li");

      const name = document.createElement("span");
      name.className = "item-name";
      name.textContent = item.name + " (" + item.barcode + ")";

      const qty = document.createElement("span");
      qty.className = "item-qty";
      qty.textContent = item.quantity;

      const addBtn = document.createElement("button");
      addBtn.textContent = "Add";
      addBtn.addEventListener("click", () => adjustFromList(item.barcode, "add"));

      const subBtn = document.createElement("button");
      subBtn.textContent = "Subtract";
      subBtn.addEventListener("click", () => adjustFromList(item.barcode, "subtract"));

      li.append(name, qty, addBtn, subBtn);
      itemsList.appendChild(li);
    }
  } catch (err) {
    output.textContent = `Failed to load items: ${err}`;
  }
}

loadItems();