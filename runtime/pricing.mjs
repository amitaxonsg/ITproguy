export function quoteHours(hours, billing='once') {
  if (!Number.isInteger(hours)||hours<1||hours>100) throw Error('Choose 1 to 100 whole hours.');
  if (!['once','monthly'].includes(billing)) throw Error('Invalid billing option.');
  const subtotalCents=hours*500;
  const discountCents=hours>=10?Math.round(subtotalCents*0.1):0;
  return {hours,billing,currency:'usd',subtotalCents,discountCents,totalCents:subtotalCents-discountCents,creditSeconds:hours*3600,validityMonths:24};
}
