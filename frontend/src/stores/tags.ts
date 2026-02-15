import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/api';
import type { Tag } from '@/types';

export const useTagStore = defineStore('tags', () => {
  const tags = ref<(Tag & { _count: { recipes: number } })[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchTags = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.getTags();
      tags.value = response.data.tags;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch tags';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createTag = async (name: string) => {
    try {
      const response = await api.createTag(name);
      await fetchTags();
      return response.data.tag;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create tag';
      throw err;
    }
  };

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag,
  };
});
