const SUPABASE_URL = "https://ebmyetdambrcsypudppt.supabase.co";
const SUPABASE_KEY = "sb_publishable_IF4edoQ47ys5RRfxEGBnEQ_NnBg3NfW";

const $ = id => document.getElementById(id.replace(/^#/, ""));

async function api(table, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.method === "POST"
        ? "return=representation"
        : "return=minimal",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Database error ${response.status}`);
  }

  if (response.status === 204) return [];
  return await response.json();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

$("inDate").value = today();
$("outDate").value = today();

document.querySelectorAll(".tab").forEach(button => {
  button.type = "button";

  button.addEventListener("click", function (e) {
    e.preventDefault();

    const tabName = this.dataset.tab;

    // Remove active from all tabs
    document.querySelectorAll(".tab").forEach(tab => {
      tab.classList.remove("active");
    });

    // Hide all pages
    document.querySelectorAll(".page").forEach(page => {
      page.classList.remove("active");
    });

    // Activate clicked tab
    this.classList.add("active");

    // Show matching page
    const page = document.getElementById(tabName);

    if (page) {
      page.classList.add("active");
    } else {
      console.error("Page not found:", tabName);
    }
  });
});
async function loadItems() {
  return await api(
    "items?select=*&order=id.asc"
  );
}

async function loadStockIn() {
  return await api(
    "stock_in?select=*&order=date.desc,id.desc"
  );
}

async function loadStockOut() {
  return await api(
    "stock_out?select=*&order=date.desc,id.desc"
  );
}

async function addItem() {
  const item = {
    name: $("itemName").value.trim(),
    code: $("itemCode").value.trim(),
    category: $("category").value.trim(),
    unit: $("unit").value.trim() || "Nos",
    min_stock: Number($("minStock").value) || 0
  };

  if (!item.name) {
    alert("Please enter Item Name");
    return;
  }

async function addItem() {
    const item = {
        name: $("itemName").value.trim(),
        code: $("itemCode").value.trim(),
        category: $("category").value.trim(),
        unit: $("unit").value.trim() || "Nos",
        min_stock: Number($("minStock").value) || 0
    };

    if (!item.name) {
        alert("Please enter Item Name");
        return;
    }

    await api("items", {
        method: "POST",
        body: JSON.stringify(item)
    });

    await render();
    document.getElementById("itemForm").reset();
  }
}

async function addStockIn() {
  const itemId = Number($("inItem").value);
  const qty = Number($("inQty").value);

  if (!itemId || qty < 1) {
    alert("Please select item and enter quantity");
    return;
  }

  await api("stock_in", {
    method: "POST",
    body: JSON.stringify({
      date: $("inDate").value,
      item_id: itemId,
      qty: qty,
      supplier: $("supplier").value.trim(),
      invoice: $("invoice").value.trim()
    })
  });
}

async function addStockOut() {
  const itemId = Number($("outItem").value);
  const qty = Number($("outQty").value);

  if (!itemId || qty < 1) {
    alert("Please select item and enter quantity");
    return;
  }

  const ins = await api(
    `stock_in?item_id=eq.${itemId}&select=qty`
  );

  const outs = await api(
    `stock_out?item_id=eq.${itemId}&select=qty`
  );

  const totalIn = ins.reduce((sum, x) => sum + Number(x.qty || 0), 0);
  const totalOut = outs.reduce((sum, x) => sum + Number(x.qty || 0), 0);
  const balance = totalIn - totalOut;

  if (qty > balance) {
    alert(`Not enough stock.\nCurrent balance: ${balance}`);
    return;
  }

  await api("stock_out", {
    method: "POST",
    body: JSON.stringify({
      date: $("outDate").value,
      item_id: itemId,
      qty: qty,
      issued_to: $("issuedTo").value.trim(),
      work_order: $("workOrder").value.trim()
    })
  });
}

async function addSupplier() {
  const supplier = {
  supplier_name: document.getElementById("supplierName").value.trim(),
  contact_number: document.getElementById("supplierContact").value.trim()
};

  if (!supplier.supplier_name) {
    alert("Enter Supplier Name");
    return;
  }

  await api("suppliers", {
    method: "POST",
    body: JSON.stringify(supplier)
  });

  alert("Supplier added successfully!");
}
 async function deleteRecord(table, id) {
  if (!confirm("Delete this record?")) return;

  await api(`${table}?id=eq.${id}`, {
    method: "DELETE"
  });

  await render();
}

async function render() {
  try {
    const [items, ins, outs] = await Promise.all([
      loadItems(),
      loadStockIn(),
      loadStockOut()
    ]);

    // =========================
    // DASHBOARD TOTALS
    // =========================

    const totalIn = ins.reduce(
      (sum, x) => sum + Number(x.qty || 0),
      0
    );

    const totalOut = outs.reduce(
      (sum, x) => sum + Number(x.qty || 0),
      0
    );

    const currentStock = totalIn - totalOut;

    const totalItems = $("#totalItems");
    const totalInEl = $("#totalIn");
    const totalOutEl = $("#totalOut");
    const overviewIn = $("#overviewIn");
    const overviewOut = $("#overviewOut");
    const overviewCurrent = $("#overviewCurrent");

    if (totalItems)
      totalItems.textContent = items.length;

    if (totalInEl)
      totalInEl.textContent = totalIn;

    if (totalOutEl)
      totalOutEl.textContent = totalOut;

    if (overviewIn)
      overviewIn.textContent = totalIn;

    if (overviewOut)
      overviewOut.textContent = totalOut;

    if (overviewCurrent)
      overviewCurrent.textContent = currentStock;


    // =========================
    // STOCK STATUS
    // =========================

    let inStockItems = 0;
    let lowStockItems = 0;

    items.forEach(item => {

      const itemIn = ins
        .filter(x =>
          String(x.item_id) === String(item.id)
        )
        .reduce(
          (sum, x) => sum + Number(x.qty || 0),
          0
        );

      const itemOut = outs
        .filter(x =>
          String(x.item_id) === String(item.id)
        )
        .reduce(
          (sum, x) => sum + Number(x.qty || 0),
          0
        );

      const balance = itemIn - itemOut;
      const minimum = Number(item.min_stock || 0);

      if (balance > 0) {
        inStockItems++;
      }

      if (balance <= minimum) {
        lowStockItems++;
      }
    });

    const statusIn = $("#statusIn");
    const statusLow = $("#statusLow");
    const statusPercent = $("#statusPercent");

    if (statusIn)
      statusIn.textContent = inStockItems;

    if (statusLow)
      statusLow.textContent = lowStockItems;

    const stockPercent =
      items.length > 0
        ? Math.round((inStockItems / items.length) * 100)
        : 0;

    if (statusPercent)
      statusPercent.textContent = stockPercent + "%";


    // =========================
    // STOCK BAR
    // =========================

    const stockBar = $("#stockInBar");

    if (stockBar) {

      const total = totalIn + totalOut;

      if (total > 0) {

        const inPercent =
          Math.round((totalIn / total) * 100);

        stockBar.style.width = inPercent + "%";
        stockBar.textContent = inPercent + "%";

      } else {

        stockBar.style.width = "0%";
        stockBar.textContent = "";
      }
    }


    // =========================
    // ITEM DROPDOWNS
    // =========================

    const itemOptions =
      '<option value="">Select Item</option>' +

      items.map(item => `
        <option value="${item.id}">
          ${item.name}${item.code ? " - " + item.code : ""}
        </option>
      `).join("");

    const purchaseItem = $("#purchaseItem");
    const inItem = $("#inItem");
    const outItem = $("#outItem");

    if (purchaseItem)
      purchaseItem.innerHTML = itemOptions;

    if (inItem)
      inItem.innerHTML = itemOptions;

    if (outItem)
      outItem.innerHTML = itemOptions;


    // =========================
    // ITEM MASTER TABLE
    // =========================

    const itemSearchEl = $("#itemSearch");

    const itemSearch =
      itemSearchEl?.value?.toLowerCase() || "";

    const itemTable = $("#itemTable");

    if (itemTable) {

      itemTable.innerHTML = items

        .filter(item =>
          `${item.name || ""} ${item.code || ""} ${item.category || ""}`
            .toLowerCase()
            .includes(itemSearch)
        )

        .map(item => `
          <tr>
            <td>${item.code || ""}</td>
            <td>${item.name || ""}</td>
            <td>${item.category || ""}</td>
            <td>${item.unit || "Nos"}</td>
            <td>${item.min_stock || 0}</td>
            <td>
              <button
                class="delete"
                onclick="deleteRecord('items',${item.id})">
                Delete
              </button>
            </td>
          </tr>
        `).join("");
    }


    // =========================
    // STOCK IN TABLE
    // =========================

    const inTable = $("#inTable");

    if (inTable) {

      inTable.innerHTML = ins.map(x => `
        <tr>
          <td>${x.date || ""}</td>
          <td>${itemName(items, x.item_id)}</td>
          <td>${x.qty || 0}</td>
          <td>${x.supplier || ""}</td>
          <td>${x.invoice || ""}</td>
          <td>
            <button
              class="delete"
              onclick="deleteRecord('stock_in',${x.id})">
              Delete
            </button>
          </td>
        </tr>
      `).join("");
    }


    // =========================
    // STOCK OUT TABLE
    // =========================

    const outTable = $("#outTable");

    if (outTable) {

      outTable.innerHTML = outs.map(x => `
        <tr>
          <td>${x.date || ""}</td>
          <td>${itemName(items, x.item_id)}</td>
          <td>${x.qty || 0}</td>
          <td>${x.issued_to || ""}</td>
          <td>${x.work_order || ""}</td>
          <td>
            <button
              class="delete"
              onclick="deleteRecord('stock_out',${x.id})">
              Delete
            </button>
          </td>
        </tr>
      `).join("");
    }


    // =========================
    // CURRENT STOCK TABLE
    // =========================

    const stockSearchEl = $("#stockSearch");

    const stockSearch =
      stockSearchEl?.value?.toLowerCase() || "";

    const stockTable = $("#stockTable");

    let lowCount = 0;

    if (stockTable) {

      stockTable.innerHTML = items

        .filter(item =>
          `${item.name || ""} ${item.code || ""}`
            .toLowerCase()
            .includes(stockSearch)
        )

        .map(item => {

          const inQty = ins
            .filter(x =>
              Number(x.item_id) === Number(item.id)
            )
            .reduce(
              (sum, x) => sum + Number(x.qty || 0),
              0
            );

          const outQty = outs
            .filter(x =>
              Number(x.item_id) === Number(item.id)
            )
            .reduce(
              (sum, x) => sum + Number(x.qty || 0),
              0
            );

          const balance = inQty - outQty;
          const minimum = Number(item.min_stock || 0);
          const low = balance <= minimum;

          if (low)
            lowCount++;

          return `
            <tr>
              <td>${item.code || ""}</td>
              <td>${item.name || ""}</td>
              <td>${item.unit || "Nos"}</td>
              <td>${inQty}</td>
              <td>${outQty}</td>
              <td><b>${balance}</b></td>
              <td>${low ? "⚠️ LOW" : "OK"}</td>
            </tr>
          `;

        }).join("");
    }


    // =========================
    // LOW STOCK COUNT
    // =========================

    const lowStock = $("#lowStock");

    if (lowStock)
      lowStock.textContent = lowCount;


    // =========================
    // DASHBOARD SUMMARY
    // =========================

    const summary = $("#summary");

    if (summary) {

      summary.textContent =
        items.length > 0
          ? `${items.length} item(s) registered. ` +
            `${lowCount} item(s) need attention for low stock.`
          : "No items registered yet.";
    }


    // =========================
    // REFRESH PURCHASE TOTAL
    // =========================

    const purchaseQty = $("#purchaseQty");
    const purchaseRate = $("#purchaseRate");
    const purchaseTotal = $("#purchaseTotal");

    if (purchaseQty && purchaseRate && purchaseTotal) {

      const qty = Number(purchaseQty.value || 0);
      const rate = Number(purchaseRate.value || 0);

      purchaseTotal.value =
        (qty * rate).toFixed(2);
    }

  } catch (error) {

    console.error(error);

    alert(
      "Cannot load Supabase data.\n\n" +
      error.message
    );
  }
            }

    $("totalItems").textContent = items.length;

    const totalIn = ins.reduce(
      (sum, x) => sum + Number(x.qty || 0), 0
    );

    const totalOut = outs.reduce(
      (sum, x) => sum + Number(x.qty || 0), 0
    );

    $("totalIn").textContent = totalIn;
    $("totalOut").textContent = totalOut;
// ===== PROFESSIONAL DASHBOARD =====

const currentStock = totalIn - totalOut;


// ===== STOCK OVERVIEW =====
const overviewIn = $("overviewIn");
const overviewOut = $("overviewOut");
const overviewCurrent = $("overviewCurrent");

if (overviewIn) overviewIn.textContent = totalIn;
if (overviewOut) overviewOut.textContent = totalOut;
if (overviewCurrent) overviewCurrent.textContent = currentStock;

// Count stock status
let inStockItems = 0;
let lowStockItems = 0;

items.forEach(item => {
    const itemIn = ins
        .filter(x => String(x.item_id) === String(item.id))
        .reduce((sum, x) => sum + Number(x.qty || 0), 0);

    const itemOut = outs
        .filter(x => String(x.item_id) === String(item.id))
        .reduce((sum, x) => sum + Number(x.qty || 0), 0);

    const balance = itemIn - itemOut;
    const minimum = Number(item.min_stock || 0);

    if (balance > 0) {
        inStockItems++;
    }

    if (balance <= minimum) {
        lowStockItems++;
    }
});

// Stock Status
$("statusIn").textContent = inStockItems;
$("statusLow").textContent = lowStockItems;

// Percentage of items in stock
const stockPercent = items.length
    ? Math.round((inStockItems / items.length) * 100)
    : 0;

$("statusPercent").textContent = stockPercent + "%";

// ===== STOCK BAR =====
const stockBar = $("stockInBar");

if (stockBar) {
    const total = totalIn + totalOut;

    if (total > 0) {
        const inPercent = Math.round((totalIn / total) * 100);

        stockBar.style.width = inPercent + "%";
        stockBar.textContent = "";
    } else {
        stockBar.style.width = "0%";
        stockBar.textContent = "";
    }
}$("#purchaseItem").innerHTML =
  `<option value="">Select Item</option>` +
  items.map(item =>
    `<option value="${item.id}">
      ${item.name}${item.code ? " - " + item.code : ""}
    </option>`
  ).join("");
    
    $("inItem").innerHTML = items.map(item =>
      `<option value="${item.id}">
        ${item.name}${item.code ? " - " + item.code : ""}
      </option>`
    ).join("");
$("#purchaseItem").innerHTML =
  `<option value="">Select Item</option>` +
  items.map(item =>
    `<option value="${item.id}">
      ${item.name}${item.code ? " - " + item.code : ""}
    </option>`
  ).join("");
    $("outItem").innerHTML = $("inItem").innerHTML;

    const itemSearch =
      ($("itemSearch").value || "").toLowerCase();

    $("itemTable").innerHTML = items
      .filter(item =>
        `${item.name} ${item.code || ""} ${item.category || ""}`
          .toLowerCase()
          .includes(itemSearch)
      )
      .map(item => `
        <tr>
          <td>${item.code || ""}</td>
          <td>${item.name}</td>
          <td>${item.category || ""}</td>
          <td>${item.unit || "Nos"}</td>
          <td>${item.min_stock || 0}</td>
          <td>
            <button class="delete"
              onclick="deleteRecord('items',${item.id})">
              Delete
            </button>
          </td>
        </tr>
      `).join("");

    $("inTable").innerHTML = ins.map(x => `
      <tr>
        <td>${x.date || ""}</td>
        <td>${itemName(items, x.item_id)}</td>
        <td>${x.qty || 0}</td>
        <td>${x.supplier || ""}</td>
        <td>${x.invoice || ""}</td>
        <td>
          <button class="delete"
            onclick="deleteRecord('stock_in',${x.id})">
            Delete
          </button>
        </td>
      </tr>
    `).join("");

    $("outTable").innerHTML = outs.map(x => `
      <tr>
        <td>${x.date || ""}</td>
        <td>${itemName(items, x.item_id)}</td>
        <td>${x.qty || 0}</td>
        <td>${x.issued_to || ""}</td>
        <td>${x.work_order || ""}</td>
        <td>
          <button class="delete"
            onclick="deleteRecord('stock_out',${x.id})">
            Delete
          </button>
        </td>
      </tr>
    `).join("");

    const stockSearch =
      ($("stockSearch").value || "").toLowerCase();

    let lowCount = 0;

    $("stockTable").innerHTML = items
      .filter(item =>
        `${item.name} ${item.code || ""}`
          .toLowerCase()
          .includes(stockSearch)
      )
      .map(item => {
        const inQty = ins
          .filter(x => Number(x.item_id) === Number(item.id))
          .reduce((sum, x) => sum + Number(x.qty || 0), 0);

        const outQty = outs
          .filter(x => Number(x.item_id) === Number(item.id))
          .reduce((sum, x) => sum + Number(x.qty || 0), 0);

        const balance = inQty - outQty;
        const minimum = Number(item.min_stock || 0);
        const low = balance <= minimum;

        if (low) lowCount++;

        return `
          <tr>
            <td>${item.code || ""}</td>
            <td>${item.name}</td>
            <td>${item.unit || "Nos"}</td>
            <td>${inQty}</td>
            <td>${outQty}</td>
            <td><b>${balance}</b></td>
            <td>${low ? "⚠️ LOW" : "OK"}</td>
          </tr>
        `;
      }).join("");

    $("lowStock").textContent = lowCount;

    $("summary").textContent =
      items.length
        ? `${items.length} item(s) registered. ${lowCount} item(s) need attention for low stock.`
        : "Add items and stock transactions to begin.";

  } catch (error) {
    console.error(error);
    alert("Cannot load Supabase data.\n\n" + error.message);
  }
}

function itemName(items, id) {
  const item = items.find(
    x => Number(x.id) === Number(id)
  );

  return item ? item.name : "Deleted item";
}

$("itemForm").onsubmit = async e => {
  e.preventDefault();

  try {
    await addItem();

    e.target.reset();
    $("unit").value = "Nos";

    await render();

    alert("Item added successfully!");
  } catch (error) {
    alert("Could not add item.\n\n" + error.message);
  }
};

$("inForm").onsubmit = async e => {
  e.preventDefault();

  try {
    await addStockIn();

    e.target.reset();
    $("inDate").value = today();

    await render();

    alert("Stock In added successfully!");
  } catch (error) {
    alert("Could not add Stock In.\n\n" + error.message);
  }
};

$("outForm").onsubmit = async e => {
  e.preventDefault();

  try {
    await addStockOut();

    e.target.reset();
    $("outDate").value = today();

    await render();

    alert("Stock Out added successfully!");
  } catch (error) {
    alert("Could not add Stock Out.\n\n" + error.message);
  }
};

["itemSearch", "stockSearch"].forEach(id => {
  $(id).oninput = render;
});

$("clearBtn").onclick = async () => {
  if (!confirm("Delete ALL stock register data?")) return;

  try {
    await api("stock_out?id=not.is.null", {
      method: "DELETE"
    });

    await api("stock_in?id=not.is.null", {
      method: "DELETE"
    });

    await api("items?id=not.is.null", {
      method: "DELETE"
    });

    await render();

    alert("All data cleared.");
  } catch (error) {
    alert("Could not clear data.\n\n" + error.message);
  }
};

$("supplierForm").onsubmit = async e => {
  e.preventDefault();

  try {
    await addSupplier();
    e.target.reset();
    await render();
    alert("Supplier added successfully!");
  } catch (error) {
    alert("Could not add Supplier.\n\n" + error.message);
  }
};
// ===== PURCHASE FORM =====

$("#purchaseRate").oninput = () => {
  const qty = Number($("#purchaseQty").value || 0);
  const rate = Number($("#purchaseRate").value || 0);

  $("#purchaseTotal").value = (qty * rate).toFixed(2);
};

$("#purchaseQty").oninput = () => {
  const qty = Number($("#purchaseQty").value || 0);
  const rate = Number($("#purchaseRate").value || 0);

  $("#purchaseTotal").value = (qty * rate).toFixed(2);
};

$("#purchaseForm").onsubmit = async e => {
  e.preventDefault();

  try {
    const purchase = {
      date: $("#purchaseDate").value,
      indent_no: $("#indentNo").value.trim(),
      po_no: $("#poNo").value.trim(),
      vendor_name: $("#vendorName").value.trim(),
      invoice_no: $("#invoiceNo").value.trim(),
      item_id: Number($("#purchaseItem").value),
      qty: Number($("#purchaseQty").value),
      rate: Number($("#purchaseRate").value),
      total: Number($("#purchaseTotal").value)
    };

    if (!purchase.item_id || purchase.qty < 1 || purchase.rate < 0) {
      alert("Please select item, quantity and rate.");
      return;
    }

    await api("purchases", {
      method: "POST",
      body: JSON.stringify(purchase)
    });

    e.target.reset();

    $("#purchaseDate").value = today();
    $("#purchaseTotal").value = "";

    await render();

    alert("Purchase added successfully!");

  } catch (error) {
    alert("Could not add Purchase.\n\n" + error.message);
  }
};

render();
