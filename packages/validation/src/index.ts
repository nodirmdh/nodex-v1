import { z } from "zod";

export const idempotencyKeySchema = z.string().min(8).max(128);
export const uzsMinorSchema = z.bigint().nonnegative();
