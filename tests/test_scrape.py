"""Tests du collecteur sur des extraits réels de tennis.paris.fr (captures du 19/10/2026).

    python -m unittest discover tests
"""
import os
import sys
import unittest
from datetime import datetime

HERE = os.path.dirname(__file__)
sys.path.insert(0, os.path.join(HERE, "..", "scraper"))
import scrape  # noqa: E402


def fixture(name):
    with open(os.path.join(HERE, "fixtures", name), encoding="utf-8") as f:
        return f.read()


NOW = datetime(2026, 10, 19, 20, 0, tzinfo=scrape.PARIS)


class SitesTest(unittest.TestCase):
    def setUp(self):
        self.page = fixture("search_page.html")
        self.sites = {s["key"]: s for s in scrape.build_sites(scrape.extract_features(self.page), NOW)}

    def test_token_and_coatings(self):
        self.assertTrue(scrape.parse_token(self.page))
        self.assertEqual(set(scrape.parse_coatings(self.page)), {"96", "2095", "94", "1324", "2016", "92"})

    def test_padel_excluded_and_duplicates_merged(self):
        self.assertNotIn("Padel Jules Ladoumègue", self.sites)
        mimoun = self.sites["Alain Mimoun"]          # deux entrées sur la carte, un seul club
        self.assertEqual(len(mimoun["courts"]), 6)
        self.assertEqual(sum(c["covered"] for c in mimoun["courts"]), 3)
        self.assertEqual([c["num"] for c in mimoun["courts"]], [1, 2, 3, 4, 5, 6])

    def test_outside_paris_and_closed(self):
        aurelle = self.sites["Aurelle de Paladines"]
        self.assertTrue(aurelle["outside"])
        self.assertEqual((aurelle["arr"], aurelle["city"]), (17, "Neuilly sur Seine"))
        self.assertFalse(self.sites["Amandiers"]["bookable"])
        self.assertTrue(self.sites["Poliveau"]["bookable"])

    def test_text_cleanup(self):
        self.assertEqual(self.sites["Poliveau"]["address"], "39bis rue de Poliveau")
        self.assertEqual(self.sites["NEUVE SAINT PIERRE"]["name"], "Neuve Saint Pierre")
        self.assertEqual(len(self.sites["NEUVE SAINT PIERRE"]["courts"]), 1)   # « Gymnase Type B »
        self.assertEqual(scrape.fix_text("F¿ri¿"), "Férié")
        self.assertEqual(scrape.fix_text("H?bergement d'urgence"), "Hébergement d'urgence")


class ResultsTest(unittest.TestCase):
    def test_results(self):
        keys = {scrape.norm_key(n): n for n in ["Poliveau", "Alain Mimoun"]}
        res, unknown = scrape.parse_results(fixture("results.html"), keys)
        self.assertEqual(unknown, set())
        by = {(r["site"], r["hour"], r["num"]) for r in res}
        self.assertIn(("Poliveau", 19, 1), by)
        self.assertIn(("Poliveau", 20, 1), by)
        self.assertEqual(len(res), 9)
        pol = next(r for r in res if r["site"] == "Poliveau")
        self.assertEqual((pol["court"], pol["surface"], pol["covered"], pol["lit"], pol["price"], pol["tarif"]),
                         ("Court N°1", "Synthétique", True, True, 20, "P"))

    def test_non_eclaire(self):
        row = ('<div class="panel-heading" id="headPoliveau08h"></div><div class="row tennis-court">'
               '<span class="court">Court N°13 - Bitume - Non Eclairé</span>'
               '<span class="price"> 7 € </span><small class="price-description">Tarif réduit<br/>Découvert</small></div>')
        res, _ = scrape.parse_results(row, {"poliveau": "Poliveau"})
        self.assertEqual((res[0]["num"], res[0]["surface"], res[0]["lit"], res[0]["price"], res[0]["tarif"]),
                         (13, "Bitume", False, 7, "R"))


if __name__ == "__main__":
    unittest.main()
