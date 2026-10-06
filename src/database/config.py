import streamlit as st
from supabase import create_client, Client

# Use the service-role key for server-side access (bypasses RLS).
# Fall back to the publishable anon key for backwards compatibility,
# but this will be blocked once RLS policies are tightened.
_key = st.secrets.get("SUPABASE_SERVICE_KEY", st.secrets.get("SUPABASE_KEY", ""))

supabase: Client = create_client(
    st.secrets["SUPABASE_URL"],
    _key,
)