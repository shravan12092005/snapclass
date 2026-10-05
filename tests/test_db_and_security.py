import html as html_mod
import unittest
from unittest.mock import MagicMock, patch

from src.database.exceptions import DatabaseError
from src.database.db import (
    safe_execute,
    fetch_all_pages,
    create_attendance,
    create_subject,
    delete_subject,
    enroll_student_to_subject,
    lookup_subject_by_code,
)
from src.components.subject_card import subject_card


class TestDatabaseErrorPaths(unittest.TestCase):
    """Verify database errors raise DatabaseError and never fail silently."""

    def test_safe_execute_raises_database_error_on_exception(self):
        query_mock = MagicMock()
        query_mock.execute.side_effect = Exception("Supabase connection timeout")

        with self.assertRaises(DatabaseError) as ctx:
            safe_execute(query_mock)
        self.assertIn("Supabase connection timeout", str(ctx.exception))

    @patch('src.database.db.safe_execute')
    def test_create_attendance_error_propagates(self, mock_safe):
        mock_safe.side_effect = DatabaseError("insert into attendance_logs violated FK constraint")

        with self.assertRaises(DatabaseError):
            create_attendance([{"student_id": 999, "subject_id": 1, "is_present": True}])

    @patch('src.database.db.safe_execute')
    def test_create_subject_error_propagates(self, mock_safe):
        mock_safe.side_effect = DatabaseError("duplicate key value violates unique constraint")

        with self.assertRaises(DatabaseError):
            create_subject("CS101", "Intro CS", "A", 1)

    @patch('src.database.db.safe_execute')
    def test_delete_subject_error_propagates(self, mock_safe):
        mock_safe.side_effect = DatabaseError("foreign key violation during delete")

        with self.assertRaises(DatabaseError):
            delete_subject(1)

    @patch('src.database.db.safe_execute')
    def test_enroll_student_error_propagates(self, mock_safe):
        mock_safe.side_effect = DatabaseError("relation subject_students does not exist")

        with self.assertRaises(DatabaseError):
            enroll_student_to_subject(1, 1)

    @patch('src.database.db.safe_execute')
    def test_lookup_subject_ambiguous_returns_none(self, mock_safe):
        """When multiple subjects match (ambiguous), lookup must return None, not res.data[0]."""
        mock_safe.return_value = MagicMock(data=[
            {"subject_id": 1, "subject_code": "CS101"},
            {"subject_id": 2, "subject_code": "cs101"}
        ])
        result = lookup_subject_by_code("cs101")
        self.assertIsNone(result)


class TestPagination(unittest.TestCase):
    """Verify that fetch_all_pages navigates pages without truncating at 1000 items."""

    def test_fetch_all_pages_multi_page(self):
        # Suppose page_size = 3, and total 7 items
        mock_query = MagicMock()

        def range_side_effect(start, end):
            sub_query = MagicMock()
            if start == 0:
                sub_query.execute.return_value = MagicMock(data=[{"id": 1}, {"id": 2}, {"id": 3}])
            elif start == 3:
                sub_query.execute.return_value = MagicMock(data=[{"id": 4}, {"id": 5}, {"id": 6}])
            elif start == 6:
                sub_query.execute.return_value = MagicMock(data=[{"id": 7}])
            else:
                sub_query.execute.return_value = MagicMock(data=[])
            return sub_query

        mock_query.range.side_effect = range_side_effect

        results = fetch_all_pages(mock_query, page_size=3)
        self.assertEqual(len(results), 7)
        self.assertEqual([r['id'] for r in results], [1, 2, 3, 4, 5, 6, 7])
        self.assertEqual(mock_query.range.call_count, 3)

    def test_fetch_all_pages_single_page(self):
        mock_query = MagicMock()
        mock_sub = MagicMock()
        mock_sub.execute.return_value = MagicMock(data=[{"id": 1}, {"id": 2}])
        mock_query.range.return_value = mock_sub

        results = fetch_all_pages(mock_query, page_size=5)
        self.assertEqual(len(results), 2)
        self.assertEqual(mock_query.range.call_count, 1)


class TestHtmlEscaping(unittest.TestCase):
    """Verify that all user inputs are escaped against XSS before being rendered in HTML."""

    @patch('streamlit.markdown')
    def test_subject_card_escapes_xss(self, mock_markdown):
        xss_payload = "<script>alert('pwned')</script>&\"'"
        subject_card(
            name=xss_payload,
            code="<code>xss</code>",
            section="<sec>",
            stats=[("🔥", "<b>Stat</b>", "<script>100%</script>")]
        )

        mock_markdown.assert_called_once()
        rendered_html = mock_markdown.call_args[0][0]

        # Raw tags must NOT exist in the output
        self.assertNotIn("<script>", rendered_html)
        self.assertNotIn("<code>", rendered_html)
        self.assertNotIn("<sec>", rendered_html)
        self.assertNotIn("<b>Stat</b>", rendered_html)

        # Escaped entities must exist
        self.assertIn(html_mod.escape(xss_payload), rendered_html)
        self.assertIn("&lt;code&gt;xss&lt;/code&gt;", rendered_html)
        self.assertIn("&lt;b&gt;Stat&lt;/b&gt;", rendered_html)

    def test_attendance_results_escape_string(self):
        raw_name = "<img src=x onerror=alert(1)>"
        safe_name = html_mod.escape(raw_name)
        self.assertNotIn("<img", safe_name)
        self.assertIn("&lt;img src=x onerror=alert(1)&gt;", safe_name)


if __name__ == '__main__':
    unittest.main()
