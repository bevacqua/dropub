(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const funky = require('funky')
const bel = require('bel')

const reflow = () => {
  ;[...document.querySelectorAll('dropub-notice')].forEach(el => {
    let top = el.offsetTop - 5
    el.querySelector('div.boxclose').style['margin-top'] = top + 'px'
  })
}

const initNotice = (elem, opts) => {
  let close = bel`<div class="boxclose">✖</div>`
  close.onclick = () => {
    elem.parentNode.removeChild(elem)
    reflow()
  }
  elem.appendChild(close)
}

const seedView = funky`
${initNotice}
<dropub-notice>
  <div>You are seeding these files.</div>
  <div><strong>Keep this browser window open for others to download the files!</strong></div>
</dropub-notice>
`

const noticeView = funky`
${initNotice}
<dropub-notice>
  <div>${str => str}</div>
</dropub-notice>
`

function init (elem, opts) {
  let torrent = opts.torrent

  elem.addNotice = str => {
    let el = noticeView(str)
    elem.appendChild(el)
    setTimeout(reflow, 0) // Defer in case they dynamically add content.
    return el
  }
  if (torrent.done) {
    let seed = seedView()
    elem.appendChild(seed)
  }
}

const view = funky`
${init}
<dropub-notices>
  <style>
    dropub-notices {
      position: absolute;
      right: 0;
      top: 0;
      display: flex;
      padding: 10px;
      flex-direction: column;
    }
    dropub-notices dropub-notice {
      width: 250px;
      background-color: #B0E2FF;
      border-radius: 10px;
      border-color: #3ac9ff;
      border-style: solid;
      border-width: 1px;
      font-size: 14px;
      padding: 10px;
      color: #5E5E5E;
      margin: 5px;
    }
    div.boxclose {
      line-height: 10px;
      width: 15px;
      heigth: 15px;
      line-height: 14px;
      font-size: 8pt;
      font-family: tahoma;
      margin-top: 10px;
      margin-right: 10px;

      position:absolute;
      top:0;
      right:0;

      background-color: #B0E2FF;
      border-radius: 10px;
      border-color: #3ac9ff;
      border-style: solid;
      border-width: 1px;

      text-align: center;
      vertical-align: middle;

      color: #3ac9ff;
      cursor: pointer;
    }
  </style>
</dropub-notices>
`

module.exports = view
module.exports.reflow = reflow

},{"bel":6,"funky":45}],2:[function(require,module,exports){
const funky = require('funky')
const bel = require('bel')
const emojione = require('emojione')
const elementClass = require('element-class')
const mime = require('browserify-mime')
const Clipboard = require('clipboard')
const notices = require('./dropub-notices')

const mojimap = {
  'audio/': '🎧',
  'video/': '📼',
  'image/': '🖼',
  'default': '💿'
}

const startsWith = (str, x) => str.indexOf(x) === 0

function fileEmoji (type) {
  for (var key in mojimap) {
    if (startsWith(type, key)) return mojimap[key]
  }
  return mojimap.default
}

function fileElement (f) {
  let type = mime.lookup(f.name)
  let progress = bel`<progress value=0></progress>`
  let el = bel`
  <div class="dropub-file">
    <div class="dropub-file-emoji">
      ${bel([emojione.unicodeToImage(fileEmoji(type))])}
    </div>
    <div class="dropub-filename">
      <div class="dropub-filename-label
                  dropub-not-downloaded"
       ><a>${f.name}</a></div>
      ${f.done ? '' : progress}
    </div>
  </div>
  `
  return el
}

function init (elem, opts) {
  let webtorrent = opts.webtorrent
  let torrent = opts.torrent

  const modal = bel`
  <div class="dropub-modal-background">
    <style>
    div.dropub-modal-container {
      height: 100vh;
      display: flex;
      justify-content: center;
      width:100%;
      align-items: center;
    }
    div.dropub-modal-container * {
      align-self: center;
    }
    </style>
    <div class="dropub-modal-container">
    </div>
  </div>
  `
  modal.onclick = () => {
    unblur()
    modalContainer.innerHTML = ''
    elem.removeChild(modal)
  }
  const modalContainer = modal.querySelector('div.dropub-modal-container')

  const blur = () => {
    elem.querySelector('div.dropub-files').style.filter = 'blur(5px)'
    elem.querySelector('div.dropub-buttons').style.filter = 'blur(5px)'
    elem.querySelector('dropub-notices').style.filter = 'blur(5px)'
  }
  const unblur = () => {
    elem.querySelector('div.dropub-files').style.filter = ''
    elem.querySelector('div.dropub-buttons').style.filter = ''
    elem.querySelector('dropub-notices').style.filter = ''
  }

  function modalPreview (file) {
    blur()
    file.appendTo(modalContainer)
    elem.appendChild(modal)
  }

  let filemap = {}
  torrent.files.forEach(f => { filemap[f.name] = f })
  let selector = 'div.dropub-file div.dropub-filename-label'
  ;[...elem.querySelectorAll(selector)].forEach(el => {
    let name = el.textContent.trim()

    if (filemap[name]) {
      filemap[name].progress = el.parentNode.querySelector('progress')
      filemap[name].getBlobURL((err, url) => {
        if (err) return console.error(err)
        if (filemap[name].progress) filemap[name].progress.value = 1
        elementClass(el).remove('dropub-not-downloaded')
        let a = el.querySelector('a')
        a.href = url
        a.download = name
      })
    }
  })

  selector = 'div.dropub-download-button img'
  ;[...elem.querySelectorAll(selector)].forEach(el => {
    el.onclick = () => {
      let selector = 'div.dropub-filename-label'
      let label = el.parentNode.parentNode.querySelector(selector)
      let name = label.textContent.trim()
      if (filemap[name]) {
        console.log('select')
        filemap[name].select()
      } else {
        console.error('Could not find file in torrent.')
      }
    }
  })

  selector = 'div.dropub-file-emoji img'
  ;[...elem.querySelectorAll(selector)].forEach(el => {
    el.onclick = (e) => {
      let par = el.parentNode.parentNode
      let label = par.querySelector('div.dropub-filename-label')
      let name = label.textContent.trim()
      modalPreview(filemap[name])
    }
  })

  torrent.on('download', () => {
    torrent.files.forEach(f => {
      if (f.done) return
      let downloaded = f.downloaded
      if (downloaded === 0) return
      let percent = downloaded / f.length
      f.progress.value = percent
    })
  })

  // This isn't being used until the deselect actually
  // prevents the files from being downloaded.
  let startDownload = () => {
    torrent.select(0, torrent.pieces.length - 1, 1)

    let _finished = () => {}

    let _update = () => {
      let downloaded = torrent.downloaded
      let percentage = Math.round(downloaded / torrent.length * 100)
      let val = `( ${percentage}% )`
      elem.querySelector('span.dropub-download-radio').textContent = val
      if (downloaded !== torrent.length) setTimeout(_update, 1000)
      else _finished()
    }
    _update()

    elem.querySelector('span.dropub-download').style.display = 'none'
    // TODO: change to pause button
  }
  // elem.querySelector('span.dropub-download').onclick = startDownload

  // Attach notices UI
  let noticeContainer = notices({torrent: torrent})
  elem.appendChild(noticeContainer)

  // Setup Share Button
  let btn = elem.querySelector('div.dropub-share')
  btn.setAttribute('data-clipboard-text', window.location.toString())
  let clip = new Clipboard(btn)
  clip.on('success', () => {
    noticeContainer.addNotice('Copied url to clipboard!')
  })

  // Setup ZIP download button
  let addZipButton = () => {
    let btn = bel`<div class="dropub-zip-download">Download Zip</div>`
    elem.querySelector('div.dropub-buttons').appendChild(btn)

    let worker = new window.Worker('/worker.js')

    btn.onclick = () => {
      let addLoader = container => {
        let el = bel`
        <div class="dropub-loading">
          <div class="dropub-loading-label">Creating Zip</h3>
          <div class="sk-fading-circle">
            <div class="sk-circle1 sk-circle"></div>
            <div class="sk-circle2 sk-circle"></div>
            <div class="sk-circle3 sk-circle"></div>
            <div class="sk-circle4 sk-circle"></div>
            <div class="sk-circle5 sk-circle"></div>
            <div class="sk-circle6 sk-circle"></div>
            <div class="sk-circle7 sk-circle"></div>
            <div class="sk-circle8 sk-circle"></div>
            <div class="sk-circle9 sk-circle"></div>
            <div class="sk-circle10 sk-circle"></div>
            <div class="sk-circle11 sk-circle"></div>
            <div class="sk-circle12 sk-circle"></div>
          </div>
        </div>
        `
        container.appendChild(el)
      }
      modalPreview({appendTo: addLoader})
      let files = []
      torrent.files.forEach(f => {
        f.getBlob((e, blob) => {
          if (e) return alert(e)
          files.push({name: f.name, blob})
          if (files.length === torrent.files.length) {
            worker.postMessage({ type: 'compress', files })
          }
        })
      })
    }

    // listen for messages from the worker
    worker.onmessage = (e) => {
      const data = e.data || {}

      if (data.type === 'compressed') {
        bel `<a href="${data.url}" download="${data.name}"></a>`.click()
        modalContainer.click()
      }
    }
  }
  if (torrent.done) {
    addZipButton()
  } else {
    torrent.on('done', addZipButton)
  }
}

const downarrow = () => bel([emojione.toImage(':arrow_down:')])

const view = funky`
${init}
<dropub-torrent>
  <link href='//fonts.googleapis.com/css?family=Lato:400,700' rel='stylesheet' type='text/css' />
  <style>
    dropub-torrent {
      font-family: 'Lato', sans-serif;
      background-color: #fff;
      // border: 1px solid #e1e8ed;
      border-radius: 5px;
      padding: 15px;
      display: block;
      margin-bottom: 10px;
      margin-left: 10px;
      margin-right: 10px;
      font-size: 18px;
      min-height: min-content;
    }
    div.dropub-download-button img {
      cursor: pointer;
    }
    div.dropub-file {
      padding-top: 10px;
    }
    div.dropub-file a {
      color: black;
    }
    div.dropub-not-downloaded a {
      color: grey;
    }
    div.dropub-files img.emojione,
    div.drop-toplevel-control img.emojione {
      max-height: 1.1em;
      font-size: 18px;
      margin-bottom: -2px;
      line-height: 16px;
    }
    div.dropub-file {
      display: flex;
    }
    div.dropub-file * {
      padding: 2px;
    }
    div.dropub-filename progress {
      width: 100%;
    }
    div.dropub-filename-label {
      margin-bottom: 0px;
      padding-bottom: 0px;
    }
    div.dropub-filename-label a {
      margin-bottom: 0px;
      padding-bottom: 0px;
    }
    div.dropub-filename progress {
      margin-top: 0px;
      padding-top: 0px;
    }
    div.dropub-modal-background {
      display: block;
      position fixed;
      top: 0;
      left: 0;
      height: 100%;
      width:100%;
      position: fixed;
      z-index: 99999;
    }
    div.dropub-file-emoji img {
      cursor: pointer;
    }
    div.dropub-buttons * {
      -webkit-border-radius: 5;
      -moz-border-radius: 5;
      border-radius: 5px;
      font-size: 16px;
      padding: 5px 10px 5px 10px;
      text-decoration: none;
      width: fit-content;
      margin-bottom: 5px;
      cursor: pointer;
      margin-right: 5px;
    }
    div.dropub-share {
      background: #3498db;
      background-image: -webkit-linear-gradient(top, #3498db, #2980b9);
      background-image: -moz-linear-gradient(top, #3498db, #2980b9);
      background-image: -ms-linear-gradient(top, #3498db, #2980b9);
      background-image: -o-linear-gradient(top, #3498db, #2980b9);
      background-image: linear-gradient(to bottom, #3498db, #2980b9);
      color: #ffffff;
    }
    div.dropub-share:hover {
      background: #3cb0fd;
      background-image: -webkit-linear-gradient(top, #3cb0fd, #3498db);
      background-image: -moz-linear-gradient(top, #3cb0fd, #3498db);
      background-image: -ms-linear-gradient(top, #3cb0fd, #3498db);
      background-image: -o-linear-gradient(top, #3cb0fd, #3498db);
      background-image: linear-gradient(to bottom, #3cb0fd, #3498db);
      text-decoration: none;
    }
    div.dropub-zip-download {
      background: #3498db;
      background-image: -webkit-linear-gradient(top, #3498db, #2980b9);
      background-image: -moz-linear-gradient(top, #3498db, #2980b9);
      background-image: -ms-linear-gradient(top, #3498db, #2980b9);
      background-image: -o-linear-gradient(top, #3498db, #2980b9);
      background-image: linear-gradient(to bottom, #3498db, #2980b9);
      color: #ffffff;
    }
    div.dropub-zip-download:hover {
      background: #3cb0fd;
      background-image: -webkit-linear-gradient(top, #3cb0fd, #3498db);
      background-image: -moz-linear-gradient(top, #3cb0fd, #3498db);
      background-image: -ms-linear-gradient(top, #3cb0fd, #3498db);
      background-image: -o-linear-gradient(top, #3cb0fd, #3498db);
      background-image: linear-gradient(to bottom, #3cb0fd, #3498db);
      text-decoration: none;
    }
    div.dropub-buttons {
      display: flex;
    }
    div.dropub-loading-label {
      font-size: 35px;
    }
  </style>
  <div class="dropub-buttons">
    <div class="dropub-share">Share</div>
  </div>
  <div class="dropub-files">
  ${opts => opts.torrent.files.map(f => {
    return fileElement(f)
  })}
  </div>
</dropub-torrent>
`

module.exports = view

  // <div class="drop-toplevel-control">
  //   <span class="dropub-download">${ downarrow() }</span>
  //   <span class="dropub-download-radio"></span>
  //   <span>All</div>
  // </div>

},{"./dropub-notices":1,"bel":6,"browserify-mime":20,"clipboard":28,"element-class":38,"emojione":39,"funky":45}],3:[function(require,module,exports){
/* globals history */
const torrentView = require('./components/dropub-torrent')
const webtorrent = require('webtorrent')()
const dragDrop = require('drag-drop')
const bel = require('bel')
const title = 'Dropub'

const search = window.location.search
const container = document.getElementById('main-container')
const clear = () => {
  pageTitle.innerHTML = ''
  container.innerHTML = ''
}
const fill = elem => {
  clear()
  container.appendChild(elem)
}
const updateUrl = search => {
  history.pushState({}, title, search)
}

function showTorrentView (search) {
  let magnet = `magnet:${search}`
  webtorrent.add(magnet, torrent => {
    // torrent.files.forEach(f => f.deselect())
    let elem = torrentView({webtorrent, torrent})
    fill(elem)
  })
}

const dropElement = bel`
<div class="drop-files">
  <div class="spinner">
    <div class="double-bounce1"></div>
    <div class="double-bounce2"></div>
  </div>
</div>
`
dropElement.onclick = () => {
  let input = document.getElementById('fileInput')
  input.click()
}

let fileInput = document.getElementById('fileInput')

fileInput.onchange = () => {
  seed(fileInput.files)
}

let pageTitle = document.getElementById('page-title')

function seed (files) {
  webtorrent.seed(files, torrent => {
    let elem = torrentView({webtorrent, torrent})
    let search = torrent.magnetURI.slice('magnet:'.length)
    fill(elem)
    updateUrl(search)
    pageTitle.innerHTML = ''
  })
}

const processingElement = bel`
<div class="drop-files">
  <div class="sk-fading-circle">
    <div class="sk-circle1 sk-circle"></div>
    <div class="sk-circle2 sk-circle"></div>
    <div class="sk-circle3 sk-circle"></div>
    <div class="sk-circle4 sk-circle"></div>
    <div class="sk-circle5 sk-circle"></div>
    <div class="sk-circle6 sk-circle"></div>
    <div class="sk-circle7 sk-circle"></div>
    <div class="sk-circle8 sk-circle"></div>
    <div class="sk-circle9 sk-circle"></div>
    <div class="sk-circle10 sk-circle"></div>
    <div class="sk-circle11 sk-circle"></div>
    <div class="sk-circle12 sk-circle"></div>
  </div>
</div>
`

function showDropView () {
  fill(dropElement)
  pageTitle.textContent = 'Drop Files To Share'
  window.onload = () => {
    dragDrop('body', files => {
      fill(processingElement)
      pageTitle.textContent = 'Creating Torrent'
      seed(files)
    })
  }
}

if (search.length) {
  showTorrentView(search)
} else {
  showDropView()
}

window.onpopstate = () => {
  window.location.reload(false)
}

},{"./components/dropub-torrent":2,"bel":6,"drag-drop":37,"webtorrent":135}],4:[function(require,module,exports){
var ADDR_RE = /^\[?([^\]]+)\]?:(\d+)$/ // ipv4/ipv6/hostname + port

var cache = {}

// reset cache when it gets to 100,000 elements (~ 600KB of ipv4 addresses)
// so it will not grow to consume all memory in long-running processes
var size = 0

module.exports = function addrToIPPort (addr) {
  if (size === 100000) module.exports.reset()
  if (!cache[addr]) {
    var m = ADDR_RE.exec(addr)
    if (!m) throw new Error('invalid addr: ' + addr)
    cache[addr] = [ m[1], Number(m[2]) ]
    size += 1
  }
  return cache[addr]
}

module.exports.reset = function reset () {
  cache = {}
  size = 0
}

},{}],5:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],6:[function(require,module,exports){
var document = require('global/document')
var hyperx = require('hyperx')
var onload = require('on-load')

var SVGNS = 'http://www.w3.org/2000/svg'
var XLINKNS = 'http://www.w3.org/1999/xlink'

var BOOL_PROPS = {
  autofocus: 1,
  checked: 1,
  defaultchecked: 1,
  disabled: 1,
  formnovalidate: 1,
  indeterminate: 1,
  readonly: 1,
  required: 1,
  selected: 1,
  willvalidate: 1
}
var SVG_TAGS = [
  'svg',
  'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
  'animateMotion', 'animateTransform', 'circle', 'clipPath', 'color-profile',
  'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
  'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
  'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB',
  'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
  'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
  'feSpotLight', 'feTile', 'feTurbulence', 'filter', 'font', 'font-face',
  'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri',
  'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image', 'line',
  'linearGradient', 'marker', 'mask', 'metadata', 'missing-glyph', 'mpath',
  'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect',
  'set', 'stop', 'switch', 'symbol', 'text', 'textPath', 'title', 'tref',
  'tspan', 'use', 'view', 'vkern'
]

function belCreateElement (tag, props, children) {
  var el

  // If an svg tag, it needs a namespace
  if (SVG_TAGS.indexOf(tag) !== -1) {
    props.namespace = SVGNS
  }

  // If we are using a namespace
  var ns = false
  if (props.namespace) {
    ns = props.namespace
    delete props.namespace
  }

  // Create the element
  if (ns) {
    el = document.createElementNS(ns, tag)
  } else {
    el = document.createElement(tag)
  }

  // If adding onload events
  if (props.onload || props.onunload) {
    var load = props.onload || function () {}
    var unload = props.onunload || function () {}
    onload(el, function belOnload () {
      load(el)
    }, function belOnunload () {
      unload(el)
    },
    // We have to use non-standard `caller` to find who invokes `belCreateElement`
    belCreateElement.caller.caller.caller)
    delete props.onload
    delete props.onunload
  }

  // Create the properties
  for (var p in props) {
    if (props.hasOwnProperty(p)) {
      var key = p.toLowerCase()
      var val = props[p]
      // Normalize className
      if (key === 'classname') {
        key = 'class'
        p = 'class'
      }
      // The for attribute gets transformed to htmlFor, but we just set as for
      if (p === 'htmlFor') {
        p = 'for'
      }
      // If a property is boolean, set itself to the key
      if (BOOL_PROPS[key]) {
        if (val === 'true') val = key
        else if (val === 'false') continue
      }
      // If a property prefers being set directly vs setAttribute
      if (key.slice(0, 2) === 'on') {
        el[p] = val
      } else {
        if (ns) {
          if (p === 'xlink:href') {
            el.setAttributeNS(XLINKNS, p, val)
          } else {
            el.setAttributeNS(null, p, val)
          }
        } else {
          el.setAttribute(p, val)
        }
      }
    }
  }

  function appendChild (childs) {
    if (!Array.isArray(childs)) return
    for (var i = 0; i < childs.length; i++) {
      var node = childs[i]
      if (Array.isArray(node)) {
        appendChild(node)
        continue
      }

      if (typeof node === 'number' ||
        typeof node === 'boolean' ||
        node instanceof Date ||
        node instanceof RegExp) {
        node = node.toString()
      }

      if (typeof node === 'string') {
        if (el.lastChild && el.lastChild.nodeName === '#text') {
          el.lastChild.nodeValue += node
          continue
        }
        node = document.createTextNode(node)
      }

      if (node && node.nodeType) {
        el.appendChild(node)
      }
    }
  }
  appendChild(children)

  return el
}

module.exports = hyperx(belCreateElement)
module.exports.createElement = belCreateElement

},{"global/document":47,"hyperx":53,"on-load":76}],7:[function(require,module,exports){
(function (Buffer){
/**
 * Decodes bencoded data.
 *
 * @param  {Buffer} data
 * @param  {Number} start (optional)
 * @param  {Number} end (optional)
 * @param  {String} encoding (optional)
 * @return {Object|Array|Buffer|String|Number}
 */
function decode (data, start, end, encoding) {
  if (typeof start !== 'number' && encoding == null) {
    encoding = start
    start = undefined
  }

  if (typeof end !== 'number' && encoding == null) {
    encoding = end
    end = undefined
  }

  decode.position = 0
  decode.encoding = encoding || null

  decode.data = !(Buffer.isBuffer(data))
    ? new Buffer(data)
    : data.slice(start, end)

  decode.bytes = decode.data.length

  return decode.next()
}

decode.bytes = 0
decode.position = 0
decode.data = null
decode.encoding = null

decode.next = function () {
  switch (decode.data[decode.position]) {
    case 0x64:
      return decode.dictionary()
    case 0x6C:
      return decode.list()
    case 0x69:
      return decode.integer()
    default:
      return decode.buffer()
  }
}

decode.find = function (chr) {
  var i = decode.position
  var c = decode.data.length
  var d = decode.data

  while (i < c) {
    if (d[i] === chr) return i
    i++
  }

  throw new Error(
    'Invalid data: Missing delimiter "' +
    String.fromCharCode(chr) + '" [0x' +
    chr.toString(16) + ']'
  )
}

decode.dictionary = function () {
  decode.position++

  var dict = {}

  while (decode.data[decode.position] !== 0x65) {
    dict[decode.buffer()] = decode.next()
  }

  decode.position++

  return dict
}

decode.list = function () {
  decode.position++

  var lst = []

  while (decode.data[decode.position] !== 0x65) {
    lst.push(decode.next())
  }

  decode.position++

  return lst
}

decode.integer = function () {
  var end = decode.find(0x65)
  var number = decode.data.toString('ascii', decode.position + 1, end)

  decode.position += end + 1 - decode.position

  return parseInt(number, 10)
}

decode.buffer = function () {
  var sep = decode.find(0x3A)
  var length = parseInt(decode.data.toString('ascii', decode.position, sep), 10)
  var end = ++sep + length

  decode.position = end

  return decode.encoding
    ? decode.data.toString(decode.encoding, sep, end)
    : decode.data.slice(sep, end)
}

module.exports = decode

}).call(this,require("buffer").Buffer)
},{"buffer":24}],8:[function(require,module,exports){
(function (Buffer){
/**
 * Encodes data in bencode.
 *
 * @param  {Buffer|Array|String|Object|Number|Boolean} data
 * @return {Buffer}
 */
function encode (data, buffer, offset) {
  var buffers = []
  var result = null

  encode._encode(buffers, data)
  result = Buffer.concat(buffers)
  encode.bytes = result.length

  if (Buffer.isBuffer(buffer)) {
    result.copy(buffer, offset)
    return buffer
  }

  return result
}

encode.bytes = -1
encode._floatConversionDetected = false

encode._encode = function (buffers, data) {
  if (Buffer.isBuffer(data)) {
    buffers.push(new Buffer(data.length + ':'))
    buffers.push(data)
    return
  }

  switch (typeof data) {
    case 'string':
      encode.buffer(buffers, data)
      break
    case 'number':
      encode.number(buffers, data)
      break
    case 'object':
      data.constructor === Array
        ? encode.list(buffers, data)
        : encode.dict(buffers, data)
      break
    case 'boolean':
      encode.number(buffers, data ? 1 : 0)
      break
  }
}

var buffE = new Buffer('e')
var buffD = new Buffer('d')
var buffL = new Buffer('l')

encode.buffer = function (buffers, data) {
  buffers.push(new Buffer(Buffer.byteLength(data) + ':' + data))
}

encode.number = function (buffers, data) {
  var maxLo = 0x80000000
  var hi = (data / maxLo) << 0
  var lo = (data % maxLo) << 0
  var val = hi * maxLo + lo

  buffers.push(new Buffer('i' + val + 'e'))

  if (val !== data && !encode._floatConversionDetected) {
    encode._floatConversionDetected = true
    console.warn(
      'WARNING: Possible data corruption detected with value "' + data + '":',
      'Bencoding only defines support for integers, value was converted to "' + val + '"'
    )
    console.trace()
  }
}

encode.dict = function (buffers, data) {
  buffers.push(buffD)

  var j = 0
  var k
  // fix for issue #13 - sorted dicts
  var keys = Object.keys(data).sort()
  var kl = keys.length

  for (; j < kl; j++) {
    k = keys[j]
    encode.buffer(buffers, k)
    encode._encode(buffers, data[k])
  }

  buffers.push(buffE)
}

encode.list = function (buffers, data) {
  var i = 0
  var c = data.length
  buffers.push(buffL)

  for (; i < c; i++) {
    encode._encode(buffers, data[i])
  }

  buffers.push(buffE)
}

module.exports = encode

}).call(this,require("buffer").Buffer)
},{"buffer":24}],9:[function(require,module,exports){
var bencode = module.exports

bencode.encode = require('./encode')
bencode.decode = require('./decode')

/**
 * Determines the amount of bytes
 * needed to encode the given value
 * @param  {Object|Array|Buffer|String|Number|Boolean} value
 * @return {Number} byteCount
 */
bencode.byteLength = bencode.encodingLength = function (value) {
  return bencode.encode(value).length
}

},{"./decode":7,"./encode":8}],10:[function(require,module,exports){
module.exports = function(haystack, needle, comparator, low, high) {
  var mid, cmp;

  if(low === undefined)
    low = 0;

  else {
    low = low|0;
    if(low < 0 || low >= haystack.length)
      throw new RangeError("invalid lower bound");
  }

  if(high === undefined)
    high = haystack.length - 1;

  else {
    high = high|0;
    if(high < low || high >= haystack.length)
      throw new RangeError("invalid upper bound");
  }

  while(low <= high) {
    /* Note that "(low + high) >>> 1" may overflow, and results in a typecast
     * to double (which gives the wrong results). */
    mid = low + (high - low >> 1);
    cmp = +comparator(haystack[mid], needle, mid, haystack);

    /* Too low. */
    if(cmp < 0.0)
      low  = mid + 1;

    /* Too high. */
    else if(cmp > 0.0)
      high = mid - 1;

    /* Key found. */
    else
      return mid;
  }

  /* Key not found. */
  return ~low;
}

},{}],11:[function(require,module,exports){
(function (Buffer){
var Container = typeof Buffer !== "undefined" ? Buffer //in node, use buffers
		: typeof Int8Array !== "undefined" ? Int8Array //in newer browsers, use webgl int8arrays
		: function(l){ var a = new Array(l); for(var i = 0; i < l; i++) a[i]=0; }; //else, do something similar

function BitField(data, opts){
	if(!(this instanceof BitField)) {
		return new BitField(data, opts);
	}

	if(arguments.length === 0){
		data = 0;
	}

	this.grow = opts && (isFinite(opts.grow) && getByteSize(opts.grow) || opts.grow) || 0;

	if(typeof data === "number" || data === undefined){
		data = new Container(getByteSize(data));
		if(data.fill && !data._isBuffer) data.fill(0); // clear node buffers of garbage
	}
	this.buffer = data;
}

function getByteSize(num){
	var out = num >> 3;
	if(num % 8 !== 0) out++;
	return out;
}

BitField.prototype.get = function(i){
	var j = i >> 3;
	return (j < this.buffer.length) &&
		!!(this.buffer[j] & (128 >> (i % 8)));
};

BitField.prototype.set = function(i, b){
	var j = i >> 3;
	if (b || arguments.length === 1){
		if (this.buffer.length < j + 1) this._grow(Math.max(j + 1, Math.min(2 * this.buffer.length, this.grow)));
		// Set
		this.buffer[j] |= 128 >> (i % 8);
	} else if (j < this.buffer.length) {
		/// Clear
		this.buffer[j] &= ~(128 >> (i % 8));
	}
};

BitField.prototype._grow = function(length) {
	if (this.buffer.length < length && length <= this.grow) {
		var newBuffer = new Container(length);
		if (newBuffer.fill) newBuffer.fill(0);
		if (this.buffer.copy) this.buffer.copy(newBuffer, 0);
		else {
			for(var i = 0; i < this.buffer.length; i++) {
				newBuffer[i] = this.buffer[i];
			}
		}
		this.buffer = newBuffer;
	}
};

if(typeof module !== "undefined") module.exports = BitField;

}).call(this,require("buffer").Buffer)
},{"buffer":24}],12:[function(require,module,exports){
module.exports = Wire

var bencode = require('bencode')
var BitField = require('bitfield')
var Buffer = require('safe-buffer').Buffer
var debug = require('debug')('bittorrent-protocol')
var extend = require('xtend')
var inherits = require('inherits')
var randombytes = require('randombytes')
var speedometer = require('speedometer')
var stream = require('readable-stream')

var BITFIELD_GROW = 400000
var KEEP_ALIVE_TIMEOUT = 55000

var MESSAGE_PROTOCOL = Buffer.from('\u0013BitTorrent protocol')
var MESSAGE_KEEP_ALIVE = Buffer.from([0x00, 0x00, 0x00, 0x00])
var MESSAGE_CHOKE = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x00])
var MESSAGE_UNCHOKE = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x01])
var MESSAGE_INTERESTED = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x02])
var MESSAGE_UNINTERESTED = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x03])

var MESSAGE_RESERVED = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
var MESSAGE_PORT = [0x00, 0x00, 0x00, 0x03, 0x09, 0x00, 0x00]

function Request (piece, offset, length, callback) {
  this.piece = piece
  this.offset = offset
  this.length = length
  this.callback = callback
}

inherits(Wire, stream.Duplex)

function Wire () {
  if (!(this instanceof Wire)) return new Wire()
  stream.Duplex.call(this)

  this._debugId = randombytes(4).toString('hex')
  this._debug('new wire')

  this.peerId = null // remote peer id (hex string)
  this.peerIdBuffer = null // remote peer id (buffer)
  this.type = null // connection type ('webrtc', 'tcpIncoming', 'tcpOutgoing', 'webSeed')

  this.amChoking = true // are we choking the peer?
  this.amInterested = false // are we interested in the peer?

  this.peerChoking = true // is the peer choking us?
  this.peerInterested = false // is the peer interested in us?

  // The largest torrent that I know of (the Geocities archive) is ~641 GB and has
  // ~41,000 pieces. Therefore, cap bitfield to 10x larger (400,000 bits) to support all
  // possible torrents but prevent malicious peers from growing bitfield to fill memory.
  this.peerPieces = new BitField(0, { grow: BITFIELD_GROW })

  this.peerExtensions = {}

  this.requests = [] // outgoing
  this.peerRequests = [] // incoming

  this.extendedMapping = {} // number -> string, ex: 1 -> 'ut_metadata'
  this.peerExtendedMapping = {} // string -> number, ex: 9 -> 'ut_metadata'

  // The extended handshake to send, minus the "m" field, which gets automatically
  // filled from `this.extendedMapping`
  this.extendedHandshake = {}

  this.peerExtendedHandshake = {} // remote peer's extended handshake

  this._ext = {}  // string -> function, ex 'ut_metadata' -> ut_metadata()
  this._nextExt = 1

  this.uploaded = 0
  this.downloaded = 0
  this.uploadSpeed = speedometer()
  this.downloadSpeed = speedometer()

  this._keepAliveInterval = null
  this._timeout = null
  this._timeoutMs = 0

  this.destroyed = false // was the wire ended by calling `destroy`?
  this._finished = false

  this._parserSize = 0 // number of needed bytes to parse next message from remote peer
  this._parser = null // function to call once `this._parserSize` bytes are available

  this._buffer = [] // incomplete message data
  this._bufferSize = 0 // cached total length of buffers in `this._buffer`

  this.on('finish', this._onFinish)

  this._parseHandshake()
}

/**
 * Set whether to send a "keep-alive" ping (sent every 55s)
 * @param {boolean} enable
 */
Wire.prototype.setKeepAlive = function (enable) {
  var self = this
  self._debug('setKeepAlive %s', enable)
  clearInterval(self._keepAliveInterval)
  if (enable === false) return
  self._keepAliveInterval = setInterval(function () {
    self.keepAlive()
  }, KEEP_ALIVE_TIMEOUT)
}

/**
 * Set the amount of time to wait before considering a request to be "timed out"
 * @param {number} ms
 * @param {boolean=} unref (should the timer be unref'd? default: false)
 */
Wire.prototype.setTimeout = function (ms, unref) {
  this._debug('setTimeout ms=%d unref=%s', ms, unref)
  this._clearTimeout()
  this._timeoutMs = ms
  this._timeoutUnref = !!unref
  this._updateTimeout()
}

Wire.prototype.destroy = function () {
  if (this.destroyed) return
  this.destroyed = true
  this._debug('destroy')
  this.emit('close')
  this.end()
}

Wire.prototype.end = function () {
  this._debug('end')
  this._onUninterested()
  this._onChoke()
  stream.Duplex.prototype.end.apply(this, arguments)
}

/**
 * Use the specified protocol extension.
 * @param  {function} Extension
 */
Wire.prototype.use = function (Extension) {
  var name = Extension.prototype.name
  if (!name) {
    throw new Error('Extension class requires a "name" property on the prototype')
  }
  this._debug('use extension.name=%s', name)

  var ext = this._nextExt
  var handler = new Extension(this)

  function noop () {}

  if (typeof handler.onHandshake !== 'function') {
    handler.onHandshake = noop
  }
  if (typeof handler.onExtendedHandshake !== 'function') {
    handler.onExtendedHandshake = noop
  }
  if (typeof handler.onMessage !== 'function') {
    handler.onMessage = noop
  }

  this.extendedMapping[ext] = name
  this._ext[name] = handler
  this[name] = handler

  this._nextExt += 1
}

//
// OUTGOING MESSAGES
//

/**
 * Message "keep-alive": <len=0000>
 */
Wire.prototype.keepAlive = function () {
  this._debug('keep-alive')
  this._push(MESSAGE_KEEP_ALIVE)
}

/**
 * Message: "handshake" <pstrlen><pstr><reserved><info_hash><peer_id>
 * @param  {Buffer|string} infoHash (as Buffer or *hex* string)
 * @param  {Buffer|string} peerId
 * @param  {Object} extensions
 */
Wire.prototype.handshake = function (infoHash, peerId, extensions) {
  var infoHashBuffer, peerIdBuffer
  if (typeof infoHash === 'string') {
    infoHashBuffer = Buffer.from(infoHash, 'hex')
  } else {
    infoHashBuffer = infoHash
    infoHash = infoHashBuffer.toString('hex')
  }
  if (typeof peerId === 'string') {
    peerIdBuffer = Buffer.from(peerId, 'hex')
  } else {
    peerIdBuffer = peerId
    peerId = peerIdBuffer.toString('hex')
  }

  if (infoHashBuffer.length !== 20 || peerIdBuffer.length !== 20) {
    throw new Error('infoHash and peerId MUST have length 20')
  }

  this._debug('handshake i=%s p=%s exts=%o', infoHash, peerId, extensions)

  var reserved = Buffer.from(MESSAGE_RESERVED)

  // enable extended message
  reserved[5] |= 0x10

  if (extensions && extensions.dht) reserved[7] |= 1

  this._push(Buffer.concat([MESSAGE_PROTOCOL, reserved, infoHashBuffer, peerIdBuffer]))
  this._handshakeSent = true

  if (this.peerExtensions.extended && !this._extendedHandshakeSent) {
    // Peer's handshake indicated support already
    // (incoming connection)
    this._sendExtendedHandshake()
  }
}

/* Peer supports BEP-0010, send extended handshake.
 *
 * This comes after the 'handshake' event to give the user a chance to populate
 * `this.extendedHandshake` and `this.extendedMapping` before the extended handshake
 * is sent to the remote peer.
 */
Wire.prototype._sendExtendedHandshake = function () {
  // Create extended message object from registered extensions
  var msg = extend(this.extendedHandshake)
  msg.m = {}
  for (var ext in this.extendedMapping) {
    var name = this.extendedMapping[ext]
    msg.m[name] = Number(ext)
  }

  // Send extended handshake
  this.extended(0, bencode.encode(msg))
  this._extendedHandshakeSent = true
}

/**
 * Message "choke": <len=0001><id=0>
 */
Wire.prototype.choke = function () {
  if (this.amChoking) return
  this.amChoking = true
  this._debug('choke')
  this.peerRequests.splice(0, this.peerRequests.length)
  this._push(MESSAGE_CHOKE)
}

/**
 * Message "unchoke": <len=0001><id=1>
 */
Wire.prototype.unchoke = function () {
  if (!this.amChoking) return
  this.amChoking = false
  this._debug('unchoke')
  this._push(MESSAGE_UNCHOKE)
}

/**
 * Message "interested": <len=0001><id=2>
 */
Wire.prototype.interested = function () {
  if (this.amInterested) return
  this.amInterested = true
  this._debug('interested')
  this._push(MESSAGE_INTERESTED)
}

/**
 * Message "uninterested": <len=0001><id=3>
 */
Wire.prototype.uninterested = function () {
  if (!this.amInterested) return
  this.amInterested = false
  this._debug('uninterested')
  this._push(MESSAGE_UNINTERESTED)
}

/**
 * Message "have": <len=0005><id=4><piece index>
 * @param  {number} index
 */
Wire.prototype.have = function (index) {
  this._debug('have %d', index)
  this._message(4, [index], null)
}

/**
 * Message "bitfield": <len=0001+X><id=5><bitfield>
 * @param  {BitField|Buffer} bitfield
 */
Wire.prototype.bitfield = function (bitfield) {
  this._debug('bitfield')
  if (!Buffer.isBuffer(bitfield)) bitfield = bitfield.buffer
  this._message(5, [], bitfield)
}

/**
 * Message "request": <len=0013><id=6><index><begin><length>
 * @param  {number}   index
 * @param  {number}   offset
 * @param  {number}   length
 * @param  {function} cb
 */
Wire.prototype.request = function (index, offset, length, cb) {
  if (!cb) cb = function () {}
  if (this._finished) return cb(new Error('wire is closed'))
  if (this.peerChoking) return cb(new Error('peer is choking'))

  this._debug('request index=%d offset=%d length=%d', index, offset, length)

  this.requests.push(new Request(index, offset, length, cb))
  this._updateTimeout()
  this._message(6, [index, offset, length], null)
}

/**
 * Message "piece": <len=0009+X><id=7><index><begin><block>
 * @param  {number} index
 * @param  {number} offset
 * @param  {Buffer} buffer
 */
Wire.prototype.piece = function (index, offset, buffer) {
  this._debug('piece index=%d offset=%d', index, offset)
  this.uploaded += buffer.length
  this.uploadSpeed(buffer.length)
  this.emit('upload', buffer.length)
  this._message(7, [index, offset], buffer)
}

/**
 * Message "cancel": <len=0013><id=8><index><begin><length>
 * @param  {number} index
 * @param  {number} offset
 * @param  {number} length
 */
Wire.prototype.cancel = function (index, offset, length) {
  this._debug('cancel index=%d offset=%d length=%d', index, offset, length)
  this._callback(
    pull(this.requests, index, offset, length),
    new Error('request was cancelled'),
    null
  )
  this._message(8, [index, offset, length], null)
}

/**
 * Message: "port" <len=0003><id=9><listen-port>
 * @param {Number} port
 */
Wire.prototype.port = function (port) {
  this._debug('port %d', port)
  var message = Buffer.from(MESSAGE_PORT)
  message.writeUInt16BE(port, 5)
  this._push(message)
}

/**
 * Message: "extended" <len=0005+X><id=20><ext-number><payload>
 * @param  {number|string} ext
 * @param  {Object} obj
 */
Wire.prototype.extended = function (ext, obj) {
  this._debug('extended ext=%s', ext)
  if (typeof ext === 'string' && this.peerExtendedMapping[ext]) {
    ext = this.peerExtendedMapping[ext]
  }
  if (typeof ext === 'number') {
    var extId = Buffer.from([ext])
    var buf = Buffer.isBuffer(obj) ? obj : bencode.encode(obj)

    this._message(20, [], Buffer.concat([extId, buf]))
  } else {
    throw new Error('Unrecognized extension: ' + ext)
  }
}

/**
 * Duplex stream method. Called whenever the remote peer stream wants data. No-op
 * since we'll just push data whenever we get it.
 */
Wire.prototype._read = function () {}

/**
 * Send a message to the remote peer.
 */
Wire.prototype._message = function (id, numbers, data) {
  var dataLength = data ? data.length : 0
  var buffer = Buffer.allocUnsafe(5 + 4 * numbers.length)

  buffer.writeUInt32BE(buffer.length + dataLength - 4, 0)
  buffer[4] = id
  for (var i = 0; i < numbers.length; i++) {
    buffer.writeUInt32BE(numbers[i], 5 + 4 * i)
  }

  this._push(buffer)
  if (data) this._push(data)
}

Wire.prototype._push = function (data) {
  if (this._finished) return
  return this.push(data)
}

//
// INCOMING MESSAGES
//

Wire.prototype._onKeepAlive = function () {
  this._debug('got keep-alive')
  this.emit('keep-alive')
}

Wire.prototype._onHandshake = function (infoHashBuffer, peerIdBuffer, extensions) {
  var infoHash = infoHashBuffer.toString('hex')
  var peerId = peerIdBuffer.toString('hex')

  this._debug('got handshake i=%s p=%s exts=%o', infoHash, peerId, extensions)

  this.peerId = peerId
  this.peerIdBuffer = peerIdBuffer
  this.peerExtensions = extensions

  this.emit('handshake', infoHash, peerId, extensions)

  var name
  for (name in this._ext) {
    this._ext[name].onHandshake(infoHash, peerId, extensions)
  }

  if (extensions.extended && this._handshakeSent &&
      !this._extendedHandshakeSent) {
    // outgoing connection
    this._sendExtendedHandshake()
  }
}

Wire.prototype._onChoke = function () {
  this.peerChoking = true
  this._debug('got choke')
  this.emit('choke')
  while (this.requests.length) {
    this._callback(this.requests.shift(), new Error('peer is choking'), null)
  }
}

Wire.prototype._onUnchoke = function () {
  this.peerChoking = false
  this._debug('got unchoke')
  this.emit('unchoke')
}

Wire.prototype._onInterested = function () {
  this.peerInterested = true
  this._debug('got interested')
  this.emit('interested')
}

Wire.prototype._onUninterested = function () {
  this.peerInterested = false
  this._debug('got uninterested')
  this.emit('uninterested')
}

Wire.prototype._onHave = function (index) {
  if (this.peerPieces.get(index)) return
  this._debug('got have %d', index)

  this.peerPieces.set(index, true)
  this.emit('have', index)
}

Wire.prototype._onBitField = function (buffer) {
  this.peerPieces = new BitField(buffer)
  this._debug('got bitfield')
  this.emit('bitfield', this.peerPieces)
}

Wire.prototype._onRequest = function (index, offset, length) {
  var self = this
  if (self.amChoking) return
  self._debug('got request index=%d offset=%d length=%d', index, offset, length)

  var respond = function (err, buffer) {
    if (request !== pull(self.peerRequests, index, offset, length)) return
    if (err) return self._debug('error satisfying request index=%d offset=%d length=%d (%s)', index, offset, length, err.message)
    self.piece(index, offset, buffer)
  }

  var request = new Request(index, offset, length, respond)
  self.peerRequests.push(request)
  self.emit('request', index, offset, length, respond)
}

Wire.prototype._onPiece = function (index, offset, buffer) {
  this._debug('got piece index=%d offset=%d', index, offset)
  this._callback(pull(this.requests, index, offset, buffer.length), null, buffer)
  this.downloaded += buffer.length
  this.downloadSpeed(buffer.length)
  this.emit('download', buffer.length)
  this.emit('piece', index, offset, buffer)
}

Wire.prototype._onCancel = function (index, offset, length) {
  this._debug('got cancel index=%d offset=%d length=%d', index, offset, length)
  pull(this.peerRequests, index, offset, length)
  this.emit('cancel', index, offset, length)
}

Wire.prototype._onPort = function (port) {
  this._debug('got port %d', port)
  this.emit('port', port)
}

Wire.prototype._onExtended = function (ext, buf) {
  if (ext === 0) {
    var info
    try {
      info = bencode.decode(buf)
    } catch (err) {
      this._debug('ignoring invalid extended handshake: %s', err.message || err)
    }

    if (!info) return
    this.peerExtendedHandshake = info

    var name
    if (typeof info.m === 'object') {
      for (name in info.m) {
        this.peerExtendedMapping[name] = Number(info.m[name].toString())
      }
    }
    for (name in this._ext) {
      if (this.peerExtendedMapping[name]) {
        this._ext[name].onExtendedHandshake(this.peerExtendedHandshake)
      }
    }
    this._debug('got extended handshake')
    this.emit('extended', 'handshake', this.peerExtendedHandshake)
  } else {
    if (this.extendedMapping[ext]) {
      ext = this.extendedMapping[ext] // friendly name for extension
      if (this._ext[ext]) {
        // there is an registered extension handler, so call it
        this._ext[ext].onMessage(buf)
      }
    }
    this._debug('got extended message ext=%s', ext)
    this.emit('extended', ext, buf)
  }
}

Wire.prototype._onTimeout = function () {
  this._debug('request timed out')
  this._callback(this.requests.shift(), new Error('request has timed out'), null)
  this.emit('timeout')
}

/**
 * Duplex stream method. Called whenever the remote peer has data for us. Data that the
 * remote peer sends gets buffered (i.e. not actually processed) until the right number
 * of bytes have arrived, determined by the last call to `this._parse(number, callback)`.
 * Once enough bytes have arrived to process the message, the callback function
 * (i.e. `this._parser`) gets called with the full buffer of data.
 * @param  {Buffer} data
 * @param  {string} encoding
 * @param  {function} cb
 */
Wire.prototype._write = function (data, encoding, cb) {
  this._bufferSize += data.length
  this._buffer.push(data)

  while (this._bufferSize >= this._parserSize) {
    var buffer = (this._buffer.length === 1)
      ? this._buffer[0]
      : Buffer.concat(this._buffer)
    this._bufferSize -= this._parserSize
    this._buffer = this._bufferSize
      ? [buffer.slice(this._parserSize)]
      : []
    this._parser(buffer.slice(0, this._parserSize))
  }

  cb(null) // Signal that we're ready for more data
}

Wire.prototype._callback = function (request, err, buffer) {
  if (!request) return

  this._clearTimeout()

  if (!this.peerChoking && !this._finished) this._updateTimeout()
  request.callback(err, buffer)
}

Wire.prototype._clearTimeout = function () {
  if (!this._timeout) return

  clearTimeout(this._timeout)
  this._timeout = null
}

Wire.prototype._updateTimeout = function () {
  var self = this
  if (!self._timeoutMs || !self.requests.length || self._timeout) return

  self._timeout = setTimeout(function () {
    self._onTimeout()
  }, self._timeoutMs)
  if (self._timeoutUnref && self._timeout.unref) self._timeout.unref()
}

/**
 * Takes a number of bytes that the local peer is waiting to receive from the remote peer
 * in order to parse a complete message, and a callback function to be called once enough
 * bytes have arrived.
 * @param  {number} size
 * @param  {function} parser
 */
Wire.prototype._parse = function (size, parser) {
  this._parserSize = size
  this._parser = parser
}

/**
 * Handle the first 4 bytes of a message, to determine the length of bytes that must be
 * waited for in order to have the whole message.
 * @param  {Buffer} buffer
 */
Wire.prototype._onMessageLength = function (buffer) {
  var length = buffer.readUInt32BE(0)
  if (length > 0) {
    this._parse(length, this._onMessage)
  } else {
    this._onKeepAlive()
    this._parse(4, this._onMessageLength)
  }
}

/**
 * Handle a message from the remote peer.
 * @param  {Buffer} buffer
 */
Wire.prototype._onMessage = function (buffer) {
  this._parse(4, this._onMessageLength)
  switch (buffer[0]) {
    case 0:
      return this._onChoke()
    case 1:
      return this._onUnchoke()
    case 2:
      return this._onInterested()
    case 3:
      return this._onUninterested()
    case 4:
      return this._onHave(buffer.readUInt32BE(1))
    case 5:
      return this._onBitField(buffer.slice(1))
    case 6:
      return this._onRequest(buffer.readUInt32BE(1),
          buffer.readUInt32BE(5), buffer.readUInt32BE(9))
    case 7:
      return this._onPiece(buffer.readUInt32BE(1),
          buffer.readUInt32BE(5), buffer.slice(9))
    case 8:
      return this._onCancel(buffer.readUInt32BE(1),
          buffer.readUInt32BE(5), buffer.readUInt32BE(9))
    case 9:
      return this._onPort(buffer.readUInt16BE(1))
    case 20:
      return this._onExtended(buffer.readUInt8(1), buffer.slice(2))
    default:
      this._debug('got unknown message')
      return this.emit('unknownmessage', buffer)
  }
}

Wire.prototype._parseHandshake = function () {
  var self = this
  self._parse(1, function (buffer) {
    var pstrlen = buffer.readUInt8(0)
    self._parse(pstrlen + 48, function (handshake) {
      var protocol = handshake.slice(0, pstrlen)
      if (protocol.toString() !== 'BitTorrent protocol') {
        self._debug('Error: wire not speaking BitTorrent protocol (%s)', protocol.toString())
        self.end()
        return
      }
      handshake = handshake.slice(pstrlen)
      self._onHandshake(handshake.slice(8, 28), handshake.slice(28, 48), {
        dht: !!(handshake[7] & 0x01), // see bep_0005
        extended: !!(handshake[5] & 0x10) // see bep_0010
      })
      self._parse(4, self._onMessageLength)
    })
  })
}

Wire.prototype._onFinish = function () {
  this._finished = true

  this.push(null) // stream cannot be half open, so signal the end of it
  while (this.read()) {} // consume and discard the rest of the stream data

  clearInterval(this._keepAliveInterval)
  this._parse(Number.MAX_VALUE, function () {})
  this.peerRequests = []
  while (this.requests.length) {
    this._callback(this.requests.shift(), new Error('wire was closed'), null)
  }
}

Wire.prototype._debug = function () {
  var args = [].slice.call(arguments)
  args[0] = '[' + this._debugId + '] ' + args[0]
  debug.apply(null, args)
}

function pull (requests, piece, offset, length) {
  for (var i = 0; i < requests.length; i++) {
    var req = requests[i]
    if (req.piece !== piece || req.offset !== offset || req.length !== length) continue

    if (i === 0) requests.shift()
    else requests.splice(i, 1)

    return req
  }
  return null
}

},{"bencode":9,"bitfield":11,"debug":32,"inherits":56,"randombytes":89,"readable-stream":97,"safe-buffer":103,"speedometer":110,"xtend":144}],13:[function(require,module,exports){
(function (process){
module.exports = Client

var Buffer = require('safe-buffer').Buffer
var debug = require('debug')('bittorrent-tracker')
var EventEmitter = require('events').EventEmitter
var extend = require('xtend')
var inherits = require('inherits')
var once = require('once')
var parallel = require('run-parallel')
var Peer = require('simple-peer')
var uniq = require('uniq')
var url = require('url')

var common = require('./lib/common')
var HTTPTracker = require('./lib/client/http-tracker') // empty object in browser
var UDPTracker = require('./lib/client/udp-tracker') // empty object in browser
var WebSocketTracker = require('./lib/client/websocket-tracker')

inherits(Client, EventEmitter)

/**
 * BitTorrent tracker client.
 *
 * Find torrent peers, to help a torrent client participate in a torrent swarm.
 *
 * @param {Object} opts                          options object
 * @param {string|Buffer} opts.infoHash          torrent info hash
 * @param {string|Buffer} opts.peerId            peer id
 * @param {string|Array.<string>} opts.announce  announce
 * @param {number} opts.port                     torrent client listening port
 * @param {function} opts.getAnnounceOpts        callback to provide data to tracker
 * @param {number} opts.rtcConfig                RTCPeerConnection configuration object
 * @param {number} opts.wrtc                     custom webrtc impl (useful in node.js)
 */
function Client (opts) {
  var self = this
  if (!(self instanceof Client)) return new Client(opts)
  EventEmitter.call(self)
  if (!opts) opts = {}

  if (!opts.peerId) throw new Error('Option `peerId` is required')
  if (!opts.infoHash) throw new Error('Option `infoHash` is required')
  if (!opts.announce) throw new Error('Option `announce` is required')
  if (!process.browser && !opts.port) throw new Error('Option `port` is required')

  // required
  self.peerId = typeof opts.peerId === 'string'
    ? opts.peerId
    : opts.peerId.toString('hex')
  self._peerIdBuffer = Buffer.from(self.peerId, 'hex')
  self._peerIdBinary = self._peerIdBuffer.toString('binary')

  self.infoHash = typeof opts.infoHash === 'string'
    ? opts.infoHash
    : opts.infoHash.toString('hex')
  self._infoHashBuffer = Buffer.from(self.infoHash, 'hex')
  self._infoHashBinary = self._infoHashBuffer.toString('binary')

  self._port = opts.port

  self.destroyed = false

  self._rtcConfig = opts.rtcConfig
  self._getAnnounceOpts = opts.getAnnounceOpts
  self._wrtc = opts.wrtc

  // Support lazy 'wrtc' module initialization
  // See: https://github.com/feross/webtorrent-hybrid/issues/46
  if (typeof self._wrtc === 'function') self._wrtc = self._wrtc()

  debug('new client %s', self.infoHash)

  var webrtcSupport = self._wrtc !== false && (!!self._wrtc || Peer.WEBRTC_SUPPORT)

  var announce = (typeof opts.announce === 'string')
    ? [ opts.announce ]
    : opts.announce == null
      ? []
      : opts.announce

  announce = announce.map(function (announceUrl) {
    announceUrl = announceUrl.toString()
    if (announceUrl[announceUrl.length - 1] === '/') {
      // remove trailing slash from trackers to catch duplicates
      announceUrl = announceUrl.substring(0, announceUrl.length - 1)
    }
    return announceUrl
  })

  announce = uniq(announce)

  self._trackers = announce
    .map(function (announceUrl) {
      var protocol = url.parse(announceUrl).protocol
      if ((protocol === 'http:' || protocol === 'https:') &&
          typeof HTTPTracker === 'function') {
        return new HTTPTracker(self, announceUrl)
      } else if (protocol === 'udp:' && typeof UDPTracker === 'function') {
        return new UDPTracker(self, announceUrl)
      } else if ((protocol === 'ws:' || protocol === 'wss:') && webrtcSupport) {
        // Skip ws:// trackers on https:// sites because they throw SecurityError
        if (protocol === 'ws:' && typeof window !== 'undefined' &&
            window.location.protocol === 'https:') {
          nextTickWarn(new Error('Unsupported tracker protocol: ' + announceUrl))
          return null
        }
        return new WebSocketTracker(self, announceUrl)
      } else {
        nextTickWarn(new Error('Unsupported tracker protocol: ' + announceUrl))
        return null
      }
    })
    .filter(Boolean)

  function nextTickWarn (err) {
    process.nextTick(function () {
      self.emit('warning', err)
    })
  }
}

/**
 * Simple convenience function to scrape a tracker for an info hash without needing to
 * create a Client, pass it a parsed torrent, etc. Support scraping a tracker for multiple
 * torrents at the same time.
 * @params {Object} opts
 * @param  {string|Array.<string>} opts.infoHash
 * @param  {string} opts.announce
 * @param  {function} cb
 */
Client.scrape = function (opts, cb) {
  cb = once(cb)

  if (!opts.infoHash) throw new Error('Option `infoHash` is required')
  if (!opts.announce) throw new Error('Option `announce` is required')

  var clientOpts = extend(opts, {
    infoHash: Array.isArray(opts.infoHash) ? opts.infoHash[0] : opts.infoHash,
    peerId: Buffer.from('01234567890123456789'), // dummy value
    port: 6881 // dummy value
  })

  var client = new Client(clientOpts)
  client.once('error', cb)
  client.once('warning', cb)

  var len = Array.isArray(opts.infoHash) ? opts.infoHash.length : 1
  var results = {}
  client.on('scrape', function (data) {
    len -= 1
    results[data.infoHash] = data
    if (len === 0) {
      client.destroy()
      var keys = Object.keys(results)
      if (keys.length === 1) {
        cb(null, results[keys[0]])
      } else {
        cb(null, results)
      }
    }
  })

  opts.infoHash = Array.isArray(opts.infoHash)
    ? opts.infoHash.map(function (infoHash) {
      return Buffer.from(infoHash, 'hex')
    })
    : Buffer.from(opts.infoHash, 'hex')
  client.scrape({ infoHash: opts.infoHash })
  return client
}

/**
 * Send a `start` announce to the trackers.
 * @param {Object} opts
 * @param {number=} opts.uploaded
 * @param {number=} opts.downloaded
 * @param {number=} opts.left (if not set, calculated automatically)
 */
Client.prototype.start = function (opts) {
  var self = this
  debug('send `start`')
  opts = self._defaultAnnounceOpts(opts)
  opts.event = 'started'
  self._announce(opts)

  // start announcing on intervals
  self._trackers.forEach(function (tracker) {
    tracker.setInterval()
  })
}

/**
 * Send a `stop` announce to the trackers.
 * @param {Object} opts
 * @param {number=} opts.uploaded
 * @param {number=} opts.downloaded
 * @param {number=} opts.numwant
 * @param {number=} opts.left (if not set, calculated automatically)
 */
Client.prototype.stop = function (opts) {
  var self = this
  debug('send `stop`')
  opts = self._defaultAnnounceOpts(opts)
  opts.event = 'stopped'
  self._announce(opts)
}

/**
 * Send a `complete` announce to the trackers.
 * @param {Object} opts
 * @param {number=} opts.uploaded
 * @param {number=} opts.downloaded
 * @param {number=} opts.numwant
 * @param {number=} opts.left (if not set, calculated automatically)
 */
Client.prototype.complete = function (opts) {
  var self = this
  debug('send `complete`')
  if (!opts) opts = {}
  opts = self._defaultAnnounceOpts(opts)
  opts.event = 'completed'
  self._announce(opts)
}

/**
 * Send a `update` announce to the trackers.
 * @param {Object} opts
 * @param {number=} opts.uploaded
 * @param {number=} opts.downloaded
 * @param {number=} opts.numwant
 * @param {number=} opts.left (if not set, calculated automatically)
 */
Client.prototype.update = function (opts) {
  var self = this
  debug('send `update`')
  opts = self._defaultAnnounceOpts(opts)
  if (opts.event) delete opts.event
  self._announce(opts)
}

Client.prototype._announce = function (opts) {
  var self = this
  self._trackers.forEach(function (tracker) {
    // tracker should not modify `opts` object, it's passed to all trackers
    tracker.announce(opts)
  })
}

/**
 * Send a scrape request to the trackers.
 * @param {Object} opts
 */
Client.prototype.scrape = function (opts) {
  var self = this
  debug('send `scrape`')
  if (!opts) opts = {}
  self._trackers.forEach(function (tracker) {
    // tracker should not modify `opts` object, it's passed to all trackers
    tracker.scrape(opts)
  })
}

Client.prototype.setInterval = function (intervalMs) {
  var self = this
  debug('setInterval %d', intervalMs)
  self._trackers.forEach(function (tracker) {
    tracker.setInterval(intervalMs)
  })
}

Client.prototype.destroy = function (cb) {
  var self = this
  if (self.destroyed) return
  self.destroyed = true
  debug('destroy')

  var tasks = self._trackers.map(function (tracker) {
    return function (cb) {
      tracker.destroy(cb)
    }
  })

  parallel(tasks, cb)

  self._trackers = []
  self._getAnnounceOpts = null
}

Client.prototype._defaultAnnounceOpts = function (opts) {
  var self = this
  if (!opts) opts = {}

  if (opts.numwant == null) opts.numwant = common.DEFAULT_ANNOUNCE_PEERS

  if (opts.uploaded == null) opts.uploaded = 0
  if (opts.downloaded == null) opts.downloaded = 0

  if (self._getAnnounceOpts) opts = extend(opts, self._getAnnounceOpts())
  return opts
}

}).call(this,require('_process'))
},{"./lib/client/http-tracker":19,"./lib/client/udp-tracker":19,"./lib/client/websocket-tracker":15,"./lib/common":16,"_process":22,"debug":32,"events":42,"inherits":56,"once":77,"run-parallel":101,"safe-buffer":103,"simple-peer":107,"uniq":127,"url":129,"xtend":144}],14:[function(require,module,exports){
module.exports = Tracker

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

inherits(Tracker, EventEmitter)

function Tracker (client, announceUrl) {
  var self = this
  EventEmitter.call(self)
  self.client = client
  self.announceUrl = announceUrl

  self.interval = null
  self.destroyed = false
}

Tracker.prototype.setInterval = function (intervalMs) {
  var self = this
  if (intervalMs == null) intervalMs = self.DEFAULT_ANNOUNCE_INTERVAL

  clearInterval(self.interval)

  if (intervalMs) {
    self.interval = setInterval(function () {
      self.announce(self.client._defaultAnnounceOpts())
    }, intervalMs)
    if (self.interval.unref) self.interval.unref()
  }
}

},{"events":42,"inherits":56}],15:[function(require,module,exports){
module.exports = WebSocketTracker

var debug = require('debug')('bittorrent-tracker:websocket-tracker')
var extend = require('xtend')
var inherits = require('inherits')
var Peer = require('simple-peer')
var randombytes = require('randombytes')
var Socket = require('simple-websocket')

var common = require('../common')
var Tracker = require('./tracker')

// Use a socket pool, so tracker clients share WebSocket objects for the same server.
// In practice, WebSockets are pretty slow to establish, so this gives a nice performance
// boost, and saves browser resources.
var socketPool = {}

var RECONNECT_MINIMUM = 15 * 1000
var RECONNECT_MAXIMUM = 30 * 60 * 1000
var RECONNECT_VARIANCE = 30 * 1000
var OFFER_TIMEOUT = 50 * 1000

inherits(WebSocketTracker, Tracker)

function WebSocketTracker (client, announceUrl, opts) {
  var self = this
  Tracker.call(self, client, announceUrl)
  debug('new websocket tracker %s', announceUrl)

  self.peers = {} // peers (offer id -> peer)
  self.socket = null

  self.reconnecting = false
  self.retries = 0
  self.reconnectTimer = null

  self._openSocket()
}

WebSocketTracker.prototype.DEFAULT_ANNOUNCE_INTERVAL = 30 * 1000 // 30 seconds

WebSocketTracker.prototype.announce = function (opts) {
  var self = this
  if (self.destroyed || self.reconnecting) return
  if (!self.socket.connected) {
    self.socket.once('connect', function () {
      self.announce(opts)
    })
    return
  }

  var params = extend(opts, {
    action: 'announce',
    info_hash: self.client._infoHashBinary,
    peer_id: self.client._peerIdBinary
  })
  if (self._trackerId) params.trackerid = self._trackerId

  if (opts.event === 'stopped') {
    // Don't include offers with 'stopped' event
    self._send(params)
  } else {
    // Limit the number of offers that are generated, since it can be slow
    var numwant = Math.min(opts.numwant, 10)

    self._generateOffers(numwant, function (offers) {
      params.numwant = numwant
      params.offers = offers
      self._send(params)
    })
  }
}

WebSocketTracker.prototype.scrape = function (opts) {
  var self = this
  if (self.destroyed || self.reconnecting) return
  if (!self.socket.connected) {
    self.socket.once('connect', function () {
      self.scrape(opts)
    })
    return
  }

  var infoHashes = (Array.isArray(opts.infoHash) && opts.infoHash.length > 0)
    ? opts.infoHash.map(function (infoHash) {
      return infoHash.toString('binary')
    })
    : (opts.infoHash && opts.infoHash.toString('binary')) || self.client._infoHashBinary
  var params = {
    action: 'scrape',
    info_hash: infoHashes
  }

  self._send(params)
}

WebSocketTracker.prototype.destroy = function (cb) {
  var self = this
  if (!cb) cb = noop
  if (self.destroyed) return cb(null)

  self.destroyed = true

  clearInterval(self.interval)
  clearTimeout(self.reconnectTimer)

  if (self.socket) {
    self.socket.removeListener('connect', self._onSocketConnectBound)
    self.socket.removeListener('data', self._onSocketDataBound)
    self.socket.removeListener('close', self._onSocketCloseBound)
    self.socket.removeListener('error', self._onSocketErrorBound)
  }

  self._onSocketConnectBound = null
  self._onSocketErrorBound = null
  self._onSocketDataBound = null
  self._onSocketCloseBound = null

  // Destroy peers
  for (var peerId in self.peers) {
    var peer = self.peers[peerId]
    clearTimeout(peer.trackerTimeout)
    peer.destroy()
  }
  self.peers = null

  if (socketPool[self.announceUrl]) {
    socketPool[self.announceUrl].consumers -= 1
  }

  if (socketPool[self.announceUrl].consumers === 0) {
    delete socketPool[self.announceUrl]

    try {
      self.socket.on('error', noop) // ignore all future errors
      self.socket.destroy(cb)
    } catch (err) {
      cb(null)
    }
  } else {
    cb(null)
  }

  self.socket = null
}

WebSocketTracker.prototype._openSocket = function () {
  var self = this
  self.destroyed = false

  if (!self.peers) self.peers = {}

  self._onSocketConnectBound = function () {
    self._onSocketConnect()
  }
  self._onSocketErrorBound = function (err) {
    self._onSocketError(err)
  }
  self._onSocketDataBound = function (data) {
    self._onSocketData(data)
  }
  self._onSocketCloseBound = function () {
    self._onSocketClose()
  }

  self.socket = socketPool[self.announceUrl]
  if (self.socket) {
    socketPool[self.announceUrl].consumers += 1
  } else {
    self.socket = socketPool[self.announceUrl] = new Socket(self.announceUrl)
    self.socket.consumers = 1
    self.socket.once('connect', self._onSocketConnectBound)
  }

  self.socket.on('data', self._onSocketDataBound)
  self.socket.once('close', self._onSocketCloseBound)
  self.socket.once('error', self._onSocketErrorBound)
}

WebSocketTracker.prototype._onSocketConnect = function () {
  var self = this
  if (self.destroyed) return

  if (self.reconnecting) {
    self.reconnecting = false
    self.retries = 0
    self.announce(self.client._defaultAnnounceOpts())
  }
}

WebSocketTracker.prototype._onSocketData = function (data) {
  var self = this
  if (self.destroyed) return

  try {
    data = JSON.parse(data)
  } catch (err) {
    self.client.emit('warning', new Error('Invalid tracker response'))
    return
  }

  if (data.action === 'announce') {
    self._onAnnounceResponse(data)
  } else if (data.action === 'scrape') {
    self._onScrapeResponse(data)
  } else {
    self._onSocketError(new Error('invalid action in WS response: ' + data.action))
  }
}

WebSocketTracker.prototype._onAnnounceResponse = function (data) {
  var self = this

  if (data.info_hash !== self.client._infoHashBinary) {
    debug(
      'ignoring websocket data from %s for %s (looking for %s: reused socket)',
      self.announceUrl, common.binaryToHex(data.info_hash), self.client.infoHash
    )
    return
  }

  if (data.peer_id && data.peer_id === self.client._peerIdBinary) {
    // ignore offers/answers from this client
    return
  }

  debug(
    'received %s from %s for %s',
    JSON.stringify(data), self.announceUrl, self.client.infoHash
  )

  var failure = data['failure reason']
  if (failure) return self.client.emit('warning', new Error(failure))

  var warning = data['warning message']
  if (warning) self.client.emit('warning', new Error(warning))

  var interval = data.interval || data['min interval']
  if (interval) self.setInterval(interval * 1000)

  var trackerId = data['tracker id']
  if (trackerId) {
    // If absent, do not discard previous trackerId value
    self._trackerId = trackerId
  }

  if (data.complete != null) {
    self.client.emit('update', {
      announce: self.announceUrl,
      complete: data.complete,
      incomplete: data.incomplete
    })
  }

  var peer
  if (data.offer && data.peer_id) {
    debug('creating peer (from remote offer)')
    peer = new Peer({
      trickle: false,
      config: self.client._rtcConfig,
      wrtc: self.client._wrtc
    })
    peer.id = common.binaryToHex(data.peer_id)
    peer.once('signal', function (answer) {
      var params = {
        action: 'announce',
        info_hash: self.client._infoHashBinary,
        peer_id: self.client._peerIdBinary,
        to_peer_id: data.peer_id,
        answer: answer,
        offer_id: data.offer_id
      }
      if (self._trackerId) params.trackerid = self._trackerId
      self._send(params)
    })
    peer.signal(data.offer)
    self.client.emit('peer', peer)
  }

  if (data.answer && data.peer_id) {
    var offerId = common.binaryToHex(data.offer_id)
    peer = self.peers[offerId]
    if (peer) {
      peer.id = common.binaryToHex(data.peer_id)
      peer.signal(data.answer)
      self.client.emit('peer', peer)

      clearTimeout(peer.trackerTimeout)
      peer.trackerTimeout = null
      delete self.peers[offerId]
    } else {
      debug('got unexpected answer: ' + JSON.stringify(data.answer))
    }
  }
}

WebSocketTracker.prototype._onScrapeResponse = function (data) {
  var self = this
  data = data.files || {}

  var keys = Object.keys(data)
  if (keys.length === 0) {
    self.client.emit('warning', new Error('invalid scrape response'))
    return
  }

  keys.forEach(function (infoHash) {
    var response = data[infoHash]
    // TODO: optionally handle data.flags.min_request_interval
    // (separate from announce interval)
    self.client.emit('scrape', {
      announce: self.announceUrl,
      infoHash: common.binaryToHex(infoHash),
      complete: response.complete,
      incomplete: response.incomplete,
      downloaded: response.downloaded
    })
  })
}

WebSocketTracker.prototype._onSocketClose = function () {
  var self = this
  if (self.destroyed) return
  self.destroy()
  self._startReconnectTimer()
}

WebSocketTracker.prototype._onSocketError = function (err) {
  var self = this
  if (self.destroyed) return
  self.destroy()
  // errors will often happen if a tracker is offline, so don't treat it as fatal
  self.client.emit('warning', err)
  self._startReconnectTimer()
}

WebSocketTracker.prototype._startReconnectTimer = function () {
  var self = this
  var ms = Math.floor(Math.random() * RECONNECT_VARIANCE) + Math.min(Math.pow(2, self.retries) * RECONNECT_MINIMUM, RECONNECT_MAXIMUM)

  self.reconnecting = true
  clearTimeout(self.reconnectTimer)
  self.reconnectTimer = setTimeout(function () {
    self.retries++
    self._openSocket()
  }, ms)
  if (self.reconnectTimer.unref) self.reconnectTimer.unref()

  debug('reconnecting socket in %s ms', ms)
}

WebSocketTracker.prototype._send = function (params) {
  var self = this
  if (self.destroyed) return

  var message = JSON.stringify(params)
  debug('send %s', message)
  self.socket.send(message)
}

WebSocketTracker.prototype._generateOffers = function (numwant, cb) {
  var self = this
  var offers = []
  debug('generating %s offers', numwant)

  for (var i = 0; i < numwant; ++i) {
    generateOffer()
  }
  checkDone()

  function generateOffer () {
    var offerId = randombytes(20).toString('hex')
    debug('creating peer (from _generateOffers)')
    var peer = self.peers[offerId] = new Peer({
      initiator: true,
      trickle: false,
      config: self.client._rtcConfig,
      wrtc: self.client._wrtc
    })
    peer.once('signal', function (offer) {
      offers.push({
        offer: offer,
        offer_id: common.hexToBinary(offerId)
      })
      checkDone()
    })
    peer.trackerTimeout = setTimeout(function () {
      debug('tracker timeout: destroying peer')
      peer.trackerTimeout = null
      delete self.peers[offerId]
      peer.destroy()
    }, OFFER_TIMEOUT)
    if (peer.trackerTimeout.unref) peer.trackerTimeout.unref()
  }

  function checkDone () {
    if (offers.length === numwant) {
      debug('generated %s offers', numwant)
      cb(offers)
    }
  }
}

function noop () {}

},{"../common":16,"./tracker":14,"debug":32,"inherits":56,"randombytes":89,"simple-peer":107,"simple-websocket":109,"xtend":144}],16:[function(require,module,exports){
/**
 * Functions/constants needed by both the client and server.
 */

var Buffer = require('safe-buffer').Buffer
var extend = require('xtend/mutable')

exports.DEFAULT_ANNOUNCE_PEERS = 50
exports.MAX_ANNOUNCE_PEERS = 82

exports.binaryToHex = function (str) {
  if (typeof str !== 'string') {
    str = String(str)
  }
  return Buffer.from(str, 'binary').toString('hex')
}

exports.hexToBinary = function (str) {
  if (typeof str !== 'string') {
    str = String(str)
  }
  return Buffer.from(str, 'hex').toString('binary')
}

var config = require('./common-node')
extend(exports, config)

},{"./common-node":19,"safe-buffer":103,"xtend/mutable":145}],17:[function(require,module,exports){
(function (Buffer){
/* global Blob, FileReader */

module.exports = function blobToBuffer (blob, cb) {
  if (typeof Blob === 'undefined' || !(blob instanceof Blob)) {
    throw new Error('first argument must be a Blob')
  }
  if (typeof cb !== 'function') {
    throw new Error('second argument must be a function')
  }

  var reader = new FileReader()

  function onLoadEnd (e) {
    reader.removeEventListener('loadend', onLoadEnd, false)
    if (e.error) cb(e.error)
    else cb(null, new Buffer(reader.result))
  }

  reader.addEventListener('loadend', onLoadEnd, false)
  reader.readAsArrayBuffer(blob)
}

}).call(this,require("buffer").Buffer)
},{"buffer":24}],18:[function(require,module,exports){
(function (Buffer){
var inherits = require('inherits');
var Transform = require('readable-stream').Transform;
var defined = require('defined');

module.exports = Block;
inherits(Block, Transform);

function Block (size, opts) {
    if (!(this instanceof Block)) return new Block(size, opts);
    Transform.call(this);
    if (!opts) opts = {};
    if (typeof size === 'object') {
        opts = size;
        size = opts.size;
    }
    this.size = size || 512;
    
    if (opts.nopad) this._zeroPadding = false;
    else this._zeroPadding = defined(opts.zeroPadding, true);
    
    this._buffered = [];
    this._bufferedBytes = 0;
}

Block.prototype._transform = function (buf, enc, next) {
    this._bufferedBytes += buf.length;
    this._buffered.push(buf);
    
    while (this._bufferedBytes >= this.size) {
        var b = Buffer.concat(this._buffered);
        this._bufferedBytes -= this.size;
        this.push(b.slice(0, this.size));
        this._buffered = [ b.slice(this.size, b.length) ];
    }
    next();
};

Block.prototype._flush = function () {
    if (this._bufferedBytes && this._zeroPadding) {
        var zeroes = new Buffer(this.size - this._bufferedBytes);
        zeroes.fill(0);
        this._buffered.push(zeroes);
        this.push(Buffer.concat(this._buffered));
        this._buffered = null;
    }
    else if (this._bufferedBytes) {
        this.push(Buffer.concat(this._buffered));
        this._buffered = null;
    }
    this.push(null);
};

}).call(this,require("buffer").Buffer)
},{"buffer":24,"defined":34,"inherits":56,"readable-stream":97}],19:[function(require,module,exports){

},{}],20:[function(require,module,exports){
//this file was generated
"use strict"
var mime = module.exports = {
    lookup: function (path, fallback) {
  var ext = path.replace(/.*[\.\/]/, '').toLowerCase();

  return this.types[ext] || fallback || this.default_type;
}
  , default_type: "application/octet-stream"
  , types: {
  "123": "application/vnd.lotus-1-2-3",
  "ez": "application/andrew-inset",
  "aw": "application/applixware",
  "atom": "application/atom+xml",
  "atomcat": "application/atomcat+xml",
  "atomsvc": "application/atomsvc+xml",
  "ccxml": "application/ccxml+xml",
  "cdmia": "application/cdmi-capability",
  "cdmic": "application/cdmi-container",
  "cdmid": "application/cdmi-domain",
  "cdmio": "application/cdmi-object",
  "cdmiq": "application/cdmi-queue",
  "cu": "application/cu-seeme",
  "davmount": "application/davmount+xml",
  "dbk": "application/docbook+xml",
  "dssc": "application/dssc+der",
  "xdssc": "application/dssc+xml",
  "ecma": "application/ecmascript",
  "emma": "application/emma+xml",
  "epub": "application/epub+zip",
  "exi": "application/exi",
  "pfr": "application/font-tdpfr",
  "gml": "application/gml+xml",
  "gpx": "application/gpx+xml",
  "gxf": "application/gxf",
  "stk": "application/hyperstudio",
  "ink": "application/inkml+xml",
  "inkml": "application/inkml+xml",
  "ipfix": "application/ipfix",
  "jar": "application/java-archive",
  "ser": "application/java-serialized-object",
  "class": "application/java-vm",
  "js": "application/javascript",
  "json": "application/json",
  "jsonml": "application/jsonml+json",
  "lostxml": "application/lost+xml",
  "hqx": "application/mac-binhex40",
  "cpt": "application/mac-compactpro",
  "mads": "application/mads+xml",
  "mrc": "application/marc",
  "mrcx": "application/marcxml+xml",
  "ma": "application/mathematica",
  "nb": "application/mathematica",
  "mb": "application/mathematica",
  "mathml": "application/mathml+xml",
  "mbox": "application/mbox",
  "mscml": "application/mediaservercontrol+xml",
  "metalink": "application/metalink+xml",
  "meta4": "application/metalink4+xml",
  "mets": "application/mets+xml",
  "mods": "application/mods+xml",
  "m21": "application/mp21",
  "mp21": "application/mp21",
  "mp4s": "application/mp4",
  "doc": "application/msword",
  "dot": "application/msword",
  "mxf": "application/mxf",
  "bin": "application/octet-stream",
  "dms": "application/octet-stream",
  "lrf": "application/octet-stream",
  "mar": "application/octet-stream",
  "so": "application/octet-stream",
  "dist": "application/octet-stream",
  "distz": "application/octet-stream",
  "pkg": "application/octet-stream",
  "bpk": "application/octet-stream",
  "dump": "application/octet-stream",
  "elc": "application/octet-stream",
  "deploy": "application/octet-stream",
  "oda": "application/oda",
  "opf": "application/oebps-package+xml",
  "ogx": "application/ogg",
  "omdoc": "application/omdoc+xml",
  "onetoc": "application/onenote",
  "onetoc2": "application/onenote",
  "onetmp": "application/onenote",
  "onepkg": "application/onenote",
  "oxps": "application/oxps",
  "xer": "application/patch-ops-error+xml",
  "pdf": "application/pdf",
  "pgp": "application/pgp-encrypted",
  "asc": "application/pgp-signature",
  "sig": "application/pgp-signature",
  "prf": "application/pics-rules",
  "p10": "application/pkcs10",
  "p7m": "application/pkcs7-mime",
  "p7c": "application/pkcs7-mime",
  "p7s": "application/pkcs7-signature",
  "p8": "application/pkcs8",
  "ac": "application/pkix-attr-cert",
  "cer": "application/pkix-cert",
  "crl": "application/pkix-crl",
  "pkipath": "application/pkix-pkipath",
  "pki": "application/pkixcmp",
  "pls": "application/pls+xml",
  "ai": "application/postscript",
  "eps": "application/postscript",
  "ps": "application/postscript",
  "cww": "application/prs.cww",
  "pskcxml": "application/pskc+xml",
  "rdf": "application/rdf+xml",
  "rif": "application/reginfo+xml",
  "rnc": "application/relax-ng-compact-syntax",
  "rl": "application/resource-lists+xml",
  "rld": "application/resource-lists-diff+xml",
  "rs": "application/rls-services+xml",
  "gbr": "application/rpki-ghostbusters",
  "mft": "application/rpki-manifest",
  "roa": "application/rpki-roa",
  "rsd": "application/rsd+xml",
  "rss": "application/rss+xml",
  "rtf": "application/rtf",
  "sbml": "application/sbml+xml",
  "scq": "application/scvp-cv-request",
  "scs": "application/scvp-cv-response",
  "spq": "application/scvp-vp-request",
  "spp": "application/scvp-vp-response",
  "sdp": "application/sdp",
  "setpay": "application/set-payment-initiation",
  "setreg": "application/set-registration-initiation",
  "shf": "application/shf+xml",
  "smi": "application/smil+xml",
  "smil": "application/smil+xml",
  "rq": "application/sparql-query",
  "srx": "application/sparql-results+xml",
  "gram": "application/srgs",
  "grxml": "application/srgs+xml",
  "sru": "application/sru+xml",
  "ssdl": "application/ssdl+xml",
  "ssml": "application/ssml+xml",
  "tei": "application/tei+xml",
  "teicorpus": "application/tei+xml",
  "tfi": "application/thraud+xml",
  "tsd": "application/timestamped-data",
  "plb": "application/vnd.3gpp.pic-bw-large",
  "psb": "application/vnd.3gpp.pic-bw-small",
  "pvb": "application/vnd.3gpp.pic-bw-var",
  "tcap": "application/vnd.3gpp2.tcap",
  "pwn": "application/vnd.3m.post-it-notes",
  "aso": "application/vnd.accpac.simply.aso",
  "imp": "application/vnd.accpac.simply.imp",
  "acu": "application/vnd.acucobol",
  "atc": "application/vnd.acucorp",
  "acutc": "application/vnd.acucorp",
  "air": "application/vnd.adobe.air-application-installer-package+zip",
  "fcdt": "application/vnd.adobe.formscentral.fcdt",
  "fxp": "application/vnd.adobe.fxp",
  "fxpl": "application/vnd.adobe.fxp",
  "xdp": "application/vnd.adobe.xdp+xml",
  "xfdf": "application/vnd.adobe.xfdf",
  "ahead": "application/vnd.ahead.space",
  "azf": "application/vnd.airzip.filesecure.azf",
  "azs": "application/vnd.airzip.filesecure.azs",
  "azw": "application/vnd.amazon.ebook",
  "acc": "application/vnd.americandynamics.acc",
  "ami": "application/vnd.amiga.ami",
  "apk": "application/vnd.android.package-archive",
  "cii": "application/vnd.anser-web-certificate-issue-initiation",
  "fti": "application/vnd.anser-web-funds-transfer-initiation",
  "atx": "application/vnd.antix.game-component",
  "mpkg": "application/vnd.apple.installer+xml",
  "m3u8": "application/vnd.apple.mpegurl",
  "swi": "application/vnd.aristanetworks.swi",
  "iota": "application/vnd.astraea-software.iota",
  "aep": "application/vnd.audiograph",
  "mpm": "application/vnd.blueice.multipass",
  "bmi": "application/vnd.bmi",
  "rep": "application/vnd.businessobjects",
  "cdxml": "application/vnd.chemdraw+xml",
  "mmd": "application/vnd.chipnuts.karaoke-mmd",
  "cdy": "application/vnd.cinderella",
  "cla": "application/vnd.claymore",
  "rp9": "application/vnd.cloanto.rp9",
  "c4g": "application/vnd.clonk.c4group",
  "c4d": "application/vnd.clonk.c4group",
  "c4f": "application/vnd.clonk.c4group",
  "c4p": "application/vnd.clonk.c4group",
  "c4u": "application/vnd.clonk.c4group",
  "c11amc": "application/vnd.cluetrust.cartomobile-config",
  "c11amz": "application/vnd.cluetrust.cartomobile-config-pkg",
  "csp": "application/vnd.commonspace",
  "cdbcmsg": "application/vnd.contact.cmsg",
  "cmc": "application/vnd.cosmocaller",
  "clkx": "application/vnd.crick.clicker",
  "clkk": "application/vnd.crick.clicker.keyboard",
  "clkp": "application/vnd.crick.clicker.palette",
  "clkt": "application/vnd.crick.clicker.template",
  "clkw": "application/vnd.crick.clicker.wordbank",
  "wbs": "application/vnd.criticaltools.wbs+xml",
  "pml": "application/vnd.ctc-posml",
  "ppd": "application/vnd.cups-ppd",
  "car": "application/vnd.curl.car",
  "pcurl": "application/vnd.curl.pcurl",
  "dart": "application/vnd.dart",
  "rdz": "application/vnd.data-vision.rdz",
  "uvf": "application/vnd.dece.data",
  "uvvf": "application/vnd.dece.data",
  "uvd": "application/vnd.dece.data",
  "uvvd": "application/vnd.dece.data",
  "uvt": "application/vnd.dece.ttml+xml",
  "uvvt": "application/vnd.dece.ttml+xml",
  "uvx": "application/vnd.dece.unspecified",
  "uvvx": "application/vnd.dece.unspecified",
  "uvz": "application/vnd.dece.zip",
  "uvvz": "application/vnd.dece.zip",
  "fe_launch": "application/vnd.denovo.fcselayout-link",
  "dna": "application/vnd.dna",
  "mlp": "application/vnd.dolby.mlp",
  "dpg": "application/vnd.dpgraph",
  "dfac": "application/vnd.dreamfactory",
  "kpxx": "application/vnd.ds-keypoint",
  "ait": "application/vnd.dvb.ait",
  "svc": "application/vnd.dvb.service",
  "geo": "application/vnd.dynageo",
  "mag": "application/vnd.ecowin.chart",
  "nml": "application/vnd.enliven",
  "esf": "application/vnd.epson.esf",
  "msf": "application/vnd.epson.msf",
  "qam": "application/vnd.epson.quickanime",
  "slt": "application/vnd.epson.salt",
  "ssf": "application/vnd.epson.ssf",
  "es3": "application/vnd.eszigno3+xml",
  "et3": "application/vnd.eszigno3+xml",
  "ez2": "application/vnd.ezpix-album",
  "ez3": "application/vnd.ezpix-package",
  "fdf": "application/vnd.fdf",
  "mseed": "application/vnd.fdsn.mseed",
  "seed": "application/vnd.fdsn.seed",
  "dataless": "application/vnd.fdsn.seed",
  "gph": "application/vnd.flographit",
  "ftc": "application/vnd.fluxtime.clip",
  "fm": "application/vnd.framemaker",
  "frame": "application/vnd.framemaker",
  "maker": "application/vnd.framemaker",
  "book": "application/vnd.framemaker",
  "fnc": "application/vnd.frogans.fnc",
  "ltf": "application/vnd.frogans.ltf",
  "fsc": "application/vnd.fsc.weblaunch",
  "oas": "application/vnd.fujitsu.oasys",
  "oa2": "application/vnd.fujitsu.oasys2",
  "oa3": "application/vnd.fujitsu.oasys3",
  "fg5": "application/vnd.fujitsu.oasysgp",
  "bh2": "application/vnd.fujitsu.oasysprs",
  "ddd": "application/vnd.fujixerox.ddd",
  "xdw": "application/vnd.fujixerox.docuworks",
  "xbd": "application/vnd.fujixerox.docuworks.binder",
  "fzs": "application/vnd.fuzzysheet",
  "txd": "application/vnd.genomatix.tuxedo",
  "ggb": "application/vnd.geogebra.file",
  "ggt": "application/vnd.geogebra.tool",
  "gex": "application/vnd.geometry-explorer",
  "gre": "application/vnd.geometry-explorer",
  "gxt": "application/vnd.geonext",
  "g2w": "application/vnd.geoplan",
  "g3w": "application/vnd.geospace",
  "gmx": "application/vnd.gmx",
  "kml": "application/vnd.google-earth.kml+xml",
  "kmz": "application/vnd.google-earth.kmz",
  "gqf": "application/vnd.grafeq",
  "gqs": "application/vnd.grafeq",
  "gac": "application/vnd.groove-account",
  "ghf": "application/vnd.groove-help",
  "gim": "application/vnd.groove-identity-message",
  "grv": "application/vnd.groove-injector",
  "gtm": "application/vnd.groove-tool-message",
  "tpl": "application/vnd.groove-tool-template",
  "vcg": "application/vnd.groove-vcard",
  "hal": "application/vnd.hal+xml",
  "zmm": "application/vnd.handheld-entertainment+xml",
  "hbci": "application/vnd.hbci",
  "les": "application/vnd.hhe.lesson-player",
  "hpgl": "application/vnd.hp-hpgl",
  "hpid": "application/vnd.hp-hpid",
  "hps": "application/vnd.hp-hps",
  "jlt": "application/vnd.hp-jlyt",
  "pcl": "application/vnd.hp-pcl",
  "pclxl": "application/vnd.hp-pclxl",
  "sfd-hdstx": "application/vnd.hydrostatix.sof-data",
  "mpy": "application/vnd.ibm.minipay",
  "afp": "application/vnd.ibm.modcap",
  "listafp": "application/vnd.ibm.modcap",
  "list3820": "application/vnd.ibm.modcap",
  "irm": "application/vnd.ibm.rights-management",
  "sc": "application/vnd.ibm.secure-container",
  "icc": "application/vnd.iccprofile",
  "icm": "application/vnd.iccprofile",
  "igl": "application/vnd.igloader",
  "ivp": "application/vnd.immervision-ivp",
  "ivu": "application/vnd.immervision-ivu",
  "igm": "application/vnd.insors.igm",
  "xpw": "application/vnd.intercon.formnet",
  "xpx": "application/vnd.intercon.formnet",
  "i2g": "application/vnd.intergeo",
  "qbo": "application/vnd.intu.qbo",
  "qfx": "application/vnd.intu.qfx",
  "rcprofile": "application/vnd.ipunplugged.rcprofile",
  "irp": "application/vnd.irepository.package+xml",
  "xpr": "application/vnd.is-xpr",
  "fcs": "application/vnd.isac.fcs",
  "jam": "application/vnd.jam",
  "rms": "application/vnd.jcp.javame.midlet-rms",
  "jisp": "application/vnd.jisp",
  "joda": "application/vnd.joost.joda-archive",
  "ktz": "application/vnd.kahootz",
  "ktr": "application/vnd.kahootz",
  "karbon": "application/vnd.kde.karbon",
  "chrt": "application/vnd.kde.kchart",
  "kfo": "application/vnd.kde.kformula",
  "flw": "application/vnd.kde.kivio",
  "kon": "application/vnd.kde.kontour",
  "kpr": "application/vnd.kde.kpresenter",
  "kpt": "application/vnd.kde.kpresenter",
  "ksp": "application/vnd.kde.kspread",
  "kwd": "application/vnd.kde.kword",
  "kwt": "application/vnd.kde.kword",
  "htke": "application/vnd.kenameaapp",
  "kia": "application/vnd.kidspiration",
  "kne": "application/vnd.kinar",
  "knp": "application/vnd.kinar",
  "skp": "application/vnd.koan",
  "skd": "application/vnd.koan",
  "skt": "application/vnd.koan",
  "skm": "application/vnd.koan",
  "sse": "application/vnd.kodak-descriptor",
  "lasxml": "application/vnd.las.las+xml",
  "lbd": "application/vnd.llamagraphics.life-balance.desktop",
  "lbe": "application/vnd.llamagraphics.life-balance.exchange+xml",
  "apr": "application/vnd.lotus-approach",
  "pre": "application/vnd.lotus-freelance",
  "nsf": "application/vnd.lotus-notes",
  "org": "application/vnd.lotus-organizer",
  "scm": "application/vnd.lotus-screencam",
  "lwp": "application/vnd.lotus-wordpro",
  "portpkg": "application/vnd.macports.portpkg",
  "mcd": "application/vnd.mcd",
  "mc1": "application/vnd.medcalcdata",
  "cdkey": "application/vnd.mediastation.cdkey",
  "mwf": "application/vnd.mfer",
  "mfm": "application/vnd.mfmp",
  "flo": "application/vnd.micrografx.flo",
  "igx": "application/vnd.micrografx.igx",
  "mif": "application/vnd.mif",
  "daf": "application/vnd.mobius.daf",
  "dis": "application/vnd.mobius.dis",
  "mbk": "application/vnd.mobius.mbk",
  "mqy": "application/vnd.mobius.mqy",
  "msl": "application/vnd.mobius.msl",
  "plc": "application/vnd.mobius.plc",
  "txf": "application/vnd.mobius.txf",
  "mpn": "application/vnd.mophun.application",
  "mpc": "application/vnd.mophun.certificate",
  "xul": "application/vnd.mozilla.xul+xml",
  "cil": "application/vnd.ms-artgalry",
  "cab": "application/vnd.ms-cab-compressed",
  "xls": "application/vnd.ms-excel",
  "xlm": "application/vnd.ms-excel",
  "xla": "application/vnd.ms-excel",
  "xlc": "application/vnd.ms-excel",
  "xlt": "application/vnd.ms-excel",
  "xlw": "application/vnd.ms-excel",
  "xlam": "application/vnd.ms-excel.addin.macroenabled.12",
  "xlsb": "application/vnd.ms-excel.sheet.binary.macroenabled.12",
  "xlsm": "application/vnd.ms-excel.sheet.macroenabled.12",
  "xltm": "application/vnd.ms-excel.template.macroenabled.12",
  "eot": "application/vnd.ms-fontobject",
  "chm": "application/vnd.ms-htmlhelp",
  "ims": "application/vnd.ms-ims",
  "lrm": "application/vnd.ms-lrm",
  "thmx": "application/vnd.ms-officetheme",
  "cat": "application/vnd.ms-pki.seccat",
  "stl": "application/vnd.ms-pki.stl",
  "ppt": "application/vnd.ms-powerpoint",
  "pps": "application/vnd.ms-powerpoint",
  "pot": "application/vnd.ms-powerpoint",
  "ppam": "application/vnd.ms-powerpoint.addin.macroenabled.12",
  "pptm": "application/vnd.ms-powerpoint.presentation.macroenabled.12",
  "sldm": "application/vnd.ms-powerpoint.slide.macroenabled.12",
  "ppsm": "application/vnd.ms-powerpoint.slideshow.macroenabled.12",
  "potm": "application/vnd.ms-powerpoint.template.macroenabled.12",
  "mpp": "application/vnd.ms-project",
  "mpt": "application/vnd.ms-project",
  "docm": "application/vnd.ms-word.document.macroenabled.12",
  "dotm": "application/vnd.ms-word.template.macroenabled.12",
  "wps": "application/vnd.ms-works",
  "wks": "application/vnd.ms-works",
  "wcm": "application/vnd.ms-works",
  "wdb": "application/vnd.ms-works",
  "wpl": "application/vnd.ms-wpl",
  "xps": "application/vnd.ms-xpsdocument",
  "mseq": "application/vnd.mseq",
  "mus": "application/vnd.musician",
  "msty": "application/vnd.muvee.style",
  "taglet": "application/vnd.mynfc",
  "nlu": "application/vnd.neurolanguage.nlu",
  "ntf": "application/vnd.nitf",
  "nitf": "application/vnd.nitf",
  "nnd": "application/vnd.noblenet-directory",
  "nns": "application/vnd.noblenet-sealer",
  "nnw": "application/vnd.noblenet-web",
  "ngdat": "application/vnd.nokia.n-gage.data",
  "n-gage": "application/vnd.nokia.n-gage.symbian.install",
  "rpst": "application/vnd.nokia.radio-preset",
  "rpss": "application/vnd.nokia.radio-presets",
  "edm": "application/vnd.novadigm.edm",
  "edx": "application/vnd.novadigm.edx",
  "ext": "application/vnd.novadigm.ext",
  "odc": "application/vnd.oasis.opendocument.chart",
  "otc": "application/vnd.oasis.opendocument.chart-template",
  "odb": "application/vnd.oasis.opendocument.database",
  "odf": "application/vnd.oasis.opendocument.formula",
  "odft": "application/vnd.oasis.opendocument.formula-template",
  "odg": "application/vnd.oasis.opendocument.graphics",
  "otg": "application/vnd.oasis.opendocument.graphics-template",
  "odi": "application/vnd.oasis.opendocument.image",
  "oti": "application/vnd.oasis.opendocument.image-template",
  "odp": "application/vnd.oasis.opendocument.presentation",
  "otp": "application/vnd.oasis.opendocument.presentation-template",
  "ods": "application/vnd.oasis.opendocument.spreadsheet",
  "ots": "application/vnd.oasis.opendocument.spreadsheet-template",
  "odt": "application/vnd.oasis.opendocument.text",
  "odm": "application/vnd.oasis.opendocument.text-master",
  "ott": "application/vnd.oasis.opendocument.text-template",
  "oth": "application/vnd.oasis.opendocument.text-web",
  "xo": "application/vnd.olpc-sugar",
  "dd2": "application/vnd.oma.dd2+xml",
  "oxt": "application/vnd.openofficeorg.extension",
  "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "sldx": "application/vnd.openxmlformats-officedocument.presentationml.slide",
  "ppsx": "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  "potx": "application/vnd.openxmlformats-officedocument.presentationml.template",
  "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "xltx": "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
  "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "dotx": "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
  "mgp": "application/vnd.osgeo.mapguide.package",
  "dp": "application/vnd.osgi.dp",
  "esa": "application/vnd.osgi.subsystem",
  "pdb": "application/vnd.palm",
  "pqa": "application/vnd.palm",
  "oprc": "application/vnd.palm",
  "paw": "application/vnd.pawaafile",
  "str": "application/vnd.pg.format",
  "ei6": "application/vnd.pg.osasli",
  "efif": "application/vnd.picsel",
  "wg": "application/vnd.pmi.widget",
  "plf": "application/vnd.pocketlearn",
  "pbd": "application/vnd.powerbuilder6",
  "box": "application/vnd.previewsystems.box",
  "mgz": "application/vnd.proteus.magazine",
  "qps": "application/vnd.publishare-delta-tree",
  "ptid": "application/vnd.pvi.ptid1",
  "qxd": "application/vnd.quark.quarkxpress",
  "qxt": "application/vnd.quark.quarkxpress",
  "qwd": "application/vnd.quark.quarkxpress",
  "qwt": "application/vnd.quark.quarkxpress",
  "qxl": "application/vnd.quark.quarkxpress",
  "qxb": "application/vnd.quark.quarkxpress",
  "bed": "application/vnd.realvnc.bed",
  "mxl": "application/vnd.recordare.musicxml",
  "musicxml": "application/vnd.recordare.musicxml+xml",
  "cryptonote": "application/vnd.rig.cryptonote",
  "cod": "application/vnd.rim.cod",
  "rm": "application/vnd.rn-realmedia",
  "rmvb": "application/vnd.rn-realmedia-vbr",
  "link66": "application/vnd.route66.link66+xml",
  "st": "application/vnd.sailingtracker.track",
  "see": "application/vnd.seemail",
  "sema": "application/vnd.sema",
  "semd": "application/vnd.semd",
  "semf": "application/vnd.semf",
  "ifm": "application/vnd.shana.informed.formdata",
  "itp": "application/vnd.shana.informed.formtemplate",
  "iif": "application/vnd.shana.informed.interchange",
  "ipk": "application/vnd.shana.informed.package",
  "twd": "application/vnd.simtech-mindmapper",
  "twds": "application/vnd.simtech-mindmapper",
  "mmf": "application/vnd.smaf",
  "teacher": "application/vnd.smart.teacher",
  "sdkm": "application/vnd.solent.sdkm+xml",
  "sdkd": "application/vnd.solent.sdkm+xml",
  "dxp": "application/vnd.spotfire.dxp",
  "sfs": "application/vnd.spotfire.sfs",
  "sdc": "application/vnd.stardivision.calc",
  "sda": "application/vnd.stardivision.draw",
  "sdd": "application/vnd.stardivision.impress",
  "smf": "application/vnd.stardivision.math",
  "sdw": "application/vnd.stardivision.writer",
  "vor": "application/vnd.stardivision.writer",
  "sgl": "application/vnd.stardivision.writer-global",
  "smzip": "application/vnd.stepmania.package",
  "sm": "application/vnd.stepmania.stepchart",
  "sxc": "application/vnd.sun.xml.calc",
  "stc": "application/vnd.sun.xml.calc.template",
  "sxd": "application/vnd.sun.xml.draw",
  "std": "application/vnd.sun.xml.draw.template",
  "sxi": "application/vnd.sun.xml.impress",
  "sti": "application/vnd.sun.xml.impress.template",
  "sxm": "application/vnd.sun.xml.math",
  "sxw": "application/vnd.sun.xml.writer",
  "sxg": "application/vnd.sun.xml.writer.global",
  "stw": "application/vnd.sun.xml.writer.template",
  "sus": "application/vnd.sus-calendar",
  "susp": "application/vnd.sus-calendar",
  "svd": "application/vnd.svd",
  "sis": "application/vnd.symbian.install",
  "sisx": "application/vnd.symbian.install",
  "xsm": "application/vnd.syncml+xml",
  "bdm": "application/vnd.syncml.dm+wbxml",
  "xdm": "application/vnd.syncml.dm+xml",
  "tao": "application/vnd.tao.intent-module-archive",
  "pcap": "application/vnd.tcpdump.pcap",
  "cap": "application/vnd.tcpdump.pcap",
  "dmp": "application/vnd.tcpdump.pcap",
  "tmo": "application/vnd.tmobile-livetv",
  "tpt": "application/vnd.trid.tpt",
  "mxs": "application/vnd.triscape.mxs",
  "tra": "application/vnd.trueapp",
  "ufd": "application/vnd.ufdl",
  "ufdl": "application/vnd.ufdl",
  "utz": "application/vnd.uiq.theme",
  "umj": "application/vnd.umajin",
  "unityweb": "application/vnd.unity",
  "uoml": "application/vnd.uoml+xml",
  "vcx": "application/vnd.vcx",
  "vsd": "application/vnd.visio",
  "vst": "application/vnd.visio",
  "vss": "application/vnd.visio",
  "vsw": "application/vnd.visio",
  "vis": "application/vnd.visionary",
  "vsf": "application/vnd.vsf",
  "wbxml": "application/vnd.wap.wbxml",
  "wmlc": "application/vnd.wap.wmlc",
  "wmlsc": "application/vnd.wap.wmlscriptc",
  "wtb": "application/vnd.webturbo",
  "nbp": "application/vnd.wolfram.player",
  "wpd": "application/vnd.wordperfect",
  "wqd": "application/vnd.wqd",
  "stf": "application/vnd.wt.stf",
  "xar": "application/vnd.xara",
  "xfdl": "application/vnd.xfdl",
  "hvd": "application/vnd.yamaha.hv-dic",
  "hvs": "application/vnd.yamaha.hv-script",
  "hvp": "application/vnd.yamaha.hv-voice",
  "osf": "application/vnd.yamaha.openscoreformat",
  "osfpvg": "application/vnd.yamaha.openscoreformat.osfpvg+xml",
  "saf": "application/vnd.yamaha.smaf-audio",
  "spf": "application/vnd.yamaha.smaf-phrase",
  "cmp": "application/vnd.yellowriver-custom-menu",
  "zir": "application/vnd.zul",
  "zirz": "application/vnd.zul",
  "zaz": "application/vnd.zzazz.deck+xml",
  "vxml": "application/voicexml+xml",
  "wgt": "application/widget",
  "hlp": "application/winhlp",
  "wsdl": "application/wsdl+xml",
  "wspolicy": "application/wspolicy+xml",
  "7z": "application/x-7z-compressed",
  "abw": "application/x-abiword",
  "ace": "application/x-ace-compressed",
  "dmg": "application/x-apple-diskimage",
  "aab": "application/x-authorware-bin",
  "x32": "application/x-authorware-bin",
  "u32": "application/x-authorware-bin",
  "vox": "application/x-authorware-bin",
  "aam": "application/x-authorware-map",
  "aas": "application/x-authorware-seg",
  "bcpio": "application/x-bcpio",
  "torrent": "application/x-bittorrent",
  "blb": "application/x-blorb",
  "blorb": "application/x-blorb",
  "bz": "application/x-bzip",
  "bz2": "application/x-bzip2",
  "boz": "application/x-bzip2",
  "cbr": "application/x-cbr",
  "cba": "application/x-cbr",
  "cbt": "application/x-cbr",
  "cbz": "application/x-cbr",
  "cb7": "application/x-cbr",
  "vcd": "application/x-cdlink",
  "cfs": "application/x-cfs-compressed",
  "chat": "application/x-chat",
  "pgn": "application/x-chess-pgn",
  "nsc": "application/x-conference",
  "cpio": "application/x-cpio",
  "csh": "application/x-csh",
  "deb": "application/x-debian-package",
  "udeb": "application/x-debian-package",
  "dgc": "application/x-dgc-compressed",
  "dir": "application/x-director",
  "dcr": "application/x-director",
  "dxr": "application/x-director",
  "cst": "application/x-director",
  "cct": "application/x-director",
  "cxt": "application/x-director",
  "w3d": "application/x-director",
  "fgd": "application/x-director",
  "swa": "application/x-director",
  "wad": "application/x-doom",
  "ncx": "application/x-dtbncx+xml",
  "dtb": "application/x-dtbook+xml",
  "res": "application/x-dtbresource+xml",
  "dvi": "application/x-dvi",
  "evy": "application/x-envoy",
  "eva": "application/x-eva",
  "bdf": "application/x-font-bdf",
  "gsf": "application/x-font-ghostscript",
  "psf": "application/x-font-linux-psf",
  "otf": "application/x-font-otf",
  "pcf": "application/x-font-pcf",
  "snf": "application/x-font-snf",
  "ttf": "application/x-font-ttf",
  "ttc": "application/x-font-ttf",
  "pfa": "application/x-font-type1",
  "pfb": "application/x-font-type1",
  "pfm": "application/x-font-type1",
  "afm": "application/x-font-type1",
  "woff": "application/x-font-woff",
  "arc": "application/x-freearc",
  "spl": "application/x-futuresplash",
  "gca": "application/x-gca-compressed",
  "ulx": "application/x-glulx",
  "gnumeric": "application/x-gnumeric",
  "gramps": "application/x-gramps-xml",
  "gtar": "application/x-gtar",
  "hdf": "application/x-hdf",
  "install": "application/x-install-instructions",
  "iso": "application/x-iso9660-image",
  "jnlp": "application/x-java-jnlp-file",
  "latex": "application/x-latex",
  "lzh": "application/x-lzh-compressed",
  "lha": "application/x-lzh-compressed",
  "mie": "application/x-mie",
  "prc": "application/x-mobipocket-ebook",
  "mobi": "application/x-mobipocket-ebook",
  "application": "application/x-ms-application",
  "lnk": "application/x-ms-shortcut",
  "wmd": "application/x-ms-wmd",
  "wmz": "application/x-msmetafile",
  "xbap": "application/x-ms-xbap",
  "mdb": "application/x-msaccess",
  "obd": "application/x-msbinder",
  "crd": "application/x-mscardfile",
  "clp": "application/x-msclip",
  "exe": "application/x-msdownload",
  "dll": "application/x-msdownload",
  "com": "application/x-msdownload",
  "bat": "application/x-msdownload",
  "msi": "application/x-msdownload",
  "mvb": "application/x-msmediaview",
  "m13": "application/x-msmediaview",
  "m14": "application/x-msmediaview",
  "wmf": "application/x-msmetafile",
  "emf": "application/x-msmetafile",
  "emz": "application/x-msmetafile",
  "mny": "application/x-msmoney",
  "pub": "application/x-mspublisher",
  "scd": "application/x-msschedule",
  "trm": "application/x-msterminal",
  "wri": "application/x-mswrite",
  "nc": "application/x-netcdf",
  "cdf": "application/x-netcdf",
  "nzb": "application/x-nzb",
  "p12": "application/x-pkcs12",
  "pfx": "application/x-pkcs12",
  "p7b": "application/x-pkcs7-certificates",
  "spc": "application/x-pkcs7-certificates",
  "p7r": "application/x-pkcs7-certreqresp",
  "rar": "application/x-rar-compressed",
  "ris": "application/x-research-info-systems",
  "sh": "application/x-sh",
  "shar": "application/x-shar",
  "swf": "application/x-shockwave-flash",
  "xap": "application/x-silverlight-app",
  "sql": "application/x-sql",
  "sit": "application/x-stuffit",
  "sitx": "application/x-stuffitx",
  "srt": "application/x-subrip",
  "sv4cpio": "application/x-sv4cpio",
  "sv4crc": "application/x-sv4crc",
  "t3": "application/x-t3vm-image",
  "gam": "application/x-tads",
  "tar": "application/x-tar",
  "tcl": "application/x-tcl",
  "tex": "application/x-tex",
  "tfm": "application/x-tex-tfm",
  "texinfo": "application/x-texinfo",
  "texi": "application/x-texinfo",
  "obj": "application/x-tgif",
  "ustar": "application/x-ustar",
  "src": "application/x-wais-source",
  "der": "application/x-x509-ca-cert",
  "crt": "application/x-x509-ca-cert",
  "fig": "application/x-xfig",
  "xlf": "application/x-xliff+xml",
  "xpi": "application/x-xpinstall",
  "xz": "application/x-xz",
  "z1": "application/x-zmachine",
  "z2": "application/x-zmachine",
  "z3": "application/x-zmachine",
  "z4": "application/x-zmachine",
  "z5": "application/x-zmachine",
  "z6": "application/x-zmachine",
  "z7": "application/x-zmachine",
  "z8": "application/x-zmachine",
  "xaml": "application/xaml+xml",
  "xdf": "application/xcap-diff+xml",
  "xenc": "application/xenc+xml",
  "xhtml": "application/xhtml+xml",
  "xht": "application/xhtml+xml",
  "xml": "application/xml",
  "xsl": "application/xml",
  "dtd": "application/xml-dtd",
  "xop": "application/xop+xml",
  "xpl": "application/xproc+xml",
  "xslt": "application/xslt+xml",
  "xspf": "application/xspf+xml",
  "mxml": "application/xv+xml",
  "xhvml": "application/xv+xml",
  "xvml": "application/xv+xml",
  "xvm": "application/xv+xml",
  "yang": "application/yang",
  "yin": "application/yin+xml",
  "zip": "application/zip",
  "adp": "audio/adpcm",
  "au": "audio/basic",
  "snd": "audio/basic",
  "mid": "audio/midi",
  "midi": "audio/midi",
  "kar": "audio/midi",
  "rmi": "audio/midi",
  "mp4a": "audio/mp4",
  "mpga": "audio/mpeg",
  "mp2": "audio/mpeg",
  "mp2a": "audio/mpeg",
  "mp3": "audio/mpeg",
  "m2a": "audio/mpeg",
  "m3a": "audio/mpeg",
  "oga": "audio/ogg",
  "ogg": "audio/ogg",
  "spx": "audio/ogg",
  "s3m": "audio/s3m",
  "sil": "audio/silk",
  "uva": "audio/vnd.dece.audio",
  "uvva": "audio/vnd.dece.audio",
  "eol": "audio/vnd.digital-winds",
  "dra": "audio/vnd.dra",
  "dts": "audio/vnd.dts",
  "dtshd": "audio/vnd.dts.hd",
  "lvp": "audio/vnd.lucent.voice",
  "pya": "audio/vnd.ms-playready.media.pya",
  "ecelp4800": "audio/vnd.nuera.ecelp4800",
  "ecelp7470": "audio/vnd.nuera.ecelp7470",
  "ecelp9600": "audio/vnd.nuera.ecelp9600",
  "rip": "audio/vnd.rip",
  "weba": "audio/webm",
  "aac": "audio/x-aac",
  "aif": "audio/x-aiff",
  "aiff": "audio/x-aiff",
  "aifc": "audio/x-aiff",
  "caf": "audio/x-caf",
  "flac": "audio/x-flac",
  "mka": "audio/x-matroska",
  "m3u": "audio/x-mpegurl",
  "wax": "audio/x-ms-wax",
  "wma": "audio/x-ms-wma",
  "ram": "audio/x-pn-realaudio",
  "ra": "audio/x-pn-realaudio",
  "rmp": "audio/x-pn-realaudio-plugin",
  "wav": "audio/x-wav",
  "xm": "audio/xm",
  "cdx": "chemical/x-cdx",
  "cif": "chemical/x-cif",
  "cmdf": "chemical/x-cmdf",
  "cml": "chemical/x-cml",
  "csml": "chemical/x-csml",
  "xyz": "chemical/x-xyz",
  "bmp": "image/bmp",
  "cgm": "image/cgm",
  "g3": "image/g3fax",
  "gif": "image/gif",
  "ief": "image/ief",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "jpe": "image/jpeg",
  "ktx": "image/ktx",
  "png": "image/png",
  "btif": "image/prs.btif",
  "sgi": "image/sgi",
  "svg": "image/svg+xml",
  "svgz": "image/svg+xml",
  "tiff": "image/tiff",
  "tif": "image/tiff",
  "psd": "image/vnd.adobe.photoshop",
  "uvi": "image/vnd.dece.graphic",
  "uvvi": "image/vnd.dece.graphic",
  "uvg": "image/vnd.dece.graphic",
  "uvvg": "image/vnd.dece.graphic",
  "sub": "text/vnd.dvb.subtitle",
  "djvu": "image/vnd.djvu",
  "djv": "image/vnd.djvu",
  "dwg": "image/vnd.dwg",
  "dxf": "image/vnd.dxf",
  "fbs": "image/vnd.fastbidsheet",
  "fpx": "image/vnd.fpx",
  "fst": "image/vnd.fst",
  "mmr": "image/vnd.fujixerox.edmics-mmr",
  "rlc": "image/vnd.fujixerox.edmics-rlc",
  "mdi": "image/vnd.ms-modi",
  "wdp": "image/vnd.ms-photo",
  "npx": "image/vnd.net-fpx",
  "wbmp": "image/vnd.wap.wbmp",
  "xif": "image/vnd.xiff",
  "webp": "image/webp",
  "3ds": "image/x-3ds",
  "ras": "image/x-cmu-raster",
  "cmx": "image/x-cmx",
  "fh": "image/x-freehand",
  "fhc": "image/x-freehand",
  "fh4": "image/x-freehand",
  "fh5": "image/x-freehand",
  "fh7": "image/x-freehand",
  "ico": "image/x-icon",
  "sid": "image/x-mrsid-image",
  "pcx": "image/x-pcx",
  "pic": "image/x-pict",
  "pct": "image/x-pict",
  "pnm": "image/x-portable-anymap",
  "pbm": "image/x-portable-bitmap",
  "pgm": "image/x-portable-graymap",
  "ppm": "image/x-portable-pixmap",
  "rgb": "image/x-rgb",
  "tga": "image/x-tga",
  "xbm": "image/x-xbitmap",
  "xpm": "image/x-xpixmap",
  "xwd": "image/x-xwindowdump",
  "eml": "message/rfc822",
  "mime": "message/rfc822",
  "igs": "model/iges",
  "iges": "model/iges",
  "msh": "model/mesh",
  "mesh": "model/mesh",
  "silo": "model/mesh",
  "dae": "model/vnd.collada+xml",
  "dwf": "model/vnd.dwf",
  "gdl": "model/vnd.gdl",
  "gtw": "model/vnd.gtw",
  "mts": "model/vnd.mts",
  "vtu": "model/vnd.vtu",
  "wrl": "model/vrml",
  "vrml": "model/vrml",
  "x3db": "model/x3d+binary",
  "x3dbz": "model/x3d+binary",
  "x3dv": "model/x3d+vrml",
  "x3dvz": "model/x3d+vrml",
  "x3d": "model/x3d+xml",
  "x3dz": "model/x3d+xml",
  "appcache": "text/cache-manifest",
  "ics": "text/calendar",
  "ifb": "text/calendar",
  "css": "text/css",
  "csv": "text/csv",
  "html": "text/html",
  "htm": "text/html",
  "n3": "text/n3",
  "txt": "text/plain",
  "text": "text/plain",
  "conf": "text/plain",
  "def": "text/plain",
  "list": "text/plain",
  "log": "text/plain",
  "in": "text/plain",
  "dsc": "text/prs.lines.tag",
  "rtx": "text/richtext",
  "sgml": "text/sgml",
  "sgm": "text/sgml",
  "tsv": "text/tab-separated-values",
  "t": "text/troff",
  "tr": "text/troff",
  "roff": "text/troff",
  "man": "text/troff",
  "me": "text/troff",
  "ms": "text/troff",
  "ttl": "text/turtle",
  "uri": "text/uri-list",
  "uris": "text/uri-list",
  "urls": "text/uri-list",
  "vcard": "text/vcard",
  "curl": "text/vnd.curl",
  "dcurl": "text/vnd.curl.dcurl",
  "scurl": "text/vnd.curl.scurl",
  "mcurl": "text/vnd.curl.mcurl",
  "fly": "text/vnd.fly",
  "flx": "text/vnd.fmi.flexstor",
  "gv": "text/vnd.graphviz",
  "3dml": "text/vnd.in3d.3dml",
  "spot": "text/vnd.in3d.spot",
  "jad": "text/vnd.sun.j2me.app-descriptor",
  "wml": "text/vnd.wap.wml",
  "wmls": "text/vnd.wap.wmlscript",
  "s": "text/x-asm",
  "asm": "text/x-asm",
  "c": "text/x-c",
  "cc": "text/x-c",
  "cxx": "text/x-c",
  "cpp": "text/x-c",
  "h": "text/x-c",
  "hh": "text/x-c",
  "dic": "text/x-c",
  "f": "text/x-fortran",
  "for": "text/x-fortran",
  "f77": "text/x-fortran",
  "f90": "text/x-fortran",
  "java": "text/x-java-source",
  "opml": "text/x-opml",
  "p": "text/x-pascal",
  "pas": "text/x-pascal",
  "nfo": "text/x-nfo",
  "etx": "text/x-setext",
  "sfv": "text/x-sfv",
  "uu": "text/x-uuencode",
  "vcs": "text/x-vcalendar",
  "vcf": "text/x-vcard",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  "h261": "video/h261",
  "h263": "video/h263",
  "h264": "video/h264",
  "jpgv": "video/jpeg",
  "jpm": "video/jpm",
  "jpgm": "video/jpm",
  "mj2": "video/mj2",
  "mjp2": "video/mj2",
  "mp4": "video/mp4",
  "mp4v": "video/mp4",
  "mpg4": "video/mp4",
  "mpeg": "video/mpeg",
  "mpg": "video/mpeg",
  "mpe": "video/mpeg",
  "m1v": "video/mpeg",
  "m2v": "video/mpeg",
  "ogv": "video/ogg",
  "qt": "video/quicktime",
  "mov": "video/quicktime",
  "uvh": "video/vnd.dece.hd",
  "uvvh": "video/vnd.dece.hd",
  "uvm": "video/vnd.dece.mobile",
  "uvvm": "video/vnd.dece.mobile",
  "uvp": "video/vnd.dece.pd",
  "uvvp": "video/vnd.dece.pd",
  "uvs": "video/vnd.dece.sd",
  "uvvs": "video/vnd.dece.sd",
  "uvv": "video/vnd.dece.video",
  "uvvv": "video/vnd.dece.video",
  "dvb": "video/vnd.dvb.file",
  "fvt": "video/vnd.fvt",
  "mxu": "video/vnd.mpegurl",
  "m4u": "video/vnd.mpegurl",
  "pyv": "video/vnd.ms-playready.media.pyv",
  "uvu": "video/vnd.uvvu.mp4",
  "uvvu": "video/vnd.uvvu.mp4",
  "viv": "video/vnd.vivo",
  "webm": "video/webm",
  "f4v": "video/x-f4v",
  "fli": "video/x-fli",
  "flv": "video/x-flv",
  "m4v": "video/x-m4v",
  "mkv": "video/x-matroska",
  "mk3d": "video/x-matroska",
  "mks": "video/x-matroska",
  "mng": "video/x-mng",
  "asf": "video/x-ms-asf",
  "asx": "video/x-ms-asf",
  "vob": "video/x-ms-vob",
  "wm": "video/x-ms-wm",
  "wmv": "video/x-ms-wmv",
  "wmx": "video/x-ms-wmx",
  "wvx": "video/x-ms-wvx",
  "avi": "video/x-msvideo",
  "movie": "video/x-sgi-movie",
  "smv": "video/x-smv",
  "ice": "x-conference/x-cooltalk",
  "vtt": "text/vtt",
  "crx": "application/x-chrome-extension",
  "htc": "text/x-component",
  "manifest": "text/cache-manifest",
  "buffer": "application/octet-stream",
  "m4p": "application/mp4",
  "m4a": "audio/mp4",
  "ts": "video/MP2T",
  "event-stream": "text/event-stream",
  "webapp": "application/x-web-app-manifest+json",
  "lua": "text/x-lua",
  "luac": "application/x-lua-bytecode",
  "markdown": "text/x-markdown",
  "md": "text/x-markdown",
  "mkd": "text/x-markdown"
}
  , extensions: {
  "application/andrew-inset": "ez",
  "application/applixware": "aw",
  "application/atom+xml": "atom",
  "application/atomcat+xml": "atomcat",
  "application/atomsvc+xml": "atomsvc",
  "application/ccxml+xml": "ccxml",
  "application/cdmi-capability": "cdmia",
  "application/cdmi-container": "cdmic",
  "application/cdmi-domain": "cdmid",
  "application/cdmi-object": "cdmio",
  "application/cdmi-queue": "cdmiq",
  "application/cu-seeme": "cu",
  "application/davmount+xml": "davmount",
  "application/docbook+xml": "dbk",
  "application/dssc+der": "dssc",
  "application/dssc+xml": "xdssc",
  "application/ecmascript": "ecma",
  "application/emma+xml": "emma",
  "application/epub+zip": "epub",
  "application/exi": "exi",
  "application/font-tdpfr": "pfr",
  "application/gml+xml": "gml",
  "application/gpx+xml": "gpx",
  "application/gxf": "gxf",
  "application/hyperstudio": "stk",
  "application/inkml+xml": "ink",
  "application/ipfix": "ipfix",
  "application/java-archive": "jar",
  "application/java-serialized-object": "ser",
  "application/java-vm": "class",
  "application/javascript": "js",
  "application/json": "json",
  "application/jsonml+json": "jsonml",
  "application/lost+xml": "lostxml",
  "application/mac-binhex40": "hqx",
  "application/mac-compactpro": "cpt",
  "application/mads+xml": "mads",
  "application/marc": "mrc",
  "application/marcxml+xml": "mrcx",
  "application/mathematica": "ma",
  "application/mathml+xml": "mathml",
  "application/mbox": "mbox",
  "application/mediaservercontrol+xml": "mscml",
  "application/metalink+xml": "metalink",
  "application/metalink4+xml": "meta4",
  "application/mets+xml": "mets",
  "application/mods+xml": "mods",
  "application/mp21": "m21",
  "application/mp4": "mp4s",
  "application/msword": "doc",
  "application/mxf": "mxf",
  "application/octet-stream": "bin",
  "application/oda": "oda",
  "application/oebps-package+xml": "opf",
  "application/ogg": "ogx",
  "application/omdoc+xml": "omdoc",
  "application/onenote": "onetoc",
  "application/oxps": "oxps",
  "application/patch-ops-error+xml": "xer",
  "application/pdf": "pdf",
  "application/pgp-encrypted": "pgp",
  "application/pgp-signature": "asc",
  "application/pics-rules": "prf",
  "application/pkcs10": "p10",
  "application/pkcs7-mime": "p7m",
  "application/pkcs7-signature": "p7s",
  "application/pkcs8": "p8",
  "application/pkix-attr-cert": "ac",
  "application/pkix-cert": "cer",
  "application/pkix-crl": "crl",
  "application/pkix-pkipath": "pkipath",
  "application/pkixcmp": "pki",
  "application/pls+xml": "pls",
  "application/postscript": "ai",
  "application/prs.cww": "cww",
  "application/pskc+xml": "pskcxml",
  "application/rdf+xml": "rdf",
  "application/reginfo+xml": "rif",
  "application/relax-ng-compact-syntax": "rnc",
  "application/resource-lists+xml": "rl",
  "application/resource-lists-diff+xml": "rld",
  "application/rls-services+xml": "rs",
  "application/rpki-ghostbusters": "gbr",
  "application/rpki-manifest": "mft",
  "application/rpki-roa": "roa",
  "application/rsd+xml": "rsd",
  "application/rss+xml": "rss",
  "application/rtf": "rtf",
  "application/sbml+xml": "sbml",
  "application/scvp-cv-request": "scq",
  "application/scvp-cv-response": "scs",
  "application/scvp-vp-request": "spq",
  "application/scvp-vp-response": "spp",
  "application/sdp": "sdp",
  "application/set-payment-initiation": "setpay",
  "application/set-registration-initiation": "setreg",
  "application/shf+xml": "shf",
  "application/smil+xml": "smi",
  "application/sparql-query": "rq",
  "application/sparql-results+xml": "srx",
  "application/srgs": "gram",
  "application/srgs+xml": "grxml",
  "application/sru+xml": "sru",
  "application/ssdl+xml": "ssdl",
  "application/ssml+xml": "ssml",
  "application/tei+xml": "tei",
  "application/thraud+xml": "tfi",
  "application/timestamped-data": "tsd",
  "application/vnd.3gpp.pic-bw-large": "plb",
  "application/vnd.3gpp.pic-bw-small": "psb",
  "application/vnd.3gpp.pic-bw-var": "pvb",
  "application/vnd.3gpp2.tcap": "tcap",
  "application/vnd.3m.post-it-notes": "pwn",
  "application/vnd.accpac.simply.aso": "aso",
  "application/vnd.accpac.simply.imp": "imp",
  "application/vnd.acucobol": "acu",
  "application/vnd.acucorp": "atc",
  "application/vnd.adobe.air-application-installer-package+zip": "air",
  "application/vnd.adobe.formscentral.fcdt": "fcdt",
  "application/vnd.adobe.fxp": "fxp",
  "application/vnd.adobe.xdp+xml": "xdp",
  "application/vnd.adobe.xfdf": "xfdf",
  "application/vnd.ahead.space": "ahead",
  "application/vnd.airzip.filesecure.azf": "azf",
  "application/vnd.airzip.filesecure.azs": "azs",
  "application/vnd.amazon.ebook": "azw",
  "application/vnd.americandynamics.acc": "acc",
  "application/vnd.amiga.ami": "ami",
  "application/vnd.android.package-archive": "apk",
  "application/vnd.anser-web-certificate-issue-initiation": "cii",
  "application/vnd.anser-web-funds-transfer-initiation": "fti",
  "application/vnd.antix.game-component": "atx",
  "application/vnd.apple.installer+xml": "mpkg",
  "application/vnd.apple.mpegurl": "m3u8",
  "application/vnd.aristanetworks.swi": "swi",
  "application/vnd.astraea-software.iota": "iota",
  "application/vnd.audiograph": "aep",
  "application/vnd.blueice.multipass": "mpm",
  "application/vnd.bmi": "bmi",
  "application/vnd.businessobjects": "rep",
  "application/vnd.chemdraw+xml": "cdxml",
  "application/vnd.chipnuts.karaoke-mmd": "mmd",
  "application/vnd.cinderella": "cdy",
  "application/vnd.claymore": "cla",
  "application/vnd.cloanto.rp9": "rp9",
  "application/vnd.clonk.c4group": "c4g",
  "application/vnd.cluetrust.cartomobile-config": "c11amc",
  "application/vnd.cluetrust.cartomobile-config-pkg": "c11amz",
  "application/vnd.commonspace": "csp",
  "application/vnd.contact.cmsg": "cdbcmsg",
  "application/vnd.cosmocaller": "cmc",
  "application/vnd.crick.clicker": "clkx",
  "application/vnd.crick.clicker.keyboard": "clkk",
  "application/vnd.crick.clicker.palette": "clkp",
  "application/vnd.crick.clicker.template": "clkt",
  "application/vnd.crick.clicker.wordbank": "clkw",
  "application/vnd.criticaltools.wbs+xml": "wbs",
  "application/vnd.ctc-posml": "pml",
  "application/vnd.cups-ppd": "ppd",
  "application/vnd.curl.car": "car",
  "application/vnd.curl.pcurl": "pcurl",
  "application/vnd.dart": "dart",
  "application/vnd.data-vision.rdz": "rdz",
  "application/vnd.dece.data": "uvf",
  "application/vnd.dece.ttml+xml": "uvt",
  "application/vnd.dece.unspecified": "uvx",
  "application/vnd.dece.zip": "uvz",
  "application/vnd.denovo.fcselayout-link": "fe_launch",
  "application/vnd.dna": "dna",
  "application/vnd.dolby.mlp": "mlp",
  "application/vnd.dpgraph": "dpg",
  "application/vnd.dreamfactory": "dfac",
  "application/vnd.ds-keypoint": "kpxx",
  "application/vnd.dvb.ait": "ait",
  "application/vnd.dvb.service": "svc",
  "application/vnd.dynageo": "geo",
  "application/vnd.ecowin.chart": "mag",
  "application/vnd.enliven": "nml",
  "application/vnd.epson.esf": "esf",
  "application/vnd.epson.msf": "msf",
  "application/vnd.epson.quickanime": "qam",
  "application/vnd.epson.salt": "slt",
  "application/vnd.epson.ssf": "ssf",
  "application/vnd.eszigno3+xml": "es3",
  "application/vnd.ezpix-album": "ez2",
  "application/vnd.ezpix-package": "ez3",
  "application/vnd.fdf": "fdf",
  "application/vnd.fdsn.mseed": "mseed",
  "application/vnd.fdsn.seed": "seed",
  "application/vnd.flographit": "gph",
  "application/vnd.fluxtime.clip": "ftc",
  "application/vnd.framemaker": "fm",
  "application/vnd.frogans.fnc": "fnc",
  "application/vnd.frogans.ltf": "ltf",
  "application/vnd.fsc.weblaunch": "fsc",
  "application/vnd.fujitsu.oasys": "oas",
  "application/vnd.fujitsu.oasys2": "oa2",
  "application/vnd.fujitsu.oasys3": "oa3",
  "application/vnd.fujitsu.oasysgp": "fg5",
  "application/vnd.fujitsu.oasysprs": "bh2",
  "application/vnd.fujixerox.ddd": "ddd",
  "application/vnd.fujixerox.docuworks": "xdw",
  "application/vnd.fujixerox.docuworks.binder": "xbd",
  "application/vnd.fuzzysheet": "fzs",
  "application/vnd.genomatix.tuxedo": "txd",
  "application/vnd.geogebra.file": "ggb",
  "application/vnd.geogebra.tool": "ggt",
  "application/vnd.geometry-explorer": "gex",
  "application/vnd.geonext": "gxt",
  "application/vnd.geoplan": "g2w",
  "application/vnd.geospace": "g3w",
  "application/vnd.gmx": "gmx",
  "application/vnd.google-earth.kml+xml": "kml",
  "application/vnd.google-earth.kmz": "kmz",
  "application/vnd.grafeq": "gqf",
  "application/vnd.groove-account": "gac",
  "application/vnd.groove-help": "ghf",
  "application/vnd.groove-identity-message": "gim",
  "application/vnd.groove-injector": "grv",
  "application/vnd.groove-tool-message": "gtm",
  "application/vnd.groove-tool-template": "tpl",
  "application/vnd.groove-vcard": "vcg",
  "application/vnd.hal+xml": "hal",
  "application/vnd.handheld-entertainment+xml": "zmm",
  "application/vnd.hbci": "hbci",
  "application/vnd.hhe.lesson-player": "les",
  "application/vnd.hp-hpgl": "hpgl",
  "application/vnd.hp-hpid": "hpid",
  "application/vnd.hp-hps": "hps",
  "application/vnd.hp-jlyt": "jlt",
  "application/vnd.hp-pcl": "pcl",
  "application/vnd.hp-pclxl": "pclxl",
  "application/vnd.hydrostatix.sof-data": "sfd-hdstx",
  "application/vnd.ibm.minipay": "mpy",
  "application/vnd.ibm.modcap": "afp",
  "application/vnd.ibm.rights-management": "irm",
  "application/vnd.ibm.secure-container": "sc",
  "application/vnd.iccprofile": "icc",
  "application/vnd.igloader": "igl",
  "application/vnd.immervision-ivp": "ivp",
  "application/vnd.immervision-ivu": "ivu",
  "application/vnd.insors.igm": "igm",
  "application/vnd.intercon.formnet": "xpw",
  "application/vnd.intergeo": "i2g",
  "application/vnd.intu.qbo": "qbo",
  "application/vnd.intu.qfx": "qfx",
  "application/vnd.ipunplugged.rcprofile": "rcprofile",
  "application/vnd.irepository.package+xml": "irp",
  "application/vnd.is-xpr": "xpr",
  "application/vnd.isac.fcs": "fcs",
  "application/vnd.jam": "jam",
  "application/vnd.jcp.javame.midlet-rms": "rms",
  "application/vnd.jisp": "jisp",
  "application/vnd.joost.joda-archive": "joda",
  "application/vnd.kahootz": "ktz",
  "application/vnd.kde.karbon": "karbon",
  "application/vnd.kde.kchart": "chrt",
  "application/vnd.kde.kformula": "kfo",
  "application/vnd.kde.kivio": "flw",
  "application/vnd.kde.kontour": "kon",
  "application/vnd.kde.kpresenter": "kpr",
  "application/vnd.kde.kspread": "ksp",
  "application/vnd.kde.kword": "kwd",
  "application/vnd.kenameaapp": "htke",
  "application/vnd.kidspiration": "kia",
  "application/vnd.kinar": "kne",
  "application/vnd.koan": "skp",
  "application/vnd.kodak-descriptor": "sse",
  "application/vnd.las.las+xml": "lasxml",
  "application/vnd.llamagraphics.life-balance.desktop": "lbd",
  "application/vnd.llamagraphics.life-balance.exchange+xml": "lbe",
  "application/vnd.lotus-1-2-3": "123",
  "application/vnd.lotus-approach": "apr",
  "application/vnd.lotus-freelance": "pre",
  "application/vnd.lotus-notes": "nsf",
  "application/vnd.lotus-organizer": "org",
  "application/vnd.lotus-screencam": "scm",
  "application/vnd.lotus-wordpro": "lwp",
  "application/vnd.macports.portpkg": "portpkg",
  "application/vnd.mcd": "mcd",
  "application/vnd.medcalcdata": "mc1",
  "application/vnd.mediastation.cdkey": "cdkey",
  "application/vnd.mfer": "mwf",
  "application/vnd.mfmp": "mfm",
  "application/vnd.micrografx.flo": "flo",
  "application/vnd.micrografx.igx": "igx",
  "application/vnd.mif": "mif",
  "application/vnd.mobius.daf": "daf",
  "application/vnd.mobius.dis": "dis",
  "application/vnd.mobius.mbk": "mbk",
  "application/vnd.mobius.mqy": "mqy",
  "application/vnd.mobius.msl": "msl",
  "application/vnd.mobius.plc": "plc",
  "application/vnd.mobius.txf": "txf",
  "application/vnd.mophun.application": "mpn",
  "application/vnd.mophun.certificate": "mpc",
  "application/vnd.mozilla.xul+xml": "xul",
  "application/vnd.ms-artgalry": "cil",
  "application/vnd.ms-cab-compressed": "cab",
  "application/vnd.ms-excel": "xls",
  "application/vnd.ms-excel.addin.macroenabled.12": "xlam",
  "application/vnd.ms-excel.sheet.binary.macroenabled.12": "xlsb",
  "application/vnd.ms-excel.sheet.macroenabled.12": "xlsm",
  "application/vnd.ms-excel.template.macroenabled.12": "xltm",
  "application/vnd.ms-fontobject": "eot",
  "application/vnd.ms-htmlhelp": "chm",
  "application/vnd.ms-ims": "ims",
  "application/vnd.ms-lrm": "lrm",
  "application/vnd.ms-officetheme": "thmx",
  "application/vnd.ms-pki.seccat": "cat",
  "application/vnd.ms-pki.stl": "stl",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.ms-powerpoint.addin.macroenabled.12": "ppam",
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": "pptm",
  "application/vnd.ms-powerpoint.slide.macroenabled.12": "sldm",
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12": "ppsm",
  "application/vnd.ms-powerpoint.template.macroenabled.12": "potm",
  "application/vnd.ms-project": "mpp",
  "application/vnd.ms-word.document.macroenabled.12": "docm",
  "application/vnd.ms-word.template.macroenabled.12": "dotm",
  "application/vnd.ms-works": "wps",
  "application/vnd.ms-wpl": "wpl",
  "application/vnd.ms-xpsdocument": "xps",
  "application/vnd.mseq": "mseq",
  "application/vnd.musician": "mus",
  "application/vnd.muvee.style": "msty",
  "application/vnd.mynfc": "taglet",
  "application/vnd.neurolanguage.nlu": "nlu",
  "application/vnd.nitf": "ntf",
  "application/vnd.noblenet-directory": "nnd",
  "application/vnd.noblenet-sealer": "nns",
  "application/vnd.noblenet-web": "nnw",
  "application/vnd.nokia.n-gage.data": "ngdat",
  "application/vnd.nokia.n-gage.symbian.install": "n-gage",
  "application/vnd.nokia.radio-preset": "rpst",
  "application/vnd.nokia.radio-presets": "rpss",
  "application/vnd.novadigm.edm": "edm",
  "application/vnd.novadigm.edx": "edx",
  "application/vnd.novadigm.ext": "ext",
  "application/vnd.oasis.opendocument.chart": "odc",
  "application/vnd.oasis.opendocument.chart-template": "otc",
  "application/vnd.oasis.opendocument.database": "odb",
  "application/vnd.oasis.opendocument.formula": "odf",
  "application/vnd.oasis.opendocument.formula-template": "odft",
  "application/vnd.oasis.opendocument.graphics": "odg",
  "application/vnd.oasis.opendocument.graphics-template": "otg",
  "application/vnd.oasis.opendocument.image": "odi",
  "application/vnd.oasis.opendocument.image-template": "oti",
  "application/vnd.oasis.opendocument.presentation": "odp",
  "application/vnd.oasis.opendocument.presentation-template": "otp",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "application/vnd.oasis.opendocument.spreadsheet-template": "ots",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/vnd.oasis.opendocument.text-master": "odm",
  "application/vnd.oasis.opendocument.text-template": "ott",
  "application/vnd.oasis.opendocument.text-web": "oth",
  "application/vnd.olpc-sugar": "xo",
  "application/vnd.oma.dd2+xml": "dd2",
  "application/vnd.openofficeorg.extension": "oxt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.presentationml.slide": "sldx",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow": "ppsx",
  "application/vnd.openxmlformats-officedocument.presentationml.template": "potx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template": "xltx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template": "dotx",
  "application/vnd.osgeo.mapguide.package": "mgp",
  "application/vnd.osgi.dp": "dp",
  "application/vnd.osgi.subsystem": "esa",
  "application/vnd.palm": "pdb",
  "application/vnd.pawaafile": "paw",
  "application/vnd.pg.format": "str",
  "application/vnd.pg.osasli": "ei6",
  "application/vnd.picsel": "efif",
  "application/vnd.pmi.widget": "wg",
  "application/vnd.pocketlearn": "plf",
  "application/vnd.powerbuilder6": "pbd",
  "application/vnd.previewsystems.box": "box",
  "application/vnd.proteus.magazine": "mgz",
  "application/vnd.publishare-delta-tree": "qps",
  "application/vnd.pvi.ptid1": "ptid",
  "application/vnd.quark.quarkxpress": "qxd",
  "application/vnd.realvnc.bed": "bed",
  "application/vnd.recordare.musicxml": "mxl",
  "application/vnd.recordare.musicxml+xml": "musicxml",
  "application/vnd.rig.cryptonote": "cryptonote",
  "application/vnd.rim.cod": "cod",
  "application/vnd.rn-realmedia": "rm",
  "application/vnd.rn-realmedia-vbr": "rmvb",
  "application/vnd.route66.link66+xml": "link66",
  "application/vnd.sailingtracker.track": "st",
  "application/vnd.seemail": "see",
  "application/vnd.sema": "sema",
  "application/vnd.semd": "semd",
  "application/vnd.semf": "semf",
  "application/vnd.shana.informed.formdata": "ifm",
  "application/vnd.shana.informed.formtemplate": "itp",
  "application/vnd.shana.informed.interchange": "iif",
  "application/vnd.shana.informed.package": "ipk",
  "application/vnd.simtech-mindmapper": "twd",
  "application/vnd.smaf": "mmf",
  "application/vnd.smart.teacher": "teacher",
  "application/vnd.solent.sdkm+xml": "sdkm",
  "application/vnd.spotfire.dxp": "dxp",
  "application/vnd.spotfire.sfs": "sfs",
  "application/vnd.stardivision.calc": "sdc",
  "application/vnd.stardivision.draw": "sda",
  "application/vnd.stardivision.impress": "sdd",
  "application/vnd.stardivision.math": "smf",
  "application/vnd.stardivision.writer": "sdw",
  "application/vnd.stardivision.writer-global": "sgl",
  "application/vnd.stepmania.package": "smzip",
  "application/vnd.stepmania.stepchart": "sm",
  "application/vnd.sun.xml.calc": "sxc",
  "application/vnd.sun.xml.calc.template": "stc",
  "application/vnd.sun.xml.draw": "sxd",
  "application/vnd.sun.xml.draw.template": "std",
  "application/vnd.sun.xml.impress": "sxi",
  "application/vnd.sun.xml.impress.template": "sti",
  "application/vnd.sun.xml.math": "sxm",
  "application/vnd.sun.xml.writer": "sxw",
  "application/vnd.sun.xml.writer.global": "sxg",
  "application/vnd.sun.xml.writer.template": "stw",
  "application/vnd.sus-calendar": "sus",
  "application/vnd.svd": "svd",
  "application/vnd.symbian.install": "sis",
  "application/vnd.syncml+xml": "xsm",
  "application/vnd.syncml.dm+wbxml": "bdm",
  "application/vnd.syncml.dm+xml": "xdm",
  "application/vnd.tao.intent-module-archive": "tao",
  "application/vnd.tcpdump.pcap": "pcap",
  "application/vnd.tmobile-livetv": "tmo",
  "application/vnd.trid.tpt": "tpt",
  "application/vnd.triscape.mxs": "mxs",
  "application/vnd.trueapp": "tra",
  "application/vnd.ufdl": "ufd",
  "application/vnd.uiq.theme": "utz",
  "application/vnd.umajin": "umj",
  "application/vnd.unity": "unityweb",
  "application/vnd.uoml+xml": "uoml",
  "application/vnd.vcx": "vcx",
  "application/vnd.visio": "vsd",
  "application/vnd.visionary": "vis",
  "application/vnd.vsf": "vsf",
  "application/vnd.wap.wbxml": "wbxml",
  "application/vnd.wap.wmlc": "wmlc",
  "application/vnd.wap.wmlscriptc": "wmlsc",
  "application/vnd.webturbo": "wtb",
  "application/vnd.wolfram.player": "nbp",
  "application/vnd.wordperfect": "wpd",
  "application/vnd.wqd": "wqd",
  "application/vnd.wt.stf": "stf",
  "application/vnd.xara": "xar",
  "application/vnd.xfdl": "xfdl",
  "application/vnd.yamaha.hv-dic": "hvd",
  "application/vnd.yamaha.hv-script": "hvs",
  "application/vnd.yamaha.hv-voice": "hvp",
  "application/vnd.yamaha.openscoreformat": "osf",
  "application/vnd.yamaha.openscoreformat.osfpvg+xml": "osfpvg",
  "application/vnd.yamaha.smaf-audio": "saf",
  "application/vnd.yamaha.smaf-phrase": "spf",
  "application/vnd.yellowriver-custom-menu": "cmp",
  "application/vnd.zul": "zir",
  "application/vnd.zzazz.deck+xml": "zaz",
  "application/voicexml+xml": "vxml",
  "application/widget": "wgt",
  "application/winhlp": "hlp",
  "application/wsdl+xml": "wsdl",
  "application/wspolicy+xml": "wspolicy",
  "application/x-7z-compressed": "7z",
  "application/x-abiword": "abw",
  "application/x-ace-compressed": "ace",
  "application/x-apple-diskimage": "dmg",
  "application/x-authorware-bin": "aab",
  "application/x-authorware-map": "aam",
  "application/x-authorware-seg": "aas",
  "application/x-bcpio": "bcpio",
  "application/x-bittorrent": "torrent",
  "application/x-blorb": "blb",
  "application/x-bzip": "bz",
  "application/x-bzip2": "bz2",
  "application/x-cbr": "cbr",
  "application/x-cdlink": "vcd",
  "application/x-cfs-compressed": "cfs",
  "application/x-chat": "chat",
  "application/x-chess-pgn": "pgn",
  "application/x-conference": "nsc",
  "application/x-cpio": "cpio",
  "application/x-csh": "csh",
  "application/x-debian-package": "deb",
  "application/x-dgc-compressed": "dgc",
  "application/x-director": "dir",
  "application/x-doom": "wad",
  "application/x-dtbncx+xml": "ncx",
  "application/x-dtbook+xml": "dtb",
  "application/x-dtbresource+xml": "res",
  "application/x-dvi": "dvi",
  "application/x-envoy": "evy",
  "application/x-eva": "eva",
  "application/x-font-bdf": "bdf",
  "application/x-font-ghostscript": "gsf",
  "application/x-font-linux-psf": "psf",
  "application/x-font-otf": "otf",
  "application/x-font-pcf": "pcf",
  "application/x-font-snf": "snf",
  "application/x-font-ttf": "ttf",
  "application/x-font-type1": "pfa",
  "application/x-font-woff": "woff",
  "application/x-freearc": "arc",
  "application/x-futuresplash": "spl",
  "application/x-gca-compressed": "gca",
  "application/x-glulx": "ulx",
  "application/x-gnumeric": "gnumeric",
  "application/x-gramps-xml": "gramps",
  "application/x-gtar": "gtar",
  "application/x-hdf": "hdf",
  "application/x-install-instructions": "install",
  "application/x-iso9660-image": "iso",
  "application/x-java-jnlp-file": "jnlp",
  "application/x-latex": "latex",
  "application/x-lzh-compressed": "lzh",
  "application/x-mie": "mie",
  "application/x-mobipocket-ebook": "prc",
  "application/x-ms-application": "application",
  "application/x-ms-shortcut": "lnk",
  "application/x-ms-wmd": "wmd",
  "application/x-ms-wmz": "wmz",
  "application/x-ms-xbap": "xbap",
  "application/x-msaccess": "mdb",
  "application/x-msbinder": "obd",
  "application/x-mscardfile": "crd",
  "application/x-msclip": "clp",
  "application/x-msdownload": "exe",
  "application/x-msmediaview": "mvb",
  "application/x-msmetafile": "wmf",
  "application/x-msmoney": "mny",
  "application/x-mspublisher": "pub",
  "application/x-msschedule": "scd",
  "application/x-msterminal": "trm",
  "application/x-mswrite": "wri",
  "application/x-netcdf": "nc",
  "application/x-nzb": "nzb",
  "application/x-pkcs12": "p12",
  "application/x-pkcs7-certificates": "p7b",
  "application/x-pkcs7-certreqresp": "p7r",
  "application/x-rar-compressed": "rar",
  "application/x-research-info-systems": "ris",
  "application/x-sh": "sh",
  "application/x-shar": "shar",
  "application/x-shockwave-flash": "swf",
  "application/x-silverlight-app": "xap",
  "application/x-sql": "sql",
  "application/x-stuffit": "sit",
  "application/x-stuffitx": "sitx",
  "application/x-subrip": "srt",
  "application/x-sv4cpio": "sv4cpio",
  "application/x-sv4crc": "sv4crc",
  "application/x-t3vm-image": "t3",
  "application/x-tads": "gam",
  "application/x-tar": "tar",
  "application/x-tcl": "tcl",
  "application/x-tex": "tex",
  "application/x-tex-tfm": "tfm",
  "application/x-texinfo": "texinfo",
  "application/x-tgif": "obj",
  "application/x-ustar": "ustar",
  "application/x-wais-source": "src",
  "application/x-x509-ca-cert": "der",
  "application/x-xfig": "fig",
  "application/x-xliff+xml": "xlf",
  "application/x-xpinstall": "xpi",
  "application/x-xz": "xz",
  "application/x-zmachine": "z1",
  "application/xaml+xml": "xaml",
  "application/xcap-diff+xml": "xdf",
  "application/xenc+xml": "xenc",
  "application/xhtml+xml": "xhtml",
  "application/xml": "xml",
  "application/xml-dtd": "dtd",
  "application/xop+xml": "xop",
  "application/xproc+xml": "xpl",
  "application/xslt+xml": "xslt",
  "application/xspf+xml": "xspf",
  "application/xv+xml": "mxml",
  "application/yang": "yang",
  "application/yin+xml": "yin",
  "application/zip": "zip",
  "audio/adpcm": "adp",
  "audio/basic": "au",
  "audio/midi": "mid",
  "audio/mp4": "mp4a",
  "audio/mpeg": "mpga",
  "audio/ogg": "oga",
  "audio/s3m": "s3m",
  "audio/silk": "sil",
  "audio/vnd.dece.audio": "uva",
  "audio/vnd.digital-winds": "eol",
  "audio/vnd.dra": "dra",
  "audio/vnd.dts": "dts",
  "audio/vnd.dts.hd": "dtshd",
  "audio/vnd.lucent.voice": "lvp",
  "audio/vnd.ms-playready.media.pya": "pya",
  "audio/vnd.nuera.ecelp4800": "ecelp4800",
  "audio/vnd.nuera.ecelp7470": "ecelp7470",
  "audio/vnd.nuera.ecelp9600": "ecelp9600",
  "audio/vnd.rip": "rip",
  "audio/webm": "weba",
  "audio/x-aac": "aac",
  "audio/x-aiff": "aif",
  "audio/x-caf": "caf",
  "audio/x-flac": "flac",
  "audio/x-matroska": "mka",
  "audio/x-mpegurl": "m3u",
  "audio/x-ms-wax": "wax",
  "audio/x-ms-wma": "wma",
  "audio/x-pn-realaudio": "ram",
  "audio/x-pn-realaudio-plugin": "rmp",
  "audio/x-wav": "wav",
  "audio/xm": "xm",
  "chemical/x-cdx": "cdx",
  "chemical/x-cif": "cif",
  "chemical/x-cmdf": "cmdf",
  "chemical/x-cml": "cml",
  "chemical/x-csml": "csml",
  "chemical/x-xyz": "xyz",
  "image/bmp": "bmp",
  "image/cgm": "cgm",
  "image/g3fax": "g3",
  "image/gif": "gif",
  "image/ief": "ief",
  "image/jpeg": "jpeg",
  "image/ktx": "ktx",
  "image/png": "png",
  "image/prs.btif": "btif",
  "image/sgi": "sgi",
  "image/svg+xml": "svg",
  "image/tiff": "tiff",
  "image/vnd.adobe.photoshop": "psd",
  "image/vnd.dece.graphic": "uvi",
  "image/vnd.dvb.subtitle": "sub",
  "image/vnd.djvu": "djvu",
  "image/vnd.dwg": "dwg",
  "image/vnd.dxf": "dxf",
  "image/vnd.fastbidsheet": "fbs",
  "image/vnd.fpx": "fpx",
  "image/vnd.fst": "fst",
  "image/vnd.fujixerox.edmics-mmr": "mmr",
  "image/vnd.fujixerox.edmics-rlc": "rlc",
  "image/vnd.ms-modi": "mdi",
  "image/vnd.ms-photo": "wdp",
  "image/vnd.net-fpx": "npx",
  "image/vnd.wap.wbmp": "wbmp",
  "image/vnd.xiff": "xif",
  "image/webp": "webp",
  "image/x-3ds": "3ds",
  "image/x-cmu-raster": "ras",
  "image/x-cmx": "cmx",
  "image/x-freehand": "fh",
  "image/x-icon": "ico",
  "image/x-mrsid-image": "sid",
  "image/x-pcx": "pcx",
  "image/x-pict": "pic",
  "image/x-portable-anymap": "pnm",
  "image/x-portable-bitmap": "pbm",
  "image/x-portable-graymap": "pgm",
  "image/x-portable-pixmap": "ppm",
  "image/x-rgb": "rgb",
  "image/x-tga": "tga",
  "image/x-xbitmap": "xbm",
  "image/x-xpixmap": "xpm",
  "image/x-xwindowdump": "xwd",
  "message/rfc822": "eml",
  "model/iges": "igs",
  "model/mesh": "msh",
  "model/vnd.collada+xml": "dae",
  "model/vnd.dwf": "dwf",
  "model/vnd.gdl": "gdl",
  "model/vnd.gtw": "gtw",
  "model/vnd.mts": "mts",
  "model/vnd.vtu": "vtu",
  "model/vrml": "wrl",
  "model/x3d+binary": "x3db",
  "model/x3d+vrml": "x3dv",
  "model/x3d+xml": "x3d",
  "text/cache-manifest": "appcache",
  "text/calendar": "ics",
  "text/css": "css",
  "text/csv": "csv",
  "text/html": "html",
  "text/n3": "n3",
  "text/plain": "txt",
  "text/prs.lines.tag": "dsc",
  "text/richtext": "rtx",
  "text/sgml": "sgml",
  "text/tab-separated-values": "tsv",
  "text/troff": "t",
  "text/turtle": "ttl",
  "text/uri-list": "uri",
  "text/vcard": "vcard",
  "text/vnd.curl": "curl",
  "text/vnd.curl.dcurl": "dcurl",
  "text/vnd.curl.scurl": "scurl",
  "text/vnd.curl.mcurl": "mcurl",
  "text/vnd.dvb.subtitle": "sub",
  "text/vnd.fly": "fly",
  "text/vnd.fmi.flexstor": "flx",
  "text/vnd.graphviz": "gv",
  "text/vnd.in3d.3dml": "3dml",
  "text/vnd.in3d.spot": "spot",
  "text/vnd.sun.j2me.app-descriptor": "jad",
  "text/vnd.wap.wml": "wml",
  "text/vnd.wap.wmlscript": "wmls",
  "text/x-asm": "s",
  "text/x-c": "c",
  "text/x-fortran": "f",
  "text/x-java-source": "java",
  "text/x-opml": "opml",
  "text/x-pascal": "p",
  "text/x-nfo": "nfo",
  "text/x-setext": "etx",
  "text/x-sfv": "sfv",
  "text/x-uuencode": "uu",
  "text/x-vcalendar": "vcs",
  "text/x-vcard": "vcf",
  "video/3gpp": "3gp",
  "video/3gpp2": "3g2",
  "video/h261": "h261",
  "video/h263": "h263",
  "video/h264": "h264",
  "video/jpeg": "jpgv",
  "video/jpm": "jpm",
  "video/mj2": "mj2",
  "video/mp4": "mp4",
  "video/mpeg": "mpeg",
  "video/ogg": "ogv",
  "video/quicktime": "qt",
  "video/vnd.dece.hd": "uvh",
  "video/vnd.dece.mobile": "uvm",
  "video/vnd.dece.pd": "uvp",
  "video/vnd.dece.sd": "uvs",
  "video/vnd.dece.video": "uvv",
  "video/vnd.dvb.file": "dvb",
  "video/vnd.fvt": "fvt",
  "video/vnd.mpegurl": "mxu",
  "video/vnd.ms-playready.media.pyv": "pyv",
  "video/vnd.uvvu.mp4": "uvu",
  "video/vnd.vivo": "viv",
  "video/webm": "webm",
  "video/x-f4v": "f4v",
  "video/x-fli": "fli",
  "video/x-flv": "flv",
  "video/x-m4v": "m4v",
  "video/x-matroska": "mkv",
  "video/x-mng": "mng",
  "video/x-ms-asf": "asf",
  "video/x-ms-vob": "vob",
  "video/x-ms-wm": "wm",
  "video/x-ms-wmv": "wmv",
  "video/x-ms-wmx": "wmx",
  "video/x-ms-wvx": "wvx",
  "video/x-msvideo": "avi",
  "video/x-sgi-movie": "movie",
  "video/x-smv": "smv",
  "x-conference/x-cooltalk": "ice",
  "text/vtt": "vtt",
  "application/x-chrome-extension": "crx",
  "text/x-component": "htc",
  "video/MP2T": "ts",
  "text/event-stream": "event-stream",
  "application/x-web-app-manifest+json": "webapp",
  "text/x-lua": "lua",
  "application/x-lua-bytecode": "luac",
  "text/x-markdown": "markdown"
}
  , extension: function (mimeType) {
  var type = mimeType.match(/^\s*([^;\s]*)(?:;|\s|$)/)[1].toLowerCase();
  return this.extensions[type];
}
  , define: function (map) {
  for (var type in map) {
    var exts = map[type];

    for (var i = 0; i < exts.length; i++) {
      if (false && this.types[exts]) {
        console.warn(this._loading.replace(/.*\//, ''), 'changes "' + exts[i] + '" extension type from ' +
          this.types[exts] + ' to ' + type);
      }

      this.types[exts[i]] = type;
    }

    // Default extension is the first one we encounter
    if (!this.extensions[type]) {
      this.extensions[type] = exts[0];
    }
  }
}
  , charsets: {lookup: function (mimeType, fallback) {
    // Assume text types are utf8
    return (/^text\//).test(mimeType) ? 'UTF-8' : fallback;
  }}
}
mime.types.constructor = undefined
mime.extensions.constructor = undefined
},{}],21:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],22:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],23:[function(require,module,exports){
(function (global){
'use strict';

var buffer = require('buffer');
var Buffer = buffer.Buffer;
var SlowBuffer = buffer.SlowBuffer;
var MAX_LEN = buffer.kMaxLength || 2147483647;
exports.alloc = function alloc(size, fill, encoding) {
  if (typeof Buffer.alloc === 'function') {
    return Buffer.alloc(size, fill, encoding);
  }
  if (typeof encoding === 'number') {
    throw new TypeError('encoding must not be number');
  }
  if (typeof size !== 'number') {
    throw new TypeError('size must be a number');
  }
  if (size > MAX_LEN) {
    throw new RangeError('size is too large');
  }
  var enc = encoding;
  var _fill = fill;
  if (_fill === undefined) {
    enc = undefined;
    _fill = 0;
  }
  var buf = new Buffer(size);
  if (typeof _fill === 'string') {
    var fillBuf = new Buffer(_fill, enc);
    var flen = fillBuf.length;
    var i = -1;
    while (++i < size) {
      buf[i] = fillBuf[i % flen];
    }
  } else {
    buf.fill(_fill);
  }
  return buf;
}
exports.allocUnsafe = function allocUnsafe(size) {
  if (typeof Buffer.allocUnsafe === 'function') {
    return Buffer.allocUnsafe(size);
  }
  if (typeof size !== 'number') {
    throw new TypeError('size must be a number');
  }
  if (size > MAX_LEN) {
    throw new RangeError('size is too large');
  }
  return new Buffer(size);
}
exports.from = function from(value, encodingOrOffset, length) {
  if (typeof Buffer.from === 'function' && (!global.Uint8Array || Uint8Array.from !== Buffer.from)) {
    return Buffer.from(value, encodingOrOffset, length);
  }
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number');
  }
  if (typeof value === 'string') {
    return new Buffer(value, encodingOrOffset);
  }
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    var offset = encodingOrOffset;
    if (arguments.length === 1) {
      return new Buffer(value);
    }
    if (typeof offset === 'undefined') {
      offset = 0;
    }
    var len = length;
    if (typeof len === 'undefined') {
      len = value.byteLength - offset;
    }
    if (offset >= value.byteLength) {
      throw new RangeError('\'offset\' is out of bounds');
    }
    if (len > value.byteLength - offset) {
      throw new RangeError('\'length\' is out of bounds');
    }
    return new Buffer(value.slice(offset, offset + len));
  }
  if (Buffer.isBuffer(value)) {
    var out = new Buffer(value.length);
    value.copy(out, 0, 0, value.length);
    return out;
  }
  if (value) {
    if (Array.isArray(value) || (typeof ArrayBuffer !== 'undefined' && value.buffer instanceof ArrayBuffer) || 'length' in value) {
      return new Buffer(value);
    }
    if (value.type === 'Buffer' && Array.isArray(value.data)) {
      return new Buffer(value.data);
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ' + 'ArrayBuffer, Array, or array-like object.');
}
exports.allocUnsafeSlow = function allocUnsafeSlow(size) {
  if (typeof Buffer.allocUnsafeSlow === 'function') {
    return Buffer.allocUnsafeSlow(size);
  }
  if (typeof size !== 'number') {
    throw new TypeError('size must be a number');
  }
  if (size >= MAX_LEN) {
    throw new RangeError('size is too large');
  }
  return new SlowBuffer(size);
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"buffer":24}],24:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":5,"ieee754":54,"isarray":61}],25:[function(require,module,exports){
module.exports = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Unordered Collection",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended",
  "511": "Network Authentication Required"
}

},{}],26:[function(require,module,exports){
module.exports = ChunkStoreWriteStream

var BlockStream = require('block-stream2')
var inherits = require('inherits')
var stream = require('readable-stream')

inherits(ChunkStoreWriteStream, stream.Writable)

function ChunkStoreWriteStream (store, chunkLength, opts) {
  var self = this
  if (!(self instanceof ChunkStoreWriteStream)) {
    return new ChunkStoreWriteStream(store, chunkLength, opts)
  }
  stream.Writable.call(self, opts)
  if (!opts) opts = {}

  if (!store || !store.put || !store.get) {
    throw new Error('First argument must be an abstract-chunk-store compliant store')
  }
  chunkLength = Number(chunkLength)
  if (!chunkLength) throw new Error('Second argument must be a chunk length')

  self._blockstream = new BlockStream(chunkLength, { zeroPadding: false })

  self._blockstream
    .on('data', onData)
    .on('error', function (err) { self.destroy(err) })

  var index = 0
  function onData (chunk) {
    if (self.destroyed) return
    store.put(index, chunk)
    index += 1
  }

  self.on('finish', function () { this._blockstream.end() })
}

ChunkStoreWriteStream.prototype._write = function (chunk, encoding, callback) {
  this._blockstream.write(chunk, encoding, callback)
}

ChunkStoreWriteStream.prototype.destroy = function (err) {
  if (this.destroyed) return
  this.destroyed = true

  if (err) this.emit('error', err)
  this.emit('close')
}

},{"block-stream2":18,"inherits":56,"readable-stream":97}],27:[function(require,module,exports){
(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['module', 'select'], factory);
    } else if (typeof exports !== "undefined") {
        factory(module, require('select'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod, global.select);
        global.clipboardAction = mod.exports;
    }
})(this, function (module, _select) {
    'use strict';

    var _select2 = _interopRequireDefault(_select);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
        return typeof obj;
    } : function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var ClipboardAction = function () {
        /**
         * @param {Object} options
         */
        function ClipboardAction(options) {
            _classCallCheck(this, ClipboardAction);

            this.resolveOptions(options);
            this.initSelection();
        }

        /**
         * Defines base properties passed from constructor.
         * @param {Object} options
         */


        _createClass(ClipboardAction, [{
            key: 'resolveOptions',
            value: function resolveOptions() {
                var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

                this.action = options.action;
                this.emitter = options.emitter;
                this.target = options.target;
                this.text = options.text;
                this.trigger = options.trigger;

                this.selectedText = '';
            }
        }, {
            key: 'initSelection',
            value: function initSelection() {
                if (this.text) {
                    this.selectFake();
                } else if (this.target) {
                    this.selectTarget();
                }
            }
        }, {
            key: 'selectFake',
            value: function selectFake() {
                var _this = this;

                var isRTL = document.documentElement.getAttribute('dir') == 'rtl';

                this.removeFake();

                this.fakeHandlerCallback = function () {
                    return _this.removeFake();
                };
                this.fakeHandler = document.body.addEventListener('click', this.fakeHandlerCallback) || true;

                this.fakeElem = document.createElement('textarea');
                // Prevent zooming on iOS
                this.fakeElem.style.fontSize = '12pt';
                // Reset box model
                this.fakeElem.style.border = '0';
                this.fakeElem.style.padding = '0';
                this.fakeElem.style.margin = '0';
                // Move element out of screen horizontally
                this.fakeElem.style.position = 'absolute';
                this.fakeElem.style[isRTL ? 'right' : 'left'] = '-9999px';
                // Move element to the same position vertically
                var yPosition = window.pageYOffset || document.documentElement.scrollTop;
                this.fakeElem.addEventListener('focus', window.scrollTo(0, yPosition));
                this.fakeElem.style.top = yPosition + 'px';

                this.fakeElem.setAttribute('readonly', '');
                this.fakeElem.value = this.text;

                document.body.appendChild(this.fakeElem);

                this.selectedText = (0, _select2.default)(this.fakeElem);
                this.copyText();
            }
        }, {
            key: 'removeFake',
            value: function removeFake() {
                if (this.fakeHandler) {
                    document.body.removeEventListener('click', this.fakeHandlerCallback);
                    this.fakeHandler = null;
                    this.fakeHandlerCallback = null;
                }

                if (this.fakeElem) {
                    document.body.removeChild(this.fakeElem);
                    this.fakeElem = null;
                }
            }
        }, {
            key: 'selectTarget',
            value: function selectTarget() {
                this.selectedText = (0, _select2.default)(this.target);
                this.copyText();
            }
        }, {
            key: 'copyText',
            value: function copyText() {
                var succeeded = void 0;

                try {
                    succeeded = document.execCommand(this.action);
                } catch (err) {
                    succeeded = false;
                }

                this.handleResult(succeeded);
            }
        }, {
            key: 'handleResult',
            value: function handleResult(succeeded) {
                this.emitter.emit(succeeded ? 'success' : 'error', {
                    action: this.action,
                    text: this.selectedText,
                    trigger: this.trigger,
                    clearSelection: this.clearSelection.bind(this)
                });
            }
        }, {
            key: 'clearSelection',
            value: function clearSelection() {
                if (this.target) {
                    this.target.blur();
                }

                window.getSelection().removeAllRanges();
            }
        }, {
            key: 'destroy',
            value: function destroy() {
                this.removeFake();
            }
        }, {
            key: 'action',
            set: function set() {
                var action = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'copy';

                this._action = action;

                if (this._action !== 'copy' && this._action !== 'cut') {
                    throw new Error('Invalid "action" value, use either "copy" or "cut"');
                }
            },
            get: function get() {
                return this._action;
            }
        }, {
            key: 'target',
            set: function set(target) {
                if (target !== undefined) {
                    if (target && (typeof target === 'undefined' ? 'undefined' : _typeof(target)) === 'object' && target.nodeType === 1) {
                        if (this.action === 'copy' && target.hasAttribute('disabled')) {
                            throw new Error('Invalid "target" attribute. Please use "readonly" instead of "disabled" attribute');
                        }

                        if (this.action === 'cut' && (target.hasAttribute('readonly') || target.hasAttribute('disabled'))) {
                            throw new Error('Invalid "target" attribute. You can\'t cut text from elements with "readonly" or "disabled" attributes');
                        }

                        this._target = target;
                    } else {
                        throw new Error('Invalid "target" value, use a valid Element');
                    }
                }
            },
            get: function get() {
                return this._target;
            }
        }]);

        return ClipboardAction;
    }();

    module.exports = ClipboardAction;
});
},{"select":104}],28:[function(require,module,exports){
(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['module', './clipboard-action', 'tiny-emitter', 'good-listener'], factory);
    } else if (typeof exports !== "undefined") {
        factory(module, require('./clipboard-action'), require('tiny-emitter'), require('good-listener'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod, global.clipboardAction, global.tinyEmitter, global.goodListener);
        global.clipboard = mod.exports;
    }
})(this, function (module, _clipboardAction, _tinyEmitter, _goodListener) {
    'use strict';

    var _clipboardAction2 = _interopRequireDefault(_clipboardAction);

    var _tinyEmitter2 = _interopRequireDefault(_tinyEmitter);

    var _goodListener2 = _interopRequireDefault(_goodListener);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var Clipboard = function (_Emitter) {
        _inherits(Clipboard, _Emitter);

        /**
         * @param {String|HTMLElement|HTMLCollection|NodeList} trigger
         * @param {Object} options
         */
        function Clipboard(trigger, options) {
            _classCallCheck(this, Clipboard);

            var _this = _possibleConstructorReturn(this, (Clipboard.__proto__ || Object.getPrototypeOf(Clipboard)).call(this));

            _this.resolveOptions(options);
            _this.listenClick(trigger);
            return _this;
        }

        /**
         * Defines if attributes would be resolved using internal setter functions
         * or custom functions that were passed in the constructor.
         * @param {Object} options
         */


        _createClass(Clipboard, [{
            key: 'resolveOptions',
            value: function resolveOptions() {
                var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

                this.action = typeof options.action === 'function' ? options.action : this.defaultAction;
                this.target = typeof options.target === 'function' ? options.target : this.defaultTarget;
                this.text = typeof options.text === 'function' ? options.text : this.defaultText;
            }
        }, {
            key: 'listenClick',
            value: function listenClick(trigger) {
                var _this2 = this;

                this.listener = (0, _goodListener2.default)(trigger, 'click', function (e) {
                    return _this2.onClick(e);
                });
            }
        }, {
            key: 'onClick',
            value: function onClick(e) {
                var trigger = e.delegateTarget || e.currentTarget;

                if (this.clipboardAction) {
                    this.clipboardAction = null;
                }

                this.clipboardAction = new _clipboardAction2.default({
                    action: this.action(trigger),
                    target: this.target(trigger),
                    text: this.text(trigger),
                    trigger: trigger,
                    emitter: this
                });
            }
        }, {
            key: 'defaultAction',
            value: function defaultAction(trigger) {
                return getAttributeValue('action', trigger);
            }
        }, {
            key: 'defaultTarget',
            value: function defaultTarget(trigger) {
                var selector = getAttributeValue('target', trigger);

                if (selector) {
                    return document.querySelector(selector);
                }
            }
        }, {
            key: 'defaultText',
            value: function defaultText(trigger) {
                return getAttributeValue('text', trigger);
            }
        }, {
            key: 'destroy',
            value: function destroy() {
                this.listener.destroy();

                if (this.clipboardAction) {
                    this.clipboardAction.destroy();
                    this.clipboardAction = null;
                }
            }
        }]);

        return Clipboard;
    }(_tinyEmitter2.default);

    /**
     * Helper function to retrieve attribute value.
     * @param {String} suffix
     * @param {Element} element
     */
    function getAttributeValue(suffix, element) {
        var attribute = 'data-clipboard-' + suffix;

        if (!element.hasAttribute(attribute)) {
            return;
        }

        return element.getAttribute(attribute);
    }

    module.exports = Clipboard;
});
},{"./clipboard-action":27,"good-listener":50,"tiny-emitter":121}],29:[function(require,module,exports){
module.exports = function(target, numbers) {
  var closest = Infinity
  var difference = 0
  var winner = null

  numbers.sort(function(a, b) {
    return a - b
  })

  for (var i = 0, l = numbers.length; i < l; i++) {  
    difference = Math.abs(target - numbers[i])
    if (difference >= closest) {
      break
    }
    closest = difference
    winner = numbers[i]
  }

  return winner
}

},{}],30:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this,{"isBuffer":require("../../is-buffer/index.js")})
},{"../../is-buffer/index.js":58}],31:[function(require,module,exports){
(function (process,global,Buffer){
module.exports = createTorrent
module.exports.parseInput = parseInput

module.exports.announceList = [
  [ 'udp://tracker.openbittorrent.com:80' ],
  [ 'udp://tracker.internetwarriors.net:1337' ],
  [ 'udp://tracker.leechers-paradise.org:6969' ],
  [ 'udp://tracker.coppersurfer.tk:6969' ],
  [ 'udp://exodus.desync.com:6969' ],
  [ 'wss://tracker.btorrent.xyz' ],
  [ 'wss://tracker.openwebtorrent.com' ],
  [ 'wss://tracker.fastcast.nz' ]
]

var bencode = require('bencode')
var BlockStream = require('block-stream2')
var calcPieceLength = require('piece-length')
var corePath = require('path')
var extend = require('xtend')
var FileReadStream = require('filestream/read')
var flatten = require('flatten')
var fs = require('fs')
var isFile = require('is-file')
var junk = require('junk')
var MultiStream = require('multistream')
var once = require('once')
var parallel = require('run-parallel')
var sha1 = require('simple-sha1')
var stream = require('readable-stream')

/**
 * Create a torrent.
 * @param  {string|File|FileList|Buffer|Stream|Array.<string|File|Buffer|Stream>} input
 * @param  {Object} opts
 * @param  {string=} opts.name
 * @param  {Date=} opts.creationDate
 * @param  {string=} opts.comment
 * @param  {string=} opts.createdBy
 * @param  {boolean|number=} opts.private
 * @param  {number=} opts.pieceLength
 * @param  {Array.<Array.<string>>=} opts.announceList
 * @param  {Array.<string>=} opts.urlList
 * @param  {function} cb
 * @return {Buffer} buffer of .torrent file data
 */
function createTorrent (input, opts, cb) {
  if (typeof opts === 'function') return createTorrent(input, null, opts)
  opts = opts ? extend(opts) : {}

  _parseInput(input, opts, function (err, files, singleFileTorrent) {
    if (err) return cb(err)
    opts.singleFileTorrent = singleFileTorrent
    onFiles(files, opts, cb)
  })
}

function parseInput (input, opts, cb) {
  if (typeof opts === 'function') return parseInput(input, null, opts)
  opts = opts ? extend(opts) : {}
  _parseInput(input, opts, cb)
}

/**
 * Parse input file and return file information.
 */
function _parseInput (input, opts, cb) {
  if (Array.isArray(input) && input.length === 0) throw new Error('invalid input type')

  if (isFileList(input)) input = Array.prototype.slice.call(input)
  if (!Array.isArray(input)) input = [ input ]

  // In Electron, use the true file path
  input = input.map(function (item) {
    if (isBlob(item) && typeof item.path === 'string' && typeof fs.stat === 'function') return item.path
    return item
  })

  // If there's just one file, allow the name to be set by `opts.name`
  if (input.length === 1 && typeof input[0] !== 'string' && !input[0].name) input[0].name = opts.name

  var commonPrefix = null
  input.forEach(function (item, i) {
    if (typeof item === 'string') {
      return
    }

    var path = item.fullPath || item.name
    if (!path) {
      path = 'Unknown File ' + (i + 1)
      item.unknownName = true
    }

    item.path = path.split('/')

    // Remove initial slash
    if (!item.path[0]) {
      item.path.shift()
    }

    if (item.path.length < 2) { // No real prefix
      commonPrefix = null
    } else if (i === 0 && input.length > 1) { // The first file has a prefix
      commonPrefix = item.path[0]
    } else if (item.path[0] !== commonPrefix) { // The prefix doesn't match
      commonPrefix = null
    }
  })

  // remove junk files
  input = input.filter(function (item) {
    if (typeof item === 'string') {
      return true
    }
    var filename = item.path[item.path.length - 1]
    return notHidden(filename) && junk.not(filename)
  })

  if (commonPrefix) {
    input.forEach(function (item) {
      var pathless = (Buffer.isBuffer(item) || isReadable(item)) && !item.path
      if (typeof item === 'string' || pathless) return
      item.path.shift()
    })
  }

  if (!opts.name && commonPrefix) {
    opts.name = commonPrefix
  }

  if (!opts.name) {
    // use first user-set file name
    input.some(function (item) {
      if (typeof item === 'string') {
        opts.name = corePath.basename(item)
        return true
      } else if (!item.unknownName) {
        opts.name = item.path[item.path.length - 1]
        return true
      }
    })
  }

  if (!opts.name) {
    opts.name = 'Unnamed Torrent ' + Date.now()
  }

  var numPaths = input.reduce(function (sum, item) {
    return sum + Number(typeof item === 'string')
  }, 0)

  var isSingleFileTorrent = (input.length === 1)

  if (input.length === 1 && typeof input[0] === 'string') {
    if (typeof fs.stat !== 'function') {
      throw new Error('filesystem paths do not work in the browser')
    }
    // If there's a single path, verify it's a file before deciding this is a single
    // file torrent
    isFile(input[0], function (err, pathIsFile) {
      if (err) return cb(err)
      isSingleFileTorrent = pathIsFile
      processInput()
    })
  } else {
    process.nextTick(function () {
      processInput()
    })
  }

  function processInput () {
    parallel(input.map(function (item) {
      return function (cb) {
        var file = {}

        if (isBlob(item)) {
          file.getStream = getBlobStream(item)
          file.length = item.size
        } else if (Buffer.isBuffer(item)) {
          file.getStream = getBufferStream(item)
          file.length = item.length
        } else if (isReadable(item)) {
          file.getStream = getStreamStream(item, file)
          file.length = 0
        } else if (typeof item === 'string') {
          if (typeof fs.stat !== 'function') {
            throw new Error('filesystem paths do not work in the browser')
          }
          var keepRoot = numPaths > 1 || isSingleFileTorrent
          getFiles(item, keepRoot, cb)
          return // early return!
        } else {
          throw new Error('invalid input type')
        }
        file.path = item.path
        cb(null, file)
      }
    }), function (err, files) {
      if (err) return cb(err)
      files = flatten(files)
      cb(null, files, isSingleFileTorrent)
    })
  }
}

function getFiles (path, keepRoot, cb) {
  traversePath(path, getFileInfo, function (err, files) {
    if (err) return cb(err)

    if (Array.isArray(files)) files = flatten(files)
    else files = [ files ]

    path = corePath.normalize(path)
    if (keepRoot) {
      path = path.slice(0, path.lastIndexOf(corePath.sep) + 1)
    }
    if (path[path.length - 1] !== corePath.sep) path += corePath.sep

    files.forEach(function (file) {
      file.getStream = getFilePathStream(file.path)
      file.path = file.path.replace(path, '').split(corePath.sep)
    })
    cb(null, files)
  })
}

function getFileInfo (path, cb) {
  cb = once(cb)
  fs.stat(path, function (err, stat) {
    if (err) return cb(err)
    var info = {
      length: stat.size,
      path: path
    }
    cb(null, info)
  })
}

function traversePath (path, fn, cb) {
  fs.readdir(path, function (err, entries) {
    if (err && err.code === 'ENOTDIR') {
      // this is a file
      fn(path, cb)
    } else if (err) {
      // real error
      cb(err)
    } else {
      // this is a folder
      parallel(entries.filter(notHidden).filter(junk.not).map(function (entry) {
        return function (cb) {
          traversePath(corePath.join(path, entry), fn, cb)
        }
      }), cb)
    }
  })
}

function notHidden (file) {
  return file[0] !== '.'
}

function getPieceList (files, pieceLength, cb) {
  cb = once(cb)
  var pieces = []
  var length = 0

  var streams = files.map(function (file) {
    return file.getStream
  })

  var remainingHashes = 0
  var pieceNum = 0
  var ended = false

  var multistream = new MultiStream(streams)
  var blockstream = new BlockStream(pieceLength, { zeroPadding: false })

  multistream.on('error', onError)

  multistream
    .pipe(blockstream)
    .on('data', onData)
    .on('end', onEnd)
    .on('error', onError)

  function onData (chunk) {
    length += chunk.length

    var i = pieceNum
    sha1(chunk, function (hash) {
      pieces[i] = hash
      remainingHashes -= 1
      maybeDone()
    })
    remainingHashes += 1
    pieceNum += 1
  }

  function onEnd () {
    ended = true
    maybeDone()
  }

  function onError (err) {
    cleanup()
    cb(err)
  }

  function cleanup () {
    multistream.removeListener('error', onError)
    blockstream.removeListener('data', onData)
    blockstream.removeListener('end', onEnd)
    blockstream.removeListener('error', onError)
  }

  function maybeDone () {
    if (ended && remainingHashes === 0) {
      cleanup()
      cb(null, new Buffer(pieces.join(''), 'hex'), length)
    }
  }
}

function onFiles (files, opts, cb) {
  var announceList = opts.announceList

  if (!announceList) {
    if (typeof opts.announce === 'string') announceList = [ [ opts.announce ] ]
    else if (Array.isArray(opts.announce)) {
      announceList = opts.announce.map(function (u) { return [ u ] })
    }
  }

  if (!announceList) announceList = []

  if (global.WEBTORRENT_ANNOUNCE) {
    if (typeof global.WEBTORRENT_ANNOUNCE === 'string') {
      announceList.push([ [ global.WEBTORRENT_ANNOUNCE ] ])
    } else if (Array.isArray(global.WEBTORRENT_ANNOUNCE)) {
      announceList = announceList.concat(global.WEBTORRENT_ANNOUNCE.map(function (u) {
        return [ u ]
      }))
    }
  }

  // When no trackers specified, use some reasonable defaults
  if (opts.announce === undefined && opts.announceList === undefined) {
    announceList = announceList.concat(module.exports.announceList)
  }

  if (typeof opts.urlList === 'string') opts.urlList = [ opts.urlList ]

  var torrent = {
    info: {
      name: opts.name
    },
    'creation date': Math.ceil((Number(opts.creationDate) || Date.now()) / 1000),
    encoding: 'UTF-8'
  }

  if (announceList.length !== 0) {
    torrent.announce = announceList[0][0]
    torrent['announce-list'] = announceList
  }

  if (opts.comment !== undefined) torrent.comment = opts.comment

  if (opts.createdBy !== undefined) torrent['created by'] = opts.createdBy

  if (opts.private !== undefined) torrent.info.private = Number(opts.private)

  // "ssl-cert" key is for SSL torrents, see:
  //   - http://blog.libtorrent.org/2012/01/bittorrent-over-ssl/
  //   - http://www.libtorrent.org/manual-ref.html#ssl-torrents
  //   - http://www.libtorrent.org/reference-Create_Torrents.html
  if (opts.sslCert !== undefined) torrent.info['ssl-cert'] = opts.sslCert

  if (opts.urlList !== undefined) torrent['url-list'] = opts.urlList

  var pieceLength = opts.pieceLength || calcPieceLength(files.reduce(sumLength, 0))
  torrent.info['piece length'] = pieceLength

  getPieceList(files, pieceLength, function (err, pieces, torrentLength) {
    if (err) return cb(err)
    torrent.info.pieces = pieces

    files.forEach(function (file) {
      delete file.getStream
    })

    if (opts.singleFileTorrent) {
      torrent.info.length = torrentLength
    } else {
      torrent.info.files = files
    }

    cb(null, bencode.encode(torrent))
  })
}

/**
 * Accumulator to sum file lengths
 * @param  {number} sum
 * @param  {Object} file
 * @return {number}
 */
function sumLength (sum, file) {
  return sum + file.length
}

/**
 * Check if `obj` is a W3C `Blob` object (which `File` inherits from)
 * @param  {*} obj
 * @return {boolean}
 */
function isBlob (obj) {
  return typeof Blob !== 'undefined' && obj instanceof Blob
}

/**
 * Check if `obj` is a W3C `FileList` object
 * @param  {*} obj
 * @return {boolean}
 */
function isFileList (obj) {
  return typeof FileList !== 'undefined' && obj instanceof FileList
}

/**
 * Check if `obj` is a node Readable stream
 * @param  {*} obj
 * @return {boolean}
 */
function isReadable (obj) {
  return typeof obj === 'object' && obj != null && typeof obj.pipe === 'function'
}

/**
 * Convert a `File` to a lazy readable stream.
 * @param  {File|Blob} file
 * @return {function}
 */
function getBlobStream (file) {
  return function () {
    return new FileReadStream(file)
  }
}

/**
 * Convert a `Buffer` to a lazy readable stream.
 * @param  {Buffer} buffer
 * @return {function}
 */
function getBufferStream (buffer) {
  return function () {
    var s = new stream.PassThrough()
    s.end(buffer)
    return s
  }
}

/**
 * Convert a file path to a lazy readable stream.
 * @param  {string} path
 * @return {function}
 */
function getFilePathStream (path) {
  return function () {
    return fs.createReadStream(path)
  }
}

/**
 * Convert a readable stream to a lazy readable stream. Adds instrumentation to track
 * the number of bytes in the stream and set `file.length`.
 *
 * @param  {Stream} stream
 * @param  {Object} file
 * @return {function}
 */
function getStreamStream (readable, file) {
  return function () {
    var counter = new stream.Transform()
    counter._transform = function (buf, enc, done) {
      file.length += buf.length
      this.push(buf)
      done()
    }
    readable.pipe(counter)
    return counter
  }
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"_process":22,"bencode":9,"block-stream2":18,"buffer":24,"filestream/read":43,"flatten":44,"fs":21,"is-file":59,"junk":62,"multistream":74,"once":77,"path":80,"piece-length":81,"readable-stream":97,"run-parallel":101,"simple-sha1":108,"xtend":144}],32:[function(require,module,exports){
(function (process){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && 'WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if ('env' in (typeof process === 'undefined' ? {} : process)) {
    r = process.env.DEBUG;
  }
  
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

}).call(this,require('_process'))
},{"./debug":33,"_process":22}],33:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug.debug = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting
    args = exports.formatArgs.apply(self, args);

    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/[\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":73}],34:[function(require,module,exports){
module.exports = function () {
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] !== undefined) return arguments[i];
    }
};

},{}],35:[function(require,module,exports){
/**
 * A polyfill for Element.matches()
 */
if (Element && !Element.prototype.matches) {
    var proto = Element.prototype;

    proto.matches = proto.matchesSelector ||
                    proto.mozMatchesSelector ||
                    proto.msMatchesSelector ||
                    proto.oMatchesSelector ||
                    proto.webkitMatchesSelector;
}

/**
 * Finds the closest parent that matches a selector.
 *
 * @param {Element} element
 * @param {String} selector
 * @return {Function}
 */
function closest (element, selector) {
    while (element && element !== document) {
        if (element.matches(selector)) return element;
        element = element.parentNode;
    }
}

module.exports = closest;

},{}],36:[function(require,module,exports){
var closest = require('./closest');

/**
 * Delegates event to a selector.
 *
 * @param {Element} element
 * @param {String} selector
 * @param {String} type
 * @param {Function} callback
 * @param {Boolean} useCapture
 * @return {Object}
 */
function delegate(element, selector, type, callback, useCapture) {
    var listenerFn = listener.apply(this, arguments);

    element.addEventListener(type, listenerFn, useCapture);

    return {
        destroy: function() {
            element.removeEventListener(type, listenerFn, useCapture);
        }
    }
}

/**
 * Finds closest match and invokes callback.
 *
 * @param {Element} element
 * @param {String} selector
 * @param {String} type
 * @param {Function} callback
 * @return {Function}
 */
function listener(element, selector, type, callback) {
    return function(e) {
        e.delegateTarget = closest(e.target, selector);

        if (e.delegateTarget) {
            callback.call(element, e);
        }
    }
}

module.exports = delegate;

},{"./closest":35}],37:[function(require,module,exports){
module.exports = dragDrop

var flatten = require('flatten')
var parallel = require('run-parallel')

function dragDrop (elem, listeners) {
  if (typeof elem === 'string') {
    elem = window.document.querySelector(elem)
  }

  if (typeof listeners === 'function') {
    listeners = { onDrop: listeners }
  }

  var timeout

  elem.addEventListener('dragenter', stopEvent, false)
  elem.addEventListener('dragover', onDragOver, false)
  elem.addEventListener('dragleave', onDragLeave, false)
  elem.addEventListener('drop', onDrop, false)

  // Function to remove drag-drop listeners
  return function remove () {
    removeDragClass()
    elem.removeEventListener('dragenter', stopEvent, false)
    elem.removeEventListener('dragover', onDragOver, false)
    elem.removeEventListener('dragleave', onDragLeave, false)
    elem.removeEventListener('drop', onDrop, false)
  }

  function onDragOver (e) {
    e.stopPropagation()
    e.preventDefault()
    if (e.dataTransfer.items) {
      // Only add "drag" class when `items` contains items that are able to be
      // handled by the registered listeners (files vs. text)
      var items = toArray(e.dataTransfer.items)
      var fileItems = items.filter(function (item) { return item.kind === 'file' })
      var textItems = items.filter(function (item) { return item.kind === 'string' })

      if (fileItems.length === 0 && !listeners.onDropText) return
      if (textItems.length === 0 && !listeners.onDrop) return
      if (fileItems.length === 0 && textItems.length === 0) return
    }

    elem.classList.add('drag')
    clearTimeout(timeout)

    if (listeners.onDragOver) {
      listeners.onDragOver(e)
    }

    e.dataTransfer.dropEffect = 'copy'
    return false
  }

  function onDragLeave (e) {
    e.stopPropagation()
    e.preventDefault()

    if (listeners.onDragLeave) {
      listeners.onDragLeave(e)
    }

    clearTimeout(timeout)
    timeout = setTimeout(removeDragClass, 50)

    return false
  }

  function onDrop (e) {
    e.stopPropagation()
    e.preventDefault()

    if (listeners.onDragLeave) {
      listeners.onDragLeave(e)
    }

    clearTimeout(timeout)
    removeDragClass()

    var pos = {
      x: e.clientX,
      y: e.clientY
    }

    // text drop support
    var text = e.dataTransfer.getData('text')
    if (text && listeners.onDropText) {
      listeners.onDropText(text, pos)
    }

    // file drop support
    if (e.dataTransfer.items) {
      // Handle directories in Chrome using the proprietary FileSystem API
      var items = toArray(e.dataTransfer.items).filter(function (item) {
        return item.kind === 'file'
      })

      if (items.length === 0) return

      parallel(items.map(function (item) {
        return function (cb) {
          processEntry(item.webkitGetAsEntry(), cb)
        }
      }), function (err, results) {
        // This catches permission errors with file:// in Chrome. This should never
        // throw in production code, so the user does not need to use try-catch.
        if (err) throw err
        if (listeners.onDrop) {
          listeners.onDrop(flatten(results), pos)
        }
      })
    } else {
      var files = toArray(e.dataTransfer.files)

      if (files.length === 0) return

      files.forEach(function (file) {
        file.fullPath = '/' + file.name
      })

      if (listeners.onDrop) {
        listeners.onDrop(files, pos)
      }
    }

    return false
  }

  function removeDragClass () {
    elem.classList.remove('drag')
  }
}

function stopEvent (e) {
  e.stopPropagation()
  e.preventDefault()
  return false
}

function processEntry (entry, cb) {
  var entries = []

  if (entry.isFile) {
    entry.file(function (file) {
      file.fullPath = entry.fullPath  // preserve pathing for consumer
      cb(null, file)
    }, function (err) {
      cb(err)
    })
  } else if (entry.isDirectory) {
    var reader = entry.createReader()
    readEntries()
  }

  function readEntries () {
    reader.readEntries(function (entries_) {
      if (entries_.length > 0) {
        entries = entries.concat(toArray(entries_))
        readEntries() // continue reading entries until `readEntries` returns no more
      } else {
        doneEntries()
      }
    })
  }

  function doneEntries () {
    parallel(entries.map(function (entry) {
      return function (cb) {
        processEntry(entry, cb)
      }
    }), cb)
  }
}

function toArray (list) {
  return Array.prototype.slice.call(list || [], 0)
}

},{"flatten":44,"run-parallel":101}],38:[function(require,module,exports){
module.exports = function(opts) {
  return new ElementClass(opts)
}

function indexOf(arr, prop) {
  if (arr.indexOf) return arr.indexOf(prop)
  for (var i = 0, len = arr.length; i < len; i++)
    if (arr[i] === prop) return i
  return -1
}

function ElementClass(opts) {
  if (!(this instanceof ElementClass)) return new ElementClass(opts)
  var self = this
  if (!opts) opts = {}

  // similar doing instanceof HTMLElement but works in IE8
  if (opts.nodeType) opts = {el: opts}

  this.opts = opts
  this.el = opts.el || document.body
  if (typeof this.el !== 'object') this.el = document.querySelector(this.el)
}

ElementClass.prototype.add = function(className) {
  var el = this.el
  if (!el) return
  if (el.className === "") return el.className = className
  var classes = el.className.split(' ')
  if (indexOf(classes, className) > -1) return classes
  classes.push(className)
  el.className = classes.join(' ')
  return classes
}

ElementClass.prototype.remove = function(className) {
  var el = this.el
  if (!el) return
  if (el.className === "") return
  var classes = el.className.split(' ')
  var idx = indexOf(classes, className)
  if (idx > -1) classes.splice(idx, 1)
  el.className = classes.join(' ')
  return classes
}

ElementClass.prototype.has = function(className) {
  var el = this.el
  if (!el) return
  var classes = el.className.split(' ')
  return indexOf(classes, className) > -1
}

ElementClass.prototype.toggle = function(className) {
  var el = this.el
  if (!el) return
  if (this.has(className)) this.remove(className)
  else this.add(className)
}

},{}],39:[function(require,module,exports){
/* jshint maxerr: 10000 */
/* jslint unused: true */
/* jshint shadow: true */
/* jshint -W075 */
(function(ns){
    // this list must be ordered from largest length of the value array, index 0, to the shortest
    ns.emojioneList = {":kiss_ww:":{"unicode":["1f469-200d-2764-fe0f-200d-1f48b-200d-1f469","1f469-2764-1f48b-1f469"],"isCanonical": true},":couplekiss_ww:":{"unicode":["1f469-200d-2764-fe0f-200d-1f48b-200d-1f469","1f469-2764-1f48b-1f469"],"isCanonical": false},":kiss_mm:":{"unicode":["1f468-200d-2764-fe0f-200d-1f48b-200d-1f468","1f468-2764-1f48b-1f468"],"isCanonical": true},":couplekiss_mm:":{"unicode":["1f468-200d-2764-fe0f-200d-1f48b-200d-1f468","1f468-2764-1f48b-1f468"],"isCanonical": false},":family_mmbb:":{"unicode":["1f468-200d-1f468-200d-1f466-200d-1f466","1f468-1f468-1f466-1f466"],"isCanonical": true},":family_mmgb:":{"unicode":["1f468-200d-1f468-200d-1f467-200d-1f466","1f468-1f468-1f467-1f466"],"isCanonical": true},":family_mmgg:":{"unicode":["1f468-200d-1f468-200d-1f467-200d-1f467","1f468-1f468-1f467-1f467"],"isCanonical": true},":family_mwbb:":{"unicode":["1f468-200d-1f469-200d-1f466-200d-1f466","1f468-1f469-1f466-1f466"],"isCanonical": true},":family_mwgb:":{"unicode":["1f468-200d-1f469-200d-1f467-200d-1f466","1f468-1f469-1f467-1f466"],"isCanonical": true},":family_mwgg:":{"unicode":["1f468-200d-1f469-200d-1f467-200d-1f467","1f468-1f469-1f467-1f467"],"isCanonical": true},":family_wwbb:":{"unicode":["1f469-200d-1f469-200d-1f466-200d-1f466","1f469-1f469-1f466-1f466"],"isCanonical": true},":family_wwgb:":{"unicode":["1f469-200d-1f469-200d-1f467-200d-1f466","1f469-1f469-1f467-1f466"],"isCanonical": true},":family_wwgg:":{"unicode":["1f469-200d-1f469-200d-1f467-200d-1f467","1f469-1f469-1f467-1f467"],"isCanonical": true},":couple_ww:":{"unicode":["1f469-200d-2764-fe0f-200d-1f469","1f469-2764-1f469"],"isCanonical": true},":couple_with_heart_ww:":{"unicode":["1f469-200d-2764-fe0f-200d-1f469","1f469-2764-1f469"],"isCanonical": false},":couple_mm:":{"unicode":["1f468-200d-2764-fe0f-200d-1f468","1f468-2764-1f468"],"isCanonical": true},":couple_with_heart_mm:":{"unicode":["1f468-200d-2764-fe0f-200d-1f468","1f468-2764-1f468"],"isCanonical": false},":family_mmb:":{"unicode":["1f468-200d-1f468-200d-1f466","1f468-1f468-1f466"],"isCanonical": true},":family_mmg:":{"unicode":["1f468-200d-1f468-200d-1f467","1f468-1f468-1f467"],"isCanonical": true},":family_mwg:":{"unicode":["1f468-200d-1f469-200d-1f467","1f468-1f469-1f467"],"isCanonical": true},":family_wwb:":{"unicode":["1f469-200d-1f469-200d-1f466","1f469-1f469-1f466"],"isCanonical": true},":family_wwg:":{"unicode":["1f469-200d-1f469-200d-1f467","1f469-1f469-1f467"],"isCanonical": true},":eye_in_speech_bubble:":{"unicode":["1f441-200d-1f5e8","1f441-1f5e8"],"isCanonical": true},":hash:":{"unicode":["0023-fe0f-20e3","0023-20e3"],"isCanonical": true},":zero:":{"unicode":["0030-fe0f-20e3","0030-20e3"],"isCanonical": true},":one:":{"unicode":["0031-fe0f-20e3","0031-20e3"],"isCanonical": true},":two:":{"unicode":["0032-fe0f-20e3","0032-20e3"],"isCanonical": true},":three:":{"unicode":["0033-fe0f-20e3","0033-20e3"],"isCanonical": true},":four:":{"unicode":["0034-fe0f-20e3","0034-20e3"],"isCanonical": true},":five:":{"unicode":["0035-fe0f-20e3","0035-20e3"],"isCanonical": true},":six:":{"unicode":["0036-fe0f-20e3","0036-20e3"],"isCanonical": true},":seven:":{"unicode":["0037-fe0f-20e3","0037-20e3"],"isCanonical": true},":eight:":{"unicode":["0038-fe0f-20e3","0038-20e3"],"isCanonical": true},":nine:":{"unicode":["0039-fe0f-20e3","0039-20e3"],"isCanonical": true},":asterisk:":{"unicode":["002a-fe0f-20e3","002a-20e3"],"isCanonical": true},":keycap_asterisk:":{"unicode":["002a-fe0f-20e3","002a-20e3"],"isCanonical": false},":handball_tone5:":{"unicode":["1f93e-1f3ff"],"isCanonical": true},":handball_tone4:":{"unicode":["1f93e-1f3fe"],"isCanonical": true},":handball_tone3:":{"unicode":["1f93e-1f3fd"],"isCanonical": true},":handball_tone2:":{"unicode":["1f93e-1f3fc"],"isCanonical": true},":handball_tone1:":{"unicode":["1f93e-1f3fb"],"isCanonical": true},":water_polo_tone5:":{"unicode":["1f93d-1f3ff"],"isCanonical": true},":water_polo_tone4:":{"unicode":["1f93d-1f3fe"],"isCanonical": true},":water_polo_tone3:":{"unicode":["1f93d-1f3fd"],"isCanonical": true},":water_polo_tone2:":{"unicode":["1f93d-1f3fc"],"isCanonical": true},":water_polo_tone1:":{"unicode":["1f93d-1f3fb"],"isCanonical": true},":wrestlers_tone5:":{"unicode":["1f93c-1f3ff"],"isCanonical": true},":wrestling_tone5:":{"unicode":["1f93c-1f3ff"],"isCanonical": false},":wrestlers_tone4:":{"unicode":["1f93c-1f3fe"],"isCanonical": true},":wrestling_tone4:":{"unicode":["1f93c-1f3fe"],"isCanonical": false},":wrestlers_tone3:":{"unicode":["1f93c-1f3fd"],"isCanonical": true},":wrestling_tone3:":{"unicode":["1f93c-1f3fd"],"isCanonical": false},":wrestlers_tone2:":{"unicode":["1f93c-1f3fc"],"isCanonical": true},":wrestling_tone2:":{"unicode":["1f93c-1f3fc"],"isCanonical": false},":wrestlers_tone1:":{"unicode":["1f93c-1f3fb"],"isCanonical": true},":wrestling_tone1:":{"unicode":["1f93c-1f3fb"],"isCanonical": false},":juggling_tone5:":{"unicode":["1f939-1f3ff"],"isCanonical": true},":juggler_tone5:":{"unicode":["1f939-1f3ff"],"isCanonical": false},":juggling_tone4:":{"unicode":["1f939-1f3fe"],"isCanonical": true},":juggler_tone4:":{"unicode":["1f939-1f3fe"],"isCanonical": false},":juggling_tone3:":{"unicode":["1f939-1f3fd"],"isCanonical": true},":juggler_tone3:":{"unicode":["1f939-1f3fd"],"isCanonical": false},":juggling_tone2:":{"unicode":["1f939-1f3fc"],"isCanonical": true},":juggler_tone2:":{"unicode":["1f939-1f3fc"],"isCanonical": false},":juggling_tone1:":{"unicode":["1f939-1f3fb"],"isCanonical": true},":juggler_tone1:":{"unicode":["1f939-1f3fb"],"isCanonical": false},":cartwheel_tone5:":{"unicode":["1f938-1f3ff"],"isCanonical": true},":person_doing_cartwheel_tone5:":{"unicode":["1f938-1f3ff"],"isCanonical": false},":cartwheel_tone4:":{"unicode":["1f938-1f3fe"],"isCanonical": true},":person_doing_cartwheel_tone4:":{"unicode":["1f938-1f3fe"],"isCanonical": false},":cartwheel_tone3:":{"unicode":["1f938-1f3fd"],"isCanonical": true},":person_doing_cartwheel_tone3:":{"unicode":["1f938-1f3fd"],"isCanonical": false},":cartwheel_tone2:":{"unicode":["1f938-1f3fc"],"isCanonical": true},":person_doing_cartwheel_tone2:":{"unicode":["1f938-1f3fc"],"isCanonical": false},":cartwheel_tone1:":{"unicode":["1f938-1f3fb"],"isCanonical": true},":person_doing_cartwheel_tone1:":{"unicode":["1f938-1f3fb"],"isCanonical": false},":shrug_tone5:":{"unicode":["1f937-1f3ff"],"isCanonical": true},":shrug_tone4:":{"unicode":["1f937-1f3fe"],"isCanonical": true},":shrug_tone3:":{"unicode":["1f937-1f3fd"],"isCanonical": true},":shrug_tone2:":{"unicode":["1f937-1f3fc"],"isCanonical": true},":shrug_tone1:":{"unicode":["1f937-1f3fb"],"isCanonical": true},":mrs_claus_tone5:":{"unicode":["1f936-1f3ff"],"isCanonical": true},":mother_christmas_tone5:":{"unicode":["1f936-1f3ff"],"isCanonical": false},":mrs_claus_tone4:":{"unicode":["1f936-1f3fe"],"isCanonical": true},":mother_christmas_tone4:":{"unicode":["1f936-1f3fe"],"isCanonical": false},":mrs_claus_tone3:":{"unicode":["1f936-1f3fd"],"isCanonical": true},":mother_christmas_tone3:":{"unicode":["1f936-1f3fd"],"isCanonical": false},":mrs_claus_tone2:":{"unicode":["1f936-1f3fc"],"isCanonical": true},":mother_christmas_tone2:":{"unicode":["1f936-1f3fc"],"isCanonical": false},":mrs_claus_tone1:":{"unicode":["1f936-1f3fb"],"isCanonical": true},":mother_christmas_tone1:":{"unicode":["1f936-1f3fb"],"isCanonical": false},":man_in_tuxedo_tone5:":{"unicode":["1f935-1f3ff"],"isCanonical": true},":tuxedo_tone5:":{"unicode":["1f935-1f3ff"],"isCanonical": false},":man_in_tuxedo_tone4:":{"unicode":["1f935-1f3fe"],"isCanonical": true},":tuxedo_tone4:":{"unicode":["1f935-1f3fe"],"isCanonical": false},":man_in_tuxedo_tone3:":{"unicode":["1f935-1f3fd"],"isCanonical": true},":tuxedo_tone3:":{"unicode":["1f935-1f3fd"],"isCanonical": false},":man_in_tuxedo_tone2:":{"unicode":["1f935-1f3fc"],"isCanonical": true},":tuxedo_tone2:":{"unicode":["1f935-1f3fc"],"isCanonical": false},":man_in_tuxedo_tone1:":{"unicode":["1f935-1f3fb"],"isCanonical": true},":tuxedo_tone1:":{"unicode":["1f935-1f3fb"],"isCanonical": false},":prince_tone5:":{"unicode":["1f934-1f3ff"],"isCanonical": true},":prince_tone4:":{"unicode":["1f934-1f3fe"],"isCanonical": true},":prince_tone3:":{"unicode":["1f934-1f3fd"],"isCanonical": true},":prince_tone2:":{"unicode":["1f934-1f3fc"],"isCanonical": true},":prince_tone1:":{"unicode":["1f934-1f3fb"],"isCanonical": true},":selfie_tone5:":{"unicode":["1f933-1f3ff"],"isCanonical": true},":selfie_tone4:":{"unicode":["1f933-1f3fe"],"isCanonical": true},":selfie_tone3:":{"unicode":["1f933-1f3fd"],"isCanonical": true},":selfie_tone2:":{"unicode":["1f933-1f3fc"],"isCanonical": true},":selfie_tone1:":{"unicode":["1f933-1f3fb"],"isCanonical": true},":pregnant_woman_tone5:":{"unicode":["1f930-1f3ff"],"isCanonical": true},":expecting_woman_tone5:":{"unicode":["1f930-1f3ff"],"isCanonical": false},":pregnant_woman_tone4:":{"unicode":["1f930-1f3fe"],"isCanonical": true},":expecting_woman_tone4:":{"unicode":["1f930-1f3fe"],"isCanonical": false},":pregnant_woman_tone3:":{"unicode":["1f930-1f3fd"],"isCanonical": true},":expecting_woman_tone3:":{"unicode":["1f930-1f3fd"],"isCanonical": false},":pregnant_woman_tone2:":{"unicode":["1f930-1f3fc"],"isCanonical": true},":expecting_woman_tone2:":{"unicode":["1f930-1f3fc"],"isCanonical": false},":pregnant_woman_tone1:":{"unicode":["1f930-1f3fb"],"isCanonical": true},":expecting_woman_tone1:":{"unicode":["1f930-1f3fb"],"isCanonical": false},":face_palm_tone5:":{"unicode":["1f926-1f3ff"],"isCanonical": true},":facepalm_tone5:":{"unicode":["1f926-1f3ff"],"isCanonical": false},":face_palm_tone4:":{"unicode":["1f926-1f3fe"],"isCanonical": true},":facepalm_tone4:":{"unicode":["1f926-1f3fe"],"isCanonical": false},":face_palm_tone3:":{"unicode":["1f926-1f3fd"],"isCanonical": true},":facepalm_tone3:":{"unicode":["1f926-1f3fd"],"isCanonical": false},":face_palm_tone2:":{"unicode":["1f926-1f3fc"],"isCanonical": true},":facepalm_tone2:":{"unicode":["1f926-1f3fc"],"isCanonical": false},":face_palm_tone1:":{"unicode":["1f926-1f3fb"],"isCanonical": true},":facepalm_tone1:":{"unicode":["1f926-1f3fb"],"isCanonical": false},":fingers_crossed_tone5:":{"unicode":["1f91e-1f3ff"],"isCanonical": true},":hand_with_index_and_middle_fingers_crossed_tone5:":{"unicode":["1f91e-1f3ff"],"isCanonical": false},":fingers_crossed_tone4:":{"unicode":["1f91e-1f3fe"],"isCanonical": true},":hand_with_index_and_middle_fingers_crossed_tone4:":{"unicode":["1f91e-1f3fe"],"isCanonical": false},":fingers_crossed_tone3:":{"unicode":["1f91e-1f3fd"],"isCanonical": true},":hand_with_index_and_middle_fingers_crossed_tone3:":{"unicode":["1f91e-1f3fd"],"isCanonical": false},":fingers_crossed_tone2:":{"unicode":["1f91e-1f3fc"],"isCanonical": true},":hand_with_index_and_middle_fingers_crossed_tone2:":{"unicode":["1f91e-1f3fc"],"isCanonical": false},":fingers_crossed_tone1:":{"unicode":["1f91e-1f3fb"],"isCanonical": true},":hand_with_index_and_middle_fingers_crossed_tone1:":{"unicode":["1f91e-1f3fb"],"isCanonical": false},":handshake_tone5:":{"unicode":["1f91d-1f3ff"],"isCanonical": true},":shaking_hands_tone5:":{"unicode":["1f91d-1f3ff"],"isCanonical": false},":handshake_tone4:":{"unicode":["1f91d-1f3fe"],"isCanonical": true},":shaking_hands_tone4:":{"unicode":["1f91d-1f3fe"],"isCanonical": false},":handshake_tone3:":{"unicode":["1f91d-1f3fd"],"isCanonical": true},":shaking_hands_tone3:":{"unicode":["1f91d-1f3fd"],"isCanonical": false},":handshake_tone2:":{"unicode":["1f91d-1f3fc"],"isCanonical": true},":shaking_hands_tone2:":{"unicode":["1f91d-1f3fc"],"isCanonical": false},":handshake_tone1:":{"unicode":["1f91d-1f3fb"],"isCanonical": true},":shaking_hands_tone1:":{"unicode":["1f91d-1f3fb"],"isCanonical": false},":right_facing_fist_tone5:":{"unicode":["1f91c-1f3ff"],"isCanonical": true},":right_fist_tone5:":{"unicode":["1f91c-1f3ff"],"isCanonical": false},":right_facing_fist_tone4:":{"unicode":["1f91c-1f3fe"],"isCanonical": true},":right_fist_tone4:":{"unicode":["1f91c-1f3fe"],"isCanonical": false},":right_facing_fist_tone3:":{"unicode":["1f91c-1f3fd"],"isCanonical": true},":right_fist_tone3:":{"unicode":["1f91c-1f3fd"],"isCanonical": false},":right_facing_fist_tone2:":{"unicode":["1f91c-1f3fc"],"isCanonical": true},":right_fist_tone2:":{"unicode":["1f91c-1f3fc"],"isCanonical": false},":right_facing_fist_tone1:":{"unicode":["1f91c-1f3fb"],"isCanonical": true},":right_fist_tone1:":{"unicode":["1f91c-1f3fb"],"isCanonical": false},":left_facing_fist_tone5:":{"unicode":["1f91b-1f3ff"],"isCanonical": true},":left_fist_tone5:":{"unicode":["1f91b-1f3ff"],"isCanonical": false},":left_facing_fist_tone4:":{"unicode":["1f91b-1f3fe"],"isCanonical": true},":left_fist_tone4:":{"unicode":["1f91b-1f3fe"],"isCanonical": false},":left_facing_fist_tone3:":{"unicode":["1f91b-1f3fd"],"isCanonical": true},":left_fist_tone3:":{"unicode":["1f91b-1f3fd"],"isCanonical": false},":left_facing_fist_tone2:":{"unicode":["1f91b-1f3fc"],"isCanonical": true},":left_fist_tone2:":{"unicode":["1f91b-1f3fc"],"isCanonical": false},":left_facing_fist_tone1:":{"unicode":["1f91b-1f3fb"],"isCanonical": true},":left_fist_tone1:":{"unicode":["1f91b-1f3fb"],"isCanonical": false},":raised_back_of_hand_tone5:":{"unicode":["1f91a-1f3ff"],"isCanonical": true},":back_of_hand_tone5:":{"unicode":["1f91a-1f3ff"],"isCanonical": false},":raised_back_of_hand_tone4:":{"unicode":["1f91a-1f3fe"],"isCanonical": true},":back_of_hand_tone4:":{"unicode":["1f91a-1f3fe"],"isCanonical": false},":raised_back_of_hand_tone3:":{"unicode":["1f91a-1f3fd"],"isCanonical": true},":back_of_hand_tone3:":{"unicode":["1f91a-1f3fd"],"isCanonical": false},":raised_back_of_hand_tone2:":{"unicode":["1f91a-1f3fc"],"isCanonical": true},":back_of_hand_tone2:":{"unicode":["1f91a-1f3fc"],"isCanonical": false},":raised_back_of_hand_tone1:":{"unicode":["1f91a-1f3fb"],"isCanonical": true},":back_of_hand_tone1:":{"unicode":["1f91a-1f3fb"],"isCanonical": false},":call_me_tone5:":{"unicode":["1f919-1f3ff"],"isCanonical": true},":call_me_hand_tone5:":{"unicode":["1f919-1f3ff"],"isCanonical": false},":call_me_tone4:":{"unicode":["1f919-1f3fe"],"isCanonical": true},":call_me_hand_tone4:":{"unicode":["1f919-1f3fe"],"isCanonical": false},":call_me_tone3:":{"unicode":["1f919-1f3fd"],"isCanonical": true},":call_me_hand_tone3:":{"unicode":["1f919-1f3fd"],"isCanonical": false},":call_me_tone2:":{"unicode":["1f919-1f3fc"],"isCanonical": true},":call_me_hand_tone2:":{"unicode":["1f919-1f3fc"],"isCanonical": false},":call_me_tone1:":{"unicode":["1f919-1f3fb"],"isCanonical": true},":call_me_hand_tone1:":{"unicode":["1f919-1f3fb"],"isCanonical": false},":metal_tone5:":{"unicode":["1f918-1f3ff"],"isCanonical": true},":sign_of_the_horns_tone5:":{"unicode":["1f918-1f3ff"],"isCanonical": false},":metal_tone4:":{"unicode":["1f918-1f3fe"],"isCanonical": true},":sign_of_the_horns_tone4:":{"unicode":["1f918-1f3fe"],"isCanonical": false},":metal_tone3:":{"unicode":["1f918-1f3fd"],"isCanonical": true},":sign_of_the_horns_tone3:":{"unicode":["1f918-1f3fd"],"isCanonical": false},":metal_tone2:":{"unicode":["1f918-1f3fc"],"isCanonical": true},":sign_of_the_horns_tone2:":{"unicode":["1f918-1f3fc"],"isCanonical": false},":metal_tone1:":{"unicode":["1f918-1f3fb"],"isCanonical": true},":sign_of_the_horns_tone1:":{"unicode":["1f918-1f3fb"],"isCanonical": false},":bath_tone5:":{"unicode":["1f6c0-1f3ff"],"isCanonical": true},":bath_tone4:":{"unicode":["1f6c0-1f3fe"],"isCanonical": true},":bath_tone3:":{"unicode":["1f6c0-1f3fd"],"isCanonical": true},":bath_tone2:":{"unicode":["1f6c0-1f3fc"],"isCanonical": true},":bath_tone1:":{"unicode":["1f6c0-1f3fb"],"isCanonical": true},":walking_tone5:":{"unicode":["1f6b6-1f3ff"],"isCanonical": true},":walking_tone4:":{"unicode":["1f6b6-1f3fe"],"isCanonical": true},":walking_tone3:":{"unicode":["1f6b6-1f3fd"],"isCanonical": true},":walking_tone2:":{"unicode":["1f6b6-1f3fc"],"isCanonical": true},":walking_tone1:":{"unicode":["1f6b6-1f3fb"],"isCanonical": true},":mountain_bicyclist_tone5:":{"unicode":["1f6b5-1f3ff"],"isCanonical": true},":mountain_bicyclist_tone4:":{"unicode":["1f6b5-1f3fe"],"isCanonical": true},":mountain_bicyclist_tone3:":{"unicode":["1f6b5-1f3fd"],"isCanonical": true},":mountain_bicyclist_tone2:":{"unicode":["1f6b5-1f3fc"],"isCanonical": true},":mountain_bicyclist_tone1:":{"unicode":["1f6b5-1f3fb"],"isCanonical": true},":bicyclist_tone5:":{"unicode":["1f6b4-1f3ff"],"isCanonical": true},":bicyclist_tone4:":{"unicode":["1f6b4-1f3fe"],"isCanonical": true},":bicyclist_tone3:":{"unicode":["1f6b4-1f3fd"],"isCanonical": true},":bicyclist_tone2:":{"unicode":["1f6b4-1f3fc"],"isCanonical": true},":bicyclist_tone1:":{"unicode":["1f6b4-1f3fb"],"isCanonical": true},":rowboat_tone5:":{"unicode":["1f6a3-1f3ff"],"isCanonical": true},":rowboat_tone4:":{"unicode":["1f6a3-1f3fe"],"isCanonical": true},":rowboat_tone3:":{"unicode":["1f6a3-1f3fd"],"isCanonical": true},":rowboat_tone2:":{"unicode":["1f6a3-1f3fc"],"isCanonical": true},":rowboat_tone1:":{"unicode":["1f6a3-1f3fb"],"isCanonical": true},":pray_tone5:":{"unicode":["1f64f-1f3ff"],"isCanonical": true},":pray_tone4:":{"unicode":["1f64f-1f3fe"],"isCanonical": true},":pray_tone3:":{"unicode":["1f64f-1f3fd"],"isCanonical": true},":pray_tone2:":{"unicode":["1f64f-1f3fc"],"isCanonical": true},":pray_tone1:":{"unicode":["1f64f-1f3fb"],"isCanonical": true},":person_with_pouting_face_tone5:":{"unicode":["1f64e-1f3ff"],"isCanonical": true},":person_with_pouting_face_tone4:":{"unicode":["1f64e-1f3fe"],"isCanonical": true},":person_with_pouting_face_tone3:":{"unicode":["1f64e-1f3fd"],"isCanonical": true},":person_with_pouting_face_tone2:":{"unicode":["1f64e-1f3fc"],"isCanonical": true},":person_with_pouting_face_tone1:":{"unicode":["1f64e-1f3fb"],"isCanonical": true},":person_frowning_tone5:":{"unicode":["1f64d-1f3ff"],"isCanonical": true},":person_frowning_tone4:":{"unicode":["1f64d-1f3fe"],"isCanonical": true},":person_frowning_tone3:":{"unicode":["1f64d-1f3fd"],"isCanonical": true},":person_frowning_tone2:":{"unicode":["1f64d-1f3fc"],"isCanonical": true},":person_frowning_tone1:":{"unicode":["1f64d-1f3fb"],"isCanonical": true},":raised_hands_tone5:":{"unicode":["1f64c-1f3ff"],"isCanonical": true},":raised_hands_tone4:":{"unicode":["1f64c-1f3fe"],"isCanonical": true},":raised_hands_tone3:":{"unicode":["1f64c-1f3fd"],"isCanonical": true},":raised_hands_tone2:":{"unicode":["1f64c-1f3fc"],"isCanonical": true},":raised_hands_tone1:":{"unicode":["1f64c-1f3fb"],"isCanonical": true},":raising_hand_tone5:":{"unicode":["1f64b-1f3ff"],"isCanonical": true},":raising_hand_tone4:":{"unicode":["1f64b-1f3fe"],"isCanonical": true},":raising_hand_tone3:":{"unicode":["1f64b-1f3fd"],"isCanonical": true},":raising_hand_tone2:":{"unicode":["1f64b-1f3fc"],"isCanonical": true},":raising_hand_tone1:":{"unicode":["1f64b-1f3fb"],"isCanonical": true},":bow_tone5:":{"unicode":["1f647-1f3ff"],"isCanonical": true},":bow_tone4:":{"unicode":["1f647-1f3fe"],"isCanonical": true},":bow_tone3:":{"unicode":["1f647-1f3fd"],"isCanonical": true},":bow_tone2:":{"unicode":["1f647-1f3fc"],"isCanonical": true},":bow_tone1:":{"unicode":["1f647-1f3fb"],"isCanonical": true},":ok_woman_tone5:":{"unicode":["1f646-1f3ff"],"isCanonical": true},":ok_woman_tone4:":{"unicode":["1f646-1f3fe"],"isCanonical": true},":ok_woman_tone3:":{"unicode":["1f646-1f3fd"],"isCanonical": true},":ok_woman_tone2:":{"unicode":["1f646-1f3fc"],"isCanonical": true},":ok_woman_tone1:":{"unicode":["1f646-1f3fb"],"isCanonical": true},":no_good_tone5:":{"unicode":["1f645-1f3ff"],"isCanonical": true},":no_good_tone4:":{"unicode":["1f645-1f3fe"],"isCanonical": true},":no_good_tone3:":{"unicode":["1f645-1f3fd"],"isCanonical": true},":no_good_tone2:":{"unicode":["1f645-1f3fc"],"isCanonical": true},":no_good_tone1:":{"unicode":["1f645-1f3fb"],"isCanonical": true},":vulcan_tone5:":{"unicode":["1f596-1f3ff"],"isCanonical": true},":raised_hand_with_part_between_middle_and_ring_fingers_tone5:":{"unicode":["1f596-1f3ff"],"isCanonical": false},":vulcan_tone4:":{"unicode":["1f596-1f3fe"],"isCanonical": true},":raised_hand_with_part_between_middle_and_ring_fingers_tone4:":{"unicode":["1f596-1f3fe"],"isCanonical": false},":vulcan_tone3:":{"unicode":["1f596-1f3fd"],"isCanonical": true},":raised_hand_with_part_between_middle_and_ring_fingers_tone3:":{"unicode":["1f596-1f3fd"],"isCanonical": false},":vulcan_tone2:":{"unicode":["1f596-1f3fc"],"isCanonical": true},":raised_hand_with_part_between_middle_and_ring_fingers_tone2:":{"unicode":["1f596-1f3fc"],"isCanonical": false},":vulcan_tone1:":{"unicode":["1f596-1f3fb"],"isCanonical": true},":raised_hand_with_part_between_middle_and_ring_fingers_tone1:":{"unicode":["1f596-1f3fb"],"isCanonical": false},":middle_finger_tone5:":{"unicode":["1f595-1f3ff"],"isCanonical": true},":reversed_hand_with_middle_finger_extended_tone5:":{"unicode":["1f595-1f3ff"],"isCanonical": false},":middle_finger_tone4:":{"unicode":["1f595-1f3fe"],"isCanonical": true},":reversed_hand_with_middle_finger_extended_tone4:":{"unicode":["1f595-1f3fe"],"isCanonical": false},":middle_finger_tone3:":{"unicode":["1f595-1f3fd"],"isCanonical": true},":reversed_hand_with_middle_finger_extended_tone3:":{"unicode":["1f595-1f3fd"],"isCanonical": false},":middle_finger_tone2:":{"unicode":["1f595-1f3fc"],"isCanonical": true},":reversed_hand_with_middle_finger_extended_tone2:":{"unicode":["1f595-1f3fc"],"isCanonical": false},":middle_finger_tone1:":{"unicode":["1f595-1f3fb"],"isCanonical": true},":reversed_hand_with_middle_finger_extended_tone1:":{"unicode":["1f595-1f3fb"],"isCanonical": false},":hand_splayed_tone5:":{"unicode":["1f590-1f3ff"],"isCanonical": true},":raised_hand_with_fingers_splayed_tone5:":{"unicode":["1f590-1f3ff"],"isCanonical": false},":hand_splayed_tone4:":{"unicode":["1f590-1f3fe"],"isCanonical": true},":raised_hand_with_fingers_splayed_tone4:":{"unicode":["1f590-1f3fe"],"isCanonical": false},":hand_splayed_tone3:":{"unicode":["1f590-1f3fd"],"isCanonical": true},":raised_hand_with_fingers_splayed_tone3:":{"unicode":["1f590-1f3fd"],"isCanonical": false},":hand_splayed_tone2:":{"unicode":["1f590-1f3fc"],"isCanonical": true},":raised_hand_with_fingers_splayed_tone2:":{"unicode":["1f590-1f3fc"],"isCanonical": false},":hand_splayed_tone1:":{"unicode":["1f590-1f3fb"],"isCanonical": true},":raised_hand_with_fingers_splayed_tone1:":{"unicode":["1f590-1f3fb"],"isCanonical": false},":man_dancing_tone5:":{"unicode":["1f57a-1f3ff"],"isCanonical": true},":male_dancer_tone5:":{"unicode":["1f57a-1f3ff"],"isCanonical": false},":man_dancing_tone4:":{"unicode":["1f57a-1f3fe"],"isCanonical": true},":male_dancer_tone4:":{"unicode":["1f57a-1f3fe"],"isCanonical": false},":man_dancing_tone3:":{"unicode":["1f57a-1f3fd"],"isCanonical": true},":male_dancer_tone3:":{"unicode":["1f57a-1f3fd"],"isCanonical": false},":man_dancing_tone2:":{"unicode":["1f57a-1f3fc"],"isCanonical": true},":male_dancer_tone2:":{"unicode":["1f57a-1f3fc"],"isCanonical": false},":man_dancing_tone1:":{"unicode":["1f57a-1f3fb"],"isCanonical": true},":male_dancer_tone1:":{"unicode":["1f57a-1f3fb"],"isCanonical": false},":spy_tone5:":{"unicode":["1f575-1f3ff"],"isCanonical": true},":sleuth_or_spy_tone5:":{"unicode":["1f575-1f3ff"],"isCanonical": false},":spy_tone4:":{"unicode":["1f575-1f3fe"],"isCanonical": true},":sleuth_or_spy_tone4:":{"unicode":["1f575-1f3fe"],"isCanonical": false},":spy_tone3:":{"unicode":["1f575-1f3fd"],"isCanonical": true},":sleuth_or_spy_tone3:":{"unicode":["1f575-1f3fd"],"isCanonical": false},":spy_tone2:":{"unicode":["1f575-1f3fc"],"isCanonical": true},":sleuth_or_spy_tone2:":{"unicode":["1f575-1f3fc"],"isCanonical": false},":spy_tone1:":{"unicode":["1f575-1f3fb"],"isCanonical": true},":sleuth_or_spy_tone1:":{"unicode":["1f575-1f3fb"],"isCanonical": false},":muscle_tone5:":{"unicode":["1f4aa-1f3ff"],"isCanonical": true},":muscle_tone4:":{"unicode":["1f4aa-1f3fe"],"isCanonical": true},":muscle_tone3:":{"unicode":["1f4aa-1f3fd"],"isCanonical": true},":muscle_tone2:":{"unicode":["1f4aa-1f3fc"],"isCanonical": true},":muscle_tone1:":{"unicode":["1f4aa-1f3fb"],"isCanonical": true},":haircut_tone5:":{"unicode":["1f487-1f3ff"],"isCanonical": true},":haircut_tone4:":{"unicode":["1f487-1f3fe"],"isCanonical": true},":haircut_tone3:":{"unicode":["1f487-1f3fd"],"isCanonical": true},":haircut_tone2:":{"unicode":["1f487-1f3fc"],"isCanonical": true},":haircut_tone1:":{"unicode":["1f487-1f3fb"],"isCanonical": true},":massage_tone5:":{"unicode":["1f486-1f3ff"],"isCanonical": true},":massage_tone4:":{"unicode":["1f486-1f3fe"],"isCanonical": true},":massage_tone3:":{"unicode":["1f486-1f3fd"],"isCanonical": true},":massage_tone2:":{"unicode":["1f486-1f3fc"],"isCanonical": true},":massage_tone1:":{"unicode":["1f486-1f3fb"],"isCanonical": true},":nail_care_tone5:":{"unicode":["1f485-1f3ff"],"isCanonical": true},":nail_care_tone4:":{"unicode":["1f485-1f3fe"],"isCanonical": true},":nail_care_tone3:":{"unicode":["1f485-1f3fd"],"isCanonical": true},":nail_care_tone2:":{"unicode":["1f485-1f3fc"],"isCanonical": true},":nail_care_tone1:":{"unicode":["1f485-1f3fb"],"isCanonical": true},":dancer_tone5:":{"unicode":["1f483-1f3ff"],"isCanonical": true},":dancer_tone4:":{"unicode":["1f483-1f3fe"],"isCanonical": true},":dancer_tone3:":{"unicode":["1f483-1f3fd"],"isCanonical": true},":dancer_tone2:":{"unicode":["1f483-1f3fc"],"isCanonical": true},":dancer_tone1:":{"unicode":["1f483-1f3fb"],"isCanonical": true},":guardsman_tone5:":{"unicode":["1f482-1f3ff"],"isCanonical": true},":guardsman_tone4:":{"unicode":["1f482-1f3fe"],"isCanonical": true},":guardsman_tone3:":{"unicode":["1f482-1f3fd"],"isCanonical": true},":guardsman_tone2:":{"unicode":["1f482-1f3fc"],"isCanonical": true},":guardsman_tone1:":{"unicode":["1f482-1f3fb"],"isCanonical": true},":information_desk_person_tone5:":{"unicode":["1f481-1f3ff"],"isCanonical": true},":information_desk_person_tone4:":{"unicode":["1f481-1f3fe"],"isCanonical": true},":information_desk_person_tone3:":{"unicode":["1f481-1f3fd"],"isCanonical": true},":information_desk_person_tone2:":{"unicode":["1f481-1f3fc"],"isCanonical": true},":information_desk_person_tone1:":{"unicode":["1f481-1f3fb"],"isCanonical": true},":angel_tone5:":{"unicode":["1f47c-1f3ff"],"isCanonical": true},":angel_tone4:":{"unicode":["1f47c-1f3fe"],"isCanonical": true},":angel_tone3:":{"unicode":["1f47c-1f3fd"],"isCanonical": true},":angel_tone2:":{"unicode":["1f47c-1f3fc"],"isCanonical": true},":angel_tone1:":{"unicode":["1f47c-1f3fb"],"isCanonical": true},":princess_tone5:":{"unicode":["1f478-1f3ff"],"isCanonical": true},":princess_tone4:":{"unicode":["1f478-1f3fe"],"isCanonical": true},":princess_tone3:":{"unicode":["1f478-1f3fd"],"isCanonical": true},":princess_tone2:":{"unicode":["1f478-1f3fc"],"isCanonical": true},":princess_tone1:":{"unicode":["1f478-1f3fb"],"isCanonical": true},":construction_worker_tone5:":{"unicode":["1f477-1f3ff"],"isCanonical": true},":construction_worker_tone4:":{"unicode":["1f477-1f3fe"],"isCanonical": true},":construction_worker_tone3:":{"unicode":["1f477-1f3fd"],"isCanonical": true},":construction_worker_tone2:":{"unicode":["1f477-1f3fc"],"isCanonical": true},":construction_worker_tone1:":{"unicode":["1f477-1f3fb"],"isCanonical": true},":baby_tone5:":{"unicode":["1f476-1f3ff"],"isCanonical": true},":baby_tone4:":{"unicode":["1f476-1f3fe"],"isCanonical": true},":baby_tone3:":{"unicode":["1f476-1f3fd"],"isCanonical": true},":baby_tone2:":{"unicode":["1f476-1f3fc"],"isCanonical": true},":baby_tone1:":{"unicode":["1f476-1f3fb"],"isCanonical": true},":older_woman_tone5:":{"unicode":["1f475-1f3ff"],"isCanonical": true},":grandma_tone5:":{"unicode":["1f475-1f3ff"],"isCanonical": false},":older_woman_tone4:":{"unicode":["1f475-1f3fe"],"isCanonical": true},":grandma_tone4:":{"unicode":["1f475-1f3fe"],"isCanonical": false},":older_woman_tone3:":{"unicode":["1f475-1f3fd"],"isCanonical": true},":grandma_tone3:":{"unicode":["1f475-1f3fd"],"isCanonical": false},":older_woman_tone2:":{"unicode":["1f475-1f3fc"],"isCanonical": true},":grandma_tone2:":{"unicode":["1f475-1f3fc"],"isCanonical": false},":older_woman_tone1:":{"unicode":["1f475-1f3fb"],"isCanonical": true},":grandma_tone1:":{"unicode":["1f475-1f3fb"],"isCanonical": false},":older_man_tone5:":{"unicode":["1f474-1f3ff"],"isCanonical": true},":older_man_tone4:":{"unicode":["1f474-1f3fe"],"isCanonical": true},":older_man_tone3:":{"unicode":["1f474-1f3fd"],"isCanonical": true},":older_man_tone2:":{"unicode":["1f474-1f3fc"],"isCanonical": true},":older_man_tone1:":{"unicode":["1f474-1f3fb"],"isCanonical": true},":man_with_turban_tone5:":{"unicode":["1f473-1f3ff"],"isCanonical": true},":man_with_turban_tone4:":{"unicode":["1f473-1f3fe"],"isCanonical": true},":man_with_turban_tone3:":{"unicode":["1f473-1f3fd"],"isCanonical": true},":man_with_turban_tone2:":{"unicode":["1f473-1f3fc"],"isCanonical": true},":man_with_turban_tone1:":{"unicode":["1f473-1f3fb"],"isCanonical": true},":man_with_gua_pi_mao_tone5:":{"unicode":["1f472-1f3ff"],"isCanonical": true},":man_with_gua_pi_mao_tone4:":{"unicode":["1f472-1f3fe"],"isCanonical": true},":man_with_gua_pi_mao_tone3:":{"unicode":["1f472-1f3fd"],"isCanonical": true},":man_with_gua_pi_mao_tone2:":{"unicode":["1f472-1f3fc"],"isCanonical": true},":man_with_gua_pi_mao_tone1:":{"unicode":["1f472-1f3fb"],"isCanonical": true},":person_with_blond_hair_tone5:":{"unicode":["1f471-1f3ff"],"isCanonical": true},":person_with_blond_hair_tone4:":{"unicode":["1f471-1f3fe"],"isCanonical": true},":person_with_blond_hair_tone3:":{"unicode":["1f471-1f3fd"],"isCanonical": true},":person_with_blond_hair_tone2:":{"unicode":["1f471-1f3fc"],"isCanonical": true},":person_with_blond_hair_tone1:":{"unicode":["1f471-1f3fb"],"isCanonical": true},":bride_with_veil_tone5:":{"unicode":["1f470-1f3ff"],"isCanonical": true},":bride_with_veil_tone4:":{"unicode":["1f470-1f3fe"],"isCanonical": true},":bride_with_veil_tone3:":{"unicode":["1f470-1f3fd"],"isCanonical": true},":bride_with_veil_tone2:":{"unicode":["1f470-1f3fc"],"isCanonical": true},":bride_with_veil_tone1:":{"unicode":["1f470-1f3fb"],"isCanonical": true},":cop_tone5:":{"unicode":["1f46e-1f3ff"],"isCanonical": true},":cop_tone4:":{"unicode":["1f46e-1f3fe"],"isCanonical": true},":cop_tone3:":{"unicode":["1f46e-1f3fd"],"isCanonical": true},":cop_tone2:":{"unicode":["1f46e-1f3fc"],"isCanonical": true},":cop_tone1:":{"unicode":["1f46e-1f3fb"],"isCanonical": true},":woman_tone5:":{"unicode":["1f469-1f3ff"],"isCanonical": true},":woman_tone4:":{"unicode":["1f469-1f3fe"],"isCanonical": true},":woman_tone3:":{"unicode":["1f469-1f3fd"],"isCanonical": true},":woman_tone2:":{"unicode":["1f469-1f3fc"],"isCanonical": true},":woman_tone1:":{"unicode":["1f469-1f3fb"],"isCanonical": true},":man_tone5:":{"unicode":["1f468-1f3ff"],"isCanonical": true},":man_tone4:":{"unicode":["1f468-1f3fe"],"isCanonical": true},":man_tone3:":{"unicode":["1f468-1f3fd"],"isCanonical": true},":man_tone2:":{"unicode":["1f468-1f3fc"],"isCanonical": true},":man_tone1:":{"unicode":["1f468-1f3fb"],"isCanonical": true},":girl_tone5:":{"unicode":["1f467-1f3ff"],"isCanonical": true},":girl_tone4:":{"unicode":["1f467-1f3fe"],"isCanonical": true},":girl_tone3:":{"unicode":["1f467-1f3fd"],"isCanonical": true},":girl_tone2:":{"unicode":["1f467-1f3fc"],"isCanonical": true},":girl_tone1:":{"unicode":["1f467-1f3fb"],"isCanonical": true},":boy_tone5:":{"unicode":["1f466-1f3ff"],"isCanonical": true},":boy_tone4:":{"unicode":["1f466-1f3fe"],"isCanonical": true},":boy_tone3:":{"unicode":["1f466-1f3fd"],"isCanonical": true},":boy_tone2:":{"unicode":["1f466-1f3fc"],"isCanonical": true},":boy_tone1:":{"unicode":["1f466-1f3fb"],"isCanonical": true},":open_hands_tone5:":{"unicode":["1f450-1f3ff"],"isCanonical": true},":open_hands_tone4:":{"unicode":["1f450-1f3fe"],"isCanonical": true},":open_hands_tone3:":{"unicode":["1f450-1f3fd"],"isCanonical": true},":open_hands_tone2:":{"unicode":["1f450-1f3fc"],"isCanonical": true},":open_hands_tone1:":{"unicode":["1f450-1f3fb"],"isCanonical": true},":clap_tone5:":{"unicode":["1f44f-1f3ff"],"isCanonical": true},":clap_tone4:":{"unicode":["1f44f-1f3fe"],"isCanonical": true},":clap_tone3:":{"unicode":["1f44f-1f3fd"],"isCanonical": true},":clap_tone2:":{"unicode":["1f44f-1f3fc"],"isCanonical": true},":clap_tone1:":{"unicode":["1f44f-1f3fb"],"isCanonical": true},":thumbsdown_tone5:":{"unicode":["1f44e-1f3ff"],"isCanonical": true},":-1_tone5:":{"unicode":["1f44e-1f3ff"],"isCanonical": false},":thumbdown_tone5:":{"unicode":["1f44e-1f3ff"],"isCanonical": false},":thumbsdown_tone4:":{"unicode":["1f44e-1f3fe"],"isCanonical": true},":-1_tone4:":{"unicode":["1f44e-1f3fe"],"isCanonical": false},":thumbdown_tone4:":{"unicode":["1f44e-1f3fe"],"isCanonical": false},":thumbsdown_tone3:":{"unicode":["1f44e-1f3fd"],"isCanonical": true},":-1_tone3:":{"unicode":["1f44e-1f3fd"],"isCanonical": false},":thumbdown_tone3:":{"unicode":["1f44e-1f3fd"],"isCanonical": false},":thumbsdown_tone2:":{"unicode":["1f44e-1f3fc"],"isCanonical": true},":-1_tone2:":{"unicode":["1f44e-1f3fc"],"isCanonical": false},":thumbdown_tone2:":{"unicode":["1f44e-1f3fc"],"isCanonical": false},":thumbsdown_tone1:":{"unicode":["1f44e-1f3fb"],"isCanonical": true},":-1_tone1:":{"unicode":["1f44e-1f3fb"],"isCanonical": false},":thumbdown_tone1:":{"unicode":["1f44e-1f3fb"],"isCanonical": false},":thumbsup_tone5:":{"unicode":["1f44d-1f3ff"],"isCanonical": true},":+1_tone5:":{"unicode":["1f44d-1f3ff"],"isCanonical": false},":thumbup_tone5:":{"unicode":["1f44d-1f3ff"],"isCanonical": false},":thumbsup_tone4:":{"unicode":["1f44d-1f3fe"],"isCanonical": true},":+1_tone4:":{"unicode":["1f44d-1f3fe"],"isCanonical": false},":thumbup_tone4:":{"unicode":["1f44d-1f3fe"],"isCanonical": false},":thumbsup_tone3:":{"unicode":["1f44d-1f3fd"],"isCanonical": true},":+1_tone3:":{"unicode":["1f44d-1f3fd"],"isCanonical": false},":thumbup_tone3:":{"unicode":["1f44d-1f3fd"],"isCanonical": false},":thumbsup_tone2:":{"unicode":["1f44d-1f3fc"],"isCanonical": true},":+1_tone2:":{"unicode":["1f44d-1f3fc"],"isCanonical": false},":thumbup_tone2:":{"unicode":["1f44d-1f3fc"],"isCanonical": false},":thumbsup_tone1:":{"unicode":["1f44d-1f3fb"],"isCanonical": true},":+1_tone1:":{"unicode":["1f44d-1f3fb"],"isCanonical": false},":thumbup_tone1:":{"unicode":["1f44d-1f3fb"],"isCanonical": false},":ok_hand_tone5:":{"unicode":["1f44c-1f3ff"],"isCanonical": true},":ok_hand_tone4:":{"unicode":["1f44c-1f3fe"],"isCanonical": true},":ok_hand_tone3:":{"unicode":["1f44c-1f3fd"],"isCanonical": true},":ok_hand_tone2:":{"unicode":["1f44c-1f3fc"],"isCanonical": true},":ok_hand_tone1:":{"unicode":["1f44c-1f3fb"],"isCanonical": true},":wave_tone5:":{"unicode":["1f44b-1f3ff"],"isCanonical": true},":wave_tone4:":{"unicode":["1f44b-1f3fe"],"isCanonical": true},":wave_tone3:":{"unicode":["1f44b-1f3fd"],"isCanonical": true},":wave_tone2:":{"unicode":["1f44b-1f3fc"],"isCanonical": true},":wave_tone1:":{"unicode":["1f44b-1f3fb"],"isCanonical": true},":punch_tone5:":{"unicode":["1f44a-1f3ff"],"isCanonical": true},":punch_tone4:":{"unicode":["1f44a-1f3fe"],"isCanonical": true},":punch_tone3:":{"unicode":["1f44a-1f3fd"],"isCanonical": true},":punch_tone2:":{"unicode":["1f44a-1f3fc"],"isCanonical": true},":punch_tone1:":{"unicode":["1f44a-1f3fb"],"isCanonical": true},":point_right_tone5:":{"unicode":["1f449-1f3ff"],"isCanonical": true},":point_right_tone4:":{"unicode":["1f449-1f3fe"],"isCanonical": true},":point_right_tone3:":{"unicode":["1f449-1f3fd"],"isCanonical": true},":point_right_tone2:":{"unicode":["1f449-1f3fc"],"isCanonical": true},":point_right_tone1:":{"unicode":["1f449-1f3fb"],"isCanonical": true},":point_left_tone5:":{"unicode":["1f448-1f3ff"],"isCanonical": true},":point_left_tone4:":{"unicode":["1f448-1f3fe"],"isCanonical": true},":point_left_tone3:":{"unicode":["1f448-1f3fd"],"isCanonical": true},":point_left_tone2:":{"unicode":["1f448-1f3fc"],"isCanonical": true},":point_left_tone1:":{"unicode":["1f448-1f3fb"],"isCanonical": true},":point_down_tone5:":{"unicode":["1f447-1f3ff"],"isCanonical": true},":point_down_tone4:":{"unicode":["1f447-1f3fe"],"isCanonical": true},":point_down_tone3:":{"unicode":["1f447-1f3fd"],"isCanonical": true},":point_down_tone2:":{"unicode":["1f447-1f3fc"],"isCanonical": true},":point_down_tone1:":{"unicode":["1f447-1f3fb"],"isCanonical": true},":point_up_2_tone5:":{"unicode":["1f446-1f3ff"],"isCanonical": true},":point_up_2_tone4:":{"unicode":["1f446-1f3fe"],"isCanonical": true},":point_up_2_tone3:":{"unicode":["1f446-1f3fd"],"isCanonical": true},":point_up_2_tone2:":{"unicode":["1f446-1f3fc"],"isCanonical": true},":point_up_2_tone1:":{"unicode":["1f446-1f3fb"],"isCanonical": true},":nose_tone5:":{"unicode":["1f443-1f3ff"],"isCanonical": true},":nose_tone4:":{"unicode":["1f443-1f3fe"],"isCanonical": true},":nose_tone3:":{"unicode":["1f443-1f3fd"],"isCanonical": true},":nose_tone2:":{"unicode":["1f443-1f3fc"],"isCanonical": true},":nose_tone1:":{"unicode":["1f443-1f3fb"],"isCanonical": true},":ear_tone5:":{"unicode":["1f442-1f3ff"],"isCanonical": true},":ear_tone4:":{"unicode":["1f442-1f3fe"],"isCanonical": true},":ear_tone3:":{"unicode":["1f442-1f3fd"],"isCanonical": true},":ear_tone2:":{"unicode":["1f442-1f3fc"],"isCanonical": true},":ear_tone1:":{"unicode":["1f442-1f3fb"],"isCanonical": true},":gay_pride_flag:":{"unicode":["1f3f3-1f308"],"isCanonical": true},":rainbow_flag:":{"unicode":["1f3f3-1f308"],"isCanonical": false},":lifter_tone5:":{"unicode":["1f3cb-1f3ff"],"isCanonical": true},":weight_lifter_tone5:":{"unicode":["1f3cb-1f3ff"],"isCanonical": false},":lifter_tone4:":{"unicode":["1f3cb-1f3fe"],"isCanonical": true},":weight_lifter_tone4:":{"unicode":["1f3cb-1f3fe"],"isCanonical": false},":lifter_tone3:":{"unicode":["1f3cb-1f3fd"],"isCanonical": true},":weight_lifter_tone3:":{"unicode":["1f3cb-1f3fd"],"isCanonical": false},":lifter_tone2:":{"unicode":["1f3cb-1f3fc"],"isCanonical": true},":weight_lifter_tone2:":{"unicode":["1f3cb-1f3fc"],"isCanonical": false},":lifter_tone1:":{"unicode":["1f3cb-1f3fb"],"isCanonical": true},":weight_lifter_tone1:":{"unicode":["1f3cb-1f3fb"],"isCanonical": false},":swimmer_tone5:":{"unicode":["1f3ca-1f3ff"],"isCanonical": true},":swimmer_tone4:":{"unicode":["1f3ca-1f3fe"],"isCanonical": true},":swimmer_tone3:":{"unicode":["1f3ca-1f3fd"],"isCanonical": true},":swimmer_tone2:":{"unicode":["1f3ca-1f3fc"],"isCanonical": true},":swimmer_tone1:":{"unicode":["1f3ca-1f3fb"],"isCanonical": true},":horse_racing_tone5:":{"unicode":["1f3c7-1f3ff"],"isCanonical": true},":horse_racing_tone4:":{"unicode":["1f3c7-1f3fe"],"isCanonical": true},":horse_racing_tone3:":{"unicode":["1f3c7-1f3fd"],"isCanonical": true},":horse_racing_tone2:":{"unicode":["1f3c7-1f3fc"],"isCanonical": true},":horse_racing_tone1:":{"unicode":["1f3c7-1f3fb"],"isCanonical": true},":surfer_tone5:":{"unicode":["1f3c4-1f3ff"],"isCanonical": true},":surfer_tone4:":{"unicode":["1f3c4-1f3fe"],"isCanonical": true},":surfer_tone3:":{"unicode":["1f3c4-1f3fd"],"isCanonical": true},":surfer_tone2:":{"unicode":["1f3c4-1f3fc"],"isCanonical": true},":surfer_tone1:":{"unicode":["1f3c4-1f3fb"],"isCanonical": true},":runner_tone5:":{"unicode":["1f3c3-1f3ff"],"isCanonical": true},":runner_tone4:":{"unicode":["1f3c3-1f3fe"],"isCanonical": true},":runner_tone3:":{"unicode":["1f3c3-1f3fd"],"isCanonical": true},":runner_tone2:":{"unicode":["1f3c3-1f3fc"],"isCanonical": true},":runner_tone1:":{"unicode":["1f3c3-1f3fb"],"isCanonical": true},":santa_tone5:":{"unicode":["1f385-1f3ff"],"isCanonical": true},":santa_tone4:":{"unicode":["1f385-1f3fe"],"isCanonical": true},":santa_tone3:":{"unicode":["1f385-1f3fd"],"isCanonical": true},":santa_tone2:":{"unicode":["1f385-1f3fc"],"isCanonical": true},":santa_tone1:":{"unicode":["1f385-1f3fb"],"isCanonical": true},":flag_zw:":{"unicode":["1f1ff-1f1fc"],"isCanonical": true},":zw:":{"unicode":["1f1ff-1f1fc"],"isCanonical": false},":flag_zm:":{"unicode":["1f1ff-1f1f2"],"isCanonical": true},":zm:":{"unicode":["1f1ff-1f1f2"],"isCanonical": false},":flag_za:":{"unicode":["1f1ff-1f1e6"],"isCanonical": true},":za:":{"unicode":["1f1ff-1f1e6"],"isCanonical": false},":flag_yt:":{"unicode":["1f1fe-1f1f9"],"isCanonical": true},":yt:":{"unicode":["1f1fe-1f1f9"],"isCanonical": false},":flag_ye:":{"unicode":["1f1fe-1f1ea"],"isCanonical": true},":ye:":{"unicode":["1f1fe-1f1ea"],"isCanonical": false},":flag_xk:":{"unicode":["1f1fd-1f1f0"],"isCanonical": true},":xk:":{"unicode":["1f1fd-1f1f0"],"isCanonical": false},":flag_ws:":{"unicode":["1f1fc-1f1f8"],"isCanonical": true},":ws:":{"unicode":["1f1fc-1f1f8"],"isCanonical": false},":flag_wf:":{"unicode":["1f1fc-1f1eb"],"isCanonical": true},":wf:":{"unicode":["1f1fc-1f1eb"],"isCanonical": false},":flag_vu:":{"unicode":["1f1fb-1f1fa"],"isCanonical": true},":vu:":{"unicode":["1f1fb-1f1fa"],"isCanonical": false},":flag_vn:":{"unicode":["1f1fb-1f1f3"],"isCanonical": true},":vn:":{"unicode":["1f1fb-1f1f3"],"isCanonical": false},":flag_vi:":{"unicode":["1f1fb-1f1ee"],"isCanonical": true},":vi:":{"unicode":["1f1fb-1f1ee"],"isCanonical": false},":flag_vg:":{"unicode":["1f1fb-1f1ec"],"isCanonical": true},":vg:":{"unicode":["1f1fb-1f1ec"],"isCanonical": false},":flag_ve:":{"unicode":["1f1fb-1f1ea"],"isCanonical": true},":ve:":{"unicode":["1f1fb-1f1ea"],"isCanonical": false},":flag_vc:":{"unicode":["1f1fb-1f1e8"],"isCanonical": true},":vc:":{"unicode":["1f1fb-1f1e8"],"isCanonical": false},":flag_va:":{"unicode":["1f1fb-1f1e6"],"isCanonical": true},":va:":{"unicode":["1f1fb-1f1e6"],"isCanonical": false},":flag_uz:":{"unicode":["1f1fa-1f1ff"],"isCanonical": true},":uz:":{"unicode":["1f1fa-1f1ff"],"isCanonical": false},":flag_uy:":{"unicode":["1f1fa-1f1fe"],"isCanonical": true},":uy:":{"unicode":["1f1fa-1f1fe"],"isCanonical": false},":flag_us:":{"unicode":["1f1fa-1f1f8"],"isCanonical": true},":us:":{"unicode":["1f1fa-1f1f8"],"isCanonical": false},":flag_um:":{"unicode":["1f1fa-1f1f2"],"isCanonical": true},":um:":{"unicode":["1f1fa-1f1f2"],"isCanonical": false},":flag_ug:":{"unicode":["1f1fa-1f1ec"],"isCanonical": true},":ug:":{"unicode":["1f1fa-1f1ec"],"isCanonical": false},":flag_ua:":{"unicode":["1f1fa-1f1e6"],"isCanonical": true},":ua:":{"unicode":["1f1fa-1f1e6"],"isCanonical": false},":flag_tz:":{"unicode":["1f1f9-1f1ff"],"isCanonical": true},":tz:":{"unicode":["1f1f9-1f1ff"],"isCanonical": false},":flag_tw:":{"unicode":["1f1f9-1f1fc"],"isCanonical": true},":tw:":{"unicode":["1f1f9-1f1fc"],"isCanonical": false},":flag_tv:":{"unicode":["1f1f9-1f1fb"],"isCanonical": true},":tuvalu:":{"unicode":["1f1f9-1f1fb"],"isCanonical": false},":flag_tt:":{"unicode":["1f1f9-1f1f9"],"isCanonical": true},":tt:":{"unicode":["1f1f9-1f1f9"],"isCanonical": false},":flag_tr:":{"unicode":["1f1f9-1f1f7"],"isCanonical": true},":tr:":{"unicode":["1f1f9-1f1f7"],"isCanonical": false},":flag_to:":{"unicode":["1f1f9-1f1f4"],"isCanonical": true},":to:":{"unicode":["1f1f9-1f1f4"],"isCanonical": false},":flag_tn:":{"unicode":["1f1f9-1f1f3"],"isCanonical": true},":tn:":{"unicode":["1f1f9-1f1f3"],"isCanonical": false},":flag_tm:":{"unicode":["1f1f9-1f1f2"],"isCanonical": true},":turkmenistan:":{"unicode":["1f1f9-1f1f2"],"isCanonical": false},":flag_tl:":{"unicode":["1f1f9-1f1f1"],"isCanonical": true},":tl:":{"unicode":["1f1f9-1f1f1"],"isCanonical": false},":flag_tk:":{"unicode":["1f1f9-1f1f0"],"isCanonical": true},":tk:":{"unicode":["1f1f9-1f1f0"],"isCanonical": false},":flag_tj:":{"unicode":["1f1f9-1f1ef"],"isCanonical": true},":tj:":{"unicode":["1f1f9-1f1ef"],"isCanonical": false},":flag_th:":{"unicode":["1f1f9-1f1ed"],"isCanonical": true},":th:":{"unicode":["1f1f9-1f1ed"],"isCanonical": false},":flag_tg:":{"unicode":["1f1f9-1f1ec"],"isCanonical": true},":tg:":{"unicode":["1f1f9-1f1ec"],"isCanonical": false},":flag_tf:":{"unicode":["1f1f9-1f1eb"],"isCanonical": true},":tf:":{"unicode":["1f1f9-1f1eb"],"isCanonical": false},":flag_td:":{"unicode":["1f1f9-1f1e9"],"isCanonical": true},":td:":{"unicode":["1f1f9-1f1e9"],"isCanonical": false},":flag_tc:":{"unicode":["1f1f9-1f1e8"],"isCanonical": true},":tc:":{"unicode":["1f1f9-1f1e8"],"isCanonical": false},":flag_ta:":{"unicode":["1f1f9-1f1e6"],"isCanonical": true},":ta:":{"unicode":["1f1f9-1f1e6"],"isCanonical": false},":flag_sz:":{"unicode":["1f1f8-1f1ff"],"isCanonical": true},":sz:":{"unicode":["1f1f8-1f1ff"],"isCanonical": false},":flag_sy:":{"unicode":["1f1f8-1f1fe"],"isCanonical": true},":sy:":{"unicode":["1f1f8-1f1fe"],"isCanonical": false},":flag_sx:":{"unicode":["1f1f8-1f1fd"],"isCanonical": true},":sx:":{"unicode":["1f1f8-1f1fd"],"isCanonical": false},":flag_sv:":{"unicode":["1f1f8-1f1fb"],"isCanonical": true},":sv:":{"unicode":["1f1f8-1f1fb"],"isCanonical": false},":flag_st:":{"unicode":["1f1f8-1f1f9"],"isCanonical": true},":st:":{"unicode":["1f1f8-1f1f9"],"isCanonical": false},":flag_ss:":{"unicode":["1f1f8-1f1f8"],"isCanonical": true},":ss:":{"unicode":["1f1f8-1f1f8"],"isCanonical": false},":flag_sr:":{"unicode":["1f1f8-1f1f7"],"isCanonical": true},":sr:":{"unicode":["1f1f8-1f1f7"],"isCanonical": false},":flag_so:":{"unicode":["1f1f8-1f1f4"],"isCanonical": true},":so:":{"unicode":["1f1f8-1f1f4"],"isCanonical": false},":flag_sn:":{"unicode":["1f1f8-1f1f3"],"isCanonical": true},":sn:":{"unicode":["1f1f8-1f1f3"],"isCanonical": false},":flag_sm:":{"unicode":["1f1f8-1f1f2"],"isCanonical": true},":sm:":{"unicode":["1f1f8-1f1f2"],"isCanonical": false},":flag_sl:":{"unicode":["1f1f8-1f1f1"],"isCanonical": true},":sl:":{"unicode":["1f1f8-1f1f1"],"isCanonical": false},":flag_sk:":{"unicode":["1f1f8-1f1f0"],"isCanonical": true},":sk:":{"unicode":["1f1f8-1f1f0"],"isCanonical": false},":flag_sj:":{"unicode":["1f1f8-1f1ef"],"isCanonical": true},":sj:":{"unicode":["1f1f8-1f1ef"],"isCanonical": false},":flag_si:":{"unicode":["1f1f8-1f1ee"],"isCanonical": true},":si:":{"unicode":["1f1f8-1f1ee"],"isCanonical": false},":flag_sh:":{"unicode":["1f1f8-1f1ed"],"isCanonical": true},":sh:":{"unicode":["1f1f8-1f1ed"],"isCanonical": false},":flag_sg:":{"unicode":["1f1f8-1f1ec"],"isCanonical": true},":sg:":{"unicode":["1f1f8-1f1ec"],"isCanonical": false},":flag_se:":{"unicode":["1f1f8-1f1ea"],"isCanonical": true},":se:":{"unicode":["1f1f8-1f1ea"],"isCanonical": false},":flag_sd:":{"unicode":["1f1f8-1f1e9"],"isCanonical": true},":sd:":{"unicode":["1f1f8-1f1e9"],"isCanonical": false},":flag_sc:":{"unicode":["1f1f8-1f1e8"],"isCanonical": true},":sc:":{"unicode":["1f1f8-1f1e8"],"isCanonical": false},":flag_sb:":{"unicode":["1f1f8-1f1e7"],"isCanonical": true},":sb:":{"unicode":["1f1f8-1f1e7"],"isCanonical": false},":flag_sa:":{"unicode":["1f1f8-1f1e6"],"isCanonical": true},":saudiarabia:":{"unicode":["1f1f8-1f1e6"],"isCanonical": false},":saudi:":{"unicode":["1f1f8-1f1e6"],"isCanonical": false},":flag_rw:":{"unicode":["1f1f7-1f1fc"],"isCanonical": true},":rw:":{"unicode":["1f1f7-1f1fc"],"isCanonical": false},":flag_ru:":{"unicode":["1f1f7-1f1fa"],"isCanonical": true},":ru:":{"unicode":["1f1f7-1f1fa"],"isCanonical": false},":flag_rs:":{"unicode":["1f1f7-1f1f8"],"isCanonical": true},":rs:":{"unicode":["1f1f7-1f1f8"],"isCanonical": false},":flag_ro:":{"unicode":["1f1f7-1f1f4"],"isCanonical": true},":ro:":{"unicode":["1f1f7-1f1f4"],"isCanonical": false},":flag_re:":{"unicode":["1f1f7-1f1ea"],"isCanonical": true},":re:":{"unicode":["1f1f7-1f1ea"],"isCanonical": false},":flag_qa:":{"unicode":["1f1f6-1f1e6"],"isCanonical": true},":qa:":{"unicode":["1f1f6-1f1e6"],"isCanonical": false},":flag_py:":{"unicode":["1f1f5-1f1fe"],"isCanonical": true},":py:":{"unicode":["1f1f5-1f1fe"],"isCanonical": false},":flag_pw:":{"unicode":["1f1f5-1f1fc"],"isCanonical": true},":pw:":{"unicode":["1f1f5-1f1fc"],"isCanonical": false},":flag_pt:":{"unicode":["1f1f5-1f1f9"],"isCanonical": true},":pt:":{"unicode":["1f1f5-1f1f9"],"isCanonical": false},":flag_ps:":{"unicode":["1f1f5-1f1f8"],"isCanonical": true},":ps:":{"unicode":["1f1f5-1f1f8"],"isCanonical": false},":flag_pr:":{"unicode":["1f1f5-1f1f7"],"isCanonical": true},":pr:":{"unicode":["1f1f5-1f1f7"],"isCanonical": false},":flag_pn:":{"unicode":["1f1f5-1f1f3"],"isCanonical": true},":pn:":{"unicode":["1f1f5-1f1f3"],"isCanonical": false},":flag_pm:":{"unicode":["1f1f5-1f1f2"],"isCanonical": true},":pm:":{"unicode":["1f1f5-1f1f2"],"isCanonical": false},":flag_pl:":{"unicode":["1f1f5-1f1f1"],"isCanonical": true},":pl:":{"unicode":["1f1f5-1f1f1"],"isCanonical": false},":flag_pk:":{"unicode":["1f1f5-1f1f0"],"isCanonical": true},":pk:":{"unicode":["1f1f5-1f1f0"],"isCanonical": false},":flag_ph:":{"unicode":["1f1f5-1f1ed"],"isCanonical": true},":ph:":{"unicode":["1f1f5-1f1ed"],"isCanonical": false},":flag_pg:":{"unicode":["1f1f5-1f1ec"],"isCanonical": true},":pg:":{"unicode":["1f1f5-1f1ec"],"isCanonical": false},":flag_pf:":{"unicode":["1f1f5-1f1eb"],"isCanonical": true},":pf:":{"unicode":["1f1f5-1f1eb"],"isCanonical": false},":flag_pe:":{"unicode":["1f1f5-1f1ea"],"isCanonical": true},":pe:":{"unicode":["1f1f5-1f1ea"],"isCanonical": false},":flag_pa:":{"unicode":["1f1f5-1f1e6"],"isCanonical": true},":pa:":{"unicode":["1f1f5-1f1e6"],"isCanonical": false},":flag_om:":{"unicode":["1f1f4-1f1f2"],"isCanonical": true},":om:":{"unicode":["1f1f4-1f1f2"],"isCanonical": false},":flag_nz:":{"unicode":["1f1f3-1f1ff"],"isCanonical": true},":nz:":{"unicode":["1f1f3-1f1ff"],"isCanonical": false},":flag_nu:":{"unicode":["1f1f3-1f1fa"],"isCanonical": true},":nu:":{"unicode":["1f1f3-1f1fa"],"isCanonical": false},":flag_nr:":{"unicode":["1f1f3-1f1f7"],"isCanonical": true},":nr:":{"unicode":["1f1f3-1f1f7"],"isCanonical": false},":flag_np:":{"unicode":["1f1f3-1f1f5"],"isCanonical": true},":np:":{"unicode":["1f1f3-1f1f5"],"isCanonical": false},":flag_no:":{"unicode":["1f1f3-1f1f4"],"isCanonical": true},":no:":{"unicode":["1f1f3-1f1f4"],"isCanonical": false},":flag_nl:":{"unicode":["1f1f3-1f1f1"],"isCanonical": true},":nl:":{"unicode":["1f1f3-1f1f1"],"isCanonical": false},":flag_ni:":{"unicode":["1f1f3-1f1ee"],"isCanonical": true},":ni:":{"unicode":["1f1f3-1f1ee"],"isCanonical": false},":flag_ng:":{"unicode":["1f1f3-1f1ec"],"isCanonical": true},":nigeria:":{"unicode":["1f1f3-1f1ec"],"isCanonical": false},":flag_nf:":{"unicode":["1f1f3-1f1eb"],"isCanonical": true},":nf:":{"unicode":["1f1f3-1f1eb"],"isCanonical": false},":flag_ne:":{"unicode":["1f1f3-1f1ea"],"isCanonical": true},":ne:":{"unicode":["1f1f3-1f1ea"],"isCanonical": false},":flag_nc:":{"unicode":["1f1f3-1f1e8"],"isCanonical": true},":nc:":{"unicode":["1f1f3-1f1e8"],"isCanonical": false},":flag_na:":{"unicode":["1f1f3-1f1e6"],"isCanonical": true},":na:":{"unicode":["1f1f3-1f1e6"],"isCanonical": false},":flag_mz:":{"unicode":["1f1f2-1f1ff"],"isCanonical": true},":mz:":{"unicode":["1f1f2-1f1ff"],"isCanonical": false},":flag_my:":{"unicode":["1f1f2-1f1fe"],"isCanonical": true},":my:":{"unicode":["1f1f2-1f1fe"],"isCanonical": false},":flag_mx:":{"unicode":["1f1f2-1f1fd"],"isCanonical": true},":mx:":{"unicode":["1f1f2-1f1fd"],"isCanonical": false},":flag_mw:":{"unicode":["1f1f2-1f1fc"],"isCanonical": true},":mw:":{"unicode":["1f1f2-1f1fc"],"isCanonical": false},":flag_mv:":{"unicode":["1f1f2-1f1fb"],"isCanonical": true},":mv:":{"unicode":["1f1f2-1f1fb"],"isCanonical": false},":flag_mu:":{"unicode":["1f1f2-1f1fa"],"isCanonical": true},":mu:":{"unicode":["1f1f2-1f1fa"],"isCanonical": false},":flag_mt:":{"unicode":["1f1f2-1f1f9"],"isCanonical": true},":mt:":{"unicode":["1f1f2-1f1f9"],"isCanonical": false},":flag_ms:":{"unicode":["1f1f2-1f1f8"],"isCanonical": true},":ms:":{"unicode":["1f1f2-1f1f8"],"isCanonical": false},":flag_mr:":{"unicode":["1f1f2-1f1f7"],"isCanonical": true},":mr:":{"unicode":["1f1f2-1f1f7"],"isCanonical": false},":flag_mq:":{"unicode":["1f1f2-1f1f6"],"isCanonical": true},":mq:":{"unicode":["1f1f2-1f1f6"],"isCanonical": false},":flag_mp:":{"unicode":["1f1f2-1f1f5"],"isCanonical": true},":mp:":{"unicode":["1f1f2-1f1f5"],"isCanonical": false},":flag_mo:":{"unicode":["1f1f2-1f1f4"],"isCanonical": true},":mo:":{"unicode":["1f1f2-1f1f4"],"isCanonical": false},":flag_mn:":{"unicode":["1f1f2-1f1f3"],"isCanonical": true},":mn:":{"unicode":["1f1f2-1f1f3"],"isCanonical": false},":flag_mm:":{"unicode":["1f1f2-1f1f2"],"isCanonical": true},":mm:":{"unicode":["1f1f2-1f1f2"],"isCanonical": false},":flag_ml:":{"unicode":["1f1f2-1f1f1"],"isCanonical": true},":ml:":{"unicode":["1f1f2-1f1f1"],"isCanonical": false},":flag_mk:":{"unicode":["1f1f2-1f1f0"],"isCanonical": true},":mk:":{"unicode":["1f1f2-1f1f0"],"isCanonical": false},":flag_mh:":{"unicode":["1f1f2-1f1ed"],"isCanonical": true},":mh:":{"unicode":["1f1f2-1f1ed"],"isCanonical": false},":flag_mg:":{"unicode":["1f1f2-1f1ec"],"isCanonical": true},":mg:":{"unicode":["1f1f2-1f1ec"],"isCanonical": false},":flag_mf:":{"unicode":["1f1f2-1f1eb"],"isCanonical": true},":mf:":{"unicode":["1f1f2-1f1eb"],"isCanonical": false},":flag_me:":{"unicode":["1f1f2-1f1ea"],"isCanonical": true},":me:":{"unicode":["1f1f2-1f1ea"],"isCanonical": false},":flag_md:":{"unicode":["1f1f2-1f1e9"],"isCanonical": true},":md:":{"unicode":["1f1f2-1f1e9"],"isCanonical": false},":flag_mc:":{"unicode":["1f1f2-1f1e8"],"isCanonical": true},":mc:":{"unicode":["1f1f2-1f1e8"],"isCanonical": false},":flag_ma:":{"unicode":["1f1f2-1f1e6"],"isCanonical": true},":ma:":{"unicode":["1f1f2-1f1e6"],"isCanonical": false},":flag_ly:":{"unicode":["1f1f1-1f1fe"],"isCanonical": true},":ly:":{"unicode":["1f1f1-1f1fe"],"isCanonical": false},":flag_lv:":{"unicode":["1f1f1-1f1fb"],"isCanonical": true},":lv:":{"unicode":["1f1f1-1f1fb"],"isCanonical": false},":flag_lu:":{"unicode":["1f1f1-1f1fa"],"isCanonical": true},":lu:":{"unicode":["1f1f1-1f1fa"],"isCanonical": false},":flag_lt:":{"unicode":["1f1f1-1f1f9"],"isCanonical": true},":lt:":{"unicode":["1f1f1-1f1f9"],"isCanonical": false},":flag_ls:":{"unicode":["1f1f1-1f1f8"],"isCanonical": true},":ls:":{"unicode":["1f1f1-1f1f8"],"isCanonical": false},":flag_lr:":{"unicode":["1f1f1-1f1f7"],"isCanonical": true},":lr:":{"unicode":["1f1f1-1f1f7"],"isCanonical": false},":flag_lk:":{"unicode":["1f1f1-1f1f0"],"isCanonical": true},":lk:":{"unicode":["1f1f1-1f1f0"],"isCanonical": false},":flag_li:":{"unicode":["1f1f1-1f1ee"],"isCanonical": true},":li:":{"unicode":["1f1f1-1f1ee"],"isCanonical": false},":flag_lc:":{"unicode":["1f1f1-1f1e8"],"isCanonical": true},":lc:":{"unicode":["1f1f1-1f1e8"],"isCanonical": false},":flag_lb:":{"unicode":["1f1f1-1f1e7"],"isCanonical": true},":lb:":{"unicode":["1f1f1-1f1e7"],"isCanonical": false},":flag_la:":{"unicode":["1f1f1-1f1e6"],"isCanonical": true},":la:":{"unicode":["1f1f1-1f1e6"],"isCanonical": false},":flag_kz:":{"unicode":["1f1f0-1f1ff"],"isCanonical": true},":kz:":{"unicode":["1f1f0-1f1ff"],"isCanonical": false},":flag_ky:":{"unicode":["1f1f0-1f1fe"],"isCanonical": true},":ky:":{"unicode":["1f1f0-1f1fe"],"isCanonical": false},":flag_kw:":{"unicode":["1f1f0-1f1fc"],"isCanonical": true},":kw:":{"unicode":["1f1f0-1f1fc"],"isCanonical": false},":flag_kr:":{"unicode":["1f1f0-1f1f7"],"isCanonical": true},":kr:":{"unicode":["1f1f0-1f1f7"],"isCanonical": false},":flag_kp:":{"unicode":["1f1f0-1f1f5"],"isCanonical": true},":kp:":{"unicode":["1f1f0-1f1f5"],"isCanonical": false},":flag_kn:":{"unicode":["1f1f0-1f1f3"],"isCanonical": true},":kn:":{"unicode":["1f1f0-1f1f3"],"isCanonical": false},":flag_km:":{"unicode":["1f1f0-1f1f2"],"isCanonical": true},":km:":{"unicode":["1f1f0-1f1f2"],"isCanonical": false},":flag_ki:":{"unicode":["1f1f0-1f1ee"],"isCanonical": true},":ki:":{"unicode":["1f1f0-1f1ee"],"isCanonical": false},":flag_kh:":{"unicode":["1f1f0-1f1ed"],"isCanonical": true},":kh:":{"unicode":["1f1f0-1f1ed"],"isCanonical": false},":flag_kg:":{"unicode":["1f1f0-1f1ec"],"isCanonical": true},":kg:":{"unicode":["1f1f0-1f1ec"],"isCanonical": false},":flag_ke:":{"unicode":["1f1f0-1f1ea"],"isCanonical": true},":ke:":{"unicode":["1f1f0-1f1ea"],"isCanonical": false},":flag_jp:":{"unicode":["1f1ef-1f1f5"],"isCanonical": true},":jp:":{"unicode":["1f1ef-1f1f5"],"isCanonical": false},":flag_jo:":{"unicode":["1f1ef-1f1f4"],"isCanonical": true},":jo:":{"unicode":["1f1ef-1f1f4"],"isCanonical": false},":flag_jm:":{"unicode":["1f1ef-1f1f2"],"isCanonical": true},":jm:":{"unicode":["1f1ef-1f1f2"],"isCanonical": false},":flag_je:":{"unicode":["1f1ef-1f1ea"],"isCanonical": true},":je:":{"unicode":["1f1ef-1f1ea"],"isCanonical": false},":flag_it:":{"unicode":["1f1ee-1f1f9"],"isCanonical": true},":it:":{"unicode":["1f1ee-1f1f9"],"isCanonical": false},":flag_is:":{"unicode":["1f1ee-1f1f8"],"isCanonical": true},":is:":{"unicode":["1f1ee-1f1f8"],"isCanonical": false},":flag_ir:":{"unicode":["1f1ee-1f1f7"],"isCanonical": true},":ir:":{"unicode":["1f1ee-1f1f7"],"isCanonical": false},":flag_iq:":{"unicode":["1f1ee-1f1f6"],"isCanonical": true},":iq:":{"unicode":["1f1ee-1f1f6"],"isCanonical": false},":flag_io:":{"unicode":["1f1ee-1f1f4"],"isCanonical": true},":io:":{"unicode":["1f1ee-1f1f4"],"isCanonical": false},":flag_in:":{"unicode":["1f1ee-1f1f3"],"isCanonical": true},":in:":{"unicode":["1f1ee-1f1f3"],"isCanonical": false},":flag_im:":{"unicode":["1f1ee-1f1f2"],"isCanonical": true},":im:":{"unicode":["1f1ee-1f1f2"],"isCanonical": false},":flag_il:":{"unicode":["1f1ee-1f1f1"],"isCanonical": true},":il:":{"unicode":["1f1ee-1f1f1"],"isCanonical": false},":flag_ie:":{"unicode":["1f1ee-1f1ea"],"isCanonical": true},":ie:":{"unicode":["1f1ee-1f1ea"],"isCanonical": false},":flag_id:":{"unicode":["1f1ee-1f1e9"],"isCanonical": true},":indonesia:":{"unicode":["1f1ee-1f1e9"],"isCanonical": false},":flag_ic:":{"unicode":["1f1ee-1f1e8"],"isCanonical": true},":ic:":{"unicode":["1f1ee-1f1e8"],"isCanonical": false},":flag_hu:":{"unicode":["1f1ed-1f1fa"],"isCanonical": true},":hu:":{"unicode":["1f1ed-1f1fa"],"isCanonical": false},":flag_ht:":{"unicode":["1f1ed-1f1f9"],"isCanonical": true},":ht:":{"unicode":["1f1ed-1f1f9"],"isCanonical": false},":flag_hr:":{"unicode":["1f1ed-1f1f7"],"isCanonical": true},":hr:":{"unicode":["1f1ed-1f1f7"],"isCanonical": false},":flag_hn:":{"unicode":["1f1ed-1f1f3"],"isCanonical": true},":hn:":{"unicode":["1f1ed-1f1f3"],"isCanonical": false},":flag_hm:":{"unicode":["1f1ed-1f1f2"],"isCanonical": true},":hm:":{"unicode":["1f1ed-1f1f2"],"isCanonical": false},":flag_hk:":{"unicode":["1f1ed-1f1f0"],"isCanonical": true},":hk:":{"unicode":["1f1ed-1f1f0"],"isCanonical": false},":flag_gy:":{"unicode":["1f1ec-1f1fe"],"isCanonical": true},":gy:":{"unicode":["1f1ec-1f1fe"],"isCanonical": false},":flag_gw:":{"unicode":["1f1ec-1f1fc"],"isCanonical": true},":gw:":{"unicode":["1f1ec-1f1fc"],"isCanonical": false},":flag_gu:":{"unicode":["1f1ec-1f1fa"],"isCanonical": true},":gu:":{"unicode":["1f1ec-1f1fa"],"isCanonical": false},":flag_gt:":{"unicode":["1f1ec-1f1f9"],"isCanonical": true},":gt:":{"unicode":["1f1ec-1f1f9"],"isCanonical": false},":flag_gs:":{"unicode":["1f1ec-1f1f8"],"isCanonical": true},":gs:":{"unicode":["1f1ec-1f1f8"],"isCanonical": false},":flag_gr:":{"unicode":["1f1ec-1f1f7"],"isCanonical": true},":gr:":{"unicode":["1f1ec-1f1f7"],"isCanonical": false},":flag_gq:":{"unicode":["1f1ec-1f1f6"],"isCanonical": true},":gq:":{"unicode":["1f1ec-1f1f6"],"isCanonical": false},":flag_gp:":{"unicode":["1f1ec-1f1f5"],"isCanonical": true},":gp:":{"unicode":["1f1ec-1f1f5"],"isCanonical": false},":flag_gn:":{"unicode":["1f1ec-1f1f3"],"isCanonical": true},":gn:":{"unicode":["1f1ec-1f1f3"],"isCanonical": false},":flag_gm:":{"unicode":["1f1ec-1f1f2"],"isCanonical": true},":gm:":{"unicode":["1f1ec-1f1f2"],"isCanonical": false},":flag_gl:":{"unicode":["1f1ec-1f1f1"],"isCanonical": true},":gl:":{"unicode":["1f1ec-1f1f1"],"isCanonical": false},":flag_gi:":{"unicode":["1f1ec-1f1ee"],"isCanonical": true},":gi:":{"unicode":["1f1ec-1f1ee"],"isCanonical": false},":flag_gh:":{"unicode":["1f1ec-1f1ed"],"isCanonical": true},":gh:":{"unicode":["1f1ec-1f1ed"],"isCanonical": false},":flag_gg:":{"unicode":["1f1ec-1f1ec"],"isCanonical": true},":gg:":{"unicode":["1f1ec-1f1ec"],"isCanonical": false},":flag_gf:":{"unicode":["1f1ec-1f1eb"],"isCanonical": true},":gf:":{"unicode":["1f1ec-1f1eb"],"isCanonical": false},":flag_ge:":{"unicode":["1f1ec-1f1ea"],"isCanonical": true},":ge:":{"unicode":["1f1ec-1f1ea"],"isCanonical": false},":flag_gd:":{"unicode":["1f1ec-1f1e9"],"isCanonical": true},":gd:":{"unicode":["1f1ec-1f1e9"],"isCanonical": false},":flag_gb:":{"unicode":["1f1ec-1f1e7"],"isCanonical": true},":gb:":{"unicode":["1f1ec-1f1e7"],"isCanonical": false},":flag_ga:":{"unicode":["1f1ec-1f1e6"],"isCanonical": true},":ga:":{"unicode":["1f1ec-1f1e6"],"isCanonical": false},":flag_fr:":{"unicode":["1f1eb-1f1f7"],"isCanonical": true},":fr:":{"unicode":["1f1eb-1f1f7"],"isCanonical": false},":flag_fo:":{"unicode":["1f1eb-1f1f4"],"isCanonical": true},":fo:":{"unicode":["1f1eb-1f1f4"],"isCanonical": false},":flag_fm:":{"unicode":["1f1eb-1f1f2"],"isCanonical": true},":fm:":{"unicode":["1f1eb-1f1f2"],"isCanonical": false},":flag_fk:":{"unicode":["1f1eb-1f1f0"],"isCanonical": true},":fk:":{"unicode":["1f1eb-1f1f0"],"isCanonical": false},":flag_fj:":{"unicode":["1f1eb-1f1ef"],"isCanonical": true},":fj:":{"unicode":["1f1eb-1f1ef"],"isCanonical": false},":flag_fi:":{"unicode":["1f1eb-1f1ee"],"isCanonical": true},":fi:":{"unicode":["1f1eb-1f1ee"],"isCanonical": false},":flag_eu:":{"unicode":["1f1ea-1f1fa"],"isCanonical": true},":eu:":{"unicode":["1f1ea-1f1fa"],"isCanonical": false},":flag_et:":{"unicode":["1f1ea-1f1f9"],"isCanonical": true},":et:":{"unicode":["1f1ea-1f1f9"],"isCanonical": false},":flag_es:":{"unicode":["1f1ea-1f1f8"],"isCanonical": true},":es:":{"unicode":["1f1ea-1f1f8"],"isCanonical": false},":flag_er:":{"unicode":["1f1ea-1f1f7"],"isCanonical": true},":er:":{"unicode":["1f1ea-1f1f7"],"isCanonical": false},":flag_eh:":{"unicode":["1f1ea-1f1ed"],"isCanonical": true},":eh:":{"unicode":["1f1ea-1f1ed"],"isCanonical": false},":flag_eg:":{"unicode":["1f1ea-1f1ec"],"isCanonical": true},":eg:":{"unicode":["1f1ea-1f1ec"],"isCanonical": false},":flag_ee:":{"unicode":["1f1ea-1f1ea"],"isCanonical": true},":ee:":{"unicode":["1f1ea-1f1ea"],"isCanonical": false},":flag_ec:":{"unicode":["1f1ea-1f1e8"],"isCanonical": true},":ec:":{"unicode":["1f1ea-1f1e8"],"isCanonical": false},":flag_ea:":{"unicode":["1f1ea-1f1e6"],"isCanonical": true},":ea:":{"unicode":["1f1ea-1f1e6"],"isCanonical": false},":flag_dz:":{"unicode":["1f1e9-1f1ff"],"isCanonical": true},":dz:":{"unicode":["1f1e9-1f1ff"],"isCanonical": false},":flag_do:":{"unicode":["1f1e9-1f1f4"],"isCanonical": true},":do:":{"unicode":["1f1e9-1f1f4"],"isCanonical": false},":flag_dm:":{"unicode":["1f1e9-1f1f2"],"isCanonical": true},":dm:":{"unicode":["1f1e9-1f1f2"],"isCanonical": false},":flag_dk:":{"unicode":["1f1e9-1f1f0"],"isCanonical": true},":dk:":{"unicode":["1f1e9-1f1f0"],"isCanonical": false},":flag_dj:":{"unicode":["1f1e9-1f1ef"],"isCanonical": true},":dj:":{"unicode":["1f1e9-1f1ef"],"isCanonical": false},":flag_dg:":{"unicode":["1f1e9-1f1ec"],"isCanonical": true},":dg:":{"unicode":["1f1e9-1f1ec"],"isCanonical": false},":flag_de:":{"unicode":["1f1e9-1f1ea"],"isCanonical": true},":de:":{"unicode":["1f1e9-1f1ea"],"isCanonical": false},":flag_cz:":{"unicode":["1f1e8-1f1ff"],"isCanonical": true},":cz:":{"unicode":["1f1e8-1f1ff"],"isCanonical": false},":flag_cy:":{"unicode":["1f1e8-1f1fe"],"isCanonical": true},":cy:":{"unicode":["1f1e8-1f1fe"],"isCanonical": false},":flag_cx:":{"unicode":["1f1e8-1f1fd"],"isCanonical": true},":cx:":{"unicode":["1f1e8-1f1fd"],"isCanonical": false},":flag_cw:":{"unicode":["1f1e8-1f1fc"],"isCanonical": true},":cw:":{"unicode":["1f1e8-1f1fc"],"isCanonical": false},":flag_cv:":{"unicode":["1f1e8-1f1fb"],"isCanonical": true},":cv:":{"unicode":["1f1e8-1f1fb"],"isCanonical": false},":flag_cu:":{"unicode":["1f1e8-1f1fa"],"isCanonical": true},":cu:":{"unicode":["1f1e8-1f1fa"],"isCanonical": false},":flag_cr:":{"unicode":["1f1e8-1f1f7"],"isCanonical": true},":cr:":{"unicode":["1f1e8-1f1f7"],"isCanonical": false},":flag_cp:":{"unicode":["1f1e8-1f1f5"],"isCanonical": true},":cp:":{"unicode":["1f1e8-1f1f5"],"isCanonical": false},":flag_co:":{"unicode":["1f1e8-1f1f4"],"isCanonical": true},":co:":{"unicode":["1f1e8-1f1f4"],"isCanonical": false},":flag_cn:":{"unicode":["1f1e8-1f1f3"],"isCanonical": true},":cn:":{"unicode":["1f1e8-1f1f3"],"isCanonical": false},":flag_cm:":{"unicode":["1f1e8-1f1f2"],"isCanonical": true},":cm:":{"unicode":["1f1e8-1f1f2"],"isCanonical": false},":flag_cl:":{"unicode":["1f1e8-1f1f1"],"isCanonical": true},":chile:":{"unicode":["1f1e8-1f1f1"],"isCanonical": false},":flag_ck:":{"unicode":["1f1e8-1f1f0"],"isCanonical": true},":ck:":{"unicode":["1f1e8-1f1f0"],"isCanonical": false},":flag_ci:":{"unicode":["1f1e8-1f1ee"],"isCanonical": true},":ci:":{"unicode":["1f1e8-1f1ee"],"isCanonical": false},":flag_ch:":{"unicode":["1f1e8-1f1ed"],"isCanonical": true},":ch:":{"unicode":["1f1e8-1f1ed"],"isCanonical": false},":flag_cg:":{"unicode":["1f1e8-1f1ec"],"isCanonical": true},":cg:":{"unicode":["1f1e8-1f1ec"],"isCanonical": false},":flag_cf:":{"unicode":["1f1e8-1f1eb"],"isCanonical": true},":cf:":{"unicode":["1f1e8-1f1eb"],"isCanonical": false},":flag_cd:":{"unicode":["1f1e8-1f1e9"],"isCanonical": true},":congo:":{"unicode":["1f1e8-1f1e9"],"isCanonical": false},":flag_cc:":{"unicode":["1f1e8-1f1e8"],"isCanonical": true},":cc:":{"unicode":["1f1e8-1f1e8"],"isCanonical": false},":flag_ca:":{"unicode":["1f1e8-1f1e6"],"isCanonical": true},":ca:":{"unicode":["1f1e8-1f1e6"],"isCanonical": false},":flag_bz:":{"unicode":["1f1e7-1f1ff"],"isCanonical": true},":bz:":{"unicode":["1f1e7-1f1ff"],"isCanonical": false},":flag_by:":{"unicode":["1f1e7-1f1fe"],"isCanonical": true},":by:":{"unicode":["1f1e7-1f1fe"],"isCanonical": false},":flag_bw:":{"unicode":["1f1e7-1f1fc"],"isCanonical": true},":bw:":{"unicode":["1f1e7-1f1fc"],"isCanonical": false},":flag_bv:":{"unicode":["1f1e7-1f1fb"],"isCanonical": true},":bv:":{"unicode":["1f1e7-1f1fb"],"isCanonical": false},":flag_bt:":{"unicode":["1f1e7-1f1f9"],"isCanonical": true},":bt:":{"unicode":["1f1e7-1f1f9"],"isCanonical": false},":flag_bs:":{"unicode":["1f1e7-1f1f8"],"isCanonical": true},":bs:":{"unicode":["1f1e7-1f1f8"],"isCanonical": false},":flag_br:":{"unicode":["1f1e7-1f1f7"],"isCanonical": true},":br:":{"unicode":["1f1e7-1f1f7"],"isCanonical": false},":flag_bq:":{"unicode":["1f1e7-1f1f6"],"isCanonical": true},":bq:":{"unicode":["1f1e7-1f1f6"],"isCanonical": false},":flag_bo:":{"unicode":["1f1e7-1f1f4"],"isCanonical": true},":bo:":{"unicode":["1f1e7-1f1f4"],"isCanonical": false},":flag_bn:":{"unicode":["1f1e7-1f1f3"],"isCanonical": true},":bn:":{"unicode":["1f1e7-1f1f3"],"isCanonical": false},":flag_bm:":{"unicode":["1f1e7-1f1f2"],"isCanonical": true},":bm:":{"unicode":["1f1e7-1f1f2"],"isCanonical": false},":flag_bl:":{"unicode":["1f1e7-1f1f1"],"isCanonical": true},":bl:":{"unicode":["1f1e7-1f1f1"],"isCanonical": false},":flag_bj:":{"unicode":["1f1e7-1f1ef"],"isCanonical": true},":bj:":{"unicode":["1f1e7-1f1ef"],"isCanonical": false},":flag_bi:":{"unicode":["1f1e7-1f1ee"],"isCanonical": true},":bi:":{"unicode":["1f1e7-1f1ee"],"isCanonical": false},":flag_bh:":{"unicode":["1f1e7-1f1ed"],"isCanonical": true},":bh:":{"unicode":["1f1e7-1f1ed"],"isCanonical": false},":flag_bg:":{"unicode":["1f1e7-1f1ec"],"isCanonical": true},":bg:":{"unicode":["1f1e7-1f1ec"],"isCanonical": false},":flag_bf:":{"unicode":["1f1e7-1f1eb"],"isCanonical": true},":bf:":{"unicode":["1f1e7-1f1eb"],"isCanonical": false},":flag_be:":{"unicode":["1f1e7-1f1ea"],"isCanonical": true},":be:":{"unicode":["1f1e7-1f1ea"],"isCanonical": false},":flag_bd:":{"unicode":["1f1e7-1f1e9"],"isCanonical": true},":bd:":{"unicode":["1f1e7-1f1e9"],"isCanonical": false},":flag_bb:":{"unicode":["1f1e7-1f1e7"],"isCanonical": true},":bb:":{"unicode":["1f1e7-1f1e7"],"isCanonical": false},":flag_ba:":{"unicode":["1f1e7-1f1e6"],"isCanonical": true},":ba:":{"unicode":["1f1e7-1f1e6"],"isCanonical": false},":flag_az:":{"unicode":["1f1e6-1f1ff"],"isCanonical": true},":az:":{"unicode":["1f1e6-1f1ff"],"isCanonical": false},":flag_ax:":{"unicode":["1f1e6-1f1fd"],"isCanonical": true},":ax:":{"unicode":["1f1e6-1f1fd"],"isCanonical": false},":flag_aw:":{"unicode":["1f1e6-1f1fc"],"isCanonical": true},":aw:":{"unicode":["1f1e6-1f1fc"],"isCanonical": false},":flag_au:":{"unicode":["1f1e6-1f1fa"],"isCanonical": true},":au:":{"unicode":["1f1e6-1f1fa"],"isCanonical": false},":flag_at:":{"unicode":["1f1e6-1f1f9"],"isCanonical": true},":at:":{"unicode":["1f1e6-1f1f9"],"isCanonical": false},":flag_as:":{"unicode":["1f1e6-1f1f8"],"isCanonical": true},":as:":{"unicode":["1f1e6-1f1f8"],"isCanonical": false},":flag_ar:":{"unicode":["1f1e6-1f1f7"],"isCanonical": true},":ar:":{"unicode":["1f1e6-1f1f7"],"isCanonical": false},":flag_aq:":{"unicode":["1f1e6-1f1f6"],"isCanonical": true},":aq:":{"unicode":["1f1e6-1f1f6"],"isCanonical": false},":flag_ao:":{"unicode":["1f1e6-1f1f4"],"isCanonical": true},":ao:":{"unicode":["1f1e6-1f1f4"],"isCanonical": false},":flag_am:":{"unicode":["1f1e6-1f1f2"],"isCanonical": true},":am:":{"unicode":["1f1e6-1f1f2"],"isCanonical": false},":flag_al:":{"unicode":["1f1e6-1f1f1"],"isCanonical": true},":al:":{"unicode":["1f1e6-1f1f1"],"isCanonical": false},":flag_ai:":{"unicode":["1f1e6-1f1ee"],"isCanonical": true},":ai:":{"unicode":["1f1e6-1f1ee"],"isCanonical": false},":flag_ag:":{"unicode":["1f1e6-1f1ec"],"isCanonical": true},":ag:":{"unicode":["1f1e6-1f1ec"],"isCanonical": false},":flag_af:":{"unicode":["1f1e6-1f1eb"],"isCanonical": true},":af:":{"unicode":["1f1e6-1f1eb"],"isCanonical": false},":flag_ae:":{"unicode":["1f1e6-1f1ea"],"isCanonical": true},":ae:":{"unicode":["1f1e6-1f1ea"],"isCanonical": false},":flag_ad:":{"unicode":["1f1e6-1f1e9"],"isCanonical": true},":ad:":{"unicode":["1f1e6-1f1e9"],"isCanonical": false},":flag_ac:":{"unicode":["1f1e6-1f1e8"],"isCanonical": true},":ac:":{"unicode":["1f1e6-1f1e8"],"isCanonical": false},":mahjong:":{"unicode":["1f004-fe0f","1f004"],"isCanonical": true},":parking:":{"unicode":["1f17f-fe0f","1f17f"],"isCanonical": true},":sa:":{"unicode":["1f202-fe0f","1f202"],"isCanonical": true},":u7121:":{"unicode":["1f21a-fe0f","1f21a"],"isCanonical": true},":u6307:":{"unicode":["1f22f-fe0f","1f22f"],"isCanonical": true},":u6708:":{"unicode":["1f237-fe0f","1f237"],"isCanonical": true},":film_frames:":{"unicode":["1f39e-fe0f","1f39e"],"isCanonical": true},":tickets:":{"unicode":["1f39f-fe0f","1f39f"],"isCanonical": true},":admission_tickets:":{"unicode":["1f39f-fe0f","1f39f"],"isCanonical": false},":lifter:":{"unicode":["1f3cb-fe0f","1f3cb"],"isCanonical": true},":weight_lifter:":{"unicode":["1f3cb-fe0f","1f3cb"],"isCanonical": false},":golfer:":{"unicode":["1f3cc-fe0f","1f3cc"],"isCanonical": true},":motorcycle:":{"unicode":["1f3cd-fe0f","1f3cd"],"isCanonical": true},":racing_motorcycle:":{"unicode":["1f3cd-fe0f","1f3cd"],"isCanonical": false},":race_car:":{"unicode":["1f3ce-fe0f","1f3ce"],"isCanonical": true},":racing_car:":{"unicode":["1f3ce-fe0f","1f3ce"],"isCanonical": false},":military_medal:":{"unicode":["1f396-fe0f","1f396"],"isCanonical": true},":reminder_ribbon:":{"unicode":["1f397-fe0f","1f397"],"isCanonical": true},":hot_pepper:":{"unicode":["1f336-fe0f","1f336"],"isCanonical": true},":cloud_rain:":{"unicode":["1f327-fe0f","1f327"],"isCanonical": true},":cloud_with_rain:":{"unicode":["1f327-fe0f","1f327"],"isCanonical": false},":cloud_snow:":{"unicode":["1f328-fe0f","1f328"],"isCanonical": true},":cloud_with_snow:":{"unicode":["1f328-fe0f","1f328"],"isCanonical": false},":cloud_lightning:":{"unicode":["1f329-fe0f","1f329"],"isCanonical": true},":cloud_with_lightning:":{"unicode":["1f329-fe0f","1f329"],"isCanonical": false},":cloud_tornado:":{"unicode":["1f32a-fe0f","1f32a"],"isCanonical": true},":cloud_with_tornado:":{"unicode":["1f32a-fe0f","1f32a"],"isCanonical": false},":fog:":{"unicode":["1f32b-fe0f","1f32b"],"isCanonical": true},":wind_blowing_face:":{"unicode":["1f32c-fe0f","1f32c"],"isCanonical": true},":chipmunk:":{"unicode":["1f43f-fe0f","1f43f"],"isCanonical": true},":spider:":{"unicode":["1f577-fe0f","1f577"],"isCanonical": true},":spider_web:":{"unicode":["1f578-fe0f","1f578"],"isCanonical": true},":thermometer:":{"unicode":["1f321-fe0f","1f321"],"isCanonical": true},":microphone2:":{"unicode":["1f399-fe0f","1f399"],"isCanonical": true},":studio_microphone:":{"unicode":["1f399-fe0f","1f399"],"isCanonical": false},":level_slider:":{"unicode":["1f39a-fe0f","1f39a"],"isCanonical": true},":control_knobs:":{"unicode":["1f39b-fe0f","1f39b"],"isCanonical": true},":flag_white:":{"unicode":["1f3f3-fe0f","1f3f3"],"isCanonical": true},":waving_white_flag:":{"unicode":["1f3f3-fe0f","1f3f3"],"isCanonical": false},":rosette:":{"unicode":["1f3f5-fe0f","1f3f5"],"isCanonical": true},":label:":{"unicode":["1f3f7-fe0f","1f3f7"],"isCanonical": true},":projector:":{"unicode":["1f4fd-fe0f","1f4fd"],"isCanonical": true},":film_projector:":{"unicode":["1f4fd-fe0f","1f4fd"],"isCanonical": false},":om_symbol:":{"unicode":["1f549-fe0f","1f549"],"isCanonical": true},":dove:":{"unicode":["1f54a-fe0f","1f54a"],"isCanonical": true},":dove_of_peace:":{"unicode":["1f54a-fe0f","1f54a"],"isCanonical": false},":candle:":{"unicode":["1f56f-fe0f","1f56f"],"isCanonical": true},":clock:":{"unicode":["1f570-fe0f","1f570"],"isCanonical": true},":mantlepiece_clock:":{"unicode":["1f570-fe0f","1f570"],"isCanonical": false},":hole:":{"unicode":["1f573-fe0f","1f573"],"isCanonical": true},":dark_sunglasses:":{"unicode":["1f576-fe0f","1f576"],"isCanonical": true},":joystick:":{"unicode":["1f579-fe0f","1f579"],"isCanonical": true},":paperclips:":{"unicode":["1f587-fe0f","1f587"],"isCanonical": true},":linked_paperclips:":{"unicode":["1f587-fe0f","1f587"],"isCanonical": false},":pen_ballpoint:":{"unicode":["1f58a-fe0f","1f58a"],"isCanonical": true},":lower_left_ballpoint_pen:":{"unicode":["1f58a-fe0f","1f58a"],"isCanonical": false},":pen_fountain:":{"unicode":["1f58b-fe0f","1f58b"],"isCanonical": true},":lower_left_fountain_pen:":{"unicode":["1f58b-fe0f","1f58b"],"isCanonical": false},":paintbrush:":{"unicode":["1f58c-fe0f","1f58c"],"isCanonical": true},":lower_left_paintbrush:":{"unicode":["1f58c-fe0f","1f58c"],"isCanonical": false},":crayon:":{"unicode":["1f58d-fe0f","1f58d"],"isCanonical": true},":lower_left_crayon:":{"unicode":["1f58d-fe0f","1f58d"],"isCanonical": false},":desktop:":{"unicode":["1f5a5-fe0f","1f5a5"],"isCanonical": true},":desktop_computer:":{"unicode":["1f5a5-fe0f","1f5a5"],"isCanonical": false},":printer:":{"unicode":["1f5a8-fe0f","1f5a8"],"isCanonical": true},":trackball:":{"unicode":["1f5b2-fe0f","1f5b2"],"isCanonical": true},":frame_photo:":{"unicode":["1f5bc-fe0f","1f5bc"],"isCanonical": true},":frame_with_picture:":{"unicode":["1f5bc-fe0f","1f5bc"],"isCanonical": false},":dividers:":{"unicode":["1f5c2-fe0f","1f5c2"],"isCanonical": true},":card_index_dividers:":{"unicode":["1f5c2-fe0f","1f5c2"],"isCanonical": false},":card_box:":{"unicode":["1f5c3-fe0f","1f5c3"],"isCanonical": true},":card_file_box:":{"unicode":["1f5c3-fe0f","1f5c3"],"isCanonical": false},":file_cabinet:":{"unicode":["1f5c4-fe0f","1f5c4"],"isCanonical": true},":wastebasket:":{"unicode":["1f5d1-fe0f","1f5d1"],"isCanonical": true},":notepad_spiral:":{"unicode":["1f5d2-fe0f","1f5d2"],"isCanonical": true},":spiral_note_pad:":{"unicode":["1f5d2-fe0f","1f5d2"],"isCanonical": false},":calendar_spiral:":{"unicode":["1f5d3-fe0f","1f5d3"],"isCanonical": true},":spiral_calendar_pad:":{"unicode":["1f5d3-fe0f","1f5d3"],"isCanonical": false},":compression:":{"unicode":["1f5dc-fe0f","1f5dc"],"isCanonical": true},":key2:":{"unicode":["1f5dd-fe0f","1f5dd"],"isCanonical": true},":old_key:":{"unicode":["1f5dd-fe0f","1f5dd"],"isCanonical": false},":newspaper2:":{"unicode":["1f5de-fe0f","1f5de"],"isCanonical": true},":rolled_up_newspaper:":{"unicode":["1f5de-fe0f","1f5de"],"isCanonical": false},":dagger:":{"unicode":["1f5e1-fe0f","1f5e1"],"isCanonical": true},":dagger_knife:":{"unicode":["1f5e1-fe0f","1f5e1"],"isCanonical": false},":speaking_head:":{"unicode":["1f5e3-fe0f","1f5e3"],"isCanonical": true},":speaking_head_in_silhouette:":{"unicode":["1f5e3-fe0f","1f5e3"],"isCanonical": false},":speech_left:":{"unicode":["1f5e8-fe0f","1f5e8"],"isCanonical": true},":left_speech_bubble:":{"unicode":["1f5e8-fe0f","1f5e8"],"isCanonical": false},":anger_right:":{"unicode":["1f5ef-fe0f","1f5ef"],"isCanonical": true},":right_anger_bubble:":{"unicode":["1f5ef-fe0f","1f5ef"],"isCanonical": false},":ballot_box:":{"unicode":["1f5f3-fe0f","1f5f3"],"isCanonical": true},":ballot_box_with_ballot:":{"unicode":["1f5f3-fe0f","1f5f3"],"isCanonical": false},":map:":{"unicode":["1f5fa-fe0f","1f5fa"],"isCanonical": true},":world_map:":{"unicode":["1f5fa-fe0f","1f5fa"],"isCanonical": false},":tools:":{"unicode":["1f6e0-fe0f","1f6e0"],"isCanonical": true},":hammer_and_wrench:":{"unicode":["1f6e0-fe0f","1f6e0"],"isCanonical": false},":shield:":{"unicode":["1f6e1-fe0f","1f6e1"],"isCanonical": true},":oil:":{"unicode":["1f6e2-fe0f","1f6e2"],"isCanonical": true},":oil_drum:":{"unicode":["1f6e2-fe0f","1f6e2"],"isCanonical": false},":satellite_orbital:":{"unicode":["1f6f0-fe0f","1f6f0"],"isCanonical": true},":fork_knife_plate:":{"unicode":["1f37d-fe0f","1f37d"],"isCanonical": true},":fork_and_knife_with_plate:":{"unicode":["1f37d-fe0f","1f37d"],"isCanonical": false},":eye:":{"unicode":["1f441-fe0f","1f441"],"isCanonical": true},":levitate:":{"unicode":["1f574-fe0f","1f574"],"isCanonical": true},":man_in_business_suit_levitating:":{"unicode":["1f574-fe0f","1f574"],"isCanonical": false},":spy:":{"unicode":["1f575-fe0f","1f575"],"isCanonical": true},":sleuth_or_spy:":{"unicode":["1f575-fe0f","1f575"],"isCanonical": false},":hand_splayed:":{"unicode":["1f590-fe0f","1f590"],"isCanonical": true},":raised_hand_with_fingers_splayed:":{"unicode":["1f590-fe0f","1f590"],"isCanonical": false},":mountain_snow:":{"unicode":["1f3d4-fe0f","1f3d4"],"isCanonical": true},":snow_capped_mountain:":{"unicode":["1f3d4-fe0f","1f3d4"],"isCanonical": false},":camping:":{"unicode":["1f3d5-fe0f","1f3d5"],"isCanonical": true},":beach:":{"unicode":["1f3d6-fe0f","1f3d6"],"isCanonical": true},":beach_with_umbrella:":{"unicode":["1f3d6-fe0f","1f3d6"],"isCanonical": false},":construction_site:":{"unicode":["1f3d7-fe0f","1f3d7"],"isCanonical": true},":building_construction:":{"unicode":["1f3d7-fe0f","1f3d7"],"isCanonical": false},":homes:":{"unicode":["1f3d8-fe0f","1f3d8"],"isCanonical": true},":house_buildings:":{"unicode":["1f3d8-fe0f","1f3d8"],"isCanonical": false},":cityscape:":{"unicode":["1f3d9-fe0f","1f3d9"],"isCanonical": true},":house_abandoned:":{"unicode":["1f3da-fe0f","1f3da"],"isCanonical": true},":derelict_house_building:":{"unicode":["1f3da-fe0f","1f3da"],"isCanonical": false},":classical_building:":{"unicode":["1f3db-fe0f","1f3db"],"isCanonical": true},":desert:":{"unicode":["1f3dc-fe0f","1f3dc"],"isCanonical": true},":island:":{"unicode":["1f3dd-fe0f","1f3dd"],"isCanonical": true},":desert_island:":{"unicode":["1f3dd-fe0f","1f3dd"],"isCanonical": false},":park:":{"unicode":["1f3de-fe0f","1f3de"],"isCanonical": true},":national_park:":{"unicode":["1f3de-fe0f","1f3de"],"isCanonical": false},":stadium:":{"unicode":["1f3df-fe0f","1f3df"],"isCanonical": true},":couch:":{"unicode":["1f6cb-fe0f","1f6cb"],"isCanonical": true},":couch_and_lamp:":{"unicode":["1f6cb-fe0f","1f6cb"],"isCanonical": false},":shopping_bags:":{"unicode":["1f6cd-fe0f","1f6cd"],"isCanonical": true},":bellhop:":{"unicode":["1f6ce-fe0f","1f6ce"],"isCanonical": true},":bellhop_bell:":{"unicode":["1f6ce-fe0f","1f6ce"],"isCanonical": false},":bed:":{"unicode":["1f6cf-fe0f","1f6cf"],"isCanonical": true},":motorway:":{"unicode":["1f6e3-fe0f","1f6e3"],"isCanonical": true},":railway_track:":{"unicode":["1f6e4-fe0f","1f6e4"],"isCanonical": true},":railroad_track:":{"unicode":["1f6e4-fe0f","1f6e4"],"isCanonical": false},":motorboat:":{"unicode":["1f6e5-fe0f","1f6e5"],"isCanonical": true},":airplane_small:":{"unicode":["1f6e9-fe0f","1f6e9"],"isCanonical": true},":small_airplane:":{"unicode":["1f6e9-fe0f","1f6e9"],"isCanonical": false},":cruise_ship:":{"unicode":["1f6f3-fe0f","1f6f3"],"isCanonical": true},":passenger_ship:":{"unicode":["1f6f3-fe0f","1f6f3"],"isCanonical": false},":white_sun_small_cloud:":{"unicode":["1f324-fe0f","1f324"],"isCanonical": true},":white_sun_with_small_cloud:":{"unicode":["1f324-fe0f","1f324"],"isCanonical": false},":white_sun_cloud:":{"unicode":["1f325-fe0f","1f325"],"isCanonical": true},":white_sun_behind_cloud:":{"unicode":["1f325-fe0f","1f325"],"isCanonical": false},":white_sun_rain_cloud:":{"unicode":["1f326-fe0f","1f326"],"isCanonical": true},":white_sun_behind_cloud_with_rain:":{"unicode":["1f326-fe0f","1f326"],"isCanonical": false},":mouse_three_button:":{"unicode":["1f5b1-fe0f","1f5b1"],"isCanonical": true},":three_button_mouse:":{"unicode":["1f5b1-fe0f","1f5b1"],"isCanonical": false},":point_up_tone1:":{"unicode":["261d-1f3fb"],"isCanonical": true},":point_up_tone2:":{"unicode":["261d-1f3fc"],"isCanonical": true},":point_up_tone3:":{"unicode":["261d-1f3fd"],"isCanonical": true},":point_up_tone4:":{"unicode":["261d-1f3fe"],"isCanonical": true},":point_up_tone5:":{"unicode":["261d-1f3ff"],"isCanonical": true},":v_tone1:":{"unicode":["270c-1f3fb"],"isCanonical": true},":v_tone2:":{"unicode":["270c-1f3fc"],"isCanonical": true},":v_tone3:":{"unicode":["270c-1f3fd"],"isCanonical": true},":v_tone4:":{"unicode":["270c-1f3fe"],"isCanonical": true},":v_tone5:":{"unicode":["270c-1f3ff"],"isCanonical": true},":fist_tone1:":{"unicode":["270a-1f3fb"],"isCanonical": true},":fist_tone2:":{"unicode":["270a-1f3fc"],"isCanonical": true},":fist_tone3:":{"unicode":["270a-1f3fd"],"isCanonical": true},":fist_tone4:":{"unicode":["270a-1f3fe"],"isCanonical": true},":fist_tone5:":{"unicode":["270a-1f3ff"],"isCanonical": true},":raised_hand_tone1:":{"unicode":["270b-1f3fb"],"isCanonical": true},":raised_hand_tone2:":{"unicode":["270b-1f3fc"],"isCanonical": true},":raised_hand_tone3:":{"unicode":["270b-1f3fd"],"isCanonical": true},":raised_hand_tone4:":{"unicode":["270b-1f3fe"],"isCanonical": true},":raised_hand_tone5:":{"unicode":["270b-1f3ff"],"isCanonical": true},":writing_hand_tone1:":{"unicode":["270d-1f3fb"],"isCanonical": true},":writing_hand_tone2:":{"unicode":["270d-1f3fc"],"isCanonical": true},":writing_hand_tone3:":{"unicode":["270d-1f3fd"],"isCanonical": true},":writing_hand_tone4:":{"unicode":["270d-1f3fe"],"isCanonical": true},":writing_hand_tone5:":{"unicode":["270d-1f3ff"],"isCanonical": true},":basketball_player_tone1:":{"unicode":["26f9-1f3fb"],"isCanonical": true},":person_with_ball_tone1:":{"unicode":["26f9-1f3fb"],"isCanonical": false},":basketball_player_tone2:":{"unicode":["26f9-1f3fc"],"isCanonical": true},":person_with_ball_tone2:":{"unicode":["26f9-1f3fc"],"isCanonical": false},":basketball_player_tone3:":{"unicode":["26f9-1f3fd"],"isCanonical": true},":person_with_ball_tone3:":{"unicode":["26f9-1f3fd"],"isCanonical": false},":basketball_player_tone4:":{"unicode":["26f9-1f3fe"],"isCanonical": true},":person_with_ball_tone4:":{"unicode":["26f9-1f3fe"],"isCanonical": false},":basketball_player_tone5:":{"unicode":["26f9-1f3ff"],"isCanonical": true},":person_with_ball_tone5:":{"unicode":["26f9-1f3ff"],"isCanonical": false},":copyright:":{"unicode":["00a9-fe0f","00a9"],"isCanonical": true},":registered:":{"unicode":["00ae-fe0f","00ae"],"isCanonical": true},":bangbang:":{"unicode":["203c-fe0f","203c"],"isCanonical": true},":interrobang:":{"unicode":["2049-fe0f","2049"],"isCanonical": true},":tm:":{"unicode":["2122-fe0f","2122"],"isCanonical": true},":information_source:":{"unicode":["2139-fe0f","2139"],"isCanonical": true},":left_right_arrow:":{"unicode":["2194-fe0f","2194"],"isCanonical": true},":arrow_up_down:":{"unicode":["2195-fe0f","2195"],"isCanonical": true},":arrow_upper_left:":{"unicode":["2196-fe0f","2196"],"isCanonical": true},":arrow_upper_right:":{"unicode":["2197-fe0f","2197"],"isCanonical": true},":arrow_lower_right:":{"unicode":["2198-fe0f","2198"],"isCanonical": true},":arrow_lower_left:":{"unicode":["2199-fe0f","2199"],"isCanonical": true},":leftwards_arrow_with_hook:":{"unicode":["21a9-fe0f","21a9"],"isCanonical": true},":arrow_right_hook:":{"unicode":["21aa-fe0f","21aa"],"isCanonical": true},":watch:":{"unicode":["231a-fe0f","231a"],"isCanonical": true},":hourglass:":{"unicode":["231b-fe0f","231b"],"isCanonical": true},":m:":{"unicode":["24c2-fe0f","24c2"],"isCanonical": true},":black_small_square:":{"unicode":["25aa-fe0f","25aa"],"isCanonical": true},":white_small_square:":{"unicode":["25ab-fe0f","25ab"],"isCanonical": true},":arrow_forward:":{"unicode":["25b6-fe0f","25b6"],"isCanonical": true},":arrow_backward:":{"unicode":["25c0-fe0f","25c0"],"isCanonical": true},":white_medium_square:":{"unicode":["25fb-fe0f","25fb"],"isCanonical": true},":black_medium_square:":{"unicode":["25fc-fe0f","25fc"],"isCanonical": true},":white_medium_small_square:":{"unicode":["25fd-fe0f","25fd"],"isCanonical": true},":black_medium_small_square:":{"unicode":["25fe-fe0f","25fe"],"isCanonical": true},":sunny:":{"unicode":["2600-fe0f","2600"],"isCanonical": true},":cloud:":{"unicode":["2601-fe0f","2601"],"isCanonical": true},":telephone:":{"unicode":["260e-fe0f","260e"],"isCanonical": true},":ballot_box_with_check:":{"unicode":["2611-fe0f","2611"],"isCanonical": true},":umbrella:":{"unicode":["2614-fe0f","2614"],"isCanonical": true},":coffee:":{"unicode":["2615-fe0f","2615"],"isCanonical": true},":point_up:":{"unicode":["261d-fe0f","261d"],"isCanonical": true},":relaxed:":{"unicode":["263a-fe0f","263a"],"isCanonical": true},":aries:":{"unicode":["2648-fe0f","2648"],"isCanonical": true},":taurus:":{"unicode":["2649-fe0f","2649"],"isCanonical": true},":gemini:":{"unicode":["264a-fe0f","264a"],"isCanonical": true},":cancer:":{"unicode":["264b-fe0f","264b"],"isCanonical": true},":leo:":{"unicode":["264c-fe0f","264c"],"isCanonical": true},":virgo:":{"unicode":["264d-fe0f","264d"],"isCanonical": true},":libra:":{"unicode":["264e-fe0f","264e"],"isCanonical": true},":scorpius:":{"unicode":["264f-fe0f","264f"],"isCanonical": true},":sagittarius:":{"unicode":["2650-fe0f","2650"],"isCanonical": true},":capricorn:":{"unicode":["2651-fe0f","2651"],"isCanonical": true},":aquarius:":{"unicode":["2652-fe0f","2652"],"isCanonical": true},":pisces:":{"unicode":["2653-fe0f","2653"],"isCanonical": true},":spades:":{"unicode":["2660-fe0f","2660"],"isCanonical": true},":clubs:":{"unicode":["2663-fe0f","2663"],"isCanonical": true},":hearts:":{"unicode":["2665-fe0f","2665"],"isCanonical": true},":diamonds:":{"unicode":["2666-fe0f","2666"],"isCanonical": true},":hotsprings:":{"unicode":["2668-fe0f","2668"],"isCanonical": true},":recycle:":{"unicode":["267b-fe0f","267b"],"isCanonical": true},":wheelchair:":{"unicode":["267f-fe0f","267f"],"isCanonical": true},":anchor:":{"unicode":["2693-fe0f","2693"],"isCanonical": true},":warning:":{"unicode":["26a0-fe0f","26a0"],"isCanonical": true},":zap:":{"unicode":["26a1-fe0f","26a1"],"isCanonical": true},":white_circle:":{"unicode":["26aa-fe0f","26aa"],"isCanonical": true},":black_circle:":{"unicode":["26ab-fe0f","26ab"],"isCanonical": true},":soccer:":{"unicode":["26bd-fe0f","26bd"],"isCanonical": true},":baseball:":{"unicode":["26be-fe0f","26be"],"isCanonical": true},":snowman:":{"unicode":["26c4-fe0f","26c4"],"isCanonical": true},":partly_sunny:":{"unicode":["26c5-fe0f","26c5"],"isCanonical": true},":no_entry:":{"unicode":["26d4-fe0f","26d4"],"isCanonical": true},":church:":{"unicode":["26ea-fe0f","26ea"],"isCanonical": true},":fountain:":{"unicode":["26f2-fe0f","26f2"],"isCanonical": true},":golf:":{"unicode":["26f3-fe0f","26f3"],"isCanonical": true},":sailboat:":{"unicode":["26f5-fe0f","26f5"],"isCanonical": true},":tent:":{"unicode":["26fa-fe0f","26fa"],"isCanonical": true},":fuelpump:":{"unicode":["26fd-fe0f","26fd"],"isCanonical": true},":scissors:":{"unicode":["2702-fe0f","2702"],"isCanonical": true},":airplane:":{"unicode":["2708-fe0f","2708"],"isCanonical": true},":envelope:":{"unicode":["2709-fe0f","2709"],"isCanonical": true},":v:":{"unicode":["270c-fe0f","270c"],"isCanonical": true},":pencil2:":{"unicode":["270f-fe0f","270f"],"isCanonical": true},":black_nib:":{"unicode":["2712-fe0f","2712"],"isCanonical": true},":heavy_check_mark:":{"unicode":["2714-fe0f","2714"],"isCanonical": true},":heavy_multiplication_x:":{"unicode":["2716-fe0f","2716"],"isCanonical": true},":eight_spoked_asterisk:":{"unicode":["2733-fe0f","2733"],"isCanonical": true},":eight_pointed_black_star:":{"unicode":["2734-fe0f","2734"],"isCanonical": true},":snowflake:":{"unicode":["2744-fe0f","2744"],"isCanonical": true},":sparkle:":{"unicode":["2747-fe0f","2747"],"isCanonical": true},":exclamation:":{"unicode":["2757-fe0f","2757"],"isCanonical": true},":heart:":{"unicode":["2764-fe0f","2764"],"isCanonical": true},":arrow_right:":{"unicode":["27a1-fe0f","27a1"],"isCanonical": true},":arrow_heading_up:":{"unicode":["2934-fe0f","2934"],"isCanonical": true},":arrow_heading_down:":{"unicode":["2935-fe0f","2935"],"isCanonical": true},":arrow_left:":{"unicode":["2b05-fe0f","2b05"],"isCanonical": true},":arrow_up:":{"unicode":["2b06-fe0f","2b06"],"isCanonical": true},":arrow_down:":{"unicode":["2b07-fe0f","2b07"],"isCanonical": true},":black_large_square:":{"unicode":["2b1b-fe0f","2b1b"],"isCanonical": true},":white_large_square:":{"unicode":["2b1c-fe0f","2b1c"],"isCanonical": true},":star:":{"unicode":["2b50-fe0f","2b50"],"isCanonical": true},":o:":{"unicode":["2b55-fe0f","2b55"],"isCanonical": true},":wavy_dash:":{"unicode":["3030-fe0f","3030"],"isCanonical": true},":part_alternation_mark:":{"unicode":["303d-fe0f","303d"],"isCanonical": true},":congratulations:":{"unicode":["3297-fe0f","3297"],"isCanonical": true},":secret:":{"unicode":["3299-fe0f","3299"],"isCanonical": true},":cross:":{"unicode":["271d-fe0f","271d"],"isCanonical": true},":latin_cross:":{"unicode":["271d-fe0f","271d"],"isCanonical": false},":keyboard:":{"unicode":["2328-fe0f","2328"],"isCanonical": true},":writing_hand:":{"unicode":["270d-fe0f","270d"],"isCanonical": true},":eject:":{"unicode":["23cf-fe0f","23cf"],"isCanonical": true},":eject_symbol:":{"unicode":["23cf-fe0f","23cf"],"isCanonical": false},":track_next:":{"unicode":["23ed-fe0f","23ed"],"isCanonical": true},":next_track:":{"unicode":["23ed-fe0f","23ed"],"isCanonical": false},":track_previous:":{"unicode":["23ee-fe0f","23ee"],"isCanonical": true},":previous_track:":{"unicode":["23ee-fe0f","23ee"],"isCanonical": false},":play_pause:":{"unicode":["23ef-fe0f","23ef"],"isCanonical": true},":stopwatch:":{"unicode":["23f1-fe0f","23f1"],"isCanonical": true},":timer:":{"unicode":["23f2-fe0f","23f2"],"isCanonical": true},":timer_clock:":{"unicode":["23f2-fe0f","23f2"],"isCanonical": false},":pause_button:":{"unicode":["23f8-fe0f","23f8"],"isCanonical": true},":double_vertical_bar:":{"unicode":["23f8-fe0f","23f8"],"isCanonical": false},":stop_button:":{"unicode":["23f9-fe0f","23f9"],"isCanonical": true},":record_button:":{"unicode":["23fa-fe0f","23fa"],"isCanonical": true},":umbrella2:":{"unicode":["2602-fe0f","2602"],"isCanonical": true},":snowman2:":{"unicode":["2603-fe0f","2603"],"isCanonical": true},":comet:":{"unicode":["2604-fe0f","2604"],"isCanonical": true},":shamrock:":{"unicode":["2618-fe0f","2618"],"isCanonical": true},":skull_crossbones:":{"unicode":["2620-fe0f","2620"],"isCanonical": true},":skull_and_crossbones:":{"unicode":["2620-fe0f","2620"],"isCanonical": false},":radioactive:":{"unicode":["2622-fe0f","2622"],"isCanonical": true},":radioactive_sign:":{"unicode":["2622-fe0f","2622"],"isCanonical": false},":biohazard:":{"unicode":["2623-fe0f","2623"],"isCanonical": true},":biohazard_sign:":{"unicode":["2623-fe0f","2623"],"isCanonical": false},":orthodox_cross:":{"unicode":["2626-fe0f","2626"],"isCanonical": true},":star_and_crescent:":{"unicode":["262a-fe0f","262a"],"isCanonical": true},":peace:":{"unicode":["262e-fe0f","262e"],"isCanonical": true},":peace_symbol:":{"unicode":["262e-fe0f","262e"],"isCanonical": false},":yin_yang:":{"unicode":["262f-fe0f","262f"],"isCanonical": true},":wheel_of_dharma:":{"unicode":["2638-fe0f","2638"],"isCanonical": true},":frowning2:":{"unicode":["2639-fe0f","2639"],"isCanonical": true},":white_frowning_face:":{"unicode":["2639-fe0f","2639"],"isCanonical": false},":hammer_pick:":{"unicode":["2692-fe0f","2692"],"isCanonical": true},":hammer_and_pick:":{"unicode":["2692-fe0f","2692"],"isCanonical": false},":crossed_swords:":{"unicode":["2694-fe0f","2694"],"isCanonical": true},":scales:":{"unicode":["2696-fe0f","2696"],"isCanonical": true},":alembic:":{"unicode":["2697-fe0f","2697"],"isCanonical": true},":gear:":{"unicode":["2699-fe0f","2699"],"isCanonical": true},":atom:":{"unicode":["269b-fe0f","269b"],"isCanonical": true},":atom_symbol:":{"unicode":["269b-fe0f","269b"],"isCanonical": false},":fleur-de-lis:":{"unicode":["269c-fe0f","269c"],"isCanonical": true},":coffin:":{"unicode":["26b0-fe0f","26b0"],"isCanonical": true},":urn:":{"unicode":["26b1-fe0f","26b1"],"isCanonical": true},":funeral_urn:":{"unicode":["26b1-fe0f","26b1"],"isCanonical": false},":thunder_cloud_rain:":{"unicode":["26c8-fe0f","26c8"],"isCanonical": true},":thunder_cloud_and_rain:":{"unicode":["26c8-fe0f","26c8"],"isCanonical": false},":pick:":{"unicode":["26cf-fe0f","26cf"],"isCanonical": true},":helmet_with_cross:":{"unicode":["26d1-fe0f","26d1"],"isCanonical": true},":helmet_with_white_cross:":{"unicode":["26d1-fe0f","26d1"],"isCanonical": false},":chains:":{"unicode":["26d3-fe0f","26d3"],"isCanonical": true},":shinto_shrine:":{"unicode":["26e9-fe0f","26e9"],"isCanonical": true},":mountain:":{"unicode":["26f0-fe0f","26f0"],"isCanonical": true},":beach_umbrella:":{"unicode":["26f1-fe0f","26f1"],"isCanonical": true},":umbrella_on_ground:":{"unicode":["26f1-fe0f","26f1"],"isCanonical": false},":ferry:":{"unicode":["26f4-fe0f","26f4"],"isCanonical": true},":skier:":{"unicode":["26f7-fe0f","26f7"],"isCanonical": true},":ice_skate:":{"unicode":["26f8-fe0f","26f8"],"isCanonical": true},":basketball_player:":{"unicode":["26f9-fe0f","26f9"],"isCanonical": true},":person_with_ball:":{"unicode":["26f9-fe0f","26f9"],"isCanonical": false},":star_of_david:":{"unicode":["2721-fe0f","2721"],"isCanonical": true},":heart_exclamation:":{"unicode":["2763-fe0f","2763"],"isCanonical": true},":heavy_heart_exclamation_mark_ornament:":{"unicode":["2763-fe0f","2763"],"isCanonical": false},":third_place:":{"unicode":["1f949"],"isCanonical": true},":third_place_medal:":{"unicode":["1f949"],"isCanonical": false},":second_place:":{"unicode":["1f948"],"isCanonical": true},":second_place_medal:":{"unicode":["1f948"],"isCanonical": false},":first_place:":{"unicode":["1f947"],"isCanonical": true},":first_place_medal:":{"unicode":["1f947"],"isCanonical": false},":fencer:":{"unicode":["1f93a"],"isCanonical": true},":fencing:":{"unicode":["1f93a"],"isCanonical": false},":goal:":{"unicode":["1f945"],"isCanonical": true},":goal_net:":{"unicode":["1f945"],"isCanonical": false},":handball:":{"unicode":["1f93e"],"isCanonical": true},":regional_indicator_z:":{"unicode":["1f1ff"],"isCanonical": true},":water_polo:":{"unicode":["1f93d"],"isCanonical": true},":martial_arts_uniform:":{"unicode":["1f94b"],"isCanonical": true},":karate_uniform:":{"unicode":["1f94b"],"isCanonical": false},":boxing_glove:":{"unicode":["1f94a"],"isCanonical": true},":boxing_gloves:":{"unicode":["1f94a"],"isCanonical": false},":wrestlers:":{"unicode":["1f93c"],"isCanonical": true},":wrestling:":{"unicode":["1f93c"],"isCanonical": false},":juggling:":{"unicode":["1f939"],"isCanonical": true},":juggler:":{"unicode":["1f939"],"isCanonical": false},":cartwheel:":{"unicode":["1f938"],"isCanonical": true},":person_doing_cartwheel:":{"unicode":["1f938"],"isCanonical": false},":canoe:":{"unicode":["1f6f6"],"isCanonical": true},":kayak:":{"unicode":["1f6f6"],"isCanonical": false},":motor_scooter:":{"unicode":["1f6f5"],"isCanonical": true},":motorbike:":{"unicode":["1f6f5"],"isCanonical": false},":scooter:":{"unicode":["1f6f4"],"isCanonical": true},":shopping_cart:":{"unicode":["1f6d2"],"isCanonical": true},":shopping_trolley:":{"unicode":["1f6d2"],"isCanonical": false},":black_joker:":{"unicode":["1f0cf"],"isCanonical": true},":a:":{"unicode":["1f170"],"isCanonical": true},":b:":{"unicode":["1f171"],"isCanonical": true},":o2:":{"unicode":["1f17e"],"isCanonical": true},":octagonal_sign:":{"unicode":["1f6d1"],"isCanonical": true},":stop_sign:":{"unicode":["1f6d1"],"isCanonical": false},":ab:":{"unicode":["1f18e"],"isCanonical": true},":cl:":{"unicode":["1f191"],"isCanonical": true},":regional_indicator_y:":{"unicode":["1f1fe"],"isCanonical": true},":cool:":{"unicode":["1f192"],"isCanonical": true},":free:":{"unicode":["1f193"],"isCanonical": true},":id:":{"unicode":["1f194"],"isCanonical": true},":new:":{"unicode":["1f195"],"isCanonical": true},":ng:":{"unicode":["1f196"],"isCanonical": true},":ok:":{"unicode":["1f197"],"isCanonical": true},":sos:":{"unicode":["1f198"],"isCanonical": true},":spoon:":{"unicode":["1f944"],"isCanonical": true},":up:":{"unicode":["1f199"],"isCanonical": true},":vs:":{"unicode":["1f19a"],"isCanonical": true},":champagne_glass:":{"unicode":["1f942"],"isCanonical": true},":clinking_glass:":{"unicode":["1f942"],"isCanonical": false},":tumbler_glass:":{"unicode":["1f943"],"isCanonical": true},":whisky:":{"unicode":["1f943"],"isCanonical": false},":koko:":{"unicode":["1f201"],"isCanonical": true},":stuffed_flatbread:":{"unicode":["1f959"],"isCanonical": true},":stuffed_pita:":{"unicode":["1f959"],"isCanonical": false},":u7981:":{"unicode":["1f232"],"isCanonical": true},":u7a7a:":{"unicode":["1f233"],"isCanonical": true},":u5408:":{"unicode":["1f234"],"isCanonical": true},":u6e80:":{"unicode":["1f235"],"isCanonical": true},":u6709:":{"unicode":["1f236"],"isCanonical": true},":shallow_pan_of_food:":{"unicode":["1f958"],"isCanonical": true},":paella:":{"unicode":["1f958"],"isCanonical": false},":u7533:":{"unicode":["1f238"],"isCanonical": true},":u5272:":{"unicode":["1f239"],"isCanonical": true},":salad:":{"unicode":["1f957"],"isCanonical": true},":green_salad:":{"unicode":["1f957"],"isCanonical": false},":u55b6:":{"unicode":["1f23a"],"isCanonical": true},":ideograph_advantage:":{"unicode":["1f250"],"isCanonical": true},":accept:":{"unicode":["1f251"],"isCanonical": true},":cyclone:":{"unicode":["1f300"],"isCanonical": true},":french_bread:":{"unicode":["1f956"],"isCanonical": true},":baguette_bread:":{"unicode":["1f956"],"isCanonical": false},":foggy:":{"unicode":["1f301"],"isCanonical": true},":closed_umbrella:":{"unicode":["1f302"],"isCanonical": true},":night_with_stars:":{"unicode":["1f303"],"isCanonical": true},":sunrise_over_mountains:":{"unicode":["1f304"],"isCanonical": true},":sunrise:":{"unicode":["1f305"],"isCanonical": true},":city_dusk:":{"unicode":["1f306"],"isCanonical": true},":carrot:":{"unicode":["1f955"],"isCanonical": true},":city_sunset:":{"unicode":["1f307"],"isCanonical": true},":city_sunrise:":{"unicode":["1f307"],"isCanonical": false},":rainbow:":{"unicode":["1f308"],"isCanonical": true},":potato:":{"unicode":["1f954"],"isCanonical": true},":bridge_at_night:":{"unicode":["1f309"],"isCanonical": true},":ocean:":{"unicode":["1f30a"],"isCanonical": true},":volcano:":{"unicode":["1f30b"],"isCanonical": true},":milky_way:":{"unicode":["1f30c"],"isCanonical": true},":earth_asia:":{"unicode":["1f30f"],"isCanonical": true},":new_moon:":{"unicode":["1f311"],"isCanonical": true},":bacon:":{"unicode":["1f953"],"isCanonical": true},":first_quarter_moon:":{"unicode":["1f313"],"isCanonical": true},":waxing_gibbous_moon:":{"unicode":["1f314"],"isCanonical": true},":full_moon:":{"unicode":["1f315"],"isCanonical": true},":crescent_moon:":{"unicode":["1f319"],"isCanonical": true},":first_quarter_moon_with_face:":{"unicode":["1f31b"],"isCanonical": true},":star2:":{"unicode":["1f31f"],"isCanonical": true},":cucumber:":{"unicode":["1f952"],"isCanonical": true},":stars:":{"unicode":["1f320"],"isCanonical": true},":chestnut:":{"unicode":["1f330"],"isCanonical": true},":avocado:":{"unicode":["1f951"],"isCanonical": true},":seedling:":{"unicode":["1f331"],"isCanonical": true},":palm_tree:":{"unicode":["1f334"],"isCanonical": true},":cactus:":{"unicode":["1f335"],"isCanonical": true},":tulip:":{"unicode":["1f337"],"isCanonical": true},":cherry_blossom:":{"unicode":["1f338"],"isCanonical": true},":rose:":{"unicode":["1f339"],"isCanonical": true},":hibiscus:":{"unicode":["1f33a"],"isCanonical": true},":sunflower:":{"unicode":["1f33b"],"isCanonical": true},":blossom:":{"unicode":["1f33c"],"isCanonical": true},":corn:":{"unicode":["1f33d"],"isCanonical": true},":croissant:":{"unicode":["1f950"],"isCanonical": true},":ear_of_rice:":{"unicode":["1f33e"],"isCanonical": true},":herb:":{"unicode":["1f33f"],"isCanonical": true},":four_leaf_clover:":{"unicode":["1f340"],"isCanonical": true},":maple_leaf:":{"unicode":["1f341"],"isCanonical": true},":fallen_leaf:":{"unicode":["1f342"],"isCanonical": true},":leaves:":{"unicode":["1f343"],"isCanonical": true},":mushroom:":{"unicode":["1f344"],"isCanonical": true},":tomato:":{"unicode":["1f345"],"isCanonical": true},":eggplant:":{"unicode":["1f346"],"isCanonical": true},":grapes:":{"unicode":["1f347"],"isCanonical": true},":melon:":{"unicode":["1f348"],"isCanonical": true},":watermelon:":{"unicode":["1f349"],"isCanonical": true},":tangerine:":{"unicode":["1f34a"],"isCanonical": true},":wilted_rose:":{"unicode":["1f940"],"isCanonical": true},":wilted_flower:":{"unicode":["1f940"],"isCanonical": false},":banana:":{"unicode":["1f34c"],"isCanonical": true},":pineapple:":{"unicode":["1f34d"],"isCanonical": true},":apple:":{"unicode":["1f34e"],"isCanonical": true},":green_apple:":{"unicode":["1f34f"],"isCanonical": true},":peach:":{"unicode":["1f351"],"isCanonical": true},":cherries:":{"unicode":["1f352"],"isCanonical": true},":strawberry:":{"unicode":["1f353"],"isCanonical": true},":rhino:":{"unicode":["1f98f"],"isCanonical": true},":rhinoceros:":{"unicode":["1f98f"],"isCanonical": false},":hamburger:":{"unicode":["1f354"],"isCanonical": true},":pizza:":{"unicode":["1f355"],"isCanonical": true},":meat_on_bone:":{"unicode":["1f356"],"isCanonical": true},":lizard:":{"unicode":["1f98e"],"isCanonical": true},":poultry_leg:":{"unicode":["1f357"],"isCanonical": true},":rice_cracker:":{"unicode":["1f358"],"isCanonical": true},":rice_ball:":{"unicode":["1f359"],"isCanonical": true},":gorilla:":{"unicode":["1f98d"],"isCanonical": true},":rice:":{"unicode":["1f35a"],"isCanonical": true},":curry:":{"unicode":["1f35b"],"isCanonical": true},":deer:":{"unicode":["1f98c"],"isCanonical": true},":ramen:":{"unicode":["1f35c"],"isCanonical": true},":spaghetti:":{"unicode":["1f35d"],"isCanonical": true},":bread:":{"unicode":["1f35e"],"isCanonical": true},":fries:":{"unicode":["1f35f"],"isCanonical": true},":butterfly:":{"unicode":["1f98b"],"isCanonical": true},":sweet_potato:":{"unicode":["1f360"],"isCanonical": true},":dango:":{"unicode":["1f361"],"isCanonical": true},":fox:":{"unicode":["1f98a"],"isCanonical": true},":fox_face:":{"unicode":["1f98a"],"isCanonical": false},":oden:":{"unicode":["1f362"],"isCanonical": true},":sushi:":{"unicode":["1f363"],"isCanonical": true},":owl:":{"unicode":["1f989"],"isCanonical": true},":fried_shrimp:":{"unicode":["1f364"],"isCanonical": true},":fish_cake:":{"unicode":["1f365"],"isCanonical": true},":shark:":{"unicode":["1f988"],"isCanonical": true},":icecream:":{"unicode":["1f366"],"isCanonical": true},":bat:":{"unicode":["1f987"],"isCanonical": true},":shaved_ice:":{"unicode":["1f367"],"isCanonical": true},":regional_indicator_x:":{"unicode":["1f1fd"],"isCanonical": true},":ice_cream:":{"unicode":["1f368"],"isCanonical": true},":duck:":{"unicode":["1f986"],"isCanonical": true},":doughnut:":{"unicode":["1f369"],"isCanonical": true},":eagle:":{"unicode":["1f985"],"isCanonical": true},":cookie:":{"unicode":["1f36a"],"isCanonical": true},":black_heart:":{"unicode":["1f5a4"],"isCanonical": true},":chocolate_bar:":{"unicode":["1f36b"],"isCanonical": true},":candy:":{"unicode":["1f36c"],"isCanonical": true},":lollipop:":{"unicode":["1f36d"],"isCanonical": true},":custard:":{"unicode":["1f36e"],"isCanonical": true},":pudding:":{"unicode":["1f36e"],"isCanonical": false},":flan:":{"unicode":["1f36e"],"isCanonical": false},":honey_pot:":{"unicode":["1f36f"],"isCanonical": true},":fingers_crossed:":{"unicode":["1f91e"],"isCanonical": true},":hand_with_index_and_middle_finger_crossed:":{"unicode":["1f91e"],"isCanonical": false},":cake:":{"unicode":["1f370"],"isCanonical": true},":bento:":{"unicode":["1f371"],"isCanonical": true},":stew:":{"unicode":["1f372"],"isCanonical": true},":handshake:":{"unicode":["1f91d"],"isCanonical": true},":shaking_hands:":{"unicode":["1f91d"],"isCanonical": false},":cooking:":{"unicode":["1f373"],"isCanonical": true},":fork_and_knife:":{"unicode":["1f374"],"isCanonical": true},":tea:":{"unicode":["1f375"],"isCanonical": true},":sake:":{"unicode":["1f376"],"isCanonical": true},":wine_glass:":{"unicode":["1f377"],"isCanonical": true},":cocktail:":{"unicode":["1f378"],"isCanonical": true},":tropical_drink:":{"unicode":["1f379"],"isCanonical": true},":beer:":{"unicode":["1f37a"],"isCanonical": true},":beers:":{"unicode":["1f37b"],"isCanonical": true},":ribbon:":{"unicode":["1f380"],"isCanonical": true},":gift:":{"unicode":["1f381"],"isCanonical": true},":birthday:":{"unicode":["1f382"],"isCanonical": true},":jack_o_lantern:":{"unicode":["1f383"],"isCanonical": true},":left_facing_fist:":{"unicode":["1f91b"],"isCanonical": true},":left_fist:":{"unicode":["1f91b"],"isCanonical": false},":right_facing_fist:":{"unicode":["1f91c"],"isCanonical": true},":right_fist:":{"unicode":["1f91c"],"isCanonical": false},":christmas_tree:":{"unicode":["1f384"],"isCanonical": true},":santa:":{"unicode":["1f385"],"isCanonical": true},":fireworks:":{"unicode":["1f386"],"isCanonical": true},":raised_back_of_hand:":{"unicode":["1f91a"],"isCanonical": true},":back_of_hand:":{"unicode":["1f91a"],"isCanonical": false},":sparkler:":{"unicode":["1f387"],"isCanonical": true},":balloon:":{"unicode":["1f388"],"isCanonical": true},":tada:":{"unicode":["1f389"],"isCanonical": true},":confetti_ball:":{"unicode":["1f38a"],"isCanonical": true},":tanabata_tree:":{"unicode":["1f38b"],"isCanonical": true},":crossed_flags:":{"unicode":["1f38c"],"isCanonical": true},":call_me:":{"unicode":["1f919"],"isCanonical": true},":call_me_hand:":{"unicode":["1f919"],"isCanonical": false},":bamboo:":{"unicode":["1f38d"],"isCanonical": true},":man_dancing:":{"unicode":["1f57a"],"isCanonical": true},":male_dancer:":{"unicode":["1f57a"],"isCanonical": false},":dolls:":{"unicode":["1f38e"],"isCanonical": true},":selfie:":{"unicode":["1f933"],"isCanonical": true},":flags:":{"unicode":["1f38f"],"isCanonical": true},":pregnant_woman:":{"unicode":["1f930"],"isCanonical": true},":expecting_woman:":{"unicode":["1f930"],"isCanonical": false},":wind_chime:":{"unicode":["1f390"],"isCanonical": true},":face_palm:":{"unicode":["1f926"],"isCanonical": true},":facepalm:":{"unicode":["1f926"],"isCanonical": false},":shrug:":{"unicode":["1f937"],"isCanonical": true},":rice_scene:":{"unicode":["1f391"],"isCanonical": true},":school_satchel:":{"unicode":["1f392"],"isCanonical": true},":mortar_board:":{"unicode":["1f393"],"isCanonical": true},":carousel_horse:":{"unicode":["1f3a0"],"isCanonical": true},":ferris_wheel:":{"unicode":["1f3a1"],"isCanonical": true},":roller_coaster:":{"unicode":["1f3a2"],"isCanonical": true},":fishing_pole_and_fish:":{"unicode":["1f3a3"],"isCanonical": true},":microphone:":{"unicode":["1f3a4"],"isCanonical": true},":movie_camera:":{"unicode":["1f3a5"],"isCanonical": true},":cinema:":{"unicode":["1f3a6"],"isCanonical": true},":headphones:":{"unicode":["1f3a7"],"isCanonical": true},":mrs_claus:":{"unicode":["1f936"],"isCanonical": true},":mother_christmas:":{"unicode":["1f936"],"isCanonical": false},":art:":{"unicode":["1f3a8"],"isCanonical": true},":man_in_tuxedo:":{"unicode":["1f935"],"isCanonical": true},":tophat:":{"unicode":["1f3a9"],"isCanonical": true},":circus_tent:":{"unicode":["1f3aa"],"isCanonical": true},":prince:":{"unicode":["1f934"],"isCanonical": true},":ticket:":{"unicode":["1f3ab"],"isCanonical": true},":clapper:":{"unicode":["1f3ac"],"isCanonical": true},":performing_arts:":{"unicode":["1f3ad"],"isCanonical": true},":sneezing_face:":{"unicode":["1f927"],"isCanonical": true},":sneeze:":{"unicode":["1f927"],"isCanonical": false},":video_game:":{"unicode":["1f3ae"],"isCanonical": true},":dart:":{"unicode":["1f3af"],"isCanonical": true},":slot_machine:":{"unicode":["1f3b0"],"isCanonical": true},":8ball:":{"unicode":["1f3b1"],"isCanonical": true},":game_die:":{"unicode":["1f3b2"],"isCanonical": true},":bowling:":{"unicode":["1f3b3"],"isCanonical": true},":flower_playing_cards:":{"unicode":["1f3b4"],"isCanonical": true},":lying_face:":{"unicode":["1f925"],"isCanonical": true},":liar:":{"unicode":["1f925"],"isCanonical": false},":musical_note:":{"unicode":["1f3b5"],"isCanonical": true},":notes:":{"unicode":["1f3b6"],"isCanonical": true},":saxophone:":{"unicode":["1f3b7"],"isCanonical": true},":drooling_face:":{"unicode":["1f924"],"isCanonical": true},":drool:":{"unicode":["1f924"],"isCanonical": false},":guitar:":{"unicode":["1f3b8"],"isCanonical": true},":musical_keyboard:":{"unicode":["1f3b9"],"isCanonical": true},":trumpet:":{"unicode":["1f3ba"],"isCanonical": true},":rofl:":{"unicode":["1f923"],"isCanonical": true},":rolling_on_the_floor_laughing:":{"unicode":["1f923"],"isCanonical": false},":violin:":{"unicode":["1f3bb"],"isCanonical": true},":musical_score:":{"unicode":["1f3bc"],"isCanonical": true},":running_shirt_with_sash:":{"unicode":["1f3bd"],"isCanonical": true},":nauseated_face:":{"unicode":["1f922"],"isCanonical": true},":sick:":{"unicode":["1f922"],"isCanonical": false},":tennis:":{"unicode":["1f3be"],"isCanonical": true},":ski:":{"unicode":["1f3bf"],"isCanonical": true},":basketball:":{"unicode":["1f3c0"],"isCanonical": true},":checkered_flag:":{"unicode":["1f3c1"],"isCanonical": true},":clown:":{"unicode":["1f921"],"isCanonical": true},":clown_face:":{"unicode":["1f921"],"isCanonical": false},":snowboarder:":{"unicode":["1f3c2"],"isCanonical": true},":runner:":{"unicode":["1f3c3"],"isCanonical": true},":surfer:":{"unicode":["1f3c4"],"isCanonical": true},":trophy:":{"unicode":["1f3c6"],"isCanonical": true},":football:":{"unicode":["1f3c8"],"isCanonical": true},":swimmer:":{"unicode":["1f3ca"],"isCanonical": true},":house:":{"unicode":["1f3e0"],"isCanonical": true},":house_with_garden:":{"unicode":["1f3e1"],"isCanonical": true},":office:":{"unicode":["1f3e2"],"isCanonical": true},":post_office:":{"unicode":["1f3e3"],"isCanonical": true},":hospital:":{"unicode":["1f3e5"],"isCanonical": true},":bank:":{"unicode":["1f3e6"],"isCanonical": true},":atm:":{"unicode":["1f3e7"],"isCanonical": true},":hotel:":{"unicode":["1f3e8"],"isCanonical": true},":love_hotel:":{"unicode":["1f3e9"],"isCanonical": true},":convenience_store:":{"unicode":["1f3ea"],"isCanonical": true},":school:":{"unicode":["1f3eb"],"isCanonical": true},":department_store:":{"unicode":["1f3ec"],"isCanonical": true},":cowboy:":{"unicode":["1f920"],"isCanonical": true},":face_with_cowboy_hat:":{"unicode":["1f920"],"isCanonical": false},":factory:":{"unicode":["1f3ed"],"isCanonical": true},":izakaya_lantern:":{"unicode":["1f3ee"],"isCanonical": true},":japanese_castle:":{"unicode":["1f3ef"],"isCanonical": true},":european_castle:":{"unicode":["1f3f0"],"isCanonical": true},":snail:":{"unicode":["1f40c"],"isCanonical": true},":snake:":{"unicode":["1f40d"],"isCanonical": true},":racehorse:":{"unicode":["1f40e"],"isCanonical": true},":sheep:":{"unicode":["1f411"],"isCanonical": true},":monkey:":{"unicode":["1f412"],"isCanonical": true},":chicken:":{"unicode":["1f414"],"isCanonical": true},":boar:":{"unicode":["1f417"],"isCanonical": true},":elephant:":{"unicode":["1f418"],"isCanonical": true},":octopus:":{"unicode":["1f419"],"isCanonical": true},":shell:":{"unicode":["1f41a"],"isCanonical": true},":bug:":{"unicode":["1f41b"],"isCanonical": true},":ant:":{"unicode":["1f41c"],"isCanonical": true},":bee:":{"unicode":["1f41d"],"isCanonical": true},":beetle:":{"unicode":["1f41e"],"isCanonical": true},":fish:":{"unicode":["1f41f"],"isCanonical": true},":tropical_fish:":{"unicode":["1f420"],"isCanonical": true},":blowfish:":{"unicode":["1f421"],"isCanonical": true},":turtle:":{"unicode":["1f422"],"isCanonical": true},":hatching_chick:":{"unicode":["1f423"],"isCanonical": true},":baby_chick:":{"unicode":["1f424"],"isCanonical": true},":hatched_chick:":{"unicode":["1f425"],"isCanonical": true},":bird:":{"unicode":["1f426"],"isCanonical": true},":penguin:":{"unicode":["1f427"],"isCanonical": true},":koala:":{"unicode":["1f428"],"isCanonical": true},":poodle:":{"unicode":["1f429"],"isCanonical": true},":camel:":{"unicode":["1f42b"],"isCanonical": true},":dolphin:":{"unicode":["1f42c"],"isCanonical": true},":mouse:":{"unicode":["1f42d"],"isCanonical": true},":cow:":{"unicode":["1f42e"],"isCanonical": true},":tiger:":{"unicode":["1f42f"],"isCanonical": true},":rabbit:":{"unicode":["1f430"],"isCanonical": true},":cat:":{"unicode":["1f431"],"isCanonical": true},":dragon_face:":{"unicode":["1f432"],"isCanonical": true},":whale:":{"unicode":["1f433"],"isCanonical": true},":horse:":{"unicode":["1f434"],"isCanonical": true},":monkey_face:":{"unicode":["1f435"],"isCanonical": true},":dog:":{"unicode":["1f436"],"isCanonical": true},":pig:":{"unicode":["1f437"],"isCanonical": true},":frog:":{"unicode":["1f438"],"isCanonical": true},":hamster:":{"unicode":["1f439"],"isCanonical": true},":wolf:":{"unicode":["1f43a"],"isCanonical": true},":bear:":{"unicode":["1f43b"],"isCanonical": true},":panda_face:":{"unicode":["1f43c"],"isCanonical": true},":pig_nose:":{"unicode":["1f43d"],"isCanonical": true},":feet:":{"unicode":["1f43e"],"isCanonical": true},":paw_prints:":{"unicode":["1f43e"],"isCanonical": false},":eyes:":{"unicode":["1f440"],"isCanonical": true},":ear:":{"unicode":["1f442"],"isCanonical": true},":nose:":{"unicode":["1f443"],"isCanonical": true},":lips:":{"unicode":["1f444"],"isCanonical": true},":tongue:":{"unicode":["1f445"],"isCanonical": true},":point_up_2:":{"unicode":["1f446"],"isCanonical": true},":point_down:":{"unicode":["1f447"],"isCanonical": true},":point_left:":{"unicode":["1f448"],"isCanonical": true},":point_right:":{"unicode":["1f449"],"isCanonical": true},":punch:":{"unicode":["1f44a"],"isCanonical": true},":wave:":{"unicode":["1f44b"],"isCanonical": true},":ok_hand:":{"unicode":["1f44c"],"isCanonical": true},":thumbsup:":{"unicode":["1f44d"],"isCanonical": true},":+1:":{"unicode":["1f44d"],"isCanonical": false},":thumbup:":{"unicode":["1f44d"],"isCanonical": false},":thumbsdown:":{"unicode":["1f44e"],"isCanonical": true},":-1:":{"unicode":["1f44e"],"isCanonical": false},":thumbdown:":{"unicode":["1f44e"],"isCanonical": false},":clap:":{"unicode":["1f44f"],"isCanonical": true},":open_hands:":{"unicode":["1f450"],"isCanonical": true},":crown:":{"unicode":["1f451"],"isCanonical": true},":womans_hat:":{"unicode":["1f452"],"isCanonical": true},":eyeglasses:":{"unicode":["1f453"],"isCanonical": true},":necktie:":{"unicode":["1f454"],"isCanonical": true},":shirt:":{"unicode":["1f455"],"isCanonical": true},":jeans:":{"unicode":["1f456"],"isCanonical": true},":dress:":{"unicode":["1f457"],"isCanonical": true},":kimono:":{"unicode":["1f458"],"isCanonical": true},":bikini:":{"unicode":["1f459"],"isCanonical": true},":womans_clothes:":{"unicode":["1f45a"],"isCanonical": true},":purse:":{"unicode":["1f45b"],"isCanonical": true},":handbag:":{"unicode":["1f45c"],"isCanonical": true},":pouch:":{"unicode":["1f45d"],"isCanonical": true},":mans_shoe:":{"unicode":["1f45e"],"isCanonical": true},":athletic_shoe:":{"unicode":["1f45f"],"isCanonical": true},":high_heel:":{"unicode":["1f460"],"isCanonical": true},":sandal:":{"unicode":["1f461"],"isCanonical": true},":boot:":{"unicode":["1f462"],"isCanonical": true},":footprints:":{"unicode":["1f463"],"isCanonical": true},":bust_in_silhouette:":{"unicode":["1f464"],"isCanonical": true},":boy:":{"unicode":["1f466"],"isCanonical": true},":girl:":{"unicode":["1f467"],"isCanonical": true},":man:":{"unicode":["1f468"],"isCanonical": true},":woman:":{"unicode":["1f469"],"isCanonical": true},":family:":{"unicode":["1f46a"],"isCanonical": true},":couple:":{"unicode":["1f46b"],"isCanonical": true},":cop:":{"unicode":["1f46e"],"isCanonical": true},":dancers:":{"unicode":["1f46f"],"isCanonical": true},":bride_with_veil:":{"unicode":["1f470"],"isCanonical": true},":person_with_blond_hair:":{"unicode":["1f471"],"isCanonical": true},":man_with_gua_pi_mao:":{"unicode":["1f472"],"isCanonical": true},":man_with_turban:":{"unicode":["1f473"],"isCanonical": true},":older_man:":{"unicode":["1f474"],"isCanonical": true},":older_woman:":{"unicode":["1f475"],"isCanonical": true},":grandma:":{"unicode":["1f475"],"isCanonical": false},":baby:":{"unicode":["1f476"],"isCanonical": true},":construction_worker:":{"unicode":["1f477"],"isCanonical": true},":princess:":{"unicode":["1f478"],"isCanonical": true},":japanese_ogre:":{"unicode":["1f479"],"isCanonical": true},":japanese_goblin:":{"unicode":["1f47a"],"isCanonical": true},":ghost:":{"unicode":["1f47b"],"isCanonical": true},":angel:":{"unicode":["1f47c"],"isCanonical": true},":alien:":{"unicode":["1f47d"],"isCanonical": true},":space_invader:":{"unicode":["1f47e"],"isCanonical": true},":imp:":{"unicode":["1f47f"],"isCanonical": true},":skull:":{"unicode":["1f480"],"isCanonical": true},":skeleton:":{"unicode":["1f480"],"isCanonical": false},":card_index:":{"unicode":["1f4c7"],"isCanonical": true},":information_desk_person:":{"unicode":["1f481"],"isCanonical": true},":guardsman:":{"unicode":["1f482"],"isCanonical": true},":dancer:":{"unicode":["1f483"],"isCanonical": true},":lipstick:":{"unicode":["1f484"],"isCanonical": true},":nail_care:":{"unicode":["1f485"],"isCanonical": true},":ledger:":{"unicode":["1f4d2"],"isCanonical": true},":massage:":{"unicode":["1f486"],"isCanonical": true},":notebook:":{"unicode":["1f4d3"],"isCanonical": true},":haircut:":{"unicode":["1f487"],"isCanonical": true},":notebook_with_decorative_cover:":{"unicode":["1f4d4"],"isCanonical": true},":barber:":{"unicode":["1f488"],"isCanonical": true},":closed_book:":{"unicode":["1f4d5"],"isCanonical": true},":syringe:":{"unicode":["1f489"],"isCanonical": true},":book:":{"unicode":["1f4d6"],"isCanonical": true},":pill:":{"unicode":["1f48a"],"isCanonical": true},":green_book:":{"unicode":["1f4d7"],"isCanonical": true},":kiss:":{"unicode":["1f48b"],"isCanonical": true},":blue_book:":{"unicode":["1f4d8"],"isCanonical": true},":love_letter:":{"unicode":["1f48c"],"isCanonical": true},":orange_book:":{"unicode":["1f4d9"],"isCanonical": true},":ring:":{"unicode":["1f48d"],"isCanonical": true},":books:":{"unicode":["1f4da"],"isCanonical": true},":gem:":{"unicode":["1f48e"],"isCanonical": true},":name_badge:":{"unicode":["1f4db"],"isCanonical": true},":couplekiss:":{"unicode":["1f48f"],"isCanonical": true},":scroll:":{"unicode":["1f4dc"],"isCanonical": true},":bouquet:":{"unicode":["1f490"],"isCanonical": true},":pencil:":{"unicode":["1f4dd"],"isCanonical": true},":couple_with_heart:":{"unicode":["1f491"],"isCanonical": true},":telephone_receiver:":{"unicode":["1f4de"],"isCanonical": true},":wedding:":{"unicode":["1f492"],"isCanonical": true},":pager:":{"unicode":["1f4df"],"isCanonical": true},":fax:":{"unicode":["1f4e0"],"isCanonical": true},":heartbeat:":{"unicode":["1f493"],"isCanonical": true},":satellite:":{"unicode":["1f4e1"],"isCanonical": true},":loudspeaker:":{"unicode":["1f4e2"],"isCanonical": true},":broken_heart:":{"unicode":["1f494"],"isCanonical": true},":mega:":{"unicode":["1f4e3"],"isCanonical": true},":outbox_tray:":{"unicode":["1f4e4"],"isCanonical": true},":two_hearts:":{"unicode":["1f495"],"isCanonical": true},":inbox_tray:":{"unicode":["1f4e5"],"isCanonical": true},":package:":{"unicode":["1f4e6"],"isCanonical": true},":sparkling_heart:":{"unicode":["1f496"],"isCanonical": true},":e-mail:":{"unicode":["1f4e7"],"isCanonical": true},":email:":{"unicode":["1f4e7"],"isCanonical": false},":incoming_envelope:":{"unicode":["1f4e8"],"isCanonical": true},":heartpulse:":{"unicode":["1f497"],"isCanonical": true},":envelope_with_arrow:":{"unicode":["1f4e9"],"isCanonical": true},":mailbox_closed:":{"unicode":["1f4ea"],"isCanonical": true},":cupid:":{"unicode":["1f498"],"isCanonical": true},":mailbox:":{"unicode":["1f4eb"],"isCanonical": true},":postbox:":{"unicode":["1f4ee"],"isCanonical": true},":blue_heart:":{"unicode":["1f499"],"isCanonical": true},":newspaper:":{"unicode":["1f4f0"],"isCanonical": true},":iphone:":{"unicode":["1f4f1"],"isCanonical": true},":green_heart:":{"unicode":["1f49a"],"isCanonical": true},":calling:":{"unicode":["1f4f2"],"isCanonical": true},":vibration_mode:":{"unicode":["1f4f3"],"isCanonical": true},":yellow_heart:":{"unicode":["1f49b"],"isCanonical": true},":mobile_phone_off:":{"unicode":["1f4f4"],"isCanonical": true},":signal_strength:":{"unicode":["1f4f6"],"isCanonical": true},":purple_heart:":{"unicode":["1f49c"],"isCanonical": true},":camera:":{"unicode":["1f4f7"],"isCanonical": true},":video_camera:":{"unicode":["1f4f9"],"isCanonical": true},":gift_heart:":{"unicode":["1f49d"],"isCanonical": true},":tv:":{"unicode":["1f4fa"],"isCanonical": true},":radio:":{"unicode":["1f4fb"],"isCanonical": true},":revolving_hearts:":{"unicode":["1f49e"],"isCanonical": true},":vhs:":{"unicode":["1f4fc"],"isCanonical": true},":arrows_clockwise:":{"unicode":["1f503"],"isCanonical": true},":heart_decoration:":{"unicode":["1f49f"],"isCanonical": true},":loud_sound:":{"unicode":["1f50a"],"isCanonical": true},":battery:":{"unicode":["1f50b"],"isCanonical": true},":diamond_shape_with_a_dot_inside:":{"unicode":["1f4a0"],"isCanonical": true},":electric_plug:":{"unicode":["1f50c"],"isCanonical": true},":mag:":{"unicode":["1f50d"],"isCanonical": true},":bulb:":{"unicode":["1f4a1"],"isCanonical": true},":mag_right:":{"unicode":["1f50e"],"isCanonical": true},":lock_with_ink_pen:":{"unicode":["1f50f"],"isCanonical": true},":anger:":{"unicode":["1f4a2"],"isCanonical": true},":closed_lock_with_key:":{"unicode":["1f510"],"isCanonical": true},":key:":{"unicode":["1f511"],"isCanonical": true},":bomb:":{"unicode":["1f4a3"],"isCanonical": true},":lock:":{"unicode":["1f512"],"isCanonical": true},":unlock:":{"unicode":["1f513"],"isCanonical": true},":zzz:":{"unicode":["1f4a4"],"isCanonical": true},":bell:":{"unicode":["1f514"],"isCanonical": true},":bookmark:":{"unicode":["1f516"],"isCanonical": true},":boom:":{"unicode":["1f4a5"],"isCanonical": true},":link:":{"unicode":["1f517"],"isCanonical": true},":radio_button:":{"unicode":["1f518"],"isCanonical": true},":sweat_drops:":{"unicode":["1f4a6"],"isCanonical": true},":back:":{"unicode":["1f519"],"isCanonical": true},":end:":{"unicode":["1f51a"],"isCanonical": true},":droplet:":{"unicode":["1f4a7"],"isCanonical": true},":on:":{"unicode":["1f51b"],"isCanonical": true},":soon:":{"unicode":["1f51c"],"isCanonical": true},":dash:":{"unicode":["1f4a8"],"isCanonical": true},":top:":{"unicode":["1f51d"],"isCanonical": true},":underage:":{"unicode":["1f51e"],"isCanonical": true},":poop:":{"unicode":["1f4a9"],"isCanonical": true},":shit:":{"unicode":["1f4a9"],"isCanonical": false},":hankey:":{"unicode":["1f4a9"],"isCanonical": false},":poo:":{"unicode":["1f4a9"],"isCanonical": false},":keycap_ten:":{"unicode":["1f51f"],"isCanonical": true},":muscle:":{"unicode":["1f4aa"],"isCanonical": true},":capital_abcd:":{"unicode":["1f520"],"isCanonical": true},":abcd:":{"unicode":["1f521"],"isCanonical": true},":dizzy:":{"unicode":["1f4ab"],"isCanonical": true},":1234:":{"unicode":["1f522"],"isCanonical": true},":symbols:":{"unicode":["1f523"],"isCanonical": true},":speech_balloon:":{"unicode":["1f4ac"],"isCanonical": true},":abc:":{"unicode":["1f524"],"isCanonical": true},":fire:":{"unicode":["1f525"],"isCanonical": true},":flame:":{"unicode":["1f525"],"isCanonical": false},":white_flower:":{"unicode":["1f4ae"],"isCanonical": true},":flashlight:":{"unicode":["1f526"],"isCanonical": true},":wrench:":{"unicode":["1f527"],"isCanonical": true},":100:":{"unicode":["1f4af"],"isCanonical": true},":hammer:":{"unicode":["1f528"],"isCanonical": true},":nut_and_bolt:":{"unicode":["1f529"],"isCanonical": true},":moneybag:":{"unicode":["1f4b0"],"isCanonical": true},":knife:":{"unicode":["1f52a"],"isCanonical": true},":gun:":{"unicode":["1f52b"],"isCanonical": true},":currency_exchange:":{"unicode":["1f4b1"],"isCanonical": true},":crystal_ball:":{"unicode":["1f52e"],"isCanonical": true},":heavy_dollar_sign:":{"unicode":["1f4b2"],"isCanonical": true},":six_pointed_star:":{"unicode":["1f52f"],"isCanonical": true},":credit_card:":{"unicode":["1f4b3"],"isCanonical": true},":beginner:":{"unicode":["1f530"],"isCanonical": true},":trident:":{"unicode":["1f531"],"isCanonical": true},":yen:":{"unicode":["1f4b4"],"isCanonical": true},":black_square_button:":{"unicode":["1f532"],"isCanonical": true},":white_square_button:":{"unicode":["1f533"],"isCanonical": true},":dollar:":{"unicode":["1f4b5"],"isCanonical": true},":red_circle:":{"unicode":["1f534"],"isCanonical": true},":large_blue_circle:":{"unicode":["1f535"],"isCanonical": true},":money_with_wings:":{"unicode":["1f4b8"],"isCanonical": true},":large_orange_diamond:":{"unicode":["1f536"],"isCanonical": true},":large_blue_diamond:":{"unicode":["1f537"],"isCanonical": true},":chart:":{"unicode":["1f4b9"],"isCanonical": true},":small_orange_diamond:":{"unicode":["1f538"],"isCanonical": true},":small_blue_diamond:":{"unicode":["1f539"],"isCanonical": true},":seat:":{"unicode":["1f4ba"],"isCanonical": true},":small_red_triangle:":{"unicode":["1f53a"],"isCanonical": true},":small_red_triangle_down:":{"unicode":["1f53b"],"isCanonical": true},":computer:":{"unicode":["1f4bb"],"isCanonical": true},":arrow_up_small:":{"unicode":["1f53c"],"isCanonical": true},":briefcase:":{"unicode":["1f4bc"],"isCanonical": true},":arrow_down_small:":{"unicode":["1f53d"],"isCanonical": true},":clock1:":{"unicode":["1f550"],"isCanonical": true},":minidisc:":{"unicode":["1f4bd"],"isCanonical": true},":clock2:":{"unicode":["1f551"],"isCanonical": true},":floppy_disk:":{"unicode":["1f4be"],"isCanonical": true},":clock3:":{"unicode":["1f552"],"isCanonical": true},":cd:":{"unicode":["1f4bf"],"isCanonical": true},":clock4:":{"unicode":["1f553"],"isCanonical": true},":dvd:":{"unicode":["1f4c0"],"isCanonical": true},":clock5:":{"unicode":["1f554"],"isCanonical": true},":clock6:":{"unicode":["1f555"],"isCanonical": true},":file_folder:":{"unicode":["1f4c1"],"isCanonical": true},":clock7:":{"unicode":["1f556"],"isCanonical": true},":clock8:":{"unicode":["1f557"],"isCanonical": true},":open_file_folder:":{"unicode":["1f4c2"],"isCanonical": true},":clock9:":{"unicode":["1f558"],"isCanonical": true},":clock10:":{"unicode":["1f559"],"isCanonical": true},":page_with_curl:":{"unicode":["1f4c3"],"isCanonical": true},":clock11:":{"unicode":["1f55a"],"isCanonical": true},":clock12:":{"unicode":["1f55b"],"isCanonical": true},":page_facing_up:":{"unicode":["1f4c4"],"isCanonical": true},":mount_fuji:":{"unicode":["1f5fb"],"isCanonical": true},":tokyo_tower:":{"unicode":["1f5fc"],"isCanonical": true},":date:":{"unicode":["1f4c5"],"isCanonical": true},":statue_of_liberty:":{"unicode":["1f5fd"],"isCanonical": true},":japan:":{"unicode":["1f5fe"],"isCanonical": true},":calendar:":{"unicode":["1f4c6"],"isCanonical": true},":moyai:":{"unicode":["1f5ff"],"isCanonical": true},":grin:":{"unicode":["1f601"],"isCanonical": true},":joy:":{"unicode":["1f602"],"isCanonical": true},":smiley:":{"unicode":["1f603"],"isCanonical": true},":chart_with_upwards_trend:":{"unicode":["1f4c8"],"isCanonical": true},":smile:":{"unicode":["1f604"],"isCanonical": true},":sweat_smile:":{"unicode":["1f605"],"isCanonical": true},":chart_with_downwards_trend:":{"unicode":["1f4c9"],"isCanonical": true},":laughing:":{"unicode":["1f606"],"isCanonical": true},":satisfied:":{"unicode":["1f606"],"isCanonical": false},":wink:":{"unicode":["1f609"],"isCanonical": true},":bar_chart:":{"unicode":["1f4ca"],"isCanonical": true},":blush:":{"unicode":["1f60a"],"isCanonical": true},":yum:":{"unicode":["1f60b"],"isCanonical": true},":clipboard:":{"unicode":["1f4cb"],"isCanonical": true},":relieved:":{"unicode":["1f60c"],"isCanonical": true},":heart_eyes:":{"unicode":["1f60d"],"isCanonical": true},":pushpin:":{"unicode":["1f4cc"],"isCanonical": true},":smirk:":{"unicode":["1f60f"],"isCanonical": true},":unamused:":{"unicode":["1f612"],"isCanonical": true},":round_pushpin:":{"unicode":["1f4cd"],"isCanonical": true},":sweat:":{"unicode":["1f613"],"isCanonical": true},":pensive:":{"unicode":["1f614"],"isCanonical": true},":paperclip:":{"unicode":["1f4ce"],"isCanonical": true},":confounded:":{"unicode":["1f616"],"isCanonical": true},":kissing_heart:":{"unicode":["1f618"],"isCanonical": true},":straight_ruler:":{"unicode":["1f4cf"],"isCanonical": true},":kissing_closed_eyes:":{"unicode":["1f61a"],"isCanonical": true},":stuck_out_tongue_winking_eye:":{"unicode":["1f61c"],"isCanonical": true},":triangular_ruler:":{"unicode":["1f4d0"],"isCanonical": true},":stuck_out_tongue_closed_eyes:":{"unicode":["1f61d"],"isCanonical": true},":disappointed:":{"unicode":["1f61e"],"isCanonical": true},":bookmark_tabs:":{"unicode":["1f4d1"],"isCanonical": true},":angry:":{"unicode":["1f620"],"isCanonical": true},":rage:":{"unicode":["1f621"],"isCanonical": true},":cry:":{"unicode":["1f622"],"isCanonical": true},":persevere:":{"unicode":["1f623"],"isCanonical": true},":triumph:":{"unicode":["1f624"],"isCanonical": true},":disappointed_relieved:":{"unicode":["1f625"],"isCanonical": true},":fearful:":{"unicode":["1f628"],"isCanonical": true},":weary:":{"unicode":["1f629"],"isCanonical": true},":sleepy:":{"unicode":["1f62a"],"isCanonical": true},":tired_face:":{"unicode":["1f62b"],"isCanonical": true},":sob:":{"unicode":["1f62d"],"isCanonical": true},":cold_sweat:":{"unicode":["1f630"],"isCanonical": true},":scream:":{"unicode":["1f631"],"isCanonical": true},":astonished:":{"unicode":["1f632"],"isCanonical": true},":flushed:":{"unicode":["1f633"],"isCanonical": true},":dizzy_face:":{"unicode":["1f635"],"isCanonical": true},":mask:":{"unicode":["1f637"],"isCanonical": true},":smile_cat:":{"unicode":["1f638"],"isCanonical": true},":joy_cat:":{"unicode":["1f639"],"isCanonical": true},":smiley_cat:":{"unicode":["1f63a"],"isCanonical": true},":heart_eyes_cat:":{"unicode":["1f63b"],"isCanonical": true},":smirk_cat:":{"unicode":["1f63c"],"isCanonical": true},":kissing_cat:":{"unicode":["1f63d"],"isCanonical": true},":pouting_cat:":{"unicode":["1f63e"],"isCanonical": true},":crying_cat_face:":{"unicode":["1f63f"],"isCanonical": true},":scream_cat:":{"unicode":["1f640"],"isCanonical": true},":no_good:":{"unicode":["1f645"],"isCanonical": true},":ok_woman:":{"unicode":["1f646"],"isCanonical": true},":bow:":{"unicode":["1f647"],"isCanonical": true},":see_no_evil:":{"unicode":["1f648"],"isCanonical": true},":hear_no_evil:":{"unicode":["1f649"],"isCanonical": true},":speak_no_evil:":{"unicode":["1f64a"],"isCanonical": true},":raising_hand:":{"unicode":["1f64b"],"isCanonical": true},":raised_hands:":{"unicode":["1f64c"],"isCanonical": true},":person_frowning:":{"unicode":["1f64d"],"isCanonical": true},":person_with_pouting_face:":{"unicode":["1f64e"],"isCanonical": true},":pray:":{"unicode":["1f64f"],"isCanonical": true},":rocket:":{"unicode":["1f680"],"isCanonical": true},":railway_car:":{"unicode":["1f683"],"isCanonical": true},":bullettrain_side:":{"unicode":["1f684"],"isCanonical": true},":bullettrain_front:":{"unicode":["1f685"],"isCanonical": true},":metro:":{"unicode":["1f687"],"isCanonical": true},":station:":{"unicode":["1f689"],"isCanonical": true},":bus:":{"unicode":["1f68c"],"isCanonical": true},":busstop:":{"unicode":["1f68f"],"isCanonical": true},":ambulance:":{"unicode":["1f691"],"isCanonical": true},":fire_engine:":{"unicode":["1f692"],"isCanonical": true},":police_car:":{"unicode":["1f693"],"isCanonical": true},":taxi:":{"unicode":["1f695"],"isCanonical": true},":red_car:":{"unicode":["1f697"],"isCanonical": true},":blue_car:":{"unicode":["1f699"],"isCanonical": true},":truck:":{"unicode":["1f69a"],"isCanonical": true},":ship:":{"unicode":["1f6a2"],"isCanonical": true},":speedboat:":{"unicode":["1f6a4"],"isCanonical": true},":traffic_light:":{"unicode":["1f6a5"],"isCanonical": true},":construction:":{"unicode":["1f6a7"],"isCanonical": true},":rotating_light:":{"unicode":["1f6a8"],"isCanonical": true},":triangular_flag_on_post:":{"unicode":["1f6a9"],"isCanonical": true},":door:":{"unicode":["1f6aa"],"isCanonical": true},":no_entry_sign:":{"unicode":["1f6ab"],"isCanonical": true},":smoking:":{"unicode":["1f6ac"],"isCanonical": true},":no_smoking:":{"unicode":["1f6ad"],"isCanonical": true},":bike:":{"unicode":["1f6b2"],"isCanonical": true},":walking:":{"unicode":["1f6b6"],"isCanonical": true},":mens:":{"unicode":["1f6b9"],"isCanonical": true},":womens:":{"unicode":["1f6ba"],"isCanonical": true},":restroom:":{"unicode":["1f6bb"],"isCanonical": true},":baby_symbol:":{"unicode":["1f6bc"],"isCanonical": true},":toilet:":{"unicode":["1f6bd"],"isCanonical": true},":wc:":{"unicode":["1f6be"],"isCanonical": true},":bath:":{"unicode":["1f6c0"],"isCanonical": true},":metal:":{"unicode":["1f918"],"isCanonical": true},":sign_of_the_horns:":{"unicode":["1f918"],"isCanonical": false},":grinning:":{"unicode":["1f600"],"isCanonical": true},":innocent:":{"unicode":["1f607"],"isCanonical": true},":smiling_imp:":{"unicode":["1f608"],"isCanonical": true},":sunglasses:":{"unicode":["1f60e"],"isCanonical": true},":neutral_face:":{"unicode":["1f610"],"isCanonical": true},":expressionless:":{"unicode":["1f611"],"isCanonical": true},":confused:":{"unicode":["1f615"],"isCanonical": true},":kissing:":{"unicode":["1f617"],"isCanonical": true},":kissing_smiling_eyes:":{"unicode":["1f619"],"isCanonical": true},":stuck_out_tongue:":{"unicode":["1f61b"],"isCanonical": true},":worried:":{"unicode":["1f61f"],"isCanonical": true},":frowning:":{"unicode":["1f626"],"isCanonical": true},":anguished:":{"unicode":["1f627"],"isCanonical": true},":grimacing:":{"unicode":["1f62c"],"isCanonical": true},":open_mouth:":{"unicode":["1f62e"],"isCanonical": true},":hushed:":{"unicode":["1f62f"],"isCanonical": true},":sleeping:":{"unicode":["1f634"],"isCanonical": true},":no_mouth:":{"unicode":["1f636"],"isCanonical": true},":helicopter:":{"unicode":["1f681"],"isCanonical": true},":steam_locomotive:":{"unicode":["1f682"],"isCanonical": true},":train2:":{"unicode":["1f686"],"isCanonical": true},":light_rail:":{"unicode":["1f688"],"isCanonical": true},":tram:":{"unicode":["1f68a"],"isCanonical": true},":oncoming_bus:":{"unicode":["1f68d"],"isCanonical": true},":trolleybus:":{"unicode":["1f68e"],"isCanonical": true},":minibus:":{"unicode":["1f690"],"isCanonical": true},":oncoming_police_car:":{"unicode":["1f694"],"isCanonical": true},":oncoming_taxi:":{"unicode":["1f696"],"isCanonical": true},":oncoming_automobile:":{"unicode":["1f698"],"isCanonical": true},":articulated_lorry:":{"unicode":["1f69b"],"isCanonical": true},":tractor:":{"unicode":["1f69c"],"isCanonical": true},":monorail:":{"unicode":["1f69d"],"isCanonical": true},":mountain_railway:":{"unicode":["1f69e"],"isCanonical": true},":suspension_railway:":{"unicode":["1f69f"],"isCanonical": true},":mountain_cableway:":{"unicode":["1f6a0"],"isCanonical": true},":aerial_tramway:":{"unicode":["1f6a1"],"isCanonical": true},":rowboat:":{"unicode":["1f6a3"],"isCanonical": true},":vertical_traffic_light:":{"unicode":["1f6a6"],"isCanonical": true},":put_litter_in_its_place:":{"unicode":["1f6ae"],"isCanonical": true},":do_not_litter:":{"unicode":["1f6af"],"isCanonical": true},":potable_water:":{"unicode":["1f6b0"],"isCanonical": true},":non-potable_water:":{"unicode":["1f6b1"],"isCanonical": true},":no_bicycles:":{"unicode":["1f6b3"],"isCanonical": true},":bicyclist:":{"unicode":["1f6b4"],"isCanonical": true},":mountain_bicyclist:":{"unicode":["1f6b5"],"isCanonical": true},":no_pedestrians:":{"unicode":["1f6b7"],"isCanonical": true},":children_crossing:":{"unicode":["1f6b8"],"isCanonical": true},":shower:":{"unicode":["1f6bf"],"isCanonical": true},":bathtub:":{"unicode":["1f6c1"],"isCanonical": true},":passport_control:":{"unicode":["1f6c2"],"isCanonical": true},":customs:":{"unicode":["1f6c3"],"isCanonical": true},":baggage_claim:":{"unicode":["1f6c4"],"isCanonical": true},":left_luggage:":{"unicode":["1f6c5"],"isCanonical": true},":earth_africa:":{"unicode":["1f30d"],"isCanonical": true},":earth_americas:":{"unicode":["1f30e"],"isCanonical": true},":globe_with_meridians:":{"unicode":["1f310"],"isCanonical": true},":waxing_crescent_moon:":{"unicode":["1f312"],"isCanonical": true},":waning_gibbous_moon:":{"unicode":["1f316"],"isCanonical": true},":last_quarter_moon:":{"unicode":["1f317"],"isCanonical": true},":waning_crescent_moon:":{"unicode":["1f318"],"isCanonical": true},":new_moon_with_face:":{"unicode":["1f31a"],"isCanonical": true},":last_quarter_moon_with_face:":{"unicode":["1f31c"],"isCanonical": true},":full_moon_with_face:":{"unicode":["1f31d"],"isCanonical": true},":sun_with_face:":{"unicode":["1f31e"],"isCanonical": true},":evergreen_tree:":{"unicode":["1f332"],"isCanonical": true},":deciduous_tree:":{"unicode":["1f333"],"isCanonical": true},":lemon:":{"unicode":["1f34b"],"isCanonical": true},":pear:":{"unicode":["1f350"],"isCanonical": true},":baby_bottle:":{"unicode":["1f37c"],"isCanonical": true},":horse_racing:":{"unicode":["1f3c7"],"isCanonical": true},":rugby_football:":{"unicode":["1f3c9"],"isCanonical": true},":european_post_office:":{"unicode":["1f3e4"],"isCanonical": true},":rat:":{"unicode":["1f400"],"isCanonical": true},":mouse2:":{"unicode":["1f401"],"isCanonical": true},":ox:":{"unicode":["1f402"],"isCanonical": true},":water_buffalo:":{"unicode":["1f403"],"isCanonical": true},":cow2:":{"unicode":["1f404"],"isCanonical": true},":tiger2:":{"unicode":["1f405"],"isCanonical": true},":leopard:":{"unicode":["1f406"],"isCanonical": true},":rabbit2:":{"unicode":["1f407"],"isCanonical": true},":cat2:":{"unicode":["1f408"],"isCanonical": true},":dragon:":{"unicode":["1f409"],"isCanonical": true},":crocodile:":{"unicode":["1f40a"],"isCanonical": true},":whale2:":{"unicode":["1f40b"],"isCanonical": true},":ram:":{"unicode":["1f40f"],"isCanonical": true},":goat:":{"unicode":["1f410"],"isCanonical": true},":rooster:":{"unicode":["1f413"],"isCanonical": true},":dog2:":{"unicode":["1f415"],"isCanonical": true},":pig2:":{"unicode":["1f416"],"isCanonical": true},":dromedary_camel:":{"unicode":["1f42a"],"isCanonical": true},":busts_in_silhouette:":{"unicode":["1f465"],"isCanonical": true},":two_men_holding_hands:":{"unicode":["1f46c"],"isCanonical": true},":two_women_holding_hands:":{"unicode":["1f46d"],"isCanonical": true},":thought_balloon:":{"unicode":["1f4ad"],"isCanonical": true},":euro:":{"unicode":["1f4b6"],"isCanonical": true},":pound:":{"unicode":["1f4b7"],"isCanonical": true},":mailbox_with_mail:":{"unicode":["1f4ec"],"isCanonical": true},":mailbox_with_no_mail:":{"unicode":["1f4ed"],"isCanonical": true},":postal_horn:":{"unicode":["1f4ef"],"isCanonical": true},":no_mobile_phones:":{"unicode":["1f4f5"],"isCanonical": true},":twisted_rightwards_arrows:":{"unicode":["1f500"],"isCanonical": true},":repeat:":{"unicode":["1f501"],"isCanonical": true},":repeat_one:":{"unicode":["1f502"],"isCanonical": true},":arrows_counterclockwise:":{"unicode":["1f504"],"isCanonical": true},":low_brightness:":{"unicode":["1f505"],"isCanonical": true},":high_brightness:":{"unicode":["1f506"],"isCanonical": true},":mute:":{"unicode":["1f507"],"isCanonical": true},":sound:":{"unicode":["1f509"],"isCanonical": true},":no_bell:":{"unicode":["1f515"],"isCanonical": true},":microscope:":{"unicode":["1f52c"],"isCanonical": true},":telescope:":{"unicode":["1f52d"],"isCanonical": true},":clock130:":{"unicode":["1f55c"],"isCanonical": true},":clock230:":{"unicode":["1f55d"],"isCanonical": true},":clock330:":{"unicode":["1f55e"],"isCanonical": true},":clock430:":{"unicode":["1f55f"],"isCanonical": true},":clock530:":{"unicode":["1f560"],"isCanonical": true},":clock630:":{"unicode":["1f561"],"isCanonical": true},":clock730:":{"unicode":["1f562"],"isCanonical": true},":clock830:":{"unicode":["1f563"],"isCanonical": true},":clock930:":{"unicode":["1f564"],"isCanonical": true},":clock1030:":{"unicode":["1f565"],"isCanonical": true},":clock1130:":{"unicode":["1f566"],"isCanonical": true},":clock1230:":{"unicode":["1f567"],"isCanonical": true},":speaker:":{"unicode":["1f508"],"isCanonical": true},":train:":{"unicode":["1f68b"],"isCanonical": true},":medal:":{"unicode":["1f3c5"],"isCanonical": true},":sports_medal:":{"unicode":["1f3c5"],"isCanonical": false},":flag_black:":{"unicode":["1f3f4"],"isCanonical": true},":waving_black_flag:":{"unicode":["1f3f4"],"isCanonical": false},":camera_with_flash:":{"unicode":["1f4f8"],"isCanonical": true},":sleeping_accommodation:":{"unicode":["1f6cc"],"isCanonical": true},":middle_finger:":{"unicode":["1f595"],"isCanonical": true},":reversed_hand_with_middle_finger_extended:":{"unicode":["1f595"],"isCanonical": false},":vulcan:":{"unicode":["1f596"],"isCanonical": true},":raised_hand_with_part_between_middle_and_ring_fingers:":{"unicode":["1f596"],"isCanonical": false},":slight_frown:":{"unicode":["1f641"],"isCanonical": true},":slightly_frowning_face:":{"unicode":["1f641"],"isCanonical": false},":slight_smile:":{"unicode":["1f642"],"isCanonical": true},":slightly_smiling_face:":{"unicode":["1f642"],"isCanonical": false},":airplane_departure:":{"unicode":["1f6eb"],"isCanonical": true},":airplane_arriving:":{"unicode":["1f6ec"],"isCanonical": true},":tone1:":{"unicode":["1f3fb"],"isCanonical": true},":tone2:":{"unicode":["1f3fc"],"isCanonical": true},":tone3:":{"unicode":["1f3fd"],"isCanonical": true},":tone4:":{"unicode":["1f3fe"],"isCanonical": true},":tone5:":{"unicode":["1f3ff"],"isCanonical": true},":upside_down:":{"unicode":["1f643"],"isCanonical": true},":upside_down_face:":{"unicode":["1f643"],"isCanonical": false},":money_mouth:":{"unicode":["1f911"],"isCanonical": true},":money_mouth_face:":{"unicode":["1f911"],"isCanonical": false},":nerd:":{"unicode":["1f913"],"isCanonical": true},":nerd_face:":{"unicode":["1f913"],"isCanonical": false},":hugging:":{"unicode":["1f917"],"isCanonical": true},":hugging_face:":{"unicode":["1f917"],"isCanonical": false},":rolling_eyes:":{"unicode":["1f644"],"isCanonical": true},":face_with_rolling_eyes:":{"unicode":["1f644"],"isCanonical": false},":thinking:":{"unicode":["1f914"],"isCanonical": true},":thinking_face:":{"unicode":["1f914"],"isCanonical": false},":zipper_mouth:":{"unicode":["1f910"],"isCanonical": true},":zipper_mouth_face:":{"unicode":["1f910"],"isCanonical": false},":thermometer_face:":{"unicode":["1f912"],"isCanonical": true},":face_with_thermometer:":{"unicode":["1f912"],"isCanonical": false},":head_bandage:":{"unicode":["1f915"],"isCanonical": true},":face_with_head_bandage:":{"unicode":["1f915"],"isCanonical": false},":robot:":{"unicode":["1f916"],"isCanonical": true},":robot_face:":{"unicode":["1f916"],"isCanonical": false},":lion_face:":{"unicode":["1f981"],"isCanonical": true},":lion:":{"unicode":["1f981"],"isCanonical": false},":unicorn:":{"unicode":["1f984"],"isCanonical": true},":unicorn_face:":{"unicode":["1f984"],"isCanonical": false},":scorpion:":{"unicode":["1f982"],"isCanonical": true},":crab:":{"unicode":["1f980"],"isCanonical": true},":turkey:":{"unicode":["1f983"],"isCanonical": true},":cheese:":{"unicode":["1f9c0"],"isCanonical": true},":cheese_wedge:":{"unicode":["1f9c0"],"isCanonical": false},":hotdog:":{"unicode":["1f32d"],"isCanonical": true},":hot_dog:":{"unicode":["1f32d"],"isCanonical": false},":taco:":{"unicode":["1f32e"],"isCanonical": true},":burrito:":{"unicode":["1f32f"],"isCanonical": true},":popcorn:":{"unicode":["1f37f"],"isCanonical": true},":champagne:":{"unicode":["1f37e"],"isCanonical": true},":bottle_with_popping_cork:":{"unicode":["1f37e"],"isCanonical": false},":bow_and_arrow:":{"unicode":["1f3f9"],"isCanonical": true},":archery:":{"unicode":["1f3f9"],"isCanonical": false},":amphora:":{"unicode":["1f3fa"],"isCanonical": true},":place_of_worship:":{"unicode":["1f6d0"],"isCanonical": true},":worship_symbol:":{"unicode":["1f6d0"],"isCanonical": false},":kaaba:":{"unicode":["1f54b"],"isCanonical": true},":mosque:":{"unicode":["1f54c"],"isCanonical": true},":synagogue:":{"unicode":["1f54d"],"isCanonical": true},":menorah:":{"unicode":["1f54e"],"isCanonical": true},":prayer_beads:":{"unicode":["1f4ff"],"isCanonical": true},":cricket:":{"unicode":["1f3cf"],"isCanonical": true},":cricket_bat_ball:":{"unicode":["1f3cf"],"isCanonical": false},":volleyball:":{"unicode":["1f3d0"],"isCanonical": true},":field_hockey:":{"unicode":["1f3d1"],"isCanonical": true},":hockey:":{"unicode":["1f3d2"],"isCanonical": true},":ping_pong:":{"unicode":["1f3d3"],"isCanonical": true},":table_tennis:":{"unicode":["1f3d3"],"isCanonical": false},":badminton:":{"unicode":["1f3f8"],"isCanonical": true},":drum:":{"unicode":["1f941"],"isCanonical": true},":drum_with_drumsticks:":{"unicode":["1f941"],"isCanonical": false},":shrimp:":{"unicode":["1f990"],"isCanonical": true},":squid:":{"unicode":["1f991"],"isCanonical": true},":egg:":{"unicode":["1f95a"],"isCanonical": true},":milk:":{"unicode":["1f95b"],"isCanonical": true},":glass_of_milk:":{"unicode":["1f95b"],"isCanonical": false},":peanuts:":{"unicode":["1f95c"],"isCanonical": true},":shelled_peanut:":{"unicode":["1f95c"],"isCanonical": false},":kiwi:":{"unicode":["1f95d"],"isCanonical": true},":kiwifruit:":{"unicode":["1f95d"],"isCanonical": false},":pancakes:":{"unicode":["1f95e"],"isCanonical": true},":regional_indicator_w:":{"unicode":["1f1fc"],"isCanonical": true},":regional_indicator_v:":{"unicode":["1f1fb"],"isCanonical": true},":regional_indicator_u:":{"unicode":["1f1fa"],"isCanonical": true},":regional_indicator_t:":{"unicode":["1f1f9"],"isCanonical": true},":regional_indicator_s:":{"unicode":["1f1f8"],"isCanonical": true},":regional_indicator_r:":{"unicode":["1f1f7"],"isCanonical": true},":regional_indicator_q:":{"unicode":["1f1f6"],"isCanonical": true},":regional_indicator_p:":{"unicode":["1f1f5"],"isCanonical": true},":regional_indicator_o:":{"unicode":["1f1f4"],"isCanonical": true},":regional_indicator_n:":{"unicode":["1f1f3"],"isCanonical": true},":regional_indicator_m:":{"unicode":["1f1f2"],"isCanonical": true},":regional_indicator_l:":{"unicode":["1f1f1"],"isCanonical": true},":regional_indicator_k:":{"unicode":["1f1f0"],"isCanonical": true},":regional_indicator_j:":{"unicode":["1f1ef"],"isCanonical": true},":regional_indicator_i:":{"unicode":["1f1ee"],"isCanonical": true},":regional_indicator_h:":{"unicode":["1f1ed"],"isCanonical": true},":regional_indicator_g:":{"unicode":["1f1ec"],"isCanonical": true},":regional_indicator_f:":{"unicode":["1f1eb"],"isCanonical": true},":regional_indicator_e:":{"unicode":["1f1ea"],"isCanonical": true},":regional_indicator_d:":{"unicode":["1f1e9"],"isCanonical": true},":regional_indicator_c:":{"unicode":["1f1e8"],"isCanonical": true},":regional_indicator_b:":{"unicode":["1f1e7"],"isCanonical": true},":regional_indicator_a:":{"unicode":["1f1e6"],"isCanonical": true},":fast_forward:":{"unicode":["23e9"],"isCanonical": true},":rewind:":{"unicode":["23ea"],"isCanonical": true},":arrow_double_up:":{"unicode":["23eb"],"isCanonical": true},":arrow_double_down:":{"unicode":["23ec"],"isCanonical": true},":alarm_clock:":{"unicode":["23f0"],"isCanonical": true},":hourglass_flowing_sand:":{"unicode":["23f3"],"isCanonical": true},":ophiuchus:":{"unicode":["26ce"],"isCanonical": true},":white_check_mark:":{"unicode":["2705"],"isCanonical": true},":fist:":{"unicode":["270a"],"isCanonical": true},":raised_hand:":{"unicode":["270b"],"isCanonical": true},":sparkles:":{"unicode":["2728"],"isCanonical": true},":x:":{"unicode":["274c"],"isCanonical": true},":negative_squared_cross_mark:":{"unicode":["274e"],"isCanonical": true},":question:":{"unicode":["2753"],"isCanonical": true},":grey_question:":{"unicode":["2754"],"isCanonical": true},":grey_exclamation:":{"unicode":["2755"],"isCanonical": true},":heavy_plus_sign:":{"unicode":["2795"],"isCanonical": true},":heavy_minus_sign:":{"unicode":["2796"],"isCanonical": true},":heavy_division_sign:":{"unicode":["2797"],"isCanonical": true},":curly_loop:":{"unicode":["27b0"],"isCanonical": true},":loop:":{"unicode":["27bf"],"isCanonical": true}};
    // ns.shortnames = Object.keys(ns.emojioneList).map(function(emoji) {
    //     return emoji.replace(/[+]/g, "\\$&");
    // }).join('|');
    var tmpShortNames = [],
        emoji;
    for (emoji in ns.emojioneList) {
        if (!ns.emojioneList.hasOwnProperty(emoji)) continue;
        tmpShortNames.push(emoji.replace(/[+]/g, "\\$&"));
    }
    ns.shortnames = tmpShortNames.join('|');
    ns.asciiList = {
        '<3':'2764',
        '</3':'1f494',
        ':\')':'1f602',
        ':\'-)':'1f602',
        ':D':'1f603',
        ':-D':'1f603',
        '=D':'1f603',
        ':)':'1f642',
        ':-)':'1f642',
        '=]':'1f642',
        '=)':'1f642',
        ':]':'1f642',
        '\':)':'1f605',
        '\':-)':'1f605',
        '\'=)':'1f605',
        '\':D':'1f605',
        '\':-D':'1f605',
        '\'=D':'1f605',
        '>:)':'1f606',
        '>;)':'1f606',
        '>:-)':'1f606',
        '>=)':'1f606',
        ';)':'1f609',
        ';-)':'1f609',
        '*-)':'1f609',
        '*)':'1f609',
        ';-]':'1f609',
        ';]':'1f609',
        ';D':'1f609',
        ';^)':'1f609',
        '\':(':'1f613',
        '\':-(':'1f613',
        '\'=(':'1f613',
        ':*':'1f618',
        ':-*':'1f618',
        '=*':'1f618',
        ':^*':'1f618',
        '>:P':'1f61c',
        'X-P':'1f61c',
        'x-p':'1f61c',
        '>:[':'1f61e',
        ':-(':'1f61e',
        ':(':'1f61e',
        ':-[':'1f61e',
        ':[':'1f61e',
        '=(':'1f61e',
        '>:(':'1f620',
        '>:-(':'1f620',
        ':@':'1f620',
        ':\'(':'1f622',
        ':\'-(':'1f622',
        ';(':'1f622',
        ';-(':'1f622',
        '>.<':'1f623',
        'D:':'1f628',
        ':$':'1f633',
        '=$':'1f633',
        '#-)':'1f635',
        '#)':'1f635',
        '%-)':'1f635',
        '%)':'1f635',
        'X)':'1f635',
        'X-)':'1f635',
        '*\\0/*':'1f646',
        '\\0/':'1f646',
        '*\\O/*':'1f646',
        '\\O/':'1f646',
        'O:-)':'1f607',
        '0:-3':'1f607',
        '0:3':'1f607',
        '0:-)':'1f607',
        '0:)':'1f607',
        '0;^)':'1f607',
        'O:)':'1f607',
        'O;-)':'1f607',
        'O=)':'1f607',
        '0;-)':'1f607',
        'O:-3':'1f607',
        'O:3':'1f607',
        'B-)':'1f60e',
        'B)':'1f60e',
        '8)':'1f60e',
        '8-)':'1f60e',
        'B-D':'1f60e',
        '8-D':'1f60e',
        '-_-':'1f611',
        '-__-':'1f611',
        '-___-':'1f611',
        '>:\\':'1f615',
        '>:/':'1f615',
        ':-/':'1f615',
        ':-.':'1f615',
        ':/':'1f615',
        ':\\':'1f615',
        '=/':'1f615',
        '=\\':'1f615',
        ':L':'1f615',
        '=L':'1f615',
        ':P':'1f61b',
        ':-P':'1f61b',
        '=P':'1f61b',
        ':-p':'1f61b',
        ':p':'1f61b',
        '=p':'1f61b',
        ':-Þ':'1f61b',
        ':Þ':'1f61b',
        ':þ':'1f61b',
        ':-þ':'1f61b',
        ':-b':'1f61b',
        ':b':'1f61b',
        'd:':'1f61b',
        ':-O':'1f62e',
        ':O':'1f62e',
        ':-o':'1f62e',
        ':o':'1f62e',
        'O_O':'1f62e',
        '>:O':'1f62e',
        ':-X':'1f636',
        ':X':'1f636',
        ':-#':'1f636',
        ':#':'1f636',
        '=X':'1f636',
        '=x':'1f636',
        ':x':'1f636',
        ':-x':'1f636',
        '=#':'1f636'
    };
    ns.asciiRegexp = '(\\<3|&lt;3|\\<\\/3|&lt;\\/3|\\:\'\\)|\\:\'\\-\\)|\\:D|\\:\\-D|\\=D|\\:\\)|\\:\\-\\)|\\=\\]|\\=\\)|\\:\\]|\'\\:\\)|\'\\:\\-\\)|\'\\=\\)|\'\\:D|\'\\:\\-D|\'\\=D|\\>\\:\\)|&gt;\\:\\)|\\>;\\)|&gt;;\\)|\\>\\:\\-\\)|&gt;\\:\\-\\)|\\>\\=\\)|&gt;\\=\\)|;\\)|;\\-\\)|\\*\\-\\)|\\*\\)|;\\-\\]|;\\]|;D|;\\^\\)|\'\\:\\(|\'\\:\\-\\(|\'\\=\\(|\\:\\*|\\:\\-\\*|\\=\\*|\\:\\^\\*|\\>\\:P|&gt;\\:P|X\\-P|x\\-p|\\>\\:\\[|&gt;\\:\\[|\\:\\-\\(|\\:\\(|\\:\\-\\[|\\:\\[|\\=\\(|\\>\\:\\(|&gt;\\:\\(|\\>\\:\\-\\(|&gt;\\:\\-\\(|\\:@|\\:\'\\(|\\:\'\\-\\(|;\\(|;\\-\\(|\\>\\.\\<|&gt;\\.&lt;|D\\:|\\:\\$|\\=\\$|#\\-\\)|#\\)|%\\-\\)|%\\)|X\\)|X\\-\\)|\\*\\\\0\\/\\*|\\\\0\\/|\\*\\\\O\\/\\*|\\\\O\\/|O\\:\\-\\)|0\\:\\-3|0\\:3|0\\:\\-\\)|0\\:\\)|0;\\^\\)|O\\:\\-\\)|O\\:\\)|O;\\-\\)|O\\=\\)|0;\\-\\)|O\\:\\-3|O\\:3|B\\-\\)|B\\)|8\\)|8\\-\\)|B\\-D|8\\-D|\\-_\\-|\\-__\\-|\\-___\\-|\\>\\:\\\\|&gt;\\:\\\\|\\>\\:\\/|&gt;\\:\\/|\\:\\-\\/|\\:\\-\\.|\\:\\/|\\:\\\\|\\=\\/|\\=\\\\|\\:L|\\=L|\\:P|\\:\\-P|\\=P|\\:\\-p|\\:p|\\=p|\\:\\-Þ|\\:\\-&THORN;|\\:Þ|\\:&THORN;|\\:þ|\\:&thorn;|\\:\\-þ|\\:\\-&thorn;|\\:\\-b|\\:b|d\\:|\\:\\-O|\\:O|\\:\\-o|\\:o|O_O|\\>\\:O|&gt;\\:O|\\:\\-X|\\:X|\\:\\-#|\\:#|\\=X|\\=x|\\:x|\\:\\-x|\\=#)';
    // javascript escapes here must be ordered from largest length to shortest
    ns.unicodeRegexp = '(\\uD83D\\uDC69\\u200D\\u2764\\uFE0F\\u200D\\uD83D\\uDC8B\\u200D\\uD83D\\uDC69|\\uD83D\\uDC68\\u200D\\u2764\\uFE0F\\u200D\\uD83D\\uDC8B\\u200D\\uD83D\\uDC68|\\uD83D\\uDC68\\u200D\\uD83D\\uDC68\\u200D\\uD83D\\uDC67\\u200D\\uD83D\\uDC66|\\uD83D\\uDC68\\u200D\\uD83D\\uDC68\\u200D\\uD83D\\uDC67\\u200D\\uD83D\\uDC67|\\uD83D\\uDC68\\u200D\\uD83D\\uDC69\\u200D\\uD83D\\uDC66\\u200D\\uD83D\\uDC66|\\uD83D\\uDC68\\u200D\\uD83D\\uDC69\\u200D\\uD83D\\uDC67\\u200D\\uD83D\\uDC66|\\uD83D\\uDC68\\u200D\\uD83D\\uDC69\\u200D\\uD83D\\uDC67\\u200D\\uD83D\\uDC67|\\uD83D\\uDC69\\u200D\\uD83D\\uDC69\\u200D\\uD83D\\uDC66\\u200D\\uD83D\\uDC66|\\uD83D\\uDC69\\u200D\\uD83D\\uDC69\\u200D\\uD83D\\uDC67\\u200D\\uD83D\\uDC66|\\uD83D\\uDC69\\u200D\\uD83D\\uDC69\\u200D\\uD83D\\uDC67\\u200D\\uD83D\\uDC67|\\uD83D\\uDC68\\u200D\\uD83D\\uDC68\\u200D\\uD83D\\uDC66\\u200D\\uD83D\\uDC66|\\uD83D\\uDC68\\u200D\\u2764\\uFE0F\\u200D\\uD83D\\uDC68|\\uD83D\\uDC68\\u200D\\uD83D\\uDC68\\u200D\\uD83D\\uDC67|\\uD83D\\uDC68\\u200D\\uD83D\\uDC69\\u200D\\uD83D\\uDC67|\\uD83D\\uDC69\\u200D\\uD83D\\uDC69\\u200D\\uD83D\\uDC66|\\uD83D\\uDC69\\u200D\\uD83D\\uDC69\\u200D\\uD83D\\uDC67|\\uD83D\\uDC69\\u200D\\u2764\\uFE0F\\u200D\\uD83D\\uDC69|\\uD83D\\uDC68\\u200D\\uD83D\\uDC68\\u200D\\uD83D\\uDC66|\\uD83D\\uDC41\\u200D\\uD83D\\uDDE8|\\uD83C\\uDDE6\\uD83C\\uDDE9|\\uD83C\\uDDE6\\uD83C\\uDDEA|\\uD83C\\uDDE6\\uD83C\\uDDEB|\\uD83C\\uDDE6\\uD83C\\uDDEC|\\uD83C\\uDDE6\\uD83C\\uDDEE|\\uD83C\\uDDE6\\uD83C\\uDDF1|\\uD83C\\uDDE6\\uD83C\\uDDF2|\\uD83C\\uDDE6\\uD83C\\uDDF4|\\uD83C\\uDDE6\\uD83C\\uDDF6|\\uD83C\\uDDE6\\uD83C\\uDDF7|\\uD83C\\uDDE6\\uD83C\\uDDF8|\\uD83E\\uDD18\\uD83C\\uDFFF|\\uD83E\\uDD18\\uD83C\\uDFFE|\\uD83E\\uDD18\\uD83C\\uDFFD|\\uD83E\\uDD18\\uD83C\\uDFFC|\\uD83E\\uDD18\\uD83C\\uDFFB|\\uD83D\\uDEC0\\uD83C\\uDFFF|\\uD83D\\uDEC0\\uD83C\\uDFFE|\\uD83D\\uDEC0\\uD83C\\uDFFD|\\uD83D\\uDEC0\\uD83C\\uDFFC|\\uD83D\\uDEC0\\uD83C\\uDFFB|\\uD83D\\uDEB6\\uD83C\\uDFFF|\\uD83D\\uDEB6\\uD83C\\uDFFE|\\uD83D\\uDEB6\\uD83C\\uDFFD|\\uD83D\\uDEB6\\uD83C\\uDFFC|\\uD83D\\uDEB6\\uD83C\\uDFFB|\\uD83D\\uDEB5\\uD83C\\uDFFF|\\uD83D\\uDEB5\\uD83C\\uDFFE|\\uD83D\\uDEB5\\uD83C\\uDFFD|\\uD83D\\uDEB5\\uD83C\\uDFFC|\\uD83D\\uDEB5\\uD83C\\uDFFB|\\uD83D\\uDEB4\\uD83C\\uDFFF|\\uD83D\\uDEB4\\uD83C\\uDFFE|\\uD83D\\uDEB4\\uD83C\\uDFFD|\\uD83D\\uDEB4\\uD83C\\uDFFC|\\uD83D\\uDEB4\\uD83C\\uDFFB|\\uD83D\\uDEA3\\uD83C\\uDFFF|\\uD83D\\uDEA3\\uD83C\\uDFFE|\\uD83D\\uDEA3\\uD83C\\uDFFD|\\uD83D\\uDEA3\\uD83C\\uDFFC|\\uD83D\\uDEA3\\uD83C\\uDFFB|\\uD83D\\uDE4F\\uD83C\\uDFFF|\\uD83D\\uDE4F\\uD83C\\uDFFE|\\uD83D\\uDE4F\\uD83C\\uDFFD|\\uD83D\\uDE4F\\uD83C\\uDFFC|\\uD83D\\uDE4F\\uD83C\\uDFFB|\\uD83D\\uDE4E\\uD83C\\uDFFF|\\uD83D\\uDE4E\\uD83C\\uDFFE|\\uD83D\\uDE4E\\uD83C\\uDFFD|\\uD83D\\uDE4E\\uD83C\\uDFFC|\\uD83D\\uDE4E\\uD83C\\uDFFB|\\uD83D\\uDE4D\\uD83C\\uDFFF|\\uD83D\\uDE4D\\uD83C\\uDFFE|\\uD83D\\uDE4D\\uD83C\\uDFFD|\\uD83D\\uDE4D\\uD83C\\uDFFC|\\uD83D\\uDE4D\\uD83C\\uDFFB|\\uD83D\\uDE4C\\uD83C\\uDFFF|\\uD83D\\uDE4C\\uD83C\\uDFFE|\\uD83D\\uDE4C\\uD83C\\uDFFD|\\uD83D\\uDE4C\\uD83C\\uDFFC|\\uD83D\\uDE4C\\uD83C\\uDFFB|\\uD83D\\uDE4B\\uD83C\\uDFFF|\\uD83D\\uDE4B\\uD83C\\uDFFE|\\uD83D\\uDE4B\\uD83C\\uDFFD|\\uD83D\\uDE4B\\uD83C\\uDFFC|\\uD83D\\uDE4B\\uD83C\\uDFFB|\\uD83D\\uDE47\\uD83C\\uDFFF|\\uD83D\\uDE47\\uD83C\\uDFFE|\\uD83D\\uDE47\\uD83C\\uDFFD|\\uD83D\\uDE47\\uD83C\\uDFFC|\\uD83D\\uDE47\\uD83C\\uDFFB|\\uD83D\\uDE46\\uD83C\\uDFFF|\\uD83D\\uDE46\\uD83C\\uDFFE|\\uD83D\\uDE46\\uD83C\\uDFFD|\\uD83D\\uDE46\\uD83C\\uDFFC|\\uD83D\\uDE46\\uD83C\\uDFFB|\\uD83D\\uDE45\\uD83C\\uDFFF|\\uD83D\\uDE45\\uD83C\\uDFFE|\\uD83D\\uDE45\\uD83C\\uDFFD|\\uD83D\\uDE45\\uD83C\\uDFFC|\\uD83D\\uDE45\\uD83C\\uDFFB|\\uD83D\\uDD96\\uD83C\\uDFFF|\\uD83D\\uDD96\\uD83C\\uDFFE|\\uD83D\\uDD96\\uD83C\\uDFFD|\\uD83D\\uDD96\\uD83C\\uDFFC|\\uD83D\\uDD96\\uD83C\\uDFFB|\\uD83D\\uDD95\\uD83C\\uDFFF|\\uD83D\\uDD95\\uD83C\\uDFFE|\\uD83D\\uDD95\\uD83C\\uDFFD|\\uD83D\\uDD95\\uD83C\\uDFFC|\\uD83D\\uDD95\\uD83C\\uDFFB|\\uD83D\\uDD90\\uD83C\\uDFFF|\\uD83D\\uDD90\\uD83C\\uDFFE|\\uD83D\\uDD90\\uD83C\\uDFFD|\\uD83D\\uDD90\\uD83C\\uDFFC|\\uD83D\\uDD90\\uD83C\\uDFFB|\\uD83D\\uDD75\\uD83C\\uDFFF|\\uD83D\\uDD75\\uD83C\\uDFFE|\\uD83D\\uDD75\\uD83C\\uDFFD|\\uD83D\\uDD75\\uD83C\\uDFFC|\\uD83D\\uDD75\\uD83C\\uDFFB|\\uD83D\\uDCAA\\uD83C\\uDFFF|\\uD83D\\uDCAA\\uD83C\\uDFFE|\\uD83D\\uDCAA\\uD83C\\uDFFD|\\uD83D\\uDCAA\\uD83C\\uDFFC|\\uD83D\\uDCAA\\uD83C\\uDFFB|\\uD83D\\uDC87\\uD83C\\uDFFF|\\uD83D\\uDC87\\uD83C\\uDFFE|\\uD83D\\uDC87\\uD83C\\uDFFD|\\uD83D\\uDC87\\uD83C\\uDFFC|\\uD83D\\uDC87\\uD83C\\uDFFB|\\uD83D\\uDC86\\uD83C\\uDFFF|\\uD83D\\uDC86\\uD83C\\uDFFE|\\uD83D\\uDC86\\uD83C\\uDFFD|\\uD83D\\uDC86\\uD83C\\uDFFC|\\uD83D\\uDC86\\uD83C\\uDFFB|\\uD83D\\uDC85\\uD83C\\uDFFF|\\uD83D\\uDC85\\uD83C\\uDFFE|\\uD83D\\uDC85\\uD83C\\uDFFD|\\uD83D\\uDC85\\uD83C\\uDFFC|\\uD83D\\uDC85\\uD83C\\uDFFB|\\uD83D\\uDC83\\uD83C\\uDFFF|\\uD83D\\uDC83\\uD83C\\uDFFE|\\uD83D\\uDC83\\uD83C\\uDFFD|\\uD83D\\uDC83\\uD83C\\uDFFC|\\uD83D\\uDC83\\uD83C\\uDFFB|\\uD83D\\uDC82\\uD83C\\uDFFF|\\uD83D\\uDC82\\uD83C\\uDFFE|\\uD83D\\uDC82\\uD83C\\uDFFD|\\uD83D\\uDC82\\uD83C\\uDFFC|\\uD83D\\uDC82\\uD83C\\uDFFB|\\uD83D\\uDC81\\uD83C\\uDFFF|\\uD83D\\uDC81\\uD83C\\uDFFE|\\uD83D\\uDC81\\uD83C\\uDFFD|\\uD83D\\uDC81\\uD83C\\uDFFC|\\uD83D\\uDC81\\uD83C\\uDFFB|\\uD83D\\uDC7C\\uD83C\\uDFFF|\\uD83D\\uDC7C\\uD83C\\uDFFE|\\uD83D\\uDC7C\\uD83C\\uDFFD|\\uD83D\\uDC7C\\uD83C\\uDFFC|\\uD83D\\uDC7C\\uD83C\\uDFFB|\\uD83D\\uDC78\\uD83C\\uDFFF|\\uD83D\\uDC78\\uD83C\\uDFFE|\\uD83D\\uDC78\\uD83C\\uDFFD|\\uD83D\\uDC78\\uD83C\\uDFFC|\\uD83D\\uDC78\\uD83C\\uDFFB|\\uD83D\\uDC77\\uD83C\\uDFFF|\\uD83D\\uDC77\\uD83C\\uDFFE|\\uD83D\\uDC77\\uD83C\\uDFFD|\\uD83D\\uDC77\\uD83C\\uDFFC|\\uD83D\\uDC77\\uD83C\\uDFFB|\\uD83D\\uDC76\\uD83C\\uDFFF|\\uD83D\\uDC76\\uD83C\\uDFFE|\\uD83D\\uDC76\\uD83C\\uDFFD|\\uD83D\\uDC76\\uD83C\\uDFFC|\\uD83D\\uDC76\\uD83C\\uDFFB|\\uD83D\\uDC75\\uD83C\\uDFFF|\\uD83D\\uDC75\\uD83C\\uDFFE|\\uD83D\\uDC75\\uD83C\\uDFFD|\\uD83D\\uDC75\\uD83C\\uDFFC|\\uD83D\\uDC75\\uD83C\\uDFFB|\\uD83D\\uDC74\\uD83C\\uDFFF|\\uD83D\\uDC74\\uD83C\\uDFFE|\\uD83D\\uDC74\\uD83C\\uDFFD|\\uD83D\\uDC74\\uD83C\\uDFFC|\\uD83D\\uDC74\\uD83C\\uDFFB|\\uD83D\\uDC73\\uD83C\\uDFFF|\\uD83D\\uDC73\\uD83C\\uDFFE|\\uD83D\\uDC73\\uD83C\\uDFFD|\\uD83D\\uDC73\\uD83C\\uDFFC|\\uD83D\\uDC73\\uD83C\\uDFFB|\\uD83D\\uDC72\\uD83C\\uDFFF|\\uD83D\\uDC72\\uD83C\\uDFFE|\\uD83D\\uDC72\\uD83C\\uDFFD|\\uD83D\\uDC72\\uD83C\\uDFFC|\\uD83D\\uDC72\\uD83C\\uDFFB|\\uD83D\\uDC71\\uD83C\\uDFFF|\\uD83D\\uDC71\\uD83C\\uDFFE|\\uD83D\\uDC71\\uD83C\\uDFFD|\\uD83D\\uDC71\\uD83C\\uDFFC|\\uD83D\\uDC71\\uD83C\\uDFFB|\\uD83D\\uDC70\\uD83C\\uDFFF|\\uD83D\\uDC70\\uD83C\\uDFFE|\\uD83D\\uDC70\\uD83C\\uDFFD|\\uD83D\\uDC70\\uD83C\\uDFFC|\\uD83D\\uDC70\\uD83C\\uDFFB|\\uD83D\\uDC6E\\uD83C\\uDFFF|\\uD83D\\uDC6E\\uD83C\\uDFFE|\\uD83D\\uDC6E\\uD83C\\uDFFD|\\uD83D\\uDC6E\\uD83C\\uDFFC|\\uD83D\\uDC6E\\uD83C\\uDFFB|\\uD83D\\uDC69\\uD83C\\uDFFF|\\uD83D\\uDC69\\uD83C\\uDFFE|\\uD83D\\uDC69\\uD83C\\uDFFD|\\uD83D\\uDC69\\uD83C\\uDFFC|\\uD83D\\uDC69\\uD83C\\uDFFB|\\uD83D\\uDC68\\uD83C\\uDFFF|\\uD83D\\uDC68\\uD83C\\uDFFE|\\uD83D\\uDC68\\uD83C\\uDFFD|\\uD83D\\uDC68\\uD83C\\uDFFC|\\uD83D\\uDC68\\uD83C\\uDFFB|\\uD83D\\uDC67\\uD83C\\uDFFF|\\uD83D\\uDC67\\uD83C\\uDFFE|\\uD83D\\uDC67\\uD83C\\uDFFD|\\uD83D\\uDC67\\uD83C\\uDFFC|\\uD83D\\uDC67\\uD83C\\uDFFB|\\uD83D\\uDC66\\uD83C\\uDFFF|\\uD83D\\uDC66\\uD83C\\uDFFE|\\uD83D\\uDC66\\uD83C\\uDFFD|\\uD83D\\uDC66\\uD83C\\uDFFC|\\uD83D\\uDC66\\uD83C\\uDFFB|\\uD83D\\uDC50\\uD83C\\uDFFF|\\uD83D\\uDC50\\uD83C\\uDFFE|\\uD83D\\uDC50\\uD83C\\uDFFD|\\uD83D\\uDC50\\uD83C\\uDFFC|\\uD83D\\uDC50\\uD83C\\uDFFB|\\uD83D\\uDC4F\\uD83C\\uDFFF|\\uD83D\\uDC4F\\uD83C\\uDFFE|\\uD83D\\uDC4F\\uD83C\\uDFFD|\\uD83D\\uDC4F\\uD83C\\uDFFC|\\uD83D\\uDC4F\\uD83C\\uDFFB|\\uD83D\\uDC4E\\uD83C\\uDFFF|\\uD83D\\uDC4E\\uD83C\\uDFFE|\\uD83D\\uDC4E\\uD83C\\uDFFD|\\uD83D\\uDC4E\\uD83C\\uDFFC|\\uD83D\\uDC4E\\uD83C\\uDFFB|\\uD83D\\uDC4D\\uD83C\\uDFFF|\\uD83D\\uDC4D\\uD83C\\uDFFE|\\uD83D\\uDC4D\\uD83C\\uDFFD|\\uD83D\\uDC4D\\uD83C\\uDFFC|\\uD83D\\uDC4D\\uD83C\\uDFFB|\\uD83D\\uDC4C\\uD83C\\uDFFF|\\uD83D\\uDC4C\\uD83C\\uDFFE|\\uD83D\\uDC4C\\uD83C\\uDFFD|\\uD83D\\uDC4C\\uD83C\\uDFFC|\\uD83D\\uDC4C\\uD83C\\uDFFB|\\uD83D\\uDC4B\\uD83C\\uDFFF|\\uD83D\\uDC4B\\uD83C\\uDFFE|\\uD83D\\uDC4B\\uD83C\\uDFFD|\\uD83D\\uDC4B\\uD83C\\uDFFC|\\uD83D\\uDC4B\\uD83C\\uDFFB|\\uD83D\\uDC4A\\uD83C\\uDFFF|\\uD83D\\uDC4A\\uD83C\\uDFFE|\\uD83D\\uDC4A\\uD83C\\uDFFD|\\uD83D\\uDC4A\\uD83C\\uDFFC|\\uD83D\\uDC4A\\uD83C\\uDFFB|\\uD83D\\uDC49\\uD83C\\uDFFF|\\uD83D\\uDC49\\uD83C\\uDFFE|\\uD83D\\uDC49\\uD83C\\uDFFD|\\uD83D\\uDC49\\uD83C\\uDFFC|\\uD83D\\uDC49\\uD83C\\uDFFB|\\uD83D\\uDC48\\uD83C\\uDFFF|\\uD83D\\uDC48\\uD83C\\uDFFE|\\uD83D\\uDC48\\uD83C\\uDFFD|\\uD83D\\uDC48\\uD83C\\uDFFC|\\uD83D\\uDC48\\uD83C\\uDFFB|\\uD83D\\uDC47\\uD83C\\uDFFF|\\uD83D\\uDC47\\uD83C\\uDFFE|\\uD83D\\uDC47\\uD83C\\uDFFD|\\uD83D\\uDC47\\uD83C\\uDFFC|\\uD83D\\uDC47\\uD83C\\uDFFB|\\uD83D\\uDC46\\uD83C\\uDFFF|\\uD83D\\uDC46\\uD83C\\uDFFE|\\uD83D\\uDC46\\uD83C\\uDFFD|\\uD83D\\uDC46\\uD83C\\uDFFC|\\uD83D\\uDC46\\uD83C\\uDFFB|\\uD83D\\uDC43\\uD83C\\uDFFF|\\uD83D\\uDC43\\uD83C\\uDFFE|\\uD83D\\uDC43\\uD83C\\uDFFD|\\uD83D\\uDC43\\uD83C\\uDFFC|\\uD83D\\uDC43\\uD83C\\uDFFB|\\uD83D\\uDC42\\uD83C\\uDFFF|\\uD83D\\uDC42\\uD83C\\uDFFE|\\uD83D\\uDC42\\uD83C\\uDFFD|\\uD83D\\uDC42\\uD83C\\uDFFC|\\uD83D\\uDC42\\uD83C\\uDFFB|\\uD83C\\uDFCB\\uD83C\\uDFFF|\\uD83C\\uDFCB\\uD83C\\uDFFE|\\uD83C\\uDFCB\\uD83C\\uDFFD|\\uD83C\\uDFCB\\uD83C\\uDFFC|\\uD83C\\uDFCB\\uD83C\\uDFFB|\\uD83C\\uDFCA\\uD83C\\uDFFF|\\uD83C\\uDFCA\\uD83C\\uDFFE|\\uD83C\\uDFCA\\uD83C\\uDFFD|\\uD83C\\uDFCA\\uD83C\\uDFFC|\\uD83C\\uDFCA\\uD83C\\uDFFB|\\uD83C\\uDFC7\\uD83C\\uDFFF|\\uD83C\\uDFC7\\uD83C\\uDFFE|\\uD83C\\uDFC7\\uD83C\\uDFFD|\\uD83C\\uDFC7\\uD83C\\uDFFC|\\uD83C\\uDFC7\\uD83C\\uDFFB|\\uD83C\\uDFC4\\uD83C\\uDFFF|\\uD83C\\uDFC4\\uD83C\\uDFFE|\\uD83C\\uDFC4\\uD83C\\uDFFD|\\uD83C\\uDFC4\\uD83C\\uDFFC|\\uD83C\\uDFC4\\uD83C\\uDFFB|\\uD83C\\uDFC3\\uD83C\\uDFFF|\\uD83C\\uDFC3\\uD83C\\uDFFE|\\uD83C\\uDFC3\\uD83C\\uDFFD|\\uD83C\\uDFC3\\uD83C\\uDFFC|\\uD83C\\uDFC3\\uD83C\\uDFFB|\\uD83C\\uDF85\\uD83C\\uDFFF|\\uD83C\\uDF85\\uD83C\\uDFFE|\\uD83C\\uDF85\\uD83C\\uDFFD|\\uD83C\\uDF85\\uD83C\\uDFFC|\\uD83C\\uDF85\\uD83C\\uDFFB|\\uD83C\\uDDFF\\uD83C\\uDDFC|\\uD83C\\uDDFF\\uD83C\\uDDF2|\\uD83C\\uDDFF\\uD83C\\uDDE6|\\uD83C\\uDDFE\\uD83C\\uDDF9|\\uD83C\\uDDFE\\uD83C\\uDDEA|\\uD83C\\uDDFD\\uD83C\\uDDF0|\\uD83C\\uDDFC\\uD83C\\uDDF8|\\uD83C\\uDDFC\\uD83C\\uDDEB|\\uD83C\\uDDFB\\uD83C\\uDDFA|\\uD83C\\uDDFB\\uD83C\\uDDF3|\\uD83C\\uDDFB\\uD83C\\uDDEE|\\uD83C\\uDDFB\\uD83C\\uDDEC|\\uD83C\\uDDFB\\uD83C\\uDDEA|\\uD83C\\uDDFB\\uD83C\\uDDE8|\\uD83C\\uDDFB\\uD83C\\uDDE6|\\uD83C\\uDDFA\\uD83C\\uDDFF|\\uD83C\\uDDFA\\uD83C\\uDDFE|\\uD83C\\uDDFA\\uD83C\\uDDF8|\\uD83C\\uDDFA\\uD83C\\uDDF2|\\uD83C\\uDDFA\\uD83C\\uDDEC|\\uD83C\\uDDFA\\uD83C\\uDDE6|\\uD83C\\uDDF9\\uD83C\\uDDFF|\\uD83C\\uDDF9\\uD83C\\uDDFC|\\uD83C\\uDDF9\\uD83C\\uDDFB|\\uD83C\\uDDF9\\uD83C\\uDDF9|\\uD83C\\uDDF9\\uD83C\\uDDF7|\\uD83C\\uDDF9\\uD83C\\uDDF4|\\uD83C\\uDDF9\\uD83C\\uDDF3|\\uD83C\\uDDF9\\uD83C\\uDDF2|\\uD83C\\uDDF9\\uD83C\\uDDF1|\\uD83C\\uDDF9\\uD83C\\uDDF0|\\uD83C\\uDDF9\\uD83C\\uDDEF|\\uD83C\\uDDF9\\uD83C\\uDDED|\\uD83C\\uDDF9\\uD83C\\uDDEC|\\uD83C\\uDDF9\\uD83C\\uDDEB|\\uD83C\\uDDE6\\uD83C\\uDDE8|\\uD83C\\uDDF9\\uD83C\\uDDE8|\\uD83C\\uDDF9\\uD83C\\uDDE6|\\uD83C\\uDDF8\\uD83C\\uDDFF|\\uD83C\\uDDF8\\uD83C\\uDDFE|\\uD83C\\uDDF8\\uD83C\\uDDFD|\\uD83C\\uDDF8\\uD83C\\uDDFB|\\uD83C\\uDDF8\\uD83C\\uDDF9|\\uD83C\\uDDF8\\uD83C\\uDDF8|\\uD83C\\uDDF8\\uD83C\\uDDF7|\\uD83C\\uDDF8\\uD83C\\uDDF4|\\uD83C\\uDDF8\\uD83C\\uDDF3|\\uD83C\\uDDF8\\uD83C\\uDDF2|\\uD83C\\uDDF8\\uD83C\\uDDF1|\\uD83C\\uDDF8\\uD83C\\uDDF0|\\uD83C\\uDDF8\\uD83C\\uDDEF|\\uD83C\\uDDF8\\uD83C\\uDDEE|\\uD83C\\uDDF8\\uD83C\\uDDED|\\uD83C\\uDDF8\\uD83C\\uDDEC|\\uD83C\\uDDF8\\uD83C\\uDDEA|\\uD83C\\uDDF8\\uD83C\\uDDE9|\\uD83C\\uDDF8\\uD83C\\uDDE8|\\uD83C\\uDDF8\\uD83C\\uDDE7|\\uD83C\\uDDF8\\uD83C\\uDDE6|\\uD83C\\uDDF7\\uD83C\\uDDFC|\\uD83C\\uDDF7\\uD83C\\uDDFA|\\uD83C\\uDDF7\\uD83C\\uDDF8|\\uD83C\\uDDF7\\uD83C\\uDDF4|\\uD83C\\uDDF7\\uD83C\\uDDEA|\\uD83C\\uDDF6\\uD83C\\uDDE6|\\uD83C\\uDDF5\\uD83C\\uDDFE|\\uD83C\\uDDF5\\uD83C\\uDDFC|\\uD83C\\uDDF5\\uD83C\\uDDF9|\\uD83C\\uDDF5\\uD83C\\uDDF8|\\uD83C\\uDDF5\\uD83C\\uDDF7|\\uD83C\\uDDF5\\uD83C\\uDDF3|\\uD83C\\uDDF5\\uD83C\\uDDF2|\\uD83C\\uDDF5\\uD83C\\uDDF1|\\uD83C\\uDDF5\\uD83C\\uDDF0|\\uD83C\\uDDF5\\uD83C\\uDDED|\\uD83C\\uDDF5\\uD83C\\uDDEC|\\uD83C\\uDDF5\\uD83C\\uDDEB|\\uD83C\\uDDF5\\uD83C\\uDDEA|\\uD83C\\uDDF5\\uD83C\\uDDE6|\\uD83C\\uDDF4\\uD83C\\uDDF2|\\uD83C\\uDDF3\\uD83C\\uDDFF|\\uD83C\\uDDF3\\uD83C\\uDDFA|\\uD83C\\uDDF3\\uD83C\\uDDF7|\\uD83C\\uDDF3\\uD83C\\uDDF5|\\uD83C\\uDDF3\\uD83C\\uDDF4|\\uD83C\\uDDF3\\uD83C\\uDDF1|\\uD83C\\uDDF3\\uD83C\\uDDEE|\\uD83C\\uDDF3\\uD83C\\uDDEC|\\uD83C\\uDDF3\\uD83C\\uDDEB|\\uD83C\\uDDF3\\uD83C\\uDDEA|\\uD83C\\uDDF3\\uD83C\\uDDE8|\\uD83C\\uDDF3\\uD83C\\uDDE6|\\uD83C\\uDDF2\\uD83C\\uDDFF|\\uD83C\\uDDF2\\uD83C\\uDDFE|\\uD83C\\uDDF2\\uD83C\\uDDFD|\\uD83C\\uDDF2\\uD83C\\uDDFC|\\uD83C\\uDDF2\\uD83C\\uDDFB|\\uD83C\\uDDF2\\uD83C\\uDDFA|\\uD83C\\uDDF2\\uD83C\\uDDF9|\\uD83C\\uDDF2\\uD83C\\uDDF8|\\uD83C\\uDDF2\\uD83C\\uDDF7|\\uD83C\\uDDF2\\uD83C\\uDDF6|\\uD83C\\uDDF2\\uD83C\\uDDF5|\\uD83C\\uDDF2\\uD83C\\uDDF4|\\uD83C\\uDDF2\\uD83C\\uDDF3|\\uD83C\\uDDF2\\uD83C\\uDDF2|\\uD83C\\uDDF2\\uD83C\\uDDF1|\\uD83C\\uDDF2\\uD83C\\uDDF0|\\uD83C\\uDDF2\\uD83C\\uDDED|\\uD83C\\uDDF2\\uD83C\\uDDEC|\\uD83C\\uDDF2\\uD83C\\uDDEB|\\uD83C\\uDDF2\\uD83C\\uDDEA|\\uD83C\\uDDF2\\uD83C\\uDDE9|\\uD83C\\uDDF2\\uD83C\\uDDE8|\\uD83C\\uDDF2\\uD83C\\uDDE6|\\uD83C\\uDDF1\\uD83C\\uDDFE|\\uD83C\\uDDF1\\uD83C\\uDDFB|\\uD83C\\uDDF1\\uD83C\\uDDFA|\\uD83C\\uDDF1\\uD83C\\uDDF9|\\uD83C\\uDDF1\\uD83C\\uDDF8|\\uD83C\\uDDF1\\uD83C\\uDDF7|\\uD83C\\uDDF1\\uD83C\\uDDF0|\\uD83C\\uDDF1\\uD83C\\uDDEE|\\uD83C\\uDDF1\\uD83C\\uDDE8|\\uD83C\\uDDF1\\uD83C\\uDDE7|\\uD83C\\uDDF1\\uD83C\\uDDE6|\\uD83C\\uDDF0\\uD83C\\uDDFF|\\uD83C\\uDDF0\\uD83C\\uDDFE|\\uD83C\\uDDF0\\uD83C\\uDDFC|\\uD83C\\uDDF0\\uD83C\\uDDF7|\\uD83C\\uDDF0\\uD83C\\uDDF5|\\uD83C\\uDDF0\\uD83C\\uDDF3|\\uD83C\\uDDF0\\uD83C\\uDDF2|\\uD83C\\uDDF0\\uD83C\\uDDEE|\\uD83C\\uDDF0\\uD83C\\uDDED|\\uD83C\\uDDF0\\uD83C\\uDDEC|\\uD83C\\uDDF0\\uD83C\\uDDEA|\\uD83C\\uDDEF\\uD83C\\uDDF5|\\uD83C\\uDDEF\\uD83C\\uDDF4|\\uD83C\\uDDEF\\uD83C\\uDDF2|\\uD83C\\uDDEF\\uD83C\\uDDEA|\\uD83C\\uDDEE\\uD83C\\uDDF9|\\uD83C\\uDDEE\\uD83C\\uDDF8|\\uD83C\\uDDEE\\uD83C\\uDDF7|\\uD83C\\uDDEE\\uD83C\\uDDF6|\\uD83C\\uDDEE\\uD83C\\uDDF4|\\uD83C\\uDDEE\\uD83C\\uDDF3|\\uD83C\\uDDEE\\uD83C\\uDDF2|\\uD83C\\uDDEE\\uD83C\\uDDF1|\\uD83C\\uDDEE\\uD83C\\uDDEA|\\uD83C\\uDDEE\\uD83C\\uDDE9|\\uD83C\\uDDEE\\uD83C\\uDDE8|\\uD83C\\uDDED\\uD83C\\uDDFA|\\uD83C\\uDDED\\uD83C\\uDDF9|\\uD83C\\uDDED\\uD83C\\uDDF7|\\uD83C\\uDDED\\uD83C\\uDDF3|\\uD83C\\uDDED\\uD83C\\uDDF2|\\uD83C\\uDDED\\uD83C\\uDDF0|\\uD83C\\uDDEC\\uD83C\\uDDFE|\\uD83C\\uDDEC\\uD83C\\uDDFC|\\uD83C\\uDDEC\\uD83C\\uDDFA|\\uD83C\\uDDEC\\uD83C\\uDDF9|\\uD83C\\uDDEC\\uD83C\\uDDF8|\\uD83C\\uDDEC\\uD83C\\uDDF7|\\uD83C\\uDDEC\\uD83C\\uDDF6|\\uD83C\\uDDEC\\uD83C\\uDDF5|\\uD83C\\uDDEC\\uD83C\\uDDF3|\\uD83C\\uDDEC\\uD83C\\uDDF2|\\uD83C\\uDDEC\\uD83C\\uDDF1|\\uD83C\\uDDEC\\uD83C\\uDDEE|\\uD83C\\uDDEC\\uD83C\\uDDED|\\uD83C\\uDDEC\\uD83C\\uDDEC|\\uD83C\\uDDEC\\uD83C\\uDDEB|\\uD83C\\uDDEC\\uD83C\\uDDEA|\\uD83C\\uDDEC\\uD83C\\uDDE9|\\uD83C\\uDDEC\\uD83C\\uDDE7|\\uD83C\\uDDEC\\uD83C\\uDDE6|\\uD83C\\uDDEB\\uD83C\\uDDF7|\\uD83C\\uDDEB\\uD83C\\uDDF4|\\uD83C\\uDDEB\\uD83C\\uDDF2|\\uD83C\\uDDEB\\uD83C\\uDDF0|\\uD83C\\uDDEB\\uD83C\\uDDEF|\\uD83C\\uDDEB\\uD83C\\uDDEE|\\uD83C\\uDDEA\\uD83C\\uDDFA|\\uD83C\\uDDEA\\uD83C\\uDDF9|\\uD83C\\uDDEA\\uD83C\\uDDF8|\\uD83C\\uDDEA\\uD83C\\uDDF7|\\uD83C\\uDDEA\\uD83C\\uDDED|\\uD83C\\uDDEA\\uD83C\\uDDEC|\\uD83C\\uDDEA\\uD83C\\uDDEA|\\uD83C\\uDDEA\\uD83C\\uDDE8|\\uD83C\\uDDEA\\uD83C\\uDDE6|\\uD83C\\uDDE9\\uD83C\\uDDFF|\\uD83C\\uDDE9\\uD83C\\uDDF4|\\uD83C\\uDDE9\\uD83C\\uDDF2|\\uD83C\\uDDE9\\uD83C\\uDDF0|\\uD83C\\uDDE9\\uD83C\\uDDEF|\\uD83C\\uDDE9\\uD83C\\uDDEC|\\uD83C\\uDDE9\\uD83C\\uDDEA|\\uD83C\\uDDE8\\uD83C\\uDDFF|\\uD83C\\uDDE8\\uD83C\\uDDFE|\\uD83C\\uDDE8\\uD83C\\uDDFD|\\uD83C\\uDDE8\\uD83C\\uDDFC|\\uD83C\\uDDE8\\uD83C\\uDDFB|\\uD83C\\uDDE8\\uD83C\\uDDFA|\\uD83C\\uDDE8\\uD83C\\uDDF7|\\uD83C\\uDDE8\\uD83C\\uDDF5|\\uD83C\\uDDE8\\uD83C\\uDDF4|\\uD83C\\uDDE8\\uD83C\\uDDF3|\\uD83C\\uDDE8\\uD83C\\uDDF2|\\uD83C\\uDDE8\\uD83C\\uDDF1|\\uD83C\\uDDE8\\uD83C\\uDDF0|\\uD83C\\uDDE8\\uD83C\\uDDEE|\\uD83C\\uDDE8\\uD83C\\uDDED|\\uD83C\\uDDE8\\uD83C\\uDDEC|\\uD83C\\uDDE8\\uD83C\\uDDEB|\\uD83C\\uDDE8\\uD83C\\uDDE9|\\uD83C\\uDDE8\\uD83C\\uDDE8|\\uD83C\\uDDE8\\uD83C\\uDDE6|\\uD83C\\uDDE7\\uD83C\\uDDFF|\\uD83C\\uDDE7\\uD83C\\uDDFE|\\uD83C\\uDDE7\\uD83C\\uDDFC|\\uD83C\\uDDE7\\uD83C\\uDDFB|\\uD83C\\uDDE7\\uD83C\\uDDF9|\\uD83C\\uDDE7\\uD83C\\uDDF8|\\uD83C\\uDDE7\\uD83C\\uDDF7|\\uD83C\\uDDE7\\uD83C\\uDDF6|\\uD83C\\uDDE7\\uD83C\\uDDF4|\\uD83C\\uDDE7\\uD83C\\uDDF3|\\uD83C\\uDDE7\\uD83C\\uDDF2|\\uD83C\\uDDE7\\uD83C\\uDDF1|\\uD83C\\uDDE7\\uD83C\\uDDEF|\\uD83C\\uDDE7\\uD83C\\uDDEE|\\uD83C\\uDDE7\\uD83C\\uDDED|\\uD83C\\uDDE7\\uD83C\\uDDEC|\\uD83C\\uDDE7\\uD83C\\uDDEB|\\uD83C\\uDDE7\\uD83C\\uDDEA|\\uD83C\\uDDE7\\uD83C\\uDDE9|\\uD83C\\uDDE7\\uD83C\\uDDE7|\\uD83C\\uDDE7\\uD83C\\uDDE6|\\uD83C\\uDDE6\\uD83C\\uDDFF|\\uD83C\\uDDE6\\uD83C\\uDDFD|\\uD83C\\uDDE6\\uD83C\\uDDFC|\\uD83C\\uDDE6\\uD83C\\uDDFA|\\uD83C\\uDDE6\\uD83C\\uDDF9|\\uD83C\\uDDF9\\uD83C\\uDDE9|\\uD83D\\uDDE1\\uFE0F|\\u26F9\\uD83C\\uDFFF|\\u26F9\\uD83C\\uDFFE|\\u26F9\\uD83C\\uDFFD|\\u26F9\\uD83C\\uDFFC|\\u26F9\\uD83C\\uDFFB|\\u270D\\uD83C\\uDFFF|\\u270D\\uD83C\\uDFFE|\\u270D\\uD83C\\uDFFD|\\u270D\\uD83C\\uDFFC|\\u270D\\uD83C\\uDFFB|\\uD83C\\uDC04\\uFE0F|\\uD83C\\uDD7F\\uFE0F|\\uD83C\\uDE02\\uFE0F|\\uD83C\\uDE1A\\uFE0F|\\uD83C\\uDE2F\\uFE0F|\\uD83C\\uDE37\\uFE0F|\\uD83C\\uDF9E\\uFE0F|\\uD83C\\uDF9F\\uFE0F|\\uD83C\\uDFCB\\uFE0F|\\uD83C\\uDFCC\\uFE0F|\\uD83C\\uDFCD\\uFE0F|\\uD83C\\uDFCE\\uFE0F|\\uD83C\\uDF96\\uFE0F|\\uD83C\\uDF97\\uFE0F|\\uD83C\\uDF36\\uFE0F|\\uD83C\\uDF27\\uFE0F|\\uD83C\\uDF28\\uFE0F|\\uD83C\\uDF29\\uFE0F|\\uD83C\\uDF2A\\uFE0F|\\uD83C\\uDF2B\\uFE0F|\\uD83C\\uDF2C\\uFE0F|\\uD83D\\uDC3F\\uFE0F|\\uD83D\\uDD77\\uFE0F|\\uD83D\\uDD78\\uFE0F|\\uD83C\\uDF21\\uFE0F|\\uD83C\\uDF99\\uFE0F|\\uD83C\\uDF9A\\uFE0F|\\uD83C\\uDF9B\\uFE0F|\\uD83C\\uDFF3\\uFE0F|\\uD83C\\uDFF5\\uFE0F|\\uD83C\\uDFF7\\uFE0F|\\uD83D\\uDCFD\\uFE0F|\\uD83D\\uDD49\\uFE0F|\\uD83D\\uDD4A\\uFE0F|\\uD83D\\uDD6F\\uFE0F|\\uD83D\\uDD70\\uFE0F|\\uD83D\\uDD73\\uFE0F|\\uD83D\\uDD76\\uFE0F|\\uD83D\\uDD79\\uFE0F|\\uD83D\\uDD87\\uFE0F|\\uD83D\\uDD8A\\uFE0F|\\uD83D\\uDD8B\\uFE0F|\\uD83D\\uDD8C\\uFE0F|\\uD83D\\uDD8D\\uFE0F|\\uD83D\\uDDA5\\uFE0F|\\uD83D\\uDDA8\\uFE0F|\\uD83D\\uDDB2\\uFE0F|\\uD83D\\uDDBC\\uFE0F|\\uD83D\\uDDC2\\uFE0F|\\uD83D\\uDDC3\\uFE0F|\\uD83D\\uDDC4\\uFE0F|\\uD83D\\uDDD1\\uFE0F|\\uD83D\\uDDD2\\uFE0F|\\uD83D\\uDDD3\\uFE0F|\\uD83D\\uDDDC\\uFE0F|\\uD83D\\uDDDD\\uFE0F|\\uD83D\\uDDDE\\uFE0F|\\u270B\\uD83C\\uDFFF|\\uD83D\\uDDE3\\uFE0F|\\uD83D\\uDDEF\\uFE0F|\\uD83D\\uDDF3\\uFE0F|\\uD83D\\uDDFA\\uFE0F|\\uD83D\\uDEE0\\uFE0F|\\uD83D\\uDEE1\\uFE0F|\\uD83D\\uDEE2\\uFE0F|\\uD83D\\uDEF0\\uFE0F|\\uD83C\\uDF7D\\uFE0F|\\uD83D\\uDC41\\uFE0F|\\uD83D\\uDD74\\uFE0F|\\uD83D\\uDD75\\uFE0F|\\uD83D\\uDD90\\uFE0F|\\uD83C\\uDFD4\\uFE0F|\\uD83C\\uDFD5\\uFE0F|\\uD83C\\uDFD6\\uFE0F|\\uD83C\\uDFD7\\uFE0F|\\uD83C\\uDFD8\\uFE0F|\\uD83C\\uDFD9\\uFE0F|\\uD83C\\uDFDA\\uFE0F|\\uD83C\\uDFDB\\uFE0F|\\uD83C\\uDFDC\\uFE0F|\\uD83C\\uDFDD\\uFE0F|\\uD83C\\uDFDE\\uFE0F|\\uD83C\\uDFDF\\uFE0F|\\uD83D\\uDECB\\uFE0F|\\uD83D\\uDECD\\uFE0F|\\uD83D\\uDECE\\uFE0F|\\uD83D\\uDECF\\uFE0F|\\uD83D\\uDEE3\\uFE0F|\\uD83D\\uDEE4\\uFE0F|\\uD83D\\uDEE5\\uFE0F|\\uD83D\\uDEE9\\uFE0F|\\uD83D\\uDEF3\\uFE0F|\\uD83C\\uDF24\\uFE0F|\\uD83C\\uDF25\\uFE0F|\\uD83C\\uDF26\\uFE0F|\\uD83D\\uDDB1\\uFE0F|\\u261D\\uD83C\\uDFFB|\\u261D\\uD83C\\uDFFC|\\u261D\\uD83C\\uDFFD|\\u261D\\uD83C\\uDFFE|\\u261D\\uD83C\\uDFFF|\\u270C\\uD83C\\uDFFB|\\u270C\\uD83C\\uDFFC|\\u270C\\uD83C\\uDFFD|\\u270C\\uD83C\\uDFFE|\\u270C\\uD83C\\uDFFF|\\u270A\\uD83C\\uDFFB|\\u270A\\uD83C\\uDFFC|\\u270A\\uD83C\\uDFFD|\\u270A\\uD83C\\uDFFE|\\u270A\\uD83C\\uDFFF|\\u270B\\uD83C\\uDFFB|\\u270B\\uD83C\\uDFFC|\\u270B\\uD83C\\uDFFD|\\u270B\\uD83C\\uDFFE|4\\uFE0F\\u20E3|9\\uFE0F\\u20E3|0\\uFE0F\\u20E3|1\\uFE0F\\u20E3|2\\uFE0F\\u20E3|3\\uFE0F\\u20E3|#\\uFE0F\\u20E3|5\\uFE0F\\u20E3|6\\uFE0F\\u20E3|7\\uFE0F\\u20E3|8\\uFE0F\\u20E3|\\*\\uFE0F\\u20E3|\\u00A9\\uFE0F|\\u00AE\\uFE0F|\\u203C\\uFE0F|\\u2049\\uFE0F|\\u2122\\uFE0F|\\u2139\\uFE0F|\\u2194\\uFE0F|\\u2195\\uFE0F|\\u2196\\uFE0F|\\u2197\\uFE0F|\\u2198\\uFE0F|\\u2199\\uFE0F|\\u21A9\\uFE0F|\\u21AA\\uFE0F|\\u231A\\uFE0F|\\u231B\\uFE0F|\\u24C2\\uFE0F|\\u25AA\\uFE0F|\\u25AB\\uFE0F|\\u25B6\\uFE0F|\\u25C0\\uFE0F|\\u25FB\\uFE0F|\\u25FC\\uFE0F|\\u25FD\\uFE0F|\\u25FE\\uFE0F|\\u2600\\uFE0F|\\u2601\\uFE0F|\\u260E\\uFE0F|\\u2611\\uFE0F|\\u2614\\uFE0F|\\u2615\\uFE0F|\\u261D\\uFE0F|\\u263A\\uFE0F|\\u2648\\uFE0F|\\u2649\\uFE0F|\\u264A\\uFE0F|\\u264B\\uFE0F|\\u264C\\uFE0F|\\u264D\\uFE0F|\\u264E\\uFE0F|\\u264F\\uFE0F|\\u2650\\uFE0F|\\u2651\\uFE0F|\\u2652\\uFE0F|\\u2653\\uFE0F|\\u2660\\uFE0F|\\u2663\\uFE0F|\\u2665\\uFE0F|\\u2666\\uFE0F|\\u2668\\uFE0F|\\u267B\\uFE0F|\\u267F\\uFE0F|\\u2693\\uFE0F|\\u26A0\\uFE0F|\\u26A1\\uFE0F|\\u26AA\\uFE0F|\\u26AB\\uFE0F|\\u26BD\\uFE0F|\\u26BE\\uFE0F|\\u26C4\\uFE0F|\\u26C5\\uFE0F|\\u26D4\\uFE0F|\\u26EA\\uFE0F|\\u26F2\\uFE0F|\\u26F3\\uFE0F|\\u26F5\\uFE0F|\\u26FA\\uFE0F|\\u26FD\\uFE0F|\\u2702\\uFE0F|\\u2708\\uFE0F|\\u2709\\uFE0F|\\u270C\\uFE0F|\\u270F\\uFE0F|\\u2712\\uFE0F|\\u2714\\uFE0F|\\u2716\\uFE0F|\\u2733\\uFE0F|\\u2734\\uFE0F|\\u2744\\uFE0F|\\u2747\\uFE0F|\\u2757\\uFE0F|\\u2764\\uFE0F|\\u27A1\\uFE0F|\\u2934\\uFE0F|\\u2935\\uFE0F|\\u2B05\\uFE0F|\\u2B06\\uFE0F|\\u2B07\\uFE0F|\\u2B1B\\uFE0F|\\u2B1C\\uFE0F|\\u2B50\\uFE0F|\\u2B55\\uFE0F|\\u3030\\uFE0F|\\u303D\\uFE0F|\\u3297\\uFE0F|\\u3299\\uFE0F|\\u271D\\uFE0F|\\u2328\\uFE0F|\\u270D\\uFE0F|\\u23ED\\uFE0F|\\u23EE\\uFE0F|\\u23EF\\uFE0F|\\u23F1\\uFE0F|\\u23F2\\uFE0F|\\u23F8\\uFE0F|\\u23F9\\uFE0F|\\u23FA\\uFE0F|\\u2602\\uFE0F|\\u2603\\uFE0F|\\u2604\\uFE0F|\\u2618\\uFE0F|\\u2620\\uFE0F|\\u2622\\uFE0F|\\u2623\\uFE0F|\\u2626\\uFE0F|\\u262A\\uFE0F|\\u262E\\uFE0F|\\u262F\\uFE0F|\\u2638\\uFE0F|\\u2639\\uFE0F|\\u2692\\uFE0F|\\u2694\\uFE0F|\\u2696\\uFE0F|\\u2697\\uFE0F|\\u2699\\uFE0F|\\u269B\\uFE0F|\\u269C\\uFE0F|\\u26B0\\uFE0F|\\u26B1\\uFE0F|\\u26C8\\uFE0F|\\u26CF\\uFE0F|\\u26D1\\uFE0F|\\u26D3\\uFE0F|\\u26E9\\uFE0F|\\u26F0\\uFE0F|\\u26F1\\uFE0F|\\u26F4\\uFE0F|\\u26F7\\uFE0F|\\u26F8\\uFE0F|\\u26F9\\uFE0F|\\u2721\\uFE0F|\\u2763\\uFE0F|\\uD83C\\uDCCF|\\uD83C\\uDD70|\\uD83C\\uDD71|\\uD83C\\uDD7E|\\uD83C\\uDD8E|\\uD83C\\uDD91|\\uD83C\\uDD92|\\uD83C\\uDD93|\\uD83C\\uDD94|\\uD83C\\uDD95|\\uD83C\\uDD96|\\uD83C\\uDD97|\\uD83C\\uDD98|\\uD83C\\uDD99|\\uD83C\\uDD9A|\\uD83C\\uDE01|\\uD83C\\uDE32|\\uD83C\\uDE33|\\uD83C\\uDE34|\\uD83C\\uDE35|\\uD83C\\uDE36|\\uD83C\\uDE38|\\uD83C\\uDE39|\\uD83C\\uDE3A|\\uD83C\\uDE50|\\uD83C\\uDE51|\\uD83C\\uDF00|\\uD83C\\uDF01|\\uD83C\\uDF02|\\uD83C\\uDF03|\\uD83C\\uDF04|\\uD83C\\uDF05|\\uD83C\\uDF06|\\uD83C\\uDF07|\\uD83C\\uDF08|\\uD83C\\uDF09|\\uD83C\\uDF0A|\\uD83C\\uDF0B|\\uD83C\\uDF0C|\\uD83C\\uDF0F|\\uD83C\\uDF11|\\uD83C\\uDF13|\\uD83C\\uDF14|\\uD83C\\uDF15|\\uD83C\\uDF19|\\uD83C\\uDF1B|\\uD83C\\uDF1F|\\uD83C\\uDF20|\\uD83C\\uDF30|\\uD83C\\uDF31|\\uD83C\\uDF34|\\uD83C\\uDF35|\\uD83C\\uDF37|\\uD83C\\uDF38|\\uD83C\\uDF39|\\uD83C\\uDF3A|\\uD83C\\uDF3B|\\uD83C\\uDF3C|\\uD83C\\uDF3D|\\uD83C\\uDF3E|\\uD83C\\uDF3F|\\uD83C\\uDF40|\\uD83C\\uDF41|\\uD83C\\uDF42|\\uD83C\\uDF43|\\uD83C\\uDF44|\\uD83C\\uDF45|\\uD83C\\uDF46|\\uD83C\\uDF47|\\uD83C\\uDF48|\\uD83C\\uDF49|\\uD83C\\uDF4A|\\uD83C\\uDF4C|\\uD83C\\uDF4D|\\uD83C\\uDF4E|\\uD83C\\uDF4F|\\uD83C\\uDF51|\\uD83C\\uDF52|\\uD83C\\uDF53|\\uD83C\\uDF54|\\uD83C\\uDF55|\\uD83C\\uDF56|\\uD83C\\uDF57|\\uD83C\\uDF58|\\uD83C\\uDF59|\\uD83C\\uDF5A|\\uD83C\\uDF5B|\\uD83C\\uDF5C|\\uD83C\\uDF5D|\\uD83C\\uDF5E|\\uD83C\\uDF5F|\\uD83C\\uDF60|\\uD83C\\uDF61|\\uD83C\\uDF62|\\uD83C\\uDF63|\\uD83C\\uDF64|\\uD83C\\uDF65|\\uD83C\\uDF66|\\uD83C\\uDF67|\\uD83C\\uDF68|\\uD83C\\uDF69|\\uD83C\\uDF6A|\\uD83C\\uDF6B|\\uD83C\\uDF6C|\\uD83C\\uDF6D|\\uD83C\\uDF6E|\\uD83C\\uDF6F|\\uD83C\\uDF70|\\uD83C\\uDF71|\\uD83C\\uDF72|\\uD83C\\uDF73|\\uD83C\\uDF74|\\uD83C\\uDF75|\\uD83C\\uDF76|\\uD83C\\uDF77|\\uD83C\\uDF78|\\uD83C\\uDF79|\\uD83C\\uDF7A|\\uD83C\\uDF7B|\\uD83C\\uDF80|\\uD83C\\uDF81|\\uD83C\\uDF82|\\uD83C\\uDF83|\\uD83C\\uDF84|\\uD83C\\uDF85|\\uD83C\\uDF86|\\uD83C\\uDF87|\\uD83C\\uDF88|\\uD83C\\uDF89|\\uD83C\\uDF8A|\\uD83C\\uDF8B|\\uD83C\\uDF8C|\\uD83C\\uDF8D|\\uD83C\\uDF8E|\\uD83C\\uDF8F|\\uD83C\\uDF90|\\uD83C\\uDF91|\\uD83C\\uDF92|\\uD83C\\uDF93|\\uD83C\\uDFA0|\\uD83C\\uDFA1|\\uD83C\\uDFA2|\\uD83C\\uDFA3|\\uD83C\\uDFA4|\\uD83C\\uDFA5|\\uD83C\\uDFA6|\\uD83C\\uDFA7|\\uD83C\\uDFA8|\\uD83C\\uDFA9|\\uD83C\\uDFAA|\\uD83C\\uDFAB|\\uD83C\\uDFAC|\\uD83C\\uDFAD|\\uD83C\\uDFAE|\\uD83C\\uDFAF|\\uD83C\\uDFB0|\\uD83C\\uDFB1|\\uD83C\\uDFB2|\\uD83C\\uDFB3|\\uD83C\\uDFB4|\\uD83C\\uDFB5|\\uD83C\\uDFB6|\\uD83C\\uDFB7|\\uD83C\\uDFB8|\\uD83C\\uDFB9|\\uD83C\\uDFBA|\\uD83C\\uDFBB|\\uD83C\\uDFBC|\\uD83C\\uDFBD|\\uD83C\\uDFBE|\\uD83C\\uDFBF|\\uD83C\\uDFC0|\\uD83C\\uDFC1|\\uD83C\\uDFC2|\\uD83C\\uDFC3|\\uD83C\\uDFC4|\\uD83C\\uDFC6|\\uD83C\\uDFC8|\\uD83C\\uDFCA|\\uD83C\\uDFE0|\\uD83D\\uDDB1|\\uD83C\\uDFE2|\\uD83C\\uDFE3|\\uD83C\\uDFE5|\\uD83C\\uDFE6|\\uD83C\\uDFE7|\\uD83C\\uDFE8|\\uD83C\\uDFE9|\\uD83C\\uDFEA|\\uD83C\\uDFEB|\\uD83C\\uDFEC|\\uD83C\\uDFED|\\uD83C\\uDFEE|\\uD83C\\uDFEF|\\uD83C\\uDFF0|\\uD83D\\uDC0C|\\uD83D\\uDC0D|\\uD83D\\uDC0E|\\uD83D\\uDC11|\\uD83D\\uDC12|\\uD83D\\uDC14|\\uD83D\\uDC17|\\uD83D\\uDC18|\\uD83D\\uDC19|\\uD83D\\uDC1A|\\uD83D\\uDC1B|\\uD83D\\uDC1C|\\uD83D\\uDC1D|\\uD83D\\uDC1E|\\uD83D\\uDC1F|\\uD83D\\uDC20|\\uD83D\\uDC21|\\uD83D\\uDC22|\\uD83D\\uDC23|\\uD83D\\uDC24|\\uD83D\\uDC25|\\uD83D\\uDC26|\\uD83D\\uDC27|\\uD83D\\uDC28|\\uD83D\\uDC29|\\uD83D\\uDC2B|\\uD83D\\uDC2C|\\uD83D\\uDC2D|\\uD83D\\uDC2E|\\uD83D\\uDC2F|\\uD83D\\uDC30|\\uD83D\\uDC31|\\uD83D\\uDC32|\\uD83D\\uDC33|\\uD83D\\uDC34|\\uD83D\\uDC35|\\uD83D\\uDC36|\\uD83D\\uDC37|\\uD83D\\uDC38|\\uD83D\\uDC39|\\uD83D\\uDC3A|\\uD83D\\uDC3B|\\uD83D\\uDC3C|\\uD83D\\uDC3D|\\uD83D\\uDC3E|\\uD83D\\uDC40|\\uD83D\\uDC42|\\uD83D\\uDC43|\\uD83D\\uDC44|\\uD83D\\uDC45|\\uD83D\\uDC46|\\uD83D\\uDC47|\\uD83D\\uDC48|\\uD83D\\uDC49|\\uD83D\\uDC4A|\\uD83D\\uDC4B|\\uD83D\\uDC4C|\\uD83D\\uDC4D|\\uD83D\\uDC4E|\\uD83D\\uDC4F|\\uD83D\\uDC50|\\uD83D\\uDC51|\\uD83D\\uDC52|\\uD83D\\uDC53|\\uD83D\\uDC54|\\uD83D\\uDC55|\\uD83D\\uDC56|\\uD83D\\uDC57|\\uD83D\\uDC58|\\uD83D\\uDC59|\\uD83D\\uDC5A|\\uD83D\\uDC5B|\\uD83D\\uDC5C|\\uD83D\\uDC5D|\\uD83D\\uDC5E|\\uD83D\\uDC5F|\\uD83D\\uDC60|\\uD83D\\uDC61|\\uD83D\\uDC62|\\uD83D\\uDC63|\\uD83D\\uDC64|\\uD83D\\uDC66|\\uD83D\\uDC67|\\uD83D\\uDC68|\\uD83D\\uDC69|\\uD83D\\uDC6A|\\uD83D\\uDC6B|\\uD83D\\uDC6E|\\uD83D\\uDC6F|\\uD83D\\uDC70|\\uD83D\\uDC71|\\uD83D\\uDC72|\\uD83D\\uDC73|\\uD83D\\uDC74|\\uD83D\\uDC75|\\uD83D\\uDC76|\\uD83D\\uDC77|\\uD83D\\uDC78|\\uD83D\\uDC79|\\uD83D\\uDC7A|\\uD83D\\uDC7B|\\uD83D\\uDC7C|\\uD83D\\uDC7D|\\uD83D\\uDC7E|\\uD83D\\uDC7F|\\uD83D\\uDC80|\\uD83D\\uDCC7|\\uD83D\\uDC81|\\uD83D\\uDC82|\\uD83D\\uDC83|\\uD83D\\uDC84|\\uD83D\\uDC85|\\uD83D\\uDCD2|\\uD83D\\uDC86|\\uD83D\\uDCD3|\\uD83D\\uDC87|\\uD83D\\uDCD4|\\uD83D\\uDC88|\\uD83D\\uDCD5|\\uD83D\\uDC89|\\uD83D\\uDCD6|\\uD83D\\uDC8A|\\uD83D\\uDCD7|\\uD83D\\uDC8B|\\uD83D\\uDCD8|\\uD83D\\uDC8C|\\uD83D\\uDCD9|\\uD83D\\uDC8D|\\uD83D\\uDCDA|\\uD83D\\uDC8E|\\uD83D\\uDCDB|\\uD83D\\uDC8F|\\uD83D\\uDCDC|\\uD83D\\uDC90|\\uD83D\\uDCDD|\\uD83D\\uDC91|\\uD83D\\uDCDE|\\uD83D\\uDC92|\\uD83D\\uDCDF|\\uD83D\\uDCE0|\\uD83D\\uDC93|\\uD83D\\uDCE1|\\uD83D\\uDCE2|\\uD83D\\uDC94|\\uD83D\\uDCE3|\\uD83D\\uDCE4|\\uD83D\\uDC95|\\uD83D\\uDCE5|\\uD83D\\uDCE6|\\uD83D\\uDC96|\\uD83D\\uDCE7|\\uD83D\\uDCE8|\\uD83D\\uDC97|\\uD83D\\uDCE9|\\uD83D\\uDCEA|\\uD83D\\uDC98|\\uD83D\\uDCEB|\\uD83D\\uDCEE|\\uD83D\\uDC99|\\uD83D\\uDCF0|\\uD83D\\uDCF1|\\uD83D\\uDC9A|\\uD83D\\uDCF2|\\uD83D\\uDCF3|\\uD83D\\uDC9B|\\uD83D\\uDCF4|\\uD83D\\uDCF6|\\uD83D\\uDC9C|\\uD83D\\uDCF7|\\uD83D\\uDCF9|\\uD83D\\uDC9D|\\uD83D\\uDCFA|\\uD83D\\uDCFB|\\uD83D\\uDC9E|\\uD83D\\uDCFC|\\uD83D\\uDD03|\\uD83D\\uDC9F|\\uD83D\\uDD0A|\\uD83D\\uDD0B|\\uD83D\\uDCA0|\\uD83D\\uDD0C|\\uD83D\\uDD0D|\\uD83D\\uDCA1|\\uD83D\\uDD0E|\\uD83D\\uDD0F|\\uD83D\\uDCA2|\\uD83D\\uDD10|\\uD83D\\uDD11|\\uD83D\\uDCA3|\\uD83D\\uDD12|\\uD83D\\uDD13|\\uD83D\\uDCA4|\\uD83D\\uDD14|\\uD83D\\uDD16|\\uD83D\\uDCA5|\\uD83D\\uDD17|\\uD83D\\uDD18|\\uD83D\\uDCA6|\\uD83D\\uDD19|\\uD83D\\uDD1A|\\uD83D\\uDCA7|\\uD83D\\uDD1B|\\uD83D\\uDD1C|\\uD83D\\uDCA8|\\uD83D\\uDD1D|\\uD83D\\uDD1E|\\uD83D\\uDCA9|\\uD83D\\uDD1F|\\uD83D\\uDCAA|\\uD83D\\uDD20|\\uD83D\\uDD21|\\uD83D\\uDCAB|\\uD83D\\uDD22|\\uD83D\\uDD23|\\uD83D\\uDCAC|\\uD83D\\uDD24|\\uD83D\\uDD25|\\uD83D\\uDCAE|\\uD83D\\uDD26|\\uD83D\\uDD27|\\uD83D\\uDCAF|\\uD83D\\uDD28|\\uD83D\\uDD29|\\uD83D\\uDCB0|\\uD83D\\uDD2A|\\uD83D\\uDD2B|\\uD83D\\uDCB1|\\uD83D\\uDD2E|\\uD83D\\uDCB2|\\uD83D\\uDD2F|\\uD83D\\uDCB3|\\uD83D\\uDD30|\\uD83D\\uDD31|\\uD83D\\uDCB4|\\uD83D\\uDD32|\\uD83D\\uDD33|\\uD83D\\uDCB5|\\uD83D\\uDD34|\\uD83D\\uDD35|\\uD83D\\uDCB8|\\uD83D\\uDD36|\\uD83D\\uDD37|\\uD83D\\uDCB9|\\uD83D\\uDD38|\\uD83D\\uDD39|\\uD83D\\uDCBA|\\uD83D\\uDD3A|\\uD83D\\uDD3B|\\uD83D\\uDCBB|\\uD83D\\uDD3C|\\uD83D\\uDCBC|\\uD83D\\uDD3D|\\uD83D\\uDD50|\\uD83D\\uDCBD|\\uD83D\\uDD51|\\uD83D\\uDCBE|\\uD83D\\uDD52|\\uD83D\\uDCBF|\\uD83D\\uDD53|\\uD83D\\uDCC0|\\uD83D\\uDD54|\\uD83D\\uDD55|\\uD83D\\uDCC1|\\uD83D\\uDD56|\\uD83D\\uDD57|\\uD83D\\uDCC2|\\uD83D\\uDD58|\\uD83D\\uDD59|\\uD83D\\uDCC3|\\uD83D\\uDD5A|\\uD83D\\uDD5B|\\uD83D\\uDCC4|\\uD83D\\uDDFB|\\uD83D\\uDDFC|\\uD83D\\uDCC5|\\uD83D\\uDDFD|\\uD83D\\uDDFE|\\uD83D\\uDCC6|\\uD83D\\uDDFF|\\uD83D\\uDE01|\\uD83D\\uDE02|\\uD83D\\uDE03|\\uD83D\\uDCC8|\\uD83D\\uDE04|\\uD83D\\uDE05|\\uD83D\\uDCC9|\\uD83D\\uDE06|\\uD83D\\uDE09|\\uD83D\\uDCCA|\\uD83D\\uDE0A|\\uD83D\\uDE0B|\\uD83D\\uDCCB|\\uD83D\\uDE0C|\\uD83D\\uDE0D|\\uD83D\\uDCCC|\\uD83D\\uDE0F|\\uD83D\\uDE12|\\uD83D\\uDCCD|\\uD83D\\uDE13|\\uD83D\\uDE14|\\uD83D\\uDCCE|\\uD83D\\uDE16|\\uD83D\\uDE18|\\uD83D\\uDCCF|\\uD83D\\uDE1A|\\uD83D\\uDE1C|\\uD83D\\uDCD0|\\uD83D\\uDE1D|\\uD83D\\uDE1E|\\uD83D\\uDCD1|\\uD83D\\uDE20|\\uD83D\\uDE21|\\uD83D\\uDE22|\\uD83D\\uDE23|\\uD83D\\uDE24|\\uD83D\\uDE25|\\uD83D\\uDE28|\\uD83D\\uDE29|\\uD83D\\uDE2A|\\uD83D\\uDE2B|\\uD83D\\uDE2D|\\uD83D\\uDE30|\\uD83D\\uDE31|\\uD83D\\uDE32|\\uD83D\\uDE33|\\uD83D\\uDE35|\\uD83D\\uDE37|\\uD83D\\uDE38|\\uD83D\\uDE39|\\uD83D\\uDE3A|\\uD83D\\uDE3B|\\uD83D\\uDE3C|\\uD83D\\uDE3D|\\uD83D\\uDE3E|\\uD83D\\uDE3F|\\uD83D\\uDE40|\\uD83D\\uDE45|\\uD83D\\uDE46|\\uD83D\\uDE47|\\uD83D\\uDE48|\\uD83D\\uDE49|\\uD83D\\uDE4A|\\uD83D\\uDE4B|\\uD83D\\uDE4C|\\uD83D\\uDE4D|\\uD83D\\uDE4E|\\uD83D\\uDE4F|\\uD83D\\uDE80|\\uD83D\\uDE83|\\uD83D\\uDE84|\\uD83D\\uDE85|\\uD83D\\uDE87|\\uD83D\\uDE89|\\uD83D\\uDE8C|\\uD83D\\uDE8F|\\uD83D\\uDE91|\\uD83D\\uDE92|\\uD83D\\uDE93|\\uD83D\\uDE95|\\uD83D\\uDE97|\\uD83D\\uDE99|\\uD83D\\uDE9A|\\uD83D\\uDEA2|\\uD83D\\uDEA4|\\uD83D\\uDEA5|\\uD83D\\uDEA7|\\uD83D\\uDEA8|\\uD83D\\uDEA9|\\uD83D\\uDEAA|\\uD83D\\uDEAB|\\uD83D\\uDEAC|\\uD83D\\uDEAD|\\uD83D\\uDEB2|\\uD83D\\uDEB6|\\uD83D\\uDEB9|\\uD83D\\uDEBA|\\uD83D\\uDEBB|\\uD83D\\uDEBC|\\uD83D\\uDEBD|\\uD83D\\uDEBE|\\uD83D\\uDEC0|\\uD83E\\uDD18|\\uD83D\\uDE00|\\uD83D\\uDE07|\\uD83D\\uDE08|\\uD83D\\uDE0E|\\uD83D\\uDE10|\\uD83D\\uDE11|\\uD83D\\uDE15|\\uD83D\\uDE17|\\uD83D\\uDE19|\\uD83D\\uDE1B|\\uD83D\\uDE1F|\\uD83D\\uDE26|\\uD83D\\uDE27|\\uD83D\\uDE2C|\\uD83D\\uDE2E|\\uD83D\\uDE2F|\\uD83D\\uDE34|\\uD83D\\uDE36|\\uD83D\\uDE81|\\uD83D\\uDE82|\\uD83D\\uDE86|\\uD83D\\uDE88|\\uD83D\\uDE8A|\\uD83D\\uDE8D|\\uD83D\\uDE8E|\\uD83D\\uDE90|\\uD83D\\uDE94|\\uD83D\\uDE96|\\uD83D\\uDE98|\\uD83D\\uDE9B|\\uD83D\\uDE9C|\\uD83D\\uDE9D|\\uD83D\\uDE9E|\\uD83D\\uDE9F|\\uD83D\\uDEA0|\\uD83D\\uDEA1|\\uD83D\\uDEA3|\\uD83D\\uDEA6|\\uD83D\\uDEAE|\\uD83D\\uDEAF|\\uD83D\\uDEB0|\\uD83D\\uDEB1|\\uD83D\\uDEB3|\\uD83D\\uDEB4|\\uD83D\\uDEB5|\\uD83D\\uDEB7|\\uD83D\\uDEB8|\\uD83D\\uDEBF|\\uD83D\\uDEC1|\\uD83D\\uDEC2|\\uD83D\\uDEC3|\\uD83D\\uDEC4|\\uD83D\\uDEC5|\\uD83C\\uDF0D|\\uD83C\\uDF0E|\\uD83C\\uDF10|\\uD83C\\uDF12|\\uD83C\\uDF16|\\uD83C\\uDF17|\\uD83C\\uDF18|\\uD83C\\uDF1A|\\uD83C\\uDF1C|\\uD83C\\uDF1D|\\uD83C\\uDF1E|\\uD83C\\uDF32|\\uD83C\\uDF33|\\uD83C\\uDF4B|\\uD83C\\uDF50|\\uD83C\\uDF7C|\\uD83C\\uDFC7|\\uD83C\\uDFC9|\\uD83C\\uDFE4|\\uD83D\\uDC00|\\uD83D\\uDC01|\\uD83D\\uDC02|\\uD83D\\uDC03|\\uD83D\\uDC04|\\uD83D\\uDC05|\\uD83D\\uDC06|\\uD83D\\uDC07|\\uD83D\\uDC08|\\uD83D\\uDC09|\\uD83D\\uDC0A|\\uD83D\\uDC0B|\\uD83D\\uDC0F|\\uD83D\\uDC10|\\uD83D\\uDC13|\\uD83D\\uDC15|\\uD83D\\uDC16|\\uD83D\\uDC2A|\\uD83D\\uDC65|\\uD83D\\uDC6C|\\uD83D\\uDC6D|\\uD83D\\uDCAD|\\uD83D\\uDCB6|\\uD83D\\uDCB7|\\uD83D\\uDCEC|\\uD83D\\uDCED|\\uD83D\\uDCEF|\\uD83D\\uDCF5|\\uD83D\\uDD00|\\uD83D\\uDD01|\\uD83D\\uDD02|\\uD83D\\uDD04|\\uD83D\\uDD05|\\uD83D\\uDD06|\\uD83D\\uDD07|\\uD83D\\uDD09|\\uD83D\\uDD15|\\uD83D\\uDD2C|\\uD83D\\uDD2D|\\uD83D\\uDD5C|\\uD83D\\uDD5D|\\uD83D\\uDD5E|\\uD83D\\uDD5F|\\uD83D\\uDD60|\\uD83D\\uDD61|\\uD83D\\uDD62|\\uD83D\\uDD63|\\uD83D\\uDD64|\\uD83D\\uDD65|\\uD83D\\uDD66|\\uD83D\\uDD67|\\uD83D\\uDD08|\\uD83D\\uDE8B|\\uD83C\\uDFC5|\\uD83C\\uDFF4|\\uD83D\\uDCF8|\\uD83D\\uDECC|\\uD83D\\uDD95|\\uD83D\\uDD96|\\uD83D\\uDE41|\\uD83D\\uDE42|\\uD83D\\uDEEB|\\uD83D\\uDEEC|\\uD83C\\uDFFB|\\uD83C\\uDFFC|\\uD83C\\uDFFD|\\uD83C\\uDFFE|\\uD83C\\uDFFF|\\uD83D\\uDE43|\\uD83E\\uDD11|\\uD83E\\uDD13|\\uD83E\\uDD17|\\uD83D\\uDE44|\\uD83E\\uDD14|\\uD83E\\uDD10|\\uD83E\\uDD12|\\uD83E\\uDD15|\\uD83E\\uDD16|\\uD83E\\uDD81|\\uD83E\\uDD84|\\uD83E\\uDD82|\\uD83E\\uDD80|\\uD83E\\uDD83|\\uD83E\\uDDC0|\\uD83C\\uDF2D|\\uD83C\\uDF2E|\\uD83C\\uDF2F|\\uD83C\\uDF7F|\\uD83C\\uDF7E|\\uD83C\\uDFF9|\\uD83C\\uDFFA|\\uD83D\\uDED0|\\uD83D\\uDD4B|\\uD83D\\uDD4C|\\uD83D\\uDD4D|\\uD83D\\uDD4E|\\uD83D\\uDCFF|\\uD83C\\uDFCF|\\uD83C\\uDFD0|\\uD83C\\uDFD1|\\uD83C\\uDFD2|\\uD83C\\uDFD3|\\uD83C\\uDFF8|\\uD83C\\uDF26|\\uD83C\\uDF25|\\uD83C\\uDF24|\\uD83D\\uDEF3|\\uD83D\\uDEE9|\\uD83D\\uDEE5|\\uD83D\\uDEE4|\\uD83D\\uDEE3|\\uD83D\\uDECF|\\uD83D\\uDECE|\\uD83D\\uDECD|\\uD83D\\uDECB|\\uD83C\\uDFDF|\\uD83C\\uDFDE|\\uD83C\\uDFDD|\\uD83C\\uDFDC|\\uD83C\\uDFDB|\\uD83C\\uDFDA|\\uD83C\\uDFD9|\\uD83C\\uDFD8|\\uD83C\\uDFD7|\\uD83C\\uDFD6|\\uD83C\\uDFD5|\\uD83C\\uDFD4|\\uD83D\\uDD90|\\uD83D\\uDD75|\\uD83D\\uDD74|\\uD83D\\uDC41|\\uD83C\\uDF7D|\\uD83D\\uDEF0|\\uD83D\\uDEE2|\\uD83D\\uDEE1|\\uD83D\\uDEE0|\\uD83D\\uDDFA|\\uD83D\\uDDF3|\\uD83D\\uDDEF|\\uD83D\\uDDE3|\\uD83D\\uDDE1|\\uD83D\\uDDDE|\\uD83D\\uDDDD|\\uD83D\\uDDDC|\\uD83D\\uDDD3|\\uD83D\\uDDD2|\\uD83D\\uDDD1|\\uD83D\\uDDC4|\\uD83D\\uDDC3|\\uD83D\\uDDC2|\\uD83D\\uDDBC|\\uD83D\\uDDB2|\\uD83D\\uDDA8|\\uD83D\\uDDA5|\\uD83D\\uDD8D|\\uD83D\\uDD8C|\\uD83D\\uDD8B|\\uD83D\\uDD8A|\\uD83D\\uDD87|\\uD83D\\uDD79|\\uD83D\\uDD76|\\uD83D\\uDD73|\\uD83D\\uDD70|\\uD83D\\uDD6F|\\uD83D\\uDD4A|\\uD83D\\uDD49|\\uD83D\\uDCFD|\\uD83C\\uDFF7|\\uD83C\\uDFF5|\\uD83C\\uDFF3|\\uD83C\\uDF9B|\\uD83C\\uDF9A|\\uD83C\\uDF99|\\uD83C\\uDF21|\\uD83D\\uDD78|\\uD83D\\uDD77|\\uD83D\\uDC3F|\\uD83C\\uDF2C|\\uD83C\\uDF2B|\\uD83C\\uDF2A|\\uD83C\\uDF29|\\uD83C\\uDF28|\\uD83C\\uDF27|\\uD83C\\uDF36|\\uD83C\\uDF97|\\uD83C\\uDF96|\\uD83C\\uDFCE|\\uD83C\\uDFCD|\\uD83C\\uDFCC|\\uD83C\\uDFCB|\\uD83C\\uDF9F|\\uD83C\\uDF9E|\\uD83C\\uDE37|\\uD83C\\uDE2F|\\uD83C\\uDE1A|\\uD83C\\uDE02|\\uD83C\\uDD7F|\\uD83C\\uDC04|\\uD83C\\uDFE1|\\u2714|\\u2733|\\u2734|\\u2744|\\u2747|\\u2757|\\u2764|\\u27A1|\\u2934|\\u2935|\\u2B05|\\u2B06|\\u2B07|\\u2B1B|\\u2B1C|\\u2B50|\\u2B55|\\u3030|\\u303D|\\u3297|\\u3299|\\u2712|\\u270F|\\u270C|\\u2709|\\u2708|\\u2702|\\u26FD|\\u26FA|\\u26F5|\\u26F3|\\u26F2|\\u26EA|\\u26D4|\\u26C5|\\u26C4|\\u26BE|\\u26BD|\\u26AB|\\u26AA|\\u26A1|\\u26A0|\\u2693|\\u267F|\\u267B|\\u2668|\\u2666|\\u2665|\\u2663|\\u2660|\\u2653|\\u2652|\\u2651|\\u271D|\\u2650|\\u264F|\\u264E|\\u264D|\\u264C|\\u264B|\\u264A|\\u2649|\\u2648|\\u263A|\\u261D|\\u2615|\\u2614|\\u2611|\\u2328|\\u260E|\\u2601|\\u2600|\\u25FE|\\u25FD|\\u25FC|\\u25FB|\\u25C0|\\u25B6|\\u25AB|\\u25AA|\\u24C2|\\u2716|\\u231A|\\u21AA|\\u21A9|\\u2199|\\u2198|\\u2197|\\u2196|\\u2195|\\u2194|\\u2139|\\u2122|\\u270D|\\u2049|\\u203C|\\u00AE|\\u00A9|\\u27BF|\\u27B0|\\u2797|\\u2796|\\u2795|\\u2755|\\u2754|\\u2753|\\u274E|\\u274C|\\u2728|\\u270B|\\u270A|\\u2705|\\u26CE|\\u23F3|\\u23F0|\\u23EC|\\u23ED|\\u23EE|\\u23EF|\\u23F1|\\u23F2|\\u23F8|\\u23F9|\\u23FA|\\u2602|\\u2603|\\u2604|\\u2618|\\u2620|\\u2622|\\u2623|\\u2626|\\u262A|\\u262E|\\u262F|\\u2638|\\u2639|\\u2692|\\u2694|\\u2696|\\u2697|\\u2699|\\u269B|\\u269C|\\u26B0|\\u26B1|\\u26C8|\\u26CF|\\u26D1|\\u26D3|\\u26E9|\\u26F0|\\u26F1|\\u26F4|\\u26F7|\\u26F8|\\u26F9|\\u2721|\\u2763|\\u23EB|\\u23EA|\\u23E9|\\u231B|\\uD83E\\uDD19\\uD83C\\uDFFE|\\uD83E\\uDD34\\uD83C\\uDFFB|\\uD83E\\uDD34\\uD83C\\uDFFE|\\uD83E\\uDD34\\uD83C\\uDFFF|\\uD83E\\uDD36\\uD83C\\uDFFB|\\uD83E\\uDD36\\uD83C\\uDFFC|\\uD83E\\uDD36\\uD83C\\uDFFD|\\uD83E\\uDD36\\uD83C\\uDFFE|\\uD83E\\uDD36\\uD83C\\uDFFF|\\uD83E\\uDD35\\uD83C\\uDFFB|\\uD83E\\uDD35\\uD83C\\uDFFC|\\uD83E\\uDD35\\uD83C\\uDFFD|\\uD83E\\uDD35\\uD83C\\uDFFE|\\uD83E\\uDD35\\uD83C\\uDFFF|\\uD83E\\uDD37\\uD83C\\uDFFB|\\uD83E\\uDD37\\uD83C\\uDFFC|\\uD83E\\uDD37\\uD83C\\uDFFD|\\uD83E\\uDD37\\uD83C\\uDFFE|\\uD83E\\uDD37\\uD83C\\uDFFF|\\uD83E\\uDD26\\uD83C\\uDFFB|\\uD83E\\uDD26\\uD83C\\uDFFC|\\uD83E\\uDD26\\uD83C\\uDFFD|\\uD83E\\uDD26\\uD83C\\uDFFE|\\uD83E\\uDD26\\uD83C\\uDFFF|\\uD83E\\uDD30\\uD83C\\uDFFB|\\uD83E\\uDD30\\uD83C\\uDFFC|\\uD83E\\uDD30\\uD83C\\uDFFD|\\uD83E\\uDD30\\uD83C\\uDFFE|\\uD83E\\uDD30\\uD83C\\uDFFF|\\uD83D\\uDD7A\\uD83C\\uDFFB|\\uD83D\\uDD7A\\uD83C\\uDFFC|\\uD83D\\uDD7A\\uD83C\\uDFFD|\\uD83D\\uDD7A\\uD83C\\uDFFE|\\uD83D\\uDD7A\\uD83C\\uDFFF|\\uD83E\\uDD33\\uD83C\\uDFFB|\\uD83E\\uDD33\\uD83C\\uDFFC|\\uD83E\\uDD33\\uD83C\\uDFFD|\\uD83E\\uDD33\\uD83C\\uDFFE|\\uD83E\\uDD33\\uD83C\\uDFFF|\\uD83E\\uDD1E\\uD83C\\uDFFB|\\uD83E\\uDD1E\\uD83C\\uDFFC|\\uD83E\\uDD1E\\uD83C\\uDFFD|\\uD83E\\uDD1E\\uD83C\\uDFFE|\\uD83E\\uDD1E\\uD83C\\uDFFF|\\uD83E\\uDD19\\uD83C\\uDFFB|\\uD83E\\uDD19\\uD83C\\uDFFC|\\uD83E\\uDD19\\uD83C\\uDFFD|\\uD83E\\uDD34\\uD83C\\uDFFD|\\uD83E\\uDD19\\uD83C\\uDFFF|\\uD83E\\uDD1B\\uD83C\\uDFFB|\\uD83E\\uDD1B\\uD83C\\uDFFC|\\uD83E\\uDD1B\\uD83C\\uDFFD|\\uD83E\\uDD1B\\uD83C\\uDFFE|\\uD83E\\uDD1B\\uD83C\\uDFFF|\\uD83E\\uDD1C\\uD83C\\uDFFB|\\uD83E\\uDD1C\\uD83C\\uDFFC|\\uD83E\\uDD1C\\uD83C\\uDFFD|\\uD83E\\uDD1C\\uD83C\\uDFFE|\\uD83E\\uDD1C\\uD83C\\uDFFF|\\uD83E\\uDD1A\\uD83C\\uDFFB|\\uD83E\\uDD1A\\uD83C\\uDFFC|\\uD83E\\uDD1A\\uD83C\\uDFFD|\\uD83E\\uDD1A\\uD83C\\uDFFE|\\uD83E\\uDD1A\\uD83C\\uDFFF|\\uD83E\\uDD1D\\uD83C\\uDFFB|\\uD83E\\uDD1D\\uD83C\\uDFFC|\\uD83E\\uDD1D\\uD83C\\uDFFD|\\uD83E\\uDD1D\\uD83C\\uDFFE|\\uD83E\\uDD1D\\uD83C\\uDFFF|\\uD83E\\uDD38\\uD83C\\uDFFB|\\uD83E\\uDD38\\uD83C\\uDFFC|\\uD83E\\uDD38\\uD83C\\uDFFD|\\uD83E\\uDD38\\uD83C\\uDFFE|\\uD83E\\uDD38\\uD83C\\uDFFF|\\uD83E\\uDD3C\\uD83C\\uDFFC|\\uD83E\\uDD3C\\uD83C\\uDFFB|\\uD83E\\uDD3C\\uD83C\\uDFFD|\\uD83E\\uDD3C\\uD83C\\uDFFE|\\uD83E\\uDD3C\\uD83C\\uDFFF|\\uD83E\\uDD3D\\uD83C\\uDFFB|\\uD83E\\uDD3D\\uD83C\\uDFFC|\\uD83E\\uDD3D\\uD83C\\uDFFD|\\uD83E\\uDD3D\\uD83C\\uDFFE|\\uD83E\\uDD3D\\uD83C\\uDFFF|\\uD83E\\uDD3E\\uD83C\\uDFFB|\\uD83E\\uDD3E\\uD83C\\uDFFC|\\uD83E\\uDD3E\\uD83C\\uDFFD|\\uD83E\\uDD3E\\uD83C\\uDFFE|\\uD83E\\uDD3E\\uD83C\\uDFFF|\\uD83E\\uDD39\\uD83C\\uDFFB|\\uD83E\\uDD39\\uD83C\\uDFFC|\\uD83E\\uDD39\\uD83C\\uDFFD|\\uD83E\\uDD39\\uD83C\\uDFFE|\\uD83E\\uDD39\\uD83C\\uDFFF|\\uD83E\\uDD34\\uD83C\\uDFFC|\\uD83E\\uDD49|\\uD83E\\uDD48|\\uD83E\\uDD47|\\uD83E\\uDD3A|\\uD83E\\uDD45|\\uD83E\\uDD3E|\\uD83C\\uDDFF|\\uD83E\\uDD3D|\\uD83E\\uDD4B|\\uD83E\\uDD4A|\\uD83E\\uDD3C|\\uD83E\\uDD39|\\uD83E\\uDD38|\\uD83D\\uDEF6|\\uD83D\\uDEF5|\\uD83D\\uDEF4|\\uD83D\\uDED2|\\uD83D\\uDED1|\\uD83C\\uDDFE|\\uD83E\\uDD44|\\uD83E\\uDD42|\\uD83E\\uDD43|\\uD83E\\uDD59|\\uD83E\\uDD58|\\uD83E\\uDD57|\\uD83E\\uDD56|\\uD83E\\uDD55|\\uD83E\\uDD54|\\uD83E\\uDD53|\\uD83E\\uDD52|\\uD83E\\uDD51|\\uD83E\\uDD50|\\uD83E\\uDD40|\\uD83E\\uDD8F|\\uD83E\\uDD8E|\\uD83E\\uDD8D|\\uD83E\\uDD8C|\\uD83E\\uDD8B|\\uD83E\\uDD8A|\\uD83E\\uDD89|\\uD83E\\uDD88|\\uD83E\\uDD87|\\uD83C\\uDDFD|\\uD83E\\uDD86|\\uD83E\\uDD85|\\uD83D\\uDDA4|\\uD83E\\uDD1E|\\uD83E\\uDD1D|\\uD83E\\uDD1B|\\uD83E\\uDD1C|\\uD83E\\uDD1A|\\uD83E\\uDD19|\\uD83D\\uDD7A|\\uD83E\\uDD33|\\uD83E\\uDD30|\\uD83E\\uDD26|\\uD83E\\uDD37|\\uD83E\\uDD36|\\uD83E\\uDD35|\\uD83E\\uDD34|\\uD83E\\uDD27|\\uD83E\\uDD25|\\uD83E\\uDD24|\\uD83E\\uDD23|\\uD83E\\uDD22|\\uD83E\\uDD21|\\uD83E\\uDD20|\\uD83E\\uDD41|\\uD83E\\uDD90|\\uD83E\\uDD91|\\uD83E\\uDD5A|\\uD83E\\uDD5B|\\uD83E\\uDD5C|\\uD83E\\uDD5D|\\uD83E\\uDD5E|\\uD83C\\uDDFC|\\uD83C\\uDDFB|\\uD83C\\uDDFA|\\uD83C\\uDDF9|\\uD83C\\uDDF8|\\uD83C\\uDDF7|\\uD83C\\uDDF6|\\uD83C\\uDDF5|\\uD83C\\uDDF4|\\uD83C\\uDDF3|\\uD83C\\uDDF2|\\uD83C\\uDDF1|\\uD83C\\uDDF0|\\uD83C\\uDDEF|\\uD83C\\uDDEE|\\uD83C\\uDDED|\\uD83C\\uDDEC|\\uD83C\\uDDEB|\\uD83C\\uDDEA|\\uD83C\\uDDE9|\\uD83C\\uDDE8|\\uD83C\\uDDE7|\\uD83C\\uDDE6|\\uD83C\\uDF26|\\uD83C\\uDF25|\\uD83C\\uDF24|\\uD83D\\uDEF3|\\uD83D\\uDEE9|\\uD83D\\uDEE5|\\uD83D\\uDEE4|\\uD83D\\uDEE3|\\uD83D\\uDECF|\\uD83D\\uDECE|\\uD83D\\uDECD|\\uD83D\\uDECB|\\uD83C\\uDFDF|\\uD83C\\uDFDE|\\uD83C\\uDFDD|\\uD83C\\uDFDC|\\uD83C\\uDFDB|\\uD83C\\uDFDA|\\uD83C\\uDFD9|\\uD83C\\uDFD8|\\uD83C\\uDFD7|\\uD83C\\uDFD6|\\uD83C\\uDFD5|\\uD83C\\uDFD4|\\uD83D\\uDD90|\\uD83D\\uDD75|\\uD83D\\uDD74|\\uD83D\\uDC41|\\uD83C\\uDF7D|\\uD83D\\uDDB1|\\uD83D\\uDEF0|\\uD83D\\uDEE2|\\uD83D\\uDEE1|\\uD83D\\uDEE0|\\uD83D\\uDDFA|\\uD83D\\uDDF3|\\uD83D\\uDDEF|\\uD83D\\uDDE8|\\uD83D\\uDDE3|\\uD83D\\uDDE1|\\uD83D\\uDDDE|\\uD83D\\uDDDD|\\uD83D\\uDDDC|\\uD83D\\uDDD3|\\uD83D\\uDDD2|\\uD83D\\uDDD1|\\uD83D\\uDDC4|\\uD83D\\uDDC3|\\uD83D\\uDDC2|\\uD83D\\uDDBC|\\uD83D\\uDDB2|\\uD83D\\uDDA8|\\uD83D\\uDDA5|\\uD83D\\uDD8D|\\uD83D\\uDD8C|\\uD83D\\uDD8B|\\uD83D\\uDD8A|\\uD83D\\uDD87|\\uD83D\\uDD79|\\uD83D\\uDD76|\\uD83D\\uDD73|\\uD83D\\uDD70|\\uD83D\\uDD6F|\\uD83D\\uDD4A|\\uD83D\\uDD49|\\uD83D\\uDCFD|\\uD83C\\uDFF7|\\uD83C\\uDFF5|\\uD83C\\uDFF3|\\uD83C\\uDF9B|\\uD83C\\uDF9A|\\uD83C\\uDF99|\\uD83C\\uDF21|\\uD83D\\uDD78|\\uD83D\\uDD77|\\uD83D\\uDC3F|\\uD83C\\uDF2C|\\uD83C\\uDF2B|\\uD83C\\uDF2A|\\uD83C\\uDF29|\\uD83C\\uDF28|\\uD83C\\uDF27|\\uD83C\\uDF36|\\uD83C\\uDF97|\\uD83C\\uDF96|\\uD83C\\uDFCE|\\uD83C\\uDFCD|\\uD83C\\uDFCC|\\uD83C\\uDFCB|\\uD83C\\uDF9F|\\uD83C\\uDF9E|\\uD83C\\uDE37|\\uD83C\\uDE2F|\\uD83C\\uDE1A|\\uD83C\\uDE02|\\uD83C\\uDD7F|\\uD83C\\uDC04|\\u25C0|\\u2B05|\\u2B07|\\u2B1B|\\u2B1C|\\u2B50|\\u2B55|\\u3030|\\u303D|\\u3297|\\u3299|\\u2935|\\u2934|\\u27A1|\\u2764|\\u2757|\\u2747|\\u2744|\\u2734|\\u2733|\\u2716|\\u2714|\\u2712|\\u270F|\\u270C|\\u2709|\\u2708|\\u2702|\\u26FD|\\u26FA|\\u26F5|\\u26F3|\\u26F2|\\u26EA|\\u26D4|\\u26C5|\\u26C4|\\u26BE|\\u26BD|\\u26AB|\\u26AA|\\u26A1|\\u26A0|\\u271D|\\u2693|\\u267F|\\u267B|\\u2668|\\u2666|\\u2665|\\u2663|\\u2660|\\u2653|\\u2652|\\u2651|\\u2650|\\u264F|\\u264E|\\u2328|\\u264D|\\u264C|\\u264B|\\u264A|\\u2649|\\u2648|\\u263A|\\u261D|\\u2615|\\u2614|\\u2611|\\u260E|\\u2601|\\u2600|\\u25FE|\\u25FD|\\u25FC|\\u25FB|\\u2B06|\\u25B6|\\u25AB|\\u24C2|\\u231B|\\u231A|\\u21AA|\\u270D|\\u21A9|\\u2199|\\u2198|\\u2197|\\u2196|\\u2195|\\u2194|\\u2139|\\u2122|\\u2049|\\u203C|\\u00AE|\\u00A9|\\u2763|\\u2721|\\u26F9|\\u26F8|\\u26F7|\\u26F4|\\u26F1|\\u26F0|\\u26E9|\\u23CF|\\u23ED|\\u23EE|\\u23EF|\\u23F1|\\u23F2|\\u23F8|\\u23F9|\\u23FA|\\u2602|\\u2603|\\u2604|\\u2618|\\u2620|\\u2622|\\u2623|\\u2626|\\u262A|\\u262E|\\u262F|\\u2638|\\u2639|\\u2692|\\u2694|\\u2696|\\u2697|\\u2699|\\u269B|\\u269C|\\u26B0|\\u26B1|\\u26C8|\\u26CF|\\u26D1|\\u26D3|\\u25AA)';
    ns.jsEscapeMap = {"\uD83D\uDC69\u2764\uD83D\uDC8B\uD83D\uDC69":"1f469-2764-1f48b-1f469","\uD83D\uDC68\u2764\uD83D\uDC8B\uD83D\uDC68":"1f468-2764-1f48b-1f468","\uD83D\uDC68\uD83D\uDC68\uD83D\uDC66\uD83D\uDC66":"1f468-1f468-1f466-1f466","\uD83D\uDC68\uD83D\uDC68\uD83D\uDC67\uD83D\uDC66":"1f468-1f468-1f467-1f466","\uD83D\uDC68\uD83D\uDC68\uD83D\uDC67\uD83D\uDC67":"1f468-1f468-1f467-1f467","\uD83D\uDC68\uD83D\uDC69\uD83D\uDC66\uD83D\uDC66":"1f468-1f469-1f466-1f466","\uD83D\uDC68\uD83D\uDC69\uD83D\uDC67\uD83D\uDC66":"1f468-1f469-1f467-1f466","\uD83D\uDC68\uD83D\uDC69\uD83D\uDC67\uD83D\uDC67":"1f468-1f469-1f467-1f467","\uD83D\uDC69\uD83D\uDC69\uD83D\uDC66\uD83D\uDC66":"1f469-1f469-1f466-1f466","\uD83D\uDC69\uD83D\uDC69\uD83D\uDC67\uD83D\uDC66":"1f469-1f469-1f467-1f466","\uD83D\uDC69\uD83D\uDC69\uD83D\uDC67\uD83D\uDC67":"1f469-1f469-1f467-1f467","\uD83D\uDC69\u2764\uD83D\uDC69":"1f469-2764-1f469","\uD83D\uDC68\u2764\uD83D\uDC68":"1f468-2764-1f468","\uD83D\uDC68\uD83D\uDC68\uD83D\uDC66":"1f468-1f468-1f466","\uD83D\uDC68\uD83D\uDC68\uD83D\uDC67":"1f468-1f468-1f467","\uD83D\uDC68\uD83D\uDC69\uD83D\uDC67":"1f468-1f469-1f467","\uD83D\uDC69\uD83D\uDC69\uD83D\uDC66":"1f469-1f469-1f466","\uD83D\uDC69\uD83D\uDC69\uD83D\uDC67":"1f469-1f469-1f467","\uD83D\uDC41\uD83D\uDDE8":"1f441-1f5e8","#\u20E3":"0023-20e3","0\u20E3":"0030-20e3","1\u20E3":"0031-20e3","2\u20E3":"0032-20e3","3\u20E3":"0033-20e3","4\u20E3":"0034-20e3","5\u20E3":"0035-20e3","6\u20E3":"0036-20e3","7\u20E3":"0037-20e3","8\u20E3":"0038-20e3","9\u20E3":"0039-20e3","*\u20E3":"002a-20e3","\uD83E\uDD3E\uD83C\uDFFF":"1f93e-1f3ff","\uD83E\uDD3E\uD83C\uDFFE":"1f93e-1f3fe","\uD83E\uDD3E\uD83C\uDFFD":"1f93e-1f3fd","\uD83E\uDD3E\uD83C\uDFFC":"1f93e-1f3fc","\uD83E\uDD3E\uD83C\uDFFB":"1f93e-1f3fb","\uD83E\uDD3D\uD83C\uDFFF":"1f93d-1f3ff","\uD83E\uDD3D\uD83C\uDFFE":"1f93d-1f3fe","\uD83E\uDD3D\uD83C\uDFFD":"1f93d-1f3fd","\uD83E\uDD3D\uD83C\uDFFC":"1f93d-1f3fc","\uD83E\uDD3D\uD83C\uDFFB":"1f93d-1f3fb","\uD83E\uDD3C\uD83C\uDFFF":"1f93c-1f3ff","\uD83E\uDD3C\uD83C\uDFFE":"1f93c-1f3fe","\uD83E\uDD3C\uD83C\uDFFD":"1f93c-1f3fd","\uD83E\uDD3C\uD83C\uDFFC":"1f93c-1f3fc","\uD83E\uDD3C\uD83C\uDFFB":"1f93c-1f3fb","\uD83E\uDD39\uD83C\uDFFF":"1f939-1f3ff","\uD83E\uDD39\uD83C\uDFFE":"1f939-1f3fe","\uD83E\uDD39\uD83C\uDFFD":"1f939-1f3fd","\uD83E\uDD39\uD83C\uDFFC":"1f939-1f3fc","\uD83E\uDD39\uD83C\uDFFB":"1f939-1f3fb","\uD83E\uDD38\uD83C\uDFFF":"1f938-1f3ff","\uD83E\uDD38\uD83C\uDFFE":"1f938-1f3fe","\uD83E\uDD38\uD83C\uDFFD":"1f938-1f3fd","\uD83E\uDD38\uD83C\uDFFC":"1f938-1f3fc","\uD83E\uDD38\uD83C\uDFFB":"1f938-1f3fb","\uD83E\uDD37\uD83C\uDFFF":"1f937-1f3ff","\uD83E\uDD37\uD83C\uDFFE":"1f937-1f3fe","\uD83E\uDD37\uD83C\uDFFD":"1f937-1f3fd","\uD83E\uDD37\uD83C\uDFFC":"1f937-1f3fc","\uD83E\uDD37\uD83C\uDFFB":"1f937-1f3fb","\uD83E\uDD36\uD83C\uDFFF":"1f936-1f3ff","\uD83E\uDD36\uD83C\uDFFE":"1f936-1f3fe","\uD83E\uDD36\uD83C\uDFFD":"1f936-1f3fd","\uD83E\uDD36\uD83C\uDFFC":"1f936-1f3fc","\uD83E\uDD36\uD83C\uDFFB":"1f936-1f3fb","\uD83E\uDD35\uD83C\uDFFF":"1f935-1f3ff","\uD83E\uDD35\uD83C\uDFFE":"1f935-1f3fe","\uD83E\uDD35\uD83C\uDFFD":"1f935-1f3fd","\uD83E\uDD35\uD83C\uDFFC":"1f935-1f3fc","\uD83E\uDD35\uD83C\uDFFB":"1f935-1f3fb","\uD83E\uDD34\uD83C\uDFFF":"1f934-1f3ff","\uD83E\uDD34\uD83C\uDFFE":"1f934-1f3fe","\uD83E\uDD34\uD83C\uDFFD":"1f934-1f3fd","\uD83E\uDD34\uD83C\uDFFC":"1f934-1f3fc","\uD83E\uDD34\uD83C\uDFFB":"1f934-1f3fb","\uD83E\uDD33\uD83C\uDFFF":"1f933-1f3ff","\uD83E\uDD33\uD83C\uDFFE":"1f933-1f3fe","\uD83E\uDD33\uD83C\uDFFD":"1f933-1f3fd","\uD83E\uDD33\uD83C\uDFFC":"1f933-1f3fc","\uD83E\uDD33\uD83C\uDFFB":"1f933-1f3fb","\uD83E\uDD30\uD83C\uDFFF":"1f930-1f3ff","\uD83E\uDD30\uD83C\uDFFE":"1f930-1f3fe","\uD83E\uDD30\uD83C\uDFFD":"1f930-1f3fd","\uD83E\uDD30\uD83C\uDFFC":"1f930-1f3fc","\uD83E\uDD30\uD83C\uDFFB":"1f930-1f3fb","\uD83E\uDD26\uD83C\uDFFF":"1f926-1f3ff","\uD83E\uDD26\uD83C\uDFFE":"1f926-1f3fe","\uD83E\uDD26\uD83C\uDFFD":"1f926-1f3fd","\uD83E\uDD26\uD83C\uDFFC":"1f926-1f3fc","\uD83E\uDD26\uD83C\uDFFB":"1f926-1f3fb","\uD83E\uDD1E\uD83C\uDFFF":"1f91e-1f3ff","\uD83E\uDD1E\uD83C\uDFFE":"1f91e-1f3fe","\uD83E\uDD1E\uD83C\uDFFD":"1f91e-1f3fd","\uD83E\uDD1E\uD83C\uDFFC":"1f91e-1f3fc","\uD83E\uDD1E\uD83C\uDFFB":"1f91e-1f3fb","\uD83E\uDD1D\uD83C\uDFFF":"1f91d-1f3ff","\uD83E\uDD1D\uD83C\uDFFE":"1f91d-1f3fe","\uD83E\uDD1D\uD83C\uDFFD":"1f91d-1f3fd","\uD83E\uDD1D\uD83C\uDFFC":"1f91d-1f3fc","\uD83E\uDD1D\uD83C\uDFFB":"1f91d-1f3fb","\uD83E\uDD1C\uD83C\uDFFF":"1f91c-1f3ff","\uD83E\uDD1C\uD83C\uDFFE":"1f91c-1f3fe","\uD83E\uDD1C\uD83C\uDFFD":"1f91c-1f3fd","\uD83E\uDD1C\uD83C\uDFFC":"1f91c-1f3fc","\uD83E\uDD1C\uD83C\uDFFB":"1f91c-1f3fb","\uD83E\uDD1B\uD83C\uDFFF":"1f91b-1f3ff","\uD83E\uDD1B\uD83C\uDFFE":"1f91b-1f3fe","\uD83E\uDD1B\uD83C\uDFFD":"1f91b-1f3fd","\uD83E\uDD1B\uD83C\uDFFC":"1f91b-1f3fc","\uD83E\uDD1B\uD83C\uDFFB":"1f91b-1f3fb","\uD83E\uDD1A\uD83C\uDFFF":"1f91a-1f3ff","\uD83E\uDD1A\uD83C\uDFFE":"1f91a-1f3fe","\uD83E\uDD1A\uD83C\uDFFD":"1f91a-1f3fd","\uD83E\uDD1A\uD83C\uDFFC":"1f91a-1f3fc","\uD83E\uDD1A\uD83C\uDFFB":"1f91a-1f3fb","\uD83E\uDD19\uD83C\uDFFF":"1f919-1f3ff","\uD83E\uDD19\uD83C\uDFFE":"1f919-1f3fe","\uD83E\uDD19\uD83C\uDFFD":"1f919-1f3fd","\uD83E\uDD19\uD83C\uDFFC":"1f919-1f3fc","\uD83E\uDD19\uD83C\uDFFB":"1f919-1f3fb","\uD83E\uDD18\uD83C\uDFFF":"1f918-1f3ff","\uD83E\uDD18\uD83C\uDFFE":"1f918-1f3fe","\uD83E\uDD18\uD83C\uDFFD":"1f918-1f3fd","\uD83E\uDD18\uD83C\uDFFC":"1f918-1f3fc","\uD83E\uDD18\uD83C\uDFFB":"1f918-1f3fb","\uD83D\uDEC0\uD83C\uDFFF":"1f6c0-1f3ff","\uD83D\uDEC0\uD83C\uDFFE":"1f6c0-1f3fe","\uD83D\uDEC0\uD83C\uDFFD":"1f6c0-1f3fd","\uD83D\uDEC0\uD83C\uDFFC":"1f6c0-1f3fc","\uD83D\uDEC0\uD83C\uDFFB":"1f6c0-1f3fb","\uD83D\uDEB6\uD83C\uDFFF":"1f6b6-1f3ff","\uD83D\uDEB6\uD83C\uDFFE":"1f6b6-1f3fe","\uD83D\uDEB6\uD83C\uDFFD":"1f6b6-1f3fd","\uD83D\uDEB6\uD83C\uDFFC":"1f6b6-1f3fc","\uD83D\uDEB6\uD83C\uDFFB":"1f6b6-1f3fb","\uD83D\uDEB5\uD83C\uDFFF":"1f6b5-1f3ff","\uD83D\uDEB5\uD83C\uDFFE":"1f6b5-1f3fe","\uD83D\uDEB5\uD83C\uDFFD":"1f6b5-1f3fd","\uD83D\uDEB5\uD83C\uDFFC":"1f6b5-1f3fc","\uD83D\uDEB5\uD83C\uDFFB":"1f6b5-1f3fb","\uD83D\uDEB4\uD83C\uDFFF":"1f6b4-1f3ff","\uD83D\uDEB4\uD83C\uDFFE":"1f6b4-1f3fe","\uD83D\uDEB4\uD83C\uDFFD":"1f6b4-1f3fd","\uD83D\uDEB4\uD83C\uDFFC":"1f6b4-1f3fc","\uD83D\uDEB4\uD83C\uDFFB":"1f6b4-1f3fb","\uD83D\uDEA3\uD83C\uDFFF":"1f6a3-1f3ff","\uD83D\uDEA3\uD83C\uDFFE":"1f6a3-1f3fe","\uD83D\uDEA3\uD83C\uDFFD":"1f6a3-1f3fd","\uD83D\uDEA3\uD83C\uDFFC":"1f6a3-1f3fc","\uD83D\uDEA3\uD83C\uDFFB":"1f6a3-1f3fb","\uD83D\uDE4F\uD83C\uDFFF":"1f64f-1f3ff","\uD83D\uDE4F\uD83C\uDFFE":"1f64f-1f3fe","\uD83D\uDE4F\uD83C\uDFFD":"1f64f-1f3fd","\uD83D\uDE4F\uD83C\uDFFC":"1f64f-1f3fc","\uD83D\uDE4F\uD83C\uDFFB":"1f64f-1f3fb","\uD83D\uDE4E\uD83C\uDFFF":"1f64e-1f3ff","\uD83D\uDE4E\uD83C\uDFFE":"1f64e-1f3fe","\uD83D\uDE4E\uD83C\uDFFD":"1f64e-1f3fd","\uD83D\uDE4E\uD83C\uDFFC":"1f64e-1f3fc","\uD83D\uDE4E\uD83C\uDFFB":"1f64e-1f3fb","\uD83D\uDE4D\uD83C\uDFFF":"1f64d-1f3ff","\uD83D\uDE4D\uD83C\uDFFE":"1f64d-1f3fe","\uD83D\uDE4D\uD83C\uDFFD":"1f64d-1f3fd","\uD83D\uDE4D\uD83C\uDFFC":"1f64d-1f3fc","\uD83D\uDE4D\uD83C\uDFFB":"1f64d-1f3fb","\uD83D\uDE4C\uD83C\uDFFF":"1f64c-1f3ff","\uD83D\uDE4C\uD83C\uDFFE":"1f64c-1f3fe","\uD83D\uDE4C\uD83C\uDFFD":"1f64c-1f3fd","\uD83D\uDE4C\uD83C\uDFFC":"1f64c-1f3fc","\uD83D\uDE4C\uD83C\uDFFB":"1f64c-1f3fb","\uD83D\uDE4B\uD83C\uDFFF":"1f64b-1f3ff","\uD83D\uDE4B\uD83C\uDFFE":"1f64b-1f3fe","\uD83D\uDE4B\uD83C\uDFFD":"1f64b-1f3fd","\uD83D\uDE4B\uD83C\uDFFC":"1f64b-1f3fc","\uD83D\uDE4B\uD83C\uDFFB":"1f64b-1f3fb","\uD83D\uDE47\uD83C\uDFFF":"1f647-1f3ff","\uD83D\uDE47\uD83C\uDFFE":"1f647-1f3fe","\uD83D\uDE47\uD83C\uDFFD":"1f647-1f3fd","\uD83D\uDE47\uD83C\uDFFC":"1f647-1f3fc","\uD83D\uDE47\uD83C\uDFFB":"1f647-1f3fb","\uD83D\uDE46\uD83C\uDFFF":"1f646-1f3ff","\uD83D\uDE46\uD83C\uDFFE":"1f646-1f3fe","\uD83D\uDE46\uD83C\uDFFD":"1f646-1f3fd","\uD83D\uDE46\uD83C\uDFFC":"1f646-1f3fc","\uD83D\uDE46\uD83C\uDFFB":"1f646-1f3fb","\uD83D\uDE45\uD83C\uDFFF":"1f645-1f3ff","\uD83D\uDE45\uD83C\uDFFE":"1f645-1f3fe","\uD83D\uDE45\uD83C\uDFFD":"1f645-1f3fd","\uD83D\uDE45\uD83C\uDFFC":"1f645-1f3fc","\uD83D\uDE45\uD83C\uDFFB":"1f645-1f3fb","\uD83D\uDD96\uD83C\uDFFF":"1f596-1f3ff","\uD83D\uDD96\uD83C\uDFFE":"1f596-1f3fe","\uD83D\uDD96\uD83C\uDFFD":"1f596-1f3fd","\uD83D\uDD96\uD83C\uDFFC":"1f596-1f3fc","\uD83D\uDD96\uD83C\uDFFB":"1f596-1f3fb","\uD83D\uDD95\uD83C\uDFFF":"1f595-1f3ff","\uD83D\uDD95\uD83C\uDFFE":"1f595-1f3fe","\uD83D\uDD95\uD83C\uDFFD":"1f595-1f3fd","\uD83D\uDD95\uD83C\uDFFC":"1f595-1f3fc","\uD83D\uDD95\uD83C\uDFFB":"1f595-1f3fb","\uD83D\uDD90\uD83C\uDFFF":"1f590-1f3ff","\uD83D\uDD90\uD83C\uDFFE":"1f590-1f3fe","\uD83D\uDD90\uD83C\uDFFD":"1f590-1f3fd","\uD83D\uDD90\uD83C\uDFFC":"1f590-1f3fc","\uD83D\uDD90\uD83C\uDFFB":"1f590-1f3fb","\uD83D\uDD7A\uD83C\uDFFF":"1f57a-1f3ff","\uD83D\uDD7A\uD83C\uDFFE":"1f57a-1f3fe","\uD83D\uDD7A\uD83C\uDFFD":"1f57a-1f3fd","\uD83D\uDD7A\uD83C\uDFFC":"1f57a-1f3fc","\uD83D\uDD7A\uD83C\uDFFB":"1f57a-1f3fb","\uD83D\uDD75\uD83C\uDFFF":"1f575-1f3ff","\uD83D\uDD75\uD83C\uDFFE":"1f575-1f3fe","\uD83D\uDD75\uD83C\uDFFD":"1f575-1f3fd","\uD83D\uDD75\uD83C\uDFFC":"1f575-1f3fc","\uD83D\uDD75\uD83C\uDFFB":"1f575-1f3fb","\uD83D\uDCAA\uD83C\uDFFF":"1f4aa-1f3ff","\uD83D\uDCAA\uD83C\uDFFE":"1f4aa-1f3fe","\uD83D\uDCAA\uD83C\uDFFD":"1f4aa-1f3fd","\uD83D\uDCAA\uD83C\uDFFC":"1f4aa-1f3fc","\uD83D\uDCAA\uD83C\uDFFB":"1f4aa-1f3fb","\uD83D\uDC87\uD83C\uDFFF":"1f487-1f3ff","\uD83D\uDC87\uD83C\uDFFE":"1f487-1f3fe","\uD83D\uDC87\uD83C\uDFFD":"1f487-1f3fd","\uD83D\uDC87\uD83C\uDFFC":"1f487-1f3fc","\uD83D\uDC87\uD83C\uDFFB":"1f487-1f3fb","\uD83D\uDC86\uD83C\uDFFF":"1f486-1f3ff","\uD83D\uDC86\uD83C\uDFFE":"1f486-1f3fe","\uD83D\uDC86\uD83C\uDFFD":"1f486-1f3fd","\uD83D\uDC86\uD83C\uDFFC":"1f486-1f3fc","\uD83D\uDC86\uD83C\uDFFB":"1f486-1f3fb","\uD83D\uDC85\uD83C\uDFFF":"1f485-1f3ff","\uD83D\uDC85\uD83C\uDFFE":"1f485-1f3fe","\uD83D\uDC85\uD83C\uDFFD":"1f485-1f3fd","\uD83D\uDC85\uD83C\uDFFC":"1f485-1f3fc","\uD83D\uDC85\uD83C\uDFFB":"1f485-1f3fb","\uD83D\uDC83\uD83C\uDFFF":"1f483-1f3ff","\uD83D\uDC83\uD83C\uDFFE":"1f483-1f3fe","\uD83D\uDC83\uD83C\uDFFD":"1f483-1f3fd","\uD83D\uDC83\uD83C\uDFFC":"1f483-1f3fc","\uD83D\uDC83\uD83C\uDFFB":"1f483-1f3fb","\uD83D\uDC82\uD83C\uDFFF":"1f482-1f3ff","\uD83D\uDC82\uD83C\uDFFE":"1f482-1f3fe","\uD83D\uDC82\uD83C\uDFFD":"1f482-1f3fd","\uD83D\uDC82\uD83C\uDFFC":"1f482-1f3fc","\uD83D\uDC82\uD83C\uDFFB":"1f482-1f3fb","\uD83D\uDC81\uD83C\uDFFF":"1f481-1f3ff","\uD83D\uDC81\uD83C\uDFFE":"1f481-1f3fe","\uD83D\uDC81\uD83C\uDFFD":"1f481-1f3fd","\uD83D\uDC81\uD83C\uDFFC":"1f481-1f3fc","\uD83D\uDC81\uD83C\uDFFB":"1f481-1f3fb","\uD83D\uDC7C\uD83C\uDFFF":"1f47c-1f3ff","\uD83D\uDC7C\uD83C\uDFFE":"1f47c-1f3fe","\uD83D\uDC7C\uD83C\uDFFD":"1f47c-1f3fd","\uD83D\uDC7C\uD83C\uDFFC":"1f47c-1f3fc","\uD83D\uDC7C\uD83C\uDFFB":"1f47c-1f3fb","\uD83D\uDC78\uD83C\uDFFF":"1f478-1f3ff","\uD83D\uDC78\uD83C\uDFFE":"1f478-1f3fe","\uD83D\uDC78\uD83C\uDFFD":"1f478-1f3fd","\uD83D\uDC78\uD83C\uDFFC":"1f478-1f3fc","\uD83D\uDC78\uD83C\uDFFB":"1f478-1f3fb","\uD83D\uDC77\uD83C\uDFFF":"1f477-1f3ff","\uD83D\uDC77\uD83C\uDFFE":"1f477-1f3fe","\uD83D\uDC77\uD83C\uDFFD":"1f477-1f3fd","\uD83D\uDC77\uD83C\uDFFC":"1f477-1f3fc","\uD83D\uDC77\uD83C\uDFFB":"1f477-1f3fb","\uD83D\uDC76\uD83C\uDFFF":"1f476-1f3ff","\uD83D\uDC76\uD83C\uDFFE":"1f476-1f3fe","\uD83D\uDC76\uD83C\uDFFD":"1f476-1f3fd","\uD83D\uDC76\uD83C\uDFFC":"1f476-1f3fc","\uD83D\uDC76\uD83C\uDFFB":"1f476-1f3fb","\uD83D\uDC75\uD83C\uDFFF":"1f475-1f3ff","\uD83D\uDC75\uD83C\uDFFE":"1f475-1f3fe","\uD83D\uDC75\uD83C\uDFFD":"1f475-1f3fd","\uD83D\uDC75\uD83C\uDFFC":"1f475-1f3fc","\uD83D\uDC75\uD83C\uDFFB":"1f475-1f3fb","\uD83D\uDC74\uD83C\uDFFF":"1f474-1f3ff","\uD83D\uDC74\uD83C\uDFFE":"1f474-1f3fe","\uD83D\uDC74\uD83C\uDFFD":"1f474-1f3fd","\uD83D\uDC74\uD83C\uDFFC":"1f474-1f3fc","\uD83D\uDC74\uD83C\uDFFB":"1f474-1f3fb","\uD83D\uDC73\uD83C\uDFFF":"1f473-1f3ff","\uD83D\uDC73\uD83C\uDFFE":"1f473-1f3fe","\uD83D\uDC73\uD83C\uDFFD":"1f473-1f3fd","\uD83D\uDC73\uD83C\uDFFC":"1f473-1f3fc","\uD83D\uDC73\uD83C\uDFFB":"1f473-1f3fb","\uD83D\uDC72\uD83C\uDFFF":"1f472-1f3ff","\uD83D\uDC72\uD83C\uDFFE":"1f472-1f3fe","\uD83D\uDC72\uD83C\uDFFD":"1f472-1f3fd","\uD83D\uDC72\uD83C\uDFFC":"1f472-1f3fc","\uD83D\uDC72\uD83C\uDFFB":"1f472-1f3fb","\uD83D\uDC71\uD83C\uDFFF":"1f471-1f3ff","\uD83D\uDC71\uD83C\uDFFE":"1f471-1f3fe","\uD83D\uDC71\uD83C\uDFFD":"1f471-1f3fd","\uD83D\uDC71\uD83C\uDFFC":"1f471-1f3fc","\uD83D\uDC71\uD83C\uDFFB":"1f471-1f3fb","\uD83D\uDC70\uD83C\uDFFF":"1f470-1f3ff","\uD83D\uDC70\uD83C\uDFFE":"1f470-1f3fe","\uD83D\uDC70\uD83C\uDFFD":"1f470-1f3fd","\uD83D\uDC70\uD83C\uDFFC":"1f470-1f3fc","\uD83D\uDC70\uD83C\uDFFB":"1f470-1f3fb","\uD83D\uDC6E\uD83C\uDFFF":"1f46e-1f3ff","\uD83D\uDC6E\uD83C\uDFFE":"1f46e-1f3fe","\uD83D\uDC6E\uD83C\uDFFD":"1f46e-1f3fd","\uD83D\uDC6E\uD83C\uDFFC":"1f46e-1f3fc","\uD83D\uDC6E\uD83C\uDFFB":"1f46e-1f3fb","\uD83D\uDC69\uD83C\uDFFF":"1f469-1f3ff","\uD83D\uDC69\uD83C\uDFFE":"1f469-1f3fe","\uD83D\uDC69\uD83C\uDFFD":"1f469-1f3fd","\uD83D\uDC69\uD83C\uDFFC":"1f469-1f3fc","\uD83D\uDC69\uD83C\uDFFB":"1f469-1f3fb","\uD83D\uDC68\uD83C\uDFFF":"1f468-1f3ff","\uD83D\uDC68\uD83C\uDFFE":"1f468-1f3fe","\uD83D\uDC68\uD83C\uDFFD":"1f468-1f3fd","\uD83D\uDC68\uD83C\uDFFC":"1f468-1f3fc","\uD83D\uDC68\uD83C\uDFFB":"1f468-1f3fb","\uD83D\uDC67\uD83C\uDFFF":"1f467-1f3ff","\uD83D\uDC67\uD83C\uDFFE":"1f467-1f3fe","\uD83D\uDC67\uD83C\uDFFD":"1f467-1f3fd","\uD83D\uDC67\uD83C\uDFFC":"1f467-1f3fc","\uD83D\uDC67\uD83C\uDFFB":"1f467-1f3fb","\uD83D\uDC66\uD83C\uDFFF":"1f466-1f3ff","\uD83D\uDC66\uD83C\uDFFE":"1f466-1f3fe","\uD83D\uDC66\uD83C\uDFFD":"1f466-1f3fd","\uD83D\uDC66\uD83C\uDFFC":"1f466-1f3fc","\uD83D\uDC66\uD83C\uDFFB":"1f466-1f3fb","\uD83D\uDC50\uD83C\uDFFF":"1f450-1f3ff","\uD83D\uDC50\uD83C\uDFFE":"1f450-1f3fe","\uD83D\uDC50\uD83C\uDFFD":"1f450-1f3fd","\uD83D\uDC50\uD83C\uDFFC":"1f450-1f3fc","\uD83D\uDC50\uD83C\uDFFB":"1f450-1f3fb","\uD83D\uDC4F\uD83C\uDFFF":"1f44f-1f3ff","\uD83D\uDC4F\uD83C\uDFFE":"1f44f-1f3fe","\uD83D\uDC4F\uD83C\uDFFD":"1f44f-1f3fd","\uD83D\uDC4F\uD83C\uDFFC":"1f44f-1f3fc","\uD83D\uDC4F\uD83C\uDFFB":"1f44f-1f3fb","\uD83D\uDC4E\uD83C\uDFFF":"1f44e-1f3ff","\uD83D\uDC4E\uD83C\uDFFE":"1f44e-1f3fe","\uD83D\uDC4E\uD83C\uDFFD":"1f44e-1f3fd","\uD83D\uDC4E\uD83C\uDFFC":"1f44e-1f3fc","\uD83D\uDC4E\uD83C\uDFFB":"1f44e-1f3fb","\uD83D\uDC4D\uD83C\uDFFF":"1f44d-1f3ff","\uD83D\uDC4D\uD83C\uDFFE":"1f44d-1f3fe","\uD83D\uDC4D\uD83C\uDFFD":"1f44d-1f3fd","\uD83D\uDC4D\uD83C\uDFFC":"1f44d-1f3fc","\uD83D\uDC4D\uD83C\uDFFB":"1f44d-1f3fb","\uD83D\uDC4C\uD83C\uDFFF":"1f44c-1f3ff","\uD83D\uDC4C\uD83C\uDFFE":"1f44c-1f3fe","\uD83D\uDC4C\uD83C\uDFFD":"1f44c-1f3fd","\uD83D\uDC4C\uD83C\uDFFC":"1f44c-1f3fc","\uD83D\uDC4C\uD83C\uDFFB":"1f44c-1f3fb","\uD83D\uDC4B\uD83C\uDFFF":"1f44b-1f3ff","\uD83D\uDC4B\uD83C\uDFFE":"1f44b-1f3fe","\uD83D\uDC4B\uD83C\uDFFD":"1f44b-1f3fd","\uD83D\uDC4B\uD83C\uDFFC":"1f44b-1f3fc","\uD83D\uDC4B\uD83C\uDFFB":"1f44b-1f3fb","\uD83D\uDC4A\uD83C\uDFFF":"1f44a-1f3ff","\uD83D\uDC4A\uD83C\uDFFE":"1f44a-1f3fe","\uD83D\uDC4A\uD83C\uDFFD":"1f44a-1f3fd","\uD83D\uDC4A\uD83C\uDFFC":"1f44a-1f3fc","\uD83D\uDC4A\uD83C\uDFFB":"1f44a-1f3fb","\uD83D\uDC49\uD83C\uDFFF":"1f449-1f3ff","\uD83D\uDC49\uD83C\uDFFE":"1f449-1f3fe","\uD83D\uDC49\uD83C\uDFFD":"1f449-1f3fd","\uD83D\uDC49\uD83C\uDFFC":"1f449-1f3fc","\uD83D\uDC49\uD83C\uDFFB":"1f449-1f3fb","\uD83D\uDC48\uD83C\uDFFF":"1f448-1f3ff","\uD83D\uDC48\uD83C\uDFFE":"1f448-1f3fe","\uD83D\uDC48\uD83C\uDFFD":"1f448-1f3fd","\uD83D\uDC48\uD83C\uDFFC":"1f448-1f3fc","\uD83D\uDC48\uD83C\uDFFB":"1f448-1f3fb","\uD83D\uDC47\uD83C\uDFFF":"1f447-1f3ff","\uD83D\uDC47\uD83C\uDFFE":"1f447-1f3fe","\uD83D\uDC47\uD83C\uDFFD":"1f447-1f3fd","\uD83D\uDC47\uD83C\uDFFC":"1f447-1f3fc","\uD83D\uDC47\uD83C\uDFFB":"1f447-1f3fb","\uD83D\uDC46\uD83C\uDFFF":"1f446-1f3ff","\uD83D\uDC46\uD83C\uDFFE":"1f446-1f3fe","\uD83D\uDC46\uD83C\uDFFD":"1f446-1f3fd","\uD83D\uDC46\uD83C\uDFFC":"1f446-1f3fc","\uD83D\uDC46\uD83C\uDFFB":"1f446-1f3fb","\uD83D\uDC43\uD83C\uDFFF":"1f443-1f3ff","\uD83D\uDC43\uD83C\uDFFE":"1f443-1f3fe","\uD83D\uDC43\uD83C\uDFFD":"1f443-1f3fd","\uD83D\uDC43\uD83C\uDFFC":"1f443-1f3fc","\uD83D\uDC43\uD83C\uDFFB":"1f443-1f3fb","\uD83D\uDC42\uD83C\uDFFF":"1f442-1f3ff","\uD83D\uDC42\uD83C\uDFFE":"1f442-1f3fe","\uD83D\uDC42\uD83C\uDFFD":"1f442-1f3fd","\uD83D\uDC42\uD83C\uDFFC":"1f442-1f3fc","\uD83D\uDC42\uD83C\uDFFB":"1f442-1f3fb","\uD83C\uDFF3\uD83C\uDF08":"1f3f3-1f308","\uD83C\uDFCB\uD83C\uDFFF":"1f3cb-1f3ff","\uD83C\uDFCB\uD83C\uDFFE":"1f3cb-1f3fe","\uD83C\uDFCB\uD83C\uDFFD":"1f3cb-1f3fd","\uD83C\uDFCB\uD83C\uDFFC":"1f3cb-1f3fc","\uD83C\uDFCB\uD83C\uDFFB":"1f3cb-1f3fb","\uD83C\uDFCA\uD83C\uDFFF":"1f3ca-1f3ff","\uD83C\uDFCA\uD83C\uDFFE":"1f3ca-1f3fe","\uD83C\uDFCA\uD83C\uDFFD":"1f3ca-1f3fd","\uD83C\uDFCA\uD83C\uDFFC":"1f3ca-1f3fc","\uD83C\uDFCA\uD83C\uDFFB":"1f3ca-1f3fb","\uD83C\uDFC7\uD83C\uDFFF":"1f3c7-1f3ff","\uD83C\uDFC7\uD83C\uDFFE":"1f3c7-1f3fe","\uD83C\uDFC7\uD83C\uDFFD":"1f3c7-1f3fd","\uD83C\uDFC7\uD83C\uDFFC":"1f3c7-1f3fc","\uD83C\uDFC7\uD83C\uDFFB":"1f3c7-1f3fb","\uD83C\uDFC4\uD83C\uDFFF":"1f3c4-1f3ff","\uD83C\uDFC4\uD83C\uDFFE":"1f3c4-1f3fe","\uD83C\uDFC4\uD83C\uDFFD":"1f3c4-1f3fd","\uD83C\uDFC4\uD83C\uDFFC":"1f3c4-1f3fc","\uD83C\uDFC4\uD83C\uDFFB":"1f3c4-1f3fb","\uD83C\uDFC3\uD83C\uDFFF":"1f3c3-1f3ff","\uD83C\uDFC3\uD83C\uDFFE":"1f3c3-1f3fe","\uD83C\uDFC3\uD83C\uDFFD":"1f3c3-1f3fd","\uD83C\uDFC3\uD83C\uDFFC":"1f3c3-1f3fc","\uD83C\uDFC3\uD83C\uDFFB":"1f3c3-1f3fb","\uD83C\uDF85\uD83C\uDFFF":"1f385-1f3ff","\uD83C\uDF85\uD83C\uDFFE":"1f385-1f3fe","\uD83C\uDF85\uD83C\uDFFD":"1f385-1f3fd","\uD83C\uDF85\uD83C\uDFFC":"1f385-1f3fc","\uD83C\uDF85\uD83C\uDFFB":"1f385-1f3fb","\uD83C\uDDFF\uD83C\uDDFC":"1f1ff-1f1fc","\uD83C\uDDFF\uD83C\uDDF2":"1f1ff-1f1f2","\uD83C\uDDFF\uD83C\uDDE6":"1f1ff-1f1e6","\uD83C\uDDFE\uD83C\uDDF9":"1f1fe-1f1f9","\uD83C\uDDFE\uD83C\uDDEA":"1f1fe-1f1ea","\uD83C\uDDFD\uD83C\uDDF0":"1f1fd-1f1f0","\uD83C\uDDFC\uD83C\uDDF8":"1f1fc-1f1f8","\uD83C\uDDFC\uD83C\uDDEB":"1f1fc-1f1eb","\uD83C\uDDFB\uD83C\uDDFA":"1f1fb-1f1fa","\uD83C\uDDFB\uD83C\uDDF3":"1f1fb-1f1f3","\uD83C\uDDFB\uD83C\uDDEE":"1f1fb-1f1ee","\uD83C\uDDFB\uD83C\uDDEC":"1f1fb-1f1ec","\uD83C\uDDFB\uD83C\uDDEA":"1f1fb-1f1ea","\uD83C\uDDFB\uD83C\uDDE8":"1f1fb-1f1e8","\uD83C\uDDFB\uD83C\uDDE6":"1f1fb-1f1e6","\uD83C\uDDFA\uD83C\uDDFF":"1f1fa-1f1ff","\uD83C\uDDFA\uD83C\uDDFE":"1f1fa-1f1fe","\uD83C\uDDFA\uD83C\uDDF8":"1f1fa-1f1f8","\uD83C\uDDFA\uD83C\uDDF2":"1f1fa-1f1f2","\uD83C\uDDFA\uD83C\uDDEC":"1f1fa-1f1ec","\uD83C\uDDFA\uD83C\uDDE6":"1f1fa-1f1e6","\uD83C\uDDF9\uD83C\uDDFF":"1f1f9-1f1ff","\uD83C\uDDF9\uD83C\uDDFC":"1f1f9-1f1fc","\uD83C\uDDF9\uD83C\uDDFB":"1f1f9-1f1fb","\uD83C\uDDF9\uD83C\uDDF9":"1f1f9-1f1f9","\uD83C\uDDF9\uD83C\uDDF7":"1f1f9-1f1f7","\uD83C\uDDF9\uD83C\uDDF4":"1f1f9-1f1f4","\uD83C\uDDF9\uD83C\uDDF3":"1f1f9-1f1f3","\uD83C\uDDF9\uD83C\uDDF2":"1f1f9-1f1f2","\uD83C\uDDF9\uD83C\uDDF1":"1f1f9-1f1f1","\uD83C\uDDF9\uD83C\uDDF0":"1f1f9-1f1f0","\uD83C\uDDF9\uD83C\uDDEF":"1f1f9-1f1ef","\uD83C\uDDF9\uD83C\uDDED":"1f1f9-1f1ed","\uD83C\uDDF9\uD83C\uDDEC":"1f1f9-1f1ec","\uD83C\uDDF9\uD83C\uDDEB":"1f1f9-1f1eb","\uD83C\uDDF9\uD83C\uDDE9":"1f1f9-1f1e9","\uD83C\uDDF9\uD83C\uDDE8":"1f1f9-1f1e8","\uD83C\uDDF9\uD83C\uDDE6":"1f1f9-1f1e6","\uD83C\uDDF8\uD83C\uDDFF":"1f1f8-1f1ff","\uD83C\uDDF8\uD83C\uDDFE":"1f1f8-1f1fe","\uD83C\uDDF8\uD83C\uDDFD":"1f1f8-1f1fd","\uD83C\uDDF8\uD83C\uDDFB":"1f1f8-1f1fb","\uD83C\uDDF8\uD83C\uDDF9":"1f1f8-1f1f9","\uD83C\uDDF8\uD83C\uDDF8":"1f1f8-1f1f8","\uD83C\uDDF8\uD83C\uDDF7":"1f1f8-1f1f7","\uD83C\uDDF8\uD83C\uDDF4":"1f1f8-1f1f4","\uD83C\uDDF8\uD83C\uDDF3":"1f1f8-1f1f3","\uD83C\uDDF8\uD83C\uDDF2":"1f1f8-1f1f2","\uD83C\uDDF8\uD83C\uDDF1":"1f1f8-1f1f1","\uD83C\uDDF8\uD83C\uDDF0":"1f1f8-1f1f0","\uD83C\uDDF8\uD83C\uDDEF":"1f1f8-1f1ef","\uD83C\uDDF8\uD83C\uDDEE":"1f1f8-1f1ee","\uD83C\uDDF8\uD83C\uDDED":"1f1f8-1f1ed","\uD83C\uDDF8\uD83C\uDDEC":"1f1f8-1f1ec","\uD83C\uDDF8\uD83C\uDDEA":"1f1f8-1f1ea","\uD83C\uDDF8\uD83C\uDDE9":"1f1f8-1f1e9","\uD83C\uDDF8\uD83C\uDDE8":"1f1f8-1f1e8","\uD83C\uDDF8\uD83C\uDDE7":"1f1f8-1f1e7","\uD83C\uDDF8\uD83C\uDDE6":"1f1f8-1f1e6","\uD83C\uDDF7\uD83C\uDDFC":"1f1f7-1f1fc","\uD83C\uDDF7\uD83C\uDDFA":"1f1f7-1f1fa","\uD83C\uDDF7\uD83C\uDDF8":"1f1f7-1f1f8","\uD83C\uDDF7\uD83C\uDDF4":"1f1f7-1f1f4","\uD83C\uDDF7\uD83C\uDDEA":"1f1f7-1f1ea","\uD83C\uDDF6\uD83C\uDDE6":"1f1f6-1f1e6","\uD83C\uDDF5\uD83C\uDDFE":"1f1f5-1f1fe","\uD83C\uDDF5\uD83C\uDDFC":"1f1f5-1f1fc","\uD83C\uDDF5\uD83C\uDDF9":"1f1f5-1f1f9","\uD83C\uDDF5\uD83C\uDDF8":"1f1f5-1f1f8","\uD83C\uDDF5\uD83C\uDDF7":"1f1f5-1f1f7","\uD83C\uDDF5\uD83C\uDDF3":"1f1f5-1f1f3","\uD83C\uDDF5\uD83C\uDDF2":"1f1f5-1f1f2","\uD83C\uDDF5\uD83C\uDDF1":"1f1f5-1f1f1","\uD83C\uDDF5\uD83C\uDDF0":"1f1f5-1f1f0","\uD83C\uDDF5\uD83C\uDDED":"1f1f5-1f1ed","\uD83C\uDDF5\uD83C\uDDEC":"1f1f5-1f1ec","\uD83C\uDDF5\uD83C\uDDEB":"1f1f5-1f1eb","\uD83C\uDDF5\uD83C\uDDEA":"1f1f5-1f1ea","\uD83C\uDDF5\uD83C\uDDE6":"1f1f5-1f1e6","\uD83C\uDDF4\uD83C\uDDF2":"1f1f4-1f1f2","\uD83C\uDDF3\uD83C\uDDFF":"1f1f3-1f1ff","\uD83C\uDDF3\uD83C\uDDFA":"1f1f3-1f1fa","\uD83C\uDDF3\uD83C\uDDF7":"1f1f3-1f1f7","\uD83C\uDDF3\uD83C\uDDF5":"1f1f3-1f1f5","\uD83C\uDDF3\uD83C\uDDF4":"1f1f3-1f1f4","\uD83C\uDDF3\uD83C\uDDF1":"1f1f3-1f1f1","\uD83C\uDDF3\uD83C\uDDEE":"1f1f3-1f1ee","\uD83C\uDDF3\uD83C\uDDEC":"1f1f3-1f1ec","\uD83C\uDDF3\uD83C\uDDEB":"1f1f3-1f1eb","\uD83C\uDDF3\uD83C\uDDEA":"1f1f3-1f1ea","\uD83C\uDDF3\uD83C\uDDE8":"1f1f3-1f1e8","\uD83C\uDDF3\uD83C\uDDE6":"1f1f3-1f1e6","\uD83C\uDDF2\uD83C\uDDFF":"1f1f2-1f1ff","\uD83C\uDDF2\uD83C\uDDFE":"1f1f2-1f1fe","\uD83C\uDDF2\uD83C\uDDFD":"1f1f2-1f1fd","\uD83C\uDDF2\uD83C\uDDFC":"1f1f2-1f1fc","\uD83C\uDDF2\uD83C\uDDFB":"1f1f2-1f1fb","\uD83C\uDDF2\uD83C\uDDFA":"1f1f2-1f1fa","\uD83C\uDDF2\uD83C\uDDF9":"1f1f2-1f1f9","\uD83C\uDDF2\uD83C\uDDF8":"1f1f2-1f1f8","\uD83C\uDDF2\uD83C\uDDF7":"1f1f2-1f1f7","\uD83C\uDDF2\uD83C\uDDF6":"1f1f2-1f1f6","\uD83C\uDDF2\uD83C\uDDF5":"1f1f2-1f1f5","\uD83C\uDDF2\uD83C\uDDF4":"1f1f2-1f1f4","\uD83C\uDDF2\uD83C\uDDF3":"1f1f2-1f1f3","\uD83C\uDDF2\uD83C\uDDF2":"1f1f2-1f1f2","\uD83C\uDDF2\uD83C\uDDF1":"1f1f2-1f1f1","\uD83C\uDDF2\uD83C\uDDF0":"1f1f2-1f1f0","\uD83C\uDDF2\uD83C\uDDED":"1f1f2-1f1ed","\uD83C\uDDF2\uD83C\uDDEC":"1f1f2-1f1ec","\uD83C\uDDF2\uD83C\uDDEB":"1f1f2-1f1eb","\uD83C\uDDF2\uD83C\uDDEA":"1f1f2-1f1ea","\uD83C\uDDF2\uD83C\uDDE9":"1f1f2-1f1e9","\uD83C\uDDF2\uD83C\uDDE8":"1f1f2-1f1e8","\uD83C\uDDF2\uD83C\uDDE6":"1f1f2-1f1e6","\uD83C\uDDF1\uD83C\uDDFE":"1f1f1-1f1fe","\uD83C\uDDF1\uD83C\uDDFB":"1f1f1-1f1fb","\uD83C\uDDF1\uD83C\uDDFA":"1f1f1-1f1fa","\uD83C\uDDF1\uD83C\uDDF9":"1f1f1-1f1f9","\uD83C\uDDF1\uD83C\uDDF8":"1f1f1-1f1f8","\uD83C\uDDF1\uD83C\uDDF7":"1f1f1-1f1f7","\uD83C\uDDF1\uD83C\uDDF0":"1f1f1-1f1f0","\uD83C\uDDF1\uD83C\uDDEE":"1f1f1-1f1ee","\uD83C\uDDF1\uD83C\uDDE8":"1f1f1-1f1e8","\uD83C\uDDF1\uD83C\uDDE7":"1f1f1-1f1e7","\uD83C\uDDF1\uD83C\uDDE6":"1f1f1-1f1e6","\uD83C\uDDF0\uD83C\uDDFF":"1f1f0-1f1ff","\uD83C\uDDF0\uD83C\uDDFE":"1f1f0-1f1fe","\uD83C\uDDF0\uD83C\uDDFC":"1f1f0-1f1fc","\uD83C\uDDF0\uD83C\uDDF7":"1f1f0-1f1f7","\uD83C\uDDF0\uD83C\uDDF5":"1f1f0-1f1f5","\uD83C\uDDF0\uD83C\uDDF3":"1f1f0-1f1f3","\uD83C\uDDF0\uD83C\uDDF2":"1f1f0-1f1f2","\uD83C\uDDF0\uD83C\uDDEE":"1f1f0-1f1ee","\uD83C\uDDF0\uD83C\uDDED":"1f1f0-1f1ed","\uD83C\uDDF0\uD83C\uDDEC":"1f1f0-1f1ec","\uD83C\uDDF0\uD83C\uDDEA":"1f1f0-1f1ea","\uD83C\uDDEF\uD83C\uDDF5":"1f1ef-1f1f5","\uD83C\uDDEF\uD83C\uDDF4":"1f1ef-1f1f4","\uD83C\uDDEF\uD83C\uDDF2":"1f1ef-1f1f2","\uD83C\uDDEF\uD83C\uDDEA":"1f1ef-1f1ea","\uD83C\uDDEE\uD83C\uDDF9":"1f1ee-1f1f9","\uD83C\uDDEE\uD83C\uDDF8":"1f1ee-1f1f8","\uD83C\uDDEE\uD83C\uDDF7":"1f1ee-1f1f7","\uD83C\uDDEE\uD83C\uDDF6":"1f1ee-1f1f6","\uD83C\uDDEE\uD83C\uDDF4":"1f1ee-1f1f4","\uD83C\uDDEE\uD83C\uDDF3":"1f1ee-1f1f3","\uD83C\uDDEE\uD83C\uDDF2":"1f1ee-1f1f2","\uD83C\uDDEE\uD83C\uDDF1":"1f1ee-1f1f1","\uD83C\uDDEE\uD83C\uDDEA":"1f1ee-1f1ea","\uD83C\uDDEE\uD83C\uDDE9":"1f1ee-1f1e9","\uD83C\uDDEE\uD83C\uDDE8":"1f1ee-1f1e8","\uD83C\uDDED\uD83C\uDDFA":"1f1ed-1f1fa","\uD83C\uDDED\uD83C\uDDF9":"1f1ed-1f1f9","\uD83C\uDDED\uD83C\uDDF7":"1f1ed-1f1f7","\uD83C\uDDED\uD83C\uDDF3":"1f1ed-1f1f3","\uD83C\uDDED\uD83C\uDDF2":"1f1ed-1f1f2","\uD83C\uDDED\uD83C\uDDF0":"1f1ed-1f1f0","\uD83C\uDDEC\uD83C\uDDFE":"1f1ec-1f1fe","\uD83C\uDDEC\uD83C\uDDFC":"1f1ec-1f1fc","\uD83C\uDDEC\uD83C\uDDFA":"1f1ec-1f1fa","\uD83C\uDDEC\uD83C\uDDF9":"1f1ec-1f1f9","\uD83C\uDDEC\uD83C\uDDF8":"1f1ec-1f1f8","\uD83C\uDDEC\uD83C\uDDF7":"1f1ec-1f1f7","\uD83C\uDDEC\uD83C\uDDF6":"1f1ec-1f1f6","\uD83C\uDDEC\uD83C\uDDF5":"1f1ec-1f1f5","\uD83C\uDDEC\uD83C\uDDF3":"1f1ec-1f1f3","\uD83C\uDDEC\uD83C\uDDF2":"1f1ec-1f1f2","\uD83C\uDDEC\uD83C\uDDF1":"1f1ec-1f1f1","\uD83C\uDDEC\uD83C\uDDEE":"1f1ec-1f1ee","\uD83C\uDDEC\uD83C\uDDED":"1f1ec-1f1ed","\uD83C\uDDEC\uD83C\uDDEC":"1f1ec-1f1ec","\uD83C\uDDEC\uD83C\uDDEB":"1f1ec-1f1eb","\uD83C\uDDEC\uD83C\uDDEA":"1f1ec-1f1ea","\uD83C\uDDEC\uD83C\uDDE9":"1f1ec-1f1e9","\uD83C\uDDEC\uD83C\uDDE7":"1f1ec-1f1e7","\uD83C\uDDEC\uD83C\uDDE6":"1f1ec-1f1e6","\uD83C\uDDEB\uD83C\uDDF7":"1f1eb-1f1f7","\uD83C\uDDEB\uD83C\uDDF4":"1f1eb-1f1f4","\uD83C\uDDEB\uD83C\uDDF2":"1f1eb-1f1f2","\uD83C\uDDEB\uD83C\uDDF0":"1f1eb-1f1f0","\uD83C\uDDEB\uD83C\uDDEF":"1f1eb-1f1ef","\uD83C\uDDEB\uD83C\uDDEE":"1f1eb-1f1ee","\uD83C\uDDEA\uD83C\uDDFA":"1f1ea-1f1fa","\uD83C\uDDEA\uD83C\uDDF9":"1f1ea-1f1f9","\uD83C\uDDEA\uD83C\uDDF8":"1f1ea-1f1f8","\uD83C\uDDEA\uD83C\uDDF7":"1f1ea-1f1f7","\uD83C\uDDEA\uD83C\uDDED":"1f1ea-1f1ed","\uD83C\uDDEA\uD83C\uDDEC":"1f1ea-1f1ec","\uD83C\uDDEA\uD83C\uDDEA":"1f1ea-1f1ea","\uD83C\uDDEA\uD83C\uDDE8":"1f1ea-1f1e8","\uD83C\uDDEA\uD83C\uDDE6":"1f1ea-1f1e6","\uD83C\uDDE9\uD83C\uDDFF":"1f1e9-1f1ff","\uD83C\uDDE9\uD83C\uDDF4":"1f1e9-1f1f4","\uD83C\uDDE9\uD83C\uDDF2":"1f1e9-1f1f2","\uD83C\uDDE9\uD83C\uDDF0":"1f1e9-1f1f0","\uD83C\uDDE9\uD83C\uDDEF":"1f1e9-1f1ef","\uD83C\uDDE9\uD83C\uDDEC":"1f1e9-1f1ec","\uD83C\uDDE9\uD83C\uDDEA":"1f1e9-1f1ea","\uD83C\uDDE8\uD83C\uDDFF":"1f1e8-1f1ff","\uD83C\uDDE8\uD83C\uDDFE":"1f1e8-1f1fe","\uD83C\uDDE8\uD83C\uDDFD":"1f1e8-1f1fd","\uD83C\uDDE8\uD83C\uDDFC":"1f1e8-1f1fc","\uD83C\uDDE8\uD83C\uDDFB":"1f1e8-1f1fb","\uD83C\uDDE8\uD83C\uDDFA":"1f1e8-1f1fa","\uD83C\uDDE8\uD83C\uDDF7":"1f1e8-1f1f7","\uD83C\uDDE8\uD83C\uDDF5":"1f1e8-1f1f5","\uD83C\uDDE8\uD83C\uDDF4":"1f1e8-1f1f4","\uD83C\uDDE8\uD83C\uDDF3":"1f1e8-1f1f3","\uD83C\uDDE8\uD83C\uDDF2":"1f1e8-1f1f2","\uD83C\uDDE8\uD83C\uDDF1":"1f1e8-1f1f1","\uD83C\uDDE8\uD83C\uDDF0":"1f1e8-1f1f0","\uD83C\uDDE8\uD83C\uDDEE":"1f1e8-1f1ee","\uD83C\uDDE8\uD83C\uDDED":"1f1e8-1f1ed","\uD83C\uDDE8\uD83C\uDDEC":"1f1e8-1f1ec","\uD83C\uDDE8\uD83C\uDDEB":"1f1e8-1f1eb","\uD83C\uDDE8\uD83C\uDDE9":"1f1e8-1f1e9","\uD83C\uDDE8\uD83C\uDDE8":"1f1e8-1f1e8","\uD83C\uDDE8\uD83C\uDDE6":"1f1e8-1f1e6","\uD83C\uDDE7\uD83C\uDDFF":"1f1e7-1f1ff","\uD83C\uDDE7\uD83C\uDDFE":"1f1e7-1f1fe","\uD83C\uDDE7\uD83C\uDDFC":"1f1e7-1f1fc","\uD83C\uDDE7\uD83C\uDDFB":"1f1e7-1f1fb","\uD83C\uDDE7\uD83C\uDDF9":"1f1e7-1f1f9","\uD83C\uDDE7\uD83C\uDDF8":"1f1e7-1f1f8","\uD83C\uDDE7\uD83C\uDDF7":"1f1e7-1f1f7","\uD83C\uDDE7\uD83C\uDDF6":"1f1e7-1f1f6","\uD83C\uDDE7\uD83C\uDDF4":"1f1e7-1f1f4","\uD83C\uDDE7\uD83C\uDDF3":"1f1e7-1f1f3","\uD83C\uDDE7\uD83C\uDDF2":"1f1e7-1f1f2","\uD83C\uDDE7\uD83C\uDDF1":"1f1e7-1f1f1","\uD83C\uDDE7\uD83C\uDDEF":"1f1e7-1f1ef","\uD83C\uDDE7\uD83C\uDDEE":"1f1e7-1f1ee","\uD83C\uDDE7\uD83C\uDDED":"1f1e7-1f1ed","\uD83C\uDDE7\uD83C\uDDEC":"1f1e7-1f1ec","\uD83C\uDDE7\uD83C\uDDEB":"1f1e7-1f1eb","\uD83C\uDDE7\uD83C\uDDEA":"1f1e7-1f1ea","\uD83C\uDDE7\uD83C\uDDE9":"1f1e7-1f1e9","\uD83C\uDDE7\uD83C\uDDE7":"1f1e7-1f1e7","\uD83C\uDDE7\uD83C\uDDE6":"1f1e7-1f1e6","\uD83C\uDDE6\uD83C\uDDFF":"1f1e6-1f1ff","\uD83C\uDDE6\uD83C\uDDFD":"1f1e6-1f1fd","\uD83C\uDDE6\uD83C\uDDFC":"1f1e6-1f1fc","\uD83C\uDDE6\uD83C\uDDFA":"1f1e6-1f1fa","\uD83C\uDDE6\uD83C\uDDF9":"1f1e6-1f1f9","\uD83C\uDDE6\uD83C\uDDF8":"1f1e6-1f1f8","\uD83C\uDDE6\uD83C\uDDF7":"1f1e6-1f1f7","\uD83C\uDDE6\uD83C\uDDF6":"1f1e6-1f1f6","\uD83C\uDDE6\uD83C\uDDF4":"1f1e6-1f1f4","\uD83C\uDDE6\uD83C\uDDF2":"1f1e6-1f1f2","\uD83C\uDDE6\uD83C\uDDF1":"1f1e6-1f1f1","\uD83C\uDDE6\uD83C\uDDEE":"1f1e6-1f1ee","\uD83C\uDDE6\uD83C\uDDEC":"1f1e6-1f1ec","\uD83C\uDDE6\uD83C\uDDEB":"1f1e6-1f1eb","\uD83C\uDDE6\uD83C\uDDEA":"1f1e6-1f1ea","\uD83C\uDDE6\uD83C\uDDE9":"1f1e6-1f1e9","\uD83C\uDDE6\uD83C\uDDE8":"1f1e6-1f1e8","\uD83C\uDC04":"1f004","\uD83C\uDD7F":"1f17f","\uD83C\uDE02":"1f202","\uD83C\uDE1A":"1f21a","\uD83C\uDE2F":"1f22f","\uD83C\uDE37":"1f237","\uD83C\uDF9E":"1f39e","\uD83C\uDF9F":"1f39f","\uD83C\uDFCB":"1f3cb","\uD83C\uDFCC":"1f3cc","\uD83C\uDFCD":"1f3cd","\uD83C\uDFCE":"1f3ce","\uD83C\uDF96":"1f396","\uD83C\uDF97":"1f397","\uD83C\uDF36":"1f336","\uD83C\uDF27":"1f327","\uD83C\uDF28":"1f328","\uD83C\uDF29":"1f329","\uD83C\uDF2A":"1f32a","\uD83C\uDF2B":"1f32b","\uD83C\uDF2C":"1f32c","\uD83D\uDC3F":"1f43f","\uD83D\uDD77":"1f577","\uD83D\uDD78":"1f578","\uD83C\uDF21":"1f321","\uD83C\uDF99":"1f399","\uD83C\uDF9A":"1f39a","\uD83C\uDF9B":"1f39b","\uD83C\uDFF3":"1f3f3","\uD83C\uDFF5":"1f3f5","\uD83C\uDFF7":"1f3f7","\uD83D\uDCFD":"1f4fd","\uD83D\uDD49":"1f549","\uD83D\uDD4A":"1f54a","\uD83D\uDD6F":"1f56f","\uD83D\uDD70":"1f570","\uD83D\uDD73":"1f573","\uD83D\uDD76":"1f576","\uD83D\uDD79":"1f579","\uD83D\uDD87":"1f587","\uD83D\uDD8A":"1f58a","\uD83D\uDD8B":"1f58b","\uD83D\uDD8C":"1f58c","\uD83D\uDD8D":"1f58d","\uD83D\uDDA5":"1f5a5","\uD83D\uDDA8":"1f5a8","\uD83D\uDDB2":"1f5b2","\uD83D\uDDBC":"1f5bc","\uD83D\uDDC2":"1f5c2","\uD83D\uDDC3":"1f5c3","\uD83D\uDDC4":"1f5c4","\uD83D\uDDD1":"1f5d1","\uD83D\uDDD2":"1f5d2","\uD83D\uDDD3":"1f5d3","\uD83D\uDDDC":"1f5dc","\uD83D\uDDDD":"1f5dd","\uD83D\uDDDE":"1f5de","\uD83D\uDDE1":"1f5e1","\uD83D\uDDE3":"1f5e3","\uD83D\uDDE8":"1f5e8","\uD83D\uDDEF":"1f5ef","\uD83D\uDDF3":"1f5f3","\uD83D\uDDFA":"1f5fa","\uD83D\uDEE0":"1f6e0","\uD83D\uDEE1":"1f6e1","\uD83D\uDEE2":"1f6e2","\uD83D\uDEF0":"1f6f0","\uD83C\uDF7D":"1f37d","\uD83D\uDC41":"1f441","\uD83D\uDD74":"1f574","\uD83D\uDD75":"1f575","\uD83D\uDD90":"1f590","\uD83C\uDFD4":"1f3d4","\uD83C\uDFD5":"1f3d5","\uD83C\uDFD6":"1f3d6","\uD83C\uDFD7":"1f3d7","\uD83C\uDFD8":"1f3d8","\uD83C\uDFD9":"1f3d9","\uD83C\uDFDA":"1f3da","\uD83C\uDFDB":"1f3db","\uD83C\uDFDC":"1f3dc","\uD83C\uDFDD":"1f3dd","\uD83C\uDFDE":"1f3de","\uD83C\uDFDF":"1f3df","\uD83D\uDECB":"1f6cb","\uD83D\uDECD":"1f6cd","\uD83D\uDECE":"1f6ce","\uD83D\uDECF":"1f6cf","\uD83D\uDEE3":"1f6e3","\uD83D\uDEE4":"1f6e4","\uD83D\uDEE5":"1f6e5","\uD83D\uDEE9":"1f6e9","\uD83D\uDEF3":"1f6f3","\uD83C\uDF24":"1f324","\uD83C\uDF25":"1f325","\uD83C\uDF26":"1f326","\uD83D\uDDB1":"1f5b1","\u261D\uD83C\uDFFB":"261d-1f3fb","\u261D\uD83C\uDFFC":"261d-1f3fc","\u261D\uD83C\uDFFD":"261d-1f3fd","\u261D\uD83C\uDFFE":"261d-1f3fe","\u261D\uD83C\uDFFF":"261d-1f3ff","\u270C\uD83C\uDFFB":"270c-1f3fb","\u270C\uD83C\uDFFC":"270c-1f3fc","\u270C\uD83C\uDFFD":"270c-1f3fd","\u270C\uD83C\uDFFE":"270c-1f3fe","\u270C\uD83C\uDFFF":"270c-1f3ff","\u270A\uD83C\uDFFB":"270a-1f3fb","\u270A\uD83C\uDFFC":"270a-1f3fc","\u270A\uD83C\uDFFD":"270a-1f3fd","\u270A\uD83C\uDFFE":"270a-1f3fe","\u270A\uD83C\uDFFF":"270a-1f3ff","\u270B\uD83C\uDFFB":"270b-1f3fb","\u270B\uD83C\uDFFC":"270b-1f3fc","\u270B\uD83C\uDFFD":"270b-1f3fd","\u270B\uD83C\uDFFE":"270b-1f3fe","\u270B\uD83C\uDFFF":"270b-1f3ff","\u270D\uD83C\uDFFB":"270d-1f3fb","\u270D\uD83C\uDFFC":"270d-1f3fc","\u270D\uD83C\uDFFD":"270d-1f3fd","\u270D\uD83C\uDFFE":"270d-1f3fe","\u270D\uD83C\uDFFF":"270d-1f3ff","\u26F9\uD83C\uDFFB":"26f9-1f3fb","\u26F9\uD83C\uDFFC":"26f9-1f3fc","\u26F9\uD83C\uDFFD":"26f9-1f3fd","\u26F9\uD83C\uDFFE":"26f9-1f3fe","\u26F9\uD83C\uDFFF":"26f9-1f3ff","\u00A9":"00a9","\u00AE":"00ae","\u203C":"203c","\u2049":"2049","\u2122":"2122","\u2139":"2139","\u2194":"2194","\u2195":"2195","\u2196":"2196","\u2197":"2197","\u2198":"2198","\u2199":"2199","\u21A9":"21a9","\u21AA":"21aa","\u231A":"231a","\u231B":"231b","\u24C2":"24c2","\u25AA":"25aa","\u25AB":"25ab","\u25B6":"25b6","\u25C0":"25c0","\u25FB":"25fb","\u25FC":"25fc","\u25FD":"25fd","\u25FE":"25fe","\u2600":"2600","\u2601":"2601","\u260E":"260e","\u2611":"2611","\u2614":"2614","\u2615":"2615","\u261D":"261d","\u263A":"263a","\u2648":"2648","\u2649":"2649","\u264A":"264a","\u264B":"264b","\u264C":"264c","\u264D":"264d","\u264E":"264e","\u264F":"264f","\u2650":"2650","\u2651":"2651","\u2652":"2652","\u2653":"2653","\u2660":"2660","\u2663":"2663","\u2665":"2665","\u2666":"2666","\u2668":"2668","\u267B":"267b","\u267F":"267f","\u2693":"2693","\u26A0":"26a0","\u26A1":"26a1","\u26AA":"26aa","\u26AB":"26ab","\u26BD":"26bd","\u26BE":"26be","\u26C4":"26c4","\u26C5":"26c5","\u26D4":"26d4","\u26EA":"26ea","\u26F2":"26f2","\u26F3":"26f3","\u26F5":"26f5","\u26FA":"26fa","\u26FD":"26fd","\u2702":"2702","\u2708":"2708","\u2709":"2709","\u270C":"270c","\u270F":"270f","\u2712":"2712","\u2714":"2714","\u2716":"2716","\u2733":"2733","\u2734":"2734","\u2744":"2744","\u2747":"2747","\u2757":"2757","\u2764":"2764","\u27A1":"27a1","\u2934":"2934","\u2935":"2935","\u2B05":"2b05","\u2B06":"2b06","\u2B07":"2b07","\u2B1B":"2b1b","\u2B1C":"2b1c","\u2B50":"2b50","\u2B55":"2b55","\u3030":"3030","\u303D":"303d","\u3297":"3297","\u3299":"3299","\u271D":"271d","\u2328":"2328","\u270D":"270d","\u23CF":"23cf","\u23ED":"23ed","\u23EE":"23ee","\u23EF":"23ef","\u23F1":"23f1","\u23F2":"23f2","\u23F8":"23f8","\u23F9":"23f9","\u23FA":"23fa","\u2602":"2602","\u2603":"2603","\u2604":"2604","\u2618":"2618","\u2620":"2620","\u2622":"2622","\u2623":"2623","\u2626":"2626","\u262A":"262a","\u262E":"262e","\u262F":"262f","\u2638":"2638","\u2639":"2639","\u2692":"2692","\u2694":"2694","\u2696":"2696","\u2697":"2697","\u2699":"2699","\u269B":"269b","\u269C":"269c","\u26B0":"26b0","\u26B1":"26b1","\u26C8":"26c8","\u26CF":"26cf","\u26D1":"26d1","\u26D3":"26d3","\u26E9":"26e9","\u26F0":"26f0","\u26F1":"26f1","\u26F4":"26f4","\u26F7":"26f7","\u26F8":"26f8","\u26F9":"26f9","\u2721":"2721","\u2763":"2763","\uD83E\uDD49":"1f949","\uD83E\uDD48":"1f948","\uD83E\uDD47":"1f947","\uD83E\uDD3A":"1f93a","\uD83E\uDD45":"1f945","\uD83E\uDD3E":"1f93e","\uD83C\uDDFF":"1f1ff","\uD83E\uDD3D":"1f93d","\uD83E\uDD4B":"1f94b","\uD83E\uDD4A":"1f94a","\uD83E\uDD3C":"1f93c","\uD83E\uDD39":"1f939","\uD83E\uDD38":"1f938","\uD83D\uDEF6":"1f6f6","\uD83D\uDEF5":"1f6f5","\uD83D\uDEF4":"1f6f4","\uD83D\uDED2":"1f6d2","\uD83C\uDCCF":"1f0cf","\uD83C\uDD70":"1f170","\uD83C\uDD71":"1f171","\uD83C\uDD7E":"1f17e","\uD83D\uDED1":"1f6d1","\uD83C\uDD8E":"1f18e","\uD83C\uDD91":"1f191","\uD83C\uDDFE":"1f1fe","\uD83C\uDD92":"1f192","\uD83C\uDD93":"1f193","\uD83C\uDD94":"1f194","\uD83C\uDD95":"1f195","\uD83C\uDD96":"1f196","\uD83C\uDD97":"1f197","\uD83C\uDD98":"1f198","\uD83E\uDD44":"1f944","\uD83C\uDD99":"1f199","\uD83C\uDD9A":"1f19a","\uD83E\uDD42":"1f942","\uD83E\uDD43":"1f943","\uD83C\uDE01":"1f201","\uD83E\uDD59":"1f959","\uD83C\uDE32":"1f232","\uD83C\uDE33":"1f233","\uD83C\uDE34":"1f234","\uD83C\uDE35":"1f235","\uD83C\uDE36":"1f236","\uD83E\uDD58":"1f958","\uD83C\uDE38":"1f238","\uD83C\uDE39":"1f239","\uD83E\uDD57":"1f957","\uD83C\uDE3A":"1f23a","\uD83C\uDE50":"1f250","\uD83C\uDE51":"1f251","\uD83C\uDF00":"1f300","\uD83E\uDD56":"1f956","\uD83C\uDF01":"1f301","\uD83C\uDF02":"1f302","\uD83C\uDF03":"1f303","\uD83C\uDF04":"1f304","\uD83C\uDF05":"1f305","\uD83C\uDF06":"1f306","\uD83E\uDD55":"1f955","\uD83C\uDF07":"1f307","\uD83C\uDF08":"1f308","\uD83E\uDD54":"1f954","\uD83C\uDF09":"1f309","\uD83C\uDF0A":"1f30a","\uD83C\uDF0B":"1f30b","\uD83C\uDF0C":"1f30c","\uD83C\uDF0F":"1f30f","\uD83C\uDF11":"1f311","\uD83E\uDD53":"1f953","\uD83C\uDF13":"1f313","\uD83C\uDF14":"1f314","\uD83C\uDF15":"1f315","\uD83C\uDF19":"1f319","\uD83C\uDF1B":"1f31b","\uD83C\uDF1F":"1f31f","\uD83E\uDD52":"1f952","\uD83C\uDF20":"1f320","\uD83C\uDF30":"1f330","\uD83E\uDD51":"1f951","\uD83C\uDF31":"1f331","\uD83C\uDF34":"1f334","\uD83C\uDF35":"1f335","\uD83C\uDF37":"1f337","\uD83C\uDF38":"1f338","\uD83C\uDF39":"1f339","\uD83C\uDF3A":"1f33a","\uD83C\uDF3B":"1f33b","\uD83C\uDF3C":"1f33c","\uD83C\uDF3D":"1f33d","\uD83E\uDD50":"1f950","\uD83C\uDF3E":"1f33e","\uD83C\uDF3F":"1f33f","\uD83C\uDF40":"1f340","\uD83C\uDF41":"1f341","\uD83C\uDF42":"1f342","\uD83C\uDF43":"1f343","\uD83C\uDF44":"1f344","\uD83C\uDF45":"1f345","\uD83C\uDF46":"1f346","\uD83C\uDF47":"1f347","\uD83C\uDF48":"1f348","\uD83C\uDF49":"1f349","\uD83C\uDF4A":"1f34a","\uD83E\uDD40":"1f940","\uD83C\uDF4C":"1f34c","\uD83C\uDF4D":"1f34d","\uD83C\uDF4E":"1f34e","\uD83C\uDF4F":"1f34f","\uD83C\uDF51":"1f351","\uD83C\uDF52":"1f352","\uD83C\uDF53":"1f353","\uD83E\uDD8F":"1f98f","\uD83C\uDF54":"1f354","\uD83C\uDF55":"1f355","\uD83C\uDF56":"1f356","\uD83E\uDD8E":"1f98e","\uD83C\uDF57":"1f357","\uD83C\uDF58":"1f358","\uD83C\uDF59":"1f359","\uD83E\uDD8D":"1f98d","\uD83C\uDF5A":"1f35a","\uD83C\uDF5B":"1f35b","\uD83E\uDD8C":"1f98c","\uD83C\uDF5C":"1f35c","\uD83C\uDF5D":"1f35d","\uD83C\uDF5E":"1f35e","\uD83C\uDF5F":"1f35f","\uD83E\uDD8B":"1f98b","\uD83C\uDF60":"1f360","\uD83C\uDF61":"1f361","\uD83E\uDD8A":"1f98a","\uD83C\uDF62":"1f362","\uD83C\uDF63":"1f363","\uD83E\uDD89":"1f989","\uD83C\uDF64":"1f364","\uD83C\uDF65":"1f365","\uD83E\uDD88":"1f988","\uD83C\uDF66":"1f366","\uD83E\uDD87":"1f987","\uD83C\uDF67":"1f367","\uD83C\uDDFD":"1f1fd","\uD83C\uDF68":"1f368","\uD83E\uDD86":"1f986","\uD83C\uDF69":"1f369","\uD83E\uDD85":"1f985","\uD83C\uDF6A":"1f36a","\uD83D\uDDA4":"1f5a4","\uD83C\uDF6B":"1f36b","\uD83C\uDF6C":"1f36c","\uD83C\uDF6D":"1f36d","\uD83C\uDF6E":"1f36e","\uD83C\uDF6F":"1f36f","\uD83E\uDD1E":"1f91e","\uD83C\uDF70":"1f370","\uD83C\uDF71":"1f371","\uD83C\uDF72":"1f372","\uD83E\uDD1D":"1f91d","\uD83C\uDF73":"1f373","\uD83C\uDF74":"1f374","\uD83C\uDF75":"1f375","\uD83C\uDF76":"1f376","\uD83C\uDF77":"1f377","\uD83C\uDF78":"1f378","\uD83C\uDF79":"1f379","\uD83C\uDF7A":"1f37a","\uD83C\uDF7B":"1f37b","\uD83C\uDF80":"1f380","\uD83C\uDF81":"1f381","\uD83C\uDF82":"1f382","\uD83C\uDF83":"1f383","\uD83E\uDD1B":"1f91b","\uD83E\uDD1C":"1f91c","\uD83C\uDF84":"1f384","\uD83C\uDF85":"1f385","\uD83C\uDF86":"1f386","\uD83E\uDD1A":"1f91a","\uD83C\uDF87":"1f387","\uD83C\uDF88":"1f388","\uD83C\uDF89":"1f389","\uD83C\uDF8A":"1f38a","\uD83C\uDF8B":"1f38b","\uD83C\uDF8C":"1f38c","\uD83E\uDD19":"1f919","\uD83C\uDF8D":"1f38d","\uD83D\uDD7A":"1f57a","\uD83C\uDF8E":"1f38e","\uD83E\uDD33":"1f933","\uD83C\uDF8F":"1f38f","\uD83E\uDD30":"1f930","\uD83C\uDF90":"1f390","\uD83E\uDD26":"1f926","\uD83E\uDD37":"1f937","\uD83C\uDF91":"1f391","\uD83C\uDF92":"1f392","\uD83C\uDF93":"1f393","\uD83C\uDFA0":"1f3a0","\uD83C\uDFA1":"1f3a1","\uD83C\uDFA2":"1f3a2","\uD83C\uDFA3":"1f3a3","\uD83C\uDFA4":"1f3a4","\uD83C\uDFA5":"1f3a5","\uD83C\uDFA6":"1f3a6","\uD83C\uDFA7":"1f3a7","\uD83E\uDD36":"1f936","\uD83C\uDFA8":"1f3a8","\uD83E\uDD35":"1f935","\uD83C\uDFA9":"1f3a9","\uD83C\uDFAA":"1f3aa","\uD83E\uDD34":"1f934","\uD83C\uDFAB":"1f3ab","\uD83C\uDFAC":"1f3ac","\uD83C\uDFAD":"1f3ad","\uD83E\uDD27":"1f927","\uD83C\uDFAE":"1f3ae","\uD83C\uDFAF":"1f3af","\uD83C\uDFB0":"1f3b0","\uD83C\uDFB1":"1f3b1","\uD83C\uDFB2":"1f3b2","\uD83C\uDFB3":"1f3b3","\uD83C\uDFB4":"1f3b4","\uD83E\uDD25":"1f925","\uD83C\uDFB5":"1f3b5","\uD83C\uDFB6":"1f3b6","\uD83C\uDFB7":"1f3b7","\uD83E\uDD24":"1f924","\uD83C\uDFB8":"1f3b8","\uD83C\uDFB9":"1f3b9","\uD83C\uDFBA":"1f3ba","\uD83E\uDD23":"1f923","\uD83C\uDFBB":"1f3bb","\uD83C\uDFBC":"1f3bc","\uD83C\uDFBD":"1f3bd","\uD83E\uDD22":"1f922","\uD83C\uDFBE":"1f3be","\uD83C\uDFBF":"1f3bf","\uD83C\uDFC0":"1f3c0","\uD83C\uDFC1":"1f3c1","\uD83E\uDD21":"1f921","\uD83C\uDFC2":"1f3c2","\uD83C\uDFC3":"1f3c3","\uD83C\uDFC4":"1f3c4","\uD83C\uDFC6":"1f3c6","\uD83C\uDFC8":"1f3c8","\uD83C\uDFCA":"1f3ca","\uD83C\uDFE0":"1f3e0","\uD83C\uDFE1":"1f3e1","\uD83C\uDFE2":"1f3e2","\uD83C\uDFE3":"1f3e3","\uD83C\uDFE5":"1f3e5","\uD83C\uDFE6":"1f3e6","\uD83C\uDFE7":"1f3e7","\uD83C\uDFE8":"1f3e8","\uD83C\uDFE9":"1f3e9","\uD83C\uDFEA":"1f3ea","\uD83C\uDFEB":"1f3eb","\uD83C\uDFEC":"1f3ec","\uD83E\uDD20":"1f920","\uD83C\uDFED":"1f3ed","\uD83C\uDFEE":"1f3ee","\uD83C\uDFEF":"1f3ef","\uD83C\uDFF0":"1f3f0","\uD83D\uDC0C":"1f40c","\uD83D\uDC0D":"1f40d","\uD83D\uDC0E":"1f40e","\uD83D\uDC11":"1f411","\uD83D\uDC12":"1f412","\uD83D\uDC14":"1f414","\uD83D\uDC17":"1f417","\uD83D\uDC18":"1f418","\uD83D\uDC19":"1f419","\uD83D\uDC1A":"1f41a","\uD83D\uDC1B":"1f41b","\uD83D\uDC1C":"1f41c","\uD83D\uDC1D":"1f41d","\uD83D\uDC1E":"1f41e","\uD83D\uDC1F":"1f41f","\uD83D\uDC20":"1f420","\uD83D\uDC21":"1f421","\uD83D\uDC22":"1f422","\uD83D\uDC23":"1f423","\uD83D\uDC24":"1f424","\uD83D\uDC25":"1f425","\uD83D\uDC26":"1f426","\uD83D\uDC27":"1f427","\uD83D\uDC28":"1f428","\uD83D\uDC29":"1f429","\uD83D\uDC2B":"1f42b","\uD83D\uDC2C":"1f42c","\uD83D\uDC2D":"1f42d","\uD83D\uDC2E":"1f42e","\uD83D\uDC2F":"1f42f","\uD83D\uDC30":"1f430","\uD83D\uDC31":"1f431","\uD83D\uDC32":"1f432","\uD83D\uDC33":"1f433","\uD83D\uDC34":"1f434","\uD83D\uDC35":"1f435","\uD83D\uDC36":"1f436","\uD83D\uDC37":"1f437","\uD83D\uDC38":"1f438","\uD83D\uDC39":"1f439","\uD83D\uDC3A":"1f43a","\uD83D\uDC3B":"1f43b","\uD83D\uDC3C":"1f43c","\uD83D\uDC3D":"1f43d","\uD83D\uDC3E":"1f43e","\uD83D\uDC40":"1f440","\uD83D\uDC42":"1f442","\uD83D\uDC43":"1f443","\uD83D\uDC44":"1f444","\uD83D\uDC45":"1f445","\uD83D\uDC46":"1f446","\uD83D\uDC47":"1f447","\uD83D\uDC48":"1f448","\uD83D\uDC49":"1f449","\uD83D\uDC4A":"1f44a","\uD83D\uDC4B":"1f44b","\uD83D\uDC4C":"1f44c","\uD83D\uDC4D":"1f44d","\uD83D\uDC4E":"1f44e","\uD83D\uDC4F":"1f44f","\uD83D\uDC50":"1f450","\uD83D\uDC51":"1f451","\uD83D\uDC52":"1f452","\uD83D\uDC53":"1f453","\uD83D\uDC54":"1f454","\uD83D\uDC55":"1f455","\uD83D\uDC56":"1f456","\uD83D\uDC57":"1f457","\uD83D\uDC58":"1f458","\uD83D\uDC59":"1f459","\uD83D\uDC5A":"1f45a","\uD83D\uDC5B":"1f45b","\uD83D\uDC5C":"1f45c","\uD83D\uDC5D":"1f45d","\uD83D\uDC5E":"1f45e","\uD83D\uDC5F":"1f45f","\uD83D\uDC60":"1f460","\uD83D\uDC61":"1f461","\uD83D\uDC62":"1f462","\uD83D\uDC63":"1f463","\uD83D\uDC64":"1f464","\uD83D\uDC66":"1f466","\uD83D\uDC67":"1f467","\uD83D\uDC68":"1f468","\uD83D\uDC69":"1f469","\uD83D\uDC6A":"1f46a","\uD83D\uDC6B":"1f46b","\uD83D\uDC6E":"1f46e","\uD83D\uDC6F":"1f46f","\uD83D\uDC70":"1f470","\uD83D\uDC71":"1f471","\uD83D\uDC72":"1f472","\uD83D\uDC73":"1f473","\uD83D\uDC74":"1f474","\uD83D\uDC75":"1f475","\uD83D\uDC76":"1f476","\uD83D\uDC77":"1f477","\uD83D\uDC78":"1f478","\uD83D\uDC79":"1f479","\uD83D\uDC7A":"1f47a","\uD83D\uDC7B":"1f47b","\uD83D\uDC7C":"1f47c","\uD83D\uDC7D":"1f47d","\uD83D\uDC7E":"1f47e","\uD83D\uDC7F":"1f47f","\uD83D\uDC80":"1f480","\uD83D\uDCC7":"1f4c7","\uD83D\uDC81":"1f481","\uD83D\uDC82":"1f482","\uD83D\uDC83":"1f483","\uD83D\uDC84":"1f484","\uD83D\uDC85":"1f485","\uD83D\uDCD2":"1f4d2","\uD83D\uDC86":"1f486","\uD83D\uDCD3":"1f4d3","\uD83D\uDC87":"1f487","\uD83D\uDCD4":"1f4d4","\uD83D\uDC88":"1f488","\uD83D\uDCD5":"1f4d5","\uD83D\uDC89":"1f489","\uD83D\uDCD6":"1f4d6","\uD83D\uDC8A":"1f48a","\uD83D\uDCD7":"1f4d7","\uD83D\uDC8B":"1f48b","\uD83D\uDCD8":"1f4d8","\uD83D\uDC8C":"1f48c","\uD83D\uDCD9":"1f4d9","\uD83D\uDC8D":"1f48d","\uD83D\uDCDA":"1f4da","\uD83D\uDC8E":"1f48e","\uD83D\uDCDB":"1f4db","\uD83D\uDC8F":"1f48f","\uD83D\uDCDC":"1f4dc","\uD83D\uDC90":"1f490","\uD83D\uDCDD":"1f4dd","\uD83D\uDC91":"1f491","\uD83D\uDCDE":"1f4de","\uD83D\uDC92":"1f492","\uD83D\uDCDF":"1f4df","\uD83D\uDCE0":"1f4e0","\uD83D\uDC93":"1f493","\uD83D\uDCE1":"1f4e1","\uD83D\uDCE2":"1f4e2","\uD83D\uDC94":"1f494","\uD83D\uDCE3":"1f4e3","\uD83D\uDCE4":"1f4e4","\uD83D\uDC95":"1f495","\uD83D\uDCE5":"1f4e5","\uD83D\uDCE6":"1f4e6","\uD83D\uDC96":"1f496","\uD83D\uDCE7":"1f4e7","\uD83D\uDCE8":"1f4e8","\uD83D\uDC97":"1f497","\uD83D\uDCE9":"1f4e9","\uD83D\uDCEA":"1f4ea","\uD83D\uDC98":"1f498","\uD83D\uDCEB":"1f4eb","\uD83D\uDCEE":"1f4ee","\uD83D\uDC99":"1f499","\uD83D\uDCF0":"1f4f0","\uD83D\uDCF1":"1f4f1","\uD83D\uDC9A":"1f49a","\uD83D\uDCF2":"1f4f2","\uD83D\uDCF3":"1f4f3","\uD83D\uDC9B":"1f49b","\uD83D\uDCF4":"1f4f4","\uD83D\uDCF6":"1f4f6","\uD83D\uDC9C":"1f49c","\uD83D\uDCF7":"1f4f7","\uD83D\uDCF9":"1f4f9","\uD83D\uDC9D":"1f49d","\uD83D\uDCFA":"1f4fa","\uD83D\uDCFB":"1f4fb","\uD83D\uDC9E":"1f49e","\uD83D\uDCFC":"1f4fc","\uD83D\uDD03":"1f503","\uD83D\uDC9F":"1f49f","\uD83D\uDD0A":"1f50a","\uD83D\uDD0B":"1f50b","\uD83D\uDCA0":"1f4a0","\uD83D\uDD0C":"1f50c","\uD83D\uDD0D":"1f50d","\uD83D\uDCA1":"1f4a1","\uD83D\uDD0E":"1f50e","\uD83D\uDD0F":"1f50f","\uD83D\uDCA2":"1f4a2","\uD83D\uDD10":"1f510","\uD83D\uDD11":"1f511","\uD83D\uDCA3":"1f4a3","\uD83D\uDD12":"1f512","\uD83D\uDD13":"1f513","\uD83D\uDCA4":"1f4a4","\uD83D\uDD14":"1f514","\uD83D\uDD16":"1f516","\uD83D\uDCA5":"1f4a5","\uD83D\uDD17":"1f517","\uD83D\uDD18":"1f518","\uD83D\uDCA6":"1f4a6","\uD83D\uDD19":"1f519","\uD83D\uDD1A":"1f51a","\uD83D\uDCA7":"1f4a7","\uD83D\uDD1B":"1f51b","\uD83D\uDD1C":"1f51c","\uD83D\uDCA8":"1f4a8","\uD83D\uDD1D":"1f51d","\uD83D\uDD1E":"1f51e","\uD83D\uDCA9":"1f4a9","\uD83D\uDD1F":"1f51f","\uD83D\uDCAA":"1f4aa","\uD83D\uDD20":"1f520","\uD83D\uDD21":"1f521","\uD83D\uDCAB":"1f4ab","\uD83D\uDD22":"1f522","\uD83D\uDD23":"1f523","\uD83D\uDCAC":"1f4ac","\uD83D\uDD24":"1f524","\uD83D\uDD25":"1f525","\uD83D\uDCAE":"1f4ae","\uD83D\uDD26":"1f526","\uD83D\uDD27":"1f527","\uD83D\uDCAF":"1f4af","\uD83D\uDD28":"1f528","\uD83D\uDD29":"1f529","\uD83D\uDCB0":"1f4b0","\uD83D\uDD2A":"1f52a","\uD83D\uDD2B":"1f52b","\uD83D\uDCB1":"1f4b1","\uD83D\uDD2E":"1f52e","\uD83D\uDCB2":"1f4b2","\uD83D\uDD2F":"1f52f","\uD83D\uDCB3":"1f4b3","\uD83D\uDD30":"1f530","\uD83D\uDD31":"1f531","\uD83D\uDCB4":"1f4b4","\uD83D\uDD32":"1f532","\uD83D\uDD33":"1f533","\uD83D\uDCB5":"1f4b5","\uD83D\uDD34":"1f534","\uD83D\uDD35":"1f535","\uD83D\uDCB8":"1f4b8","\uD83D\uDD36":"1f536","\uD83D\uDD37":"1f537","\uD83D\uDCB9":"1f4b9","\uD83D\uDD38":"1f538","\uD83D\uDD39":"1f539","\uD83D\uDCBA":"1f4ba","\uD83D\uDD3A":"1f53a","\uD83D\uDD3B":"1f53b","\uD83D\uDCBB":"1f4bb","\uD83D\uDD3C":"1f53c","\uD83D\uDCBC":"1f4bc","\uD83D\uDD3D":"1f53d","\uD83D\uDD50":"1f550","\uD83D\uDCBD":"1f4bd","\uD83D\uDD51":"1f551","\uD83D\uDCBE":"1f4be","\uD83D\uDD52":"1f552","\uD83D\uDCBF":"1f4bf","\uD83D\uDD53":"1f553","\uD83D\uDCC0":"1f4c0","\uD83D\uDD54":"1f554","\uD83D\uDD55":"1f555","\uD83D\uDCC1":"1f4c1","\uD83D\uDD56":"1f556","\uD83D\uDD57":"1f557","\uD83D\uDCC2":"1f4c2","\uD83D\uDD58":"1f558","\uD83D\uDD59":"1f559","\uD83D\uDCC3":"1f4c3","\uD83D\uDD5A":"1f55a","\uD83D\uDD5B":"1f55b","\uD83D\uDCC4":"1f4c4","\uD83D\uDDFB":"1f5fb","\uD83D\uDDFC":"1f5fc","\uD83D\uDCC5":"1f4c5","\uD83D\uDDFD":"1f5fd","\uD83D\uDDFE":"1f5fe","\uD83D\uDCC6":"1f4c6","\uD83D\uDDFF":"1f5ff","\uD83D\uDE01":"1f601","\uD83D\uDE02":"1f602","\uD83D\uDE03":"1f603","\uD83D\uDCC8":"1f4c8","\uD83D\uDE04":"1f604","\uD83D\uDE05":"1f605","\uD83D\uDCC9":"1f4c9","\uD83D\uDE06":"1f606","\uD83D\uDE09":"1f609","\uD83D\uDCCA":"1f4ca","\uD83D\uDE0A":"1f60a","\uD83D\uDE0B":"1f60b","\uD83D\uDCCB":"1f4cb","\uD83D\uDE0C":"1f60c","\uD83D\uDE0D":"1f60d","\uD83D\uDCCC":"1f4cc","\uD83D\uDE0F":"1f60f","\uD83D\uDE12":"1f612","\uD83D\uDCCD":"1f4cd","\uD83D\uDE13":"1f613","\uD83D\uDE14":"1f614","\uD83D\uDCCE":"1f4ce","\uD83D\uDE16":"1f616","\uD83D\uDE18":"1f618","\uD83D\uDCCF":"1f4cf","\uD83D\uDE1A":"1f61a","\uD83D\uDE1C":"1f61c","\uD83D\uDCD0":"1f4d0","\uD83D\uDE1D":"1f61d","\uD83D\uDE1E":"1f61e","\uD83D\uDCD1":"1f4d1","\uD83D\uDE20":"1f620","\uD83D\uDE21":"1f621","\uD83D\uDE22":"1f622","\uD83D\uDE23":"1f623","\uD83D\uDE24":"1f624","\uD83D\uDE25":"1f625","\uD83D\uDE28":"1f628","\uD83D\uDE29":"1f629","\uD83D\uDE2A":"1f62a","\uD83D\uDE2B":"1f62b","\uD83D\uDE2D":"1f62d","\uD83D\uDE30":"1f630","\uD83D\uDE31":"1f631","\uD83D\uDE32":"1f632","\uD83D\uDE33":"1f633","\uD83D\uDE35":"1f635","\uD83D\uDE37":"1f637","\uD83D\uDE38":"1f638","\uD83D\uDE39":"1f639","\uD83D\uDE3A":"1f63a","\uD83D\uDE3B":"1f63b","\uD83D\uDE3C":"1f63c","\uD83D\uDE3D":"1f63d","\uD83D\uDE3E":"1f63e","\uD83D\uDE3F":"1f63f","\uD83D\uDE40":"1f640","\uD83D\uDE45":"1f645","\uD83D\uDE46":"1f646","\uD83D\uDE47":"1f647","\uD83D\uDE48":"1f648","\uD83D\uDE49":"1f649","\uD83D\uDE4A":"1f64a","\uD83D\uDE4B":"1f64b","\uD83D\uDE4C":"1f64c","\uD83D\uDE4D":"1f64d","\uD83D\uDE4E":"1f64e","\uD83D\uDE4F":"1f64f","\uD83D\uDE80":"1f680","\uD83D\uDE83":"1f683","\uD83D\uDE84":"1f684","\uD83D\uDE85":"1f685","\uD83D\uDE87":"1f687","\uD83D\uDE89":"1f689","\uD83D\uDE8C":"1f68c","\uD83D\uDE8F":"1f68f","\uD83D\uDE91":"1f691","\uD83D\uDE92":"1f692","\uD83D\uDE93":"1f693","\uD83D\uDE95":"1f695","\uD83D\uDE97":"1f697","\uD83D\uDE99":"1f699","\uD83D\uDE9A":"1f69a","\uD83D\uDEA2":"1f6a2","\uD83D\uDEA4":"1f6a4","\uD83D\uDEA5":"1f6a5","\uD83D\uDEA7":"1f6a7","\uD83D\uDEA8":"1f6a8","\uD83D\uDEA9":"1f6a9","\uD83D\uDEAA":"1f6aa","\uD83D\uDEAB":"1f6ab","\uD83D\uDEAC":"1f6ac","\uD83D\uDEAD":"1f6ad","\uD83D\uDEB2":"1f6b2","\uD83D\uDEB6":"1f6b6","\uD83D\uDEB9":"1f6b9","\uD83D\uDEBA":"1f6ba","\uD83D\uDEBB":"1f6bb","\uD83D\uDEBC":"1f6bc","\uD83D\uDEBD":"1f6bd","\uD83D\uDEBE":"1f6be","\uD83D\uDEC0":"1f6c0","\uD83E\uDD18":"1f918","\uD83D\uDE00":"1f600","\uD83D\uDE07":"1f607","\uD83D\uDE08":"1f608","\uD83D\uDE0E":"1f60e","\uD83D\uDE10":"1f610","\uD83D\uDE11":"1f611","\uD83D\uDE15":"1f615","\uD83D\uDE17":"1f617","\uD83D\uDE19":"1f619","\uD83D\uDE1B":"1f61b","\uD83D\uDE1F":"1f61f","\uD83D\uDE26":"1f626","\uD83D\uDE27":"1f627","\uD83D\uDE2C":"1f62c","\uD83D\uDE2E":"1f62e","\uD83D\uDE2F":"1f62f","\uD83D\uDE34":"1f634","\uD83D\uDE36":"1f636","\uD83D\uDE81":"1f681","\uD83D\uDE82":"1f682","\uD83D\uDE86":"1f686","\uD83D\uDE88":"1f688","\uD83D\uDE8A":"1f68a","\uD83D\uDE8D":"1f68d","\uD83D\uDE8E":"1f68e","\uD83D\uDE90":"1f690","\uD83D\uDE94":"1f694","\uD83D\uDE96":"1f696","\uD83D\uDE98":"1f698","\uD83D\uDE9B":"1f69b","\uD83D\uDE9C":"1f69c","\uD83D\uDE9D":"1f69d","\uD83D\uDE9E":"1f69e","\uD83D\uDE9F":"1f69f","\uD83D\uDEA0":"1f6a0","\uD83D\uDEA1":"1f6a1","\uD83D\uDEA3":"1f6a3","\uD83D\uDEA6":"1f6a6","\uD83D\uDEAE":"1f6ae","\uD83D\uDEAF":"1f6af","\uD83D\uDEB0":"1f6b0","\uD83D\uDEB1":"1f6b1","\uD83D\uDEB3":"1f6b3","\uD83D\uDEB4":"1f6b4","\uD83D\uDEB5":"1f6b5","\uD83D\uDEB7":"1f6b7","\uD83D\uDEB8":"1f6b8","\uD83D\uDEBF":"1f6bf","\uD83D\uDEC1":"1f6c1","\uD83D\uDEC2":"1f6c2","\uD83D\uDEC3":"1f6c3","\uD83D\uDEC4":"1f6c4","\uD83D\uDEC5":"1f6c5","\uD83C\uDF0D":"1f30d","\uD83C\uDF0E":"1f30e","\uD83C\uDF10":"1f310","\uD83C\uDF12":"1f312","\uD83C\uDF16":"1f316","\uD83C\uDF17":"1f317","\uD83C\uDF18":"1f318","\uD83C\uDF1A":"1f31a","\uD83C\uDF1C":"1f31c","\uD83C\uDF1D":"1f31d","\uD83C\uDF1E":"1f31e","\uD83C\uDF32":"1f332","\uD83C\uDF33":"1f333","\uD83C\uDF4B":"1f34b","\uD83C\uDF50":"1f350","\uD83C\uDF7C":"1f37c","\uD83C\uDFC7":"1f3c7","\uD83C\uDFC9":"1f3c9","\uD83C\uDFE4":"1f3e4","\uD83D\uDC00":"1f400","\uD83D\uDC01":"1f401","\uD83D\uDC02":"1f402","\uD83D\uDC03":"1f403","\uD83D\uDC04":"1f404","\uD83D\uDC05":"1f405","\uD83D\uDC06":"1f406","\uD83D\uDC07":"1f407","\uD83D\uDC08":"1f408","\uD83D\uDC09":"1f409","\uD83D\uDC0A":"1f40a","\uD83D\uDC0B":"1f40b","\uD83D\uDC0F":"1f40f","\uD83D\uDC10":"1f410","\uD83D\uDC13":"1f413","\uD83D\uDC15":"1f415","\uD83D\uDC16":"1f416","\uD83D\uDC2A":"1f42a","\uD83D\uDC65":"1f465","\uD83D\uDC6C":"1f46c","\uD83D\uDC6D":"1f46d","\uD83D\uDCAD":"1f4ad","\uD83D\uDCB6":"1f4b6","\uD83D\uDCB7":"1f4b7","\uD83D\uDCEC":"1f4ec","\uD83D\uDCED":"1f4ed","\uD83D\uDCEF":"1f4ef","\uD83D\uDCF5":"1f4f5","\uD83D\uDD00":"1f500","\uD83D\uDD01":"1f501","\uD83D\uDD02":"1f502","\uD83D\uDD04":"1f504","\uD83D\uDD05":"1f505","\uD83D\uDD06":"1f506","\uD83D\uDD07":"1f507","\uD83D\uDD09":"1f509","\uD83D\uDD15":"1f515","\uD83D\uDD2C":"1f52c","\uD83D\uDD2D":"1f52d","\uD83D\uDD5C":"1f55c","\uD83D\uDD5D":"1f55d","\uD83D\uDD5E":"1f55e","\uD83D\uDD5F":"1f55f","\uD83D\uDD60":"1f560","\uD83D\uDD61":"1f561","\uD83D\uDD62":"1f562","\uD83D\uDD63":"1f563","\uD83D\uDD64":"1f564","\uD83D\uDD65":"1f565","\uD83D\uDD66":"1f566","\uD83D\uDD67":"1f567","\uD83D\uDD08":"1f508","\uD83D\uDE8B":"1f68b","\uD83C\uDFC5":"1f3c5","\uD83C\uDFF4":"1f3f4","\uD83D\uDCF8":"1f4f8","\uD83D\uDECC":"1f6cc","\uD83D\uDD95":"1f595","\uD83D\uDD96":"1f596","\uD83D\uDE41":"1f641","\uD83D\uDE42":"1f642","\uD83D\uDEEB":"1f6eb","\uD83D\uDEEC":"1f6ec","\uD83C\uDFFB":"1f3fb","\uD83C\uDFFC":"1f3fc","\uD83C\uDFFD":"1f3fd","\uD83C\uDFFE":"1f3fe","\uD83C\uDFFF":"1f3ff","\uD83D\uDE43":"1f643","\uD83E\uDD11":"1f911","\uD83E\uDD13":"1f913","\uD83E\uDD17":"1f917","\uD83D\uDE44":"1f644","\uD83E\uDD14":"1f914","\uD83E\uDD10":"1f910","\uD83E\uDD12":"1f912","\uD83E\uDD15":"1f915","\uD83E\uDD16":"1f916","\uD83E\uDD81":"1f981","\uD83E\uDD84":"1f984","\uD83E\uDD82":"1f982","\uD83E\uDD80":"1f980","\uD83E\uDD83":"1f983","\uD83E\uDDC0":"1f9c0","\uD83C\uDF2D":"1f32d","\uD83C\uDF2E":"1f32e","\uD83C\uDF2F":"1f32f","\uD83C\uDF7F":"1f37f","\uD83C\uDF7E":"1f37e","\uD83C\uDFF9":"1f3f9","\uD83C\uDFFA":"1f3fa","\uD83D\uDED0":"1f6d0","\uD83D\uDD4B":"1f54b","\uD83D\uDD4C":"1f54c","\uD83D\uDD4D":"1f54d","\uD83D\uDD4E":"1f54e","\uD83D\uDCFF":"1f4ff","\uD83C\uDFCF":"1f3cf","\uD83C\uDFD0":"1f3d0","\uD83C\uDFD1":"1f3d1","\uD83C\uDFD2":"1f3d2","\uD83C\uDFD3":"1f3d3","\uD83C\uDFF8":"1f3f8","\uD83E\uDD41":"1f941","\uD83E\uDD90":"1f990","\uD83E\uDD91":"1f991","\uD83E\uDD5A":"1f95a","\uD83E\uDD5B":"1f95b","\uD83E\uDD5C":"1f95c","\uD83E\uDD5D":"1f95d","\uD83E\uDD5E":"1f95e","\uD83C\uDDFC":"1f1fc","\uD83C\uDDFB":"1f1fb","\uD83C\uDDFA":"1f1fa","\uD83C\uDDF9":"1f1f9","\uD83C\uDDF8":"1f1f8","\uD83C\uDDF7":"1f1f7","\uD83C\uDDF6":"1f1f6","\uD83C\uDDF5":"1f1f5","\uD83C\uDDF4":"1f1f4","\uD83C\uDDF3":"1f1f3","\uD83C\uDDF2":"1f1f2","\uD83C\uDDF1":"1f1f1","\uD83C\uDDF0":"1f1f0","\uD83C\uDDEF":"1f1ef","\uD83C\uDDEE":"1f1ee","\uD83C\uDDED":"1f1ed","\uD83C\uDDEC":"1f1ec","\uD83C\uDDEB":"1f1eb","\uD83C\uDDEA":"1f1ea","\uD83C\uDDE9":"1f1e9","\uD83C\uDDE8":"1f1e8","\uD83C\uDDE7":"1f1e7","\uD83C\uDDE6":"1f1e6","\u23E9":"23e9","\u23EA":"23ea","\u23EB":"23eb","\u23EC":"23ec","\u23F0":"23f0","\u23F3":"23f3","*":"002a","\u26CE":"26ce","\u2705":"2705","\u270A":"270a","\u270B":"270b","\u2728":"2728","\u274C":"274c","\u274E":"274e","\u2753":"2753","\u2754":"2754","\u2755":"2755","\u2795":"2795","\u2796":"2796","\u2797":"2797","\u27B0":"27b0","#":"0023","\u27BF":"27bf","9":"0039","8":"0038","7":"0037","6":"0036","5":"0035","4":"0034","3":"0033","2":"0032","1":"0031","0":"0030","\u00A9":"00a9","\u00AE":"00ae","\u203C":"203c","\u2049":"2049","\u2122":"2122","\u2139":"2139","\u2194":"2194","\u2195":"2195","\u2196":"2196","\u2197":"2197","\u2198":"2198","\u2199":"2199","\u21A9":"21a9","\u21AA":"21aa","\u231A":"231a","\u231B":"231b","\u24C2":"24c2","\u25AA":"25aa","\u25AB":"25ab","\u25B6":"25b6","\u25C0":"25c0","\u25FB":"25fb","\u25FC":"25fc","\u25FD":"25fd","\u25FE":"25fe","\u2600":"2600","\u2601":"2601","\u260E":"260e","\u2611":"2611","\u2614":"2614","\u2615":"2615","\u261D":"261d","\u263A":"263a","\u2648":"2648","\u2649":"2649","\u264A":"264a","\u264B":"264b","\u264C":"264c","\u264D":"264d","\u264E":"264e","\u264F":"264f","\u2650":"2650","\u2651":"2651","\u2652":"2652","\u2653":"2653","\u2660":"2660","\u2663":"2663","\u2665":"2665","\u2666":"2666","\u2668":"2668","\u267B":"267b","\u267F":"267f","\u2693":"2693","\u26A0":"26a0","\u26A1":"26a1","\u26AA":"26aa","\u26AB":"26ab","\u26BD":"26bd","\u26BE":"26be","\u26C4":"26c4","\u26C5":"26c5","\u26D4":"26d4","\u26EA":"26ea","\u26F2":"26f2","\u26F3":"26f3","\u26F5":"26f5","\u26FA":"26fa","\u26FD":"26fd","\u2702":"2702","\u2708":"2708","\u2709":"2709","\u270C":"270c","\u270F":"270f","\u2712":"2712","\u2714":"2714","\u2716":"2716","\u2733":"2733","\u2734":"2734","\u2744":"2744","\u2747":"2747","\u2757":"2757","\u2764":"2764","\u27A1":"27a1","\u2934":"2934","\u2935":"2935","\u2B05":"2b05","\u2B06":"2b06","\u2B07":"2b07","\u2B1B":"2b1b","\u2B1C":"2b1c","\u2B50":"2b50","\u2B55":"2b55","\u3030":"3030","\u303D":"303d","\u3297":"3297","\u3299":"3299","\uD83C\uDC04":"1f004","\uD83C\uDD7F":"1f17f","\uD83C\uDE02":"1f202","\uD83C\uDE1A":"1f21a","\uD83C\uDE2F":"1f22f","\uD83C\uDE37":"1f237","\uD83C\uDF9E":"1f39e","\uD83C\uDF9F":"1f39f","\uD83C\uDFCB":"1f3cb","\uD83C\uDFCC":"1f3cc","\uD83C\uDFCD":"1f3cd","\uD83C\uDFCE":"1f3ce","\uD83C\uDF96":"1f396","\uD83C\uDF97":"1f397","\uD83C\uDF36":"1f336","\uD83C\uDF27":"1f327","\uD83C\uDF28":"1f328","\uD83C\uDF29":"1f329","\uD83C\uDF2A":"1f32a","\uD83C\uDF2B":"1f32b","\uD83C\uDF2C":"1f32c","\uD83D\uDC3F":"1f43f","\uD83D\uDD77":"1f577","\uD83D\uDD78":"1f578","\uD83C\uDF21":"1f321","\uD83C\uDF99":"1f399","\uD83C\uDF9A":"1f39a","\uD83C\uDF9B":"1f39b","\uD83C\uDFF3":"1f3f3","\uD83C\uDFF5":"1f3f5","\uD83C\uDFF7":"1f3f7","\uD83D\uDCFD":"1f4fd","\u271D":"271d","\uD83D\uDD49":"1f549","\uD83D\uDD4A":"1f54a","\uD83D\uDD6F":"1f56f","\uD83D\uDD70":"1f570","\uD83D\uDD73":"1f573","\uD83D\uDD76":"1f576","\uD83D\uDD79":"1f579","\uD83D\uDD87":"1f587","\uD83D\uDD8A":"1f58a","\uD83D\uDD8B":"1f58b","\uD83D\uDD8C":"1f58c","\uD83D\uDD8D":"1f58d","\uD83D\uDDA5":"1f5a5","\uD83D\uDDA8":"1f5a8","\u2328":"2328","\uD83D\uDDB2":"1f5b2","\uD83D\uDDBC":"1f5bc","\uD83D\uDDC2":"1f5c2","\uD83D\uDDC3":"1f5c3","\uD83D\uDDC4":"1f5c4","\uD83D\uDDD1":"1f5d1","\uD83D\uDDD2":"1f5d2","\uD83D\uDDD3":"1f5d3","\uD83D\uDDDC":"1f5dc","\uD83D\uDDDD":"1f5dd","\uD83D\uDDDE":"1f5de","\uD83D\uDDE1":"1f5e1","\uD83D\uDDE3":"1f5e3","\uD83D\uDDE8":"1f5e8","\uD83D\uDDEF":"1f5ef","\uD83D\uDDF3":"1f5f3","\uD83D\uDDFA":"1f5fa","\uD83D\uDEE0":"1f6e0","\uD83D\uDEE1":"1f6e1","\uD83D\uDEE2":"1f6e2","\uD83D\uDEF0":"1f6f0","\uD83C\uDF7D":"1f37d","\uD83D\uDC41":"1f441","\uD83D\uDD74":"1f574","\uD83D\uDD75":"1f575","\u270D":"270d","\uD83D\uDD90":"1f590","\uD83C\uDFD4":"1f3d4","\uD83C\uDFD5":"1f3d5","\uD83C\uDFD6":"1f3d6","\uD83C\uDFD7":"1f3d7","\uD83C\uDFD8":"1f3d8","\uD83C\uDFD9":"1f3d9","\uD83C\uDFDA":"1f3da","\uD83C\uDFDB":"1f3db","\uD83C\uDFDC":"1f3dc","\uD83C\uDFDD":"1f3dd","\uD83C\uDFDE":"1f3de","\uD83C\uDFDF":"1f3df","\uD83D\uDECB":"1f6cb","\uD83D\uDECD":"1f6cd","\uD83D\uDECE":"1f6ce","\uD83D\uDECF":"1f6cf","\uD83D\uDEE3":"1f6e3","\uD83D\uDEE4":"1f6e4","\uD83D\uDEE5":"1f6e5","\uD83D\uDEE9":"1f6e9","\uD83D\uDEF3":"1f6f3","\u23CF":"23cf","\u23ED":"23ed","\u23EE":"23ee","\u23EF":"23ef","\u23F1":"23f1","\u23F2":"23f2","\u23F8":"23f8","\u23F9":"23f9","\u23FA":"23fa","\u2602":"2602","\u2603":"2603","\u2604":"2604","\u2618":"2618","\u2620":"2620","\u2622":"2622","\u2623":"2623","\u2626":"2626","\u262A":"262a","\u262E":"262e","\u262F":"262f","\u2638":"2638","\u2639":"2639","\u2692":"2692","\u2694":"2694","\u2696":"2696","\u2697":"2697","\u2699":"2699","\u269B":"269b","\u269C":"269c","\u26B0":"26b0","\u26B1":"26b1","\u26C8":"26c8","\u26CF":"26cf","\u26D1":"26d1","\u26D3":"26d3","\u26E9":"26e9","\u26F0":"26f0","\u26F1":"26f1","\u26F4":"26f4","\u26F7":"26f7","\u26F8":"26f8","\u26F9":"26f9","\u2721":"2721","\u2763":"2763","\uD83C\uDF24":"1f324","\uD83C\uDF25":"1f325","\uD83C\uDF26":"1f326","\uD83D\uDDB1":"1f5b1"};
    ns.imagePathPNG = '//cdn.jsdelivr.net/emojione/assets/png/';
    ns.imagePathSVG = '//cdn.jsdelivr.net/emojione/assets/svg/';
    ns.imagePathSVGSprites = './../assets/sprites/emojione.sprites.svg';
    ns.imageType = 'png'; // or svg
    ns.sprites = false; // if this is true then sprite markup will be used (if SVG image type is set then you must include the SVG sprite file locally)
    ns.unicodeAlt = true; // use the unicode char as the alt attribute (makes copy and pasting the resulting text better)
    ns.ascii = false; // change to true to convert ascii smileys
    ns.cacheBustParam = '?v=2.2.6'; // you can [optionally] modify this to force browsers to refresh their cache. it will be appended to the send of the filenames

    ns.regShortNames = new RegExp("<object[^>]*>.*?<\/object>|<span[^>]*>.*?<\/span>|<(?:object|embed|svg|img|div|span|p|a)[^>]*>|("+ns.shortnames+")", "gi");
    ns.regAscii = new RegExp("<object[^>]*>.*?<\/object>|<span[^>]*>.*?<\/span>|<(?:object|embed|svg|img|div|span|p|a)[^>]*>|((\\s|^)"+ns.asciiRegexp+"(?=\\s|$|[!,.?]))", "g");
    ns.regUnicode = new RegExp("<object[^>]*>.*?<\/object>|<span[^>]*>.*?<\/span>|<(?:object|embed|svg|img|div|span|p|a)[^>]*>|("+ns.unicodeRegexp+")", "gi");

    ns.toImage = function(str) {
        str = ns.unicodeToImage(str);
        str = ns.shortnameToImage(str);
        return str;
    };

    // Uses toShort to transform all unicode into a standard shortname
    // then transforms the shortname into unicode
    // This is done for standardization when converting several unicode types
    ns.unifyUnicode = function(str) {
        str = ns.toShort(str);
        str = ns.shortnameToUnicode(str);
        return str;
    };

    // Replace shortnames (:wink:) with Ascii equivalents ( ;^) )
    // Useful for systems that dont support unicode nor images
    ns.shortnameToAscii = function(str) {
        var unicode,
        // something to keep in mind here is that array flip will destroy
        // half of the ascii text "emojis" because the unicode numbers are duplicated
        // this is ok for what it's being used for
            unicodeToAscii = ns.objectFlip(ns.asciiList);

        str = str.replace(ns.regShortNames, function(shortname) {
            if( (typeof shortname === 'undefined') || (shortname === '') || (!(shortname in ns.emojioneList)) ) {
                // if the shortname doesnt exist just return the entire match
                return shortname;
            }
            else {
                unicode = ns.emojioneList[shortname].unicode[ns.emojioneList[shortname].unicode.length-1];
                if(typeof unicodeToAscii[unicode] !== 'undefined') {
                    return unicodeToAscii[unicode];
                } else {
                    return shortname;
                }
            }
        });
        return str;
    };

    // will output unicode from shortname
    // useful for sending emojis back to mobile devices
    ns.shortnameToUnicode = function(str) {
        // replace regular shortnames first
        var unicode;
        str = str.replace(ns.regShortNames, function(shortname) {
            if( (typeof shortname === 'undefined') || (shortname === '') || (!(shortname in ns.emojioneList)) ) {
                // if the shortname doesnt exist just return the entire match
                return shortname;
            }
            unicode = ns.emojioneList[shortname].unicode[0].toUpperCase();
            return ns.convert(unicode);
        });

        // if ascii smileys are turned on, then we'll replace them!
        if (ns.ascii) {

            str = str.replace(ns.regAscii, function(entire, m1, m2, m3) {
                if( (typeof m3 === 'undefined') || (m3 === '') || (!(ns.unescapeHTML(m3) in ns.asciiList)) ) {
                    // if the shortname doesnt exist just return the entire match
                    return entire;
                }

                m3 = ns.unescapeHTML(m3);
                unicode = ns.asciiList[m3].toUpperCase();
                return m2+ns.convert(unicode);
            });
        }

        return str;
    };

    ns.shortnameToImage = function(str) {
        // replace regular shortnames first
        var replaceWith,unicode,alt;
        str = str.replace(ns.regShortNames, function(shortname) {
            if( (typeof shortname === 'undefined') || (shortname === '') || (!(shortname in ns.emojioneList)) ) {
                // if the shortname doesnt exist just return the entire match
                return shortname;
            }
            else {
                unicode = ns.emojioneList[shortname].unicode[ns.emojioneList[shortname].unicode.length-1];

                // depending on the settings, we'll either add the native unicode as the alt tag, otherwise the shortname
                alt = (ns.unicodeAlt) ? ns.convert(unicode.toUpperCase()) : shortname;

                if(ns.imageType === 'png') {
                    if(ns.sprites) {
                        replaceWith = '<span class="emojione emojione-'+unicode+'" title="'+shortname+'">'+alt+'</span>';
                    }
                    else {
                        replaceWith = '<img class="emojione" alt="'+alt+'" src="'+ns.imagePathPNG+unicode+'.png'+ns.cacheBustParam+'"/>';
                    }
                }
                else {
                    // svg
                    if(ns.sprites) {
                        replaceWith = '<svg class="emojione"><description>'+alt+'</description><use xlink:href="'+ns.imagePathSVGSprites+'#emoji-'+unicode+'"></use></svg>';
                    }
                    else {
                        replaceWith = '<object class="emojione" data="'+ns.imagePathSVG+unicode+'.svg'+ns.cacheBustParam+'" type="image/svg+xml" standby="'+alt+'">'+alt+'</object>';
                    }
                }

                return replaceWith;
            }
        });

        // if ascii smileys are turned on, then we'll replace them!
        if (ns.ascii) {

            str = str.replace(ns.regAscii, function(entire, m1, m2, m3) {
                if( (typeof m3 === 'undefined') || (m3 === '') || (!(ns.unescapeHTML(m3) in ns.asciiList)) ) {
                    // if the shortname doesnt exist just return the entire match
                    return entire;
                }

                m3 = ns.unescapeHTML(m3);
                unicode = ns.asciiList[m3];

                // depending on the settings, we'll either add the native unicode as the alt tag, otherwise the shortname
                alt = (ns.unicodeAlt) ? ns.convert(unicode.toUpperCase()) : ns.escapeHTML(m3);

                if(ns.imageType === 'png') {
                    if(ns.sprites) {
                        replaceWith = m2+'<span class="emojione emojione-'+unicode+'" title="'+ns.escapeHTML(m3)+'">'+alt+'</span>';
                    }
                    else {
                        replaceWith = m2+'<img class="emojione" alt="'+alt+'" src="'+ns.imagePathPNG+unicode+'.png'+ns.cacheBustParam+'"/>';
                    }
                }
                else {
                    // svg
                    if(ns.sprites) {
                        replaceWith = '<svg class="emojione"><description>'+alt+'</description><use xlink:href="'+ns.imagePathSVGSprites+'#emoji-'+unicode+'"></use></svg>';
                    }
                    else {
                        replaceWith = m2+'<object class="emojione" data="'+ns.imagePathSVG+unicode+'.svg'+ns.cacheBustParam+'" type="image/svg+xml" standby="'+alt+'">'+alt+'</object>';
                    }
                }

                return replaceWith;
            });
        }

        return str;
    };

    ns.unicodeToImage = function(str) {

        var replaceWith,unicode,alt;

        if((!ns.unicodeAlt) || (ns.sprites)) {
            // if we are using the shortname as the alt tag then we need a reversed array to map unicode code point to shortnames
            var mappedUnicode = ns.mapUnicodeToShort();
        }

        str = str.replace(ns.regUnicode, function(unicodeChar) {
            if( (typeof unicodeChar === 'undefined') || (unicodeChar === '') || (!(unicodeChar in ns.jsEscapeMap)) ) {
                // if the unicodeChar doesnt exist just return the entire match
                return unicodeChar;
            }
            else {
                // get the unicode codepoint from the actual char
                unicode = ns.jsEscapeMap[unicodeChar];

                // depending on the settings, we'll either add the native unicode as the alt tag, otherwise the shortname
                alt = (ns.unicodeAlt) ? ns.convert(unicode.toUpperCase()) : mappedUnicode[unicode];

                if(ns.imageType === 'png') {
                    if(ns.sprites) {
                        replaceWith = '<span class="emojione emojione-'+unicode+'" title="'+mappedUnicode[unicode]+'">'+alt+'</span>';
                    }
                    else {
                        replaceWith = '<img class="emojione" alt="'+alt+'" src="'+ns.imagePathPNG+unicode+'.png'+ns.cacheBustParam+'"/>';
                    }
                }
                else {
                    // svg
                    if(ns.sprites) {
                        replaceWith = '<svg class="emojione"><description>'+alt+'</description><use xlink:href="'+ns.imagePathSVGSprites+'#emoji-'+unicode+'"></use></svg>';
                    }
                    else {
                        replaceWith = '<img class="emojione" alt="'+alt+'" src="'+ns.imagePathSVG+unicode+'.svg'+ns.cacheBustParam+'"/>';
                    }
                }

                return replaceWith;
            }
        });

        return str;
    };

    // this is really just unicodeToShortname() but I opted for the shorthand name to match toImage()
    ns.toShort = function(str) {
        var find = ns.getUnicodeReplacementRegEx(),
            replacementList = ns.mapUnicodeCharactersToShort();
        return  ns.replaceAll(str, find,replacementList);
    };

    // for converting unicode code points and code pairs to their respective characters
    ns.convert = function(unicode) {
        if(unicode.indexOf("-") > -1) {
            var parts = [];
            var s = unicode.split('-');
            for(var i = 0; i < s.length; i++) {
                var part = parseInt(s[i], 16);
                if (part >= 0x10000 && part <= 0x10FFFF) {
                    var hi = Math.floor((part - 0x10000) / 0x400) + 0xD800;
                    var lo = ((part - 0x10000) % 0x400) + 0xDC00;
                    part = (String.fromCharCode(hi) + String.fromCharCode(lo));
                }
                else {
                    part = String.fromCharCode(part);
                }
                parts.push(part);
            }
            return parts.join('');
        }
        else {
            var s = parseInt(unicode, 16);
            if (s >= 0x10000 && s <= 0x10FFFF) {
                var hi = Math.floor((s - 0x10000) / 0x400) + 0xD800;
                var lo = ((s - 0x10000) % 0x400) + 0xDC00;
                return (String.fromCharCode(hi) + String.fromCharCode(lo));
            }
            else {
                return String.fromCharCode(s);
            }
        }
    };

    ns.escapeHTML = function (string) {
        var escaped = {
            '&' : '&amp;',
            '<' : '&lt;',
            '>' : '&gt;',
            '"' : '&quot;',
            '\'': '&#039;'
        };

        return string.replace(/[&<>"']/g, function (match) {
            return escaped[match];
        });
    };
    ns.unescapeHTML = function (string) {
        var unescaped = {
            '&amp;'  : '&',
            '&#38;'  : '&',
            '&#x26;' : '&',
            '&lt;'   : '<',
            '&#60;'  : '<',
            '&#x3C;' : '<',
            '&gt;'   : '>',
            '&#62;'  : '>',
            '&#x3E;' : '>',
            '&quot;' : '"',
            '&#34;'  : '"',
            '&#x22;' : '"',
            '&apos;' : '\'',
            '&#39;'  : '\'',
            '&#x27;' : '\''
        };

        return string.replace(/&(?:amp|#38|#x26|lt|#60|#x3C|gt|#62|#x3E|apos|#39|#x27|quot|#34|#x22);/ig, function (match) {
            return unescaped[match];
        });
    };

    ns.mapEmojioneList = function (addToMapStorage) {
        for (var shortname in ns.emojioneList) {
            if (!ns.emojioneList.hasOwnProperty(shortname)) { continue; }
            for (var i = 0, len = ns.emojioneList[shortname].unicode.length; i < len; i++) {
                var unicode = ns.emojioneList[shortname].unicode[i];
                addToMapStorage(unicode, shortname);
            }
        }
    };

    ns.mapUnicodeToShort = function() {
        if (!ns.memMapShortToUnicode) {
            ns.memMapShortToUnicode = {};
            ns.mapEmojioneList(function (unicode, shortname) {
                ns.memMapShortToUnicode[unicode] = shortname;
            });
        }
        return ns.memMapShortToUnicode;
    };

    ns.memoizeReplacement = function() {
        if (!ns.unicodeReplacementRegEx || !ns.memMapShortToUnicodeCharacters) {
            var unicodeList = [];
            ns.memMapShortToUnicodeCharacters = {};
            ns.mapEmojioneList(function (unicode, shortname) {
                var emojiCharacter = ns.convert(unicode);
                if(ns.emojioneList[shortname].isCanonical) {
                    ns.memMapShortToUnicodeCharacters[emojiCharacter] = shortname;
                }
                unicodeList.push(emojiCharacter);
            });
            ns.unicodeReplacementRegEx = unicodeList.join('|');
        }
    };

    ns.mapUnicodeCharactersToShort = function() {
        ns.memoizeReplacement();
        return ns.memMapShortToUnicodeCharacters;
    };

    ns.getUnicodeReplacementRegEx = function() {
        ns.memoizeReplacement();
        return ns.unicodeReplacementRegEx;
    };

    //reverse an object
    ns.objectFlip = function (obj) {
        var key, tmp_obj = {};

        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                tmp_obj[obj[key]] = key;
            }
        }

        return tmp_obj;
    };

    ns.escapeRegExp = function(string) {
        return string.replace(/[-[\]{}()*+?.,;:&\\^$#\s]/g, "\\$&");
    };

    ns.replaceAll = function(string, find, replacementList) {
        var escapedFind = ns.escapeRegExp(find);
        var search = new RegExp("<object[^>]*>.*?<\/object>|<span[^>]*>.*?<\/span>|<(?:object|embed|svg|img|div|span|p|a)[^>]*>|("+escapedFind+")", "gi");

        // callback prevents replacing anything inside of these common html tags as well as between an <object></object> tag
        var replace = function(entire, m1) {
            return ((typeof m1 === 'undefined') || (m1 === '')) ? entire : replacementList[m1];
        };

        return string.replace(search,replace);
    };

}(this.emojione = this.emojione || {}));
if(typeof module === "object") module.exports = this.emojione;

},{}],40:[function(require,module,exports){
var once = require('once');

var noop = function() {};

var isRequest = function(stream) {
	return stream.setHeader && typeof stream.abort === 'function';
};

var isChildProcess = function(stream) {
	return stream.stdio && Array.isArray(stream.stdio) && stream.stdio.length === 3
};

var eos = function(stream, opts, callback) {
	if (typeof opts === 'function') return eos(stream, null, opts);
	if (!opts) opts = {};

	callback = once(callback || noop);

	var ws = stream._writableState;
	var rs = stream._readableState;
	var readable = opts.readable || (opts.readable !== false && stream.readable);
	var writable = opts.writable || (opts.writable !== false && stream.writable);

	var onlegacyfinish = function() {
		if (!stream.writable) onfinish();
	};

	var onfinish = function() {
		writable = false;
		if (!readable) callback();
	};

	var onend = function() {
		readable = false;
		if (!writable) callback();
	};

	var onexit = function(exitCode) {
		callback(exitCode ? new Error('exited with error code: ' + exitCode) : null);
	};

	var onclose = function() {
		if (readable && !(rs && rs.ended)) return callback(new Error('premature close'));
		if (writable && !(ws && ws.ended)) return callback(new Error('premature close'));
	};

	var onrequest = function() {
		stream.req.on('finish', onfinish);
	};

	if (isRequest(stream)) {
		stream.on('complete', onfinish);
		stream.on('abort', onclose);
		if (stream.req) onrequest();
		else stream.on('request', onrequest);
	} else if (writable && !ws) { // legacy streams
		stream.on('end', onlegacyfinish);
		stream.on('close', onlegacyfinish);
	}

	if (isChildProcess(stream)) stream.on('exit', onexit);

	stream.on('end', onend);
	stream.on('finish', onfinish);
	if (opts.error !== false) stream.on('error', callback);
	stream.on('close', onclose);

	return function() {
		stream.removeListener('complete', onfinish);
		stream.removeListener('abort', onclose);
		stream.removeListener('request', onrequest);
		if (stream.req) stream.req.removeListener('finish', onfinish);
		stream.removeListener('end', onlegacyfinish);
		stream.removeListener('close', onlegacyfinish);
		stream.removeListener('finish', onfinish);
		stream.removeListener('exit', onexit);
		stream.removeListener('end', onend);
		stream.removeListener('error', callback);
		stream.removeListener('close', onclose);
	};
};

module.exports = eos;
},{"once":41}],41:[function(require,module,exports){
var wrappy = require('wrappy')
module.exports = wrappy(once)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

},{"wrappy":143}],42:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],43:[function(require,module,exports){
var Readable = require('readable-stream').Readable;
var inherits = require('inherits');
var reExtension = /^.*\.(\w+)$/;
var toBuffer = require('typedarray-to-buffer');

function FileReadStream(file, opts) {
  var readStream = this;
  if (! (this instanceof FileReadStream)) {
    return new FileReadStream(file, opts);
  }
  opts = opts || {};

  // inherit readable
  Readable.call(this, opts);

  // save the read offset
  this._offset = 0;
  this._ready = false;
  this._file = file;
  this._size = file.size;
  this._chunkSize = opts.chunkSize || Math.max(this._size / 1000, 200 * 1024);

  // create the reader
  this.reader = new FileReader();

  // generate the header blocks that we will send as part of the initial payload
  this._generateHeaderBlocks(file, opts, function(err, blocks) {
    // if we encountered an error, emit it
    if (err) {
      return readStream.emit('error', err);
    }

    // push the header blocks out to the stream
    if (Array.isArray(blocks)) {
      blocks.forEach(function (block) {
        readStream.push(block);
      });
    }

    readStream._ready = true;
    readStream.emit('_ready');
  });
}

inherits(FileReadStream, Readable);
module.exports = FileReadStream;

FileReadStream.prototype._generateHeaderBlocks = function(file, opts, callback) {
  callback(null, []);
};

FileReadStream.prototype._read = function() {
  if (!this._ready) {
    this.once('_ready', this._read.bind(this));
    return;
  }
  var readStream = this;
  var reader = this.reader;

  var startOffset = this._offset;
  var endOffset = this._offset + this._chunkSize;
  if (endOffset > this._size) endOffset = this._size;

  if (startOffset === this._size) {
    this.destroy();
    this.push(null);
    return;
  }

  reader.onload = function() {
    // update the stream offset
    readStream._offset = endOffset;

    // get the data chunk
    readStream.push(toBuffer(reader.result));
  }
  reader.onerror = function() {
    readStream.emit('error', reader.error);
  }

  reader.readAsArrayBuffer(this._file.slice(startOffset, endOffset));
};

FileReadStream.prototype.destroy = function() {
  this._file = null;
  if (this.reader) {
    this.reader.onload = null;
    this.reader.onerror = null;
    try { this.reader.abort(); } catch (e) {};
  }
  this.reader = null;
}

},{"inherits":56,"readable-stream":97,"typedarray-to-buffer":125}],44:[function(require,module,exports){
module.exports = function flatten(list, depth) {
  depth = (typeof depth == 'number') ? depth : Infinity;

  if (!depth) {
    if (Array.isArray(list)) {
      return list.map(function(i) { return i; });
    }
    return list;
  }

  return _flatten(list, 1);

  function _flatten(list, d) {
    return list.reduce(function (acc, item) {
      if (Array.isArray(item) && d < depth) {
        return acc.concat(_flatten(item, d + 1));
      }
      else {
        return acc.concat(item);
      }
    }, []);
  }
};

},{}],45:[function(require,module,exports){
var yo = require('yo-yo')

function parse (strings, values) {
  // The raw arrays are no actually mutable, copy.
  strings = strings.slice()
  values = values.slice()
  let shadowStrings = []
  let shadowValues = []
  let elementStrings = []
  let elementValues = []
  let constructors = []
  let s = strings.join('').replace(/ /g, '')
  let name = s.slice(s.indexOf('<') + 1, s.indexOf('>'))

  let fullstring = ''
  let valueMap = {}

  let i = 0
  while (i < strings.length) {
    fullstring += strings[i]
    valueMap[fullstring.length + '-' + i] = values[i]
    i++
  }

  let opener = `<${name}>`
  let openPos = fullstring.indexOf(opener)
  let closer = `</${name}>`
  let closePos = fullstring.lastIndexOf(closer)

  if (openPos === -1) throw new Error('Cannot find open position.')
  if (closePos === -1) throw new Error('Cannot find close position.')

  for (let posName in valueMap) {
    let pos = +posName.slice(0, posName.indexOf('-'))
    let val = valueMap[posName]

    if (pos < openPos) constructors.push(val)
    else if (pos > openPos && pos < closePos) {
      elementValues.push(val)
    } else if (pos > closePos) {
      shadowValues.push(val)
    } else {
      throw new Error('Parser error, cannot assign value.')
    }
  }

  i = 0
  let pos = 0
  while (i < strings.length) {
    let str = strings[i]

    let iter = () => {
      if (pos >= fullstring.length) return
      if (pos >= openPos) {
        if (pos > closePos) {
          shadowStrings.push(str)
        } else {
          if (str.indexOf(closer) !== -1) {
            let _pos = str.indexOf(closer) + closer.length + 1
            elementStrings.push(str.slice(0, _pos))
            str = str.slice(_pos)
            pos += _pos
            return iter()
          } else {
            elementStrings.push(str)
          }
        }
      } else {
        if (str.indexOf(opener) !== -1) {
          let _pos = str.indexOf(opener)
          str = str.slice(_pos)
          pos = pos + _pos
          return iter()
        }
      }
      pos = pos + str.length
    }
    iter()
    i++
  }
  // TODO: type checking on constructors and destructors

  let result = {
    name,
    constructors,
    shadowStrings,
    shadowValues,
    elementStrings,
    elementValues
  }
  return result
}

function view (strings, ...inserts) {
  let parsed = parse(strings, inserts)

  function _callInserts (args, getElement) {
    var ret = parsed.elementValues.map(i => {
      if (i.node) return i.node

      if (typeof i === 'function') return i.apply(this, args)
      return i
    })
    return ret
  }

  function _viewReturn () {
    var args = Array.prototype.slice.call(arguments)
    var element = yo(parsed.elementStrings, ..._callInserts(args))
    parsed.constructors.forEach(c => c(...[element].concat(args)))
    // TODO: attach ShadowDOM
    element.yoyoOpts = {}
    element.update = function () {
      if (element.onupdate) element.onupdate.apply(element, arguments)
      let newelement = element.processUpdate.apply(element, arguments)
      yo.update(element, newelement, element.yoyoOpts)
    }
    element.processUpdate = function () {
      var args = Array.prototype.slice.call(arguments)
      var _inserts = [..._callInserts(args)]
      var newelement = yo(parsed.elementStrings, ..._inserts)
      return newelement
    }
    element._funkView = true
    return element
  }
  return _viewReturn
}

module.exports = view
module.exports.attr = (key) => (doc) => doc[key]

},{"yo-yo":146}],46:[function(require,module,exports){
// originally pulled out of simple-peer

module.exports = function getBrowserRTC () {
  if (typeof window === 'undefined') return null
  var wrtc = {
    RTCPeerConnection: window.RTCPeerConnection || window.mozRTCPeerConnection ||
      window.webkitRTCPeerConnection,
    RTCSessionDescription: window.RTCSessionDescription ||
      window.mozRTCSessionDescription || window.webkitRTCSessionDescription,
    RTCIceCandidate: window.RTCIceCandidate || window.mozRTCIceCandidate ||
      window.webkitRTCIceCandidate
  }
  if (!wrtc.RTCPeerConnection) return null
  return wrtc
}

},{}],47:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":19}],48:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],49:[function(require,module,exports){
/**
 * Check if argument is a HTML element.
 *
 * @param {Object} value
 * @return {Boolean}
 */
exports.node = function(value) {
    return value !== undefined
        && value instanceof HTMLElement
        && value.nodeType === 1;
};

/**
 * Check if argument is a list of HTML elements.
 *
 * @param {Object} value
 * @return {Boolean}
 */
exports.nodeList = function(value) {
    var type = Object.prototype.toString.call(value);

    return value !== undefined
        && (type === '[object NodeList]' || type === '[object HTMLCollection]')
        && ('length' in value)
        && (value.length === 0 || exports.node(value[0]));
};

/**
 * Check if argument is a string.
 *
 * @param {Object} value
 * @return {Boolean}
 */
exports.string = function(value) {
    return typeof value === 'string'
        || value instanceof String;
};

/**
 * Check if argument is a function.
 *
 * @param {Object} value
 * @return {Boolean}
 */
exports.fn = function(value) {
    var type = Object.prototype.toString.call(value);

    return type === '[object Function]';
};

},{}],50:[function(require,module,exports){
var is = require('./is');
var delegate = require('delegate');

/**
 * Validates all params and calls the right
 * listener function based on its target type.
 *
 * @param {String|HTMLElement|HTMLCollection|NodeList} target
 * @param {String} type
 * @param {Function} callback
 * @return {Object}
 */
function listen(target, type, callback) {
    if (!target && !type && !callback) {
        throw new Error('Missing required arguments');
    }

    if (!is.string(type)) {
        throw new TypeError('Second argument must be a String');
    }

    if (!is.fn(callback)) {
        throw new TypeError('Third argument must be a Function');
    }

    if (is.node(target)) {
        return listenNode(target, type, callback);
    }
    else if (is.nodeList(target)) {
        return listenNodeList(target, type, callback);
    }
    else if (is.string(target)) {
        return listenSelector(target, type, callback);
    }
    else {
        throw new TypeError('First argument must be a String, HTMLElement, HTMLCollection, or NodeList');
    }
}

/**
 * Adds an event listener to a HTML element
 * and returns a remove listener function.
 *
 * @param {HTMLElement} node
 * @param {String} type
 * @param {Function} callback
 * @return {Object}
 */
function listenNode(node, type, callback) {
    node.addEventListener(type, callback);

    return {
        destroy: function() {
            node.removeEventListener(type, callback);
        }
    }
}

/**
 * Add an event listener to a list of HTML elements
 * and returns a remove listener function.
 *
 * @param {NodeList|HTMLCollection} nodeList
 * @param {String} type
 * @param {Function} callback
 * @return {Object}
 */
function listenNodeList(nodeList, type, callback) {
    Array.prototype.forEach.call(nodeList, function(node) {
        node.addEventListener(type, callback);
    });

    return {
        destroy: function() {
            Array.prototype.forEach.call(nodeList, function(node) {
                node.removeEventListener(type, callback);
            });
        }
    }
}

/**
 * Add an event listener to a selector
 * and returns a remove listener function.
 *
 * @param {String} selector
 * @param {String} type
 * @param {Function} callback
 * @return {Object}
 */
function listenSelector(selector, type, callback) {
    return delegate(document.body, selector, type, callback);
}

module.exports = listen;

},{"./is":49,"delegate":36}],51:[function(require,module,exports){
var http = require('http');

var https = module.exports;

for (var key in http) {
    if (http.hasOwnProperty(key)) https[key] = http[key];
};

https.request = function (params, cb) {
    if (!params) params = {};
    params.scheme = 'https';
    params.protocol = 'https:';
    return http.request.call(this, params, cb);
}

},{"http":111}],52:[function(require,module,exports){
module.exports = attributeToProperty

var transform = {
  'class': 'className',
  'for': 'htmlFor',
  'http-equiv': 'httpEquiv'
}

function attributeToProperty (h) {
  return function (tagName, attrs, children) {
    for (var attr in attrs) {
      if (attr in transform) {
        attrs[transform[attr]] = attrs[attr]
        delete attrs[attr]
      }
    }
    return h(tagName, attrs, children)
  }
}

},{}],53:[function(require,module,exports){
var attrToProp = require('hyperscript-attribute-to-property')

var VAR = 0, TEXT = 1, OPEN = 2, CLOSE = 3, ATTR = 4
var ATTR_KEY = 5, ATTR_KEY_W = 6
var ATTR_VALUE_W = 7, ATTR_VALUE = 8
var ATTR_VALUE_SQ = 9, ATTR_VALUE_DQ = 10
var ATTR_EQ = 11, ATTR_BREAK = 12

module.exports = function (h, opts) {
  h = attrToProp(h)
  if (!opts) opts = {}
  var concat = opts.concat || function (a, b) {
    return String(a) + String(b)
  }

  return function (strings) {
    var state = TEXT, reg = ''
    var arglen = arguments.length
    var parts = []

    for (var i = 0; i < strings.length; i++) {
      if (i < arglen - 1) {
        var arg = arguments[i+1]
        var p = parse(strings[i])
        var xstate = state
        if (xstate === ATTR_VALUE_DQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_SQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_W) xstate = ATTR_VALUE
        if (xstate === ATTR) xstate = ATTR_KEY
        p.push([ VAR, xstate, arg ])
        parts.push.apply(parts, p)
      } else parts.push.apply(parts, parse(strings[i]))
    }

    var tree = [null,{},[]]
    var stack = [[tree,-1]]
    for (var i = 0; i < parts.length; i++) {
      var cur = stack[stack.length-1][0]
      var p = parts[i], s = p[0]
      if (s === OPEN && /^\//.test(p[1])) {
        var ix = stack[stack.length-1][1]
        if (stack.length > 1) {
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === OPEN) {
        var c = [p[1],{},[]]
        cur[2].push(c)
        stack.push([c,cur[2].length-1])
      } else if (s === ATTR_KEY || (s === VAR && p[1] === ATTR_KEY)) {
        var key = ''
        var copyKey
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_KEY) {
            key = concat(key, parts[i][1])
          } else if (parts[i][0] === VAR && parts[i][1] === ATTR_KEY) {
            if (typeof parts[i][2] === 'object' && !key) {
              for (copyKey in parts[i][2]) {
                if (parts[i][2].hasOwnProperty(copyKey) && !cur[1][copyKey]) {
                  cur[1][copyKey] = parts[i][2][copyKey]
                }
              }
            } else {
              key = concat(key, parts[i][2])
            }
          } else break
        }
        if (parts[i][0] === ATTR_EQ) i++
        var j = i
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_VALUE || parts[i][0] === ATTR_KEY) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][1])
            else cur[1][key] = concat(cur[1][key], parts[i][1])
          } else if (parts[i][0] === VAR
          && (parts[i][1] === ATTR_VALUE || parts[i][1] === ATTR_KEY)) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][2])
            else cur[1][key] = concat(cur[1][key], parts[i][2])
          } else {
            if (key.length && !cur[1][key] && i === j
            && (parts[i][0] === CLOSE || parts[i][0] === ATTR_BREAK)) {
              // https://html.spec.whatwg.org/multipage/infrastructure.html#boolean-attributes
              // empty string is falsy, not well behaved value in browser
              cur[1][key] = key.toLowerCase()
            }
            break
          }
        }
      } else if (s === ATTR_KEY) {
        cur[1][p[1]] = true
      } else if (s === VAR && p[1] === ATTR_KEY) {
        cur[1][p[2]] = true
      } else if (s === CLOSE) {
        if (selfClosing(cur[0]) && stack.length) {
          var ix = stack[stack.length-1][1]
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === VAR && p[1] === TEXT) {
        if (p[2] === undefined || p[2] === null) p[2] = ''
        else if (!p[2]) p[2] = concat('', p[2])
        if (Array.isArray(p[2][0])) {
          cur[2].push.apply(cur[2], p[2])
        } else {
          cur[2].push(p[2])
        }
      } else if (s === TEXT) {
        cur[2].push(p[1])
      } else if (s === ATTR_EQ || s === ATTR_BREAK) {
        // no-op
      } else {
        throw new Error('unhandled: ' + s)
      }
    }

    if (tree[2].length > 1 && /^\s*$/.test(tree[2][0])) {
      tree[2].shift()
    }

    if (tree[2].length > 2
    || (tree[2].length === 2 && /\S/.test(tree[2][1]))) {
      throw new Error(
        'multiple root elements must be wrapped in an enclosing tag'
      )
    }
    if (Array.isArray(tree[2][0]) && typeof tree[2][0][0] === 'string'
    && Array.isArray(tree[2][0][2])) {
      tree[2][0] = h(tree[2][0][0], tree[2][0][1], tree[2][0][2])
    }
    return tree[2][0]

    function parse (str) {
      var res = []
      if (state === ATTR_VALUE_W) state = ATTR
      for (var i = 0; i < str.length; i++) {
        var c = str.charAt(i)
        if (state === TEXT && c === '<') {
          if (reg.length) res.push([TEXT, reg])
          reg = ''
          state = OPEN
        } else if (c === '>' && !quot(state)) {
          if (state === OPEN) {
            res.push([OPEN,reg])
          } else if (state === ATTR_KEY) {
            res.push([ATTR_KEY,reg])
          } else if (state === ATTR_VALUE && reg.length) {
            res.push([ATTR_VALUE,reg])
          }
          res.push([CLOSE])
          reg = ''
          state = TEXT
        } else if (state === TEXT) {
          reg += c
        } else if (state === OPEN && /\s/.test(c)) {
          res.push([OPEN, reg])
          reg = ''
          state = ATTR
        } else if (state === OPEN) {
          reg += c
        } else if (state === ATTR && /[\w-]/.test(c)) {
          state = ATTR_KEY
          reg = c
        } else if (state === ATTR && /\s/.test(c)) {
          if (reg.length) res.push([ATTR_KEY,reg])
          res.push([ATTR_BREAK])
        } else if (state === ATTR_KEY && /\s/.test(c)) {
          res.push([ATTR_KEY,reg])
          reg = ''
          state = ATTR_KEY_W
        } else if (state === ATTR_KEY && c === '=') {
          res.push([ATTR_KEY,reg],[ATTR_EQ])
          reg = ''
          state = ATTR_VALUE_W
        } else if (state === ATTR_KEY) {
          reg += c
        } else if ((state === ATTR_KEY_W || state === ATTR) && c === '=') {
          res.push([ATTR_EQ])
          state = ATTR_VALUE_W
        } else if ((state === ATTR_KEY_W || state === ATTR) && !/\s/.test(c)) {
          res.push([ATTR_BREAK])
          if (/[\w-]/.test(c)) {
            reg += c
            state = ATTR_KEY
          } else state = ATTR
        } else if (state === ATTR_VALUE_W && c === '"') {
          state = ATTR_VALUE_DQ
        } else if (state === ATTR_VALUE_W && c === "'") {
          state = ATTR_VALUE_SQ
        } else if (state === ATTR_VALUE_DQ && c === '"') {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_SQ && c === "'") {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_W && !/\s/.test(c)) {
          state = ATTR_VALUE
          i--
        } else if (state === ATTR_VALUE && /\s/.test(c)) {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE || state === ATTR_VALUE_SQ
        || state === ATTR_VALUE_DQ) {
          reg += c
        }
      }
      if (state === TEXT && reg.length) {
        res.push([TEXT,reg])
        reg = ''
      } else if (state === ATTR_VALUE && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_DQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_SQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_KEY) {
        res.push([ATTR_KEY,reg])
        reg = ''
      }
      return res
    }
  }

  function strfn (x) {
    if (typeof x === 'function') return x
    else if (typeof x === 'string') return x
    else if (x && typeof x === 'object') return x
    else return concat('', x)
  }
}

function quot (state) {
  return state === ATTR_VALUE_SQ || state === ATTR_VALUE_DQ
}

var hasOwn = Object.prototype.hasOwnProperty
function has (obj, key) { return hasOwn.call(obj, key) }

var closeRE = RegExp('^(' + [
  'area', 'base', 'basefont', 'bgsound', 'br', 'col', 'command', 'embed',
  'frame', 'hr', 'img', 'input', 'isindex', 'keygen', 'link', 'meta', 'param',
  'source', 'track', 'wbr',
  // SVG TAGS
  'animate', 'animateTransform', 'circle', 'cursor', 'desc', 'ellipse',
  'feBlend', 'feColorMatrix', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
  'feGaussianBlur', 'feImage', 'feMergeNode', 'feMorphology',
  'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile',
  'feTurbulence', 'font-face-format', 'font-face-name', 'font-face-uri',
  'glyph', 'glyphRef', 'hkern', 'image', 'line', 'missing-glyph', 'mpath',
  'path', 'polygon', 'polyline', 'rect', 'set', 'stop', 'tref', 'use', 'view',
  'vkern'
].join('|') + ')(?:[\.#][a-zA-Z0-9\u007F-\uFFFF_:-]+)*$')
function selfClosing (tag) { return closeRE.test(tag) }

},{"hyperscript-attribute-to-property":52}],54:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],55:[function(require,module,exports){
(function (process){
module.exports = ImmediateStore

function ImmediateStore (store) {
  if (!(this instanceof ImmediateStore)) return new ImmediateStore(store)

  this.store = store
  this.chunkLength = store.chunkLength

  if (!this.store || !this.store.get || !this.store.put) {
    throw new Error('First argument must be abstract-chunk-store compliant')
  }

  this.mem = []
}

ImmediateStore.prototype.put = function (index, buf, cb) {
  var self = this
  self.mem[index] = buf
  self.store.put(index, buf, function (err) {
    self.mem[index] = null
    if (cb) cb(err)
  })
}

ImmediateStore.prototype.get = function (index, opts, cb) {
  if (typeof opts === 'function') return this.get(index, null, opts)

  var start = (opts && opts.offset) || 0
  var end = opts && opts.length && (start + opts.length)

  var buf = this.mem[index]
  if (buf) return nextTick(cb, null, opts ? buf.slice(start, end) : buf)

  this.store.get(index, opts, cb)
}

ImmediateStore.prototype.close = function (cb) {
  this.store.close(cb)
}

ImmediateStore.prototype.destroy = function (cb) {
  this.store.destroy(cb)
}

function nextTick (cb, err, val) {
  process.nextTick(function () {
    if (cb) cb(err, val)
  })
}

}).call(this,require('_process'))
},{"_process":22}],56:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],57:[function(require,module,exports){
/* (c) 2016 Ari Porad (@ariporad) <http://ariporad.com>. License: ariporad.mit-license.org */

// Partially from http://stackoverflow.com/a/94049/1928484, and from another SO answer, which told me that the highest
// char code that's ascii is 127, but I can't find the link for. Sorry.

var MAX_ASCII_CHAR_CODE = 127;

module.exports = function isAscii(str) {
  for (var i = 0, strLen = str.length; i < strLen; ++i) {
    if (str.charCodeAt(i) > MAX_ASCII_CHAR_CODE) return false;
  }
  return true;
};

},{}],58:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],59:[function(require,module,exports){
'use strict';

var fs = require('fs');

module.exports = function isFile(path, cb){
  if(!cb)return isFileSync(path);

  fs.stat(path, function(err, stats){
    if(err)return cb(err);
    return cb(null, stats.isFile());
  });
};

module.exports.sync = isFileSync;

function isFileSync(path){
  return fs.existsSync(path) && fs.statSync(path).isFile();
}

},{"fs":21}],60:[function(require,module,exports){
module.exports      = isTypedArray
isTypedArray.strict = isStrictTypedArray
isTypedArray.loose  = isLooseTypedArray

var toString = Object.prototype.toString
var names = {
    '[object Int8Array]': true
  , '[object Int16Array]': true
  , '[object Int32Array]': true
  , '[object Uint8Array]': true
  , '[object Uint8ClampedArray]': true
  , '[object Uint16Array]': true
  , '[object Uint32Array]': true
  , '[object Float32Array]': true
  , '[object Float64Array]': true
}

function isTypedArray(arr) {
  return (
       isStrictTypedArray(arr)
    || isLooseTypedArray(arr)
  )
}

function isStrictTypedArray(arr) {
  return (
       arr instanceof Int8Array
    || arr instanceof Int16Array
    || arr instanceof Int32Array
    || arr instanceof Uint8Array
    || arr instanceof Uint8ClampedArray
    || arr instanceof Uint16Array
    || arr instanceof Uint32Array
    || arr instanceof Float32Array
    || arr instanceof Float64Array
  )
}

function isLooseTypedArray(arr) {
  return names[toString.call(arr)]
}

},{}],61:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],62:[function(require,module,exports){
'use strict';

// // All
// /^npm-debug\.log$/,   // npm error log
// /^\..*\.swp$/,        // vim state
// // macOS
// /^\.DS_Store$/,       // stores custom folder attributes
// /^\.AppleDouble$/,    // stores additional file resources
// /^\.LSOverride$/,     // contains the absolute path to the app to be used
// /^Icon\r$/,           // custom Finder icon: http://superuser.com/questions/298785/icon-file-on-os-x-desktop
// /^\._.*/,             // thumbnail
// /^\.Spotlight-V100$/,  // file that might appear on external disk
// /\.Trashes/,          // file that might appear on external disk
// /^__MACOSX$/,         // resource fork
// // Linux
// /~$/,                 // backup file
// // Windows
// /^Thumbs\.db$/,       // image file cache
// /^ehthumbs\.db$/,     // folder config file
// /^Desktop\.ini$/      // stores custom folder attributes

exports.re = /^npm-debug\.log$|^\..*\.swp$|^\.DS_Store$|^\.AppleDouble$|^\.LSOverride$|^Icon\r$|^\._.*|^\.Spotlight-V100$|\.Trashes|^__MACOSX$|~$|^Thumbs\.db$|^ehthumbs\.db$|^Desktop\.ini$/;

exports.is = function (filename) {
	return exports.re.test(filename);
};

exports.not = exports.isnt = function (filename) {
	return !exports.is(filename);
};

},{}],63:[function(require,module,exports){
(function (Buffer){
module.exports = magnetURIDecode
module.exports.decode = magnetURIDecode
module.exports.encode = magnetURIEncode

var base32 = require('thirty-two')
var extend = require('xtend')
var uniq = require('uniq')

/**
 * Parse a magnet URI and return an object of keys/values
 *
 * @param  {string} uri
 * @return {Object} parsed uri
 */
function magnetURIDecode (uri) {
  var result = {}

  // Support 'magnet:' and 'stream-magnet:' uris
  var data = uri.split('magnet:?')[1]

  var params = (data && data.length >= 0)
    ? data.split('&')
    : []

  params.forEach(function (param) {
    var keyval = param.split('=')

    // This keyval is invalid, skip it
    if (keyval.length !== 2) return

    var key = keyval[0]
    var val = keyval[1]

    // Clean up torrent name
    if (key === 'dn') val = decodeURIComponent(val).replace(/\+/g, ' ')

    // Address tracker (tr), exact source (xs), and acceptable source (as) are encoded
    // URIs, so decode them
    if (key === 'tr' || key === 'xs' || key === 'as' || key === 'ws') {
      val = decodeURIComponent(val)
    }

    // Return keywords as an array
    if (key === 'kt') val = decodeURIComponent(val).split('+')

    // Cast file index (ix) to a number
    if (key === 'ix') val = Number(val)

    // If there are repeated parameters, return an array of values
    if (result[key]) {
      if (Array.isArray(result[key])) {
        result[key].push(val)
      } else {
        var old = result[key]
        result[key] = [old, val]
      }
    } else {
      result[key] = val
    }
  })

  // Convenience properties for parity with `parse-torrent-file` module
  var m
  if (result.xt) {
    var xts = Array.isArray(result.xt) ? result.xt : [ result.xt ]
    xts.forEach(function (xt) {
      if ((m = xt.match(/^urn:btih:(.{40})/))) {
        result.infoHash = m[1].toLowerCase()
      } else if ((m = xt.match(/^urn:btih:(.{32})/))) {
        var decodedStr = base32.decode(m[1])
        result.infoHash = new Buffer(decodedStr, 'binary').toString('hex')
      }
    })
  }
  if (result.infoHash) result.infoHashBuffer = new Buffer(result.infoHash, 'hex')

  if (result.dn) result.name = result.dn
  if (result.kt) result.keywords = result.kt

  if (typeof result.tr === 'string') result.announce = [ result.tr ]
  else if (Array.isArray(result.tr)) result.announce = result.tr
  else result.announce = []

  result.urlList = []
  if (typeof result.as === 'string' || Array.isArray(result.as)) {
    result.urlList = result.urlList.concat(result.as)
  }
  if (typeof result.ws === 'string' || Array.isArray(result.ws)) {
    result.urlList = result.urlList.concat(result.ws)
  }

  uniq(result.announce)
  uniq(result.urlList)

  return result
}

function magnetURIEncode (obj) {
  obj = extend(obj) // clone obj, so we can mutate it

  // support using convenience names, in addition to spec names
  // (example: `infoHash` for `xt`, `name` for `dn`)
  if (obj.infoHashBuffer) obj.xt = 'urn:btih:' + obj.infoHashBuffer.toString('hex')
  if (obj.infoHash) obj.xt = 'urn:btih:' + obj.infoHash
  if (obj.name) obj.dn = obj.name
  if (obj.keywords) obj.kt = obj.keywords
  if (obj.announce) obj.tr = obj.announce
  if (obj.urlList) {
    obj.ws = obj.urlList
    delete obj.as
  }

  var result = 'magnet:?'
  Object.keys(obj)
    .filter(function (key) {
      return key.length === 2
    })
    .forEach(function (key, i) {
      var values = Array.isArray(obj[key]) ? obj[key] : [ obj[key] ]
      values.forEach(function (val, j) {
        if ((i > 0 || j > 0) && (key !== 'kt' || j === 0)) result += '&'

        if (key === 'dn') val = encodeURIComponent(val).replace(/%20/g, '+')
        if (key === 'tr' || key === 'xs' || key === 'as' || key === 'ws') {
          val = encodeURIComponent(val)
        }
        if (key === 'kt') val = encodeURIComponent(val)

        if (key === 'kt' && j > 0) result += '+' + val
        else result += key + '=' + val
      })
    })

  return result
}

}).call(this,require("buffer").Buffer)
},{"buffer":24,"thirty-two":119,"uniq":127,"xtend":144}],64:[function(require,module,exports){
module.exports = MediaElementWrapper

var inherits = require('inherits')
var stream = require('readable-stream')
var toArrayBuffer = require('to-arraybuffer')

var MediaSource = typeof window !== 'undefined' && window.MediaSource

var DEFAULT_BUFFER_DURATION = 60 // seconds

function MediaElementWrapper (elem, opts) {
  var self = this
  if (!(self instanceof MediaElementWrapper)) return new MediaElementWrapper(elem, opts)

  if (!MediaSource) throw new Error('web browser lacks MediaSource support')

  if (!opts) opts = {}
  self._bufferDuration = opts.bufferDuration || DEFAULT_BUFFER_DURATION
  self._elem = elem
  self._mediaSource = new MediaSource()
  self._streams = []
  self.detailedError = null

  self._errorHandler = function () {
    self._elem.removeEventListener('error', self._errorHandler)
    var streams = self._streams.slice()
    streams.forEach(function (stream) {
      stream.destroy(self._elem.error)
    })
  }
  self._elem.addEventListener('error', self._errorHandler)

  self._elem.src = window.URL.createObjectURL(self._mediaSource)
}

/*
 * `obj` can be a previous value returned by this function
 * or a string
 */
MediaElementWrapper.prototype.createWriteStream = function (obj) {
  var self = this

  return new MediaSourceStream(self, obj)
}

/*
 * Use to trigger an error on the underlying media element
 */
MediaElementWrapper.prototype.error = function (err) {
  var self = this

  // be careful not to overwrite any existing detailedError values
  if (!self.detailedError) {
    self.detailedError = err
  }
  try {
    self._mediaSource.endOfStream('decode')
  } catch (err) {}
}

inherits(MediaSourceStream, stream.Writable)

function MediaSourceStream (wrapper, obj) {
  var self = this
  stream.Writable.call(self)

  self._wrapper = wrapper
  self._elem = wrapper._elem
  self._mediaSource = wrapper._mediaSource
  self._allStreams = wrapper._streams
  self._allStreams.push(self)
  self._bufferDuration = wrapper._bufferDuration
  self._sourceBuffer = null

  self._openHandler = function () {
    self._onSourceOpen()
  }
  self._flowHandler = function () {
    self._flow()
  }

  if (typeof obj === 'string') {
    self._type = obj
    // Need to create a new sourceBuffer
    if (self._mediaSource.readyState === 'open') {
      self._createSourceBuffer()
    } else {
      self._mediaSource.addEventListener('sourceopen', self._openHandler)
    }
  } else if (obj._sourceBuffer === null) {
    obj.destroy()
    self._type = obj._type // The old stream was created but hasn't finished initializing
    self._mediaSource.addEventListener('sourceopen', self._openHandler)
  } else if (obj._sourceBuffer) {
    obj.destroy()
    self._type = obj._type
    self._sourceBuffer = obj._sourceBuffer // Copy over the old sourceBuffer
    self._sourceBuffer.addEventListener('updateend', self._flowHandler)
  } else {
    throw new Error('The argument to MediaElementWrapper.createWriteStream must be a string or a previous stream returned from that function')
  }

  self._elem.addEventListener('timeupdate', self._flowHandler)

  self.on('error', function (err) {
    self._wrapper.error(err)
  })

  self.on('finish', function () {
    if (self.destroyed) return
    self._finished = true
    if (self._allStreams.every(function (other) { return other._finished })) {
      try {
        self._mediaSource.endOfStream()
      } catch (err) {}
    }
  })
}

MediaSourceStream.prototype._onSourceOpen = function () {
  var self = this
  if (self.destroyed) return

  self._mediaSource.removeEventListener('sourceopen', self._openHandler)
  self._createSourceBuffer()
}

MediaSourceStream.prototype.destroy = function (err) {
  var self = this
  if (self.destroyed) return
  self.destroyed = true

  // Remove from allStreams
  self._allStreams.splice(self._allStreams.indexOf(self), 1)

  self._mediaSource.removeEventListener('sourceopen', self._openHandler)
  self._elem.removeEventListener('timeupdate', self._flowHandler)
  if (self._sourceBuffer) {
    self._sourceBuffer.removeEventListener('updateend', self._flowHandler)
    if (self._mediaSource.readyState === 'open') {
      self._sourceBuffer.abort()
    }
  }

  if (err) self.emit('error', err)
  self.emit('close')
}

MediaSourceStream.prototype._createSourceBuffer = function () {
  var self = this
  if (self.destroyed) return

  if (MediaSource.isTypeSupported(self._type)) {
    self._sourceBuffer = self._mediaSource.addSourceBuffer(self._type)
    self._sourceBuffer.addEventListener('updateend', self._flowHandler)
    if (self._cb) {
      var cb = self._cb
      self._cb = null
      cb()
    }
  } else {
    self.destroy(new Error('The provided type is not supported'))
  }
}

MediaSourceStream.prototype._write = function (chunk, encoding, cb) {
  var self = this
  if (self.destroyed) return
  if (!self._sourceBuffer) {
    self._cb = function (err) {
      if (err) return cb(err)
      self._write(chunk, encoding, cb)
    }
    return
  }

  if (self._sourceBuffer.updating) {
    return cb(new Error('Cannot append buffer while source buffer updating'))
  }

  try {
    self._sourceBuffer.appendBuffer(toArrayBuffer(chunk))
  } catch (err) {
    // appendBuffer can throw for a number of reasons, most notably when the data
    // being appended is invalid or if appendBuffer is called after another error
    // already occurred on the media element. In Chrome, there may be useful debugging
    // info in chrome://media-internals
    self.destroy(err)
    return
  }
  self._cb = cb
}

MediaSourceStream.prototype._flow = function () {
  var self = this

  if (self.destroyed || !self._sourceBuffer || self._sourceBuffer.updating) {
    return
  }

  if (self._mediaSource.readyState === 'open') {
    // check buffer size
    if (self._getBufferDuration() > self._bufferDuration) {
      return
    }
  }

  if (self._cb) {
    var cb = self._cb
    self._cb = null
    cb()
  }
}

// TODO: if zero actually works in all browsers, remove the logic associated with this below
var EPSILON = 0

MediaSourceStream.prototype._getBufferDuration = function () {
  var self = this

  var buffered = self._sourceBuffer.buffered
  var currentTime = self._elem.currentTime
  var bufferEnd = -1 // end of the buffer
  // This is a little over complex because some browsers seem to separate the
  // buffered region into multiple sections with slight gaps.
  for (var i = 0; i < buffered.length; i++) {
    var start = buffered.start(i)
    var end = buffered.end(i) + EPSILON

    if (start > currentTime) {
      // Reached past the joined buffer
      break
    } else if (bufferEnd >= 0 || currentTime <= end) {
      // Found the start/continuation of the joined buffer
      bufferEnd = end
    }
  }

  var bufferedTime = bufferEnd - currentTime
  if (bufferedTime < 0) {
    bufferedTime = 0
  }

  return bufferedTime
}

},{"inherits":56,"readable-stream":97,"to-arraybuffer":122}],65:[function(require,module,exports){
(function (process){
module.exports = Storage

function Storage (chunkLength, opts) {
  if (!(this instanceof Storage)) return new Storage(chunkLength, opts)
  if (!opts) opts = {}

  this.chunkLength = Number(chunkLength)
  if (!this.chunkLength) throw new Error('First argument must be a chunk length')

  this.chunks = []
  this.closed = false
  this.length = Number(opts.length) || Infinity

  if (this.length !== Infinity) {
    this.lastChunkLength = (this.length % this.chunkLength) || this.chunkLength
    this.lastChunkIndex = Math.ceil(this.length / this.chunkLength) - 1
  }
}

Storage.prototype.put = function (index, buf, cb) {
  if (this.closed) return nextTick(cb, new Error('Storage is closed'))

  var isLastChunk = (index === this.lastChunkIndex)
  if (isLastChunk && buf.length !== this.lastChunkLength) {
    return nextTick(cb, new Error('Last chunk length must be ' + this.lastChunkLength))
  }
  if (!isLastChunk && buf.length !== this.chunkLength) {
    return nextTick(cb, new Error('Chunk length must be ' + this.chunkLength))
  }
  this.chunks[index] = buf
  nextTick(cb, null)
}

Storage.prototype.get = function (index, opts, cb) {
  if (typeof opts === 'function') return this.get(index, null, opts)
  if (this.closed) return nextTick(cb, new Error('Storage is closed'))
  var buf = this.chunks[index]
  if (!buf) return nextTick(cb, new Error('Chunk not found'))
  if (!opts) return nextTick(cb, null, buf)
  var offset = opts.offset || 0
  var len = opts.length || (buf.length - offset)
  nextTick(cb, null, buf.slice(offset, len + offset))
}

Storage.prototype.close = Storage.prototype.destroy = function (cb) {
  if (this.closed) return nextTick(cb, new Error('Storage is closed'))
  this.closed = true
  this.chunks = null
  nextTick(cb, null)
}

function nextTick (cb, err, val) {
  process.nextTick(function () {
    if (cb) cb(err, val)
  })
}

}).call(this,require('_process'))
},{"_process":22}],66:[function(require,module,exports){
'use strict';
// Create a range object for efficently rendering strings to elements.
var range;

var doc = typeof document !== 'undefined' && document;

var testEl = doc ?
    doc.body || doc.createElement('div') :
    {};

var NS_XHTML = 'http://www.w3.org/1999/xhtml';

var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

// Fixes <https://github.com/patrick-steele-idem/morphdom/issues/32>
// (IE7+ support) <=IE7 does not support el.hasAttribute(name)
var hasAttributeNS;

if (testEl.hasAttributeNS) {
    hasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttributeNS(namespaceURI, name);
    };
} else if (testEl.hasAttribute) {
    hasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttribute(name);
    };
} else {
    hasAttributeNS = function(el, namespaceURI, name) {
        return !!el.getAttributeNode(name);
    };
}

function toElement(str) {
    if (!range && doc.createRange) {
        range = doc.createRange();
        range.selectNode(doc.body);
    }

    var fragment;
    if (range && range.createContextualFragment) {
        fragment = range.createContextualFragment(str);
    } else {
        fragment = doc.createElement('body');
        fragment.innerHTML = str;
    }
    return fragment.childNodes[0];
}

function syncBooleanAttrProp(fromEl, toEl, name) {
    if (fromEl[name] !== toEl[name]) {
        fromEl[name] = toEl[name];
        if (fromEl[name]) {
            fromEl.setAttribute(name, '');
        } else {
            fromEl.removeAttribute(name, '');
        }
    }
}

var specialElHandlers = {
    /**
     * Needed for IE. Apparently IE doesn't think that "selected" is an
     * attribute when reading over the attributes using selectEl.attributes
     */
    OPTION: function(fromEl, toEl) {
        syncBooleanAttrProp(fromEl, toEl, 'selected');
    },
    /**
     * The "value" attribute is special for the <input> element since it sets
     * the initial value. Changing the "value" attribute without changing the
     * "value" property will have no effect since it is only used to the set the
     * initial value.  Similar for the "checked" attribute, and "disabled".
     */
    INPUT: function(fromEl, toEl) {
        syncBooleanAttrProp(fromEl, toEl, 'checked');
        syncBooleanAttrProp(fromEl, toEl, 'disabled');

        if (fromEl.value !== toEl.value) {
            fromEl.value = toEl.value;
        }

        if (!hasAttributeNS(toEl, null, 'value')) {
            fromEl.removeAttribute('value');
        }
    },

    TEXTAREA: function(fromEl, toEl) {
        var newValue = toEl.value;
        if (fromEl.value !== newValue) {
            fromEl.value = newValue;
        }

        if (fromEl.firstChild) {
            fromEl.firstChild.nodeValue = newValue;
        }
    }
};

function noop() {}

/**
 * Returns true if two node's names are the same.
 *
 * NOTE: We don't bother checking `namespaceURI` because you will never find two HTML elements with the same
 *       nodeName and different namespace URIs.
 *
 * @param {Element} a
 * @param {Element} b The target element
 * @return {boolean}
 */
function compareNodeNames(fromEl, toEl) {
    var fromNodeName = fromEl.nodeName;
    var toNodeName = toEl.nodeName;

    if (fromNodeName === toNodeName) {
        return true;
    }

    if (toEl.actualize &&
        fromNodeName.charCodeAt(0) < 91 && /* from tag name is upper case */
        toNodeName.charCodeAt(0) > 90 /* target tag name is lower case */) {
        // If the target element is a virtual DOM node then we may need to normalize the tag name
        // before comparing. Normal HTML elements that are in the "http://www.w3.org/1999/xhtml"
        // are converted to upper case
        return fromNodeName === toNodeName.toUpperCase();
    } else {
        return false;
    }
}

/**
 * Create an element, optionally with a known namespace URI.
 *
 * @param {string} name the element name, e.g. 'div' or 'svg'
 * @param {string} [namespaceURI] the element's namespace URI, i.e. the value of
 * its `xmlns` attribute or its inferred namespace.
 *
 * @return {Element}
 */
function createElementNS(name, namespaceURI) {
    return !namespaceURI || namespaceURI === NS_XHTML ?
        doc.createElement(name) :
        doc.createElementNS(namespaceURI, name);
}

/**
 * Loop over all of the attributes on the target node and make sure the original
 * DOM node has the same attributes. If an attribute found on the original node
 * is not on the new node then remove it from the original node.
 *
 * @param  {Element} fromNode
 * @param  {Element} toNode
 */
function morphAttrs(fromNode, toNode) {
    if (toNode.assignAttributes) {
        toNode.assignAttributes(fromNode);
    } else {
        var attrs = toNode.attributes;
        var i;
        var attr;
        var attrName;
        var attrNamespaceURI;
        var attrValue;
        var fromValue;

        for (i = attrs.length - 1; i >= 0; --i) {
            attr = attrs[i];
            attrName = attr.name;
            attrNamespaceURI = attr.namespaceURI;
            attrValue = attr.value;

            if (attrNamespaceURI) {
                attrName = attr.localName || attrName;
                fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);

                if (fromValue !== attrValue) {
                    fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
                }
            } else {
                fromValue = fromNode.getAttribute(attrName);

                if (fromValue !== attrValue) {
                    fromNode.setAttribute(attrName, attrValue);
                }
            }
        }

        // Remove any extra attributes found on the original DOM element that
        // weren't found on the target element.
        attrs = fromNode.attributes;

        for (i = attrs.length - 1; i >= 0; --i) {
            attr = attrs[i];
            if (attr.specified !== false) {
                attrName = attr.name;
                attrNamespaceURI = attr.namespaceURI;

                if (attrNamespaceURI) {
                    attrName = attr.localName || attrName;

                    if (!hasAttributeNS(toNode, attrNamespaceURI, attrName)) {
                        fromNode.removeAttributeNS(attrNamespaceURI, attrName);
                    }
                } else {
                    if (!hasAttributeNS(toNode, null, attrName)) {
                        fromNode.removeAttribute(attrName);
                    }
                }
            }
        }
    }
}

/**
 * Copies the children of one DOM element to another DOM element
 */
function moveChildren(fromEl, toEl) {
    var curChild = fromEl.firstChild;
    while (curChild) {
        var nextChild = curChild.nextSibling;
        toEl.appendChild(curChild);
        curChild = nextChild;
    }
    return toEl;
}

function defaultGetNodeKey(node) {
    return node.id;
}

function morphdom(fromNode, toNode, options) {
    if (!options) {
        options = {};
    }

    if (typeof toNode === 'string') {
        if (fromNode.nodeName === '#document' || fromNode.nodeName === 'HTML') {
            var toNodeHtml = toNode;
            toNode = doc.createElement('html');
            toNode.innerHTML = toNodeHtml;
        } else {
            toNode = toElement(toNode);
        }
    }

    var getNodeKey = options.getNodeKey || defaultGetNodeKey;
    var onBeforeNodeAdded = options.onBeforeNodeAdded || noop;
    var onNodeAdded = options.onNodeAdded || noop;
    var onBeforeElUpdated = options.onBeforeElUpdated || noop;
    var onElUpdated = options.onElUpdated || noop;
    var onBeforeNodeDiscarded = options.onBeforeNodeDiscarded || noop;
    var onNodeDiscarded = options.onNodeDiscarded || noop;
    var onBeforeElChildrenUpdated = options.onBeforeElChildrenUpdated || noop;
    var childrenOnly = options.childrenOnly === true;

    // This object is used as a lookup to quickly find all keyed elements in the original DOM tree.
    var fromNodesLookup = {};
    var keyedRemovalList;

    function addKeyedRemoval(key) {
        if (keyedRemovalList) {
            keyedRemovalList.push(key);
        } else {
            keyedRemovalList = [key];
        }
    }

    function walkDiscardedChildNodes(node, skipKeyedNodes) {
        if (node.nodeType === ELEMENT_NODE) {
            var curChild = node.firstChild;
            while (curChild) {

                var key = undefined;

                if (skipKeyedNodes && (key = getNodeKey(curChild))) {
                    // If we are skipping keyed nodes then we add the key
                    // to a list so that it can be handled at the very end.
                    addKeyedRemoval(key);
                } else {
                    // Only report the node as discarded if it is not keyed. We do this because
                    // at the end we loop through all keyed elements that were unmatched
                    // and then discard them in one final pass.
                    onNodeDiscarded(curChild);
                    if (curChild.firstChild) {
                        walkDiscardedChildNodes(curChild, skipKeyedNodes);
                    }
                }

                curChild = curChild.nextSibling;
            }
        }
    }

    /**
     * Removes a DOM node out of the original DOM
     *
     * @param  {Node} node The node to remove
     * @param  {Node} parentNode The nodes parent
     * @param  {Boolean} skipKeyedNodes If true then elements with keys will be skipped and not discarded.
     * @return {undefined}
     */
    function removeNode(node, parentNode, skipKeyedNodes) {
        if (onBeforeNodeDiscarded(node) === false) {
            return;
        }

        if (parentNode) {
            parentNode.removeChild(node);
        }

        onNodeDiscarded(node);
        walkDiscardedChildNodes(node, skipKeyedNodes);
    }

    // // TreeWalker implementation is no faster, but keeping this around in case this changes in the future
    // function indexTree(root) {
    //     var treeWalker = document.createTreeWalker(
    //         root,
    //         NodeFilter.SHOW_ELEMENT);
    //
    //     var el;
    //     while((el = treeWalker.nextNode())) {
    //         var key = getNodeKey(el);
    //         if (key) {
    //             fromNodesLookup[key] = el;
    //         }
    //     }
    // }

    // // NodeIterator implementation is no faster, but keeping this around in case this changes in the future
    //
    // function indexTree(node) {
    //     var nodeIterator = document.createNodeIterator(node, NodeFilter.SHOW_ELEMENT);
    //     var el;
    //     while((el = nodeIterator.nextNode())) {
    //         var key = getNodeKey(el);
    //         if (key) {
    //             fromNodesLookup[key] = el;
    //         }
    //     }
    // }

    function indexTree(node) {
        if (node.nodeType === ELEMENT_NODE) {
            var curChild = node.firstChild;
            while (curChild) {
                var key = getNodeKey(curChild);
                if (key) {
                    fromNodesLookup[key] = curChild;
                }

                // Walk recursively
                indexTree(curChild);

                curChild = curChild.nextSibling;
            }
        }
    }

    indexTree(fromNode);

    function handleNodeAdded(el) {
        onNodeAdded(el);

        var curChild = el.firstChild;
        while (curChild) {
            var nextSibling = curChild.nextSibling;

            var key = getNodeKey(curChild);
            if (key) {
                var unmatchedFromEl = fromNodesLookup[key];
                if (unmatchedFromEl && compareNodeNames(curChild, unmatchedFromEl)) {
                    curChild.parentNode.replaceChild(unmatchedFromEl, curChild);
                    morphEl(unmatchedFromEl, curChild);
                }
            }

            handleNodeAdded(curChild);
            curChild = nextSibling;
        }
    }

    function morphEl(fromEl, toEl, childrenOnly) {
        var toElKey = getNodeKey(toEl);
        var curFromNodeKey;

        if (toElKey) {
            // If an element with an ID is being morphed then it is will be in the final
            // DOM so clear it out of the saved elements collection
            delete fromNodesLookup[toElKey];
        }

        if (toNode.isSameNode && toNode.isSameNode(fromNode)) {
            return;
        }

        if (!childrenOnly) {
            if (onBeforeElUpdated(fromEl, toEl) === false) {
                return;
            }

            morphAttrs(fromEl, toEl);
            onElUpdated(fromEl);

            if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
                return;
            }
        }

        if (fromEl.nodeName !== 'TEXTAREA') {
            var curToNodeChild = toEl.firstChild;
            var curFromNodeChild = fromEl.firstChild;
            var curToNodeKey;

            var fromNextSibling;
            var toNextSibling;
            var matchingFromEl;

            outer: while (curToNodeChild) {
                toNextSibling = curToNodeChild.nextSibling;
                curToNodeKey = getNodeKey(curToNodeChild);

                while (curFromNodeChild) {
                    fromNextSibling = curFromNodeChild.nextSibling;

                    if (curToNodeChild.isSameNode && curToNodeChild.isSameNode(curFromNodeChild)) {
                        curToNodeChild = toNextSibling;
                        curFromNodeChild = fromNextSibling;
                        continue outer;
                    }

                    curFromNodeKey = getNodeKey(curFromNodeChild);

                    var curFromNodeType = curFromNodeChild.nodeType;

                    var isCompatible = undefined;

                    if (curFromNodeType === curToNodeChild.nodeType) {
                        if (curFromNodeType === ELEMENT_NODE) {
                            // Both nodes being compared are Element nodes

                            if (curToNodeKey) {
                                // The target node has a key so we want to match it up with the correct element
                                // in the original DOM tree
                                if (curToNodeKey !== curFromNodeKey) {
                                    // The current element in the original DOM tree does not have a matching key so
                                    // let's check our lookup to see if there is a matching element in the original
                                    // DOM tree
                                    if ((matchingFromEl = fromNodesLookup[curToNodeKey])) {
                                        if (curFromNodeChild.nextSibling === matchingFromEl) {
                                            // Special case for single element removals. To avoid removing the original
                                            // DOM node out of the tree (since that can break CSS transitions, etc.),
                                            // we will instead discard the current node and wait until the next
                                            // iteration to properly match up the keyed target element with its matching
                                            // element in the original tree
                                            isCompatible = false;
                                        } else {
                                            // We found a matching keyed element somewhere in the original DOM tree.
                                            // Let's moving the original DOM node into the current position and morph
                                            // it.

                                            // NOTE: We use insertBefore instead of replaceChild because we want to go through
                                            // the `removeNode()` function for the node that is being discarded so that
                                            // all lifecycle hooks are correctly invoked
                                            fromEl.insertBefore(matchingFromEl, curFromNodeChild);

                                            if (curFromNodeKey) {
                                                // Since the node is keyed it might be matched up later so we defer
                                                // the actual removal to later
                                                addKeyedRemoval(curFromNodeKey);
                                            } else {
                                                // NOTE: we skip nested keyed nodes from being removed since there is
                                                //       still a chance they will be matched up later
                                                removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);

                                            }
                                            fromNextSibling = curFromNodeChild.nextSibling;
                                            curFromNodeChild = matchingFromEl;
                                        }
                                    } else {
                                        // The nodes are not compatible since the "to" node has a key and there
                                        // is no matching keyed node in the source tree
                                        isCompatible = false;
                                    }
                                }
                            } else if (curFromNodeKey) {
                                // The original has a key
                                isCompatible = false;
                            }

                            isCompatible = isCompatible !== false && compareNodeNames(curFromNodeChild, curToNodeChild);
                            if (isCompatible) {
                                // We found compatible DOM elements so transform
                                // the current "from" node to match the current
                                // target DOM node.
                                morphEl(curFromNodeChild, curToNodeChild);
                            }

                        } else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
                            // Both nodes being compared are Text or Comment nodes
                            isCompatible = true;
                            // Simply update nodeValue on the original node to
                            // change the text value
                            curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                        }
                    }

                    if (isCompatible) {
                        // Advance both the "to" child and the "from" child since we found a match
                        curToNodeChild = toNextSibling;
                        curFromNodeChild = fromNextSibling;
                        continue outer;
                    }

                    // No compatible match so remove the old node from the DOM and continue trying to find a
                    // match in the original DOM. However, we only do this if the from node is not keyed
                    // since it is possible that a keyed node might match up with a node somewhere else in the
                    // target tree and we don't want to discard it just yet since it still might find a
                    // home in the final DOM tree. After everything is done we will remove any keyed nodes
                    // that didn't find a home
                    if (curFromNodeKey) {
                        // Since the node is keyed it might be matched up later so we defer
                        // the actual removal to later
                        addKeyedRemoval(curFromNodeKey);
                    } else {
                        // NOTE: we skip nested keyed nodes from being removed since there is
                        //       still a chance they will be matched up later
                        removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                    }

                    curFromNodeChild = fromNextSibling;
                }

                // If we got this far then we did not find a candidate match for
                // our "to node" and we exhausted all of the children "from"
                // nodes. Therefore, we will just append the current "to" node
                // to the end
                if (curToNodeKey && (matchingFromEl = fromNodesLookup[curToNodeKey]) && compareNodeNames(matchingFromEl, curToNodeChild)) {
                    fromEl.appendChild(matchingFromEl);
                    morphEl(matchingFromEl, curToNodeChild);
                } else {
                    var onBeforeNodeAddedResult = onBeforeNodeAdded(curToNodeChild);
                    if (onBeforeNodeAddedResult !== false) {
                        if (onBeforeNodeAddedResult) {
                            curToNodeChild = onBeforeNodeAddedResult;
                        }

                        if (curToNodeChild.actualize) {
                            curToNodeChild = curToNodeChild.actualize(fromEl.ownerDocument || doc);
                        }
                        fromEl.appendChild(curToNodeChild);
                        handleNodeAdded(curToNodeChild);
                    }
                }

                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
            }

            // We have processed all of the "to nodes". If curFromNodeChild is
            // non-null then we still have some from nodes left over that need
            // to be removed
            while (curFromNodeChild) {
                fromNextSibling = curFromNodeChild.nextSibling;
                if ((curFromNodeKey = getNodeKey(curFromNodeChild))) {
                    // Since the node is keyed it might be matched up later so we defer
                    // the actual removal to later
                    addKeyedRemoval(curFromNodeKey);
                } else {
                    // NOTE: we skip nested keyed nodes from being removed since there is
                    //       still a chance they will be matched up later
                    removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                }
                curFromNodeChild = fromNextSibling;
            }
        }

        var specialElHandler = specialElHandlers[fromEl.nodeName];
        if (specialElHandler) {
            specialElHandler(fromEl, toEl);
        }
    } // END: morphEl(...)

    var morphedNode = fromNode;
    var morphedNodeType = morphedNode.nodeType;
    var toNodeType = toNode.nodeType;

    if (!childrenOnly) {
        // Handle the case where we are given two DOM nodes that are not
        // compatible (e.g. <div> --> <span> or <div> --> TEXT)
        if (morphedNodeType === ELEMENT_NODE) {
            if (toNodeType === ELEMENT_NODE) {
                if (!compareNodeNames(fromNode, toNode)) {
                    onNodeDiscarded(fromNode);
                    morphedNode = moveChildren(fromNode, createElementNS(toNode.nodeName, toNode.namespaceURI));
                }
            } else {
                // Going from an element node to a text node
                morphedNode = toNode;
            }
        } else if (morphedNodeType === TEXT_NODE || morphedNodeType === COMMENT_NODE) { // Text or comment node
            if (toNodeType === morphedNodeType) {
                morphedNode.nodeValue = toNode.nodeValue;
                return morphedNode;
            } else {
                // Text node to something else
                morphedNode = toNode;
            }
        }
    }

    if (morphedNode === toNode) {
        // The "to node" was not compatible with the "from node" so we had to
        // toss out the "from node" and use the "to node"
        onNodeDiscarded(fromNode);
    } else {
        morphEl(morphedNode, toNode, childrenOnly);

        // We now need to loop over any keyed nodes that might need to be
        // removed. We only do the removal if we know that the keyed node
        // never found a match. When a keyed node is matched up we remove
        // it out of fromNodesLookup and we use fromNodesLookup to determine
        // if a keyed node has been matched up or not
        if (keyedRemovalList) {
            for (var i=0, len=keyedRemovalList.length; i<len; i++) {
                var elToRemove = fromNodesLookup[keyedRemovalList[i]];
                if (elToRemove) {
                    removeNode(elToRemove, elToRemove.parentNode, false);
                }
            }
        }
    }

    if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
        if (morphedNode.actualize) {
            morphedNode = morphedNode.actualize(fromNode.ownerDocument || doc);
        }
        // If we had to swap out the from node with a new node because the old
        // node was not compatible with the target node then we need to
        // replace the old DOM node in the original DOM tree. This is only
        // possible if the original DOM node was part of a DOM tree which
        // we know is the case if it has a parent node.
        fromNode.parentNode.replaceChild(morphedNode, fromNode);
    }

    return morphedNode;
}

module.exports = morphdom;

},{}],67:[function(require,module,exports){
(function (Buffer){
// This is an intentionally recursive require. I don't like it either.
var Box = require('./index')
var Descriptor = require('./descriptor')

var TIME_OFFSET = 2082844800000

/*
TODO:
test these
add new box versions
*/

// These have 'version' and 'flags' fields in the headers
exports.fullBoxes = {}
var fullBoxes = [
  'mvhd',
  'tkhd',
  'mdhd',
  'vmhd',
  'smhd',
  'stsd',
  'esds',
  'stsz',
  'stco',
  'stss',
  'stts',
  'ctts',
  'stsc',
  'dref',
  'elst',
  'hdlr',
  'mehd',
  'trex',
  'mfhd',
  'tfhd',
  'tfdt',
  'trun'
]
fullBoxes.forEach(function (type) {
  exports.fullBoxes[type] = true
})

exports.ftyp = {}
exports.ftyp.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(exports.ftyp.encodingLength(box))
  var brands = box.compatibleBrands || []
  buf.write(box.brand, 0, 4, 'ascii')
  buf.writeUInt32BE(box.brandVersion, 4)
  for (var i = 0; i < brands.length; i++) buf.write(brands[i], 8 + (i * 4), 4, 'ascii')
  exports.ftyp.encode.bytes = 8 + brands.length * 4
  return buf
}
exports.ftyp.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var brand = buf.toString('ascii', 0, 4)
  var version = buf.readUInt32BE(4)
  var compatibleBrands = []
  for (var i = 8; i < buf.length; i += 4) compatibleBrands.push(buf.toString('ascii', i, i + 4))
  return {
    brand: brand,
    brandVersion: version,
    compatibleBrands: compatibleBrands
  }
}
exports.ftyp.encodingLength = function (box) {
  return 8 + (box.compatibleBrands || []).length * 4
}

exports.mvhd = {}
exports.mvhd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(96)
  writeDate(box.ctime || new Date(), buf, 0)
  writeDate(box.mtime || new Date(), buf, 4)
  buf.writeUInt32BE(box.timeScale || 0, 8)
  buf.writeUInt32BE(box.duration || 0, 12)
  writeFixed32(box.preferredRate || 0, buf, 16)
  writeFixed16(box.preferredVolume || 0, buf, 20)
  writeReserved(buf, 22, 32)
  writeMatrix(box.matrix, buf, 32)
  buf.writeUInt32BE(box.previewTime || 0, 68)
  buf.writeUInt32BE(box.previewDuration || 0, 72)
  buf.writeUInt32BE(box.posterTime || 0, 76)
  buf.writeUInt32BE(box.selectionTime || 0, 80)
  buf.writeUInt32BE(box.selectionDuration || 0, 84)
  buf.writeUInt32BE(box.currentTime || 0, 88)
  buf.writeUInt32BE(box.nextTrackId || 0, 92)
  exports.mvhd.encode.bytes = 96
  return buf
}
exports.mvhd.decode = function (buf, offset) {
  buf = buf.slice(offset)
  return {
    ctime: readDate(buf, 0),
    mtime: readDate(buf, 4),
    timeScale: buf.readUInt32BE(8),
    duration: buf.readUInt32BE(12),
    preferredRate: readFixed32(buf, 16),
    preferredVolume: readFixed16(buf, 20),
    matrix: readMatrix(buf.slice(32, 68)),
    previewTime: buf.readUInt32BE(68),
    previewDuration: buf.readUInt32BE(72),
    posterTime: buf.readUInt32BE(76),
    selectionTime: buf.readUInt32BE(80),
    selectionDuration: buf.readUInt32BE(84),
    currentTime: buf.readUInt32BE(88),
    nextTrackId: buf.readUInt32BE(92)
  }
}
exports.mvhd.encodingLength = function (box) {
  return 96
}

exports.tkhd = {}
exports.tkhd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(80)
  writeDate(box.ctime || new Date(), buf, 0)
  writeDate(box.mtime || new Date(), buf, 4)
  buf.writeUInt32BE(box.trackId || 0, 8)
  writeReserved(buf, 12, 16)
  buf.writeUInt32BE(box.duration || 0, 16)
  writeReserved(buf, 20, 28)
  buf.writeUInt16BE(box.layer || 0, 28)
  buf.writeUInt16BE(box.alternateGroup || 0, 30)
  buf.writeUInt16BE(box.volume || 0, 32)
  writeMatrix(box.matrix, buf, 36)
  buf.writeUInt32BE(box.trackWidth || 0, 72)
  buf.writeUInt32BE(box.trackHeight || 0, 76)
  exports.tkhd.encode.bytes = 80
  return buf
}
exports.tkhd.decode = function (buf, offset) {
  buf = buf.slice(offset)
  return {
    ctime: readDate(buf, 0),
    mtime: readDate(buf, 4),
    trackId: buf.readUInt32BE(8),
    duration: buf.readUInt32BE(16),
    layer: buf.readUInt16BE(28),
    alternateGroup: buf.readUInt16BE(30),
    volume: buf.readUInt16BE(32),
    matrix: readMatrix(buf.slice(36, 72)),
    trackWidth: buf.readUInt32BE(72),
    trackHeight: buf.readUInt32BE(76)
  }
}
exports.tkhd.encodingLength = function (box) {
  return 80
}

exports.mdhd = {}
exports.mdhd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(20)
  writeDate(box.ctime || new Date(), buf, 0)
  writeDate(box.mtime || new Date(), buf, 4)
  buf.writeUInt32BE(box.timeScale || 0, 8)
  buf.writeUInt32BE(box.duration || 0, 12)
  buf.writeUInt16BE(box.language || 0, 16)
  buf.writeUInt16BE(box.quality || 0, 18)
  exports.mdhd.encode.bytes = 20
  return buf
}
exports.mdhd.decode = function (buf, offset) {
  buf = buf.slice(offset)
  return {
    ctime: readDate(buf, 0),
    mtime: readDate(buf, 4),
    timeScale: buf.readUInt32BE(8),
    duration: buf.readUInt32BE(12),
    language: buf.readUInt16BE(16),
    quality: buf.readUInt16BE(18)
  }
}
exports.mdhd.encodingLength = function (box) {
  return 20
}

exports.vmhd = {}
exports.vmhd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(8)
  buf.writeUInt16BE(box.graphicsMode || 0, 0)
  var opcolor = box.opcolor || [0, 0, 0]
  buf.writeUInt16BE(opcolor[0], 2)
  buf.writeUInt16BE(opcolor[1], 4)
  buf.writeUInt16BE(opcolor[2], 6)
  exports.vmhd.encode.bytes = 8
  return buf
}
exports.vmhd.decode = function (buf, offset) {
  buf = buf.slice(offset)
  return {
    graphicsMode: buf.readUInt16BE(0),
    opcolor: [buf.readUInt16BE(2), buf.readUInt16BE(4), buf.readUInt16BE(6)]
  }
}
exports.vmhd.encodingLength = function (box) {
  return 8
}

exports.smhd = {}
exports.smhd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(4)
  buf.writeUInt16BE(box.balance || 0, 0)
  writeReserved(buf, 2, 4)
  exports.smhd.encode.bytes = 4
  return buf
}
exports.smhd.decode = function (buf, offset) {
  buf = buf.slice(offset)
  return {
    balance: buf.readUInt16BE(0)
  }
}
exports.smhd.encodingLength = function (box) {
  return 4
}

exports.stsd = {}
exports.stsd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(exports.stsd.encodingLength(box))
  var entries = box.entries || []

  buf.writeUInt32BE(entries.length, 0)

  var ptr = 4
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i]
    Box.encode(entry, buf, ptr)
    ptr += Box.encode.bytes
  }

  exports.stsd.encode.bytes = ptr
  return buf
}
exports.stsd.decode = function (buf, offset, end) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)
  var ptr = 4

  for (var i = 0; i < num; i++) {
    var entry = Box.decode(buf, ptr, end)
    entries[i] = entry
    ptr += entry.length
  }

  return {
    entries: entries
  }
}
exports.stsd.encodingLength = function (box) {
  var totalSize = 4
  if (!box.entries) return totalSize
  for (var i = 0; i < box.entries.length; i++) {
    totalSize += Box.encodingLength(box.entries[i])
  }
  return totalSize
}

exports.avc1 = exports.VisualSampleEntry = {}
exports.VisualSampleEntry.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(exports.VisualSampleEntry.encodingLength(box))

  writeReserved(buf, 0, 6)
  buf.writeUInt16BE(box.dataReferenceIndex || 0, 6)
  writeReserved(buf, 8, 24)
  buf.writeUInt16BE(box.width || 0, 24)
  buf.writeUInt16BE(box.height || 0, 26)
  buf.writeUInt32BE(box.hResolution || 0x480000, 28)
  buf.writeUInt32BE(box.vResolution || 0x480000, 32)
  writeReserved(buf, 36, 40)
  buf.writeUInt16BE(box.frameCount || 1, 40)
  var compressorName = box.compressorName || ''
  var nameLen = Math.min(compressorName.length, 31)
  buf.writeUInt8(nameLen, 42)
  buf.write(compressorName, 43, nameLen, 'utf8')
  buf.writeUInt16BE(box.depth || 0x18, 74)
  buf.writeInt16BE(-1, 76)

  var ptr = 78
  var children = box.children || []
  children.forEach(function (child) {
    Box.encode(child, buf, ptr)
    ptr += Box.encode.bytes
  })
  exports.VisualSampleEntry.encode.bytes = ptr
}
exports.VisualSampleEntry.decode = function (buf, offset, end) {
  buf = buf.slice(offset)
  var length = end - offset
  var nameLen = Math.min(buf.readUInt8(42), 31)
  var box = {
    dataReferenceIndex: buf.readUInt16BE(6),
    width: buf.readUInt16BE(24),
    height: buf.readUInt16BE(26),
    hResolution: buf.readUInt32BE(28),
    vResolution: buf.readUInt32BE(32),
    frameCount: buf.readUInt16BE(40),
    compressorName: buf.toString('utf8', 43, 43 + nameLen),
    depth: buf.readUInt16BE(74),
    children: []
  }

  var ptr = 78
  while (length - ptr >= 8) {
    var child = Box.decode(buf, ptr, length)
    box.children.push(child)
    box[child.type] = child
    ptr += child.length
  }

  return box
}
exports.VisualSampleEntry.encodingLength = function (box) {
  var len = 78
  var children = box.children || []
  children.forEach(function (child) {
    len += Box.encodingLength(child)
  })
  return len
}

exports.avcC = {}
exports.avcC.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer(box.buffer.length)

  box.buffer.copy(buf)
  exports.avcC.encode.bytes = box.buffer.length
}
exports.avcC.decode = function (buf, offset, end) {
  buf = buf.slice(offset, end)

  return {
    mimeCodec: buf.toString('hex', 1, 4),
    buffer: new Buffer(buf)
  }
}
exports.avcC.encodingLength = function (box) {
  return box.buffer.length
}

exports.mp4a = exports.AudioSampleEntry = {}
exports.AudioSampleEntry.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(exports.AudioSampleEntry.encodingLength(box))

  writeReserved(buf, 0, 6)
  buf.writeUInt16BE(box.dataReferenceIndex || 0, 6)
  writeReserved(buf, 8, 16)
  buf.writeUInt16BE(box.channelCount || 2, 16)
  buf.writeUInt16BE(box.sampleSize || 16, 18)
  writeReserved(buf, 20, 24)
  buf.writeUInt32BE(box.sampleRate || 0, 24)

  var ptr = 28
  var children = box.children || []
  children.forEach(function (child) {
    Box.encode(child, buf, ptr)
    ptr += Box.encode.bytes
  })
  exports.AudioSampleEntry.encode.bytes = ptr
}
exports.AudioSampleEntry.decode = function (buf, offset, end) {
  buf = buf.slice(offset, end)
  var length = end - offset
  var box = {
    dataReferenceIndex: buf.readUInt16BE(6),
    channelCount: buf.readUInt16BE(16),
    sampleSize: buf.readUInt16BE(18),
    sampleRate: buf.readUInt32BE(24),
    children: []
  }

  var ptr = 28
  while (length - ptr >= 8) {
    var child = Box.decode(buf, ptr, length)
    box.children.push(child)
    box[child.type] = child
    ptr += child.length
  }

  return box
}
exports.AudioSampleEntry.encodingLength = function (box) {
  var len = 28
  var children = box.children || []
  children.forEach(function (child) {
    len += Box.encodingLength(child)
  })
  return len
}

exports.esds = {}
exports.esds.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer(box.buffer.length)

  box.buffer.copy(buf, 0)
  exports.esds.encode.bytes = box.buffer.length
}
exports.esds.decode = function (buf, offset, end) {
  buf = buf.slice(offset, end)

  var desc = Descriptor.Descriptor.decode(buf, 0, buf.length)
  var esd = (desc.tagName === 'ESDescriptor') ? desc : {}
  var dcd = esd.DecoderConfigDescriptor || {}
  var oti = dcd.oti || 0
  var dsi = dcd.DecoderSpecificInfo
  var audioConfig = dsi ? (dsi.buffer.readUInt8(0) & 0xf8) >> 3 : 0

  var mimeCodec = null
  if (oti) {
    mimeCodec = oti.toString(16)
    if (audioConfig) {
      mimeCodec += '.' + audioConfig
    }
  }

  return {
    mimeCodec: mimeCodec,
    buffer: new Buffer(buf.slice(0))
  }
}
exports.esds.encodingLength = function (box) {
  return box.buffer.length
}

// TODO: integrate the two versions in a saner way
exports.stsz = {}
exports.stsz.encode = function (box, buf, offset) {
  var entries = box.entries || []
  buf = buf ? buf.slice(offset) : Buffer(exports.stsz.encodingLength(box))

  buf.writeUInt32BE(0, 0)
  buf.writeUInt32BE(entries.length, 4)

  for (var i = 0; i < entries.length; i++) {
    buf.writeUInt32BE(entries[i], i * 4 + 8)
  }

  exports.stsz.encode.bytes = 8 + entries.length * 4
  return buf
}
exports.stsz.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var size = buf.readUInt32BE(0)
  var num = buf.readUInt32BE(4)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    if (size === 0) {
      entries[i] = buf.readUInt32BE(i * 4 + 8)
    } else {
      entries[i] = size
    }
  }

  return {
    entries: entries
  }
}
exports.stsz.encodingLength = function (box) {
  return 8 + box.entries.length * 4
}

exports.stss =
exports.stco = {}
exports.stco.encode = function (box, buf, offset) {
  var entries = box.entries || []
  buf = buf ? buf.slice(offset) : new Buffer(exports.stco.encodingLength(box))

  buf.writeUInt32BE(entries.length, 0)

  for (var i = 0; i < entries.length; i++) {
    buf.writeUInt32BE(entries[i], i * 4 + 4)
  }

  exports.stco.encode.bytes = 4 + entries.length * 4
  return buf
}
exports.stco.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    entries[i] = buf.readUInt32BE(i * 4 + 4)
  }

  return {
    entries: entries
  }
}
exports.stco.encodingLength = function (box) {
  return 4 + box.entries.length * 4
}

exports.stts = {}
exports.stts.encode = function (box, buf, offset) {
  var entries = box.entries || []
  buf = buf ? buf.slice(offset) : new Buffer(exports.stts.encodingLength(box))

  buf.writeUInt32BE(entries.length, 0)

  for (var i = 0; i < entries.length; i++) {
    var ptr = i * 8 + 4
    buf.writeUInt32BE(entries[i].count || 0, ptr)
    buf.writeUInt32BE(entries[i].duration || 0, ptr + 4)
  }

  exports.stts.encode.bytes = 4 + box.entries.length * 8
  return buf
}
exports.stts.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    var ptr = i * 8 + 4
    entries[i] = {
      count: buf.readUInt32BE(ptr),
      duration: buf.readUInt32BE(ptr + 4)
    }
  }

  return {
    entries: entries
  }
}
exports.stts.encodingLength = function (box) {
  return 4 + box.entries.length * 8
}

exports.ctts = {}
exports.ctts.encode = function (box, buf, offset) {
  var entries = box.entries || []
  buf = buf ? buf.slice(offset) : new Buffer(exports.ctts.encodingLength(box))

  buf.writeUInt32BE(entries.length, 0)

  for (var i = 0; i < entries.length; i++) {
    var ptr = i * 8 + 4
    buf.writeUInt32BE(entries[i].count || 0, ptr)
    buf.writeUInt32BE(entries[i].compositionOffset || 0, ptr + 4)
  }

  exports.ctts.encode.bytes = 4 + entries.length * 8
  return buf
}
exports.ctts.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    var ptr = i * 8 + 4
    entries[i] = {
      count: buf.readUInt32BE(ptr),
      compositionOffset: buf.readInt32BE(ptr + 4)
    }
  }

  return {
    entries: entries
  }
}
exports.ctts.encodingLength = function (box) {
  return 4 + box.entries.length * 8
}

exports.stsc = {}
exports.stsc.encode = function (box, buf, offset) {
  var entries = box.entries || []
  buf = buf ? buf.slice(offset) : new Buffer(exports.stsc.encodingLength(box))

  buf.writeUInt32BE(entries.length, 0)

  for (var i = 0; i < entries.length; i++) {
    var ptr = i * 12 + 4
    buf.writeUInt32BE(entries[i].firstChunk || 0, ptr)
    buf.writeUInt32BE(entries[i].samplesPerChunk || 0, ptr + 4)
    buf.writeUInt32BE(entries[i].sampleDescriptionId || 0, ptr + 8)
  }

  exports.stsc.encode.bytes = 4 + entries.length * 12
  return buf
}
exports.stsc.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    var ptr = i * 12 + 4
    entries[i] = {
      firstChunk: buf.readUInt32BE(ptr),
      samplesPerChunk: buf.readUInt32BE(ptr + 4),
      sampleDescriptionId: buf.readUInt32BE(ptr + 8)
    }
  }

  return {
    entries: entries
  }
}
exports.stsc.encodingLength = function (box) {
  return 4 + box.entries.length * 12
}

exports.dref = {}
exports.dref.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(exports.dref.encodingLength(box))
  var entries = box.entries || []

  buf.writeUInt32BE(entries.length, 0)

  var ptr = 4
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i]
    var size = (entry.buf ? entry.buf.length : 0) + 4 + 4

    buf.writeUInt32BE(size, ptr)
    ptr += 4

    buf.write(entry.type, ptr, 4, 'ascii')
    ptr += 4

    if (entry.buf) {
      entry.buf.copy(buf, ptr)
      ptr += entry.buf.length
    }
  }

  exports.dref.encode.bytes = ptr
  return buf
}
exports.dref.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)
  var ptr = 4

  for (var i = 0; i < num; i++) {
    var size = buf.readUInt32BE(ptr)
    var type = buf.toString('ascii', ptr + 4, ptr + 8)
    var tmp = buf.slice(ptr + 8, ptr + size)
    ptr += size

    entries[i] = {
      type: type,
      buf: tmp
    }
  }

  return {
    entries: entries
  }
}
exports.dref.encodingLength = function (box) {
  var totalSize = 4
  if (!box.entries) return totalSize
  for (var i = 0; i < box.entries.length; i++) {
    var buf = box.entries[i].buf
    totalSize += (buf ? buf.length : 0) + 4 + 4
  }
  return totalSize
}

exports.elst = {}
exports.elst.encode = function (box, buf, offset) {
  var entries = box.entries || []
  buf = buf ? buf.slice(offset) : new Buffer(exports.elst.encodingLength(box))

  buf.writeUInt32BE(entries.length, 0)

  for (var i = 0; i < entries.length; i++) {
    var ptr = i * 12 + 4
    buf.writeUInt32BE(entries[i].trackDuration || 0, ptr)
    buf.writeUInt32BE(entries[i].mediaTime || 0, ptr + 4)
    writeFixed32(entries[i].mediaRate || 0, buf, ptr + 8)
  }

  exports.elst.encode.bytes = 4 + entries.length * 12
  return buf
}
exports.elst.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    var ptr = i * 12 + 4
    entries[i] = {
      trackDuration: buf.readUInt32BE(ptr),
      mediaTime: buf.readInt32BE(ptr + 4),
      mediaRate: readFixed32(buf, ptr + 8)
    }
  }

  return {
    entries: entries
  }
}
exports.elst.encodingLength = function (box) {
  return 4 + box.entries.length * 12
}

exports.hdlr = {}
exports.hdlr.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(exports.hdlr.encodingLength(box))

  var len = 21 + (box.name || '').length
  buf.fill(0, 0, len)

  buf.write(box.handlerType || '', 4, 4, 'ascii')
  writeString(box.name || '', buf, 20)

  exports.hdlr.encode.bytes = len
  return buf
}
exports.hdlr.decode = function (buf, offset, end) {
  buf = buf.slice(offset)
  return {
    handlerType: buf.toString('ascii', 4, 8),
    name: readString(buf, 20, end)
  }
}
exports.hdlr.encodingLength = function (box) {
  return 21 + (box.name || '').length
}

exports.mehd = {}
exports.mehd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(4)

  buf.writeUInt32BE(box.fragmentDuration || 0, 0)
  exports.mehd.encode.bytes = 4
  return buf
}
exports.mehd.decode = function (buf, offset) {
  buf = buf.slice(offset)
  return {
    fragmentDuration: buf.readUInt32BE(0)
  }
}
exports.mehd.encodingLength = function (box) {
  return 4
}

exports.trex = {}
exports.trex.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(20)

  buf.writeUInt32BE(box.trackId || 0, 0)
  buf.writeUInt32BE(box.defaultSampleDescriptionIndex || 0, 4)
  buf.writeUInt32BE(box.defaultSampleDuration || 0, 8)
  buf.writeUInt32BE(box.defaultSampleSize || 0, 12)
  buf.writeUInt32BE(box.defaultSampleFlags || 0, 16)
  exports.trex.encode.bytes = 20
  return buf
}
exports.trex.decode = function (buf, offset) {
  buf = buf.slice(offset)
  return {
    trackId: buf.readUInt32BE(0),
    defaultSampleDescriptionIndex: buf.readUInt32BE(4),
    defaultSampleDuration: buf.readUInt32BE(8),
    defaultSampleSize: buf.readUInt32BE(12),
    defaultSampleFlags: buf.readUInt32BE(16)
  }
}
exports.trex.encodingLength = function (box) {
  return 20
}

exports.mfhd = {}
exports.mfhd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(4)

  buf.writeUInt32BE(box.sequenceNumber || 0, 0)
  exports.mfhd.encode.bytes = 4
  return buf
}
exports.mfhd.decode = function (buf, offset) {
  return {
    sequenceNumber: buf.readUint32BE(0)
  }
}
exports.mfhd.encodingLength = function (box) {
  return 4
}

exports.tfhd = {}
exports.tfhd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(4)
  buf.writeUInt32BE(box.trackId, 0)
  exports.tfhd.encode.bytes = 4
  return buf
}
exports.tfhd.decode = function (buf, offset) {
  // TODO: this
}
exports.tfhd.encodingLength = function (box) {
  // TODO: this is wrong!
  return 4
}

exports.tfdt = {}
exports.tfdt.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(4)

  buf.writeUInt32BE(box.baseMediaDecodeTime || 0, 0)
  exports.tfdt.encode.bytes = 4
  return buf
}
exports.tfdt.decode = function (buf, offset) {
  // TODO: this
}
exports.tfdt.encodingLength = function (box) {
  return 4
}

exports.trun = {}
exports.trun.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : new Buffer(8 + box.entries.length * 16)

  // TODO: this is wrong
  buf.writeUInt32BE(box.entries.length, 0)
  buf.writeInt32BE(box.dataOffset, 4)
  var ptr = 8
  for (var i = 0; i < box.entries.length; i++) {
    var entry = box.entries[i]
    buf.writeUInt32BE(entry.sampleDuration, ptr)
    ptr += 4

    buf.writeUInt32BE(entry.sampleSize, ptr)
    ptr += 4

    buf.writeUInt32BE(entry.sampleFlags, ptr)
    ptr += 4

    buf.writeUInt32BE(entry.sampleCompositionTimeOffset, ptr)
    ptr += 4
  }
  exports.trun.encode.bytes = ptr
}
exports.trun.decode = function (buf, offset) {
  // TODO: this
}
exports.trun.encodingLength = function (box) {
  // TODO: this is wrong
  return 8 + box.entries.length * 16
}

exports.mdat = {}
exports.mdat.encode = function (box, buf, offset) {
  if (box.buffer) {
    box.buffer.copy(buf, offset)
    exports.mdat.encode.bytes = box.buffer.length
  } else {
    exports.mdat.encode.bytes = exports.mdat.encodingLength(box)
  }
}
exports.mdat.decode = function (buf, start, end) {
  return {
    buffer: new Buffer(buf.slice(start, end))
  }
}
exports.mdat.encodingLength = function (box) {
  return box.buffer ? box.buffer.length : box.contentLength
}

function writeReserved (buf, offset, end) {
  for (var i = offset; i < end; i++) buf[i] = 0
}

function writeDate (date, buf, offset) {
  buf.writeUInt32BE(Math.floor((date.getTime() + TIME_OFFSET) / 1000), offset)
}

// TODO: think something is wrong here
function writeFixed32 (num, buf, offset) {
  buf.writeUInt16BE(Math.floor(num) % (256 * 256), offset)
  buf.writeUInt16BE(Math.floor(num * 256 * 256) % (256 * 256), offset + 2)
}

function writeFixed16 (num, buf, offset) {
  buf[offset] = Math.floor(num) % 256
  buf[offset + 1] = Math.floor(num * 256) % 256
}

function writeMatrix (list, buf, offset) {
  if (!list) list = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (var i = 0; i < list.length; i++) {
    writeFixed32(list[i], buf, offset + i * 4)
  }
}

function writeString (str, buf, offset) {
  var strBuffer = new Buffer(str, 'utf8')
  strBuffer.copy(buf, offset)
  buf[offset + strBuffer.length] = 0
}

function readMatrix (buf) {
  var list = new Array(buf.length / 4)
  for (var i = 0; i < list.length; i++) list[i] = readFixed32(buf, i * 4)
  return list
}

function readDate (buf, offset) {
  return new Date(buf.readUInt32BE(offset) * 1000 - TIME_OFFSET)
}

function readFixed32 (buf, offset) {
  return buf.readUInt16BE(offset) + buf.readUInt16BE(offset + 2) / (256 * 256)
}

function readFixed16 (buf, offset) {
  return buf[offset] + buf[offset + 1] / 256
}

function readString (buf, offset, length) {
  var i
  for (i = 0; i < length; i++) {
    if (buf[offset + i] === 0) {
      break
    }
  }
  return buf.toString('utf8', offset, offset + i)
}

}).call(this,require("buffer").Buffer)
},{"./descriptor":68,"./index":69,"buffer":24}],68:[function(require,module,exports){
(function (Buffer){
var tagToName = {
  0x03: 'ESDescriptor',
  0x04: 'DecoderConfigDescriptor',
  0x05: 'DecoderSpecificInfo',
  0x06: 'SLConfigDescriptor'
}

exports.Descriptor = {}
exports.Descriptor.decode = function (buf, start, end) {
  var tag = buf.readUInt8(start)
  var ptr = start + 1
  var lenByte
  var len = 0
  do {
    lenByte = buf.readUInt8(ptr++)
    len = (len << 7) | (lenByte & 0x7f)
  } while (lenByte & 0x80)

  var obj
  var tagName = tagToName[tag] // May be undefined; that's ok
  if (exports[tagName]) {
    obj = exports[tagName].decode(buf, ptr, end)
  } else {
    obj = {
      buffer: new Buffer(buf.slice(ptr, ptr + len))
    }
  }

  obj.tag = tag
  obj.tagName = tagName
  obj.length = (ptr - start) + len
  obj.contentsLen = len
  return obj
}

exports.DescriptorArray = {}
exports.DescriptorArray.decode = function (buf, start, end) {
  var ptr = start
  var obj = {}
  while (ptr + 2 <= end) {
    var descriptor = exports.Descriptor.decode(buf, ptr, end)
    ptr += descriptor.length
    var tagName = tagToName[descriptor.tag] || ('Descriptor' + descriptor.tag)
    obj[tagName] = descriptor
  }
  return obj
}

exports.ESDescriptor = {}
exports.ESDescriptor.decode = function (buf, start, end) {
  var flags = buf.readUInt8(start + 2)
  var ptr = start + 3
  if (flags & 0x80) {
    ptr += 2
  }
  if (flags & 0x40) {
    var len = buf.readUInt8(ptr)
    ptr += len + 1
  }
  if (flags & 0x20) {
    ptr += 2
  }
  return exports.DescriptorArray.decode(buf, ptr, end)
}

exports.DecoderConfigDescriptor = {}
exports.DecoderConfigDescriptor.decode = function (buf, start, end) {
  var oti = buf.readUInt8(start)
  var obj = exports.DescriptorArray.decode(buf, start + 13, end)
  obj.oti = oti
  return obj
}

}).call(this,require("buffer").Buffer)
},{"buffer":24}],69:[function(require,module,exports){
(function (Buffer){
// var assert = require('assert')
var uint64be = require('uint64be')

var boxes = require('./boxes')

var UINT32_MAX = 4294967295

var Box = exports

/*
 * Lists the proper order for boxes inside containers.
 * Five-character names ending in 's' indicate arrays instead of single elements.
 */
var containers = exports.containers = {
  'moov': ['mvhd', 'meta', 'traks', 'mvex'],
  'trak': ['tkhd', 'tref', 'trgr', 'edts', 'meta', 'mdia', 'udta'],
  'edts': ['elst'],
  'mdia': ['mdhd', 'hdlr', 'elng', 'minf'],
  'minf': ['vmhd', 'smhd', 'hmhd', 'sthd', 'nmhd', 'dinf', 'stbl'],
  'dinf': ['dref'],
  'stbl': ['stsd', 'stts', 'ctts', 'cslg', 'stsc', 'stsz', 'stz2', 'stco', 'co64', 'stss', 'stsh', 'padb', 'stdp', 'sdtp', 'sbgps', 'sgpds', 'subss', 'saizs', 'saios'],
  'mvex': ['mehd', 'trexs', 'leva'],
  'moof': ['mfhd', 'meta', 'trafs'],
  'traf': ['tfhd', 'trun', 'sbgps', 'sgpds', 'subss', 'saizs', 'saios', 'tfdt', 'meta']
}

Box.encode = function (obj, buffer, offset) {
  Box.encodingLength(obj) // sets every level appropriately
  offset = offset || 0
  buffer = buffer || new Buffer(obj.length)
  return Box._encode(obj, buffer, offset)
}

Box._encode = function (obj, buffer, offset) {
  var type = obj.type
  var len = obj.length
  if (len > UINT32_MAX) {
    len = 1
  }
  buffer.writeUInt32BE(len, offset)
  buffer.write(obj.type, offset + 4, 4, 'ascii')
  var ptr = offset + 8
  if (len === 1) {
    uint64be.encode(obj.length, buffer, ptr)
    ptr += 8
  }
  if (boxes.fullBoxes[type]) {
    buffer.writeUInt32BE(obj.flags || 0, ptr)
    buffer.writeUInt8(obj.version || 0, ptr)
    ptr += 4
  }

  if (containers[type]) {
    var contents = containers[type]
    contents.forEach(function (childType) {
      if (childType.length === 5) {
        var entry = obj[childType] || []
        childType = childType.substr(0, 4)
        entry.forEach(function (child) {
          Box._encode(child, buffer, ptr)
          ptr += Box.encode.bytes
        })
      } else if (obj[childType]) {
        Box._encode(obj[childType], buffer, ptr)
        ptr += Box.encode.bytes
      }
    })
    if (obj.otherBoxes) {
      obj.otherBoxes.forEach(function (child) {
        Box._encode(child, buffer, ptr)
        ptr += Box.encode.bytes
      })
    }
  } else if (boxes[type]) {
    var encode = boxes[type].encode
    encode(obj, buffer, ptr)
    ptr += encode.bytes
  } else if (obj.buffer) {
    var buf = obj.buffer
    buf.copy(buffer, ptr)
    ptr += obj.buffer.length
  } else {
    throw new Error('Either `type` must be set to a known type (not\'' + type + '\') or `buffer` must be set')
  }

  Box.encode.bytes = ptr - offset
  // assert.equal(ptr - offset, obj.length, 'Error encoding \'' + type + '\': wrote ' + ptr - offset + ' bytes, expecting ' + obj.length)
  return buffer
}

/*
 * Returns an object with `type` and `size` fields,
 * or if there isn't enough data, returns the total
 * number of bytes needed to read the headers
 */
Box.readHeaders = function (buffer, start, end) {
  start = start || 0
  end = end || buffer.length
  if (end - start < 8) {
    return 8
  }

  var len = buffer.readUInt32BE(start)
  var type = buffer.toString('ascii', start + 4, start + 8)
  var ptr = start + 8

  if (len === 1) {
    if (end - start < 16) {
      return 16
    }

    len = uint64be.decode(buffer, ptr)
    ptr += 8
  }

  var version
  var flags
  if (boxes.fullBoxes[type]) {
    version = buffer.readUInt8(ptr)
    flags = buffer.readUInt32BE(ptr) & 0xffffff
    ptr += 4
  }

  return {
    length: len,
    headersLen: ptr - start,
    contentLen: len - (ptr - start),
    type: type,
    version: version,
    flags: flags
  }
}

Box.decode = function (buffer, start, end) {
  start = start || 0
  end = end || buffer.length
  var headers = Box.readHeaders(buffer, start, end)
  if (!headers || headers.length > end - start) {
    throw new Error('Data too short')
  }

  return Box.decodeWithoutHeaders(headers, buffer, start + headers.headersLen, start + headers.length)
}

Box.decodeWithoutHeaders = function (headers, buffer, start, end) {
  start = start || 0
  end = end || buffer.length
  var type = headers.type
  var obj = {}
  if (containers[type]) {
    obj.otherBoxes = []
    var contents = containers[type]
    var ptr = start
    while (end - ptr >= 8) {
      var child = Box.decode(buffer, ptr, end)
      ptr += child.length
      if (contents.indexOf(child.type) >= 0) {
        obj[child.type] = child
      } else if (contents.indexOf(child.type + 's') >= 0) {
        var childType = child.type + 's'
        var entry = obj[childType] = obj[childType] || []
        entry.push(child)
      } else {
        obj.otherBoxes.push(child)
      }
    }
  } else if (boxes[type]) {
    var decode = boxes[type].decode
    obj = decode(buffer, start, end)
  } else {
    obj.buffer = new Buffer(buffer.slice(start, end))
  }

  obj.length = headers.length
  obj.contentLen = headers.contentLen
  obj.type = headers.type
  obj.version = headers.version
  obj.flags = headers.flags
  return obj
}

Box.encodingLength = function (obj) {
  var type = obj.type

  var len = 8
  if (boxes.fullBoxes[type]) {
    len += 4
  }

  if (containers[type]) {
    var contents = containers[type]
    contents.forEach(function (childType) {
      if (childType.length === 5) {
        var entry = obj[childType] || []
        childType = childType.substr(0, 4)
        entry.forEach(function (child) {
          child.type = childType
          len += Box.encodingLength(child)
        })
      } else if (obj[childType]) {
        var child = obj[childType]
        child.type = childType
        len += Box.encodingLength(child)
      }
    })
    if (obj.otherBoxes) {
      obj.otherBoxes.forEach(function (child) {
        len += Box.encodingLength(child)
      })
    }
  } else if (boxes[type]) {
    len += boxes[type].encodingLength(obj)
  } else if (obj.buffer) {
    len += obj.buffer.length
  } else {
    throw new Error('Either `type` must be set to a known type (not\'' + type + '\') or `buffer` must be set')
  }

  if (len > UINT32_MAX) {
    len += 8
  }

  obj.length = len
  return len
}

}).call(this,require("buffer").Buffer)
},{"./boxes":67,"buffer":24,"uint64be":126}],70:[function(require,module,exports){
(function (Buffer){
var stream = require('readable-stream')
var inherits = require('inherits')
var nextEvent = require('next-event')
var Box = require('mp4-box-encoding')

var EMPTY = new Buffer(0)

module.exports = Decoder

function Decoder () {
  if (!(this instanceof Decoder)) return new Decoder()
  stream.Writable.call(this)

  this.destroyed = false

  this._pending = 0
  this._missing = 0
  this._buf = null
  this._str = null
  this._cb = null
  this._ondrain = null
  this._writeBuffer = null
  this._writeCb = null

  this._ondrain = null
  this._kick()
}

inherits(Decoder, stream.Writable)

Decoder.prototype.destroy = function (err) {
  if (this.destroyed) return
  this.destroyed = true
  if (err) this.emit('error', err)
  this.emit('close')
}

Decoder.prototype._write = function (data, enc, next) {
  if (this.destroyed) return
  var drained = !this._str || !this._str._writableState.needDrain

  while (data.length && !this.destroyed) {
    if (!this._missing) {
      this._writeBuffer = data
      this._writeCb = next
      return
    }

    var consumed = data.length < this._missing ? data.length : this._missing
    if (this._buf) data.copy(this._buf, this._buf.length - this._missing)
    else if (this._str) drained = this._str.write(consumed === data.length ? data : data.slice(0, consumed))

    this._missing -= consumed

    if (!this._missing) {
      var buf = this._buf
      var cb = this._cb
      var stream = this._str

      this._buf = this._cb = this._str = this._ondrain = null
      drained = true

      if (stream) stream.end()
      if (cb) cb(buf)
    }

    data = consumed === data.length ? EMPTY : data.slice(consumed)
  }

  if (this._pending && !this._missing) {
    this._writeBuffer = data
    this._writeCb = next
    return
  }

  if (drained) next()
  else this._ondrain(next)
}

Decoder.prototype._buffer = function (size, cb) {
  this._missing = size
  this._buf = new Buffer(size)
  this._cb = cb
}

Decoder.prototype._stream = function (size, cb) {
  var self = this
  this._missing = size
  this._str = new MediaData(this)
  this._ondrain = nextEvent(this._str, 'drain')
  this._pending++
  this._str.on('end', function () {
    self._pending--
    self._kick()
  })
  this._cb = cb
  return this._str
}

Decoder.prototype._readBox = function () {
  var self = this
  bufferHeaders(8)

  function bufferHeaders (len, buf) {
    self._buffer(len, function (additionalBuf) {
      if (buf) {
        buf = Buffer.concat(buf, additionalBuf)
      } else {
        buf = additionalBuf
      }
      var headers = Box.readHeaders(buf)
      if (typeof headers === 'number') {
        bufferHeaders(headers - buf.length, buf)
      } else {
        self._pending++
        self._headers = headers
        self.emit('box', headers)
      }
    })
  }
}

Decoder.prototype.stream = function () {
  var self = this
  if (!self._headers) throw new Error('this function can only be called once after \'box\' is emitted')
  var headers = self._headers
  self._headers = null

  return self._stream(headers.contentLen, null)
}

Decoder.prototype.decode = function (cb) {
  var self = this
  if (!self._headers) throw new Error('this function can only be called once after \'box\' is emitted')
  var headers = self._headers
  self._headers = null

  self._buffer(headers.contentLen, function (buf) {
    var box = Box.decodeWithoutHeaders(headers, buf)
    cb(box)
    self._pending--
    self._kick()
  })
}

Decoder.prototype.ignore = function () {
  var self = this
  if (!self._headers) throw new Error('this function can only be called once after \'box\' is emitted')
  var headers = self._headers
  self._headers = null

  this._missing = headers.contentLen
  this._cb = function () {
    self._pending--
    self._kick()
  }
}

Decoder.prototype._kick = function () {
  if (this._pending) return
  if (!this._buf && !this._str) this._readBox()
  if (this._writeBuffer) {
    var next = this._writeCb
    var buffer = this._writeBuffer
    this._writeBuffer = null
    this._writeCb = null
    this._write(buffer, null, next)
  }
}

function MediaData (parent) {
  this._parent = parent
  this.destroyed = false
  stream.PassThrough.call(this)
}

inherits(MediaData, stream.PassThrough)

MediaData.prototype.destroy = function (err) {
  if (this.destroyed) return
  this.destroyed = true
  this._parent.destroy(err)
  if (err) this.emit('error', err)
  this.emit('close')
}

}).call(this,require("buffer").Buffer)
},{"buffer":24,"inherits":56,"mp4-box-encoding":69,"next-event":75,"readable-stream":97}],71:[function(require,module,exports){
(function (process,Buffer){
var stream = require('readable-stream')
var inherits = require('inherits')
var Box = require('mp4-box-encoding')

module.exports = Encoder

function noop () {}

function Encoder () {
  if (!(this instanceof Encoder)) return new Encoder()
  stream.Readable.call(this)

  this.destroyed = false

  this._reading = false
  this._stream = null
  this._drain = null
  this._want = false
  this._onreadable = onreadable
  this._onend = onend

  var self = this

  function onreadable () {
    if (!self._want) return
    self._want = false
    self._read()
  }

  function onend () {
    self._stream = null
  }
}

inherits(Encoder, stream.Readable)

Encoder.prototype.mediaData =
Encoder.prototype.mdat = function (size, cb) {
  var stream = new MediaData(this)
  this.box({type: 'mdat', contentLength: size, encodeBufferLen: 8, stream: stream}, cb)
  return stream
}

Encoder.prototype.box = function (box, cb) {
  if (!cb) cb = noop
  if (this.destroyed) return cb(new Error('Encoder is destroyed'))

  var buf
  if (box.encodeBufferLen) {
    buf = new Buffer(box.encodeBufferLen)
  }
  if (box.stream) {
    box.buffer = null
    buf = Box.encode(box, buf)
    this.push(buf)
    this._stream = box.stream
    this._stream.on('readable', this._onreadable)
    this._stream.on('end', this._onend)
    this._stream.on('end', cb)
    this._forward()
  } else {
    buf = Box.encode(box, buf)
    var drained = this.push(buf)
    if (drained) return process.nextTick(cb)
    this._drain = cb
  }
}

Encoder.prototype.destroy = function (err) {
  if (this.destroyed) return
  this.destroyed = true
  if (this._stream && this._stream.destroy) this._stream.destroy()
  this._stream = null
  if (this._drain) {
    var cb = this._drain
    this._drain = null
    cb(err)
  }
  if (err) this.emit('error', err)
  this.emit('close')
}

Encoder.prototype.finalize = function () {
  this.push(null)
}

Encoder.prototype._forward = function () {
  if (!this._stream) return

  while (!this.destroyed) {
    var buf = this._stream.read()

    if (!buf) {
      this._want = !!this._stream
      return
    }

    if (!this.push(buf)) return
  }
}

Encoder.prototype._read = function () {
  if (this._reading || this.destroyed) return
  this._reading = true

  if (this._stream) this._forward()
  if (this._drain) {
    var drain = this._drain
    this._drain = null
    drain()
  }

  this._reading = false
}

function MediaData (parent) {
  this._parent = parent
  this.destroyed = false
  stream.PassThrough.call(this)
}

inherits(MediaData, stream.PassThrough)

MediaData.prototype.destroy = function (err) {
  if (this.destroyed) return
  this.destroyed = true
  this._parent.destroy(err)
  if (err) this.emit('error', err)
  this.emit('close')
}

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":22,"buffer":24,"inherits":56,"mp4-box-encoding":69,"readable-stream":97}],72:[function(require,module,exports){
exports.decode = require('./decode')
exports.encode = require('./encode')

},{"./decode":70,"./encode":71}],73:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000
var m = s * 60
var h = m * 60
var d = h * 24
var y = d * 365.25

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function (val, options) {
  options = options || {}
  var type = typeof val
  if (type === 'string' && val.length > 0) {
    return parse(val)
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ?
			fmtLong(val) :
			fmtShort(val)
  }
  throw new Error('val is not a non-empty string or a valid number. val=' + JSON.stringify(val))
}

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str)
  if (str.length > 10000) {
    return
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str)
  if (!match) {
    return
  }
  var n = parseFloat(match[1])
  var type = (match[2] || 'ms').toLowerCase()
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y
    case 'days':
    case 'day':
    case 'd':
      return n * d
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n
    default:
      return undefined
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd'
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h'
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm'
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's'
  }
  return ms + 'ms'
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms'
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name
  }
  return Math.ceil(ms / n) + ' ' + name + 's'
}

},{}],74:[function(require,module,exports){
module.exports = MultiStream

var inherits = require('inherits')
var stream = require('readable-stream')

inherits(MultiStream, stream.Readable)

function MultiStream (streams, opts) {
  var self = this
  if (!(self instanceof MultiStream)) return new MultiStream(streams, opts)
  stream.Readable.call(self, opts)

  self.destroyed = false

  self._drained = false
  self._forwarding = false
  self._current = null

  if (typeof streams === 'function') {
    self._queue = streams
  } else {
    self._queue = streams.map(toStreams2)
    self._queue.forEach(function (stream) {
      if (typeof stream !== 'function') self._attachErrorListener(stream)
    })
  }

  self._next()
}

MultiStream.obj = function (streams) {
  return new MultiStream(streams, { objectMode: true, highWaterMark: 16 })
}

MultiStream.prototype._read = function () {
  this._drained = true
  this._forward()
}

MultiStream.prototype._forward = function () {
  if (this._forwarding || !this._drained || !this._current) return
  this._forwarding = true

  var chunk
  while ((chunk = this._current.read()) !== null) {
    this._drained = this.push(chunk)
  }

  this._forwarding = false
}

MultiStream.prototype.destroy = function (err) {
  if (this.destroyed) return
  this.destroyed = true

  if (this._current && this._current.destroy) this._current.destroy()
  if (typeof this._queue !== 'function') {
    this._queue.forEach(function (stream) {
      if (stream.destroy) stream.destroy()
    })
  }

  if (err) this.emit('error', err)
  this.emit('close')
}

MultiStream.prototype._next = function () {
  var self = this
  self._current = null

  if (typeof self._queue === 'function') {
    self._queue(function (err, stream) {
      if (err) return self.destroy(err)
      stream = toStreams2(stream)
      self._attachErrorListener(stream)
      self._gotNextStream(stream)
    })
  } else {
    var stream = self._queue.shift()
    if (typeof stream === 'function') {
      stream = toStreams2(stream())
      self._attachErrorListener(stream)
    }
    self._gotNextStream(stream)
  }
}

MultiStream.prototype._gotNextStream = function (stream) {
  var self = this

  if (!stream) {
    self.push(null)
    self.destroy()
    return
  }

  self._current = stream
  self._forward()

  stream.on('readable', onReadable)
  stream.once('end', onEnd)
  stream.once('close', onClose)

  function onReadable () {
    self._forward()
  }

  function onClose () {
    if (!stream._readableState.ended) {
      self.destroy()
    }
  }

  function onEnd () {
    self._current = null
    stream.removeListener('readable', onReadable)
    stream.removeListener('end', onEnd)
    stream.removeListener('close', onClose)
    self._next()
  }
}

MultiStream.prototype._attachErrorListener = function (stream) {
  var self = this
  if (!stream) return

  stream.once('error', onError)

  function onError (err) {
    stream.removeListener('error', onError)
    self.destroy(err)
  }
}

function toStreams2 (s) {
  if (!s || typeof s === 'function' || s._readableState) return s

  var wrap = new stream.Readable().wrap(s)
  if (s.destroy) {
    wrap.destroy = s.destroy.bind(s)
  }
  return wrap
}

},{"inherits":56,"readable-stream":97}],75:[function(require,module,exports){
module.exports = nextEvent

function nextEvent (emitter, name) {
  var next = null
  emitter.on(name, function (data) {
    if (!next) return
    var fn = next
    next = null
    fn(data)
  })

  return function (once) {
    next = once
  }
}

},{}],76:[function(require,module,exports){
/* global MutationObserver */
var document = require('global/document')
var window = require('global/window')
var watch = Object.create(null)
var KEY_ID = 'onloadid' + (new Date() % 9e6).toString(36)
var KEY_ATTR = 'data-' + KEY_ID
var INDEX = 0

if (window && window.MutationObserver) {
  var observer = new MutationObserver(function (mutations) {
    if (Object.keys(watch).length < 1) return
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === KEY_ATTR) {
        eachAttr(mutations[i], turnon, turnoff)
        continue
      }
      eachMutation(mutations[i].removedNodes, turnoff)
      eachMutation(mutations[i].addedNodes, turnon)
    }
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: [KEY_ATTR]
  })
}

module.exports = function onload (el, on, off, caller) {
  on = on || function () {}
  off = off || function () {}
  el.setAttribute(KEY_ATTR, 'o' + INDEX)
  watch['o' + INDEX] = [on, off, 0, caller || onload.caller]
  INDEX += 1
  return el
}

function turnon (index, el) {
  if (watch[index][0] && watch[index][2] === 0) {
    watch[index][0](el)
    watch[index][2] = 1
  }
}

function turnoff (index, el) {
  if (watch[index][1] && watch[index][2] === 1) {
    watch[index][1](el)
    watch[index][2] = 0
  }
}

function eachAttr (mutation, on, off) {
  var newValue = mutation.target.getAttribute(KEY_ATTR)
  if (sameOrigin(mutation.oldValue, newValue)) {
    watch[newValue] = watch[mutation.oldValue]
    return
  }
  if (watch[mutation.oldValue]) {
    off(mutation.oldValue, mutation.target)
  }
  if (watch[newValue]) {
    on(newValue, mutation.target)
  }
}

function sameOrigin (oldValue, newValue) {
  if (!oldValue || !newValue) return false
  return watch[oldValue][3] === watch[newValue][3]
}

function eachMutation (nodes, fn) {
  var keys = Object.keys(watch)
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] && nodes[i].getAttribute && nodes[i].getAttribute(KEY_ATTR)) {
      var onloadid = nodes[i].getAttribute(KEY_ATTR)
      keys.forEach(function (k) {
        if (onloadid === k) {
          fn(k, nodes[i])
        }
      })
    }
    if (nodes[i].childNodes.length > 0) {
      eachMutation(nodes[i].childNodes, fn)
    }
  }
}

},{"global/document":47,"global/window":48}],77:[function(require,module,exports){
var wrappy = require('wrappy')
module.exports = wrappy(once)
module.exports.strict = wrappy(onceStrict)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })

  Object.defineProperty(Function.prototype, 'onceStrict', {
    value: function () {
      return onceStrict(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

function onceStrict (fn) {
  var f = function () {
    if (f.called)
      throw new Error(f.onceError)
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  var name = fn.name || 'Function wrapped with `once`'
  f.onceError = name + " shouldn't be called more than once"
  f.called = false
  return f
}

},{"wrappy":143}],78:[function(require,module,exports){
(function (Buffer){
module.exports = decodeTorrentFile
module.exports.decode = decodeTorrentFile
module.exports.encode = encodeTorrentFile

var bencode = require('bencode')
var path = require('path')
var sha1 = require('simple-sha1')
var uniq = require('uniq')

/**
 * Parse a torrent. Throws an exception if the torrent is missing required fields.
 * @param  {Buffer|Object} torrent
 * @return {Object}        parsed torrent
 */
function decodeTorrentFile (torrent) {
  if (Buffer.isBuffer(torrent)) {
    torrent = bencode.decode(torrent)
  }

  // sanity check
  ensure(torrent.info, 'info')
  ensure(torrent.info['name.utf-8'] || torrent.info.name, 'info.name')
  ensure(torrent.info['piece length'], 'info[\'piece length\']')
  ensure(torrent.info.pieces, 'info.pieces')

  if (torrent.info.files) {
    torrent.info.files.forEach(function (file) {
      ensure(typeof file.length === 'number', 'info.files[0].length')
      ensure(file['path.utf-8'] || file.path, 'info.files[0].path')
    })
  } else {
    ensure(typeof torrent.info.length === 'number', 'info.length')
  }

  var result = {}
  result.info = torrent.info
  result.infoBuffer = bencode.encode(torrent.info)
  result.infoHash = sha1.sync(result.infoBuffer)
  result.infoHashBuffer = new Buffer(result.infoHash, 'hex')

  result.name = (torrent.info['name.utf-8'] || torrent.info.name).toString()

  if (torrent.info.private !== undefined) result.private = !!torrent.info.private

  if (torrent['creation date']) result.created = new Date(torrent['creation date'] * 1000)
  if (torrent['created by']) result.createdBy = torrent['created by'].toString()

  if (Buffer.isBuffer(torrent.comment)) result.comment = torrent.comment.toString()

  // announce and announce-list will be missing if metadata fetched via ut_metadata
  result.announce = []
  if (torrent['announce-list'] && torrent['announce-list'].length) {
    torrent['announce-list'].forEach(function (urls) {
      urls.forEach(function (url) {
        result.announce.push(url.toString())
      })
    })
  } else if (torrent.announce) {
    result.announce.push(torrent.announce.toString())
  }

  // handle url-list (BEP19 / web seeding)
  if (Buffer.isBuffer(torrent['url-list'])) {
    // some clients set url-list to empty string
    torrent['url-list'] = torrent['url-list'].length > 0
      ? [ torrent['url-list'] ]
      : []
  }
  result.urlList = (torrent['url-list'] || []).map(function (url) {
    return url.toString()
  })

  uniq(result.announce)
  uniq(result.urlList)

  var files = torrent.info.files || [ torrent.info ]
  result.files = files.map(function (file, i) {
    var parts = [].concat(result.name, file['path.utf-8'] || file.path || []).map(function (p) {
      return p.toString()
    })
    return {
      path: path.join.apply(null, [path.sep].concat(parts)).slice(1),
      name: parts[parts.length - 1],
      length: file.length,
      offset: files.slice(0, i).reduce(sumLength, 0)
    }
  })

  result.length = files.reduce(sumLength, 0)

  var lastFile = result.files[result.files.length - 1]

  result.pieceLength = torrent.info['piece length']
  result.lastPieceLength = ((lastFile.offset + lastFile.length) % result.pieceLength) || result.pieceLength
  result.pieces = splitPieces(torrent.info.pieces)

  return result
}

/**
 * Convert a parsed torrent object back into a .torrent file buffer.
 * @param  {Object} parsed parsed torrent
 * @return {Buffer}
 */
function encodeTorrentFile (parsed) {
  var torrent = {
    info: parsed.info
  }

  torrent['announce-list'] = (parsed.announce || []).map(function (url) {
    if (!torrent.announce) torrent.announce = url
    url = new Buffer(url, 'utf8')
    return [ url ]
  })

  torrent['url-list'] = parsed.urlList || []

  if (parsed.created) {
    torrent['creation date'] = (parsed.created.getTime() / 1000) | 0
  }

  if (parsed.createdBy) {
    torrent['created by'] = parsed.createdBy
  }

  if (parsed.comment) {
    torrent.comment = parsed.comment
  }

  return bencode.encode(torrent)
}

function sumLength (sum, file) {
  return sum + file.length
}

function splitPieces (buf) {
  var pieces = []
  for (var i = 0; i < buf.length; i += 20) {
    pieces.push(buf.slice(i, i + 20).toString('hex'))
  }
  return pieces
}

function ensure (bool, fieldName) {
  if (!bool) throw new Error('Torrent is missing required field: ' + fieldName)
}

}).call(this,require("buffer").Buffer)
},{"bencode":9,"buffer":24,"path":80,"simple-sha1":108,"uniq":127}],79:[function(require,module,exports){
(function (process,Buffer){
/* global Blob */

module.exports = parseTorrent
module.exports.remote = parseTorrentRemote

var blobToBuffer = require('blob-to-buffer')
var fs = require('fs') // browser exclude
var get = require('simple-get')
var magnet = require('magnet-uri')
var parseTorrentFile = require('parse-torrent-file')

module.exports.toMagnetURI = magnet.encode
module.exports.toTorrentFile = parseTorrentFile.encode

/**
 * Parse a torrent identifier (magnet uri, .torrent file, info hash)
 * @param  {string|Buffer|Object} torrentId
 * @return {Object}
 */
function parseTorrent (torrentId) {
  if (typeof torrentId === 'string' && /^(stream-)?magnet:/.test(torrentId)) {
    // magnet uri (string)
    return magnet(torrentId)
  } else if (typeof torrentId === 'string' && (/^[a-f0-9]{40}$/i.test(torrentId) || /^[a-z2-7]{32}$/i.test(torrentId))) {
    // info hash (hex/base-32 string)
    return magnet('magnet:?xt=urn:btih:' + torrentId)
  } else if (Buffer.isBuffer(torrentId) && torrentId.length === 20) {
    // info hash (buffer)
    return magnet('magnet:?xt=urn:btih:' + torrentId.toString('hex'))
  } else if (Buffer.isBuffer(torrentId)) {
    // .torrent file (buffer)
    return parseTorrentFile(torrentId) // might throw
  } else if (torrentId && torrentId.infoHash) {
    // parsed torrent (from `parse-torrent`, `parse-torrent-file`, or `magnet-uri`)
    if (!torrentId.announce) torrentId.announce = []
    if (typeof torrentId.announce === 'string') {
      torrentId.announce = [ torrentId.announce ]
    }
    if (!torrentId.urlList) torrentId.urlList = []
    return torrentId
  } else {
    throw new Error('Invalid torrent identifier')
  }
}

function parseTorrentRemote (torrentId, cb) {
  var parsedTorrent
  if (typeof cb !== 'function') throw new Error('second argument must be a Function')

  try {
    parsedTorrent = parseTorrent(torrentId)
  } catch (err) {
    // If torrent fails to parse, it could be a Blob, http/https URL or
    // filesystem path, so don't consider it an error yet.
  }

  if (parsedTorrent && parsedTorrent.infoHash) {
    process.nextTick(function () {
      cb(null, parsedTorrent)
    })
  } else if (isBlob(torrentId)) {
    blobToBuffer(torrentId, function (err, torrentBuf) {
      if (err) return cb(new Error('Error converting Blob: ' + err.message))
      parseOrThrow(torrentBuf)
    })
  } else if (typeof get === 'function' && /^https?:/.test(torrentId)) {
    // http, or https url to torrent file
    get.concat({
      url: torrentId,
      headers: { 'user-agent': 'WebTorrent (http://webtorrent.io)' }
    }, function (err, res, torrentBuf) {
      if (err) return cb(new Error('Error downloading torrent: ' + err.message))
      parseOrThrow(torrentBuf)
    })
  } else if (typeof fs.readFile === 'function' && typeof torrentId === 'string') {
    // assume it's a filesystem path
    fs.readFile(torrentId, function (err, torrentBuf) {
      if (err) return cb(new Error('Invalid torrent identifier'))
      parseOrThrow(torrentBuf)
    })
  } else {
    process.nextTick(function () {
      cb(new Error('Invalid torrent identifier'))
    })
  }

  function parseOrThrow (torrentBuf) {
    try {
      parsedTorrent = parseTorrent(torrentBuf)
    } catch (err) {
      return cb(err)
    }
    if (parsedTorrent && parsedTorrent.infoHash) cb(null, parsedTorrent)
    else cb(new Error('Invalid torrent identifier'))
  }
}

/**
 * Check if `obj` is a W3C `Blob` or `File` object
 * @param  {*} obj
 * @return {boolean}
 */
function isBlob (obj) {
  return typeof Blob !== 'undefined' && obj instanceof Blob
}

// Workaround Browserify v13 bug
// https://github.com/substack/node-browserify/issues/1483
;(function () { Buffer(0) })()

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":22,"blob-to-buffer":17,"buffer":24,"fs":21,"magnet-uri":63,"parse-torrent-file":78,"simple-get":106}],80:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":22}],81:[function(require,module,exports){
var closest = require('closest-to')

// Create a range from 16kb–4mb
var sizes = []
for (var i = 14; i <= 22; i++) {
  sizes.push(Math.pow(2, i))
}

module.exports = function(size) {
  return closest(
    size / Math.pow(2, 10), sizes 
  )
}

},{"closest-to":29}],82:[function(require,module,exports){
(function (process){
'use strict';

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = nextTick;
} else {
  module.exports = process.nextTick;
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}

}).call(this,require('_process'))
},{"_process":22}],83:[function(require,module,exports){
var once = require('once')
var eos = require('end-of-stream')
var fs = require('fs') // we only need fs to get the ReadStream and WriteStream prototypes

var noop = function () {}

var isFn = function (fn) {
  return typeof fn === 'function'
}

var isFS = function (stream) {
  return (stream instanceof (fs.ReadStream || noop) || stream instanceof (fs.WriteStream || noop)) && isFn(stream.close)
}

var isRequest = function (stream) {
  return stream.setHeader && isFn(stream.abort)
}

var destroyer = function (stream, reading, writing, callback) {
  callback = once(callback)

  var closed = false
  stream.on('close', function () {
    closed = true
  })

  eos(stream, {readable: reading, writable: writing}, function (err) {
    if (err) return callback(err)
    closed = true
    callback()
  })

  var destroyed = false
  return function (err) {
    if (closed) return
    if (destroyed) return
    destroyed = true

    if (isFS(stream)) return stream.close() // use close for fs streams to avoid fd leaks
    if (isRequest(stream)) return stream.abort() // request.destroy just do .end - .abort is what we want

    if (isFn(stream.destroy)) return stream.destroy()

    callback(err || new Error('stream was destroyed'))
  }
}

var call = function (fn) {
  fn()
}

var pipe = function (from, to) {
  return from.pipe(to)
}

var pump = function () {
  var streams = Array.prototype.slice.call(arguments)
  var callback = isFn(streams[streams.length - 1] || noop) && streams.pop() || noop

  if (Array.isArray(streams[0])) streams = streams[0]
  if (streams.length < 2) throw new Error('pump requires two streams per minimum')

  var error
  var destroys = streams.map(function (stream, i) {
    var reading = i < streams.length - 1
    var writing = i > 0
    return destroyer(stream, reading, writing, function (err) {
      if (!error) error = err
      if (err) destroys.forEach(call)
      if (reading) return
      destroys.forEach(call)
      callback(error)
    })
  })

  return streams.reduce(pipe)
}

module.exports = pump

},{"end-of-stream":40,"fs":21,"once":77}],84:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],85:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],86:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],87:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":85,"./encode":86}],88:[function(require,module,exports){
var iterate = function (list) {
  var offset = 0
  return function () {
    if (offset === list.length) return null

    var len = list.length - offset
    var i = (Math.random() * len) | 0
    var el = list[offset + i]

    var tmp = list[offset]
    list[offset] = el
    list[offset + i] = tmp
    offset++

    return el
  }
}

module.exports = iterate

},{}],89:[function(require,module,exports){
(function (process,global,Buffer){
'use strict'

function oldBrowser () {
  throw new Error('secure random number generation not supported by this browser\nuse chrome, FireFox or Internet Explorer 11')
}

var crypto = global.crypto || global.msCrypto

if (crypto && crypto.getRandomValues) {
  module.exports = randomBytes
} else {
  module.exports = oldBrowser
}

function randomBytes (size, cb) {
  // phantomjs needs to throw
  if (size > 65536) throw new Error('requested too many random bytes')
  // in case browserify  isn't using the Uint8Array version
  var rawBytes = new global.Uint8Array(size)

  // This will not work in older browsers.
  // See https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
  if (size > 0) {  // getRandomValues fails on IE if size == 0
    crypto.getRandomValues(rawBytes)
  }
  // phantomjs doesn't like a buffer being passed here
  var bytes = new Buffer(rawBytes.buffer)

  if (typeof cb === 'function') {
    return process.nextTick(function () {
      cb(null, bytes)
    })
  }

  return bytes
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"_process":22,"buffer":24}],90:[function(require,module,exports){
/*
Instance of writable stream.

call .get(length) or .discard(length) to get a stream (relative to the last end)

emits 'stalled' once everything is written


*/
var inherits = require('inherits')
var stream = require('readable-stream')

module.exports = RangeSliceStream

inherits(RangeSliceStream, stream.Writable)

function RangeSliceStream (offset) {
	var self = this
	if (!(self instanceof RangeSliceStream)) return new RangeSliceStream(offset)
	stream.Writable.call(self)

	self.destroyed = false
	self._queue = []
	self._position = offset || 0
	self._cb = null
	self._buffer = null
	self._out = null
}

RangeSliceStream.prototype._write = function (chunk, encoding, cb) {
	var self = this

	var drained = true

	while (true) {
		if (self.destroyed) {
			return
		}

		// Wait for more queue entries
		if (self._queue.length === 0) {
			self._buffer = chunk
			self._cb = cb
			return
		}

		self._buffer = null
		var currRange = self._queue[0]
		// Relative to the start of chunk, what data do we need?
		var writeStart = Math.max(currRange.start - self._position, 0)
		var writeEnd = currRange.end - self._position

		// Check if we need to throw it all away
		if (writeStart >= chunk.length) {
			self._position += chunk.length
			return cb(null)
		}

		// Check if we need to use it all
		var toWrite
		if (writeEnd > chunk.length) {
			self._position += chunk.length
			if (writeStart === 0) {
				toWrite = chunk
			} else {
				toWrite = chunk.slice(writeStart)
			}
			drained = currRange.stream.write(toWrite) && drained
			break
		}

		self._position += writeEnd
		if (writeStart === 0 && writeEnd === chunk.length) {
			toWrite = chunk
		} else {
			toWrite = chunk.slice(writeStart, writeEnd)
		}
		drained = currRange.stream.write(toWrite) && drained
		if (currRange.last) {
			currRange.stream.end()
		}
		chunk = chunk.slice(writeEnd)
		self._queue.shift()
	}

	if (drained) {
		cb(null)
	} else {
		currRange.stream.once('drain', cb.bind(null, null))
	}
}

RangeSliceStream.prototype.slice = function (ranges) {
	var self = this

	if (self.destroyed) return null

	if (!(ranges instanceof Array)) {
		ranges = [ranges]
	}

	var str = new stream.PassThrough()

	ranges.forEach(function (range, i) {
		self._queue.push({
			start: range.start,
			end: range.end,
			stream: str,
			last: i === (ranges.length - 1)
		})
	})
	if (self._buffer) {
		self._write(self._buffer, null, self._cb)
	}

	return str
}

RangeSliceStream.prototype.destroy = function (err) {
	var self = this
	if (self.destroyed) return
	self.destroyed = true

	if (err) self.emit('error', err)
}

},{"inherits":56,"readable-stream":97}],91:[function(require,module,exports){
// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  processNextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}
},{"./_stream_readable":93,"./_stream_writable":95,"core-util-is":30,"inherits":56,"process-nextick-args":82}],92:[function(require,module,exports){
// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":94,"core-util-is":30,"inherits":56}],93:[function(require,module,exports){
(function (process){
'use strict';

module.exports = Readable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream;
(function () {
  try {
    Stream = require('st' + 'ream');
  } catch (_) {} finally {
    if (!Stream) Stream = require('events').EventEmitter;
  }
})();
/*</replacement>*/

var Buffer = require('buffer').Buffer;
/*<replacement>*/
var bufferShim = require('buffer-shims');
/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/BufferList');
var StringDecoder;

util.inherits(Readable, Stream);

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') {
    return emitter.prependListener(event, fn);
  } else {
    // This is a hack to make sure that our error handler is attached before any
    // userland ones.  NEVER DO THIS. This is here only because this code needs
    // to continue to work with older versions of Node.js that do not include
    // the prependListener() method. The goal is to eventually remove this hack.
    if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
  }
}

function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~ ~this.highWaterMark;

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options && typeof options.read === 'function') this._read = options.read;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;

  if (!state.objectMode && typeof chunk === 'string') {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = bufferShim.from(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var _e = new Error('stream.unshift() after end event');
      stream.emit('error', _e);
    } else {
      var skipAdd;
      if (state.decoder && !addToFront && !encoding) {
        chunk = state.decoder.write(chunk);
        skipAdd = !state.objectMode && chunk.length === 0;
      }

      if (!addToFront) state.reading = false;

      // Don't add to the buffer if we've decoded to an empty string chunk and
      // we're not in object mode
      if (!skipAdd) {
        // if we want the data now, just emit it.
        if (state.flowing && state.length === 0 && !state.sync) {
          stream.emit('data', chunk);
          stream.read(0);
        } else {
          // update the buffer info.
          state.length += state.objectMode ? 1 : chunk.length;
          if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

          if (state.needReadable) emitReadable(stream);
        }
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;

  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  } else {
    state.length -= n;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) processNextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    processNextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('_read() is not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted) processNextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  // If the user pushes more data while we're writing to dest then we'll end up
  // in ondata again. However, we only want to increase awaitDrain once because
  // dest will only emit one 'drain' event for the multiple writes.
  // => Introduce a guard on increasing awaitDrain.
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this);
    }return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;

  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    var state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        processNextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    processNextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function (ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;

  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);
  }

  return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
  var p = list.head;
  var c = 1;
  var ret = p.data;
  n -= ret.length;
  while (p = p.next) {
    var str = p.data;
    var nb = n > str.length ? str.length : n;
    if (nb === str.length) ret += str;else ret += str.slice(0, n);
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
  var ret = bufferShim.allocUnsafe(n);
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    var buf = p.data;
    var nb = n > buf.length ? buf.length : n;
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    processNextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,require('_process'))
},{"./_stream_duplex":91,"./internal/streams/BufferList":96,"_process":22,"buffer":24,"buffer-shims":23,"core-util-is":30,"events":42,"inherits":56,"isarray":61,"process-nextick-args":82,"string_decoder/":118,"util":19}],94:[function(require,module,exports){
// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function TransformState(stream) {
  this.afterTransform = function (er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
  this.writeencoding = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined) stream.push(data);

  cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(this);

  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.once('prefinish', function () {
    if (typeof this._flush === 'function') this._flush(function (er, data) {
      done(stream, er, data);
    });else done(stream);
  });
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('_transform() is not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);

  if (data !== null && data !== undefined) stream.push(data);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length) throw new Error('Calling transform done when ws.length != 0');

  if (ts.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":91,"core-util-is":30,"inherits":56}],95:[function(require,module,exports){
(function (process){
// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

module.exports = Writable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick;
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream;
(function () {
  try {
    Stream = require('st' + 'ream');
  } catch (_) {} finally {
    if (!Stream) Stream = require('events').EventEmitter;
  }
})();
/*</replacement>*/

var Buffer = require('buffer').Buffer;
/*<replacement>*/
var bufferShim = require('buffer-shims');
/*</replacement>*/

util.inherits(Writable, Stream);

function nop() {}

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~ ~this.highWaterMark;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance) {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function (object) {
      if (realHasInstance.call(this, object)) return true;

      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function (object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
    return new Writable(options);
  }

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  processNextTick(cb, er);
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;
  // Always throw error if a null is written
  // if we are not in object mode then throw
  // if it is not a buffer, string, or undefined.
  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    processNextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk)) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = bufferShim.from(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);

  if (Buffer.isBuffer(chunk)) encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync) processNextTick(cb, er);else cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
        afterWrite(stream, state, finished, cb);
      }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    while (entry) {
      buffer[count] = entry;
      entry = entry.next;
      count += 1;
    }

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequestCount = 0;
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('_write() is not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else {
      prefinish(stream, state);
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) processNextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;

  this.finish = function (err) {
    var entry = _this.entry;
    _this.entry = null;
    while (entry) {
      var cb = entry.callback;
      state.pendingcb--;
      cb(err);
      entry = entry.next;
    }
    if (state.corkedRequestsFree) {
      state.corkedRequestsFree.next = _this;
    } else {
      state.corkedRequestsFree = _this;
    }
  };
}
}).call(this,require('_process'))
},{"./_stream_duplex":91,"_process":22,"buffer":24,"buffer-shims":23,"core-util-is":30,"events":42,"inherits":56,"process-nextick-args":82,"util-deprecate":132}],96:[function(require,module,exports){
'use strict';

var Buffer = require('buffer').Buffer;
/*<replacement>*/
var bufferShim = require('buffer-shims');
/*</replacement>*/

module.exports = BufferList;

function BufferList() {
  this.head = null;
  this.tail = null;
  this.length = 0;
}

BufferList.prototype.push = function (v) {
  var entry = { data: v, next: null };
  if (this.length > 0) this.tail.next = entry;else this.head = entry;
  this.tail = entry;
  ++this.length;
};

BufferList.prototype.unshift = function (v) {
  var entry = { data: v, next: this.head };
  if (this.length === 0) this.tail = entry;
  this.head = entry;
  ++this.length;
};

BufferList.prototype.shift = function () {
  if (this.length === 0) return;
  var ret = this.head.data;
  if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
  --this.length;
  return ret;
};

BufferList.prototype.clear = function () {
  this.head = this.tail = null;
  this.length = 0;
};

BufferList.prototype.join = function (s) {
  if (this.length === 0) return '';
  var p = this.head;
  var ret = '' + p.data;
  while (p = p.next) {
    ret += s + p.data;
  }return ret;
};

BufferList.prototype.concat = function (n) {
  if (this.length === 0) return bufferShim.alloc(0);
  if (this.length === 1) return this.head.data;
  var ret = bufferShim.allocUnsafe(n >>> 0);
  var p = this.head;
  var i = 0;
  while (p) {
    p.data.copy(ret, i);
    i += p.data.length;
    p = p.next;
  }
  return ret;
};
},{"buffer":24,"buffer-shims":23}],97:[function(require,module,exports){
(function (process){
var Stream = (function (){
  try {
    return require('st' + 'ream'); // hack to fix a circular dependency issue when used with browserify
  } catch(_){}
}());
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = Stream || exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

if (!process.browser && process.env.READABLE_STREAM === 'disable' && Stream) {
  module.exports = Stream;
}

}).call(this,require('_process'))
},{"./lib/_stream_duplex.js":91,"./lib/_stream_passthrough.js":92,"./lib/_stream_readable.js":93,"./lib/_stream_transform.js":94,"./lib/_stream_writable.js":95,"_process":22}],98:[function(require,module,exports){
exports.render = render
exports.append = append
exports.mime = require('./lib/mime.json')

var debug = require('debug')('render-media')
var isAscii = require('is-ascii')
var MediaElementWrapper = require('mediasource')
var path = require('path')
var streamToBlobURL = require('stream-to-blob-url')
var videostream = require('videostream')

var VIDEOSTREAM_EXTS = [
  '.m4a',
  '.m4v',
  '.mp4'
]

var MEDIASOURCE_VIDEO_EXTS = [
  '.m4v',
  '.mkv',
  '.mp4',
  '.webm'
]

var MEDIASOURCE_AUDIO_EXTS = [
  '.m4a',
  '.mp3'
]

var MEDIASOURCE_EXTS = [].concat(
  MEDIASOURCE_VIDEO_EXTS,
  MEDIASOURCE_AUDIO_EXTS
)

var AUDIO_EXTS = [
  '.aac',
  '.oga',
  '.ogg',
  '.wav'
]

var IMAGE_EXTS = [
  '.bmp',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png'
]

var IFRAME_EXTS = [
  '.css',
  '.html',
  '.js',
  '.md',
  '.pdf',
  '.txt'
]

// Maximum file length for which the Blob URL strategy will be attempted
// See: https://github.com/feross/render-media/issues/18
var MAX_BLOB_LENGTH = 200 * 1000 * 1000 // 200 MB

var MediaSource = typeof window !== 'undefined' && window.MediaSource

function render (file, elem, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!opts) opts = {}
  if (!cb) cb = function () {}

  validateFile(file)
  parseOpts(opts)

  if (typeof elem === 'string') elem = document.querySelector(elem)

  renderMedia(file, function (tagName) {
    if (elem.nodeName !== tagName.toUpperCase()) {
      var extname = path.extname(file.name).toLowerCase()

      throw new Error(
        'Cannot render "' + extname + '" inside a "' +
        elem.nodeName.toLowerCase() + '" element, expected "' + tagName + '"'
      )
    }

    return elem
  }, opts, cb)
}

function append (file, rootElem, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!opts) opts = {}
  if (!cb) cb = function () {}

  validateFile(file)
  parseOpts(opts)

  if (typeof rootElem === 'string') rootElem = document.querySelector(rootElem)

  if (rootElem && (rootElem.nodeName === 'VIDEO' || rootElem.nodeName === 'AUDIO')) {
    throw new Error(
      'Invalid video/audio node argument. Argument must be root element that ' +
      'video/audio tag will be appended to.'
    )
  }

  renderMedia(file, getElem, opts, done)

  function getElem (tagName) {
    if (tagName === 'video' || tagName === 'audio') return createMedia(tagName)
    else return createElem(tagName)
  }

  function createMedia (tagName) {
    var elem = createElem(tagName)
    if (opts.controls) elem.controls = true
    if (opts.autoplay) elem.autoplay = true
    rootElem.appendChild(elem)
    return elem
  }

  function createElem (tagName) {
    var elem = document.createElement(tagName)
    rootElem.appendChild(elem)
    return elem
  }

  function done (err, elem) {
    if (err && elem) elem.remove()
    cb(err, elem)
  }
}

function renderMedia (file, getElem, opts, cb) {
  var extname = path.extname(file.name).toLowerCase()
  var currentTime = 0
  var elem

  if (MEDIASOURCE_EXTS.indexOf(extname) >= 0) {
    renderMediaSource()
  } else if (AUDIO_EXTS.indexOf(extname) >= 0) {
    renderAudio()
  } else if (IMAGE_EXTS.indexOf(extname) >= 0) {
    renderImage()
  } else if (IFRAME_EXTS.indexOf(extname) >= 0) {
    renderIframe()
  } else {
    tryRenderIframe()
  }

  function renderMediaSource () {
    var tagName = MEDIASOURCE_VIDEO_EXTS.indexOf(extname) >= 0 ? 'video' : 'audio'

    if (MediaSource) {
      if (VIDEOSTREAM_EXTS.indexOf(extname) >= 0) {
        useVideostream()
      } else {
        useMediaSource()
      }
    } else {
      useBlobURL()
    }

    function useVideostream () {
      debug('Use `videostream` package for ' + file.name)
      prepareElem()
      elem.addEventListener('error', fallbackToMediaSource)
      elem.addEventListener('loadstart', onLoadStart)
      elem.addEventListener('canplay', onCanPlay)
      videostream(file, elem)
    }

    function useMediaSource () {
      debug('Use MediaSource API for ' + file.name)
      prepareElem()
      elem.addEventListener('error', fallbackToBlobURL)
      elem.addEventListener('loadstart', onLoadStart)
      elem.addEventListener('canplay', onCanPlay)

      var wrapper = new MediaElementWrapper(elem)
      var writable = wrapper.createWriteStream(getCodec(file.name))
      file.createReadStream().pipe(writable)

      if (currentTime) elem.currentTime = currentTime
    }

    function useBlobURL () {
      debug('Use Blob URL for ' + file.name)
      prepareElem()
      elem.addEventListener('error', fatalError)
      elem.addEventListener('loadstart', onLoadStart)
      elem.addEventListener('canplay', onCanPlay)
      getBlobURL(file, function (err, url) {
        if (err) return fatalError(err)
        elem.src = url
        if (currentTime) elem.currentTime = currentTime
      })
    }

    function fallbackToMediaSource (err) {
      debug('videostream error: fallback to MediaSource API: %o', err.message || err)
      elem.removeEventListener('error', fallbackToMediaSource)
      elem.removeEventListener('canplay', onCanPlay)

      useMediaSource()
    }

    function fallbackToBlobURL (err) {
      debug('MediaSource API error: fallback to Blob URL: %o', err.message || err)

      if (typeof file.length === 'number' && file.length > opts.maxBlobLength) {
        debug(
          'File length too large for Blob URL approach: %d (max: %d)',
          file.length, opts.maxBlobLength
        )
        return fatalError(new Error(
          'File length too large for Blob URL approach: ' + file.length +
          ' (max: ' + opts.maxBlobLength + ')'
        ))
      }

      elem.removeEventListener('error', fallbackToBlobURL)
      elem.removeEventListener('canplay', onCanPlay)

      useBlobURL()
    }

    function prepareElem () {
      if (!elem) {
        elem = getElem(tagName)

        elem.addEventListener('progress', function () {
          currentTime = elem.currentTime
        })
      }
    }
  }

  function renderAudio () {
    elem = getElem('audio')
    getBlobURL(file, function (err, url) {
      if (err) return fatalError(err)
      elem.addEventListener('error', fatalError)
      elem.addEventListener('loadstart', onLoadStart)
      elem.addEventListener('canplay', onCanPlay)
      elem.src = url
    })
  }

  function onLoadStart () {
    elem.removeEventListener('loadstart', onLoadStart)
    if (opts.autoplay) elem.play()
  }

  function onCanPlay () {
    elem.removeEventListener('canplay', onCanPlay)
    cb(null, elem)
  }

  function renderImage () {
    elem = getElem('img')
    getBlobURL(file, function (err, url) {
      if (err) return fatalError(err)
      elem.src = url
      elem.alt = file.name
      cb(null, elem)
    })
  }

  function renderIframe () {
    elem = getElem('iframe')

    getBlobURL(file, function (err, url) {
      if (err) return fatalError(err)
      elem.src = url
      if (extname !== '.pdf') elem.sandbox = 'allow-forms allow-scripts'
      cb(null, elem)
    })
  }

  function tryRenderIframe () {
    debug('Unknown file extension "%s" - will attempt to render into iframe', extname)

    var str = ''
    file.createReadStream({ start: 0, end: 1000 })
      .setEncoding('utf8')
      .on('data', function (chunk) {
        str += chunk
      })
      .on('end', done)
      .on('error', cb)

    function done () {
      if (isAscii(str)) {
        debug('File extension "%s" appears ascii, so will render.', extname)
        renderIframe()
      } else {
        debug('File extension "%s" appears non-ascii, will not render.', extname)
        cb(new Error('Unsupported file type "' + extname + '": Cannot append to DOM'))
      }
    }
  }

  function fatalError (err) {
    err.message = 'Error rendering file "' + file.name + '": ' + err.message
    debug(err.message)
    cb(err)
  }
}

function getBlobURL (file, cb) {
  var extname = path.extname(file.name).toLowerCase()
  streamToBlobURL(file.createReadStream(), exports.mime[extname], cb)
}

function validateFile (file) {
  if (file == null) {
    throw new Error('file cannot be null or undefined')
  }
  if (typeof file.name !== 'string') {
    throw new Error('missing or invalid file.name property')
  }
  if (typeof file.createReadStream !== 'function') {
    throw new Error('missing or invalid file.createReadStream property')
  }
}

function getCodec (name) {
  var extname = path.extname(name).toLowerCase()
  return {
    '.m4a': 'audio/mp4; codecs="mp4a.40.5"',
    '.m4v': 'video/mp4; codecs="avc1.640029, mp4a.40.5"',
    '.mkv': 'video/webm; codecs="avc1.640029, mp4a.40.5"',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4; codecs="avc1.640029, mp4a.40.5"',
    '.webm': 'video/webm; codecs="vorbis, vp8"'
  }[extname]
}

function parseOpts (opts) {
  if (opts.autoplay == null) opts.autoplay = true
  if (opts.controls == null) opts.controls = true
  if (opts.maxBlobLength == null) opts.maxBlobLength = MAX_BLOB_LENGTH
}

},{"./lib/mime.json":99,"debug":32,"is-ascii":57,"mediasource":64,"path":80,"stream-to-blob-url":115,"videostream":134}],99:[function(require,module,exports){
module.exports={
  ".3gp": "video/3gpp",
  ".aac": "audio/aac",
  ".aif": "audio/x-aiff",
  ".aiff": "audio/x-aiff",
  ".atom": "application/atom+xml",
  ".avi": "video/x-msvideo",
  ".bmp": "image/bmp",
  ".bz2": "application/x-bzip2",
  ".conf": "text/plain",
  ".css": "text/css",
  ".csv": "text/plain",
  ".diff": "text/x-diff",
  ".doc": "application/msword",
  ".flv": "video/x-flv",
  ".gif": "image/gif",
  ".gz": "application/x-gzip",
  ".htm": "text/html",
  ".html": "text/html",
  ".ico": "image/vnd.microsoft.icon",
  ".ics": "text/calendar",
  ".iso": "application/octet-stream",
  ".jar": "application/java-archive",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript",
  ".json": "application/json",
  ".less": "text/css",
  ".log": "text/plain",
  ".m3u": "audio/x-mpegurl",
  ".m4a": "audio/mp4",
  ".m4v": "video/mp4",
  ".manifest": "text/cache-manifest",
  ".markdown": "text/x-markdown",
  ".mathml": "application/mathml+xml",
  ".md": "text/x-markdown",
  ".mid": "audio/midi",
  ".midi": "audio/midi",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".mp4v": "video/mp4",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".odp": "application/vnd.oasis.opendocument.presentation",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".oga": "audio/ogg",
  ".ogg": "application/ogg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".pps": "application/vnd.ms-powerpoint",
  ".ppt": "application/vnd.ms-powerpoint",
  ".ps": "application/postscript",
  ".psd": "image/vnd.adobe.photoshop",
  ".qt": "video/quicktime",
  ".rar": "application/x-rar-compressed",
  ".rdf": "application/rdf+xml",
  ".rss": "application/rss+xml",
  ".rtf": "application/rtf",
  ".svg": "image/svg+xml",
  ".svgz": "image/svg+xml",
  ".swf": "application/x-shockwave-flash",
  ".tar": "application/x-tar",
  ".tbz": "application/x-bzip-compressed-tar",
  ".text": "text/plain",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".torrent": "application/x-bittorrent",
  ".ttf": "application/x-font-ttf",
  ".txt": "text/plain",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".wma": "audio/x-ms-wma",
  ".wmv": "video/x-ms-wmv",
  ".xls": "application/vnd.ms-excel",
  ".xml": "application/xml",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".zip": "application/zip"
}

},{}],100:[function(require,module,exports){
(function (process){
module.exports = function (tasks, limit, cb) {
  if (typeof limit !== 'number') throw new Error('second argument must be a Number')
  var results, len, pending, keys, isErrored
  var isSync = true

  if (Array.isArray(tasks)) {
    results = []
    pending = len = tasks.length
  } else {
    keys = Object.keys(tasks)
    results = {}
    pending = len = keys.length
  }

  function done (err) {
    function end () {
      if (cb) cb(err, results)
      cb = null
    }
    if (isSync) process.nextTick(end)
    else end()
  }

  function each (i, err, result) {
    results[i] = result
    if (err) isErrored = true
    if (--pending === 0 || err) {
      done(err)
    } else if (!isErrored && next < len) {
      var key
      if (keys) {
        key = keys[next]
        next += 1
        tasks[key](function (err, result) { each(key, err, result) })
      } else {
        key = next
        next += 1
        tasks[key](function (err, result) { each(key, err, result) })
      }
    }
  }

  var next = limit
  if (!pending) {
    // empty
    done(null)
  } else if (keys) {
    // object
    keys.some(function (key, i) {
      tasks[key](function (err, result) { each(key, err, result) })
      if (i === limit - 1) return true // early return
    })
  } else {
    // array
    tasks.some(function (task, i) {
      task(function (err, result) { each(i, err, result) })
      if (i === limit - 1) return true // early return
    })
  }

  isSync = false
}

}).call(this,require('_process'))
},{"_process":22}],101:[function(require,module,exports){
(function (process){
module.exports = function (tasks, cb) {
  var results, pending, keys
  var isSync = true

  if (Array.isArray(tasks)) {
    results = []
    pending = tasks.length
  } else {
    keys = Object.keys(tasks)
    results = {}
    pending = keys.length
  }

  function done (err) {
    function end () {
      if (cb) cb(err, results)
      cb = null
    }
    if (isSync) process.nextTick(end)
    else end()
  }

  function each (i, err, result) {
    results[i] = result
    if (--pending === 0 || err) {
      done(err)
    }
  }

  if (!pending) {
    // empty
    done(null)
  } else if (keys) {
    // object
    keys.forEach(function (key) {
      tasks[key](function (err, result) { each(key, err, result) })
    })
  } else {
    // array
    tasks.forEach(function (task, i) {
      task(function (err, result) { each(i, err, result) })
    })
  }

  isSync = false
}

}).call(this,require('_process'))
},{"_process":22}],102:[function(require,module,exports){
(function (global){
(function () {
    var /*
 * Rusha, a JavaScript implementation of the Secure Hash Algorithm, SHA-1,
 * as defined in FIPS PUB 180-1, tuned for high performance with large inputs.
 * (http://github.com/srijs/rusha)
 *
 * Inspired by Paul Johnstons implementation (http://pajhome.org.uk/crypt/md5).
 *
 * Copyright (c) 2013 Sam Rijs (http://awesam.de).
 * Released under the terms of the MIT license as follows:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
    util = {
        getDataType: function (data) {
            if (typeof data === 'string') {
                return 'string';
            }
            if (data instanceof Array) {
                return 'array';
            }
            if (typeof global !== 'undefined' && global.Buffer && global.Buffer.isBuffer(data)) {
                return 'buffer';
            }
            if (data instanceof ArrayBuffer) {
                return 'arraybuffer';
            }
            if (data.buffer instanceof ArrayBuffer) {
                return 'view';
            }
            if (data instanceof Blob) {
                return 'blob';
            }
            throw new Error('Unsupported data type.');
        }
    };
    function Rusha(chunkSize) {
        'use strict';
        var // Private object structure.
        self$2 = { fill: 0 };
        var // Calculate the length of buffer that the sha1 routine uses
        // including the padding.
        padlen = function (len) {
            for (len += 9; len % 64 > 0; len += 1);
            return len;
        };
        var padZeroes = function (bin, len) {
            for (var i$2 = len >> 2; i$2 < bin.length; i$2++)
                bin[i$2] = 0;
        };
        var padData = function (bin, chunkLen, msgLen) {
            bin[chunkLen >> 2] |= 128 << 24 - (chunkLen % 4 << 3);
            // To support msgLen >= 2 GiB, use a float division when computing the
            // high 32-bits of the big-endian message length in bits.
            bin[((chunkLen >> 2) + 2 & ~15) + 14] = msgLen / (1 << 29) | 0;
            bin[((chunkLen >> 2) + 2 & ~15) + 15] = msgLen << 3;
        };
        var // Convert a binary string and write it to the heap.
        // A binary string is expected to only contain char codes < 256.
        convStr = function (H8, H32, start, len, off) {
            var str = this, i$2, om = off % 4, lm = len % 4, j = len - lm;
            if (j > 0) {
                switch (om) {
                case 0:
                    H8[off + 3 | 0] = str.charCodeAt(start);
                case 1:
                    H8[off + 2 | 0] = str.charCodeAt(start + 1);
                case 2:
                    H8[off + 1 | 0] = str.charCodeAt(start + 2);
                case 3:
                    H8[off | 0] = str.charCodeAt(start + 3);
                }
            }
            for (i$2 = om; i$2 < j; i$2 = i$2 + 4 | 0) {
                H32[off + i$2 >> 2] = str.charCodeAt(start + i$2) << 24 | str.charCodeAt(start + i$2 + 1) << 16 | str.charCodeAt(start + i$2 + 2) << 8 | str.charCodeAt(start + i$2 + 3);
            }
            switch (lm) {
            case 3:
                H8[off + j + 1 | 0] = str.charCodeAt(start + j + 2);
            case 2:
                H8[off + j + 2 | 0] = str.charCodeAt(start + j + 1);
            case 1:
                H8[off + j + 3 | 0] = str.charCodeAt(start + j);
            }
        };
        var // Convert a buffer or array and write it to the heap.
        // The buffer or array is expected to only contain elements < 256.
        convBuf = function (H8, H32, start, len, off) {
            var buf = this, i$2, om = off % 4, lm = len % 4, j = len - lm;
            if (j > 0) {
                switch (om) {
                case 0:
                    H8[off + 3 | 0] = buf[start];
                case 1:
                    H8[off + 2 | 0] = buf[start + 1];
                case 2:
                    H8[off + 1 | 0] = buf[start + 2];
                case 3:
                    H8[off | 0] = buf[start + 3];
                }
            }
            for (i$2 = 4 - om; i$2 < j; i$2 = i$2 += 4 | 0) {
                H32[off + i$2 >> 2] = buf[start + i$2] << 24 | buf[start + i$2 + 1] << 16 | buf[start + i$2 + 2] << 8 | buf[start + i$2 + 3];
            }
            switch (lm) {
            case 3:
                H8[off + j + 1 | 0] = buf[start + j + 2];
            case 2:
                H8[off + j + 2 | 0] = buf[start + j + 1];
            case 1:
                H8[off + j + 3 | 0] = buf[start + j];
            }
        };
        var convBlob = function (H8, H32, start, len, off) {
            var blob = this, i$2, om = off % 4, lm = len % 4, j = len - lm;
            var buf = new Uint8Array(reader.readAsArrayBuffer(blob.slice(start, start + len)));
            if (j > 0) {
                switch (om) {
                case 0:
                    H8[off + 3 | 0] = buf[0];
                case 1:
                    H8[off + 2 | 0] = buf[1];
                case 2:
                    H8[off + 1 | 0] = buf[2];
                case 3:
                    H8[off | 0] = buf[3];
                }
            }
            for (i$2 = 4 - om; i$2 < j; i$2 = i$2 += 4 | 0) {
                H32[off + i$2 >> 2] = buf[i$2] << 24 | buf[i$2 + 1] << 16 | buf[i$2 + 2] << 8 | buf[i$2 + 3];
            }
            switch (lm) {
            case 3:
                H8[off + j + 1 | 0] = buf[j + 2];
            case 2:
                H8[off + j + 2 | 0] = buf[j + 1];
            case 1:
                H8[off + j + 3 | 0] = buf[j];
            }
        };
        var convFn = function (data) {
            switch (util.getDataType(data)) {
            case 'string':
                return convStr.bind(data);
            case 'array':
                return convBuf.bind(data);
            case 'buffer':
                return convBuf.bind(data);
            case 'arraybuffer':
                return convBuf.bind(new Uint8Array(data));
            case 'view':
                return convBuf.bind(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
            case 'blob':
                return convBlob.bind(data);
            }
        };
        var slice = function (data, offset) {
            switch (util.getDataType(data)) {
            case 'string':
                return data.slice(offset);
            case 'array':
                return data.slice(offset);
            case 'buffer':
                return data.slice(offset);
            case 'arraybuffer':
                return data.slice(offset);
            case 'view':
                return data.buffer.slice(offset);
            }
        };
        var // Precompute 00 - ff strings
        precomputedHex = new Array(256);
        for (var i = 0; i < 256; i++) {
            precomputedHex[i] = (i < 16 ? '0' : '') + i.toString(16);
        }
        var // Convert an ArrayBuffer into its hexadecimal string representation.
        hex = function (arrayBuffer) {
            var binarray = new Uint8Array(arrayBuffer);
            var res = new Array(arrayBuffer.byteLength);
            for (var i$2 = 0; i$2 < res.length; i$2++) {
                res[i$2] = precomputedHex[binarray[i$2]];
            }
            return res.join('');
        };
        var ceilHeapSize = function (v) {
            // The asm.js spec says:
            // The heap object's byteLength must be either
            // 2^n for n in [12, 24) or 2^24 * n for n ≥ 1.
            // Also, byteLengths smaller than 2^16 are deprecated.
            var p;
            if (// If v is smaller than 2^16, the smallest possible solution
                // is 2^16.
                v <= 65536)
                return 65536;
            if (// If v < 2^24, we round up to 2^n,
                // otherwise we round up to 2^24 * n.
                v < 16777216) {
                for (p = 1; p < v; p = p << 1);
            } else {
                for (p = 16777216; p < v; p += 16777216);
            }
            return p;
        };
        var // Initialize the internal data structures to a new capacity.
        init = function (size) {
            if (size % 64 > 0) {
                throw new Error('Chunk size must be a multiple of 128 bit');
            }
            self$2.maxChunkLen = size;
            self$2.padMaxChunkLen = padlen(size);
            // The size of the heap is the sum of:
            // 1. The padded input message size
            // 2. The extended space the algorithm needs (320 byte)
            // 3. The 160 bit state the algoritm uses
            self$2.heap = new ArrayBuffer(ceilHeapSize(self$2.padMaxChunkLen + 320 + 20));
            self$2.h32 = new Int32Array(self$2.heap);
            self$2.h8 = new Int8Array(self$2.heap);
            self$2.core = new Rusha._core({
                Int32Array: Int32Array,
                DataView: DataView
            }, {}, self$2.heap);
            self$2.buffer = null;
        };
        // Iinitializethe datastructures according
        // to a chunk siyze.
        init(chunkSize || 64 * 1024);
        var initState = function (heap, padMsgLen) {
            var io = new Int32Array(heap, padMsgLen + 320, 5);
            io[0] = 1732584193;
            io[1] = -271733879;
            io[2] = -1732584194;
            io[3] = 271733878;
            io[4] = -1009589776;
        };
        var padChunk = function (chunkLen, msgLen) {
            var padChunkLen = padlen(chunkLen);
            var view = new Int32Array(self$2.heap, 0, padChunkLen >> 2);
            padZeroes(view, chunkLen);
            padData(view, chunkLen, msgLen);
            return padChunkLen;
        };
        var // Write data to the heap.
        write = function (data, chunkOffset, chunkLen) {
            convFn(data)(self$2.h8, self$2.h32, chunkOffset, chunkLen, 0);
        };
        var // Initialize and call the RushaCore,
        // assuming an input buffer of length len * 4.
        coreCall = function (data, chunkOffset, chunkLen, msgLen, finalize) {
            var padChunkLen = chunkLen;
            if (finalize) {
                padChunkLen = padChunk(chunkLen, msgLen);
            }
            write(data, chunkOffset, chunkLen);
            self$2.core.hash(padChunkLen, self$2.padMaxChunkLen);
        };
        var getRawDigest = function (heap, padMaxChunkLen) {
            var io = new Int32Array(heap, padMaxChunkLen + 320, 5);
            var out = new Int32Array(5);
            var arr = new DataView(out.buffer);
            arr.setInt32(0, io[0], false);
            arr.setInt32(4, io[1], false);
            arr.setInt32(8, io[2], false);
            arr.setInt32(12, io[3], false);
            arr.setInt32(16, io[4], false);
            return out;
        };
        var // Calculate the hash digest as an array of 5 32bit integers.
        rawDigest = this.rawDigest = function (str) {
            var msgLen = str.byteLength || str.length || str.size || 0;
            initState(self$2.heap, self$2.padMaxChunkLen);
            var chunkOffset = 0, chunkLen = self$2.maxChunkLen, last;
            for (chunkOffset = 0; msgLen > chunkOffset + chunkLen; chunkOffset += chunkLen) {
                coreCall(str, chunkOffset, chunkLen, msgLen, false);
            }
            coreCall(str, chunkOffset, msgLen - chunkOffset, msgLen, true);
            return getRawDigest(self$2.heap, self$2.padMaxChunkLen);
        };
        // The digest and digestFrom* interface returns the hash digest
        // as a hex string.
        this.digest = this.digestFromString = this.digestFromBuffer = this.digestFromArrayBuffer = function (str) {
            return hex(rawDigest(str).buffer);
        };
    }
    ;
    // The low-level RushCore module provides the heart of Rusha,
    // a high-speed sha1 implementation working on an Int32Array heap.
    // At first glance, the implementation seems complicated, however
    // with the SHA1 spec at hand, it is obvious this almost a textbook
    // implementation that has a few functions hand-inlined and a few loops
    // hand-unrolled.
    Rusha._core = function RushaCore(stdlib, foreign, heap) {
        'use asm';
        var H = new stdlib.Int32Array(heap);
        function hash(k, x) {
            // k in bytes
            k = k | 0;
            x = x | 0;
            var i = 0, j = 0, y0 = 0, z0 = 0, y1 = 0, z1 = 0, y2 = 0, z2 = 0, y3 = 0, z3 = 0, y4 = 0, z4 = 0, t0 = 0, t1 = 0;
            y0 = H[x + 320 >> 2] | 0;
            y1 = H[x + 324 >> 2] | 0;
            y2 = H[x + 328 >> 2] | 0;
            y3 = H[x + 332 >> 2] | 0;
            y4 = H[x + 336 >> 2] | 0;
            for (i = 0; (i | 0) < (k | 0); i = i + 64 | 0) {
                z0 = y0;
                z1 = y1;
                z2 = y2;
                z3 = y3;
                z4 = y4;
                for (j = 0; (j | 0) < 64; j = j + 4 | 0) {
                    t1 = H[i + j >> 2] | 0;
                    t0 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | ~y1 & y3) | 0) + ((t1 + y4 | 0) + 1518500249 | 0) | 0;
                    y4 = y3;
                    y3 = y2;
                    y2 = y1 << 30 | y1 >>> 2;
                    y1 = y0;
                    y0 = t0;
                    H[k + j >> 2] = t1;
                }
                for (j = k + 64 | 0; (j | 0) < (k + 80 | 0); j = j + 4 | 0) {
                    t1 = (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) << 1 | (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) >>> 31;
                    t0 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | ~y1 & y3) | 0) + ((t1 + y4 | 0) + 1518500249 | 0) | 0;
                    y4 = y3;
                    y3 = y2;
                    y2 = y1 << 30 | y1 >>> 2;
                    y1 = y0;
                    y0 = t0;
                    H[j >> 2] = t1;
                }
                for (j = k + 80 | 0; (j | 0) < (k + 160 | 0); j = j + 4 | 0) {
                    t1 = (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) << 1 | (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) >>> 31;
                    t0 = ((y0 << 5 | y0 >>> 27) + (y1 ^ y2 ^ y3) | 0) + ((t1 + y4 | 0) + 1859775393 | 0) | 0;
                    y4 = y3;
                    y3 = y2;
                    y2 = y1 << 30 | y1 >>> 2;
                    y1 = y0;
                    y0 = t0;
                    H[j >> 2] = t1;
                }
                for (j = k + 160 | 0; (j | 0) < (k + 240 | 0); j = j + 4 | 0) {
                    t1 = (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) << 1 | (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) >>> 31;
                    t0 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | y1 & y3 | y2 & y3) | 0) + ((t1 + y4 | 0) - 1894007588 | 0) | 0;
                    y4 = y3;
                    y3 = y2;
                    y2 = y1 << 30 | y1 >>> 2;
                    y1 = y0;
                    y0 = t0;
                    H[j >> 2] = t1;
                }
                for (j = k + 240 | 0; (j | 0) < (k + 320 | 0); j = j + 4 | 0) {
                    t1 = (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) << 1 | (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) >>> 31;
                    t0 = ((y0 << 5 | y0 >>> 27) + (y1 ^ y2 ^ y3) | 0) + ((t1 + y4 | 0) - 899497514 | 0) | 0;
                    y4 = y3;
                    y3 = y2;
                    y2 = y1 << 30 | y1 >>> 2;
                    y1 = y0;
                    y0 = t0;
                    H[j >> 2] = t1;
                }
                y0 = y0 + z0 | 0;
                y1 = y1 + z1 | 0;
                y2 = y2 + z2 | 0;
                y3 = y3 + z3 | 0;
                y4 = y4 + z4 | 0;
            }
            H[x + 320 >> 2] = y0;
            H[x + 324 >> 2] = y1;
            H[x + 328 >> 2] = y2;
            H[x + 332 >> 2] = y3;
            H[x + 336 >> 2] = y4;
        }
        return { hash: hash };
    };
    if (// If we'e running in Node.JS, export a module.
        typeof module !== 'undefined') {
        module.exports = Rusha;
    } else if (// If we're running in a DOM context, export
        // the Rusha object to toplevel.
        typeof window !== 'undefined') {
        window.Rusha = Rusha;
    }
    if (// If we're running in a webworker, accept
        // messages containing a jobid and a buffer
        // or blob object, and return the hash result.
        typeof FileReaderSync !== 'undefined') {
        var reader = new FileReaderSync(), hasher = new Rusha(4 * 1024 * 1024);
        self.onmessage = function onMessage(event) {
            var hash, data = event.data.data;
            try {
                hash = hasher.digest(data);
                self.postMessage({
                    id: event.data.id,
                    hash: hash
                });
            } catch (e) {
                self.postMessage({
                    id: event.data.id,
                    error: e.name
                });
            }
        };
    }
}());
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],103:[function(require,module,exports){
module.exports = require('buffer')

},{"buffer":24}],104:[function(require,module,exports){
function select(element) {
    var selectedText;

    if (element.nodeName === 'SELECT') {
        element.focus();

        selectedText = element.value;
    }
    else if (element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA') {
        element.focus();
        element.setSelectionRange(0, element.value.length);

        selectedText = element.value;
    }
    else {
        if (element.hasAttribute('contenteditable')) {
            element.focus();
        }

        var selection = window.getSelection();
        var range = document.createRange();

        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);

        selectedText = selection.toString();
    }

    return selectedText;
}

module.exports = select;

},{}],105:[function(require,module,exports){
(function (Buffer){
module.exports = function (stream, cb) {
  var chunks = []
  stream.on('data', function (chunk) {
    chunks.push(chunk)
  })
  stream.once('end', function () {
    if (cb) cb(null, Buffer.concat(chunks))
    cb = null
  })
  stream.once('error', function (err) {
    if (cb) cb(err)
    cb = null
  })
}

}).call(this,require("buffer").Buffer)
},{"buffer":24}],106:[function(require,module,exports){
(function (Buffer){
module.exports = simpleGet

var concat = require('simple-concat')
var http = require('http')
var https = require('https')
var once = require('once')
var querystring = require('querystring')
var unzipResponse = require('unzip-response') // excluded from browser build
var url = require('url')

function simpleGet (opts, cb) {
  opts = typeof opts === 'string' ? {url: opts} : Object.assign({}, opts)
  cb = once(cb)

  if (opts.url) parseOptsUrl(opts)
  if (opts.headers == null) opts.headers = {}
  if (opts.maxRedirects == null) opts.maxRedirects = 10

  var body
  if (opts.form) body = typeof opts.form === 'string' ? opts.form : querystring.stringify(opts.form)
  if (opts.body) body = opts.json ? JSON.stringify(opts.body) : opts.body

  if (opts.json) opts.headers.accept = 'application/json'
  if (opts.json && body) opts.headers['content-type'] = 'application/json'
  if (opts.form) opts.headers['content-type'] = 'application/x-www-form-urlencoded'
  if (body) opts.headers['content-length'] = Buffer.byteLength(body)
  delete opts.body; delete opts.form

  if (body && !opts.method) opts.method = 'POST'
  if (opts.method) opts.method = opts.method.toUpperCase()

  // Request gzip/deflate
  var customAcceptEncoding = Object.keys(opts.headers).some(function (h) {
    return h.toLowerCase() === 'accept-encoding'
  })
  if (!customAcceptEncoding) opts.headers['accept-encoding'] = 'gzip, deflate'

  // Support http/https urls
  var protocol = opts.protocol === 'https:' ? https : http
  var req = protocol.request(opts, function (res) {
    // Follow 3xx redirects
    if (res.statusCode >= 300 && res.statusCode < 400 && 'location' in res.headers) {
      opts.url = res.headers.location
      parseOptsUrl(opts)
      res.resume() // Discard response

      opts.maxRedirects -= 1
      if (opts.maxRedirects > 0) simpleGet(opts, cb)
      else cb(new Error('too many redirects'))

      return
    }

    var tryUnzip = typeof unzipResponse === 'function' && opts.method !== 'HEAD'
    cb(null, tryUnzip ? unzipResponse(res) : res)
  })
  req.on('error', cb)
  req.end(body)
  return req
}

simpleGet.concat = function (opts, cb) {
  return simpleGet(opts, function (err, res) {
    if (err) return cb(err)
    concat(res, function (err, data) {
      if (err) return cb(err)
      if (opts.json) {
        try {
          data = JSON.parse(data.toString())
        } catch (err) {
          return cb(err, res, data)
        }
      }
      cb(null, res, data)
    })
  })
}

;['get', 'post', 'put', 'patch', 'head', 'delete'].forEach(function (method) {
  simpleGet[method] = function (opts, cb) {
    if (typeof opts === 'string') opts = {url: opts}
    opts.method = method.toUpperCase()
    return simpleGet(opts, cb)
  }
})

function parseOptsUrl (opts) {
  var loc = url.parse(opts.url)
  if (loc.hostname) opts.hostname = loc.hostname
  if (loc.port) opts.port = loc.port
  if (loc.protocol) opts.protocol = loc.protocol
  if (loc.auth) opts.auth = loc.auth
  opts.path = loc.path
  delete opts.url
}

}).call(this,require("buffer").Buffer)
},{"buffer":24,"http":111,"https":51,"once":77,"querystring":87,"simple-concat":105,"unzip-response":19,"url":129}],107:[function(require,module,exports){
(function (Buffer){
module.exports = Peer

var debug = require('debug')('simple-peer')
var getBrowserRTC = require('get-browser-rtc')
var inherits = require('inherits')
var randombytes = require('randombytes')
var stream = require('readable-stream')

inherits(Peer, stream.Duplex)

/**
 * WebRTC peer connection. Same API as node core `net.Socket`, plus a few extra methods.
 * Duplex stream.
 * @param {Object} opts
 */
function Peer (opts) {
  var self = this
  if (!(self instanceof Peer)) return new Peer(opts)

  self.channelName = opts.initiator
    ? opts.channelName || randombytes(20).toString('hex')
    : null

  self._debug('new peer %o', opts)

  if (!opts) opts = {}
  opts.allowHalfOpen = false
  if (opts.highWaterMark == null) opts.highWaterMark = 1024 * 1024

  stream.Duplex.call(self, opts)

  self.initiator = opts.initiator || false
  self.channelConfig = opts.channelConfig || Peer.channelConfig
  self.config = opts.config || Peer.config
  self.constraints = opts.constraints || Peer.constraints
  self.offerConstraints = opts.offerConstraints || {}
  self.answerConstraints = opts.answerConstraints || {}
  self.reconnectTimer = opts.reconnectTimer || false
  self.sdpTransform = opts.sdpTransform || function (sdp) { return sdp }
  self.stream = opts.stream || false
  self.trickle = opts.trickle !== undefined ? opts.trickle : true

  self.destroyed = false
  self.connected = false

  // so Peer object always has same shape (V8 optimization)
  self.remoteAddress = undefined
  self.remoteFamily = undefined
  self.remotePort = undefined
  self.localAddress = undefined
  self.localPort = undefined

  self._isWrtc = !!opts.wrtc // HACK: to fix `wrtc` bug. See issue: #60
  self._wrtc = (opts.wrtc && typeof opts.wrtc === 'object')
    ? opts.wrtc
    : getBrowserRTC()
  if (!self._wrtc) {
    if (typeof window === 'undefined') {
      throw new Error('No WebRTC support: Specify `opts.wrtc` option in this environment')
    } else {
      throw new Error('No WebRTC support: Not a supported browser')
    }
  }

  self._maxBufferedAmount = opts.highWaterMark
  self._pcReady = false
  self._channelReady = false
  self._iceComplete = false // ice candidate trickle done (got null candidate)
  self._channel = null
  self._pendingCandidates = []

  self._chunk = null
  self._cb = null
  self._interval = null
  self._reconnectTimeout = null

  self._pc = new (self._wrtc.RTCPeerConnection)(self.config, self.constraints)
  self._pc.oniceconnectionstatechange = function () {
    self._onIceConnectionStateChange()
  }
  self._pc.onsignalingstatechange = function () {
    self._onSignalingStateChange()
  }
  self._pc.onicecandidate = function (event) {
    self._onIceCandidate(event)
  }

  if (self.stream) self._pc.addStream(self.stream)

  if ('ontrack' in self._pc) {
    // WebRTC Spec, Firefox
    self._pc.ontrack = function (event) {
      self._onTrack(event)
    }
  } else {
    // Chrome, etc. This can be removed once all browsers support `ontrack`
    self._pc.onaddstream = function (event) {
      self._onAddStream(event)
    }
  }

  if (self.initiator) {
    self._setupData({
      channel: self._pc.createDataChannel(self.channelName, self.channelConfig)
    })

    var createdOffer = false
    self._pc.onnegotiationneeded = function () {
      if (!createdOffer) self._createOffer()
      createdOffer = true
    }
    // Only Chrome triggers "negotiationneeded"; this is a workaround for other
    // implementations
    if (typeof window === 'undefined' || !window.webkitRTCPeerConnection) {
      self._pc.onnegotiationneeded()
    }
  } else {
    self._pc.ondatachannel = function (event) {
      self._setupData(event)
    }
  }

  self.on('finish', function () {
    if (self.connected) {
      // When local peer is finished writing, close connection to remote peer.
      // Half open connections are currently not supported.
      // Wait a bit before destroying so the datachannel flushes.
      // TODO: is there a more reliable way to accomplish this?
      setTimeout(function () {
        self._destroy()
      }, 100)
    } else {
      // If data channel is not connected when local peer is finished writing, wait until
      // data is flushed to network at "connect" event.
      // TODO: is there a more reliable way to accomplish this?
      self.once('connect', function () {
        setTimeout(function () {
          self._destroy()
        }, 100)
      })
    }
  })
}

Peer.WEBRTC_SUPPORT = !!getBrowserRTC()

/**
 * Expose config, constraints, and data channel config for overriding all Peer
 * instances. Otherwise, just set opts.config, opts.constraints, or opts.channelConfig
 * when constructing a Peer.
 */
Peer.config = {
  iceServers: [
    {
      url: 'stun:23.21.150.121', // deprecated, replaced by `urls`
      urls: 'stun:23.21.150.121'
    }
  ]
}
Peer.constraints = {}
Peer.channelConfig = {}

Object.defineProperty(Peer.prototype, 'bufferSize', {
  get: function () {
    var self = this
    return (self._channel && self._channel.bufferedAmount) || 0
  }
})

Peer.prototype.address = function () {
  var self = this
  return { port: self.localPort, family: 'IPv4', address: self.localAddress }
}

Peer.prototype.signal = function (data) {
  var self = this
  if (self.destroyed) throw new Error('cannot signal after peer is destroyed')
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch (err) {
      data = {}
    }
  }
  self._debug('signal()')

  function addIceCandidate (candidate) {
    try {
      self._pc.addIceCandidate(
        new self._wrtc.RTCIceCandidate(candidate),
        noop,
        function (err) { self._onError(err) }
      )
    } catch (err) {
      self._destroy(new Error('error adding candidate: ' + err.message))
    }
  }

  if (data.sdp) {
    self._pc.setRemoteDescription(new (self._wrtc.RTCSessionDescription)(data), function () {
      if (self.destroyed) return
      if (self._pc.remoteDescription.type === 'offer') self._createAnswer()

      self._pendingCandidates.forEach(addIceCandidate)
      self._pendingCandidates = []
    }, function (err) { self._onError(err) })
  }
  if (data.candidate) {
    if (self._pc.remoteDescription) addIceCandidate(data.candidate)
    else self._pendingCandidates.push(data.candidate)
  }
  if (!data.sdp && !data.candidate) {
    self._destroy(new Error('signal() called with invalid signal data'))
  }
}

/**
 * Send text/binary data to the remote peer.
 * @param {TypedArrayView|ArrayBuffer|Buffer|string|Blob|Object} chunk
 */
Peer.prototype.send = function (chunk) {
  var self = this

  // HACK: `wrtc` module doesn't accept node.js buffer. See issue: #60
  if (Buffer.isBuffer(chunk) && self._isWrtc) {
    chunk = new Uint8Array(chunk)
  }

  var len = chunk.length || chunk.byteLength || chunk.size
  self._channel.send(chunk)
  self._debug('write: %d bytes', len)
}

Peer.prototype.destroy = function (onclose) {
  var self = this
  self._destroy(null, onclose)
}

Peer.prototype._destroy = function (err, onclose) {
  var self = this
  if (self.destroyed) return
  if (onclose) self.once('close', onclose)

  self._debug('destroy (error: %s)', err && err.message)

  self.readable = self.writable = false

  if (!self._readableState.ended) self.push(null)
  if (!self._writableState.finished) self.end()

  self.destroyed = true
  self.connected = false
  self._pcReady = false
  self._channelReady = false

  self._chunk = null
  self._cb = null
  clearInterval(self._interval)
  clearTimeout(self._reconnectTimeout)

  if (self._pc) {
    try {
      self._pc.close()
    } catch (err) {}

    self._pc.oniceconnectionstatechange = null
    self._pc.onsignalingstatechange = null
    self._pc.onicecandidate = null
    if ('ontrack' in self._pc) {
      self._pc.ontrack = null
    } else {
      self._pc.onaddstream = null
    }
    self._pc.onnegotiationneeded = null
    self._pc.ondatachannel = null
  }

  if (self._channel) {
    try {
      self._channel.close()
    } catch (err) {}

    self._channel.onmessage = null
    self._channel.onopen = null
    self._channel.onclose = null
  }
  self._pc = null
  self._channel = null

  if (err) self.emit('error', err)
  self.emit('close')
}

Peer.prototype._setupData = function (event) {
  var self = this
  self._channel = event.channel
  self.channelName = self._channel.label

  self._channel.binaryType = 'arraybuffer'
  self._channel.onmessage = function (event) {
    self._onChannelMessage(event)
  }
  self._channel.onopen = function () {
    self._onChannelOpen()
  }
  self._channel.onclose = function () {
    self._onChannelClose()
  }
}

Peer.prototype._read = function () {}

Peer.prototype._write = function (chunk, encoding, cb) {
  var self = this
  if (self.destroyed) return cb(new Error('cannot write after peer is destroyed'))

  if (self.connected) {
    try {
      self.send(chunk)
    } catch (err) {
      return self._onError(err)
    }
    if (self._channel.bufferedAmount > self._maxBufferedAmount) {
      self._debug('start backpressure: bufferedAmount %d', self._channel.bufferedAmount)
      self._cb = cb
    } else {
      cb(null)
    }
  } else {
    self._debug('write before connect')
    self._chunk = chunk
    self._cb = cb
  }
}

Peer.prototype._createOffer = function () {
  var self = this
  if (self.destroyed) return

  self._pc.createOffer(function (offer) {
    if (self.destroyed) return
    offer.sdp = self.sdpTransform(offer.sdp)
    self._pc.setLocalDescription(offer, noop, function (err) { self._onError(err) })
    var sendOffer = function () {
      var signal = self._pc.localDescription || offer
      self._debug('signal')
      self.emit('signal', {
        type: signal.type,
        sdp: signal.sdp
      })
    }
    if (self.trickle || self._iceComplete) sendOffer()
    else self.once('_iceComplete', sendOffer) // wait for candidates
  }, function (err) { self._onError(err) }, self.offerConstraints)
}

Peer.prototype._createAnswer = function () {
  var self = this
  if (self.destroyed) return

  self._pc.createAnswer(function (answer) {
    if (self.destroyed) return
    answer.sdp = self.sdpTransform(answer.sdp)
    self._pc.setLocalDescription(answer, noop, function (err) { self._onError(err) })
    var sendAnswer = function () {
      var signal = self._pc.localDescription || answer
      self._debug('signal')
      self.emit('signal', {
        type: signal.type,
        sdp: signal.sdp
      })
    }
    if (self.trickle || self._iceComplete) sendAnswer()
    else self.once('_iceComplete', sendAnswer)
  }, function (err) { self._onError(err) }, self.answerConstraints)
}

Peer.prototype._onIceConnectionStateChange = function () {
  var self = this
  if (self.destroyed) return
  var iceGatheringState = self._pc.iceGatheringState
  var iceConnectionState = self._pc.iceConnectionState
  self._debug('iceConnectionStateChange %s %s', iceGatheringState, iceConnectionState)
  self.emit('iceConnectionStateChange', iceGatheringState, iceConnectionState)
  if (iceConnectionState === 'connected' || iceConnectionState === 'completed') {
    clearTimeout(self._reconnectTimeout)
    self._pcReady = true
    self._maybeReady()
  }
  if (iceConnectionState === 'disconnected') {
    if (self.reconnectTimer) {
      // If user has set `opt.reconnectTimer`, allow time for ICE to attempt a reconnect
      clearTimeout(self._reconnectTimeout)
      self._reconnectTimeout = setTimeout(function () {
        self._destroy()
      }, self.reconnectTimer)
    } else {
      self._destroy()
    }
  }
  if (iceConnectionState === 'failed') {
    self._destroy()
  }
  if (iceConnectionState === 'closed') {
    self._destroy()
  }
}

Peer.prototype.getStats = function (cb) {
  var self = this
  if (!self._pc.getStats) { // No ability to call stats
    cb([])
  } else if (typeof window !== 'undefined' && !!window.mozRTCPeerConnection) { // Mozilla
    self._pc.getStats(null, function (res) {
      var items = []
      res.forEach(function (item) {
        items.push(item)
      })
      cb(items)
    }, function (err) { self._onError(err) })
  } else {
    self._pc.getStats(function (res) { // Chrome
      var items = []
      res.result().forEach(function (result) {
        var item = {}
        result.names().forEach(function (name) {
          item[name] = result.stat(name)
        })
        item.id = result.id
        item.type = result.type
        item.timestamp = result.timestamp
        items.push(item)
      })
      cb(items)
    })
  }
}

Peer.prototype._maybeReady = function () {
  var self = this
  self._debug('maybeReady pc %s channel %s', self._pcReady, self._channelReady)
  if (self.connected || self._connecting || !self._pcReady || !self._channelReady) return
  self._connecting = true

  self.getStats(function (items) {
    self._connecting = false
    self.connected = true

    var remoteCandidates = {}
    var localCandidates = {}

    function setActiveCandidates (item) {
      var local = localCandidates[item.localCandidateId]
      var remote = remoteCandidates[item.remoteCandidateId]

      if (local) {
        self.localAddress = local.ipAddress
        self.localPort = Number(local.portNumber)
      } else if (typeof item.googLocalAddress === 'string') {
        // Sometimes `item.id` is undefined in `wrtc` and Chrome
        // See: https://github.com/feross/simple-peer/issues/66
        local = item.googLocalAddress.split(':')
        self.localAddress = local[0]
        self.localPort = Number(local[1])
      }
      self._debug('connect local: %s:%s', self.localAddress, self.localPort)

      if (remote) {
        self.remoteAddress = remote.ipAddress
        self.remotePort = Number(remote.portNumber)
        self.remoteFamily = 'IPv4'
      } else if (typeof item.googRemoteAddress === 'string') {
        remote = item.googRemoteAddress.split(':')
        self.remoteAddress = remote[0]
        self.remotePort = Number(remote[1])
        self.remoteFamily = 'IPv4'
      }
      self._debug('connect remote: %s:%s', self.remoteAddress, self.remotePort)
    }

    items.forEach(function (item) {
      if (item.type === 'remotecandidate') remoteCandidates[item.id] = item
      if (item.type === 'localcandidate') localCandidates[item.id] = item
    })

    items.forEach(function (item) {
      var isCandidatePair = (
        (item.type === 'googCandidatePair' && item.googActiveConnection === 'true') ||
        (item.type === 'candidatepair' && item.selected)
      )
      if (isCandidatePair) setActiveCandidates(item)
    })

    if (self._chunk) {
      try {
        self.send(self._chunk)
      } catch (err) {
        return self._onError(err)
      }
      self._chunk = null
      self._debug('sent chunk from "write before connect"')

      var cb = self._cb
      self._cb = null
      cb(null)
    }

    self._interval = setInterval(function () {
      if (!self._cb || !self._channel || self._channel.bufferedAmount > self._maxBufferedAmount) return
      self._debug('ending backpressure: bufferedAmount %d', self._channel.bufferedAmount)
      var cb = self._cb
      self._cb = null
      cb(null)
    }, 150)
    if (self._interval.unref) self._interval.unref()

    self._debug('connect')
    self.emit('connect')
  })
}

Peer.prototype._onSignalingStateChange = function () {
  var self = this
  if (self.destroyed) return
  self._debug('signalingStateChange %s', self._pc.signalingState)
  self.emit('signalingStateChange', self._pc.signalingState)
}

Peer.prototype._onIceCandidate = function (event) {
  var self = this
  if (self.destroyed) return
  if (event.candidate && self.trickle) {
    self.emit('signal', {
      candidate: {
        candidate: event.candidate.candidate,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        sdpMid: event.candidate.sdpMid
      }
    })
  } else if (!event.candidate) {
    self._iceComplete = true
    self.emit('_iceComplete')
  }
}

Peer.prototype._onChannelMessage = function (event) {
  var self = this
  if (self.destroyed) return
  var data = event.data
  self._debug('read: %d bytes', data.byteLength || data.length)

  if (data instanceof ArrayBuffer) data = new Buffer(data)
  self.push(data)
}

Peer.prototype._onChannelOpen = function () {
  var self = this
  if (self.connected || self.destroyed) return
  self._debug('on channel open')
  self._channelReady = true
  self._maybeReady()
}

Peer.prototype._onChannelClose = function () {
  var self = this
  if (self.destroyed) return
  self._debug('on channel close')
  self._destroy()
}

Peer.prototype._onAddStream = function (event) {
  var self = this
  if (self.destroyed) return
  self._debug('on add stream')
  self.emit('stream', event.stream)
}

Peer.prototype._onTrack = function (event) {
  var self = this
  if (self.destroyed) return
  self._debug('on track')
  self.emit('stream', event.streams[0])
}

Peer.prototype._onError = function (err) {
  var self = this
  if (self.destroyed) return
  self._debug('error %s', err.message || err)
  self._destroy(err)
}

Peer.prototype._debug = function () {
  var self = this
  var args = [].slice.call(arguments)
  var id = self.channelName && self.channelName.substring(0, 7)
  args[0] = '[' + id + '] ' + args[0]
  debug.apply(null, args)
}

function noop () {}

}).call(this,require("buffer").Buffer)
},{"buffer":24,"debug":32,"get-browser-rtc":46,"inherits":56,"randombytes":89,"readable-stream":97}],108:[function(require,module,exports){
var Rusha = require('rusha')

var rusha = new Rusha
var crypto = window.crypto || window.msCrypto || {}
var subtle = crypto.subtle || crypto.webkitSubtle

function sha1sync (buf) {
  return rusha.digest(buf)
}

// Browsers throw if they lack support for an algorithm.
// Promise will be rejected on non-secure origins. (http://goo.gl/lq4gCo)
try {
  subtle.digest({ name: 'sha-1' }, new Uint8Array).catch(function () {
    subtle = false
  })
} catch (err) { subtle = false }

function sha1 (buf, cb) {
  if (!subtle) {
    // Use Rusha
    setTimeout(cb, 0, sha1sync(buf))
    return
  }

  if (typeof buf === 'string') {
    buf = uint8array(buf)
  }

  subtle.digest({ name: 'sha-1' }, buf)
    .then(function succeed (result) {
      cb(hex(new Uint8Array(result)))
    },
    function fail (error) {
      cb(sha1sync(buf))
    })
}

function uint8array (s) {
  var l = s.length
  var array = new Uint8Array(l)
  for (var i = 0; i < l; i++) {
    array[i] = s.charCodeAt(i)
  }
  return array
}

function hex (buf) {
  var l = buf.length
  var chars = []
  for (var i = 0; i < l; i++) {
    var bite = buf[i]
    chars.push((bite >>> 4).toString(16))
    chars.push((bite & 0x0f).toString(16))
  }
  return chars.join('')
}

module.exports = sha1
module.exports.sync = sha1sync

},{"rusha":102}],109:[function(require,module,exports){
(function (process,Buffer){
/* global WebSocket */

module.exports = Socket

var debug = require('debug')('simple-websocket')
var inherits = require('inherits')
var stream = require('readable-stream')
var ws = require('ws') // websockets in node - will be empty object in browser

var _WebSocket = typeof WebSocket !== 'undefined' ? WebSocket : ws

inherits(Socket, stream.Duplex)

/**
 * WebSocket. Same API as node core `net.Socket`. Duplex stream.
 * @param {string} url websocket server url
 * @param {Object} opts options to stream.Duplex
 */
function Socket (url, opts) {
  var self = this
  if (!(self instanceof Socket)) return new Socket(url, opts)
  if (!opts) opts = {}
  debug('new websocket: %s %o', url, opts)

  opts.allowHalfOpen = false
  if (opts.highWaterMark == null) opts.highWaterMark = 1024 * 1024

  stream.Duplex.call(self, opts)

  self.url = url
  self.connected = false
  self.destroyed = false

  self._maxBufferedAmount = opts.highWaterMark
  self._chunk = null
  self._cb = null
  self._interval = null

  try {
    if (typeof WebSocket === 'undefined') {
      // `ws` package accepts options
      self._ws = new _WebSocket(self.url, opts)
    } else {
      self._ws = new _WebSocket(self.url)
    }
  } catch (err) {
    process.nextTick(function () {
      self._onError(err)
    })
    return
  }
  self._ws.binaryType = 'arraybuffer'
  self._ws.onopen = function () {
    self._onOpen()
  }
  self._ws.onmessage = function (event) {
    self._onMessage(event)
  }
  self._ws.onclose = function () {
    self._onClose()
  }
  self._ws.onerror = function () {
    self._onError(new Error('connection error to ' + self.url))
  }

  self.on('finish', function () {
    if (self.connected) {
      // When stream is finished writing, close socket connection. Half open connections
      // are currently not supported.
      // Wait a bit before destroying so the socket flushes.
      // TODO: is there a more reliable way to accomplish this?
      setTimeout(function () {
        self._destroy()
      }, 100)
    } else {
      // If socket is not connected when stream is finished writing, wait until data is
      // flushed to network at "connect" event.
      // TODO: is there a more reliable way to accomplish this?
      self.once('connect', function () {
        setTimeout(function () {
          self._destroy()
        }, 100)
      })
    }
  })
}

Socket.WEBSOCKET_SUPPORT = !!_WebSocket

/**
 * Send text/binary data to the WebSocket server.
 * @param {TypedArrayView|ArrayBuffer|Buffer|string|Blob|Object} chunk
 */
Socket.prototype.send = function (chunk) {
  var self = this

  var len = chunk.length || chunk.byteLength || chunk.size
  self._ws.send(chunk)
  debug('write: %d bytes', len)
}

Socket.prototype.destroy = function (onclose) {
  var self = this
  self._destroy(null, onclose)
}

Socket.prototype._destroy = function (err, onclose) {
  var self = this
  if (self.destroyed) return
  if (onclose) self.once('close', onclose)

  debug('destroy (error: %s)', err && err.message)

  this.readable = this.writable = false

  if (!self._readableState.ended) self.push(null)
  if (!self._writableState.finished) self.end()

  self.connected = false
  self.destroyed = true

  clearInterval(self._interval)
  self._interval = null
  self._chunk = null
  self._cb = null

  if (self._ws) {
    var ws = self._ws
    var onClose = function () {
      ws.onclose = null
      self.emit('close')
    }
    if (ws.readyState === _WebSocket.CLOSED) {
      onClose()
    } else {
      try {
        ws.onclose = onClose
        ws.close()
      } catch (err) {
        onClose()
      }
    }

    ws.onopen = null
    ws.onmessage = null
    ws.onerror = null
  }
  self._ws = null

  if (err) self.emit('error', err)
}

Socket.prototype._read = function () {}

Socket.prototype._write = function (chunk, encoding, cb) {
  var self = this
  if (self.destroyed) return cb(new Error('cannot write after socket is destroyed'))

  if (self.connected) {
    try {
      self.send(chunk)
    } catch (err) {
      return self._onError(err)
    }
    if (typeof ws !== 'function' && self._ws.bufferedAmount > self._maxBufferedAmount) {
      debug('start backpressure: bufferedAmount %d', self._ws.bufferedAmount)
      self._cb = cb
    } else {
      cb(null)
    }
  } else {
    debug('write before connect')
    self._chunk = chunk
    self._cb = cb
  }
}

Socket.prototype._onMessage = function (event) {
  var self = this
  if (self.destroyed) return
  var data = event.data
  debug('read: %d bytes', data.byteLength || data.length)

  if (data instanceof ArrayBuffer) data = new Buffer(data)
  self.push(data)
}

Socket.prototype._onOpen = function () {
  var self = this
  if (self.connected || self.destroyed) return
  self.connected = true

  if (self._chunk) {
    try {
      self.send(self._chunk)
    } catch (err) {
      return self._onError(err)
    }
    self._chunk = null
    debug('sent chunk from "write before connect"')

    var cb = self._cb
    self._cb = null
    cb(null)
  }

  // No backpressure in node. The `ws` module has a buggy `bufferedAmount` property.
  // See: https://github.com/websockets/ws/issues/492
  if (typeof ws !== 'function') {
    self._interval = setInterval(function () {
      if (!self._cb || !self._ws || self._ws.bufferedAmount > self._maxBufferedAmount) {
        return
      }
      debug('ending backpressure: bufferedAmount %d', self._ws.bufferedAmount)
      var cb = self._cb
      self._cb = null
      cb(null)
    }, 150)
    if (self._interval.unref) self._interval.unref()
  }

  debug('connect')
  self.emit('connect')
}

Socket.prototype._onClose = function () {
  var self = this
  if (self.destroyed) return
  debug('on close')
  self._destroy()
}

Socket.prototype._onError = function (err) {
  var self = this
  if (self.destroyed) return
  debug('error: %s', err.message || err)
  self._destroy(err)
}

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":22,"buffer":24,"debug":32,"inherits":56,"readable-stream":97,"ws":19}],110:[function(require,module,exports){
var tick = 1
var maxTick = 65535
var resolution = 4
var inc = function () {
  tick = (tick + 1) & maxTick
}

var timer = setInterval(inc, (1000 / resolution) | 0)
if (timer.unref) timer.unref()

module.exports = function (seconds) {
  var size = resolution * (seconds || 5)
  var buffer = [0]
  var pointer = 1
  var last = (tick - 1) & maxTick

  return function (delta) {
    var dist = (tick - last) & maxTick
    if (dist > size) dist = size
    last = tick

    while (dist--) {
      if (pointer === size) pointer = 0
      buffer[pointer] = buffer[pointer === 0 ? size - 1 : pointer - 1]
      pointer++
    }

    if (delta) buffer[pointer - 1] += delta

    var top = buffer[pointer - 1]
    var btm = buffer.length < size ? 0 : buffer[pointer === size ? 0 : pointer]

    return buffer.length < resolution ? top : (top - btm) * resolution / buffer.length
  }
}

},{}],111:[function(require,module,exports){
(function (global){
var ClientRequest = require('./lib/request')
var extend = require('xtend')
var statusCodes = require('builtin-status-codes')
var url = require('url')

var http = exports

http.request = function (opts, cb) {
	if (typeof opts === 'string')
		opts = url.parse(opts)
	else
		opts = extend(opts)

	// Normally, the page is loaded from http or https, so not specifying a protocol
	// will result in a (valid) protocol-relative url. However, this won't work if
	// the protocol is something else, like 'file:'
	var defaultProtocol = global.location.protocol.search(/^https?:$/) === -1 ? 'http:' : ''

	var protocol = opts.protocol || defaultProtocol
	var host = opts.hostname || opts.host
	var port = opts.port
	var path = opts.path || '/'

	// Necessary for IPv6 addresses
	if (host && host.indexOf(':') !== -1)
		host = '[' + host + ']'

	// This may be a relative url. The browser should always be able to interpret it correctly.
	opts.url = (host ? (protocol + '//' + host) : '') + (port ? ':' + port : '') + path
	opts.method = (opts.method || 'GET').toUpperCase()
	opts.headers = opts.headers || {}

	// Also valid opts.auth, opts.mode

	var req = new ClientRequest(opts)
	if (cb)
		req.on('response', cb)
	return req
}

http.get = function get (opts, cb) {
	var req = http.request(opts, cb)
	req.end()
	return req
}

http.Agent = function () {}
http.Agent.defaultMaxSockets = 4

http.STATUS_CODES = statusCodes

http.METHODS = [
	'CHECKOUT',
	'CONNECT',
	'COPY',
	'DELETE',
	'GET',
	'HEAD',
	'LOCK',
	'M-SEARCH',
	'MERGE',
	'MKACTIVITY',
	'MKCOL',
	'MOVE',
	'NOTIFY',
	'OPTIONS',
	'PATCH',
	'POST',
	'PROPFIND',
	'PROPPATCH',
	'PURGE',
	'PUT',
	'REPORT',
	'SEARCH',
	'SUBSCRIBE',
	'TRACE',
	'UNLOCK',
	'UNSUBSCRIBE'
]
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./lib/request":113,"builtin-status-codes":25,"url":129,"xtend":144}],112:[function(require,module,exports){
(function (global){
exports.fetch = isFunction(global.fetch) && isFunction(global.ReadableStream)

exports.blobConstructor = false
try {
	new Blob([new ArrayBuffer(1)])
	exports.blobConstructor = true
} catch (e) {}

var xhr = new global.XMLHttpRequest()
// If XDomainRequest is available (ie only, where xhr might not work
// cross domain), use the page location. Otherwise use example.com
xhr.open('GET', global.XDomainRequest ? '/' : 'https://example.com')

function checkTypeSupport (type) {
	try {
		xhr.responseType = type
		return xhr.responseType === type
	} catch (e) {}
	return false
}

// For some strange reason, Safari 7.0 reports typeof global.ArrayBuffer === 'object'.
// Safari 7.1 appears to have fixed this bug.
var haveArrayBuffer = typeof global.ArrayBuffer !== 'undefined'
var haveSlice = haveArrayBuffer && isFunction(global.ArrayBuffer.prototype.slice)

exports.arraybuffer = haveArrayBuffer && checkTypeSupport('arraybuffer')
// These next two tests unavoidably show warnings in Chrome. Since fetch will always
// be used if it's available, just return false for these to avoid the warnings.
exports.msstream = !exports.fetch && haveSlice && checkTypeSupport('ms-stream')
exports.mozchunkedarraybuffer = !exports.fetch && haveArrayBuffer &&
	checkTypeSupport('moz-chunked-arraybuffer')
exports.overrideMimeType = isFunction(xhr.overrideMimeType)
exports.vbArray = isFunction(global.VBArray)

function isFunction (value) {
  return typeof value === 'function'
}

xhr = null // Help gc

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],113:[function(require,module,exports){
(function (process,global,Buffer){
var capability = require('./capability')
var inherits = require('inherits')
var response = require('./response')
var stream = require('readable-stream')
var toArrayBuffer = require('to-arraybuffer')

var IncomingMessage = response.IncomingMessage
var rStates = response.readyStates

function decideMode (preferBinary, useFetch) {
	if (capability.fetch && useFetch) {
		return 'fetch'
	} else if (capability.mozchunkedarraybuffer) {
		return 'moz-chunked-arraybuffer'
	} else if (capability.msstream) {
		return 'ms-stream'
	} else if (capability.arraybuffer && preferBinary) {
		return 'arraybuffer'
	} else if (capability.vbArray && preferBinary) {
		return 'text:vbarray'
	} else {
		return 'text'
	}
}

var ClientRequest = module.exports = function (opts) {
	var self = this
	stream.Writable.call(self)

	self._opts = opts
	self._body = []
	self._headers = {}
	if (opts.auth)
		self.setHeader('Authorization', 'Basic ' + new Buffer(opts.auth).toString('base64'))
	Object.keys(opts.headers).forEach(function (name) {
		self.setHeader(name, opts.headers[name])
	})

	var preferBinary
	var useFetch = true
	if (opts.mode === 'disable-fetch') {
		// If the use of XHR should be preferred and includes preserving the 'content-type' header
		useFetch = false
		preferBinary = true
	} else if (opts.mode === 'prefer-streaming') {
		// If streaming is a high priority but binary compatibility and
		// the accuracy of the 'content-type' header aren't
		preferBinary = false
	} else if (opts.mode === 'allow-wrong-content-type') {
		// If streaming is more important than preserving the 'content-type' header
		preferBinary = !capability.overrideMimeType
	} else if (!opts.mode || opts.mode === 'default' || opts.mode === 'prefer-fast') {
		// Use binary if text streaming may corrupt data or the content-type header, or for speed
		preferBinary = true
	} else {
		throw new Error('Invalid value for opts.mode')
	}
	self._mode = decideMode(preferBinary, useFetch)

	self.on('finish', function () {
		self._onFinish()
	})
}

inherits(ClientRequest, stream.Writable)

ClientRequest.prototype.setHeader = function (name, value) {
	var self = this
	var lowerName = name.toLowerCase()
	// This check is not necessary, but it prevents warnings from browsers about setting unsafe
	// headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
	// http-browserify did it, so I will too.
	if (unsafeHeaders.indexOf(lowerName) !== -1)
		return

	self._headers[lowerName] = {
		name: name,
		value: value
	}
}

ClientRequest.prototype.getHeader = function (name) {
	var self = this
	return self._headers[name.toLowerCase()].value
}

ClientRequest.prototype.removeHeader = function (name) {
	var self = this
	delete self._headers[name.toLowerCase()]
}

ClientRequest.prototype._onFinish = function () {
	var self = this

	if (self._destroyed)
		return
	var opts = self._opts

	var headersObj = self._headers
	var body
	if (opts.method === 'POST' || opts.method === 'PUT' || opts.method === 'PATCH' || opts.method === 'MERGE') {
		if (capability.blobConstructor) {
			body = new global.Blob(self._body.map(function (buffer) {
				return toArrayBuffer(buffer)
			}), {
				type: (headersObj['content-type'] || {}).value || ''
			})
		} else {
			// get utf8 string
			body = Buffer.concat(self._body).toString()
		}
	}

	if (self._mode === 'fetch') {
		var headers = Object.keys(headersObj).map(function (name) {
			return [headersObj[name].name, headersObj[name].value]
		})

		global.fetch(self._opts.url, {
			method: self._opts.method,
			headers: headers,
			body: body,
			mode: 'cors',
			credentials: opts.withCredentials ? 'include' : 'same-origin'
		}).then(function (response) {
			self._fetchResponse = response
			self._connect()
		}, function (reason) {
			self.emit('error', reason)
		})
	} else {
		var xhr = self._xhr = new global.XMLHttpRequest()
		try {
			xhr.open(self._opts.method, self._opts.url, true)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}

		// Can't set responseType on really old browsers
		if ('responseType' in xhr)
			xhr.responseType = self._mode.split(':')[0]

		if ('withCredentials' in xhr)
			xhr.withCredentials = !!opts.withCredentials

		if (self._mode === 'text' && 'overrideMimeType' in xhr)
			xhr.overrideMimeType('text/plain; charset=x-user-defined')

		Object.keys(headersObj).forEach(function (name) {
			xhr.setRequestHeader(headersObj[name].name, headersObj[name].value)
		})

		self._response = null
		xhr.onreadystatechange = function () {
			switch (xhr.readyState) {
				case rStates.LOADING:
				case rStates.DONE:
					self._onXHRProgress()
					break
			}
		}
		// Necessary for streaming in Firefox, since xhr.response is ONLY defined
		// in onprogress, not in onreadystatechange with xhr.readyState = 3
		if (self._mode === 'moz-chunked-arraybuffer') {
			xhr.onprogress = function () {
				self._onXHRProgress()
			}
		}

		xhr.onerror = function () {
			if (self._destroyed)
				return
			self.emit('error', new Error('XHR error'))
		}

		try {
			xhr.send(body)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}
	}
}

/**
 * Checks if xhr.status is readable and non-zero, indicating no error.
 * Even though the spec says it should be available in readyState 3,
 * accessing it throws an exception in IE8
 */
function statusValid (xhr) {
	try {
		var status = xhr.status
		return (status !== null && status !== 0)
	} catch (e) {
		return false
	}
}

ClientRequest.prototype._onXHRProgress = function () {
	var self = this

	if (!statusValid(self._xhr) || self._destroyed)
		return

	if (!self._response)
		self._connect()

	self._response._onXHRProgress()
}

ClientRequest.prototype._connect = function () {
	var self = this

	if (self._destroyed)
		return

	self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode)
	self.emit('response', self._response)
}

ClientRequest.prototype._write = function (chunk, encoding, cb) {
	var self = this

	self._body.push(chunk)
	cb()
}

ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function () {
	var self = this
	self._destroyed = true
	if (self._response)
		self._response._destroyed = true
	if (self._xhr)
		self._xhr.abort()
	// Currently, there isn't a way to truly abort a fetch.
	// If you like bikeshedding, see https://github.com/whatwg/fetch/issues/27
}

ClientRequest.prototype.end = function (data, encoding, cb) {
	var self = this
	if (typeof data === 'function') {
		cb = data
		data = undefined
	}

	stream.Writable.prototype.end.call(self, data, encoding, cb)
}

ClientRequest.prototype.flushHeaders = function () {}
ClientRequest.prototype.setTimeout = function () {}
ClientRequest.prototype.setNoDelay = function () {}
ClientRequest.prototype.setSocketKeepAlive = function () {}

// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
var unsafeHeaders = [
	'accept-charset',
	'accept-encoding',
	'access-control-request-headers',
	'access-control-request-method',
	'connection',
	'content-length',
	'cookie',
	'cookie2',
	'date',
	'dnt',
	'expect',
	'host',
	'keep-alive',
	'origin',
	'referer',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'user-agent',
	'via'
]

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./capability":112,"./response":114,"_process":22,"buffer":24,"inherits":56,"readable-stream":97,"to-arraybuffer":122}],114:[function(require,module,exports){
(function (process,global,Buffer){
var capability = require('./capability')
var inherits = require('inherits')
var stream = require('readable-stream')

var rStates = exports.readyStates = {
	UNSENT: 0,
	OPENED: 1,
	HEADERS_RECEIVED: 2,
	LOADING: 3,
	DONE: 4
}

var IncomingMessage = exports.IncomingMessage = function (xhr, response, mode) {
	var self = this
	stream.Readable.call(self)

	self._mode = mode
	self.headers = {}
	self.rawHeaders = []
	self.trailers = {}
	self.rawTrailers = []

	// Fake the 'close' event, but only once 'end' fires
	self.on('end', function () {
		// The nextTick is necessary to prevent the 'request' module from causing an infinite loop
		process.nextTick(function () {
			self.emit('close')
		})
	})

	if (mode === 'fetch') {
		self._fetchResponse = response

		self.url = response.url
		self.statusCode = response.status
		self.statusMessage = response.statusText
		
		response.headers.forEach(function(header, key){
			self.headers[key.toLowerCase()] = header
			self.rawHeaders.push(key, header)
		})


		// TODO: this doesn't respect backpressure. Once WritableStream is available, this can be fixed
		var reader = response.body.getReader()
		function read () {
			reader.read().then(function (result) {
				if (self._destroyed)
					return
				if (result.done) {
					self.push(null)
					return
				}
				self.push(new Buffer(result.value))
				read()
			})
		}
		read()

	} else {
		self._xhr = xhr
		self._pos = 0

		self.url = xhr.responseURL
		self.statusCode = xhr.status
		self.statusMessage = xhr.statusText
		var headers = xhr.getAllResponseHeaders().split(/\r?\n/)
		headers.forEach(function (header) {
			var matches = header.match(/^([^:]+):\s*(.*)/)
			if (matches) {
				var key = matches[1].toLowerCase()
				if (key === 'set-cookie') {
					if (self.headers[key] === undefined) {
						self.headers[key] = []
					}
					self.headers[key].push(matches[2])
				} else if (self.headers[key] !== undefined) {
					self.headers[key] += ', ' + matches[2]
				} else {
					self.headers[key] = matches[2]
				}
				self.rawHeaders.push(matches[1], matches[2])
			}
		})

		self._charset = 'x-user-defined'
		if (!capability.overrideMimeType) {
			var mimeType = self.rawHeaders['mime-type']
			if (mimeType) {
				var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/)
				if (charsetMatch) {
					self._charset = charsetMatch[1].toLowerCase()
				}
			}
			if (!self._charset)
				self._charset = 'utf-8' // best guess
		}
	}
}

inherits(IncomingMessage, stream.Readable)

IncomingMessage.prototype._read = function () {}

IncomingMessage.prototype._onXHRProgress = function () {
	var self = this

	var xhr = self._xhr

	var response = null
	switch (self._mode) {
		case 'text:vbarray': // For IE9
			if (xhr.readyState !== rStates.DONE)
				break
			try {
				// This fails in IE8
				response = new global.VBArray(xhr.responseBody).toArray()
			} catch (e) {}
			if (response !== null) {
				self.push(new Buffer(response))
				break
			}
			// Falls through in IE8	
		case 'text':
			try { // This will fail when readyState = 3 in IE9. Switch mode and wait for readyState = 4
				response = xhr.responseText
			} catch (e) {
				self._mode = 'text:vbarray'
				break
			}
			if (response.length > self._pos) {
				var newData = response.substr(self._pos)
				if (self._charset === 'x-user-defined') {
					var buffer = new Buffer(newData.length)
					for (var i = 0; i < newData.length; i++)
						buffer[i] = newData.charCodeAt(i) & 0xff

					self.push(buffer)
				} else {
					self.push(newData, self._charset)
				}
				self._pos = response.length
			}
			break
		case 'arraybuffer':
			if (xhr.readyState !== rStates.DONE || !xhr.response)
				break
			response = xhr.response
			self.push(new Buffer(new Uint8Array(response)))
			break
		case 'moz-chunked-arraybuffer': // take whole
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING || !response)
				break
			self.push(new Buffer(new Uint8Array(response)))
			break
		case 'ms-stream':
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING)
				break
			var reader = new global.MSStreamReader()
			reader.onprogress = function () {
				if (reader.result.byteLength > self._pos) {
					self.push(new Buffer(new Uint8Array(reader.result.slice(self._pos))))
					self._pos = reader.result.byteLength
				}
			}
			reader.onload = function () {
				self.push(null)
			}
			// reader.onerror = ??? // TODO: this
			reader.readAsArrayBuffer(response)
			break
	}

	// The ms-stream case handles end separately in reader.onload()
	if (self._xhr.readyState === rStates.DONE && self._mode !== 'ms-stream') {
		self.push(null)
	}
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./capability":112,"_process":22,"buffer":24,"inherits":56,"readable-stream":97}],115:[function(require,module,exports){
/* global URL */

var getBlob = require('stream-to-blob')

module.exports = function getBlobURL (stream, mimeType, cb) {
  if (typeof mimeType === 'function') return getBlobURL(stream, null, mimeType)
  getBlob(stream, mimeType, function (err, blob) {
    if (err) return cb(err)
    var url = URL.createObjectURL(blob)
    cb(null, url)
  })
}

},{"stream-to-blob":116}],116:[function(require,module,exports){
/* global Blob */

var once = require('once')

module.exports = function getBlob (stream, mimeType, cb) {
  if (typeof mimeType === 'function') return getBlob(stream, null, mimeType)
  cb = once(cb)
  var chunks = []
  stream
    .on('data', function (chunk) {
      chunks.push(chunk)
    })
    .on('end', function () {
      var blob = mimeType
        ? new Blob(chunks, { type: mimeType })
        : new Blob(chunks)
      cb(null, blob)
    })
    .on('error', cb)
}

},{"once":77}],117:[function(require,module,exports){
(function (Buffer){
var once = require('once')

module.exports = function getBuffer (stream, length, cb) {
  cb = once(cb)
  var buf = new Buffer(length)
  var offset = 0
  stream
    .on('data', function (chunk) {
      chunk.copy(buf, offset)
      offset += chunk.length
    })
    .on('end', function () { cb(null, buf) })
    .on('error', cb)
}

}).call(this,require("buffer").Buffer)
},{"buffer":24,"once":77}],118:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":24}],119:[function(require,module,exports){
/*                                                                              
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in      
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
THE SOFTWARE.
*/

var base32 = require('./thirty-two');

exports.encode = base32.encode;
exports.decode = base32.decode;

},{"./thirty-two":120}],120:[function(require,module,exports){
(function (Buffer){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
'use strict';

var charTable = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
var byteTable = [
    0xff, 0xff, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
    0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e,
    0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16,
    0x17, 0x18, 0x19, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
    0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e,
    0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16,
    0x17, 0x18, 0x19, 0xff, 0xff, 0xff, 0xff, 0xff
];

function quintetCount(buff) {
    var quintets = Math.floor(buff.length / 5);
    return buff.length % 5 === 0 ? quintets: quintets + 1;
}

exports.encode = function(plain) {
    if(!Buffer.isBuffer(plain)){
    	plain = new Buffer(plain);
    }
    var i = 0;
    var j = 0;
    var shiftIndex = 0;
    var digit = 0;
    var encoded = new Buffer(quintetCount(plain) * 8);

    /* byte by byte isn't as pretty as quintet by quintet but tests a bit
        faster. will have to revisit. */
    while(i < plain.length) {
        var current = plain[i];

        if(shiftIndex > 3) {
            digit = current & (0xff >> shiftIndex);
            shiftIndex = (shiftIndex + 5) % 8;
            digit = (digit << shiftIndex) | ((i + 1 < plain.length) ?
                plain[i + 1] : 0) >> (8 - shiftIndex);
            i++;
        } else {
            digit = (current >> (8 - (shiftIndex + 5))) & 0x1f;
            shiftIndex = (shiftIndex + 5) % 8;
            if(shiftIndex === 0) i++;
        }

        encoded[j] = charTable.charCodeAt(digit);
        j++;
    }

    for(i = j; i < encoded.length; i++) {
        encoded[i] = 0x3d; //'='.charCodeAt(0)
    }

    return encoded;
};

exports.decode = function(encoded) {
    var shiftIndex = 0;
    var plainDigit = 0;
    var plainChar;
    var plainPos = 0;
    if(!Buffer.isBuffer(encoded)){
    	encoded = new Buffer(encoded);
    }
    var decoded = new Buffer(Math.ceil(encoded.length * 5 / 8));

    /* byte by byte isn't as pretty as octet by octet but tests a bit
        faster. will have to revisit. */
    for(var i = 0; i < encoded.length; i++) {
    	if(encoded[i] === 0x3d){ //'='
    		break;
    	}

        var encodedByte = encoded[i] - 0x30;

        if(encodedByte < byteTable.length) {
            plainDigit = byteTable[encodedByte];

            if(shiftIndex <= 3) {
                shiftIndex = (shiftIndex + 5) % 8;

                if(shiftIndex === 0) {
                    plainChar |= plainDigit;
                    decoded[plainPos] = plainChar;
                    plainPos++;
                    plainChar = 0;
                } else {
                    plainChar |= 0xff & (plainDigit << (8 - shiftIndex));
                }
            } else {
                shiftIndex = (shiftIndex + 5) % 8;
                plainChar |= 0xff & (plainDigit >>> shiftIndex);
                decoded[plainPos] = plainChar;
                plainPos++;

                plainChar = 0xff & (plainDigit << (8 - shiftIndex));
            }
        } else {
        	throw new Error('Invalid input - it is not base32 encoded string');
        }
    }

    return decoded.slice(0, plainPos);
};

}).call(this,require("buffer").Buffer)
},{"buffer":24}],121:[function(require,module,exports){
function E () {
  // Keep this empty so it's easier to inherit from
  // (via https://github.com/lipsmack from https://github.com/scottcorgan/tiny-emitter/issues/3)
}

E.prototype = {
  on: function (name, callback, ctx) {
    var e = this.e || (this.e = {});

    (e[name] || (e[name] = [])).push({
      fn: callback,
      ctx: ctx
    });

    return this;
  },

  once: function (name, callback, ctx) {
    var self = this;
    function listener () {
      self.off(name, listener);
      callback.apply(ctx, arguments);
    };

    listener._ = callback
    return this.on(name, listener, ctx);
  },

  emit: function (name) {
    var data = [].slice.call(arguments, 1);
    var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
    var i = 0;
    var len = evtArr.length;

    for (i; i < len; i++) {
      evtArr[i].fn.apply(evtArr[i].ctx, data);
    }

    return this;
  },

  off: function (name, callback) {
    var e = this.e || (this.e = {});
    var evts = e[name];
    var liveEvents = [];

    if (evts && callback) {
      for (var i = 0, len = evts.length; i < len; i++) {
        if (evts[i].fn !== callback && evts[i].fn._ !== callback)
          liveEvents.push(evts[i]);
      }
    }

    // Remove event from queue to prevent memory leak
    // Suggested by https://github.com/lazd
    // Ref: https://github.com/scottcorgan/tiny-emitter/commit/c6ebfaa9bc973b33d110a84a307742b7cf94c953#commitcomment-5024910

    (liveEvents.length)
      ? e[name] = liveEvents
      : delete e[name];

    return this;
  }
};

module.exports = E;

},{}],122:[function(require,module,exports){
var Buffer = require('buffer').Buffer

module.exports = function (buf) {
	// If the buffer is backed by a Uint8Array, a faster version will work
	if (buf instanceof Uint8Array) {
		// If the buffer isn't a subarray, return the underlying ArrayBuffer
		if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) {
			return buf.buffer
		} else if (typeof buf.buffer.slice === 'function') {
			// Otherwise we need to get a proper copy
			return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
		}
	}

	if (Buffer.isBuffer(buf)) {
		// This is the slow version that will work with any Buffer
		// implementation (even in old browsers)
		var arrayCopy = new Uint8Array(buf.length)
		var len = buf.length
		for (var i = 0; i < len; i++) {
			arrayCopy[i] = buf[i]
		}
		return arrayCopy.buffer
	} else {
		throw new Error('Argument must be a Buffer')
	}
}

},{"buffer":24}],123:[function(require,module,exports){
(function (process){
module.exports = Discovery

var debug = require('debug')('torrent-discovery')
var DHT = require('bittorrent-dht/client') // empty object in browser
var EventEmitter = require('events').EventEmitter
var extend = require('xtend')
var inherits = require('inherits')
var parallel = require('run-parallel')
var Tracker = require('bittorrent-tracker/client')

inherits(Discovery, EventEmitter)

function Discovery (opts) {
  var self = this
  if (!(self instanceof Discovery)) return new Discovery(opts)
  EventEmitter.call(self)

  if (!opts.peerId) throw new Error('Option `peerId` is required')
  if (!opts.infoHash) throw new Error('Option `infoHash` is required')
  if (!process.browser && !opts.port) throw new Error('Option `port` is required')

  self.peerId = typeof opts.peerId === 'string'
    ? opts.peerId
    : opts.peerId.toString('hex')
  self.infoHash = typeof opts.infoHash === 'string'
    ? opts.infoHash
    : opts.infoHash.toString('hex')
  self._port = opts.port // torrent port

  self.destroyed = false

  self._announce = opts.announce || []
  self._intervalMs = opts.intervalMs || (15 * 60 * 1000)
  self._trackerOpts = null
  self._dhtAnnouncing = false
  self._dhtTimeout = false
  self._internalDHT = false // is the DHT created internally?

  self._onWarning = function (err) {
    self.emit('warning', err)
  }
  self._onError = function (err) {
    self.emit('error', err)
  }
  self._onDHTPeer = function (peer, infoHash) {
    if (infoHash.toString('hex') !== self.infoHash) return
    self.emit('peer', peer.host + ':' + peer.port)
  }
  self._onTrackerPeer = function (peer) {
    self.emit('peer', peer)
  }
  self._onTrackerAnnounce = function () {
    self.emit('trackerAnnounce')
  }

  if (opts.tracker === false) {
    self.tracker = null
  } else if (opts.tracker && typeof opts.tracker === 'object') {
    self._trackerOpts = extend(opts.tracker)
    self.tracker = self._createTracker()
  } else {
    self.tracker = self._createTracker()
  }

  if (opts.dht === false || typeof DHT !== 'function') {
    self.dht = null
  } else if (opts.dht && typeof opts.dht.addNode === 'function') {
    self.dht = opts.dht
  } else if (opts.dht && typeof opts.dht === 'object') {
    self.dht = createDHT(opts.dhtPort, opts.dht)
  } else {
    self.dht = createDHT(opts.dhtPort)
  }

  if (self.dht) {
    self.dht.on('peer', self._onDHTPeer)
    self._dhtAnnounce()
  }

  function createDHT (port, opts) {
    var dht = new DHT(opts)
    dht.on('warning', self._onWarning)
    dht.on('error', self._onError)
    dht.listen(port)
    self._internalDHT = true
    return dht
  }
}

Discovery.prototype.updatePort = function (port) {
  var self = this
  if (port === self._port) return
  self._port = port

  if (self.dht) self._dhtAnnounce()

  if (self.tracker) {
    self.tracker.stop()
    self.tracker.destroy(function () {
      self.tracker = self._createTracker()
    })
  }
}

Discovery.prototype.complete = function (opts) {
  if (this.tracker) {
    this.tracker.complete(opts)
  }
}

Discovery.prototype.destroy = function (cb) {
  var self = this
  if (self.destroyed) return
  self.destroyed = true

  clearTimeout(self._dhtTimeout)

  var tasks = []

  if (self.tracker) {
    self.tracker.stop()
    self.tracker.removeListener('warning', self._onWarning)
    self.tracker.removeListener('error', self._onError)
    self.tracker.removeListener('peer', self._onTrackerPeer)
    self.tracker.removeListener('update', self._onTrackerAnnounce)
    tasks.push(function (cb) {
      self.tracker.destroy(cb)
    })
  }

  if (self.dht) {
    self.dht.removeListener('peer', self._onDHTPeer)
  }

  if (self._internalDHT) {
    self.dht.removeListener('warning', self._onWarning)
    self.dht.removeListener('error', self._onError)
    tasks.push(function (cb) {
      self.dht.destroy(cb)
    })
  }

  parallel(tasks, cb)

  // cleanup
  self.dht = null
  self.tracker = null
  self._announce = null
}

Discovery.prototype._createTracker = function () {
  var opts = extend(this._trackerOpts, {
    infoHash: this.infoHash,
    announce: this._announce,
    peerId: this.peerId,
    port: this._port
  })

  var tracker = new Tracker(opts)
  tracker.on('warning', this._onWarning)
  tracker.on('error', this._onError)
  tracker.on('peer', this._onTrackerPeer)
  tracker.on('update', this._onTrackerAnnounce)
  tracker.setInterval(this._intervalMs)
  tracker.start()
  return tracker
}

Discovery.prototype._dhtAnnounce = function () {
  var self = this
  if (self._dhtAnnouncing) return
  debug('dht announce')

  self._dhtAnnouncing = true
  clearTimeout(self._dhtTimeout)

  self.dht.announce(self.infoHash, self._port, function (err) {
    self._dhtAnnouncing = false
    debug('dht announce complete')

    if (err) self.emit('warning', err)
    self.emit('dhtAnnounce')

    if (!self.destroyed) {
      self._dhtTimeout = setTimeout(function () {
        self._dhtAnnounce()
      }, getRandomTimeout())
      if (self._dhtTimeout.unref) self._dhtTimeout.unref()
    }
  })

  // Returns timeout interval, with some random jitter
  function getRandomTimeout () {
    return self._intervalMs + Math.floor(Math.random() * self._intervalMs / 5)
  }
}

}).call(this,require('_process'))
},{"_process":22,"bittorrent-dht/client":19,"bittorrent-tracker/client":13,"debug":32,"events":42,"inherits":56,"run-parallel":101,"xtend":144}],124:[function(require,module,exports){
(function (Buffer){
module.exports = Piece

var BLOCK_LENGTH = 1 << 14

function Piece (length) {
  if (!(this instanceof Piece)) return new Piece(length)

  this.length = length
  this.missing = length
  this.sources = null

  this._chunks = Math.ceil(length / BLOCK_LENGTH)
  this._remainder = (length % BLOCK_LENGTH) || BLOCK_LENGTH
  this._buffered = 0
  this._buffer = null
  this._cancellations = null
  this._reservations = 0
  this._flushed = false
}

Piece.BLOCK_LENGTH = BLOCK_LENGTH

Piece.prototype.chunkLength = function (i) {
  return i === this._chunks - 1 ? this._remainder : BLOCK_LENGTH
}

Piece.prototype.chunkLengthRemaining = function (i) {
  return this.length - (i * BLOCK_LENGTH)
}

Piece.prototype.chunkOffset = function (i) {
  return i * BLOCK_LENGTH
}

Piece.prototype.reserve = function () {
  if (!this.init()) return -1
  if (this._cancellations.length) return this._cancellations.pop()
  if (this._reservations < this._chunks) return this._reservations++
  return -1
}

Piece.prototype.reserveRemaining = function () {
  if (!this.init()) return -1
  if (this._reservations < this._chunks) {
    var min = this._reservations
    this._reservations = this._chunks
    return min
  }
  return -1
}

Piece.prototype.cancel = function (i) {
  if (!this.init()) return
  this._cancellations.push(i)
}

Piece.prototype.cancelRemaining = function (i) {
  if (!this.init()) return
  this._reservations = i
}

Piece.prototype.get = function (i) {
  if (!this.init()) return null
  return this._buffer[i]
}

Piece.prototype.set = function (i, data, source) {
  if (!this.init()) return false
  var len = data.length
  var blocks = Math.ceil(len / BLOCK_LENGTH)
  for (var j = 0; j < blocks; j++) {
    if (!this._buffer[i + j]) {
      var offset = j * BLOCK_LENGTH
      var splitData = data.slice(offset, offset + BLOCK_LENGTH)
      this._buffered++
      this._buffer[i + j] = splitData
      this.missing -= splitData.length
      if (this.sources.indexOf(source) === -1) {
        this.sources.push(source)
      }
    }
  }
  return this._buffered === this._chunks
}

Piece.prototype.flush = function () {
  if (!this._buffer || this._chunks !== this._buffered) return null
  var buffer = Buffer.concat(this._buffer, this.length)
  this._buffer = null
  this._cancellations = null
  this.sources = null
  this._flushed = true
  return buffer
}

Piece.prototype.init = function () {
  if (this._flushed) return false
  if (this._buffer) return true
  this._buffer = new Array(this._chunks)
  this._cancellations = []
  this.sources = []
  return true
}

}).call(this,require("buffer").Buffer)
},{"buffer":24}],125:[function(require,module,exports){
(function (Buffer){
/**
 * Convert a typed array to a Buffer without a copy
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 * `npm install typedarray-to-buffer`
 */

var isTypedArray = require('is-typedarray').strict

module.exports = function typedarrayToBuffer (arr) {
  if (isTypedArray(arr)) {
    // To avoid a copy, use the typed array's underlying ArrayBuffer to back new Buffer
    var buf = new Buffer(arr.buffer)
    if (arr.byteLength !== arr.buffer.byteLength) {
      // Respect the "view", i.e. byteOffset and byteLength, without doing a copy
      buf = buf.slice(arr.byteOffset, arr.byteOffset + arr.byteLength)
    }
    return buf
  } else {
    // Pass through all other types to the `Buffer` constructor
    return new Buffer(arr)
  }
}

}).call(this,require("buffer").Buffer)
},{"buffer":24,"is-typedarray":60}],126:[function(require,module,exports){
(function (Buffer){
var UINT_32_MAX = 0xffffffff

exports.encodingLength = function () {
  return 8
}

exports.encode = function (num, buf, offset) {
  if (!buf) buf = new Buffer(8)
  if (!offset) offset = 0

  var top = Math.floor(num / UINT_32_MAX)
  var rem = num - top * UINT_32_MAX

  buf.writeUInt32BE(top, offset)
  buf.writeUInt32BE(rem, offset + 4)
  return buf
}

exports.decode = function (buf, offset) {
  if (!offset) offset = 0

  if (!buf) buf = new Buffer(4)
  if (!offset) offset = 0

  var top = buf.readUInt32BE(offset)
  var rem = buf.readUInt32BE(offset + 4)

  return top * UINT_32_MAX + rem
}

exports.encode.bytes = 8
exports.decode.bytes = 8

}).call(this,require("buffer").Buffer)
},{"buffer":24}],127:[function(require,module,exports){
"use strict"

function unique_pred(list, compare) {
  var ptr = 1
    , len = list.length
    , a=list[0], b=list[0]
  for(var i=1; i<len; ++i) {
    b = a
    a = list[i]
    if(compare(a, b)) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique_eq(list) {
  var ptr = 1
    , len = list.length
    , a=list[0], b = list[0]
  for(var i=1; i<len; ++i, b=a) {
    b = a
    a = list[i]
    if(a !== b) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique(list, compare, sorted) {
  if(list.length === 0) {
    return list
  }
  if(compare) {
    if(!sorted) {
      list.sort(compare)
    }
    return unique_pred(list, compare)
  }
  if(!sorted) {
    list.sort()
  }
  return unique_eq(list)
}

module.exports = unique

},{}],128:[function(require,module,exports){
module.exports = remove

function remove (arr, i) {
  if (i >= arr.length || i < 0) return
  var last = arr.pop()
  if (i < arr.length) {
    var tmp = arr[i]
    arr[i] = last
    return tmp
  }
  return last
}

},{}],129:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":130,"punycode":84,"querystring":87}],130:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}],131:[function(require,module,exports){
var bencode = require('bencode')
var BitField = require('bitfield')
var Buffer = require('safe-buffer').Buffer
var debug = require('debug')('ut_metadata')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var sha1 = require('simple-sha1')

var MAX_METADATA_SIZE = 10000000 // 10MB
var BITFIELD_GROW = 1000
var PIECE_LENGTH = 16 * 1024

module.exports = function (metadata) {
  inherits(utMetadata, EventEmitter)

  function utMetadata (wire) {
    EventEmitter.call(this)

    this._wire = wire

    this._metadataComplete = false
    this._metadataSize = null
    this._remainingRejects = null // how many reject messages to tolerate before quitting
    this._fetching = false

    // The largest .torrent file that I know of is ~1-2MB, which is ~100 pieces.
    // Therefore, cap the bitfield to 10x that (1000 pieces) so a malicious peer can't
    // make it grow to fill all memory.
    this._bitfield = new BitField(0, { grow: BITFIELD_GROW })

    if (Buffer.isBuffer(metadata)) {
      this.setMetadata(metadata)
    }
  }

  // Name of the bittorrent-protocol extension
  utMetadata.prototype.name = 'ut_metadata'

  utMetadata.prototype.onHandshake = function (infoHash, peerId, extensions) {
    this._infoHash = infoHash
  }

  utMetadata.prototype.onExtendedHandshake = function (handshake) {
    if (!handshake.m || !handshake.m.ut_metadata) {
      return this.emit('warning', new Error('Peer does not support ut_metadata'))
    }
    if (!handshake.metadata_size) {
      return this.emit('warning', new Error('Peer does not have metadata'))
    }
    if (typeof handshake.metadata_size !== 'number' ||
        MAX_METADATA_SIZE < handshake.metadata_size ||
        handshake.metadata_size <= 0) {
      return this.emit('warning', new Error('Peer gave invalid metadata size'))
    }

    this._metadataSize = handshake.metadata_size
    this._numPieces = Math.ceil(this._metadataSize / PIECE_LENGTH)
    this._remainingRejects = this._numPieces * 2

    if (this._fetching) {
      this._requestPieces()
    }
  }

  utMetadata.prototype.onMessage = function (buf) {
    var dict, trailer
    try {
      var str = buf.toString()
      var trailerIndex = str.indexOf('ee') + 2
      dict = bencode.decode(str.substring(0, trailerIndex))
      trailer = buf.slice(trailerIndex)
    } catch (err) {
      // drop invalid messages
      return
    }

    switch (dict.msg_type) {
      case 0:
        // ut_metadata request (from peer)
        // example: { 'msg_type': 0, 'piece': 0 }
        this._onRequest(dict.piece)
        break
      case 1:
        // ut_metadata data (in response to our request)
        // example: { 'msg_type': 1, 'piece': 0, 'total_size': 3425 }
        this._onData(dict.piece, trailer, dict.total_size)
        break
      case 2:
        // ut_metadata reject (peer doesn't have piece we requested)
        // { 'msg_type': 2, 'piece': 0 }
        this._onReject(dict.piece)
        break
    }
  }

  /**
   * Ask the peer to send metadata.
   * @public
   */
  utMetadata.prototype.fetch = function () {
    if (this._metadataComplete) {
      return
    }
    this._fetching = true
    if (this._metadataSize) {
      this._requestPieces()
    }
  }

  /**
   * Stop asking the peer to send metadata.
   * @public
   */
  utMetadata.prototype.cancel = function () {
    this._fetching = false
  }

  utMetadata.prototype.setMetadata = function (metadata) {
    if (this._metadataComplete) return true
    debug('set metadata')

    // if full torrent dictionary was passed in, pull out just `info` key
    try {
      var info = bencode.decode(metadata).info
      if (info) {
        metadata = bencode.encode(info)
      }
    } catch (err) {}

    // check hash
    if (this._infoHash && this._infoHash !== sha1.sync(metadata)) {
      return false
    }

    this.cancel()

    this.metadata = metadata
    this._metadataComplete = true
    this._metadataSize = this.metadata.length
    this._wire.extendedHandshake.metadata_size = this._metadataSize

    this.emit('metadata', bencode.encode({ info: bencode.decode(this.metadata) }))

    return true
  }

  utMetadata.prototype._send = function (dict, trailer) {
    var buf = bencode.encode(dict)
    if (Buffer.isBuffer(trailer)) {
      buf = Buffer.concat([buf, trailer])
    }
    this._wire.extended('ut_metadata', buf)
  }

  utMetadata.prototype._request = function (piece) {
    this._send({ msg_type: 0, piece: piece })
  }

  utMetadata.prototype._data = function (piece, buf, totalSize) {
    var msg = { msg_type: 1, piece: piece }
    if (typeof totalSize === 'number') {
      msg.total_size = totalSize
    }
    this._send(msg, buf)
  }

  utMetadata.prototype._reject = function (piece) {
    this._send({ msg_type: 2, piece: piece })
  }

  utMetadata.prototype._onRequest = function (piece) {
    if (!this._metadataComplete) {
      this._reject(piece)
      return
    }
    var start = piece * PIECE_LENGTH
    var end = start + PIECE_LENGTH
    if (end > this._metadataSize) {
      end = this._metadataSize
    }
    var buf = this.metadata.slice(start, end)
    this._data(piece, buf, this._metadataSize)
  }

  utMetadata.prototype._onData = function (piece, buf, totalSize) {
    if (buf.length > PIECE_LENGTH) {
      return
    }
    buf.copy(this.metadata, piece * PIECE_LENGTH)
    this._bitfield.set(piece)
    this._checkDone()
  }

  utMetadata.prototype._onReject = function (piece) {
    if (this._remainingRejects > 0 && this._fetching) {
      // If we haven't been rejected too much, then try to request the piece again
      this._request(piece)
      this._remainingRejects -= 1
    } else {
      this.emit('warning', new Error('Peer sent "reject" too much'))
    }
  }

  utMetadata.prototype._requestPieces = function () {
    this.metadata = Buffer.alloc(this._metadataSize)
    for (var piece = 0; piece < this._numPieces; piece++) {
      this._request(piece)
    }
  }

  utMetadata.prototype._checkDone = function () {
    var done = true
    for (var piece = 0; piece < this._numPieces; piece++) {
      if (!this._bitfield.get(piece)) {
        done = false
        break
      }
    }
    if (!done) return

    // attempt to set metadata -- may fail sha1 check
    var success = this.setMetadata(this.metadata)

    if (!success) {
      this._failedMetadata()
    }
  }

  utMetadata.prototype._failedMetadata = function () {
    // reset bitfield & try again
    this._bitfield = new BitField(0, { grow: BITFIELD_GROW })
    this._remainingRejects -= this._numPieces
    if (this._remainingRejects > 0) {
      this._requestPieces()
    } else {
      this.emit('warning', new Error('Peer sent invalid metadata'))
    }
  }

  return utMetadata
}

},{"bencode":9,"bitfield":11,"debug":32,"events":42,"inherits":56,"safe-buffer":103,"simple-sha1":108}],132:[function(require,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],133:[function(require,module,exports){
(function (Buffer){
var bs = require('binary-search')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var mp4 = require('mp4-stream')
var Box = require('mp4-box-encoding')
var RangeSliceStream = require('range-slice-stream')

module.exports = MP4Remuxer

function MP4Remuxer (file) {
	var self = this
	EventEmitter.call(self)
	self._tracks = []
	self._fragmentSequence = 1
	self._file = file
	self._decoder = null
	self._findMoov(0)
}

inherits(MP4Remuxer, EventEmitter)

MP4Remuxer.prototype._findMoov = function (offset) {
	var self = this

	if (self._decoder) {
		self._decoder.destroy()
	}

	self._decoder = mp4.decode()
	var fileStream = self._file.createReadStream({
		start: offset
	})
	fileStream.pipe(self._decoder)

	self._decoder.once('box', function (headers) {
		if (headers.type === 'moov') {
			self._decoder.decode(function (moov) {
				fileStream.destroy()
				try {
					self._processMoov(moov)
				} catch (err) {
					err.message = 'Cannot parse mp4 file: ' + err.message
					self.emit('error', err)
				}
			})
		} else {
			fileStream.destroy()
			self._findMoov(offset + headers.length)
		}
	})
}

function RunLengthIndex (entries, countName) {
	var self = this
	self._entries = entries
	self._countName = countName || 'count'
	self._index = 0
	self._offset = 0

	self.value = self._entries[0]
}

RunLengthIndex.prototype.inc = function () {
	var self = this
	self._offset++
	if (self._offset >= self._entries[self._index][self._countName]) {
		self._index++
		self._offset = 0
	}

	self.value = self._entries[self._index]
}

MP4Remuxer.prototype._processMoov = function (moov) {
	var self = this

	var traks = moov.traks
	self._tracks = []
	self._hasVideo = false
	self._hasAudio = false
	for (var i = 0; i < traks.length; i++) {
		var trak = traks[i]
		var stbl = trak.mdia.minf.stbl
		var stsdEntry = stbl.stsd.entries[0]
		var handlerType = trak.mdia.hdlr.handlerType
		var codec
		var mime
		if (handlerType === 'vide' && stsdEntry.type === 'avc1') {
			if (self._hasVideo) {
				continue
			}
			self._hasVideo = true
			codec = 'avc1'
			if (stsdEntry.avcC) {
				codec += '.' + stsdEntry.avcC.mimeCodec
			}
			mime = 'video/mp4; codecs="' + codec + '"'
		} else if (handlerType === 'soun' && stsdEntry.type === 'mp4a') {
			if (self._hasAudio) {
				continue
			}
			self._hasAudio = true
			codec = 'mp4a'
			if (stsdEntry.esds && stsdEntry.esds.mimeCodec) {
				codec += '.' + stsdEntry.esds.mimeCodec
			}
			mime = 'audio/mp4; codecs="' + codec + '"'
		} else {
			continue
		}

		var samples = []
		var sample = 0

		// Chunk/position data
		var sampleInChunk = 0
		var chunk = 0
		var offsetInChunk = 0
		var sampleToChunkIndex = 0

		// Time data
		var dts = 0
		var decodingTimeEntry = new RunLengthIndex(stbl.stts.entries)
		var presentationOffsetEntry = null
		if (stbl.ctts) {
			presentationOffsetEntry = new RunLengthIndex(stbl.ctts.entries)
		}

		// Sync table index
		var syncSampleIndex = 0

		while (true) {
			var currChunkEntry = stbl.stsc.entries[sampleToChunkIndex]

			// Compute size
			var size = stbl.stsz.entries[sample]

			// Compute time data
			var duration = decodingTimeEntry.value.duration
			var presentationOffset = presentationOffsetEntry ? presentationOffsetEntry.value.compositionOffset : 0

			// Compute sync
			var sync = true
			if (stbl.stss) {
				sync = stbl.stss.entries[syncSampleIndex] === sample + 1
			}

			// Create new sample entry
			samples.push({
				size: size,
				duration: duration,
				dts: dts,
				presentationOffset: presentationOffset,
				sync: sync,
				offset: offsetInChunk + stbl.stco.entries[chunk]
			})

			// Go to next sample
			sample++
			if (sample >= stbl.stsz.entries.length) {
				break
			}

			// Move position/chunk
			sampleInChunk++
			offsetInChunk += size
			if (sampleInChunk >= currChunkEntry.samplesPerChunk) {
				// Move to new chunk
				sampleInChunk = 0
				offsetInChunk = 0
				chunk++
				// Move sample to chunk box index
				var nextChunkEntry = stbl.stsc.entries[sampleToChunkIndex + 1]
				if (nextChunkEntry && chunk + 1 >= nextChunkEntry.firstChunk) {
					sampleToChunkIndex++
				}
			}

			// Move time forward
			dts += duration
			decodingTimeEntry.inc()
			presentationOffsetEntry && presentationOffsetEntry.inc()

			// Move sync table index
			if (sync) {
				syncSampleIndex++
			}
		}

		trak.mdia.mdhd.duration = 0
		trak.tkhd.duration = 0

		var defaultSampleDescriptionIndex = currChunkEntry.sampleDescriptionId

		var trackMoov = {
			type: 'moov',
			mvhd: moov.mvhd,
			traks: [{
				tkhd: trak.tkhd,
				mdia: {
					mdhd: trak.mdia.mdhd,
					hdlr: trak.mdia.hdlr,
					elng: trak.mdia.elng,
					minf: {
						vmhd: trak.mdia.minf.vmhd,
						smhd: trak.mdia.minf.smhd,
						dinf: trak.mdia.minf.dinf,
						stbl: {
							stsd: stbl.stsd,
							stts: empty(),
							ctts: empty(),
							stsc: empty(),
							stsz: empty(),
							stco: empty(),
							stss: empty()
						}
					}
				}
			}],
			mvex: {
				mehd: {
					fragmentDuration: moov.mvhd.duration
				},
				trexs: [{
					trackId: trak.tkhd.trackId,
					defaultSampleDescriptionIndex: defaultSampleDescriptionIndex,
					defaultSampleDuration: 0,
					defaultSampleSize: 0,
					defaultSampleFlags: 0
				}]
			}
		}

		self._tracks.push({
			trackId: trak.tkhd.trackId,
			timeScale: trak.mdia.mdhd.timeScale,
			samples: samples,
			currSample: null,
			currTime: null,
			moov: trackMoov,
			mime: mime
		})
	}

	if (self._tracks.length === 0) {
		self.emit('error', new Error('no playable tracks'))
		return
	}

	// Must be set last since this is used above
	moov.mvhd.duration = 0

	self._ftyp = {
		type: 'ftyp',
		brand: 'iso5',
		brandVersion: 0,
		compatibleBrands: [
			'iso5'
		]
	}

	var ftypBuf = Box.encode(self._ftyp)
	var data = self._tracks.map(function (track) {
		var moovBuf = Box.encode(track.moov)
		return {
			mime: track.mime,
			init: Buffer.concat([ftypBuf, moovBuf])
		}
	})

	self.emit('ready', data)
}

function empty () {
	return {
		version: 0,
		flags: 0,
		entries: []
	}
}

MP4Remuxer.prototype.seek = function (time) {
	var self = this
	if (!self._tracks) {
		throw new Error('Not ready yet; wait for \'ready\' event')
	}

	if (self._fileStream) {
		self._fileStream.destroy()
		self._fileStream = null
	}

	var startOffset = -1
	self._tracks.map(function (track, i) {
		// find the keyframe before the time
		// stream from there
		if (track.outStream) {
			track.outStream.destroy()
		}
		if (track.inStream) {
			track.inStream.destroy()
			track.inStream = null
		}
		var outStream = track.outStream = mp4.encode()
		var fragment = self._generateFragment(i, time)
		if (!fragment) {
			return outStream.finalize()
		}

		if (startOffset === -1 || fragment.ranges[0].start < startOffset) {
			startOffset = fragment.ranges[0].start
		}

		writeFragment(fragment)

		function writeFragment (frag) {
			if (outStream.destroyed) return
			outStream.box(frag.moof, function (err) {
				if (err) return self.emit('error', err)
				if (outStream.destroyed) return
				var slicedStream = track.inStream.slice(frag.ranges)
				slicedStream.pipe(outStream.mediaData(frag.length, function (err) {
					if (err) return self.emit('error', err)
					if (outStream.destroyed) return
					var nextFrag = self._generateFragment(i)
					if (!nextFrag) {
						return outStream.finalize()
					}
					writeFragment(nextFrag)
				}))
			})
		}
	})

	if (startOffset >= 0) {
		var fileStream = self._fileStream = self._file.createReadStream({
			start: startOffset
		})

		self._tracks.forEach(function (track) {
			track.inStream = new RangeSliceStream(startOffset)
			fileStream.pipe(track.inStream)
		})
	}

	return self._tracks.map(function (track) {
		return track.outStream
	})
}

MP4Remuxer.prototype._findSampleBefore = function (trackInd, time) {
	var self = this

	var track = self._tracks[trackInd]
	var scaledTime = Math.floor(track.timeScale * time)
	var sample = bs(track.samples, scaledTime, function (sample, t) {
		var pts = sample.dts + sample.presentationOffset// - track.editShift
		return pts - t
	})
	if (sample === -1) {
		sample = 0
	} else if (sample < 0) {
		sample = -sample - 2
	}
	// sample is now the last sample with dts <= time
	// Find the preceeding sync sample
	while (!track.samples[sample].sync) {
		sample--
	}
	return sample
}

var MIN_FRAGMENT_DURATION = 1 // second

MP4Remuxer.prototype._generateFragment = function (track, time) {
	var self = this
	/*
	1. Find correct sample
	2. Process backward until sync sample found
	3. Process forward until next sync sample after MIN_FRAGMENT_DURATION found
	*/
	var currTrack = self._tracks[track]
	var firstSample
	if (time !== undefined) {
		firstSample = self._findSampleBefore(track, time)
	} else {
		firstSample = currTrack.currSample
	}

	if (firstSample >= currTrack.samples.length)
		return null

	var startDts = currTrack.samples[firstSample].dts

	var totalLen = 0
	var ranges = []
	for (var currSample = firstSample; currSample < currTrack.samples.length; currSample++) {
		var sample = currTrack.samples[currSample]
		if (sample.sync && sample.dts - startDts >= currTrack.timeScale * MIN_FRAGMENT_DURATION) {
			break // This is a reasonable place to end the fragment
		}

		totalLen += sample.size
		var currRange = ranges.length - 1
		if (currRange < 0 || ranges[currRange].end !== sample.offset) {
			// Push a new range
			ranges.push({
				start: sample.offset,
				end: sample.offset + sample.size
			})
		} else {
			ranges[currRange].end += sample.size
		}
	}

	currTrack.currSample = currSample

	return {
		moof: self._generateMoof(track, firstSample, currSample),
		ranges: ranges,
		length: totalLen
	}
}

MP4Remuxer.prototype._generateMoof = function (track, firstSample, lastSample) {
	var self = this

	var currTrack = self._tracks[track]

	var entries = []
	for (var j = firstSample; j < lastSample; j++) {
		var currSample = currTrack.samples[j]
		entries.push({
			sampleDuration: currSample.duration,
			sampleSize: currSample.size,
			sampleFlags: currSample.sync ? 0x2000000 : 0x1010000,
			sampleCompositionTimeOffset: currSample.presentationOffset
		})
	}

	var moof = {
		type: 'moof',
		mfhd: {
			sequenceNumber: self._fragmentSequence++
		},
		trafs: [{
			tfhd: {
				flags: 0x20000, // default-base-is-moof
				trackId: currTrack.trackId
			},
			tfdt: {
				baseMediaDecodeTime: currTrack.samples[firstSample].dts
			},
			trun: {
				flags: 0xf01,
				dataOffset: 8, // The moof size has to be added to this later as well
				entries: entries
			}
		}]
	}

	// Update the offset
	moof.trafs[0].trun.dataOffset += Box.encodingLength(moof)

	return moof
}

}).call(this,require("buffer").Buffer)
},{"binary-search":10,"buffer":24,"events":42,"inherits":56,"mp4-box-encoding":69,"mp4-stream":72,"range-slice-stream":90}],134:[function(require,module,exports){
var MediaElementWrapper = require('mediasource')
var pump = require('pump')

var MP4Remuxer = require('./mp4-remuxer')

module.exports = VideoStream

function VideoStream (file, mediaElem, opts) {
	var self = this
	if (!(this instanceof VideoStream)) return new VideoStream(file, mediaElem, opts)
	opts = opts || {}

	self.detailedError = null

	self._elem = mediaElem
	self._elemWrapper = new MediaElementWrapper(mediaElem)
	self._waitingFired = false
	self._trackMeta = null
	self._file = file
	self._tracks = null
	if (self._elem.preload !== 'none') {
		self._createMuxer()
	}

	self._onError = function (err) {
		self.detailedError = self._elemWrapper.detailedError
		self.destroy() // don't pass err though so the user doesn't need to listen for errors
	}
	self._onWaiting = function () {
		self._waitingFired = true
		if (!self._muxer) {
			self._createMuxer()
		} else if (self._tracks) {
			self._pump()
		}
	}
	self._elem.addEventListener('waiting', self._onWaiting)
	self._elem.addEventListener('error', self._onError)
}

VideoStream.prototype._createMuxer = function () {
	var self = this
	self._muxer = new MP4Remuxer(self._file)
	self._muxer.on('ready', function (data) {
		self._tracks = data.map(function (trackData) {
			var mediaSource = self._elemWrapper.createWriteStream(trackData.mime)
			mediaSource.on('error', function (err) {
				self._elemWrapper.error(err)
			})
			var track = {
				muxed: null,
				mediaSource: mediaSource,
				initFlushed: false,
				onInitFlushed: null
			}
			mediaSource.write(trackData.init, function (err) {
				track.initFlushed = true
				if (track.onInitFlushed) {
					track.onInitFlushed(err)
				}
			})
			return track
		})

		if (self._waitingFired || self._elem.preload === 'auto') {
			self._pump()
		}
	})

	self._muxer.on('error', function (err) {
		self._elemWrapper.error(err)
	})
}

VideoStream.prototype._pump = function () {
	var self = this

	var muxed = self._muxer.seek(self._elem.currentTime, !self._tracks)

	self._tracks.forEach(function (track, i) {
		var pumpTrack = function () {
			if (track.muxed) {
				track.muxed.destroy()
				track.mediaSource = self._elemWrapper.createWriteStream(track.mediaSource)
				track.mediaSource.on('error', function (err) {
					self._elemWrapper.error(err)
				})
			}
			track.muxed = muxed[i]
			pump(track.muxed, track.mediaSource)
		}
		if (!track.initFlushed) {
			track.onInitFlushed = function (err) {
				if (err) {
					self._elemWrapper.error(err)
					return
				}
				pumpTrack()
			}
		} else {
			pumpTrack()
		}
	})
}

VideoStream.prototype.destroy = function () {
	var self = this
	if (self.destroyed) {
		return
	}
	self.destroyed = true

	self._elem.removeEventListener('waiting', self._onWaiting)
	self._elem.removeEventListener('error', self._onError)

	if (self._tracks) {
		self._tracks.forEach(function (track) {
			track.muxed.destroy()
		})
	}

	self._elem.src = ''
}

},{"./mp4-remuxer":133,"mediasource":64,"pump":83}],135:[function(require,module,exports){
(function (process,global){
/* global FileList */

module.exports = WebTorrent

var Buffer = require('safe-buffer').Buffer
var concat = require('simple-concat')
var createTorrent = require('create-torrent')
var debug = require('debug')('webtorrent')
var DHT = require('bittorrent-dht/client') // browser exclude
var EventEmitter = require('events').EventEmitter
var extend = require('xtend')
var inherits = require('inherits')
var loadIPSet = require('load-ip-set') // browser exclude
var parallel = require('run-parallel')
var parseTorrent = require('parse-torrent')
var path = require('path')
var Peer = require('simple-peer')
var randombytes = require('randombytes')
var speedometer = require('speedometer')
var zeroFill = require('zero-fill')

var TCPPool = require('./lib/tcp-pool') // browser exclude
var Torrent = require('./lib/torrent')

/**
 * WebTorrent version.
 */
var VERSION = require('./package.json').version

/**
 * Version number in Azureus-style. Generated from major and minor semver version.
 * For example:
 *   '0.16.1' -> '0016'
 *   '1.2.5' -> '0102'
 */
var VERSION_STR = VERSION.match(/([0-9]+)/g)
  .slice(0, 2)
  .map(function (v) { return zeroFill(2, v) })
  .join('')

/**
 * Version prefix string (used in peer ID). WebTorrent uses the Azureus-style
 * encoding: '-', two characters for client id ('WW'), four ascii digits for version
 * number, '-', followed by random numbers.
 * For example:
 *   '-WW0102-'...
 */
var VERSION_PREFIX = '-WW' + VERSION_STR + '-'

inherits(WebTorrent, EventEmitter)

/**
 * WebTorrent Client
 * @param {Object=} opts
 */
function WebTorrent (opts) {
  var self = this
  if (!(self instanceof WebTorrent)) return new WebTorrent(opts)
  EventEmitter.call(self)

  if (!opts) opts = {}

  if (typeof opts.peerId === 'string') {
    self.peerId = opts.peerId
  } else if (Buffer.isBuffer(opts.peerId)) {
    self.peerId = opts.peerId.toString('hex')
  } else {
    self.peerId = Buffer.from(VERSION_PREFIX + randombytes(9).toString('base64')).toString('hex')
  }
  self.peerIdBuffer = Buffer.from(self.peerId, 'hex')

  if (typeof opts.nodeId === 'string') {
    self.nodeId = opts.nodeId
  } else if (Buffer.isBuffer(opts.nodeId)) {
    self.nodeId = opts.nodeId.toString('hex')
  } else {
    self.nodeId = randombytes(20).toString('hex')
  }
  self.nodeIdBuffer = Buffer.from(self.nodeId, 'hex')

  self.destroyed = false
  self.listening = false
  self.torrentPort = opts.torrentPort || 0
  self.dhtPort = opts.dhtPort || 0
  self.tracker = opts.tracker !== undefined ? opts.tracker : {}
  self.torrents = []
  self.maxConns = Number(opts.maxConns) || 55

  debug(
    'new webtorrent (peerId %s, nodeId %s, port %s)',
    self.peerId, self.nodeId, self.torrentPort
  )

  if (self.tracker) {
    if (typeof self.tracker !== 'object') self.tracker = {}
    if (opts.rtcConfig) {
      // TODO: remove in v1
      console.warn('WebTorrent: opts.rtcConfig is deprecated. Use opts.tracker.rtcConfig instead')
      self.tracker.rtcConfig = opts.rtcConfig
    }
    if (opts.wrtc) {
      // TODO: remove in v1
      console.warn('WebTorrent: opts.wrtc is deprecated. Use opts.tracker.wrtc instead')
      self.tracker.wrtc = opts.wrtc
    }
    if (global.WRTC && !self.tracker.wrtc) {
      self.tracker.wrtc = global.WRTC
    }
  }

  if (typeof TCPPool === 'function') {
    self._tcpPool = new TCPPool(self)
  } else {
    process.nextTick(function () {
      self._onListening()
    })
  }

  // stats
  self._downloadSpeed = speedometer()
  self._uploadSpeed = speedometer()

  if (opts.dht !== false && typeof DHT === 'function' /* browser exclude */) {
    // use a single DHT instance for all torrents, so the routing table can be reused
    self.dht = new DHT(extend({ nodeId: self.nodeId }, opts.dht))

    self.dht.once('error', function (err) {
      self._destroy(err)
    })

    self.dht.once('listening', function () {
      var address = self.dht.address()
      if (address) self.dhtPort = address.port
    })

    // Ignore warning when there are > 10 torrents in the client
    self.dht.setMaxListeners(0)

    self.dht.listen(self.dhtPort)
  } else {
    self.dht = false
  }

  // Enable or disable BEP19 (Web Seeds). Enabled by default:
  self.enableWebSeeds = opts.webSeeds !== false

  if (typeof loadIPSet === 'function' && opts.blocklist != null) {
    loadIPSet(opts.blocklist, {
      headers: {
        'user-agent': 'WebTorrent/' + VERSION + ' (https://webtorrent.io)'
      }
    }, function (err, ipSet) {
      if (err) return self.error('Failed to load blocklist: ' + err.message)
      self.blocked = ipSet
      ready()
    })
  } else {
    process.nextTick(ready)
  }

  function ready () {
    if (self.destroyed) return
    self.ready = true
    self.emit('ready')
  }
}

WebTorrent.WEBRTC_SUPPORT = Peer.WEBRTC_SUPPORT

Object.defineProperty(WebTorrent.prototype, 'downloadSpeed', {
  get: function () { return this._downloadSpeed() }
})

Object.defineProperty(WebTorrent.prototype, 'uploadSpeed', {
  get: function () { return this._uploadSpeed() }
})

Object.defineProperty(WebTorrent.prototype, 'progress', {
  get: function () {
    var torrents = this.torrents.filter(function (torrent) {
      return torrent.progress !== 1
    })
    var downloaded = torrents.reduce(function (total, torrent) {
      return total + torrent.downloaded
    }, 0)
    var length = torrents.reduce(function (total, torrent) {
      return total + (torrent.length || 0)
    }, 0) || 1
    return downloaded / length
  }
})

Object.defineProperty(WebTorrent.prototype, 'ratio', {
  get: function () {
    var uploaded = this.torrents.reduce(function (total, torrent) {
      return total + torrent.uploaded
    }, 0)
    var received = this.torrents.reduce(function (total, torrent) {
      return total + torrent.received
    }, 0) || 1
    return uploaded / received
  }
})

/**
 * Returns the torrent with the given `torrentId`. Convenience method. Easier than
 * searching through the `client.torrents` array. Returns `null` if no matching torrent
 * found.
 *
 * @param  {string|Buffer|Object|Torrent} torrentId
 * @return {Torrent|null}
 */
WebTorrent.prototype.get = function (torrentId) {
  var self = this
  var i, torrent
  var len = self.torrents.length

  if (torrentId instanceof Torrent) {
    for (i = 0; i < len; i++) {
      torrent = self.torrents[i]
      if (torrent === torrentId) return torrent
    }
  } else {
    var parsed
    try { parsed = parseTorrent(torrentId) } catch (err) {}

    if (!parsed) return null
    if (!parsed.infoHash) throw new Error('Invalid torrent identifier')

    for (i = 0; i < len; i++) {
      torrent = self.torrents[i]
      if (torrent.infoHash === parsed.infoHash) return torrent
    }
  }
  return null
}

// TODO: remove in v1
WebTorrent.prototype.download = function (torrentId, opts, ontorrent) {
  console.warn('WebTorrent: client.download() is deprecated. Use client.add() instead')
  return this.add(torrentId, opts, ontorrent)
}

/**
 * Start downloading a new torrent. Aliased as `client.download`.
 * @param {string|Buffer|Object} torrentId
 * @param {Object} opts torrent-specific options
 * @param {function=} ontorrent called when the torrent is ready (has metadata)
 */
WebTorrent.prototype.add = function (torrentId, opts, ontorrent) {
  var self = this
  if (self.destroyed) throw new Error('client is destroyed')
  if (typeof opts === 'function') return self.add(torrentId, null, opts)

  debug('add')
  opts = opts ? extend(opts) : {}

  var torrent = new Torrent(torrentId, self, opts)
  self.torrents.push(torrent)

  torrent.once('_infoHash', onInfoHash)
  torrent.once('ready', onReady)
  torrent.once('close', onClose)

  function onInfoHash () {
    if (self.destroyed) return
    for (var i = 0, len = self.torrents.length; i < len; i++) {
      var t = self.torrents[i]
      if (t.infoHash === torrent.infoHash && t !== torrent) {
        torrent._destroy(new Error('Cannot add duplicate torrent ' + torrent.infoHash))
        return
      }
    }
  }

  function onReady () {
    if (self.destroyed) return
    if (typeof ontorrent === 'function') ontorrent(torrent)
    self.emit('torrent', torrent)
  }

  function onClose () {
    torrent.removeListener('_infoHash', onInfoHash)
    torrent.removeListener('ready', onReady)
    torrent.removeListener('close', onClose)
  }

  return torrent
}

/**
 * Start seeding a new file/folder.
 * @param  {string|File|FileList|Buffer|Array.<string|File|Buffer>} input
 * @param  {Object=} opts
 * @param  {function=} onseed called when torrent is seeding
 */
WebTorrent.prototype.seed = function (input, opts, onseed) {
  var self = this
  if (self.destroyed) throw new Error('client is destroyed')
  if (typeof opts === 'function') return self.seed(input, null, opts)

  debug('seed')
  opts = opts ? extend(opts) : {}

  // When seeding from fs path, initialize store from that path to avoid a copy
  if (typeof input === 'string') opts.path = path.dirname(input)
  if (!opts.createdBy) opts.createdBy = 'WebTorrent/' + VERSION_STR

  var torrent = self.add(null, opts, onTorrent)
  var streams

  if (isFileList(input)) input = Array.prototype.slice.call(input)
  if (!Array.isArray(input)) input = [ input ]

  parallel(input.map(function (item) {
    return function (cb) {
      if (isReadable(item)) concat(item, cb)
      else cb(null, item)
    }
  }), function (err, input) {
    if (self.destroyed) return
    if (err) return torrent._destroy(err)

    createTorrent.parseInput(input, opts, function (err, files) {
      if (self.destroyed) return
      if (err) return torrent._destroy(err)

      streams = files.map(function (file) {
        return file.getStream
      })

      createTorrent(input, opts, function (err, torrentBuf) {
        if (self.destroyed) return
        if (err) return torrent._destroy(err)

        var existingTorrent = self.get(torrentBuf)
        if (existingTorrent) {
          torrent._destroy(new Error('Cannot add duplicate torrent ' + existingTorrent.infoHash))
        } else {
          torrent._onTorrentId(torrentBuf)
        }
      })
    })
  })

  function onTorrent (torrent) {
    var tasks = [
      function (cb) {
        torrent.load(streams, cb)
      }
    ]
    if (self.dht) {
      tasks.push(function (cb) {
        torrent.once('dhtAnnounce', cb)
      })
    }
    parallel(tasks, function (err) {
      if (self.destroyed) return
      if (err) return torrent._destroy(err)
      _onseed(torrent)
    })
  }

  function _onseed (torrent) {
    debug('on seed')
    if (typeof onseed === 'function') onseed(torrent)
    torrent.emit('seed')
    self.emit('seed', torrent)
  }

  return torrent
}

/**
 * Remove a torrent from the client.
 * @param  {string|Buffer|Torrent}   torrentId
 * @param  {function} cb
 */
WebTorrent.prototype.remove = function (torrentId, cb) {
  debug('remove')
  var torrent = this.get(torrentId)
  if (!torrent) throw new Error('No torrent with id ' + torrentId)
  this._remove(torrentId, cb)
}

WebTorrent.prototype._remove = function (torrentId, cb) {
  var torrent = this.get(torrentId)
  if (!torrent) return
  this.torrents.splice(this.torrents.indexOf(torrent), 1)
  torrent.destroy(cb)
}

WebTorrent.prototype.address = function () {
  if (!this.listening) return null
  return this._tcpPool
    ? this._tcpPool.server.address()
    : { address: '0.0.0.0', family: 'IPv4', port: 0 }
}

/**
 * Destroy the client, including all torrents and connections to peers.
 * @param  {function} cb
 */
WebTorrent.prototype.destroy = function (cb) {
  if (this.destroyed) throw new Error('client already destroyed')
  this._destroy(null, cb)
}

WebTorrent.prototype._destroy = function (err, cb) {
  var self = this
  debug('client destroy')
  self.destroyed = true

  var tasks = self.torrents.map(function (torrent) {
    return function (cb) {
      torrent.destroy(cb)
    }
  })

  if (self._tcpPool) {
    tasks.push(function (cb) {
      self._tcpPool.destroy(cb)
    })
  }

  if (self.dht) {
    tasks.push(function (cb) {
      self.dht.destroy(cb)
    })
  }

  parallel(tasks, cb)

  if (err) self.emit('error', err)

  self.torrents = []
  self._tcpPool = null
  self.dht = null
}

WebTorrent.prototype._onListening = function () {
  this.listening = true

  if (this._tcpPool) {
    // Sometimes server.address() returns `null` in Docker.
    // WebTorrent issue: https://github.com/feross/bittorrent-swarm/pull/18
    var address = this._tcpPool.server.address()
    if (address) this.torrentPort = address.port
  }

  this.emit('listening')
}

/**
 * Check if `obj` is a node Readable stream
 * @param  {*} obj
 * @return {boolean}
 */
function isReadable (obj) {
  return typeof obj === 'object' && obj != null && typeof obj.pipe === 'function'
}

/**
 * Check if `obj` is a W3C `FileList` object
 * @param  {*} obj
 * @return {boolean}
 */
function isFileList (obj) {
  return typeof FileList !== 'undefined' && obj instanceof FileList
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./lib/tcp-pool":19,"./lib/torrent":140,"./package.json":142,"_process":22,"bittorrent-dht/client":19,"create-torrent":31,"debug":32,"events":42,"inherits":56,"load-ip-set":19,"parse-torrent":79,"path":80,"randombytes":89,"run-parallel":101,"safe-buffer":103,"simple-concat":105,"simple-peer":107,"speedometer":110,"xtend":144,"zero-fill":148}],136:[function(require,module,exports){
module.exports = FileStream

var debug = require('debug')('webtorrent:file-stream')
var inherits = require('inherits')
var stream = require('readable-stream')

inherits(FileStream, stream.Readable)

/**
 * Readable stream of a torrent file
 *
 * @param {File} file
 * @param {Object} opts
 * @param {number} opts.start stream slice of file, starting from this byte (inclusive)
 * @param {number} opts.end stream slice of file, ending with this byte (inclusive)
 */
function FileStream (file, opts) {
  stream.Readable.call(this, opts)

  this.destroyed = false
  this._torrent = file._torrent

  var start = (opts && opts.start) || 0
  var end = (opts && opts.end && opts.end < file.length)
    ? opts.end
    : file.length - 1

  var pieceLength = file._torrent.pieceLength

  this._startPiece = (start + file.offset) / pieceLength | 0
  this._endPiece = (end + file.offset) / pieceLength | 0

  this._piece = this._startPiece
  this._offset = (start + file.offset) - (this._startPiece * pieceLength)

  this._missing = end - start + 1
  this._reading = false
  this._notifying = false
  this._criticalLength = Math.min((1024 * 1024 / pieceLength) | 0, 2)
}

FileStream.prototype._read = function () {
  if (this._reading) return
  this._reading = true
  this._notify()
}

FileStream.prototype._notify = function () {
  var self = this

  if (!self._reading || self._missing === 0) return
  if (!self._torrent.bitfield.get(self._piece)) {
    return self._torrent.critical(self._piece, self._piece + self._criticalLength)
  }

  if (self._notifying) return
  self._notifying = true

  var p = self._piece
  self._torrent.store.get(p, function (err, buffer) {
    self._notifying = false
    if (self.destroyed) return
    if (err) return self._destroy(err)
    debug('read %s (length %s) (err %s)', p, buffer.length, err && err.message)

    if (self._offset) {
      buffer = buffer.slice(self._offset)
      self._offset = 0
    }

    if (self._missing < buffer.length) {
      buffer = buffer.slice(0, self._missing)
    }
    self._missing -= buffer.length

    debug('pushing buffer of length %s', buffer.length)
    self._reading = false
    self.push(buffer)

    if (self._missing === 0) self.push(null)
  })
  self._piece += 1
}

FileStream.prototype.destroy = function (onclose) {
  this._destroy(null, onclose)
}

FileStream.prototype._destroy = function (err, onclose) {
  if (this.destroyed) return
  this.destroyed = true

  if (!this._torrent.destroyed) {
    this._torrent.deselect(this._startPiece, this._endPiece, true)
  }

  if (err) this.emit('error', err)
  this.emit('close')
  if (onclose) onclose()
}

},{"debug":32,"inherits":56,"readable-stream":97}],137:[function(require,module,exports){
(function (process){
module.exports = File

var eos = require('end-of-stream')
var EventEmitter = require('events').EventEmitter
var FileStream = require('./file-stream')
var inherits = require('inherits')
var path = require('path')
var render = require('render-media')
var stream = require('readable-stream')
var streamToBlob = require('stream-to-blob')
var streamToBlobURL = require('stream-to-blob-url')
var streamToBuffer = require('stream-with-known-length-to-buffer')

inherits(File, EventEmitter)

function File (torrent, file) {
  EventEmitter.call(this)

  this._torrent = torrent
  this._destroyed = false

  this.name = file.name
  this.path = file.path
  this.length = file.length
  this.offset = file.offset

  this.done = false

  var start = file.offset
  var end = start + file.length - 1

  this._startPiece = start / this._torrent.pieceLength | 0
  this._endPiece = end / this._torrent.pieceLength | 0

  if (this.length === 0) {
    this.done = true
    this.emit('done')
  }
}

Object.defineProperty(File.prototype, 'downloaded', {
  get: function () {
    if (!this._torrent.bitfield) return 0
    var downloaded = 0
    for (var index = this._startPiece; index <= this._endPiece; ++index) {
      if (this._torrent.bitfield.get(index)) {
        // verified data
        downloaded += this._torrent.pieceLength
      } else {
        // "in progress" data
        var piece = this._torrent.pieces[index]
        downloaded += (piece.length - piece.missing)
      }
    }
    return downloaded
  }
})

File.prototype.select = function (priority) {
  if (this.length === 0) return
  this._torrent.select(this._startPiece, this._endPiece, priority)
}

File.prototype.deselect = function () {
  if (this.length === 0) return
  this._torrent.deselect(this._startPiece, this._endPiece, false)
}

File.prototype.createReadStream = function (opts) {
  var self = this
  if (this.length === 0) {
    var empty = new stream.PassThrough()
    process.nextTick(function () {
      empty.end()
    })
    return empty
  }

  var fileStream = new FileStream(self, opts)
  self._torrent.select(fileStream._startPiece, fileStream._endPiece, true, function () {
    fileStream._notify()
  })
  eos(fileStream, function () {
    if (self._destroyed) return
    if (!self._torrent.destroyed) {
      self._torrent.deselect(fileStream._startPiece, fileStream._endPiece, true)
    }
  })
  return fileStream
}

File.prototype.getBuffer = function (cb) {
  streamToBuffer(this.createReadStream(), this.length, cb)
}

File.prototype.getBlob = function (cb) {
  if (typeof window === 'undefined') throw new Error('browser-only method')
  streamToBlob(this.createReadStream(), this._getMimeType(), cb)
}

File.prototype.getBlobURL = function (cb) {
  if (typeof window === 'undefined') throw new Error('browser-only method')
  streamToBlobURL(this.createReadStream(), this._getMimeType(), cb)
}

File.prototype.appendTo = function (elem, opts, cb) {
  if (typeof window === 'undefined') throw new Error('browser-only method')
  render.append(this, elem, opts, cb)
}

File.prototype.renderTo = function (elem, opts, cb) {
  if (typeof window === 'undefined') throw new Error('browser-only method')
  render.render(this, elem, opts, cb)
}

File.prototype._getMimeType = function () {
  return render.mime[path.extname(this.name).toLowerCase()]
}

File.prototype._destroy = function () {
  this._destroyed = true
  this._torrent = null
}

}).call(this,require('_process'))
},{"./file-stream":136,"_process":22,"end-of-stream":40,"events":42,"inherits":56,"path":80,"readable-stream":97,"render-media":98,"stream-to-blob":116,"stream-to-blob-url":115,"stream-with-known-length-to-buffer":117}],138:[function(require,module,exports){
var arrayRemove = require('unordered-array-remove')
var debug = require('debug')('webtorrent:peer')
var Wire = require('bittorrent-protocol')

var WebConn = require('./webconn')

var CONNECT_TIMEOUT_TCP = 5000
var CONNECT_TIMEOUT_WEBRTC = 25000
var HANDSHAKE_TIMEOUT = 25000

/**
 * WebRTC peer connections start out connected, because WebRTC peers require an
 * "introduction" (i.e. WebRTC signaling), and there's no equivalent to an IP address
 * that lets you refer to a WebRTC endpoint.
 */
exports.createWebRTCPeer = function (conn, swarm) {
  var peer = new Peer(conn.id, 'webrtc')
  peer.conn = conn
  peer.swarm = swarm

  if (peer.conn.connected) {
    peer.onConnect()
  } else {
    peer.conn.once('connect', function () { peer.onConnect() })
    peer.conn.once('error', function (err) { peer.destroy(err) })
    peer.startConnectTimeout()
  }

  return peer
}

/**
 * Incoming TCP peers start out connected, because the remote peer connected to the
 * listening port of the TCP server. Until the remote peer sends a handshake, we don't
 * know what swarm the connection is intended for.
 */
exports.createTCPIncomingPeer = function (conn) {
  var addr = conn.remoteAddress + ':' + conn.remotePort
  var peer = new Peer(addr, 'tcpIncoming')
  peer.conn = conn
  peer.addr = addr

  peer.onConnect()

  return peer
}

/**
 * Outgoing TCP peers start out with just an IP address. At some point (when there is an
 * available connection), the client can attempt to connect to the address.
 */
exports.createTCPOutgoingPeer = function (addr, swarm) {
  var peer = new Peer(addr, 'tcpOutgoing')
  peer.addr = addr
  peer.swarm = swarm

  return peer
}

/**
 * Peer that represents a Web Seed (BEP17 / BEP19).
 */
exports.createWebSeedPeer = function (url, swarm) {
  var peer = new Peer(url, 'webSeed')
  peer.swarm = swarm
  peer.conn = new WebConn(url, swarm)

  peer.onConnect()

  return peer
}

/**
 * Peer. Represents a peer in the torrent swarm.
 *
 * @param {string} id "ip:port" string, peer id (for WebRTC peers), or url (for Web Seeds)
 * @param {string} type the type of the peer
 */
function Peer (id, type) {
  var self = this
  self.id = id
  self.type = type

  debug('new Peer %s', id)

  self.addr = null
  self.conn = null
  self.swarm = null
  self.wire = null

  self.connected = false
  self.destroyed = false
  self.timeout = null // handshake timeout
  self.retries = 0 // outgoing TCP connection retry count

  self.sentHandshake = false
}

/**
 * Called once the peer is connected (i.e. fired 'connect' event)
 * @param {Socket} conn
 */
Peer.prototype.onConnect = function () {
  var self = this
  if (self.destroyed) return
  self.connected = true

  debug('Peer %s connected', self.id)

  clearTimeout(self.connectTimeout)

  var conn = self.conn
  conn.once('end', function () {
    self.destroy()
  })
  conn.once('close', function () {
    self.destroy()
  })
  conn.once('finish', function () {
    self.destroy()
  })
  conn.once('error', function (err) {
    self.destroy(err)
  })

  var wire = self.wire = new Wire()
  wire.type = self.type
  wire.once('end', function () {
    self.destroy()
  })
  wire.once('close', function () {
    self.destroy()
  })
  wire.once('finish', function () {
    self.destroy()
  })
  wire.once('error', function (err) {
    self.destroy(err)
  })

  wire.once('handshake', function (infoHash, peerId) {
    self.onHandshake(infoHash, peerId)
  })
  self.startHandshakeTimeout()

  conn.pipe(wire).pipe(conn)
  if (self.swarm && !self.sentHandshake) self.handshake()
}

/**
 * Called when handshake is received from remote peer.
 * @param {string} infoHash
 * @param {string} peerId
 */
Peer.prototype.onHandshake = function (infoHash, peerId) {
  var self = this
  if (!self.swarm) return // `self.swarm` not set yet, so do nothing
  if (self.destroyed) return

  if (self.swarm.destroyed) {
    return self.destroy(new Error('swarm already destroyed'))
  }
  if (infoHash !== self.swarm.infoHash) {
    return self.destroy(new Error('unexpected handshake info hash for this swarm'))
  }
  if (peerId === self.swarm.peerId) {
    return self.destroy(new Error('refusing to connect to ourselves'))
  }

  debug('Peer %s got handshake %s', self.id, infoHash)

  clearTimeout(self.handshakeTimeout)

  self.retries = 0

  var addr = self.addr
  if (!addr && self.conn.remoteAddress) {
    addr = self.conn.remoteAddress + ':' + self.conn.remotePort
  }
  self.swarm._onWire(self.wire, addr)

  // swarm could be destroyed in user's 'wire' event handler
  if (!self.swarm || self.swarm.destroyed) return

  if (!self.sentHandshake) self.handshake()
}

Peer.prototype.handshake = function () {
  var self = this
  var opts = {
    dht: self.swarm.private ? false : !!self.swarm.client.dht
  }
  self.wire.handshake(self.swarm.infoHash, self.swarm.client.peerId, opts)
  self.sentHandshake = true
}

Peer.prototype.startConnectTimeout = function () {
  var self = this
  clearTimeout(self.connectTimeout)
  self.connectTimeout = setTimeout(function () {
    self.destroy(new Error('connect timeout'))
  }, self.type === 'webrtc' ? CONNECT_TIMEOUT_WEBRTC : CONNECT_TIMEOUT_TCP)
  if (self.connectTimeout.unref) self.connectTimeout.unref()
}

Peer.prototype.startHandshakeTimeout = function () {
  var self = this
  clearTimeout(self.handshakeTimeout)
  self.handshakeTimeout = setTimeout(function () {
    self.destroy(new Error('handshake timeout'))
  }, HANDSHAKE_TIMEOUT)
  if (self.handshakeTimeout.unref) self.handshakeTimeout.unref()
}

Peer.prototype.destroy = function (err) {
  var self = this
  if (self.destroyed) return
  self.destroyed = true
  self.connected = false

  debug('destroy %s (error: %s)', self.id, err && (err.message || err))

  clearTimeout(self.connectTimeout)
  clearTimeout(self.handshakeTimeout)

  var swarm = self.swarm
  var conn = self.conn
  var wire = self.wire

  self.swarm = null
  self.conn = null
  self.wire = null

  if (swarm && wire) {
    arrayRemove(swarm.wires, swarm.wires.indexOf(wire))
  }
  if (conn) {
    conn.on('error', noop)
    conn.destroy()
  }
  if (wire) wire.destroy()
  if (swarm) swarm.removePeer(self.id)
}

function noop () {}

},{"./webconn":141,"bittorrent-protocol":12,"debug":32,"unordered-array-remove":128}],139:[function(require,module,exports){
module.exports = RarityMap

/**
 * Mapping of torrent pieces to their respective availability in the torrent swarm. Used
 * by the torrent manager for implementing the rarest piece first selection strategy.
 */
function RarityMap (torrent) {
  var self = this

  self._torrent = torrent
  self._numPieces = torrent.pieces.length
  self._pieces = []

  self._onWire = function (wire) {
    self.recalculate()
    self._initWire(wire)
  }
  self._onWireHave = function (index) {
    self._pieces[index] += 1
  }
  self._onWireBitfield = function () {
    self.recalculate()
  }

  self._torrent.wires.forEach(function (wire) {
    self._initWire(wire)
  })
  self._torrent.on('wire', self._onWire)
  self.recalculate()
}

/**
 * Get the index of the rarest piece. Optionally, pass a filter function to exclude
 * certain pieces (for instance, those that we already have).
 *
 * @param {function} pieceFilterFunc
 * @return {number} index of rarest piece, or -1
 */
RarityMap.prototype.getRarestPiece = function (pieceFilterFunc) {
  if (!pieceFilterFunc) pieceFilterFunc = trueFn

  var candidates = []
  var min = Infinity

  for (var i = 0; i < this._numPieces; ++i) {
    if (!pieceFilterFunc(i)) continue

    var availability = this._pieces[i]
    if (availability === min) {
      candidates.push(i)
    } else if (availability < min) {
      candidates = [ i ]
      min = availability
    }
  }

  if (candidates.length > 0) {
    // if there are multiple pieces with the same availability, choose one randomly
    return candidates[Math.random() * candidates.length | 0]
  } else {
    return -1
  }
}

RarityMap.prototype.destroy = function () {
  var self = this
  self._torrent.removeListener('wire', self._onWire)
  self._torrent.wires.forEach(function (wire) {
    self._cleanupWireEvents(wire)
  })
  self._torrent = null
  self._pieces = null

  self._onWire = null
  self._onWireHave = null
  self._onWireBitfield = null
}

RarityMap.prototype._initWire = function (wire) {
  var self = this

  wire._onClose = function () {
    self._cleanupWireEvents(wire)
    for (var i = 0; i < this._numPieces; ++i) {
      self._pieces[i] -= wire.peerPieces.get(i)
    }
  }

  wire.on('have', self._onWireHave)
  wire.on('bitfield', self._onWireBitfield)
  wire.once('close', wire._onClose)
}

/**
 * Recalculates piece availability across all peers in the torrent.
 */
RarityMap.prototype.recalculate = function () {
  var i
  for (i = 0; i < this._numPieces; ++i) {
    this._pieces[i] = 0
  }

  var numWires = this._torrent.wires.length
  for (i = 0; i < numWires; ++i) {
    var wire = this._torrent.wires[i]
    for (var j = 0; j < this._numPieces; ++j) {
      this._pieces[j] += wire.peerPieces.get(j)
    }
  }
}

RarityMap.prototype._cleanupWireEvents = function (wire) {
  wire.removeListener('have', this._onWireHave)
  wire.removeListener('bitfield', this._onWireBitfield)
  if (wire._onClose) wire.removeListener('close', wire._onClose)
  wire._onClose = null
}

function trueFn () {
  return true
}

},{}],140:[function(require,module,exports){
(function (process,global){
/* global URL, Blob */

module.exports = Torrent

var addrToIPPort = require('addr-to-ip-port')
var BitField = require('bitfield')
var ChunkStoreWriteStream = require('chunk-store-stream/write')
var debug = require('debug')('webtorrent:torrent')
var Discovery = require('torrent-discovery')
var EventEmitter = require('events').EventEmitter
var extend = require('xtend')
var extendMutable = require('xtend/mutable')
var fs = require('fs')
var FSChunkStore = require('fs-chunk-store') // browser: `memory-chunk-store`
var get = require('simple-get')
var ImmediateChunkStore = require('immediate-chunk-store')
var inherits = require('inherits')
var MultiStream = require('multistream')
var net = require('net') // browser exclude
var os = require('os') // browser exclude
var parallel = require('run-parallel')
var parallelLimit = require('run-parallel-limit')
var parseTorrent = require('parse-torrent')
var path = require('path')
var Piece = require('torrent-piece')
var pump = require('pump')
var randomIterate = require('random-iterate')
var sha1 = require('simple-sha1')
var speedometer = require('speedometer')
var uniq = require('uniq')
var utMetadata = require('ut_metadata')
var utPex = require('ut_pex') // browser exclude

var File = require('./file')
var Peer = require('./peer')
var RarityMap = require('./rarity-map')
var Server = require('./server') // browser exclude

var MAX_BLOCK_LENGTH = 128 * 1024
var PIECE_TIMEOUT = 30000
var CHOKE_TIMEOUT = 5000
var SPEED_THRESHOLD = 3 * Piece.BLOCK_LENGTH

var PIPELINE_MIN_DURATION = 0.5
var PIPELINE_MAX_DURATION = 1

var RECHOKE_INTERVAL = 10000 // 10 seconds
var RECHOKE_OPTIMISTIC_DURATION = 2 // 30 seconds

var FILESYSTEM_CONCURRENCY = 2

var RECONNECT_WAIT = [ 1000, 5000, 15000 ]

var VERSION = require('../package.json').version

var TMP
try {
  TMP = path.join(fs.statSync('/tmp') && '/tmp', 'webtorrent')
} catch (err) {
  TMP = path.join(typeof os.tmpDir === 'function' ? os.tmpDir() : '/', 'webtorrent')
}

inherits(Torrent, EventEmitter)

function Torrent (torrentId, client, opts) {
  EventEmitter.call(this)

  this.client = client
  this._debugId = this.client.peerId.toString('hex').substring(0, 7)

  this._debug('new torrent')

  this.announce = opts.announce
  this.urlList = opts.urlList

  this.path = opts.path
  this._store = opts.store || FSChunkStore
  this._getAnnounceOpts = opts.getAnnounceOpts

  this.strategy = opts.strategy || 'sequential'

  this.maxWebConns = opts.maxWebConns || 4

  this._rechokeNumSlots = (opts.uploads === false || opts.uploads === 0)
    ? 0
    : (+opts.uploads || 10)
  this._rechokeOptimisticWire = null
  this._rechokeOptimisticTime = 0
  this._rechokeIntervalId = null

  this.ready = false
  this.destroyed = false
  this.paused = false
  this.done = false

  this.metadata = null
  this.store = null
  this.files = []
  this.pieces = []

  this._amInterested = false
  this._selections = []
  this._critical = []

  this.wires = [] // open wires (added *after* handshake)

  this._queue = [] // queue of outgoing tcp peers to connect to
  this._peers = {} // connected peers (addr/peerId -> Peer)
  this._peersLength = 0 // number of elements in `this._peers` (cache, for perf)

  // stats
  this.received = 0
  this.uploaded = 0
  this._downloadSpeed = speedometer()
  this._uploadSpeed = speedometer()

  // for cleanup
  this._servers = []
  this._xsRequests = []

  // TODO: remove this and expose a hook instead
  // optimization: don't recheck every file if it hasn't changed
  this._fileModtimes = opts.fileModtimes

  if (torrentId !== null) this._onTorrentId(torrentId)
}

Object.defineProperty(Torrent.prototype, 'timeRemaining', {
  get: function () {
    if (this.done) return 0
    if (this.downloadSpeed === 0) return Infinity
    return ((this.length - this.downloaded) / this.downloadSpeed) * 1000
  }
})

Object.defineProperty(Torrent.prototype, 'downloaded', {
  get: function () {
    if (!this.bitfield) return 0
    var downloaded = 0
    for (var index = 0, len = this.pieces.length; index < len; ++index) {
      if (this.bitfield.get(index)) { // verified data
        downloaded += (index === len - 1) ? this.lastPieceLength : this.pieceLength
      } else { // "in progress" data
        var piece = this.pieces[index]
        downloaded += (piece.length - piece.missing)
      }
    }
    return downloaded
  }
})

// TODO: re-enable this. The number of missing pieces. Used to implement 'end game' mode.
// Object.defineProperty(Storage.prototype, 'numMissing', {
//   get: function () {
//     var self = this
//     var numMissing = self.pieces.length
//     for (var index = 0, len = self.pieces.length; index < len; index++) {
//       numMissing -= self.bitfield.get(index)
//     }
//     return numMissing
//   }
// })

Object.defineProperty(Torrent.prototype, 'downloadSpeed', {
  get: function () { return this._downloadSpeed() }
})

Object.defineProperty(Torrent.prototype, 'uploadSpeed', {
  get: function () { return this._uploadSpeed() }
})

Object.defineProperty(Torrent.prototype, 'progress', {
  get: function () { return this.length ? this.downloaded / this.length : 0 }
})

Object.defineProperty(Torrent.prototype, 'ratio', {
  get: function () { return this.uploaded / (this.received || 1) }
})

Object.defineProperty(Torrent.prototype, 'numPeers', {
  get: function () { return this.wires.length }
})

Object.defineProperty(Torrent.prototype, 'torrentFileBlobURL', {
  get: function () {
    if (typeof window === 'undefined') throw new Error('browser-only property')
    if (!this.torrentFile) return null
    return URL.createObjectURL(
      new Blob([ this.torrentFile ], { type: 'application/x-bittorrent' })
    )
  }
})

Object.defineProperty(Torrent.prototype, '_numQueued', {
  get: function () {
    return this._queue.length + (this._peersLength - this._numConns)
  }
})

Object.defineProperty(Torrent.prototype, '_numConns', {
  get: function () {
    var self = this
    var numConns = 0
    for (var id in self._peers) {
      if (self._peers[id].connected) numConns += 1
    }
    return numConns
  }
})

// TODO: remove in v1
Object.defineProperty(Torrent.prototype, 'swarm', {
  get: function () {
    console.warn('WebTorrent: `torrent.swarm` is deprecated. Use `torrent` directly instead.')
    return this
  }
})

Torrent.prototype._onTorrentId = function (torrentId) {
  var self = this
  if (self.destroyed) return

  var parsedTorrent
  try { parsedTorrent = parseTorrent(torrentId) } catch (err) {}
  if (parsedTorrent) {
    // Attempt to set infoHash property synchronously
    self.infoHash = parsedTorrent.infoHash
    process.nextTick(function () {
      if (self.destroyed) return
      self._onParsedTorrent(parsedTorrent)
    })
  } else {
    // If torrentId failed to parse, it could be in a form that requires an async
    // operation, i.e. http/https link, filesystem path, or Blob.
    parseTorrent.remote(torrentId, function (err, parsedTorrent) {
      if (self.destroyed) return
      if (err) return self._destroy(err)
      self._onParsedTorrent(parsedTorrent)
    })
  }
}

Torrent.prototype._onParsedTorrent = function (parsedTorrent) {
  var self = this
  if (self.destroyed) return

  self._processParsedTorrent(parsedTorrent)

  if (!self.infoHash) {
    return self._destroy(new Error('Malformed torrent data: No info hash'))
  }

  if (!self.path) self.path = path.join(TMP, self.infoHash)

  self._rechokeIntervalId = setInterval(function () {
    self._rechoke()
  }, RECHOKE_INTERVAL)
  if (self._rechokeIntervalId.unref) self._rechokeIntervalId.unref()

  // Private 'infoHash' event allows client.add to check for duplicate torrents and
  // destroy them before the normal 'infoHash' event is emitted. Prevents user
  // applications from needing to deal with duplicate 'infoHash' events.
  self.emit('_infoHash', self.infoHash)
  if (self.destroyed) return

  self.emit('infoHash', self.infoHash)
  if (self.destroyed) return // user might destroy torrent in event handler

  if (self.client.listening) {
    self._onListening()
  } else {
    self.client.once('listening', function () {
      self._onListening()
    })
  }
}

Torrent.prototype._processParsedTorrent = function (parsedTorrent) {
  if (this.announce) {
    // Allow specifying trackers via `opts` parameter
    parsedTorrent.announce = parsedTorrent.announce.concat(this.announce)
  }

  if (this.client.tracker && global.WEBTORRENT_ANNOUNCE && !this.private) {
    // So `webtorrent-hybrid` can force specific trackers to be used
    parsedTorrent.announce = parsedTorrent.announce.concat(global.WEBTORRENT_ANNOUNCE)
  }

  if (this.urlList) {
    // Allow specifying web seeds via `opts` parameter
    parsedTorrent.urlList = parsedTorrent.urlList.concat(this.urlList)
  }

  uniq(parsedTorrent.announce)
  uniq(parsedTorrent.urlList)

  extendMutable(this, parsedTorrent)

  this.magnetURI = parseTorrent.toMagnetURI(parsedTorrent)
  this.torrentFile = parseTorrent.toTorrentFile(parsedTorrent)
}

Torrent.prototype._onListening = function () {
  var self = this
  if (self.discovery || self.destroyed) return

  var trackerOpts = self.client.tracker
  if (trackerOpts) {
    trackerOpts = extend(self.client.tracker, {
      getAnnounceOpts: function () {
        var opts = {
          uploaded: self.uploaded,
          downloaded: self.downloaded,
          left: Math.max(self.length - self.downloaded, 0)
        }
        if (self.client.tracker.getAnnounceOpts) {
          extendMutable(opts, self.client.tracker.getAnnounceOpts())
        }
        if (self._getAnnounceOpts) {
          // TODO: consider deprecating this, as it's redundant with the former case
          extendMutable(opts, self._getAnnounceOpts())
        }
        return opts
      }
    })
  }

  // begin discovering peers via DHT and trackers
  self.discovery = new Discovery({
    infoHash: self.infoHash,
    announce: self.announce,
    peerId: self.client.peerId,
    dht: !self.private && self.client.dht,
    tracker: trackerOpts,
    port: self.client.torrentPort
  })

  self.discovery.on('error', onError)
  self.discovery.on('peer', onPeer)
  self.discovery.on('trackerAnnounce', onTrackerAnnounce)
  self.discovery.on('dhtAnnounce', onDHTAnnounce)
  self.discovery.on('warning', onWarning)

  function onError (err) {
    self._destroy(err)
  }

  function onPeer (peer) {
    // Don't create new outgoing TCP connections when torrent is done
    if (typeof peer === 'string' && self.done) return
    self.addPeer(peer)
  }

  function onTrackerAnnounce () {
    self.emit('trackerAnnounce')
    if (self.numPeers === 0) self.emit('noPeers', 'tracker')
  }

  function onDHTAnnounce () {
    self.emit('dhtAnnounce')
    if (self.numPeers === 0) self.emit('noPeers', 'dht')
  }

  function onWarning (err) {
    self.emit('warning', err)
  }

  if (self.info) {
    // if full metadata was included in initial torrent id, use it immediately. Otherwise,
    // wait for torrent-discovery to find peers and ut_metadata to get the metadata.
    self._onMetadata(self)
  } else if (self.xs) {
    self._getMetadataFromServer()
  }
}

Torrent.prototype._getMetadataFromServer = function () {
  var self = this
  var urls = Array.isArray(self.xs) ? self.xs : [ self.xs ]

  var tasks = urls.map(function (url) {
    return function (cb) {
      getMetadataFromURL(url, cb)
    }
  })
  parallel(tasks)

  function getMetadataFromURL (url, cb) {
    if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
      self._debug('skipping non-http xs param: %s', url)
      return cb(null)
    }

    var opts = {
      url: url,
      method: 'GET',
      headers: {
        'user-agent': 'WebTorrent/' + VERSION + ' (https://webtorrent.io)'
      }
    }
    var req
    try {
      req = get.concat(opts, onResponse)
    } catch (err) {
      self._debug('skipping invalid url xs param: %s', url)
      return cb(null)
    }

    self._xsRequests.push(req)

    function onResponse (err, res, torrent) {
      if (self.destroyed) return cb(null)
      if (self.metadata) return cb(null)

      if (err) {
        self._debug('http error from xs param: %s', url)
        return cb(null)
      }
      if (res.statusCode !== 200) {
        self._debug('non-200 status code %s from xs param: %s', res.statusCode, url)
        return cb(null)
      }

      var parsedTorrent
      try {
        parsedTorrent = parseTorrent(torrent)
      } catch (err) {}

      if (!parsedTorrent) {
        self._debug('got invalid torrent file from xs param: %s', url)
        return cb(null)
      }

      if (parsedTorrent.infoHash !== self.infoHash) {
        self._debug('got torrent file with incorrect info hash from xs param: %s', url)
        return cb(null)
      }

      self._onMetadata(parsedTorrent)
      cb(null)
    }
  }
}

/**
 * Called when the full torrent metadata is received.
 */
Torrent.prototype._onMetadata = function (metadata) {
  var self = this
  if (self.metadata || self.destroyed) return
  self._debug('got metadata')

  self._xsRequests.forEach(function (req) {
    req.abort()
  })
  self._xsRequests = []

  var parsedTorrent
  if (metadata && metadata.infoHash) {
    // `metadata` is a parsed torrent (from parse-torrent module)
    parsedTorrent = metadata
  } else {
    try {
      parsedTorrent = parseTorrent(metadata)
    } catch (err) {
      return self._destroy(err)
    }
  }

  self._processParsedTorrent(parsedTorrent)
  self.metadata = self.torrentFile

  // add web seed urls (BEP19)
  if (self.client.enableWebSeeds) {
    self.urlList.forEach(function (url) {
      self.addWebSeed(url)
    })
  }

  // start off selecting the entire torrent with low priority
  if (self.pieces.length !== 0) {
    self.select(0, self.pieces.length - 1, false)
  }

  self._rarityMap = new RarityMap(self)

  self.store = new ImmediateChunkStore(
    new self._store(self.pieceLength, {
      torrent: {
        infoHash: self.infoHash
      },
      files: self.files.map(function (file) {
        return {
          path: path.join(self.path, file.path),
          length: file.length,
          offset: file.offset
        }
      }),
      length: self.length
    })
  )

  self.files = self.files.map(function (file) {
    return new File(self, file)
  })

  self._hashes = self.pieces

  self.pieces = self.pieces.map(function (hash, i) {
    var pieceLength = (i === self.pieces.length - 1)
      ? self.lastPieceLength
      : self.pieceLength
    return new Piece(pieceLength)
  })

  self._reservations = self.pieces.map(function () {
    return []
  })

  self.bitfield = new BitField(self.pieces.length)

  self.wires.forEach(function (wire) {
    // If we didn't have the metadata at the time ut_metadata was initialized for this
    // wire, we still want to make it available to the peer in case they request it.
    if (wire.ut_metadata) wire.ut_metadata.setMetadata(self.metadata)

    self._onWireWithMetadata(wire)
  })

  self._debug('verifying existing torrent data')
  if (self._fileModtimes && self._store === FSChunkStore) {
    // don't verify if the files haven't been modified since we last checked
    self.getFileModtimes(function (err, fileModtimes) {
      if (err) return self._destroy(err)

      var unchanged = self.files.map(function (_, index) {
        return fileModtimes[index] === self._fileModtimes[index]
      }).every(function (x) {
        return x
      })

      if (unchanged) {
        for (var index = 0; index < self.pieces.length; index++) {
          self._markVerified(index)
        }
        self._onStore()
      } else {
        self._verifyPieces()
      }
    })
  } else {
    self._verifyPieces()
  }

  self.emit('metadata')
}

/*
 * TODO: remove this
 * Gets the last modified time of every file on disk for this torrent.
 * Only valid in Node, not in the browser.
 */
Torrent.prototype.getFileModtimes = function (cb) {
  var self = this
  var ret = []
  parallelLimit(self.files.map(function (file, index) {
    return function (cb) {
      fs.stat(path.join(self.path, file.path), function (err, stat) {
        if (err && err.code !== 'ENOENT') return cb(err)
        ret[index] = stat && stat.mtime.getTime()
        cb(null)
      })
    }
  }), FILESYSTEM_CONCURRENCY, function (err) {
    self._debug('done getting file modtimes')
    cb(err, ret)
  })
}

Torrent.prototype._verifyPieces = function () {
  var self = this
  parallelLimit(self.pieces.map(function (_, index) {
    return function (cb) {
      if (self.destroyed) return cb(new Error('torrent is destroyed'))
      self.store.get(index, function (err, buf) {
        if (err) return process.nextTick(cb, null) // ignore error
        sha1(buf, function (hash) {
          if (hash === self._hashes[index]) {
            if (!self.pieces[index]) return
            self._debug('piece verified %s', index)
            self._markVerified(index)
          } else {
            self._debug('piece invalid %s', index)
          }
          cb(null)
        })
      })
    }
  }), FILESYSTEM_CONCURRENCY, function (err) {
    if (err) return self._destroy(err)
    self._debug('done verifying')
    self._onStore()
  })
}

Torrent.prototype._markVerified = function (index) {
  this.pieces[index] = null
  this._reservations[index] = null
  this.bitfield.set(index, true)
}

/**
 * Called when the metadata, listening server, and underlying chunk store is initialized.
 */
Torrent.prototype._onStore = function () {
  var self = this
  if (self.destroyed) return
  self._debug('on store')

  self.ready = true
  self.emit('ready')

  // Files may start out done if the file was already in the store
  self._checkDone()

  // In case any selections were made before torrent was ready
  self._updateSelections()
}

Torrent.prototype.destroy = function (cb) {
  var self = this
  self._destroy(null, cb)
}

Torrent.prototype._destroy = function (err, cb) {
  var self = this
  if (self.destroyed) return
  self.destroyed = true
  self._debug('destroy')

  self.client._remove(self)

  clearInterval(self._rechokeIntervalId)

  self._xsRequests.forEach(function (req) {
    req.abort()
  })

  if (self._rarityMap) {
    self._rarityMap.destroy()
  }

  for (var id in self._peers) {
    self.removePeer(id)
  }

  self.files.forEach(function (file) {
    if (file instanceof File) file._destroy()
  })

  var tasks = self._servers.map(function (server) {
    return function (cb) {
      server.destroy(cb)
    }
  })

  if (self.discovery) {
    tasks.push(function (cb) {
      self.discovery.destroy(cb)
    })
  }

  if (self.store) {
    tasks.push(function (cb) {
      self.store.close(cb)
    })
  }

  parallel(tasks, cb)

  if (err) {
    // Torrent errors are emitted at `torrent.on('error')`. If there are no 'error'
    // event handlers on the torrent instance, then the error will be emitted at
    // `client.on('error')`. This prevents throwing an uncaught exception
    // (unhandled 'error' event), but it makes it impossible to distinguish client
    // errors versus torrent errors. Torrent errors are not fatal, and the client
    // is still usable afterwards. Therefore, always listen for errors in both
    // places (`client.on('error')` and `torrent.on('error')`).
    if (self.listenerCount('error') === 0) {
      self.client.emit('error', err)
    } else {
      self.emit('error', err)
    }
  }

  self.emit('close')

  self.client = null
  self.files = []
  self.discovery = null
  self.store = null
  self._rarityMap = null
  self._peers = null
  self._servers = null
  self._xsRequests = null
}

Torrent.prototype.addPeer = function (peer) {
  var self = this
  if (self.destroyed) throw new Error('torrent is destroyed')
  if (!self.infoHash) throw new Error('addPeer() must not be called before the `infoHash` event')

  if (self.client.blocked) {
    var host
    if (typeof peer === 'string') {
      var parts
      try {
        parts = addrToIPPort(peer)
      } catch (e) {
        self._debug('ignoring peer: invalid %s', peer)
        self.emit('invalidPeer', peer)
        return false
      }
      host = parts[0]
    } else if (typeof peer.remoteAddress === 'string') {
      host = peer.remoteAddress
    }

    if (host && self.client.blocked.contains(host)) {
      self._debug('ignoring peer: blocked %s', peer)
      if (typeof peer !== 'string') peer.destroy()
      self.emit('blockedPeer', peer)
      return false
    }
  }

  var wasAdded = !!self._addPeer(peer)
  if (wasAdded) {
    self.emit('peer', peer)
  } else {
    self.emit('invalidPeer', peer)
  }
  return wasAdded
}

Torrent.prototype._addPeer = function (peer) {
  var self = this
  if (self.destroyed) {
    self._debug('ignoring peer: torrent is destroyed')
    if (typeof peer !== 'string') peer.destroy()
    return null
  }
  if (typeof peer === 'string' && !self._validAddr(peer)) {
    self._debug('ignoring peer: invalid %s', peer)
    return null
  }

  var id = (peer && peer.id) || peer
  if (self._peers[id]) {
    self._debug('ignoring peer: duplicate (%s)', id)
    if (typeof peer !== 'string') peer.destroy()
    return null
  }

  if (self.paused) {
    self._debug('ignoring peer: torrent is paused')
    if (typeof peer !== 'string') peer.destroy()
    return null
  }

  self._debug('add peer %s', id)

  var newPeer
  if (typeof peer === 'string') {
    // `peer` is an addr ("ip:port" string)
    newPeer = Peer.createTCPOutgoingPeer(peer, self)
  } else {
    // `peer` is a WebRTC connection (simple-peer)
    newPeer = Peer.createWebRTCPeer(peer, self)
  }

  self._peers[newPeer.id] = newPeer
  self._peersLength += 1

  if (typeof peer === 'string') {
    // `peer` is an addr ("ip:port" string)
    self._queue.push(newPeer)
    self._drain()
  }

  return newPeer
}

Torrent.prototype.addWebSeed = function (url) {
  if (this.destroyed) throw new Error('torrent is destroyed')

  if (!/^https?:\/\/.+/.test(url)) {
    this._debug('ignoring invalid web seed %s', url)
    this.emit('invalidPeer', url)
    return
  }

  if (this._peers[url]) {
    this._debug('ignoring duplicate web seed %s', url)
    this.emit('invalidPeer', url)
    return
  }

  this._debug('add web seed %s', url)

  var newPeer = Peer.createWebSeedPeer(url, this)
  this._peers[newPeer.id] = newPeer
  this._peersLength += 1

  this.emit('peer', url)
}

/**
 * Called whenever a new incoming TCP peer connects to this torrent swarm. Called with a
 * peer that has already sent a handshake.
 */
Torrent.prototype._addIncomingPeer = function (peer) {
  var self = this
  if (self.destroyed) return peer.destroy(new Error('torrent is destroyed'))
  if (self.paused) return peer.destroy(new Error('torrent is paused'))

  this._debug('add incoming peer %s', peer.id)

  self._peers[peer.id] = peer
  self._peersLength += 1
}

Torrent.prototype.removePeer = function (peer) {
  var self = this
  var id = (peer && peer.id) || peer
  peer = self._peers[id]

  if (!peer) return

  this._debug('removePeer %s', id)

  delete self._peers[id]
  self._peersLength -= 1

  peer.destroy()

  // If torrent swarm was at capacity before, try to open a new connection now
  self._drain()
}

Torrent.prototype.select = function (start, end, priority, notify) {
  var self = this
  if (self.destroyed) throw new Error('torrent is destroyed')

  if (start < 0 || end < start || self.pieces.length <= end) {
    throw new Error('invalid selection ', start, ':', end)
  }
  priority = Number(priority) || 0

  self._debug('select %s-%s (priority %s)', start, end, priority)

  self._selections.push({
    from: start,
    to: end,
    offset: 0,
    priority: priority,
    notify: notify || noop
  })

  self._selections.sort(function (a, b) {
    return b.priority - a.priority
  })

  self._updateSelections()
}

Torrent.prototype.deselect = function (start, end, priority) {
  var self = this
  if (self.destroyed) throw new Error('torrent is destroyed')

  priority = Number(priority) || 0
  self._debug('deselect %s-%s (priority %s)', start, end, priority)

  for (var i = 0; i < self._selections.length; ++i) {
    var s = self._selections[i]
    if (s.from === start && s.to === end && s.priority === priority) {
      self._selections.splice(i--, 1)
      break
    }
  }

  self._updateSelections()
}

Torrent.prototype.critical = function (start, end) {
  var self = this
  if (self.destroyed) throw new Error('torrent is destroyed')

  self._debug('critical %s-%s', start, end)

  for (var i = start; i <= end; ++i) {
    self._critical[i] = true
  }

  self._updateSelections()
}

Torrent.prototype._onWire = function (wire, addr) {
  var self = this
  self._debug('got wire %s (%s)', wire._debugId, addr || 'Unknown')

  wire.on('download', function (downloaded) {
    if (self.destroyed) return
    self.received += downloaded
    self._downloadSpeed(downloaded)
    self.client._downloadSpeed(downloaded)
    self.emit('download', downloaded)
    self.client.emit('download', downloaded)
  })

  wire.on('upload', function (uploaded) {
    if (self.destroyed) return
    self.uploaded += uploaded
    self._uploadSpeed(uploaded)
    self.client._uploadSpeed(uploaded)
    self.emit('upload', uploaded)
    self.client.emit('upload', uploaded)
  })

  self.wires.push(wire)

  if (addr) {
    // Sometimes RTCPeerConnection.getStats() doesn't return an ip:port for peers
    var parts = addrToIPPort(addr)
    wire.remoteAddress = parts[0]
    wire.remotePort = parts[1]
  }

  // When peer sends PORT message, add that DHT node to routing table
  if (self.client.dht && self.client.dht.listening) {
    wire.on('port', function (port) {
      if (self.destroyed || self.client.dht.destroyed) {
        return
      }
      if (!wire.remoteAddress) {
        return self._debug('ignoring PORT from peer with no address')
      }
      if (port === 0 || port > 65536) {
        return self._debug('ignoring invalid PORT from peer')
      }

      self._debug('port: %s (from %s)', port, addr)
      self.client.dht.addNode({ host: wire.remoteAddress, port: port })
    })
  }

  wire.on('timeout', function () {
    self._debug('wire timeout (%s)', addr)
    // TODO: this might be destroying wires too eagerly
    wire.destroy()
  })

  // Timeout for piece requests to this peer
  wire.setTimeout(PIECE_TIMEOUT, true)

  // Send KEEP-ALIVE (every 60s) so peers will not disconnect the wire
  wire.setKeepAlive(true)

  // use ut_metadata extension
  wire.use(utMetadata(self.metadata))

  wire.ut_metadata.on('warning', function (err) {
    self._debug('ut_metadata warning: %s', err.message)
  })

  if (!self.metadata) {
    wire.ut_metadata.on('metadata', function (metadata) {
      self._debug('got metadata via ut_metadata')
      self._onMetadata(metadata)
    })
    wire.ut_metadata.fetch()
  }

  // use ut_pex extension if the torrent is not flagged as private
  if (typeof utPex === 'function' && !self.private) {
    wire.use(utPex())

    wire.ut_pex.on('peer', function (peer) {
      // Only add potential new peers when we're not seeding
      if (self.done) return
      self._debug('ut_pex: got peer: %s (from %s)', peer, addr)
      self.addPeer(peer)
    })

    wire.ut_pex.on('dropped', function (peer) {
      // the remote peer believes a given peer has been dropped from the torrent swarm.
      // if we're not currently connected to it, then remove it from the queue.
      var peerObj = self._peers[peer]
      if (peerObj && !peerObj.connected) {
        self._debug('ut_pex: dropped peer: %s (from %s)', peer, addr)
        self.removePeer(peer)
      }
    })

    wire.once('close', function () {
      // Stop sending updates to remote peer
      wire.ut_pex.reset()
    })
  }

  // Hook to allow user-defined `bittorrent-protocol` extensions
  // More info: https://github.com/feross/bittorrent-protocol#extension-api
  self.emit('wire', wire, addr)

  if (self.metadata) {
    process.nextTick(function () {
      // This allows wire.handshake() to be called (by Peer.onHandshake) before any
      // messages get sent on the wire
      self._onWireWithMetadata(wire)
    })
  }
}

Torrent.prototype._onWireWithMetadata = function (wire) {
  var self = this
  var timeoutId = null

  function onChokeTimeout () {
    if (self.destroyed || wire.destroyed) return

    if (self._numQueued > 2 * (self._numConns - self.numPeers) &&
      wire.amInterested) {
      wire.destroy()
    } else {
      timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
      if (timeoutId.unref) timeoutId.unref()
    }
  }

  var i = 0
  function updateSeedStatus () {
    if (wire.peerPieces.length !== self.pieces.length) return
    for (; i < self.pieces.length; ++i) {
      if (!wire.peerPieces.get(i)) return
    }
    wire.isSeeder = true
    wire.choke() // always choke seeders
  }

  wire.on('bitfield', function () {
    updateSeedStatus()
    self._update()
  })

  wire.on('have', function () {
    updateSeedStatus()
    self._update()
  })

  wire.once('interested', function () {
    wire.unchoke()
  })

  wire.once('close', function () {
    clearTimeout(timeoutId)
  })

  wire.on('choke', function () {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
    if (timeoutId.unref) timeoutId.unref()
  })

  wire.on('unchoke', function () {
    clearTimeout(timeoutId)
    self._update()
  })

  wire.on('request', function (index, offset, length, cb) {
    if (length > MAX_BLOCK_LENGTH) {
      // Per spec, disconnect from peers that request >128KB
      return wire.destroy()
    }
    if (self.pieces[index]) return
    self.store.get(index, { offset: offset, length: length }, cb)
  })

  wire.bitfield(self.bitfield) // always send bitfield (required)
  wire.interested() // always start out interested

  // Send PORT message to peers that support DHT
  if (wire.peerExtensions.dht && self.client.dht && self.client.dht.listening) {
    wire.port(self.client.dht.address().port)
  }

  timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
  if (timeoutId.unref) timeoutId.unref()

  wire.isSeeder = false
  updateSeedStatus()
}

/**
 * Called on selection changes.
 */
Torrent.prototype._updateSelections = function () {
  var self = this
  if (!self.ready || self.destroyed) return

  process.nextTick(function () {
    self._gcSelections()
  })
  self._updateInterest()
  self._update()
}

/**
 * Garbage collect selections with respect to the store's current state.
 */
Torrent.prototype._gcSelections = function () {
  var self = this

  for (var i = 0; i < self._selections.length; i++) {
    var s = self._selections[i]
    var oldOffset = s.offset

    // check for newly downloaded pieces in selection
    while (self.bitfield.get(s.from + s.offset) && s.from + s.offset < s.to) {
      s.offset++
    }

    if (oldOffset !== s.offset) s.notify()
    if (s.to !== s.from + s.offset) continue
    if (!self.bitfield.get(s.from + s.offset)) continue

    // remove fully downloaded selection
    self._selections.splice(i--, 1) // decrement i to offset splice
    s.notify() // TODO: this may notify twice in a row. is this a problem?
    self._updateInterest()
  }

  if (!self._selections.length) self.emit('idle')
}

/**
 * Update interested status for all peers.
 */
Torrent.prototype._updateInterest = function () {
  var self = this

  var prev = self._amInterested
  self._amInterested = !!self._selections.length

  self.wires.forEach(function (wire) {
    // TODO: only call wire.interested if the wire has at least one piece we need
    if (self._amInterested) wire.interested()
    else wire.uninterested()
  })

  if (prev === self._amInterested) return
  if (self._amInterested) self.emit('interested')
  else self.emit('uninterested')
}

/**
 * Heartbeat to update all peers and their requests.
 */
Torrent.prototype._update = function () {
  var self = this
  if (self.destroyed) return

  // update wires in random order for better request distribution
  var ite = randomIterate(self.wires)
  var wire
  while ((wire = ite())) {
    self._updateWire(wire)
  }
}

/**
 * Attempts to update a peer's requests
 */
Torrent.prototype._updateWire = function (wire) {
  var self = this

  if (wire.peerChoking) return
  if (!wire.downloaded) return validateWire()

  var minOutstandingRequests = getBlockPipelineLength(wire, PIPELINE_MIN_DURATION)
  if (wire.requests.length >= minOutstandingRequests) return
  var maxOutstandingRequests = getBlockPipelineLength(wire, PIPELINE_MAX_DURATION)

  trySelectWire(false) || trySelectWire(true)

  function genPieceFilterFunc (start, end, tried, rank) {
    return function (i) {
      return i >= start && i <= end && !(i in tried) && wire.peerPieces.get(i) && (!rank || rank(i))
    }
  }

  // TODO: Do we need both validateWire and trySelectWire?
  function validateWire () {
    if (wire.requests.length) return

    var i = self._selections.length
    while (i--) {
      var next = self._selections[i]
      var piece
      if (self.strategy === 'rarest') {
        var start = next.from + next.offset
        var end = next.to
        var len = end - start + 1
        var tried = {}
        var tries = 0
        var filter = genPieceFilterFunc(start, end, tried)

        while (tries < len) {
          piece = self._rarityMap.getRarestPiece(filter)
          if (piece < 0) break
          if (self._request(wire, piece, false)) return
          tried[piece] = true
          tries += 1
        }
      } else {
        for (piece = next.to; piece >= next.from + next.offset; --piece) {
          if (!wire.peerPieces.get(piece)) continue
          if (self._request(wire, piece, false)) return
        }
      }
    }

    // TODO: wire failed to validate as useful; should we close it?
    // probably not, since 'have' and 'bitfield' messages might be coming
  }

  function speedRanker () {
    var speed = wire.downloadSpeed() || 1
    if (speed > SPEED_THRESHOLD) return function () { return true }

    var secs = Math.max(1, wire.requests.length) * Piece.BLOCK_LENGTH / speed
    var tries = 10
    var ptr = 0

    return function (index) {
      if (!tries || self.bitfield.get(index)) return true

      var missing = self.pieces[index].missing

      for (; ptr < self.wires.length; ptr++) {
        var otherWire = self.wires[ptr]
        var otherSpeed = otherWire.downloadSpeed()

        if (otherSpeed < SPEED_THRESHOLD) continue
        if (otherSpeed <= speed) continue
        if (!otherWire.peerPieces.get(index)) continue
        if ((missing -= otherSpeed * secs) > 0) continue

        tries--
        return false
      }

      return true
    }
  }

  function shufflePriority (i) {
    var last = i
    for (var j = i; j < self._selections.length && self._selections[j].priority; j++) {
      last = j
    }
    var tmp = self._selections[i]
    self._selections[i] = self._selections[last]
    self._selections[last] = tmp
  }

  function trySelectWire (hotswap) {
    if (wire.requests.length >= maxOutstandingRequests) return true
    var rank = speedRanker()

    for (var i = 0; i < self._selections.length; i++) {
      var next = self._selections[i]

      var piece
      if (self.strategy === 'rarest') {
        var start = next.from + next.offset
        var end = next.to
        var len = end - start + 1
        var tried = {}
        var tries = 0
        var filter = genPieceFilterFunc(start, end, tried, rank)

        while (tries < len) {
          piece = self._rarityMap.getRarestPiece(filter)
          if (piece < 0) break

          // request all non-reserved blocks in this piece
          while (self._request(wire, piece, self._critical[piece] || hotswap)) {}

          if (wire.requests.length < maxOutstandingRequests) {
            tried[piece] = true
            tries++
            continue
          }

          if (next.priority) shufflePriority(i)
          return true
        }
      } else {
        for (piece = next.from + next.offset; piece <= next.to; piece++) {
          if (!wire.peerPieces.get(piece) || !rank(piece)) continue

          // request all non-reserved blocks in piece
          while (self._request(wire, piece, self._critical[piece] || hotswap)) {}

          if (wire.requests.length < maxOutstandingRequests) continue

          if (next.priority) shufflePriority(i)
          return true
        }
      }
    }

    return false
  }
}

/**
 * Called periodically to update the choked status of all peers, handling optimistic
 * unchoking as described in BEP3.
 */
Torrent.prototype._rechoke = function () {
  var self = this
  if (!self.ready) return

  if (self._rechokeOptimisticTime > 0) self._rechokeOptimisticTime -= 1
  else self._rechokeOptimisticWire = null

  var peers = []

  self.wires.forEach(function (wire) {
    if (!wire.isSeeder && wire !== self._rechokeOptimisticWire) {
      peers.push({
        wire: wire,
        downloadSpeed: wire.downloadSpeed(),
        uploadSpeed: wire.uploadSpeed(),
        salt: Math.random(),
        isChoked: true
      })
    }
  })

  peers.sort(rechokeSort)

  var unchokeInterested = 0
  var i = 0
  for (; i < peers.length && unchokeInterested < self._rechokeNumSlots; ++i) {
    peers[i].isChoked = false
    if (peers[i].wire.peerInterested) unchokeInterested += 1
  }

  // Optimistically unchoke a peer
  if (!self._rechokeOptimisticWire && i < peers.length && self._rechokeNumSlots) {
    var candidates = peers.slice(i).filter(function (peer) { return peer.wire.peerInterested })
    var optimistic = candidates[randomInt(candidates.length)]

    if (optimistic) {
      optimistic.isChoked = false
      self._rechokeOptimisticWire = optimistic.wire
      self._rechokeOptimisticTime = RECHOKE_OPTIMISTIC_DURATION
    }
  }

  // Unchoke best peers
  peers.forEach(function (peer) {
    if (peer.wire.amChoking !== peer.isChoked) {
      if (peer.isChoked) peer.wire.choke()
      else peer.wire.unchoke()
    }
  })

  function rechokeSort (peerA, peerB) {
    // Prefer higher download speed
    if (peerA.downloadSpeed !== peerB.downloadSpeed) {
      return peerB.downloadSpeed - peerA.downloadSpeed
    }

    // Prefer higher upload speed
    if (peerA.uploadSpeed !== peerB.uploadSpeed) {
      return peerB.uploadSpeed - peerA.uploadSpeed
    }

    // Prefer unchoked
    if (peerA.wire.amChoking !== peerB.wire.amChoking) {
      return peerA.wire.amChoking ? 1 : -1
    }

    // Random order
    return peerA.salt - peerB.salt
  }
}

/**
 * Attempts to cancel a slow block request from another wire such that the
 * given wire may effectively swap out the request for one of its own.
 */
Torrent.prototype._hotswap = function (wire, index) {
  var self = this

  var speed = wire.downloadSpeed()
  if (speed < Piece.BLOCK_LENGTH) return false
  if (!self._reservations[index]) return false

  var r = self._reservations[index]
  if (!r) {
    return false
  }

  var minSpeed = Infinity
  var minWire

  var i
  for (i = 0; i < r.length; i++) {
    var otherWire = r[i]
    if (!otherWire || otherWire === wire) continue

    var otherSpeed = otherWire.downloadSpeed()
    if (otherSpeed >= SPEED_THRESHOLD) continue
    if (2 * otherSpeed > speed || otherSpeed > minSpeed) continue

    minWire = otherWire
    minSpeed = otherSpeed
  }

  if (!minWire) return false

  for (i = 0; i < r.length; i++) {
    if (r[i] === minWire) r[i] = null
  }

  for (i = 0; i < minWire.requests.length; i++) {
    var req = minWire.requests[i]
    if (req.piece !== index) continue

    self.pieces[index].cancel((req.offset / Piece.BLOCK_LENGTH) | 0)
  }

  self.emit('hotswap', minWire, wire, index)
  return true
}

/**
 * Attempts to request a block from the given wire.
 */
Torrent.prototype._request = function (wire, index, hotswap) {
  var self = this
  var numRequests = wire.requests.length
  var isWebSeed = wire.type === 'webSeed'

  if (self.bitfield.get(index)) return false

  var maxOutstandingRequests = isWebSeed
    ? Math.min(
        getPiecePipelineLength(wire, PIPELINE_MAX_DURATION, self.pieceLength),
        self.maxWebConns
      )
    : getBlockPipelineLength(wire, PIPELINE_MAX_DURATION)

  if (numRequests >= maxOutstandingRequests) return false
  // var endGame = (wire.requests.length === 0 && self.store.numMissing < 30)

  var piece = self.pieces[index]
  var reservation = isWebSeed ? piece.reserveRemaining() : piece.reserve()

  if (reservation === -1 && hotswap && self._hotswap(wire, index)) {
    reservation = isWebSeed ? piece.reserveRemaining() : piece.reserve()
  }
  if (reservation === -1) return false

  var r = self._reservations[index]
  if (!r) r = self._reservations[index] = []
  var i = r.indexOf(null)
  if (i === -1) i = r.length
  r[i] = wire

  var chunkOffset = piece.chunkOffset(reservation)
  var chunkLength = isWebSeed ? piece.chunkLengthRemaining(reservation) : piece.chunkLength(reservation)

  wire.request(index, chunkOffset, chunkLength, function onChunk (err, chunk) {
    // TODO: what is this for?
    if (!self.ready) return self.once('ready', function () { onChunk(err, chunk) })

    if (r[i] === wire) r[i] = null

    if (piece !== self.pieces[index]) return onUpdateTick()

    if (err) {
      self._debug(
        'error getting piece %s (offset: %s length: %s) from %s: %s',
        index, chunkOffset, chunkLength, wire.remoteAddress + ':' + wire.remotePort,
        err.message
      )
      isWebSeed ? piece.cancelRemaining(reservation) : piece.cancel(reservation)
      onUpdateTick()
      return
    }

    self._debug(
      'got piece %s (offset: %s length: %s) from %s',
      index, chunkOffset, chunkLength, wire.remoteAddress + ':' + wire.remotePort
    )

    if (!piece.set(reservation, chunk, wire)) return onUpdateTick()

    var buf = piece.flush()

    // TODO: might need to set self.pieces[index] = null here since sha1 is async

    sha1(buf, function (hash) {
      if (hash === self._hashes[index]) {
        if (!self.pieces[index]) return
        self._debug('piece verified %s', index)

        self.pieces[index] = null
        self._reservations[index] = null
        self.bitfield.set(index, true)

        self.store.put(index, buf)

        self.wires.forEach(function (wire) {
          wire.have(index)
        })

        self._checkDone()
      } else {
        self.pieces[index] = new Piece(piece.length)
        self.emit('warning', new Error('Piece ' + index + ' failed verification'))
      }
      onUpdateTick()
    })
  })

  function onUpdateTick () {
    process.nextTick(function () { self._update() })
  }

  return true
}

Torrent.prototype._checkDone = function () {
  var self = this
  if (self.destroyed) return

  // are any new files done?
  self.files.forEach(function (file) {
    if (file.done) return
    for (var i = file._startPiece; i <= file._endPiece; ++i) {
      if (!self.bitfield.get(i)) return
    }
    file.done = true
    file.emit('done')
    self._debug('file done: ' + file.name)
  })

  // is the torrent done? (if all current selections are satisfied, or there are
  // no selections, then torrent is done)
  var done = true
  for (var i = 0; i < self._selections.length; i++) {
    var selection = self._selections[i]
    for (var piece = selection.from; piece <= selection.to; piece++) {
      if (!self.bitfield.get(piece)) {
        done = false
        break
      }
    }
    if (!done) break
  }
  if (!self.done && done) {
    self.done = true
    self._debug('torrent done: ' + self.infoHash)
    self.discovery.complete()
    self.emit('done')
  }

  self._gcSelections()
}

Torrent.prototype.load = function (streams, cb) {
  var self = this
  if (self.destroyed) throw new Error('torrent is destroyed')
  if (!self.ready) return self.once('ready', function () { self.load(streams, cb) })

  if (!Array.isArray(streams)) streams = [ streams ]
  if (!cb) cb = noop

  var readable = new MultiStream(streams)
  var writable = new ChunkStoreWriteStream(self.store, self.pieceLength)

  pump(readable, writable, function (err) {
    if (err) return cb(err)
    self.pieces.forEach(function (piece, index) {
      self.pieces[index] = null
      self._reservations[index] = null
      self.bitfield.set(index, true)
    })
    self._checkDone()
    cb(null)
  })
}

Torrent.prototype.createServer = function (opts) {
  if (typeof Server !== 'function') throw new Error('node.js-only method')
  if (this.destroyed) throw new Error('torrent is destroyed')
  var server = new Server(this, opts)
  this._servers.push(server)
  return server
}

Torrent.prototype.pause = function () {
  if (this.destroyed) return
  this._debug('pause')
  this.paused = true
}

Torrent.prototype.resume = function () {
  if (this.destroyed) return
  this._debug('resume')
  this.paused = false
  this._drain()
}

Torrent.prototype._debug = function () {
  var args = [].slice.call(arguments)
  args[0] = '[' + this._debugId + '] ' + args[0]
  debug.apply(null, args)
}

/**
 * Pop a peer off the FIFO queue and connect to it. When _drain() gets called,
 * the queue will usually have only one peer in it, except when there are too
 * many peers (over `this.maxConns`) in which case they will just sit in the
 * queue until another connection closes.
 */
Torrent.prototype._drain = function () {
  var self = this
  this._debug('_drain numConns %s maxConns %s', self._numConns, self.client.maxConns)
  if (typeof net.connect !== 'function' || self.destroyed || self.paused ||
      self._numConns >= self.client.maxConns) {
    return
  }
  this._debug('drain (%s queued, %s/%s peers)', self._numQueued, self.numPeers, self.client.maxConns)

  var peer = self._queue.shift()
  if (!peer) return // queue could be empty

  this._debug('tcp connect attempt to %s', peer.addr)

  var parts = addrToIPPort(peer.addr)
  var opts = {
    host: parts[0],
    port: parts[1]
  }

  var conn = peer.conn = net.connect(opts)

  conn.once('connect', function () { peer.onConnect() })
  conn.once('error', function (err) { peer.destroy(err) })
  peer.startConnectTimeout()

  // When connection closes, attempt reconnect after timeout (with exponential backoff)
  conn.on('close', function () {
    if (self.destroyed) return

    // TODO: If torrent is done, do not try to reconnect after a timeout

    if (peer.retries >= RECONNECT_WAIT.length) {
      self._debug(
        'conn %s closed: will not re-add (max %s attempts)',
        peer.addr, RECONNECT_WAIT.length
      )
      return
    }

    var ms = RECONNECT_WAIT[peer.retries]
    self._debug(
      'conn %s closed: will re-add to queue in %sms (attempt %s)',
      peer.addr, ms, peer.retries + 1
    )

    var reconnectTimeout = setTimeout(function reconnectTimeout () {
      var newPeer = self._addPeer(peer.addr)
      if (newPeer) newPeer.retries = peer.retries + 1
    }, ms)
    if (reconnectTimeout.unref) reconnectTimeout.unref()
  })
}

/**
 * Returns `true` if string is valid IPv4/6 address.
 * @param {string} addr
 * @return {boolean}
 */
Torrent.prototype._validAddr = function (addr) {
  var parts
  try {
    parts = addrToIPPort(addr)
  } catch (e) {
    return false
  }
  var host = parts[0]
  var port = parts[1]
  return port > 0 && port < 65535 &&
    !(host === '127.0.0.1' && port === this.client.torrentPort)
}

function getBlockPipelineLength (wire, duration) {
  return 2 + Math.ceil(duration * wire.downloadSpeed() / Piece.BLOCK_LENGTH)
}

function getPiecePipelineLength (wire, duration, pieceLength) {
  return 1 + Math.ceil(duration * wire.downloadSpeed() / pieceLength)
}

/**
 * Returns a random integer in [0,high)
 */
function randomInt (high) {
  return Math.random() * high | 0
}

function noop () {}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../package.json":142,"./file":137,"./peer":138,"./rarity-map":139,"./server":19,"_process":22,"addr-to-ip-port":4,"bitfield":11,"chunk-store-stream/write":26,"debug":32,"events":42,"fs":21,"fs-chunk-store":65,"immediate-chunk-store":55,"inherits":56,"multistream":74,"net":19,"os":19,"parse-torrent":79,"path":80,"pump":83,"random-iterate":88,"run-parallel":101,"run-parallel-limit":100,"simple-get":106,"simple-sha1":108,"speedometer":110,"torrent-discovery":123,"torrent-piece":124,"uniq":127,"ut_metadata":131,"ut_pex":19,"xtend":144,"xtend/mutable":145}],141:[function(require,module,exports){
module.exports = WebConn

var BitField = require('bitfield')
var Buffer = require('safe-buffer').Buffer
var debug = require('debug')('webtorrent:webconn')
var get = require('simple-get')
var inherits = require('inherits')
var sha1 = require('simple-sha1')
var Wire = require('bittorrent-protocol')

var VERSION = require('../package.json').version

inherits(WebConn, Wire)

/**
 * Converts requests for torrent blocks into http range requests.
 * @param {string} url web seed url
 * @param {Object} torrent
 */
function WebConn (url, torrent) {
  Wire.call(this)

  this.url = url
  this.webPeerId = sha1.sync(url)
  this._torrent = torrent

  this._init()
}

WebConn.prototype._init = function () {
  var self = this
  self.setKeepAlive(true)

  self.once('handshake', function (infoHash, peerId) {
    if (self.destroyed) return
    self.handshake(infoHash, self.webPeerId)
    var numPieces = self._torrent.pieces.length
    var bitfield = new BitField(numPieces)
    for (var i = 0; i <= numPieces; i++) {
      bitfield.set(i, true)
    }
    self.bitfield(bitfield)
  })

  self.once('interested', function () {
    debug('interested')
    self.unchoke()
  })

  self.on('uninterested', function () { debug('uninterested') })
  self.on('choke', function () { debug('choke') })
  self.on('unchoke', function () { debug('unchoke') })
  self.on('bitfield', function () { debug('bitfield') })

  self.on('request', function (pieceIndex, offset, length, callback) {
    debug('request pieceIndex=%d offset=%d length=%d', pieceIndex, offset, length)
    self.httpRequest(pieceIndex, offset, length, callback)
  })
}

WebConn.prototype.httpRequest = function (pieceIndex, offset, length, cb) {
  var self = this
  var pieceOffset = pieceIndex * self._torrent.pieceLength
  var rangeStart = pieceOffset + offset /* offset within whole torrent */
  var rangeEnd = rangeStart + length - 1

  // Web seed URL format:
  // For single-file torrents, make HTTP range requests directly to the web seed URL
  // For multi-file torrents, add the torrent folder and file name to the URL
  var files = self._torrent.files
  var requests
  if (files.length <= 1) {
    requests = [{
      url: self.url,
      start: rangeStart,
      end: rangeEnd
    }]
  } else {
    var requestedFiles = files.filter(function (file) {
      return file.offset <= rangeEnd && (file.offset + file.length) > rangeStart
    })
    if (requestedFiles.length < 1) {
      return cb(new Error('Could not find file corresponnding to web seed range request'))
    }

    requests = requestedFiles.map(function (requestedFile) {
      var fileEnd = requestedFile.offset + requestedFile.length - 1
      var url = self.url +
        (self.url[self.url.length - 1] === '/' ? '' : '/') +
        requestedFile.path
      return {
        url: url,
        fileOffsetInRange: Math.max(requestedFile.offset - rangeStart, 0),
        start: Math.max(rangeStart - requestedFile.offset, 0),
        end: Math.min(fileEnd, rangeEnd - requestedFile.offset)
      }
    })
  }

  // Now make all the HTTP requests we need in order to load this piece
  // Usually that's one requests, but sometimes it will be multiple
  // Send requests in parallel and wait for them all to come back
  var numRequestsSucceeded = 0
  var hasError = false

  var ret
  if (requests.length > 1) {
    ret = Buffer.alloc(length)
  }

  requests.forEach(function (request) {
    var url = request.url
    var start = request.start
    var end = request.end
    debug(
      'Requesting url=%s pieceIndex=%d offset=%d length=%d start=%d end=%d',
      url, pieceIndex, offset, length, start, end
    )
    var opts = {
      url: url,
      method: 'GET',
      headers: {
        'user-agent': 'WebTorrent/' + VERSION + ' (https://webtorrent.io)',
        range: 'bytes=' + start + '-' + end
      }
    }
    function onResponse (res, data) {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        hasError = true
        return cb(new Error('Unexpected HTTP status code ' + res.statusCode))
      }
      debug('Got data of length %d', data.length)

      if (requests.length === 1) {
        // Common case: fetch piece in a single HTTP request, return directly
        cb(null, data)
      } else {
        // Rare case: reconstruct multiple HTTP requests across 2+ files into one
        // piece buffer
        data.copy(ret, request.fileOffsetInRange)
        if (++numRequestsSucceeded === requests.length) {
          cb(null, ret)
        }
      }
    }
    get.concat(opts, function (err, res, data) {
      if (hasError) return
      if (err) {
        // Browsers allow HTTP redirects for simple cross-origin
        // requests but not for requests that require preflight.
        // Use a simple request to unravel any redirects and get the
        // final URL.  Retry the original request with the new URL if
        // it's different.
        //
        // This test is imperfect but it's simple and good for common
        // cases.  It catches all cross-origin cases but matches a few
        // same-origin cases too.
        if (typeof window === 'undefined' || url.startsWith(window.location.origin + '/')) {
          hasError = true
          return cb(err)
        }

        return get.head(url, function (errHead, res) {
          if (hasError) return
          if (errHead) {
            hasError = true
            return cb(errHead)
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            hasError = true
            return cb(new Error('Unexpected HTTP status code ' + res.statusCode))
          }
          if (res.url === url) {
            hasError = true
            return cb(err)
          }

          opts.url = res.url
          get.concat(opts, function (err, res, data) {
            if (hasError) return
            if (err) {
              hasError = true
              return cb(err)
            }
            onResponse(res, data)
          })
        })
      }
      onResponse(res, data)
    })
  })
}

WebConn.prototype.destroy = function () {
  Wire.prototype.destroy.call(this)
  this._torrent = null
}

},{"../package.json":142,"bitfield":11,"bittorrent-protocol":12,"debug":32,"inherits":56,"safe-buffer":103,"simple-get":106,"simple-sha1":108}],142:[function(require,module,exports){
module.exports={
  "version": "0.97.2"
}
},{}],143:[function(require,module,exports){
// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}

},{}],144:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],145:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend(target) {
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],146:[function(require,module,exports){
var bel = require('bel') // turns template tag into DOM elements
var morphdom = require('morphdom') // efficiently diffs + morphs two DOM elements
var defaultEvents = require('./update-events.js') // default events to be copied when dom elements update

module.exports = bel

// TODO move this + defaultEvents to a new module once we receive more feedback
module.exports.update = function (fromNode, toNode, opts) {
  if (!opts) opts = {}
  if (opts.events !== false) {
    if (!opts.onBeforeElUpdated) opts.onBeforeElUpdated = copier
  }

  return morphdom(fromNode, toNode, opts)

  // morphdom only copies attributes. we decided we also wanted to copy events
  // that can be set via attributes
  function copier (f, t) {
    // copy events:
    var events = opts.events || defaultEvents
    for (var i = 0; i < events.length; i++) {
      var ev = events[i]
      if (t[ev]) { // if new element has a whitelisted attribute
        f[ev] = t[ev] // update existing element
      } else if (f[ev]) { // if existing element has it and new one doesnt
        f[ev] = undefined // remove it from existing element
      }
    }
    // copy values for form elements
    if ((f.nodeName === 'INPUT' && f.type !== 'file') || f.nodeName === 'SELECT') {
      if (t.getAttribute('value') === null) t.value = f.value
    } else if (f.nodeName === 'TEXTAREA') {
      if (t.getAttribute('value') === null) f.value = t.value
    }
  }
}

},{"./update-events.js":147,"bel":6,"morphdom":66}],147:[function(require,module,exports){
module.exports = [
  // attribute events (can be set with attributes)
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmousemove',
  'onmouseout',
  'ondragstart',
  'ondrag',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondrop',
  'ondragend',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onunload',
  'onabort',
  'onerror',
  'onresize',
  'onscroll',
  'onselect',
  'onchange',
  'onsubmit',
  'onreset',
  'onfocus',
  'onblur',
  'oninput',
  // other common events
  'oncontextmenu',
  'onfocusin',
  'onfocusout'
]

},{}],148:[function(require,module,exports){
/**
 * Given a number, return a zero-filled string.
 * From http://stackoverflow.com/questions/1267283/
 * @param  {number} width
 * @param  {number} number
 * @return {string}
 */
module.exports = function zeroFill (width, number, pad) {
  if (number === undefined) {
    return function (number, pad) {
      return zeroFill(width, number, pad)
    }
  }
  if (pad === undefined) pad = '0'
  width -= number.toString().length
  if (width > 0) return new Array(width + (/\./.test(number) ? 2 : 1)).join(pad) + number
  return number + ''
}

},{}]},{},[3]);
