import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().min(1, "Email wajib diisi").email("Email tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
