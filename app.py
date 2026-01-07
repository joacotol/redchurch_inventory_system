from flask import Flask, render_template, request, redirect, url_for
import json
import os
import urllib.parse
from datetime import date, timedelta
import subprocess
import re

from flask import jsonify

app = Flask(__name__)

FILE_NAME = "catalog.json"
orders = {}  # sku -> qty
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

TYPE_ORDER = [
    "Cups",
    "Lids",
    "Paper Goods",
    "Containers",
    "Cleaning Products",
    "Other"
]

CUP_SUBTYPE_ORDER = {
    "paper": 0,
    "plastic": 1,
    "portion": 2
}

def format_day_with_suffix(d):
    if 11 <= d.day <= 13:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(d.day % 10, "th")
    return f"{d.strftime('%B')} {d.day}{suffix}"





# ---------- Helpers ----------

def load_catalog():
    if not os.path.exists(FILE_NAME):
        return []
    with open(FILE_NAME, "r", encoding="utf-8") as f:
        return json.load(f)

def save_catalog(catalog):
    with open("catalog.json", "w") as f:
        json.dump(catalog, f, indent=2)

    subprocess.run(["git", "add", "catalog.json"])
    subprocess.run(["git", "commit", "-m", "Update catalog"])
    subprocess.run([
        "git",
        "push",
        f"https://{GITHUB_TOKEN}@github.com/joacotol/redchurch_inventory_system.git",
        "main"
    ])

def cup_subtype(name: str) -> int:
    n = name.lower()

    if "portion" in n:
        return 2
    if "clear" in n or "plastic" in n:
        return 1
    return 0  # paper (default)

def extract_oz(name: str) -> int:
    match = re.search(r"(\d+)\s?oz", name.lower())
    return int(match.group(1)) if match else 999




# ---------- Routes ----------

@app.route("/", methods=["GET"])
def index():
    catalog = load_catalog()

    def sort_key(item):
        try:
            type_index = TYPE_ORDER.index(item.get("type", "Other"))
        except ValueError:
            type_index = len(TYPE_ORDER)

        name_for_sort = (item.get("display_name") or item["name"]).lower()

        # Special sorting for Cups
        if item.get("type") == "Cups":
            return (
                type_index,
                cup_subtype(name_for_sort),
                extract_oz(name_for_sort),
                name_for_sort
            )

        # Default sorting for all other types
        return (type_index, name_for_sort)


    catalog = sorted(catalog, key=sort_key)

    return render_template(
        "index.html",
        items=catalog,
        orders=orders,
        product_types=TYPE_ORDER
    )



@app.route("/add_item", methods=["POST"])
def add_item():
    catalog = load_catalog()
    item_type = request.form["type"]

    if item_type not in TYPE_ORDER:
        abort(400, "Invalid Product Type")

    catalog.append({
        "sku": request.form["sku"],
        "name": request.form["name"],
        "unit": request.form["unit"],
        "type": item_type
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

    today_date = date.today()
    delivery_date = today_date + timedelta(days=1)

    today_formatted = format_day_with_suffix(today_date)
    delivery_formatted = format_day_with_suffix(delivery_date)
    delivery_weekday = delivery_date.strftime("%A")


    lines = []
    for item in catalog:
        if item["sku"] in orders:
            lines.append(
                f"{orders[item['sku']]} {item['unit']}(s) – "
                f"[{item['sku']}] – {item['name']}"
            )

    newline = "\r\n"

    body = (
        f"Good morning!{newline}"
        f"This is our order for the week of {today_formatted}, "
        f"for a delivery of {delivery_weekday} {delivery_formatted}, please."
        f"{newline}{newline}"
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
