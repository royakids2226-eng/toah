'use client';

import { useState, useEffect } from 'react';

interface User {
  userid: number;
  usercode: string;
  username: string;
  phone: string | null;
  position: string;
  permissions: string;
  created_at: string;
  updated_at: string;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const response = await fetch('/api/users');
        
        if (!response.ok) {
          throw new Error('فشل في جلب بيانات المستخدمين');
        }
        
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  const createUser = async (userData: Omit<User, 'userid' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('فشل في إنشاء المستخدم');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error creating user:', err);
      throw err;
    }
  };

  const updateUser = async (userId: number, userData: Partial<User>) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('فشل في تحديث المستخدم');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error updating user:', err);
      throw err;
    }
  };

  const deleteUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('فشل في حذف المستخدم');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error deleting user:', err);
      throw err;
    }
  };

  return { 
    users, 
    loading, 
    error, 
    createUser, 
    updateUser, 
    deleteUser 
  };
}