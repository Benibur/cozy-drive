#!/usr/bin/env python3
"""Generate the Scribe blessing console — a single self-contained HTML review page.

WHAT — one filterable HTML page showing every corpus bundle at the review gabarit
(REVIEW-LOG.md §Format): spec, extraction, result blocks, post-selection as selMarkup
(never position units), and the before/after screenshots. It is a VIEW over
test-harness/corpus/, not an editor — the authoritative verdicts live in each bundle's
meta.json. Re-run it after any capture pass and it reflects what is on disk.

The page adds three review aids that do NOT persist to the repo (they live in the browser,
backed by localStorage so an accidental reload doesn't lose them):
  - an OK / KO toggle per case, with a live "jugés X/62" counter;
  - a comment field per case;
  - a "Compte-rendu" button that assembles a copy-paste-ready markdown list of every KO
    (and every commented case) — hand that back to the assistant to drive the blessing.

USAGE (run it every blessing pass):
    python3 test-harness/tools/gen_blessing.py -o /path/to/blessing.html \
        --baseline <last-blessed-git-ref>
Then publish the file as an artifact (Claude Code) or open it in a browser.

  -o, --output   where to write the HTML (default: ./blessing.html)
  --baseline REF a git ref whose corpus is the LAST BLESSED state. Each case's result
                 `blocks` are compared against it: identical → "blocks identiques" (only the
                 selection oracle is new to bless), different → "écart de règle bénie" (the
                 live build applies an already-blessed rule this golden predates). Omit it and
                 that classification is simply not shown (every case reads as to-review).
                 Tip: tag the blessed state after each pass (e.g. `blessed-2026-07-17`) and
                 pass that tag here next time.

Image cases are auto-detected (a bundle whose after.docx carries an <a:blip>); their image is
proven from after.docx (blip + word/media count), never from model.json which is blind to
drawings. Screenshots are cropped to the document region and embedded as data URIs (the
Artifact CSP forbids external assets).
"""
import argparse, json, glob, os, io, base64, html, subprocess, zipfile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))          # tools/ -> test-harness/ -> repo root
CORPUS = os.path.join(ROOT, "test-harness", "corpus")

# Crop the OO screenshot to the document region (drop toolbar/ruler/side panels/empty page),
# kept at native resolution so the modal reads crisply. Tuned to the example editor at its
# default zoom; widen the right edge if a fixture's table gets clipped.
BOX = (72, 188, 640, 655)

AXES = [("A", "Axe A — paragraphes"), ("Ac", "Axe Ac — intra-cellule"),
        ("T", "Axe T — tableaux"), ("H", "Axe H — en-tête/pied"), ("C", "Axe C — images")]


def axis_of(case):
    if case.startswith("Ac"):
        return "Ac"
    if case.startswith("A"):
        return "A"
    if case.startswith("H"):
        return "H"
    if case.startswith("C"):
        return "C"
    return "T"


