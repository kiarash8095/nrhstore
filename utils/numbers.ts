export const e2p = (value: string | number): string => {
  return value
    .toString()
    .replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
};

export const p2e = (value: string | number): string => {
  return value
    .toString()
    .replace(/[۰-۹]/g, (digit) =>
      "۰۱۲۳۴۵۶۷۸۹".indexOf(digit).toString()
    );
};

export const sp = (value: string | number): string => {
  const separatedNumber = value
    .toString()
    .match(/(\d+?)(?=(\d{3})+(?!\d)|$)/g);

  if (!separatedNumber) {
    return "";
  }

  return e2p(separatedNumber.join(","));
};