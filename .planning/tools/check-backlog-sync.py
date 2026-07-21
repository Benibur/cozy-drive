#!/usr/bin/env python3
"""Vérifie que tout item OUVERT de REVIEW-BACKLOG.md est câblé au backlog GSD.

POURQUOI — le projet tient DEUX backlogs, aux rôles réellement distincts :
  • `.planning/REVIEW-BACKLOG.md`  = source de vérité du DÉTAIL (diagnostic, preuves,
    impasses, historique). C'est là qu'on retrouve *pourquoi* une décision a été prise.
  • `.planning/ROADMAP.md` § Backlog = liste PROMOUVABLE, lue par `/gsd-review-backlog`.

Rien ne forçait le lien entre les deux, et le piège est tombé DEUX fois (2026-07-20 pour la
campagne selection-cases, 2026-07-21 pour les images) : du travail réel restait invisible du
workflow gsd. Une règle écrite n'a pas suffi — d'où ce contrôle mécanique.

RÈGLE — toute ligne de REVIEW-BACKLOG.md qui décrit un reste-à-faire doit citer la phase
`999.x` qui le porte, et cette phase doit exister dans le ROADMAP. Une ligne qui déclenche à
tort se désamorce avec `[hors-backlog]`.

USAGE :  python3 .planning/tools/check-backlog-sync.py
Sortie 0 = cohérent ; 1 = items orphelins (listés).
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PLANNING = os.path.dirname(HERE)
REVIEW = os.path.join(PLANNING, "REVIEW-BACKLOG.md")
ROADMAP = os.path.join(PLANNING, "ROADMAP.md")

# Marqueurs de statut « ouvert » utilisés dans les tables du backlog de revue.
OPEN_MARKS = ("📋", "⏳", "🔵")
# Tournures qui décrivent un reste-à-faire même sur une ligne marquée « FAIT ».
# (c'est le piège des lignes « ✅ FAIT (test à ajouter) » — le fix est livré, la
# couverture ne l'est pas.)
OPEN_PHRASES = (
    "à investiguer", "à cadrer", "à ajouter", "à étendre", "à documenter",
    "à combler", "à traiter", "reste à faire", "chantier à",
)
PHASE_RE = re.compile(r"999\.\d+")
EXEMPT = "[hors-backlog]"


def open_items(path):
    """Lignes décrivant un reste-à-faire, avec leur numéro (1-based)."""
    out = []
    for n, line in enumerate(open(path, encoding="utf-8"), 1):
        if EXEMPT in line:
            continue
        low = line.lower()
        # La légende des statuts n'est pas un item.
        if low.startswith("statuts repro"):
            continue
        triggered = any(m in line for m in OPEN_MARKS) or any(p in low for p in OPEN_PHRASES)
        if triggered:
            out.append((n, line.rstrip()))
    return out


def roadmap_phases(path):
    """Phases 999.x déclarées dans le ROADMAP."""
    txt = open(path, encoding="utf-8").read()
    return set(re.findall(r"^### Phase (999\.\d+)", txt, re.M))


def main():
    phases = roadmap_phases(ROADMAP)
    if not phases:
        print("ERREUR : aucune phase 999.x trouvée dans ROADMAP.md", file=sys.stderr)
        return 2

    orphans, dangling = [], []
    items = open_items(REVIEW)
    for n, line in items:
        cited = set(PHASE_RE.findall(line))
        if not cited:
            orphans.append((n, line))
            continue
        missing = cited - phases
        if missing:
            dangling.append((n, line, sorted(missing)))

    width = 150
    if orphans:
        print(f"\n{len(orphans)} item(s) OUVERT(S) sans phase 999.x — invisibles de /gsd-review-backlog :\n")
        for n, line in orphans:
            print(f"  REVIEW-BACKLOG.md:{n}\n    {line[:width]}")
        print("\n  → ajouter la phase qui le porte (ex. « → 999.6 »), ou "
              f"« {EXEMPT} » si la ligne n'est pas un reste-à-faire.")
    if dangling:
        print(f"\n{len(dangling)} item(s) citant une phase ABSENTE du ROADMAP :\n")
        for n, line, miss in dangling:
            print(f"  REVIEW-BACKLOG.md:{n} cite {', '.join(miss)}\n    {line[:width]}")

    if orphans or dangling:
        return 1
    print(f"backlogs cohérents — {len(items)} item(s) ouvert(s), tous rattachés "
          f"à une phase existante ({', '.join(sorted(phases))})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
