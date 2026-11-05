const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Money is stored as integer cents (CLAUDE.md §6). `money(115900)` → "$1,159.00". */
export function money(cents: number): string {
  return usd.format(cents / 100);
}

/** An amount taken off (discount, commission): "−$4.00" with a true minus; zero stays "$0.00". */
export const moneyOff = (cents: number): string => (cents > 0 ? `−${money(cents)}` : money(0));
