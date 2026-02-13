/**
 * Authentication Routes
 * 
 * Handles:
 * - Setting/removing custom admin claims
 * - Listing admin users
 * - Verifying admin status
 */

const express = require('express');
const admin = require('firebase-admin');
const { 
  setAdminClaims, 
  removeAdminClaims, 
  verifyAdminClaims,
  listAdminUsers,
  adminAuthMiddleware 
} = require('../config/auth');

const router = express.Router();

/**
 * POST /api/auth/set-admin
 * Set custom admin claims for a user
 * 
 * Requires: Admin authentication
 * Body: { uid: string, role: 'admin'|'editor' }
 */
router.post('/set-admin', adminAuthMiddleware, async (req, res) => {
  try {
    const { uid, role } = req.body;

    // Validate input
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'Invalid UID' });
    }

    if (!['admin', 'editor'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or editor' });
    }

    // Set claims
    const result = await setAdminClaims(uid, role);

    // Log audit event
    await admin.database().ref('auditLogs').push({
      action: 'UPDATE',
      timestamp: admin.database.ServerValue.TIMESTAMP,
      uid: req.user.uid,
      resource: 'admins',
      details: `Set admin claims for ${uid} with role ${role}`
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error setting admin claims:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/remove-admin
 * Remove custom admin claims from a user
 * 
 * Requires: Admin authentication
 * Body: { uid: string }
 */
router.post('/remove-admin', adminAuthMiddleware, async (req, res) => {
  try {
    const { uid } = req.body;

    // Validate input
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'Invalid UID' });
    }

    // Prevent removing own admin status
    if (uid === req.user.uid) {
      return res.status(400).json({ error: 'Cannot remove your own admin status' });
    }

    // Remove claims
    const result = await removeAdminClaims(uid);

    // Log audit event
    await admin.database().ref('auditLogs').push({
      action: 'UPDATE',
      timestamp: admin.database.ServerValue.TIMESTAMP,
      uid: req.user.uid,
      resource: 'admins',
      details: `Removed admin claims from ${uid}`
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error removing admin claims:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/admins
 * List all admin users
 * 
 * Requires: Admin authentication
 */
router.get('/admins', adminAuthMiddleware, async (req, res) => {
  try {
    const admins = await listAdminUsers();

    res.status(200).json({
      success: true,
      admins: admins,
      count: admins.length
    });
  } catch (error) {
    console.error('Error listing admins:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/verify/:uid
 * Verify if user has admin claims
 * 
 * Requires: Admin authentication
 * Params: uid
 */
router.get('/verify/:uid', adminAuthMiddleware, async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'Invalid UID' });
    }

    const result = await verifyAdminClaims(uid);

    res.status(200).json({
      success: true,
      uid: uid,
      isAdmin: result.isAdmin,
      role: result.role,
      claims: result.claims
    });
  } catch (error) {
    console.error('Error verifying admin claims:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get('/me', adminAuthMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      uid: req.user.uid,
      email: req.user.email,
      isAdmin: req.user.isAdmin,
      role: req.user.role
    }
  });
});

module.exports = router;
