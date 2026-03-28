import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), senha);
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
          <h1 className="text-2xl font-bold text-primary">Bem-vindo de volta</h1>
          <p className="mt-2 text-sm text-primary/55">
            Entre para acompanhar seu dinheiro com clareza.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-card ring-1 ring-primary/5">
          <form className="space-y-5" onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
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
              Entrar
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-primary/55">
            Não tem conta?{" "}
            <Link
              to="/register"
              className="font-semibold text-accent hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
