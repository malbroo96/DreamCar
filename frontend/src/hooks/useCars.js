import { useCallback, useEffect, useState } from "react";
import { getCars } from "../services/carService";

const useCars = (params = {}) => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getCars(params);
      setCars(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load cars");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { cars, loading, error, reload };
};

export default useCars;
