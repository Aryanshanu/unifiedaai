import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    try { emailSchema.parse(email); } catch (e) { if (e instanceof z.ZodError) newErrors.email = e.errors[0].message; }
    try { passwordSchema.parse(password); } catch (e) { if (e instanceof z.ZodError) newErrors.password = e.errors[0].message; }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      let message = 'An error occurred during sign in';
      if (error.message.includes('Invalid login credentials')) message = 'Invalid email or password';
      else if (error.message.includes('Email not confirmed')) message = 'Please confirm your email address';
      toast({ title: 'Sign In Failed', description: message, variant: 'destructive' });
    } else {
      toast({ title: 'Welcome back!', description: 'You have successfully signed in.' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email" className="text-foreground">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input id="signin-email" type="email" placeholder="you@company.com" value={email}
            onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-muted border-border" disabled={isLoading} />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password" className="text-foreground">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input id="signin-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password}
            onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 bg-muted border-border" disabled={isLoading} />
          <Button type="button" variant="ghost" size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>
      <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground" disabled={isLoading}>
        {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>) : 'Sign In'}
      </Button>
    </form>
  );
}
