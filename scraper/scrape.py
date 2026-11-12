#!/usr/bin/env python3
"""Collecte tous les créneaux libres des tennis de la Ville de Paris.

Source : tennispadel.paris.fr (Paris Tennis Padel), consultable sans compte.
Depuis le 3 novembre 2026, l'ancien site tennis.paris.fr renvoie vers cette adresse.

La page d'accueil liste les centres sportifs (id, nom, adresse, coordonnées).
La page de chaque centre liste, jour par jour et court par court, les créneaux
libres avec leur heure, leur prix et l'identifiant qui sert à réserver.

Sortie : un fichier JSON (par défaut site/data.json) lu par site/index.html.
Python 3.9+ et bibliothèque standard uniquement : rien à installer.

    python scraper/scrape.py                 # écrit site/data.json
    python scraper/scrape.py --out data.json

Code de sortie 1 si la collecte n'a rien donné (la page publiée garde alors
les données précédentes plutôt que d'afficher une liste vide).
"""
from __future__ import annotations

import argparse
import gzip
import html as htmllib
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from http.cookiejar import CookieJar
from zoneinfo import ZoneInfo

ROOT = "https://tennispadel.paris.fr/tennispadel/"
PORTAL = ROOT + "jsp/site/Portal.jsp"
HOME = PORTAL + "?page=paristennis"
CENTRE = PORTAL + "?page=centre-sportif&id={}"
BOOK = PORTAL + "?page=reservation-etape-1&id={}"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/129.0 Safari/537.36")
PARIS = ZoneInfo("Europe/Paris")
DELAY_S = 1.0     # pause entre deux requêtes, pour rester discret

MOIS = {m: i + 1 for i, m in enumerate(
    ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
     "septembre", "octobre", "novembre", "décembre"])}
MOIS["fevrier"], MOIS["aout"], MOIS["decembre"] = 2, 8, 12


# --------------------------------------------------------------------------- HTTP

_jar = CookieJar()
_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(_jar))
_opener.addheaders = [
    ("User-Agent", UA),
    ("Accept-Encoding", "gzip"),
    ("Accept-Language", "fr-FR,fr;q=0.9"),
]


def fetch(url: str, form: dict | None = None, retries: int = 3) -> str:
    body = urllib.parse.urlencode(form, doseq=True).encode() if form else None
    for attempt in range(retries):
        try:
            with _opener.open(url, body, timeout=60) as r:
                raw = r.read()
                if r.headers.get("Content-Encoding") == "gzip" or raw[:2] == b"\x1f\x8b":
                    raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
                return raw.decode("utf-8", "replace")
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(4 * (attempt + 1))
    raise RuntimeError("unreachable")


# ----------------------------------------------------------------------- nettoyage

def text(fragment: str) -> str:
    """HTML -> texte sur une ligne."""
    s = re.sub(r"<svg.*?</svg>", " ", fragment or "", flags=re.S)
    s = htmllib.unescape(re.sub(r"<[^>]+>", " ", s)).replace("\xa0", " ")
    return re.sub(r"\s+", " ", s).strip()


def clean_address(s: str) -> str:
    s = re.sub(r"\s+", " ", s or "").strip().rstrip(" -,").strip()
    return tidy_caps(s)


_SMALL = {"de", "du", "des", "la", "le", "les", "et", "d", "l", "au", "aux", "sur"}
_STREET = {"rue", "avenue", "boulevard", "allée", "allee", "place", "quai", "route",
           "passage", "cité", "cite", "impasse", "square", "chemin", "villa", "av", "bd"}


def tidy_caps(s: str) -> str:
    """'39BIS RUE DE POLIVEAU' -> '39bis rue de Poliveau' (ne touche pas au texte déjà en casse mixte)."""
    if not s or s != s.upper() or not re.search(r"[A-Z]", s):
        return s
    out = []
    for i, w in enumerate(s.lower().split(" ")):
        if not w or w[0].isdigit() or w in _SMALL or (w in _STREET and i > 0):
            out.append(w)
        else:
            out.append("-".join(p[:1].upper() + p[1:] for p in w.split("-")))
    return " ".join(out)


def split_cp(addr_line: str) -> tuple[str, str, str]:
    """'62 rue Cambronne  75015 Paris' -> ('62 rue Cambronne', '75015', 'Paris')."""
    m = re.search(r"^(.*?)[\s,-]*\b(\d{5})\b\s*(.*)$", addr_line or "")
    if not m:
        return clean_address(addr_line), "", ""
    return clean_address(m.group(1)), m.group(2), m.group(3).strip()


