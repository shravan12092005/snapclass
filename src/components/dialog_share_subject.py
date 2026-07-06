import streamlit as st

import segno
import io


@st.dialog("Share Class Link")
def share_subject_dialog(subject_name, subject_code):
    app_domain = "https://snapclassx.streamlit.app"
    join_url = f"{app_domain}/?join-code={subject_code}"

    st.header("Scan to Join")

    qr = segno.make(join_url)

    out = io.BytesIO()

    qr.save(out, kind='png', scale=10, border=1)

    col1, col2 = st.columns(2)

    with col1:
        st.markdown('### Class Credentials')
        st.write(f"Subject: **{subject_name}**")
        st.code(join_url, language="text")
        st.code(subject_code, language="text")
        
        import urllib.parse
        encoded_message = urllib.parse.quote(f"Hey! Join our class attendance portal for {subject_name} on SnapClass here: {join_url}")
        whatsapp_share_url = f"https://api.whatsapp.com/send?text={encoded_message}"
        
        st.link_button("💬 Share via WhatsApp", whatsapp_share_url, use_container_width=True)
        st.info('Or copy the class credentials above to distribute via Email/LMS.')

    with col2:
        st.markdown('### Scan to Join')
        st.image(out.getvalue(), caption='QRCODE for class joining')

        
