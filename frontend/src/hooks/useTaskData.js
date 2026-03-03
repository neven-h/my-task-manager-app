import useTaskFetch from './useTaskFetch';
import useTaskMutations from './useTaskMutations';
import useTaskExport from './useTaskExport';

const useTaskData = () => {
    const fetchHook = useTaskFetch();
    const { setError, setLoading, fetchCategories, fetchTags } = fetchHook;

    const mutations = useTaskMutations(setError, setLoading, fetchCategories, fetchTags);
    const exports = useTaskExport(setError, setLoading);

    return { ...fetchHook, ...mutations, ...exports };
};

export default useTaskData;
