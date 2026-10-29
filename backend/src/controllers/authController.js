const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../prisma');
const { successResponse, errorResponse } = require('../utils/response');
const { logAudit } = require('../services/auditService');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

function buildUserSessionPayload(user) {
  const student = user.student || null;

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    name: student?.fullName || user.username,
    fullName: student?.fullName || user.username,
    studentId: student?.id || null,
    studentCode: student?.studentId || null,
    roomNumber: student?.roomNumber || null,
    status: student?.status || null,
  };
}

function generateTokens(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    studentId: user.student?.id || null,
    studentCode: user.student?.studentId || null,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

  return { accessToken, refreshToken };
}

async function login(req, res) {
  const { username, password } = req.body || {};
  const cleanUsername = String(username || '').trim();

  if (!cleanUsername) {
    return errorResponse(res, 'Username is required', 400);
  }

  if (!password) {
    return errorResponse(res, 'Password is required', 400);
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: cleanUsername, mode: 'insensitive' } },
        { student: { studentId: { equals: cleanUsername, mode: 'insensitive' } } }
      ]
    },
    include: {
      student: {
        select: {
          id: true,
          studentId: true,
          fullName: true,
          status: true,
          roomNumber: true
        }
      }
    }
  });

  if (!user) {
    return errorResponse(res, 'Invalid username or password', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return errorResponse(res, 'Invalid username or password', 401);
  }

  if (!user.loginEnabled) {
    return errorResponse(res, 'Account is disabled. Please contact the hostel administration.', 403);
  }

  const { accessToken, refreshToken } = generateTokens(user);

  await logAudit({
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    ipAddress: req.ip
  });

  return successResponse(res, {
    accessToken,
    refreshToken,
    user: buildUserSessionPayload(user),
  });
}

async function refreshToken(req, res) {
  const { refreshToken: token } = req.body;

  if (!token) {
    return errorResponse(res, 'Refresh token is required', 400);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (err) {
    return errorResponse(res, 'Invalid or expired refresh token', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: {
      student: {
        select: {
          id: true,
          studentId: true,
          fullName: true,
          status: true,
          roomNumber: true
        }
      }
    }
  });

  if (!user || !user.loginEnabled) {
    return errorResponse(res, 'User session has expired or account is disabled', 401);
  }

  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user);

  return successResponse(res, {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: buildUserSessionPayload(user),
  });
}

async function logout(req, res) {
  return successResponse(res, null, 200, 'Logged out successfully');
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    return errorResponse(res, 'Current password is incorrect', 400);
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash }
  });

  await logAudit({
    userId,
    action: 'CHANGE_PASSWORD',
    entity: 'User',
    entityId: userId,
    ipAddress: req.ip
  });

  return successResponse(res, null, 200, 'Password changed successfully');
}

async function resetStudentPassword(req, res) {
  const { userId, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { student: true }
  });

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        initialPassword: newPassword
      }
    });

    if (user.student) {
      await tx.student.update({
        where: { id: user.student.id },
        data: { initialPassword: newPassword }
      });
    }
  });

  await logAudit({
    userId: req.user.id,
    action: 'ADMIN_RESET_PASSWORD',
    entity: 'User',
    entityId: userId,
    newValue: { resetBy: req.user.username, targetUsername: user.username },
    ipAddress: req.ip
  });

  return successResponse(
    res,
    { userId: user.id, username: user.username },
    200,
    `Password for ${user.username} has been reset successfully`
  );
}

module.exports = {
  login,
  refreshToken,
  logout,
  changePassword,
  resetStudentPassword
};
