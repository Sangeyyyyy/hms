'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth.context';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await login(data);
      toast.success('Welcome back!');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Invalid email or password. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Email */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-slate-200"
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@dnsc-hostel.com"
          {...register('email')}
          className={`
            w-full px-4 py-2.5 rounded-lg text-sm
            bg-white/10 border text-white placeholder:text-slate-500
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
            transition-all duration-200
            ${errors.email ? 'border-red-500/70' : 'border-white/10'}
          `}
        />
        {errors.email && (
          <p className="text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-slate-200"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            {...register('password')}
            className={`
              w-full px-4 py-2.5 pr-11 rounded-lg text-sm
              bg-white/10 border text-white placeholder:text-slate-500
              focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
              transition-all duration-200
              ${errors.password ? 'border-red-500/70' : 'border-white/10'}
            `}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      {/* Submit */}
      <button
        id="login-submit-btn"
        type="submit"
        disabled={isLoading}
        className="
          w-full flex items-center justify-center gap-2
          px-4 py-2.5 rounded-lg text-sm font-semibold
          bg-emerald-600 hover:bg-emerald-500 text-white
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-all duration-200 shadow-lg shadow-emerald-500/25
          hover:shadow-emerald-500/40 hover:-translate-y-px
          active:translate-y-0
        "
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            Sign in
          </>
        )}
      </button>
    </form>
  );
}
