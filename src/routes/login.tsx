import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { Sparkles, Mail, Lock, UserPlus, LogIn, ArrowRight } from "lucide-react";
import { useState } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Criar conta por e-mail
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        // Se o e-mail precisar ser confirmado
        if (data.user && data.session === null) {
          toast.success("Cadastro realizado! Verifique sua caixa de entrada para confirmar o e-mail.");
          // Limpa a senha
          setPassword("");
        } else if (data.session) {
          toast.success("Conta criada e login efetuado com sucesso!");
          navigate({ to: "/" });
        }
      } else {
        // Login tradicional
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Mensagens de erro amigáveis em português
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Credenciais inválidas. Verifique seu e-mail e senha.");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Por favor, confirme seu e-mail antes de fazer login.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("Login efetuado com sucesso!");
        navigate({ to: "/" });
      }
    } catch (err: any) {
      toast.error("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) {
      toast.error("Erro ao entrar com Google");
      return;
    }
    if (res.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background px-4 relative overflow-hidden">
      {/* Círculos de gradiente sutis no background para sensação premium */}
      <div className="absolute top-1/4 left-1/4 size-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 size-[400px] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="rounded-2xl border bg-card/60 backdrop-blur-xl shadow-2xl p-8 relative overflow-hidden transition-all duration-300">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-lg shadow-primary/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">Central PO</h1>
              <p className="text-xs text-muted-foreground">Produtividade para Product Owners</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">
            {isSignUp ? "Criar nova conta" : "Entrar na sua conta"}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isSignUp
              ? "Cadastre-se para gerenciar seus produtos, sprints e follow-ups."
              : "Sua central única de tarefas, cobranças, follow-ups e reuniões."}
          </p>

          {/* Abas modernas e animadas para alternar entre Login e Cadastro */}
          <div className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-xl mt-6">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
                !isSignUp
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LogIn className="size-4" />
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
                isSignUp
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="size-4" />
              Criar conta
            </button>
          </div>

          {/* Formulário Principal */}
          <form onSubmit={handleEmailAuth} className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" /> E-mail
              </label>
              <Input
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50 focus:bg-background transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                  <Lock className="size-3.5 text-muted-foreground" /> Senha
                </label>
                {!isSignUp && (
                  <Link
                    to="/reset-password"
                    className="text-xs text-primary hover:underline font-medium transition-all"
                  >
                    Esqueci minha senha
                  </Link>
                )}
              </div>
              <Input
                type="password"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/50 focus:bg-background transition-all"
              />
            </div>

            <Button type="submit" size="lg" className="w-full shadow-lg shadow-primary/10 group mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {isSignUp ? "Registrar Conta" : "Entrar com E-mail"}
                  <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          {/* Divisor Visual */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">Ou continue com</span>
            </div>
          </div>

          {/* Botão Google OAuth */}
          <Button type="button" variant="outline" size="lg" className="w-full bg-background/50 hover:bg-background transition-all" onClick={signInWithGoogle}>
            <GoogleIcon /> Continuar com Google
          </Button>

          <p className="mt-8 text-xs text-muted-foreground text-center">
            Seus dados ficam privados e protegidos.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 mr-2" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.12A6.6 6.6 0 0 1 5.48 12c0-.74.13-1.45.36-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.96l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
