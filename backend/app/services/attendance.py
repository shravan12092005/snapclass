"""Attendance result building for face and voice pipelines.

Pure data transformations — no UI, no DB, no ML calls.
Extracted from teacher_screen.py and dialog_voice_attendance.py.
"""


def build_face_attendance_results(enrolled_students, all_detected_ids, subject_id, timestamp):
    """Build attendance results and log entries from face-detection output.

    Parameters
    ----------
    enrolled_students : list[dict]
        Each element has a ``"students"`` key containing the student record
        (with at least ``student_id`` and ``name``).
    all_detected_ids : dict[int, list[str]]
        Mapping of detected student IDs to the source labels
        (e.g. ``["Photo 1", "Photo 3"]``).
    subject_id : int
        The subject being attended.
    timestamp : str
        ISO-formatted timestamp for the attendance session.

    Returns
    -------
    tuple[list[dict], list[dict]]
        ``(results, attendance_to_log)`` where *results* has keys
        ``Name, ID, Source, Status`` and *attendance_to_log* has keys
        ``student_id, subject_id, timestamp, is_present``.
    """
    results = []
    attendance_to_log = []

    for node in enrolled_students:
        student = node['students']
        sources = all_detected_ids.get(int(student['student_id']), [])
        is_present = len(sources) > 0

        results.append({
            "Name": student['name'],
            "ID": student['student_id'],
            "Source": ", ".join(sources) if is_present else "-",
            "Status": "\u2705 Present" if is_present else "\u274c Absent"
        })

        attendance_to_log.append({
            'student_id': student['student_id'],
            'subject_id': subject_id,
            'timestamp': timestamp,
            'is_present': bool(is_present)
        })

    return results, attendance_to_log


def separate_voice_candidates(enrolled_students):
    """Separate enrolled students into those with/without voice profiles.

    Parameters
    ----------
    enrolled_students : list[dict]
        Each element has a ``"students"`` key containing the student record.

    Returns
    -------
    tuple[dict, set]
        ``(candidates_dict, no_profile_ids)`` where *candidates_dict* maps
        ``student_id -> voice_embedding`` for students with profiles, and
        *no_profile_ids* is the set of IDs without profiles.
    """
    candidates_dict = {}
    no_profile_ids = set()
    for s in enrolled_students:
        student = s['students']
        if student.get('voice_embedding'):
            candidates_dict[student['student_id']] = student['voice_embedding']
        else:
            no_profile_ids.add(student['student_id'])
    return candidates_dict, no_profile_ids


def build_voice_attendance_results(enrolled_students, detected_scores, no_profile_ids, subject_id, timestamp):
    """Build attendance results from voice-detection output.

    Students without voice profiles are marked ``"\u26a0\ufe0f No voice profile"``
    and excluded from the attendance log (not counted as absent).

    Parameters
    ----------
    enrolled_students : list[dict]
        Each element has a ``"students"`` key.
    detected_scores : dict[int, float]
        ``{student_id: similarity_score}`` for recognized speakers.
    no_profile_ids : set[int]
        Student IDs without voice profiles.
    subject_id : int
        The subject being attended.
    timestamp : str
        ISO-formatted timestamp.

    Returns
    -------
    tuple[list[dict], list[dict]]
        ``(results, attendance_to_log)`` same schema as face counterpart.
    """
    results = []
    attendance_to_log = []

    for node in enrolled_students:
        student = node['students']
        sid = student['student_id']

        if sid in no_profile_ids:
            status_label = "\u26a0\ufe0f No voice profile"
            is_present = False
            source_val = "N/A"
        else:
            score = detected_scores.get(sid, 0.0)
            is_present = sid in detected_scores
            status_label = "\u2705 Present" if is_present else "\u274c Absent"
            source_val = score if is_present else "-"

        results.append({
            "Name": student['name'],
            "ID": sid,
            "Source": source_val,
            "Status": status_label
        })

        # Students without profiles are excluded from the log
        # so they aren't counted as absent by the AI
        if sid not in no_profile_ids:
            attendance_to_log.append({
                'student_id': sid,
                'subject_id': subject_id,
                'timestamp': timestamp,
                'is_present': bool(is_present)
            })

    return results, attendance_to_log
