"""Roster data computation with attendance rates.

Pure data transformation — extracted from teacher_screen._render_roster.
"""

import pandas as pd


def compute_roster_data(roster, att_logs):
    """Compute roster with per-student attendance rates.

    Parameters
    ----------
    roster : list[dict]
        Each element has a ``"students"`` key with ``student_id`` and ``name``.
    att_logs : list[dict]
        Raw attendance log rows with ``student_id`` and ``is_present``.

    Returns
    -------
    list[dict]
        Each dict has keys ``Name, ID, Attended, Rate``.
    """
    if att_logs:
        att_df = pd.DataFrame(att_logs)
        att_agg = att_df.groupby('student_id').agg(
            total=('is_present', 'count'),
            attended=('is_present', 'sum')
        ).reset_index()
        att_map = {int(row['student_id']): row for _, row in att_agg.iterrows()}
    else:
        att_map = {}

    roster_data = []
    for node in roster:
        student = node['students']
        sid = student['student_id']
        agg = att_map.get(sid, {})
        total_days = int(agg.get('total', 0))
        attended_days = int(agg.get('attended', 0))
        rate = (attended_days / total_days * 100) if total_days > 0 else 0.0

        roster_data.append({
            "Name": student['name'],
            "ID": sid,
            "Attended": f"{attended_days}/{total_days} classes",
            "Rate": f"{rate:.1f}%"
        })

    return roster_data
