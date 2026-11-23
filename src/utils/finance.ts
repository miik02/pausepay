import { CURRENCIES } from '../constants/etfs';
import {
  BillingCycle,
  CurrencyCode,
  GrowthPoint,
  ImpulseItem,
  PurchaseFrequency,
  SubscriptionItem,
  SubStats,
  VaultStats,
} from '../types';

const WEEKS_PER_MONTH = 4.3333;
const STANDARD_WORKDAY_HOURS = 8;
const THREE_DAYS_MS = 3 * 24 * 3600 * 1000;

export function calculateHourlyRate(
  monthlyNetIncome: number,
  weeklyHours: number,
  commuteWeeklyHours = 0
): number {
  const totalWeekly = Math.max(1, weeklyHours + Math.max(0, commuteWeeklyHours));
  const monthlyHours = totalWeekly * WEEKS_PER_MONTH;
  if (monthlyNetIncome <= 0 || monthlyHours <= 0) return 0;
  return monthlyNetIncome / monthlyHours;
}

export function calculateLifeCost(price: number, hourlyRate: number): {
  hours: number;
  workDays: number;
} {
  if (price <= 0 || hourlyRate <= 0) return { hours: 0, workDays: 0 };
  const hours = price / hourlyRate;
  return {
    hours,
    workDays: hours / STANDARD_WORKDAY_HOURS,
  };
}

export function calculateFutureValue(
  amount: number,
  annualRatePercent: number,
  years: number,
  frequency: PurchaseFrequency
): number {
  if (amount <= 0 || years <= 0) return 0;
  const r = Math.max(0, annualRatePercent) / 100;

  if (frequency === 'once') {
    return amount * Math.pow(1 + r, years);
  }

  const months = Math.round(years * 12);
  if (r === 0) return amount * months;
  const monthlyRate = r / 12;
  return amount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

export function generateGrowthSeries(
  amount: number,
  annualRatePercent: number,
  years: number,
  frequency: PurchaseFrequency
): GrowthPoint[] {
  const safeYears = Math.max(1, Math.round(years));
  const points: GrowthPoint[] = [];

  for (let y = 0; y <= safeYears; y++) {
    const principal = frequency === 'once' ? amount : amount * y * 12;
    const total =
      y === 0
        ? frequency === 'once'
          ? amount
          : 0
        : calculateFutureValue(amount, annualRatePercent, y, frequency);
    points.push({ year: y, principal, total });
  }
  return points;
}

export function getAnnualSubscriptionCost(price: number, cycle: BillingCycle): number {
  if (price <= 0) return 0;
  if (cycle === 'monthly') return price * 12;
  return price;
}

export function calculateSubscriptionStats(
  subscriptions: SubscriptionItem[],
  hourlyRate: number
): SubStats {
  const now = Date.now();
  let yearlyBurn = 0;
  let activeCount = 0;
  let urgentCount = 0;
  let cancelledCount = 0;

  for (const sub of subscriptions) {
    if (sub.status === 'active') {
      activeCount += 1;
      yearlyBurn += getAnnualSubscriptionCost(sub.price, sub.cycle);
      if (sub.nextBillingAt - now <= THREE_DAYS_MS) {
        urgentCount += 1;
      }
    } else {
      cancelledCount += 1;
    }
  }

  const monthlyBurn = yearlyBurn / 12;
  const yearlyHours = hourlyRate > 0 ? yearlyBurn / hourlyRate : 0;
  const tenYearOpportunityCost = calculateFutureValue(monthlyBurn, 10, 10, 'monthly');

  return {
    monthlyBurn,
    yearlyBurn,
    yearlyHours,
    tenYearOpportunityCost,
    activeCount,
    urgentCount,
    cancelledCount,
  };
}

export function calculateVaultStats(items: ImpulseItem[], hourlyRate: number): VaultStats {
  let totalResisted = 0;
  let totalFutureSaved = 0;
  let freedomHours = 0;
  let activeCount = 0;
  let resistedCount = 0;
  let boughtCount = 0;

  for (const item of items) {
    if (item.status === 'quarantine') {
      activeCount += 1;
    } else if (item.status === 'resisted') {
      resistedCount += 1;
      const annualEquivalent = item.frequency === 'monthly' ? item.price * 12 : item.price;
      totalResisted += annualEquivalent;
      totalFutureSaved += item.futureValue;
      freedomHours += hourlyRate > 0 ? annualEquivalent / hourlyRate : item.hoursCost;
    } else if (item.status === 'bought') {
      boughtCount += 1;
    }
  }

  const resolvedTotal = resistedCount + boughtCount;
  const resistanceRate = resolvedTotal > 0 ? Math.round((resistedCount / resolvedTotal) * 100) : 0;

  return {
    totalResisted,
    totalFutureSaved,
    freedomHours,
    freedomDays: freedomHours / STANDARD_WORKDAY_HOURS,
    resistanceRate,
    activeCount,
    resistedCount,
    boughtCount,
  };
}

export function formatCurrency(amount: number, currency: CurrencyCode, decimals = 0): string {
  const cfg = CURRENCIES[currency] || CURRENCIES.EUR;
  const safe = Number.isFinite(amount) ? amount : 0;
  const fixed = safe.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const sep = currency === 'EUR' ? '.' : ',';
  const decSep = currency === 'EUR' ? ',' : '.';
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  const formatted = decPart ? `${grouped}${decSep}${decPart}` : grouped;
  return cfg.suffix ? `${formatted} ${cfg.symbol}` : `${cfg.symbol}${formatted}`;
}
