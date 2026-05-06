(function () {
  if (typeof window === "undefined") return;
  if (typeof window.lcpCopyTextToClipboard === "function") return;

  function fallbackCopyUsingExecCommand(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();

    var copied = false;
    try {
      var doc = /** @type {any} */ (document);
      copied = !!doc.execCommand("copy");
    } catch (_) {
      copied = false;
    }

    document.body.removeChild(ta);
    return copied;
  }

  window.lcpCopyTextToClipboard = async function (text) {
    if (!text) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {
      // Continue to legacy fallback.
    }

    return fallbackCopyUsingExecCommand(text);
  };
})();
