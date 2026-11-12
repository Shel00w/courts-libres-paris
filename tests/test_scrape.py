"""Tests du collecteur sur des extraits réels de tennispadel.paris.fr (captures du 12/11/2026).

    python -m unittest discover tests
"""
import os
import sys
import unittest
from collections import Counter
from datetime import date

HERE = os.path.dirname(__file__)
sys.path.insert(0, os.path.join(HERE, "..", "scraper"))
import scrape  # noqa: E402

TODAY = date(2026, 11, 12)


def fixture(name):
    with open(os.path.join(HERE, "fixtures", name), encoding="utf-8") as f:
        return f.read()


class HomeTest(unittest.TestCase):
    def setUp(self):
        self.centres = {c["id"]: c for c in scrape.parse_home(fixture("home.html"))}

    def test_all_centres_listed(self):
        self.assertEqual(len(self.centres), 39)
        self.assertEqual(self.centres[126]["name"], "La Faluère")
        self.assertEqual((self.centres[126]["lat"], self.centres[126]["lon"]), (48.8303, 2.45013))

    def test_card_details(self):
        sab = self.centres[303]
        self.assertEqual((sab["address"], sab["cp"]), ("62 rue Cambronne", "75015"))
        self.assertEqual(sab["courts_text"], "1 court : 1 extérieur")
        aurelle = self.centres[85]
        self.assertEqual(aurelle["cp"], "92200")
        self.assertEqual(self.centres[545]["name"], "Neuve Saint Pierre")
        self.assertEqual(self.centres[567]["status"], "cs-ferme")


class CentreTest(unittest.TestCase):
    def test_sablonniere(self):
        info = scrape.parse_centre(fixture("centre_sablonniere.html"), TODAY)
        self.assertEqual(info["name"], "Sablonnière")
        self.assertEqual((info["address"], info["cp"], info["city"]), ("62 rue Cambronne", "75015", "Paris"))
        self.assertEqual((info["n_courts"], info["n_covered"]), (1, 0))
        self.assertEqual(Counter(s["day"] for s in info["slots"]), {"2026-11-13": 3, "2026-11-14": 1})
        first = info["slots"][0]
        self.assertEqual((first["hour"], first["num"], first["court"], first["surface"]), (12, 1, "Court n° 01", "Synthétique"))
        self.assertEqual((first["covered"], first["lit"], first["price"], first["id"], first["cancel"]),
                         (False, False, 12, 6683846, True))

    def test_lenglen(self):
        info = scrape.parse_centre(fixture("centre_lenglen.html"), TODAY)
        self.assertEqual((info["n_courts"], info["n_covered"]), (13, 2))
        self.assertEqual(Counter(s["day"] for s in info["slots"]), {"2026-11-12": 49, "2026-11-13": 90})
        c1 = info["courts"][1]
        self.assertEqual((c1["surface"], c1["covered"], c1["lit"]), ("Résine", False, True))
        self.assertTrue(info["courts"][11]["covered"])
        self.assertIn(20, {s["price"] for s in info["slots"] if s["covered"]})
        self.assertFalse(info["courts"][13]["lit"])
        self.assertIn(False, {s["cancel"] for s in info["slots"]})   # moins de 24 h : non annulable


class HelpersTest(unittest.TestCase):
    def test_dates(self):
        self.assertEqual(scrape.parse_day("Vendredi 13 novembre", TODAY), date(2026, 11, 13))
        self.assertEqual(scrape.parse_day("Lundi 4 janvier", date(2026, 12, 28)), date(2027, 1, 4))

    def test_addresses(self):
        self.assertEqual(scrape.split_cp("39BIS RUE DE POLIVEAU 75005"), ("39bis rue de Poliveau", "75005", ""))
        self.assertEqual(scrape.split_cp("25 allée du Capitaine Dronne - 75015"), ("25 allée du Capitaine Dronne", "75015", ""))
        self.assertEqual(scrape.arr_from_cp("75116"), 16)
        self.assertIsNone(scrape.arr_from_cp("92200"))


if __name__ == "__main__":
    unittest.main()
