import { useCallback, useEffect, useRef, useState } from "react";
import { getCarspaginated } from "../services/carService";

const useCars = (params = {}, options) => {
  const infinite = options?.infinite ?? false;

  const [cars, setCars]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);
  const [total, setTotal]         = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const paramsKey = JSON.stringify(params);
  const prevKey   = useRef(null);

  const fetchPage = useCallback(async (p, currentParams, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else        setLoading(true);
      setError("");

      const data = await getCarspaginated({ ...currentParams, page: p, limit: 12 });

      /* Handle both old array response and new paginated response */
      if (Array.isArray(data)) {
        setCars(data);
        setHasMore(false);
        setTotal(data.length);
      } else {
        setCars((prev) => append ? [...prev, ...data.cars] : data.cars);
        setHasMore(data.pagination.hasMore);
        setTotal(data.pagination.total);
        setPage(p);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load cars");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  /* Reset and reload when filters change */
  useEffect(() => {
    if (prevKey.current === paramsKey) return;
    prevKey.current = paramsKey;
    setPage(1);
    setCars([]);
    fetchPage(1, params, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    const nextPage = page + 1;
    fetchPage(nextPage, params, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, page, paramsKey]);

  const reload = useCallback(() => {
    fetchPage(1, params, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  return { cars, loading, error, hasMore, total, loadingMore, loadMore, reload };
};

export default useCars;