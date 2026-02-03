'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { DailyGoals, UserProfile } from '@/lib/types';

const dailyGoalsSchema = z.object({
  calories: z.number().min(0, 'Calories must be positive'),
  protein: z.number().min(0, 'Protein must be positive'),
  carbs: z.number().min(0, 'Carbs must be positive'),
  fat: z.number().min(0, 'Fat must be positive'),
  fiber: z.number().min(0, 'Fiber must be positive'),
  water: z.number().min(0, 'Water must be positive'),
});

const profileInfoSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
});

type DailyGoalsFormData = z.infer<typeof dailyGoalsSchema>;
type ProfileInfoFormData = z.infer<typeof profileInfoSchema>;

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [startWeight, setStartWeight] = useState<number | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const supabase = createClient();

  const {
    register: registerGoals,
    handleSubmit: handleSubmitGoals,
    reset: resetGoals,
    formState: { errors: goalsErrors },
  } = useForm<DailyGoalsFormData>({
    resolver: zodResolver(dailyGoalsSchema),
  });

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileInfoFormData>({
    resolver: zodResolver(profileInfoSchema),
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStartWeight();
    }
  }, [user]);

  const fetchStartWeight = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('weight')
        .eq('user_id', user?.id)
        .order('log_date', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setStartWeight(data.weight);
      }
    } catch (err) {
      console.error('Error fetching start weight:', err);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setProfile(data);
      if (data?.daily_goals) {
        resetGoals(data.daily_goals);
      }
      resetProfile({
        full_name: data.full_name,
        username: data.username || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setMessage({ type: 'error', text: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const onSubmitProfile = async (data: ProfileInfoFormData) => {
    setSavingProfile(true);
    setProfileMessage(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: data.full_name,
          username: data.username || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditingProfile(false);
      await fetchProfile();
      // Trigger page refresh to update navigation
      window.dispatchEvent(new Event('profile-updated'));
    } catch (err) {
      setProfileMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelProfile = () => {
    setIsEditingProfile(false);
    setProfileMessage(null);
    if (profile) {
      resetProfile({
        full_name: profile.full_name,
        username: profile.username || ''
      });
    }
  };

  const onSubmitGoals = async (data: DailyGoalsFormData) => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          daily_goals: data,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Daily goals updated successfully!' });
      setIsEditingGoals(false);
      await fetchProfile();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update goals',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelGoals = () => {
    setIsEditingGoals(false);
    setMessage(null);
    if (profile?.daily_goals) {
      resetGoals(profile.daily_goals);
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Profile</h1>
        <p className="mt-1 text-zinc-600">Manage your account and nutrition goals</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Account Information</h2>

        {profileMessage && (
          <div
            className={`mb-4 rounded-md p-4 text-sm ${
              profileMessage.type === 'success'
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {profileMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Role</span>
              <span className="font-medium capitalize">{profile?.role}</span>
            </div>
          </div>

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-zinc-900">
              Full Name
            </label>
            <input
              id="full_name"
              type="text"
              {...registerProfile('full_name')}
              readOnly={!isEditingProfile}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
                isEditingProfile
                  ? 'border-zinc-300 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500'
                  : 'border-transparent bg-zinc-50 cursor-default'
              }`}
            />
            {profileErrors.full_name && (
              <p className="mt-1 text-sm text-red-600">{profileErrors.full_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-zinc-900">
              Username
            </label>
            <input
              id="username"
              type="text"
              {...registerProfile('username')}
              readOnly={!isEditingProfile}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
                isEditingProfile
                  ? 'border-zinc-300 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500'
                  : 'border-transparent bg-zinc-50 cursor-default'
              }`}
              placeholder={isEditingProfile ? "Optional" : ""}
            />
            {profileErrors.username && (
              <p className="mt-1 text-sm text-red-600">{profileErrors.username.message}</p>
            )}
          </div>

          {isEditingProfile ? (
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingProfile ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleCancelProfile}
                className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </form>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Daily Nutrition Goals</h2>

        {message && (
          <div
            className={`mb-4 rounded-md p-4 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmitGoals(onSubmitGoals)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="calories" className="block text-sm font-medium text-zinc-900">
                Calories (cal)
              </label>
              <input
                id="calories"
                type="number"
                {...registerGoals('calories', { valueAsNumber: true })}
                readOnly={!isEditingGoals}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
                  isEditingGoals
                    ? 'border-zinc-300 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500'
                    : 'border-transparent bg-zinc-50 cursor-default'
                }`}
              />
              {goalsErrors.calories && (
                <p className="mt-1 text-sm text-red-600">{goalsErrors.calories.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="protein" className="block text-sm font-medium text-zinc-900">
                Protein (g)
              </label>
              <input
                id="protein"
                type="number"
                {...registerGoals('protein', { valueAsNumber: true })}
                readOnly={!isEditingGoals}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
                  isEditingGoals
                    ? 'border-zinc-300 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500'
                    : 'border-transparent bg-zinc-50 cursor-default'
                }`}
              />
              {goalsErrors.protein && (
                <p className="mt-1 text-sm text-red-600">{goalsErrors.protein.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="carbs" className="block text-sm font-medium text-zinc-900">
                Carbohydrates (g)
              </label>
              <input
                id="carbs"
                type="number"
                {...registerGoals('carbs', { valueAsNumber: true })}
                readOnly={!isEditingGoals}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
                  isEditingGoals
                    ? 'border-zinc-300 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500'
                    : 'border-transparent bg-zinc-50 cursor-default'
                }`}
              />
              {goalsErrors.carbs && (
                <p className="mt-1 text-sm text-red-600">{goalsErrors.carbs.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="fat" className="block text-sm font-medium text-zinc-900">
                Fat (g)
              </label>
              <input
                id="fat"
                type="number"
                {...registerGoals('fat', { valueAsNumber: true })}
                readOnly={!isEditingGoals}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
                  isEditingGoals
                    ? 'border-zinc-300 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500'
                    : 'border-transparent bg-zinc-50 cursor-default'
                }`}
              />
              {goalsErrors.fat && (
                <p className="mt-1 text-sm text-red-600">{goalsErrors.fat.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="fiber" className="block text-sm font-medium text-zinc-900">
                Fiber (g)
              </label>
              <input
                id="fiber"
                type="number"
                {...registerGoals('fiber', { valueAsNumber: true })}
                readOnly={!isEditingGoals}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
                  isEditingGoals
                    ? 'border-zinc-300 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500'
                    : 'border-transparent bg-zinc-50 cursor-default'
                }`}
              />
              {goalsErrors.fiber && (
                <p className="mt-1 text-sm text-red-600">{goalsErrors.fiber.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="water" className="block text-sm font-medium text-zinc-900">
                Water (oz)
              </label>
              <input
                id="water"
                type="number"
                {...registerGoals('water', { valueAsNumber: true })}
                readOnly={!isEditingGoals}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
                  isEditingGoals
                    ? 'border-zinc-300 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500'
                    : 'border-transparent bg-zinc-50 cursor-default'
                }`}
              />
              {goalsErrors.water && (
                <p className="mt-1 text-sm text-red-600">{goalsErrors.water.message}</p>
              )}
            </div>
          </div>

          {isEditingGoals ? (
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleCancelGoals}
                className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingGoals(true)}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500 transition-colors"
            >
              Edit Goals
            </button>
          )}
        </form>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Starting Weight</h2>
        <div className="text-center py-8">
          {startWeight ? (
            <>
              <p className="text-5xl font-bold text-zinc-900">{startWeight}</p>
              <p className="text-sm text-zinc-600 mt-2">lbs</p>
              <p className="text-xs text-zinc-500 mt-4">Your first recorded weight</p>
            </>
          ) : (
            <p className="text-zinc-500">No weight logged yet. Visit the Weight page to log your first weight.</p>
          )}
        </div>
      </div>
    </div>
  );
}
