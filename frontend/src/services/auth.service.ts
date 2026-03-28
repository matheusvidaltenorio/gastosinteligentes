import { api, setSession } from "@/services/api";
import type { LoginResponse, User } from "@/types/api";

export async function login(email: string, senha: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", { email, senha });
  setSession(data.access_token, data.user_id);
  return data;
}

export async function register(
  nome: string,
  email: string,
  senha: string
): Promise<User> {
  const { data } = await api.post<User>("/auth/register", { nome, email, senha });
  return data;
}

export async function registerAndLogin(
  nome: string,
  email: string,
  senha: string
): Promise<LoginResponse> {
  await register(nome, email, senha);
  return login(email, senha);
}
