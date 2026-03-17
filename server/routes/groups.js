const express = require('express');
const { createGroup, getGroups, joinGroup } = require('../controllers/groups');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.use(protect); // All group routes are protected

router.route('/')
  .get(getGroups)
  .post(createGroup);

router.post('/join', joinGroup);

// Geofence routes
const { createGeofence, getGroupGeofences } = require('../controllers/groups');
router.route('/:groupId/geofences')
  .get(getGroupGeofences)
  .post(createGeofence);

module.exports = router;
