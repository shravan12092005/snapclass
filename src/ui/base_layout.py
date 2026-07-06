import streamlit as st



def style_background_home():

    st.markdown("""
        <style>

                .stApp {
                    background: #5865F2 !important;
                }

                .stApp div[data-testid="stColumn"]{
                    background-color:#E0E3FF !important;
                    padding:2.5rem !important;
                    border-radius: 5rem !important;
                    }

                .stApp div[data-testid="stColumn"] h2 {
                    color: #000000 !important;
                }
        </style>  

                """
            ,unsafe_allow_html=True)
    

def style_background_dashboard():

    st.markdown("""
        <style>

                .stApp {
                    background: #E0E3FF !important;
                }

        </style>  

                """
            ,unsafe_allow_html=True)
    

    

def style_base_layout():
# asdasd
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
                

            button{
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

            button:hover{
                transform :scale(1.05)}

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

                """
            ,unsafe_allow_html=True) 