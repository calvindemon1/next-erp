export function extractCorakList(items) {
  const raw = Array.isArray(items) ? items : items ? [items] : [];
  const vals = raw
    .map((it) => typeof it === "string" ? it : (it?.corak_kain ?? "").toString())
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(vals));
}

/**
 * overflow: "ellipsis" -> tampil "A, B, C, ..."
 * (opsional) "plusCount" -> tampil "A, B, C +N lainnya"
 */
export function formatCorak(items, opts = {}) {
  const {
    maxShow = 3,
    joiner = ", ",
    countLabel = "lainnya",
    overflow = "ellipsis",
  } = opts;

  const list = extractCorakList(items);
  if (list.length === 0) return { display: "-", full: "", list, hasOverflow: false };

  const full = list.join(joiner);
  if (list.length <= maxShow) {
    return { display: full, full, list, hasOverflow: false };
  }

  const shown = list.slice(0, maxShow).join(joiner);
  const display =
    overflow === "ellipsis"
      ? `${shown}${joiner}...`
      : `${shown} +${list.length - maxShow} ${countLabel}`;

  return { display, full, list, hasOverflow: true };
}
