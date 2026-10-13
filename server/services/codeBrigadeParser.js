/**
 * Code Brigade / Chalkpad Pro HTML & Response Parser — CampusFlow AI
 *
 * Robust, resilient extraction of university attendance records from:
 *  1. Subject-wise summaries (mobilev2/commonPage id:28)
 *  2. Detailed lecture registers (chalkpadpro/studentDetails/getAttendanceRegister)
 *
 * Handles missing fields, variable spacing, HTML entities, and malformed tags safely.
 */

'use strict';

/**
 * Strip HTML tags and decode basic entities to clean text.
 */
function cleanHtmlText(html) {
  if (!html || typeof html !== 'string') return '';
  let str = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  return str.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

/**
 * Parse subject-wise summary from commonPage HTML content.
 *
 * @param {string} htmlContent
 * @returns {Array<Object>} Extracted subjects with official delivered/attended counts
 */
function parseAttendanceSubjectwise(htmlContent) {
  if (!htmlContent) return [];
  const subjects = [];

  const rawClean = cleanHtmlText(htmlContent).replace(/\s+/g, ' ').trim();

  // Standard Chalkpad Pro Subject Summary Regex Pattern
  const regex = /([^0-9]+?)\s+([0-9]{2}[A-Z]{2,5}[0-9]{2,5}|[A-Z]{2,4}[0-9]{3,5})\s+Teacher\s*:\s*(.+?)From\s*:\s*(\d{1,2}\s+\w+\s+\d{4})\s+TO\s*:\s*(\d{1,2}\s+\w+\s+\d{4})\s*Delivered\s*:\s*(\d+)\s*Attended\s*:\s*(\d+)\s*Absent\s*:\s*(\d+)\s*DL\s*:\s*(\d+)\s*ML\s*:\s*(\d+)\s*Total Percentage\s*:\s*([\d.]+)%/gi;

  let match;
  while ((match = regex.exec(rawClean)) !== null) {
    const [
      ,
      subjectName,
      courseCode,
      teacher,
      fromDate,
      toDate,
      deliveredStr,
      attendedStr,
      absentStr,
      dlStr,
      mlStr,
      pctStr,
    ] = match;

    const delivered = parseInt(deliveredStr, 10) || 0;
    const attended = parseInt(attendedStr, 10) || 0;
    const absent = parseInt(absentStr, 10) || 0;
    const dl = parseInt(dlStr, 10) || 0;
    const ml = parseInt(mlStr, 10) || 0;
    const pct = parseFloat(pctStr) || (delivered > 0 ? Math.round((attended / delivered) * 1000) / 10 : 0);

    subjects.push({
      name: subjectName.trim(),
      code: courseCode.trim().toUpperCase(),
      teacher: teacher.trim(),
      fromDate: fromDate.trim(),
      toDate: toDate.trim(),
      totalClasses: delivered,
      attendedClasses: attended,
      missedClasses: absent,
      dutyLeave: dl,
      medicalLeave: ml,
      attendancePercentage: pct,
      source: 'CODE_BRIGADE',
    });
  }

  // Fallback: If regex didn't match (due to customized table markup), try table cell parsing
  if (subjects.length === 0 && (htmlContent.includes('<table') || htmlContent.includes('<tr'))) {
    const rowMatches = htmlContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    for (const row of rowMatches) {
      const cells = (row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [])
        .map(c => cleanHtmlText(c).trim());

      // Check if row has Delivered and Attended numbers
      if (cells.length >= 4) {
        const potentialDelivered = parseInt(cells[cells.length - 3], 10);
        const potentialAttended = parseInt(cells[cells.length - 2], 10);
        if (!isNaN(potentialDelivered) && !isNaN(potentialAttended) && potentialDelivered > 0) {
          const name = cells[0];
          const code = cells[1] || `SUBJ-${subjects.length + 1}`;
          if (name && !name.toLowerCase().includes('subject')) {
            subjects.push({
              name,
              code: code.toUpperCase(),
              teacher: '',
              totalClasses: potentialDelivered,
              attendedClasses: potentialAttended,
              missedClasses: Math.max(0, potentialDelivered - potentialAttended),
              attendancePercentage: Math.round((potentialAttended / potentialDelivered) * 1000) / 10,
              source: 'CODE_BRIGADE',
            });
          }
        }
      }
    }
  }

  return subjects;
}

/**
 * Parse detailed attendance register HTML from chalkpadpro endpoint.
 *
 * @param {string} htmlContent
 * @returns {Array<Object>} List of subjects with detailed session entries
 */
function parseAttendanceRegister(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') return [];
  const subjectsRegister = [];

  try {
    // Each subject has its own table section beginning with <thead>
    const theadSections = htmlContent.split(/<thead>/gi).filter(s => s.trim().length > 0);

    for (const section of theadSections) {
      // Extract subject name & code: <th>Subject Name<br>(Course Code)</th>
      const headerMatch = section.match(/<th>([^<]+)<br>\(([^)]+)\)<\/th>/i) ||
                          section.match(/<th>([^<]+)\s*\(([^)]+)\)<\/th>/i);
      if (!headerMatch) continue;

      const subjectName = headerMatch[1].trim();
      const courseCode = headerMatch[2].trim().toUpperCase();

      // Extract lecture dates & periods: <th>1<br>02-01<br>1</th>
      const lectures = [];
      const lecRegex = /<th>(\d+)<br>(\d{1,2}[-/]\d{1,2})<br>(\d+)<\/th>/gi;
      let lecMatch;
      while ((lecMatch = lecRegex.exec(section)) !== null) {
        lectures.push({
          lectureNum: parseInt(lecMatch[1], 10),
          dateStr: lecMatch[2].trim(),
          period: `Period ${lecMatch[3].trim()}`,
        });
      }

      // Extract student row from <tbody>
      const tbodyMatch = section.match(/<tbody[^>]*>([\s\S]*?)(?:<\/tbody>|$)/i);
      if (!tbodyMatch) continue;

      const tbodyHtml = tbodyMatch[1];
      const tdRegex = /<td[^>]*>([^<]*)<\/td>/gi;
      const tdList = [];
      let tdMatch;
      while ((tdMatch = tdRegex.exec(tbodyHtml)) !== null) {
        tdList.push(tdMatch[1].trim());
      }

      if (tdList.length <= 1) continue;

      // First cell is student name, remaining cells are status for each lecture
      const statusCells = tdList.slice(1);
      const percentageStr = statusCells.pop() || '0%';
      const totalStr = statusCells.pop() || '0/0';

      const entries = [];
      const currentYear = new Date().getFullYear();

      for (let i = 0; i < Math.min(lectures.length, statusCells.length); i++) {
        const val = statusCells[i];
        const lec = lectures[i];

        // Code Brigade status codes: 'P' = Present, 'X'/'A' = Absent, 'ML' = Medical Leave, 'DL' = Duty Leave
        let status = 'PRESENT';
        if (val === 'X' || val === 'A' || val === 'Absent') {
          status = 'ABSENT';
        } else if (val === 'ML') {
          status = 'PRESENT'; // Usually university treats approved medical leave as credit
        } else if (val === 'DL') {
          status = 'PRESENT'; // Approved duty leave is credited as present
        } else {
          status = 'PRESENT';
        }

        // Construct standard ISO date from DD-MM or MM-DD
        let sessionDate = new Date();
        const parts = lec.dateStr.split(/[-/]/);
        if (parts.length === 2) {
          const d1 = parseInt(parts[0], 10);
          const d2 = parseInt(parts[1], 10);
          // Academic convention: DD-MM
          const day = d1;
          const month = d2 - 1; // 0-indexed
          sessionDate = new Date(currentYear, month, day, 9, 0, 0);
          // If date is in future, it may belong to previous semester/year
          if (sessionDate > new Date()) {
            sessionDate.setFullYear(currentYear - 1);
          }
        }

        entries.push({
          lectureNum: lec.lectureNum,
          date: sessionDate,
          period: lec.period,
          status,
          rawStatus: val,
        });
      }

      subjectsRegister.push({
        subjectName,
        courseCode,
        entries,
        totalStr,
        percentageStr,
      });
    }
  } catch (err) {
    console.error('Error in parseAttendanceRegister:', err);
  }

  return subjectsRegister;
}

module.exports = {
  cleanHtmlText,
  parseAttendanceSubjectwise,
  parseAttendanceRegister,
};
