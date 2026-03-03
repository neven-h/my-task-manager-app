import { useState, useCallback } from 'react';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';

const useTaskFetch = () => {
    const [tasks, setTasks] = useState([]);
    const [allCategories, setAllCategories] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [clients, setClients] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/categories`, { headers: getAuthHeaders() });
            const data = await response.json();
            setAllCategories(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setAllCategories([]);
        }
    }, []);

    const fetchTags = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/tags`, { headers: getAuthHeaders() });
            const data = await response.json();
            setAllTags(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching tags:', err);
            setAllTags([]);
        }
    }, []);

    const fetchClients = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/clients`, { headers: getAuthHeaders() });
            const data = await response.json();
            setClients(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching clients:', err);
            setClients([]);
        }
    }, []);

    const fetchTasks = useCallback(async (filterParams) => {
        try {
            setLoading(true);
            const params = filterParams || new URLSearchParams();
            const response = await fetch(`${API_BASE}/tasks?${params}`, { headers: getAuthHeaders() });
            let data = await response.json();
            if (!Array.isArray(data)) data = [];
            return data;
        } catch (err) {
            setError('Failed to fetch tasks');
            console.error('Error fetching tasks:', err);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/stats`, { headers: getAuthHeaders() });
            const data = await response.json();
            setStats(response.ok && data && typeof data === 'object' && !data.error ? data : null);
        } catch (err) {
            console.error('Error fetching stats:', err);
            setStats(null);
        }
    }, []);

    return {
        tasks, setTasks, allCategories, setAllCategories, allTags, setAllTags,
        clients, setClients, stats, setStats, loading, setLoading, error, setError,
        fetchCategories, fetchTags, fetchClients, fetchTasks, fetchStats
    };
};

export default useTaskFetch;
