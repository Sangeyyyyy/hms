import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to DNSC Hostel Management System',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-4">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8 text-white">
          <div className="flex items-center justify-center w-24 h-24 bg-white/10 rounded-2xl p-2 backdrop-blur-sm border border-white/20 mb-4 shadow-lg">
            <Image
              src="/logos/Hostel logo.png"
              alt="Hostel Logo"
              width={80}
              height={80}
              className="object-contain drop-shadow-md"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">DNSC HMS</h1>
          <p className="text-sm text-emerald-200/70 mt-1">Hostel Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Welcome back</h2>
            <p className="text-sm text-slate-400 mt-1">
              Sign in to your account to continue
            </p>
          </div>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} DNSC Hostel. All rights reserved.
        </p>
      </div>
    </main>
  );
}
