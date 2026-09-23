const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function under100(n: number) {
  return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
}
function under1000(n: number) {
  const h = Math.floor(n / 100), r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? under100(r) : ""].filter(Boolean).join(" ");
}

/** Pakistani grouping (thousand / lakh / crore): 150000 -> "One Lakh Fifty Thousand Rupees Only". */
export function amountInWords(amount: number): string {
  let n = Math.round(amount);
  if (n <= 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const units: [number, string][] = [[10_000_000, "Crore"], [100_000, "Lakh"], [1000, "Thousand"]];
  for (const [size, name] of units) {
    const q = Math.floor(n / size);
    if (q) { parts.push(`${under1000(q)} ${name}`); n -= q * size; }
  }
  if (n) parts.push(under1000(n));
  return `${parts.join(" ")} Rupees Only`;
}
