import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { RegisterCredentials } from '../../types/auth';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { register, isLoading, error: storeError } = useAuthStore();
  const [formData, setFormData] = useState<RegisterCredentials>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);

  // Frontend validation
  const validate = () => {
    const { username, email, password, confirmPassword } = formData;

    if (!username || !email || !password || !confirmPassword) {
      return 'All fields are required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email';

    if (password.length < 6) return 'Password must be at least 6 characters';

    const passwordRegex = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{}|;':",.<>/?]+$/;
    if (!passwordRegex.test(password)) return 'Password contains invalid characters';

    if (password !== confirmPassword) return 'Passwords do not match';

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1️⃣ Frontend validation
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      // 2️⃣ Send signup to backend
      const response = await fetch('http://localhost:3001/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        // 3️⃣ Backend error (duplicate username/email)
        setError(data.error);
        return; // ❌ Stop: do NOT log in
      }

      console.log('User added to PostgreSQL:', data.user);

      // 4️⃣ Only now call store action and onSuccess
      await register(formData); 
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error('Error connecting to backend:', err);
      setError('Error connecting to backend');
    }
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
        label="Username"
        type="text"
        name="username"
        value={formData.username}
        onChange={handleChange}
        required
      />

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

      <Input
        label="Confirm Password"
        type="password"
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        required
      />

      <Button type="submit" isLoading={isLoading} className="w-full">
        Sign Up
      </Button>
    </form>
  );
};
