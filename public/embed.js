/*
 * Expert Fence — embed loader (v1)
 *
 * Pasted onto a third-party store page like:
 *   <script src="https://app.ef.com.au/embed.js"
 *           data-key="YOUR-TOKEN"
 *           data-calc="aluminium"></script>
 *
 * Responsibilities:
 *   - Build an iframe pointing at /embed/<token>/<calc>
 *   - Listen for EF_HEIGHT messages and resize the iframe
 *   - Forward EF_ADD_TO_CART messages to a global window event so the
 *     store-side cart bridge snippet can act on them.
 *
 * The Add-to-Cart bridge (which actually calls WooCommerce) is a separate
 * snippet — see /docs/embed-woo-snippet.html in the repo.
 */
(function () {
  var script = document.currentScript;
  if (!script) {
    // Fallback for older script-loading paths.
    var all = document.getElementsByTagName('script');
    for (var i = all.length - 1; i >= 0; i--) {
      if (/embed\.js(\?|$)/.test(all[i].src)) { script = all[i]; break; }
    }
  }
  if (!script) return;

  var token = script.getAttribute('data-key');
  var calc  = script.getAttribute('data-calc') || 'aluminium';
  if (!token) {
    console.warn('[ExpertFence] embed.js: missing data-key attribute');
    return;
  }

  // Origin of the host app — derived from the script's own src so the same
  // embed.js works across staging / production.
  var srcUrl = new URL(script.src, window.location.href);
  var APP_ORIGIN = srcUrl.origin;

  var iframeUrl = APP_ORIGIN + '/embed/' + encodeURIComponent(token) + '/' + encodeURIComponent(calc);

  // Container — placed where the script tag lives.
  var container = document.createElement('div');
  container.setAttribute('data-ef-embed', token);
  container.style.cssText = 'width:100%;max-width:100%;margin:0;padding:0;';

  var iframe = document.createElement('iframe');
  iframe.src = iframeUrl;
  iframe.title = 'Expert Fence Calculator';
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.style.cssText = 'width:100%;border:0;display:block;min-height:600px;background:#f8fafc;';

  container.appendChild(iframe);
  script.parentNode.insertBefore(container, script);

  // Resize the iframe based on EF_HEIGHT messages from the calculator.
  // Forward EF_ADD_TO_CART to a CustomEvent the store-side bridge listens for.
  window.addEventListener('message', function (event) {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.source !== iframe.contentWindow) return;

    if (event.data.type === 'EF_HEIGHT' && typeof event.data.height === 'number') {
      var h = Math.max(600, Math.min(4000, event.data.height));
      if (Math.abs(iframe.offsetHeight - h) > 4) iframe.style.height = h + 'px';
      return;
    }

    if (event.data.type === 'EF_ADD_TO_CART') {
      window.dispatchEvent(new CustomEvent('ef:add-to-cart', {
        detail: {
          token: event.data.token,
          items: event.data.items || [],
        },
      }));
      return;
    }

    if (event.data.type === 'EF_READY') {
      window.dispatchEvent(new CustomEvent('ef:ready', { detail: { token: event.data.token } }));
      return;
    }
  });
})();
