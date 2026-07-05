// Static exchange rate table (USD base). Per spec: "Basic currency conversion
// (USD base, local display)" — not live rates. Update this table periodically
// (e.g. monthly) rather than calling a paid FX API on every job card render.
const USD_RATES: Record<string, number> = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
};

export function convertFromUSD(amountUsd: number, toCurrency: string): number {
  const rate = USD_RATES[toCurrency] ?? 1;
  return Math.round(amountUsd * rate);
}

export function convertToUSD(amount: number, fromCurrency: string): number {
  const rate = USD_RATES[fromCurrency] ?? 1;
  return Math.round(amount / rate);
}

export function formatSalary(min: number | null, max: number | null, currency: string): string {
  if (!min && !max) return "Not disclosed";
  const symbols: Record<string, string> = { USD: "$", INR: "₹", EUR: "€", GBP: "£", AED: "AED " };
  const symbol = symbols[currency] ?? currency + " ";
  const fmt = (n: number) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n.toLocaleString());
  if (min && max) return `${symbol}${fmt(min)} – ${symbol}${fmt(max)}`;
  return `${symbol}${fmt((min ?? max) as number)}`;
}
