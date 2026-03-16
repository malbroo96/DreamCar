import { useCallback, useEffect, useRef, useState } from "react";
import { getCars } from "../services/carService";

const useCars = (params = {}) => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const paramsKey = JSON.stringify(params);
  const prevKey = useRef(null);

  const reload = useCallback(async (p) => {
    try {
      setLoading(true);
      setError("");
      const data = await getCars(p);
      setCars(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load cars");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (prevKey.current === paramsKey) return;
    prevKey.current = paramsKey;
    reload(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  return { cars, loading, error, reload: () => reload(params) };
};

export default useCars;