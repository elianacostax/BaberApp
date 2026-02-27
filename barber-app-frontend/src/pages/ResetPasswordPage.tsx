import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export default function ResetPasswordPage() {
  const [search] = useSearchParams();
  const token = search.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const submit = async () => {
    if (!token) {
      toast({ title: 'Error', description: 'Token inválido', variant: 'destructive' });
      return;
    }
    if (!password || password.length < 6 || password !== confirm) {
      toast({ title: 'Error', description: 'Revisa la contraseña', variant: 'destructive' });
      return;
    }
    try {
      await api.post('/api/auth/reset-password', { token, password });
      toast({ title: 'Listo', description: 'Contraseña actualizada' });
      navigate('/auth', { replace: true });
    } catch (e: any) {
      const description = e?.response?.data?.message || 'No se pudo resetear la contraseña';
      toast({ title: 'Error', description, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Restablecer contraseña</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="password" placeholder="Nueva contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input type="password" placeholder="Confirmar contraseña" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Button onClick={submit}>Actualizar</Button>
        </CardContent>
      </Card>
    </div>
  );
}


