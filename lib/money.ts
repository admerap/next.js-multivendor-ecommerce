const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Money is stored as integer cents (CLAUDE.md §6). `money(115900)` → "$1,159.00". */
export function money(cents: number): string {
  return usd.format(cents / 100);
}
