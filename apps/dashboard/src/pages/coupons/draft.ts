import type { Coupon, Kind } from "../../api";

export interface CouponDraft {
  allFranchiseStores: boolean;
  storeId: string;
  generated: boolean;
  code: string;
  percent: boolean;
  amount: number;
  valueLimitCents: number | null;
  usageLimit: number | null;
  validFrom: string;
  validTo: string;
  restrictHours: boolean;
  hourStart: string;
  hourEnd: string;
  restrictWeekday: boolean;
  weekday: number | null;
  weekdayValueLimitCents: number | null;
  weekdayUsageLimit: number | null;
  restrictStore: boolean;
  restrictStoreId: string;
  storeValueLimitCents: number | null;
  storeUsageLimit: number | null;
  restrictCustomer: boolean;
  customerId: string;
  customerValueLimitCents: number | null;
  customerUsageLimit: number | null;
  restrictService: boolean;
  service: Kind | "";
  serviceValueLimitCents: number | null;
  serviceUsageLimit: number | null;
  birthday: boolean;
  firstPurchase: boolean;
}

export const EMPTY_DRAFT: CouponDraft = {
  allFranchiseStores: false,
  storeId: "",
  generated: true,
  code: "",
  percent: false,
  amount: 0,
  valueLimitCents: null,
  usageLimit: null,
  validFrom: "",
  validTo: "",
  restrictHours: false,
  hourStart: "",
  hourEnd: "",
  restrictWeekday: false,
  weekday: null,
  weekdayValueLimitCents: null,
  weekdayUsageLimit: null,
  restrictStore: false,
  restrictStoreId: "",
  storeValueLimitCents: null,
  storeUsageLimit: null,
  restrictCustomer: false,
  customerId: "",
  customerValueLimitCents: null,
  customerUsageLimit: null,
  restrictService: false,
  service: "",
  serviceValueLimitCents: null,
  serviceUsageLimit: null,
  birthday: false,
  firstPurchase: false,
};

export function draftFromCoupon(c: Coupon): CouponDraft {
  return {
    allFranchiseStores: c.allFranchiseStores,
    storeId: c.storeId,
    generated: c.generated,
    code: c.code,
    percent: c.percent,
    amount: c.amount,
    valueLimitCents: c.valueLimitCents,
    usageLimit: c.usageLimit,
    validFrom: c.validFrom,
    validTo: c.validTo,
    restrictHours: c.restrictHours,
    hourStart: c.hourStart,
    hourEnd: c.hourEnd,
    restrictWeekday: c.restrictWeekday,
    weekday: c.weekday,
    weekdayValueLimitCents: c.weekdayValueLimitCents,
    weekdayUsageLimit: c.weekdayUsageLimit,
    restrictStore: c.restrictStore,
    restrictStoreId: c.restrictStoreId,
    storeValueLimitCents: c.storeValueLimitCents,
    storeUsageLimit: c.storeUsageLimit,
    restrictCustomer: c.restrictCustomer,
    customerId: c.customerId,
    customerValueLimitCents: c.customerValueLimitCents,
    customerUsageLimit: c.customerUsageLimit,
    restrictService: c.restrictService,
    service: c.service,
    serviceValueLimitCents: c.serviceValueLimitCents,
    serviceUsageLimit: c.serviceUsageLimit,
    birthday: c.birthday,
    firstPurchase: c.firstPurchase,
  };
}

export function draftReady(d: CouponDraft) {
  if (!d.storeId || !d.code.trim()) return false;
  if (d.percent ? d.amount < 1 || d.amount > 100 : d.amount < 1) return false;
  if (d.validFrom && d.validTo && d.validFrom > d.validTo) return false;
  if (d.restrictHours && (!d.hourStart || !d.hourEnd)) return false;
  if (d.restrictWeekday && d.weekday === null) return false;
  if (d.restrictStore && !d.restrictStoreId) return false;
  if (d.restrictService && !d.service) return false;
  return true;
}
