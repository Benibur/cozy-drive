/**
 * RÉGRESSION — Insert multi-¶ sur hôte à styles HÉTÉROGÈNES (bug Ben 2026-06-29).
 *
 * Bundle : test-harness/corpus-styledHost-styledFixture/A9/insert/
 * Capturé EN DIRECT via Chrome DevTools MCP sur l'éditeur d'exemple OnlyOffice
 * (plugin Scribe build 2026-06-29.2), sans Cozy ni LLM :
 *   injectAtSelection('P1@start..P2@end', '# Injected H1\n## Injected H2', 'insert')
 *   -> dumpState  (capture.json), forcesave -> after.docx, normalize -> model.json
 *
 * Le bug : à l'Insert d'une réponse multi-¶ après une sélection couvrant deux ¶ de
 * styles DIFFÉRENTS (P1=Heading 1, P2=Heading 2), le DERNIER ¶ sélectionné (P2)
 * était promu au style du PREMIER (H2 -> H1). Cause : `hostStyle` était lu au DÉBUT
 * de la sélection au lieu du point d'insertion (= fin de sélection = P2) ; le spacer
 * §5bis Cas B estampillait alors H1 sur la moitié gauche du split de l'hôte.
 *
 * Ce spec verrouille la sortie CORRIGÉE : P2 garde Heading 2, P3 (Normal) intact,
 * les 2 ¶ injectés gardent H1/H2, et la capture live = le golden normalisé.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { normalizeModel } from './normalizeModel'

const BUNDLE = join(__dirname, '..', 'corpus-styledHost-styledFixture', 'A9', 'insert')
const capture = JSON.parse(readFileSync(join(BUNDLE, 'capture.json'), 'utf8'))
const golden = JSON.parse(readFileSync(join(BUNDLE, 'model.json'), 'utf8'))

describe('RÉGRESSION A9 — Insert multi-¶ hôte styles hétérogènes (H1+H2)', () => {
  it('normalize(capture live) == golden model.json', () => {
    expect(normalizeModel({ blocks: capture.blocks, selection: capture.selection })).toEqual(golden)
  })

  it('le DERNIER ¶ sélectionné (P2) garde Heading 2 (ne monte PAS en H1)', () => {
    // blocks: [P1=H1, P2=H2, Injected H1, Injected H2, P3=Normal]
    expect(golden.blocks[1].runs[0].t).toBe('Jumps over the dog')
    expect(golden.blocks[1].style).toBe('Heading 2')
  })

  it('styles voisins intacts : P1=Heading 1, P3=Normal, injectés=H1/H2', () => {
    expect(golden.blocks[0].style).toBe('Heading 1')           // P1
    expect(golden.blocks[2].style).toBe('Heading 1')           // Injected H1
    expect(golden.blocks[3].style).toBe('Heading 2')           // Injected H2
    expect(golden.blocks[4].style).toBeUndefined()             // P3 Normal (style omis)
  })

  it('insertion APRÈS la sélection, 5 ¶, aucun ¶ vide', () => {
    expect(golden.blocks).toHaveLength(5)
    golden.blocks.forEach(b => {
      const txt = (b.runs || []).map(r => r.t).join('')
      expect(txt.length).toBeGreaterThan(0)
    })
  })

  // Les unités de position ne sont plus un champ de MODÈLE (démonétisées le
  // 2026-07-17 : elles comptent les runs vides que `blocks` supprime, et sont
  // illisibles donc imbénissables — cf normalizeModel.js § sélection). Elles
  // restent dans capture.json, où cette garde historique les lit encore.
  // ⚠️ Cette capture (build 2026-06-29.2) est ANTÉRIEURE à selText/selMarkup ET au
  // fix A6-postsel (build .7). Elle a la même forme que A6/insert (block2 -> block3),
  // dont on a montré le 2026-07-17 qu'il mordait d'UN caractère sur le suffixe hôte.
  // Ce spec ne peut donc PAS certifier « exactement les 2 ¶ injectés » — il gèle un
  // nombre, pas une couverture. À re-capturer avec selMarkup pour être concluant.
  it('post-sélection : garde historique en unités de position (à re-capturer)', () => {
    expect(capture.selection.start).toEqual({ block: 2, offset: 0 })
    expect(capture.selection.end).toEqual({ block: 3, offset: 13 })
    expect(golden.selection).toBeUndefined() // hors modèle : jamais comparé
  })
})
