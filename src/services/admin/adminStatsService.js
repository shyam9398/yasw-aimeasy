import { supabase } from '../supabase/client.js';

async function fetchDashboardCountsRpc() {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_dashboard_counts');
  if (error) {
    console.warn('adminStats get_dashboard_counts:', error.message);
    return null;
  }
  return Array.isArray(data) ? data[0] || null : data;
}

export async function fetchAdminDashboardStats() {
  if (!supabase) {
    return null;
  }

  const rpcCounts = await fetchDashboardCountsRpc();
  return {
    students: Number(rpcCounts?.students || 0),
    creators: Number(rpcCounts?.creators || 0),
    subAdmins: 0,
    subjects: Number(rpcCounts?.subjects || 0),
    universities: 0,
    branches: 0,
    regulations: Number(rpcCounts?.regulations || 0),
    storageUsage: '—',
    weeklyGrowth: '—',
    weeklyActivity: '—',
  };
}

export async function fetchLandingStats() {
  if (!supabase) {
    return {
      students: 0,
      creators: 0,
      subjects: 0,
      regulations: 0,
    };
  }

  const rpcCounts = await fetchDashboardCountsRpc();
  return {
    students: Number(rpcCounts?.students || 0),
    creators: Number(rpcCounts?.creators || 0),
    subjects: Number(rpcCounts?.subjects || 0),
    regulations: Number(rpcCounts?.regulations || 0),
  };
}
