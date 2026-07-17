// Normalize a raw capture.json into the canonical model.json (oracle whitelist).
// Usage: node normalize.mjs <capture.json> <model.json>
import { normalizeModel } from '../oracle/normalizeModel.js'
import { readFileSync, writeFileSync } from 'fs'
const cap = JSON.parse(readFileSync(process.argv[2], 'utf8'))
// Forward the WHOLE capture: normalizeModel reads selText/selMarkup, which dumpState emits as
// top-level siblings of `selection`. Cherry-picking {blocks, selection} here (as this did until
// 2026-07-17) fed normalizeModel an object with no selText -> every model.json froze
// selText:null + selMarkup:[], i.e. the corpus had NO selection oracle at all.
const model = normalizeModel(cap)
writeFileSync(process.argv[3], JSON.stringify(model, null, 2) + '\n')
console.log('wrote', process.argv[3])