def arr_from_cp(cp: str) -> int | None:
    if cp.startswith("75") and len(cp) == 5:
        n = int(cp[3:])
        return 16 if n == 16 else (n if 1 <= n <= 20 else None)
    return None


def court_number(label: str) -> int | None:
    m = re.search(r"n\s*°\s*0*(\d+)", label or "", re.I)
    return int(m.group(1)) if m else None


def parse_day(label: str, today: date) -> date | None:
    """'Vendredi 13 novembre' -> date, en passant à l'année suivante en fin d'année."""
    m = re.search(r"(\d{1,2})\s+([a-zéèûô]+)", label.lower())
    if not m or m.group(2) not in MOIS:
        return None
    d, mo = int(m.group(1)), MOIS[m.group(2)]
    year = today.year + (1 if mo < today.month - 6 else 0)
    try:
        return date(year, mo, d)
    except ValueError:
        return None


# --------------------------------------------------------------- page d'accueil

def parse_home(page: str) -> list[dict]:
    """Les centres de la page d'accueil : id, nom, coordonnées, statut, adresse, courts."""
    centres: dict[str, dict] = {}
    for cid, lat, lng, status, name in re.findall(
            r'<li class="equipement-list-item" id="(\d+)" data-lat="([^"]*)" data-lng="([^"]*)"'
            r' data-status="([^"]*)"[^>]*>([^<]*)</li>', page):
        centres.setdefault(cid, {
            "id": int(cid), "name": tidy_caps(text(name)),
            "lat": float(lat) if lat else None, "lon": float(lng) if lng else None,
            "status": status,
        })
    for cid, block in re.findall(r'<div class="card secondary" data-id="(\d+)">(.*?)Choisir ce centre', page, re.S):
        c = centres.get(cid)
        if not c or "address" in c:
            continue
        m = re.search(r"paris-icon-pin.*?</svg>(.*?)</strong>", block, re.S)
        if m:
            c["address"], c["cp"], c["city"] = split_cp(text(m.group(1)))
        m = re.search(r'<span class="courts">(.*?)</span>', block, re.S)
        if m:
            c["courts_text"] = text(m.group(1))
        c["surfaces"] = [text(s) for s in re.findall(r'class="badge-label">(.*?)</p>', block, re.S)]
    return list(centres.values())


# ----------------------------------------------------------------- page centre

def parse_centre(page: str, today: date) -> dict:
    """Nom, adresse, courts et créneaux libres d'une page centre-sportif."""
    out: dict = {"slots": [], "courts": {}}
    m = re.search(r'class="tc-center-header-title"[^>]*>(.*?)</h1>', page, re.S)
    if m:
        out["name"] = tidy_caps(text(m.group(1)))
    m = re.search(r"tc-center-header-title.*?<span class=\"me-lg-5[^\"]*\">(.*?)</span>\s*"
                  r"<span[^>]*>(.*?)</span>", page, re.S)
    if m:
        out["address"], out["cp"], out["city"] = split_cp(text(m.group(1)))
        cm = re.search(r"(\d+)\s*courts?\s*dont\s*(\d+)\s*couverts?\s*(\d+)", text(m.group(2)))
        if cm:
            out["n_courts"], out["n_covered"] = int(cm.group(1)), int(cm.group(2))

    days = re.split(r'<h3 class="tc-center-list-court-date[^"]*">', page)[1:]
    for chunk in days:
        day = parse_day(text(chunk.split("</h3>", 1)[0]), today)
        if day is None:
            continue
        for court_block in re.split(r"data-js-center-slot-container", chunk)[1:]:
            hm = re.search(r'class="tc-center-list-court-number[^"]*"[^>]*>(.*?)</h4>', court_block, re.S)
            if not hm:
                continue
            label = text(hm.group(1))
            if "padel" in label.lower():
                continue
            infos = [text(p).lower() for p in re.findall(
                r'<p class="mt-lg-0 mt-3 me-3 font-bold">(.*?)</p>', court_block, re.S)]
            covered = any(i.startswith("court couvert") or i == "couvert" for i in infos)
            lit = any("clair" in i and "non" not in i for i in infos)
            surface = next((text(b) for b in re.findall(r'class="badge-label">(.*?)</p>', court_block, re.S)), "")
            num = court_number(label)
            key = num if num is not None else label
            out["courts"].setdefault(key, {
                "num": num, "label": re.sub(r"^TEP/", "", label), "surface": surface,
                "covered": covered, "lit": lit,
            })
            for sid, cancel, hour, price in re.findall(
                    r'name="creneauRadio"[^>]*value="(\d+)"(?:[^>]*data-js-slot-annulable="(\w+)")?[^>]*>'
                    r'.*?tc-center-list-court-radio-hour">\s*(\d{1,2}):\d{2}\s*<'
                    r'.*?tc-center-list-court-radio-price[^>]*>(.*?)</p>', court_block, re.S):
                pm = re.search(r"(\d+(?:[.,]\d+)?)", text(price))
                p = float(pm.group(1).replace(",", ".")) if pm else None
                if p is not None and p == int(p):
                    p = int(p)
                out["slots"].append({
                    "day": day.isoformat(), "hour": int(hour), "num": num,
                    "court": out["courts"][key]["label"], "surface": surface,
                    "covered": covered, "lit": lit, "price": p, "id": int(sid),
                    "cancel": cancel != "false",
                })
    return out


