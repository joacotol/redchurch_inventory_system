document.addEventListener("DOMContentLoaded", () => {
  const rows = document.getElementById("priceRows");
  const addBtn = document.getElementById("addPriceRow");
  const saveBtn = document.getElementById("savePrices");
  const statusEl = document.getElementById("pricesStatus");
  const tpl = document.getElementById("priceRowTemplate");

  function wireRow(tr) {
    tr.querySelector(".remove-row")?.addEventListener("click", () => tr.remove());
  }

  rows?.querySelectorAll("tr").forEach(wireRow);

  addBtn?.addEventListener("click", () => {
    if (!rows || !tpl) return;
    const frag = tpl.content.cloneNode(true);
    const tr = frag.querySelector("tr");
    if (!tr) return;
    rows.appendChild(tr);
    wireRow(tr);
  });

  saveBtn?.addEventListener("click", async () => {
    if (!rows) return;

    const items = [];
    rows.querySelectorAll("tr").forEach((tr) => {
      const name = tr.querySelector(".price-name")?.value?.trim() || "";
      const priceRaw = tr.querySelector(".price-value")?.value;
      const price = priceRaw ? Number(priceRaw) : 0;
      if (name) items.push({ name, price: Number.isFinite(price) ? price : 0 });
    });

    statusEl.textContent = "";
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      const res = await fetch("/waste/prices/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      statusEl.textContent = `Saved (${data.count || 0} items)`;
    } catch (e) {
      console.error(e);
      statusEl.textContent = "Couldn’t save. Try again.";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Prices";
    }
  });
});
