#!/usr/bin/env python3
"""Diagnostic : capture le nouveau site tennispadel.paris.fr."""
import os, re, sys, json, time, urllib.parse
from datetime import datetime, timedelta
sys.path.insert(0, os.path.dirname(__file__))
import scrape  # noqa: E402

os.makedirs("diag", exist_ok=True)
log = []
def note(m):
    print(m, flush=True); log.append(str(m))

JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
def fr(d): return f"{JOURS[d.weekday()]} {d.day} {MOIS[d.month-1]}"

BASE = "https://tennispadel.paris.fr"
P = BASE + "/tennispadel/jsp/site/Portal.jsp"
today = datetime.now(scrape.PARIS).date()
d1 = today + timedelta(days=1); d5 = today + timedelta(days=5)

def grab(name, url, form=None):
    try:
        h = scrape.fetch(url, form)
        open(f"diag/{name}", "w", encoding="utf-8").write(h)
        note(f"{name}: OK len={len(h)} url={url[:160]}")
        return h
    except Exception as e:
        body = ""
        if hasattr(e, "read"):
            try: body = e.read().decode("utf-8", "replace")[:500]
            except Exception: pass
        note(f"{name}: EXC {type(e).__name__} {e} url={url[:160]} body={body!r}")
        return ""

home = grab("home.html", BASE + "/")
grab("robots.txt", BASE + "/robots.txt")
pt = grab("paristennis.html", P + "?page=paristennis")
q = lambda d, h1="08:00", h2="22:00", sport=1: P + "?" + urllib.parse.urlencode(
    {"page": "paristennis", "hourFrom": h1, "hourTo": h2, "date1": fr(d), "sport": sport})
s1 = grab("search_d1.html", q(d1))
s5 = grab("search_d5.html", q(d5))
grab("search_d1_padel.html", q(d1, sport=2))

# scripts et liens internes
seen = set()
for page in (home, pt, s1):
    for src in re.findall(r'<script[^>]+src="([^"]+)"', page):
        u = urllib.parse.urljoin(P, src)
        if "tennispadel.paris.fr" in u and u not in seen and len(seen) < 40:
            seen.add(u)
            name = "js_" + re.sub(r"[^A-Za-z0-9._-]", "_", u.split("tennispadel.paris.fr")[1])[-90:]
            grab(name, u)
            time.sleep(0.3)
links = sorted(set(re.findall(r'(?:href|action|data-url|url)\s*[=:]\s*["\']([^"\']*(?:page=|action=|/rest/|/api/)[^"\']*)', s1 + pt + home)))
open("diag/links.txt", "w").write("\n".join(links))
note(f"links: {len(links)}")
note("cookies: " + ", ".join(c.name for c in scrape._jar))
open("diag/log.txt", "w", encoding="utf-8").write("\n".join(log))
