#!/usr/bin/env python3
"""Diagnostic : capture les pages brutes de tennis.paris.fr dans diag/ pour analyse."""
import json
import os
import re
import sys
import time
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))
import scrape  # noqa: E402

OUT = "diag"
os.makedirs(OUT, exist_ok=True)


def save(name, text):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(text)


log = []


def note(msg):
    print(msg, flush=True)
    log.append(msg)


page = scrape.fetch(scrape.SEARCH_PAGE)
save("search_page.html", page)
sites, token = scrape.parse_sites(page)
save("sites_all.json", json.dumps(sites, ensure_ascii=False, indent=1))
note(f"search page: {len(page)} chars, {len(sites)} sites, token={token}")

# Champs du formulaire
controls = re.findall(r'<(input|select|option|button)\b([^>]*)>([^<]{0,80})', page)
lines = []
for tag, attrs, text in controls:
    if any(k in attrs for k in ("name=", "value=", "id=")):
        lines.append(f"{tag} {attrs.strip()} | {text.strip()}")
save("form_controls.txt", "\n".join(lines))
coat = re.findall(r'name="selCoating"[^>]*value="([^"]+)"|value="([^"]+)"[^>]*name="selCoating"', page)
note(f"selCoating values in page: {coat}")

# Autres pages utiles
for name, url in [
    ("tennis_parisiens.html", scrape.BASE + "?page=tennisParisien&view=les_tennis_parisiens"),
    ("planning_valeyre.html", scrape.BASE + "?page=recherche&view=planning&name_tennis=Valeyre"),
    ("rates.html", scrape.BASE + "?page=rate&view=les_tarifs"),
]:
    try:
        h = scrape.fetch(url)
        save(name, h)
        note(f"{name}: {len(h)} chars")
    except Exception as e:
        note(f"{name}: ERROR {e}")
    time.sleep(1)

bookable = [s for s in sites if s["bookable"]]
names = [s["name"] for s in bookable]
today = datetime.now(scrape.PARIS).date()
days = [today + timedelta(days=1), today + timedelta(days=5)]

for d in days:
    when = d.strftime("%d/%m/%Y")
    # 1) par groupes de 8, comme le collecteur
    for gi in range(0, len(names), 8):
        group = names[gi:gi + 8]
        form = {"token": token or "", "when": when, "hourRange": "8-22",
                "selWhereTennisName": group, "selInOut": scrape.IN_OUT, "selCoating": scrape.COATINGS}
        h = scrape.fetch(scrape.SEARCH_ACTION, form)
        save(f"res_{d.isoformat()}_g{gi // 8}.html", h)
        note("%s g%d: %d chars, heads=%d, rows=%d" % (when, gi // 8, len(h), h.count('id="head'), h.count('tennis-court')))
        time.sleep(1)
    # 2) tous les clubs d'un coup, sans filtre surface ni couvert
    form = {"token": token or "", "when": when, "hourRange": "8-22", "selWhereTennisName": names}
    h = scrape.fetch(scrape.SEARCH_ACTION, form)
    save(f"res_{d.isoformat()}_all_nofilter.html", h)
    note("%s all-nofilter: %d chars, heads=%d, rows=%d" % (when, len(h), h.count('id="head'), h.count('tennis-court')))
    time.sleep(1)

save("log.txt", "\n".join(log))
