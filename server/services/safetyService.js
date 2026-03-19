const Geofence = require('../models/Geofence');
const SafetyAlert = require('../models/SafetyAlert');
const Notification = require('../models/Notification');

// In-memory state tracking for real-time anomaly detection
// { userId: { lastLat, lastLng, lastMoveTime, lastAlertTime, currentSpeed } }
const userStates = new Map();

/**
 * Calculate distance between two points in meters (Haversine)
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; 
};

/**
 * Check if a location is within any geofence for a group
 */
const isInsideAnyGeofence = async (lat, lng, groupId) => {
  const geofences = await Geofence.find({ group: groupId });
  for (const gf of geofences) {
    const dist = getDistance(lat, lng, gf.center.lat, gf.center.lng);
    if (dist <= gf.radius) return true;
  }
  return false;
};

/**
 * Main anomaly detection function
 */
exports.processUpdate = async (io, data) => {
  const { userId, userName, lat, lng, groupId } = data;
  const now = Date.now();
  
  if (!userStates.has(userId)) {
    userStates.set(userId, {
      lastLat: lat,
      lastLng: lng,
      lastMoveTime: now,
      lastAlertTime: 0
    });
    return null;
  }

  const state = userStates.get(userId);
  const distance = getDistance(state.lastLat, state.lastLng, lat, lng);
  
  // 1. STATIONARY ANOMALY CHECK (Threshold: 50m movement to reset timer)
  if (distance > 50) {
    state.lastLat = lat;
    state.lastLng = lng;
    state.lastMoveTime = now;
  } else {
    const stationaryTimeMinutes = (now - state.lastMoveTime) / (1000 * 60);
    
    // Alert if stationary > 15 mins AND not already alerted in the last 30 mins
    if (stationaryTimeMinutes >= 15 && (now - state.lastAlertTime) > (30 * 60 * 1000)) {
      
      // CRITICAL: Check if in a safe zone (Geofence) before alerting
      const safe = await isInsideAnyGeofence(lat, lng, groupId);
      
      if (!safe) {
        state.lastAlertTime = now;
        const alertType = 'STATIONARY_ANOMALY';
        
        // Broadcast Alert
        io.to(groupId).emit('safety-anomaly', {
          userId,
          userName,
          type: alertType,
          lat,
          lng,
          message: `${userName} has been stationary for ${Math.round(stationaryTimeMinutes)} mins in an unrecognized area.`
        });

        // Save to DB (Safety History)
        await SafetyAlert.create({
          user: userId,
          group: groupId,
          type: alertType,
          location: { lat, lng },
          metadata: { duration: Math.round(stationaryTimeMinutes) }
        });

        // Save to Notifications to show in member's bell icon
        try {
          const Group = require('../models/Group');
          const group = await Group.findById(groupId);
          if (group) {
            const notifications = group.members
              .filter(memberId => memberId.toString() !== userId.toString())
              .map(memberId => ({
                userId: memberId,
                type: 'safety-anomaly',
                message: `SAFETY ALERT: ${userName} has been stationary for >15 mins in an unknown area.`,
                data: {
                  groupId,
                  userName,
                  type: alertType,
                  lat,
                  lng
                }
              }));
            if (notifications.length > 0) {
              await Notification.insertMany(notifications);
            }
          }
        } catch (err) {
          console.error('Save safety anomaly notification error:', err);
        }
        
        return alertType;
      }
    }
  }

  // 2. VELOCITY ANOMALY CHECK (Sudden impossible speed)
  const timeDiffSeconds = (now - state.lastUpdate) / 1000;
  if (timeDiffSeconds > 0) {
    const speedKmh = (distance / 1000) / (timeDiffSeconds / 3600);
    
    // If speed > 150km/h (likely GPS glitch or extreme speed)
    if (speedKmh > 150 && state.lastUpdate) {
        // Log it as a potential anomaly if needed, but we keep it simpler for now
        // This can be used for "Route Deviation" in future phases
    }
  }
  
  state.lastUpdate = now;
  return null;
};
