// Gedeelde berekeningsfuncties voor offertes

export const calculateVat = (price: number, vatPercentage: number): number => {
  return (price * vatPercentage) / 100;
};

export const calculateTotal = (price: number, vatPercentage: number): number => {
  return price + calculateVat(price, vatPercentage);
};
