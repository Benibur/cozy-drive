import autocompleteAlgolia from 'autocomplete.js'
import fuzzaldrinPlus from 'fuzzaldrin-plus'

const Main = {}

Main.init = function (cozyClient) {
  const searchInput = document.createElement('input')
  searchInput.setAttribute('id', `search-bar-input`)
  searchInput.setAttribute('placeholder', 'Search')
  var target = document.querySelector('.coz-sep-flex')
  const searchBar = document.createElement('div')
  searchBar.setAttribute('id', 'search-bar')
  searchBar.appendChild(searchInput)
  target.parentElement.insertBefore(searchBar, target)

  searchBar.addEventListener('focusin', () => {
    searchBar.classList.add('focus-in')
    if (searchInput.previousValue) {
      searchInput.value = searchInput.previousValue
      searchInput.setSelectionRange(0, searchInput.value.length)
    }
  }, true)

  searchBar.addEventListener('focusout', function (event) {
    searchBar.classList.remove('focus-in')
    searchInput.previousValue = searchInput.value
    searchInput.value = ''
  }, true)

  autocompleteAlgolia('#search-bar-input', { hint: true }, [
    {
      source: function (query, cb) {
        cb(fuzzaldrinPlusSearch(query))
      },
      displayKey: 'path',
      templates: {
        suggestion: function (suggestion) {
          return suggestion.html
        }
      }
    }
  ]).on('autocomplete:selected', function (event, suggestion, dataset) {
    // console.log(suggestion, dataset)
    cozyClient.files.statByPath(suggestion.path)
    .then(data => {
      window.location.href = '#/files/' + data._id
      searchInput.value = ''
    }).catch(err => {
      searchInput.value = ''
      console.log(err)
    })
  })

  // ------------------------------------------------------------------
  // prepare the Search options for fuzzaldrin
  const fuzzaldrinPlusSearch = function (query) {
    const results = fuzzaldrinPlus.filter(list, query, {key: 'path', maxResults: 10})
    for (let res of results) {
      res.html = basiqueBolderify(query, res.path)
    }
    return results
  }

  const basiqueBolderify = function (query, path) {
    var words = query.split(' ')
    words = words.filter(function (item) { return (item !== '') })
    var startIndex = 0
    var nextWordOccurence
    var html = ''
    const lastIndex = path.length
    const pathLC = path.toLowerCase()
    while (startIndex < lastIndex) {
      nextWordOccurence = nextWord(path, pathLC, words, startIndex)
      if (!nextWordOccurence) {
        break
      }
      html += `${path.slice(startIndex, nextWordOccurence.start)}<b>${nextWordOccurence.word}</b>`
      startIndex = nextWordOccurence.start + nextWordOccurence.word.length
    }
    html += path.slice(startIndex)
    return html
  }

  const nextWord = function (path, pathLC, words, startIndex) {
    var wordFound = ''
    var i
    var lowestIndexFound = 10000000

    for (let w of words) {
      i = pathLC.indexOf(w.toLowerCase(), startIndex)
      if (i < lowestIndexFound && i > -1) {
        lowestIndexFound = i
        wordFound = w
      }
    }
    if (lowestIndexFound === -1) {
      return undefined
    } else {
      return {word: path.slice(lowestIndexFound, lowestIndexFound + wordFound.length), start: lowestIndexFound}
    }
  }
  // const list = [{path:"/Administratif"}]
  const list = [
    {'type': 'folder', 'path': '/Administratif/Finance/Banques'},
    {'type': 'folder', 'path': '/Administratif/Finance/Bulletins de salaires/Française des Jeux'},
    {'type': 'folder', 'path': '/Administratif/Finance/Bulletins de salaires/RATP'},
    {'type': 'folder', 'path': '/Administratif/Finance/Bulletins de salaires'},
    {'type': 'folder', 'path': '/Administratif/Finance/Compta perso'},
    {'type': 'folder', 'path': '/Administratif/Finance/Impôts/2014'},
    {'type': 'folder', 'path': '/Administratif/Finance/Impôts/2015'},
    {'type': 'folder', 'path': '/Administratif/Finance/Impôts/2016/Déclaration revenus'},
    {'type': 'folder', 'path': '/Administratif/Finance/Impôts/2016'},
    {'type': 'folder', 'path': '/Administratif/Finance/Impôts/2017'},
    {'type': 'folder', 'path': '/Administratif/Finance/Impôts'},
    {'type': 'folder', 'path': '/Administratif/Finance'},
    {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/CPAM/Relevés de remboursements'},
    {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/CPAM'},
    {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/Harmonie Mutuelle/Contrats & Cotisatons'},
    {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/Harmonie Mutuelle/Relevés de remboursements'},
    {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/Harmonie Mutuelle'},
    {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/MAIF/Contrats & Cotisatons'},
    {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/MAIF/Relevés de remboursements'},
    {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/MAIF'},
    {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances'},
    {'type': 'folder', 'path': '/Administratif/Opérateurs & Commerçants/Bouygues Telecom'},
    {'type': 'folder', 'path': '/Administratif/Opérateurs & Commerçants/EDF'},
    {'type': 'folder', 'path': '/Administratif/Opérateurs & Commerçants/Free mobile'},
    {'type': 'folder', 'path': '/Administratif/Opérateurs & Commerçants/Orange box'},
    {'type': 'folder', 'path': '/Administratif/Opérateurs & Commerçants'},
    {'type': 'folder', 'path': '/Administratif/Partagé par/Genevieve/Bouygues Telecom'},
    {'type': 'folder', 'path': '/Administratif/Partagé par/Genevieve/MAIF'},
    {'type': 'folder', 'path': '/Administratif/Partagé par/Genevieve'},
    {'type': 'folder', 'path': '/Administratif/Partagé par'},
    {'type': 'folder', 'path': "/Administratif/Pièces d'identités"},
    {'type': 'folder', 'path': '/Administratif'},
    {'type': 'folder', 'path': '/Ecoles & Formations/Louise'},
    {'type': 'folder', 'path': '/Ecoles & Formations/Moi'},
    {'type': 'folder', 'path': '/Ecoles & Formations'},
    {'type': 'folder', 'path': '/Photos/Partagées avec moi/partagé par Genevieve'},
    {'type': 'folder', 'path': '/Photos/Partagées avec moi'},
    {'type': 'folder', 'path': '/Photos/Provenant de mon mobile'},
    {'type': 'folder', 'path': '/Photos'},
    {'type': 'folder', 'path': '/Voyages & vacances'}]
  // const list = [
  //   {path:"/Administratif"},
  //   {path:"/Administratif/Bank statements"},
  //   {path:"/Administratif/Bank statements/Bank Of America"},
  //   {path:"/Administratif/Bank statements/Deutsche Bank"},
  //   {path:"/Administratif/Bank statements/Société Générale"},
  //   {path:"/Administratif/CPAM"},
  //   {path:"/Administratif/EDF"},
  //   {path:"/Administratif/EDF/Contrat"},
  //   {path:"/Administratif/EDF/Factures"},
  //   {path:"/Administratif/Emploi"},
  //   {path:"/Administratif/Impôts"},
  //   {path:"/Administratif/Logement"},
  //   {path:"/Administratif/Logement/Loyer 158 rue de Verdun"},
  //   {path:"/Administratif/Orange"},
  //   {path:"/Administratif/Pièces identité"},
  //   {path:"/Administratif/Pièces identité/Carte identité"},
  //   {path:"/Administratif/Pièces identité/Passeport"},
  //   {path:"/Administratif/Pièces identité/Permis de conduire"},
  //   {path:"/Appareils photo"},
  //   {path:"/Boulot"},
  //   {path:"/Cours ISEN"},
  //   {path:"/Cours ISEN/CIR"},
  //   {path:"/Cours ISEN/CIR/LINUX"},
  //   {path:"/Cours ISEN/CIR/MICROCONTROLEUR"},
  //   {path:"/Cours ISEN/CIR/RESEAUX"},
  //   {path:"/Cours ISEN/CIR/TRAITEMENT_SIGNAL"},
  //   {path:"/Divers photo"},
  //   {path:"/Divers photo/wallpapers"},
  //   {path:"/Films"},
  //   {path:"/Notes"},
  //   {path:"/Notes/Communication"},
  //   {path:"/Notes/Notes techniques"},
  //   {path:"/Notes/Recrutement"},
  //   {path:"/Projet appartement à Lyon"},
  //   {path:"/Vacances Périgord"}
  // ]
}

export default Main
