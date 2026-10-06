"""Attendance records aggregation and student dashboard stats.

Pure data transformations — extracted from teacher_screen.teacher_tab_attendance_records
and student_screen.student_dashboard.
"""

from datetime import datetime

import pandas as pd


def flatten_attendance_records(records):
    """Flatten raw attendance records into per-row dicts with ts_group.

    Parameters
    ----------
    records : list[dict]
        Raw rows from ``get_attendance_for_teacher`` — each has ``timestamp``,
        ``is_present``, and a nested ``subjects`` dict.

    Returns
    -------
    list[dict]
        Each dict has ``ts_raw``, ``ts_group``, ``Time``, ``Subject``,
        ``Subject Code``, ``is_present``.
    """
    data = []
    for r in records:
        ts = r.get('timestamp')
        data.append({
            "ts_raw": ts,
            "ts_group": ts.split(".")[0] if ts else None,
            "Time": datetime.fromisoformat(ts).strftime("%Y-%m-%d %I:%M %p") if ts else "N/A",
            "Subject": r['subjects']['name'],
            "Subject Code": r['subjects']['subject_code'],
            "is_present": bool(r.get('is_present', False))
        })
    return data


def filter_records_by_date(df, start_date, end_date):
    """Filter a records DataFrame to the given date range.

    Parameters
    ----------
    df : pd.DataFrame
        Must contain a ``ts_group`` column with ISO-formatted timestamps.
    start_date : datetime.date
        Inclusive start date.
    end_date : datetime.date
        Inclusive end date.

    Returns
    -------
    pd.DataFrame
        Filtered copy with a ``Date_Obj`` column added.
    """
    df = df.copy()
    df['Date_Obj'] = pd.to_datetime(df['ts_group']).dt.date
    return df[(df['Date_Obj'] >= start_date) & (df['Date_Obj'] <= end_date)]


def aggregate_attendance_sessions(df):
    """Aggregate a records DataFrame into per-session summaries.

    Parameters
    ----------
    df : pd.DataFrame
        Must contain ``ts_group``, ``Time``, ``Subject``, ``Subject Code``,
        ``is_present``.

    Returns
    -------
    pd.DataFrame
        Grouped summary with columns ``ts_group, Time, Subject, Subject Code,
        Present_Count, Total_Count, Attendance Stats``.
    """
    summary = (
        df.groupby(['ts_group', 'Time', 'Subject', 'Subject Code'])
        .agg(
            Present_Count=('is_present', 'sum'),
            Total_Count=('is_present', 'count')
        ).reset_index()
    )

    summary['Attendance Stats'] = (
        "\u2705 " + summary['Present_Count'].astype(str) + " /"
        + summary['Total_Count'].astype(str) + ' Students'
    )

    return summary


def compute_student_subject_stats(dashboard_data):
    """Compute per-subject attendance stats for the student dashboard.

    Parameters
    ----------
    dashboard_data : list[dict]
        Each node has a ``subjects`` key containing ``subject_id``,
        ``subject_code``, ``name``, ``section`` and an ``attendance_logs``
        list.

    Returns
    -------
    list[dict]
        Each dict has ``subject_id, subject_code, name, section,
        total, attended, percentage``.
    """
    results = []
    for node in (dashboard_data or []):
        sub = node['subjects']
        logs = sub.get('attendance_logs', [])

        total = 0
        attended = 0
        for log in logs:
            total += 1
            if log.get('is_present'):
                attended += 1

        percentage = (attended / total * 100) if total > 0 else 0.0

        results.append({
            "subject_id": sub['subject_id'],
            "subject_code": sub['subject_code'],
            "name": sub['name'],
            "section": sub['section'],
            "total": total,
            "attended": attended,
            "percentage": percentage,
        })
    return results
