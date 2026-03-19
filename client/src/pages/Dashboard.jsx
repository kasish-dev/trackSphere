import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import socket from '../services/socket';
import { updateLocation } from '../redux/locationSlice';
import { fetchGeofences, createGeofence } from '../redux/geofenceSlice';
import { Loader2, Navigation, Users, Map as MapIcon, AlertCircle, Radius, Plus, BellRing, Share2, History, Expand, ShieldAlert, Battery, BatteryCharging, BatteryLow, BatteryMedium, BatteryFull, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HistoryPlaybackControls from '../components/HistoryPlaybackControls';
import GroupChat from '../components/GroupChat';
import { getBatteryStatus } from '../services/batteryService';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom component to update map view
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
};

// Component to automatically fit all markers in view
const AutoZoomBounds = ({ myLocation, membersLocations, triggerZoom }) => {
  const map = useMap();

  useEffect(() => {
    if (!myLocation && Object.keys(membersLocations).length === 0) return;
    
    // Create an array of all active coordinates
    const points = [];
    if (myLocation) points.push([myLocation.lat, myLocation.lng]);
    
    Object.values(membersLocations).forEach(member => {
      points.push([member.lat, member.lng]);
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      // Pad the bounds slightly so markers aren't right on the very edge
      map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 16, duration: 1.5 });
    }
  }, [triggerZoom, map, myLocation, membersLocations]);

  return null;
};

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const { groups } = useSelector((state) => state.groups);
  const { isInvisible } = useSelector((state) => state.location);
  
  const [myLocation, setMyLocation] = useState(null);
  const [membersLocations, setMembersLocations] = useState({});
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default to India center
  const [zoom, setZoom] = useState(5);
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newFenceName, setNewFenceName] = useState('');
  const [newFenceRadius, setNewFenceRadius] = useState(100);
  const [notifications, setNotifications] = useState([]);
  const [activeAnomalies, setActiveAnomalies] = useState({});
  
  
  // History Playback State
  const [historyUser, setHistoryUser] = useState(null); // {id, name}
  const [playbackData, setPlaybackData] = useState(null); // {data: [], currentIndex, isPlaying}
  
  // Auto Zoom trigger
  const [autoZoomTrigger, setAutoZoomTrigger] = useState(0);

  // SOS State
  const [activeSOS, setActiveSOS] = useState(null); // { userId, userName, lat, lng, timestamp }
  // Chat State
  const [chatGroupId, setChatGroupId] = useState(null);
  
  const sosAudioRef = useRef(new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'));

  const { fences } = useSelector((state) => state.geofences);

  const watchId = useRef(null);
  const persistenceInterval = useRef(null);
  const dispatch = useDispatch();
  const latestLocation = useRef(null);

  useEffect(() => {
    latestLocation.current = myLocation;
  }, [myLocation]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    setLocationError(null);
    setIsLocating(true);

    if (watchId.current) navigator.geolocation.clearWatch(watchId.current);

    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const battery = await getBatteryStatus();
        
        const newLoc = { 
          lat: latitude, 
          lng: longitude, 
          accuracy,
          batteryLevel: battery?.level || null,
          isCharging: battery?.isCharging || null
        };
        setMyLocation(newLoc);
        setIsLocating(false);
        
        // Initial center on user
        setMapCenter(prev => {
          if (prev[0] === 20.5937 && prev[1] === 78.9629) {
            setZoom(15);
            return [latitude, longitude];
          }
          return prev;
        });
 
        // Broadcast to all groups user belongs to (only if NOT invisible)
        if (groups && groups.length > 0 && !isInvisible) {
          groups.forEach(group => {
            socket.emit('update-location', {
              userId: user.user.id,
              userName: user.user.name,
              lat: latitude,
              lng: longitude,
              accuracy,
              batteryLevel: battery?.level || null,
              isCharging: battery?.isCharging || null,
              groupId: group._id
            });
          });
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        let msg = 'Unknown location error';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission denied. Please enable it in browser settings (click the lock icon in URL bar).';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location information is unavailable on this device.';
            break;
          case error.TIMEOUT:
            msg = 'Location request timed out. Trying again...';
            break;
        }
        setLocationError(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
  };

  useEffect(() => {
    socket.connect();

    persistenceInterval.current = setInterval(() => {
      if (latestLocation.current && !isInvisible) {
        dispatch(updateLocation(latestLocation.current));
      }
    }, 60000);

    if (groups && groups.length > 0) {
      const groupIds = groups.map(g => g._id);
      socket.emit('join-groups', groupIds);
    }

    socket.on('location-broadcast', (data) => {
      setMembersLocations(prev => ({
        ...prev,
        [data.userId]: { ...data, timestamp: Date.now() }
      }));
    });

    // Listen for geofence alerts
    socket.on('geofence-alert', (alert) => {
      setNotifications(prev => [{
        id: Date.now(),
        ...alert,
        type: 'geofence'
      }, ...prev].slice(0, 5)); // Keep last 5
    });

    // Listen for new members joining
    socket.on('new-member-alert', (alert) => {
      setNotifications(prev => [{
        id: Date.now(),
        ...alert,
        type: 'join',
        fenceName: 'the group' // Reusing the same UI structure
      }, ...prev].slice(0, 5));
    });

    // Listen for incoming SOS Alerts
    socket.on('sos-received', (data) => {
      setActiveSOS(data);
      // Play alarm sound
      sosAudioRef.current.loop = true;
      sosAudioRef.current.play().catch(e => console.log('Audio play blocked by browser:', e));
      // Snap map to victim's location
      setMapCenter([data.lat, data.lng]);
      setZoom(16);
    });

    // Listen for AI Safety Anomalies
    socket.on('safety-anomaly', (data) => {
      setActiveAnomalies(prev => ({
        ...prev,
        [data.userId]: data
      }));
    });

    startTracking();

    // Fetch geofences for all groups
    if (groups && groups.length > 0) {
      groups.forEach(group => {
        dispatch(fetchGeofences(group._id));
      });
    }

    // Trigger initial auto-zoom after a short delay to allow map to render
    const zoomTimer = setTimeout(() => {
      setAutoZoomTrigger(prev => prev + 1);
    }, 1500);

    return () => {
      clearTimeout(zoomTimer);
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (persistenceInterval.current) clearInterval(persistenceInterval.current);
      socket.off('location-broadcast');
      socket.off('geofence-alert');
      socket.off('new-member-alert');
      socket.off('sos-received');
      socket.off('safety-anomaly');
      socket.disconnect();
      // Stop audio on unmount
      sosAudioRef.current.pause();
      sosAudioRef.current.currentTime = 0;
    };
  }, [groups, user, isInvisible]);

  const clearAnomaly = (userId) => {
    setActiveAnomalies(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const handleSOS = () => {
    if (!myLocation || !groups || groups.length === 0 || !user?.user) return;
    
    // Emit to server
    socket.emit('sos-alert', {
      userId: user.user.id,
      userName: user.user.name,
      lat: myLocation.lat,
      lng: myLocation.lng,
      groupIds: groups.map(g => g._id)
    });

    // Show local confirmation/state
    setActiveSOS({
      userId: user.user.id,
      userName: 'You (SOS Sent)',
      lat: myLocation.lat,
      lng: myLocation.lng,
      timestamp: Date.now()
    });
  };

  const dismissSOS = () => {
    setActiveSOS(null);
    sosAudioRef.current.pause();
    sosAudioRef.current.currentTime = 0;
  };

  const handleCreateFence = () => {    if (!myLocation || !newFenceName) return;
    
    if (groups && groups.length > 0) {
      dispatch(createGeofence({
        groupId: groups[0]._id,
        fenceData: {
          name: newFenceName,
          center: { lat: myLocation.lat, lng: myLocation.lng },
          radius: parseInt(newFenceRadius)
        }
      }));
      setIsDrawing(false);
      setNewFenceName('');
    }
  };

  const handleShare = async () => {
    if (!groups || groups.length === 0) return;
    const group = groups[0]; // Share the first group by default
    
    const shareData = {
      title: 'Join my TrackSphere group!',
      text: `Join my group "${group.name}" on TrackSphere using this invite code: ${group.inviteCode}`,
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(group.inviteCode);
        alert(`Invite code ${group.inviteCode} copied to clipboard!`);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full z-[1000] bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-white/40 dark:border-gray-700/50 p-4 flex justify-between items-center shrink-0 pointer-events-auto shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapIcon className="text-primary-600" />
            Live Tracking
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {Object.keys(membersLocations).length} member(s) online in your groups
          </p>
        </div>
        
        {isLocating && (
          <div className="flex items-center gap-2 text-primary-600 animate-pulse">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Finding your location...</span>
          </div>
        )}

        {locationError && !isLocating && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle size={18} />
              <span className="text-xs font-medium">{locationError}</span>
            </div>
            <button 
              onClick={startTracking}
              className="px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 relative min-h-0">
        <MapContainer 
          center={mapCenter} 
          zoom={zoom} 
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <ChangeView center={mapCenter} zoom={zoom} />
          
          <AutoZoomBounds 
            myLocation={myLocation} 
            membersLocations={membersLocations} 
            triggerZoom={autoZoomTrigger} 
          />

          {/* User's Marker */}
          {myLocation && (
            <>
              <Marker position={[myLocation.lat, myLocation.lng]}>
                <Popup>
                  <div className="text-center">
                    <p className="font-bold">You</p>
                    <p className="text-xs text-gray-500">Currently active</p>
                  </div>
                </Popup>
              </Marker>
              <Circle 
                center={[myLocation.lat, myLocation.lng]} 
                radius={myLocation.accuracy || 20}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }}
              />
            </>
          )}

          {/* Group Members' Markers */}
          {Object.values(membersLocations).map((member) => {
            const hasAnomaly = activeAnomalies[member.userId] !== undefined;
            return (
              <Marker 
                key={member.userId} 
                position={[member.lat, member.lng]}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-bold">{member.userName}</p>
                    <p className="text-xs text-gray-500">Last updated: {new Date(member.timestamp).toLocaleTimeString()}</p>
                    {hasAnomaly && (
                      <p className="text-xs font-bold text-red-600 mt-1">⚠️ Potential Risk Detected</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Geofences */}
          {fences.map((fence) => (
            <Circle
              key={fence._id}
              center={[fence.center.lat, fence.center.lng]}
              radius={fence.radius}
              pathOptions={{ 
                color: '#8b5cf6', 
                fillColor: '#8b5cf6', 
                fillOpacity: 0.2,
                dashArray: '5, 10' 
              }}
            >
              <Popup>
                <div className="text-center p-1">
                  <p className="font-bold text-primary-700">{fence.name}</p>
                  <p className="text-[10px] text-gray-500">Geofence Radius: {fence.radius}m</p>
                </div>
              </Popup>
            </Circle>
          ))}

          {/* Route History Trace */}
          {playbackData && playbackData.data.length > 0 && (
            <>
              {/* The full path */}
              <Polyline 
                positions={playbackData.data.map(pt => [pt.lat, pt.lng])} 
                pathOptions={{ color: '#ec4899', weight: 4, opacity: 0.6 }} 
              />
              
              {/* The animated moving marker */}
              {playbackData.data[playbackData.currentIndex] && (
                <Marker 
                  position={[
                    playbackData.data[playbackData.currentIndex].lat, 
                    playbackData.data[playbackData.currentIndex].lng
                  ]}
                  zIndexOffset={1000} // ensure it's on top
                >
                  <Popup>
                    <div className="text-center font-bold text-pink-600">
                      {historyUser?.name}'s past route
                    </div>
                  </Popup>
                </Marker>
              )}
            </>
          )}

        </MapContainer>

        {/* Quick link to own history */}
        {user?.user && !historyUser && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-24 left-4 z-[1000]"
          >
             <button 
              onClick={() => setHistoryUser({ id: user.user.id, name: "Me (My Route)" })}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-2 rounded-xl shadow-lg border border-white/40 dark:border-gray-700/50 flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 transition-all hover:scale-105"
            >
              <div className="bg-pink-100 dark:bg-pink-900/30 p-1.5 rounded-lg text-pink-600">
                <History size={16} />
              </div>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 pr-2">View My History</span>
            </button>
          </motion.div>
        )}

        {/* Floating Controls */}
        <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-3">
          
          {/* Group Chat Toggle */}
          {groups && groups.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setChatGroupId(chatGroupId ? null : groups[0]._id)}
              className={`p-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all group relative ${
                chatGroupId 
                ? 'bg-primary-600 text-white border-primary-500' 
                : 'bg-white/80 dark:bg-gray-800/80 text-primary-600 border-white/40 dark:border-gray-700/50 hover:bg-primary-50 dark:hover:bg-primary-900/20'
              }`}
            >
              <MessageSquare size={24} />
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold">
                {chatGroupId ? 'Close Chat' : `Group Chat: ${groups[0].name}`}
              </span>
            </motion.button>
          )}

          {/* SOS Button */}
          <button 
            onClick={handleSOS}
            className="p-3 bg-red-600 rounded-full shadow-lg border border-red-500 hover:bg-red-700 text-white transition animate-pulse mb-2 hover:animate-none flex items-center justify-center relative group"
            title="EMERGENCY PANIC BUTTON"
          >
            <ShieldAlert size={24} />
            <span className="absolute right-full mr-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
              SEND SOS
            </span>
          </button>

          <button 
            onClick={() => {
              if (myLocation) {
                setMapCenter([myLocation.lat, myLocation.lng]);
                setZoom(16);
              }
            }}
            className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl shadow-lg hover:bg-white dark:hover:bg-gray-800 text-primary-600 transition-all hover:scale-110 border border-white/40 dark:border-gray-700/50"
            title="Recenter on me"
          >
            <Navigation size={20} />
          </button>
          
          <button 
            onClick={() => setAutoZoomTrigger(prev => prev + 1)}
            className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl shadow-lg hover:bg-white dark:hover:bg-gray-800 text-primary-600 transition-all hover:scale-110 border border-white/40 dark:border-gray-700/50"
            title="Fit All Members"
          >
            <Expand size={20} />
          </button>

          <button 
            onClick={() => setIsDrawing(!isDrawing)}
            className={`p-3 rounded-xl shadow-lg transition-all hover:scale-110 flex items-center justify-center border border-white/40 dark:border-gray-700/50 ${
              isDrawing ? 'bg-primary-600/90 text-white backdrop-blur-md' : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-md text-primary-600 hover:bg-white dark:hover:bg-gray-800'
            }`}
            title="Create Geofence"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Geofence Creation Overlay */}
        {isDrawing && (
          <div className="absolute top-20 right-4 z-[1000] w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Radius size={18} className="text-primary-600" />
              New Geofence
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Zone Name</label>
                <input 
                  type="text"
                  value={newFenceName}
                  onChange={(e) => setNewFenceName(e.target.value)}
                  placeholder="e.g. Home, Office"
                  className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-gray-200"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Radius: {newFenceRadius}m</label>
                <input 
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={newFenceRadius}
                  onChange={(e) => setNewFenceRadius(e.target.value)}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600 mt-2"
                />
              </div>
              <p className="text-[10px] text-gray-500 italic">This will create a circle around your current location.</p>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setIsDrawing(false)}
                  className="flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateFence}
                  disabled={!newFenceName}
                  className="flex-1 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
          {notifications.map(notif => (
            <div 
              key={notif.id}
              className="bg-gray-900/90 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 pointer-events-auto"
            >
              <div className={`p-2 rounded-lg ${notif.type === 'join' ? 'bg-green-500' : 'bg-primary-500'}`}>
                {notif.type === 'join' ? <Users size={18} /> : <BellRing size={18} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">
                  {notif.userName} <span className="font-normal opacity-80">{notif.type === 'join' ? 'has' : 'entered'}</span> {notif.type === 'join' ? 'joined the group!' : notif.fenceName}
                </p>
                <p className="text-[10px] opacity-60 uppercase font-medium">Just now</p>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                className="opacity-40 hover:opacity-100 p-1"
              >
                <Plus className="rotate-45" size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar Info (Mobile hidden/Desktop overlay) */}
        <motion.div 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute bottom-6 left-6 z-[1000] max-w-xs w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 dark:border-gray-700/50 p-4 hidden md:block"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-primary-600" />
              Active Members
            </h3>
            <button 
              onClick={handleShare}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded-md"
              title="Invite Members"
            >
              <Share2 size={12} /> Invite
            </button>
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {Object.keys(membersLocations).length === 0 ? (
              <p className="text-sm text-gray-500 italic">No other members active right now.</p>
            ) : (
              Object.values(membersLocations).map(member => {
                const lastUpdated = new Date(member.timestamp);
                const timeDiff = Math.floor((Date.now() - member.timestamp) / 1000 / 60); // minutes
                const isOffline = timeDiff >= 5;
                
                const getBatteryIcon = (level, isCharging) => {
                  if (isCharging) return <BatteryCharging size={14} className="text-green-500" />;
                  if (level === null) return null;
                  if (level < 0.2) return <BatteryLow size={14} className="text-red-500" />;
                  if (level < 0.6) return <BatteryMedium size={14} className="text-amber-500" />;
                  return <BatteryFull size={14} className="text-green-500" />;
                };

                return (
                  <div key={member.userId} className={`flex flex-col gap-1 p-2 rounded-lg transition ${isOffline ? 'opacity-60 bg-gray-50 dark:bg-gray-900/50' : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'} ${activeAnomalies[member.userId] ? 'bg-red-50 dark:bg-red-900/20 shadow-inner' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${activeAnomalies[member.userId] ? 'bg-red-500 animate-pulse' : isOffline ? 'bg-gray-400' : 'bg-green-500 animate-pulse'}`}></div>
                        <span className="text-sm font-bold dark:text-gray-200 truncate max-w-[100px]">{member.userName}</span>
                        {member.batteryLevel !== null && (
                          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {getBatteryIcon(member.batteryLevel, member.isCharging)}
                            <span>{Math.round(member.batteryLevel * 100)}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setHistoryUser({ id: member.userId, name: member.userName })}
                          className="p-1 text-gray-400 hover:text-pink-600 transition"
                          title="View Route History"
                        >
                          <History size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            setMapCenter([member.lat, member.lng]);
                            setZoom(16);
                          }}
                          className="p-1 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition"
                        >
                          <Navigation size={14} className="rotate-45" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pl-4">
                      <span className="text-[10px] text-gray-500 font-medium">
                        {isOffline ? `Last seen ${timeDiff}m ago` : 'Real-time'}
                      </span>
                      {activeAnomalies[member.userId] && (
                        <button 
                          onClick={() => clearAnomaly(member.userId)} 
                          className="text-[10px] bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-bold hover:bg-red-200 dark:hover:bg-red-800 transition"
                        >
                          ⚠️ Dismiss Alert
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* History Controls Overlay */}
        {historyUser && (
          <HistoryPlaybackControls 
            userId={historyUser.id}
            userName={historyUser.name}
            onClose={() => {
              setHistoryUser(null);
              setPlaybackData(null);
            }}
            onPlaybackUpdate={setPlaybackData}
          />
        )}

        {/* SOS Full Screen Overlay */}
        {activeSOS && (
          <div className="fixed inset-0 z-[2000] bg-red-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in">
            <div className="bg-red-600 text-white p-6 rounded-3xl shadow-2xl max-w-sm w-full border border-red-400 text-center animate-bounce">
              <ShieldAlert size={64} className="mx-auto mb-4" />
              <h2 className="text-3xl font-black uppercase tracking-wider mb-2">SOS ALERT</h2>
              <p className="text-lg font-bold mb-1">
                {activeSOS.userId === user?.user?.id ? 'Sending Emergency Alert' : `${activeSOS.userName} is in danger!`}
              </p>
              <p className="text-red-100 mb-6 text-sm">
                Time: {new Date(activeSOS.timestamp).toLocaleTimeString()}
              </p>
              
              <div className="flex gap-3">
                {activeSOS.userId !== user?.user?.id && (
                  <button 
                    onClick={() => {
                      setMapCenter([activeSOS.lat, activeSOS.lng]);
                      setZoom(18);
                      dismissSOS();
                    }}
                    className="flex-1 bg-white text-red-600 font-bold py-3 px-4 rounded-xl shadow hover:bg-red-50 transition"
                  >
                    View Map
                  </button>
                )}
                <button 
                  onClick={dismissSOS}
                  className="flex-1 bg-red-800 text-white font-bold py-3 px-4 rounded-xl shadow border border-red-700 hover:bg-red-900 transition"
                >
                  {activeSOS.userId === user?.user?.id ? 'Cancel SOS' : 'Dismiss Alarm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Group Chat Drawer */}
        <AnimatePresence>
          {chatGroupId && (
            <GroupChat 
              groupId={chatGroupId}
              groupName={groups.find(g => g._id === chatGroupId)?.name || 'Group'}
              user={user}
              isOpen={!!chatGroupId}
              onClose={() => setChatGroupId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;
