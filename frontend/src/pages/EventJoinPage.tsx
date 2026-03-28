import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PublicEventShell } from "@/components/layout/PublicEventShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function EventJoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c.length < 4) return;
    navigate(`/evento/${c}`);
  }

  return (
    <PublicEventShell title="Acessar evento por código">
      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-card dark:bg-slate-900">
        <Input
          label="Código do evento"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ex.: ABC123"
          autoComplete="off"
        />
        <Button type="submit" variant="accent" className="min-h-11 w-full sm:w-auto">
          Entrar
        </Button>
      </form>
    </PublicEventShell>
  );
}
