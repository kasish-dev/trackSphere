const Geofence = require('../models/Geofence');
const SafetyAlert = require('../models/SafetyAlert');
const Notification = require('../models/Notification');

// In-memory state tracking for real-time anomaly detection
// { userId: { lastLat, lastLng, lastMoveTime, lastAlertTime, lastUpdate, lastSpeed } }
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
    
    // NIGHT SAFETY MODE: Increase sensitivity after 10 PM or before 5 AM
    const hour = new Date().getHours();
    const isNightMode = hour >= 22 || hour <= 5;
    const stationaryThreshold = isNightMode ? 8 : 15; // 8 mins at night, 15 mins day
    
    // Alert if stationary > threshold AND not already alerted in the last 30 mins
    if (stationaryTimeMinutes >= stationaryThreshold && (now - state.lastAlertTime) > (20 * 60 * 1000)) {
      
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
          message: `${userName} has been stationary for ${Math.round(stationaryTimeMinutes)} mins in an unrecognized area.${isNightMode ? ' [NIGHT ALERT]' : ''}`
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

  // 2. SUDDEN STOP DETECTION (Crash/Emergency)
  const timeDiffSeconds = (now - state.lastUpdate) / 1000;
  if (timeDiffSeconds > 0 && timeDiffSeconds < 10) { // Only check if updates are frequent
    const speedKmh = (distance / 1000) / (timeDiffSeconds / 3600);
    
    // Detect "Sudden Stop": High speed (>30km/h) to low speed (<2km/h) in < 10s
    if (state.lastSpeed > 30 && speedKmh < 2) {
        const alertType = 'SUDDEN_STOP';
        
        io.to(groupId).emit('safety-anomaly', {
            userId,
            userName,
            type: alertType,
            lat,
            lng,
            message: `⚠️ SUDDEN STOP DETECTED: ${userName} was moving at ${Math.round(state.lastSpeed)} km/h and stopped abruptly.`
        });

        // Save to DB (Safety History)
        await SafetyAlert.create({
            user: userId,
            group: groupId,
            type: alertType,
            location: { lat, lng },
            metadata: { prevSpeed: Math.round(state.lastSpeed) }
        });
    }
    state.lastSpeed = speedKmh;
  }
  
  // 3. ROUTE DEVIATION (Basic Bounding Box Check)
  // Store recent points in state
  if (!state.recentPoints) state.recentPoints = [];
  state.recentPoints.push({ lat, lng });
  if (state.recentPoints.length > 50) state.recentPoints.shift();

  if (state.recentPoints.length === 50) {
    // Calculate bounding box of last 50 points
    const lats = state.recentPoints.map(p => p.lat);
    const lngs = state.recentPoints.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // If current point is > 5km away from the historical bounds
    // (Simplified check for demo purposes)
    const margin = 0.05; // approx 5km
    if (lat < minLat - margin || lat > maxLat + margin || lng < minLng - margin || lng > maxLng + margin) {
        // Only alert if we haven't alerted for deviation in last 1 hour
        if (!state.lastDeviationAlert || (now - state.lastDeviationAlert) > 3600000) {
            state.lastDeviationAlert = now;
            io.to(groupId).emit('safety-anomaly', {
                userId,
                userName,
                type: 'ROUTE_DEVIATION',
                lat,
                lng,
                message: `⚠️ ROUTE DEVIATION: ${userName} has significantly deviated from their recent path.`
            });
        }
    }
  }

  state.lastUpdate = now;
  return null;
};
