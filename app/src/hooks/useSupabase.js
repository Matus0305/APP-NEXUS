import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useSupabaseQuery = (table) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase.from(table).select('*');
      if (error) throw error;
      setData(result || []);
    } catch (err) {
      console.error("Error en fetchData:", err.message);
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
};