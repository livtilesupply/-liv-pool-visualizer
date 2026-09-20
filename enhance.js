(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  var pic = hero && hero.querySelector(':scope > img');
  var area = document.querySelector('.choiceArea');
  if (!hero || !pic || !area) return;

  var baseSource = '';
  var scale = 1, tx = 0, ty = 0;
  var pointers = new Map(), dragLast = null, pinchStart = 0, pinchScale = 1;

  var tools = document.createElement('div');
  tools.className = 'photoTools';
  tools.innerHTML =
    '<strong>Pool photo</strong>' +
    '<small>Use the demo photo or upload a customer photo. Choose all materials first, then generate one AI preview.</small>' +
    '<div class="toolRow">' +
      '<label class="uploadBtn" for="poolPhoto">UPLOAD POOL PHOTO</label>' +
      '<input id="poolPhoto" type="file" accept="image/*" style="display:none">' +
      '<button class="secondaryBtn" id="demoPhoto" type="button">USE DEMO PHOTO</button>' +
      '<button class="generateBtn" id="generatePool" type="button">GENERATE MY POOL</button>' +
    '</div>' +
    '<div class="selectionState" id="selectionState">Ready. Choose your finish, tile, deck and yard.</div>';
  area.prepend(tools);

  var input = tools.querySelector('#poolPhoto');
  var demoBtn = tools.querySelector('#demoPhoto');
  var generateBtn = tools.querySelector('#generatePool');
  var state = tools.querySelector('#selectionState');

  function setState(message, kind) {
    state.className = 'selectionState' + (kind ? ' ' + kind : '');
    state.textContent = message;
  }

  function resetView() {
    scale = 1; tx = 0; ty = 0;
    applyView();
  }

  function resizePhoto(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var image = new Image();
        image.onload = function () {
          var max = 1800;
          var ratio = Math.min(1, max / Math.max(image.width, image.height));
          var width = Math.round(image.width * ratio);
          var height = Math.round(image.height * ratio);
          var canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        };
        image.onerror = reject;
        image.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  input.addEventListener('change', async function () {
    if (!input.files || !input.files[0]) return;
    setState('Preparing your pool photo...');
    try {
      baseSource = await resizePhoto(input.files[0]);
      pic.src = baseSource;
      resetView();
      setState('Photo ready. Choose materials, then tap Generate My Pool.', 'ok');
    } catch (e) {
      setState('Could not load that photo. Try a JPG or PNG.', 'error');
    }
  });

  demoBtn.addEventListener('click', function () {
    baseSource = '';
    pic.src = '/hero.jpg?v=20260920';
    resetView();
    setState('Demo photo restored. Choose materials, then tap Generate My Pool.', 'ok');
  });

  function selected(name) {
    return document.querySelector('input[name="' + name + '"]:checked');
  }

  function labelFor(name) {
    var item = selected(name);
    return item ? document.querySelector('label[for="' + item.id + '"]') : null;
  }

  function labelText(name) {
    var label = labelFor(name);
    if (!label) return '';
    var bold = label.querySelector('b');
    return (bold ? bold.textContent : label.textContent).trim();
  }

  function labelImage(name) {
    var label = labelFor(name);
    var image = label && label.querySelector('img');
    return image ? image.src : '';
  }

  function payload() {
    return {
      sourceImage: baseSource,
      finish: labelText('finish'),
      finishImage: labelImage('finish'),
      tile: labelText('tile'),
      tileImage: labelImage('tile'),
      deck: labelText('deck'),
      deckImage: labelImage('deck'),
      yard: labelText('yard')
    };
  }

  function syncSelected() {
    document.querySelectorAll('label.card').forEach(function (label) {
      label.classList.remove('liv-selected');
    });
    ['finish', 'tile', 'deck', 'yard'].forEach(function (name) {
      var item = selected(name);
      if (!item) return;
      var label = document.querySelector('label[for="' + item.id + '"]');
      if (label) label.classList.add('liv-selected');
    });
  }

  document.addEventListener('change', function (event) {
    if (event.target && ['finish', 'tile', 'deck', 'yard'].indexOf(event.target.name) >= 0) {
      syncSelected();
      setState('Selections updated. Tap Generate My Pool when you are ready.');
    }
  });
  syncSelected();

  generateBtn.addEventListener('click', async function () {
    if (generateBtn.disabled) return;
    generateBtn.disabled = true;
    demoBtn.disabled = true;
    hero.classList.add('rendering');
    setState('Generating one photorealistic preview. This can take a little while...');
    try {
      var response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload())
      });
      var result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Render failed.');
      pic.src = result.image;
      resetView();
      setState('Preview complete. Change materials and generate again to compare.', 'ok');
    } catch (e) {
      setState(e.message || 'The preview could not be generated.', 'error');
    } finally {
      hero.classList.remove('rendering');
      generateBtn.disabled = false;
      demoBtn.disabled = false;
    }
  });

  var finder = document.createElement('div');
  finder.className = 'aiFinishFinder';
  finder.innerHTML =
    '<strong>Do not see your plaster option?</strong>' +
    '<div class="aiFinishRow">' +
      '<input id="finishSearch" autocomplete="off" placeholder="Example: PebbleTec Aqua Blue">' +
      '<button id="findFinish" type="button">FIND WITH AI</button>' +
    '</div>' +
    '<div class="customFinishResult" id="finishResult"></div>';

  var finishPhase = document.querySelector('.p1');
  var finishContinue = finishPhase && finishPhase.querySelector('.continue');
  if (finishPhase) finishPhase.insertBefore(finder, finishContinue || null);

  var searchInput = finder.querySelector('#finishSearch');
  var searchBtn = finder.querySelector('#findFinish');
  var searchResult = finder.querySelector('#finishResult');

  searchBtn.addEventListener('click', async function () {
    var query = searchInput.value.trim();
    if (!query) {
      searchInput.focus();
      return;
    }
    searchBtn.disabled = true;
    searchBtn.textContent = 'FINDING...';
    searchResult.textContent = 'Searching for that finish...';
    try {
      var response = await fetch('/api/find-plaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query })
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lookup failed.');

      var old = document.getElementById('customFinish');
      if (old) old.remove();

      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'finish';
      radio.id = 'customFinish';
      radio.checked = true;
      document.body.appendChild(radio);

      searchResult.innerHTML =
        '<label class="card liv-selected" for="customFinish">' +
          '<div class="sw customSw"></div><b></b><span></span>' +
          (data.sourceUrl ? '<div class="customSource"><a target="_blank" rel="noopener">SOURCE</a></div>' : '') +
        '</label>';
      searchResult.querySelector('b').textContent = data.name;
      searchResult.querySelector('span').textContent =
        (data.brand || data.family || 'Custom finish') +
        (data.description ? ' - ' + data.description : '');
      var sourceLink = searchResult.querySelector('.customSource a');
      if (sourceLink) sourceLink.href = data.sourceUrl;

      radio.dispatchEvent(new Event('change', { bubbles: true }));
      setState('Custom finish added. Tap Generate My Pool when ready.', 'ok');
    } catch (e) {
      searchResult.textContent = e.message || 'Could not find that finish.';
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = 'FIND WITH AI';
    }
  });

  searchInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchBtn.click();
    }
  });

  function applyView() {
    pic.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + scale + ')';
  }

  function clampScale(value) {
    return Math.max(1, Math.min(4, value));
  }

  function zoomBy(factor) {
    var next = clampScale(scale * factor);
    if (next === 1) {
      tx = 0; ty = 0;
    }
    scale = next;
    applyView();
  }

  var zoom = document.createElement('div');
  zoom.className = 'zoomTools';
  zoom.innerHTML =
    '<button type="button" aria-label="Zoom in">+</button>' +
    '<button type="button" aria-label="Zoom out">-</button>' +
    '<button type="button" aria-label="Reset zoom" class="resetZoom">1:1</button>';
  hero.appendChild(zoom);

  var zoomButtons = zoom.querySelectorAll('button');
  zoomButtons[0].addEventListener('click', function (e) { e.stopPropagation(); zoomBy(1.25); });
  zoomButtons[1].addEventListener('click', function (e) { e.stopPropagation(); zoomBy(0.8); });
  zoomButtons[2].addEventListener('click', function (e) { e.stopPropagation(); resetView(); });

  hero.addEventListener('wheel', function (event) {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.12 : 0.89);
  }, { passive: false });

  hero.addEventListener('pointerdown', function (event) {
    if (event.target.closest && event.target.closest('.zoomTools')) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    hero.setPointerCapture(event.pointerId);
    if (pointers.size === 1) {
      dragLast = { x: event.clientX, y: event.clientY };
      hero.classList.add('dragging');
    } else if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      pinchStart = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchScale = scale;
      dragLast = null;
    }
  });

  hero.addEventListener('pointermove', function (event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      var distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchStart > 0) {
        scale = clampScale(pinchScale * (distance / pinchStart));
        applyView();
      }
      return;
    }

    if (pointers.size === 1 && dragLast && scale > 1) {
      tx += event.clientX - dragLast.x;
      ty += event.clientY - dragLast.y;
      dragLast = { x: event.clientX, y: event.clientY };
      applyView();
    }
  });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size === 0) {
      dragLast = null;
      hero.classList.remove('dragging');
    }
  }
  hero.addEventListener('pointerup', endPointer);
  hero.addEventListener('pointercancel', endPointer);

  var dimSelects = document.querySelectorAll('details.dims select');
  var dimGrid = document.querySelector('.dimgrid');
  var deckWidth = document.createElement('select');
  deckWidth.innerHTML =
    '<option>3 ft</option><option selected>4 ft</option><option>5 ft</option><option>6 ft</option>';

  if (dimGrid) {
    var deckLabel = document.createElement('label');
    deckLabel.textContent = 'Deck width';
    deckLabel.appendChild(deckWidth);
    dimGrid.appendChild(deckLabel);
  }

  function updateEstimate() {
    if (dimSelects.length < 2) return;
    var length = parseFloat(dimSelects[0].value) || 24;
    var width = parseFloat(dimSelects[1].value) || 12;
    var deck = parseFloat(deckWidth.value) || 4;
    var perimeter = 2 * (length + width);
    var tileSqFt = perimeter * 0.5 * 1.10;
    var deckSqFt = ((length + 2 * deck) * (width + 2 * deck) - length * width) * 1.10;
    var values = document.querySelectorAll('.estimate .row b');
    if (values[0]) values[0].textContent = '~' + Math.ceil(tileSqFt) + ' sq ft incl. waste';
    if (values[1]) values[1].textContent = '~' + Math.ceil(deckSqFt) + ' sq ft incl. waste';
    if (values[2]) values[2].textContent = '~' + Math.ceil(perimeter) + ' ln ft';
  }

  dimSelects.forEach(function (select) { select.addEventListener('change', updateEstimate); });
  deckWidth.addEventListener('change', updateEstimate);
  updateEstimate();

  var legal = document.createElement('div');
  legal.className = 'legalDisclaimer';
  legal.textContent =
    'Visualizer disclaimer: AI previews are approximations for design inspiration. Actual material color, texture, scale, water color, lighting and installed appearance can differ, and screens display color differently. Verify current product specifications and physical samples before ordering or installation.';
  area.appendChild(legal);
})();