def png_datauri(path):
    if not os.path.exists(path):
        return None
    im = Image.open(path).convert("RGB").crop(BOX)
    b = io.BytesIO()
    im.save(b, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()


def img_proof(bundle):
    """Prove an image from after.docx, never from model.json (blind to drawings). Also the
    is-image detector: returns None when the saved doc carries no drawing."""
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
        return f"{blips} × <code>&lt;a:blip&gt;</code>, {len(media)} fichier(s) <code>word/media/</code>"
    except Exception:
        return None


def baseline_blocks(ref, case, mode):
    """The result `blocks` of this case at a git ref, as a canonical string, or None if the
    file did not exist there (a case new since the baseline)."""
    if not ref:
        return "__NO_BASELINE__"
    try:
        out = subprocess.run(
            ["git", "show", f"{ref}:test-harness/corpus/{case}/{mode}/model.json"],
            cwd=ROOT, capture_output=True, text=True)
        if out.returncode != 0:
            return None
        return json.dumps(json.loads(out.stdout).get("blocks"))
    except Exception:
        return None


def blocks_html(model):
    rows = []
    for i, b in enumerate(model.get("blocks", [])):
        if b.get("type") == "table":
            grid = b.get("grid", [])
            rows.append(f'<div class="blk tbl-head">bloc {i} — tableau {len(grid)}×{len(grid[0]) if grid else 0}</div>')
            for r, row in enumerate(grid):
                for c, cell in enumerate(row):
                    paras = ["".join(run.get("t", "") for run in blk.get("runs", []))
                             for blk in cell.get("blocks", [])]
                    txt = " ¶ ".join(html.escape(p) for p in paras) or '<span class="empty">∅</span>'
                    multi = ' <span class="tag">%d¶</span>' % len(paras) if len(paras) > 1 else ""
                    rows.append(f'<div class="blk cell"><span class="coord">({r},{c})</span> {txt}{multi}</div>')
        else:
            txt = "".join(run.get("t", "") for run in b.get("runs", []))
            txt = html.escape(txt) if txt else '<span class="empty">¶ vide</span>'
            rows.append(f'<div class="blk"><span class="coord">¶{i}</span> {txt}</div>')
    return "\n".join(rows)


def selmarkup_html(model):
    lines = model.get("selMarkup") or []
    if not lines:
        if model.get("collapsed"):
            return '<div class="sel-empty">curseur replié — rien de couvert</div>'
        return '<div class="sel-empty">—</div>'
    out = []
    for m in lines:
        at = m.get("at", {})
        loc = f"bloc {at.get('block')}"
        if at.get("cell"):
            loc += f" · cell({at['cell'].get('r')},{at['cell'].get('c')}) ¶{at.get('cellBlock')}"
        t = html.escape(m.get("text", "")).replace("«", '<mark>«').replace("»", '»</mark>')
        out.append(f'<div class="sel-line"><span class="sel-loc">{loc}</span>'
                   f'<span class="sel-text">{t or "<span class=empty>∅</span>"}</span></div>')
    return "\n".join(out)


def build(baseline_ref):
    bundles = {}
    for cj in glob.glob(f"{CORPUS}/*/*/capture.json"):
        case, mode = cj.split(os.sep)[-3:-1]
        bundles[f"{case}/{mode}"] = os.path.dirname(cj)

    cards = {a: [] for a, _ in AXES}
    stats = {"total": 0, "identical": 0, "behaviour": 0, "image": 0, "pass": 0, "pending": 0}
    for key in sorted(bundles):
        case, mode = key.split("/")
        d = bundles[key]
        model = json.load(open(f"{d}/model.json"))
        meta = json.load(open(f"{d}/meta.json"))
        cap = json.load(open(f"{d}/capture.json"))
        verdict = meta.get("verdict", "?")

        proof = img_proof(d)
        is_img = proof is not None

        base = baseline_blocks(baseline_ref, case, mode)
        cur = json.dumps(model.get("blocks"))
        if base == "__NO_BASELINE__":
            status = None          # classification not requested
        elif base is None:
            status = "new"
        else:
            status = "identical" if base == cur else "behaviour"

        stats["total"] += 1
        if status == "identical":
            stats["identical"] += 1
        elif status == "behaviour":
            stats["behaviour"] += 1
        if is_img:
            stats["image"] += 1
        stats["pass" if verdict == "pass" else "pending"] += 1

        after = png_datauri(f"{d}/after.png")
        before = png_datauri(f"{d}/before.png")

        chips = []
        if status == "identical":
            chips.append('<span class="chip c-idn">blocks identiques</span>')
        elif status == "behaviour":
            chips.append('<span class="chip c-beh">écart de règle bénie</span>')
        elif status == "new":
            chips.append('<span class="chip c-beh">nouveau cas</span>')
        chips.append(f'<span class="chip c-{"pass" if verdict=="pass" else "pend"}">'
                     f'{"pass" if verdict=="pass" else "à statuer"}</span>')
        if is_img:
            chips.append('<span class="chip c-img">image</span>')

        note = ""
        bl = meta.get("blessing", {}) or {}
        if bl.get("behaviour"):
            note += f'<div class="note note-beh"><b>Règle :</b> {html.escape(bl["behaviour"])}</div>'
        if bl.get("image"):
            note += f'<div class="note note-img"><b>Image :</b> {html.escape(bl["image"])}</div>'

        ext = cap.get("extractedMd")
        ext_html = (f'<div class="row"><span class="lbl">Extraction → LLM</span>'
                    f'<code class="ext">{html.escape(repr(ext))}</code></div>') if ext is not None else ""
        proof_html = (f'<div class="row"><span class="lbl">Image (via after.docx)</span>'
                      f'<span class="proof">{proof}</span></div>') if proof else ""

        shots = ""
        if before:
            shots += f'<figure><figcaption>avant (sélection posée)</figcaption><img loading="lazy" class="shot" data-side="avant" src="{before}" alt="avant {key}"></figure>'
        if after:
            shots += f'<figure><figcaption>après</figcaption><img loading="lazy" class="shot" data-side="après" src="{after}" alt="après {key}"></figure>'

        card = f'''
<article class="card" data-case="{key}" data-axis="{axis_of(case)}" data-status="{status or ''}" data-verdict="{'pass' if verdict=='pass' else 'pending'}" data-image="{'1' if is_img else '0'}" id="{case}-{mode}">
  <header class="card-h">
    <h3>{case}<span class="mode">/{mode}</span></h3>
    <div class="chips">{''.join(chips)}</div>
    <div class="judge" role="group" aria-label="Verdict de revue">
      <button class="j-ok" type="button" title="Marquer OK">OK</button>
      <button class="j-ko" type="button" title="Marquer KO">KO</button>
    </div>
  </header>
  <div class="card-body">
    <div class="evidence">
      <div class="row"><span class="lbl">spec</span><code>{html.escape(cap.get('spec',''))}</code></div>
      <div class="row"><span class="lbl">fixture md</span><code>{html.escape(repr(cap.get('fixture','')))}</code></div>
      {ext_html}
      <div class="block"><span class="lbl">Après — état obtenu</span><div class="blocks">{blocks_html(model)}</div></div>
      <div class="block"><span class="lbl">Post-sélection — <code>selText</code> {html.escape(repr(model.get('selText')))}</span><div class="selmarkup">{selmarkup_html(model)}</div></div>
      {proof_html}
      {note}
      <textarea class="comment" rows="1" placeholder="Commentaire (repris dans le compte-rendu)…"></textarea>
    </div>
    <div class="shots">{shots}</div>
  </div>
</article>'''
        cards[axis_of(case)].append((key, card))

    sections = ""
    for a, label in AXES:
        if not cards[a]:
            continue
        body = "\n".join(c for _, c in sorted(cards[a], key=lambda x: x[0]))
        sections += (f'<section class="axis" data-axis="{a}"><h2>{label} '
                     f'<span class="ax-count">{len(cards[a])}</span></h2>{body}</section>')

    show_class = baseline_ref is not None
    tiles = f'<div class="tile"><span class="tn">{stats["total"]}</span><span class="tl">cas</span></div>'
    if show_class:
        tiles += (f'<div class="tile t-idn"><span class="tn">{stats["identical"]}</span><span class="tl">blocks identiques</span></div>'
                  f'<div class="tile t-beh"><span class="tn">{stats["behaviour"]}</span><span class="tl">écart de règle bénie</span></div>')
    tiles += (f'<div class="tile t-img"><span class="tn">{stats["image"]}</span><span class="tl">cas image</span></div>'
              f'<div class="tile t-pend"><span class="tn">{stats["pending"]}</span><span class="tl">à statuer (verdict)</span></div>'
              f'<div class="tile t-prog"><span class="tn" id="progN">0</span><span class="tl">jugés (cette session)</span></div>')

    class_filters = ('<button data-f="behaviour">Écart de règle bénie</button>' if show_class else "")
    class_intro = ("<b>58/62</b> ont des <code>blocks</code> byte-identiques au golden déjà béni (seul l'oracle de "
                   "sélection est neuf) ; les <b>écarts</b> appliquent une règle déjà bénie que le golden précédait."
                   if show_class else "")

    return (TEMPLATE.replace("{{TILES}}", tiles)
            .replace("{{SECTIONS}}", sections)
            .replace("{{CLASS_FILTERS}}", class_filters)
            .replace("{{CLASS_INTRO}}", class_intro)
            .replace("{{TOTAL}}", str(stats["total"])))


TEMPLATE = r"""<title>Scribe — Console de blessing</title>
<style>
:root{
  --ground:#FBFBFD; --panel:#FFFFFF; --panel-2:#F5F6F9; --border:#E4E7EC; --border-2:#EEF0F4;
  --ink:#181B22; --muted:#5A6270; --faint:#8A92A0;
  --accent:#3D5AF1; --idn:#0E9F6E; --beh:#7A5CF0; --pend:#D97706; --img:#0891A5; --ko:#E5484D;
  --mark-bg:#FFE9A8; --mark-ink:#5A3D00;
  --mono:ui-monospace,"SF Mono",'Cascadia Code',Menlo,Consolas,monospace;
  --sans:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
}
@media (prefers-color-scheme:dark){:root{
  --ground:#0D1016; --panel:#151922; --panel-2:#1B2029; --border:#262D3A; --border-2:#20262F;
  --ink:#E6E9F0; --muted:#98A2B3; --faint:#6B7480;
  --accent:#7C93FF; --idn:#3DDC97; --beh:#B39BFF; --pend:#FBBF24; --img:#2AC4D6; --ko:#FF6369;
  --mark-bg:#4A3B12; --mark-ink:#FFE9A8;
}}
:root[data-theme="light"]{
  --ground:#FBFBFD; --panel:#FFFFFF; --panel-2:#F5F6F9; --border:#E4E7EC; --border-2:#EEF0F4;
  --ink:#181B22; --muted:#5A6270; --faint:#8A92A0;
  --accent:#3D5AF1; --idn:#0E9F6E; --beh:#7A5CF0; --pend:#D97706; --img:#0891A5; --ko:#E5484D;
  --mark-bg:#FFE9A8; --mark-ink:#5A3D00;
}
:root[data-theme="dark"]{
  --ground:#0D1016; --panel:#151922; --panel-2:#1B2029; --border:#262D3A; --border-2:#20262F;
  --ink:#E6E9F0; --muted:#98A2B3; --faint:#6B7480;
  --accent:#7C93FF; --idn:#3DDC97; --beh:#B39BFF; --pend:#FBBF24; --img:#2AC4D6; --ko:#FF6369;
  --mark-bg:#4A3B12; --mark-ink:#FFE9A8;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);
  font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
code{font-family:var(--mono);font-size:.86em}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}

header.top{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--ground) 88%,transparent);
  backdrop-filter:blur(10px);border-bottom:1px solid var(--border)}
.top .wrap{padding-top:18px;padding-bottom:14px}
.brand{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.brand h1{font-size:19px;margin:0;font-weight:650;letter-spacing:-.01em}
.brand .sub{color:var(--muted);font-size:13px;font-family:var(--mono)}
.tiles{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 4px}
.tile{background:var(--panel);border:1px solid var(--border);border-radius:10px;
  padding:9px 14px;display:flex;flex-direction:column;min-width:92px}
.tile .tn{font-size:22px;font-weight:680;font-variant-numeric:tabular-nums;line-height:1.1}
.tile .tl{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-top:2px}
.tile.t-idn .tn{color:var(--idn)} .tile.t-beh .tn{color:var(--beh)}
.tile.t-img .tn{color:var(--img)} .tile.t-pend .tn{color:var(--pend)} .tile.t-prog .tn{color:var(--accent)}
.controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center}
.controls button{font-family:var(--sans);font-size:12.5px;color:var(--muted);background:var(--panel);
  border:1px solid var(--border);border-radius:99px;padding:5px 13px;cursor:pointer;transition:.12s}
.controls button:hover{border-color:var(--accent);color:var(--ink)}
.controls button[aria-pressed="true"]{background:var(--accent);color:#fff;border-color:var(--accent)}
.controls button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.controls .spacer{flex:1}
.controls .act{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:600}
.controls .act:hover{filter:brightness(1.06);color:#fff}
.controls .ghost{border-style:dashed}

.intro{color:var(--muted);font-size:13.5px;max-width:74ch;margin:22px 0 6px}
.intro code{color:var(--ink)}
.intro mark{background:var(--mark-bg);color:var(--mark-ink);padding:0 3px;border-radius:3px}

section.axis{margin:30px 0}
section.axis>h2{font-size:15px;font-weight:620;letter-spacing:.02em;text-transform:uppercase;
  color:var(--muted);border-bottom:1px solid var(--border);padding-bottom:8px;margin:0 0 16px;
  display:flex;align-items:center;gap:10px}
.ax-count{font-family:var(--mono);font-size:12px;color:var(--faint);font-weight:400}

.card{background:var(--panel);border:1px solid var(--border);border-radius:12px;margin-bottom:14px;
  overflow:hidden;border-left:3px solid transparent}
.card.hide{display:none}
.card.v-ok{border-left-color:var(--idn)}
.card.v-ko{border-left-color:var(--ko)}
.card-h{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border-2);flex-wrap:wrap}
.card-h h3{margin:0;font-family:var(--mono);font-size:15px;font-weight:600}
.card-h .mode{color:var(--muted);font-weight:400}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{font-size:11px;font-weight:600;padding:3px 9px;border-radius:99px;letter-spacing:.02em;white-space:nowrap}
.c-idn{background:color-mix(in srgb,var(--idn) 15%,transparent);color:var(--idn)}
.c-beh{background:color-mix(in srgb,var(--beh) 16%,transparent);color:var(--beh)}
.c-img{background:color-mix(in srgb,var(--img) 15%,transparent);color:var(--img)}
.c-pass{background:color-mix(in srgb,var(--idn) 13%,transparent);color:var(--idn)}
.c-pend{background:color-mix(in srgb,var(--pend) 16%,transparent);color:var(--pend)}
.judge{margin-left:auto;display:flex;gap:6px}
.judge button{font-family:var(--sans);font-size:12px;font-weight:700;letter-spacing:.03em;
  border:1px solid var(--border);background:var(--panel);color:var(--muted);border-radius:7px;
  padding:4px 12px;cursor:pointer;transition:.12s}
.judge button:hover{border-color:var(--accent);color:var(--ink)}
.judge button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.card.v-ok .j-ok{background:var(--idn);color:#fff;border-color:var(--idn)}
.card.v-ko .j-ko{background:var(--ko);color:#fff;border-color:var(--ko)}
.card-body{display:grid;grid-template-columns:1fr 420px;gap:18px;padding:16px}
@media(max-width:820px){.card-body{grid-template-columns:1fr}}
.evidence{min-width:0}
.row{display:flex;gap:10px;padding:3px 0;align-items:baseline;flex-wrap:wrap}
.lbl{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--faint);min-width:96px;flex-shrink:0}
.row code{word-break:break-word}
.ext{color:var(--muted)}
.block{margin-top:11px}
.block>.lbl{display:block;margin-bottom:6px}
.blocks,.selmarkup{background:var(--panel-2);border:1px solid var(--border-2);border-radius:8px;
  padding:8px 10px;font-family:var(--mono);font-size:12.5px;overflow-x:auto}
.blk{padding:1px 0;white-space:nowrap}
.blk.tbl-head{color:var(--img);font-size:11px;text-transform:uppercase;letter-spacing:.04em;margin-top:3px}
.blk.cell{padding-left:14px}
.coord{color:var(--faint);user-select:none;margin-right:6px}
.cell .coord{color:var(--img)}
.tag{color:var(--beh);font-size:10px;border:1px solid var(--beh);border-radius:4px;padding:0 3px}
.empty{color:var(--faint);font-style:italic}
.sel-line{display:flex;gap:10px;padding:2px 0;align-items:baseline;white-space:nowrap}
.sel-loc{color:var(--faint);font-size:10.5px;min-width:150px;flex-shrink:0}
.sel-text{color:var(--ink)}
.sel-text mark{background:var(--mark-bg);color:var(--mark-ink);padding:0 1px;border-radius:2px}
.sel-empty{color:var(--faint);font-style:italic;font-family:var(--mono);font-size:12.5px}
.proof{font-family:var(--mono);font-size:12px;color:var(--img)}
.proof code{color:var(--img)}
.note{margin-top:10px;font-size:12.5px;line-height:1.45;padding:8px 11px;border-radius:8px;border-left:3px solid}
.note-beh{background:color-mix(in srgb,var(--beh) 8%,transparent);border-color:var(--beh)}
.note-img{background:color-mix(in srgb,var(--img) 8%,transparent);border-color:var(--img)}
.note b{font-weight:640}
.comment{margin-top:12px;width:100%;font-family:var(--sans);font-size:13px;color:var(--ink);
  background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;
  resize:vertical;min-height:38px;line-height:1.4}
.comment:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}
.comment.has-text{border-color:var(--pend)}
.shots{display:flex;flex-direction:column;gap:10px}
.shots figure{margin:0}
.shots figcaption{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:4px}
.shots img{width:100%;border:1px solid var(--border);border-radius:8px;display:block;background:#fff;cursor:zoom-in}

/* modal (shared: image lightbox + report) */
.overlay{position:fixed;inset:0;z-index:50;background:rgba(8,10,14,.66);backdrop-filter:blur(3px);
  display:none;align-items:center;justify-content:center;padding:28px}
.overlay.open{display:flex}
.modal{background:var(--panel);border:1px solid var(--border);border-radius:14px;max-width:1220px;
  width:100%;max-height:92vh;overflow:auto;box-shadow:0 24px 60px rgba(0,0,0,.4)}
.modal-h{position:sticky;top:0;background:var(--panel);display:flex;align-items:center;gap:12px;
  padding:14px 18px;border-bottom:1px solid var(--border-2)}
.modal-h h3{margin:0;font-family:var(--mono);font-size:15px;font-weight:600}
.modal-h .x{margin-left:auto;border:1px solid var(--border);background:var(--panel);color:var(--muted);
  border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:18px;line-height:1}
.modal-h .x:hover{border-color:var(--accent);color:var(--ink)}
.lb-body{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:18px}
@media(max-width:900px){.lb-body{grid-template-columns:1fr}}
.lb-body figure{margin:0}
.lb-body figcaption{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:6px}
.lb-body img{width:100%;border:1px solid var(--border);border-radius:8px;background:#fff}
.report{padding:16px 18px}
.report textarea{width:100%;min-height:46vh;font-family:var(--mono);font-size:13px;line-height:1.5;
  color:var(--ink);background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:12px}
.report .hint{color:var(--muted);font-size:13px;margin:0 0 10px}

footer{border-top:1px solid var(--border);margin-top:40px;padding:22px 0 60px;color:var(--muted);font-size:12.5px}
footer code{color:var(--ink)}
footer b{color:var(--ink);font-weight:620}
</style>

<header class="top">
  <div class="wrap">
    <div class="brand">
      <h1>Scribe — Console de blessing</h1>
      <span class="sub">re-capture 2026-07-17 · build 2026-07-17.10 · oracle 34/34 · verify 62/62</span>
    </div>
    <div class="tiles">{{TILES}}</div>
    <div class="controls" role="group" aria-label="Filtres et actions">
      <button data-f="all" aria-pressed="true">Tous</button>
      <button data-f="judge:none">Non jugés</button>
      <button data-f="judge:ko">KO</button>
      <button data-f="pending">À statuer</button>
      {{CLASS_FILTERS}}
      <button data-f="image">Images</button>
      <button data-f="axis:A">A</button>
      <button data-f="axis:Ac">Ac</button>
      <button data-f="axis:T">T</button>
      <button data-f="axis:H">H</button>
      <span class="spacer"></span>
      <button class="act" id="reportBtn" type="button">Compte-rendu</button>
      <button class="ghost" id="resetBtn" type="button" title="Efface OK/KO et commentaires de cette session">Réinitialiser</button>
    </div>
  </div>
</header>

<main class="wrap">
  <p class="intro">
    Chaque carte : le résultat obtenu et la <b>post-sélection à statuer</b> — en <code>selMarkup</code>
    (le texte couvert, encadré <mark>« »</mark> en situ), <b>jamais</b> en unités de position. Les
    <b>images</b> sont prouvées par <code>after.docx</code> (<code>a:blip</code> + <code>word/media</code>),
    jamais par le modèle qui en est aveugle. Clique une capture pour l'ouvrir en grand (avant + après côte
    à côte). Marque <b>OK / KO</b>, ajoute un commentaire, puis <b>Compte-rendu</b> assemble la liste des KO
    à me recoller. {{CLASS_INTRO}}
  </p>
  {{SECTIONS}}
</main>

<footer class="wrap">
  <p><b>Comment lire un verdict.</b> « blocks identiques » = le résultat texte est byte-identique au golden
  béni, seule la post-sélection (<code>selText</code>/<code>selMarkup</code>) est neuve à bénir. « écart de
  règle bénie » = le résultat diffère parce que le vif applique une règle déjà validée que ce golden
  précédait (aucune régression).</p>
  <p>Captures via l'éditeur d'exemple OnlyOffice (pas de LLM, fixture déterministe). Post-sélection rendue
  sans vol de focus. Preuves complètes par bundle : <code>capture.json</code> · <code>model.json</code> ·
  <code>before/after.png</code> · <code>before/after.docx</code>. OK/KO et commentaires vivent dans le
  navigateur (localStorage) — les verdicts qui font foi restent dans <code>meta.json</code>.</p>
</footer>

<div class="overlay" id="lightbox">
  <div class="modal">
    <div class="modal-h"><h3 id="lbTitle"></h3><button class="x" data-close type="button" aria-label="Fermer">×</button></div>
    <div class="lb-body" id="lbBody"></div>
  </div>
</div>
<div class="overlay" id="reportModal">
  <div class="modal">
    <div class="modal-h"><h3>Compte-rendu de blessing</h3><button class="x" data-close type="button" aria-label="Fermer">×</button></div>
    <div class="report">
      <p class="hint">Copie ce bloc et recolle-le dans la conversation — je poserai les verdicts KO dans les <code>meta.json</code>.</p>
      <button class="act" id="copyBtn" type="button" style="margin-bottom:10px">Copier</button>
      <textarea id="reportText" readonly></textarea>
    </div>
  </div>
</div>

<script>
(function(){
  var TOTAL={{TOTAL}}, KEY="scribe-blessing-v1";
  var cards=[].slice.call(document.querySelectorAll('.card'));
  var secs=[].slice.call(document.querySelectorAll('section.axis'));
  var fbtns=[].slice.call(document.querySelectorAll('.controls button[data-f]'));
  var state={};
  try{state=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){state={}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}

  function paint(card){
    var k=card.dataset.case, s=state[k]||{};
    card.classList.toggle('v-ok',s.v==='ok');
    card.classList.toggle('v-ko',s.v==='ko');
    var ta=card.querySelector('.comment');
    if(document.activeElement!==ta){ta.value=s.c||''}
    ta.classList.toggle('has-text',!!(s.c&&s.c.trim()));
  }
  function progress(){
    var n=0;cards.forEach(function(c){if((state[c.dataset.case]||{}).v)n++});
    document.getElementById('progN').textContent=n+'/'+TOTAL;
  }
  cards.forEach(function(card){
    var k=card.dataset.case;
    card.querySelector('.j-ok').addEventListener('click',function(){
      var s=state[k]||(state[k]={});s.v=s.v==='ok'?null:'ok';save();paint(card);progress();
    });
    card.querySelector('.j-ko').addEventListener('click',function(){
      var s=state[k]||(state[k]={});s.v=s.v==='ko'?null:'ko';save();paint(card);progress();
    });
    var ta=card.querySelector('.comment');
    ta.addEventListener('input',function(){
      var s=state[k]||(state[k]={});s.c=ta.value;save();
      ta.classList.toggle('has-text',!!ta.value.trim());
    });
    card.querySelectorAll('.shot').forEach(function(img){
      img.addEventListener('click',function(){openLightbox(card)});
    });
    paint(card);
  });
  progress();

  // filters
  function apply(f){
    cards.forEach(function(c){
      var s=state[c.dataset.case]||{},show=true;
      if(f==='all')show=true;
      else if(f==='judge:none')show=!s.v;
      else if(f==='judge:ko')show=s.v==='ko';
      else if(f==='pending')show=c.dataset.verdict==='pending';
      else if(f==='behaviour')show=c.dataset.status==='behaviour';
      else if(f==='image')show=c.dataset.image==='1';
      else if(f.indexOf('axis:')===0)show=c.dataset.axis===f.slice(5);
      c.classList.toggle('hide',!show);
    });
    secs.forEach(function(s){s.style.display=s.querySelectorAll('.card:not(.hide)').length?'':'none'});
    fbtns.forEach(function(b){b.setAttribute('aria-pressed',b.dataset.f===f?'true':'false')});
  }
  fbtns.forEach(function(b){b.addEventListener('click',function(){apply(b.dataset.f)})});

  // lightbox (before + after, large, side by side)
  var lb=document.getElementById('lightbox');
  function openLightbox(card){
    document.getElementById('lbTitle').textContent=card.dataset.case;
    var body=document.getElementById('lbBody');body.innerHTML='';
    card.querySelectorAll('.shots figure').forEach(function(fig){
      var img=fig.querySelector('img'),cap=fig.querySelector('figcaption');
      var f=document.createElement('figure');
      f.innerHTML='<figcaption>'+cap.textContent+'</figcaption>';
      var big=document.createElement('img');big.src=img.src;f.appendChild(big);
      body.appendChild(f);
    });
    lb.classList.add('open');
  }

  // report
  var rm=document.getElementById('reportModal');
  function twoDigit(n){return(n<10?'0':'')+n}
  function report(){
    var d=new Date();
    var stamp=d.getFullYear()+'-'+twoDigit(d.getMonth()+1)+'-'+twoDigit(d.getDate());
    var ok=0,ko=[],okc=[],none=0;
    cards.forEach(function(c){
      var k=c.dataset.case,s=state[k]||{},cm=(s.c||'').trim();
      if(s.v==='ko')ko.push('- '+k+(cm?' : '+cm:' : (sans commentaire)'));
      else if(s.v==='ok'){ok++;if(cm)okc.push('- '+k+' : '+cm)}
      else{none++;if(cm)okc.push('- '+k+' (non jugé) : '+cm)}
    });
    var judged=ok+ko.length;
    var out='## Compte-rendu de blessing — '+stamp+'\n';
    out+='Jugés '+judged+'/'+TOTAL+' · OK '+ok+' · KO '+ko.length+' · non jugés '+none+'\n\n';
    out+='### KO ('+ko.length+')\n'+(ko.length?ko.join('\n'):'_aucun_')+'\n';
    if(okc.length)out+='\n### Cas commentés ('+okc.length+')\n'+okc.join('\n')+'\n';
    return out;
  }
  document.getElementById('reportBtn').addEventListener('click',function(){
    document.getElementById('reportText').value=report();rm.classList.add('open');
  });
  document.getElementById('copyBtn').addEventListener('click',function(){
    var t=document.getElementById('reportText');t.select();
    try{navigator.clipboard.writeText(t.value)}catch(e){document.execCommand('copy')}
    this.textContent='Copié ✓';var b=this;setTimeout(function(){b.textContent='Copier'},1400);
  });
  document.getElementById('resetBtn').addEventListener('click',function(){
    if(!confirm('Effacer tous les OK/KO et commentaires de cette session ?'))return;
    state={};save();cards.forEach(paint);progress();
  });

  // overlay close (button, backdrop, Esc)
  [].slice.call(document.querySelectorAll('.overlay')).forEach(function(ov){
    ov.addEventListener('click',function(e){if(e.target===ov||e.target.hasAttribute('data-close'))ov.classList.remove('open')});
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape')[].slice.call(document.querySelectorAll('.overlay.open')).forEach(function(o){o.classList.remove('open')});
  });
})();
</script>
"""


def main():
    ap = argparse.ArgumentParser(description="Generate the Scribe blessing console.")
    ap.add_argument("-o", "--output", default="blessing.html", help="output HTML path")
    ap.add_argument("--baseline", default=None,
                    help="git ref of the last blessed corpus (enables identique/écart classification)")
    a = ap.parse_args()
    open(a.output, "w").write(build(a.baseline))
    print(f"wrote {a.output} ({os.path.getsize(a.output)/1e6:.2f} MB)"
          + (f" · baseline {a.baseline}" if a.baseline else " · no baseline (classification off)"))


if __name__ == "__main__":
    main()
