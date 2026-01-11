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
      z-index: 2147483644;
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
      z-index: 2147483645;
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
  
  function createPropertyRow(name, value, isColor = false) {
    const displayValue = value || 'none';
    const colorPreview = isColor && displayValue !== 'none' ? 
      `<span class="csi-color-swatch" style="background: ${displayValue}"></span>` : '';
    
    return `
      <div class="csi-prop-row">
        <span class="csi-prop-name">${name}</span>
        <div class="csi-prop-value-wrap">
          ${colorPreview}
          <span class="csi-prop-value">${displayValue}</span>
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
  
  function renderInspector(el) {
    const styles = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const html = el.outerHTML;
    
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
        `)}
        
        ${createSection('🎨', 'Colors', `
          ${createPropertyRow('color', styles.color, true)}
          ${createPropertyRow('background', styles.backgroundColor, true)}
          ${createPropertyRow('border-color', styles.borderColor, true)}
        `)}
        
        ${createSection('📐', 'Spacing & Size', `
          ${createPropertyRow('width', styles.width)}
          ${createPropertyRow('height', styles.height)}
          ${createPropertyRow('padding', styles.padding)}
          ${createPropertyRow('margin', styles.margin)}
          ${createPropertyRow('border', styles.border)}
          ${createPropertyRow('border-radius', styles.borderRadius)}
        `)}
        
        ${createSection('📦', 'Layout', `
          ${createPropertyRow('display', styles.display)}
          ${createPropertyRow('position', styles.position)}
          ${createPropertyRow('z-index', styles.zIndex)}
          ${createPropertyRow('flex-direction', styles.flexDirection)}
          ${createPropertyRow('justify-content', styles.justifyContent)}
          ${createPropertyRow('align-items', styles.alignItems)}
          ${createPropertyRow('gap', styles.gap)}
        `)}
        
        ${createSection('✨', 'Effects', `
          ${createPropertyRow('opacity', styles.opacity)}
          ${createPropertyRow('box-shadow', styles.boxShadow)}
          ${createPropertyRow('transform', styles.transform)}
          ${createPropertyRow('transition', styles.transition)}
        `)}
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
            return val ? `
              <div class="csi-prop-row" data-prop="${prop}">
                <span class="csi-prop-name">${prop}</span>
                <div class="csi-prop-value-wrap">
                  <span class="csi-prop-value">${val}</span>
                  <button class="csi-copy-btn" data-copy="${prop}: ${val};" title="Copy">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ` : '';
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
        body.querySelectorAll('.csi-computed-list .csi-prop-row').forEach(row => {
          row.style.display = row.dataset.prop.includes(q) ? 'flex' : 'none';
        });
      };
    }
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
})();
