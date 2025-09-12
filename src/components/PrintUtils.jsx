// Solid-aware helpers
import { createSignal, onMount, onCleanup } from "solid-js";

/** Paginate: pecah items ke beberapa halaman */
export function splitIntoPages(items, firstPageRows, otherPageRows) {
  const res = [];
  const first = Math.min(items.length, firstPageRows);
  res.push(items.slice(0, first));
  for (let i = first; i < items.length; i += otherPageRows) {
    res.push(items.slice(i, i + otherPageRows));
  }
  if (res.length === 0) res.push([]);
  return res;
}

/** Versi dengan offset agar nomor item lanjut otomatis */
export function splitIntoPagesWithOffsets(items, firstPageRows, otherPageRows) {
  const pages = splitIntoPages(items, firstPageRows, otherPageRows);
  let offset = 0;
  return pages.map(p => {
    const entry = { items: p, offset };
    offset += p.length;
    return entry;
  });
}

/**
 * createStretch: hitung baris kosong (filler) supaya tabel pas A4.
 * Dipanggil DI DALAM komponen per-halaman (agar ikut lifecycle Solid).
 *
 * Usage:
 *   const { extraRows, bind, recalc } = createStretch({ fudge: 25 });
 *   <div ref={bind('pageRef')}> ... </div>
 *   <table ref={bind('tableRef')}> ...
 *   <thead ref={bind('theadRef')}> ...
 *   <tbody ref={bind('tbodyRef')}> ...
 *   <tfoot ref={bind('tfootRef')}> ...
 *   <tr ref={bind('measureRowRef')}> (di tabel hidden measurer)
 */
export function createStretch(opts = {}) {
  const fudge = opts.fudge ?? 25;        // “buffer” agar aman di berbagai printer
  const [extraRows, setExtraRows] = createSignal(0);
  const refs = {
    pageRef: null, tableRef: null, theadRef: null, tbodyRef: null,
    tfootRef: null, measureRowRef: null
  };

  const bind = (key) => (el) => { refs[key] = el; };

  const recalc = () => {
    requestAnimationFrame(() => {
      const { pageRef, tableRef, theadRef, tbodyRef, tfootRef, measureRowRef } = refs;
      if (!pageRef || !tableRef || !theadRef || !tbodyRef || !tfootRef) return;

      const pageRect  = pageRef.getBoundingClientRect();
      const tableRect = tableRef.getBoundingClientRect();

      const pageHeight = pageRef.clientHeight;
      const distanceTop = tableRect.top - pageRect.top;
      const spaceFromTableStartToBottom = pageHeight - distanceTop;

      const headH  = theadRef.offsetHeight || 0;
      const footH  = tfootRef.offsetHeight || 0;
      const bodyH  = tbodyRef.offsetHeight || 0;

      const availableForBody = spaceFromTableStartToBottom - headH - footH;

      let rowH = measureRowRef?.offsetHeight || 20;
      if (rowH <= 0) rowH = 20;

      const remaining = Math.floor(availableForBody - bodyH);
      const need = Math.ceil((remaining - fudge) / rowH);
      setExtraRows(Math.max(0, need));
    });
  };

  onMount(() => {
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("beforeprint", recalc);
  });
  onCleanup(() => {
    window.removeEventListener("resize", recalc);
    window.removeEventListener("beforeprint", recalc);
  });

  return { extraRows, bind, recalc };
}
