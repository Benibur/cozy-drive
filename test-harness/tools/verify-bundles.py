#!/usr/bin/env python3
"""Mechanically verify golden bundles are COMPLETE and FRESH — the check the corpus never had.

Why this exists: the 2026-07-17 passes kept discovering that a golden froze whatever the model
was blind to (the `selection` field, images, empty runs). Bundles were also presented as
"captured" while carrying `screenshotsPending` and an 11-build-old model.json. This script
makes "the evidence is really there" an objective, cheap, repeatable check instead of a claim.

It judges EVIDENCE, never behaviour: it never says a case is correct — only that the artifacts
exist, agree with each other, and were produced by the pass being reported.

Usage: verify-bundles.py [--date YYYY-MM-DD] [corpus_dir ...]
Exit 1 if any bundle fails.
"""
import json, os, sys, glob, zipfile, io, datetime, re

REQUIRED = ["capture.json", "model.json", "meta.json", "before.png", "after.png",
            "before.docx", "after.docx"]


def injected_pieces(md):
    """The literal text the fixture md should have put in the document.

    Strips the harness markup ([CELL:r,c], [TABLE:i], image markers) and returns the text
    fragments. Image markers are dropped on purpose: they resolve to a drawing, not to text.
    """
    if "IMG:" in md:
        md = re.sub(r"!\[IMG:[^\]]*\]\([^)]*\)", "", md)
        md = re.sub(r"\{\{IMG:[^}]*\}\}", "", md)
    md = re.sub(r"\[/?CELL[^\]]*\]|\[/?TABLE[^\]]*\]", "\n", md)
    return [p for p in (x.strip() for x in md.split("\n")) if p]


def fail(bundle, msg, out):
    out.append((bundle, msg))


def check(bundle, want_date, out):
    for f in REQUIRED:
        p = os.path.join(bundle, f)
        if not os.path.exists(p):
            fail(bundle, f"MISSING {f}", out); continue
        if os.path.getsize(p) == 0:
            fail(bundle, f"EMPTY {f}", out)

    try:
        cap = json.load(open(os.path.join(bundle, "capture.json")))
        model = json.load(open(os.path.join(bundle, "model.json")))
        meta = json.load(open(os.path.join(bundle, "meta.json")))
    except Exception as e:
        fail(bundle, f"UNREADABLE json: {e}", out); return

    # The oracle must actually be present. selText == "" is legitimate (collapsed caret);
    # selText is None means the field never made it through the capture pipeline.
    if model.get("selText") is None:
        fail(bundle, "NO SELECTION ORACLE (selText null) — capture predates or dropped selText", out)
    if model.get("selText") and not model.get("selMarkup"):
        fail(bundle, "selText set but selMarkup empty", out)

    # model.json must be the normalization of THIS capture.json, not a stale sibling.
    # Mirror oracle/normalizeModel.js normSelText: nbsp->space, drop tabs, CRLF->LF.
    if cap.get("selText") is not None and model.get("selText") is not None:
        norm = (cap["selText"].replace(" ", " ").replace("\t", "")
                .replace("\r\n", "\n").replace("\r", "\n"))
        if norm != model["selText"]:
            fail(bundle, "model.selText != normalized capture.selText (stale model.json?)", out)

    if cap.get("stable") is False:
        fail(bundle, "capture UNSTABLE (two reads disagreed)", out)
    if cap.get("injOk") is False:
        fail(bundle, f"inject FAILED: {cap.get('injErr')}", out)

    if want_date and meta.get("capturedAt") != want_date:
        fail(bundle, f"STALE meta.capturedAt={meta.get('capturedAt')} (want {want_date})", out)

    # after.docx must really contain the injected content: proves the edit persisted through the
    # co-editing/save path, which model.json (a live in-memory read) cannot prove.
    # Search the TEXT NODES, not raw XML: OO stamps xml:space="preserve" on short runs, so a raw
    # substring check for `<w:t>w</w:t>` never matches and "proves" nothing (found 2026-07-17).
    pieces = injected_pieces(cap.get("fixture") or "")
    if pieces:
        try:
            z = zipfile.ZipFile(os.path.join(bundle, "after.docx"))
            xml = z.read("word/document.xml").decode("utf-8", "replace")
            text = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", xml))
            missing = [p for p in pieces if p not in text]
            if missing:
                fail(bundle, f"after.docx text lacks injected piece(s) {missing!r} — inject did not persist", out)
        except Exception as e:
            fail(bundle, f"after.docx unreadable: {e}", out)

    # Screenshots: a blank/loading editor frame compresses tiny. Real captures are ~40KB+.
    for shot in ["before.png", "after.png"]:
        p = os.path.join(bundle, shot)
        if os.path.exists(p) and os.path.getsize(p) < 15000:
            fail(bundle, f"{shot} suspiciously small ({os.path.getsize(p)}B) — blank frame?", out)


def main():
    args = [a for a in sys.argv[1:]]
    want_date = None
    if "--date" in args:
        i = args.index("--date"); want_date = args[i + 1]; del args[i:i + 2]
    roots = args or ["test-harness/corpus"]
    bundles = sorted(b for r in roots for b in glob.glob(os.path.join(r, "*", "*")) if os.path.isdir(b))
    out = []
    for b in bundles:
        # doc-only bundles (no capture) are out of scope for the 62
        if not os.path.exists(os.path.join(b, "capture.json")):
            continue
        check(b, want_date, out)
    n = len([b for b in bundles if os.path.exists(os.path.join(b, "capture.json"))])
    bad = sorted(set(x[0] for x in out))
    for bundle, msg in out:
        print(f"FAIL {bundle}: {msg}")
    print(f"\n{n - len(bad)}/{n} bundles complete" + (f" — {len(bad)} FAILING" if bad else " — all good"))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
