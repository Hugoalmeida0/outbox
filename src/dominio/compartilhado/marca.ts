/** Tipo de marca: distingue em tempo de compilação valores com a mesma representação (ex.: URL crua e canônica). */
export type Marca<T, N extends string> = T & { readonly __marca: N };
