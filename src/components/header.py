import streamlit as st

def header_home():
    logo_url = "https://i.ibb.co/YTYGn5qV/logo.png"
    st.markdown(f"""
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; margin-bottom:30px; margin-top:30px">
            <img src='{logo_url}' style='height:100px;' />
            <div style="text-align:center; color:#E0E3FF; font-family: 'Climate Crisis', sans-serif; font-size: 3.5rem; line-height: 1.1; font-weight: bold;">SNAP<br/>CLASS</div>
        </div>   
        """, unsafe_allow_html=True)

def header_dashboard():
    logo_url = "https://i.ibb.co/YTYGn5qV/logo.png"
    st.markdown(f"""
        <div style="display:flex; align-items:center; justify-content:center; gap:10px">
            <img src='{logo_url}' style='height:85px;' />
            <div style="text-align:left; color:#5865F2; font-family: 'Climate Crisis', sans-serif; font-size: 2rem; line-height: 0.9; font-weight: bold;">SNAP<br/>CLASS</div>
        </div>   
        """, unsafe_allow_html=True)