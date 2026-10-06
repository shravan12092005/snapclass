# backend tests package — allow running with: python -m pytest backend/tests/
import os
os.environ.setdefault("DEV_MODE", "true")
os.environ.setdefault("SUPABASE_URL", "https://mock.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "mock-supabase-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "mock-service-role-key")
