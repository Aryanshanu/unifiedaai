CREATE POLICY "Authenticated users can create environments"
  ON public.deployment_environments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update environments"
  ON public.deployment_environments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete non-production environments"
  ON public.deployment_environments FOR DELETE TO authenticated USING (is_production = false);