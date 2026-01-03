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

});
