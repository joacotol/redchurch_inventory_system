document.addEventListener("DOMContentLoaded", () => {

    const searchInput = document.getElementById("searchInput");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const query = searchInput.value.toLowerCase().trim();

            const rows = document.querySelectorAll(".product-row");
            const headers = document.querySelectorAll(".section-header");

            // Reset header visibility
            headers.forEach(h => h.style.display = "none");

            rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            const matches = text.includes(query);

            row.style.display = matches ? "" : "none";

            if (matches) {
                // Show the section header above this row
                let prev = row.previousElementSibling;
                while (prev && !prev.classList.contains("section-header")) {
                prev = prev.previousElementSibling;
                }
                if (prev) prev.style.display = "";
            }
            });

            // If search is empty, show everything
            if (!query) {
            rows.forEach(r => r.style.display = "");
            headers.forEach(h => h.style.display = "");
            }
        });
    }

  const addBox = document.getElementById("addItemBox");

  document.getElementById("toggleAddItemBtn").onclick = () =>
    addBox.classList.toggle("hidden");

  document.getElementById("cancelAddItemBtn").onclick = () =>
    addBox.classList.add("hidden");

  document.getElementById("resetSearchBtn").onclick = () =>
    (window.location.href = "/");

  const modal = document.getElementById("orderSummaryModal");
  const summaryList = document.getElementById("summaryList");

  document.getElementById("viewSummaryBtn").onclick = async () => {
      summaryList.innerHTML = "<p>Loading…</p>";
      modal.classList.remove("hidden");

      const res = await fetch("/order_summary");
      const items = await res.json();

      if (items.length === 0) {
          summaryList.innerHTML = "<p>No items in the order yet.</p>";
          return;
      }

      summaryList.innerHTML = "";

      items.forEach(item => {
          const row = document.createElement("div");
          row.className = "summary-row";

          row.innerHTML = `
              <span class="summary-qty">${item.qty}</span>
              ${item.unit}(s) – [${item.sku}] – ${item.name}
              <form class="remove-from-order-form" style="display:inline">
                  <input type="hidden" name="sku" value="${item.sku}">
                  <button class="secondary-btn">Remove</button>
              </form>
          `;

          summaryList.appendChild(row);
          attachRemoveHandler(row.querySelector(".remove-from-order-form"));
      });
  };


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

  document.querySelectorAll(".qty-control").forEach(control => {
    const minus = control.querySelector(".minus");
    const plus = control.querySelector(".plus");
    const display = control.querySelector(".qty-display");
    const input = control.querySelector(".qty-input");

    let value = parseInt(input.value, 10);

    minus.addEventListener("click", () => {
        if (value > 1) {
            value--;
            display.textContent = value;
            input.value = value;
        }
    });

    plus.addEventListener("click", () => {
        value++;
        display.textContent = value;
        input.value = value;
    });
  });




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

  // ----- ADD TO ORDER (AJAX ONLY, NO UI MUTATION) -----
  document.querySelectorAll(".add-to-order-form").forEach(form => {
      form.addEventListener("submit", async e => {
          e.preventDefault();

          const formData = new FormData(form);

          await fetch("/add_to_order", {
              method: "POST",
              body: formData,
              headers: {
                  "X-Requested-With": "XMLHttpRequest"
              }
          });
// Visual confirmation
        const row = form.closest("tr");
        if (row) {
            row.classList.add("row-added");
            setTimeout(() => row.classList.remove("row-added"), 800);
        }

        // Pulse qty field
        const qtyInput = form.querySelector("input[name='qty']");
        if (qtyInput) {
            qtyInput.classList.add("qty-pulse");
            setTimeout(() => qtyInput.classList.remove("qty-pulse"), 500);
            qtyInput.value = 1
        }
          
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

