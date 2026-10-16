const { prisma } = require('../prisma');

/**
 * Generate sequential Student ID in the format KH-YYYY-NNN
 *
 * @param {number} [year] - Academic or admission year (defaults to current year)
 * @param {object} [tx] - Optional Prisma transaction client
 * @returns {Promise<string>} Next sequential student ID
 */
async function generateStudentId(year = new Date().getFullYear(), tx = prisma) {
  const prefix = `KH-${year}-`;

  // Find the student with the highest ID number for the given year
  const lastStudent = await tx.student.findFirst({
    where: {
      studentId: {
        startsWith: prefix
      }
    },
    orderBy: {
      studentId: 'desc'
    },
    select: {
      studentId: true
    }
  });

  let nextSequence = 1;

  if (lastStudent && lastStudent.studentId) {
    const parts = lastStudent.studentId.split('-');
    if (parts.length === 3) {
      const parsedNum = parseInt(parts[2], 10);
      if (!isNaN(parsedNum)) {
        nextSequence = parsedNum + 1;
      }
    }
  }

  const paddedSequence = String(nextSequence).padStart(3, '0');
  return `${prefix}${paddedSequence}`;
}

module.exports = {
  generateStudentId
};
