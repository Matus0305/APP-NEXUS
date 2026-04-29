import { useSupabaseQuery } from './useSupabase';

export const usePrivacy = () => {
  const { data: profile } = useSupabaseQuery('nexus_profile');
  
  // Retornamos el estado y la clase CSS lista para usar
  const isPrivate = profile?.[0]?.modo_privacidad || false;
  const privacyClass = isPrivate ? "blur-md select-none pointer-events-none" : "transition-all duration-500";

  return { isPrivate, privacyClass };
};