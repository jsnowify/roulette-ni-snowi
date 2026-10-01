/** Webviews may omit or reject Clipboard API. */
export async function copyText(text: string): Promise<boolean> {
  const legacyCopy = () => {
    const active = document.activeElement;
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
    document.body.append(input);
    input.select();
    input.setSelectionRange(0, text.length);
    try { return document.execCommand("copy"); }
    catch { return false; }
    finally {
      input.remove();
      if (active instanceof HTMLElement) active.focus({ preventScroll: true });
    }
  };
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* Try the fallback when browser permissions reject the API. */ }
  return legacyCopy();
}
