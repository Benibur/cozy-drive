/* global __DEVELOPMENT__, cozy */

import 'babel-polyfill'

import './styles/main'

import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import { compose, createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import createLogger from 'redux-logger'
import { Router, hashHistory } from 'react-router'
import { I18n } from 'cozy-ui/react/I18n'
import { shouldEnableTracking, getTracker, createTrackerMiddleware } from './lib/tracker'
import eventTrackerMiddleware from './middlewares/EventTracker'

import filesApp from './reducers'
import AppRoute from './components/AppRoute'

// ------------------------------------------------------------------
// -- BJA : for the hacked search-bar
import autocompleteAlgolia from 'autocomplete.js'
import fuzzaldrinPlus from 'fuzzaldrin-plus'
// -- \BJA
// ------------------------------------------------------------------

const loggerMiddleware = createLogger()

if (__DEVELOPMENT__) {
  // Enables React dev tools for Preact
  // Cannot use import as we are in a condition
  require('preact/devtools')

  // Export React to window for the devtools
  window.React = React
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[role=application]')
  const data = root.dataset

  cozy.client.init({
    cozyURL: '//' + data.cozyDomain,
    token: data.cozyToken
  })

  cozy.bar.init({
    appName: data.cozyAppName,
    appEditor: data.cozyAppEditor,
    iconPath: data.cozyIconPath,
    lang: data.cozyLocale,
    replaceTitleOnMobile: true
  })

  let history = hashHistory
  let middlewares = [thunkMiddleware, loggerMiddleware]

  if (shouldEnableTracking() && getTracker()) {
    let trackerInstance = getTracker()
    history = trackerInstance.connectToHistory(hashHistory)
    trackerInstance.track(hashHistory.getCurrentLocation()) // when using a hash history, the initial visit is not tracked by piwik react router
    middlewares.push(eventTrackerMiddleware)
    middlewares.push(createTrackerMiddleware())
  }

  // Enable Redux dev tools
  const composeEnhancers = (__DEVELOPMENT__ && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose

  const store = createStore(
    filesApp,
    composeEnhancers(applyMiddleware.apply(this, middlewares))
  )

  render((
    <I18n lang={data.cozyLocale} dictRequire={(lang) => require(`./locales/${lang}`)}>
      <Provider store={store}>
        <Router history={history} routes={AppRoute} />
      </Provider>
    </I18n>
  ), root)

  // ------------------------------------------------------------------
  // -- BJA : fort the hacked search-bar
  // insert a hacked search field in the cozy bar
  // import tata from 'path'
  // tata(cozy)
  console.log('start algolia')
  var searchInput = document.createElement('input')
  searchInput.setAttribute('id', `search-bar-input`)
  // searchInput.setAttribute('style',`background-color:yellow;
  //   border:1px solid black;
  //   height:20px;
  //   width:100px;
  //   cursor:pointer;
  //   transition: top .2s ease;`)
  var target = document.querySelector('.coz-nav')
  const searchBar = document.createElement('div')
  searchBar.setAttribute('id', 'search-bar')
  searchBar.appendChild(searchInput)
  target.parentElement.insertBefore(searchBar, target)
  // cozy.client.files.statByPath('/test')
  // .then(data => {
  //   console.log(data)
  //   window.location.href = '#/files/' + data._id
  // })
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
    console.log(suggestion, dataset)
    cozy.client.files.statByPath(suggestion.path)
    .then(data => {
      console.log(data)
      window.location.href = '#/files/' + data._id
    })
  })
  // ------------------------------------------------------------------
  // prepare the Search options for fuzzaldrin

  const fuzzaldrinPlusSearch = function (query) {
    const results = fuzzaldrinPlus.filter(list, query, {key: 'path'})
    var n = 0
    for (let res of results) {
      res.html = basiqueBolderify(query, res.path)
      if (n++ > 10) { break }
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
    {'type': 'folder', 'path': 'Administratif/Finance/Banques'},
    {'type': 'folder', 'path': 'Administratif/Finance/Bulletins de salaires/Française des Jeux'},
    {'type': 'folder', 'path': 'Administratif/Finance/Bulletins de salaires/RATP'},
    {'type': 'folder', 'path': 'Administratif/Finance/Bulletins de salaires'},
    {'type': 'folder', 'path': 'Administratif/Finance/Compta perso'},
    {'type': 'folder', 'path': 'Administratif/Finance/Impôts/2014'},
    {'type': 'folder', 'path': 'Administratif/Finance/Impôts/2015'},
    {'type': 'folder', 'path': 'Administratif/Finance/Impôts/2016/Déclaration revenus'},
    {'type': 'folder', 'path': 'Administratif/Finance/Impôts/2016'},
    {'type': 'folder', 'path': 'Administratif/Finance/Impôts/2017'},
    {'type': 'folder', 'path': 'Administratif/Finance/Impôts'},
    {'type': 'folder', 'path': 'Administratif/Finance'},
    {'type': 'folder', 'path': 'Administratif/Mutuelles & Assurances/CPAM/Relevés de remboursements'},
    {'type': 'folder', 'path': 'Administratif/Mutuelles & Assurances/CPAM'},
    {'type': 'folder', 'path': 'Administratif/Mutuelles & Assurances/Harmonie Mutuelle/Contrats & Cotisatons'},
    {'type': 'folder', 'path': 'Administratif/Mutuelles & Assurances/Harmonie Mutuelle/Relevés de remboursements'},
    {'type': 'folder', 'path': 'Administratif/Mutuelles & Assurances/Harmonie Mutuelle'},
    {'type': 'folder', 'path': 'Administratif/Mutuelles & Assurances/MAIF/Contrats & Cotisatons'},
    {'type': 'folder', 'path': 'Administratif/Mutuelles & Assurances/MAIF/Relevés de remboursements'},
    {'type': 'folder', 'path': 'Administratif/Mutuelles & Assurances/MAIF'},
    {'type': 'folder', 'path': 'Administratif/Mutuelles & Assurances'},
    {'type': 'folder', 'path': 'Administratif/Opérateurs & Commerçants/Bouygues Telecom'},
    {'type': 'folder', 'path': 'Administratif/Opérateurs & Commerçants/EDF'},
    {'type': 'folder', 'path': 'Administratif/Opérateurs & Commerçants/Free mobile'},
    {'type': 'folder', 'path': 'Administratif/Opérateurs & Commerçants/Orange box'},
    {'type': 'folder', 'path': 'Administratif/Opérateurs & Commerçants'},
    {'type': 'folder', 'path': 'Administratif/Partagé par../Genevieve/Bouygues Telecom'},
    {'type': 'folder', 'path': 'Administratif/Partagé par../Genevieve/MAIF'},
    {'type': 'folder', 'path': 'Administratif/Partagé par../Genevieve'},
    {'type': 'folder', 'path': 'Administratif/Partagé par..'},
    {'type': 'folder', 'path': "Administratif/Pièces d'identités"},
    {'type': 'folder', 'path': 'Administratif'},
    {'type': 'folder', 'path': 'Ecoles & Formations/Louise'},
    {'type': 'folder', 'path': 'Ecoles & Formations/Moi'},
    {'type': 'folder', 'path': 'Ecoles & Formations'},
    {'type': 'folder', 'path': 'Photos/Partagées avec moi/partagé par Genevieve'},
    {'type': 'folder', 'path': 'Photos/Partagées avec moi'},
    {'type': 'folder', 'path': 'Photos/Provenant de mon mobile'},
    {'type': 'folder', 'path': 'Photos'},
    {'type': 'folder', 'path': 'Voyages & vacances'}]
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

  // -- \BJA
  // ------------------------------------------------------------------
})
