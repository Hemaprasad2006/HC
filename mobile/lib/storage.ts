import * as SecureStore from 'expo-secure-store';

export const storage = {
  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error(`SecureStore set error for key ${key}:`, e);
    }
  },

  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.error(`SecureStore get error for key ${key}:`, e);
      return null;
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error(`SecureStore delete error for key ${key}:`, e);
    }
  },
};
export default storage;
