package com.gstbilling.app.ui.dataimport

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ExportUtilsTest {

    // --- sanitizeCsvValue tests ---

    @Test
    fun `sanitizeCsvValue returns plain string when no special chars`() {
        assertEquals("Hello", ExportUtils.sanitizeCsvValue("Hello"))
    }

    @Test
    fun `sanitizeCsvValue escapes double quotes`() {
        assertEquals("\"He said \"\"hello\"\"\"", ExportUtils.sanitizeCsvValue("He said \"hello\""))
    }

    @Test
    fun `sanitizeCsvValue wraps string starting with = in quotes`() {
        assertEquals("\"=SUM(A1:A10)\"", ExportUtils.sanitizeCsvValue("=SUM(A1:A10)"))
    }

    @Test
    fun `sanitizeCsvValue wraps string starting with + in quotes`() {
        assertEquals("\"+123\"", ExportUtils.sanitizeCsvValue("+123"))
    }

    @Test
    fun `sanitizeCsvValue wraps string starting with - in quotes`() {
        assertEquals("\"-500\"", ExportUtils.sanitizeCsvValue("-500"))
    }

    @Test
    fun `sanitizeCsvValue wraps string starting with @ in quotes`() {
        assertEquals("\"@gmail.com\"", ExportUtils.sanitizeCsvValue("@gmail.com"))
    }

    @Test
    fun `sanitizeCsvValue wraps string containing comma in quotes`() {
        assertEquals("\"New York, NY\"", ExportUtils.sanitizeCsvValue("New York, NY"))
    }

    @Test
    fun `sanitizeCsvValue wraps string containing newline in quotes`() {
        assertEquals("\"Line1\\nLine2\"", ExportUtils.sanitizeCsvValue("Line1\nLine2"))
    }

    @Test
    fun `sanitizeCsvValue wraps string containing carriage return in quotes`() {
        assertEquals("\"Line1\\rLine2\"", ExportUtils.sanitizeCsvValue("Line1\rLine2"))
    }

    @Test
    fun `sanitizeCsvValue handles empty string`() {
        assertEquals("", ExportUtils.sanitizeCsvValue(""))
    }

    // --- escapeJsonValue tests ---

    @Test
    fun `escapeJsonValue escapes backslash`() {
        assertEquals("path\\\\to\\\\file", ExportUtils.escapeJsonValue("path\\to\\file"))
    }

    @Test
    fun `escapeJsonValue escapes double quote`() {
        assertEquals("say \\\"hi\\\"", ExportUtils.escapeJsonValue("say \"hi\""))
    }

    @Test
    fun `escapeJsonValue escapes newline`() {
        assertEquals("line1\\nline2", ExportUtils.escapeJsonValue("line1\nline2"))
    }

    @Test
    fun `escapeJsonValue escapes carriage return`() {
        assertEquals("line1\\rline2", ExportUtils.escapeJsonValue("line1\rline2"))
    }

    @Test
    fun `escapeJsonValue escapes tab`() {
        assertEquals("col1\\tcol2", ExportUtils.escapeJsonValue("col1\tcol2"))
    }

    @Test
    fun `escapeJsonValue escapes backspace`() {
        assertEquals("a\\bb", ExportUtils.escapeJsonValue("a\bb"))
    }

    @Test
    fun `escapeJsonValue escapes form feed`() {
        assertEquals("a\\fb", ExportUtils.escapeJsonValue("a\u000Cb"))
    }

    @Test
    fun `escapeJsonValue escapes control character below 0x20`() {
        assertEquals("\\u0001", ExportUtils.escapeJsonValue("\u0001"))
    }

    @Test
    fun `escapeJsonValue preserves normal text`() {
        assertEquals("Hello World 123", ExportUtils.escapeJsonValue("Hello World 123"))
    }

    @Test
    fun `escapeJsonValue handles unicode emoji`() {
        assertEquals("Invoice \uD83D\uDCC4", ExportUtils.escapeJsonValue("Invoice \uD83D\uDCC4"))
    }

    // --- escapeJsonKey tests ---

    @Test
    fun `escapeJsonKey escapes backslash in key`() {
        assertEquals("key\\\\name", ExportUtils.escapeJsonKey("key\\name"))
    }

    @Test
    fun `escapeJsonKey escapes double quote in key`() {
        assertEquals("key\\\"name", ExportUtils.escapeJsonKey("key\"name"))
    }

    @Test
    fun `escapeJsonKey preserves normal key`() {
        assertEquals("Invoice No", ExportUtils.escapeJsonKey("Invoice No"))
    }

    // --- buildCsv tests ---

    @Test
    fun `buildCsv includes BOM at start`() {
        val csv = ExportUtils.buildCsv(listOf("A"), listOf(listOf("1")))
        assertTrue(csv.startsWith("\uFEFF"))
    }

    @Test
    fun `buildCsv produces correct header row`() {
        val csv = ExportUtils.buildCsv(listOf("Name", "Age"), listOf(listOf("Alice", "30")))
        val lines = csv.trimEnd().split("\n")
        assertEquals("Name,Age", lines[0])
    }

    @Test
    fun `buildCsv produces correct data row`() {
        val csv = ExportUtils.buildCsv(listOf("Name", "Age"), listOf(listOf("Alice", "30")))
        val lines = csv.trimEnd().split("\n")
        assertEquals("Alice,30", lines[1])
    }

    @Test
    fun `buildCsv escapes comma in values`() {
        val csv = ExportUtils.buildCsv(listOf("City"), listOf(listOf("New York, NY")))
        assertTrue(csv.contains("\"New York, NY\""))
    }

    @Test
    fun `buildCsv escapes formula injection`() {
        val csv = ExportUtils.buildCsv(listOf("Name"), listOf(listOf("=SUM(1)")))
        assertTrue(csv.contains("\"=SUM(1)\""))
    }

    @Test
    fun `buildCsv handles multiple rows`() {
        val csv = ExportUtils.buildCsv(
            listOf("Name"),
            listOf(listOf("Alice"), listOf("Bob"), listOf("Charlie"))
        )
        val lines = csv.trimEnd().split("\n")
        assertEquals(4, lines.size) // header + 3 rows
        assertEquals("Alice", lines[1])
        assertEquals("Bob", lines[2])
        assertEquals("Charlie", lines[3])
    }

    @Test
    fun `buildCsv handles empty rows`() {
        val csv = ExportUtils.buildCsv(listOf("Name", "Phone"), emptyList())
        val lines = csv.trimEnd().split("\n")
        assertEquals(1, lines.size) // only header
    }

    // --- buildJsonString tests ---

    @Test
    fun `buildJsonString produces valid JSON array`() {
        val json = ExportUtils.buildJsonString(listOf("Name"), listOf(listOf("Alice")))
        assertTrue(json.startsWith("["))
        assertTrue(json.endsWith("]"))
    }

    @Test
    fun `buildJsonString produces correct key-value pair`() {
        val json = ExportUtils.buildJsonString(listOf("Name"), listOf(listOf("Alice")))
        assertTrue(json.contains("\"Name\": \"Alice\""))
    }

    @Test
    fun `buildJsonString handles multiple rows`() {
        val json = ExportUtils.buildJsonString(listOf("Name"), listOf(listOf("Alice"), listOf("Bob")))
        assertTrue(json.contains("\"Name\": \"Alice\""))
        assertTrue(json.contains("\"Name\": \"Bob\""))
    }

    @Test
    fun `buildJsonString escapes quotes in values`() {
        val json = ExportUtils.buildJsonString(listOf("Name"), listOf(listOf("O\"Brien")))
        assertTrue(json.contains("\"Name\": \"O\\\"Brien\""))
    }

    @Test
    fun `buildJsonString escapes newlines in values`() {
        val json = ExportUtils.buildJsonString(listOf("Name"), listOf(listOf("Line1\nLine2")))
        assertTrue(json.contains("\\n"))
    }

    @Test
    fun `buildJsonString produces pretty-printed output`() {
        val json = ExportUtils.buildJsonString(listOf("A"), listOf(listOf("1")))
        assertTrue(json.contains("  {"))
        assertTrue(json.contains("    \"A\""))
    }

    @Test
    fun `buildJsonString handles empty rows`() {
        val json = ExportUtils.buildJsonString(listOf("Name"), emptyList())
        assertEquals("[\n]", json)
    }

    @Test
    fun `buildJsonString handles empty headers`() {
        val json = ExportUtils.buildJsonString(emptyList(), listOf(listOf()))
        assertTrue(json.contains("{"))
        assertTrue(json.contains("}"))
    }

    @Test
    fun `buildJsonString handles missing row values gracefully`() {
        val json = ExportUtils.buildJsonString(listOf("A", "B", "C"), listOf(listOf("1")))
        assertTrue(json.contains("\"A\": \"1\""))
        assertTrue(json.contains("\"B\": \"\""))
        assertTrue(json.contains("\"C\": \"\""))
    }
}
