export function useQueryParams() {
  const getParam = (key) => {
    try {
      return new URLSearchParams(window.location.search).get(key);
    } catch (err) {
      console.error('useQueryParams.getParam error:', err);
      return null;
    }
  };

  const setParam = (key, value, { replace = true } = {}) => {
    try {
      const url = new URL(window.location.href);
      if (value === null || value === undefined || value === "") {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }

      if (replace) {
        window.history.replaceState(null, "", url.toString());
      } else {
        window.location.href = url.toString();
      }
    } catch (err) {
      console.error('useQueryParams.setParam error:', err);
    }
  };

  const getAll = () => {
    try {
      return Object.fromEntries(new URLSearchParams(window.location.search).entries());
    } catch (err) {
      console.error('useQueryParams.getAll error:', err);
      return {};
    }
  };

  return { getParam, setParam, getAll };
}
