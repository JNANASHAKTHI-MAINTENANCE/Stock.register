const SUPABASE_URL = "https://ebmyetdambrcsydppt.supabase.co";
const SUPABASE_KEY = "sb_publishable_1F4edoQ47ys5RRfXEGbNEQ_NNb3g3NfW";

const $ = id => document.getElementById(String(id).replace(/^#/, ""));

async function api(table, options = {}) {
  if (!SUPABASE_KEY) {
    throw new Error("Supabase key is missing.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}`,
    {
      ...options,
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
        Prefer:
          options.method === "POST"
            ? "return=representation"
            : "return=minimal",
        ...(options.headers || {})
      }
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Database error ${response.status}: ${text}`
    );
  }

  if (response.status === 204) return [];

  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function loadItems() {
  return api("items?select=*&order=id.asc");
}

async function loadStockIn() {
  return api(
    "stock_in?select=*&order=date.desc,id.desc"
  );
}

async function loadStockOut() {
  return api(
    "stock_out?select=*&order=date.desc,id.desc"
  );
}

async function loadSuppliers() {
  return api(
    "suppliers?select=*&order=id.asc"
  );
}

function itemName(items, id) {
  const item = items.find(
    x => String(x.id) === String(id)
  );

  return item ? item.name : "-";
}

function itemOptions(items) {
  return (
    `<option value="">Select Item</option>` +
    items
      .map(
        item =>
          `<option value="${item.id}">${
            item.name || ""
          }${
            item.code
              ? " - " + item.code
              : ""
          }</option>`
      )
      .join("")
  );
}


/* ================================
   ADD ITEM
================================ */

async function addItem(event) {

  if (event) {
    event.preventDefault();
  }

  const item = {
    name: $("itemName")?.value.trim() || "",
    code: $("itemCode")?.value.trim() || "",
    category: $("category")?.value.trim() || "",
    unit: $("unit")?.value.trim() || "Nos",
    min_stock:
      Number($("minStock")?.value) || 0
  };

  if (!item.name) {
    alert("Please enter Item Name.");
    return false;
  }

  try {

    alert("Saving Item...");

    const result = await api(
      "items",
      {
        method: "POST",
        body: JSON.stringify(item)
      }
    );

    console.log("ITEM SAVED:", result);

    if ($("itemForm")) {
      $("itemForm").reset();
    }

    if ($("unit")) {
      $("unit").value = "Nos";
    }

    alert("Item saved successfully!");

    await render();

  } catch (error) {

    console.error(
      "ITEM SAVE ERROR:",
      error
    );

    alert(
      "SAVE ERROR:\n\n" +
      error.message
    );

    /* DO NOT CLEAR FORM */
  }

  return false;
}

window.addItem = addItem;

/* ================================
   STOCK IN
================================ */

async function addStockIn(event) {

  if (event) {
    event.preventDefault();
  }

  const itemId =
    Number($("inItem")?.value);

  const qty =
    Number($("inQty")?.value);

  if (!itemId || qty < 1) {

    alert(
      "Please select item and enter quantity."
    );

    return false;
  }

  const record = {

    date:
      $("inDate")?.value ||
      today(),

    item_id: itemId,

    qty: qty,

    supplier:
      $("supplier")?.value.trim() ||
      "",

    invoice:
      $("invoice")?.value.trim() ||
      ""
  };

  try {

    alert("Saving Stock In...");

    await api(
      "stock_in",
      {
        method: "POST",
        body: JSON.stringify(record)
      }
    );

    if ($("inForm")) {
      $("inForm").reset();
    }

    if ($("inDate")) {
      $("inDate").value = today();
    }

    alert(
      "Stock In saved successfully!"
    );

    await render();

  } catch (error) {

    console.error(
      "STOCK IN ERROR:",
      error
    );

    alert(
      "SAVE ERROR:\n\n" +
      error.message
    );
  }

  return false;
    }

/* ================================
   STOCK OUT
================================ */

async function addStockOut(event) {

  if (event) {
    event.preventDefault();
  }

  const itemId =
    Number($("outItem")?.value);

  const qty =
    Number($("outQty")?.value);

  if (!itemId || qty < 1) {

    alert(
      "Please select item and enter quantity."
    );

    return false;
  }

  try {

    /* Check current stock first */

    const stockIn = await api(
      `stock_in?select=qty&item_id=eq.${itemId}`
    );

    const stockOut = await api(
      `stock_out?select=qty&item_id=eq.${itemId}`
    );

    const totalIn =
      stockIn.reduce(
        (sum, row) =>
          sum + Number(row.qty || 0),
        0
      );

    const totalOut =
      stockOut.reduce(
        (sum, row) =>
          sum + Number(row.qty || 0),
        0
      );

    const balance =
      totalIn - totalOut;

    if (qty > balance) {

      alert(
        "Not enough stock.\n\n" +
        "Current stock: " +
        balance
      );

      return false;
    }

    const record = {

      date:
        $("outDate")?.value ||
        today(),

      item_id: itemId,

      qty: qty,

      issued_to:
        $("issuedTo")?.value.trim() ||
        "",

      work_order:
        $("workOrder")?.value.trim() ||
        ""
    };

    alert("Saving Stock Out...");

    await api(
      "stock_out",
      {
        method: "POST",
        body: JSON.stringify(record)
      }
    );

    if ($("outForm")) {
      $("outForm").reset();
    }

    if ($("outDate")) {
      $("outDate").value = today();
    }

    alert(
      "Stock Out saved successfully!"
    );

    await render();

  } catch (error) {

    console.error(
      "STOCK OUT ERROR:",
      error
    );

    alert(
      "SAVE ERROR:\n\n" +
      error.message
    );
  }

  return false;
}


/* ================================
   ADD SUPPLIER
================================ */

async function addSupplier(event) {

  if (event) {
    event.preventDefault();
  }

  const supplier = {

    supplier_name:
      $("supplierName")?.value.trim() ||
      "",

    contact_number:
      $("supplierContact")?.value.trim() ||
      ""
  };

  if (!supplier.supplier_name) {

    alert(
      "Please enter Supplier Name."
    );

    return false;
  }

  try {

    alert("Saving Supplier...");

    await api(
      "suppliers",
      {
        method: "POST",
        body: JSON.stringify(supplier)
      }
    );

    if ($("supplierForm")) {
      $("supplierForm").reset();
    }

    alert(
      "Supplier added successfully!"
    );

    await render();

  } catch (error) {

    console.error(
      "SUPPLIER ERROR:",
      error
    );

    alert(
      "SAVE ERROR:\n\n" +
      error.message
    );
  }

  return false;
}


/* ================================
   DELETE RECORD
================================ */

async function deleteRecord(
  table,
  id
) {

  if (
    !confirm(
      "Delete this record?"
    )
  ) {
    return;
  }

  try {

    await api(
      `${table}?id=eq.${id}`,
      {
        method: "DELETE"
      }
    );

    alert(
      "Record deleted successfully!"
    );

    await render();

  } catch (error) {

    console.error(
      "DELETE ERROR:",
      error
    );

    alert(
      "DELETE ERROR:\n\n" +
      error.message
    );
  }
}


/* ================================
   TAB SWITCHING
================================ */

document
  .querySelectorAll(".tab")
  .forEach(button => {

    button.type = "button";

    button.addEventListener(
      "click",
      function(event) {

        event.preventDefault();

        document
          .querySelectorAll(".tab")
          .forEach(tab =>
            tab.classList.remove(
              "active"
            )
          );

        document
          .querySelectorAll(".page")
          .forEach(page =>
            page.classList.remove(
              "active"
            )
          );

        this.classList.add("active");

        const page =
          document.getElementById(
            this.dataset.tab
          );

        if (page) {
          page.classList.add("active");
        }
      }
    );
  });


/* ================================
   FORM EVENT CONNECTIONS
================================ */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    if ($("inDate")) {
      $("inDate").value = today();
    }

    if ($("outDate")) {
      $("outDate").value = today();
    }

    const itemForm =
      $("itemForm");

    if (itemForm) {
      itemForm.addEventListener(
        "submit",
        addItem
      );
    }

    const inForm =
      $("inForm");

    if (inForm) {
      inForm.addEventListener(
        "submit",
        addStockIn
      );
    }

    const outForm =
      $("outForm");

    if (outForm) {
      outForm.addEventListener(
        "submit",
        addStockOut
      );
    }

    const supplierForm =
      $("supplierForm");

    if (supplierForm) {
      supplierForm.addEventListener(
        "submit",
        addSupplier
      );
    }

    render();
  }
);
/* ================================
   MAIN RENDER
================================ */

async function render() {

  try {

    const [
      items,
      stockIn,
      stockOut,
      suppliers
    ] = await Promise.all([
      loadItems(),
      loadStockIn(),
      loadStockOut(),
      loadSuppliers()
    ]);

    console.log("Items:", items);
    console.log("Stock In:", stockIn);
    console.log("Stock Out:", stockOut);
    console.log("Suppliers:", suppliers);


    /* ================================
       DASHBOARD TOTALS
    ================================= */

    const totalIn =
      stockIn.reduce(
        (sum, row) =>
          sum + Number(row.qty || 0),
        0
      );

    const totalOut =
      stockOut.reduce(
        (sum, row) =>
          sum + Number(row.qty || 0),
        0
      );

    const currentStock =
      totalIn - totalOut;


    const totalItems =
      $("totalItems");

    const totalInEl =
      $("totalIn");

    const totalOutEl =
      $("totalOut");

    const overviewIn =
      $("overviewIn");

    const overviewOut =
      $("overviewOut");

    const overviewCurrent =
      $("overviewCurrent");


    if (totalItems) {
      totalItems.textContent =
        items.length;
    }

    if (totalInEl) {
      totalInEl.textContent =
        totalIn;
    }

    if (totalOutEl) {
      totalOutEl.textContent =
        totalOut;
    }

    if (overviewIn) {
      overviewIn.textContent =
        totalIn;
    }

    if (overviewOut) {
      overviewOut.textContent =
        totalOut;
    }

    if (overviewCurrent) {
      overviewCurrent.textContent =
        currentStock;
    }


    /* ================================
       ITEM DROPDOWNS
    ================================= */

    const options =
      itemOptions(items);


    const inItem =
      $("inItem");

    const outItem =
      $("outItem");

    const purchaseItem =
      $("purchaseItem");


    if (inItem) {
      inItem.innerHTML =
        options;
    }

    if (outItem) {
      outItem.innerHTML =
        options;
    }

    if (purchaseItem) {
      purchaseItem.innerHTML =
        options;
    }


    /* ================================
       ITEM MASTER TABLE
    ================================= */

    const itemTable =
      $("itemTable");

    if (itemTable) {

      const search =
        (
          $("itemSearch")?.value ||
          ""
        ).toLowerCase();

      itemTable.innerHTML =
        items

          .filter(item => {

            const text =
              `${item.name || ""} ${
                item.code || ""
              } ${
                item.category || ""
              }`.toLowerCase();

            return text.includes(search);
          })

          .map(item => {

            return `
              <tr>

                <td>
                  ${item.code || "-"}
                </td>

                <td>
                  ${item.name || "-"}
                </td>

                <td>
                  ${item.category || "-"}
                </td>

                <td>
                  ${item.unit || "Nos"}
                </td>

                <td>
                  ${item.min_stock || 0}
                </td>

                <td>
                  <button
                    type="button"
                    class="delete"
                    onclick="deleteRecord('items', ${item.id})">
                    Delete
                  </button>
                </td>

              </tr>
            `;

          })

          .join("");
    }


    /* ================================
       STOCK IN TABLE
    ================================= */

    const inTable =
      $("inTable");

    if (inTable) {

      inTable.innerHTML =
        stockIn

          .map(row => {

            return `
              <tr>

                <td>
                  ${row.date || "-"}
                </td>

                <td>
                  ${itemName(
                    items,
                    row.item_id
                  )}
                </td>

                <td>
                  ${row.qty || 0}
                </td>

                <td>
                  ${row.supplier || "-"}
                </td>

                <td>
                  ${row.invoice || "-"}
                </td>

                <td>
                  <button
                    type="button"
                    class="delete"
                    onclick="deleteRecord(
                      'stock_in',
                      ${row.id}
                    )">
                    Delete
                  </button>
                </td>

              </tr>
            `;

          })

          .join("");
    }


    /* ================================
       STOCK OUT TABLE
    ================================= */

    const outTable =
      $("outTable");

    if (outTable) {

      outTable.innerHTML =
        stockOut

          .map(row => {

            return `
              <tr>

                <td>
                  ${row.date || "-"}
                </td>

                <td>
                  ${itemName(
                    items,
                    row.item_id
                  )}
                </td>

                <td>
                  ${row.qty || 0}
                </td>

                <td>
                  ${row.issued_to || "-"}
                </td>

                <td>
                  ${row.work_order || "-"}
                </td>

                <td>
                  <button
                    type="button"
                    class="delete"
                    onclick="deleteRecord(
                      'stock_out',
                      ${row.id}
                    )">
                    Delete
                  </button>
                </td>

              </tr>
            `;

          })

          .join("");
    }


    /* ================================
       CURRENT STOCK TABLE
    ================================= */

    const stockTable =
      $("stockTable");

    let lowCount = 0;


    if (stockTable) {

      stockTable.innerHTML =
        items

          .map(item => {

            const itemIn =
              stockIn

                .filter(row =>
                  Number(row.item_id) ===
                  Number(item.id)
                )

                .reduce(
                  (sum, row) =>
                    sum +
                    Number(row.qty || 0),
                  0
                );


            const itemOut =
              stockOut

                .filter(row =>
                  Number(row.item_id) ===
                  Number(item.id)
                )

                .reduce(
                  (sum, row) =>
                    sum +
                    Number(row.qty || 0),
                  0
                );


            const balance =
              itemIn - itemOut;


            const minimum =
              Number(
                item.min_stock || 0
              );


            const isLow =
              balance <= minimum;


            if (isLow) {
              lowCount++;
            }


            return `
              <tr>

                <td>
                  ${item.code || "-"}
                </td>

                <td>
                  ${item.name || "-"}
                </td>

                <td>
                  ${item.unit || "Nos"}
                </td>

                <td>
                  ${itemIn}
                </td>

                <td>
                  ${itemOut}
                </td>

                <td>
                  <b>${balance}</b>
                </td>

                <td>
                  ${
                    isLow
                      ? "⚠️ LOW"
                      : "OK"
                  }
                </td>

              </tr>
            `;

          })

          .join("");
    }


    /* ================================
       LOW STOCK COUNT
    ================================= */

    const lowStock =
      $("lowStock");

    if (lowStock) {
      lowStock.textContent =
        lowCount;
    }


    /* ================================
       STOCK STATUS
    ================================= */

    let inStockItems = 0;

    items.forEach(item => {

      const itemIn =
        stockIn

          .filter(row =>
            Number(row.item_id) ===
            Number(item.id)
          )

          .reduce(
            (sum, row) =>
              sum +
              Number(row.qty || 0),
            0
          );


      const itemOut =
        stockOut

          .filter(row =>
            Number(row.item_id) ===
            Number(item.id)
          )

          .reduce(
            (sum, row) =>
              sum +
              Number(row.qty || 0),
            0
          );


      const balance =
        itemIn - itemOut;


      if (balance > 0) {
        inStockItems++;
      }

    });


    const statusIn =
      $("statusIn");

    const statusLow =
      $("statusLow");

    const statusPercent =
      $("statusPercent");


    if (statusIn) {
      statusIn.textContent =
        inStockItems;
    }

    if (statusLow) {
      statusLow.textContent =
        lowCount;
    }


    const stockPercent =
      items.length > 0
        ? Math.round(
            (
              inStockItems /
              items.length
            ) * 100
          )
        : 0;


    if (statusPercent) {
      statusPercent.textContent =
        stockPercent + "%";
    }


    /* ================================
       STOCK BAR
    ================================= */

    const stockBar =
      $("stockInBar");

    if (stockBar) {

      const total =
        totalIn + totalOut;

      if (total > 0) {

        const percentage =
          Math.round(
            (totalIn / total) * 100
          );

        stockBar.style.width =
          percentage + "%";

        stockBar.textContent =
          percentage + "%";

      } else {

        stockBar.style.width =
          "0%";

        stockBar.textContent =
          "";
      }
    }


    /* ================================
       DASHBOARD SUMMARY
    ================================= */

    const summary =
      $("summary");

    if (summary) {

      if (items.length === 0) {

        summary.textContent =
          "No items registered yet.";

      } else {

        summary.textContent =
          `${items.length} item(s) registered. ` +
          `${lowCount} item(s) need attention for low stock.`;
      }
    }


    /* ================================
       SUPPLIER TABLE
    ================================= */

    const supplierTable =
      $("supplierTable");

    if (supplierTable) {

      supplierTable.innerHTML =
        suppliers

          .map(supplier => {

            return `
              <tr>

                <td>
                  ${
                    supplier.supplier_name ||
                    "-"
                  }
                </td>

                <td>
                  ${
                    supplier.contact_number ||
                    "-"
                  }
                </td>

                <td>
                  <button
                    type="button"
                    class="delete"
                    onclick="deleteRecord(
                      'suppliers',
                      ${supplier.id}
                    )">
                    Delete
                  </button>
                </td>

              </tr>
            `;

          })

          .join("");
    }

  } catch (error) {

    console.error(
      "RENDER ERROR:",
      error
    );

    alert(
      "Unable to load database data:\n\n" +
      error.message
    );
  }
}

/* =========================================
   SUPPLIER LOADER
========================================= */

async function loadSuppliers() {
  return await api(
    "suppliers?select=*&order=id.asc"
  );
}


/* =========================================
   ITEM DROPDOWN HELPER
========================================= */

function itemOptions(items) {

  return `
    <option value="">
      Select Item
    </option>

    ${items.map(item => `
      <option value="${item.id}">
        ${item.name || ""}${
          item.code
            ? " - " + item.code
            : ""
        }
      </option>
    `).join("")}
  `;
}


/* =========================================
   GET ITEM NAME
========================================= */

function itemName(items, id) {

  const item =
    items.find(
      x => Number(x.id) === Number(id)
    );

  if (!item) {
    return "-";
  }

  return item.name || "-";
}


/* =========================================
   DELETE RECORD
========================================= */

async function deleteRecord(table, id) {

  if (!confirm("Delete this record?")) {
    return;
  }

  try {

    await api(
      `${table}?id=eq.${id}`,
      {
        method: "DELETE"
      }
    );

    alert("Deleted successfully.");

    await render();

  } catch (error) {

    console.error(
      "DELETE ERROR:",
      error
    );

    alert(
      "Unable to delete:\n\n" +
      error.message
    );
  }
}


/* =========================================
   SEARCH ITEM MASTER
========================================= */

const itemSearch =
  $("itemSearch");

if (itemSearch) {

  itemSearch.addEventListener(
    "input",
    function () {
      render();
    }
  );
}


/* =========================================
   SEARCH CURRENT STOCK
========================================= */

const stockSearch =
  $("stockSearch");

if (stockSearch) {

  stockSearch.addEventListener(
    "input",
    function () {
      render();
    }
  );
}


/* =========================================
   PURCHASE CALCULATION
========================================= */

const purchaseQty =
  $("purchaseQty");

const purchaseRate =
  $("purchaseRate");

const purchaseTotal =
  $("purchaseTotal");


function calculatePurchaseTotal() {

  if (
    !purchaseQty ||
    !purchaseRate ||
    !purchaseTotal
  ) {
    return;
  }

  const qty =
    Number(purchaseQty.value) || 0;

  const rate =
    Number(purchaseRate.value) || 0;

  purchaseTotal.value =
    (qty * rate).toFixed(2);
}


if (purchaseQty) {

  purchaseQty.addEventListener(
    "input",
    calculatePurchaseTotal
  );
}


if (purchaseRate) {

  purchaseRate.addEventListener(
    "input",
    calculatePurchaseTotal
  );
}


/* =========================================
   CLEAR FORM ONLY AFTER SUCCESS
========================================= */

const itemForm =
  $("itemForm");

if (itemForm) {

  itemForm.addEventListener(
    "submit",
    function (event) {
      event.preventDefault();
      addItem(event);
    }
  );

}


/* =========================================
   PAGE START
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    console.log(
      "JNANASHAKTHI MAINTENANCE loaded"
    );

    render();

  }
);
