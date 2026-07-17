/**
 * GATE T-03 (sonde de dé-risquage) — round-trip oracle prouvé de BOUT EN BOUT.
 *
 * Évidence capturée EN DIRECT le 2026-06-23 via Chrome DevTools MCP, en pilotant
 * l'éditeur d'exemple OnlyOffice (http://localhost/example/, plugin Scribe chargé),
 * sans Cozy ni LLM. Chaîne exercée :
 *   setSelection('P1@start..P1@end') -> injectFixture('XXX','replace') -> dumpState
 * via les 3 dev-hooks flag-gated du plugin (window.__scribeTest, voir code.js).
 *
 * Ce que ce spec verrouille (le contrat de l'oracle) :
 *  - dumpState produit le schéma brut { blocks, selection } d'ORACLE-SCHEMA §2 ;
 *  - normalizeModel le ramène en forme canonique comparable ;
 *  - idempotence (normalize∘normalize == normalize) ;
 *  - la capture live était STABLE (deux dumpState consécutifs identiques) — vérifié
 *    côté navigateur (stable:true), figé ici comme golden.
 *
 * NOTE (pour la revue humaine T-04) : la sortie A1/replace porte un run d'espace
 * final {t:" "} après "XXX" (smart-spacing de buildAndInject). On le BÉNIT tel quel
 * pour le gate ; reste à juger en T-04 si "XXX " est le golden désiré pour A1 ou un
 * micro-⚠️ (la spec dit « remplace tout le ¶ »).
 */
import { normalizeModel } from './normalizeModel'

// --- Capture live BRUTE (telle que renvoyée par le hook dumpState) -------------
// Slice pertinente pour A1 : le 1er bloc (le ¶ remplacé) + la sélection post-action.
// NB (2026-07-17) : cette capture DATE du 2026-06-23, donc d'AVANT selText/selMarkup.
// Elle ne porte que les unités de position — désormais démonétisées (debug only, cf
// normalizeModel.js § sélection). On la garde telle quelle (c'est une pièce
// historique, on n'invente pas de preuve live a posteriori) : le gate verrouille
// donc ici la normalisation des `blocks` + l'idempotence, et l'absence de selText
// est le constat honnête que cette capture n'a jamais enregistré ce que la
// sélection couvrait.
const LIVE_CAPTURE = {
  blocks: [
    { type: 'p', runs: [{ t: 'XXX' }, { t: ' ' }] }
    // ... (blocs 1..15 du sample.docx omis — non pertinents pour A1/replace)
  ],
  selection: { start: { block: 0, offset: 0 }, end: { block: 0, offset: 6 } }
}

// --- Golden béni (sortie désirée/acceptée pour A1/replace) ---------------------
const A1_REPLACE_GOLDEN = {
  blocks: [
    { type: 'p', runs: [{ t: 'XXX' }, { t: ' ' }] }
  ],
  selText: null,
  selMarkup: []
}

describe('GATE T-03 — oracle round-trip (A1/replace, capture live OO)', () => {
  it('normalize(capture live) == golden A1/replace', () => {
    expect(normalizeModel(LIVE_CAPTURE)).toEqual(A1_REPLACE_GOLDEN)
  })

  it('idempotence : normalize(normalize(x)) == normalize(x)', () => {
    const once = normalizeModel(LIVE_CAPTURE)
    expect(normalizeModel(once)).toEqual(once)
  })

  it('les unités de position sont exclues du modèle (démonétisées 2026-07-17)', () => {
    // Ce gate assertait `selection.end == {block:0, offset:6}`. Ce champ s'est
    // révélé être un mauvais oracle : `offset` compte les runs VIDES que `blocks`
    // supprime comme du bruit → il bouge sans que rien ne change à l'écran, et il
    // est illisible donc imbénissable (le golden A6/insert a figé sous « offset:10 »
    // une post-sélection qui mangeait un caractère de l'hôte). Il reste dans
    // capture.json pour le diagnostic ; l'oracle, c'est selText/selMarkup.
    const m = normalizeModel(LIVE_CAPTURE)
    expect(m.selection).toBeUndefined()
    expect(m.selText).toBeNull() // capture de 2026-06-23 : antérieure au champ
  })
})
