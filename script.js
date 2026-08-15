const SUPABASE_URL = "https://ebmyetdambrcsypudppt.supabase.co";
const SUPABASE_KEY = "sb_publishable_IF4edoQ47ys5RRfxEGBnEQ_NnBg3NfW";

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": "Bearer " + SUPABASE_KEY,
  "Content-Type": "application/json"
};

const $ = id => document.getElementById(id);

async function api(table, options = {}) {
  const response = await fetch(
    SUPABASE_URL + "/rest/v1/" + table,
    {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Supabase error");
  }

  if (response.status === 204) return null;
  return response.json();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

if ($("inDate")) $("inDate").value = today();
if ($("outDate")) $("outDate").value = today();

async function loadItems() {
  try {
    const items = await api("items?select=*&order=id.asc");

    const inItem = $("inItem");
    const outItem = $("outItem");

    if (inItem) {
      inItem.innerHTML =
        '<option value="">Select item</option>' +
        items.map(i =>
          `<option value="${i.id}">${i.name} (${i.code || ""})</option>`
        ).join("");
    }

    if (outItem) {
      outItem.innerHTML =
        '<option value="">Select item</option>' +
        items.map(i =>
          `<option value="${i.id}">${i.name} (${i.code || ""})</option>`
        ).join("");
    }

    renderItems(items);
    await renderStock(items);

  } catch (e) {
    console.error(e);
    alert("Cannot load Supabase data.\n\n" + e.message);
  }
}

async function renderItems(items) {
  const table = $("itemTable");
  if (!table) return;

  const rows = [];

  for (const item of items) {
    const stock = await getStock(item.id);

    rows.push(`
      <tr>
        <td>${item.code || ""}</td>
        <td>${item.name || ""}</td>
        <td>${item.category || ""}</td>
        <td>${item.unit || ""}</td>
        <td>${item.min_stock || 0}</td>
        <td>${stock}</td>
      </tr>
    `);
  }

  table.innerHTML = rows.join("");
}

async function getStock(itemId) {
  const ins = await api(
    `stock_in?item_id=eq.${itemId}&select=qty`
  );

  const outs = await api(
    `stock_out?item_id=eq.${itemId}&select=qty`
  );

  const totalIn = ins.reduce(
    (sum, x) => sum + Number(x.qty || 0), 0
  );

  const totalOut = outs.reduce(
    (sum, x) => sum + Number(x.qty || 0), 0
  );

  return totalIn - totalOut;
}

async function renderStock(items) {
  const table = $("stockTable");
  if (!table) return;

  const ins = await api("stock_in?select=*");
  const outs = await api("stock_out?select=*");

  let totalIn = 0;
  let totalOut = 0;
  let low = 0;

  const rows = [];

  for (const item of items) {

    const itemIn = ins
      .filter(x => Number(x.item_id) === Number(item.id))
      .reduce((s, x) => s + Number(x.qty || 0), 0);

    const itemOut = outs
      .filter(x => Number
