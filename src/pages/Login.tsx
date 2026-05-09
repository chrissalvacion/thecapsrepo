import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { ShieldCheck, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.auth.login({ email, password });
      localStorage.setItem('auth_token', data.token);
      onLogin(data.user);
      toast.success("Welcome back, Instructor!");
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md space-y-4 text-sm">
        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <ShieldCheck className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">TheCapsRepo Admin</CardTitle>
            <CardDescription>
              Enter your instructor credentials to manage the repository.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Authenticating..." : "Login as Admin"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="text-center">
          <Link 
            to="/student" 
            className="text-sm font-medium text-primary hover:underline flex items-center justify-center gap-2"
          >
            <Search className="h-4 w-4" />
            Are you a student? Check defense schedules here.
          </Link>
        </div>
      </div>
    </div>
  );
}
