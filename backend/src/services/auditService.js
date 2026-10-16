const { prisma } = require('../prisma');

/**
 * Record an audit log entry
 *
 * @param {object} params
 * @param {string} params.userId - User performing the action
 * @param {string} params.action - Action name (e.g., 'CREATE', 'UPDATE', 'DELETE', 'PAYMENT', 'BILLING_GENERATE')
 * @param {string} params.entity - Entity affected (e.g., 'Student', 'FeeGroup', 'LedgerEntry', 'BillingPeriod')
 * @param {string} params.entityId - Primary key of the affected entity
 * @param {object|null} [params.oldValue] - Previous state before action
 * @param {object|null} [params.newValue] - New state after action
 * @param {string|null} [params.ipAddress] - Request IP address
 * @param {object} [params.tx] - Optional Prisma transaction client
 * @returns {Promise<object>} Created AuditLog entry
 */
async function logAudit({
  userId,
  action,
  entity,
  entityId,
  oldValue = null,
  newValue = null,
  ipAddress = null,
  tx = prisma
}) {
  try {
    // Sanitize any non-serializable objects (such as Decimals or Dates)
    const sanitizedOld = oldValue ? JSON.parse(JSON.stringify(oldValue)) : null;
    const sanitizedNew = newValue ? JSON.parse(JSON.stringify(newValue)) : null;

    return await tx.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: String(entityId),
        oldValue: sanitizedOld,
        newValue: sanitizedNew,
        ipAddress: ipAddress ? String(ipAddress) : null
      }
    });
  } catch (err) {
    // Audit logging should not crash business operations if a non-critical error occurs,
    // but should be logged to stderr
    console.error('[AuditLog Error]: Failed to record audit log:', err.message);
    return null;
  }
}

module.exports = {
  logAudit
};
