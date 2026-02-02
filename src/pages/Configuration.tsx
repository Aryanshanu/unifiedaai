import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Configuration page - redirects to Settings > Platform Config
 * This page was consolidated into Settings to avoid duplication
 */
export default function Configuration() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Settings page with config section active
    navigate("/settings", { replace: true });
  }, [navigate]);

  return null;
}
