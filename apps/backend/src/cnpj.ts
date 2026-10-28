const WEIGHT_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const WEIGHT_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function cnpjDigits(value: string) {
  return value.replace(/\D/g, "");
}

function checkDigit(nums: number[], weights: number[]) {
  const sum = weights.reduce((acc, w, i) => acc + nums[i]! * w, 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCnpj(value: string) {
  const digits = cnpjDigits(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  const nums = digits.split("").map(Number);
  return nums[12] === checkDigit(nums, WEIGHT_1) && nums[13] === checkDigit(nums, WEIGHT_2);
}
