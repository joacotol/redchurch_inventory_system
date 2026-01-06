from flask import Flask, render_template, request, redirect, url_for
import json
import os
import urllib.parse
from datetime import date

from flask import jsonify

app = Flask(__name__)

FILE_NAME = "catalog.json"
orders = {}  # sku -> qty

TYPE_ORDER = [
    "Cups",
    "Lids",
    "Paper Goods",
    "Containers",
    "Cleaning Products",
    "Other"
]



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

    def sort_key(item):
        try:
            type_index = TYPE_ORDER.index(item.get("type", "Other"))
        except ValueError:
            type_index = len(TYPE_ORDER)

        return (type_index, item["name"].lower())

    catalog = sorted(catalog, key=sort_key)

    return render_template(
        "index.html",
        items=catalog,
        orders=orders
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

    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return jsonify(success=True)

    return redirect(url_for("index"))

@app.route("/remove_from_order", methods=["POST"])
def remove_from_order():
    orders.pop(request.form["sku"], None)

    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return jsonify(success=True)

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

    newline = "\r\n"

    body = (
        f"Hello,{newline}{newline}"
        f"Here is the following order for Redchurch Cafe for the week of {today}.{newline}{newline}"
        + newline.join(lines)
        + f"{newline}{newline}"
        f"Thank you,{newline}"
        f"Stefanie Forget{newline}"
        f"Manager{newline}"
        f"Redchurch Cafe{newline}"
        f"68 King Street E, Hamilton ON"
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

@app.route("/order_summary")
def order_summary():
    catalog = load_catalog()
    summary = []

    for item in catalog:
        if item["sku"] in orders:
            summary.append({
                "sku": item["sku"],
                "name": item["name"],
                "unit": item["unit"],
                "qty": orders[item["sku"]]
            })

    return jsonify(summary)



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000, debug=False)
