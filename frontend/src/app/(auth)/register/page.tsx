'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, TextField } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';

/** Mirror the backend rule: lowercase letters, numbers and hyphens only. */
function normalizeSubdomain(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export default function RegisterPage() {
  const router = useRouter();
  const { status, register } = useAuth();
  const [name, setName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ name, tenantName, subdomain, email, password });
      router.replace('/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Please try again.',
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Set up your organization and start creating events.
        </p>
      </header>

      {error && <Alert>{error}</Alert>}

      <TextField
        label="Your name"
        placeholder="Jane Doe"
        autoComplete="name"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        label="Organization name"
        placeholder="Acme Events"
        required
        value={tenantName}
        onChange={(event) => setTenantName(event.target.value)}
      />
      <TextField
        label="Subdomain"
        placeholder="acme"
        required
        value={subdomain}
        onChange={(event) => setSubdomain(normalizeSubdomain(event.target.value))}
        hint="Your organization's address: e.g. acme → acme.entter.app"
      />
      <TextField
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        hint="At least 8 characters."
      />

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-black/60 dark:text-white/60">
        Already have an account?{' '}
        <Link href="/login" className="font-medium underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
