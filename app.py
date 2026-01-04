from flask import Flask, render_template, request, redirect, url_for
import json
import os
import urllib.parse
from datetime import date

from flask import jsonify

app = Flask(__name__)

FILE_NAME = "catalog.json"
orders = {}  # sku -> qty


# ---------- Helpers ----------

def load_catalog():
    if not os.path.exists(FILE_NAME):
        return []
    with open(FILE_NAME, "r", encoding="utf-8") as f:
        return json.load(f)

def save_catalog(catalog):
    with open(FILE_NAME, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2)


# ---------- Routes ----------

@app.route("/", methods=["GET"])
def index():
    catalog = load_catalog()
    query = request.args.get("q", "").lower()

    results = [
        item for item in catalog
        if not query or query in item["sku"].lower() or query in item["name"].lower()
    ]

    return render_template(
        "index.html",
        items=results,
        orders=orders,
        query=query
    )


@app.route("/add_item", methods=["POST"])
def add_item():
    catalog = load_catalog()

    catalog.append({
        "sku": request.form["sku"],
        "name": request.form["name"],
        "unit": request.form["unit"]
    })

    save_catalog(catalog)
    return redirect(url_for("index"))


@app.route("/add_to_order", methods=["POST"])
def add_to_order():
    sku = request.form["sku"]
    qty = int(request.form["qty"])
    orders[sku] = orders.get(sku, 0) + qty
    return redirect(url_for("index"))


@app.route("/remove_from_order", methods=["POST"])
def remove_from_order():
    orders.pop(request.form["sku"], None)
    return redirect(url_for("index"))

@app.route("/email")
def email_order():
    catalog = load_catalog()
    today = date.today().strftime("%B %d")

    subject = f"Redchurch Cafe Weekly Order – {today}"

    lines = []
    for item in catalog:
        if item["sku"] in orders:
            lines.append(
                f"{orders[item['sku']]} {item['unit']}(s) – "
                f"[{item['sku']}] – {item['name']}"
            )

    body = (
        f"Hello,\n\nHere is the following order for Redchurch Cafe for the week of {today}.\n\n"
        + "\n".join(lines)
        + "\n\nThank you,\nStefanie Forget\nManager\nRedchurch Cafe\n68 King Street E, Hamilton ON"
    )

    gmail_url = (
        "https://mail.google.com/mail/?view=cm&fs=1&tf=1"
        f"&su={urllib.parse.quote(subject)}"
        f"&body={urllib.parse.quote(body)}"
    )

    mailto_url = (
        "mailto:?"
        f"subject={urllib.parse.quote(subject)}"
        f"&body={urllib.parse.quote(body)}"
    )

    return jsonify({
        "gmail": gmail_url,
        "mailto": mailto_url
    })



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000, debug=False)
