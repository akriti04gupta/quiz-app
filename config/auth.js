const admin = require('firebase-admin');

/**
 * Set custom claims for admin user
 * @param {string} uid - Firebase user UID
 * @param {string} role - 'admin' or 'editor'
 */
async function setAdminClaims(uid, role = 'admin') {
  try {
    if (!uid || typeof uid !== 'string' || uid.length < 20) {
      throw new Error('Invalid UID format');
    }

    if (!['admin', 'editor'].includes(role)) {
      throw new Error('Role must be "admin" or "editor"');
    }

    const claims = {
      admin: role === 'admin',
      isAdmin: role === 'admin',
      role: role,
      isCloudFunction: false,
      claimsSet: Date.now()
    };

    await admin.auth().setCustomUserClaims(uid, claims);
    console.log(`✅ Custom claims set for user ${uid} with role: ${role}`);

    return {
      success: true,
      uid: uid,
      role: role,
      message: `Admin claims set successfully for ${uid}`
    };
  } catch (error) {
    console.error('❌ Error setting custom claims:', error.message);
    throw error;
  }
}

/**
 * Remove admin claims from user
 * @param {string} uid - Firebase user UID
 */
async function removeAdminClaims(uid) {
  try {
    if (!uid || typeof uid !== 'string' || uid.length < 20) {
      throw new Error('Invalid UID format');
    }

    await admin.auth().setCustomUserClaims(uid, {
      admin: false,
      isAdmin: false,
      role: null,
      claimsSet: null
    });

    console.log(`✅ Custom claims removed for user ${uid}`);

    return {
      success: true,
      uid: uid,
      message: `Admin claims removed for ${uid}`
    };
  } catch (error) {
    console.error('❌ Error removing custom claims:', error.message);
    throw error;
  }
}

/**
 * Verify user has admin claims
 * @param {string} uid - Firebase user UID
 */
async function verifyAdminClaims(uid) {
  try {
    const user = await admin.auth().getUser(uid);

    if (!user.customClaims || !user.customClaims.admin) {
      return {
        isAdmin: false,
        claims: user.customClaims || {}
      };
    }

    return {
      isAdmin: true,
      role: user.customClaims.role,
      claims: user.customClaims
    };
  } catch (error) {
    console.error('❌ Error verifying admin claims:', error.message);
    throw error;
  }
}

/**
 * Verify Firebase ID token
 * @param {string} token - ID token
 */
async function verifyToken(token) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      isAdmin: decodedToken.admin === true,
      role: decodedToken.role || 'user',
      customClaims: decodedToken
    };
  } catch (error) {
    console.error('❌ Error verifying token:', error.message);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Middleware to verify admin token
 */
function adminAuthMiddleware(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  verifyToken(token)
    .then(decodedToken => {
      if (!decodedToken.isAdmin) {
        return res.status(403).json({ error: 'Admin privileges required' });
      }
      req.user = decodedToken;
      next();
    })
    .catch(error => {
      res.status(401).json({ error: error.message });
    });
}

/**
 * Middleware to verify Cloud Function token
 */
function cloudFunctionAuthMiddleware(req, res, next) {
  const token = req.headers['x-cloud-function-token'];
  const expected = process.env.CLOUD_FUNCTION_SECRET;

  if (!token || token !== expected) {
    return res.status(401).json({ error: 'Invalid Cloud Function token' });
  }

  req.isCloudFunction = true;
  next();
}

/**
 * Get all admin users
 */
async function listAdminUsers() {
  try {
    const usersResult = await admin.auth().listUsers();
    const adminUsers = [];

    for (const user of usersResult.users) {
      if (user.customClaims && user.customClaims.admin) {
        adminUsers.push({
          uid: user.uid,
          email: user.email,
          role: user.customClaims.role,
          lastSignIn: user.metadata?.lastSignInTime
        });
      }
    }

    return adminUsers;
  } catch (error) {
    console.error('❌ Error listing admin users:', error.message);
    throw error;
  }
}

module.exports = {
  setAdminClaims,
  removeAdminClaims,
  verifyAdminClaims,
  verifyToken,
  adminAuthMiddleware,
  cloudFunctionAuthMiddleware,
  listAdminUsers
};
