#!/usr/bin/env python3
"""Render bundles at the normalized review gabarit (REVIEW-LOG.md §Format), from the evidence.

Why: the gabarit is a checklist against a specific failure mode — a reviewer blesses what he can
read. Post-selection MUST be shown as selMarkup (« » in situ) and NEVER as position units: the
{block,offset} form got a post-selection that ate a host character blessed three times (A6/insert,
Ac6/insert, T5/insert). Rendering from model.json mechanically keeps the presented text and the
frozen golden from drifting apart.

Images are deliberately NOT described from model.json — dumpState is blind to drawings, so an
empty cell and a cell with an image look identical there. This script prints the a:blip / media
count read out of after.docx instead, and says so.

Usage: render-review.py <case>/<mode> [...]     (or --all)
"""
import json, os, sys, glob, zipfile


def img_evidence(bundle):
    """Prove images from after.docx, never from the model."""
    p = os.path.join(bundle, "after.docx")
    if not os.path.exists(p):
        return None
    try:
        z = zipfile.ZipFile(p)
        xml = z.read("word/document.xml").decode("utf-8", "replace")
        media = [n for n in z.namelist() if n.startswith("word/media/")]
        blips = xml.count("<a:blip")
        if not media and not blips:
            return None
        return f"after.docx : {blips} × `<a:blip>`, {len(media)} fichier(s) `word/media/` ({', '.join(os.path.basename(m) for m in media)})"
    except Exception as e:
        return f"after.docx illisible : {e}"


def blocks_text(model):
    out = []
    for i, b in enumerate(model.get("blocks", [])):
        # The table schema is `grid` (rows of {blocks:[...]}) — NOT `rows`. Reading `rows` yields
        # an empty table silently, i.e. a review that shows Ben nothing where the content is.
        if b.get("type") == "table":
            grid = b.get("grid", [])
            out.append(f"  bloc{i} [TABLEAU {len(grid)}×{len(grid[0]) if grid else 0}]")
            for r, row in enumerate(grid):
                for c, cell in enumerate(row):
                    paras = ["".join(run.get("t", "") for run in blk.get("runs", []))
                             for blk in cell.get("blocks", [])]
                    shown = paras[0] if len(paras) == 1 else " ¶ ".join(paras)
                    out.append(f"      cellule({r},{c}) : {shown!r}"
                               + (f"   [{len(paras)} ¶]" if len(paras) > 1 else ""))
        else:
            txt = "".join(run.get("t", "") for run in b.get("runs", []))
            style = b.get("style")
            out.append(f"  ¶{i} {repr(txt)}" + (f"   [style {style}]" if style else ""))
    return "\n".join(out)


def render(bundle):
    case, mode = bundle.rstrip("/").split("/")[-2:]
    model = json.load(open(os.path.join(bundle, "model.json")))
    meta = json.load(open(os.path.join(bundle, "meta.json")))
    cap = json.load(open(os.path.join(bundle, "capture.json")))
    badge = {"pass": "✅ pass", "xfail": "❌ xfail", "pending": "🟠 à statuer"}.get(meta.get("verdict"), meta.get("verdict"))

    print(f"\n### {case}/{mode} — {badge}")
    print(f"- **Bundle** : `test-harness/corpus/{case}/{mode}/`")
    print(f"- **spec** : `{cap['spec']}` · **mode** : `{mode}` · **fixture md** : `{cap['fixture']!r}`")
    print(f"- **Source** : `{meta.get('source')}` · capturé {meta.get('capturedAt')} · stable={cap.get('stable')}")
    if cap.get("extractedMd") is not None:
        print(f"- **Extraction (ce que le LLM aurait vu)** : `{cap['extractedMd']!r}`")
    print("- **After — état obtenu** (`model.json`) :")
    print("```")
    print(blocks_text(model))
    print("```")
    print(f"- **Post-sélection** — `selText` = `{model.get('selText')!r}`" + ("  ⚠️ AUCUN ORACLE" if model.get("selText") is None else ""))
    if model.get("selMarkup"):
        print("  `selMarkup` (verbatim, une ligne par ¶ touché) :")
        print("```")
        for m in model["selMarkup"]:
            at = m.get("at", {})
            loc = f"block {at.get('block')}"
            if at.get("cell"):
                loc += f" cell({at['cell'].get('r')},{at['cell'].get('c')}) ¶{at.get('cellBlock')}"
            print(f"  [{loc}]  {m['text']}")
        print("```")
    elif model.get("collapsed"):
        print("  (curseur replié — rien de couvert)")
    ev = img_evidence(bundle)
    if ev:
        print(f"- **Image** (jamais prouvée par `model.json`, qui est aveugle aux images) : {ev}")
    print(f"- **Preuves** : `before.png` · `after.png` · `before.docx` · `after.docx` · `capture.json` · `model.json`")


def main():
    args = sys.argv[1:]
    os.chdir("/home/ben/Dev-local/cozy-drive-scribe-in-right-panel")
    if args and args[0] == "--all":
        bundles = sorted(b for b in glob.glob("test-harness/corpus/*/*")
                         if os.path.exists(os.path.join(b, "model.json")))
    else:
        bundles = [f"test-harness/corpus/{a}" for a in args]
    for b in bundles:
        render(b)


if __name__ == "__main__":
    main()
