import { useCallback, useEffect, useRef, useState } from "react";
import { getCarsPaginated } from "../services/carService";

const useCars = (params = {}, options = {}) => {
  const infinite = options.infinite ?? false;
  const limit = options.limit ?? 12;

  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const paramsKey = JSON.stringify(params);
  const prevKey = useRef(null);
  const activeRequestRef = useRef(0);

  const fetchPage = useCallback(async (nextPage, currentParams, append = false) => {
    const requestId = ++activeRequestRef.current;

    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");

      const data = await getCarsPaginated({
        ...currentParams,
        page: nextPage,
        limit,
      });

      if (requestId !== activeRequestRef.current) return;

      if (Array.isArray(data)) {
        setCars((prev) => (append ? [...prev, ...data] : data));
        setHasMore(false);
        setTotal((prev) => (append ? prev + data.length : data.length));
      } else {
        setCars((prev) => {
          if (!append) return data.cars || [];

          const seen = new Set(prev.map((car) => car._id));
          const incoming = (data.cars || []).filter((car) => !seen.has(car._id));
          return [...prev, ...incoming];
        });
        setHasMore(infinite ? Boolean(data.pagination?.hasMore) : false);
        setTotal(data.pagination?.total ?? 0);
      }

      setPage(nextPage);
    } catch (err) {
      if (requestId !== activeRequestRef.current) return;
      setError(err.response?.data?.message || "Failed to load cars");
    } finally {
      if (requestId === activeRequestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [infinite, limit]);

  useEffect(() => {
    if (prevKey.current === paramsKey) return;

    prevKey.current = paramsKey;
    setCars([]);
    setPage(1);
    setHasMore(false);
    setTotal(0);
    fetchPage(1, params, false);
  }, [fetchPage, params, paramsKey]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    fetchPage(page + 1, params, true);
  }, [fetchPage, hasMore, loading, loadingMore, page, params]);

  const reload = useCallback(() => {
    setCars([]);
    setPage(1);
    setHasMore(false);
    setTotal(0);
    fetchPage(1, params, false);
  }, [fetchPage, params]);

  return { cars, loading, error, hasMore, total, loadingMore, loadMore, reload };
};

export default useCars;
