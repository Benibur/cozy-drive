/**
 * RÉGRESSION — Extraction d'une sélection en CELLULE : le dernier caractère n'est plus
 * perdu (bug PROD trouvé au blessing 2026-07-17, corrigé build 2026-07-17.10, commit f6643ff9c).
 *
 * Le bug : toute sélection dans une cellule HORS DERNIÈRE COLONNE envoyait au LLM son texte
 * amputé du dernier caractère (« Alpha » -> « Alph », « The quick brown fox » -> « ...fo »).
 * Cause : `para.GetText()` d'un ¶ de cellule finit par un TAB terminateur (« Alpha\t ») que ni
 * les runs ni `range.GetText()` ne contiennent ; le clip ne strippait que `\r\n`, donc paraText
 * (« Alpha\t », 6) > rangeText (« Alpha », 5) -> la sélection ENTIÈRE était prise pour PARTIELLE
 * -> clipEnd=1 -> dernier caractère coupé. La dernière colonne finit par `\r\n` (strippé) donc
 * était épargnée. Fix : strip du `\t` terminateur, gaté intra-cellule (GetParentTableCell).
 *
 * Ce que ce spec verrouille : les `extractedMd` capturés EN DIRECT (build .10) pour des
 * sélections en cellule ne sont plus tronqués. C'est un GOLDEN-LOCK statique (comme les specs
 * A9/L1/L2) : `extractedMd` = ce que l'extraction du plugin a réellement émis à la capture, figé
 * ici. Une re-capture sur un build régressé ré-écrirait « Alph » -> ce spec casserait à ce
 * commit. (`extractedMd` n'entre PAS dans `model.json`/l'oracle de sélection : d'où ce spec
 * dédié — sans lui, la troncature était invisible du corpus, ce qui l'avait masquée jusqu'ici.)
 */
import { readFileSync } from 'fs'
import { join } from 'path'

function extractedMdOf(caseId, mode) {
  const p = join(__dirname, '..', 'corpus', caseId, mode, 'capture.json')
  return JSON.parse(readFileSync(p, 'utf8')).extractedMd
}

// { case, mode, attendu } — valeurs capturées LIVE sur build 2026-07-17.10 (extraction corrigée).
// L'ancienne sortie BUGGÉE (pour mémoire) est le même texte moins le dernier caractère.
const CASES = [
  { id: 'T1', mode: 'insert', spec: 'cellule entière « Alpha »', expected: 'Alpha', buggy: 'Alph' },
  { id: 'H3', mode: 'insert', spec: 'cellule entière « Alpha » (doc en-tête)', expected: 'Alpha', buggy: 'Alph' },
  { id: 'Ac1', mode: 'insert', spec: 'cellule-phrase entière', expected: 'The quick brown fox', buggy: 'The quick brown fo' },
  { id: 'Ac3', mode: 'insert', spec: 'cellule @space..@end', expected: 'quick brown fox', buggy: 'quick brown fo' },
  { id: 'Ac4', mode: 'insert', spec: 'cellule @start..@space (garde l’espace de fin)', expected: 'The ', buggy: 'The' },
]

describe('RÉGRESSION — extraction cellule : dernier caractère préservé (build .10)', () => {
  CASES.forEach(({ id, mode, spec, expected, buggy }) => {
    it(`${id}/${mode} (${spec}) -> extractedMd == ${JSON.stringify(expected)} (pas ${JSON.stringify(buggy)})`, () => {
      const got = extractedMdOf(id, mode)
      expect(got).toBe(expected)
      // garde explicite anti-troncature : la sortie buggée ne doit jamais réapparaître
      expect(got).not.toBe(buggy)
    })
  })
})
