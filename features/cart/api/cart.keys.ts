export const cartKeys = {
  all: ['cart'] as const,
  session: (identity: string) => ['cart', identity] as const,
  mutations: ['cart-mutation'] as const,
};

