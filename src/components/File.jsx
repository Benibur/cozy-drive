import React, { Component } from 'react'
import classNames from 'classnames'
import filesize from 'filesize'
import { withRouter } from 'react-router'

import styles from '../styles/table'
import { translate } from '../lib/I18n'

import { getFolderUrl } from '../reducers'

export const splitFilename = filename => {
  const dotIdx = filename.lastIndexOf('.') - 1 >>> 0
  return {
    extension: filename.slice(dotIdx + 1),
    filename: filename.slice(0, dotIdx + 1)
  }
}

const isDir = attrs => attrs.type === 'directory'


export const getClassFromMime = (attrs) => {
  if (isDir(attrs)) {
    return styles['fil-file-folder']
  }
  return styles['fil-file-' + attrs.mime.split('/')[0]] || styles['fil-file-files']
}

class File extends Component {
  constructor (props) {
    super(props)
    this.state = {
      opening: false
    }
  }

  toggle (e) {
    e.stopPropagation()
    const { attributes, onToggle, selected } = this.props
    onToggle(attributes, selected)
  }

  open (e, attributes) {
    e.stopPropagation()
    if (isDir(attributes)) {
      this.setState({ opening: true })
      this.props.onFolderOpen(attributes.id).then(() => {
        this.setState({ opening: false })
        this.props.router.push(getFolderUrl(attributes.id, this.props.location))
      })
    } else {
      this.props.onFileOpen(this.props.displayedFolder, attributes)
    }
  }

  render ({ t, f, style, attributes, selected, selectionModeActive, onShowActionMenu }, { opening }) {
    const rowListeners = selectionModeActive
    ? { onClick: e => this.toggle(e) }
    : { onDoubleClick: e => this.open(e, attributes) }
    return (
      <div
        style={style}
        className={classNames(
          styles['fil-content-row'],
          { [styles['fil-content-row--selectable']]: selectionModeActive }
        )}
        {...rowListeners}

      >
        <div className={classNames(styles['fil-content-cell'], styles['fil-content-file-select'])} >
          <span data-input='checkbox'>
            <input
              type='checkbox'
              checked={selected}
             />
            <label onClick={e => this.toggle(e)} />
          </span>
        </div>
        {this.renderFilenameCell(attributes, opening, !selectionModeActive)}
        <div className={classNames(styles['fil-content-cell'], styles['fil-content-date'])}>
          <time datetime=''>{ f(attributes.created_at, 'MMM D, YYYY') }</time>
        </div>
        <div className={classNames(styles['fil-content-cell'], styles['fil-content-size'])}>
          {isDir(attributes)
            ? '—'
            : filesize(attributes.size, {base: 10})}
        </div>
        <div className={classNames(styles['fil-content-cell'], styles['fil-content-status'])}>—</div>
        <div className={classNames(styles['fil-content-cell'], styles['fil-content-file-action'])}>
          <button className='coz-btn coz-btn--extra' onClick={(e) => {
            onShowActionMenu(attributes.id)
            e.stopPropagation()
          }} />
        </div>
      </div>
    )
  }

  renderFilenameCell (attributes, opening, canOpen) {
    const { filename, extension } = splitFilename(attributes.name)
    const classes = classNames(
      styles['fil-content-cell'],
      styles['fil-content-file'],
      getClassFromMime(attributes),
      { [styles['fil-content-file-openable']]: canOpen }
    )
    return (
      <div
          className={classes}
          onClick={canOpen ? e => this.open(e, attributes) : undefined}
          // mouseEnter detection for FilInfo (popover) to be displayed
          onMouseEnter = { (e)=>{
              console.log('onMouseEnter!')
              window.filePopover.onEnterLink(e.target)
          }  }
          // mouseLeave detection for FilInfo (popover) to be removed
          onMouseLeave = { (e)=>{
              console.log('onMouseLeave!')
              window.filePopover.onExitLink(e.target)
          }  }
        >
        {filename}
        {extension && <span className={styles['fil-content-ext']}>{extension}</span>}
        {opening === true && <div className={styles['fil-loading']} />}
      </div>
    )
  }
}

export default withRouter(translate()(File))

export const FilePlaceholder = ({ style }) => (
  <div
    style={style}
    className={styles['fil-content-row']}
  >
    <div className={classNames(styles['fil-content-cell'], styles['fil-content-file-select'])} />
    <div className={classNames(styles['fil-content-cell'], styles['fil-content-file'])}>
      <div className={styles['fil-content-file-placeholder']} />
    </div>
    <div className={classNames(styles['fil-content-cell'], styles['fil-content-date'])} />
    <div className={classNames(styles['fil-content-cell'], styles['fil-content-size'])} />
    <div className={classNames(styles['fil-content-cell'], styles['fil-content-status'])} />
    <div className={classNames(styles['fil-content-cell'], styles['fil-content-file-action'])} />
  </div>
)
