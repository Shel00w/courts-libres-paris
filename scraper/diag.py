#!/usr/bin/env python3
"""Diagnostic : pages centre-sportif et scripts du nouveau site tennispadel.paris.fr."""
import os, re, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
import scrape  # noqa: E402

os.makedirs("diag", exist_ok=True)
log = []
def note(m):
    print(m, flush=True); log.append(str(m))
ROOT = "https://tennispadel.paris.fr/tennispadel/"
P = ROOT + "jsp/site/Portal.jsp"
def small(h): return re.sub(r'data:image/[^"\']{200,}', "DATAIMG", h)
def grab(name, url, form=None):
    try:
        h = scrape.fetch(url, form)
        open(f"diag/{name}", "w", encoding="utf-8").write(small(h))
        note(f"{name}: OK len={len(h)} url={url[:200]}")
        return h
    except Exception as e:
        note(f"{name}: EXC {type(e).__name__} {e} url={url[:200]}")
        return ""

home = grab("home.html", P + "?page=paristennis")
for cid in ("126", "303", "188"):
    grab(f"centre_{cid}.html", P + f"?page=centre-sportif&id={cid}")
    time.sleep(0.5)
grab("horaires.html", P + "?page=horaires")
seen = set()
for page in [home] + [open(f"diag/centre_{c}.html", encoding="utf-8").read() for c in ("126",) if os.path.exists(f"diag/centre_{c}.html")]:
    for src in re.findall(r'<script[^>]+src="([^"]+)"', page):
        u = urllib.parse.urljoin(ROOT, src.replace("&amp;", "&"))
        if "tennispadel.paris.fr" not in u or u in seen:
            continue
        if not re.search(r"paristennis|centre|reserv|creneau|search|sport|site\.js", u, re.I):
            continue
        seen.add(u)
        name = "js_" + re.sub(r"[^A-Za-z0-9._-]", "_", u.split("/tennispadel/")[1].split("?")[0])[-80:]
        grab(name, u); time.sleep(0.3)
open("diag/log.txt", "w", encoding="utf-8").write("\n".join(log))
