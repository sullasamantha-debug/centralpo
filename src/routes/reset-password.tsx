import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, Mail, Key, ArrowLeft, CheckCircle2, Lock, ArrowRight } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  // Estado para solicitação de link (visitante)
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  
  // Estado para definição de nova senha (autenticado por token)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);

  // Solicitar link de redefinição por e-mail
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Por favor, digite seu e-mail.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("E-mail de recuperação enviado!");
      setLinkSent(true);
    } catch (err) {
      toast.error("Erro ao processar solicitação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Salvar nova senha
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Senha redefinida com sucesso!");
      // Redireciona diretamente para o painel principal, pois o usuário já está logado
      navigate({ to: "/" });
    } catch (err) {
      toast.error("Ocorreu um erro ao atualizar a senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Exibe um carregamento premium enquanto checa a sessão no Supabase
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-muted-foreground font-medium">Carregando informações...</span>
        </div>
      </div>
    );
  }

  // Se o usuário está ativo na sessão (veio do link de recuperação ou está logado nas configurações)
  const isUserAuthenticated = !!user;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background px-4 relative overflow-hidden">
      {/* Detalhes de background premium */}
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
              <p className="text-xs text-muted-foreground">Recuperação de Acesso</p>
            </div>
          </div>

          {/* FLUXO 1: Formulário para definir nova senha (Usuário Autenticado via link) */}
          {isUserAuthenticated ? (
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Redefinir sua senha</h2>
              <p className="mt-1.5 text-sm text-muted-foreground mb-6">
                Crie uma nova senha segura para proteger sua conta do Central PO.
              </p>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                    <Lock className="size-3.5 text-muted-foreground" /> Nova Senha
                  </label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-background/50 focus:bg-background transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                    <Key className="size-3.5 text-muted-foreground" /> Confirmar Nova Senha
                  </label>
                  <Input
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                      Salvando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Salvar Nova Senha
                      <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  )}
                </Button>
              </form>
            </div>
          ) : (
            /* FLUXO 2: Solicitação do Link de Redefinição (Usuário Visitante) */
            <div>
              {!linkSent ? (
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Esqueceu a senha?</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground mb-6">
                    Não se preocupe! Insira seu e-mail cadastrado e enviaremos um link de recuperação instantâneo.
                  </p>

                  <form onSubmit={handleRequestReset} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                        <Mail className="size-3.5 text-muted-foreground" /> Seu E-mail
                      </label>
                      <Input
                        type="email"
                        placeholder="seu-email@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                          Enviando...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Enviar Link de Recuperação
                          <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      )}
                    </Button>
                  </form>
                </div>
              ) : (
                /* Caso o link já tenha sido enviado */
                <div className="text-center py-4 space-y-4">
                  <div className="size-16 bg-success/10 text-success rounded-full grid place-items-center mx-auto shadow-inner">
                    <CheckCircle2 className="size-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">E-mail Enviado!</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Um link de redefinição de senha foi enviado para o endereço: <br />
                      <strong className="text-foreground">{email}</strong>.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Por favor, cheque sua caixa de entrada e lixo eletrônico.
                    </p>
                  </div>
                </div>
              )}

              {/* Botão de Voltar para Login */}
              <div className="mt-6 border-t pt-4 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-all"
                >
                  <ArrowLeft className="size-4" />
                  Voltar para o Login
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