# --------------------------------------------------------------------------- main

def collect(delay: float = DELAY_S, log=print) -> dict:
    started = time.time()
    now = datetime.now(PARIS)
    today = now.date()

    centres = parse_home(fetch(HOME))
    if not centres:
        raise RuntimeError("aucun centre trouvé sur la page d'accueil (structure changée ?)")
    log(f"{len(centres)} centres de tennis sur tennispadel.paris.fr")

    sites, rows, errors = [], [], []
    for c in sorted(centres, key=lambda c: c["name"]):
        time.sleep(delay)
        try:
            info = parse_centre(fetch(CENTRE.format(c["id"])), today)
        except Exception as e:  # un centre raté ne doit pas tout faire tomber
            errors.append(f"{c['name']} ({c['id']}): {type(e).__name__}: {e}")
            log(f"ERREUR {errors[-1]}")
            info = {"slots": [], "courts": {}}
        address = info.get("address") or c.get("address", "")
        cp = info.get("cp") or c.get("cp", "")
        city = info.get("city") or c.get("city") or ("Paris" if cp.startswith("75") else "")
        courts = sorted(info["courts"].values(), key=lambda x: (x["num"] is None, x["num"] or 0, x["label"]))
        idx = len(sites)
        sites.append({
            "id": c["id"],
            "name": info.get("name") or c["name"],
            "arr": arr_from_cp(cp),
            "address": address,
            "cp": cp,
            "city": city,
            "lat": c.get("lat"),
            "lon": c.get("lon"),
            "outside": not cp.startswith("75"),
            "online": True,
            "closed": c.get("status") == "cs-ferme",
            "courts_text": c.get("courts_text", ""),
            "n_courts": info.get("n_courts"),
            "n_covered": info.get("n_covered"),
            "surfaces": c.get("surfaces") or sorted({x["surface"] for x in courts if x["surface"]}),
            "courts": courts,
            "notices": [],
        })
        for s in info["slots"]:
            if s["day"] < today.isoformat():
                continue
            rows.append((s["day"], [idx, s["hour"], s["num"], s["court"], s["surface"], int(s["covered"]),
                                    int(s["lit"]), s["price"], "", s["id"], int(s["cancel"])]))
        log(f"{sites[-1]['name']}: {len(info['slots'])} créneaux")

    last = max((d for d, _ in rows), default=today.isoformat())
    days = [date.fromordinal(o).isoformat() for o in range(today.toordinal(), date.fromisoformat(last).toordinal() + 1)]
    slots: dict[str, list] = {d: [] for d in days}
    seen = set()
    for d, r in rows:
        k = (d, r[0], r[1], r[2] if r[2] is not None else r[3])
        if k in seen:
            continue
        seen.add(k)
        slots[d].append(r)
    for v in slots.values():
        v.sort(key=lambda x: (x[1], x[0], x[2] or 0))

    total = sum(len(v) for v in slots.values())
    return {
        "version": 3,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "tennispadel.paris.fr",
        "book_url": BOOK.format("{id}"),
        "centre_url": CENTRE.format("{id}"),
        "days": days,
        "sites": sites,
        "slot_fields": ["site", "hour", "num", "court", "surface", "covered", "lit", "price", "tarif", "id", "cancel"],
        "slots": slots,
        "total": total,
        "errors": errors,
        "duration_s": round(time.time() - started),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", default="site/data.json")
    args = ap.parse_args()

    log = lambda msg: print(msg, file=sys.stderr, flush=True)  # noqa: E731
    try:
        data = collect(log=log)
    except Exception as e:
        log(f"Échec de la collecte : {type(e).__name__}: {e}")
        return 1

    if data["total"] == 0:
        log("Aucun créneau trouvé : on ne remplace pas les données existantes.")
        return 1

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    log(f"OK : {data['total']} créneaux, {len(data['sites'])} centres, "
        f"{len(data['errors'])} erreurs, {data['duration_s']} s → {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
