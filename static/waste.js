function clampInt(n, min, max) {
  const x = parseInt(n, 10);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function setQty(controlEl, qty) {
  const q = clampInt(qty, 1, 999);
  controlEl.dataset.qty = String(q);
  const display = controlEl.querySelector(".qty-display");
  if (display) display.textContent = String(q);
}

function wireRow(rowEl) {
  const control = rowEl.querySelector(".qty-control");
  const minus = rowEl.querySelector(".qty-btn.minus");
  const plus = rowEl.querySelector(".qty-btn.plus");
  const remove = rowEl.querySelector(".remove-row");

  if (control) {
    // Ensure initial display matches dataset
    setQty(control, control.dataset.qty || 1);
  }

  minus?.addEventListener("click", () => {
    const current = control?.dataset.qty || "1";
    setQty(control, parseInt(current, 10) - 1);
  });

  plus?.addEventListener("click", () => {
    const current = control?.dataset.qty || "1";
    setQty(control, parseInt(current, 10) + 1);
  });

  remove?.addEventListener("click", () => {
    rowEl.remove();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const rowsTbody = document.getElementById("wasteRows");
  const addBtn = document.getElementById("addRowBtn");
  const saveBtn = document.getElementById("saveWasteBtn");
  const statusEl = document.getElementById("saveStatus");
  const dateIsoEl = document.getElementById("wasteDateIso");
  const template = document.getElementById("wasteRowTemplate");

  // Wire existing rows
  rowsTbody?.querySelectorAll("tr").forEach(wireRow);

  addBtn?.addEventListener("click", () => {
    if (!rowsTbody || !template) return;
    const fragment = template.content.cloneNode(true);
    const newRow = fragment.querySelector("tr");
    if (!newRow) return;

    rowsTbody.appendChild(newRow);
    wireRow(newRow);
  });

  saveBtn?.addEventListener("click", async () => {
    if (!rowsTbody || !dateIsoEl) return;

    const dateIso = (dateIsoEl.value || "").trim();
    const entries = [];

    rowsTbody.querySelectorAll("tr").forEach((tr) => {
      const item = tr.querySelector(".waste-item")?.value?.trim() || "";
      const reason = tr.querySelector(".waste-reason")?.value?.trim() || "Other";
      const qty = parseInt(tr.querySelector(".qty-control")?.dataset?.qty || "1", 10);

      if (item) {
        entries.push({ item, qty, reason });
      }
    });

    // UI feedback
    statusEl.textContent = "";
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      const res = await fetch("/waste/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateIso, entries }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Save failed");
      }

      const data = await res.json();
      statusEl.textContent = `Saved (${data.saved || 0} items)`;
    } catch (err) {
      statusEl.textContent = "Couldn’t save. Please try again.";
      console.error(err);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Daily Log";
    }
  });

    const viewDateSelect = document.getElementById("viewDateSelect");
    viewDateSelect?.addEventListener("change", () => {
    const iso = viewDateSelect.value;
    window.location.href = `/waste?date=${encodeURIComponent(iso)}`;
    });


});
