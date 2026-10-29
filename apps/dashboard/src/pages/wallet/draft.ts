import type { Kind, Voucher, VoucherCategory } from "../../api";

export interface VoucherDraft {
  storeId: string;
  category: VoucherCategory | "";
  amountCents: number;
  recurring: boolean;
  validFrom: string;
  validTo: string;
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
}

export const EMPTY_VOUCHER: VoucherDraft = {
  storeId: "",
  category: "",
  amountCents: 0,
  recurring: false,
  validFrom: "",
  validTo: "",
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
};

export function draftFromVoucher(v: Voucher): VoucherDraft {
  const { storeId, category, amountCents, recurring, validFrom, validTo, restrictStore, restrictStoreId,
    storeValueLimitCents, storeUsageLimit, restrictCustomer, customerId, customerValueLimitCents,
    customerUsageLimit, restrictService, service, serviceValueLimitCents, serviceUsageLimit } = v;
  return {
    storeId, category, amountCents, recurring, validFrom, validTo, restrictStore, restrictStoreId,
    storeValueLimitCents, storeUsageLimit, restrictCustomer, customerId, customerValueLimitCents,
    customerUsageLimit, restrictService, service, serviceValueLimitCents, serviceUsageLimit,
  };
}

export function voucherReady(d: VoucherDraft) {
  if (!d.storeId || !d.category || d.amountCents < 1) return false;
  if (d.validFrom && d.validTo && d.validFrom > d.validTo) return false;
  if (d.restrictStore && !d.restrictStoreId) return false;
  if (d.restrictService && !d.service) return false;
  return true;
}
