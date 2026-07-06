import streamlit as st

def style_background_home():
    st.markdown("""
        <style>
                .stApp {
                    background: #5865F2 !important;
                }

                /* Force text directly on Home page background to be white */
                .stApp h1, .stApp h2, .stApp h3, .stApp h4, .stApp p, .stApp span, .stApp label {
                    color: #FFFFFF !important;
                }

                .stApp div[data-testid="stColumn"]{
                    background-color:#E0E3FF !important;
                    padding:2.5rem !important;
                    border-radius: 5rem !important;
                }

                /* Force all text inside card columns to be black */
                .stApp div[data-testid="stColumn"] h1,
                .stApp div[data-testid="stColumn"] h2,
                .stApp div[data-testid="stColumn"] h3,
                .stApp div[data-testid="stColumn"] h4,
                .stApp div[data-testid="stColumn"] p,
                .stApp div[data-testid="stColumn"] span,
                .stApp div[data-testid="stColumn"] li,
                .stApp div[data-testid="stColumn"] label {
                    color: #000000 !important;
                }
        </style>  
        """, unsafe_allow_html=True)

def style_background_dashboard():
    st.markdown("""
        <style>
                .stApp {
                    background: #E0E3FF !important;
                }

                /* Force all dashboard text to be black/dark as designed */
                .stApp h1, .stApp h2, .stApp h3, .stApp h4, .stApp h5, .stApp h6, 
                .stApp p, .stApp li, .stApp label {
                    color: #000000 !important;
                }

                /* Target markdown container text */
                div[data-testid="stMarkdownContainer"] p,
                div[data-testid="stMarkdownContainer"] span {
                    color: #000000 !important;
                }

                /* Force selectbox background to white and text to black */
                div[data-testid="stSelectbox"] div[data-baseweb="select"],
                div[data-testid="stSelectbox"] div[role="combobox"] {
                    background-color: #FFFFFF !important;
                    border: 1px solid #D1D5DB !important;
                    border-radius: 0.5rem !important;
                }

                div[data-testid="stSelectbox"] label,
                div[data-testid="stSelectbox"] label p,
                div[data-testid="stSelectbox"] p,
                div[data-testid="stSelectbox"] div[role="combobox"] span {
                    color: #000000 !important;
                }

                /* Ensure radio buttons label/texts are black */
                div[data-testid="stRadio"] label,
                div[data-testid="stRadio"] label p,
                div[data-testid="stRadio"] p {
                    color: #000000 !important;
                }

                /* Ensure checkbox text is black */
                div[data-testid="stCheckbox"] label,
                div[data-testid="stCheckbox"] label p {
                    color: #000000 !important;
                }

                /* Expander titles */
                div[data-testid="stExpander"] summary,
                div[data-testid="stExpander"] summary p {
                    color: #000000 !important;
                }

                /* Tab headers */
                button[data-baseweb="tab"] p {
                    color: #000000 !important;
                }
                button[data-baseweb="tab"] {
                    color: #000000 !important;
                }

                /* File Uploader labels */
                div[data-testid="stFileUploader"] label,
                div[data-testid="stFileUploader"] label p,
                div[data-testid="stFileUploader"] p,
                div[data-testid="stFileUploader"] span {
                    color: #000000 !important;
                }

                /* Notification messages (st.info, warning, success) */
                div[data-testid="stNotification"] p,
                div[data-testid="stNotification"] span {
                    color: #000000 !important;
                }

                /* Streamlit dialog modals background and text color */
                div[role="dialog"],
                div[data-baseweb="modal"] {
                    background-color: #E0E3FF !important;
                }
                div[role="dialog"] h1, div[role="dialog"] h2, div[role="dialog"] h3, 
                div[role="dialog"] h4, div[role="dialog"] p, div[role="dialog"] span, 
                div[role="dialog"] label, div[role="dialog"] li {
                    color: #000000 !important;
                }
        </style>  
        """, unsafe_allow_html=True)

def style_base_layout():
    st.markdown("""
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Climate+Crisis:YEAR@1979&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');

         /* Hide Top Bar of streamlit */
            #MainMenu, footer, header {
                visibility: hidden;
            }
                
            .block-container {
                padding-top:1.5rem !important;    
            }

            h1 {
                font-family: 'Climate Crisis', sans-serif !important;
                font-size: 3.5rem !important;
                line-height:1.1 !important;
                margin-bottom:0rem !important;
            }

            h2 {
                font-family: 'Climate Crisis', sans-serif !important;
                font-size: 2rem !important;
                line-height:0.9 !important;
                margin-bottom:0rem !important;
            }
                
            h3, h4, p {
                font-family: 'Outfit', sans-serif;    
            }

            button {
                border-radius: 1.5rem !important;
                background-color: #5865F2 !important;
                color: white !important;
                padding: 10px 20px !important;
                border: none !important;
                transition: transform 0.25s ease-in-out !important;
            }

            button[kind="secondary"]{
                border-radius: 1.5rem !important;
                background-color: #EB459E !important;
                color: white !important;
                padding: 10px 20px !important;
                border: none !important;
                transition: transform 0.25s ease-in-out !important;
            }

            button[kind="tertiary"]{
                border-radius: 1.5rem !important;
                background-color: black !important;
                color: white !important;
                padding: 10px 20px !important;
                border: none !important;
                transition: transform 0.25s ease-in-out !important;
            }

            /* Lock button label text colors to white */
            .stApp button p, 
            .stApp button span, 
            .stApp button div,
            div[role="dialog"] button p,
            div[role="dialog"] button span,
            div[role="dialog"] button div,
            div[data-baseweb="modal"] button p,
            div[data-baseweb="modal"] button span,
            div[data-baseweb="modal"] button div {
                color: #FFFFFF !important;
            }

            /* Lock selectbox dropdown list styles to light theme colors */
            div[data-baseweb="popover"] ul,
            div[data-baseweb="menu"] ul {
                background-color: #FFFFFF !important;
                border: 1px solid #D1D5DB !important;
            }
            div[data-baseweb="popover"] li,
            div[data-baseweb="menu"] li {
                color: #000000 !important;
                background-color: #FFFFFF !important;
            }
            div[data-baseweb="popover"] li:hover,
            div[data-baseweb="menu"] li:hover {
                background-color: #F3F4F6 !important; /* light gray hover */
            }

            button:hover{
                transform :scale(1.05)
            }

            /* Style Text Input Labels */
            div[data-testid="stTextInput"] label, 
            div[data-testid="stTextInput"] label p {
                color: #000000 !important;
            }

            /* Style Text Input fields */
            div[data-testid="stTextInput"] input {
                background-color: #FFFFFF !important;
                color: #000000 !important;
                caret-color: #000000 !important; /* Cursor color */
            }

            /* Streamlit uses a div wrapper with data-baseweb="input" for the text input box */
            div[data-testid="stTextInput"] div[data-baseweb="input"] {
                background-color: #FFFFFF !important;
                border: 1px solid #D1D5DB !important; /* Subtle light gray border */
            }

            /* Change placeholder text color to medium gray */
            div[data-testid="stTextInput"] input::placeholder {
                color: #6B7280 !important;
            }

            /* Style Camera Input Instruction Text */
            div[data-testid="stCameraInput"] label, 
            div[data-testid="stCameraInput"] label p, 
            div[data-testid="stCameraInput"] p {
                color: #000000 !important;
            }
        </style>  
        """, unsafe_allow_html=True)