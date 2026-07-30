export { PrismaClient } from "@prisma/client";
export type { Prisma } from "@prisma/client";

export function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, input) => (typeof input === "bigint" ? input.toString() : input)),
  ) as T;
}
