import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api";

export function RegisterPage() {
  const navigate = useNavigate();
  const { registerAndLogin, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (nome.trim().length < 1) e.nome = "Informe seu nome.";
    if (senha.length < 8) e.senha = "Mínimo de 8 caracteres.";
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await registerAndLogin(nome.trim(), email.trim(), senha);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md animate-slideUp">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-accent shadow-card">
            ₢
          </div>
          <h1 className="text-2xl font-bold text-primary">Crie sua conta</h1>
          <p className="mt-2 text-sm text-primary/55">
            Leva menos de um minuto para começar.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-card ring-1 ring-primary/5">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={fieldErrors.nome}
              required
            />
            <Input
              label="E-mail"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Senha"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              error={fieldErrors.senha}
              hint="Use pelo menos 8 caracteres."
              required
              minLength={8}
            />
            {error ? (
              <div
                className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
                role="alert"
              >
                {error}
              </div>
            ) : null}
            <Button
              type="submit"
              variant="accent"
              className="w-full !py-3 text-base"
              loading={loading}
            >
              Cadastrar
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-primary/55">
            Já tem conta?{" "}
            <Link
              to="/login"
              className="font-semibold text-accent hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
