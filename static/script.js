document.addEventListener("DOMContentLoaded", () => {
  const addBox = document.getElementById("addItemBox");

  document.getElementById("toggleAddItemBtn").onclick = () =>
    addBox.classList.toggle("hidden");

  document.getElementById("cancelAddItemBtn").onclick = () =>
    addBox.classList.add("hidden");

  document.getElementById("resetSearchBtn").onclick = () =>
    (window.location.href = "/");

  const modal = document.getElementById("orderSummaryModal");
  document.getElementById("viewSummaryBtn").onclick = () =>
    modal.classList.remove("hidden");

  document.getElementById("closeSummaryBtn").onclick = () =>
    modal.classList.add("hidden");

  const emailBtn = document.getElementById("emailOrder");

  if (emailBtn) {
      emailBtn.addEventListener("click", async () => {
          try {
              const res = await fetch("/email");
              const data = await res.json();

              const isMobile =
                  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

              if (isMobile) {
                // iOS: use navigation (no window.open)
                window.location.href = data.mailto;
              } else {
                // Desktop: open gmail in new tab
                window.open(data.gmail, "_blank", "noopener");
              }
          } catch (err) {
              alert("Could not open email draft.");
              console.error(err);
          }
      });
  }



  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  };

  // ----- COPY ORDER SUMMARY TO CLIPBOARD -----
  const copySummaryBtn = document.getElementById("copySummaryBtn");
  const summaryTextContainer = document.getElementById("orderSummaryText");

  if (copySummaryBtn && summaryTextContainer) {
      copySummaryBtn.addEventListener("click", async () => {
          // Build clean text (one item per line)
          let text = "";
          const rows = summaryTextContainer.querySelectorAll(".summary-row");

          if (rows.length === 0) {
              alert("No items to copy.");
              return;
          }

          rows.forEach(row => {
              text += row.innerText.replace("Remove", "").trim() + "\n";
          });

          try {
              await navigator.clipboard.writeText(text.trim());
              copySummaryBtn.innerText = "✅ Copied!";
              setTimeout(() => {
                  copySummaryBtn.innerText = "📋 Copy to Clipboard";
              }, 1500);
          } catch (err) {
              // Fallback for older browsers
              const tempTextarea = document.createElement("textarea");
              tempTextarea.value = text.trim();
              document.body.appendChild(tempTextarea);
              tempTextarea.select();
              document.execCommand("copy");
              document.body.removeChild(tempTextarea);

              copySummaryBtn.innerText = "✅ Copied!";
              setTimeout(() => {
                  copySummaryBtn.innerText = "📋 Copy to Clipboard";
              }, 1500);
          }
      });
  }

  // ----- ADD TO ORDER (AJAX + LIVE SUMMARY UPDATE) -----
  document.querySelectorAll(".add-to-order-form").forEach(form => {
      form.addEventListener("submit", async e => {
          e.preventDefault();

          const formData = new FormData(form);
          const sku = form.dataset.sku;
          const name = form.dataset.name;
          const unit = form.dataset.unit;
          const qty = parseInt(formData.get("qty"), 10);

          await fetch("/add_to_order", {
              method: "POST",
              body: formData,
              headers: {
                  "X-Requested-With": "XMLHttpRequest"
              }
          });

          // ----- UPDATE SUMMARY UI -----
          const summaryList = document.querySelector(".summary-list");

          if (!summaryList) return;

          // Try to find existing summary row
          let row = summaryList.querySelector(`[data-sku="${sku}"]`);

          if (row) {
              // Update quantity
              const qtySpan = row.querySelector(".summary-qty");
              qtySpan.textContent = parseInt(qtySpan.textContent, 10) + qty;
          } else {
              // Create new row
              row = document.createElement("div");
              row.className = "summary-row";
              row.dataset.sku = sku;

              row.innerHTML = `
                  <span class="summary-qty">${qty}</span> ${unit}(s) – [${sku}] – ${name}
                  <form class="remove-from-order-form" style="display:inline">
                      <input type="hidden" name="sku" value="${sku}">
                      <button class="secondary-btn">Remove</button>
                  </form>
              `;

              summaryList.appendChild(row);
              attachRemoveHandler(row.querySelector(".remove-from-order-form"));
          }

          // Reset qty field
          form.querySelector("input[name='qty']").value = 1;
      });
  });



  // ----- REMOVE FROM ORDER (AJAX) -----
  document.querySelectorAll(".remove-from-order-form").forEach(form => {
      form.addEventListener("submit", async e => {
          e.preventDefault();

          const formData = new FormData(form);

          await fetch("/remove_from_order", {
              method: "POST",
              body: formData,
              headers: {
                  "X-Requested-With": "XMLHttpRequest"
              }
          });

          // Remove row from summary instantly
          form.closest(".summary-row").remove();
      });
  });



});

function attachRemoveHandler(form) {
    form.addEventListener("submit", async e => {
        e.preventDefault();

        const formData = new FormData(form);
        const row = form.closest(".summary-row");

        await fetch("/remove_from_order", {
            method: "POST",
            body: formData,
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        });

        row.remove();
    });
}

