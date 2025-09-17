import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { LoginCredentials } from '../../types/auth';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login, isLoading, error: storeError } = useAuthStore();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null); // frontend validation

  const validate = () => {
    const { email, password } = formData;

    if (!email || !password) {
      return 'Email and password are required';
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email';
    }

    const passwordRegex = /^[\w!@#$%^&*()_+=[\]{}|;':",.<>/?-]+$/;
    if (!passwordRegex.test(password)) {
      return 'Password contains invalid characters';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return; // stop submission if frontend validation fails
    }

    await login(formData);
    if (onSuccess) onSuccess();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(error || storeError) && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
          {error || storeError}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        required
      />

      <Input
        label="Password"
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
        required
      />

      <Button type="submit" isLoading={isLoading} className="w-full">
        Sign In
      </Button>
    </form>
  );
};
