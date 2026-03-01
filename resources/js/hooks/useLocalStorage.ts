export const PLAYER_ID_KEY = 'player_id';
export const useLocalStorage = () => {
    return {
        set: (key: string, value: any) =>
            window.localStorage.setItem(key, value),
        get: (key: string) => window.localStorage.getItem(key),
        remove: (key: string) => window.localStorage.removeItem(key),
    };
};
