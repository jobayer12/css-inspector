// CSS Inspector Pro - Content Script
(function() {
  if (window.CSSInspector) return;
  
  let isActive = false;
  let panel = null;
  let hoverOverlay = null;
  let hoverLabel = null;
  let selectOverlay = null;
  let selectLabel = null;
  let selectedElement = null;
  let copiedTimeout = null;
  let addedProperties = {}; // Track added properties per element
  let styleHistory = []; // Track style changes
  let historyIndex = -1; // Current position in history
  let originalStyles = new Map(); // Store original styles for each element

  window.CSSInspector = { toggle };
  
  function toggle() {
    isActive ? deactivate() : activate();
  }
  
  function activate() {
    isActive = true;
    createOverlays();
    createPanel();
    addListeners();
  }
  
  function deactivate() {
    isActive = false;
    removeElements();
    removeListeners();
    selectedElement = null;
  }
  
  function removeElements() {
    [panel, hoverOverlay, hoverLabel, selectOverlay, selectLabel].forEach(el => el?.remove());
    panel = hoverOverlay = hoverLabel = selectOverlay = selectLabel = null;
  }
  
  function addListeners() {
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', updateSelectPosition, true);
    window.addEventListener('resize', updateSelectPosition, true);
  }
  
  function removeListeners() {
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('scroll', updateSelectPosition, true);
    window.removeEventListener('resize', updateSelectPosition, true);
  }
  
  function createHoverElements() {
    // Hover box (purple border)
    hoverOverlay = document.createElement('div');
    hoverOverlay.id = 'csi-hover-box';
    hoverOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px solid #8b5cf6;
      background: rgba(139, 92, 246, 0.1);
      z-index: 2147483646;
      display: none;
      box-sizing: border-box;
    `;
    document.body.appendChild(hoverOverlay);
    
    // Hover label
    hoverLabel = document.createElement('div');
    hoverLabel.id = 'csi-hover-label';
    hoverLabel.style.cssText = `
      position: absolute;
      pointer-events: none;
      background: #8b5cf6;
      color: white;
      font-family: Monaco, Menlo, Consolas, monospace;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 0 0 4px 4px;
      z-index: 2147483647;
      display: none;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(hoverLabel);
  }
  
  function createSelectElements() {
    // Select box (pink border, stays visible)
    selectOverlay = document.createElement('div');
    selectOverlay.id = 'csi-select-box';
    selectOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px solid #e91e8a;
      background: rgba(233, 30, 138, 0.1);
      z-index: 2147483630;
      display: none;
      box-sizing: border-box;
    `;
    document.body.appendChild(selectOverlay);

    // Select label
    selectLabel = document.createElement('div');
    selectLabel.id = 'csi-select-label';
    selectLabel.style.cssText = `
      position: absolute;
      pointer-events: none;
      background: #e91e8a;
      color: white;
      font-family: Monaco, Menlo, Consolas, monospace;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 0 0 4px 4px;
      z-index: 2147483631;
      display: none;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(selectLabel);
  }
  
  function createOverlays() {
    createHoverElements();
    createSelectElements();
  }
  
  function createElement(tag, className) {
    const el = document.createElement(tag);
    el.className = className;
    return el;
  }
  
  function createPanel() {
    panel = createElement('div', 'csi-panel');
    panel.innerHTML = `
      <div class="csi-panel-header">
        <div class="csi-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="url(#grad)"/>
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#6366f1"/>
                <stop offset="100%" style="stop-color:#8b5cf6"/>
              </linearGradient>
            </defs>
            <text x="12" y="16" font-size="10" fill="white" text-anchor="middle" font-weight="bold">Aa</text>
          </svg>
          <span>CSS Inspector</span>
        </div>
        <div class="csi-header-btns">
          <button class="csi-btn-icon" id="csi-export-menu" title="Export Styles">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button class="csi-btn-icon" id="csi-copy-all" title="Copy All Styles">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="csi-btn-icon" id="csi-close" title="Close (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="csi-export-dropdown" id="csi-export-dropdown" style="display: none;">
          <button class="csi-dropdown-item" id="csi-export-css">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            Export as CSS File
          </button>
          <button class="csi-dropdown-item" id="csi-generate-class">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            Generate CSS Class
          </button>
          <button class="csi-dropdown-item" id="csi-copy-selector">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            Copy Full Selector Path
          </button>
        </div>
      </div>
      <div class="csi-panel-body">
        <div class="csi-empty-state">
          <div class="csi-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
            </svg>
          </div>
          <h3>Click to Inspect</h3>
          <p>Hover over any element and click to inspect its styles</p>
          <div class="csi-shortcut"><kbd>Esc</kbd> to close</div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    
    panel.querySelector('#csi-close').onclick = deactivate;
    panel.querySelector('#csi-copy-all').onclick = copyAllStyles;

    // Export menu toggle
    const exportBtn = panel.querySelector('#csi-export-menu');
    const exportDropdown = panel.querySelector('#csi-export-dropdown');
    exportBtn.onclick = (e) => {
      e.stopPropagation();
      const isVisible = exportDropdown.style.display === 'block';
      exportDropdown.style.display = isVisible ? 'none' : 'block';
    };

    // Export dropdown items
    panel.querySelector('#csi-export-css').onclick = (e) => {
      e.stopPropagation();
      exportDropdown.style.display = 'none';
      exportAsCSS();
    };
    panel.querySelector('#csi-generate-class').onclick = (e) => {
      e.stopPropagation();
      exportDropdown.style.display = 'none';
      generateCSSClass();
    };
    panel.querySelector('#csi-copy-selector').onclick = (e) => {
      e.stopPropagation();
      exportDropdown.style.display = 'none';
      copyFullSelector();
    };

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      if (exportDropdown) exportDropdown.style.display = 'none';
    });

    panel.addEventListener('mousedown', e => e.stopPropagation(), true);
    panel.addEventListener('mousemove', e => e.stopPropagation(), true);
  }
  
  function getElementSelector(el) {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    let cls = '';
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).slice(0, 2);
      cls = classes.length ? '.' + classes.join('.') : '';
    }
    let selector = tag + id + cls;
    return selector.length > 50 ? selector.slice(0, 50) + '...' : selector;
  }
  
  function isInspectorElement(el) {
    if (!el) return false;
    const id = el.id || '';
    return id === 'csi-hover-box' || id === 'csi-hover-label' || id === 'csi-select-box' || id === 'csi-select-label' || el.closest('.csi-panel');
  }
  
  function positionElement(overlay, label, rect, show = true) {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    if (show) {
      overlay.style.left = (rect.left + scrollX) + 'px';
      overlay.style.top = (rect.top + scrollY) + 'px';
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
      overlay.style.display = 'block';
      
      label.style.left = (rect.left + scrollX) + 'px';
      label.style.top = (rect.bottom + scrollY + 4) + 'px';
      label.style.display = 'flex';
    } else {
      overlay.style.display = 'none';
      label.style.display = 'none';
    }
  }
  
  function onMouseMove(e) {
    if (!isActive) return;
    
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isInspectorElement(el)) {
      hoverOverlay.style.display = 'none';
      hoverLabel.style.display = 'none';
      return;
    }
    
    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    // Position hover box
    hoverOverlay.style.left = (rect.left + scrollX) + 'px';
    hoverOverlay.style.top = (rect.top + scrollY) + 'px';
    hoverOverlay.style.width = rect.width + 'px';
    hoverOverlay.style.height = rect.height + 'px';
    hoverOverlay.style.display = 'block';
    
    // Position hover label below element
    hoverLabel.innerHTML = `<span style="display:inline-block;width:16px;height:16px;background:rgba(255,255,255,0.2);border-radius:3px;text-align:center;line-height:16px;margin-right:6px;font-style:italic;font-family:serif;">T</span>${getElementSelector(el)} <span style="opacity:0.7;margin-left:8px;font-size:10px;">${Math.round(rect.width)} × ${Math.round(rect.height)}</span>`;
    hoverLabel.style.left = (rect.left + scrollX) + 'px';
    hoverLabel.style.top = (rect.bottom + scrollY) + 'px';
    hoverLabel.style.display = 'block';
  }
  
  function onClick(e) {
    if (!isActive) return;
    
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isInspectorElement(el)) return;
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    selectedElement = el;
    
    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    // Position select box
    selectOverlay.style.left = (rect.left + scrollX) + 'px';
    selectOverlay.style.top = (rect.top + scrollY) + 'px';
    selectOverlay.style.width = rect.width + 'px';
    selectOverlay.style.height = rect.height + 'px';
    selectOverlay.style.display = 'block';
    
    // Position select label
    selectLabel.innerHTML = `<span style="display:inline-block;width:16px;height:16px;background:rgba(255,255,255,0.2);border-radius:3px;text-align:center;line-height:16px;margin-right:6px;font-style:italic;font-family:serif;">✓</span>${getElementSelector(el)}`;
    selectLabel.style.left = (rect.left + scrollX) + 'px';
    selectLabel.style.top = (rect.bottom + scrollY) + 'px';
    selectLabel.style.display = 'block';
    
    renderInspector(el);
    return false;
  }
  
  function updateSelectPosition() {
    if (!selectedElement || !selectOverlay) return;
    
    const rect = selectedElement.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    selectOverlay.style.left = (rect.left + scrollX) + 'px';
    selectOverlay.style.top = (rect.top + scrollY) + 'px';
    selectOverlay.style.width = rect.width + 'px';
    selectOverlay.style.height = rect.height + 'px';
    
    selectLabel.style.left = (rect.left + scrollX) + 'px';
    selectLabel.style.top = (rect.bottom + scrollY) + 'px';
  }
  
  function onKeyDown(e) {
    if (e.key === 'Escape') deactivate();
  }
  
  function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      btn.classList.add('copied');
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
      }, 1500);
    });
  }
  
  function createPropertyRow(name, value, isColor = false, editable = true) {
    const displayValue = value || 'none';
    const hasColorPicker = isColor && displayValue !== 'none';

    // Check if this property should have a dropdown
    const dropdownOptions = getDropdownOptions(name);
    const hasDropdown = dropdownOptions && dropdownOptions.length > 0;

    // Reorder options to show current value first
    let orderedOptions = dropdownOptions;
    if (hasDropdown && displayValue) {
      orderedOptions = [...dropdownOptions];
      const currentIndex = orderedOptions.indexOf(displayValue);
      if (currentIndex > -1) {
        // Move current value to the top
        orderedOptions.splice(currentIndex, 1);
        orderedOptions.unshift(displayValue);
      } else {
        // Current value not in list, add it at the top
        orderedOptions.unshift(displayValue);
      }
    }

    return `
      <div class="csi-prop-row">
        <span class="csi-prop-name">${name}</span>
        <div class="csi-prop-value-wrap">
          ${hasColorPicker ?
            `<input type="color" class="csi-color-picker" data-property="${name}" value="${rgbToHex(displayValue)}" title="Pick color">` :
            ''
          }
          ${editable && hasDropdown ?
            `<select class="csi-prop-select" data-property="${name}" title="Select or type custom value">
              ${orderedOptions.map(opt => `<option value="${opt}" ${opt === displayValue ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>` :
            editable ?
            `<input type="text" class="csi-prop-input" data-property="${name}" value="${displayValue}" title="Click to edit">` :
            `<span class="csi-prop-value">${displayValue}</span>`
          }
          <button class="csi-copy-btn" data-copy="${name}: ${displayValue};" title="Copy">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  function getDropdownOptions(property) {
    const options = {
      'font-weight': ['100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold', 'bolder', 'lighter'],
      'font-style': ['normal', 'italic', 'oblique'],
      'text-align': ['left', 'center', 'right', 'justify', 'start', 'end'],
      'text-transform': ['none', 'capitalize', 'uppercase', 'lowercase'],
      'text-decoration': ['none', 'underline', 'overline', 'line-through'],
      'display': ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'none', 'table', 'table-row', 'table-cell'],
      'position': ['static', 'relative', 'absolute', 'fixed', 'sticky'],
      'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
      'justify-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
      'align-items': ['flex-start', 'flex-end', 'center', 'baseline', 'stretch'],
      'align-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'stretch'],
      'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
      'overflow': ['visible', 'hidden', 'scroll', 'auto'],
      'overflow-x': ['visible', 'hidden', 'scroll', 'auto'],
      'overflow-y': ['visible', 'hidden', 'scroll', 'auto'],
      'cursor': ['auto', 'default', 'pointer', 'wait', 'text', 'move', 'not-allowed', 'help', 'crosshair', 'grab', 'grabbing'],
      'visibility': ['visible', 'hidden', 'collapse'],
      'white-space': ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line'],
      'word-break': ['normal', 'break-all', 'keep-all', 'break-word'],
      'box-sizing': ['content-box', 'border-box'],
      'float': ['none', 'left', 'right'],
      'clear': ['none', 'left', 'right', 'both'],
    };

    return options[property] || null;
  }

  // All available CSS properties with their categories
  function getAllCSSProperties() {
    return {
      'Typography': ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration', 'text-indent', 'word-spacing'],
      'Colors': ['color', 'background-color', 'border-color', 'outline-color'],
      'Spacing & Size': ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
      'Border': ['border', 'border-width', 'border-style', 'border-color', 'border-radius', 'border-top', 'border-right', 'border-bottom', 'border-left', 'outline', 'outline-width', 'outline-style'],
      'Layout': ['display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'gap', 'row-gap', 'column-gap', 'flex', 'flex-grow', 'flex-shrink', 'flex-basis', 'order', 'grid-template-columns', 'grid-template-rows', 'grid-gap'],
      'Effects': ['opacity', 'box-shadow', 'text-shadow', 'transform', 'transition', 'animation', 'filter', 'backdrop-filter'],
      'Other': ['overflow', 'overflow-x', 'overflow-y', 'cursor', 'visibility', 'white-space', 'word-break', 'box-sizing', 'float', 'clear', 'object-fit', 'pointer-events']
    };
  }

  // Check if a property is a color property
  function isColorProperty(property) {
    const colorProps = ['color', 'background-color', 'border-color', 'outline-color', 'background'];
    return colorProps.includes(property);
  }

  function rgbToHex(color) {
    // If already hex, return it
    if (color.startsWith('#')) {
      return color.length === 7 ? color : '#000000';
    }

    // Convert rgb/rgba to hex
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
      const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
      const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }

    // Named colors or other formats - return black as fallback
    return '#000000';
  }
  
  function createSection(icon, title, content) {
    return `
      <div class="csi-section">
        <div class="csi-section-header">
          <span class="csi-section-icon">${icon}</span>
          <span class="csi-section-title">${title}</span>
        </div>
        <div class="csi-section-body">${content}</div>
      </div>
    `;
  }

  function createBoxModel(el, styles) {
    const margin = {
      top: parseFloat(styles.marginTop) || 0,
      right: parseFloat(styles.marginRight) || 0,
      bottom: parseFloat(styles.marginBottom) || 0,
      left: parseFloat(styles.marginLeft) || 0
    };
    const border = {
      top: parseFloat(styles.borderTopWidth) || 0,
      right: parseFloat(styles.borderRightWidth) || 0,
      bottom: parseFloat(styles.borderBottomWidth) || 0,
      left: parseFloat(styles.borderLeftWidth) || 0
    };
    const padding = {
      top: parseFloat(styles.paddingTop) || 0,
      right: parseFloat(styles.paddingRight) || 0,
      bottom: parseFloat(styles.paddingBottom) || 0,
      left: parseFloat(styles.paddingLeft) || 0
    };
    const rect = el.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    return `
      <div class="csi-box-diagram">
        <div class="csi-box-layer csi-box-margin">
          <div class="csi-box-label">margin</div>
          <div class="csi-box-edge csi-edge-top">${Math.round(margin.top)}</div>
          <div class="csi-box-edge csi-edge-right">${Math.round(margin.right)}</div>
          <div class="csi-box-edge csi-edge-bottom">${Math.round(margin.bottom)}</div>
          <div class="csi-box-edge csi-edge-left">${Math.round(margin.left)}</div>

          <div class="csi-box-layer csi-box-border">
            <div class="csi-box-label">border</div>
            <div class="csi-box-edge csi-edge-top">${Math.round(border.top)}</div>
            <div class="csi-box-edge csi-edge-right">${Math.round(border.right)}</div>
            <div class="csi-box-edge csi-edge-bottom">${Math.round(border.bottom)}</div>
            <div class="csi-box-edge csi-edge-left">${Math.round(border.left)}</div>

            <div class="csi-box-layer csi-box-padding">
              <div class="csi-box-label">padding</div>
              <div class="csi-box-edge csi-edge-top">${Math.round(padding.top)}</div>
              <div class="csi-box-edge csi-edge-right">${Math.round(padding.right)}</div>
              <div class="csi-box-edge csi-edge-bottom">${Math.round(padding.bottom)}</div>
              <div class="csi-box-edge csi-edge-left">${Math.round(padding.left)}</div>

              <div class="csi-box-content">
                <div class="csi-box-size">${width} × ${height}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function getElementKey(el) {
    // Create a unique key for the element
    if (!el) return null;
    if (el.id) return `#${el.id}`;

    // Use element reference as key
    if (!el.__csi_uid) {
      el.__csi_uid = 'csi_' + Math.random().toString(36).substring(2, 11);
    }
    return el.__csi_uid;
  }

  function getExistingProperties() {
    if (!selectedElement) return [];
    const existing = new Set();

    // Add all properties from the styles panel
    const commonProps = [
      'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
      'text-align', 'text-transform', 'text-decoration', 'color', 'background-color', 'border-color',
      'width', 'height', 'padding', 'margin', 'border', 'border-radius',
      'display', 'position', 'z-index', 'flex-direction', 'justify-content', 'align-items', 'gap',
      'opacity', 'box-shadow', 'transform', 'transition'
    ];

    commonProps.forEach(prop => existing.add(prop));

    // Add properties that were added dynamically
    const elementKey = getElementKey(selectedElement);
    if (elementKey && addedProperties[elementKey]) {
      Object.keys(addedProperties[elementKey]).forEach(prop => existing.add(prop));
    }

    return Array.from(existing);
  }

  function getAddedPropertiesForCategory(category) {
    if (!selectedElement) return '';

    const elementKey = getElementKey(selectedElement);
    if (!elementKey || !addedProperties[elementKey]) return '';

    const allProps = getAllCSSProperties();
    const categoryProps = allProps[category] || [];
    const styles = window.getComputedStyle(selectedElement);

    let html = '';
    categoryProps.forEach(prop => {
      if (addedProperties[elementKey][prop]) {
        const value = styles.getPropertyValue(prop) || addedProperties[elementKey][prop];
        const isColor = isColorProperty(prop);
        html += createPropertyRow(prop, value, isColor);
      }
    });

    return html;
  }

  function getAvailableProperties() {
    const existing = new Set(getExistingProperties());
    const allProps = getAllCSSProperties();
    const available = [];

    Object.keys(allProps).forEach(category => {
      allProps[category].forEach(prop => {
        if (!existing.has(prop)) {
          available.push({ category, property: prop });
        }
      });
    });

    return available;
  }

  function renderInspector(el) {
    const styles = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const html = el.outerHTML;

    // Helper to create section only if it has content
    const createSectionIfHasContent = (icon, title, content) => {
      const trimmedContent = content.trim();
      return trimmedContent ? createSection(icon, title, trimmedContent) : '';
    };

    const body = panel.querySelector('.csi-panel-body');
    body.innerHTML = `
      <div class="csi-element-info">
        <div class="csi-element-tag">${getElementSelector(el)}</div>
        <div class="csi-element-dims">${Math.round(rect.width)} × ${Math.round(rect.height)}</div>
      </div>

      <div class="csi-tabs">
        <button class="csi-tab active" data-tab="styles">Styles</button>
        <button class="csi-tab" data-tab="computed">All Properties</button>
        <button class="csi-tab" data-tab="html">HTML</button>
      </div>

      <div class="csi-tab-panel active" data-panel="styles">
        ${createSection('🔤', 'Typography', `
          ${createPropertyRow('font-family', styles.fontFamily)}
          ${createPropertyRow('font-size', styles.fontSize)}
          ${createPropertyRow('font-weight', styles.fontWeight)}
          ${createPropertyRow('line-height', styles.lineHeight)}
          ${createPropertyRow('letter-spacing', styles.letterSpacing)}
          ${createPropertyRow('text-align', styles.textAlign)}
          ${createPropertyRow('text-transform', styles.textTransform)}
          ${getAddedPropertiesForCategory('Typography')}
        `)}

        ${createSection('🎨', 'Colors', `
          ${createPropertyRow('color', styles.color, true)}
          ${createPropertyRow('background', styles.backgroundColor, true)}
          ${createPropertyRow('border-color', styles.borderColor, true)}
          ${getAddedPropertiesForCategory('Colors')}
        `)}

        ${createSection('📦', 'Box Model', createBoxModel(el, styles))}

        ${createSection('📐', 'Spacing & Size', `
          ${createPropertyRow('width', styles.width)}
          ${createPropertyRow('height', styles.height)}
          ${createPropertyRow('padding', styles.padding)}
          ${createPropertyRow('margin', styles.margin)}
          ${createPropertyRow('border', styles.border)}
          ${createPropertyRow('border-radius', styles.borderRadius)}
          ${getAddedPropertiesForCategory('Spacing & Size')}
        `)}

        ${createSectionIfHasContent('📏', 'Border', getAddedPropertiesForCategory('Border'))}

        ${createSection('📦', 'Layout', `
          ${createPropertyRow('display', styles.display)}
          ${createPropertyRow('position', styles.position)}
          ${createPropertyRow('z-index', styles.zIndex)}
          ${createPropertyRow('flex-direction', styles.flexDirection)}
          ${createPropertyRow('justify-content', styles.justifyContent)}
          ${createPropertyRow('align-items', styles.alignItems)}
          ${createPropertyRow('gap', styles.gap)}
          ${getAddedPropertiesForCategory('Layout')}
        `)}

        ${createSection('✨', 'Effects', `
          ${createPropertyRow('opacity', styles.opacity)}
          ${createPropertyRow('box-shadow', styles.boxShadow)}
          ${createPropertyRow('transform', styles.transform)}
          ${createPropertyRow('transition', styles.transition)}
          ${getAddedPropertiesForCategory('Effects')}
        `)}

        ${createSectionIfHasContent('🔧', 'Other', getAddedPropertiesForCategory('Other'))}

        <div class="csi-add-property-section" id="csi-add-property-container">
          <div class="csi-add-property-btn" id="csi-add-property-btn">
            <span class="csi-add-btn-text">Add other CSS element</span>
            <button class="csi-add-btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div class="csi-tab-panel" data-panel="computed">
        <div class="csi-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="csi-search" placeholder="Search properties...">
        </div>
        <div class="csi-computed-list">
          ${Array.from(styles).sort().map(prop => {
            const val = styles.getPropertyValue(prop);
            if (!val) return '';

            // Check if this is a color property
            const isColor = prop.includes('color') || prop.includes('background-color') || prop.includes('border-color') || prop.includes('fill') || prop.includes('stroke');

            // Create a wrapper div with data-prop for search functionality
            return `<div data-prop="${prop}">${createPropertyRow(prop, val, isColor, true)}</div>`;
          }).join('')}
        </div>
      </div>
      
      <div class="csi-tab-panel" data-panel="html">
        <div class="csi-html-wrap">
          <pre class="csi-html-code">${escapeHtml(formatHtml(html))}</pre>
        </div>
        <button class="csi-copy-html-btn" data-copy="${escapeAttr(html)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy HTML
        </button>
      </div>
    `;
    
    // Tab switching
    body.querySelectorAll('.csi-tab').forEach(tab => {
      tab.onclick = (e) => {
        e.stopPropagation();
        body.querySelectorAll('.csi-tab').forEach(t => t.classList.remove('active'));
        body.querySelectorAll('.csi-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        body.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add('active');
      };
    });
    
    // Copy buttons
    body.querySelectorAll('.csi-copy-btn, .csi-copy-html-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        copyToClipboard(btn.dataset.copy, btn);
      };
    });
    
    // Search
    const search = body.querySelector('.csi-search');
    if (search) {
      search.oninput = (e) => {
        const q = e.target.value.toLowerCase();
        body.querySelectorAll('.csi-computed-list > div[data-prop]').forEach(wrapper => {
          wrapper.style.display = wrapper.dataset.prop.includes(q) ? 'block' : 'none';
        });
      };
    }

    // CSS Property Editing
    body.querySelectorAll('.csi-prop-input').forEach(input => {
      // Update on input (real-time)
      input.oninput = (e) => {
        e.stopPropagation();
        const property = input.dataset.property;
        const value = input.value;
        if (selectedElement) {
          selectedElement.style[toCamelCase(property)] = value;
          updateSelectPosition();
        }
      };

      // Prevent clicks from propagating
      input.onclick = (e) => {
        e.stopPropagation();
      };

      // Handle Enter key
      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          input.blur();
        }
        e.stopPropagation();
      };
    });

    // Color Picker Editing
    body.querySelectorAll('.csi-color-picker').forEach(picker => {
      // Update on color change (real-time)
      picker.oninput = (e) => {
        e.stopPropagation();
        const property = picker.dataset.property;
        const value = picker.value;
        if (selectedElement) {
          selectedElement.style[toCamelCase(property)] = value;

          // Update the corresponding text input if it exists
          const textInput = picker.parentElement.querySelector('.csi-prop-input');
          if (textInput) {
            textInput.value = value;
          }

          updateSelectPosition();
        }
      };

      // Prevent clicks from propagating
      picker.onclick = (e) => {
        e.stopPropagation();
      };
    });

    // Select Dropdown Editing
    body.querySelectorAll('.csi-prop-select').forEach(select => {
      // Update on change
      select.onchange = (e) => {
        e.stopPropagation();
        const property = select.dataset.property;
        const value = select.value;
        if (selectedElement) {
          selectedElement.style[toCamelCase(property)] = value;
          updateSelectPosition();
        }
      };

      // Prevent clicks from propagating
      select.onclick = (e) => {
        e.stopPropagation();
      };
    });

    // Add Property Button Handler
    const addPropertyBtn = body.querySelector('#csi-add-property-btn');
    if (addPropertyBtn) {
      addPropertyBtn.onclick = (e) => {
        e.stopPropagation();
        showAddPropertyForm();
      };
    }
  }

  function showAddPropertyForm() {
    const container = panel.querySelector('#csi-add-property-container');
    if (!container) return;

    const availableProps = getAvailableProperties();
    if (availableProps.length === 0) {
      container.innerHTML = `
        <div class="csi-add-property-empty">
          All common CSS properties are already displayed above!
        </div>
      `;
      return;
    }

    // Group properties by category for the dropdown
    const allProps = getAllCSSProperties();
    let optionsHTML = '<option value="">Select a CSS property...</option>';

    Object.keys(allProps).forEach(category => {
      const categoryProps = allProps[category].filter(prop => {
        return availableProps.some(ap => ap.property === prop);
      });

      if (categoryProps.length > 0) {
        optionsHTML += `<optgroup label="${category}">`;
        categoryProps.forEach(prop => {
          optionsHTML += `<option value="${prop}">${prop}</option>`;
        });
        optionsHTML += '</optgroup>';
      }
    });

    container.innerHTML = `
      <div class="csi-add-property-form">
        <div class="csi-add-form-row">
          <div class="csi-add-form-left">
            <select class="csi-add-property-select" id="csi-new-property-select">
              ${optionsHTML}
            </select>
          </div>
          <div class="csi-add-form-right" id="csi-new-property-input-container">
            <span class="csi-add-placeholder">Select a property first</span>
          </div>
        </div>
        <div class="csi-add-form-actions">
          <button class="csi-add-cancel-btn" id="csi-add-cancel">Cancel</button>
          <button class="csi-add-apply-btn" id="csi-add-apply" disabled>Add Property</button>
        </div>
      </div>
    `;

    // Setup event handlers
    const propertySelect = container.querySelector('#csi-new-property-select');
    const inputContainer = container.querySelector('#csi-new-property-input-container');
    const applyBtn = container.querySelector('#csi-add-apply');
    const cancelBtn = container.querySelector('#csi-add-cancel');

    propertySelect.onchange = (e) => {
      e.stopPropagation();
      const selectedProp = e.target.value;

      if (!selectedProp) {
        inputContainer.innerHTML = '<span class="csi-add-placeholder">Select a property first</span>';
        applyBtn.disabled = true;
        return;
      }

      applyBtn.disabled = false;

      // Check if this property has dropdown options
      const dropdownOptions = getDropdownOptions(selectedProp);
      const isColor = isColorProperty(selectedProp);

      if (dropdownOptions && dropdownOptions.length > 0) {
        // Render dropdown
        inputContainer.innerHTML = `
          <select class="csi-add-value-select" id="csi-new-property-value">
            ${dropdownOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
          </select>
        `;
      } else if (isColor) {
        // Render color picker with text input
        inputContainer.innerHTML = `
          <div class="csi-add-color-wrapper">
            <input type="color" class="csi-add-color-picker" id="csi-new-property-color" value="#000000">
            <input type="text" class="csi-add-value-input csi-add-color-input" id="csi-new-property-value" value="#000000" placeholder="Enter value...">
          </div>
        `;

        // Sync color picker with text input
        const colorPicker = inputContainer.querySelector('#csi-new-property-color');
        const textInput = inputContainer.querySelector('#csi-new-property-value');

        colorPicker.oninput = (e) => {
          e.stopPropagation();
          textInput.value = e.target.value;
        };

        textInput.oninput = (e) => {
          e.stopPropagation();
          if (e.target.value.startsWith('#')) {
            colorPicker.value = e.target.value;
          }
        };

        colorPicker.onclick = (e) => e.stopPropagation();
        textInput.onclick = (e) => e.stopPropagation();
      } else {
        // Render text input
        inputContainer.innerHTML = `
          <input type="text" class="csi-add-value-input" id="csi-new-property-value" placeholder="Enter value..." autofocus>
        `;

        const textInput = inputContainer.querySelector('#csi-new-property-value');
        textInput.onclick = (e) => e.stopPropagation();
      }

      // Stop propagation on all selects
      inputContainer.querySelectorAll('select').forEach(select => {
        select.onclick = (e) => e.stopPropagation();
      });
    };

    propertySelect.onclick = (e) => e.stopPropagation();

    applyBtn.onclick = (e) => {
      e.stopPropagation();
      const selectedProp = propertySelect.value;
      const valueInput = container.querySelector('#csi-new-property-value');

      if (!selectedProp || !valueInput) return;

      const value = valueInput.value;
      if (!value) return;

      // Apply the CSS property to the selected element
      if (selectedElement) {
        selectedElement.style[toCamelCase(selectedProp)] = value;
        updateSelectPosition();

        // Track the added property
        const elementKey = getElementKey(selectedElement);
        if (elementKey) {
          if (!addedProperties[elementKey]) {
            addedProperties[elementKey] = {};
          }
          addedProperties[elementKey][selectedProp] = value;
        }
      }

      // Re-render the inspector to show the new property
      renderInspector(selectedElement);
    };

    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      container.innerHTML = `
        <div class="csi-add-property-btn" id="csi-add-property-btn">
          <span class="csi-add-btn-text">Add other CSS element</span>
          <button class="csi-add-btn-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      `;

      const newAddBtn = container.querySelector('#csi-add-property-btn');
      newAddBtn.onclick = (e) => {
        e.stopPropagation();
        showAddPropertyForm();
      };
    };
  }

  function toCamelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }
  
  function copyAllStyles() {
    if (!selectedElement) return;
    const s = window.getComputedStyle(selectedElement);
    const props = ['font-family','font-size','font-weight','line-height','letter-spacing',
      'color','background-color','width','height','padding','margin','border','border-radius',
      'display','position','flex-direction','justify-content','align-items','gap',
      'box-shadow','opacity','transform'];
    
    let css = `/* ${getElementSelector(selectedElement)} */\n{\n`;
    props.forEach(p => {
      const v = s.getPropertyValue(p);
      if (v && v !== 'none' && v !== 'normal' && v !== 'auto') {
        css += `  ${p}: ${v};\n`;
      }
    });
    css += '}';
    
    const btn = panel.querySelector('#csi-copy-all');
    copyToClipboard(css, btn);
  }
  
  function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  
  function escapeAttr(s) {
    return s.replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  
  function formatHtml(html) {
    let result = '', indent = 0;
    html.replace(/></g, '>\n<').split('\n').forEach(line => {
      line = line.trim();
      if (!line) return;
      if (line.match(/^<\/\w/) && indent > 0) indent--;
      result += '  '.repeat(indent) + line + '\n';
      if (line.match(/^<\w[^>]*[^\/]>/) && !line.match(/^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)/i) && !line.includes('</')) indent++;
    });
    return result.trim();
  }

  // ===== Export Functions =====
  function getFullSelector(el) {
    if (!el || el === document.body) return 'body';

    const names = [];
    while (el && el !== document.body) {
      let name = el.tagName.toLowerCase();

      if (el.id) {
        name += '#' + el.id;
        names.unshift(name);
        break;
      } else if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).filter(c => !c.startsWith('csi-'));
        if (classes.length > 0) {
          name += '.' + classes.join('.');
        }
      }

      // Add nth-child if no id or class
      if (!el.id && (!el.className || el.className.length === 0)) {
        const parent = el.parentElement;
        if (parent) {
          const children = Array.from(parent.children).filter(c => c.tagName === el.tagName);
          if (children.length > 1) {
            const index = children.indexOf(el) + 1;
            name += `:nth-child(${index})`;
          }
        }
      }

      names.unshift(name);
      el = el.parentElement;
    }

    return names.join(' > ');
  }

  function exportAsCSS() {
    if (!selectedElement) {
      alert('Please select an element first');
      return;
    }

    const styles = window.getComputedStyle(selectedElement);
    const selector = getFullSelector(selectedElement);

    // Get all relevant CSS properties
    const props = [
      'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
      'text-align', 'text-transform', 'text-decoration', 'color', 'background-color',
      'background', 'border-color', 'width', 'height', 'min-width', 'min-height',
      'max-width', 'max-height', 'padding', 'padding-top', 'padding-right', 'padding-bottom',
      'padding-left', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'border', 'border-width', 'border-style', 'border-radius', 'display', 'position',
      'top', 'right', 'bottom', 'left', 'z-index', 'flex-direction', 'flex-wrap',
      'justify-content', 'align-items', 'align-content', 'gap', 'flex', 'opacity',
      'box-shadow', 'text-shadow', 'transform', 'transition', 'overflow', 'cursor'
    ];

    let css = `/* Exported from CSS Inspector Pro */\n/* ${new Date().toLocaleString()} */\n\n${selector} {\n`;

    props.forEach(prop => {
      const value = styles.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'normal' && value !== 'auto' && value !== 'rgba(0, 0, 0, 0)') {
        css += `  ${prop}: ${value};\n`;
      }
    });

    css += '}\n';

    // Download as file
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `styles-${Date.now()}.css`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('CSS file downloaded!');
  }

  function generateCSSClass() {
    if (!selectedElement) {
      alert('Please select an element first');
      return;
    }

    const styles = window.getComputedStyle(selectedElement);
    const tag = selectedElement.tagName.toLowerCase();
    const className = `${tag}-style-${Date.now()}`;

    const props = [
      'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
      'text-align', 'text-transform', 'text-decoration', 'color', 'background-color',
      'border-color', 'width', 'height', 'padding', 'margin', 'border', 'border-radius',
      'display', 'position', 'z-index', 'flex-direction', 'justify-content', 'align-items',
      'gap', 'opacity', 'box-shadow', 'transform', 'transition'
    ];

    let css = `.${className} {\n`;

    props.forEach(prop => {
      const value = styles.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'normal' && value !== 'auto' && value !== 'rgba(0, 0, 0, 0)') {
        css += `  ${prop}: ${value};\n`;
      }
    });

    css += '}';

    navigator.clipboard.writeText(css).then(() => {
      showNotification(`CSS class ".${className}" copied to clipboard!`);
    });
  }

  function copyFullSelector() {
    if (!selectedElement) {
      alert('Please select an element first');
      return;
    }

    const selector = getFullSelector(selectedElement);
    navigator.clipboard.writeText(selector).then(() => {
      showNotification('Full CSS selector copied!');
    });
  }

  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'csi-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
      z-index: 2147483647;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
})();
